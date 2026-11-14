// Browser test of 8z71/8z72: Leads screen (book / quote / dismiss), visible Update button, error log, accountant export.
// Real pages, signed-in path, stand-in cloud. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 620) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString(), now = Date.now();
      const tot = t => ({ subtotal: t, tax: 0, total: t, grossSubtotal: t, discount: 0, taxable: 0, nontax: t, surcharge: 0 });
      const receipts = [{ id: 'r1', data: { id: 'r1', number: 'TKS-TEST-1', customer: 'TEST Ann', docType: 'receipt', status: 'Paid in Full', payment: 'Cash', savedAt: now - 3600000, items: [{ desc: 'TEST Service', amount: 100, qty: 1 }], totals: tot(100) }, deleted_at: null, updated_at: iso }];
      const web_leads = [
        { id: 'L1', shop_id: 's', name: 'TEST Maria Lopez', phone: '(405) 555-0144', email: 'maria@example.com', address: '12 Elm St, Bethany', service: 'Car key replacement', notes: 'TEST — lost my only key, 2015 Camry', lang: 'es', page: '/es/contact', status: 'new', created_at: new Date(now - 12 * 60000).toISOString() },
        { id: 'L2', shop_id: 's', name: 'TEST Hill Dental', phone: '4055550155', email: '', address: '', service: 'Commercial rekey', notes: '', lang: 'en', page: '/contact', status: 'new', created_at: new Date(now - 3 * 3600000).toISOString() }];
      const payment_transactions = [{ id: 't1', invoice_id: 'r1', method: 'cash', base_cents: 10863, tax_cents: 863, surcharge_cents: 0, surcharge_applied: false, captured_cents: 10863, refunded_cents: 0, cost_cents: 2500, status: 'completed', description: 'TEST Service — TEST Ann', technician: 'TEST Tech', created_at: new Date(now - 3600000).toISOString() }];
      localStorage.setItem('__db', JSON.stringify({ receipts, inventory: [], customers: [], bookings: [], shop_config: [], web_leads, payment_transactions, audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'samer@turbokeysmith.com' } }));
    }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 });
    await sleep(4200);

    // ---- Update button in the top bar ----
    let r = await pg.evaluate(() => { const u = document.getElementById('updNowBtn'); if (!u) return null; const rc = u.getBoundingClientRect(); return { text: u.innerText, w: Math.round(rc.width), h: Math.round(rc.height), visible: rc.width > 20 && rc.top >= 0 && rc.bottom <= innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }; });
    check('Update button is in the top bar, visible without opening any menu', !!r && /Update/.test(r.text) && r.visible && r.overflow === 0, r);

    // ---- Leads: badge, list, actions ----
    r = await pg.evaluate(() => ({ badge: document.getElementById('navLeads').getAttribute('data-badge') }));
    check('Leads menu item shows how many are new', r.badge === '2', r);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="leads"]').click()); await sleep(700);
    r = await pg.evaluate(() => ({ view: (document.querySelector('.view.active') || {}).id, cards: Array.from(document.querySelectorAll('.lead-card')).map(c => c.querySelector('.ln').innerText + ' | ' + c.querySelector('.lt').innerText + ' | ' + Array.from(c.querySelectorAll('.la button, .la a')).map(x => x.innerText.trim()).join(',')), overflow: document.documentElement.scrollWidth - innerWidth }));
    check('Leads screen lists the website enquiries with Add to Scheduler / Quote / Call / Dismiss', r.view === 'view-leads' && r.cards.length === 2 && /TEST Maria Lopez \| NEW \| 📅 Add to Scheduler,💬 Quote,📞 Call,✕ Dismiss/.test(r.cards[0]) && r.overflow === 0, r);
    await pg.screenshot({ path: path.join(OUT, 'leads-screen.png') });
    // dismiss L2
    await pg.evaluate(() => Array.from(document.querySelectorAll('.lead-card')).find(c => /Hill Dental/.test(c.innerText)).querySelector('[data-la="dismiss"]').click()); await sleep(300);
    await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); d.querySelector('[data-yes]').click(); }); await sleep(900);
    r = await pg.evaluate(() => ({ cards: document.querySelectorAll('.lead-card').length, server: JSON.parse(localStorage.getItem('__db')).web_leads.map(l => l.id + ':' + l.status) }));
    check('Dismiss takes a lead off the list (kept in the records as dismissed)', r.cards === 1 && r.server.join() === 'L1:new,L2:dismissed', r);
    // book L1 → Scheduler job form filled in
    await pg.evaluate(() => document.querySelector('.lead-card [data-la="book"]').click()); await sleep(1500);
    r = await pg.evaluate(() => { const m = document.querySelector('.sch-modal'); return { view: (document.querySelector('.view.active') || {}).id, form: !!m, name: m && (m.querySelector('#sjName') || {}).value, phone: m && (m.querySelector('#sjPhone') || {}).value, svc: m && (m.querySelector('#sjSvc') || {}).value, notes: m && (m.querySelector('#sjINotes') || {}).value, jt: m && (m.querySelector('#sjJt .on') || { dataset: {} }).dataset.jt, server: JSON.parse(localStorage.getItem('__db')).web_leads[0].status }; });
    check('"Add to Scheduler" opens a new job already filled in from the lead and marks the lead booked', r.view === 'view-schedule' && r.form && r.name === 'TEST Maria Lopez' && r.phone === '(405) 555-0144' && r.svc === 'Car key replacement' && /Website lead: Car key replacement — TEST — lost my only key/.test(r.notes || '') && r.jt === 'auto' && r.server === 'scheduled', r);
    await pg.screenshot({ path: path.join(OUT, 'lead-to-job.png') });
    await pg.evaluate(() => { document.querySelectorAll('.sch-modal').forEach(x => x.remove()); localStorage.removeItem('tks_sj_draft'); });

    // ---- error log: an error in the app is written where the owner can read it ----
    // (an error thrown from the test harness itself is hidden from the page by the browser, so run it as a script of the page)
    await pg.evaluate(() => { const s = document.createElement('script'); s.textContent = 'setTimeout(function(){ throw new Error("TEST boom — invoice screen"); }, 0); Promise.reject(new Error("TEST rejected promise"));'; document.body.appendChild(s); }); await sleep(900);
    r = await pg.evaluate(() => (JSON.parse(localStorage.getItem('__db')).audit_log || []).filter(a => a.action === 'app_error').map(a => a.entity_type + ': ' + a.detail.msg + ' @' + a.detail.screen));
    check('script errors and failed promises are written to the activity log as app_error', r.length === 2 && /script: .*TEST boom/.test(r.join(' | ')) && /promise: TEST rejected promise/.test(r.join(' | ')), r);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="activity"]').click()); await sleep(900);
    await pg.evaluate(() => document.getElementById('actErrors').click()); await sleep(900);
    r = await pg.evaluate(() => ({ rows: document.querySelectorAll('#actList .crow').length, text: (document.getElementById('actList').innerText || '').slice(0, 260) }));
    check('Activity → "⚠ Errors" shows them with who, when, screen and message', r.rows === 2 && /app error/.test(r.text) && /TEST boom/.test(r.text) && /screen: /.test(r.text), r);
    await pg.screenshot({ path: path.join(OUT, 'error-log.png') });

    // ---- accountant export ----
    await pg.evaluate(() => { window.__csv = null; const orig = URL.createObjectURL; URL.createObjectURL = function (b) { try { b.text().then(t => { window.__csv = t; }); } catch (e) {} return orig.call(URL, b); }; });
    await pg.evaluate(() => { TKPay.dayTransactions = async function () { return { rows: JSON.parse(localStorage.getItem('__db')).payment_transactions }; }; document.querySelector('.bt-sidebar .bt-nav__item[data-go="reports"]').click(); }); await sleep(1500);
    await pg.evaluate(() => document.getElementById('repExport').click()); await sleep(700);
    r = await pg.evaluate(() => (window.__csv || '').split(/\r\n/).map(l => l.replace(/^\ufeff/, '')));
    check('Reports → "⬇ Export" makes a CSV: one row per payment with sale, tax and document number', r.length === 2 && /^Date,Time,Document,Customer,Description,Paid by,Card,Sale before tax,Sales tax,Card surcharge,Collected,Refunded,Cost of parts,Card fee \(estimated\),Status,Technician$/.test(r[0]) && /TKS-TEST-1,TEST Ann,TEST Service — TEST Ann,cash,,100\.00,8\.63,0\.00,108\.63,0\.00,25\.00,0\.00,completed,TEST Tech$/.test(r[1]), r);
    check('no unexpected page errors', errs.filter(e => !/TEST boom|TEST rejected/.test(e)).length === 0, errs);

    // ---- a lead being quoted opens the Quick quote with the person filled in ----
    await pg.evaluate(() => { sessionStorage.setItem('tks_job_draft', JSON.stringify({ category: 'automotive', customer: 'TEST Maria Lopez', customerInfo: { name: 'TEST Maria Lopez', phone: '(405) 555-0144', email: 'maria@example.com' }, address: '12 Elm St', internalNotes: 'Website lead: Car key replacement', items: [], ts: Date.now() })); });
    await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 6000 }).catch(() => {}); await sleep(500);
    r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || { dataset: {} }).dataset.t, name: (document.querySelector('#qiName') || {}).value, phone: (document.querySelector('#qiPhone') || {}).value, notes: (document.querySelector('#qiINotes') || {}).value, upd: !!document.getElementById('updBtn') }));
    check('"Quote" on a lead opens Build a quote (8z153: was Quick quote) as an estimate with the person filled in; Receipts page has an Update button too', /Build a quote/.test(r.title || '') && r.type === 'estimate' && r.name === 'TEST Maria Lopez' && r.phone === '(405) 555-0144' && /Website lead/.test(r.notes || '') && r.upd, r);
    await pg.close();
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
