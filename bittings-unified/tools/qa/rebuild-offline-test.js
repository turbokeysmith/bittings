// Offline shell test (sw.js): after one normal visit, does the app open with no connection and show the saved data?
// Also: online, a changed file is picked up straight away (the network always wins).
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
let marker = 'v1';
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const h = { 'cache-control': 'no-store' };
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, Object.assign({ 'content-type': 'text/javascript' }, h)); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('seed'); }
  if (p === '/app/marker.js') { s.writeHead(200, Object.assign({ 'content-type': 'text/javascript' }, h)); return s.end('window.__marker="' + marker + '";'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); }
    if (p === '/index.html') d = Buffer.from(String(d).replace('</body>', '<script src="app/marker.js"></script></body>'));
    s.writeHead(200, Object.assign({ 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }, h)); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setViewport({ width: 390, height: 800, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate(() => { const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); const day = today.toISOString().slice(0, 10), iso = new Date().toISOString();
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [{ id: 'p1', name: 'TEST Key', qty: 2, updated_at: iso }], customers: [], shop_config: [],
        bookings: [{ id: 'b1', date: day, time: '09:00', updated_at: iso, data: { id: 'b1', jobType: 'auto', subType: 'TEST lost key', date: day, time: '09:00', status: 'Scheduled', customer: { name: 'TEST Offline Customer', phone: '4055550101' } } }] }));
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), user: { id: '11111111-2222-4333-8444-555555555555', email: 'samer@turbokeysmith.com' } })); });
    // visit 1: register the worker (the app only does this on https; 127.0.0.1 counts as secure for the test)
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {});
    await pg.evaluate(async () => { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; }); await sleep(1200);
    // visit 2: now controlled → files are saved as they load
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(2500);
    let r = await pg.evaluate(async () => ({ controlled: !!navigator.serviceWorker.controller, marker: window.__marker, cached: (await (await caches.open('bittings-shell-v1')).keys()).length, job: /TEST Offline Customer/.test((document.getElementById('schBody') || {}).innerText || '') }));
    check('online: the app loads through the worker and its files are saved', r.controlled && r.marker === 'v1' && r.cached > 10 && r.job, r);
    // online, a new version of a file is used immediately (no stale copy)
    marker = 'v2';
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1500);
    r = await pg.evaluate(() => ({ marker: window.__marker }));
    check('online: a changed file is picked up on the very next load (the network always wins)', r.marker === 'v2', r);
    // offline
    await pg.setOfflineMode(true);
    const t0 = Date.now();
    await pg.goto('http://127.0.0.1:8088/index.html?go=schedule', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => errs.push('nav: ' + e.message));
    await pg.waitForFunction(() => { const s = document.getElementById('schBody'); return s && /TEST Offline Customer/.test(s.innerText || ''); }, { timeout: 20000 }).catch(() => {});
    r = await pg.evaluate(() => ({ title: document.title, marker: window.__marker, adapter: window.TKS ? TKS.adapter() : null, job: /TEST Offline Customer/.test((document.getElementById('schBody') || {}).innerText || ''), stock: window.TKS ? TKS.list('inventory').length : -1 }));
    r.ms = Date.now() - t0;
    check('OFFLINE: the app opens and shows the saved jobs and stock', r.title === 'Bittings' && r.adapter === 'cloud' && r.job && r.stock === 1 && r.marker === 'v2', r);
    await pg.screenshot({ path: path.join(__dirname, 'audit', 'offline-open.png') });
    // offline: the receipts page too
    await pg.setOfflineMode(false);
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1500);
    await pg.setOfflineMode(true);
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => errs.push('nav2: ' + e.message));
    await pg.waitForSelector('.qi-box', { timeout: 15000 }).catch(() => {});
    r = await pg.evaluate(() => ({ builder: !!document.querySelector('.qi-box') }));
    check('OFFLINE: the Receipts page opens its builder', r.builder, r);
    // a save made offline is kept and goes through when the connection returns
    r = await pg.evaluate(async () => { const ev = []; addEventListener('tks:save-failed', () => ev.push('failed')); addEventListener('tks:save-ok', () => ev.push('ok'));
      window.__realFetch = null; const list = TKS.list('customers'); TKS.Customers.upsert({ customer: 'TEST Saved Offline', phone: '4055550177' }); await new Promise(z => setTimeout(z, 900)); return { ev: ev.slice(), server: (JSON.parse(localStorage.getItem('__db')).customers || []).length }; });
    // (the stand-in cloud lives in the page, so "offline" cannot block it — this part is covered by store-cache-test.js)
    check('no unexpected page errors', errs.filter(e => !/net::ERR_INTERNET_DISCONNECTED|Failed to fetch|Load failed/.test(e)).length === 0, errs.slice(0, 5));
    await pg.setOfflineMode(false);
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
