// Browser test of "Universal keys": no FCC ID / chip needed, hidden in the item form, and offered on every vehicle
// ("we don't have your key but we do have a universal for a temporary key").
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Port 8101. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const PORT = 8101, BASE = 'http://127.0.0.1:' + PORT + '/';
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

const iso = new Date(Date.now() - 20 * 60000).toISOString();
const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
const INV = [
  K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', grade: 'OEM New', fitment: 'Ford F-150 2015-2017', qty: 6, sell_price_cents: 22500, fcc_id: 'M3N-A2C31243300' }),
  K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', grade: 'Aftermarket', fitment: 'Ford F-150 2015-2020', qty: 2, sell_price_cents: 16500, fcc_id: 'CWTWB1U793', chip: 'ID49' }),
  K('tk1', { name: 'TEST TOYOTA CAMRY 2018-2020 Smart Key', sku: 'T-TK1', category: 'Keys/Smart Key', grade: 'Aftermarket', fitment: 'Toyota Camry 2018-2020', fcc_id: 'HYQ14FBC', chip: '8A' }),
  K('nf1', { name: 'TEST Smart key with no FCC ID yet', sku: 'T-NF1', category: 'Keys/Smart Key', grade: 'Aftermarket', fitment: 'Toyota Camry 2018-2020' }),
  K('u1', { name: 'TEST Universal Smart Key (Autel)', sku: 'T-U1', category: 'Keys/Smart Key', grade: 'Universal', qty: 4, sell_price_cents: 9500 }),
  K('u2', { name: 'TEST Universal Flip Key', sku: 'T-U2', category: 'Keys/Remote Head / Flip', grade: 'Universal', qty: 0, sell_price_cents: 8500 }),
  K('u3', { name: 'TEST UNIV Transponder blank', sku: 'T-U3', category: 'Keys/Transponder', grade: '', qty: 2, sell_price_cents: 6500 }),
  K('u4', { name: 'TEST Universal Flip fitted to F-150', sku: 'T-U4', category: 'Keys/Remote Head / Flip', grade: 'Universal', fitment: 'Ford F-150 2015-2020', qty: 1, sell_price_cents: 7500 }),
  K('acc1', { name: 'TEST Universal key ring (accessory)', sku: 'T-ACC1', category: 'Accessories/Other', grade: 'Universal', qty: 9, sell_price_cents: 300 }),
];

