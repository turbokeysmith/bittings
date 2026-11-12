// Browser test of 8z82 + 8z83: Reorder lists anything out of stock; a technician can add a key the system has never
// seen (no price / cost — the owner sets those) and the owner sees "NO PRICE" on it.
// Real page, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
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
// server stand-in for inv_add_new (same rules as supabase/phase8/8z83)
function stubAdd() {
  const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__add = [];
  sb.rpc = function (name, args) {
    if (name === 'inv_receive') { window.__recv = (window.__recv || []).concat([JSON.stringify(args)]); const d0 = JSON.parse(localStorage.getItem('__db')); d0.inventory.forEach(x => { if (x.id === args.p_item) x.qty = (x.qty || 0) + args.p_qty; }); localStorage.setItem('__db', JSON.stringify(d0)); return new Promise(r => setTimeout(() => r({ data: null, error: null }), 40)); }
    if (/^inv_reprice_/.test(name)) { window.__rp = (window.__rp || []).concat([name + ' ' + JSON.stringify(args || {})]); const L = JSON.parse(localStorage.getItem('__rpl') || 'null'); let data = null;
      if (name === 'inv_reprice_apply') { const d1 = JSON.parse(localStorage.getItem('__db')); let n = 0; const ch = []; args.p_changes.forEach(c => { const it = d1.inventory.find(x => x.id === c.id); if (it && it.sell_price_cents !== Number(c.cents)) { ch.push({ id: c.id, old: it.sell_price_cents, new: Number(c.cents) }); it.sell_price_cents = Number(c.cents); n++; } }); localStorage.setItem('__db', JSON.stringify(d1)); localStorage.setItem('__rpl', JSON.stringify({ id: 'b1', at: new Date().toISOString(), items: n, note: args.p_note, undone_at: null, by: 'TEST Owner', ch })); data = { changed: n, batch: 'b1' }; }
      else if (name === 'inv_reprice_last') data = L ? { id: L.id, at: L.at, items: L.items, note: L.note, undone_at: L.undone_at, by: L.by } : null;
      else if (name === 'inv_reprice_undo') { const d2 = JSON.parse(localStorage.getItem('__db')); let n2 = 0; L.ch.forEach(c => { const it = d2.inventory.find(x => x.id === c.id); if (it && it.sell_price_cents === c.new) { it.sell_price_cents = c.old; n2++; } }); localStorage.setItem('__db', JSON.stringify(d2)); L.undone_at = new Date().toISOString(); localStorage.setItem('__rpl', JSON.stringify(L)); data = { restored: n2, left_alone: L.ch.length - n2 }; }
      return new Promise(r => setTimeout(() => r({ data, error: null }), 40)); }
    if (/^receive_task/.test(name)) { const role0 = localStorage.getItem('__role'), mgr0 = role0 === 'owner' || role0 === 'manager'; const T = JSON.parse(localStorage.getItem('__rvt') || '{"open":null,"recent":[]}'); window.__rvCalls = (window.__rvCalls || []).concat([name + ' ' + JSON.stringify(args || {})]);
      let data = null, error = null;
      if (name === 'receive_tasks_list') data = { manager: mgr0, can: mgr0 || !!T.open, mine: (!mgr0 && T.open) ? { id: 't1', note: T.open.note, created_at: T.open.at, by: 'TEST Owner' } : null,
        open: mgr0 && T.open ? [{ id: 't1', assigned_to: 'u-tech', name: 'TEST Jayden', note: T.open.note, created_at: T.open.at }] : [], recent: mgr0 ? T.recent : [], team: mgr0 ? [{ user_id: 'u-tech', name: 'TEST Jayden', role: 'technician' }] : [] };
      else if (name === 'receive_task_assign') { if (!mgr0) error = { message: 'only a manager/owner can assign a delivery' }; else { T.open = { note: args.p_note || '', at: new Date().toISOString() }; data = { id: 't1', already_open: false, name: 'TEST Jayden' }; } }
      else if (name === 'receive_task_close') { if (!T.open) error = { message: 'that delivery task is not open' }; else { T.recent.unshift({ id: 't1', name: 'TEST Jayden', note: T.open.note, created_at: T.open.at, closed_at: new Date().toISOString(), summary: args.p_summary || [] }); T.open = null; data = { ok: true }; } }
      localStorage.setItem('__rvt', JSON.stringify(T)); return new Promise(r => setTimeout(() => r({ data, error }), 40)); }
    if (name === 'inv_add_new' && !(localStorage.getItem('__role') === 'owner' || localStorage.getItem('__role') === 'manager') && !(JSON.parse(localStorage.getItem('__rvt') || '{}').open)) return Promise.resolve({ data: null, error: { message: 'Booking in new items has to be assigned to you by the owner or a manager first.' } });
    if (name !== 'inv_add_new') return real(name, args);
    window.__add.push(JSON.stringify(args)); const d = JSON.parse(localStorage.getItem('__db')), role = localStorage.getItem('__role');
    const sku = String(args.p_part.sku || '').trim().toLowerCase(); const dup = sku && (d.inventory || []).find(x => String(x.sku || '').toLowerCase() === sku);
    if (dup) return Promise.resolve({ data: null, error: { message: 'SKU ' + args.p_part.sku + ' is already in stock as "' + dup.name + '". Open that one and use Receive instead of adding it again.' } });
    const mgr = role === 'owner' || role === 'manager', id = 'new_' + Date.now().toString(36);
    d.inventory.push({ id, shop_id: 's', name: args.p_part.name, sku: args.p_part.sku || '', category: args.p_part.category || '', qty: args.p_qty || 0, fitment: args.p_part.fitment || '', fcc_id: args.p_part.fcc_id || '', chip: args.p_part.chip || '', cost: args.p_part.cost != null ? Number(args.p_part.cost) : null, sell_price_cents: args.p_part.sell_price_cents != null ? Number(args.p_part.sell_price_cents) : null, link: args.p_part.link || '', deleted_at: null, updated_at: new Date().toISOString(), low_at: 0 });
    localStorage.setItem('__db', JSON.stringify(d));
    return new Promise(r => setTimeout(() => r({ data: { id, name: args.p_part.name, qty: args.p_qty || 0, needs_price: true }, error: null }), 40));
  };
}
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
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, low_at: 0, reorder_qty: 0, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', supplier: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('k1', { name: 'TEST key that ran out', sku: 'T-OUT', category: 'Keys/Smart Key', qty: 0, supplier: 'TEST Supplier A' }),
        K('k2', { name: 'TEST key with stock', sku: 'T-HAVE', category: 'Keys/Smart Key', qty: 5 }),
        K('k3', { name: 'TEST key below its low point', sku: 'T-LOW', category: 'Keys/Transponder', qty: 2, low_at: 3, reorder_qty: 10, supplier: 'TEST Supplier A' }),
        K('k4', { name: 'TEST key out, no supplier', sku: 'T-OUT2', category: 'Keys/Transponder', qty: 0 })];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    let r;
    const open = async (role) => { await pg.evaluate(async (role) => { localStorage.setItem('__role', role); try { if (window.TKS) await TKS.clearDeviceCache(); } catch (e) {} localStorage.setItem('__role', role); }, role);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
      await pg.evaluate(stubAdd); await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(900); };

    // ================= Reorder =================
    await open('owner');
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.crow.part')).map(x => x.querySelector('.nm').innerText.replace(/\s+/g, ' ')));
    check('stock list: a part at zero shows OUT even with no low-stock point; a low one shows LOW', r.some(x => /TEST key that ran out OUT/.test(x)) && r.some(x => /TEST key below its low point LOW/.test(x)) && r.some(x => /^TEST key with stock$/.test(x.trim())), r);
    await pg.evaluate(() => document.getElementById('invReorder').click()); await sleep(500);
    r = await pg.evaluate(() => { const c = document.getElementById('roCard'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
    check('Reorder lists the two that are out of stock and the one below its low point — not the one with stock', /3 parts out of stock, or at \/ below the low-stock point/.test(r || '') && /TEST key that ran out/.test(r || '') && /TEST key out, no supplier/.test(r || '') && /TEST key below its low point/.test(r || '') && !/TEST key with stock/.test(r || ''), (r || '').slice(0, 700));
    await pg.screenshot({ path: path.join(OUT, 'reorder-out-of-stock.png') });
    await pg.evaluate(() => document.getElementById('roX').click());

    // ================= Receiving has to be assigned =================
    await open('technician'); await sleep(600);
    r = await pg.evaluate(() => { const vis = e => !!(e && e.offsetParent && e.style.display !== 'none' && !e.classList.contains('tks-cap-hidden')); return { tab: vis(document.querySelector('#view-inventory [data-invtab="receive"]')), add: vis(document.getElementById('invAdd')), banner: document.getElementById('rvBanner').innerText }; });
    check('a technician with nothing assigned has no Receive tab and no "+ Add"', r.tab === false && r.add === false && r.banner === '', r);
    r = await pg.evaluate(() => { renderReceive(); show('receive'); return new Promise(res => setTimeout(() => res({ text: document.getElementById('rvAssign').innerText.replace(/\s+/g, ' '), work: getComputedStyle(document.getElementById('rvWork')).display }), 400)); });
    check('…and the Receive screen itself says it has to be assigned', /Nothing is assigned to you right now/.test(r.text) && r.work === 'none', r);
    await open('owner'); await sleep(400);
    await pg.evaluate(() => document.querySelector('#view-inventory [data-invtab="receive"]').click()); await sleep(700);
    r = await pg.evaluate(() => ({ text: document.getElementById('rvAssign').innerText.replace(/\s+/g, ' '), opts: Array.from(document.getElementById('rvWho').options).map(o => o.text), work: getComputedStyle(document.getElementById('rvWork')).display }));
    check('the owner\'s Receive screen asks who is booking in the delivery (and the owner can still receive)', /Who is booking in the delivery\?/.test(r.text) && r.opts.indexOf('TEST Jayden') >= 0 && /Nobody is assigned right now/.test(r.text) && r.work !== 'none', r);
    await pg.evaluate(() => document.getElementById('rvAssignBtn').click()); await sleep(200);
    check('it wants a person picked first', /Pick the person first/.test(await pg.evaluate(() => document.getElementById('rvAssignMsg').innerText)));
    await pg.evaluate(() => { document.getElementById('rvWho').value = 'u-tech'; document.getElementById('rvNoteIn').value = 'TEST supplier order 123'; document.getElementById('rvAssignBtn').click(); }); await sleep(900);
    r = await pg.evaluate(() => ({ text: document.getElementById('rvAssign').innerText.replace(/\s+/g, ' '), calls: (window.__rvCalls || []).filter(x => /assign/.test(x)) }));
    check('picking TEST Jayden and Assign opens the task for him', /Assigned now TEST Jayden — TEST supplier order 123/.test(r.text) && /Take it back/.test(r.text) && /"p_user":"u-tech","p_note":"TEST supplier order 123"/.test(r.calls[0] || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'receive-assign.png') });

    // ================= The Receive task: the technician it was assigned to books in the delivery =================
    await open('technician'); await sleep(600);
    r = await pg.evaluate(() => document.getElementById('rvBanner').innerText.replace(/\s+/g, ' '));
    check('his stock screen now shows "A delivery is assigned to you"', /A delivery is assigned to you — TEST supplier order 123/.test(r), r);
    await pg.screenshot({ path: path.join(OUT, 'receive-assigned-banner.png') });
    r = await pg.evaluate(() => { const vis = e => !!(e && e.offsetParent && !e.classList.contains('tks-cap-hidden')); return { add: vis(document.getElementById('invAdd')), imp: vis(document.getElementById('invImport')), tab: Array.from(document.querySelectorAll('#view-inventory .invsubtabs button')).map(x => x.innerText) }; });
    check('technician: the stock screen has a "📥 Receive" tab next to Reconcile, and "+ Add" (Import / Export stay manager-only)', r.add === true && r.imp === false && r.tab.join('|') === '🏪 Stock|🔢 Reconcile|📥 Receive', r);
    await pg.evaluate(() => document.querySelector('#view-inventory [data-invtab="receive"]').click()); await sleep(500);
    r = await pg.evaluate(() => ({ view: (document.querySelector('.view.active') || {}).id, text: document.getElementById('view-receive').innerText.replace(/\s+/g, ' ').slice(0, 400) }));
    check('the Receive screen opens and says what to do', r.view === 'view-receive' && /Booking in a delivery/.test(r.text) && /New item/.test(r.text), r);
    await pg.evaluate(() => { const s = document.getElementById('rvSearch'); s.value = 'ran out'; s.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(600);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rvResults [data-rv]')).map(x => x.innerText.replace(/\s+/g, ' ')));
    check('searching finds the item with what is in stock now', r.length === 1 && /TEST key that ran out/.test(r[0]) && /In stock now: 0/.test(r[0]) && /Receive/.test(r[0]), r);
    await pg.evaluate(() => document.querySelector('#rvResults .rvGo').click()); await sleep(200);
    check('it will not receive without a quantity', /Type how many came in/.test(await pg.evaluate(() => document.querySelector('#rvResults .rvMsg').innerText)));
    await pg.evaluate(() => { const q = document.querySelector('#rvResults .rvQty'); q.value = '6'; q.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#rvResults .rvGo').click(); }); await sleep(900);
    r = await pg.evaluate(() => ({ recv: window.__recv || [], row: (document.querySelector('#rvResults [data-rv]') || {}).innerText, ses: document.getElementById('rvSession').innerText.replace(/\s+/g, ' ') }));
    check('typing 6 and Receive books 6 into the shop; the count on screen goes to 6 and the session list shows it', r.recv.length === 1 && /"p_item":"k1","p_qty":6/.test(r.recv[0]) && /In stock now: 6/.test((r.row || '').replace(/\s+/g, ' ')) && /Booked in this session 1 line · 6 pieces/.test(r.ses) && /TEST key that ran out · T-OUT \+ 6/.test(r.ses), r);
    await pg.screenshot({ path: path.join(OUT, 'receive-task.png') });

    // ---- a key that is not in the system: the technician fills in everything, price and cost included ----
    await pg.evaluate(() => document.getElementById('rvNew').click()); await sleep(700);
    r = await pg.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!(e && e.offsetParent && !e.classList.contains('tks-cap-hidden')); };
      return { view: (document.querySelector('.view.active') || {}).id, sellRO: document.getElementById('pSell').readOnly, costShown: vis('pCost'), costRO: document.getElementById('pCost').readOnly, nameRO: document.getElementById('pName').readOnly, qtyRO: document.getElementById('pQty').readOnly, link: vis('pLink'), supplier: vis('pSupplier'), save: vis('pSave'), saveNew: vis('pSaveNew'), note: document.getElementById('partNote').innerText }; });
    check('"New item" opens the full form for a technician: name, quantity, PRICE and COST all open, plus supplier and website link', r.view === 'view-part' && r.sellRO === false && r.costShown === true && r.costRO === false && r.nameRO === false && r.qtyRO === false && r.link && r.supplier && r.save === false && r.saveNew === true && /price, cost, manufacturer, website link/.test(r.note), r);
    await pg.screenshot({ path: path.join(OUT, 'tech-add-key.png') });
    await pg.evaluate(() => document.getElementById('pSaveNew').click()); await sleep(300);
    check('it asks for a name', /type a name/.test(await pg.evaluate(() => document.getElementById('partNote').innerText)));
    await pg.evaluate(() => { const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }; s('pName', 'TEST brand new smart key'); s('pSku', 'T-OUT'); s('pQty', '4'); s('pFcc', 'm3n-test'); s('pFitment', 'Ford F-150 2015-2020'); s('pSell', '199'); s('pCost', '45.5'); s('pLink', 'example.com/key'); s('pSupplier', 'TEST Supplier A'); });
    await pg.evaluate(() => document.getElementById('pSaveNew').click()); await sleep(600);
    r = await pg.evaluate(() => document.getElementById('partNote').innerText);
    check('a SKU that already exists is refused, pointing to Receive', /already in stock as "TEST key that ran out"/.test(r) && /Receive/.test(r), r);
    await pg.evaluate(() => { const e = document.getElementById('pSku'); e.value = 'T-NEW-1'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await pg.evaluate(() => document.getElementById('pSaveNew').click()); await sleep(2800);
    r = await pg.evaluate(() => ({ sent: window.__add[window.__add.length - 1], view: (document.querySelector('.view.active') || {}).id, ses: document.getElementById('rvSession').innerText.replace(/\s+/g, ' ') }));
    check('the new key goes in with its details, the quantity, the price ($199.00) and the cost ($45.50)', /"name":"TEST brand new smart key"/.test(r.sent || '') && /"sku":"T-NEW-1"/.test(r.sent || '') && /"fcc_id":"M3N-TEST"/.test(r.sent || '') && /"link":"https:\/\/example\.com\/key"/.test(r.sent || '') && /"supplier":"TEST Supplier A"/.test(r.sent || '') && /"cost":"45\.5"/.test(r.sent || '') && /"sell_price_cents":"19900"/.test(r.sent || '') && /"p_qty":4/.test(r.sent || ''), r.sent);
    check('…and it returns to the Receive screen, with the new key in the session list', r.view === 'view-receive' && /2 lines · 10 pieces/.test(r.ses) && /TEST brand new smart key · T-NEW-1 NEW \+ 4/.test(r.ses), r);
    await pg.screenshot({ path: path.join(OUT, 'receive-session.png') });
    await pg.evaluate(() => document.querySelector('#view-receive [data-invtab="inventory"]').click()); await sleep(700);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.crow.part')).map(x => x.innerText.replace(/\s+/g, ' ')).filter(x => /brand new smart key|ran out/.test(x)));
    check('on the stock list: the new key has 4 in stock and no "NO PRICE" flag; the received one shows 6', r.some(x => /TEST brand new smart key/.test(x) && /\b4\b/.test(x) && !/NO PRICE/.test(x)) && r.some(x => /TEST key that ran out/.test(x) && /\b6\b/.test(x) && !/OUT/.test(x.replace('T-OUT', ''))), r);
    // an existing item is still locked for him: no price / cost editing
    await pg.evaluate(() => { const row = Array.from(document.querySelectorAll('.crow.part')).find(x => /TEST key with stock/.test(x.innerText)); (row.querySelector('.pinfo') || row).click(); }); await sleep(700);
    r = await pg.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!(e && e.offsetParent); }; return { view: (document.querySelector('.view.active') || {}).id, sellRO: document.getElementById('pSell').readOnly, costShown: vis('pCost'), nameRO: document.getElementById('pName').readOnly }; });
    check('an item that already exists stays locked for a technician: price and name read-only, cost not shown', r.view === 'view-part' && r.sellRO === true && r.costShown === false && r.nameRO === true, r);

    // ---- he finishes; the tab closes again and the owner sees what was booked in ----
    await pg.evaluate(() => { const bk = document.getElementById('backBtn'); document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click(); }); await sleep(700);
    await pg.evaluate(() => document.querySelector('#view-inventory [data-invtab="receive"]').click()); await sleep(700);
    r = await pg.evaluate(() => document.getElementById('rvAssign').innerText.replace(/\s+/g, ' '));
    check('his Receive screen says who assigned it and has a Finished button', /This delivery is assigned to you/.test(r) && /By TEST Owner/.test(r) && /TEST supplier order 123/.test(r) && /Finished — everything is booked in/.test(r), r);
    await pg.evaluate(() => document.getElementById('rvFinish').click()); await sleep(400);
    await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); d.querySelector('[data-yes]').click(); }); await sleep(1500);
    r = await pg.evaluate(() => { const vis = e => !!(e && e.offsetParent && e.style.display !== 'none' && !e.classList.contains('tks-cap-hidden')); return { view: (document.querySelector('.view.active') || {}).id, tab: vis(document.querySelector('#view-inventory [data-invtab="receive"]')), add: vis(document.getElementById('invAdd')), sent: (window.__rvCalls || []).filter(x => /close/.test(x)).pop() }; });
    check('Finished sends the list of what he booked in; his Receive tab and "+ Add" close again', r.view === 'view-inventory' && r.tab === false && r.add === false && /"name":"TEST key that ran out","sku":"T-OUT","qty":6/.test(r.sent || '') && /"name":"TEST brand new smart key","sku":"T-NEW-1","qty":4,"isNew":true/.test(r.sent || ''), r);
    await open('owner'); await sleep(400);
    await pg.evaluate(() => document.querySelector('#view-inventory [data-invtab="receive"]').click()); await sleep(700);
    r = await pg.evaluate(() => { const d = document.querySelector('#rvAssign details'); if (d) d.open = true; return document.getElementById('rvAssign').innerText.replace(/\s+/g, ' '); });
    check('the owner sees the finished delivery with what was booked in', /Finished deliveries \(1\)/.test(r) && /TEST Jayden — TEST supplier order 123/.test(r) && /2 lines, 10 pieces/.test(r) && /TEST brand new smart key \(new\) \+ 4/.test(r) && /Nobody is assigned right now/.test(r), r);

    // ================= A key added with no price is flagged for everyone =================
    await pg.evaluate(() => { const d = JSON.parse(localStorage.getItem('__db')); d.inventory.push({ id: 'np1', shop_id: 's', name: 'TEST key nobody priced', sku: 'T-NP', category: 'Keys/Transponder', qty: 1, low_at: 0, cost: null, sell_price_cents: null, deleted_at: null, updated_at: new Date().toISOString() }); localStorage.setItem('__db', JSON.stringify(d)); });
    await open('owner');
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('.crow.part')).map(x => x.querySelector('.nm').innerText.replace(/\s+/g, ' ')).filter(x => /NO PRICE/.test(x)));
    check('the owner sees NO PRICE only on an item that was added without one', r.length === 1 && /TEST key nobody priced/.test(r[0]), r);
    r = await pg.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!(e && e.offsetParent); }; document.getElementById('invAdd').click(); return new Promise(res => setTimeout(() => res({ cost: vis('pCost'), save: vis('pSave'), saveNew: vis('pSaveNew') }), 500)); });
    check('the owner\'s own "+ Add" form is unchanged (cost shown, Save part)', r.cost === true && r.save === true && r.saveNew === false, r);
    // ================= Automatic key prices (8z87) =================
    r = await pg.evaluate(() => { const c = (cost, cat, name) => { const a = autoPriceFor(cost, cat, name); return a ? a.cents + ' ' + a.group : null; };
      return [c(55, 'Keys/Smart Key', 'x'), c(25, 'Keys/Remote Head / Flip', 'x'), c(7, 'Keys/Transponder', 'x'), c(26.5, 'Keys/Remote / Fob', 'x'), c(40, 'Keys/Remote / Fob', 'TEST PEPS key'), c(10, 'Hardware/Locks', 'x'), c(0, 'Keys/Smart Key', 'x')]; });
    check('the rule: smart key = cost + 200%, other keys = cost + 150%, rounded up to $5, with a lowest price; parts that are not keys are left alone',
      JSON.stringify(r) === JSON.stringify(['16500 smart', '6500 std', '2500 std', '7000 std', '12000 smart', null, null]), r);
    r = await pg.evaluate(() => new Promise(res => { const s = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
      s('pName', 'TEST PEPS smart key for pricing'); s('pCost', '55'); const a = document.getElementById('pSell').value, h1 = document.getElementById('pAutoHint').innerText;
      s('pCost', '60'); const b2 = document.getElementById('pSell').value;
      s('pSell', '150'); s('pCost', '70'); const c = document.getElementById('pSell').value, h2 = document.getElementById('pAutoHint').innerText.replace(/\s+/g, ' ');
      document.getElementById('pAutoUse').click(); setTimeout(() => res({ a, h1, b2, c, h2, d: document.getElementById('pSell').value }), 100); }));
    check('on the new-item form the price fills itself from the cost and follows it; a price typed by hand is kept, with a one-tap offer',
      r.a === '165.00' && /Automatic price: cost \$55\.00 \+ 200% \(smart key\) = \$165\.00/.test(r.h1) && r.b2 === '180.00' && r.c === '150' && /Automatic price would be \$210\.00/.test(r.h2) && /Use \$210\.00/.test(r.h2) && r.d === '210.00', r);
    await pg.screenshot({ path: path.join(OUT, 'auto-price-form.png') });
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click()); await sleep(900);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('.railItem')).find(x => /Inventory/.test(x.innerText)); if (it) it.click(); }); await sleep(900);
    r = await pg.evaluate(() => { const bk = document.getElementById('apBlock'); return bk ? { on: document.getElementById('f_apOn').checked, std: document.getElementById('f_apStd').value, smart: document.getElementById('f_apSmart').value, ex1: document.getElementById('f_apStdEx').innerText, ex2: document.getElementById('f_apSmartEx').innerText } : null; });
    check('Settings › Inventory shows the two percentages with a worked example and the margin each gives', !!r && r.on === true && r.std === '150' && r.smart === '200' && /costs you \$25\.00 sells for \$65\.00 \(60% margin\)/.test(r.ex1) && /costs you \$55\.00 sells for \$165\.00 \(67% margin\)/.test(r.ex2), r);
    await pg.evaluate(() => document.getElementById('apBlock').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'auto-price-settings.png') });
    r = await pg.evaluate(() => new Promise(res => { const e = document.getElementById('f_apSmart'); e.value = '100'; e.dispatchEvent(new Event('change', { bubbles: true })); setTimeout(() => res({ ex2: document.getElementById('f_apSmartEx').innerText, saved: TKS.Config.autoPrice().smartMarkupPct, stdKept: TKS.Config.autoPrice().stdMarkupPct, price: autoPriceFor(55, 'Keys/Smart Key', 'x').cents, db: JSON.parse(localStorage.getItem('__db')).shop_config.map(x => ((x.data || {}).autoPrice || {}).smartMarkupPct).filter(v => v != null) }), 900); }));
    check('changing a percentage saves at once (also to the cloud) and new prices use it', /sells for \$110\.00 \(50% margin\)/.test(r.ex2) && r.saved === 100 && r.stdKept === 150 && r.price === 11000 && r.db.indexOf(100) >= 0, r);
    // ================= One tap: change every key's price to the rules (8z89) =================
    r = await pg.evaluate(() => ({ btn: (document.getElementById('f_apAll') || {}).innerText, plan: (function () { const P = repricePlan(); return { n: P.changes.length, up: P.up, down: P.down, noCost: P.noCost, same: P.same, list: P.changes.map(c => c.sku + ':' + c.old + '>' + c.cents).sort() }; })() }));
    check('the plan: every key with a cost gets the price the rules give (smart +100% here, others +150%, $5 steps, minimums); keys with no cost are left alone',
      /Change every key/.test(r.btn || '') && r.plan.n === 4 && r.plan.down === 4 && r.plan.up === 0 && r.plan.noCost === 1 &&
      JSON.stringify(r.plan.list) === JSON.stringify(['T-HAVE:15000>7500', 'T-LOW:15000>5000', 'T-OUT2:15000>5000', 'T-OUT:15000>7500'].sort()), r.plan);
    await pg.evaluate(() => document.getElementById('f_apAll').click()); await sleep(500);
    r = await pg.evaluate(() => { const c = document.getElementById('rpCard'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
    check('the button shows what will change BEFORE changing anything', /4 keys will change: 4 go down, 0 go up/.test(r || '') && /1 key has no cost, so it is left alone/.test(r || '') && /\$150\.00 → \$75\.00/.test(r || '') && /Change 4 prices/.test(r || '') && /Full list \(file\)/.test(r || ''), (r || '').slice(0, 700));
    check('…and nothing has been sent yet', !(await pg.evaluate(() => (window.__rp || []).some(x => /apply/.test(x)))));
    await pg.screenshot({ path: path.join(OUT, 'reprice-preview.png') });
    await pg.evaluate(() => document.getElementById('rpGo').click()); await sleep(1800);
    r = await pg.evaluate(() => ({ sent: (window.__rp || []).filter(x => /apply/.test(x)).pop(), open: !!document.getElementById('rpCard'), prices: ['k1', 'k2', 'k3'].map(id => TKS.Inventory.get(id).sellPriceCents), last: (document.getElementById('f_apLast') || {}).innerText.replace(/\s+/g, ' ') }));
    check('confirming changes all five in one go and shows the Undo', /"id":"k1","cents":"7500"/.test(r.sent || '') && (r.sent.match(/"id":/g) || []).length === 4 && r.open === false && r.prices.join() === '7500,7500,5000' && /Last change: 4 prices/.test(r.last) && /Undo that change/.test(r.last), r);
    await pg.evaluate(() => document.getElementById('f_apUndo').click()); await sleep(300);
    await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); d.querySelector('[data-yes]').click(); }); await sleep(1800);
    r = await pg.evaluate(() => ({ undo: (window.__rp || []).filter(x => /undo/.test(x)).length, db: JSON.parse(localStorage.getItem('__db')).inventory.filter(x => /^k[123]$/.test(x.id)).map(x => x.sell_price_cents), last: (document.getElementById('f_apLast') || {}).innerText.replace(/\s+/g, ' ') }));
    check('Undo puts the old prices back', r.undo === 1 && r.db.join() === '15000,15000,15000' && /undone/.test(r.last) && !/Undo that change/.test(r.last), r);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
