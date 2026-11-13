// Browser test: the Register sells the exact key that was scanned, and scanning moves keys (shop <-> vans).
// A key sent to a van stays put until that van's technician scans it in (unit_accept), then a box asks which bin.
// Real page, signed-in path, stand-in cloud, made-up TEST data; the unit RPCs are stubbed inside the page. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
const PORT = 8100, BASE = 'http://127.0.0.1:' + PORT + '/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  -> ' + JSON.stringify(detail).slice(0, 900))); if (!ok) failed++; }

const iso = new Date(Date.now() - 20 * 60000).toISOString();
const part = (id, name, sku) => ({ id, name, sku, category: 'Keys/Smart Key', qty: 9, low_at: 0, unit: '', cost: 20, location: 'TEST bin A1', notes: '', supplier: '', reorder_qty: 0, fitment: '', fcc_id: '', chip: '', grade: 'Aftermarket', brand: '', vendor_sku: '', sell_price_cents: 4500, serialized: true, deleted_at: null, updated_at: iso, created_at: iso });
const U = (id, serial, over) => Object.assign({ id, serial, item_id: 'p1', location: 'shop', status: 'in_stock', bin: '', created_at: iso, acquired_at: iso }, over || {});
const UNITS = [
  U('u_a1', 'K7Q2M9X'), U('u_a2', 'B4N8T3R'), U('u_a3', 'SHSMN7K', { status: 'sold', sold_at: iso }),
  U('u_m1', 'M3N4P5Q'), U('u_w1', 'G8H9J2K'), U('u_w2', 'R6S7T8U'), U('u_w3', 'DDD2234'), U('u_w4', 'EEE5678'), U('u_w5', 'FFF9HHH'),
  U('u_g1', 'VVV7777'), U('u_f1', 'N2N3N4N'),
  U('u_b1', 'PPP2222'), U('u_b2', 'QQQ3333'), U('u_b3', 'RRR4444'), U('u_b4', 'SSS5555', { location: 'van:v1' })
];
const VANS = [{ id: 'v1', nickname: 'TEST Transit', fleet_no: '1', status: 'active' }, { id: 'v2', nickname: 'TEST Ranger', fleet_no: '2', status: 'active' }, { id: 'v3', nickname: 'TEST Retired', fleet_no: '3', status: 'retired' }];

