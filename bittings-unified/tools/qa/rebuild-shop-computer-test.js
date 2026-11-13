// Browser test of 8z105: a computer that is not marked as a shop computer says so, shows a code, and becomes a shop
// computer once an owner / manager approves that code from their own phone — nobody has to sign in on it as an owner.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC. Port 8096.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8096, BASE = 'http://127.0.0.1:' + PORT;
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
// stand-in for the server (same rules as supabase/phase8/8z76 + 8z105): state lives in localStorage.__clock
function stubClock() {
  const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__clockCalls = [];
  sb.rpc = function (name, args) {
    if (!/^shift_|^device_pair_/.test(name)) return real(name, args);
    const st = JSON.parse(localStorage.getItem('__clock') || '{}'), role = localStorage.getItem('__role'); window.__clockCalls.push(name + ' ' + JSON.stringify(args || {}));
    let data = null, error = null; const mgr = role === 'owner' || role === 'manager';
    const onPc = !!(args && args.p_device_id === 'dev-new' && args.p_device_token === 'secret-new');
    if (name === 'shift_status') data = st.open || null;
    else if (name === 'shift_rules') data = { shop_only: !!st.shop_only, shop_computers: st.computers || 0, has_pin: !!st.has_pin };
    else if (name === 'shift_clock_in') {
      if (role === 'technician' && st.shop_only && (st.computers || 0) > 0 && !onPc) error = { message: 'Clock in on the shop computer. From a phone you can only clock out.' };
      else { st.open = { id: 'te1', clock_in: new Date().toISOString() }; data = Object.assign({ already_open: false, shop_computer: onPc }, st.open); } }
    else if (name === 'device_pair_start') { st.pair = { id: 'req-1', code: '482913', name: args.p_name, who: 'TEST Jayden' }; data = { id: 'req-1', code: '482913', expires_at: new Date(Date.now() + 9e5).toISOString() }; }
    else if (name === 'device_pair_pending') data = (mgr && st.pair && !st.pair.approved && !st.pair.refused) ? [{ id: st.pair.id, code: st.pair.code, name: st.pair.name, who: st.pair.who, created_at: new Date().toISOString() }] : [];
    else if (name === 'device_pair_approve') { if (!mgr) error = { message: 'only a manager/owner can approve a shop computer' }; else if (st.pair && st.pair.id === args.p_id) { if (args.p_ok === false) st.pair.refused = true; else st.pair.approved = true; data = { ok: true }; } else data = { ok: false }; }
    else if (name === 'device_pair_finish') { const p = st.pair;
      if (!p || p.id !== args.p_id || p.used || p.refused) data = { ok: false, state: 'gone' };
      else if (!p.approved) data = { ok: false, state: 'waiting' };
      else { p.used = true; st.computers = (st.computers || 0) + 1; data = { ok: true, state: 'approved', id: 'dev-new', token: 'secret-new' }; } }
    localStorage.setItem('__clock', JSON.stringify(st));
    return new Promise(r => setTimeout(() => r({ data, error }), 40));
  };
}
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf(BASE + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, PC = { width: 1280, height: 800, deviceScaleFactor: 1 };
    await pg.setViewport(PC);
    await pg.goto(BASE + '/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, timeclock: { enabled: false, idleMin: 5 }, identity: { name: 'TEST Shop' } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'technician'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    let r;
    const openApp = async (role, clock, vp, keepDev) => {
      await pg.setViewport(vp || PC);
      await pg.evaluate(async (role, clock, keepDev) => { localStorage.setItem('__role', role); localStorage.setItem('__clock', JSON.stringify(clock)); try { await TKS.clearDeviceCache(); } catch (e) {}
        localStorage.setItem('__role', role); localStorage.setItem('__clock', JSON.stringify(clock));
        if (!keepDev) { localStorage.removeItem('tks_tc_device_id'); localStorage.removeItem('tks_tc_device_token'); localStorage.setItem('tks_tc_device', '0'); } }, role, clock, !!keepDev);
      await pg.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
      await pg.evaluate(stubClock); await pg.evaluate(() => { clkState.at = 0; clkState.ruleAt = 0; clkRefresh(true); clkLoadRule(true); updateAuthUI(); }); await sleep(600);
    };
    const top = () => pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); return d ? d.innerText.replace(/\s+/g, ' ').trim() : null; });
    const tap = (sel) => pg.evaluate((sel) => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); const x = d && d.querySelector(sel); if (x) x.click(); return !!x; }, sel);
    const calls = (re) => pg.evaluate((src) => window.__clockCalls.filter(c => new RegExp(src).test(c)), re);
    const state = () => pg.evaluate(() => JSON.parse(localStorage.getItem('__clock') || '{}'));
    const setState = (patch) => pg.evaluate((patch) => { const st = JSON.parse(localStorage.getItem('__clock') || '{}'); Object.assign(st.pair || (st.pair = {}), patch); localStorage.setItem('__clock', JSON.stringify(st)); }, patch);
    const btn = () => pg.evaluate(() => (document.getElementById('clkBtn') || {}).innerText || null);

    // ================= 1. The technician at a computer that is not marked =================
    await openApp('technician', { shop_only: true, computers: 1 }, PC);
    r = { btn: await btn(), pin: await pg.evaluate(() => !!document.getElementById('clkPinBtn')) };
    check('unmarked computer, rule on: the clock button is the blocked one and there is no "Clock in by PIN"', /Clock in at the shop computer/.test(r.btn || '') && r.pin === false, r);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300);
    r = await top();
    check('tapping it says THIS computer is not set up (not "go to the shop computer") and offers to set it up', /This computer is not set up yet/.test(r || '') && /has not been marked/.test(r || '') && /Set up this computer/.test(r || '') && !/from this phone/.test(r || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'shop-computer-1-not-set-up.png') });
    await tap('[data-yes]'); await sleep(500);
    r = { msg: await top(), code: await pg.evaluate(() => (document.getElementById('clkPairCode') || {}).innerText), sent: await calls('^device_pair_start') };
    check('"Set up this computer" shows a 6-digit code and tells him who has to approve it', r.code === '482913' && /Waiting for approval/.test(r.msg || '') && /owner or a manager/.test(r.msg || '') && r.sent.length === 1 && /Shop computer · /.test(r.sent[0]), r);
    await pg.screenshot({ path: path.join(OUT, 'shop-computer-2-code.png') });
    await sleep(3400);
    r = { still: await pg.evaluate(() => !!document.getElementById('clkPairOv')), dev: await pg.evaluate(() => localStorage.getItem('tks_tc_device_id')), asked: (await calls('^device_pair_finish')).length };
    check('until someone approves it keeps waiting and nothing is marked', r.still === true && !r.dev && r.asked >= 1, r);

    // ---- the owner approves (on another device) → this computer finishes by itself ----
    await setState({ approved: true }); await sleep(3600);
    r = { gone: await pg.evaluate(() => !document.getElementById('clkPairOv')), dev: await pg.evaluate(() => [localStorage.getItem('tks_tc_device_id'), localStorage.getItem('tks_tc_device_token'), localStorage.getItem('tks_tc_device')]), msg: await top(), pin: await pg.evaluate(() => !!document.getElementById('clkPinBtn')) };
    check('once approved: the computer keeps its id + secret, says it is now a shop computer, and "Clock in by PIN" appears', r.gone && r.dev.join() === 'dev-new,secret-new,1' && /This is now a shop computer/.test(r.msg || '') && /Clock in now/.test(r.msg || '') && r.pin === true, r);
    await pg.screenshot({ path: path.join(OUT, 'shop-computer-3-done.png') });
    await tap('[data-yes]'); await sleep(600);
    r = { btn: await btn(), sent: await calls('^shift_clock_in '), st: await state() };
    check('"Clock in now" clocks him in from this computer (its id + secret are sent)', /On the clock since/.test(r.btn || '') && r.sent.length === 1 && /"p_device_id":"dev-new"/.test(r.sent[0]) && !!r.st.open, r);

    // ---- a refused / vanished request ----
    await openApp('technician', { shop_only: true, computers: 1 }, PC);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300); await tap('[data-yes]'); await sleep(500);
    await setState({ refused: true }); await sleep(3600);
    r = { msg: await top(), dev: await pg.evaluate(() => localStorage.getItem('tks_tc_device_id')) };
    check('a refused request says so and marks nothing', /Not approved/.test(r.msg || '') && /refused or is no longer there/.test(r.msg || '') && !r.dev, r);
    await tap('[data-ok]'); await sleep(200);

    // ================= 2. On a phone nothing changes: he is sent to the shop computer =================
    await openApp('technician', { shop_only: true, computers: 1, has_pin: true }, PHONE);
    await pg.evaluate(() => document.getElementById('clkBtn').click()); await sleep(300);
    r = await top();
    check('technician on a PHONE still gets "clock in on the shop computer" (no set-up offer)', /On the shop computer, tap "Clock in by PIN"/.test(r || '') && !/Set up this computer/.test(r || ''), r);
    await tap('[data-ok]'); await sleep(200);

    // ================= 3. The owner, on his phone, is asked — wherever he is in the app =================
    await openApp('owner', { shop_only: true, computers: 1, pair: { id: 'req-1', code: '482913', name: 'Shop computer · Chrome on Windows', who: 'TEST Jayden' } }, PHONE);
    await pg.evaluate(() => clkPairWatch()); await sleep(500);
    r = await top();
    check('owner phone: asked to approve, with who is asking, which computer and the code', /Approve a shop computer\?/.test(r || '') && /TEST Jayden/.test(r || '') && /Chrome on Windows/.test(r || '') && /482913/.test(r || ''), r);
    r = await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(), bx = d.querySelector('.chg-modal').getBoundingClientRect(); return { fits: bx.left >= 0 && bx.right <= innerWidth + 1, small: Array.from(d.querySelectorAll('button:not(.chg-modal-x)')).filter(x => x.getBoundingClientRect().height < 43).length, docX: document.documentElement.scrollWidth - innerWidth }; });
    check('phone: the question fits the screen, buttons are at least 44px tall', r.fits && r.small === 0 && r.docX <= 1, r);
    await pg.screenshot({ path: path.join(OUT, 'shop-computer-4-owner-phone.png') });
    await tap('[data-yes]'); await sleep(500);
    r = { msg: await top(), sent: await calls('^device_pair_approve'), st: await state() };
    check('Approve sends the approval and confirms it', /✓ Approved/.test(r.msg || '') && r.sent.length === 1 && /"p_id":"req-1"/.test(r.sent[0]) && r.st.pair.approved === true, r);
    await tap('[data-ok]'); await sleep(200);
    await pg.evaluate(() => clkPairWatch()); await sleep(400);
    check('he is not asked twice for the same request', (await top()) === null);

    // ---- a technician is never asked, and cannot approve ----
    await openApp('technician', { shop_only: true, computers: 1, pair: { id: 'req-2', code: '111222', name: 'TEST other computer', who: 'TEST Someone' } }, PHONE);
    await pg.evaluate(() => clkPairWatch()); await sleep(400);
    r = { msg: await top(), asked: (await calls('^device_pair_pending')).length };
    check('a technician is never shown approval requests', r.msg === null && r.asked === 0, r);

    // ================= 4. Settings → Time clock & lock lists what is waiting =================
    await openApp('owner', { shop_only: true, computers: 1, pair: { id: 'req-3', code: '905511', name: 'Shop computer · Chrome on Windows', who: 'TEST Jayden' } }, PHONE);
    await pg.evaluate(() => { clkPairSeen['req-3'] = 1; });
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click()); await sleep(900);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('.railItem')).find(x => /Time clock/.test(x.innerText)); if (it) it.click(); }); await sleep(1200);
    r = await pg.evaluate(() => { const pb = document.getElementById('f_tcPair'); if (!pb) return null; pb.scrollIntoView({ block: 'center' });
      return { txt: pb.innerText.replace(/\s+/g, ' '), code: (pb.querySelector('[data-paircode]') || {}).innerText, small: Array.from(pb.querySelectorAll('button')).filter(x => x.getBoundingClientRect().height < 43).length, over: pb.getBoundingClientRect().right > innerWidth + 1 }; });
    check('Settings shows the waiting computer with its code and Approve / Refuse (44px, inside the screen)', !!r && /waiting for your approval/.test(r.txt) && r.code === '905511' && /Approve/.test(r.txt) && /Refuse/.test(r.txt) && r.small === 0 && !r.over, r);
    await sleep(200); await pg.screenshot({ path: path.join(OUT, 'shop-computer-5-settings-phone.png') });
    await pg.evaluate(() => document.querySelector('#f_tcPair [data-pairno]').click()); await sleep(700);
    r = { txt: await pg.evaluate(() => document.getElementById('f_tcPair').innerText.replace(/\s+/g, ' ')), sent: await calls('^device_pair_approve'), st: await state() };
    check('Refuse sends p_ok:false; with nothing waiting the box explains how to set a computer up from afar', /"p_ok":false/.test(r.sent[0] || '') && r.st.pair.refused === true && /Not at the shop\?/.test(r.txt) && /Set up this computer/.test(r.txt), r);

    check('no errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
