// Recon the action UIs: Customers (+form), Inventory (part actions), POS (ticket build).
const puppeteer=require('puppeteer'); const BASE='http://127.0.0.1:8088';
function btns(sel){ return `[...document.querySelectorAll('${sel}')]`; }
(async()=>{
  const b=await puppeteer.launch({headless:'new'}); const p=await b.newPage();
  await p.setViewport({width:1280,height:900});
  await p.goto(BASE+'/START-DEMO.html',{waitUntil:'load'});
  await p.waitForFunction(()=>location.pathname.endsWith('index.html'),{timeout:15000}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1200));
  async function go(v){ await p.evaluate(v=>{const x=document.querySelector('[data-go="'+v+'"]');x&&x.click();},v); await new Promise(r=>setTimeout(r,600)); }
  function dumpActive(){ return p.evaluate(()=>{
    const v=document.querySelector('.view.active'); if(!v) return {none:true};
    const ctrl=[...v.querySelectorAll('button,a.btn,[role=button]')].filter(e=>e.offsetParent!==null).slice(0,40)
      .map(e=>({t:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,28), id:e.id||null, cls:(e.className||'').slice(0,40)}));
    const inputs=[...v.querySelectorAll('input,select,textarea')].filter(e=>e.offsetParent!==null).slice(0,30)
      .map(e=>({tag:e.tagName.toLowerCase(),type:e.type||null,id:e.id||null,name:e.name||null,ph:e.placeholder||null}));
    return {view:v.id, ctrl, inputs};
  }); }
  const out={};
  await go('customers'); out.customers=await dumpActive();
  // try open add-customer
  await p.evaluate(()=>{ const v=document.querySelector('.view.active'); const b=[...v.querySelectorAll('button')].find(x=>/add|new customer|\+ /i.test(x.textContent)); b&&b.click(); });
  await new Promise(r=>setTimeout(r,600)); out.customerForm=await dumpActive();
  await go('inventory'); out.inventory=await dumpActive();
  // open a part row's actions (first part)
  await p.evaluate(()=>{ const v=document.querySelector('.view.active'); const row=v.querySelector('[data-id],.invrow,.card'); row&&row.click(); });
  await new Promise(r=>setTimeout(r,500)); out.inventoryAfterRowClick=await dumpActive();
  await go('payments'); out.pos=await dumpActive();
  console.log(JSON.stringify(out,null,2));
  await b.close();
})().catch(e=>{console.error('RECON2 FAIL:',e.stack);process.exit(1);});
