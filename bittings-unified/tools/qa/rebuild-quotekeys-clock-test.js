// Browser test of 8z76: (1) Quick quote — pick a vehicle, see the keys in stock that fit with their prices, add one;
// (2) a technician can clock IN only on a shop computer and clock OUT anywhere.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 700) : '')); if (!ok) failed++; }
// stand-in for the clock functions on the server (same rule as supabase/phase8/8z76): state lives in localStorage.__clock
function stubClock() {
  const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__clockCalls = [];
  sb.rpc = function (name, args) {
    if (!/^shift_/.test(name)) return real(name, args);
    const st = JSON.parse(localStorage.getItem('__clock') || '{}'), role = localStorage.getItem('__role'); window.__clockCalls.push(name + ' ' + JSON.stringify(args || {}));
    let data = null, error = null;
    if (name === 'shift_status') data = st.open || null;
    else if (name === 'shift_rules') data = { shop_only: !!st.shop_only, shop_computers: st.computers || 0 };
    else if (name === 'shift_set_shop_only') { st.shop_only = !!args.p_on; data = { shop_only: st.shop_only, shop_computers: st.computers || 0 }; }
    else if (name === 'shift_clock_in') { const onPc = !!(args && args.p_device_id === 'dev-1' && args.p_device_token === 'secret-1');
      if (role === 'technician' && st.shop_only && (st.computers || 0) > 0 && !onPc) error = { message: 'Clock in on the shop computer. From a phone you can only clock out.' };
      else { st.open = { id: 'te1', clock_in: new Date().toISOString() }; data = Object.assign({ already_open: false, shop_computer: onPc }, st.open); } }
    else if (name === 'shift_clock_out') { if (!st.open) error = { message: 'not clocked in' }; else { data = { id: 'te1', clock_out: new Date().toISOString(), reason: args.p_reason }; st.open = null; } }
    localStorage.setItem('__clock', JSON.stringify(st));
    return new Promise(r => setTimeout(() => r({ data, error }), 40));
  };
}
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500, fcc_id: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'Aftermarket' }),
        K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 0, cost: 30, sell_price_cents: 16500, fcc_id: 'N5F-A08TAA', chip: 'Hitag Pro (ID49)', grade: 'OEM' }),
        K('key3', { name: 'TEST Ford transponder blank', sku: 'T-KEY3', category: 'Keys/Transponder', fitment: 'Ford 2011-2020', qty: 12, cost: 4, sell_price_cents: 4500, chip: 'ID49' }),
        K('key4', { name: 'TEST Ford 2013-2019 remote (no model listed)', sku: 'T-KEY4', category: 'Keys/Remote / Fob', fitment: 'Ford 2013-2019', qty: 2, cost: 15, sell_price_cents: 9900 }),
        K('key5', { name: 'TEST Toyota Camry 2012-2017 smart key', sku: 'T-KEY5', category: 'Keys/Smart Key', fitment: 'Toyota Camry 2012-2017', qty: 4, cost: 40, sell_price_cents: 19900 }),
        K('part9', { name: 'TEST door lock cylinder', sku: 'T-P9', category: 'Hardware/Locks', fitment: 'Ford F-150 2015-2017', qty: 5, sell_price_cents: 3000 })];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, services: [{ cat: 'automotive', en: 'TEST Smart key programming', es: '', value: 'TEST Smart key programming', price: '125' }] } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('tks_vehicle_keyways', JSON.stringify([{ make: 'Ford', model: 'F-150', year_start: 2015, year_end: 2020, keyway: 'HU101', transponder_system: 'Hitag Pro ID49', programming_path: 'OBD — all keys lost needs 10 min wait', oem_only: 'No', nastf_required: 'No', notes: '' }, { make: 'Toyota', model: '', year_start: 2010, year_end: 2019, keyway: 'TOY48', transponder_system: 'H chip', programming_path: 'OBD', oem_only: 'No', nastf_required: 'Yes' }]));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'samer@turbokeysmith.com' } }));
    }, UID);

    // ================= 1. Quick quote: vehicle → keys and prices =================
    await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(350); };
    let r = await pg.evaluate(() => ({ title: document.getElementById('qiTitle').innerText, veh: getComputedStyle(document.getElementById('qiVehWrap')).display, keys: document.getElementById('qiKeys').innerText }));
    check('Quick quote opens with the vehicle fields and no key list yet', /Quick quote/.test(r.title) && r.veh !== 'none' && r.keys === '', r);
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford');
    r = await pg.evaluate(() => document.getElementById('qiKeys').innerText.replace(/\s+/g, ' '));
    check('with only the make chosen it asks for the model', /Pick the model/.test(r), r);
    await setSel('qiVModel', 'F-150'); await sleep(300);
    r = await pg.evaluate(() => { const box = document.getElementById('qiKeys'); box.querySelectorAll('.qk-grp').forEach(x => { x.hidden = false; });   /* 8z147: the kinds of key are collapsing bars now — open them all to read the list */ return { head: box.querySelector('.qk-h').innerText, facts: Array.from(box.querySelectorAll('.qk-facts span')).map(x => x.innerText), groups: Array.from(box.querySelectorAll('.qk-g, .qk-gb .qk-gt')).map(x => x.innerText), rows: Array.from(box.querySelectorAll('.qk-row')).map(x => x.innerText.replace(/\s+/g, ' ')), more: (box.querySelector('#qkMore') || {}).innerText, addH: Math.round(box.querySelector('.qk-add').getBoundingClientRect().height), overflow: document.querySelector('.qi-box').scrollWidth - document.querySelector('.qi-box').clientWidth }; });
    check('picking 2015 Ford F-150 lists the keys in stock that fit it, grouped, with shelf price and how many are on the shelf',
      /Keys for 2015 Ford F-150/.test(r.head) && r.rows.length === 3 && /TEST FORD F-150 2015-2017 5-Button PEPS ?AM FCC M3N-A2C31243300 · Hitag Pro \(ID49\) · T-KEY1 In stock: 6 \$225\.00 \+ Add/.test(r.rows[0]) &&
      r.rows.some(x => /Flip Key ?OEM .* Out of stock \$165\.00/.test(x)) && r.rows.some(x => /transponder blank .* In stock: 12 · ✓ same chip as this car's keys \$45\.00/.test(x)) &&
      /SMART KEYS/i.test(r.groups[0]) && r.addH >= 44 && r.overflow <= 0, r);
    check('a non-key part and another make\'s key are not listed; "make and year only" keys are held back as "might fit"', !r.rows.some(x => /cylinder|Camry/.test(x)) && /Show 1 that might fit/.test(r.more || ''), { more: r.more });
    check('the vehicle\'s reference facts show above the list (keyway, chip system, how it is programmed)', r.facts.join('|') === 'Keyway HU101|Chip system: Hitag Pro ID49|Programming: OBD — all keys lost needs 10 min wait', r.facts);
    await pg.evaluate(() => document.getElementById('qiKeys').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'quote-keys.png') });
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add[data-id="key1"]').click()); await sleep(900);
    r = await pg.evaluate(() => ({ lines: Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc).map(x => x.querySelector('.qiDesc').value + ' | ' + x.querySelector('.qiAmt').value + ' | qty ' + x.querySelector('.qiQty').value + ' | cost ' + x.querySelector('.qiCost').value + ' | ' + x.querySelector('.qiCat').value + ' | tax ' + x.querySelector('.qiTax').checked + ' | part ' + x.dataset.part), added: (document.querySelector('#qiKeys .qk-added') || {}).innerText, addBtns: document.querySelectorAll('#qiKeys .qk-add').length, tot: (document.getElementById('qiTot') || {}).innerText.replace(/\s+/g, ' ') }));
    check('"+ Add" puts the key on the quote as one line at its shelf price (taxed part, tied to stock, cost filled, blank line gone)', r.lines.length === 1 && /^TEST FORD F-150 2015-2017 5-Button PEPS \| 225\.00 \| qty 1 \| cost 45(\.00)? \| Materials \| tax true \| part key1$/.test(r.lines[0]) && /Added/.test(r.added || '') && r.addBtns === 2 && /225\.00/.test(r.tot) && /244\.41/.test(r.tot), r);
    await pg.evaluate(() => document.getElementById('qkMore').click()); await sleep(300);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#qiKeys .qk-row')).map(x => x.innerText.replace(/\s+/g, ' ')).filter(x => /no model listed/.test(x)));
    check('"might fit" opens on request and says why it is not confirmed', r.length === 1 && /Lists Ford for this year, no model — check it fits/.test(r[0]) && /\$99\.00/.test(r[0]), r);
    await pg.evaluate(() => { const row = Array.from(document.querySelectorAll('.qi-item')).find(x => x.dataset.part === 'key1'); row.querySelector('.qiDel').click(); }); await sleep(400);
    r = await pg.evaluate(() => ({ again: !!document.querySelector('#qiKeys .qk-add[data-id="key1"]'), lines: document.querySelectorAll('.qi-item').length }));
    check('removing the line makes the key addable again', r.again && r.lines === 0, r);
    await setSel('qiVYear', '2014'); await setSel('qiVMake', 'Toyota'); await setSel('qiVModel', 'Camry'); await sleep(300);
    r = await pg.evaluate(() => ({ rows: Array.from(document.querySelectorAll('#qiKeys .qk-row')).map(x => x.innerText.replace(/\s+/g, ' ')), facts: Array.from(document.querySelectorAll('#qiKeys .qk-facts span')).map(x => x.innerText), sub: document.getElementById('qiKeys').innerText }));
    check('changing the vehicle changes the list (2014 Toyota Camry → the Camry key, NASTF flagged from the make-level reference)', r.rows.length === 1 && /Camry 2012-2017 smart key T-KEY5 In stock: 4 \$199\.00/.test(r.rows[0]) && r.facts.indexOf('NASTF needed') >= 0 && /no entry for this exact model/.test(r.sub), r);
    // a technician sees the same list and prices, never the cost
    await pg.evaluate(async () => { localStorage.setItem('__role', 'technician'); try { await TKS.clearDeviceCache(); } catch (e) {} });
    await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(300);
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add[data-id="key1"]').click()); await sleep(600);
    r = await pg.evaluate(() => { const x = Array.from(document.querySelectorAll('.qi-item')).find(y => y.dataset.part === 'key1'); return { rows: document.querySelectorAll('#qiKeys .qk-row').length, price: x && x.querySelector('.qiAmt').value, costShown: x ? getComputedStyle(x.querySelector('.f.cost')).display : null, text: document.getElementById('qiKeys').innerText }; });
    check('a technician gets the same keys and prices; the cost box stays hidden', r.rows === 3 && r.price === '225.00' && r.costShown === 'none' && !/45\.00\b.*cost/i.test(r.text), { rows: r.rows, price: r.price, costShown: r.costShown });
    check('quote page: no errors', errs.length === 0, errs.slice(0, 4));

    // ================= 2. Clock: technicians clock in on the shop computer only =================
    const openApp = async (role, clock, dev) => {
      await pg.evaluate((role, clock, dev) => { localStorage.setItem('__role', role); localStorage.setItem('__clock', JSON.stringify(clock));
        if (dev) { localStorage.setItem('tks_tc_device_id', 'dev-1'); localStorage.setItem('tks_tc_device_token', 'secret-1'); } else { localStorage.removeItem('tks_tc_device_id'); localStorage.removeItem('tks_tc_device_token'); } }, role, clock, dev);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
      await pg.evaluate(stubClock); await pg.evaluate(() => { clkState.at = 0; clkState.ruleAt = 0; clkRefresh(true); }); await sleep(500);
    };
    const btn = () => pg.evaluate(() => { const x = document.getElementById('clkBtn'); return x ? x.innerText.replace(/\s+/g, ' ') : null; });
    const dismiss = () => pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); if (!d) return null; const t = d.innerText.replace(/\s+/g, ' '); const ok = d.querySelector('button'); if (ok) ok.click(); return t; });

    await openApp('technician', { shop_only: true, computers: 1 }, false);
    r = { btn: await btn() };
    check('technician on a phone: the button says to clock in at the shop computer', r.btn === '⏱ Clock in at the shop computer', r);
    await pg.screenshot({ path: path.join(OUT, 'clock-phone-blocked.png'), clip: { x: 0, y: 0, width: 390, height: 260 } });
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(400);
    r = { msg: await dismiss(), calls: await pg.evaluate(() => window.__clockCalls.filter(c => /^shift_clock_in/.test(c))), open: await pg.evaluate(() => JSON.parse(localStorage.getItem('__clock')).open || null) };
    check('tapping it explains why and does NOT clock in', /Clocking in is done on the shop computer/.test(r.msg || '') && r.calls.length === 0 && r.open === null, r);
    // an old copy of the app that still tries is refused by the server, and says why
    r = await pg.evaluate(() => new Promise(res => { clkState.rule = null; clkPaint(); const b2 = document.getElementById('clkBtn'); const t = b2.innerText; b2.click(); setTimeout(() => res({ before: t, open: JSON.parse(localStorage.getItem('__clock')).open || null, calls: window.__clockCalls.filter(c => /^shift_clock_in/.test(c)) }), 500); }));
    const m2 = await dismiss();
    check('even if a phone does send a clock-in, the server refuses it and the app shows the reason', /Clock in$/.test(r.before.trim()) && r.open === null && r.calls.length === 1 && /shop computer/.test(m2 || ''), { r, m2 });

    await openApp('technician', { shop_only: true, computers: 1 }, true);
    r = { btn: await btn() };
    check('technician on the marked shop computer: a normal Clock in button', r.btn === '⏱ Clock in', r);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(500);
    r = { btn: await btn(), calls: await pg.evaluate(() => window.__clockCalls.filter(c => /^shift_clock_in/.test(c))) };
    check('…and clocking in there works (the computer identifies itself to the server)', /On the clock since .* Clock out/.test(r.btn || '') && /"p_device_id":"dev-1","p_device_token":"secret-1"/.test(r.calls[0] || ''), r);

    await openApp('technician', { shop_only: true, computers: 1, open: { id: 'te1', clock_in: new Date(Date.now() - 3 * 3600000).toISOString() } }, false);
    r = { btn: await btn() };
    check('already on the clock, now on a phone: the button offers Clock out', /On the clock since .* Clock out/.test(r.btn || ''), r);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300);
    await pg.evaluate(() => document.querySelector('.clk-sheet [data-r="end_of_day"]').click()); await sleep(600);
    r = { btn: await btn(), open: await pg.evaluate(() => JSON.parse(localStorage.getItem('__clock')).open || null), calls: await pg.evaluate(() => window.__clockCalls.filter(c => /^shift_clock_out/.test(c))) };
    check('clocking OUT from the phone works; afterwards the phone cannot clock back in', r.open === null && r.calls.length === 1 && r.btn === '⏱ Clock in at the shop computer', r);

    await openApp('technician', { shop_only: true, computers: 0 }, false);
    r = { btn: await btn() };
    check('no shop computer marked yet: the phone keeps working, so nobody is locked out', r.btn === '⏱ Clock in', r);
    await openApp('technician', { shop_only: false, computers: 1 }, false);
    check('rule switched off: technicians clock in anywhere', (await btn()) === '⏱ Clock in');
    await openApp('manager', { shop_only: true, computers: 1 }, false);
    check('a manager is not affected', (await btn()) === '⏱ Clock in');

    // ================= 3. Settings: the switch and marking the shop computer =================
    await openApp('owner', { shop_only: true, computers: 0 }, false);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click()); await sleep(900);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('.railItem')).find(x => /Time clock/.test(x.innerText)); if (it) it.click(); }); await sleep(900);
    r = await pg.evaluate(() => { const so = document.getElementById('f_tcShopOnly'); return so ? { on: so.checked, msg: document.getElementById('f_tcShopOnlyMsg').innerText, devLabel: document.getElementById('f_tcDevice').closest('label').innerText.replace(/\s+/g, ' ') } : null; });
    check('Settings → Time clock shows the rule ON and says plainly it is not in force until a shop computer is marked', !!r && r.on === true && /NOT in force yet: no shop computer is marked/.test(r.msg) && /This device is a shop computer \(technicians clock in here\)/.test(r.devLabel), r);
    await pg.evaluate(() => document.getElementById('f_tcShopOnly').closest('.card').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'clock-settings.png') });
    await pg.evaluate(() => { const so = document.getElementById('f_tcShopOnly'); so.checked = false; so.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(500);
    r = await pg.evaluate(() => ({ msg: document.getElementById('f_tcShopOnlyMsg').innerText, saved: JSON.parse(localStorage.getItem('__clock')).shop_only }));
    check('the owner can switch the rule off (and on) from that screen', /Off — technicians can clock in from any device/.test(r.msg) && r.saved === false, r);
    check('main app: no errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
