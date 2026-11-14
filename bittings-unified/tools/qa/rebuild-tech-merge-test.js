// Browser test of 8z143: Reports → the technician filter lists each person ONCE. A counter sale records the login email, an invoice
// from a scheduled job records the name — the same person showed up twice, each entry with part of their sales.
// Real page, signed-in path, stand-in cloud, made-up TEST people and sales. Nothing leaves this PC.   node tools/qa/rebuild-tech-merge-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8106, BASE = 'http://127.0.0.1:' + PORT;
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
// the team as the cloud would give it: two logins, and (for a manager / owner) their emails
function stubTeam(contacts) {
  const sb = TKS._sb(), from0 = sb.from.bind(sb), rpc0 = sb.rpc.bind(sb);
  const STAFF = [{ user_id: 'u-jay', name: 'TEST Jay Tech' }, { user_id: 'u-own', name: 'TEST Owner' }];
  sb.from = function (t) { if (t !== 'staff') return from0(t); const res = { data: STAFF, error: null }, q = { select: () => q, order: () => q, eq: () => q, then: (a, b) => Promise.resolve(res).then(a, b) }; return q; };
  sb.rpc = function (name, args) { if (name !== 'staff_contacts') return rpc0(name, args);
    return Promise.resolve({ data: contacts ? [{ user_id: 'u-jay', email: 'jay.tech@test.invalid' }, { user_id: 'u-own', email: 'Owner@Test.Invalid' }] : [], error: null }); };
  _techDir = null;
}
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
      const iso = new Date(Date.now() - 20 * 60000).toISOString(), now = Date.now();
      const T = (id, tech, cents) => ({ id, invoice_id: 'r_' + id, method: 'cash', base_cents: cents, tax_cents: 0, captured_cents: cents, cost_cents: 0, refunded_cents: 0, surcharge_cents: 0, surcharge_applied: false, status: 'completed', technician: tech, description: 'TEST sale ' + id, created_at: new Date(now - 3600000).toISOString() });
      const payment_transactions = [
        T('t1', 'jay.tech@test.invalid', 10000), T('t2', 'TEST Jay Tech', 20000), T('t3', 'JAY.TECH@test.invalid', 5000),   // one person, three spellings
        T('t4', 'owner@test.invalid', 30000), T('t5', 'TEST Owner', 4000), T('t6', 'test owner', 1000),                 // the other person
        T('t7', 'gone@test.invalid', 700), T('t8', null, 900)];                                                          // someone no longer on the team · nobody
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, access: { employees: [{ name: 'TEST Jay', email: 'jay.tech@test.invalid', owner: false }, { name: 'TEST Owner', email: 'owner@test.invalid', owner: true }] } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config, web_leads: [], payment_transactions, audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_report_view', JSON.stringify({ period: 'today', chart: 'bar', tech: 'jay.tech@test.invalid' }));   // a choice saved before the fix
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);
    await pg.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500);
    await pg.evaluate(stubTeam, true);
    const open = () => pg.evaluate(async () => { TKPay.dayTransactions = async function () { return { rows: JSON.parse(localStorage.getItem('__db')).payment_transactions }; };
      const nav = document.querySelector('.bt-nav__item[data-go="reports"]'); if (nav && !document.getElementById('view-reports').classList.contains('active')) nav.click(); await renderReports(); });
    const read = () => pg.evaluate(() => { const sel = document.getElementById('repTech'); return { opts: Array.from(sel.options).map(o => o.textContent), value: sel.value, rows: Array.from(document.querySelectorAll('#repList .repRow')).map(x => x.querySelector('.nm').innerText + ' / ' + (x.querySelector('.sub').innerText.split(' · ')[2] || '')),
      sales: (document.querySelector('#repCards .chip.m-sales b') || {}).innerText || '', overflow: document.documentElement.scrollWidth - window.innerWidth }; });
    const pick = async (v) => { await pg.evaluate((v) => { const sel = document.getElementById('repTech'); sel.value = v; sel.dispatchEvent(new Event('change', { bubbles: true })); }, v); await sleep(900); };
    await open(); await sleep(600);
    let r = await read();
    check('the filter lists each person once, by name — no email addresses for people on the team', r.opts.join(' | ') === 'All technicians | gone@test.invalid | TEST Jay Tech | TEST Owner', r.opts);
    check('a choice that was saved as an email before the fix still opens on that person', r.value === 'TEST Jay Tech', r.value);
    check('choosing the person shows ALL of their sales — the ones saved under the email (either case) and the ones saved under the name', r.rows.length === 3 && r.rows.every(x => / \/ TEST Jay Tech$/.test(x)) && /350/.test(r.sales), { rows: r.rows, sales: r.sales });
    await pg.screenshot({ path: path.join(OUT, 'tech-merge.png') });
    await pick('TEST Owner'); r = await read();
    check('the other person: three sales under one name (email, name, and the name typed in lower case)', r.rows.length === 3 && r.rows.every(x => / \/ TEST Owner$/.test(x)) && /350/.test(r.sales), { rows: r.rows, sales: r.sales });
    await pick('gone@test.invalid'); r = await read();
    check('an email that belongs to nobody on the team is left as it is (nothing is hidden or guessed)', r.rows.length === 1 && / \/ gone@test\.invalid$/.test(r.rows[0]), r.rows);
    await pick('all'); r = await read();
    check('All technicians: every sale is still there, each shown with the person\'s name', r.rows.length === 8 && r.rows.filter(x => /TEST Jay Tech$/.test(x)).length === 3 && r.rows.filter(x => /TEST Owner$/.test(x)).length === 3 && r.overflow <= 0, r.rows);
    r = await pg.evaluate(() => { let csv = ''; const B = window.Blob; window.Blob = function (parts) { csv = String(parts[0]); return new B(parts); }; const c0 = URL.createObjectURL; URL.createObjectURL = () => 'blob:x'; try { repExportCsv(); } catch (e) { csv = 'ERR ' + e.message; } window.Blob = B; URL.createObjectURL = c0;
      return csv.split('\r\n').slice(1).map(l => l.split(',').pop()); });
    check('the Export file names the person too', r.length === 8 && r.filter(x => x === 'TEST Jay Tech').length === 3 && r.filter(x => x === 'TEST Owner').length === 3 && !r.some(x => /jay\.tech|owner@/i.test(x)), r);

    // someone who is not a manager is not given the team's emails by the cloud — the Employees list (Settings) still joins them
    await pg.evaluate(stubTeam, false); await open(); await sleep(400); r = await read();
    check('without the team\'s emails from the cloud, the Employees list still joins email and name (here the list calls him "TEST Jay")', r.opts.indexOf('jay.tech@test.invalid') < 0 && r.opts.indexOf('owner@test.invalid') < 0 && r.opts.indexOf('TEST Owner') > 0, r.opts);
    check('no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
