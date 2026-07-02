const puppeteer=require('puppeteer'); const fs=require('fs'); const path=require('path');
const BASE='http://127.0.0.1:8088'; const OUT=path.join(__dirname,'audit','final'); fs.mkdirSync(OUT,{recursive:true});
(async()=>{
  const b=await puppeteer.launch({headless:'new'}); const p=await b.newPage();
  await p.setViewport({width:1280,height:900});
  await p.goto(BASE+'/START-DEMO.html',{waitUntil:'load'});
  await p.waitForFunction(()=>location.pathname.endsWith('index.html'),{timeout:15000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1200));
  const go=async v=>{ await p.evaluate(v=>{const x=document.querySelector('[data-go="'+v+'"]');x&&x.click();},v); await new Promise(r=>setTimeout(r,700)); };
  const setRole=async(role,email)=>{ await p.evaluate((role,email)=>{const k='sb-gcshuhlksjznksspbigl-auth-token';try{const t=JSON.parse(localStorage.getItem(k)||'{}');t.user={id:'u_'+role,email};localStorage.setItem(k,JSON.stringify(t));}catch(e){}localStorage.setItem('tks_demo_role',role);localStorage.setItem('bt_theme','dark');},role,email); await p.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,1500)); };
  const out={};

  // 1) Commission as TECHNICIAN — does it expose other techs' pay?
  await setRole('technician','mike@turbokeysmith.com');
  await go('commission');
  out.commissionTech = await p.evaluate(()=>{ const v=document.getElementById('view-commission'); const txt=v.innerText||''; return { mentionsMike:/Mike/.test(txt), mentionsCarlos:/Carlos/.test(txt), mentionsTyler:/Tyler/.test(txt), textHead:txt.replace(/\s+/g,' ').slice(0,240) }; });
  await p.screenshot({path:path.join(OUT,'commission-as-tech.png')});

  // 2) Scheduler status change as OWNER (is it local or cloud?)
  await setRole('owner','samer@turbokeysmith.com');
  await go('schedule');
  const before = await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('tks_bookings')||'[]').map(x=>({id:x.id,status:x.status}))}catch(e){return[]}});
  // open first job card
  out.schedControls = await p.evaluate(()=>{ const v=document.getElementById('view-schedule'); const card=v.querySelector('[data-id],[data-job],.job,.sch-card,.card'); if(card){card.click();return {opened:true, cardCls:card.className.slice(0,40)};} return {opened:false}; });
  await new Promise(r=>setTimeout(r,700));
  out.schedAfterOpen = await p.evaluate(()=>{ const m=document.querySelector('.tks-cfm,.modal,dialog,[class*=detail],[class*=drawer]')||document.querySelector('.view.active'); const btns=[...m.querySelectorAll('button,select,option')].filter(e=>e.offsetParent!==null).map(e=>(e.textContent||e.value||'').replace(/\s+/g,' ').trim().slice(0,22)).filter(Boolean).slice(0,30); return {btns}; });
  // try to click a status option (e.g. "En route" / "Completed")
  const changed = await p.evaluate(()=>{ const all=[...document.querySelectorAll('button,option,select')]; const t=all.find(e=>/En route|On site|In progress|Completed/i.test(e.textContent||e.value||'')); if(t){ if(t.tagName==='OPTION'){const sel=t.closest('select'); sel.value=t.value; sel.dispatchEvent(new Event('change',{bubbles:true}));} else t.click(); return (t.textContent||t.value||'').trim().slice(0,20);} return null; });
  await new Promise(r=>setTimeout(r,900));
  const after = await p.evaluate(()=>{try{return JSON.parse(localStorage.getItem('tks_bookings')||'[]').map(x=>({id:x.id,status:x.status}))}catch(e){return[]}});
  out.scheduler = { clickedStatus:changed, changedLocally: JSON.stringify(before)!==JSON.stringify(after), before:before.slice(0,3), after:after.slice(0,3) };
  await p.screenshot({path:path.join(OUT,'scheduler-detail.png')});

  // 3) Transaction History / Reports green-tag contrast: screenshot lower part of reports
  await go('reports');
  await p.evaluate(()=>{ const v=document.getElementById('view-reports'); v && v.scrollIntoView(); window.scrollTo(0, 500); });
  await new Promise(r=>setTimeout(r,400));
  await p.screenshot({path:path.join(OUT,'reports-scrolled.png')});

  fs.writeFileSync(path.join(OUT,'final.json'),JSON.stringify(out,null,2));
  console.log(JSON.stringify(out,null,2));
  await b.close();
})().catch(e=>{console.error('FINAL FAIL:',e.stack);process.exit(1);});
