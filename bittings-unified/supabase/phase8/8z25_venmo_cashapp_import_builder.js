// Venmo (typed in by the owner) + Cash App (CSV export) → non-taxable service sales (receipt + payment row each).
const fs=require('fs'), path=require('path');
const D=__dirname, SHOP='7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const q=v=>v==null?'null':"'"+String(v).replace(/'/g,"''")+"'";
// Central time → UTC
function toISO(dateStr, timeStr){ const [y,m,d]=dateStr.split('-').map(Number); const [hh,mm,ss]=(timeStr||'12:00:00').split(':').map(x=>Number(x)||0);
  const nth=(mon,wd,k)=>{ const f=new Date(Date.UTC(y,mon,1)).getUTCDay(); return 1+((wd-f+7)%7)+7*(k-1); };
  const ds=Date.UTC(y,2,nth(2,0,2),8), de=Date.UTC(y,10,nth(10,0,1),7); const g=Date.UTC(y,m-1,d,hh+6,mm); const off=(g>=ds&&g<de)?5:6;
  return new Date(Date.UTC(y,m-1,d,hh+off,mm,ss||0)).toISOString(); }
const sales=[];
// Venmo — all 37 (owner: "import it")
JSON.parse(fs.readFileSync(path.join(D,'venmo/final.json'),'utf8')).forEach((v,i)=>{
  sales.push({ src:'venmo', key:'vm_'+v.d+'_'+i, id:'rcpt_vm_'+v.d.replace(/-/g,'')+'_'+String(i).padStart(2,'0'), d:v.d, iso:toISO(v.d,'12:00:00'),
    cents:v.sale, name:v.n, note:'Venmo — received $'+(v.c/100).toFixed(2)+' after a $'+(v.fee/100).toFixed(2)+' Venmo fee', desc:'Service' }); });
// Cash App — clear customer payments only
const ca=JSON.parse(fs.readFileSync(path.join(D,'cashapp/plan.json'),'utf8'));
const held=[], dup=[];
ca.forEach(r=>{
  if(/^cashapp /.test(r.match)) { dup.push(r); return; }          // already rung up in MicroBiz as Cash App
  if(r.personal) { held.push(r); return; }                          // waiting on the owner
  const t=(r.t.match(/\d{2}:\d{2}:\d{2}/)||['12:00:00'])[0];
  const note=String(r.note||'').trim();
  sales.push({ src:'cashapp', key:'ca_'+r.id, id:'rcpt_ca_'+r.id, d:r.d, iso:toISO(r.d,t), cents:r.c, name:r.name,
    note:'Cash App'+(note&&note!=='.'?' — note: '+note:''), desc:'Service'+(note&&note.length>1&&note!=='.'?' — '+note:'') });
});
const rec=sales.map(s=>{ const dt=new Date(s.d+'T12:00:00Z'), amt=s.cents/100;
  const data={ id:s.id, number:(s.src==='venmo'?'VENMO-':'CASHAPP-')+s.d.replace(/-/g,'').slice(2)+'-'+s.id.slice(-4), docType:'receipt',
    date:MONTHS[dt.getUTCMonth()]+' '+dt.getUTCDate()+', '+dt.getUTCFullYear(), status:'Paid in Full', amountPaid:amt, payment:s.src==='venmo'?'Venmo':'Cash App',
    customer:s.name||'', items:[{ qty:1, desc:s.desc.slice(0,120), amount:amt, taxable:false, category:'Labor', unitCost:0, cost:0 }],
    totals:{ subtotal:amt, grossSubtotal:amt, discount:0, taxable:0, nontax:amt, taxableAfter:0, nontaxAfter:amt, tax:0, total:amt, surcharge:0, surchargeRate:0, taxRate:0 },
    notes:s.note, savedAt:Date.parse(s.iso), paidAt:Date.parse(s.iso), source:s.src };
  return {s,data}; });
let sql='begin;\ninsert into receipts(id,data,created_at,updated_at,shop_id,created_by) values\n'+
  rec.map(r=>'('+[q(r.s.id),q(JSON.stringify(r.data))+'::jsonb',q(r.s.iso),q(r.s.iso),q(SHOP),'null'].join(',')+')').join(',\n')+'\non conflict (id) do nothing;\n';
sql+='insert into payment_transactions(invoice_id,method,base_cents,authorized_cents,captured_cents,tax_cents,cost_cents,status,description,created_at,updated_at,idempotency_key,currency,surcharge_cents,shop_id)\nselect * from (values\n'+
  rec.map(r=>'('+[q(r.s.id),q(r.s.src),r.s.cents,r.s.cents,r.s.cents,0,0,"'completed'",q(((r.s.name||'')+' — '+r.data.items[0].desc).slice(0,120)),q(r.s.iso)+'::timestamptz',q(r.s.iso)+'::timestamptz',q(r.s.key),"'usd'",0,q(SHOP)+'::uuid'].join(',')+')').join(',\n')+
  '\n) v where not exists (select 1 from payment_transactions x where x.idempotency_key=v.column12 and x.shop_id='+q(SHOP)+'::uuid);\n';
sql+="select (select count(*) from payment_transactions where idempotency_key like 'vm_%') venmo, (select sum(captured_cents)/100.0 from payment_transactions where idempotency_key like 'vm_%') venmo_usd, (select count(*) from payment_transactions where idempotency_key like 'ca_%') cashapp, (select sum(captured_cents)/100.0 from payment_transactions where idempotency_key like 'ca_%') cashapp_usd;\ncommit;\n";
fs.writeFileSync(path.join(D,'p2p-import.sql'),sql);
fs.writeFileSync(path.join(D,'cashapp/held.json'),JSON.stringify(held,null,1));
const sum=a=>a.reduce((x,r)=>x+(r.cents||r.c),0)/100;
console.log('venmo',sales.filter(s=>s.src==='venmo').length,'$'+sum(sales.filter(s=>s.src==='venmo')).toFixed(2));
console.log('cashapp importing',sales.filter(s=>s.src==='cashapp').length,'$'+sum(sales.filter(s=>s.src==='cashapp')).toFixed(2),'| skipped dup',dup.length,'$'+sum(dup).toFixed(2),'| held',held.length,'$'+sum(held).toFixed(2));
