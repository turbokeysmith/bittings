// 8z136 — the shop's own bill inside the REAL app page (index.html, signed-in path, stand-in cloud): the red bar after a
// failed payment and the lock screen, at phone and desktop size. The rules themselves are tested in rebuild-plans-test.js;
// this one proves they sit correctly in the real layout and that a locked app cannot be used behind the lock. Port 8104.
const http = require('http'), fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8104, BASE = 'http://127.0.0.1:' + PORT;
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info).slice(0, 700)); } };
const iso = (days) => new Date(Date.now() + days * 864e5).toISOString();
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' }); const errs = [];
  const open = async (size, tier, bill, role) => {
    const pg = await b.newPage(); pg.on('pageerror', e => errs.push(String(e.message))); pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.startsWith(BASE) || /^blob:|^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport(size === 'phone' ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.goto(BASE + '/seed.html');
    await pg.evaluate((UID, tier, bill, role) => {
      const t = new Date(Date.now() - 20 * 60000).toISOString();
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [],
        shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: t, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK 73000', phone: '405-555-0000' } } }] }));
      localStorage.setItem('__role', role); localStorage.setItem('bt_theme', 'dark'); localStorage.setItem('__tier', tier); localStorage.setItem('__bill', JSON.stringify(bill));
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, tier, bill, role || 'owner');
    await pg.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' }); await sleep(3500);
    await pg.evaluate(() => window.TKS_TIER && TKS_TIER.load(true)); await sleep(900);
    return pg;
  };
  const state = (pg) => pg.evaluate(() => { const bar = document.getElementById('billBar'), lock = document.getElementById('billLock'), r = (e) => { if (!e) return null; const q = e.getBoundingClientRect(); return { x: Math.round(q.left), y: Math.round(q.top), w: Math.round(q.width), h: Math.round(q.height) }; };
    const under = (x, y) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest && e.closest('#billLock')); };
    const W = innerWidth, H = innerHeight, pts = [[W / 2, 20], [20, H / 2], [W - 20, H / 2], [W / 2, H - 20], [W / 2, H / 2], [30, 30], [W - 30, H - 30]];
    const btns = lock ? [].map.call(lock.querySelectorAll('button'), x => { const q = x.getBoundingClientRect(); return { t: x.textContent.trim(), h: Math.round(q.height), inView: q.left >= 0 && q.right <= W + 1 }; }) : [];
    return { bar: r(bar), barText: bar ? bar.textContent : '', lock: r(lock), lockText: lock ? lock.querySelector('h2').textContent : '', covered: pts.map(p => under(p[0], p[1])), btns, W, H, sideways: document.documentElement.scrollWidth > W + 1 }; });
  try {
    for (const size of ['phone', 'desktop']) {
      let pg = await open(size, 'pro', { state: 'ok', tier: 'pro', plan: 'pro', is_owner: true, grace_days: 7 });
      let s = await state(pg);
      check(size + ': a paid-up shop sees no bar and no lock', !s.bar && !s.lock, s); await pg.close();

      pg = await open(size, 'starter', { state: 'past_due', tier: 'starter', plan: 'starter', is_owner: true, grace_days: 7, grace_ends_at: iso(3) });
      s = await state(pg);
      check(size + ': failed payment (owner) — the red bar is on screen, full text readable, inside the page width, and the app is NOT locked', !!s.bar && /did not go through/.test(s.barText) && s.bar.x >= 0 && s.bar.x + s.bar.w <= s.W + 1 && s.bar.y >= 0 && s.bar.y < 300 && !s.lock && !s.sideways, s);
      await pg.screenshot({ path: path.join(OUT, 'billing-app-bar-' + size + '.png') }); await pg.close();

      pg = await open(size, 'starter', { state: 'past_due', tier: 'starter', plan: 'starter', is_owner: false, grace_days: 7, grace_ends_at: iso(3) }, 'technician');
      s = await state(pg);
      check(size + ': failed payment — a technician sees nothing about it', !s.bar && !s.lock, s); await pg.close();

      pg = await open(size, 'none', { state: 'locked', tier: 'none', plan: 'starter', is_owner: true, grace_days: 7 });
      s = await state(pg);
      check(size + ': grace run out (owner) — the lock covers the whole screen, nothing behind it can be tapped', !!s.lock && s.covered.every(Boolean) && s.lock.w >= s.W - 1 && s.lock.h >= s.H - 1, s);
      check(size + ': the lock has "Update card", "Check again" and "Sign out", each big enough to tap (44 px) and inside the screen', ['Update card', 'Check again', 'Sign out'].every(t => s.btns.some(x => x.t === t && x.h >= 44 && x.inView)), s.btns);
      await pg.screenshot({ path: path.join(OUT, 'billing-app-locked-' + size + '.png') }); await pg.close();

      pg = await open(size, 'none', { state: 'locked', tier: 'none', plan: 'starter', is_owner: false, grace_days: 7 }, 'technician');
      s = await state(pg);
      check(size + ': grace run out (technician) — locked, told to ask the owner, no card button', !!s.lock && s.covered.every(Boolean) && !s.btns.some(x => x.t === 'Update card') && s.btns.some(x => x.t === 'Sign out'), s); await pg.close();

      pg = await open(size, 'none', { state: 'none', tier: 'none', is_owner: true, grace_days: 7, billed: false });
      s = await state(pg);
      check(size + ': a new shop with no plan (owner) — "Choose a plan to start" with three Choose buttons, all inside the screen', !!s.lock && /Choose a plan/.test(s.lockText) && s.btns.filter(x => x.t === 'Choose' && x.inView && x.h >= 44).length === 3 && s.covered.every(Boolean), s);
      await pg.screenshot({ path: path.join(OUT, 'billing-app-choose-' + size + '.png') }); await pg.close();
    }
    check('no script errors', errs.length === 0, errs.slice(0, 5));
  } catch (e) { fails++; console.log('CRASH ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
