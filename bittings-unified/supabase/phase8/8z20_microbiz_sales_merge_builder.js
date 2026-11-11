// Build the MicroBiz → Bittings sales merge (receipts + payment_transactions) as SQL. Read-only on MicroBiz files.
const fs = require('fs'); const { read } = require('./dbf.js');
const B = __dirname + '/Business-2026-11-10/';
const SHOP = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
const lines = read(B + 'invoice.dbf').rows, tops = read(B + 'inv_top.dbf').rows, cash = read(B + 'cash_tra.dbf').rows;
const bt = JSON.parse(fs.readFileSync(__dirname + '/bt-inv.json', 'utf8')).rows;
const btBySku = {}; bt.forEach(r => { if (!r.del && r.sku) btBySku[String(r.sku).trim().toUpperCase()] = r.id; });
const CLERK = { SA: ['Samer Alzubi', 'samer@turbokeysmith.com'], '001': ['Samer Alzubi', 'samer@turbokeysmith.com'], JG: ['Jayden Geyer', 'jaydengeyer88@gmail.com'], '002': ['Jayden Geyer', 'jaydengeyer88@gmail.com'] };
const TENDER = { '1': ['cash', 'Cash'], '2': ['card', 'MC/Visa'], '3': ['card', 'Amex'], '4': ['card', 'Discover'], '0': ['card', 'Debit Card'], '5': ['check', 'Check'], '9': ['cashapp', 'Cash App'], 'X': ['commercial', 'Commercial'], 'Y': ['mobile', 'Mobile'] };
const tender = c => TENDER[String(c || '').trim().toUpperCase()] || ['other', 'Other'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cents = n => Math.round((Number(n) || 0) * 100);
// Central time → UTC ISO (OKC: CDT -5 Mar 2nd Sun..Nov 1st Sun, else CST -6)
function toISO(d, t) {
  if (!d) return null; const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = String(t || '12:00').split(':').map(x => Number(x) || 0);
  const nth = (mon, wd, k) => { const f = new Date(Date.UTC(y, mon, 1)).getUTCDay(); return 1 + ((wd - f + 7) % 7) + 7 * (k - 1); };
  const dstStart = Date.UTC(y, 2, nth(2, 0, 2), 8), dstEnd = Date.UTC(y, 10, nth(10, 0, 1), 7);
  const guess = Date.UTC(y, m - 1, dd, hh + 6, mm); const off = (guess >= dstStart && guess < dstEnd) ? 5 : 6;
  return new Date(Date.UTC(y, m - 1, dd, hh + off, mm)).toISOString();
}
const byInv = {}; lines.forEach(l => { const k = String(l.INVOICE_NO).trim(); (byInv[k] = byInv[k] || []).push(l); });
const topBy = {}; tops.forEach(t => topBy[String(t.INVOICE_NO).trim()] = t);
const payBy = {}; cash.forEach(c => { const k = String(c.INVOICE).trim(); if (k) (payBy[k] = payBy[k] || []).push(c); });
const receipts = [], pays = [], issues = [];
let sumLines = 0, sumPaid = 0;
for (const no of Object.keys(byInv).sort((a, b) => Number(a) - Number(b))) {
  const ls = byInv[no].sort((a, b) => a.LINE - b.LINE), top = topBy[no] || {}, first = ls[0];
  const date = first.DATE || top.DATE; const iso = toISO(date, first.TIME);
  const clerk = CLERK[String(first.CLERK || '').trim()] || null;
  const items = ls.map(l => {
    const amt = l.TOTAL != null ? l.TOTAL : (l.QTY || 0) * (l.PRICE || 0);
    const sku = String(l.SKU || '').trim(); const partId = btBySku[sku.toUpperCase()] || null;
    return { qty: l.QTY || 0, desc: (l.DESC || sku || 'Item').trim(), sku, amount: Math.round(amt * 100) / 100, partId,
      taxable: l.TAXABLE === 'Y', category: l.ITEM === 'S' || l.TYPE === 'S' ? 'Labor' : 'Materials',
      unitCost: l.COST || 0, cost: Math.round((l.COST || 0) * (l.QTY || 0) * 100) / 100 };
  });
  const sub = items.reduce((a, i) => a + i.amount, 0), tax = ls.reduce((a, l) => a + (l.TAX || 0), 0), cost = items.reduce((a, i) => a + i.cost, 0);
  const total = Math.round((sub + tax) * 100) / 100; sumLines += total;
  const taxable = items.filter(i => i.taxable).reduce((a, i) => a + i.amount, 0), nontax = sub - taxable;
  const ps = payBy[no] || [];
  const tenders = []; ps.forEach(p => { const t0 = []; if (p.AMOUNT) t0.push([p.HOW_PAID, p.AMOUNT]); if (p.AMOUNT1) t0.push([p.HOW_PAID1, p.AMOUNT1]);
    // change handed back comes off the cash tender (or the first tender)
    let ch = Number(p.CHANGE) || 0; if (ch) { const ci = t0.findIndex(t => String(t[0]).trim() === '1'); const k = ci >= 0 ? ci : 0; if (t0[k]) t0[k][1] = Math.round((t0[k][1] - ch) * 100) / 100; }
    t0.forEach(t => { if (t[1]) tenders.push(t); }); });
  const paid = tenders.reduce((a, t) => a + t[1], 0); sumPaid += paid;
  const payLabel = [...new Set(tenders.map(t => tender(t[0])[1]))].join(' + ') || 'Unpaid';
  const id = 'rcpt_mb_' + no; const d = new Date(date + 'T12:00:00Z');
  const note = [top.INOTE1, top.INOTE2].filter(Boolean).join(' ').trim();
  receipts.push({ id, created_at: iso, data: { id, number: no, docType: 'receipt', date: MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear(),
    status: paid >= total - 0.005 ? 'Paid in Full' : (paid > 0 ? 'Partial Payment' : 'Unpaid'), amountPaid: Math.round(paid * 100) / 100,
    payment: payLabel, customer: '', items, notes: note, technician: clerk ? clerk[1] : '', clerk: clerk ? clerk[0] : (first.CLERK || ''),
    totals: { subtotal: Math.round(sub * 100) / 100, grossSubtotal: Math.round(sub * 100) / 100, discount: 0, taxable: Math.round(taxable * 100) / 100, nontax: Math.round(nontax * 100) / 100,
      taxableAfter: Math.round(taxable * 100) / 100, nontaxAfter: Math.round(nontax * 100) / 100, tax: Math.round(tax * 100) / 100, total, surcharge: 0, surchargeRate: 0,
      taxRate: taxable ? Math.round(tax / taxable * 100000) / 1000 : 0 },
    savedAt: Date.parse(iso), paidAt: Date.parse(iso), source: 'microbiz', sourceInvoice: no } });
  if (Math.abs(paid - total) > 0.05 && paid) issues.push(no + ': lines ' + total.toFixed(2) + ' vs paid ' + paid.toFixed(2));
  // one payment row per tender; tax / cost split in proportion to the tender's share
  tenders.forEach((t, i) => {
    const [method, label] = tender(t[0]); const share = paid ? t[1] / paid : 1;
    pays.push({ invoice_id: id, method, card_brand: method === 'card' ? label : null, card_funding: label === 'Debit Card' ? 'debit' : null,
      base_cents: cents(t[1]), captured_cents: cents(t[1]), authorized_cents: cents(t[1]), tax_cents: cents(tax * share), cost_cents: cents(cost * share),
      status: 'completed', description: (items.map(x => x.desc).slice(0, 2).join(', ') + (items.length > 2 ? ' +' + (items.length - 2) : '')).slice(0, 120),
      technician: clerk ? clerk[1] : null, created_at: iso, idempotency_key: 'mb_' + no + '_' + i });
  });
}
const q = v => v == null ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
let sql = '-- MicroBiz sales merge (generated ' + new Date().toISOString() + ')\nbegin;\n';
sql += 'insert into receipts(id, data, created_at, updated_at, shop_id) values\n' + receipts.map(r => '(' + [q(r.id), q(JSON.stringify(r.data)) + '::jsonb', q(r.created_at), q(r.created_at), q(SHOP)].join(',') + ')').join(',\n') + '\non conflict (id) do nothing;\n';
const cols = ['invoice_id','method','card_brand','card_funding','base_cents','captured_cents','authorized_cents','tax_cents','cost_cents','status','description','technician','created_at','idempotency_key'];
sql += 'insert into payment_transactions(' + cols.join(',') + ',currency,surcharge_cents,shop_id,updated_at)\nselect v.* , \'usd\', 0, ' + q(SHOP) + '::uuid, v.created_at::timestamptz from (values\n' +
  pays.map(p => '(' + cols.map(c => c === 'created_at' ? q(p[c]) + '::timestamptz' : (typeof p[c] === 'number' ? p[c] : q(p[c]))).join(',') + ')').join(',\n') +
  '\n) v(' + cols.join(',') + ') where not exists (select 1 from payment_transactions x where x.idempotency_key = v.idempotency_key and x.shop_id = ' + q(SHOP) + '::uuid);\n';
sql += 'select (select count(*) from receipts where id like \'rcpt_mb_%\') receipts, (select count(*) from payment_transactions where idempotency_key like \'mb_%\') payments, (select sum(captured_cents)/100.0 from payment_transactions where idempotency_key like \'mb_%\') dollars;\ncommit;\n';
fs.writeFileSync(__dirname + '/sales-merge.sql', sql);
const m = {}; pays.forEach(p => m[p.method] = (m[p.method] || 0) + 1);
console.log('receipts', receipts.length, 'payments', pays.length, JSON.stringify(m));
console.log('line totals $' + sumLines.toFixed(2), ' paid $' + sumPaid.toFixed(2), ' mismatches', issues.length); console.log(issues.slice(0, 12).join('\n'));
console.log('with technician', receipts.filter(r => r.data.technician).length, ' items linked to a Bittings part', receipts.reduce((a, r) => a + r.data.items.filter(i => i.partId).length, 0), '/', receipts.reduce((a, r) => a + r.data.items.length, 0));
console.log('sample', JSON.stringify(receipts.find(r => r.id === 'rcpt_mb_648').data).slice(0, 700));
console.log('sql KB', Math.round(sql.length / 1024));
