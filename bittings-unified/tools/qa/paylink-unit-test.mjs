// Unit test of the pay-link server pieces (supabase/functions/_shared/paylink.ts) — the SAME file the server runs,
// loaded here under Node with a stand-in database. No network, no Stripe, nothing leaves this PC.
//   node paylink-unit-test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const P = await import(pathToFileURL(path.resolve(here, '..', '..', 'supabase', 'functions', '_shared', 'paylink.ts')).href);

const out = []; let failed = 0;
const check = (name, ok, detail) => { out.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); if (!ok) failed++; };

// ---- stand-in database: records what was asked and answers from small tables ----
function fakeDb(tables, opts = {}) {
  const log = [];
  const q = (t) => { const st = { t, f: {}, mode: 'select', row: null };
    const api = {
      select() { return api; }, limit() { return api; }, in() { return api; },
      eq(k, v) { st.f[k] = v; return api; },
      insert(row) { st.mode = 'insert'; st.row = row; return api; },
      then(ok, bad) { let res;
        if (st.mode === 'insert') { log.push({ insert: st.t, row: st.row });
          if (opts.insertError) res = { data: null, error: opts.insertError };
          else { (tables[st.t] = tables[st.t] || []).push(st.row); res = { data: null, error: null }; } }
        else res = { data: (tables[st.t] || []).filter(r => Object.keys(st.f).every(k => r[k] === st.f[k])), error: null };
        return Promise.resolve(res).then(ok, bad); } };
    return api; };
  return { from: q, log };
}
const SHOP = '7a1754e6-0000-4000-8000-000000000001', OTHER = '7a1754e6-0000-4000-8000-000000000002', ACCT = 'acct_TESTSHOP', INV = 'rcpt_test1';
// the owner's real example shape: $125 + $95 labor (no tax) + a $225 key (taxed 8.625%) = $464.41
const data = { number: 'INV-TEST-1', customer: 'TEST Josh', docType: 'invoice', status: 'Unpaid', taxRate: 8.625, technician: 'tech@example.com',
  items: [{ desc: 'TEST Smart key programming', amount: 125, taxable: false, cost: 0 }, { desc: 'TEST Service call', amount: 95, taxable: false }, { desc: 'TEST key', amount: 225, taxable: true, partId: 'key1', cost: 45, qty: 1 }] };
const tables = () => ({ shops: [{ id: SHOP, stripe_connect_id: ACCT }, { id: OTHER, stripe_connect_id: 'acct_OTHER' }], receipts: [{ id: INV, shop_id: SHOP, data }], payment_transactions: [] });
const pi = (o = {}) => Object.assign({ id: 'pi_TEST1', amount: 46441, amount_received: 46441, currency: 'usd', metadata: { method: 'link', invoice_id: INV, shop_id: SHOP, tax_cents: '1941', base_cents: '46441' } }, o);

// ---- totals ----
let t = P.authoritativeTotals(data);
check('invoice total is worked out the same way as the card reader path ($464.41, $19.41 tax)', t.base_cents === 46441 && t.tax_cents === 1941, t);
t = P.authoritativeTotals({ taxRate: 8.625, items: [{ amount: 200, taxable: true }, { amount: 100, taxable: false }, { isDiscount: true, discountMode: 'percent', discountValue: 10 }] });
// $200 taxed + $100 untaxed − 10% = $180 taxed + $90 untaxed; tax 180 × 8.625% = $15.52 (same rounding as the reader path) → $285.52
check('a 10% discount is spread over taxed and untaxed lines before tax', t.base_cents === 28552 && t.tax_cents === 1552, t);
check('paid / unpaid is read from the document', P.receiptPaid({ status: 'Paid in Full' }) === true && P.receiptPaid(data) === false && P.receiptPaid(null) === false);

// ---- the link's key ----
const k1 = await P.linkKey('secret-A', SHOP, INV), k1b = await P.linkKey('secret-A', SHOP, INV);
const k2 = await P.linkKey('secret-A', SHOP, 'rcpt_test2'), k3 = await P.linkKey('secret-A', OTHER, INV), k4 = await P.linkKey('secret-B', SHOP, INV);
check('the link key is stable, 26 url-safe characters', k1 === k1b && /^[A-Za-z0-9_-]{26}$/.test(k1), k1.length);
check('a different invoice, shop or secret gives a different key', new Set([k1, k2, k3, k4]).size === 4);
check('key comparison: equal only when identical', P.sameKey(k1, k1b) && !P.sameKey(k1, k2) && !P.sameKey(k1, k1.slice(0, 25)) && !P.sameKey(k1, undefined));

// ---- recording a paid link ----
let db = fakeDb(tables());
let r = await P.recordLinkPayment(db, pi(), ACCT, { payment_method_details: { card: { funding: 'debit', brand: 'visa' } } });
let row = db.log.find(x => x.insert === 'payment_transactions')?.row;
check('a paid link is written as one completed payment for that invoice and shop', !!r && r.invoice_id === INV && r.shop_id === SHOP && r.base_cents === 46441 && r.tax_cents === 1941 && r.surcharge_applied === false, r);
check('…with no surcharge, the amount paid, the card type, the technician, the parts cost and the Stripe account',
  !!row && row.method === 'link' && row.status === 'completed' && row.base_cents === 46441 && row.captured_cents === 46441 && row.surcharge_cents === 0 && row.surcharge_applied === false &&
  row.card_funding === 'debit' && row.card_brand === 'visa' && row.technician === 'tech@example.com' && row.cost_cents === 4500 && row.connected_account_id === ACCT &&
  row.charge_type === 'direct' && row.stripe_payment_intent_id === 'pi_TEST1' && row.idempotency_key === 'inv_rcpt_test1_link_pi_TEST1' && row.shop_id === SHOP && row.created_by === null, row);

db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi(), 'acct_OTHER');
check('money that landed in a DIFFERENT Stripe account never marks this shop\'s invoice paid', r === null && db.log.length === 0);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi(), null);
check('…nor does an event with no account', r === null && db.log.length === 0);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi({ metadata: { method: 'link', invoice_id: INV, shop_id: OTHER } }), 'acct_OTHER');
check('an invoice id that belongs to another shop is refused', r === null && db.log.length === 0);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi({ metadata: { method: 'link', invoice_id: 'rcpt_nope', shop_id: SHOP } }), ACCT);
check('an unknown invoice is refused', r === null && db.log.length === 0);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi({ metadata: { method: 'reader', invoice_id: INV, shop_id: SHOP } }), ACCT);
check('a reader / typed-card payment is never touched by this code', r === null && db.log.length === 0);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi({ amount: 0, amount_received: 0 }), ACCT);
check('a zero payment is not recorded', r === null && db.log.length === 0);
db = fakeDb(tables(), { insertError: { code: '23505', message: 'duplicate key' } }); r = await P.recordLinkPayment(db, pi(), ACCT);
check('the same payment delivered twice is treated as already recorded (no error, no second row)', !!r && r.invoice_id === INV);
db = fakeDb(tables(), { insertError: { code: '57014', message: 'timeout' } }); let threw = '';
try { await P.recordLinkPayment(db, pi(), ACCT); } catch (e) { threw = String(e.message); }
check('if the ledger cannot be written it says so loudly (so Stripe is asked to send the payment again)', /record failed: timeout/.test(threw), threw);
db = fakeDb(tables()); r = await P.recordLinkPayment(db, pi({ metadata: { method: 'link', invoice_id: INV, shop_id: SHOP, tax_cents: '999999' } }), ACCT);
check('a nonsense tax figure can never exceed what was paid', r.tax_cents === 46441);

console.log(out.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
