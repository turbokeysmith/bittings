// Browser test of the merged "Receipts & invoices" list (index.html → #view-receipts):
// four tabs, quotes hidden unless searched, Mark paid / Delete handing over to bittings.html?docact=…, the old
// bittings.html?receipts=1 list redirecting to the main app, and the Quotes screen (no type chips, bottom bar says Quotes).
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const FAKE_EMAIL = (FAKE.match(/email:'([^']+)'/) || [])[1] || '';   // 8z155: whoever the stand-in cloud signs in as
const UID = '11111111-2222-4333-8444-555555555555';
const PORT = 8095, BASE = 'http://127.0.0.1:' + PORT + '/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 800))); if (!ok) failed++; }

const now = Date.now();
const mk = (id, over) => Object.assign({ technician: FAKE_EMAIL /* 8z155: the signed-in person's own documents (the e-mail the stand-in cloud signs in) */, id, docType: 'receipt', customer: 'TEST X', date: 'November 1, 2026', savedAt: now - 1000, items: [{ desc: 'TEST Lock service', amount: 50, taxable: false }], totals: { subtotal: 50, tax: 0, total: 50 } }, over);
const DOCS = [
  mk('t1', { number: 'TKS-T1', customer: 'TEST Receipt Alice', status: 'Paid in Full', payment: 'Cash', paidAt: now - 5000, savedAt: now - 5000 }),
  mk('t2', { number: 'INV-T2', docType: 'invoice', customer: 'TEST Invoice Bob', status: 'Unpaid', savedAt: now - 4000 }),
  mk('t3', { number: 'INV-T3', docType: 'invoice', customer: 'TEST Paid Invoice Cara', status: 'Paid in Full', payment: 'Check', paidAt: now - 3000, savedAt: now - 3000 }),
  mk('t4', { number: 'EST-T4', docType: 'estimate', customer: 'TEST Quote Dan', status: 'Estimate', savedAt: now - 2000 }),
  mk('t5', { number: 'EST-T5', docType: 'estimate', customer: 'TEST Converted Quote', status: 'Estimate', savedAt: now - 6000 }),
  mk('t6', { number: 'INV-T6', docType: 'invoice', customer: 'TEST Invoice From Quote', status: 'Unpaid', fromEstimate: 'EST-T5', savedAt: now - 1500 }),
  mk('t8', { number: 'EST-T8', docType: 'estimate', customer: 'TEST Scheduled Quote Fay', status: 'Estimate', savedAt: now - 2500 }),
  mk('t7', { technician: 'someone.else@example.com' /* 8z155: belongs to another technician */, number: 'TKS-T7', customer: 'TEST NASTF Eve', status: 'Paid in Full', payment: 'Cash', paidAt: now - 7000, savedAt: now - 7000, nastf: { type: 'D1', d1Days: 7, d1DueDate: '2026-12-01' } }),
];

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    const nav = [];   // every page address the browser was sent to (the app rewrites its own address bar, so this is the honest record)
    pg.on('request', rq => { if (rq.isNavigationRequest() && rq.frame() === pg.mainFrame()) nav.push(rq.url().replace(BASE, '')); const u = rq.url(); if (u.indexOf('http://127.0.0.1:' + PORT + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    await pg.setViewport(PHONE);
    await pg.goto(BASE + 'seed.html');
    await pg.evaluate((UID, DOCS) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK' }, taxableByCategory: {} } }];
      localStorage.clear();
      localStorage.setItem('__db', JSON.stringify({ receipts: DOCS.map(d => ({ id: d.id, data: d, deleted_at: null, updated_at: iso })), inventory: [], customers: [], bookings: [{ id: 'b8', date: '2026-12-01', time: '10:00', updated_at: iso, data: { id: 'b8', jobType: 'auto', subType: 'TEST', date: '2026-12-01', time: '10:00', status: 'Scheduled', fromEstimate: 'EST-T8', customer: { name: 'TEST Scheduled Quote Fay' } } }], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, DOCS);

    const ready = async (url, extra) => { await pg.goto(BASE + url, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(extra || 2800); };
    const stubWork = () => pg.evaluate(() => { const sb = TKS._sb(), real = sb.rpc.bind(sb);
      sb.rpc = function (name, args) { if (name === 'nastf_worklist') return Promise.resolve({ data: [{ id: 't7', number: 'TKS-T7', customer: 'TEST NASTF Eve', doc_date: 'November 1, 2026', nastf_type: 'D1', d1_days: 7, d1_due: '2026-12-01', d1_filed: false, d1_filed_by_name: '', can_file: true }], error: null }); return real(name, args); }; });
    const nums = () => pg.evaluate(() => Array.from(document.querySelectorAll('#rcList .ro-item .ro-num')).map(x => x.innerText.trim()));
    const tab = async (t) => { await pg.evaluate(t => document.querySelector('#rcTabs [data-rt="' + t + '"]').click(), t); await sleep(500); };
    const search = async (v) => { await pg.evaluate(v => { const s = document.getElementById('rcSearch'); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); }, v); await sleep(300); };
    const rowBtns = (num) => pg.evaluate((num) => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => x.querySelector('.ro-num').innerText.trim() === num); if (!it) return null;
      return Array.from(it.querySelectorAll('.rcv')).filter(x => x.offsetParent !== null).map(x => x.dataset.act); }, num);
    const urlNow = () => pg.evaluate(() => location.pathname + location.search);
    let r;
    const wentToList = () => nav.some(u => u === 'index.html?go=receipts');

    // ================= the list =================
    await ready('index.html?go=receipts'); await stubWork();
    r = await pg.evaluate(() => ({ side: (document.querySelector('.bt-sidebar [data-go="receipts"]') || {}).innerText, h1: document.querySelector('#view-receipts h1').innerText, tabs: Array.from(document.querySelectorAll('#rcTabs button')).map(x => x.innerText.replace(/\s+/g, ' ').trim()), active: document.getElementById('view-receipts').classList.contains('active') }));
    check('the menu item and page heading say "Receipts & invoices" (and the list is open)', /Receipts & invoices/.test(r.side) && r.h1 === 'Receipts & invoices' && r.active, r);
    check('four tabs: All, Receipts, Invoices, NASTF · D1', r.tabs.join('|') === 'All|Receipts|Invoices|NASTF · D1', r.tabs);
    r = await nums();
    check('All = receipts and invoices; quotes are not listed; a quote that became an invoice is not listed', ['TKS-T1', 'INV-T2', 'INV-T3', 'INV-T6', 'TKS-T7'].every(n => r.indexOf(n) >= 0) && r.length === 5, r);
    await tab('receipt'); r = await nums(); check('Receipts tab: only receipts (no invoices, no quotes)', r.slice().sort().join() === 'TKS-T1,TKS-T7', r);
    await tab('invoice'); r = await nums(); check('Invoices tab: only invoices', r.slice().sort().join() === 'INV-T2,INV-T3,INV-T6', r);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rcList .ro-item')).map(it => it.querySelector('.ro-num').innerText.trim() + ': ' + (/Unpaid/.test(it.innerText) ? 'Unpaid' : /Invoice — Paid/.test(it.innerText) ? 'Paid' : '?')).sort().join('|'));
    check('every invoice row says whether it is paid', r === 'INV-T2: Unpaid|INV-T3: Paid|INV-T6: Unpaid', r);
    await tab('nastf'); await sleep(500); r = await nums(); const filed = await pg.evaluate(() => !!document.querySelector('#rcList input[data-d1id="t7"]'));
    check('NASTF · D1 tab: the D1 worklist (with the "D1 filed" tick)', r.join() === 'TKS-T7' && filed, { r, filed });
    await tab('all');
    // search reaches quotes
    await search('Quote Dan'); r = await nums(); const estTxt = await pg.evaluate(() => document.getElementById('rcList').innerText);
    check('searching finds an unbilled quote and keeps its "Estimate — not billed yet" line', r.join() === 'EST-T4' && /Estimate — not billed yet/.test(estTxt), { r, estTxt });
    r = await rowBtns('EST-T4'); check('a quote found by search has no Mark paid', r && r.indexOf('paid') < 0 && r.indexOf('view') >= 0, r);
    await search('Converted'); r = await nums(); check('a quote that already became an invoice stays hidden even when searched', r.indexOf('EST-T5') < 0, r);
    await search(''); r = await nums(); check('clearing the search hides quotes again', r.indexOf('EST-T4') < 0, r);
    // deep link from elsewhere: a document number typed into #rcSearch while another tab is open
    await tab('invoice'); await pg.evaluate(() => { const s = document.getElementById('rcSearch'); s.value = 'EST-T4'; s.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    // (index.html's own deep link clicks the All tab first; same thing here)
    await pg.evaluate(() => { document.querySelector('#rcTabs [data-rt="all"]').click(); }); await sleep(300); r = await nums();
    check('a document number put in the search box finds the quote on the All tab', r.join() === 'EST-T4', r); await search('');

    // buttons per row
    r = await rowBtns('INV-T2'); check('an unpaid invoice has View, Print, Send, PDF, Edit, Mark paid and Delete', r && ['view', 'print', 'send', 'pdf', 'edit', 'paid', 'del'].every(x => r.indexOf(x) >= 0), r);
    r = await rowBtns('INV-T3'); check('a paid invoice has no Mark paid', r && r.indexOf('paid') < 0 && r.indexOf('del') >= 0, r);
    r = await rowBtns('TKS-T1'); check('a receipt has no Mark paid', r && r.indexOf('paid') < 0 && r.indexOf('view') >= 0, r);

    // phone layout
    r = await pg.evaluate(() => { const bs = Array.from(document.querySelectorAll('#rcList .rcv, #rcTabs button')).filter(x => x.offsetParent !== null); const small = bs.filter(x => x.getBoundingClientRect().height < 43.5).map(x => x.innerText + ':' + Math.round(x.getBoundingClientRect().height));
      return { overflow: document.documentElement.scrollWidth - innerWidth, n: bs.length, small, tabsH: document.querySelector('#rcTabs button').getBoundingClientRect().height }; });
    check('phone 390px: no sideways scroll, every list button at least 44px tall', r.overflow <= 0 && r.small.length === 0 && r.n > 10, r);
    await pg.screenshot({ path: path.join(OUT, 'receipts-list-phone.png') });
    // viewer: Spanish PDF in the top bar
    await pg.evaluate(() => document.querySelector('#rcList .ro-item .ro-open').click()); await sleep(500);
    r = await pg.evaluate(() => { const bar = document.querySelector('#rcViewer .rc-vbar'); return { es: !!(document.getElementById('rcvPdfEs') && document.getElementById('rcvPdfEs').offsetParent), inBar: !!bar.querySelector('#rcvPdfEs'), overflow: document.documentElement.scrollWidth - innerWidth }; });
    check('the viewer has a Spanish PDF button in its top bar', r.es && r.inBar && r.overflow <= 0, r);
    await pg.evaluate(() => document.getElementById('rcvClose').click());

    // ================= Mark paid: cancel =================
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => x.querySelector('.ro-num').innerText.trim() === 'INV-T6'); it.querySelector('[data-act="paid"]').click(); })]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2200);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, title: (document.getElementById('modalTitle') || {}).innerText, open: document.getElementById('modalBackdrop').classList.contains('open'), btns: Array.from(document.querySelectorAll('#modalBtns button')).map(x => x.innerText.trim()) }));
    check('Mark paid lands on bittings.html?docact=paid and asks "How was … paid?"', /^\/bittings\.html\?docact=paid&num=INV-T6$/.test(r.url) && /How was INV-T6 paid\?/.test(r.title) && r.open && r.btns.some(x => /Cash/.test(x)) && r.btns.some(x => /Card/.test(x)), r);
    await pg.screenshot({ path: path.join(OUT, 'receipts-markpaid-phone.png') });
    nav.length = 0;
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => Array.from(document.querySelectorAll('#modalBtns button')).find(x => /Cancel/.test(x.innerText)).click())]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2200);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, listOpen: document.getElementById('view-receipts').classList.contains('active'), t: (TKS.list('receipts') || []).find(x => x.id === 't6') }));
    check('Cancel goes back to the list and changes nothing', wentToList() && r.listOpen && r.t.docType === 'invoice' && r.t.status === 'Unpaid', r);

    // ================= Mark paid: cash =================
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => x.querySelector('.ro-num').innerText.trim() === 'INV-T2'); it.querySelector('[data-act="paid"]').click(); })]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2200);
    nav.length = 0;
    await pg.evaluate(() => Array.from(document.querySelectorAll('#modalBtns button')).find(x => /Cash/.test(x.innerText)).click());
    await pg.waitForFunction(() => location.pathname === '/index.html', { timeout: 15000 }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2800);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, listOpen: document.getElementById('view-receipts').classList.contains('active'), d: (TKS.list('receipts') || []).find(x => x.id === 't2'), db: JSON.parse(localStorage.getItem('__db')).receipts.find(x => x.id === 't2').data, calls: window.__calls || [] }));
    check('Cash records it and returns to the list; the document is now a paid receipt', wentToList() && r.listOpen && r.d.docType === 'receipt' && r.d.status === 'Paid in Full' && r.d.payment === 'Cash' && r.d.number === 'TKS-T2', r);
    check('…and the change reached the (stand-in) cloud before leaving the page', r.db.docType === 'receipt' && r.db.status === 'Paid in Full', r.db);
    await ready('index.html?go=receipts', 1500); await tab('receipt'); r = await nums(); check('the list now shows it under Receipts', r.indexOf('TKS-T2') >= 0, r);

    // ================= Delete =================
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rcList [data-act="del"]')).filter(x => x.offsetParent !== null).length);
    check('the owner sees Delete', r > 0, r); await tab('all');
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => x.querySelector('.ro-num').innerText.trim() === 'INV-T3'); it.querySelector('[data-act="del"]').click(); })]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2200);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, title: (document.getElementById('modalTitle') || {}).innerText, open: document.getElementById('modalBackdrop').classList.contains('open') }));
    check('Delete lands on bittings.html?docact=del and asks "Delete INV-T3?"', /^\/bittings\.html\?docact=del&num=INV-T3$/.test(r.url) && /Delete INV-T3\?/.test(r.title) && r.open, r);
    nav.length = 0;
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => Array.from(document.querySelectorAll('#modalBtns button')).find(x => /Yes/.test(x.innerText)).click())]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2800);
    r = await nums(); const gone = await pg.evaluate(() => !(TKS.list('receipts') || []).some(x => x.number === 'INV-T3'));
    check('Yes deletes it and returns to the list', gone && r.indexOf('INV-T3') < 0 && wentToList(), { r, gone, nav });
    // not found → back to the list
    nav.length = 0; await pg.goto(BASE + 'bittings.html?docact=paid&num=NOPE-1', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => location.pathname === '/index.html', { timeout: 15000 });
    check('a document that is not found sends you back to the list', wentToList(), nav);
    // technician: no Delete, and the hand-over refuses
    await pg.evaluate(async () => { localStorage.setItem('__role', 'technician'); try { await TKS.clearDeviceCache(); } catch (e) {} });
    await ready('index.html?go=receipts'); r = await pg.evaluate(() => ({ del: Array.from(document.querySelectorAll('#rcList [data-act="del"]')).filter(x => x.offsetParent !== null).length, all: document.querySelectorAll('#rcList [data-act="del"]').length, view: document.querySelectorAll('#rcList [data-act="view"]').length }));
    check('a technician does not see Delete (buttons are hidden)', r.del === 0 && r.view > 0, r);
    // 8z155: a technician sees only their own documents
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rcList .ro-item .ro-num')).map(x => x.innerText.trim()));
    check('a technician does not see a document that belongs to someone else (TKS-T7 not listed)', r.length > 0 && r.indexOf('TKS-T7') < 0, r);
    await pg.goto(BASE + 'bittings.html?docact=del&num=INV-T6', { waitUntil: 'domcontentloaded' }); await sleep(3500);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, modal: (document.getElementById('modalTitle') || {}).innerText, open: document.getElementById('modalBackdrop').classList.contains('open') }));
    check('a technician typing the delete address gets "Owner only" and nothing is deleted', r.open && /Owner only/.test(r.modal), r);
    await pg.evaluate(() => document.querySelector('#modalBtns button').click()); await pg.waitForFunction(() => location.pathname === '/index.html', { timeout: 15000 });
    await pg.evaluate(async () => { localStorage.setItem('__role', 'owner'); try { await TKS.clearDeviceCache(); } catch (e) {} });

    // ================= the old read-only list =================
    for (const u of ['bittings.html?receipts=1', 'bittings.html?history=1']) {
      nav.length = 0; await pg.goto(BASE + u, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => location.pathname === '/index.html', { timeout: 15000 }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
      r = await pg.evaluate(() => ({ url: location.search, active: document.getElementById('view-receipts').classList.contains('active'), n: document.querySelectorAll('#rcList .ro-item').length }));
      check(u + ' lands on the main app\'s Receipts & invoices list', wentToList() && r.active && r.n > 0, { r, nav });
    }
    // single-document deep link (the QR code on a NASTF receipt) still opens that receipt's photo page
    await pg.goto(BASE + 'bittings.html?docs=t7', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3200);
    r = await pg.evaluate(() => ({ url: location.pathname + location.search, t: (document.getElementById('chat') || {}).innerText || '' }));
    check('a QR link (bittings.html?docs=<id>) still opens that receipt\'s photo page', r.url === '/bittings.html?docs=t7' && /Photos for TKS-T7/.test(r.t), r);
    nav.length = 0; r = await pg.evaluate(() => { const d = document.getElementById('docsDone'); d.click(); return true; }); await pg.waitForFunction(() => location.pathname === '/index.html', { timeout: 15000 });
    check('its Done button goes to the main app\'s list', wentToList(), nav);
    await pg.goto(BASE + 'bittings.html?docs=nonexistent', { waitUntil: 'domcontentloaded' }); await sleep(18000);
    r = await pg.evaluate(() => ({ t: (document.getElementById('chat') || {}).innerText || '', href: (document.querySelector('#chat button.primary') || document.createElement('i')).getAttribute('onclick') }));
    check('an unknown QR link still says "Receipt not found" and offers Open Receipts (to the main list)', /Receipt not found/.test(r.t) && /index\.html\?go=receipts/.test(r.href || ''), r);

    // ================= Quotes & estimates screen =================
    await pg.evaluate(() => { try { localStorage.removeItem('tks_bottombar_view'); } catch (e) {} });
    await pg.goto(BASE + 'bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3000);
    // CHANGED: the page now lands on the "Quotes & estimates" card (New estimate + Estimates (n), no Receipts button); the list is one tap away
    r = await pg.evaluate(() => { const c = document.querySelector('#chat .res-home'), bs = c ? Array.from(c.querySelectorAll('button')) : [];
      return { open: document.getElementById('histPanel').classList.contains('open'), builder: !!document.querySelector('.qi-box'), title: c && c.querySelector('h2').innerText, sub: c && c.querySelector('p').innerText, btns: bs.map(x => x.innerText), h: bs.map(x => Math.round(x.getBoundingClientRect().height)),
        over: document.documentElement.scrollWidth - window.innerWidth, bar: Array.from(document.querySelectorAll('#appnav a')).map(a => a.innerText.replace(/[^A-Za-z ]/g, '').trim() + (a.classList.contains('active') ? '*' : '')), head: !!document.querySelector('header a[href="index.html"]') }; });
    check('Quotes & estimates landing: the card, not the list — "New estimate" + "Estimates (1)" (the billed one and the scheduled one are not open), no Receipts button', !r.open && !r.builder && r.title === 'Quotes & estimates' && /quote a caller/i.test(r.sub) && r.btns.join('|') === '💬 New estimate|📋 Estimates (1)', r);
    check('landing at 390px: no sideways scroll, buttons 44px+, the bottom bar still highlights Quotes, the ‹ Apps link is still there', r.over <= 0 && r.h.every(x => x >= 44) && r.bar.join('|') === 'Schedule|Quotes*|Receipts|Stock|More' && r.head, r);
    await pg.screenshot({ path: path.join(OUT, 'quotes-landing-phone.png') });
    await pg.evaluate(() => document.getElementById('homeNew').click()); await sleep(900);
    r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || { dataset: {} }).dataset.t, hist: document.getElementById('histPanel').classList.contains('open') }));
    check('"New estimate" opens the builder (Build a quote, 8z153) straight in Estimate mode', /Build a quote/.test(r.title || '') && r.type === 'estimate' && !r.hist, r);
    await pg.evaluate(() => document.getElementById('qiCancel').click()); await sleep(500);
    check('Cancel from it returns to the card', await pg.evaluate(() => !document.querySelector('.qi-box') && !!document.querySelector('#chat .res-home #homeNew')));
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(500);
    r = await pg.evaluate(() => ({ title: document.querySelector('#histPanel .pp-head b').innerText, chips: getComputedStyle(document.querySelector('#histPanel .hist-filter')).display, newBtn: !!document.getElementById('histNewQuoteBtn'), rows: Array.from(document.querySelectorAll('#histList .hi-num')).map(x => x.innerText), over: document.documentElement.scrollWidth - window.innerWidth,
      bar: Array.from(document.querySelectorAll('#appnav a')).map(a => a.innerText.replace(/[^A-Za-z ]/g, '').trim() + (a.classList.contains('active') ? '*' : '')) }));
    await pg.screenshot({ path: path.join(OUT, 'quotes-list-phone.png') });
    check('Quotes & estimates list: no chips, no "＋ New quote" button, only the open estimate is listed', r.title === 'Quotes & estimates' && r.chips === 'none' && !r.newBtn && r.rows.join() === 'EST-T4' && r.over <= 0, r);
    r = await pg.evaluate(() => { const s = document.getElementById('histSearch'); s.value = 'scheduled'; s.dispatchEvent(new Event('input', { bubbles: true })); const t = document.getElementById('histList').innerText.replace(/\s+/g, ' '); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); return t; });
    check('typing in the search finds the scheduled estimate, tagged "On the schedule"', /EST-T8/.test(r) && /On the schedule 2026-12-01 10:00/.test(r), r);
    await pg.evaluate(() => document.querySelector('#histPanel .pp-head button').click()); await sleep(300);
    check('Done in the list returns to the card', await pg.evaluate(() => !document.getElementById('histPanel').classList.contains('open') && !!document.getElementById('homeNew')));
    // a booking that is cancelled makes the estimate open again (and the count on the button follows)
    await pg.evaluate(() => { const bk = TKS.Bookings.all().find(x => x.fromEstimate === 'EST-T8'); TKS.Bookings.setStatus(bk.id, 'Canceled'); document.dispatchEvent(new Event('visibilitychange')); }); await sleep(800);   // (the booking is changed from the Schedule page / cloud; the card re-counts when the page is shown again)
    r = await pg.evaluate(() => ({ btn: document.getElementById('homeEst').innerText, nums: (openEstimates() || []).map(x => x.number).sort().join() }));
    check('cancelling the booking makes the estimate open again: "Estimates (2)"', r.btn === '📋 Estimates (2)' && r.nums === 'EST-T4,EST-T8', r);
    // (the fallback bottom bar highlighting Quotes is now checked on the landing card, above)
    await pg.goto(BASE + 'bittings.html?docs=t7', { waitUntil: 'domcontentloaded' }); await sleep(1500);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#appnav a')).map(a => a.innerText.replace(/[^A-Za-z ]/g, '').trim() + (a.classList.contains('active') ? '*' : '')));
    check('anywhere else the fallback bar highlights Receipts, and its Receipts link goes to the main app', r.join('|') === 'Schedule|Quotes|Receipts*|Stock|More' && await pg.evaluate(() => document.querySelector('#appnav a.active').getAttribute('href')) === 'index.html?go=receipts', r);

    // ================= PC =================
    await pg.setViewport({ width: 1366, height: 800 }); await pg.evaluate(() => localStorage.setItem('bt_theme', 'light'));
    await ready('index.html?go=receipts'); await stubWork();
    await pg.screenshot({ path: path.join(OUT, 'receipts-list-pc.png') });
    r = await pg.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth, rows: document.querySelectorAll('#rcList .ro-item').length }));
    check('PC: the list draws with no sideways scroll', r.overflow <= 0 && r.rows > 0, r);
    check('no page errors', errs.length === 0, errs.slice(0, 3));
  } finally { await b.close(); srv.close(); }
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
