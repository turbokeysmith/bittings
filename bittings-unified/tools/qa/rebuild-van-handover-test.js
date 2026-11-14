// Browser test of 8z148 (owner, 2026-11-14: "I tapped Move to van and it didn't ask me to scan … I need to make sure the technician
// received the key before they leave and what key it was"). The job card's van button now asks for the key to be SCANNED OUT:
// the exact key is sent to the van and waits for the van's technician to scan it in; the card says who it is waiting for.
// Real page, signed-in path, stand-in cloud, made-up TEST people, keys and jobs. Nothing leaves this PC.   node tools/qa/rebuild-van-handover-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8109, BASE = 'http://127.0.0.1:' + PORT;
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
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', serialized: true, deleted_at: null, updated_at: iso }, o);
      const inventory = [K('key1', { name: 'TEST Smart Key 5-Button', sku: 'T-KEY1', category: 'Keys/Smart Key', qty: 3 }), K('key2', { name: 'TEST Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', qty: 1 }),
        K('part1', { name: 'TEST Battery CR2032', sku: 'T-BAT', category: 'Parts', qty: 9, serialized: false })];
      const U = (id, item, serial) => ({ id, shop_id: 's', item_id: item, serial, location: 'shop', status: 'in_stock', bin: '', acquired_at: iso, updated_at: iso });
      const inventory_units = [U('u_' + 'a'.repeat(32), 'key1', 'AAA2222'), U('u_' + 'b'.repeat(32), 'key1', 'BBB3333'), U('u_' + 'c'.repeat(32), 'key1', 'CCC4444'), U('u_' + 'd'.repeat(32), 'key2', 'DDD5555')];
      const inventory_locations = [{ id: 'l1', item_id: 'key1', location: 'shop', qty: 3 }, { id: 'l2', item_id: 'key2', location: 'shop', qty: 1 }, { id: 'l3', item_id: 'part1', location: 'shop', qty: 9 }];
      const vans = [{ id: 'van1', shop_id: 's', nickname: 'TEST Van One', fleet_no: '1', status: 'active' }, { id: 'van2', shop_id: 's', nickname: 'TEST Van Two', fleet_no: '2', status: 'active' }];
      const J = (id, name, tech, techId, time) => ({ id, shop_id: 's', date: today, time, customer_name: name, deleted_at: null, updated_at: iso, data: { id, date: today, time, status: 'Scheduled', jobType: 'auto', subType: 'TEST key job', customer: { name, phone: '4055550100' }, technician: tech, technicianId: techId, vehicle: { year: '2018', make: 'Jaguar', model: 'F-Pace' } } });
      const bookings = [J('jA', 'TEST Customer A', 'TEST Jay', 'u-jay', '09:00'), J('jB', 'TEST Customer B', 'TEST Owner', UID, '11:00'), J('jC', 'TEST Customer C', 'TEST Jay', 'u-jay', '13:00')];
      const job_parts = [{ id: 'jp1', job_id: 'jA', item_id: 'key1', description: 'TEST Smart Key 5-Button', qty: 1, created_at: iso }, { id: 'jp2', job_id: 'jB', item_id: 'key1', description: 'TEST Smart Key 5-Button', qty: 1, created_at: iso },
        { id: 'jp3', job_id: 'jC', item_id: 'part1', description: 'TEST Battery CR2032', qty: 1, created_at: iso }];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, inventory_units, inventory_locations, vans, customers: [], bookings, job_parts, shop_config, web_leads: [], payment_transactions: [], audit_log: [], unit_transfers: [] }));
      localStorage.setItem('__staff', JSON.stringify([{ user_id: UID, name: 'TEST Owner', role: 'owner', active: true, home_van_id: 'van1' }, { user_id: 'u-jay', name: 'TEST Jay', role: 'technician', active: true, home_van_id: 'van2' }]));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);
    await pg.goto(BASE + '/index.html?go=schedule', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(4500);

    const flags = () => pg.evaluate(() => { const o = {}; document.querySelectorAll('#view-schedule [data-vanflag]').forEach(el => { const btn = el.querySelector('.vanMove'), sw = el.querySelector('.vanSwap'); const c = el.cloneNode(true); c.querySelectorAll('button').forEach(x => x.remove());   // the words, the move button and the swap button are read separately
      o[el.dataset.vanflag] = { text: c.textContent.replace(/\s+/g, ' ').trim(), btn: btn ? btn.textContent : '', h: btn ? Math.round(btn.getBoundingClientRect().height) : 0, swap: !!sw }; }); return o; });
    const box = () => pg.evaluate(() => { const m = document.getElementById('jhMsg'); let ov = m; while (ov && ov.parentElement !== document.body) ov = ov.parentElement; return { open: !!m, title: ov ? (ov.querySelector('b') || {}).textContent : '', text: ov ? ov.innerText.replace(/\s+/g, ' ') : '', msg: m ? m.textContent : '', inputOff: m ? document.getElementById('jhIn').disabled : null, overflow: ov ? ov.firstElementChild.scrollWidth - ov.firstElementChild.clientWidth : 0 }; });
    const dbs = () => pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('__db')); return { units: d.inventory_units.map(u => u.serial + '@' + u.location + (u.status === 'in_stock' ? '' : '!' + u.status)).join(' '), waiting: (d.unit_transfers || []).map(t => t.unit_id.slice(2, 3) + '→' + t.to).join(' '), log: (d.audit_log || []).filter(a => /unit_handover/.test(a.action)).map(a => a.action + ' ' + a.entity_type + ':' + a.entity_id + ' ' + ((a.detail || {}).desc || '') + ' ' + ((a.detail || {}).reason || '')), calls: (window.__calls || []).filter(c => /inv_move|unit_send|unit_accept/.test(c)).join(' ') }; });
    const type = async (v) => { await pg.evaluate((v) => { const i = document.getElementById('jhIn'); i.value = v; document.getElementById('jhGo').click(); }, v); await sleep(900); };

    let f = await flags();
    check('a job whose key is still in the shop: the card says so and offers "📷 Scan out to van" (a finger-sized button), for the technician\'s job and for the owner\'s own', /1 not on TEST Jay’s van/.test(f.jA.text) && f.jA.btn === '📷 Scan out to van' && f.jA.h >= 32 && /1 not on TEST Owner’s van/.test(f.jB.text) && f.jB.btn === '📷 Scan out to van', f);
    check('a part without serial numbers keeps the plain "Move to van" button', f.jC.btn === 'Move to van', f.jC);
    await pg.evaluate(() => document.querySelector('[data-vanflag="jA"]').scrollIntoView({ block: 'center' })); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'handover-card.png') });

    // ---- hand a key to ANOTHER technician's van ----
    await pg.evaluate(() => document.querySelector('[data-vanflag="jA"] button').click()); await sleep(700);
    let r = await box();
    check('tapping it opens "Scan the key out" straight away — nothing is moved yet; it names the key, the technician and the job', r.open && /Scan the key out/.test(r.title) && /TEST Smart Key 5-Button/.test(r.text) && /handing to TEST Jay for TEST Customer A’s job/.test(r.text) && /only when TEST Jay scans it in/.test(r.text) && r.overflow <= 0 && (await dbs()).calls === '', { box: r, calls: (await dbs()).calls });
    await pg.screenshot({ path: path.join(OUT, 'handover-scan-box.png') });
    await type('HELLO'); r = await box();
    check('something that is not a key label is refused', /isn’t a key label/.test(r.msg), r.msg);
    await type('DDD5555'); r = await box();
    check('the WRONG kind of key is refused, by name — it cannot leave by mistake', /SN DDD5555 is “TEST Flip Key”\. This job needs “TEST Smart Key 5-Button”/.test(r.msg) && (await dbs()).waiting === '', r.msg);
    await type('bbb3333'); r = await box(); let d = await dbs();
    check('the right key (serial typed in lower case): scanned out — "waiting for TEST Jay to scan it in", and it still counts as in the shop', /✓ SN BBB3333 scanned out\. Waiting for TEST Jay to scan it in/.test(r.msg) && r.inputOff === true && /BBB3333@shop/.test(d.units) && d.waiting === 'b→van:van2', { msg: r.msg, d });
    check('the job\'s log records WHICH key went out, and where to', d.log.length === 1 && d.log[0] === 'unit_handover_sent job:jA TEST Smart Key 5-Button · SN BBB3333 to TEST Jay’s van', d.log);
    await pg.screenshot({ path: path.join(OUT, 'handover-sent.png') });
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(2500);
    f = await flags();
    check('the card now reads "SN BBB3333 sent — waiting for TEST Jay to scan it in", with no button to send a second key', /📤 SN BBB3333 sent — waiting for TEST Jay to scan it in/.test(f.jA.text) && !/not on/.test(f.jA.text) && f.jA.btn === '', f.jA);
    await pg.evaluate(() => document.querySelector('[data-vanflag="jA"]').scrollIntoView({ block: 'center' })); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'handover-waiting.png') });

    // ---- 8z150: one key per job — a second one cannot be scanned out ----
    r = await pg.evaluate(() => (TKS.Bookings.get('jA').keyUnits || []).map(k => k.item + ' ' + k.serial + ' ' + k.to));
    check('the job itself remembers which key it was given', r.join('|') === 'key1 BBB3333 van:van2', r);
    await pg.evaluate(() => { window.openJobKeyHandover({ jobId: 'jA', itemId: 'key1', itemName: 'TEST Smart Key 5-Button', vanLoc: 'van:van2', techName: 'TEST Jay', needed: 1, handed: TKS.Bookings.get('jA').keyUnits }); }); await sleep(1200);
    r = await box();
    check('someone else goes to scan a key for that job: it says the job already has its key — the serial, who scanned it out and when — and takes no more', /This job already has its key: SN BBB3333 \(scanned out by TEST Owner, [^)]*— waiting for TEST Jay to scan it in\)\. It only needs 1 — a second one can’t be scanned out/.test(r.msg) && r.inputOff === true, { msg: r.msg, off: r.inputOff });
    await pg.screenshot({ path: path.join(OUT, 'handover-already.png') });
    await pg.evaluate(() => window.dispatchEvent(new CustomEvent('tks-scan', { detail: { code: 'CCC4444' } }))); await sleep(900); d = await dbs();
    check('a scanner read of a second key while that box is open changes nothing', d.waiting === 'b→van:van2' && /CCC4444@shop/.test(d.units) && d.log.length === 1, d);
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(300);
    // the same on a device that does not have the job's note yet (the job's log is the back-up record)
    await pg.evaluate(() => { window.openJobKeyHandover({ jobId: 'jA', itemId: 'key1', itemName: 'TEST Smart Key 5-Button', vanLoc: 'van:van2', techName: 'TEST Jay', needed: 1, handed: [] }); }); await sleep(1200);
    r = await box();
    check('…also when only the job\'s log knows about the first key (a scan made on another phone)', /This job already has its key: SN BBB3333/.test(r.msg) && r.inputOff === true, r.msg);
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(300);
    // a job that lists the key TWICE takes two
    await pg.evaluate(() => { window.openJobKeyHandover({ jobId: 'jA', itemId: 'key1', itemName: 'TEST Smart Key 5-Button', vanLoc: 'van:van2', techName: 'TEST Jay', needed: 2, handed: TKS.Bookings.get('jA').keyUnits }); }); await sleep(1200);
    r = await box();
    check('a job that lists the key twice still accepts its second one', !/already has/.test(r.msg) && r.inputOff === false, { msg: r.msg, off: r.inputOff });
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(300);

    // the technician scans it in (played here by the cloud call their phone makes)
    await pg.evaluate(() => TKS._sb().rpc('unit_accept', { p_unit: 'u_' + 'b'.repeat(32), p_bin: null })); await sleep(300);
    await pg.evaluate(() => { document.querySelector('.bt-nav__item[data-go="schedule"]').click(); }); await sleep(600); await pg.evaluate(() => window.renderSchedule()); await sleep(2500);
    f = await flags(); d = await dbs();
    check('once the technician has scanned it in, the key is on their van; the warning is gone and the card says WHICH key the job has', f.jA.text === '🔑 SN BBB3333 on TEST Jay’s van for this job' && f.jA.btn === '' && /BBB3333@van:van2/.test(d.units) && d.waiting === '', { card: f.jA, d });
    // 8z150: and now that it is on the van, a second key still cannot be scanned out for this job
    await pg.evaluate(() => { window.openJobKeyHandover({ jobId: 'jA', itemId: 'key1', itemName: 'TEST Smart Key 5-Button', vanLoc: 'van:van2', techName: 'TEST Jay', needed: 1, handed: TKS.Bookings.get('jA').keyUnits }); }); await sleep(1200);
    r = await box();
    check('one key per job, also after it is on the van — it says who scanned it out, when, and that it is now on the van', /This job already has its key: SN BBB3333 \(scanned out by TEST Owner, [^)]*— now on TEST Jay’s van\)/.test(r.msg) && r.inputOff === true, r.msg);
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(300);

    // ---- the owner's OWN van: the one scan is both the scan-out and the scan-in ----
    await pg.evaluate(() => document.querySelector('[data-vanflag="jB"] button').click()); await sleep(700);
    await type('AAA2222'); await sleep(900);
    r = await pg.evaluate(() => { const ovs = Array.from(document.body.children).map(x => (x.innerText || '').replace(/\s+/g, ' ')); return { scanBox: !!document.getElementById('jhMsg'), bin: ovs.find(x => /Where on the van did you put it/.test(x)) || '' }; }); d = await dbs();
    check('my own van: the scan puts the key on it at once (no second scan) and asks where on the van it was put', !r.scanBox && /✓ TEST Smart Key 5-Button · SN AAA2222 is now on TEST Van One/.test(r.bin) && /AAA2222@van:van1/.test(d.units) && d.waiting === '', { r, units: d.units });
    check('the job\'s log has both lines for it: scanned out, and scanned in on the van', d.log.filter(x => /job:jB/.test(x)).join(' | ') === 'unit_handover_sent job:jB TEST Smart Key 5-Button · SN AAA2222 to TEST Owner’s van | unit_handover_accepted job:jB TEST Smart Key 5-Button · SN AAA2222 on TEST Owner’s van', d.log);
    check('the old "move one of them on paper" call was never used for a serial-numbered key', !/inv_move/.test(d.calls), d.calls);
    await pg.evaluate(() => { const s = document.getElementById('bbSkip'); if (s) s.click(); }); await sleep(2500);
    f = await flags();
    check('and the owner\'s job card shows its key instead of a warning', f.jB.text === '🔑 SN AAA2222 on TEST Owner’s van for this job' && f.jB.btn === '', f.jB);
    await pg.evaluate(() => document.querySelector('[data-vanflag="jB"]').scrollIntoView({ block: 'center' })); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'handover-on-van.png') });

    // ================= 8z151: swap the key =================
    await pg.evaluate(() => { document.querySelectorAll('.sch-modal').forEach(x => x.remove()); }); await sleep(300);
    const swapState = () => pg.evaluate(() => { const sw = document.getElementById('jhSwap'), m = document.getElementById('jhMsg'); return { strip: sw && sw.style.display !== 'none' ? sw.innerText.replace(/\s+/g, ' ').trim() : '', msg: m ? m.textContent : '', inputOff: m ? document.getElementById('jhIn').disabled : null, ph: m ? document.getElementById('jhIn').placeholder : '' }; });
    f = await flags();
    check('a job that has its key shows "🔁 Swap key" on its card', f.jA.swap && f.jB.swap && f.jA.btn === '', { jA: f.jA, jB: f.jB });
    // --- the wrong key was grabbed (another technician's job) ---
    await pg.evaluate(() => document.querySelector('[data-vanflag="jA"] .vanSwap').click()); await sleep(1300);
    let sw = await swapState();
    check('tapping it: the box says which key the job has and asks why it is coming back — wrong key, or defective', /already has its key: SN BBB3333/.test(sw.msg) && /Swap the key/.test(sw.strip) && /Wrong key — back on the shelf/.test(sw.strip) && /Defective — set it aside/.test(sw.strip) && sw.inputOff === true, sw);
    await pg.screenshot({ path: path.join(OUT, 'swap-why.png') });
    await pg.evaluate(() => document.querySelector('.jhWhy[data-why="wrong"]').click()); await sleep(400); sw = await swapState();
    check('step 1 of 2: scan the OLD key back in (it names the serial)', /Step 1 of 2 — scan the OLD key back in/.test(sw.strip) && /Scan SN BBB3333\. It goes back into shop stock/.test(sw.strip) && sw.inputOff === false && /OLD/.test(sw.ph), sw);
    await type('CCC4444'); sw = await swapState();
    check('a key that is not this job\'s key is refused in step 1', /SN CCC4444 isn’t this job’s key\. The job has SN BBB3333/.test(sw.msg) && /BBB3333@van:van2/.test((await dbs()).units), sw.msg);
    await type('BBB3333'); sw = await swapState(); d = await dbs();
    r = await pg.evaluate(() => (TKS.Bookings.get('jA').keyUnits || []).map(k => k.serial).join(','));
    check('the old key scanned: it is back in the shop at once, the job no longer holds it, and the box moves to step 2 — scan the NEW key out', /✓ SN BBB3333 is back in the shop\. Now scan the new key/.test(sw.msg) && /Step 2 of 2 — scan the NEW key out/.test(sw.strip) && /BBB3333@shop/.test(d.units) && r === '' && /NEW/.test(sw.ph), { sw, units: d.units, jobKeys: r });
    await pg.screenshot({ path: path.join(OUT, 'swap-step2.png') });
    await type('CCC4444'); sw = await swapState(); d = await dbs();
    r = await pg.evaluate(() => (TKS.Bookings.get('jA').keyUnits || []).map(k => k.serial).join(','));
    check('the new key scanned out: waiting for the technician, and it is now the job\'s key', /✓ SN CCC4444 scanned out\. Waiting for TEST Jay to scan it in/.test(sw.msg) && d.waiting === 'c→van:van2' && r === 'CCC4444' && sw.strip === '', { msg: sw.msg, waiting: d.waiting, jobKeys: r });
    check('the job\'s log has both halves of the swap, with the serials and the reason', d.log.filter(x => /job:jA/.test(x)).slice(-2).join(' | ') === 'unit_handover_returned job:jA TEST Smart Key 5-Button · SN BBB3333 wrong key — back in the shop | unit_handover_sent job:jA TEST Smart Key 5-Button · SN CCC4444 to TEST Jay’s van', d.log.filter(x => /job:jA/.test(x)));
    await pg.evaluate(() => document.getElementById('jhDone').click()); await sleep(2500);
    f = await flags();
    check('the card follows: "SN CCC4444 sent — waiting for TEST Jay to scan it in", still with Swap key', /📤 SN CCC4444 sent — waiting for TEST Jay to scan it in/.test(f.jA.text) && f.jA.swap, f.jA);
    // --- a defective key (my own van) ---
    await pg.evaluate(() => document.querySelector('[data-vanflag="jB"] .vanSwap').click()); await sleep(1300);
    await pg.evaluate(() => document.querySelector('.jhWhy[data-why="defective"]').click()); await sleep(400); sw = await swapState();
    check('defective: step 1 says the key will be marked defective and put on the supplier-return list', /Scan SN AAA2222\. It will be marked defective and put on the supplier-return list/.test(sw.strip), sw.strip);
    await type('AAA2222'); sw = await swapState(); d = await dbs();
    check('the defective key is off the van, marked failed (it cannot be handed out again), and the box asks for the new key', /✓ SN AAA2222 is back in the shop and marked defective \(it is on the supplier-return list\)\. Now scan the new key/.test(sw.msg) && /AAA2222@shop!failed/.test(d.units), { msg: sw.msg, units: d.units });
    await type('AAA2222'); sw = await swapState();
    check('the defective key cannot be scanned out again', /SN AAA2222 is failed, so it can’t be handed over/.test(sw.msg), sw.msg);
    await type('BBB3333'); await sleep(900); d = await dbs();
    r = await pg.evaluate(() => ({ bin: Array.from(document.body.children).map(x => (x.innerText || '').replace(/\s+/g, ' ')).find(x => /Where on the van did you put it/.test(x)) || '', keys: (TKS.Bookings.get('jB').keyUnits || []).map(k => k.serial).join(',') }));
    check('the replacement goes straight onto my own van and is the job\'s key', /SN BBB3333 is now on TEST Van One/.test(r.bin) && /BBB3333@van:van1/.test(d.units) && r.keys === 'BBB3333', { r, units: d.units });
    await pg.evaluate(() => { const s = document.getElementById('bbSkip'); if (s) s.click(); }); await sleep(2500);
    f = await flags();
    check('and the card names the new key', f.jB.text === '🔑 SN BBB3333 on TEST Owner’s van for this job', f.jB);
    await pg.evaluate(() => document.querySelector('[data-vanflag="jB"]').scrollIntoView({ block: 'center' })); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'swap-done-card.png') });

    // the job log in the job form names the key
    await pg.evaluate(() => { const el = document.querySelector('[data-open="jA"]'); el.click(); }); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1800);
    r = await pg.evaluate(() => (document.getElementById('sjJobLog') || {}).innerText || '');
    r = r.replace(/\s+/g, ' ');
    check('opening the job shows it all in the job log: scanned out, swapped back in (with the reason), the new key scanned out', /Key scanned out to the van: TEST Smart Key 5-Button · SN BBB3333 — to TEST Jay’s van/.test(r) && /Key swapped — scanned back in: TEST Smart Key 5-Button · SN BBB3333 — wrong key — back in the shop/.test(r) && /Key scanned out to the van: TEST Smart Key 5-Button · SN CCC4444/.test(r), r.slice(0, 600));
    check('no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
