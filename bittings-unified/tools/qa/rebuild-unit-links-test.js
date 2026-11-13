// Browser test of 8z115 "serial numbers on the receipt, the customer and the scan screen" (read only).
// Real pages, signed-in path, stand-in cloud, made-up TEST data; the two new RPCs are stubbed inside the page.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
const CUST = '99999999-aaaa-4bbb-8ccc-000000000001';
const PORT = 8098, BASE = 'http://127.0.0.1:' + PORT + '/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(detail).slice(0, 800))); if (!ok) failed++; }

const now = Date.now();
const mk = (id, over) => Object.assign({ id, docType: 'receipt', customer: 'TEST Key Buyer', customerId: CUST, date: 'November 1, 2026', savedAt: now - 1000, status: 'Paid in Full', payment: 'Cash',
  items: [{ desc: 'TEST Smart key blank', partId: 'p1', qty: 2, amount: 80, taxable: true }, { desc: 'TEST Cut and program', amount: 60, taxable: false }], totals: { subtotal: 140, tax: 0, total: 140 } }, over);
const DOCS = [
  mk('TKS-U1', { number: 'TKS-U1', vehYear: '2018', vehMake: 'Nissan', vehModel: 'Maxima', savedAt: now - 1000 }),
  mk('TKS-U2', { number: 'TKS-U2', items: [{ desc: 'TEST Lock service', amount: 50, taxable: false }], totals: { subtotal: 50, tax: 0, total: 50 }, savedAt: now - 2000 }),
];
const UNITS = [
  { id: 'u_1', serial: 'K7Q2M9X', item_id: 'p1', item_name: 'TEST Smart key blank', sku: 'TEST-SK-1', status: 'sold', sold_at: '2026-11-01T10:00:00Z' },
  { id: 'u_2', serial: 'B4N8T3R', item_id: 'p1', item_name: 'TEST Smart key blank', sku: 'TEST-SK-1', status: 'sold', sold_at: '2026-11-01T10:00:00Z' }
];

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf('http://127.0.0.1:' + PORT + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(BASE + 'seed.html');
    await pg.evaluate((UID, DOCS, CUST) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK' }, taxableByCategory: {} } }];
      localStorage.clear();
      localStorage.setItem('__db', JSON.stringify({ receipts: DOCS.map(d => ({ id: d.id, data: d, deleted_at: null, updated_at: iso })), inventory: [],
        customers: [{ id: CUST, name: 'TEST Key Buyer', contact: '', phone: '', email: '', address: '', customer_type: 'individual', is_contracting: false, created_at: iso, updated_at: iso, deleted_at: null }],
        bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, DOCS, CUST);
    const ready = async (url, extra) => { await pg.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(extra || 2500); };
    const stub = (UNITS, CUST) => pg.evaluate((UNITS, CUST) => { const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__unitCalls = [];
      sb.rpc = function (name, args) {
        if (name === 'units_for_receipt') { window.__unitCalls.push(name + ' ' + args.p_receipt); return Promise.resolve({ data: args.p_receipt === 'TKS-U1' ? UNITS : [], error: null }); }
        if (name === 'units_for_customer') { window.__unitCalls.push(name); return Promise.resolve({ data: args.p_customer === CUST ? UNITS.map(u => Object.assign({ receipt_id: 'TKS-U1', receipt_number: 'TKS-U1', vehicle: '2018 Nissan Maxima' }, u)) : [], error: null }); }
        return real(name, args); }; }, UNITS, CUST);
    let r;

    // ===== receipt viewer =====
    await ready('index.html?go=receipts'); await stub(UNITS, CUST);
    const open = (num) => pg.evaluate((num) => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => x.querySelector('.ro-num').innerText.trim() === num); it.querySelector('.ro-open').click(); }, num);
    await open('TKS-U1'); await sleep(900);
    r = await pg.evaluate(() => { const bx = document.querySelector('#rcViewerDoc .uk-box'); return { t: bx ? bx.innerText : '', bold: bx ? Array.from(bx.querySelectorAll('b')).map(x => x.innerText) : [], calls: window.__unitCalls }; });
    check('the viewer shows a "Serial numbers" box with each serial in bold, the key name and the SKU', /Serial numbers/i.test(r.t) && r.bold.join() === 'K7Q2M9X,B4N8T3R' && /TEST Smart key blank/.test(r.t) && /TEST-SK-1/.test(r.t), r);
    await pg.screenshot({ path: path.join(OUT, 'unit-links-receipt-phone.png') });
    r = await pg.evaluate(() => { const bs = Array.from(document.querySelectorAll('#rcViewer button')).filter(x => x.offsetParent !== null); return { overflow: document.documentElement.scrollWidth - innerWidth, boxOver: (document.querySelector('#rcViewerDoc .uk-box') || {}).scrollWidth - (document.querySelector('#rcViewerDoc .uk-box') || {}).clientWidth, small: bs.filter(x => x.getBoundingClientRect().height < 43.5).map(x => x.innerText + ':' + Math.round(x.getBoundingClientRect().height)) }; });
    check('phone 390px: no sideways scroll, viewer buttons at least 44px', r.overflow <= 0 && r.boxOver <= 0 && r.small.length === 0, r);
    // print / PDF text with and without the serials
    const grab = () => pg.evaluate(() => {
      const base = TKS.list('receipts').find(x => x.id === 'TKS-U1'); const clone = () => JSON.parse(JSON.stringify(base));
      const lines = []; const J = window.jspdf.jsPDF; window.jspdf.jsPDF = function () { const d = new (Function.prototype.bind.apply(J, [null].concat([].slice.call(arguments))))(); const o = d.text; d.text = function (t) { lines.push(Array.isArray(t) ? t.join(' ') : String(t)); return o.apply(d, arguments); }; return d; };
      const out = {};
      try {
        const a = clone(); out.pdfNo = (lines.length = 0, TKS_RECEIPTS.makePDF(a, 'en', false, true), lines.slice());
        const bb = clone(); bb._serials = window.__u; out.pdfSn = (lines.length = 0, TKS_RECEIPTS.makePDF(bb, 'en', false, true), lines.slice());
      } finally { window.jspdf.jsPDF = J; }
      const c = clone(), d = clone(); d._serials = window.__u;
      out.paperNo = TKS_RECEIPTS.paperCopy(c); out.paperSn = TKS_RECEIPTS.paperCopy(d);
      out.cardNo = TKS_RECEIPTS.buildCardHTML(clone()); const e = clone(); e._serials = window.__u; out.cardSn = TKS_RECEIPTS.buildCardHTML(e);
      out.hw = (function () { try { const t = TKS_HW.tokens ? TKS_HW.tokens(out.paperSn, { width: 42 }) : null; return t ? JSON.stringify(t) : null; } catch (x) { return null; } })();
      return out; });
    await pg.evaluate((U) => { window.__u = U; }, UNITS);
    r = await grab();
    const sn = 'SN: K7Q2M9X, B4N8T3R';
    check('PDF text carries the SN line only when _serials is set', !r.pdfNo.some(x => /SN:/.test(x)) && r.pdfSn.some(x => x === sn) && r.pdfSn.length === r.pdfNo.length + 1, { no: r.pdfNo.length, sn: r.pdfSn.length, hit: r.pdfSn.filter(x => /SN/.test(x)) });
    check('the PDF with serials is the same text as without, plus only the SN line', JSON.stringify(r.pdfSn.filter(x => x !== sn)) === JSON.stringify(r.pdfNo), {});
    const descNo = r.paperNo.items.map(i => i.desc), descSn = r.paperSn.items.map(i => i.desc);
    check('paper copy: SN rides on the matching line only when _serials is set; the other line and the totals are unchanged', descNo.join('|') === 'TEST Smart key blank|TEST Cut and program' && descSn[0] === 'TEST Smart key blank - SN: K7Q2M9X, B4N8T3R' && descSn[1] === descNo[1] && JSON.stringify(r.paperNo.totals) === JSON.stringify(r.paperSn.totals), { descNo, descSn });
    check('on-screen card: SN sub-line only with _serials; without it the HTML has no SN text', !/SN:/.test(r.cardNo) && /SN: K7Q2M9X, B4N8T3R/.test(r.cardSn) && r.cardSn.replace(/<div class="rc-sn"[^>]*>.*?<\/div>/, '') === r.cardNo, { has: /rc-sn/.test(r.cardSn) });
    // wrapping on the 80 mm printer: run the real token builder when exposed
    const wrapOk = await pg.evaluate((U) => { const c = JSON.parse(JSON.stringify(TKS.list('receipts').find(x => x.id === 'TKS-U1'))); c._serials = U.concat(['ZZZZZZ2', 'YYYYYY3', 'XXXXXX4', 'WWWWWW5'].map(s => ({ item_id: 'p1', serial: s })));
      const T = TKS_HW.thermal._tokens(TKS_RECEIPTS.paperCopy(c), { width: 42 }).filter(x => x.t === 'text'); const idx = T.findIndex(x => /TEST Smart key blank/.test(x.data));
      return { longest: Math.max.apply(null, T.map(x => x.data.length)), rows: T.slice(idx, idx + 4).map(x => x.data) }; }, UNITS);
    check('80 mm printer (42 columns): the long SN list wraps onto extra lines, nothing wider than the paper', wrapOk.longest <= 42 && wrapOk.rows.some(x => /SN: K7Q2M9X/.test(x)) && wrapOk.rows.length > 1, wrapOk);
    await pg.evaluate(() => document.getElementById('rcvClose').click());
    await open('TKS-U2'); await sleep(900);
    r = await pg.evaluate(() => ({ box: !!document.querySelector('#rcViewerDoc .uk-box'), calls: window.__unitCalls, s: JSON.stringify(TKS.list('receipts').find(x => x.id === 'TKS-U1')).indexOf('_serials') }));
    check('a receipt with no serial-numbered keys shows no box (and nothing is stored on the receipt)', !r.box && r.s < 0 && r.calls.indexOf('units_for_receipt TKS-U2') >= 0, r);
    await pg.evaluate(() => document.getElementById('rcvClose').click());
    // cached per receipt for the session
    await open('TKS-U1'); await sleep(500);
    r = await pg.evaluate(() => window.__unitCalls.filter(x => x === 'units_for_receipt TKS-U1').length);
    check('serials of a receipt are asked for once per session (cached)', r === 1, r);
    await pg.evaluate(() => document.getElementById('rcvClose').click());

    // ===== not signed in / RPC missing =====
    r = await pg.evaluate(async () => { const sb = TKS._sb(), keep = sb.rpc; sb.rpc = () => Promise.reject(new Error('function does not exist')); const a = await TKS_UNITS.forReceipt({ id: 'NEW-1' }); const b2 = await TKS_UNITS.forCustomer('x'); sb.rpc = () => Promise.resolve({ data: null, error: { message: 'Could not find the function' } }); const c = await TKS_UNITS.forReceipt({ id: 'NEW-2' }); sb.rpc = keep; return [a.length, b2.length, c.length]; });
    check('RPC missing or failing resolves [] quietly', r.join() === '0,0,0', r);

    // ===== customer screen =====
    await ready('index.html?go=customers'); await stub(UNITS, CUST);
    await pg.evaluate(() => { const i = getCustomers().findIndex(c => c.customer === 'TEST Key Buyer'); mode = 'people'; openForm(i); }); await sleep(1200);
    r = await pg.evaluate(() => { const s = document.querySelector('#custInvoices .uk-sec'); return { t: s ? s.innerText.replace(/\s+/g, ' ') : '', btns: s ? s.querySelectorAll('.uk-open').length : 0, h: s ? Array.from(s.querySelectorAll('.uk-open')).map(x => Math.round(x.getBoundingClientRect().height)) : [] }; });
    check('customer screen lists the keys: serial, key name, date, vehicle, receipt number', /Keys sold to this customer \(2\)/i.test(r.t) && /K7Q2M9X/.test(r.t) && /B4N8T3R/.test(r.t) && /TEST Smart key blank/.test(r.t) && /2026-11-01/.test(r.t) && /2018 Nissan Maxima/.test(r.t) && /TKS-U1/.test(r.t) && r.btns === 2, r);
    r = await pg.evaluate(() => { const b = document.querySelector('#custInvoices .uk-open'); b.scrollIntoView(); return { over: document.documentElement.scrollWidth - innerWidth, h: Math.round(b.getBoundingClientRect().height) }; });
    check('phone 390px: no sideways scroll, the Open buttons are at least 44px tall', r.over <= 0 && r.h >= 44, r);
    await pg.screenshot({ path: path.join(OUT, 'unit-links-customer-phone.png') });
    await pg.evaluate(() => document.querySelector('#custInvoices .uk-open').click()); await sleep(500);
    r = await pg.evaluate(() => ({ t: Array.from(document.querySelectorAll('div')).filter(d => d.style.zIndex === '99999').map(d => d.innerText).join(' ') }));
    check('the Open button opens that receipt (the same invoice window the list opens)', /TKS-U1/.test(r.t) && /What was sold/i.test(r.t), r.t.slice(0, 200));
    // a customer without keys → section hidden
    await pg.evaluate(() => { document.querySelectorAll('div').forEach(d => { if (d.style.zIndex === '99999') d.remove(); }); const sb = TKS._sb(), real = sb.rpc; sb.rpc = function (n, a) { return n === 'units_for_customer' ? Promise.resolve({ data: [], error: null }) : real.call(sb, n, a); }; renderCustInvoices(getCustomers().find(c => c.customer === 'TEST Key Buyer')); }); await sleep(600);
    r = await pg.evaluate(() => !!document.querySelector('#custInvoices .uk-sec'));
    check('no keys sold -> the section is not shown', r === false, r);

    check('no page errors', errs.length === 0, errs);
  } catch (e) { console.log('FAIL test crashed: ' + (e && e.stack || e)); failed++; }
  await b.close(); srv.close();
  console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})();
