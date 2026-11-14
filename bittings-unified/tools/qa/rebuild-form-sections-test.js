// Browser test of 8z158: the quote / invoice form is split into collapsing sections (app/form-sections.js).
// One open at a time, a finished section is one line that shows its answer, the total + Save stay pinned.
// The page does not load the file yet, so this test loads it itself after the form is open.
// Real page, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-form-sections-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8114, BASE = 'http://127.0.0.1:' + PORT;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 900) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf(BASE + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(BASE + '/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500 }),
        K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 2, cost: 30, sell_price_cents: 16500 })];
      const S = (cat, value, price) => ({ cat, en: value, es: '', value, price: price == null ? '' : String(price) });
      const services = [S('automotive', 'TEST Car lockout', 65), S('automotive', 'TEST Smart key programming', 125), S('automotive', 'TEST Service call', 95),
        S('residential', 'TEST Rekey', 15), S('residential', 'TEST House lockout', 85)];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, serviceCats: ['automotive', 'residential', 'commercial'], services } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('tks_form_sections', 'off');   // the first form stays flat so its original height can be measured
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);

    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(350); };
    const tap = async (sel) => { await pg.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(450); };
    const typeIn = async (sel, text) => { await pg.evaluate((sel) => { const e = document.querySelector(sel); e.value = ''; e.focus(); }, sel); await pg.type(sel, text); await sleep(150); };
    const head = id => '.qs[data-sec="' + id + '"] .qs-h';
    const openForm = async (url) => {
      if (url) await pg.goto(url, { waitUntil: 'domcontentloaded' }); else await pg.evaluate(() => openQuickInvoice(null, null, { quote: true }));
      await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(url ? 2500 : 1200);
    };
    const wrap = async () => { await pg.evaluate(() => TKS_SECTIONS.quoteForm(document.querySelector('.qi-ov'))); await sleep(300); };
    const view = () => pg.evaluate(() => {
      const secs = Array.from(document.querySelectorAll('.qs')).map(s => ({ id: s.dataset.sec, open: s.querySelector('.qs-h').getAttribute('aria-expanded') === 'true', shown: s.style.display !== 'none', sum: s.querySelector('.qs-s').textContent, hh: Math.round(s.querySelector('.qs-h').getBoundingClientRect().height) }));
      const box = document.querySelector('.qi-box');
      return { secs, byId: Object.fromEntries(secs.map(s => [s.id, s])), nOpen: document.querySelectorAll('.qs-h[aria-expanded="true"]').length, overflow: Math.max(box.scrollWidth - box.clientWidth, document.documentElement.scrollWidth - window.innerWidth),
        mode: document.querySelector('.qs-mode') && document.querySelector('.qs-mode').textContent, total: (document.querySelector('.qs-total-v') || {}).textContent, totalShown: !!document.querySelector('.qs-total') && document.querySelector('.qs-total').style.display !== 'none',
        tot: (() => { const d = document.querySelectorAll('#qiTot > div'); return d.length ? d[d.length - 1].lastElementChild.textContent : ''; })(), err: document.getElementById('qiErr').textContent };
    });

    // ================= form A: a new quote =================
    await openForm(BASE + '/bittings.html?quote=1');
    const before = await pg.evaluate(() => { const h = document.querySelector('.qi-box').scrollHeight; localStorage.removeItem('tks_form_sections'); return h; });   // the page now applies the sections itself; 'off' (seeded) kept this first form flat so it can be measured
    await pg.addScriptTag({ url: BASE + '/app/form-sections.js' }); await wrap();
    await pg.evaluate(() => { document.querySelector('.qi-ov').scrollTop = 0; }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'sections-start.png') });
    const first = await pg.evaluate(() => { const hs = Array.from(document.querySelectorAll('.qs-h')).filter(h => h.getBoundingClientRect().height > 0), f = document.querySelector('.qs-foot').getBoundingClientRect(); return { visibleHeaders: hs.filter(h => { const r = h.getBoundingClientRect(); return r.top >= 0 && r.bottom <= f.top + 1; }).length, footTop: Math.round(f.top) }; });
    const after = await pg.evaluate(() => document.querySelector('.qi-box').scrollHeight);
    let v = await view();
    const ids = v.secs.map(s => s.id).join(',');
    check('1. seven sections in order; "start" open, the rest closed; payment hidden (estimate); no sideways scroll; every header >= 44px',
      ids === 'start,customer,location,vehicle,charges,payment,more' && v.byId.start.open && v.nOpen === 1 && !v.byId.payment.shown && v.overflow <= 0 && v.secs.filter(s => s.shown).every(s => s.hh >= 44), { ids, open: v.secs.filter(s => s.open).map(s => s.id), payShown: v.byId.payment && v.byId.payment.shown, overflow: v.overflow, hh: v.secs.map(s => s.hh) });
    check('2. the form is at least 55% shorter than the original (one-at-a-time, only "start" open)', after <= before * 0.45, { before, after, saved: Math.round((1 - after / before) * 100) + '%' });
    const dup = await pg.evaluate(() => { const n = document.querySelectorAll('.qs').length; TKS_SECTIONS.quoteForm(document.querySelector('.qi-ov')); return document.querySelectorAll('.qs').length === n && document.querySelectorAll('style#qsStyle').length === 1; });
    check('   applying twice does nothing the second time', dup);

    // the start section: Next reads the job line, opens Customer
    await tap('.qs[data-sec="start"] .qs-next'); await sleep(200); v = await view();
    check('2b. Next on "start": header reads "Estimate · Automotive", customer opens', v.byId.start.sum === 'Estimate · Automotive' && !v.byId.start.open && v.byId.customer.open, { sum: v.byId.start.sum });
    // 3. name + phone, Next
    await typeIn('#qiName', 'TEST Alex Sample'); await typeIn('#qiPhone', '4055550123');
    await tap('.qs[data-sec="customer"] .qs-next'); await sleep(200); v = await view();
    check('3. Next: customer closes and reads "name · phone"; location opens', !v.byId.customer.open && /^TEST Alex Sample · .*(405.*555.*0123)/.test(v.byId.customer.sum) && v.byId.location.open && v.nOpen === 1, { sum: v.byId.customer.sum, open: v.secs.filter(s => s.open).map(s => s.id) });

    // 4. vehicle
    await tap(head('vehicle')); // opens vehicle, closes location
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(300);
    await tap(head('vehicle')); v = await view();
    check('4. vehicle closed: header reads "2015 Ford F-150…"', /^2015 Ford F-150/.test(v.byId.vehicle.sum) && !v.byId.vehicle.open, v.byId.vehicle);
    await pg.evaluate(() => { document.querySelector('.qi-ov').scrollTop = 0; }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'sections-closed.png') });
    const closed = await pg.evaluate(() => { const f = document.querySelector('.qs-foot').getBoundingClientRect(); return { open: document.querySelectorAll('.qs-h[aria-expanded="true"]').length, visibleHeaders: Array.from(document.querySelectorAll('.qs-h')).filter(h => { const r = h.getBoundingClientRect(); return r.height > 0 && r.top >= 0 && r.bottom <= f.top + 1; }).length, h: document.querySelector('.qi-box').scrollHeight }; });
    check('4b. everything closed: at least four section headers are on the first screen above the pinned bar', closed.open === 0 && closed.visibleHeaders >= 4, closed);
    results.push('INFO all closed: form height ' + closed.h + ' (' + Math.round((1 - closed.h / before) * 100) + '% shorter than the original); start-open ' + Math.round((1 - after / before) * 100) + '% shorter; start-open first screen shows ' + first.visibleHeaders + ' headers');

    // 5. a line through the form's own controls
    await tap(head('charges'));
    await pg.evaluate(() => { const rows = Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc && !x.classList.contains('disc')); const row = rows[rows.length - 1];
      const set = (el, val) => { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set(row.querySelector('.qiDesc'), 'TEST Car lockout'); set(row.querySelector('.qiAmt'), '65'); });
    await sleep(500); v = await view();
    check('5. charges header reads "1 line · $…" and the pinned total equals #qiTot\'s total', /^1 line · \$\d/.test(v.byId.charges.sum) && v.totalShown && !!v.total && v.total === v.tot && v.byId.charges.sum.endsWith(v.total), { sum: v.byId.charges.sum, pinned: v.total, qiTot: v.tot });
    await pg.screenshot({ path: path.join(OUT, 'sections-charges-open.png') });

    // 6. one open at a time
    await tap(head('customer')); v = await view();
    check('6. tapping a closed header opens it and closes the one that was open', v.byId.customer.open && !v.byId.charges.open && v.nOpen === 1, v.secs.filter(s => s.open).map(s => s.id));

    // 7. pinned footer
    await pg.evaluate(() => { document.querySelector('.qi-ov').scrollTop = 0; }); await sleep(200);
    let g = await pg.evaluate(() => { const r = document.getElementById('qiGo').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: window.innerHeight }; });
    check('7. the Save button is on screen with the scroller at the top', g.top >= 0 && g.bottom <= g.h, g);

    // the pinned bar: small, holds only the total + the two main buttons; Send / Cancel are in the flow at the end
    const bar = await pg.evaluate(() => { const f = document.querySelector('.qs-foot'), vis = e => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; const btns = Array.from(f.querySelectorAll('button')).filter(vis).map(x => x.id);
      const sc = document.querySelector('.qi-ov'); sc.scrollTop = sc.scrollHeight; const fr = f.getBoundingClientRect(), cr = document.getElementById('qiCancel').getBoundingClientRect(); const r = { h: Math.round(fr.height), btns, total: vis(f.querySelector('.qs-total')), sendIn: f.contains(document.getElementById('qiSendRow')), cancelIn: f.contains(document.getElementById('qiCancel')), cancelAbove: cr.bottom <= fr.top + 1, cancelOn: cr.top >= 0, sendInDom: !!document.getElementById('qiSendRow'), goH: Math.round(document.getElementById('qiGo').getBoundingClientRect().height), sideways: sc.scrollWidth - sc.clientWidth }; sc.scrollTop = 0; return r; });
    check('7c. pinned bar <= 96px, holds only the total + #qiGo + #qiGoBook (estimate); Send row and Cancel are not in it and can be scrolled to', bar.h <= 96 && bar.total && bar.btns.join() === 'qiGoBook,qiGo' && !bar.sendIn && !bar.cancelIn && bar.cancelAbove && bar.cancelOn && bar.sendInDom && bar.goH >= 48 && bar.sideways <= 0, bar);
    results.push('INFO pinned bar height ' + bar.h + 'px; form height before ' + before + ', after ' + after);

    // 10. saving still works with the sections closed (documents saved by the form's own code)
    await pg.evaluate(() => TKS_SECTIONS.quoteForm(document.querySelector('.qi-ov')) && document.querySelector('.qi-box')._tksSections.close('customer')); await sleep(200);
    await tap('#qiGo'); await sleep(1800);
    const doc = await pg.evaluate(() => { const h = (getHistory()[0] || {}); return { type: h.docType, json: JSON.stringify(h) }; });
    check('10. Create still saves: the document has the customer, the vehicle and the line', doc.type === 'estimate' && /TEST Alex Sample/.test(doc.json) && /F-150/.test(doc.json) && /TEST Car lockout/.test(doc.json), { type: doc.type, len: doc.json.length });

    // ================= form B: expand-all, type / service switching =================
    await openForm(); await wrap();
    v = await view();
    check('   fresh form wraps again; the quote starts with "start" open', v.secs.length === 7 && v.byId.start.open && v.mode === 'Show everything', { mode: v.mode, ids: v.secs.map(s => s.id) });
    await tap('.qs-mode'); v = await view();
    const allVisibleOpen = v.secs.filter(s => s.shown).every(s => s.open);
    check('8. "Show everything" opens every visible section', allVisibleOpen && v.mode === 'One section at a time', { mode: v.mode, open: v.secs.filter(s => s.open).map(s => s.id) });
    await pg.evaluate(() => { document.querySelector('.qi-ov').scrollTop = 0; }); await sleep(200);
    g = await pg.evaluate(() => { const r = document.getElementById('qiGo').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: window.innerHeight }; });
    check('7b. everything open: the Save button is still pinned on screen', g.top >= 0 && g.bottom <= g.h, g);
    await openForm(); await wrap(); v = await view();
    check('8b. the choice is saved: a re-opened form is in expand-all mode', v.mode === 'One section at a time' && v.secs.filter(s => s.shown).every(s => s.open), { mode: v.mode });
    await tap('.qs-mode'); v = await view();
    check('8c. "One section at a time" restores one open at a time', v.mode === 'Show everything' && v.nOpen === 1, { mode: v.mode, nOpen: v.nOpen });

    await tap('.qiTB[data-t="invoice"]'); await sleep(200); v = await view();
    check('9. type Invoice: the payment section appears', v.byId.payment.shown, v.byId.payment);
    await tap('.qiSB[data-s="Residential"]'); await sleep(200); v = await view();
    const bk = await pg.evaluate(() => getComputedStyle(document.getElementById('qiGoBook')).display);
    check('9a. Invoice: #qiGoBook leaves the pinned bar', bk === 'none', bk);
    check('9b. service Residential: the vehicle section is hidden', !v.byId.vehicle.shown, v.byId.vehicle);

    // ================= form C: an error opens its section =================
    await openForm(); await wrap();
    await typeIn('#qiName', 'TEST Error Case');
    await tap('.qiTB[data-t="estimate"]');
    await pg.evaluate(() => { const r = document.querySelector('.qi-box')._tksSections; r.close('charges'); r.open('more'); }); await sleep(200);
    await tap('#qiGo'); await sleep(600); v = await view();
    check('11. an estimate with no lines: the form\'s error opens the Charges section', !!v.err && v.byId.charges.open && v.nOpen === 1, { err: v.err, open: v.secs.filter(s => s.open).map(s => s.id) });

    // 12. dark mode
    await pg.evaluate(() => document.documentElement.setAttribute('data-bt-theme', 'dark')); await sleep(300);
    const dark = await pg.evaluate(() => { const f = document.querySelector('.qs-foot'); return { bg: getComputedStyle(f).backgroundColor, box: getComputedStyle(document.querySelector('.qi-box')).backgroundColor }; });
    check('12. dark mode: the pinned footer is not white', dark.bg !== 'rgb(255, 255, 255)' && dark.bg !== 'rgba(0, 0, 0, 0)' && dark.bg === dark.box, dark);
    await pg.screenshot({ path: path.join(OUT, 'sections-dark.png') });
    check('13. no page errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
