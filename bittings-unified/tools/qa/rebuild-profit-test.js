// Browser test of 8z74 (owner report 2026-11-12): profit takes off the key's cost and card fees; a key from a Scheduler job
// brings its cost to the invoice; the service pick-lists open by tap (Scheduler charges + invoice lines); the Receipts page
// shows the same bottom bar as the main app; picking a vehicle in the job form no longer freezes.
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
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.evaluateOnNewDocument(() => {
      window.__long = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__long.push(Math.round(e.duration)))).observe({ entryTypes: ['longtask'] }); } catch (e) {}
      window.__mark = function () { var a = window.__long; window.__long = []; return a.reduce(function (x, y) { return x + y; }, 0); };
    });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const now = Date.now(), iso = new Date(now - 20 * 60000).toISOString(), z = n => String(n).padStart(2, '0'), d = new Date(), today = d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
      // 500 stock items with real-looking "Fits" text, so the vehicle match has the same amount of work as the shop's list
      const MK = [['Ford', ['F-150', 'Escape', 'Explorer', 'Fusion', 'Mustang']], ['Chevrolet', ['Silverado 1500', 'Malibu', 'Equinox', 'Traverse', 'Tahoe']], ['Toyota', ['Camry', 'Corolla', 'RAV4', 'Tundra', 'Highlander']], ['Honda', ['Accord', 'Civic', 'CR-V', 'Pilot', 'Odyssey']], ['Nissan', ['Altima', 'Rogue', 'Sentra', 'Maxima', 'Pathfinder']]];
      const inventory = []; for (let i = 0; i < 500; i++) { const m = MK[i % 5], md = m[1][(i >> 2) % 5], y = 2008 + (i % 12);
        inventory.push({ id: 'p' + i, shop_id: 's', name: 'TEST ' + m[0] + ' ' + md + ' ' + y + '-' + (y + 3) + ' key ' + i, sku: 'T-' + i, category: i % 3 ? 'Keys/Smart Key' : 'Keys/Transponder', fitment: m[0] + ' ' + md + ' ' + y + '-' + (y + 3) + '\n' + m[0] + ' ' + m[1][(i >> 1) % 5] + ' ' + String(y).slice(2) + '-' + String(y + 2).slice(2), qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', deleted_at: null, updated_at: iso }); }
      inventory.push({ id: 'key1', shop_id: 's', name: 'TEST FORD F-150 2015-2017 5-Button', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500, chip: '', fcc_id: '', deleted_at: null, updated_at: iso });
      const bookings = [{ id: 'bk1', shop_id: 's', customer_name: 'TEST Josh', date: today, time: '09:00', status: 'Scheduled', deleted_at: null, updated_at: iso,
        data: { id: 'bk1', customer: { name: 'TEST Josh', phone: '4055550101' }, date: today, time: '09:00', status: 'Scheduled', jobType: 'auto', subType: 'Smart key', technician: 'TEST Owner',
          items: [{ desc: 'TEST Smart key programming', qty: 1, each: 125, amount: 125, taxable: false }, { desc: 'TEST Service call', qty: 1, each: 95, amount: 95, taxable: false }], vehicle: { year: '2015', make: 'Ford', model: 'F-150', vin: '', ignition: '' }, createdAt: now, updatedAt: now } }];
      const job_parts = [{ id: 'jp1', shop_id: 's', job_id: 'bk1', item_id: 'key1', description: 'TEST FORD F-150 2015-2017 5-Button', qty: 1, state: 'pending', created_at: iso }];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, services: [
        { cat: 'automotive', en: 'TEST Smart key programming', es: '', value: 'TEST Smart key programming', price: '125' },
        { cat: 'automotive', en: 'TEST Service call', es: '', value: 'TEST Service call', price: '95' },
        { cat: 'automotive', en: 'TEST Car lockout', es: '', value: 'TEST Car lockout', price: '' }] } }];
      const T = (id, o) => Object.assign({ id: id, invoice_id: 'r_' + id, refunded_cents: 0, surcharge_cents: 0, surcharge_applied: false, status: 'completed', technician: 'TEST Owner', created_at: new Date(now - 3600000).toISOString() }, o);
      const payment_transactions = [
        T('t1', { method: 'other', base_cents: 46441, tax_cents: 1941, captured_cents: 46441, cost_cents: 4500, description: 'TEST key job — paid "other"' }),
        T('t2', { method: 'reader', base_cents: 20000, tax_cents: 0, surcharge_cents: 400, surcharge_applied: true, captured_cents: 20400, cost_cents: 3000, card_brand: 'visa', card_funding: 'credit', description: 'TEST credit card on the reader' }),
        T('t3', { method: 'keyed', base_cents: 10000, tax_cents: 0, captured_cents: 10000, cost_cents: null, card_brand: 'visa', card_funding: 'debit', description: 'TEST typed debit card' })];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings, job_parts, shop_config, web_leads: [], payment_transactions, audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'samer@turbokeysmith.com' } }));
    }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 });
    await sleep(4200);

    // ================= 1. Reports: profit =================
    await pg.evaluate(() => { TKPay.dayTransactions = async function () { return { rows: JSON.parse(localStorage.getItem('__db')).payment_transactions }; }; document.querySelector('.bt-sidebar .bt-nav__item[data-go="reports"]').click(); }); await sleep(1600);
    let r = await pg.evaluate(() => { const chip = k => { const c = document.querySelector('#repCards .chip.m-' + k + ' b'); return c ? c.innerText : null; }; const pc = document.getElementById('repProfitCard');
      return { sales: chip('sales'), cost: chip('cost'), profit: chip('profit'), card: pc ? pc.innerText.replace(/\s+/g, ' ') : null, oldCard: /Net revenue/.test(document.getElementById('repCards').innerText) }; });
    // sales 445.00 + 200.00 + 100.00 = 745.00 · parts 45 + 30 = 75.00 · fees: reader 20400×2.7%+5¢ = 5.56, typed 10000×2.9%+30¢ = 3.20 → 8.76 · surcharge +4.00 → 665.24
    check('Total Profit = sales − parts cost − card fees + surcharge collected ($745.00 − $75.00 − $8.76 + $4.00 = $665.24)', r.sales === '$745.00' && r.cost === '$75.00' && r.profit === '$665.24', r);
    check('"How the profit adds up" card lists each line; a sale paid "other" carries no card fee', !!r.card && /Parts cost − \$75\.00/.test(r.card) && /Card fees \(estimated\) − \$8\.76/.test(r.card) && /Card surcharge collected \+ \$4\.00/.test(r.card) && /Profit \$665\.24/.test(r.card) && !r.oldCard, r.card);
    await pg.evaluate(() => { const c = document.getElementById('repProfitCard'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'profit-card.png') });
    r = await pg.evaluate(() => { const one = JSON.parse(localStorage.getItem('__db')).payment_transactions.slice(0, 1); TKPay.dayTransactions = async function () { return { rows: one }; }; return renderReports().then(() => ({ profit: document.querySelector('#repCards .chip.m-profit b').innerText, card: document.getElementById('repProfitCard').innerText.replace(/\s+/g, ' ') })); });
    check('the owner\'s own example: $445.00 sale paid "other" with a $45.00 key shows $400.00 profit, not $445.00', r.profit === '$400.00' && /Card fees \(estimated\) − \$0\.00/.test(r.card), r);

    // ================= 2. Settings: the fee rates can be changed =================
    r = await pg.evaluate(() => { const c = TKS.Config.get(); c.payments = Object.assign({}, c.payments, { feeTapPct: 3, feeTapCents: 10 }); TKS.Config.save ? TKS.Config.save(c) : null; return { tap: repFeeRates().tapPct, fee: repCardFee({ method: 'reader', captured_cents: 20400 }), cash: repCardFee({ method: 'cash', captured_cents: 20400 }), other: repCardFee({ method: 'other', captured_cents: 20400 }) }; });
    check('fee rates come from Settings → Payments (3% + 10¢ on $204.00 = $6.22); cash and "other" have none', r.fee === 622 && r.cash === 0 && r.other === 0, r);
    await pg.evaluate(() => { const c = TKS.Config.get(); c.payments = Object.assign({}, c.payments, { feeTapPct: 2.7, feeTapCents: 5 }); if (TKS.Config.save) TKS.Config.save(c); });

    // ================= 3. Scheduler job form: speed + the charge pick-list =================
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="schedule"]').click()); await sleep(900);
    await pg.evaluate(() => { const n = document.querySelector('#view-schedule [data-new]'); if (n) n.click(); }); await sleep(900);
    await pg.evaluate(() => { const k = document.querySelector('#wzQuick'); if (k) k.click(); }); await sleep(900);
    const cdp = await pg.target().createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('.sch-modal #' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); };
    await setSel('sjYear', '2015'); await sleep(400); await setSel('sjMake', 'Ford'); await sleep(600);
    await pg.evaluate(() => window.__mark()); let t0 = Date.now(); await setSel('sjModel', 'F-150'); const callMs = Date.now() - t0; await sleep(2500);
    r = await pg.evaluate(() => ({ frozen: window.__mark(), keys: document.querySelectorAll('.sch-modal .sjkAdd').length, hasKey: /TEST FORD F-150 2015-2017 5-Button/.test(document.querySelector('.sch-modal #sjKeys').innerText), stock: TKS.Inventory.all().length }));
    r.callMs = callMs;
    check('picking the vehicle model no longer freezes the form (501 stock items, CPU slowed 4x: under 1.5 s; it was 14+ s)', r.frozen < 1500 && callMs < 1500 && r.keys > 0 && r.hasKey && r.stock === 501, r);
    await pg.evaluate(() => window.__mark()); t0 = Date.now();
    await pg.evaluate(() => { const a = Array.from(document.querySelectorAll('.sch-modal .sjkAdd')).find(x => x.dataset.id === 'key1'); a.click(); }); const addMs = Date.now() - t0; await sleep(2000);
    r = await pg.evaluate(() => ({ frozen: window.__mark(), onJob: /On this job \(1\)/.test(document.querySelector('.sch-modal #sjKeys').innerText) })); r.addMs = addMs;
    check('"+ Add" on a key answers at once (under 1.5 s slowed 4x)', r.frozen < 1500 && addMs < 1500 && r.onJob, r);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await pg.evaluate(() => document.querySelector('.sch-modal #sjChAdd').click()); await sleep(300);
    r = await pg.evaluate(() => { const row = document.querySelector('.sch-modal [data-chrow]'); const d = row.querySelector('.chD'); row.querySelector('.chPick').click(); const s = row.querySelector('.chSug');
      return { browserList: d.getAttribute('list'), datalist: !!document.getElementById('sjSvcList'), open: s.style.display, options: Array.from(s.querySelectorAll('.chOpt')).map(o => o.innerText.replace(/\s+/g, ' ').trim()), h: Math.round((s.querySelector('.chOpt') || s).getBoundingClientRect().height) }; });
    check('Scheduler charge: the ▾ button opens our own list of the shop\'s services (no browser suggestion list), rows big enough to tap', r.browserList === null && !r.datalist && r.open === 'block' && r.options.length === 3 && /TEST Smart key programming \$125\.00/.test(r.options[0]) && r.h >= 44, r);
    await pg.evaluate(() => document.querySelector('.sch-modal .chSug').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'charge-picklist.png') });
    r = await pg.evaluate(() => { const row = document.querySelector('.sch-modal [data-chrow]'); row.querySelector('.chOpt').click(); return { desc: row.querySelector('.chD').value, each: row.querySelector('.chE').value, open: row.querySelector('.chSug').style.display, total: document.querySelector('.sch-modal #sjChTot').innerText.replace(/\s+/g, ' ') }; });
    check('tapping a service fills in its name and price and closes the list; the total follows', r.desc === 'TEST Smart key programming' && r.each === '125' && r.open === 'none' && /Charges \$125\.00/.test(r.total), r);
    r = await pg.evaluate(() => { const row = document.querySelector('.sch-modal [data-chrow]'); const d = row.querySelector('.chD'); d.value = 'lock'; d.dispatchEvent(new Event('input', { bubbles: true })); const s = row.querySelector('.chSug'); return { open: s.style.display, options: Array.from(s.querySelectorAll('.chOpt')).map(o => o.dataset.v) }; });
    check('typing narrows the list ("lock" → Car lockout only)', r.open === 'block' && r.options.join() === 'TEST Car lockout', r);
    await pg.evaluate(() => { document.querySelectorAll('.sch-modal').forEach(x => x.remove()); localStorage.removeItem('tks_sj_draft'); });

    // ================= 4. A key on a Scheduler job brings its cost to the invoice =================
    r = await pg.evaluate(() => jobToInvoiceDraft(TKS.Bookings.get('bk1')).then(d => ({ items: d.items.map(i => i.name + ' | ' + i.price + ' | cost ' + (i.unitCost == null ? '-' : i.unitCost) + ' | part ' + (i.partId || '-')) })));
    check('"Invoice this job" hands over the key with its cost ($45.00) from stock', r.items.length === 3 && /TEST FORD F-150 2015-2017 5-Button \| 225 \| cost 45 \| part key1/.test(r.items[2]), r);
    r = await pg.evaluate(() => localStorage.getItem('tks_bottombar_view'));
    check('main app saved this person\'s bottom-bar tabs for the Receipts page', !!r && JSON.parse(r).map(o => o.go).join() === 'schedule,estimates,receipts,inventory', r);
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 8000 }).catch(() => {}); await sleep(900);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc).map(x => (x.querySelector('.qiDesc') || {}).value + ' | sale ' + (x.querySelector('.qiAmt') || {}).value + ' | cost ' + (x.querySelector('.qiCost') || {}).value + ' | part ' + (x.dataset.part || '-') + ' | tax ' + (x.querySelector('.qiTax') || {}).checked));
    check('the invoice opens with the key line showing Cost $45.00 (was 0.00), taxed, tied to the stock item', r.length === 3 && /TEST FORD F-150 2015-2017 5-Button \| sale 225 \| cost 45(\.00)? \| part key1 \| tax true/.test(r[2]), r);
    // a key line whose cost was lost on the way (older draft / other device) is still filled from stock
    r = await pg.evaluate(() => { sessionStorage.setItem('tks_job_draft', JSON.stringify({ jobId: 'bk1', category: 'automotive', customer: 'TEST Josh', fromDispatch: true, items: [{ name: 'TEST FORD F-150 2015-2017 5-Button', price: '225', qty: 1, partId: 'key1', fromDispatch: true, category: 'Materials', taxable: true }], ts: Date.now() })); return true; });
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 8000 }).catch(() => {}); await sleep(900);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc).map(x => (x.querySelector('.qiCost') || {}).value));
    check('a key line that arrives with no cost is given the stock cost by the builder', r.length === 1 && r[0] === '45.00', r);

    // ================= 5. Invoice builder: the service pick-list =================
    await pg.evaluate(() => { const add = document.querySelector('#qiAdd') || Array.from(document.querySelectorAll('.qi-box button')).find(x => /add (a )?line|\+ line|add item/i.test(x.innerText)); if (add) add.click(); }); await sleep(300);
    r = await pg.evaluate(() => { const rows = Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc), row = rows[rows.length - 1], d = row.querySelector('.qiDesc'); d.focus(); d.dispatchEvent(new Event('focus'));
      const s = row.querySelector('.qiSug'); return { rows: rows.length, empty: d.value === '', browserList: d.getAttribute('list'), open: getComputedStyle(s).display, options: Array.from(s.querySelectorAll('.qiSugO')).map(o => o.innerText.replace(/\s+/g, ' ').trim()), h: Math.round((s.querySelector('.qiSugO') || s).getBoundingClientRect().height) }; });
    check('invoice line: tapping an empty description opens our own list of services with prices', r.rows === 2 && r.empty && r.browserList === null && r.open === 'block' && r.options.length >= 3 && r.options.some(o => /TEST Service call \$95\.00/.test(o)) && r.h >= 44, r);
    await pg.evaluate(() => { const s = Array.from(document.querySelectorAll('.qiSug')).find(x => getComputedStyle(x).display === 'block'); if (s) s.scrollIntoView({ block: 'center' }); }); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'invoice-picklist.png') });
    r = await pg.evaluate(() => { const rows = Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.dataset.disc), row = rows[rows.length - 1]; Array.from(row.querySelectorAll('.qiSugO')).find(o => /TEST Service call/.test(o.innerText)).click();
      return { desc: row.querySelector('.qiDesc').value, amt: row.querySelector('.qiAmt').value, open: getComputedStyle(row.querySelector('.qiSug')).display }; });
    await sleep(300); r.totals = await pg.evaluate(() => (document.getElementById('qiTot') || {}).innerText);
    check('tapping one fills in the description and price, closes the list and the running total follows', r.desc === 'TEST Service call' && r.amt === '95.00' && r.open === 'none' && /320\.00/.test(String(r.totals || '').replace(/\s+/g, ' ')), r);

    // ================= 6. Receipts page bottom bar = the main app's =================
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#appnav a')).map(a => a.innerText.replace(/\s+/g, ' ').trim() + ' → ' + a.getAttribute('href') + (a.classList.contains('active') ? ' *' : '')));
    check('Receipts page bottom bar: the same four tabs as the main app, then More (Schedule no longer there twice)', r.length === 5 && /Schedule → index\.html\?go=schedule/.test(r[0]) && /Quotes → bittings\.html\?estimates=1/.test(r[1]) && /Receipts → index\.html\?go=receipts \*/.test(r[2]) && /Stock → index\.html\?go=inventory/.test(r[3]) && /More → index\.html\?menu=1/.test(r[4]) && r.filter(x => /Sched/.test(x)).length === 1, r);
    await pg.evaluate(() => { document.querySelectorAll('.qi-ov').forEach(x => x.remove()); }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'receipts-bottom-bar.png') });
    // this person changed their bar in the main app → the Receipts page follows
    await pg.evaluate(() => { localStorage.setItem('tks_bottombar:samer@turbokeysmith.com', JSON.stringify(['schedule', 'quote', 'reports', 'dashboard'])); sessionStorage.removeItem('tks_job_draft'); });
    await pg.goto('http://127.0.0.1:8088/index.html?menu=1', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500);
    r = await pg.evaluate(() => ({ menuOpen: document.querySelector('.bt-sidebar').classList.contains('is-open'), url: location.search, bar: Array.from(document.querySelectorAll('.bt-bottomnav__item')).map(x => x.innerText.replace(/[^A-Za-z ]/g, '').trim()) }));
    check('"More" from the Receipts page opens the main app with its full menu out', r.menuOpen && r.url === '' && r.bar.join() === 'Schedule,Quotes,Reports,Dashboard,More', r);
    await pg.goto('http://127.0.0.1:8088/bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await sleep(1500);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#appnav a')).map(a => a.innerText.replace(/[^A-Za-z ]/g, '').trim()));
    check('a bar customised in the main app (Schedule, Quotes, Reports, Dashboard) shows the same on the Receipts page', r.join() === 'Schedule,Quotes,Reports,Dashboard,More', r);
    check('no page errors', errs.length === 0, errs.slice(0, 5));
    await pg.close();
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
