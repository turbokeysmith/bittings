// Functional sweep as OWNER: perform actions for real, verify localStorage (data layer) + UI.
const puppeteer=require('puppeteer'); const fs=require('fs'); const path=require('path');
const BASE='http://127.0.0.1:8088';
const OUT=path.join(__dirname,'audit','func'); fs.mkdirSync(OUT,{recursive:true});
const R={}; // results
function rec(flow,status,detail){ R[flow]=R[flow]||[]; R[flow].push({status,detail}); }

(async()=>{
  const b=await puppeteer.launch({headless:'new'}); const p=await b.newPage();
  await p.setViewport({width:1280,height:900});
  const cons=[]; p.on('console',m=>{if(['error','warning'].includes(m.type()))cons.push(`[${m.type()}] ${m.text()}`.slice(0,160));});
  p.on('pageerror',e=>cons.push('[pageerror] '+e.message.slice(0,160)));
  await p.goto(BASE+'/START-DEMO.html',{waitUntil:'load'});
  await p.waitForFunction(()=>location.pathname.endsWith('index.html'),{timeout:15000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1200));

  const go=async v=>{ await p.evaluate(v=>{const x=document.querySelector('[data-go="'+v+'"]');x&&x.click();},v); await new Promise(r=>setTimeout(r,650)); };
  const ls=async k=>p.evaluate(k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(e){return null}},k);
  const setVal=async(id,val)=>p.evaluate((id,val)=>{const el=document.getElementById(id);if(!el)return false;el.focus();el.value=val;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));return true;},id,val);
  const clickId=async id=>p.evaluate(id=>{const el=document.getElementById(id);if(el){el.click();return true}return false;},id);

  // ---------- CUSTOMERS: add / edit / soft-delete ----------
  try{
    await go('customers');
    const before=(await ls('tks_customers'))||[];
    await clickId('custAdd'); await new Promise(r=>setTimeout(r,500));
    await setVal('fName','QA Test Customer'); await setVal('fContact','QA'); await setVal('fPhone','(405) 555-9999');
    await setVal('fEmail','qa@example.com'); await setVal('fAddress','1 Test St, OKC');
    await clickId('fSave'); await new Promise(r=>setTimeout(r,700));
    const after=(await ls('tks_customers'))||[];
    const added=after.find(c=>c.customer==='QA Test Customer');
    rec('Customers/add', added && after.length===before.length+1 ? 'PASS':'FAIL',
      `before=${before.length} after=${after.length} record=${added?('id='+added.id+' phone='+added.phone):'MISSING'}`);
    // UI reflects?
    const inList=await p.evaluate(()=>!!document.querySelector('#view-customers') && /QA Test Customer/.test(document.querySelector('#view-customers').innerText));
    rec('Customers/add', inList?'PASS':'FAIL', 'UI list shows new customer: '+inList);

    // EDIT: find the row, open it, change phone
    if(added){
      const opened=await p.evaluate(name=>{ const v=document.getElementById('view-customers'); const rows=[...v.querySelectorAll('*')].filter(e=>e.children.length<6 && (e.textContent||'').includes(name)); const row=rows[rows.length-1]; if(!row)return false; const click=row.closest('[data-id]')||row.querySelector('button')||row; click.click(); return true; },'QA Test Customer');
      await new Promise(r=>setTimeout(r,600));
      const formOpen=await p.evaluate(()=>document.getElementById('view-form') && document.getElementById('view-form').classList.contains('active'));
      if(formOpen){
        await setVal('fPhone','(405) 555-0000'); await clickId('fSave'); await new Promise(r=>setTimeout(r,700));
        const aft=(await ls('tks_customers'))||[]; const ed=aft.find(c=>c.id===added.id);
        rec('Customers/edit', ed && ed.phone==='(405) 555-0000' ? 'PASS':'FAIL', `phone now=${ed&&ed.phone} updatedAt changed=${ed&&ed.updatedAt!==added.updatedAt}`);
      } else rec('Customers/edit','PARTIAL','could not open edit form by clicking row — needs manual check');
    }

    // SOFT-DELETE: re-open + find a delete/remove control
    const delResult=await p.evaluate(name=>{
      const v=document.getElementById('view-customers');
      // try a per-row delete button
      const btns=[...v.querySelectorAll('button')].filter(x=>/delete|remove|🗑|trash/i.test(x.textContent||x.title||x.getAttribute('aria-label')||''));
      return {found:btns.length, texts:btns.slice(0,4).map(x=>(x.textContent||x.title||'').trim().slice(0,20))};
    },'QA Test Customer');
    rec('Customers/delete-control', delResult.found?'INFO':'INFO', JSON.stringify(delResult));
  }catch(e){ rec('Customers','FAIL','exception: '+e.message); }

  // ---------- INVENTORY: qty adjust (+/-) and move (📍) ----------
  try{
    await go('inventory');
    const inv0=(await ls('tks_inventory'))||[];
    const first0=inv0[0];
    // click first plus button
    await p.evaluate(()=>{const v=document.getElementById('view-inventory');const b=v.querySelector('.qbtn.plus');b&&b.click();});
    await new Promise(r=>setTimeout(r,500));
    const inv1=(await ls('tks_inventory'))||[];
    const first1=inv1.find(x=>x.id===first0.id);
    rec('Inventory/qty-adjust', first1 && first1.qty===first0.qty+1 ? 'PASS' : (first1&&first1.qty!==first0.qty?'PARTIAL':'FAIL'),
      `${first0&&first0.name}: qty ${first0&&first0.qty} -> ${first1&&first1.qty}; locs=${JSON.stringify(first1&&first1.locs)}`);
    // open move (📍) on first row
    const moveOpen=await p.evaluate(()=>{const v=document.getElementById('view-inventory');const m=v.querySelector('.moveloc');if(m){m.click();return true}return false;});
    await new Promise(r=>setTimeout(r,600));
    const moveUI=await p.evaluate(()=>{ const dlg=document.querySelector('.tks-cfm, .modal, [class*=move], dialog'); return dlg?{html:(dlg.innerText||'').slice(0,200), inputs:[...dlg.querySelectorAll('select,input,button')].map(e=>({tag:e.tagName.toLowerCase(),t:(e.textContent||e.value||'').slice(0,20),id:e.id}))}:null; });
    rec('Inventory/move-open', moveOpen&&moveUI?'INFO':'PARTIAL', moveUI?JSON.stringify(moveUI).slice(0,300):'move dialog not detected — needs manual/selector check');
  }catch(e){ rec('Inventory','FAIL','exception: '+e.message); }

  // ---------- POS: build ticket + take cash ----------
  try{
    await go('payments');
    // add a service line via the 🔧 Service button (fn-items)
    const built=await p.evaluate(()=>{ const v=document.getElementById('view-payments'); const sv=[...v.querySelectorAll('button')].find(b=>/Service/.test(b.textContent)&&b.className.includes('fn-')); if(sv){sv.click();return true} return false; });
    await new Promise(r=>setTimeout(r,700));
    const afterServiceUI=await p.evaluate(()=>{ const m=document.querySelector('.tks-cfm,.modal,dialog,[class*=picker]'); return m?(m.innerText||'').slice(0,160):null; });
    rec('POS/add-service', built?'INFO':'PARTIAL', 'service button clicked='+built+' picker='+(afterServiceUI||'none'));
    await p.screenshot({path:path.join(OUT,'pos-after-service.png')});
  }catch(e){ rec('POS','FAIL','exception: '+e.message); }

  // ---------- VIN lookup (Start-a-Job, seeded VIN) ----------
  try{
    await go('startjob');
    await p.evaluate(()=>{ const v=document.getElementById('view-startjob'); const auto=[...v.querySelectorAll('*')].find(e=>/Automotive/.test(e.textContent)&&e.children.length<4); auto&&auto.click(); });
    await new Promise(r=>setTimeout(r,400));
    // type a seeded VIN into the VIN input and look up
    const vinTyped=await p.evaluate(()=>{ const v=document.getElementById('view-startjob'); const inp=[...v.querySelectorAll('input')].find(i=>/VIN/i.test(i.placeholder||'')); if(!inp)return false; inp.focus(); inp.value='1FTEW1EP5JFA12345'; inp.dispatchEvent(new Event('input',{bubbles:true})); const lk=[...v.querySelectorAll('button')].find(b=>/Look up/i.test(b.textContent)); lk&&lk.click(); return true; });
    await new Promise(r=>setTimeout(r,900));
    const decoded=await p.evaluate(()=>{ const v=document.getElementById('view-startjob'); return /Ford|F-150|2018/.test(v.innerText); });
    rec('Lookup/VIN', vinTyped&&decoded?'PASS':(vinTyped?'PARTIAL':'FAIL'), 'typed='+vinTyped+' decoded Ford F-150 2018 shown='+decoded);
    await p.screenshot({path:path.join(OUT,'vin-decoded.png')});
  }catch(e){ rec('Lookup/VIN','FAIL','exception: '+e.message); }

  // ---------- Lishi search + Programmers lookup ----------
  try{
    await go('lishi');
    const lishiInfo=await p.evaluate(()=>{ const v=document.getElementById('view-lishi'); const inp=v.querySelector('input'); if(inp){inp.focus();inp.value='HU100';inp.dispatchEvent(new Event('input',{bubbles:true}));} return {hasInput:!!inp}; });
    await new Promise(r=>setTimeout(r,700));
    const lishiRes=await p.evaluate(()=>{ const v=document.getElementById('view-lishi'); return (v.innerText||'').length; });
    rec('Lookup/Lishi', lishiInfo.hasInput?'INFO':'PARTIAL', 'search input present='+lishiInfo.hasInput+' textLen='+lishiRes);
    await go('programmers');
    const progInfo=await p.evaluate(()=>{ const v=document.getElementById('view-programmers'); const sels=[...v.querySelectorAll('select')]; return {selects:sels.length}; });
    rec('Lookup/Programmers', progInfo.selects?'INFO':'PARTIAL', 'make/year selects='+progInfo.selects);
  }catch(e){ rec('Lookup','FAIL','exception: '+e.message); }

  R._console=[...new Set(cons)];
  fs.writeFileSync(path.join(OUT,'func.json'),JSON.stringify(R,null,2));
  console.log(JSON.stringify(R,null,2));
  await b.close();
})().catch(e=>{console.error('FUNC FAILED:',e.stack);process.exit(1);});
