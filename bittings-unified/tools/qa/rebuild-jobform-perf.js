// Speed probe for the Scheduler job form (owner report 2026-11-12: "after you select vehicles it becomes extremely slow",
// "the drop-down isn't working"). Real pages, the shop's real stock list from last night's backup (read-only, stays on this PC),
// dark mode, phone size, CPU slowed 6x to stand in for a phone. Prints how long the page is frozen after each step.
//   node rebuild-jobform-perf.js [backupDir]
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', SHOP = '7a1754e6-e2f1-40eb-9c03-9d9a1e891bce';
let BK = process.argv[2];
if (!BK) { const base = 'D:/Work/Backups/db'; const d = fs.readdirSync(base).filter(x => /^\d{4}-/.test(x)).sort().pop(); BK = path.join(base, d); }
const tbl = n => { try { return JSON.parse(fs.readFileSync(path.join(BK, n + '.json'), 'utf8')).filter(r => !r.shop_id || r.shop_id === SHOP); } catch (e) { return []; } };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const THEME = process.env.THEME || 'dark', SLOW = Number(process.env.SLOW || 6);
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    const seed = { inventory: tbl('inventory'), inventory_locations: tbl('inventory_locations'), shop_config: tbl('shop_config'), customers: tbl('customers'), bookings: tbl('bookings'), vans: tbl('vans'), receipts: [], job_parts: [], audit_log: [], web_leads: [], payment_transactions: [] };
    console.log('seed: inventory', seed.inventory.length, 'bookings', seed.bookings.length, 'customers', seed.customers.length, 'config rows', seed.shop_config.length);
    await pg.evaluate((seed, UID, THEME) => {
      localStorage.setItem('__db', JSON.stringify(seed)); localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', THEME);
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@example.com' } }));
    }, seed, UID, THEME);
    await pg.evaluateOnNewDocument(() => {
      window.__long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
      window.__mark = function () { var a = window.__long; window.__long = []; return { tasks: a.length, frozenMs: a.reduce((x, y) => x + y, 0), worst: a.length ? Math.max.apply(null, a) : 0 }; };
    });
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 });
    await sleep(4500);
    const cdp = await pg.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: SLOW });
    const step = async (name, fn, wait) => { await pg.evaluate(() => window.__mark()); const t0 = Date.now(); const ret = await pg.evaluate(fn); await sleep(wait || 2500); const m = await pg.evaluate(() => window.__mark()); console.log((name + ' '.repeat(52)).slice(0, 52), 'call', String(Date.now() - t0 - (wait || 2500)).padStart(5), 'ms | frozen', String(m.frozenMs).padStart(6), 'ms in', m.tasks, 'tasks, worst', m.worst, ret !== undefined ? JSON.stringify(ret).slice(0, 300) : ''); return ret; };
    await step('idle (nothing touched, 2.5 s)', () => {});
    await step('open Scheduler', () => { document.querySelector('.bt-sidebar .bt-nav__item[data-go="schedule"]').click(); });
    await step('tap + New quote / job (chooser)', () => { const n = document.querySelector('#view-schedule [data-new]'); if (n) n.click(); return !!n; });
    // 8z153: the button opens a chooser first; "Guided" is what + New job used to open
    await step('chooser → guided booking', () => { const g = document.querySelector('#stGuided'); if (g) g.click(); return !!g; });
    await step('guided → Quick form', () => { const k = document.querySelector('#wzQuick'); if (k) k.click(); return { quick: !!k, form: !!document.querySelector('.sch-modal') }; });
    await pg.screenshot({ path: path.join(OUT, 'perf-form-open.png') });
    await step('idle with the form open', () => {});
    const set = (id, v) => `(() => { const el=document.querySelector('.sch-modal #${id}'); if(!el) return 'no ${id}'; el.value=${JSON.stringify(v)}; el.dispatchEvent(new Event('change',{bubbles:true})); return el.value + ' / options ' + el.options.length; })()`;
    await step('pick year 2015', set('sjYear', '2015'));
    await step('pick make Ford', set('sjMake', 'Ford'));
    if (process.env.PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.start'); }
    await step('pick model F-150', set('sjModel', 'F-150'), 4000);
    if (process.env.PROFILE) {   // PROFILE=1: which functions the time went to
      const pr = (await cdp.send('Profiler.stop')).profile, byId = {}, self = {}; pr.nodes.forEach(n => { byId[n.id] = n; });
      pr.samples.forEach((id, i) => { const n = byId[id], k = (n.callFrame.functionName || '(anonymous)') + '  ' + n.callFrame.url.split('/').pop() + ':' + (n.callFrame.lineNumber + 1); self[k] = (self[k] || 0) + pr.timeDeltas[i] / 1000; });
      console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 16).map(x => '    ' + String(Math.round(x[1])).padStart(6) + ' ms  ' + x[0]).join('\n'));
    }
    await step('idle after the vehicle (4 s)', () => ({ keys: document.querySelectorAll('.sch-modal .sjkAdd').length, nodes: document.querySelectorAll('.sch-modal *').length, all: document.querySelectorAll('*').length }), 4000);
    await pg.screenshot({ path: path.join(OUT, 'perf-form-vehicle.png') });
    await step('+ Add a charge', () => { const a = document.querySelector('.sch-modal #sjChAdd'); if (a) a.click(); return !!a; });
    // type into the charge box like a person
    await pg.evaluate(() => window.__mark()); let t0 = Date.now();
    await pg.focus('.sch-modal .chD'); await pg.keyboard.type('Smart key prog', { delay: 60 }); const typed = Date.now() - t0; await sleep(2500);
    let m = await pg.evaluate(() => window.__mark()); console.log(('type 14 letters in the charge box' + ' '.repeat(52)).slice(0, 52), 'took', typed, 'ms (840 is ideal) | frozen', m.frozenMs, 'ms in', m.tasks, 'tasks, worst', m.worst);
    const dl = await pg.evaluate(() => { const d = document.querySelector('.sch-modal .chD'); const l = document.getElementById(d.getAttribute('list')); return { value: d.value, list: d.getAttribute('list'), options: l ? l.options.length : -1, first: l ? Array.from(l.options).slice(0, 5).map(o => o.value) : [], same: document.querySelectorAll('#' + d.getAttribute('list')).length }; });
    console.log('service drop-down:', JSON.stringify(dl));
    await step('tap + Add on the first key', () => { const a = document.querySelector('.sch-modal .sjkAdd'); if (a) a.click(); return !!a; }, 3000);
    await pg.evaluate(() => window.__mark()); t0 = Date.now();
    await pg.focus('.sch-modal #sjName'); await pg.keyboard.type('TEST Customer', { delay: 60 }); const typed2 = Date.now() - t0; await sleep(2500);
    m = await pg.evaluate(() => window.__mark()); console.log(('type 13 letters in the name box' + ' '.repeat(52)).slice(0, 52), 'took', typed2, 'ms (780 is ideal) | frozen', m.frozenMs, 'ms in', m.tasks, 'tasks, worst', m.worst);
    await pg.screenshot({ path: path.join(OUT, 'perf-form-end.png') });
    console.log('page errors:', errs.length ? errs.slice(0, 5) : 'none');
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
