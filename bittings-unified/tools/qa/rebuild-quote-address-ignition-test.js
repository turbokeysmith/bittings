// Browser test of the builder's two small additions:
//  (1) the address is four boxes (Street / City / State / ZIP) — any subset saves; the record keeps BOTH the composed
//      string `address` and the parts `addr`; old string-only records open split and save back equivalent;
//  (2) push-to-start / turn-key choice above the key list, per vehicle, saved, restored on edit, handed to the Scheduler.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Port 8097. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const PORT = 8097, BASE = 'http://127.0.0.1:' + PORT + '/';
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 800))); if (!ok) failed++; }

const now = Date.now();
const OLD = (id, number, address, extra) => Object.assign({ id, number, docType: 'estimate', customer: 'TEST Old ' + id, status: 'Estimate', date: 'November 1, 2026', savedAt: now - 1000, serviceType: 'Automotive', address, items: [{ desc: 'TEST Lock service', amount: 50, taxable: false, category: 'Labor', qty: 1 }], totals: { subtotal: 50, tax: 0, total: 50 }, taxRate: 0 }, extra || {});
const DOCS = [
  OLD('o1', 'EST-O1', '123 Main St, Apt 4, Tulsa, OK 74101'),
  OLD('o2', 'EST-O2', '12 Elm St Apt 4B'),
  OLD('o3', 'EST-O3', 'Back lot behind the shop, gate 3'),
  OLD('o4', 'EST-O4', '9 Oak Ave, Tulsa, OK 74101', { addr: { street: '9 Oak Ave', city: 'Tulsa', state: 'OK', zip: '74101' } }),
];

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf('http://127.0.0.1:' + PORT + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    await pg.setViewport(PHONE);
    await pg.goto(BASE + 'seed.html');
    await pg.evaluate((UID, DOCS) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500 }),
        K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 2, cost: 30, sell_price_cents: 16500 }),
        K('key3', { name: 'TEST Ford transponder blank', sku: 'T-KEY3', category: 'Keys/Transponder', fitment: 'Ford F-150 2011-2020', qty: 12, cost: 4, sell_price_cents: 4500, chip: 'ID49' })];
      const customers = [{ id: '00000000-0000-4000-8000-0000000000c1', name: 'TEST Pickle Customer', contact: '', phone: '4055550123', email: '', address: '55 Pine Rd, Norman, OK 73069', customer_type: 'individual', is_contracting: false, created_at: iso, updated_at: iso, deleted_at: null }];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, services: [] } }];
      localStorage.clear();
      localStorage.setItem('__db', JSON.stringify({ receipts: DOCS.map(d => ({ id: d.id, data: d, deleted_at: null, updated_at: iso })), inventory, customers, bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, DOCS);

    const open = async (q) => { await pg.goto(BASE + 'bittings.html' + (q || '?quote=1'), { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(1800); };
    const type = async (sel, txt) => { await pg.click(sel); await pg.type(sel, txt); };
    const setVal = (sel, v, ev) => pg.evaluate((sel, v, ev) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event(ev || 'input', { bubbles: true })); }, sel, v, ev);
    const setSel = async (sel, v) => { await pg.evaluate((sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, v); await sleep(350); };
    const line = () => pg.evaluate(() => { const row = document.querySelector('.qi-item'); const d = row.querySelector('.qiDesc'), a = row.querySelector('.qiAmt'); if (!d.value) { d.value = 'TEST Lock service'; d.dispatchEvent(new Event('input', { bubbles: true })); a.value = '50'; a.dispatchEvent(new Event('input', { bubbles: true })); } });
    const save = async () => { await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(900); };
    const rec = (name) => pg.evaluate((name) => { const d = TKS.list('receipts').find(x => x.customer === name); return d ? { address: d.address, addr: d.addr, ign: d.vehIgnition, more: d.moreVehicles, docType: d.docType, number: d.number } : null; }, name);
    const boxes = () => pg.evaluate(() => ({ street: qiv('#qiStreet'), city: qiv('#qiCity'), state: qiv('#qiState'), zip: qiv('#qiZip'), hidden: qiv('#qiAddr') }));
    await pg.evaluateOnNewDocument(() => { window.qiv = s => { const e = document.querySelector(s); return e ? e.value : null; }; });

    // ================= 1. four boxes =================
    await open('?quote=1');
    await pg.evaluate(() => { window.qiv = s => { const e = document.querySelector(s); return e ? e.value : null; }; });
    let r = await pg.evaluate(() => { const g = id => document.querySelector(id), rc = id => g(id).getBoundingClientRect(), A = g('#qiAddr');
      return { ids: ['#qiStreet', '#qiCity', '#qiState', '#qiZip'].every(id => !!g(id)), hiddenType: A && A.type, h: ['#qiStreet', '#qiCity', '#qiState', '#qiZip'].map(id => Math.round(rc(id).height)),
        sameRow: Math.abs(rc('#qiCity').top - rc('#qiState').top) < 2 && Math.abs(rc('#qiState').top - rc('#qiZip').top) < 2, streetW: Math.round(rc('#qiStreet').width),
        ac: ['#qiStreet', '#qiCity', '#qiState', '#qiZip'].map(id => g(id).getAttribute('autocomplete')).join(), zipMode: g('#qiZip').getAttribute('inputmode'), stMax: g('#qiState').maxLength,
        over: document.documentElement.scrollWidth - window.innerWidth, boxOver: g('.qi-box').scrollWidth - g('.qi-box').clientWidth }; });
    check('the Address is four boxes (Street, City, State, ZIP) and #qiAddr is a hidden box', r.ids && r.hiddenType === 'hidden', r);
    check('phone 390px: every box 44px+ tall, City + State + ZIP share a row, no sideways scroll', r.h.every(x => x >= 44) && r.sameRow && r.over <= 0 && r.boxOver <= 0, r);
    check('hints: street / city / state / ZIP autocomplete, ZIP numeric keypad, State 2 letters', r.ac === 'street-address,address-level2,address-level1,postal-code' && r.zipMode === 'numeric' && r.stMax === 2, r);
    await type('#qiStreet', '9 Oak Ave'); await type('#qiCity', 'Tulsa'); await type('#qiState', 'ok'); await type('#qiZip', '74101');
    r = await boxes();
    check('typing fills the hidden composed string; State is upper-cased', r.state === 'OK' && r.hidden === '9 Oak Ave, Tulsa, OK 74101', r);
    await pg.evaluate(() => document.querySelector('#qiStreet').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'quote-address-phone.png') });

    // ---- any subset saves ----
    const subsets = [
      ['TEST Addr All', { '#qiStreet': '9 Oak Ave', '#qiCity': 'Tulsa', '#qiState': 'ok', '#qiZip': '74101' }, '9 Oak Ave, Tulsa, OK 74101', { street: '9 Oak Ave', city: 'Tulsa', state: 'OK', zip: '74101' }],
      ['TEST Addr Street', { '#qiStreet': '12 Elm St' }, '12 Elm St', { street: '12 Elm St', city: '', state: '', zip: '' }],
      ['TEST Addr CityState', { '#qiCity': 'Norman', '#qiState': 'ok' }, 'Norman, OK', { street: '', city: 'Norman', state: 'OK', zip: '' }],
      ['TEST Addr Zip', { '#qiZip': '73069' }, '73069', { street: '', city: '', state: '', zip: '73069' }],
      ['TEST Addr StreetZip', { '#qiStreet': '5 Birch Ln', '#qiZip': '73069' }, '5 Birch Ln, 73069', { street: '5 Birch Ln', city: '', state: '', zip: '73069' }],
      ['TEST Addr None', {}, '', { street: '', city: '', state: '', zip: '' }]];
    for (const [nm, vals, want, wantAddr] of subsets) {
      await open('?quote=1');
      await setVal('#qiName', nm);
      for (const k of Object.keys(vals)) await type(k, vals[k]);
      await line(); await save();
      const d = await rec(nm);
      check('saves with only some boxes filled — ' + nm.replace('TEST Addr ', ''), !!d && d.address === want && JSON.stringify(d.addr) === JSON.stringify(wantAddr), d);
    }

    // ---- old records with only the string ----
    const editOld = async (id) => { await open('?quote=1'); await pg.evaluate((id) => { const d = TKS.list('receipts').find(x => x.id === id); editReceipt(d); }, id); await pg.waitForSelector('#qiTitle', { timeout: 5000 }); await sleep(700); };
    const olds = [
      ['o1', '123 Main St, Apt 4, Tulsa, OK 74101', { street: '123 Main St, Apt 4', city: 'Tulsa', state: 'OK', zip: '74101' }],
      ['o2', '12 Elm St Apt 4B', { street: '12 Elm St Apt 4B', city: '', state: '', zip: '' }],
      ['o3', 'Back lot behind the shop, gate 3', { street: 'Back lot behind the shop, gate 3', city: '', state: '', zip: '' }],
      ['o4', '9 Oak Ave, Tulsa, OK 74101', { street: '9 Oak Ave', city: 'Tulsa', state: 'OK', zip: '74101' }]];
    for (const [id, str, want] of olds) {
      await editOld(id);
      const bx = await boxes();
      check('old record ' + id + ' (“' + str + '”) opens with the parts split' + (id === 'o2' || id === 'o3' ? ' — cannot be split, so all of it is in Street' : ''), bx.street === want.street && bx.city === want.city && bx.state === want.state && bx.zip === want.zip && bx.hidden === str, bx);
      await save();
      const d = await pg.evaluate((id) => { const x = TKS.list('receipts').find(y => y.id === id); return { address: x.address, addr: x.addr }; }, id);
      check('…and saves back the same address text, plus addr (' + id + ')', d.address === str && JSON.stringify(d.addr) === JSON.stringify(want), d);
    }

    // ---- picking a customer ----
    await open('?quote=1');
    await setVal('#qiName', 'TEST Pickle Customer', 'change'); await sleep(400);
    r = await boxes();
    check('picking a saved customer fills the four boxes (and the hidden string)', r.street === '55 Pine Rd' && r.city === 'Norman' && r.state === 'OK' && r.zip === '73069' && r.hidden === '55 Pine Rd, Norman, OK 73069', r);
    // the typed address is kept when a customer is picked by name
    await open('?quote=1'); await type('#qiStreet', '1 Typed St');
    await setVal('#qiName', 'TEST Pickle Customer', 'change'); await sleep(400);
    r = await boxes();
    check('a customer picked by name does not overwrite an address already typed', r.street === '1 Typed St' && r.hidden === '1 Typed St', r);

    // ---- NASTF job location ----
    await open('?quote=1');
    await type('#qiStreet', '77 Fleet Way'); await type('#qiCity', 'Tulsa'); await type('#qiState', 'OK');
    await pg.evaluate(() => document.querySelector('.qiNB[data-n="Auction/Fleet D1"]').click()); await sleep(500);
    r = await pg.evaluate(() => { const j = document.querySelector('.qiNF[data-key="jobLocation"]'); return j ? j.value : null; });
    check('NASTF Auction/Fleet: "Service location" still auto-fills from the address', r === '77 Fleet Way, Tulsa, OK', r);

    // ================= 2. push-to-start / turn key =================
    const setVeh = async (y, mk, md) => { await setSel('#qiVYear', y); await setSel('#qiVMake', mk); await setSel('#qiVModel', md); await sleep(300); };
    const keyRows = (sc) => pg.evaluate((sc) => Array.from(document.querySelectorAll((sc || '#qiKeys') + ' .qk-row .qk-n')).map(x => x.innerText.replace(/\s+/g, ' ').replace(/ ?(AM|OEM)$/, '')), sc);
    await open('?quote=1');
    await setVeh('2015', 'Ford', 'F-150');
    r = await pg.evaluate(() => { const box = document.getElementById('qiKeys'); box.querySelectorAll('.qk-grp').forEach(x => { x.hidden = false; });   /* 8z147: the kinds of key are collapsing bars now — open them all to read the list */ const bs = Array.from(document.querySelectorAll('#qiKeys .qkIgn')); return { t: bs.map(x => x.innerText), on: bs.filter(x => x.classList.contains('on')).map(x => x.innerText), h: bs.map(x => Math.round(x.getBoundingClientRect().height)), note: !!document.querySelector('#qiKeys .qk-hid'),
      top: bs.length ? bs[0].getBoundingClientRect().top < document.querySelector('#qiKeys .qk-row').getBoundingClientRect().top : false, over: document.documentElement.scrollWidth - window.innerWidth }; });
    check('above the key list: "Push to start" / "Turn key" / "Not sure / show all", the last one chosen by default, all 44px+', r.t.join('|') === 'Push to start|Turn key|Not sure / show all' && r.on.join() === 'Not sure / show all' && r.h.every(x => x >= 44) && r.top && !r.note && r.over <= 0, r);
    let rows = await keyRows();
    check('"Not sure" shows every key that fits (smart, flip, transponder)', rows.length === 3, rows);
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="push"]').click()); await sleep(300);
    rows = await keyRows(); r = await pg.evaluate(() => ({ note: (document.querySelector('#qiKeys .qk-hid') || {}).innerText, on: (document.querySelector('#qiKeys .qkIgn.on') || {}).innerText }));
    check('Push to start hides the flip key and the transponder and says so in plain words', rows.length === 1 && /5-Button PEPS/.test(rows[0]) && /flip & transponder keys hidden/i.test(r.note || '') && r.on === 'Push to start', { rows, r });
    await pg.evaluate(() => document.querySelector('#qiKeys').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'quote-ignition-phone.png') });
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="keyed"]').click()); await sleep(300);
    rows = await keyRows(); r = await pg.evaluate(() => (document.querySelector('#qiKeys .qk-hid') || {}).innerText);
    check('Turn key hides the smart key and says so', rows.length === 2 && rows.every(x => !/PEPS/.test(x)) && /smart keys hidden/i.test(r || ''), { rows, r });
    // second vehicle has its own choice
    await pg.evaluate(() => document.querySelector('#qiAddVeh').click()); await sleep(500);
    await pg.evaluate(() => { const set = (s, v) => { const e = document.querySelector('.qi-mveh ' + s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; set('.mvY', '2015'); });
    await sleep(300);
    await pg.evaluate(() => { const set = (s, v) => { const e = document.querySelector('.qi-mveh ' + s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; set('.mvMk', 'Ford'); }); await sleep(300);
    await pg.evaluate(() => { const set = (s, v) => { const e = document.querySelector('.qi-mveh ' + s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; set('.mvMd', 'F-150'); }); await sleep(500);
    let rows2 = await keyRows('.mvKeys');
    check('vehicle 2 starts on "Not sure" with its own full list, while vehicle 1 stays on Turn key', rows2.length === 3 && (await keyRows()).length === 2, { rows2 });
    await pg.evaluate(() => document.querySelector('.mvKeys .qkIgn[data-ign="push"]').click()); await sleep(300);
    rows2 = await keyRows('.mvKeys'); rows = await keyRows();
    check('choosing Push to start on vehicle 2 changes only vehicle 2\'s list', rows2.length === 1 && rows.length === 2, { rows, rows2 });
    await pg.evaluate(() => document.querySelector('.mvKeys').scrollIntoView({ block: 'start' })); await sleep(200);
    await setVal('#qiName', 'TEST Ign Two'); await setVal('#qiStreet', '3 Ign Rd'); await line(); await save();
    let d = await rec('TEST Ign Two');
    check('saved: ignition on the vehicle (vehIgnition) and on each extra vehicle (moreVehicles[].ignition)', d && d.ign === 'keyed' && d.more && d.more.length === 1 && d.more[0].ignition === 'push' && d.address === '3 Ign Rd', d);
    // restore on edit
    await open('?quote=1'); await pg.evaluate(() => { editReceipt(TKS.list('receipts').find(x => x.customer === 'TEST Ign Two')); }); await sleep(1200);
    r = await pg.evaluate(() => ({ main: (document.querySelector('#qiKeys .qkIgn.on') || {}).innerText, more: (document.querySelector('.mvKeys .qkIgn.on') || {}).innerText }));
    check('editing the document brings both choices back', r.main === 'Turn key' && r.more === 'Push to start', r);
    // "Not sure" is stored as nothing
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign=""]').click()); await sleep(200); await save();
    d = await rec('TEST Ign Two');
    check('choosing "Not sure" again clears it on the record', d && !d.ign && d.more[0].ignition === 'push', d);
    // not printed
    r = await pg.evaluate(() => { const rcp = TKS.list('receipts').find(x => x.customer === 'TEST Ign Two'); return { veh: vehicleString(rcp), more: moreVehList(rcp) }; });
    check('the vehicle lines printed on the document do not mention the ignition choice', !/push|turn key|keyed|ignition/i.test(JSON.stringify(r)), r);

    // ---- hand-offs ----
    await open('?quote=1'); await setVeh('2015', 'Ford', 'F-150');
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="push"]').click()); await sleep(200);
    await setVal('#qiName', 'TEST Hand Off'); await type('#qiStreet', '8 Hand St'); await type('#qiCity', 'Tulsa'); await type('#qiState', 'OK'); await type('#qiZip', '74101');
    await pg.evaluate(() => document.querySelector('#qiAddVeh').click()); await sleep(400);
    await pg.evaluate(() => { const set = (s, v) => { const e = document.querySelector('.qi-mveh ' + s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }; set('.mvY', '2015'); set('.mvMk', 'Ford'); }); await sleep(300);
    await pg.evaluate(() => { const e = document.querySelector('.qi-mveh .mvMd'); e.value = 'F-150'; e.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(500);
    await pg.evaluate(() => document.querySelector('.mvKeys .qkIgn[data-ign="keyed"]').click()); await sleep(200);
    await line(); await save();
    d = await rec('TEST Hand Off');
    check('estimate saved with address, addr, push-to-start and the second vehicle\'s turn-key', d && d.ign === 'push' && d.more[0].ignition === 'keyed' && d.addr && d.addr.zip === '74101', d);
    const draftKeys = await pg.evaluate(() => { const est = TKS.list('receipts').find(x => x.customer === 'TEST Hand Off'); let got = null; const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === 'tks_quote_job') got = JSON.parse(v); return orig.apply(this, arguments); };
      try { estimateToJob(est); } catch (e) {} Storage.prototype.setItem = orig; return got; });
    check('estimate → schedule: the hand-off carries addr and the ignition (vehicle and extra vehicle)', draftKeys && draftKeys.addr && draftKeys.addr.street === '8 Hand St' && draftKeys.address === '8 Hand St, Tulsa, OK 74101' && draftKeys.vehicle.ignition === 'push' && draftKeys.moreVehicles[0].ignition === 'keyed', draftKeys);
    await pg.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate(() => { let dr = null; try { dr = JSON.parse(localStorage.getItem('tks_sj_draft')).b; } catch (e) {} return { dr: dr && { addr: dr.addr, address: dr.address, ign: dr.vehicle && dr.vehicle.ignition, more: (dr.moreVehicles || []).map(v => v.ignition) },
      formIgn: (document.getElementById('sjIgn') || {}).value, street: (document.getElementById('sjStreet') || {}).value, zip: (document.getElementById('sjZip') || {}).value }; });
    check('…and the Scheduler\'s new-job form opens with the street / ZIP and Push-to-start already chosen', r.formIgn === 'push' && r.street === '8 Hand St' && r.zip === '74101' && r.dr && r.dr.ign === 'push' && r.dr.more.join() === 'keyed', r);
    // Scheduler job -> builder
    const dr = await pg.evaluate(async () => { const job = { id: 'bkT1', jobType: 'auto', subType: 'TEST lost key', customer: { name: 'TEST From Job', phone: '4055550199' }, address: '4 Job Ct, Edmond, OK 73003', addr: { street: '4 Job Ct', city: 'Edmond', state: 'OK', zip: '73003' }, vehicle: { year: '2015', make: 'Ford', model: 'F-150', vin: '', ignition: 'keyed' }, items: [{ desc: 'TEST Service call', amount: 50, qty: 1 }] };
      const d = await jobToInvoiceDraft(job); return { addr: d.addr, ign: d.vehIgnition }; });
    check('Scheduler job → builder: the draft carries addr and the ignition', dr.addr && dr.addr.city === 'Edmond' && dr.ign === 'keyed', dr);
    await pg.goto(BASE + 'bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate(() => ({ street: qiv('#qiStreet'), city: qiv('#qiCity'), state: qiv('#qiState'), zip: qiv('#qiZip'), ign: (document.querySelector('#qiKeys .qkIgn.on') || {}).innerText, rows: document.querySelectorAll('#qiKeys .qk-row').length }));
    check('…and the builder opens with the four boxes filled and "Turn key" chosen (smart key hidden)', r.street === '4 Job Ct' && r.city === 'Edmond' && r.state === 'OK' && r.zip === '73003' && r.ign === 'Turn key' && r.rows === 2, r);

    // ---- PC ----
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await open('?quote=1'); await setVeh('2015', 'Ford', 'F-150');
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="push"]').click()); await sleep(300);
    await pg.evaluate(() => document.querySelector('#qiKeys').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'quote-ignition-pc.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.stack || e)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
