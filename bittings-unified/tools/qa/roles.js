// Role-gating probe: for each of the 4 roles, inject role+email, reload, capture
// can() matrix, visible nav items, and key gated controls. Screenshot sidebar per role.
const puppeteer = require('puppeteer');
const fs = require('fs'); const path = require('path');
const BASE='http://127.0.0.1:8088';
const OUT=path.join(__dirname,'audit','roles'); fs.mkdirSync(OUT,{recursive:true});

const ROLES = [
  ['owner','samer@turbokeysmith.com'],
  ['manager','tyler@turbokeysmith.com'],
  ['technician','mike@turbokeysmith.com'],
  ['front_desk','dana@turbokeysmith.com'],
];
const CAPS=['hardDelete','softDelete','refundVoid','inventoryWrite','editPricing','manageStaff','setup','viewAudit','editReference','jobStatus','invMove','invReceive','takePayment','keycodes','vendorTools'];
// expected per TKS_CAPS in store.js
const EXPECT={
  owner:{hardDelete:1,softDelete:1,refundVoid:1,inventoryWrite:1,editPricing:1,manageStaff:1,setup:1,viewAudit:1,editReference:1,jobStatus:1,invMove:1,invReceive:1,takePayment:1,keycodes:1,vendorTools:1},
  manager:{hardDelete:0,softDelete:1,refundVoid:1,inventoryWrite:1,editPricing:1,manageStaff:0,setup:1,viewAudit:1,editReference:1,jobStatus:1,invMove:1,invReceive:1,takePayment:1,keycodes:1,vendorTools:1},
  technician:{hardDelete:0,softDelete:0,refundVoid:0,inventoryWrite:0,editPricing:0,manageStaff:0,setup:0,viewAudit:0,editReference:0,jobStatus:1,invMove:1,invReceive:0,takePayment:1,keycodes:1,vendorTools:0},
  front_desk:{hardDelete:0,softDelete:0,refundVoid:0,inventoryWrite:0,editPricing:0,manageStaff:0,setup:0,viewAudit:0,editReference:0,jobStatus:0,invMove:0,invReceive:1,takePayment:1,keycodes:0,vendorTools:0},
};

(async()=>{
  const browser=await puppeteer.launch({headless:'new'});
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:900});
  await page.goto(BASE+'/START-DEMO.html',{waitUntil:'load'});
  await page.waitForFunction(()=>location.pathname.endsWith('index.html'),{timeout:15000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1200));

  const results={};
  for(const [role,email] of ROLES){
    await page.evaluate((role,email)=>{
      const k='sb-gcshuhlksjznksspbigl-auth-token';
      try{ const t=JSON.parse(localStorage.getItem(k)||'{}'); t.user={id:'u_'+role,email}; localStorage.setItem(k,JSON.stringify(t)); }catch(e){}
      localStorage.setItem('tks_demo_role',role);
      localStorage.setItem('bt_theme','dark');
    },role,email);
    await page.reload({waitUntil:'load'});
    await new Promise(r=>setTimeout(r,1500));
    const cap=await page.evaluate((CAPS)=>{
      const a=window.TKS&&TKS.auth;
      const navVis={};
      document.querySelectorAll('[data-go]').forEach(b=>{ const g=b.getAttribute('data-go'); if(g) navVis[g]=(b.offsetParent!==null); });
      // owner-only/soft nav items present+visible
      const navClass={};
      document.querySelectorAll('.bt-nav__item').forEach(b=>{ const t=(b.textContent||'').replace(/\s+/g,' ').trim(); navClass[t]={ownerOnly:b.classList.contains('owner-only'),ownerSoft:b.classList.contains('owner-soft'),visible:b.offsetParent!==null}; });
      return {
        roleLabel:a&&a.roleLabel&&a.roleLabel(),
        staffRole:a&&a.staffRole&&a.staffRole(),
        isOwner:a&&a.isOwner&&a.isOwner(),
        email:a&&a.email&&a.email(),
        can:Object.fromEntries(CAPS.map(c=>[c,a&&a.can?(a.can(c)?1:0):null])),
        navVisible:navVis, navClass
      };
    },CAPS);
    // compare can() to expectation
    const mism=[];
    for(const c of CAPS){ if(cap.can[c]!==EXPECT[role][c]) mism.push(`${c}: got ${cap.can[c]} expected ${EXPECT[role][c]}`); }
    cap.canMismatches=mism;
    results[role]=cap;
    await page.screenshot({path:path.join(OUT,role+'.png')});
    process.stdout.write(`✓ ${role} label=${cap.roleLabel} mism=${mism.length}\n`);
  }
  fs.writeFileSync(path.join(OUT,'roles.json'),JSON.stringify(results,null,2));
  // concise summary
  for(const [role] of ROLES){
    const r=results[role];
    const navOn=Object.entries(r.navVisible).filter(([k,v])=>v).map(([k])=>k).join(',');
    console.log(`\n== ${role} (label=${r.roleLabel}, isOwner=${r.isOwner}) ==`);
    console.log(' nav visible:', navOn);
    console.log(' can:', CAPS.map(c=>`${c}=${r.can[c]}`).join(' '));
    console.log(' MISMATCHES:', r.canMismatches.length?r.canMismatches:'none ✓');
  }
  await browser.close();
})().catch(e=>{console.error('ROLES FAILED:',e.stack);process.exit(1);});
