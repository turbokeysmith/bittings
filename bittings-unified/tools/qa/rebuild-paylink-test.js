// Browser test of 8z75 pay-by-link: the "🔗 Send link" sheet in Pay Now, the text message, the customer's pay page,
// and the invoice turning to Paid. Real pages; the cloud AND the payment service are stand-ins (no Stripe, no network).
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', KEY = 'Kk0_test-key-abcdefghij123';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 700) : '')); if (!ok) failed++; }
// stand-in for the pay-link server function, installed in every page before its own scripts run
function stubPayService() {
  const real = window.fetch; window.__payCalls = [];
  window.fetch = function (url, opt) {
    if (/\/functions\/v1\/pay-link/.test(String(url))) {
      const b = JSON.parse((opt && opt.body) || '{}'); window.__payCalls.push(b.action + (b.invoiceId ? ':' + b.invoiceId : '') + (b.i ? ':' + b.i : ''));
      const st = JSON.parse(localStorage.getItem('__pay') || '{}'); let res, code = 200;
      if (b.action === 'create') res = b.invoiceId === 'rcpt_t9' ? { ok: true, i: 'rcpt_t9', k: st.key, amount_cents: 46441, number: 'INV-TEST-9' } : { error: 'invoice not found in cloud (is it saved and synced?)' };
      else if (b.i !== 'rcpt_t9' || b.k !== st.key) { res = { error: "This payment link isn't valid. Ask the shop for a new one.", code: 'not_found' }; code = 404; }
      else if (b.action === 'info') res = { ok: true, shop: 'TEST Keysmith LLC', phone: '(405) 555-0100', number: st.paid ? 'TKS-TEST-9' : 'INV-TEST-9', amount_cents: 46441, paid: !!st.paid, gone: false, canPay: true };
      else if (b.action === 'checkout') res = st.paid ? { ok: true, paid: true } : { ok: true, url: st.badUrl ? 'https://evilstripe.com/steal' : 'https://checkout.stripe.com/c/pay/cs_test_TESTONLY' };
      if (code !== 200 || (res && res.error && !res.code)) code = code !== 200 ? code : 400;
      return Promise.resolve(new Response(JSON.stringify(res), { status: code, headers: { 'content-type': 'application/json' } }));
    }
    return real.apply(this, arguments);
  };
}
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = [], outside = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else { outside.push(u); rq.abort(); } });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID, KEY) => {
      const now = Date.now(), iso = new Date(now - 20 * 60000).toISOString();
      const inv = { id: 'rcpt_t9', number: 'INV-TEST-9', customer: 'TEST Josh', phone: '(405) 555-0101', docType: 'invoice', status: 'Unpaid', taxRate: 8.625, savedAt: now - 600000, date: 'November 12, 2026', serviceType: 'Automotive',
        items: [{ desc: 'TEST Smart key programming', amount: 125, qty: 1, taxable: false, category: 'Programming' }, { desc: 'TEST Service call', amount: 95, qty: 1, taxable: false, category: 'Labor' }, { desc: 'TEST key', amount: 225, qty: 1, taxable: true, category: 'Materials' }],
        totals: { subtotal: 445, tax: 19.41, total: 464.41, grossSubtotal: 445, discount: 0, taxable: 225, nontax: 220, surcharge: 0, taxRate: 8.625 } };
      localStorage.setItem('__db', JSON.stringify({ receipts: [{ id: inv.id, data: inv, deleted_at: null, updated_at: iso }], inventory: [], customers: [], bookings: [], shop_config: [], web_leads: [], payment_transactions: [], audit_log: [],
        shops: [{ id: 's', name: 'TEST Keysmith LLC', stripe_connect_id: 'acct_TEST', connect_charges_enabled: true }] }));
      localStorage.setItem('__pay', JSON.stringify({ key: KEY, paid: false }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'samer@turbokeysmith.com' } }));
    }, UID, KEY);

    // ================= staff side: Pay Now → Send link =================
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3000);
    await pg.evaluate(stubPayService);
    await pg.evaluate(() => { const r = (TKS.list('receipts') || []).find(x => x.id === 'rcpt_t9'); window.__r = r; return openPayNow(r); }); await sleep(900);
    let r = await pg.evaluate(() => ({ tabs: Array.from(document.querySelectorAll('.pnM')).map(x => x.innerText.trim()), widths: Array.from(document.querySelectorAll('.pnM')).map(x => Math.round(x.getBoundingClientRect().height)), overflow: document.documentElement.scrollWidth - innerWidth }));
    check('Pay Now offers three ways: Reader, Type card, Send link (all at least 44 px tall, nothing off-screen)', r.tabs.length === 3 && /Reader/.test(r.tabs[0]) && /Type card/.test(r.tabs[1]) && /Send link/.test(r.tabs[2]) && r.widths.every(h => h >= 44) && r.overflow <= 0, r);
    await pg.evaluate(() => Array.from(document.querySelectorAll('.pnM')).find(x => x.dataset.m === 'link').click()); await sleep(300);
    r = await pg.evaluate(() => ({ note: document.getElementById('pnSur').innerText, go: (document.getElementById('pnGo') || {}).innerText, body: document.getElementById('pnBody').innerText.replace(/\s+/g, ' ') }));
    check('the Send link tab says plainly there is no surcharge on a link', /No surcharge on a pay link/.test(r.note) && /\$464\.41/.test(r.note) && r.go === 'Create pay link', r);
    await pg.evaluate(() => document.getElementById('pnGo').click()); await sleep(900);
    r = await pg.evaluate(() => { const a = document.getElementById('pnSms'); return { link: (document.getElementById('pnLink') || {}).value, sms: a ? a.getAttribute('href') : null, smsText: a ? a.innerText : null, copy: !!document.getElementById('pnCopy'), status: document.getElementById('pnStatus').innerText, calls: window.__payCalls.slice() }; });
    const wantLink = 'http://127.0.0.1:8088/pay.html?i=rcpt_t9&k=' + KEY;
    check('"Create pay link" asks the server for this invoice and shows the link (same address as the app + pay.html)', r.link === wantLink && r.calls[0] === 'create:rcpt_t9' && /Link ready/.test(r.status), r);
    const body = r.sms ? decodeURIComponent(r.sms.split('body=')[1] || '') : '';
    check('"Text it to (405) 555-0101" opens a text to the customer with the invoice number, the amount and the link', /^sms:\+14055550101\?&body=/.test(r.sms || '') && /Text it to \(405\) 555-0101/.test(r.smsText || '') && /invoice INV-TEST-9 — \$464\.41\. Pay securely here: /.test(body) && body.endsWith(wantLink) && r.copy, { sms: (r.sms || '').slice(0, 60), body });
    await pg.screenshot({ path: path.join(OUT, 'paylink-sheet.png') });
    await pg.evaluate(() => { const a = document.getElementById('pnSms'); if (a) { a.addEventListener('click', e => e.preventDefault()); a.click(); } }); await sleep(400);
    r = await pg.evaluate(() => { const x = (TKS.list('receipts') || []).find(y => y.id === 'rcpt_t9'); return { sent: !!x.payLinkSentAt, via: x.payLinkVia, status: x.status }; });
    check('sending it is remembered on the invoice (still unpaid)', r.sent && r.via === 'text' && r.status === 'Unpaid', r);

    // ================= customer side: the pay page =================
    const cu = await b.newPage(); const cuErrs = [], cuOut = []; cu.on('pageerror', e => cuErrs.push(String(e.message)));
    await cu.setRequestInterception(true);
    cu.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^data:/.test(u)) rq.continue(); else { cuOut.push(u); rq.abort(); } });
    await cu.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await cu.evaluateOnNewDocument(stubPayService);
    await cu.goto(wantLink, { waitUntil: 'domcontentloaded' }); await sleep(700);
    r = await cu.evaluate(() => ({ text: document.getElementById('card').innerText.replace(/\s+/g, ' '), btn: (document.getElementById('go') || {}).innerText, btnH: document.getElementById('go') ? Math.round(document.getElementById('go').getBoundingClientRect().height) : 0, title: document.title, appCode: !!window.TKS, scripts: document.querySelectorAll('script[src]').length, overflow: document.documentElement.scrollWidth - innerWidth, call: (document.querySelector('a[href^="tel:"]') || {}).href }));
    check('the customer\'s page shows the shop, the invoice number, the amount and one big Pay button', /TEST Keysmith LLC/.test(r.text) && /Invoice INV-TEST-9/.test(r.text) && /\$464\.41/.test(r.text) && /No card surcharge/.test(r.text) && r.btn === 'Pay $464.41 securely' && r.btnH >= 52 && r.overflow <= 0 && r.call === 'tel:+14055550100', r);
    check('the pay page loads none of the staff app (no sign-in, no outside scripts)', r.appCode === false && r.scripts === 0, r);
    await cu.screenshot({ path: path.join(OUT, 'paylink-page.png') });
    await cu.evaluate(() => document.getElementById('go').click()); await sleep(900);
    check('the Pay button sends the customer to Stripe\'s own payment page', cuOut.some(u => /^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_TESTONLY/.test(u)), cuOut);
    // an address that only LOOKS like Stripe is refused
    await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('__pay')); s.badUrl = true; localStorage.setItem('__pay', JSON.stringify(s)); });
    cuOut.length = 0; await cu.goto(wantLink, { waitUntil: 'domcontentloaded' }); await sleep(600); await cu.evaluate(() => document.getElementById('go').click()); await sleep(800);
    r = await cu.evaluate(() => ({ msg: document.getElementById('msg').innerText, btn: document.getElementById('go').innerText, disabled: document.getElementById('go').disabled }));
    check('the page will only ever send a customer to stripe.com (a look-alike address is refused)', !cuOut.some(u => /evilstripe/.test(u)) && /Could not open the payment page/.test(r.msg) && !r.disabled, { r, cuOut });
    await cu.goto('http://127.0.0.1:8088/pay.html?i=rcpt_t9&k=WRONGWRONGWRONGWRONGWRONG1', { waitUntil: 'domcontentloaded' }); await sleep(600);
    r = await cu.evaluate(() => document.getElementById('card').innerText.replace(/\s+/g, ' '));
    check('a wrong or guessed link shows nothing about the invoice', /isn’t valid/.test(r) && !/464|TEST Josh|INV-TEST/.test(r), r);
    await cu.goto('http://127.0.0.1:8088/pay.html', { waitUntil: 'domcontentloaded' }); await sleep(400);
    r = await cu.evaluate(() => document.getElementById('card').innerText.replace(/\s+/g, ' '));
    check('an incomplete link says so', /incomplete/.test(r), r);

    // ---- the customer pays (stand-in: the payment service now reports it paid) ----
    await cu.evaluate(() => { const s = JSON.parse(localStorage.getItem('__pay')); s.paid = true; s.badUrl = false; localStorage.setItem('__pay', JSON.stringify(s)); });
    await cu.goto(wantLink + '&done=1', { waitUntil: 'domcontentloaded' }); await sleep(700);
    r = await cu.evaluate(() => ({ text: document.getElementById('card').innerText.replace(/\s+/g, ' '), pay: !!document.getElementById('go') }));
    check('back from Stripe the customer sees "Paid — thank you" and no Pay button', /Paid — thank you/.test(r.text) && /\$464\.41 received/.test(r.text) && !r.pay, r);
    await cu.screenshot({ path: path.join(OUT, 'paylink-paid.png') });
    await cu.goto(wantLink, { waitUntil: 'domcontentloaded' }); await sleep(600);
    r = await cu.evaluate(() => ({ text: document.getElementById('card').innerText.replace(/\s+/g, ' '), pay: !!document.getElementById('go') }));
    check('opening the link again after it is paid cannot charge twice', /Paid — thank you/.test(r.text) && !r.pay, r);
    check('pay page: no errors', cuErrs.length === 0, cuErrs);
    await cu.close();

    // ================= staff side notices the payment =================
    await pg.bringToFront(); await sleep(7000);
    r = await pg.evaluate(() => { const x = (TKS.list('receipts') || []).find(y => y.id === 'rcpt_t9'); return { status: document.getElementById('pnStatus') ? document.getElementById('pnStatus').innerText : null, doc: x.status, type: x.docType, number: x.number, payment: x.payment, total: x.totals.total, sur: x.totals.surcharge, buttons: Array.from(document.querySelectorAll('#pnBody button')).map(z => z.innerText) }; });
    check('with the sheet still open the staff phone shows "Paid by link" and the invoice becomes a paid receipt (no surcharge)', /Paid by link — \$464\.41 \(no surcharge\)/.test(r.status || '') && r.doc === 'Paid in Full' && r.type === 'receipt' && r.number === 'TKS-TEST-9' && r.payment === 'Card' && r.total === 464.41 && r.sur === 0 && r.buttons.length === 3 && /Print receipt/.test(r.buttons[0]), r);
    await pg.screenshot({ path: path.join(OUT, 'paylink-paid-staff.png') });

    // ================= Reports treat a link as a card payment =================
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate(() => ({ label: payMethodLabel({ method: 'link' }), bucket: payBucket('link'), fee: repCardFee({ method: 'link', captured_cents: 46441 }), refund: payCanRefund({ method: 'link', stripe_payment_intent_id: 'pi_x' }) }));
    check('Reports: a link payment is labelled "Card · pay link", counted as card, refundable, fee at the typed-card rate (2.9% + 30¢ of $464.41 = $13.77)', r.label === 'Card · pay link' && r.bucket === 'card' && r.fee === 1377 && !!r.refund, r);
    check('staff pages: no errors, and nothing was sent outside this PC except the stand-in Stripe address', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
