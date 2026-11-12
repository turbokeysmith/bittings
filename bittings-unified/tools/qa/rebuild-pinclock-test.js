// Browser test of 8z77: every person can set their own PIN from the menu (a technician has no Settings), and a shop
// computer clocks a person in by PIN without signing anyone out (top bar + lock screen).
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
// stand-in for the server (same rules as supabase/phase8/8z76 + 8z77): state lives in localStorage.__clock
function stubClock() {
  const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__clockCalls = [];
  sb.rpc = function (name, args) {
    if (!/^shift_|^set_my_pin$/.test(name)) return real(name, args);
    const st = JSON.parse(localStorage.getItem('__clock') || '{}'), role = localStorage.getItem('__role'); window.__clockCalls.push(name + ' ' + JSON.stringify(args || {}));
    st.pins = st.pins || {}; let data = null, error = null;
    const onPc = !!(args && args.p_device_id === 'dev-1' && args.p_device_token === 'secret-1');
    if (name === 'shift_status') data = st.open || null;
    else if (name === 'shift_rules') data = { shop_only: !!st.shop_only, shop_computers: st.computers || 0, has_pin: !!st.has_pin };
    else if (name === 'set_my_pin') { const n = (role === 'owner' || role === 'manager') ? 6 : 4;
      if (!new RegExp('^\\d{' + n + '}$').test(args.p_pin)) error = { message: 'your PIN must be exactly ' + n + ' digits' };
      else if (args.p_pin === '1111') error = { message: 'that PIN is already taken in this shop — pick another' };
      else { st.pins[args.p_pin] = 'TEST Jayden'; st.has_pin = true; } }
    else if (name === 'shift_clock_in') {
      if (role === 'technician' && st.shop_only && (st.computers || 0) > 0 && !onPc) error = { message: 'Clock in on the shop computer. From a phone you can only clock out.' };
      else { st.open = { id: 'te1', clock_in: new Date().toISOString() }; data = Object.assign({ already_open: false, shop_computer: onPc }, st.open); } }
    else if (name === 'shift_clock_in_pin') {
      if (!onPc) error = { message: 'Clocking in by PIN only works on a shop computer.' };
      else if (!st.pins[args.p_pin]) data = { ok: false, code: 'bad_pin', error: 'That PIN is not recognised. Check it, or set one from your own phone: menu → My PIN.' };
      else if (st.techOpen) data = { ok: true, already_open: true, name: st.pins[args.p_pin], clock_in: st.techOpen };
      else { st.techOpen = new Date().toISOString(); data = { ok: true, already_open: false, name: st.pins[args.p_pin], clock_in: st.techOpen }; } }
    localStorage.setItem('__clock', JSON.stringify(st));
    return new Promise(r => setTimeout(() => r({ data, error }), 40));
  };
  // the lock screen's PIN check: right PIN, but that person has not clocked in yet
  sb.functions.invoke = function (name) { window.__clockCalls.push('fn ' + name);
    return Promise.resolve({ data: null, error: { message: 'Edge Function returned a non-2xx status code', context: { json: () => Promise.resolve({ error: "PIN accepted, but TEST Jayden isn't clocked in. Start the day with a full login (username + password).", code: 'not_clocked_in', name: 'TEST Jayden' }) } } }); };
}
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, PC = { width: 1280, height: 800, deviceScaleFactor: 1 };
    await pg.setViewport(PHONE);
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, timeclock: { enabled: true, idleMin: 5 }, identity: { name: 'TEST Shop' } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'technician'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    let r;
    const openApp = async (role, clock, dev, vp, lockable) => {
      await pg.setViewport(vp || PHONE);
      await pg.evaluate(async (role, clock, dev, lockable) => { localStorage.setItem('__role', role); localStorage.setItem('__clock', JSON.stringify(clock)); try { await TKS.clearDeviceCache(); } catch (e) {}
        localStorage.setItem('__role', role); localStorage.setItem('__clock', JSON.stringify(clock));
        if (dev) { localStorage.setItem('tks_tc_device_id', 'dev-1'); localStorage.setItem('tks_tc_device_token', 'secret-1'); } else { localStorage.removeItem('tks_tc_device_id'); localStorage.removeItem('tks_tc_device_token'); }
        localStorage.setItem('tks_tc_device', lockable ? '1' : '0'); }, role, clock, dev, !!lockable);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
      await pg.evaluate(stubClock); await pg.evaluate(() => { clkState.at = 0; clkState.ruleAt = 0; clkRefresh(true); clkLoadRule(true); updateAuthUI(); }); await sleep(600);
    };
    const top = () => pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); return d ? d.innerText.replace(/\s+/g, ' ').trim() : null; });
    const tap = (sel) => pg.evaluate((sel) => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); const x = d && d.querySelector(sel); if (x) x.click(); return !!x; }, sel);
    const typeOk = (v) => pg.evaluate((v) => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); const i = d && d.querySelector('#uiPI'); if (!i) return false; i.value = v; d.querySelector('[data-yes]').click(); return true; }, v);
    const calls = (re) => pg.evaluate((src) => window.__clockCalls.filter(c => new RegExp(src).test(c)), re);
    const state = () => pg.evaluate(() => JSON.parse(localStorage.getItem('__clock') || '{}'));

    // ================= 1. A technician sets his own PIN from his phone =================
    await openApp('technician', { shop_only: true, computers: 1 }, false);
    r = await pg.evaluate(() => { const m = document.getElementById('sideMyPin'), s = document.getElementById('sideSettings'); return { myPin: m && m.style.display !== 'none' ? m.innerText.replace(/\s+/g, ' ').trim() : null, settingsShown: !!(s && s.style.display !== 'none' && !s.classList.contains('tks-cap-hidden') && s.offsetParent), stationBtn: !!document.getElementById('clkPinBtn'), btn: (document.getElementById('clkBtn') || {}).innerText }; });
    check('technician phone: the menu has "My PIN" (he has no Settings), and no PIN station button', /My PIN$/.test(r.myPin || '') && r.settingsShown === false && r.stationBtn === false && /Clock in at the shop computer/.test(r.btn || ''), r);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300);
    r = await top();
    check('tapping the blocked clock button says how to clock in and offers to set a PIN (he has none)', /tap "Clock in by PIN" there/.test(r || '') && /You do not have a PIN yet/.test(r || '') && /Set my PIN/.test(r || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'pin-phone-offer.png') });
    await tap('[data-yes]'); await sleep(300);
    r = await top();
    check('"Set my PIN" asks a technician for 4 digits', /Set my PIN/.test(r || '') && /Pick 4 digits/.test(r || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'pin-phone-set.png') });
    await typeOk('123'); await sleep(300);
    r = { msg: await top(), sent: await calls('^set_my_pin') };
    check('3 digits is refused before anything is sent', /must be exactly 4 digits/.test(r.msg || '') && r.sent.length === 0, r);
    await tap('[data-ok]'); await sleep(300);
    await typeOk('1111'); await sleep(400);
    r = await top();
    check('a PIN a teammate already uses is refused with the server\'s reason', /PIN not saved/.test(r || '') && /already taken/.test(r || ''), r);
    await tap('[data-ok]'); await sleep(300);
    await typeOk('4821'); await sleep(400);
    r = { msg: await top(), sent: await calls('^set_my_pin'), st: await state() };
    check('a good PIN is saved and he is told what to do with it', /PIN saved/.test(r.msg || '') && /tap "Clock in by PIN"/.test(r.msg || '') && /"p_pin":"4821"/.test(r.sent[r.sent.length - 1] || '') && r.st.has_pin === true, r);
    await tap('[data-ok]'); await sleep(500);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300);
    r = { msg: await top(), ins: await calls('^shift_clock_in') };
    check('with a PIN the phone just explains (no offer), and still cannot clock in', /tap "Clock in by PIN" and type your PIN/.test(r.msg || '') && !/Set my PIN/.test(r.msg || '') && r.ins.length === 0, r);
    await tap('[data-ok]'); await sleep(200);
    await pg.evaluate(() => document.getElementById('sideMyPin').click()); await sleep(300);
    r = await top();
    check('the menu button opens the same box (now "Change my PIN")', /Change my PIN/.test(r || '') && /Pick 4 digits/.test(r || ''), r);
    await tap('[data-no]'); await sleep(200);

    // ================= 2. The shop computer: clock in by PIN, whoever is signed in =================
    await openApp('owner', { shop_only: true, computers: 1, has_pin: false, pins: { '4821': 'TEST Jayden' } }, true, PC);
    r = await pg.evaluate(() => ({ own: !!document.getElementById('clkBtn'), station: (document.getElementById('clkPinBtn') || {}).innerText || null, role: (document.querySelector('#authBar .rolebadge') || {}).innerText }));
    check('shop computer, owner signed in: the top bar has "Clock in by PIN"', r.own === false && /Clock in by PIN/.test(r.station || '') && /Owner/i.test(r.role || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'pin-pc-topbar.png'), clip: { x: 0, y: 0, width: 1280, height: 150 } });
    await pg.evaluate(() => document.getElementById('clkPinBtn').click()); await sleep(300);
    r = await pg.evaluate(() => { const i = document.getElementById('uiPI'); return i ? { hidden: i.style.webkitTextSecurity, max: i.getAttribute('maxlength'), text: i.closest('.chg-modal').innerText.replace(/\s+/g, ' ') } : null; });
    check('it asks for the PIN (digits hidden as you type)', !!r && r.hidden === 'disc' && r.max === '6' && /Type your own PIN/.test(r.text), r);
    await pg.screenshot({ path: path.join(OUT, 'pin-pc-ask.png') });
    await typeOk('0000'); await sleep(400);
    r = { msg: await top(), st: await state() };
    check('a wrong PIN is refused and nobody is clocked in', /Could not clock in/.test(r.msg || '') && /not recognised/.test(r.msg || '') && !r.st.techOpen, r);
    await tap('[data-ok]'); await sleep(300);
    r = await top();
    check('…and it asks again', /Type your own PIN/.test(r || ''), r);
    await typeOk('4821'); await sleep(500);
    r = { msg: await top(), sent: await calls('^shift_clock_in_pin'), st: await state(), role: await pg.evaluate(() => (document.querySelector('#authBar .rolebadge') || {}).innerText) };
    check('the right PIN clocks that person in; the computer identifies itself; the owner stays signed in',
      /Clocked in/.test(r.msg || '') && /TEST Jayden — clocked in at \d/.test(r.msg || '') && /"p_pin":"4821","p_device_id":"dev-1","p_device_token":"secret-1"/.test(r.sent[r.sent.length - 1] || '') && !!r.st.techOpen && !r.st.open && /Owner/i.test(r.role || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'pin-pc-done.png') });
    await tap('[data-ok]'); await sleep(200);
    await pg.evaluate(() => document.getElementById('clkPinBtn').click()); await sleep(300);
    await typeOk('4821'); await sleep(500);
    r = await top();
    check('typing it again changes nothing ("already on the clock")', /Already on the clock/.test(r || '') && /TEST Jayden has been on the clock since/.test(r || ''), r);
    await tap('[data-ok]'); await sleep(200);

    // ================= 3. Not a shop computer: no station; a manager's PIN is 6 digits =================
    await openApp('manager', { shop_only: true, computers: 1 }, false, PC);
    r = await pg.evaluate(() => ({ station: !!document.getElementById('clkPinBtn'), myPin: document.getElementById('sideMyPin').style.display !== 'none' }));
    check('a computer that is not marked has no "Clock in by PIN"', r.station === false && r.myPin === true, r);
    await pg.evaluate(() => document.getElementById('sideMyPin').click()); await sleep(300);
    r = await top();
    check('a manager is asked for 6 digits', /Pick 6 digits/.test(r || ''), r);
    await tap('[data-no]'); await sleep(200);

    // ================= 4. The lock screen on the shop computer =================
    await openApp('owner', { shop_only: true, computers: 1, pins: { '4821': 'TEST Jayden' } }, true, PC, true);
    r = await pg.evaluate(() => { TKS_CLOCK.lockNow(); const o = document.getElementById('tcLock'); return o ? o.innerText.replace(/\s+/g, ' ') : null; });
    check('the lock screen says a PIN clocks you in', /Starting your shift\? Type your PIN and press ✓ to clock in/.test(r || ''), r);
    await pg.evaluate(() => { '4821'.split('').forEach(k => document.querySelector('#tcPad [data-k="' + k + '"]').click()); document.querySelector('#tcPad [data-k="ok"]').click(); }); await sleep(700);
    r = { msg: await pg.evaluate(() => document.getElementById('tcMsg').innerText), locked: await pg.evaluate(() => !!document.getElementById('tcLock')), sent: await calls('^shift_clock_in_pin'), st: await state() };
    check('a person who is not clocked in yet types their PIN on the lock screen → clocked in, screen stays locked',
      /✓ TEST Jayden — clocked in at \d/.test(r.msg || '') && r.locked === true && r.sent.length === 1 && !!r.st.techOpen, r);
    await pg.screenshot({ path: path.join(OUT, 'pin-lock-screen.png') });
    check('no errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
