// Stripe 2026 export → (a) enrich the MicroBiz card sales it matches, (b) add the rest as non-taxable card service sales.
const fs=require('fs'); const SHOP='7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
const M=JSON.parse(fs.readFileSync(__dirname+'/match.json','utf8'));
const q=v=>v==null?'null':"'"+String(v).replace(/'/g,"''")+"'";
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const isName=n=>n && !/cardholder|^visa$|^mastercard$|valued customer/i.test(n) && /[a-z]/i.test(n);
const tc=s=>String(s||'').toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
const brand=b=>({ 'American Express':'Amex', 'MasterCard':'MC/Visa', 'Visa':'MC/Visa' })[b] ? (b==='American Express'?'Amex':b) : (b||'Card');
let upd=[], ins=[], rec=[];
M.forEach(x=>{
  const st = x.status==='Refunded' ? 'refunded' : (x.ref>0 ? 'partially_refunded' : 'completed');
  const bnd = x.brand || null, fund = x.funding || null;
  const note = 'Stripe '+x.id+' · fee $'+(x.fee/100).toFixed(2)+(x.last4?' · card ••'+x.last4:'');
  if (x.match && x.match.method==='card') {
    const diff = x.amt - x.match.cents;
    upd.push('update payment_transactions set card_brand='+q(bnd)+', card_funding='+q(fund)+', stripe_payment_intent_id=coalesce(stripe_payment_intent_id,'+q(x.pi||null)+'),'+
      ' captured_cents='+x.amt+', authorized_cents=greatest(coalesce(authorized_cents,0),'+x.amt+'),'+
      (diff>0?' surcharge_cents='+diff+', surcharge_applied=true,':'')+
      (x.ref>0?' refunded_cents='+x.ref+', status='+q(st)+',':'')+
      ' failure_reason=null, updated_at=now() where id='+q(x.match.id)+'::uuid and shop_id='+q(SHOP)+'::uuid;');
    return;
  }
  // a new card sale (never rung up in MicroBiz) — non-taxable service, as the owner asked
  const id='rcpt_st_'+x.id.replace(/^ch_/,''), amt=x.amt/100, dt=new Date(x.d+'T12:00:00Z');
  const desc=(String(x.desc||'').trim() && !/^payment for invoice$/i.test(String(x.desc).trim())) ? String(x.desc).trim() : 'Card payment';
  const cust = isName(x.name) ? tc(x.name) : '';
  const data={ id, number:'STRIPE-'+x.d.replace(/-/g,'').slice(2)+'-'+x.id.slice(-4).toUpperCase(), docType:'receipt', date:MONTHS[dt.getUTCMonth()]+' '+dt.getUTCDate()+', '+dt.getUTCFullYear(),
    status: st==='refunded'?'Refunded':'Paid in Full', amountPaid:amt, payment:'Card'+(x.brand?' · '+x.brand:''), customer:cust, email:x.email||'',
    items:[{ qty:1, desc:'Service — '+desc.slice(0,110), amount:amt, taxable:false, category:'Labor', unitCost:0, cost:0 }],
    totals:{ subtotal:amt, grossSubtotal:amt, discount:0, taxable:0, nontax:amt, taxableAfter:0, nontaxAfter:amt, tax:0, total:amt, surcharge:0, surchargeRate:0, taxRate:0 },
    notes: note+(x.reader?' · card reader':x.link?' · payment link':' · keyed'), savedAt:Date.parse(x.ct+'Z'), paidAt:Date.parse(x.ct+'Z'), source:'stripe' };
  // ct is Central wall time; store the real instant (UTC): add the offset back
  const y=+x.d.slice(0,4), nth=(mon,wd,k)=>{const f=new Date(Date.UTC(y,mon,1)).getUTCDay(); return 1+((wd-f+7)%7)+7*(k-1);};
  const local=Date.parse(x.ct.slice(0,19)+'Z'); const ds=Date.UTC(y,2,nth(2,0,2),8), de=Date.UTC(y,10,nth(10,0,1),7);
  let iso=new Date(local+5*36e5).toISOString(); if(!(Date.parse(iso)>=ds && Date.parse(iso)<de)) iso=new Date(local+6*36e5).toISOString();
  rec.push('('+[q(id),q(JSON.stringify(data))+'::jsonb',q(iso),q(iso),q(SHOP),'null'].join(',')+')');
  ins.push('('+[q(id),"'card'",q(bnd),q(fund),x.amt,x.amt,x.amt,0,0,q(st),x.ref,q(((cust?cust+' — ':'')+desc).slice(0,120)),q(x.pi||null),q(iso)+'::timestamptz',q('st_'+x.id),"'usd'",0,q(SHOP)+'::uuid'].join(',')+')');
});
let sql='begin;\n'+upd.join('\n')+'\n';
sql+='insert into receipts(id,data,created_at,updated_at,shop_id,created_by) values\n'+rec.join(',\n')+'\non conflict (id) do nothing;\n';
sql+='insert into payment_transactions(invoice_id,method,card_brand,card_funding,base_cents,authorized_cents,captured_cents,tax_cents,cost_cents,status,refunded_cents,description,stripe_payment_intent_id,created_at,idempotency_key,currency,surcharge_cents,shop_id)\n'+
 'select v.*  from (values\n'+ins.join(',\n')+'\n) v(invoice_id,method,card_brand,card_funding,base_cents,authorized_cents,captured_cents,tax_cents,cost_cents,status,refunded_cents,description,pi,created_at,ik,currency,surcharge_cents,shop_id)\n'+
 'where not exists (select 1 from payment_transactions x where x.idempotency_key=v.ik and x.shop_id=v.shop_id)\n  and not exists (select 1 from payment_transactions y where y.stripe_payment_intent_id=v.pi);\n';
sql+="insert into audit_log(user_id,role,action,entity_type,entity_id,shop_id,detail) values (null,'system','stripe_history_merge','payment_transactions','2026',"+q(SHOP)+",'{\"enriched\":"+upd.length+",\"added\":"+ins.length+"}'::jsonb);\n";
sql+="select (select count(*) from payment_transactions where idempotency_key like 'st_%') added, (select round(sum(captured_cents)/100.0,2) from payment_transactions where idempotency_key like 'st_%') added_usd, (select count(*) from payment_transactions where idempotency_key like 'mb_%' and stripe_payment_intent_id is not null) enriched;\ncommit;\n";
fs.writeFileSync(__dirname+'/stripe-merge.sql',sql);
console.log('enrich',upd.length,'new',ins.length,'$'+(M.filter(x=>!(x.match&&x.match.method==='card')).reduce((a,x)=>a+x.amt,0)/100).toFixed(2),'sql KB',Math.round(sql.length/1024));