(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf('http://127.0.0.1:' + PORT + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PC = { width: 1280, height: 900, deviceScaleFactor: 1 }, PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    await pg.setViewport(PC);
    await pg.goto(BASE + 'seed.html');
    await pg.evaluate((UID, UNITS, VANS, P) => {
      localStorage.clear();
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [P], inventory_units: UNITS, vans: VANS, customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], receipt_docs: [],
        shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: new Date().toISOString(), data: { taxRate: 8.625, identity: { name: 'TEST Shop' } } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, UNITS, VANS, part('p1', 'TEST Smart key blank', 'TEST-SK-1'));
    const ready = async () => { await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && typeof posAddLine === 'function', { timeout: 15000 }); await sleep(2500); };
    // stand-ins for the server functions (state lives in window.__st; unit rows live in the stand-in cloud's localStorage)
    const stub = () => pg.evaluate(() => {
      const sb = TKS._sb(), real = sb.rpc.bind(sb);
      window.__st = { role: 'owner', mine: [], sent: [], acceptAs: 'right', calls: [], checkout: null };
      const dbGet = () => JSON.parse(localStorage.getItem('__db')), dbSet = d => localStorage.setItem('__db', JSON.stringify(d));
      const unit = id => dbGet().inventory_units.find(u => u.id === id);
      const upd = (id, patch) => { const d = dbGet(); Object.assign(d.inventory_units.find(x => x.id === id), patch); dbSet(d); };
      const ok = d => Promise.resolve({ data: d, error: null }), bad = m => Promise.resolve({ data: null, error: { message: m } });
      const vname = v => v === 'van:v1' ? 'TEST Transit' : 'TEST Ranger';
      const row = (u, to) => ({ unit_id: u.id, serial: u.serial, item_id: u.item_id, item_name: 'TEST Smart key blank', sku: 'TEST-SK-1', from: u.location, to, van_name: vname(to), sent_by_name: 'TEST Owner', sent_at: new Date().toISOString(), for_names: ['TEST Jayden'] });
      window.__addMine = (id, to) => { window.__st.mine.push(row(unit(id), to)); };
      window.__addSent = (id, to) => { window.__st.sent.push(row(unit(id), to)); };
      sb.rpc = function (name, args) {
        const S = window.__st;
        if (name === 'current_staff_role') return ok(S.role);
        if (name === 'unit_transfers_pending') return ok({ mine: S.mine.slice(), sent: S.sent.slice() });
        if (name === 'unit_send') { S.calls.push('unit_send ' + args.p_unit + ' ' + args.p_to); const u = unit(args.p_unit);
          if (u.location === args.p_to) return ok({ ok: false, code: 'same_place', error: 'same' });
          if (/^van:/.test(args.p_to)) { S.sent.push(row(u, args.p_to)); return ok({ ok: true, pending: true, to: args.p_to, van_name: vname(args.p_to), for_names: ['TEST Jayden'] }); }
          upd(u.id, { location: args.p_to }); return ok({ ok: true, pending: false, to: args.p_to }); }
        if (name === 'unit_accept') { S.calls.push('unit_accept ' + args.p_unit);
          if (S.acceptAs !== 'right') return bad('Only TEST Jayden can scan this key in to TEST Transit. Ask them to scan it.');
          const r = S.mine.concat(S.sent).find(x => x.unit_id === args.p_unit); S.mine = S.mine.filter(x => x.unit_id !== args.p_unit); S.sent = S.sent.filter(x => x.unit_id !== args.p_unit);
          upd(args.p_unit, { location: r.to }); return ok({ ok: true, to: r.to, van_name: r.van_name, item_id: r.item_id, bin: null }); }
        if (name === 'unit_set_bin') { S.calls.push('unit_set_bin ' + args.p_unit + ' ' + args.p_bin); upd(args.p_unit, { bin: args.p_bin }); return ok({ ok: true, bin: args.p_bin }); }
        if (name === 'unit_transfer_cancel') { S.calls.push('unit_transfer_cancel ' + args.p_unit); S.sent = S.sent.filter(x => x.unit_id !== args.p_unit); return ok({ ok: true }); }
        if (name === 'unit_move') { S.calls.push('unit_move ' + args.p_unit + ' ' + args.p_to); return ok({}); }
        if (name === 'pos_checkout') { S.checkout = JSON.parse(JSON.stringify(args.p_payload)); return ok('TKS-TEST-1'); }
        return real(name, args); };
      TKS.POS.decrementStock = () => Promise.resolve({});
      TKPay.recordCashCheck = (stubR, method, o) => { o.onDone({ captured_cents: Math.round(stubR.totals.total * 100) }); return Promise.resolve(); };
      _chgUnlocked = true;
    });
    const scan = async (code, ms) => { await pg.evaluate(c => window.dispatchEvent(new CustomEvent('tks-scan', { detail: { code: c } })), code); await sleep(ms || 800); };
    const calls = () => pg.evaluate(() => window.__st.calls.filter(c => !/^unit_transfers_pending/.test(c)));
    const closeOverlays = () => pg.evaluate(() => document.querySelectorAll('div').forEach(d => { if (d.style.zIndex === '100000') d.remove(); }));
    const dbUnit = id => pg.evaluate(id => JSON.parse(localStorage.getItem('__db')).inventory_units.find(u => u.id === id), id);
    const goView = v => pg.evaluate(v => document.querySelector('.bt-sidebar .bt-nav__item[data-go="' + v + '"]').click(), v);
    const ticketText = () => pg.evaluate(() => document.getElementById('posTicket').innerText);
    const status = () => pg.evaluate(() => document.getElementById('chgStatus').innerText);
    let r;

    await pg.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' }); await ready(); await stub();
    await goView('payments'); await sleep(900);

    // ===== A. Register =====
    await scan('K7Q2M9X');
    r = await pg.evaluate(() => ({ n: posTicket.length, l: posTicket[0] && { q: posTicket[0].qty, ids: posTicket[0].unitIds, sn: posTicket[0].unitSerials, cents: posTicket[0].unitCents } }));
    check('Register: scanning a key adds a part line that remembers the key (id + serial)', r.n === 1 && r.l.q === 1 && r.l.ids.join() === 'u_a1' && r.l.sn.join() === 'K7Q2M9X' && r.l.cents === 4500, r);
    check('the ticket shows "SN K7Q2M9X" under the line, and no "scan the label" hint (the key is scanned)', /SN K7Q2M9X/.test(await ticketText()) && !/Scan the key/.test(await ticketText()), await ticketText());
    await scan('B4N8T3R');
    r = await pg.evaluate(() => ({ n: posTicket.length, q: posTicket[0].qty, ids: posTicket[0].unitIds, sn: posTicket[0].unitSerials }));
    check('a second key of the same part joins the same line: qty 2, two ids, two serials', r.n === 1 && r.q === 2 && r.ids.join() === 'u_a1,u_a2' && r.sn.join() === 'K7Q2M9X,B4N8T3R', r);
    check('the ticket lists both serials', /SN K7Q2M9X, B4N8T3R/.test(await ticketText()), await ticketText());
    await pg.screenshot({ path: path.join(OUT, 'scan-register-pc.png') });
    await scan('K7Q2M9X');
    r = await pg.evaluate(() => ({ q: posTicket[0].qty, ids: posTicket[0].unitIds.length, st: document.getElementById('chgStatus').innerText }));
    check('the same key twice says "already on this sale" and changes nothing', r.q === 2 && r.ids === 2 && /already on this sale/i.test(r.st), r);
    await scan('SHSMN7K');
    r = await pg.evaluate(() => ({ n: posTicket.length, q: posTicket[0].qty, st: document.getElementById('chgStatus').innerText }));
    check('a sold key is refused in plain words and not added', r.n === 1 && r.q === 2 && /already sold/i.test(r.st), r);

    // payload: same cart with and without scanning
    r = await pg.evaluate(() => {
      const pa = JSON.parse(JSON.stringify(posBuildPayload()));
      posClear(); posAddLine({ type: 'part', refId: 'p1', desc: 'TEST Smart key blank', unitCents: 4500, taxable: true, lineType: 'part', qty: 2 });
      const pb = JSON.parse(JSON.stringify(posBuildPayload()));
      const hint = document.getElementById('posTicket').innerText;
      const withUnits = pa.lines[0].unitIds; delete pa.lines[0].unitIds;
      return { same: JSON.stringify(pa) === JSON.stringify(pb), withUnits, pbHas: 'unitIds' in pb.lines[0], hint };
    });
    check('payload: the scanned cart equals the unscanned cart minus unitIds; the unscanned line has no unitIds key', r.same && r.withUnits.join() === 'u_a1,u_a2' && !r.pbHas, r);
    check('a serial-numbered part with no scanned keys shows the non-blocking hint', /Scan the key’s label so the exact key is recorded/.test(r.hint), r.hint);

    // qty down drops the last scanned key
    await pg.evaluate(() => posClear()); await scan('K7Q2M9X'); await scan('B4N8T3R');
    r = await pg.evaluate(() => { posSetQty(posTicket[0].key, -1); const l = posTicket[0]; return { q: l.qty, ids: l.unitIds, sn: l.unitSerials, txt: document.getElementById('posTicket').innerText }; });
    check('lowering the quantity drops the last scanned key (and its serial on the ticket)', r.q === 1 && r.ids.join() === 'u_a1' && r.sn.join() === 'K7Q2M9X' && /SN K7Q2M9X/.test(r.txt) && !/B4N8T3R/.test(r.txt), r);
    await scan('B4N8T3R');
    r = await pg.evaluate(() => ({ q: posTicket[0].qty, ids: posTicket[0].unitIds.join() }));
    check('scanning the dropped key again adds it back (qty 2)', r.q === 2 && r.ids === 'u_a1,u_a2', r);
    r = await pg.evaluate(() => { posRemove(posTicket[0].key); return posTicket.length; });
    check('removing the line clears everything', r === 0);

    // cash checkout completes with unitIds on the line
    await scan('K7Q2M9X'); await scan('B4N8T3R');
    await pg.evaluate(() => posCheckoutThen('cash', { tenderedCents: 20000, changeCents: 20000 - Math.round(posTotals().totalCents) })); await sleep(900);
    r = await pg.evaluate(() => ({ co: window.__st.checkout, n: posTicket.length, st: document.getElementById('chgStatus').innerText }));
    check('cash checkout completes: pos_checkout got unitIds on the line, the ticket cleared, "Cash recorded"', r.co && r.co.lines.length === 1 && r.co.lines[0].unitIds.join() === 'u_a1,u_a2' && r.co.lines[0].qty === 2 && r.co.lines[0].itemId === 'p1' && r.n === 0 && /Cash recorded/.test(r.st), r);

    // ===== B. story panel: send / take back =====
    await goView('inventory'); await sleep(800);
    await pg.evaluate(() => openUnitPanel('M3N4P5Q')); await sleep(1200);
    r = await pg.evaluate(() => ({ t: document.getElementById('upOut').innerText, btns: Array.from(document.querySelectorAll('.upDest')).map(x => x.innerText) }));
    check('story panel (owner): shows where the key is now, and "Send to" each active van (retired van and the current place left out)', /Now in the shop/.test(r.t) && r.btns.join('|') === 'Send to 🚐 TEST Transit|Send to 🚐 TEST Ranger' && /TEST bin A1/.test(r.t) && /Change/.test(r.t), r);
    await pg.evaluate(() => document.querySelector('.upDest').click()); await sleep(1500);
    r = await pg.evaluate(() => ({ t: document.getElementById('upOut').innerText, back: !!document.querySelector('.upBack'), dest: document.querySelectorAll('.upDest').length }));
    check('Send to a van: unit_send with the unit and van:v1, never unit_move; nothing moved yet', (await calls()).join() === 'unit_send u_m1 van:v1' && (await dbUnit('u_m1')).location === 'shop', await calls());
    check('the panel says "On its way to TEST Transit — waiting for TEST Jayden to scan it in" with a Take it back button', /On its way to TEST Transit — waiting for TEST Jayden to scan it in/.test(r.t) && r.back && r.dest === 0, r);
    await pg.evaluate(() => document.querySelector('.upBack').click()); await sleep(1500);
    r = await pg.evaluate(() => ({ dest: document.querySelectorAll('.upDest').length, t: document.getElementById('upOut').innerText }));
    check('Take it back: unit_transfer_cancel is called and the destinations come back', (await calls()).indexOf('unit_transfer_cancel u_m1') >= 0 && r.dest === 2 && /Taken back/.test(r.t), r);
    // Shop moves at once: move key to the van first via db, then to shop
    await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('__db')); d.inventory_units.find(u => u.id === 'u_m1').location = 'van:v2'; localStorage.setItem('__db', JSON.stringify(d)); });
    await closeOverlays(); await pg.evaluate(() => openUnitPanel('M3N4P5Q')); await sleep(1200);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.upDest')).map(x => x.innerText));
    check('a key in a van offers Shop and the other van', r.join('|') === '🏪 Shop|Send to 🚐 TEST Transit', r);
    await pg.evaluate(() => document.querySelector('.upDest').click()); await sleep(1500);
    r = await pg.evaluate(() => document.getElementById('upOut').innerText);
    check('Shop moves at once ("✓ Moved to 🏪 Shop", key is in the shop)', /Moved to 🏪 Shop/.test(r) && (await dbUnit('u_m1')).location === 'shop', r);
    await closeOverlays();

    // ===== accept: wrong technician, right technician, bin box =====
    await pg.evaluate(() => { window.__st.role = 'technician'; window.__st.acceptAs = 'wrong'; window.__addSent('u_w1', 'van:v1'); window.__st.mine.push(Object.assign({}, window.__st.sent[0])); window.__st.sent = []; window.__addSent('u_w2', 'van:v1'); window.__st.mine.push(window.__st.sent[0]); window.__st.sent = []; });
    await scan('G8H9J2K', 1200);
    r = await pg.evaluate(() => ({ dlg: Array.from(document.querySelectorAll('.chg-modal-ov')).map(x => x.innerText).join(' '), panel: !!document.getElementById('upOut'), bin: !!document.getElementById('bbIn') }));
    check('wrong technician scanning a waiting key: unit_accept raises, the plain message names who must scan it, no bin box, no story panel', /Only TEST Jayden/.test(r.dlg) && !r.bin && !r.panel && (await dbUnit('u_w1')).location === 'shop', r);
    await pg.evaluate(() => document.querySelectorAll('.chg-modal-ov').forEach(x => x.remove()));
    await pg.evaluate(() => { window.__st.acceptAs = 'right'; });
    await scan('G8H9J2K', 1200);
    r = await pg.evaluate(() => ({ head: (document.querySelector('#bbIn') || {}).parentNode ? document.querySelector('#bbIn').parentNode.innerText : '', panel: !!document.getElementById('upOut') }));
    check('right technician: the scan accepts it (key now on the van) and the bin box appears with "✓ … SN G8H9J2K is now on TEST Transit"', (await dbUnit('u_w1')).location === 'van:v1' && /✓ TEST Smart key blank · SN G8H9J2K is now on TEST Transit/.test(r.head) && !r.panel, r);
    await pg.screenshot({ path: path.join(OUT, 'scan-bin-pc.png') });
    await pg.evaluate(() => { const i = document.getElementById('bbIn'); i.value = 'wall 1 · row 4 · drawer 2 · section 3'; document.getElementById('bbSave').click(); }); await sleep(600);
    check('Save: unit_set_bin with the unit and the text; the key now has that bin', (await calls()).indexOf('unit_set_bin u_w1 wall 1 · row 4 · drawer 2 · section 3') >= 0 && (await dbUnit('u_w1')).bin === 'wall 1 · row 4 · drawer 2 · section 3' && !(await pg.evaluate(() => !!document.getElementById('bbIn'))), await calls());
    await scan('R6S7T8U', 1200);
    r = await pg.evaluate(() => ({ chips: Array.from(document.querySelectorAll('.bbR')).map(x => x.innerText), has: !!document.getElementById('bbIn') }));
    check('the next box offers the last answer as a tap-to-fill suggestion', r.has && r.chips.join() === 'wall 1 · row 4 · drawer 2 · section 3', r);
    await pg.evaluate(() => document.getElementById('bbSkip').click()); await sleep(500);
    check('Skip leaves the bin empty (no unit_set_bin for it) and the key is on the van', (await calls()).filter(c => /unit_set_bin u_w2/.test(c)).length === 0 && (await dbUnit('u_w2')).bin === '' && (await dbUnit('u_w2')).location === 'van:v1');

    // ===== banner + list =====
    await pg.evaluate(() => { window.__addMine('u_w3', 'van:v1'); window.__addMine('u_w4', 'van:v1'); window.__addMine('u_w5', 'van:v2'); }); await pg.evaluate(() => refreshKeyWaiting()); await sleep(500);
    r = await pg.evaluate(() => { const e = document.getElementById('keyWaitBanner'); return { shown: e && e.offsetParent !== null, t: e ? e.innerText : '' }; });
    check('banner for the technician: "🔑 3 keys waiting — scan them in to your van"', r.shown && /🔑 3 keys waiting — scan them in to your van/.test(r.t), r);
    await pg.evaluate(() => document.getElementById('kwOpen').click()); await sleep(700);
    r = await pg.evaluate(() => ({ t: document.getElementById('kwList').innerText, rows: document.querySelectorAll('.kwAcc').length }));
    check('the list shows each waiting key: serial, key name, who sent it, which van', r.rows === 3 && /DDD2234/.test(r.t) && /EEE5678/.test(r.t) && /FFF9HHH/.test(r.t) && /TEST Owner/.test(r.t) && /TEST Transit/.test(r.t), r);
    await pg.evaluate(() => { const i = document.getElementById('kwIn'); i.value = 'ddd2234'; document.getElementById('kwGo').click(); }); await sleep(1000);
    r = await pg.evaluate(() => ({ bin: !!document.getElementById('bbIn') }));
    check('typing a serial in the list scans it in (bin box opens, key on the van)', r.bin && (await dbUnit('u_w3')).location === 'van:v1', r);
    await pg.evaluate(() => document.getElementById('bbSkip').click()); await sleep(900);
    r = await pg.evaluate(() => ({ rows: document.querySelectorAll('.kwAcc').length, b: document.getElementById('keyWaitBanner').innerText }));
    check('the list and banner drop to 2 after it', r.rows === 2 && /2 keys waiting/.test(r.b), r);
    await pg.evaluate(() => { document.getElementById('kwIn').value = 'N2N3N4N'; document.getElementById('kwGo').click(); }); await sleep(500);
    check('a key that is not waiting for you is not scanned in ("isn\'t waiting for you")', /isn’t waiting for you/.test(await pg.evaluate(() => document.getElementById('kwMsg').innerText)) && (await dbUnit('u_f1')).location === 'shop');
    await closeOverlays();

    // ===== manager view =====
    await pg.evaluate(() => { window.__st.role = 'owner'; window.__st.mine = []; window.__st.sent = []; window.__addSent('u_g1', 'van:v1'); }); await pg.evaluate(() => refreshKeyWaiting()); await sleep(500);
    r = await pg.evaluate(() => ({ t: document.getElementById('keyWaitBanner').innerText }));
    check('manager banner: "1 key sent, not scanned in yet"', /📤 1 key sent, not scanned in yet/.test(r.t), r);
    await pg.evaluate(() => document.getElementById('kwOpen').click()); await sleep(700);
    r = await pg.evaluate(() => ({ t: document.getElementById('kwList').innerText, back: document.querySelectorAll('.kwBack').length }));
    check('manager list: "Sent, not scanned in yet" with the van, who it waits for, and Take it back', /Sent, not scanned in yet \(1\)/.test(r.t) && /TEST Transit/.test(r.t) && /TEST Jayden/.test(r.t) && r.back === 1, r);
    await closeOverlays();
    await scan('VVV7777', 1200);
    r = await pg.evaluate(() => ({ acc: (document.querySelector('.upAcc') || {}).innerText, back: !!document.querySelector('.upBack'), bin: !!document.getElementById('bbIn') }));
    check('a manager scanning a pending key gets the story with "Scan it in to TEST Transit for them" (no auto-accept)', /Scan it in to TEST Transit for them/.test(r.acc) && r.back && !r.bin && (await dbUnit('u_g1')).location === 'shop', r);
    await pg.evaluate(() => document.querySelector('.upAcc').click()); await sleep(1200);
    check('that button accepts it for them and asks for the bin', (await dbUnit('u_g1')).location === 'van:v1' && (await pg.evaluate(() => !!document.getElementById('bbIn'))));
    await pg.evaluate(() => document.getElementById('bbSkip').click()); await sleep(900);
    await closeOverlays();

    // ===== front desk =====
    await pg.evaluate(() => { window.__st.role = 'front_desk'; }); await pg.evaluate(() => openUnitPanel('N2N3N4N')); await sleep(1200);
    r = await pg.evaluate(() => ({ t: document.getElementById('upOut').innerText, dest: document.querySelectorAll('.upDest').length, chg: !!document.getElementById('upBinChg'), box: !!document.getElementById('upMoveBox') }));
    check('front desk sees the key\'s story but no move buttons, no send box, no bin change', /SN N2N3N4N/.test(r.t) && r.dest === 0 && !r.chg && !r.box, r);
    await closeOverlays();
    await pg.evaluate(() => openMoveKeys()); await sleep(500);
    check('front desk cannot open the batch sheet (told who can)', !(await pg.evaluate(() => unitMoveOpen())) && /technicians, managers and the owner/.test(await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).map(x => x.innerText).join(' '))));
    await pg.evaluate(() => document.querySelectorAll('.chg-modal-ov').forEach(x => x.remove()));

    // ===== batch sheet (opened over the Register so a leak would show) =====
    await pg.evaluate(() => { window.__st.role = 'owner'; window.__st.mine = []; window.__st.sent = []; window.__st.calls = []; });
    await goView('payments'); await sleep(700);
    await pg.evaluate(() => posAddLine({ type: 'custom', desc: 'TEST labor', unitCents: 1000, taxable: false }));
    await pg.evaluate(() => openMoveKeys()); await sleep(900);
    await scan('PPP2222', 700);
    r = await pg.evaluate(() => document.getElementById('mvList').innerText);
    check('scan before choosing a place: told to pick one first, nothing moved', /Pick where the keys are going first/.test(r) && (await calls()).length === 0, r);
    await pg.evaluate(() => document.querySelectorAll('.mvD')[1].click());
    for (const c of ['PPP2222', 'QQQ3333', 'RRR4444', 'SSS5555', 'ZZZZZZ9']) await scan(c, 900);
    r = await pg.evaluate(() => ({ lines: Array.from(document.querySelectorAll('#mvList > div')).map(x => x.innerText).reverse(), tk: posTicket.length, panel: !!document.getElementById('upOut'), open: unitMoveOpen() }));
    check('batch: three keys sent to the van ("→ sent to TEST Transit, waiting for TEST Jayden to scan in")', r.lines.filter(x => /^✓/.test(x)).length === 3 && /✓ PPP2222 — TEST Smart key blank → sent to TEST Transit, waiting for TEST Jayden to scan in/.test(r.lines.join(' | ')), r.lines);
    check('batch: one "already there" (not an error) and one unknown serial', r.lines.filter(x => /^• SSS5555 .*already in TEST Transit/.test(x)).length === 1 && r.lines.filter(x => /^✗ ZZZZZZ9/.test(x)).length === 1, r.lines);
    check('batch: unit_send for the three keys to van:v1, no unit_move', (await calls()).join() === 'unit_send u_b1 van:v1,unit_send u_b2 van:v1,unit_send u_b3 van:v1', await calls());
    check('while the sheet is open scans do not open the story panel or touch the Register', !r.panel && r.open && r.tk === 1, { panel: r.panel, tk: r.tk });
    r = await pg.evaluate(() => { document.getElementById('mvDone').click(); return unitMoveOpen(); }); await sleep(300);
    check('Done closes the sheet', r === false);
    await scan('PPP2222', 1000);
    r = await pg.evaluate(() => ({ panel: !!document.getElementById('upOut'), tk: posTicket.length }));
    check('after Done, scans behave normally again (Register view: the key goes to the ticket)', r.tk === 2 && !r.panel, r);
    await pg.evaluate(() => { posClear(); });

    // ===== phone =====
    await pg.setViewport(PHONE);
    await ready(); await stub();
    await pg.evaluate(() => { window.__st.role = 'owner'; window.__addMine('u_w5', 'van:v1'); window.__addMine('u_w4', 'van:v1'); if (typeof show === 'function') show('inventory'); }); await sleep(600);
    await pg.evaluate(() => refreshKeyWaiting()); await sleep(500);
    await pg.evaluate(() => { window.__st.role = 'technician'; }); await pg.evaluate(() => refreshKeyWaiting()); await sleep(400);
    r = await pg.evaluate(() => { const e = document.getElementById('keyWaitBanner'), bt = document.getElementById('kwOpen'); return { over: document.documentElement.scrollWidth - innerWidth, h: bt ? Math.round(bt.getBoundingClientRect().height) : 0, t: e ? e.innerText : '' }; });
    check('phone: banner shows, tap target at least 44px, no sideways scroll', r.h >= 44 && r.over <= 0 && /2 keys waiting/.test(r.t), r);
    await pg.evaluate(() => { window.__st.role = 'owner'; });
    await pg.evaluate(() => document.getElementById('invMoveKeys').click()); await sleep(900);
    await pg.evaluate(() => document.querySelectorAll('.mvD')[0].click());
    await scan('PPP2222', 900); await scan('SSS5555', 900); await scan('ZZZZZZ9', 900);
    await pg.screenshot({ path: path.join(OUT, 'scan-move-phone.png') });
    r = await pg.evaluate(() => { const ov = Array.from(document.querySelectorAll('div')).filter(d => d.style.zIndex === '100000').pop(); const bs = Array.from(ov.querySelectorAll('button')).filter(x => x.offsetParent !== null);
      const box = ov.firstElementChild.getBoundingClientRect();
      return { over: document.documentElement.scrollWidth - innerWidth, inside: ov.firstElementChild.scrollWidth - ov.firstElementChild.clientWidth, fits: box.left >= 0 && box.right <= innerWidth + 1, small: bs.filter(x => x.getBoundingClientRect().height < 43.5).map(x => x.innerText + ':' + Math.round(x.getBoundingClientRect().height)), rows: ov.querySelectorAll('#mvList > div').length }; });
    check('phone 390px: batch sheet fits, no sideways scroll, every button at least 44px, three result lines', r.over <= 0 && r.inside <= 0 && r.fits && r.small.length === 0 && r.rows === 3, r);
    await pg.evaluate(() => document.getElementById('mvDone').click()); await sleep(300);
    await pg.evaluate(() => openUnitPanel('N2N3N4N')); await sleep(1300);
    r = await pg.evaluate(() => { const ov = Array.from(document.querySelectorAll('div')).filter(d => d.style.zIndex === '100000').pop(); const bs = Array.from(ov.querySelectorAll('button')).filter(x => x.offsetParent !== null);
      return { over: document.documentElement.scrollWidth - innerWidth, inside: ov.firstElementChild.scrollWidth - ov.firstElementChild.clientWidth, small: bs.filter(x => x.getBoundingClientRect().height < 43.5).map(x => x.innerText + ':' + Math.round(x.getBoundingClientRect().height)), dest: ov.querySelectorAll('.upDest').length }; });
    check('phone: story panel with send buttons — no sideways scroll, buttons at least 44px', r.over <= 0 && r.inside <= 0 && r.small.length === 0 && r.dest === 2, r);

    check('no page errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { console.log('FAIL test crashed: ' + (e && e.stack || e)); failed++; }
  await b.close(); srv.close();
  console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})();