(async () => {
  // ================= 1. keysFor, plain unit cases (same file the browser loads) =================
  const FIT = require(path.join(ROOT, 'app', 'fitment.js'));
  const stock = INV.map(r => ({ id: r.id, name: r.name, sku: r.sku, category: r.category, grade: r.grade, fitment: r.fitment || '', qty: r.qty, chip: r.chip, fccId: r.fcc_id, sellPriceCents: r.sell_price_cents }));
  const ids = L => L.universal.map(p => p.id);
  const civic = { year: '2019', make: 'Honda', model: 'Civic' };
  let L = FIT.keysFor(stock, civic, '');
  check('unit: an unrelated vehicle (no key fits) still gets the universal group, in-stock first (u1, u3, then out-of-stock u2, u4 fits only F-150 but is universal and not confirmed here)', ids(L).join() === 'u1,u3,u4,u2', ids(L));
  check('unit: the group is last-but-before "might fit", with the exact label, and nothing else is in confirmed list', L.groups.length === 1 && L.groups[0][0] === 'Universal — works as a temporary / spare on most vehicles' && L.list.length === 0 && L.count === 0, L.groups.map(g => g[0]));
  check('unit: universalHint is the exact sentence when no key fits', L.universalHint === 'No key in stock for this exact vehicle — a universal key can work as a temporary or spare.', L.universalHint);
  check('unit: an Accessory marked Universal is never offered as a key', ids(L).indexOf('acc1') < 0, ids(L));
  check('unit: every universal carries the "check it covers this vehicle" note', L.universal.every(p => p._kfvNote === 'Universal — check it covers this vehicle before promising it'), L.universal.map(p => p._kfvNote));
  check('unit: notes are on COPIES — the stock records have no _kfvNote', stock.every(p => p._kfvNote === undefined) && L.universal.every(p => p !== stock.find(s => s.id === p.id)), 0);
  const L2 = FIT.keysFor(stock, civic, '');
  check('unit: deterministic (same input, same answer)', JSON.stringify(L) === JSON.stringify(L2), 0);
  L = FIT.keysFor(stock, civic, 'push');
  check('unit: push-to-start → only the universal Smart Key', ids(L).join() === 'u1', ids(L));
  L = FIT.keysFor(stock, civic, 'keyed');
  check('unit: turn-key → every universal except the smart key', ids(L).join() === 'u3,u4,u2', ids(L));
  L = FIT.keysFor(stock, { year: '2016', make: 'Ford', model: 'F-150' }, '');
  check('unit: a universal already matched by fitment (u4) is in the confirmed list and NOT listed again', L.list.some(p => p.id === 'u4') && ids(L).indexOf('u4') < 0 && ids(L).join() === 'u1,u3,u2', { list: L.list.map(p => p.id), uni: ids(L) });
  check('unit: with confirmed keys there is no hint, but the group is still there, after the confirmed groups', L.universalHint === '' && L.groups[L.groups.length - 1][0].indexOf('Universal') === 0 && L.groups.length >= 3, L.groups.map(g => g[0]));
  L = FIT.keysFor(stock, { year: '2016', make: 'Ford', model: 'F-150' }, 'push');
  check('unit: a universal that fitment matched but push-to-start hides is not re-offered through the universal group', ids(L).join() === 'u1' && L.list.every(p => p.id !== 'u4'), { list: L.list.map(p => p.id), uni: ids(L) });
  const none = stock.filter(p => !/universal|univ/i.test(p.name));
  const before = JSON.stringify(FIT.keysFor(none, civic, ''));
  L = FIT.keysFor(none, { year: '2016', make: 'Ford', model: 'F-150' }, '');
  check('unit: a shop with no Universal items → nothing changes (no group, no hint, universal is empty)', before === JSON.stringify({ groups: [], count: 0, hidden: '', list: [], maybe: [], universal: [], universalHint: '' }) && L.universal.length === 0 && L.universalHint === '' && L.groups.every(g => g[0].indexOf('Universal') !== 0), before);
  check('unit: the "is universal" rule — stored grade wins; no grade → UNIV / UNIVERSAL / IKEY word in SKU or name; only top category Keys', FIT.isUniversalKey({ category: 'Keys/Smart Key', grade: 'Universal' }) && !FIT.isUniversalKey({ category: 'Keys/Smart Key', grade: 'OEM New', name: 'Universal thing' }) && FIT.isUniversalKey({ category: 'Keys/Smart Key', name: 'x IKEY y' }) && FIT.isUniversalKey({ category: 'Keys/Transponder', sku: 'UNIV-1' }) && !FIT.isUniversalKey({ category: 'Accessories/Other', grade: 'Universal' }) && !FIT.isUniversalKey({ category: 'Keys/Smart Key', name: 'Nonuniversal' }), 0);

  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf('http://127.0.0.1:' + PORT + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(BASE + 'seed.html');
    await pg.evaluate((UID, INV) => {
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso0(), data: { taxRate: 8.625, services: [] } }];
      function iso0() { return new Date(Date.now() - 20 * 60000).toISOString(); }
      localStorage.clear();
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: INV, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_form_sections', 'open');   /* 8z158: the form's sections all open, so this test still checks the fields themselves */ localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID, INV);

    // ================= 2. quote builder =================
    const openQ = async () => { await pg.goto(BASE + 'bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(1800); };
    const setSel = async (sel, v) => { await pg.evaluate((sel, v) => { const el = document.querySelector(sel); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, sel, v); await sleep(350); };
    const setVeh = async (y, mk, md) => { await setSel('#qiVYear', y); await setSel('#qiVMake', mk); await setSel('#qiVModel', md); await sleep(300); };
    await openQ(); await setVeh('2019', 'Honda', 'Civic');
    let r = await pg.evaluate(() => { const box = document.querySelector('#qiKeys'); box.querySelectorAll('.qk-grp').forEach(x => { x.hidden = false; });   /* 8z147: the kinds of key are collapsing bars now — open them all to read the list */ const heads = Array.from(box.querySelectorAll('.qk-g, .qk-gb .qk-gt')).map(x => x.innerText.trim()); const rows = Array.from(box.querySelectorAll('.qk-row .qk-n')).map(x => x.innerText.replace(/\s+/g, ' ').trim());
      return { heads, rows, text: box.innerText, over: document.documentElement.scrollWidth - window.innerWidth }; });
    check('quote builder: vehicle with no exact key shows the universal group and the hint sentence', r.heads.length === 1 && /^Universal — works as a temporary/i.test(r.heads[0]) && r.rows.length === 4 && r.text.indexOf('No key in stock for this exact vehicle — a universal key can work as a temporary or spare.') >= 0 && /check it covers this vehicle before promising it/.test(r.text) && r.over <= 0, r);
    await pg.evaluate(() => document.querySelector('#qiKeys').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'universal-quote-phone.png') });
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="push"]').click()); await sleep(300);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#qiKeys .qk-row .qk-n')).map(x => x.innerText.replace(/\s+/g, ' ').trim()));
    check('quote builder: "Push to start" leaves only the universal smart key', r.length === 1 && /Universal Smart Key/.test(r[0]), r);
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign=""]').click()); await sleep(300);
    await pg.evaluate(() => { const a = document.querySelector('#qiKeys .qk-add[data-id="u1"]'); a.click(); }); await sleep(500);
    r = await pg.evaluate(() => ({ lines: Array.from(document.querySelectorAll('.qi-item .qiDesc')).map(x => x.value), amts: Array.from(document.querySelectorAll('.qi-item .qiAmt')).map(x => x.value), added: !!document.querySelector('#qiKeys .qk-added') }));
    check('quote builder: "+ Add" puts the universal key on the quote at its shelf price', r.lines.some(x => /Universal Smart Key/.test(x)) && r.amts.indexOf('95.00') >= 0 && r.added, r);
    await openQ(); await setVeh('2016', 'Ford', 'F-150');
    r = await pg.evaluate(() => { const box = document.querySelector('#qiKeys'); box.querySelectorAll('.qk-grp').forEach(x => { x.hidden = false; });   /* 8z147: the kinds of key are collapsing bars now — open them all to read the list */ return ({ heads: Array.from(document.querySelectorAll('#qiKeys .qk-g, #qiKeys .qk-gb .qk-gt')).map(x => x.innerText.trim()), rows: Array.from(document.querySelectorAll('#qiKeys .qk-row .qk-n')).map(x => x.innerText.replace(/\s+/g, ' ').trim()), text: document.querySelector('#qiKeys').innerText }); });
    check('quote builder: a vehicle WITH exact keys lists them first, the universal group after, no hint, the fitted universal flip once', /^universal/i.test(r.heads[r.heads.length - 1]) && r.text.indexOf('No key in stock for this exact vehicle') < 0 && r.rows.filter(x => /Universal Flip fitted/.test(x)).length === 1 && r.rows.indexOf(r.rows.find(x => /5-Button PEPS/.test(x))) < r.rows.indexOf(r.rows.find(x => /Universal Smart Key/.test(x))), r);

    // ================= 3. Scheduler quick form =================
    await pg.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="schedule"]').click()); await sleep(900);
    await pg.evaluate(() => { const n = document.querySelector('#view-schedule [data-new]'); if (n) n.click(); }); await sleep(700);
    // 8z153: "+ New quote / job" opens a chooser; the Quick form is its own button now
    await pg.evaluate(() => { const k = document.querySelector('#stQuick'); if (k) k.click(); }); await sleep(900);
    const sSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('.sch-modal #' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(450); };
    await sSel('sjYear', '2019'); await sSel('sjMake', 'Honda'); await sSel('sjModel', 'Civic');
    r = await pg.evaluate(() => { const box = document.querySelector('.sch-modal #sjKeys'); return { text: box.innerText, adds: Array.from(box.querySelectorAll('.sjkAdd')).map(x => x.dataset.id) }; });
    check('Scheduler quick form: universal group, the hint, and + Add on each universal key', /UNIVERSAL — WORKS AS A TEMPORARY/i.test(r.text) && r.text.indexOf('No key in stock for this exact vehicle — a universal key can work as a temporary or spare.') >= 0 && r.adds.join() === 'u1,u3,u4,u2', r);
    await pg.evaluate(() => { const a = document.querySelector('.sch-modal .sjkAdd[data-id="u1"]'); a.click(); }); await sleep(900);
    r = await pg.evaluate(() => /On this job \(1\)/.test(document.querySelector('.sch-modal #sjKeys').innerText));
    check('Scheduler quick form: + Add on a universal key puts it on the job', r === true, r);
    await pg.evaluate(() => { const c = document.querySelector('.sch-modal .modal-close, .sch-modal [data-close], .sch-modal #sjCancel'); if (c) c.click(); }); await sleep(300);

    // ================= 4. Inventory count + item form =================
    await pg.goto(BASE + 'index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500);
    const need = () => pg.evaluate(() => TKS.Inventory.all().filter(invNeedsFcc).map(p => p.id).sort());
    let n0 = await need();
    check('Inventory: universal items (smart key u1, flip u2, transponder u3) are never "missing FCC ID / chip"; the plain smart key with no FCC ID is', n0.indexOf('u1') < 0 && n0.indexOf('u2') < 0 && n0.indexOf('u3') < 0 && n0.indexOf('u4') < 0 && n0.indexOf('nf1') >= 0, n0);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(1200);
    const tile = () => pg.evaluate(() => { const t = document.getElementById('invFccNudge'); return t ? parseInt(t.querySelector('b').innerText, 10) : 0; });
    const t0 = await tile();
    check('Inventory screen: the "missing FCC ID / chip" tile count equals the list', t0 === n0.length && t0 > 0, { t0, n0 });
    // open nf1 → Universal → save
    await pg.evaluate(() => openPart('nf1')); await sleep(600);
    const form = () => pg.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; }; const un = document.getElementById('pUnivNote');
      return { fcc: vis('pFccWrap'), chip: vis('pChipWrap'), note: un && un.offsetParent !== null ? un.innerText : null, grade: document.getElementById('pGrade').value, fccVal: document.getElementById('pFcc').value, chipVal: document.getElementById('pChip').value }; });
    const setGrade = async (v) => { await pg.evaluate(v => { const g = document.getElementById('pGrade'); g.value = v; g.dispatchEvent(new Event('change', { bubbles: true })); }, v); await sleep(300); };
    let f = await form();
    check('item form (Aftermarket smart key): FCC ID box shows, no universal line', f.fcc === true && f.note === null, f);
    await pg.evaluate(() => { const e = document.getElementById('pFcc'); e.value = 'typed123'; e.dispatchEvent(new Event('input', { bubbles: true })); });
    await setGrade('Universal'); f = await form();
    check('item form: Category Universal hides the FCC ID and chip boxes and shows "Universal key — no FCC ID or chip needed."', f.fcc === false && f.chip === false && f.note === 'Universal key — no FCC ID or chip needed.', f);
    await pg.evaluate(() => document.getElementById('pGrade').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'universal-item-form-phone.png') });
    await setGrade('Aftermarket'); f = await form();
    check('item form: switching back shows the boxes again with what was typed (and no universal line)', f.fcc === true && f.note === null && f.fccVal === 'typed123', f);
    await setGrade('Universal');
    await pg.evaluate(() => { document.getElementById('pSave').click(); }); await sleep(1500);
    const saved = await pg.evaluate(() => { const p = TKS.Inventory.get('nf1'); return { grade: p.grade, fcc: p.fccId, chip: p.chip, category: p.category }; });
    check('edit + save as Universal: the grade is saved; fccId is what was typed ("TYPED123"), chip stays empty — the word "universal" is never written into either', saved.grade === 'Universal' && saved.fcc === 'TYPED123' && saved.chip === '' && !/univ/i.test(saved.fcc + saved.chip), saved);
    let n1 = await need();
    check('Inventory: after nf1 became Universal, it left the "missing FCC ID / chip" list (count drops by 1)', n1.length === n0.length - 1 && n1.indexOf('nf1') < 0, { n0, n1 });
    // second save of the already-universal item without touching the boxes → fccId unchanged
    await pg.evaluate(() => openPart('u1')); await sleep(600); f = await form();
    check('opening an existing Universal item shows the quiet line, no boxes', f.grade === 'Universal' && f.fcc === false && f.chip === false && !!f.note, f);
    await pg.evaluate(() => { const e = document.getElementById('pNotes'); e.value = 'TEST note'; document.getElementById('pSave').click(); }); await sleep(1500);
    const u1 = await pg.evaluate(() => { const p = TKS.Inventory.get('u1'); return { grade: p.grade, fcc: p.fccId, chip: p.chip, notes: p.notes }; });
    check('edit-save of a Universal item keeps fccId / chip exactly as they were (both empty)', u1.grade === 'Universal' && u1.fcc === '' && u1.chip === '', u1);
    // add path
    await pg.evaluate(() => openPart(null)); await sleep(600);
    await pg.evaluate(() => { const set = (id, v, ev) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event(ev || 'input', { bubbles: true })); };
      set('pName', 'TEST Brand New Universal Remote'); set('pGrade', 'Universal', 'change'); });
    await sleep(400);
    await pg.evaluate(() => { const ss = document.getElementById('pSub'); const o = Array.from(ss.options).find(x => /Remote Head/.test(x.value)); if (o) { ss.value = o.value; ss.dispatchEvent(new Event('change', { bubbles: true })); } }); await sleep(300);
    f = await form();
    check('add form: Universal + sub-category Remote Head / Flip → boxes hidden, line shown', f.grade === 'Universal' && f.fcc === false && f.chip === false && !!f.note, f);
    const auto = await pg.evaluate(() => ({ brandWrap: document.getElementById('pBrandWrap').style.display, brandOpts: document.getElementById('pBrand').options.length, pAutoSync: typeof pAutoSync }));
    check('add form: the Brand box still follows the Universal category and pAutoSync still exists', auto.brandWrap !== 'none' && auto.brandOpts > 1 && auto.pAutoSync === 'function', auto);
    await pg.evaluate(() => { document.getElementById('pSell').value = '80'; document.getElementById('pSave').click(); }); await sleep(1500);
    const added = await pg.evaluate(() => { const p = TKS.Inventory.all().find(x => x.name === 'TEST Brand New Universal Remote'); return p && { grade: p.grade, fcc: p.fccId, chip: p.chip, category: p.category }; });
    check('add + save a Universal item: grade Universal, FCC ID and chip left empty (not the word "universal")', !!added && added.grade === 'Universal' && added.fcc === '' && added.chip === '' && /^Keys\//.test(added.category), added);
    // Fits box still usable, auto-pricing hint still renders without error
    await pg.evaluate(() => openPart('tk1')); await sleep(500); f = await form();
    check('an ordinary (Aftermarket) smart key still shows its FCC ID and chip boxes', f.fcc === true && f.chip === true && f.note === null, f);
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 }); await sleep(200);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.stack || e)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
