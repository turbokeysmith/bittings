// Browser test of the 2026-11-14 afternoon work, end to end:
//   8z153  one way to start: "+ New quote / job" → Build a quote → "Save & book it" → day / time / technician → the job is on the
//          schedule with NO second form (customer, vehicle, lines, price and the key come from the quote).
//   8z154  the key scanned out for the job arrives on the invoice attached; a serial-numbered key with no scan is asked for.
//   8z157  that key is LOCKED on the invoice; a finished job shows no van warning.
//   8z155  a technician sees prices only on their own jobs.
//   8z156  the job-log lines are really sent (the stand-in cloud only runs a log call that somebody waits for, like the real one).
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-book-it-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8113, BASE = 'http://127.0.0.1:' + PORT;
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
const UA = 'u_' + 'a'.repeat(32), UB = 'u_' + 'b'.repeat(32);
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf(BASE + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const d0 = new Date(); d0.setMinutes(d0.getMinutes() - d0.getTimezoneOffset()); const TODAY = d0.toISOString().slice(0, 10);
    const d1 = new Date(Date.now() + 86400000); d1.setMinutes(d1.getMinutes() - d1.getTimezoneOffset()); const TOMORROW = d1.toISOString().slice(0, 10);
    await pg.goto(BASE + '/seed.html');
    await pg.evaluate((UID, UA, UB, TODAY) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 2, cost: 30, sell_price_cents: 16500, serialized: true })];
      const U = (id, serial) => ({ id, shop_id: 's', item_id: 'key2', serial, location: 'shop', status: 'in_stock', bin: '', acquired_at: iso, updated_at: iso });
      const inventory_units = [U(UA, 'FKP2222'), U(UB, 'FKP3333')];
      const inventory_locations = [{ id: 'l1', item_id: 'key2', location: 'shop', qty: 2 }];
      const vans = [{ id: 'van1', shop_id: 's', nickname: 'TEST Van One', fleet_no: '1', status: 'active' }, { id: 'van2', shop_id: 's', nickname: 'TEST Van Two', fleet_no: '2', status: 'active' }];
      const S = (cat, value, price) => ({ cat, en: value, es: '', value, price: price == null ? '' : String(price) });
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, serviceCats: ['automotive', 'residential', 'commercial'], services: [S('automotive', 'TEST Service call', 95)] } }];
      // a job that belongs to the OTHER technician, with a price on it (for the "who sees prices" checks)
      const jo = { id: 'jOther', date: TODAY, time: '08:00', status: 'Scheduled', jobType: 'auto', subType: 'TEST lockout', customer: { name: 'TEST Other Customer', phone: '4055550100' }, technician: 'TEST Jay', technicianId: 'u-jay', items: [{ desc: 'TEST lockout', qty: 1, each: 222, amount: 222, taxable: false }], quote: { subtotal: 222, tax: 0, total: 222, taxRate: 8.625 } };
      const bookings = [{ id: 'jOther', shop_id: 's', date: TODAY, time: '08:00', customer_name: 'TEST Other Customer', deleted_at: null, updated_at: iso, data: jo }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, inventory_units, inventory_locations, vans, customers: [], bookings, job_parts: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [], unit_transfers: [] }));
      localStorage.setItem('__staff', JSON.stringify([{ user_id: UID, name: 'TEST Owner', role: 'owner', active: true, home_van_id: 'van1' }, { user_id: 'u-jay', name: 'TEST Jay', role: 'technician', active: true, home_van_id: 'van2' }]));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID, UA, UB, TODAY);
    const bootIdx = async () => { await pg.goto(BASE + '/index.html?go=schedule', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500); };
    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(350); };
    const tap = async (sel) => { await pg.evaluate((sel) => { const el = document.querySelector(sel); if (!el) throw new Error('nothing to tap: ' + sel); el.click(); }, sel); await sleep(500); };
    const cardText = (id) => pg.evaluate((id) => { const c = document.querySelector('[data-open="' + id + '"]'); return c ? c.innerText.replace(/\s+/g, ' ').trim() : null; }, id);

    // ================= 1. one way to start =================
    await bootIdx();
    let r = await pg.evaluate(() => Array.from(document.querySelectorAll('#view-schedule [data-new]')).map(x => x.textContent.trim()));
    check('the Scheduler\'s button reads "+ New quote / job"', r.length > 0 && r.every(x => x === '+ New quote / job'), r);
    await tap('#view-schedule [data-new]');
    r = await pg.evaluate(() => { const m = Array.from(document.querySelectorAll('.sch-modal')).pop(), sh = m && m.querySelector('.sheet'); return { text: m ? m.innerText.replace(/\s+/g, ' ') : '', ids: ['stQuote', 'stGuided', 'stQuick'].filter(i => !!document.getElementById(i)), minH: Math.min.apply(null, ['stQuote', 'stGuided', 'stQuick'].map(i => document.getElementById(i)).filter(Boolean).map(x => Math.round(x.getBoundingClientRect().height)).concat([999])), overflow: sh ? sh.scrollWidth - sh.clientWidth : 0, wizard: !!document.getElementById('wzSearch'), form: !!document.getElementById('sjSave') }; });
    check('it opens "Start something new": Build a quote first, then Guided booking and Job without a quote — not the long form', /Start something new/.test(r.text) && r.ids.join(',') === 'stQuote,stGuided,stQuick' && /Build a quote/.test(r.text) && /Price it first/.test(r.text) && r.minH >= 44 && r.overflow <= 0 && !r.form, r);
    await pg.screenshot({ path: path.join(OUT, 'start-chooser.png') });
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }), pg.evaluate(() => document.getElementById('stQuote').click())]);
    r = await pg.evaluate(() => location.pathname + location.search);
    check('Build a quote goes to the quote screen and carries the day you were on', /bittings\.html\?quote=1&day=\d{4}-\d{2}-\d{2}$/.test(r) && r.endsWith(TODAY), r);

    // ================= 2. build the quote, Save & book it =================
    await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(300);
    await tap('.qiNeedB[data-need="key"]'); await tap('#qiKeys .qkIgn[data-ign="keyed"]');
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add[data-id="key2"]').click()); await sleep(700);
    await tap('#qiQuickLow .qq-b[data-n="TEST Service call"]');
    await pg.evaluate(() => { const n = document.getElementById('qiName'); n.value = 'TEST Caller'; n.dispatchEvent(new Event('input', { bubbles: true })); const p = document.getElementById('qiPhone'); if (p) { p.value = '4055550199'; p.dispatchEvent(new Event('input', { bubbles: true })); } });
    r = await pg.evaluate(() => { const br = document.getElementById('qiBookRow'), gb = document.getElementById('qiGoBook'); return { title: document.getElementById('qiTitle').innerText, row: br ? getComputedStyle(br).display : 'missing', btn: gb ? gb.innerText.trim() : '', h: gb ? Math.round(gb.getBoundingClientRect().height) : 0 }; });
    check('the quote screen is titled "Build a quote" and offers "📅 Save & book it"', /Build a quote/.test(r.title) && r.row !== 'none' && r.row !== 'missing' && /Save & book it/.test(r.btn) && r.h >= 44, r);
    await pg.evaluate(() => document.getElementById('qiGoBook').click()); await pg.waitForSelector('#bkSheet', { timeout: 10000 }); await sleep(900);
    r = await pg.evaluate(() => { const sh = document.querySelector('#bkSheet .qi-box'); return { text: document.getElementById('bkSheet').innerText.replace(/\s+/g, ' '), date: document.getElementById('bkDate').value, time: document.getElementById('bkTime').value, techs: Array.from(document.getElementById('bkTech').options).map(o => o.textContent), est: (getHistory()[0] || {}).docType + ' ' + (getHistory()[0] || {}).number, overflow: sh ? sh.scrollWidth - sh.clientWidth : 0, minH: Math.min.apply(null, ['bkDate', 'bkTime', 'bkTech', 'bkGo', 'bkCancel'].map(i => Math.round(document.getElementById(i).getBoundingClientRect().height))) }; });
    check('the estimate is saved and "Book it" opens on top of it: the day you were on, a time, the technicians — and the customer, vehicle and total as a reminder', /^estimate EST-/.test(r.est) && r.date === TODAY && r.time === '' && r.techs.join('|') === 'Unassigned|TEST Owner|TEST Jay' && /TEST Caller/.test(r.text) && /F-150/.test(r.text) && /\$27\d\.\d\d/.test(r.text) && r.overflow <= 0 && r.minH >= 44, r);
    await pg.screenshot({ path: path.join(OUT, 'book-it-sheet.png') });
    const est = await pg.evaluate(() => { const h = getHistory()[0]; return { num: h.number, total: h.totals.total }; });
    await pg.evaluate((TOMORROW, UID) => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }; set('bkDate', TOMORROW); set('bkTime', '10:30'); set('bkTech', UID); }, TOMORROW, UID);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }), pg.evaluate(() => document.getElementById('bkGo').click())]);
    await pg.waitForFunction(() => /index\.html/.test(location.pathname) && window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 }); await sleep(4500);
    r = await pg.evaluate((num) => { const j = (TKS.Bookings.all() || []).find(x => x.fromEstimate === num); if (!j) return { none: true, form: !!document.getElementById('sjSave') };
      const d = JSON.parse(localStorage.getItem('__db')); return { id: j.id, form: !!document.getElementById('sjSave'), date: j.date, time: j.time, tech: j.technician, techId: j.technicianId, status: j.status, cust: (j.customer || {}).name, veh: j.vehicle && [j.vehicle.year, j.vehicle.make, j.vehicle.model].join(' '), items: (j.items || []).map(x => x.desc + ' ' + x.amount + ' ' + (x.partId || '-')), total: (j.quote || {}).total, need: j.need,
        parts: (d.job_parts || []).filter(p => p.job_id === j.id).map(p => p.item_id), card: Array.from(document.querySelectorAll('.sch-card')).filter(x => /TEST Caller/.test(x.innerText)).length }; }, est.num);
    check('the job is on the schedule with NO second form: tomorrow 10:30, the technician, customer, vehicle, both lines, the quote\'s total', !r.none && !r.form && r.date === TOMORROW && r.time === '10:30' && r.tech === 'TEST Owner' && r.techId === UID && /^scheduled$/i.test(r.status) && r.cust === 'TEST Caller' && r.veh === '2015 Ford F-150' && r.items.length === 2 && r.items.some(x => / key2$/.test(x)) && r.total === est.total && r.need === 'key', { job: r, estTotal: est.total });
    check('the quote\'s key is the job\'s key, and the board is showing the booked day with the job on it', r.parts && r.parts.join(',') === 'key2' && r.card === 1, { parts: r.parts, card: r.card });
    const jid = r.id;
    await pg.screenshot({ path: path.join(OUT, 'book-it-board.png') });

    // ================= 3. scan the key out, then the invoice =================
    await pg.evaluate(() => window.renderSchedule()); await sleep(2500);
    await pg.evaluate((jid) => { const bt = document.querySelector('[data-vanflag="' + jid + '"] .vanMove'); if (!bt) throw new Error('no scan-out button: ' + (document.querySelector('[data-vanflag="' + jid + '"]') || {}).innerText); bt.click(); }, jid); await sleep(900);
    await pg.evaluate(() => { const i = document.getElementById('jhIn'); i.value = 'FKP2222'; document.getElementById('jhGo').click(); }); await sleep(1800);
    await pg.evaluate(() => { const s = document.getElementById('bbSkip'); if (s) s.click(); }); await sleep(2500);
    r = await pg.evaluate((jid) => { const d = JSON.parse(localStorage.getItem('__db')); return { keys: (TKS.Bookings.get(jid).keyUnits || []).map(k => k.serial).join(','), log: (d.audit_log || []).filter(a => a.entity_type === 'job' && a.entity_id === jid).map(a => a.action).join(','), unit: d.inventory_units.map(u => u.serial + '@' + u.location).join(' ') }; }, jid);
    check('the key is scanned out to my van for the job — and the job-log lines were really sent to the cloud this time', r.keys === 'FKP2222' && r.log === 'unit_handover_sent,unit_handover_accepted' && /FKP2222@van:van1/.test(r.unit), r);
    r = await pg.evaluate((jid) => jobToInvoiceDraft(TKS.Bookings.get(jid)).then(d => (d.items || []).map(x => ({ n: x.name, part: x.partId || '', units: x.unitIds || [], locked: x.lockedUnitIds || [] }))), jid);
    check('"Invoice this job": the key line arrives with THAT key attached and locked to the job', r.length === 2 && r.filter(x => x.part === 'key2').length === 1 && r.find(x => x.part === 'key2').units.join() === UA && r.find(x => x.part === 'key2').locked.join() === UA, r);
    await pg.goto(BASE + '/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate((UB) => { const row = document.querySelector('.qi-item[data-part="key2"]'); if (!row) return { none: true, rows: document.querySelectorAll('.qi-item').length };
      const box = row.querySelector('.qiUnits'); const refused = row._attachUnit({ id: UB, item_id: 'key2' }, null); const alertText = (document.getElementById('modalBody') || {}).textContent || '';
      const okb = Array.from(document.querySelectorAll('#modalBtns button')).pop(); if (okb) okb.click();
      return { chips: box ? box.innerText.replace(/\s+/g, ' ').trim() : '', detach: box ? box.querySelectorAll('button.qi-chip').length : -1, refused, alertText, units: (row._meta.units || []).length }; }, UB);
    check('on the invoice the key shows with a lock: it cannot be detached, and a different key scanned onto that line is refused ("use Swap key on the job")', !r.none && /🔒/.test(r.chips) && r.detach === 0 && r.refused === false && /Swap key/.test(r.alertText) && r.units === 1, r);
    await pg.evaluate(() => { const row = document.querySelector('.qi-item[data-part="key2"]'); row.scrollIntoView({ block: 'center' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'invoice-key-locked.png') });
    await sleep(400);
    await pg.evaluate(() => document.getElementById('qiGo').click()); await sleep(1800);
    r = await pg.evaluate(() => { const asked = getComputedStyle(document.getElementById('modalBackdrop')).display !== 'none' && /Scan the key/.test(document.getElementById('modalTitle').textContent); const h = getHistory()[0] || {}; const k = (h.items || []).find(x => x.partId === 'key2') || {};
      return { asked, type: h.docType, jobId: h.jobId, units: k.unitIds || [], locked: k.lockedUnitIds || [] }; });
    check('saving that invoice does NOT ask for a scan (the job\'s key is already on it) and the saved line keeps the key and its lock', !r.asked && r.type !== 'estimate' && r.jobId === jid && r.units.join() === UA && r.locked.join() === UA, r);

    // a key line with NO scan on a new invoice → it asks
    await pg.goto(BASE + '/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => typeof openQuickInvoice === 'function' && window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 }); await sleep(2500);
    await pg.evaluate(() => { document.querySelectorAll('.qi-ov').forEach(x => x.remove()); openQuickInvoice(); }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(1500);
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(400);
    await pg.evaluate(() => { const bt = document.querySelector('#qiKeys .qk-add[data-id="key2"]'); if (!bt) throw new Error('no key in the list: ' + document.getElementById('qiKeys').innerText.slice(0, 200)); bt.click(); }); await sleep(700);
    r = await pg.evaluate(() => ({ type: (document.querySelector('.qiTB.on') || {}).dataset ? document.querySelector('.qiTB.on').dataset.t : '', before: getHistory().length }));
    const docsBefore = r.before;
    await pg.evaluate(() => document.getElementById('qiGo').click()); await sleep(900);
    r = await pg.evaluate(() => ({ shown: getComputedStyle(document.getElementById('modalBackdrop')).display !== 'none', title: document.getElementById('modalTitle').textContent, body: document.getElementById('modalBody').textContent, btns: Array.from(document.querySelectorAll('#modalBtns button')).map(x => x.textContent.trim()), docs: getHistory().length }));
    check('a serial-numbered key on an invoice with no scan: before it is saved it asks "Scan the key" — Scan it now · Charge without scanning · Back', r.shown && /Scan the key/.test(r.title) && /FORD F-150 2015-2020 Flip Key/.test(r.body) && /serial number/.test(r.body) && r.btns.join('|') === 'Back|Charge without scanning|📷 Scan it now' && r.docs === docsBefore, r);
    await pg.screenshot({ path: path.join(OUT, 'invoice-ask-scan.png') });
    await pg.evaluate(() => Array.from(document.querySelectorAll('#modalBtns button')).find(x => /^Back$/.test(x.textContent.trim())).click()); await sleep(500);
    r = await pg.evaluate(() => ({ docs: getHistory().length, open: !!document.querySelector('.qi-box') }));
    check('"Back" saves nothing and leaves the invoice open', r.docs === docsBefore && r.open, r);
    check('quote / invoice pages: no errors', errs.length === 0, errs.slice(0, 4));

    // ================= 4. a finished job: no van warning =================
    await bootIdx();
    await pg.evaluate((jid, TOMORROW) => { const j = TKS.Bookings.get(jid); j.status = 'Completed'; TKS.Bookings.save(j); const d = JSON.parse(localStorage.getItem('__db')); d.inventory_units.forEach(u => { if (u.serial === 'FKP2222') { u.status = 'sold'; } }); d.inventory_locations.forEach(l => { if (l.location === 'van:van1') l.qty = 0; }); localStorage.setItem('__db', JSON.stringify(d)); }, jid, TOMORROW);
    await pg.evaluate(() => { const nx = document.querySelector('#view-schedule [data-nav="1"]'); if (nx) nx.click(); }); await sleep(2800);
    r = await pg.evaluate((jid) => { const el = document.querySelector('[data-vanflag="' + jid + '"]'); return el ? { text: el.innerText.trim(), buttons: el.querySelectorAll('button').length, card: document.querySelector('[data-open="' + jid + '"]').innerText.replace(/\s+/g, ' ') } : { missing: true }; }, jid);
    check('a finished job whose key was sold shows no "not on the van" warning and no scan button', !r.missing && r.text === '' && r.buttons === 0 && /COMPLETED/i.test(r.card), r);

    // ================= 5. who sees prices =================
    await pg.evaluate(() => { const pv = document.querySelector('#view-schedule [data-nav="-1"]'); if (pv) pv.click(); }); await sleep(1500);
    r = await cardText('jOther');
    check('the owner sees the price on a job assigned to someone else', /💵 \$222\.00/.test(r || ''), r);
    await pg.evaluate((UID) => { localStorage.setItem('__role', 'technician'); const t = JSON.parse(localStorage.getItem('__staff')); t.forEach(x => { if (x.user_id === UID) x.role = 'technician'; }); localStorage.setItem('__staff', JSON.stringify(t)); }, UID); await bootIdx();   // the signed-in person is now a technician
    r = await cardText('jOther');
    check('a technician does NOT see the price on a job assigned to someone else', r && /TEST Other Customer/.test(r) && !/\$/.test(r), r);
    await pg.evaluate(() => document.querySelector('[data-open="jOther"]').click()); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1300);
    r = await pg.evaluate(() => (document.getElementById('sjCharges') || {}).innerText || '');
    check('…and opening that job shows a note instead of the charges', /shown to the technician it is assigned to/.test(r) && !/222/.test(r), r.replace(/\s+/g, ' ').slice(0, 200));
    await pg.evaluate(() => { document.querySelectorAll('.sch-modal').forEach(x => x.remove()); const nx = document.querySelector('#view-schedule [data-nav="1"]'); if (nx) nx.click(); }); await sleep(1800);
    r = await cardText(jid);
    check('the same technician still sees the price on their OWN job', new RegExp('💵 \\$' + String(est.total.toFixed(2)).replace('.', '\\.')).test(r || ''), r);
    r = await pg.evaluate(() => ({ mine: (TKS.list('receipts') || []).filter(x => TKS_MINE.seesDoc(x)).length, all: (TKS.list('receipts') || []).length }));
    check('their documents list keeps the documents that are theirs', r.all >= 2 && r.mine >= 1, r);
    check('no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
