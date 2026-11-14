// Browser test of 8z84: a 2nd, 3rd… vehicle on a quote / invoice / receipt and on a Scheduler job.
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 800) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500 }),
        K('key5', { name: 'TEST Toyota Camry 2012-2017 smart key', sku: 'T-KEY5', category: 'Keys/Smart Key', fitment: 'Toyota Camry 2012-2017', qty: 4, cost: 40, sell_price_cents: 19900 }),
        K('key7', { name: 'TEST Honda Civic 2016-2021 smart key', sku: 'T-KEY7', category: 'Keys/Smart Key', fitment: 'Honda Civic 2016-2021', qty: 2, cost: 35, sell_price_cents: 18900 })];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK 73000' }, taxableByCategory: { Materials: true } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    let r;
    const openQuote = async () => { await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2200); };
    const setSel = (sel, v) => pg.evaluate((sel, v) => { const e = document.querySelector(sel); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); return e.value; }, sel, v);
    const rows = () => pg.evaluate(() => Array.from(document.querySelectorAll('#qiItems .qi-item:not(.disc)')).map(x => { const w = x.querySelector('.qiVehW'), s = x.querySelector('.qiVehSel'); return { desc: x.querySelector('.qiDesc').value, vehShown: !!(w && w.style.display !== 'none'), veh: s ? (s.options[s.selectedIndex] || {}).text : null }; }));

    // ================= 1. One vehicle: nothing changes =================
    await openQuote();
    await pg.evaluate(() => { const s = (id, v) => { const x = document.querySelector(id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); }; s('#qiName', 'TEST Two Car Family'); s('#qiPhone', '405-555-0303'); });
    await setSel('#qiVYear', '2015'); await setSel('#qiVMake', 'Ford'); await setSel('#qiVModel', 'F-150'); await sleep(500);
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add').click()); await sleep(400);
    r = { rows: await rows(), btn: await pg.evaluate(() => (document.getElementById('qiAddVeh') || {}).innerText) };
    check('with one vehicle the form is as before (no "which vehicle" question) and offers "Add another vehicle"', r.rows.length === 1 && r.rows[0].vehShown === false && /Add another vehicle/.test(r.btn || ''), r);

    // ================= 2. Add a second and a third vehicle =================
    await pg.evaluate(() => document.getElementById('qiAddVeh').click()); await sleep(300);
    await setSel('#qiMoreVeh .qi-mveh:nth-child(1) .mvY', '2014'); await setSel('#qiMoreVeh .qi-mveh:nth-child(1) .mvMk', 'Toyota'); await setSel('#qiMoreVeh .qi-mveh:nth-child(1) .mvMd', 'Camry'); await sleep(500);
    r = await pg.evaluate(() => { const bk = document.querySelector('#qiMoreVeh .qi-mveh'); return { title: bk.querySelector('.mvT').innerText, keys: bk.querySelector('.mvKeys').innerText.replace(/\s+/g, ' ') }; });
    check('"Vehicle 2" gets its own key list (2014 Toyota Camry → the Camry key with its price)', r.title === 'Vehicle 2' && /Keys for 2014 Toyota Camry/.test(r.keys) && /TEST Toyota Camry 2012-2017 smart key/.test(r.keys) && /\$199\.00/.test(r.keys) && !/FORD/.test(r.keys), r);
    await pg.evaluate(() => document.querySelector('#qiMoreVeh .qi-mveh .qk-add').click()); await sleep(400);
    await pg.evaluate(() => document.getElementById('qiAdd').click()); await sleep(200);
    await pg.evaluate(() => { const rws = document.querySelectorAll('#qiItems .qi-item:not(.disc)'), last = rws[rws.length - 1]; const d = last.querySelector('.qiDesc'); d.value = 'TEST Service call'; d.dispatchEvent(new Event('input', { bubbles: true })); const a = last.querySelector('.qiAmt'); a.value = '50'; a.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(400);
    r = await rows();
    check('each key is tied to the vehicle whose list it came from; a hand-typed line starts as "the whole job"', r.length === 3 && r.every(x => x.vehShown) && r[0].veh === '1. 2015 Ford F-150' && r[1].veh === '2. 2014 Toyota Camry' && /whole job/.test(r[2].veh), r);
    await pg.evaluate(() => document.querySelector('#qiMoreVeh').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'multiveh-form.png') });
    await pg.evaluate(() => document.getElementById('qiAddVeh').click()); await sleep(300);
    await pg.evaluate(() => { const bk = document.querySelectorAll('#qiMoreVeh .qi-mveh')[1]; const t = bk.querySelector('.mvText'); t.value = 'TEST 1998 golf cart'; t.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(400);
    r = await pg.evaluate(() => ({ titles: Array.from(document.querySelectorAll('#qiMoreVeh .mvT')).map(x => x.innerText), opts: Array.from(document.querySelector('#qiItems .qiVehSel').options).map(o => o.text) }));
    check('a third vehicle can be described in words when it is not in the lists', r.titles.join() === 'Vehicle 2,Vehicle 3' && r.opts.join('|') === 'The whole job — not one vehicle|1. 2015 Ford F-150|2. 2014 Toyota Camry|3. TEST 1998 golf cart', r);
    await pg.evaluate(() => { const rws = document.querySelectorAll('#qiItems .qi-item:not(.disc)'); const s = rws[2].querySelector('.qiVehSel'); s.value = '2'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(900);
    r = await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST Two Car Family'); const pv = document.querySelector('.rc-body') ? document.querySelector('.rc-body').innerText.replace(/\s+/g, ' ') : '';
      return { err: (document.querySelector('#qiErr') || {}).innerText || '', doc: d && { veh: [d.vehYear, d.vehMake, d.vehModel].join(' '), more: d.moreVehicles, items: d.items.map(i => [i.desc, i.vehicle || '', i.vehIdx == null ? '' : i.vehIdx].join(' | ')), total: d.totals.total }, pv }; });
    check('saved: the first vehicle where it always was, the other two listed, every line with its vehicle', !!r.doc && r.doc.veh === '2015 Ford F-150' && r.doc.more.length === 2 && r.doc.more[0].make === 'Toyota' && r.doc.more[0].model === 'Camry' && r.doc.more[1].text === 'TEST 1998 golf cart' &&
      r.doc.items.join(' ; ') === 'TEST FORD F-150 2015-2017 5-Button PEPS | 2015 Ford F-150 | 0 ; TEST Toyota Camry 2012-2017 smart key | 2014 Toyota Camry | 1 ; TEST Service call | TEST 1998 golf cart | 2', r.doc || r.err);
    check('the printed estimate lists all three vehicles and says which line is for which', /Vehicle: 2015 Ford F-150/.test(r.pv) && /Vehicle 2: 2014 Toyota Camry/.test(r.pv) && /Vehicle 3: TEST 1998 golf cart/.test(r.pv) && /TEST Toyota Camry 2012-2017 smart key — 2014 Toyota Camry/.test(r.pv) && /TEST Service call — TEST 1998 golf cart/.test(r.pv), r.pv.slice(0, 700));
    await pg.evaluate(() => { const x = document.querySelector('.rc-body'); if (x) x.scrollIntoView({ block: 'start' }); }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'multiveh-printed.png') });
    r = await pg.evaluate(() => { try { const d = TKS.list('receipts').find(x => x.customer === 'TEST Two Car Family'); const o = makePDF(d, 'en', false, true); const pc = paperCopy(d);
      return { pdf: !!(o && o.blob && o.blob.size > 2000), paper: { more: pc.moreVehicles, items: pc.items.map(i => i.desc) }, saved: d.items.map(i => i.desc) }; } catch (e) { return { err: String(e.message) }; } });
    check('the PDF builds, the paper receipt carries the vehicles, and the saved descriptions are left untouched', r.pdf === true && r.paper.more.join('|') === '2014 Toyota Camry|TEST 1998 golf cart' && /smart key - 2014 Toyota Camry/.test(r.paper.items[1]) && r.saved[1] === 'TEST Toyota Camry 2012-2017 smart key', r);

    // ================= 3. Edit: everything comes back; removing a vehicle frees its lines =================
    await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST Two Car Family'); editReceipt(d); }); await sleep(1200);
    r = { rows: await rows(), blocks: await pg.evaluate(() => Array.from(document.querySelectorAll('#qiMoreVeh .qi-mveh')).map(x => [x.querySelector('.mvY').value, x.querySelector('.mvMk').value, x.querySelector('.mvMd').value, x.querySelector('.mvText').value].join(' ').trim())) };
    check('opening it again brings back the vehicles and each line\'s vehicle', r.blocks.length === 2 && r.blocks[0] === '2014 Toyota Camry' && /golf cart/.test(r.blocks[1]) && r.rows.length === 3 && r.rows[0].veh === '1. 2015 Ford F-150' && r.rows[1].veh === '2. 2014 Toyota Camry' && r.rows[2].veh === '3. TEST 1998 golf cart', r);
    await pg.evaluate(() => document.querySelector('#qiMoreVeh .qi-mveh .mvX').click()); await sleep(500);
    r = { rows: await rows(), titles: await pg.evaluate(() => Array.from(document.querySelectorAll('#qiMoreVeh .mvT')).map(x => x.innerText)) };
    check('removing Vehicle 2 renumbers the rest; its line goes back to "the whole job", the golf cart line follows its vehicle', r.titles.join() === 'Vehicle 2' && /whole job/.test(r.rows[1].veh) && r.rows[2].veh === '2. TEST 1998 golf cart' && r.rows[0].veh === '1. 2015 Ford F-150', r);
    await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(900);
    r = await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST Two Car Family'); return { more: d.moreVehicles, items: d.items.map(i => i.vehicle || '-') }; });
    check('saved after the change: two vehicles, lines updated', r.more.length === 1 && r.more[0].text === 'TEST 1998 golf cart' && r.items.join() === '2015 Ford F-150,-,TEST 1998 golf cart', r);

    // ================= 4. Lists and the Scheduler job =================
    await pg.goto('http://127.0.0.1:8088/bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await sleep(2800);
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(400);   // the page lands on the Quotes & estimates card now; the list is one tap away
    r = await pg.evaluate(() => { const s = document.getElementById('histSearch'); s.value = 'golf'; s.dispatchEvent(new Event('input', { bubbles: true })); return Array.from(document.querySelectorAll('#histList .hist-item')).map(x => x.innerText.replace(/\s+/g, ' ')); });
    check('the estimates list shows "2 vehicles" and search finds it by the second vehicle', r.length === 1 && /🚗 2 vehicles/.test(r[0]), r);
    // 8z153: Book it opens a sheet; its Book it button creates the job directly (no Quick form), so the form is reached by opening the job's card
    await pg.evaluate(() => document.querySelector('#histList [data-act="sched"]').click()); await pg.waitForSelector('#bkSheet #bkGo', { timeout: 5000 }); await sleep(300);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => document.getElementById('bkGo').click())]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 });
    await pg.waitForFunction(() => (TKS.Bookings.all() || []).some(x => /^EST-/.test(x.fromEstimate || '')), { timeout: 15000 }); await sleep(1200);
    r = await pg.evaluate(() => { const j = (TKS.Bookings.all() || []).find(x => /^EST-/.test(x.fromEstimate || '')); return { more: (j.moreVehicles || []).map(v => v.text || v.make || ''), n: (j.moreVehicles || []).length, status: j.status }; });
    check('8z153: Book it creates the booking with the second vehicle carried over', r.n === 1 && /golf cart/i.test(r.more[0] || '') && r.status === 'Scheduled', r);
    await pg.evaluate(() => { const j = (TKS.Bookings.all() || []).find(x => /^EST-/.test(x.fromEstimate || '')); document.querySelector('[data-open="' + j.id + '"]').click(); }); await pg.waitForSelector('#sjSave', { timeout: 15000 }); await sleep(900);
    r = await pg.evaluate(() => ({ first: [document.getElementById('sjYear').value, document.getElementById('sjMake').value, document.getElementById('sjModel').value].join(' '), more: Array.from(document.querySelectorAll('#sjMoreVeh [data-mv]')).map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 20)), n: document.querySelectorAll('#sjMoreVeh [data-mv]').length, add: !!document.getElementById('sjAddVeh') }));
    check('Book it: the job opens with the first vehicle and "Vehicle 2" carried over, plus "Add another vehicle"', r.first === '2015 Ford F-150' && r.n === 1 && /Vehicle 2/.test(r.more[0] || '') && r.add, r);
    await pg.evaluate(() => document.getElementById('sjAddVeh').click()); await sleep(300);
    await pg.evaluate(() => { const row = document.querySelectorAll('#sjMoreVeh [data-mv]')[1]; const y = row.querySelector('.mvY'); y.value = '2018'; y.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    await pg.evaluate(() => { const row = document.querySelectorAll('#sjMoreVeh [data-mv]')[1]; const m = row.querySelector('.mvMk'); m.value = 'Honda'; m.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    await pg.evaluate(() => { const row = document.querySelectorAll('#sjMoreVeh [data-mv]')[1]; const m = row.querySelector('.mvMd'); m.value = 'Civic'; m.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('sjDate').value = new Date().toISOString().slice(0, 10); document.getElementById('sjTime').value = '10:00'; document.getElementById('sjMoreVeh').scrollIntoView({ block: 'center' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'multiveh-job.png') });
    await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1200);
    r = await pg.evaluate(() => { const j = (TKS.list('bookings') || []).find(x => x.customer && x.customer.name === 'TEST Two Car Family'); const card = Array.from(document.querySelectorAll('.sch-card')).map(x => x.innerText.replace(/\s+/g, ' ')).find(x => /Two Car Family/.test(x)) || ''; const d = j ? jobToInvoiceDraft(j) : null;
      return { more: j && j.moreVehicles, card, draft: d && !d.then ? (d.moreVehicles || []).length : 'promise' }; });
    check('the saved job keeps all three vehicles and its card shows them', !!r.more && r.more.length === 2 && r.more[1].make === 'Honda' && r.more[1].model === 'Civic' && /\+ 2 more vehicles/.test(r.card) && /🚗 3\. 2018 Honda Civic/.test(r.card), r);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
