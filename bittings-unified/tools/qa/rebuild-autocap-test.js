// Browser test of 8z149 (owner, 2026-11-14: "auto capitalize everything when I type in someone's name, their address, all that
// stuff … it bothers me that things are in lowercase letters"). Names and addresses typed in lower case are capitalised when you
// leave the box — on the job form and on an estimate — and it is what gets saved. Boxes that are not names / addresses are left alone.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-autocap-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8110, BASE = 'http://127.0.0.1:' + PORT;
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
      const data = { id: 'jx', date: today, time: '09:00', status: 'Scheduled', jobType: 'auto', subType: 'TEST lockout', customer: { name: 'TEST Old Name', phone: '4055550100' }, vehicle: { year: '2013', make: 'Ford', model: 'F-150' } };
      const bookings = [{ id: 'jx', shop_id: 's', date: today, time: '09:00', customer_name: 'TEST Old Name', deleted_at: null, updated_at: iso, data }];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings, shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);
    // types into a box the way a person does (clear it, type, leave it) and gives back what the box then holds
    const typeIn = async (sel, text) => { await pg.evaluate((sel) => { const el = document.querySelector(sel); el.scrollIntoView({ block: 'center' }); el.focus(); el.value = ''; }, sel); await pg.keyboard.type(text, { delay: 5 }); await pg.keyboard.press('Tab'); await sleep(250);
      return pg.evaluate((sel) => { const el = document.querySelector(sel); return { v: el.value, ac: el.getAttribute('autocapitalize') || '' }; }, sel); };

    // ================= the job form =================
    await pg.goto(BASE + '/index.html?go=schedule', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500);
    await pg.evaluate(() => document.querySelector('[data-open="jx"]').click()); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1200);
    let r = {};
    r.name = await typeIn('#sjName', "test mary-jane o'brien"); r.street = await typeIn('#sjStreet', '123 nw 23rd st'); r.unit = await typeIn('#sjUnit', 'apt 4b'); r.city = await typeIn('#sjCity', 'oklahoma city');
    r.svc = await typeIn('#sjSvc', 'test blade key programming'); r.caps = await typeIn('#sjName', 'TEST ABC LOCKS LLC'); r.mixed = await typeIn('#sjName', 'test deShawn mcdonald');
    check('job form: a name typed in lower case is capitalised when you leave the box (hyphen and O\' names too), and the phone keyboard is asked for capitals', r.name.v === "Test Mary-Jane O'Brien" && r.name.ac === 'words', r.name);
    check('job form: the address — street (compass points kept as NW), unit and city', r.street.v === '123 NW 23rd St' && r.unit.v === 'Apt 4b' && r.city.v === 'Oklahoma City', { street: r.street.v, unit: r.unit.v, city: r.city.v });
    check('nothing is ever lowered: ALL CAPS stays, a capital in the middle of a name stays, Mc names are finished', r.caps.v === 'TEST ABC LOCKS LLC' && r.mixed.v === 'Test DeShawn McDonald', { caps: r.caps.v, mixed: r.mixed.v });
    check('a box that is not a name or address (Service / details) is left exactly as typed', r.svc.v === 'test blade key programming', r.svc.v);
    await pg.evaluate(() => document.getElementById('sjName').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'autocap-job.png') });
    await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1800);
    r = await pg.evaluate(() => { const j = TKS.Bookings.get('jx') || {}; return { name: (j.customer || {}).name, addr: j.addr, address: j.address, svc: j.subType }; });
    check('it is saved that way', r.name === 'Test DeShawn McDonald' && r.addr && r.addr.street === '123 NW 23rd St' && r.addr.city === 'Oklahoma City' && r.addr.unit === 'Apt 4b' && r.svc === 'test blade key programming', r);
    // even if the box was never left (typed, then Save tapped straight away)
    await pg.evaluate(() => document.querySelector('[data-open="jx"]').click()); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1200);
    await pg.evaluate(() => { const el = document.getElementById('sjName'); el.focus(); el.value = ''; }); await pg.keyboard.type('test quick saver', { delay: 5 });
    await pg.tap('#sjSave'); await sleep(1800);
    r = await pg.evaluate(() => ((TKS.Bookings.get('jx') || {}).customer || {}).name);
    check('typed and Save tapped without leaving the box: still saved capitalised', r === 'Test Quick Saver', r);
    check('job form: no errors', errs.length === 0, errs.slice(0, 4));

    // ================= an estimate =================
    await pg.goto(BASE + '/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    r = {};
    r.name = await typeIn('#qiName', 'test john smith'); r.street = await typeIn('#qiStreet', 'po box 12'); r.city = await typeIn('#qiCity', 'midwest city');
    r.state = await typeIn('#qiState', 'ok'); r.desc = await pg.evaluate(() => { const d = document.querySelector('.qiDesc'); return d ? 'has-line' : 'no-line'; });
    check('estimate: customer name, street and city are capitalised', r.name.v === 'Test John Smith' && r.street.v === 'PO Box 12' && r.city.v === 'Midwest City', { name: r.name.v, street: r.street.v, city: r.city.v });
    check('estimate: the state box keeps its own rule (it is not turned into "Ok")', r.state.v !== 'Ok', r.state);
    if (r.desc === 'has-line') { const d = await typeIn('.qiDesc', 'test lowercase line'); check('estimate: a line description is left as typed', d.v === 'test lowercase line', d.v); }
    await pg.evaluate(() => document.getElementById('qiName').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'autocap-estimate.png') });
    check('estimate: no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
