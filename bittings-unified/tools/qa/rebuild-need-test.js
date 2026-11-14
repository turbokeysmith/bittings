// Browser test of 8z142:
//  (1) the estimate asks "What do they need?" — 🔑 a key / 🔧 a service. A service: the shop's services are buttons at the top and
//      the key list is left out. A key: the key list as before, services just above the line items.
//  (2) the dashboard's "Jobs by type" sorts every completed job into a real type (no more "Something else").
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-need-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8105, BASE = 'http://127.0.0.1:' + PORT;
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
      const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); const today = d.toISOString().slice(0, 10);
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500 }),
        K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 2, cost: 30, sell_price_cents: 16500 }),
        K('key3', { name: 'TEST Ford transponder blank', sku: 'T-KEY3', category: 'Keys/Transponder', fitment: 'Ford F-150 2011-2020', qty: 12, cost: 4, sell_price_cents: 4500 })];
      const S = (cat, value, price) => ({ cat, en: value, es: '', value, price: price == null ? '' : String(price) });
      const services = [S('automotive', 'TEST Car lockout', 65), S('automotive', 'TEST Smart key programming', 125), S('automotive', 'TEST Service call', 95), S('automotive', 'TEST Ignition repair'), S('automotive', 'TEST Key fob programming', 75),
        S('residential', 'TEST Rekey', 15), S('residential', 'TEST House lockout', 85)];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, serviceCats: ['automotive', 'residential', 'commercial'], services } }];
      const J = (id, o) => ({ id, shop_id: 's', date: today, time: '09:00', customer_name: 'TEST ' + id, deleted_at: null, updated_at: iso, data: Object.assign({ id, date: today, time: '09:00', status: 'Completed', customer: { name: 'TEST ' + id, phone: '4055550100' } }, o) });
      const it = (...x) => x.map(desc => ({ desc, qty: 1, each: 50, taxable: false }));
      const bookings = [
        J('j1', { jobType: 'auto', subType: 'AKL', items: it('Service call', 'Cut customer key') }), J('j2', { jobType: 'auto', subType: 'akl' }),
        J('j3', { jobType: 'auto', subType: 'Car lockout', items: it('Car lockout') }),
        J('j4', { jobType: 'auto', subType: 'SERVICE CALL', items: it('Service call', 'Key fob / remote programming') }),
        J('j5', { jobType: 'res', subType: 'REKEY', items: it('Service call', 'Rekey') }),
        J('j6', { jobType: 'res', subType: 'CYLINDER REPAIR/ REPLACEMENT', items: it('Lock change / replacement') }),
        J('j7', { jobType: 'auto', subType: 'TEST see notes' }),
        J('j8', { jobType: 'auto', subType: 'lockout', status: 'Scheduled' })];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings, shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);

    // ================= 1. the estimate: a key, or a service =================
    await pg.goto(BASE + '/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(350); };
    const tap = async (sel) => { await pg.evaluate((sel) => document.querySelector(sel).click(), sel); await sleep(450); };
    const state = () => pg.evaluate(() => { const vis = el => !!el && getComputedStyle(el).display !== 'none'; const chips = id => Array.from(document.querySelectorAll('#' + id + ' .qq-b')).map(x => x.innerText.replace(/\s+/g, ' ').trim());
      const box = document.querySelector('.qi-box'), q = document.getElementById('qiNeedWrap');
      return { ask: vis(q), on: Array.from(document.querySelectorAll('.qiNeedB.on')).map(x => x.dataset.need).join(','), top: chips('qiQuickTop'), low: chips('qiQuickLow'), topHead: (document.querySelector('#qiQuickTop .qq-h') || {}).innerText || '', lowHead: (document.querySelector('#qiQuickLow .qq-h') || {}).innerText || '',
        keys: document.querySelectorAll('#qiKeys .qk-row').length, keysText: document.getElementById('qiKeys').innerText.trim(), nastf: vis(document.getElementById('qiNastfWrap')), veh: vis(document.getElementById('qiVehWrap')),
        lines: Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.classList.contains('disc')).map(x => x.querySelector('.qiDesc').value + ' | ' + x.querySelector('.qiAmt').value + ' | ' + x.querySelector('.qiCat').value + ' | tax ' + x.querySelector('.qiTax').checked),
        overflow: box.scrollWidth - box.clientWidth, minH: Math.min.apply(null, Array.from(document.querySelectorAll('.qiNeedB, .qq-b')).map(x => Math.round(x.getBoundingClientRect().height)).concat([999])) }; });

    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(300);
    let r = await state();
    check('a new car estimate asks "What do they need?" with nothing chosen; the screen is as before (key list shown, no service buttons)', r.ask && r.on === '' && r.top.length === 0 && r.low.length === 0 && r.keys === 3 && r.nastf && r.veh, r);

    await tap('.qiNeedB[data-need="service"]'); r = await state();
    check('"A service": the shop\'s car services appear as buttons right under the question, with prices — lockout and repair first, key work after',
      r.on === 'service' && r.low.length === 0 && /Which service/.test(r.topHead) && r.top.join(' ; ') === 'TEST Car lockout$65.00 ; TEST Ignition repair ; TEST Service call$95.00 ; TEST Key fob programming$75.00 ; TEST Smart key programming$125.00', r.top);
    check('"A service": the key list is gone (nothing to scroll past) and so is the NASTF key paperwork; the vehicle boxes stay', r.keys === 0 && r.keysText === '' && !r.nastf && r.veh, { keys: r.keys, keysText: r.keysText, nastf: r.nastf, veh: r.veh });
    check('the buttons are finger-sized and nothing runs off a phone screen', r.minH >= 44 && r.overflow <= 0, { minH: r.minH, overflow: r.overflow });
    await pg.evaluate(() => document.getElementById('qiNeedWrap').scrollIntoView({ block: 'start' })); await sleep(250);

    await tap('#qiQuickTop .qq-b[data-n="TEST Car lockout"]'); r = await state();
    check('one tap puts the service on the estimate at its price (a labor line, not taxed) and ticks the button', r.lines.length === 1 && r.lines[0] === 'TEST Car lockout | 65.00 | Labor | tax false' && /^✓ TEST Car lockout/.test(r.top[0]), { lines: r.lines, chip: r.top[0] });
    await pg.screenshot({ path: path.join(OUT, 'need-service.png') });
    await tap('#qiQuickTop .qq-b[data-n="TEST Car lockout"]'); r = await state();
    check('tapping it again does not add it twice', r.lines.length === 1, r.lines);
    await tap('#qiQuickTop .qq-b[data-n="TEST Ignition repair"]'); r = await state();
    check('a service with no set price is added with the price left to type', r.lines.length === 2 && /^TEST Ignition repair \|  \| Labor/.test(r.lines[1]), r.lines);
    await pg.evaluate(() => { const row = Array.from(document.querySelectorAll('.qi-item')).find(x => x.querySelector('.qiDesc').value === 'TEST Ignition repair'); row.querySelector('.qiDel').click(); }); await sleep(500);
    r = await state();
    check('removing the line un-ticks its button', r.lines.length === 1 && r.top.indexOf('TEST Ignition repair') >= 0, r.top);

    // save → the answer is kept on the estimate
    await tap('#qiGo'); await sleep(1500);
    let doc = await pg.evaluate(() => { const h = getHistory()[0] || {}; return { type: h.docType, need: h.need, svc: h.serviceType, items: (h.items || []).map(x => x.desc + ' ' + x.amount), num: h.number }; });
    check('the estimate saves with "a service" on it', doc.type === 'estimate' && doc.need === 'service' && doc.items.join(';') === 'TEST Car lockout 65', doc);
    await pg.evaluate(() => { openQuickInvoice(null, getHistory()[0]); }); await sleep(1500);
    r = await state();
    check('opening it again shows the same choice and layout', r.on === 'service' && r.top.length === 5 && r.keys === 0 && r.lines.length === 1, { on: r.on, top: r.top.length, keys: r.keys, lines: r.lines });

    // switch to "a key" (the lockout line comes off first — this one is a key job)
    await pg.evaluate(() => { const row = Array.from(document.querySelectorAll('.qi-item')).find(x => x.querySelector('.qiDesc').value === 'TEST Car lockout'); row.querySelector('.qiDel').click(); }); await sleep(400);
    await tap('.qiNeedB[data-need="key"]'); await sleep(300); r = await state();
    check('"A key": the key list for the vehicle is back, and the services sit just above the line items — programming first',
      r.on === 'key' && r.keys === 3 && r.top.length === 0 && /Add a service/.test(r.lowHead) && r.nastf && r.low.join(' ; ') === 'TEST Key fob programming$75.00 ; TEST Smart key programming$125.00 ; TEST Car lockout$65.00 ; TEST Ignition repair ; TEST Service call$95.00', { on: r.on, keys: r.keys, low: r.low, nastf: r.nastf });
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add[data-id="key1"]').click()); await sleep(700);
    await tap('#qiQuickLow .qq-b[data-n="TEST Smart key programming"]'); r = await state();
    check('a key job: the key from the list plus programming from the buttons', r.lines.length === 2 && r.lines.some(x => /^TEST FORD F-150 2015-2017 5-Button PEPS \| 225\.00 \| Materials \| tax true$/.test(x)) && r.lines.some(x => x === 'TEST Smart key programming | 125.00 | Programming | tax false'), r.lines);
    await pg.evaluate(() => document.getElementById('qiQuickLow').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'need-key.png') });
    await tap('.qiNeedB[data-need="key"]'); r = await state();
    check('tapping the chosen answer again clears it (back to the screen as it always was)', r.on === '' && r.top.length === 0 && r.low.length === 0 && r.keys === 3, { on: r.on, top: r.top.length, low: r.low.length, keys: r.keys });

    // house work has no key list: no question, services at the top
    await tap('.qiSB[data-s="Residential"]'); r = await state();
    check('a house job does not ask (it has no key list); its services are the buttons at the top', !r.ask && r.top.join(' ; ') === 'TEST House lockout$85.00 ; TEST Rekey$15.00' && r.low.length === 0, { ask: r.ask, top: r.top, low: r.low });
    await tap('.qiSB[data-s="Automotive"]'); await tap('.qiNeedB[data-need="key"]');
    await tap('#qiGo'); await sleep(1500);
    doc = await pg.evaluate(() => { const h = getHistory()[0] || {}; return { need: h.need, n: (h.items || []).length, num: h.number }; });
    check('saved again as "a key"', doc.need === 'key' && doc.n === 2, doc);
    check('estimate page: no errors', errs.length === 0, errs.slice(0, 4));

    // schedule it → the job carries the answer
    await pg.evaluate(() => { estimateToJob(getHistory()[0]); });
    await pg.waitForFunction(() => /index\.html/.test(location.pathname) && window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 });
    await pg.waitForSelector('#sjSave', { timeout: 15000 }); await sleep(800);
    await pg.evaluate(() => { const d = new Date(Date.now() + 86400000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('sjDate', d.toISOString().slice(0, 10)); set('sjTime', '10:30'); if (!document.getElementById('sjName').value) set('sjName', 'TEST Caller'); if (!document.getElementById('sjPhone').value) set('sjPhone', '4055550199'); if (!document.getElementById('sjStreet').value) set('sjStreet', '1 TEST St'); });
    await sleep(300); await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1500);
    r = await pg.evaluate((num) => { const j = (TKS.Bookings.all() || []).find(x => x.fromEstimate === num); return j ? { need: j.need, sub: j.subType, items: (j.items || []).length, kind: TKS.JobKinds.classify(j).label } : { msg: (document.getElementById('sjMsg') || {}).textContent || 'no job' }; }, doc.num);
    check('"Schedule this job" hands the answer to the job, and the job reads as a key job', r.need === 'key' && r.items === 2 && r.kind === 'Spare key / programming', r);
    // 8z144: the job was booked for TOMORROW in the Quick form — the board moves to that day, so the new job is in front of you
    r = await pg.evaluate(() => ({ cards: Array.from(document.querySelectorAll('.sch-card')).map(x => x.innerText.replace(/\s+/g, ' ')).filter(x => /10:30 AM/.test(x) && /TEST FORD F-150/.test(x)).length, today: Array.from(document.querySelectorAll('.sch-card')).filter(x => /TEST j\d/.test(x.innerText)).length, open: !!document.getElementById('sjSave') }));
    check('a new Quick-form job for another day: the form closes and the board lands on that day with the job showing (today\'s jobs are not on it)', r.cards === 1 && r.today === 0 && !r.open, r);

    // ================= 2. the dashboard: Jobs by type =================
    await pg.evaluate(() => { try { localStorage.setItem('tks_dash_period', JSON.stringify({ kind: 'day', off: 0 })); } catch (e) {} });
    await pg.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => { try { _dashP = { kind: 'day', off: 0 }; } catch (e) {} openDashboard(); }); await sleep(1500);
    r = await pg.evaluate(() => { const box = document.getElementById('dashTypes'); return { rows: Array.from(box.querySelectorAll('.ty')).map(x => x.querySelector('.ty-top').innerText.replace(/\s+/g, ' ').trim()), foot: document.getElementById('dashFoot').innerText, overflow: document.documentElement.scrollWidth - window.innerWidth }; });
    check('Jobs by type sorts today\'s seven completed jobs into real types — biggest first, with how many and the share; the scheduled one is not counted',
      r.rows.join(' ; ') === 'All keys lost 2 · 29% ; Car lockout 1 · 14% ; Spare key / programming 1 · 14% ; Rekey 1 · 14% ; Lock change / repair 1 · 14% ; Other car work 1 · 14%', r.rows);
    check('no job is "Something else" any more, and the note under the chart says where the type comes from', !/Something else/.test(r.rows.join(' ')) && /type comes from its “Service \/ details” and its charges/.test(r.foot) && r.overflow <= 0, { overflow: r.overflow });
    await pg.evaluate(() => document.getElementById('dashTypes').scrollIntoView({ block: 'center' })); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'jobs-by-type.png') });
    check('app page: no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
