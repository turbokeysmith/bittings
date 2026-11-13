// Browser test of Inventory → "🧹 Find duplicates" (app/inventory-dupes.js): the finder (table of cases), the owner / manager
// button, the review sheet (reason, Not the same, Same — keep this one, server error, demo), phone 390px and a PC screenshot.
// The three server functions (dupe_decisions / dupe_decide / inventory_merge) are stubbed inside the page; nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
const PORT = 8099, BASE = 'http://127.0.0.1:' + PORT + '/';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
function check(name, ok, detail) { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 800))); if (!ok) failed++; }

const iso = new Date(Date.now() - 20 * 60000).toISOString();
const row = (id, name, over) => Object.assign({ id, name, sku: '', category: 'Keys/Smart Key', qty: 0, low_at: 0, unit: '', cost: 20, location: '', notes: '', supplier: '', reorder_qty: 0, fitment: '', fcc_id: '', chip: '', grade: 'Aftermarket', brand: '', vendor_sku: '', sell_price_cents: 4500, serialized: false, deleted_at: null, updated_at: iso, created_at: iso }, over);
const INV = [
  row('tst_a', 'TEST Ford 5-Button Smart Key', { sku: 'TST-100', fcc_id: 'M3N-A2C93142600', qty: 0, location: 'Bin 4' }),
  row('tst_b', 'TEST Ford 5 BTN Smart Key (alt)', { sku: 'TST-200', fcc_id: 'M3N A2C93142600', qty: 3, cost: 0, sell_price_cents: null }),
  row('tst_c', 'TEST Civic Remote 13-15', { category: 'Keys/Remote / Fob', sku: 'TST-C1', qty: 0 }),
  row('tst_d', 'TEST Civic Remote 2013-2015', { category: 'Keys/Remote / Fob', sku: 'TST-D1', qty: 0 }),
  row('tst_e', 'TEST Lonely Garage Remote', { category: 'Keys/Remote / Fob', sku: 'TST-E1', qty: 5, fcc_id: 'ZZZ999' }),
];

// ---- the finder: a table of cases, run inside the page against made-up items
const K = (id, name, over) => Object.assign({ id, name, sku: 'S-' + id, category: 'Keys/Smart Key', grade: 'Aftermarket', fccId: '', chip: '', vendorSku: '', supplier: '', qty: 0, fitment: '' }, over);
const CASES = [
  { n: 'same FCC ID + same type + same grade → strong', items: [K('1', 'Alpha Key', { fccId: 'abc-123' }), K('2', 'Beta Key', { fccId: 'ABC 123' })], want: [{ s: 'strong', ids: '1|2', reason: /Same FCC ID and both are smart keys/ }] },
  { n: 'OEM vs aftermarket with the same FCC ID → not paired at all (never strong)', items: [K('1', 'Alpha Key', { fccId: 'ABC123', grade: 'OEM New' }), K('2', 'Beta Key', { fccId: 'ABC123', grade: 'Aftermarket' })], want: [] },
  { n: 'same FCC ID but a different sub-category → not paired', items: [K('1', 'Alpha', { fccId: 'ABC123' }), K('2', 'Beta', { fccId: 'ABC123', category: 'Keys/Remote / Fob' })], want: [] },
  { n: '4-button vs 5-button with the same FCC ID → not paired', items: [K('1', 'Ford 4-Button Smart Key', { fccId: 'ABC123' }), K('2', 'Ford 5 BTN Smart Key', { fccId: 'ABC123' })], want: [] },
  { n: '"5-Button" and "5B" count as the same button count → strong, reason names it', items: [K('1', 'Ford 5-Button Key', { fccId: 'ABC123' }), K('2', 'Ford Key 5B', { fccId: 'ABC123' })], want: [{ s: 'strong', ids: '1|2', reason: /5-button smart keys/ }] },
  { n: 'names "13-15" vs "2013-2015" → medium', items: [K('1', 'Honda Civic 13-15 Remote', { category: 'Keys/Remote / Fob' }), K('2', 'Honda Civic 2013-2015 Remote', { category: 'Keys/Remote / Fob' })], want: [{ s: 'medium', ids: '1|2', reason: /names are the same/ }] },
  { n: 'names that differ only in punctuation and spacing → medium', items: [K('1', 'Toyota  Camry, Smart-Key'), K('2', 'toyota camry smart key')], want: [{ s: 'medium', ids: '1|2' }] },
  { n: 'different top category is never paired (same SKU and name)', items: [K('1', 'Same Thing', { sku: 'AB-777' }), K('2', 'Same Thing', { sku: 'AB-777', category: 'Accessories/Key Ring' })], want: [] },
  { n: 'identical SKU with different capitals / dashes / spaces → strong', items: [K('1', 'One', { sku: 'ab-123 x' }), K('2', 'Two', { sku: 'AB123X' })], want: [{ s: 'strong', ids: '1|2', reason: /SKU is the same/ }] },
  { n: 'same SKU but one is OEM and one aftermarket → medium, never strong', items: [K('1', 'One', { sku: 'QQ-5000', grade: 'OEM New' }), K('2', 'Two', { sku: 'QQ5000' })], want: [{ s: 'medium', ids: '1|2' }] },
  { n: 'same supplier part number from the same supplier → strong; from a different supplier → not paired', items: [K('1', 'One', { vendorSku: 'V-9001', supplier: 'Acme' }), K('2', 'Two', { vendorSku: 'v9001', supplier: 'ACME' }), K('3', 'Three', { vendorSku: 'V9001', supplier: 'Other Co' })], want: [{ s: 'strong', ids: '1|2' }] },
  { n: 'transponders: same chip + same blade → medium', items: [K('1', 'Toyota TOY43 Transponder', { category: 'Keys/Transponder', chip: '4D-67' }), K('2', 'Transponder Key TOY43 blade', { category: 'Keys/Transponder', chip: '4d67' })], want: [{ s: 'medium', ids: '1|2', reason: /Same chip and same blade \(TOY43\)/ }] },
  { n: 'transponders with the same chip but a different blade → not paired', items: [K('1', 'Toyota TOY43 Transponder', { category: 'Keys/Transponder', chip: '4D67' }), K('2', 'Toyota TOY48 Transponder', { category: 'Keys/Transponder', chip: '4D67' })], want: [] },
  { n: 'a removed (deleted) item is ignored', items: [K('1', 'One', { sku: 'DEL-1' }), K('2', 'Two', { sku: 'DEL-1', deletedAt: '2026-11-01' })], want: [] },
  { n: 'too-short SKUs and empty FCC IDs do not pair anything', items: [K('1', 'One', { sku: 'A1' }), K('2', 'Two', { sku: 'A1' })], want: [] },
  { n: 'strong groups come first, then more out-of-stock items first', items: [K('1', 'Plain A name', { category: 'Keys/Remote / Fob', sku: 'P1', qty: 5 }), K('2', 'Plain A name', { category: 'Keys/Remote / Fob', sku: 'P2', qty: 5 }),
    K('3', 'Other Thing', { sku: 'XX-9' , fccId: 'FCC9999', qty: 0 }), K('4', 'Other Item', { sku: 'XX 9', fccId: 'FCC9999', qty: 1 })], want: [{ s: 'strong', ids: '3|4' }, { s: 'medium', ids: '1|2' }] },
  { n: 'a "not the same" pair is left out', items: [K('1', 'One', { sku: 'ZZ-100' }), K('2', 'Two', { sku: 'ZZ100' })], decided: [{ a: '2', b: '1' }], want: [] },
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
    const seed = async (role, signedIn) => {
      await pg.goto(BASE + 'seed.html');
      await pg.evaluate((UID, INV, role, signedIn) => {
        localStorage.clear();
        if (signedIn) {
          const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: INV[0].updated_at, data: { taxRate: 8.625, identity: { name: 'TEST Shop' }, taxableByCategory: {} } }];
          localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: INV, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
          localStorage.setItem('__role', role);
          localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
        }
        localStorage.setItem('bt_theme', 'dark');
        if (!signedIn) { localStorage.setItem('tks_demo_mode', '1'); localStorage.setItem('tks_demo_role', 'owner'); localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: 'demo-user', email: 'demo@example.com' } })); }
      }, UID, INV, role, signedIn);
    };
    const ready = async (cloud) => { await pg.goto(BASE + 'index.html?go=inventory', { waitUntil: 'domcontentloaded' });
      if (cloud) await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); else await pg.waitForFunction(() => window.TKS_DUPES && window.TKS, { timeout: 15000 });
      await sleep(2600); };
    // the three server functions, standing in inside the page; decisions survive a reload (kept in localStorage like a table would be)
    const stub = () => pg.evaluate(() => { const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__rpcLog = []; window.__mergeFail = false; window.__toasts = [];
      try { const t = TKS_ACCESS.toast; TKS_ACCESS.toast = function (m) { window.__toasts.push(String(m)); return t && t.apply(this, arguments); }; } catch (e) {}
      sb.rpc = function (name, args) {
        if (name === 'dupe_decisions') { window.__rpcLog.push({ name }); return Promise.resolve({ data: JSON.parse(localStorage.getItem('__decs') || '[]'), error: null }); }
        if (name === 'dupe_decide') { window.__rpcLog.push({ name, args }); const l = JSON.parse(localStorage.getItem('__decs') || '[]'); const a = args.p_a < args.p_b ? args.p_a : args.p_b, c = args.p_a < args.p_b ? args.p_b : args.p_a;
          l.push({ a, b: c, decision: 'different' }); localStorage.setItem('__decs', JSON.stringify(l)); return Promise.resolve({ data: { ok: true }, error: null }); }
        if (name === 'inventory_merge') { window.__rpcLog.push({ name, args });
          if (window.__mergeFail) return Promise.resolve({ data: null, error: { message: 'one of these items was already removed — refresh and look again' } });
          const d = JSON.parse(localStorage.getItem('__db')); const k = d.inventory.find(x => x.id === args.p_keep), x = d.inventory.find(y => y.id === args.p_drop);
          const moved = x.qty; k.qty += x.qty; x.qty = 0; x.deleted_at = new Date().toISOString(); k.updated_at = x.updated_at = new Date().toISOString(); localStorage.setItem('__db', JSON.stringify(d));
          return Promise.resolve({ data: { ok: true, kept: args.p_keep, dropped: args.p_drop, pieces_moved: moved }, error: null }); }
        return real(name, args); }; });
    const sheet = () => pg.evaluate(() => { const o = document.getElementById('dupeOv'); if (!o) return null; const m = o.querySelector('.dupe-modal');
      return { head: document.getElementById('dupeHead').innerText, text: o.querySelector('.dupe-body').innerText, names: Array.from(o.querySelectorAll('.dupe-card h3')).map(h => h.innerText),
        btns: Array.from(o.querySelectorAll('button')).filter(x => x.offsetParent).map(x => x.innerText.trim()), over: m.scrollWidth - m.clientWidth, docOver: document.documentElement.scrollWidth - innerWidth }; });
    const click = (sel) => pg.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return false; el.click(); return true; }, sel);
    const clickText = (txt) => pg.evaluate((txt) => { const bs = Array.from(document.querySelectorAll('#dupeOv button')).filter(x => x.offsetParent && x.innerText.trim() === txt); if (!bs.length) return false; bs[0].click(); return true; }, txt);
    const topConfirm = () => pg.evaluate(() => { const o = Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').pop(); return o ? { text: o.innerText, yes: !!o.querySelector('[data-yes]') } : null; });
    const log = () => pg.evaluate(() => window.__rpcLog.filter(x => x.name !== 'dupe_decisions'));
    let r;

    // ================= the finder =================
    await seed('owner', true); await ready(true); await stub();
    for (const c of CASES) {
      r = await pg.evaluate((c) => TKS_DUPES.find(c.items, { decided: c.decided }).map(g => ({ s: g.strength, ids: g.items.map(i => i.id).join('|'), reason: g.reason })), c);
      const ok = r.length === c.want.length && c.want.every((w, i) => r[i].s === w.s && r[i].ids === w.ids && (!w.reason || w.reason.test ? true : true));
      const reasonOk = c.want.every((w, i) => !w.reason || (r[i] && w.reason.test(r[i].reason)));
      check('finder: ' + c.n, ok && reasonOk, r);
    }
    // (regexes cannot cross into the page, so reasons are checked here, on the result)
    r = await pg.evaluate(() => { const items = []; for (let i = 0; i < 600; i++) items.push({ id: 'p' + i, name: 'TEST Part ' + (i % 450), sku: 'SK-' + (i % 500), category: i % 3 ? 'Keys/Smart Key' : 'Keys/Remote / Fob', grade: i % 2 ? 'OEM New' : 'Aftermarket', fccId: 'F' + (i % 300), qty: i % 4 });
      const t = performance.now(); const a = TKS_DUPES.find(items), t1 = performance.now() - t; const b2 = TKS_DUPES.find(items);
      return { ms: Math.round(t1), groups: a.length, same: JSON.stringify(a.map(g => g.id)) === JSON.stringify(b2.map(g => g.id)) }; });
    check('finder: 600 items is fast (under 500 ms) and gives the same answer twice', r.ms < 500 && r.same && r.groups > 0, r);

    // ================= the button =================
    await pg.evaluate(() => { document.querySelector('.bt-nav__item[data-go="inventory"]') && document.querySelector('.bt-nav__item[data-go="inventory"]').click(); }); await sleep(400);
    r = await pg.evaluate(() => { const b = document.getElementById('invDupes'); return { there: !!b, shown: !!(b && b.offsetParent) && getComputedStyle(b).display !== 'none', text: b && b.innerText.trim(), h: b && b.getBoundingClientRect().height }; });
    check('owner sees the "🧹 Find duplicates" button on the Inventory screen', r.shown && /Find duplicates/.test(r.text) && r.h >= 43.5, r);
    await seed('manager', true); await ready(true);
    r = await pg.evaluate(() => { const b = document.getElementById('invDupes'); return !!(b && b.offsetParent) && getComputedStyle(b).display !== 'none'; });
    check('a manager sees the button too', r === true, r);
    await seed('technician', true); await ready(true);
    r = await pg.evaluate(() => { const b = document.getElementById('invDupes'); return { there: !!b, shown: !!(b && b.offsetParent) && getComputedStyle(b).display !== 'none', role: TKS.auth && TKS.auth.role && TKS.auth.role() }; });
    check('a technician does not see the button', r.there && !r.shown, r);

    // ================= the sheet (owner, live, stubbed server) =================
    await seed('owner', true); await ready(true); await stub();
    await click('#invDupes'); await sleep(900);
    r = await sheet();
    check('opens full-height with the number of groups: "2 possible duplicate groups"', r && /2 possible duplicate groups/.test(r.head), r);
    check('the strong group comes first and says why in plain words', r && /Same FCC ID and both are 5-button smart keys\./i.test(r.text) && /strong match/i.test(r.text), r && r.text);
    check('both items are shown with name, SKU, type, FCC ID, stock, cost, price and bin', r && r.names.length === 2 && /Same|Ford/.test(r.names[0]) && /TST-100/.test(r.text) && /TST-200/.test(r.text) && /Smart Key · AM/.test(r.text) && /M3N-A2C93142600/.test(r.text) && /Bin 4/.test(r.text) && /\$45\.00/.test(r.text), r && r.text);
    check('buttons: Same — keep this one (x2), Not the same, Skip for now', r && r.btns.filter(x => x === 'Same — keep this one').length === 2 && r.btns.indexOf('Not the same') >= 0 && r.btns.indexOf('Skip for now') >= 0, r && r.btns);
    r = await pg.evaluate(() => { const bs = Array.from(document.querySelectorAll('#dupeOv button')).filter(x => x.offsetParent); const modal = document.querySelector('.dupe-modal').getBoundingClientRect(); const cards = Array.from(document.querySelectorAll('.dupe-card')).map(c => c.getBoundingClientRect());
      return { small: bs.filter(x => x.getBoundingClientRect().height < 43.5).map(x => x.innerText + ':' + Math.round(x.getBoundingClientRect().height)), over: document.querySelector('.dupe-modal').scrollWidth - document.querySelector('.dupe-modal').clientWidth, docOver: document.documentElement.scrollWidth - innerWidth,
        stacked: cards.length === 2 && cards[1].top >= cards[0].bottom - 1, modalH: Math.round(modal.height), vh: innerHeight }; });
    check('phone 390px: no sideways scroll, every button at least 44px, the two items stack', r.small.length === 0 && r.over <= 0 && r.docOver <= 0 && r.stacked && r.modalH > 500, r);
    await pg.screenshot({ path: path.join(OUT, 'dupes-phone.png') });
    // skip
    await clickText('Skip for now'); await sleep(300); r = await sheet();
    check('"Skip for now" moves on to the next group without saving anything', /Civic/.test(r.names.join(' ')) && /possible match/i.test(r.text) && (await log()).length === 0, { r: r.text, l: await log() });
    // not the same on the medium group
    r = await sheet(); check('the medium group says the names match once years are ignored', /names are the same/.test(r.text), r.text);
    // keep: cancel then server error then ok — on the strong group (skip back to it)
    await clickText('Not the same'); await sleep(500);
    let l = await log();
    check('"Not the same" calls dupe_decide with both ids and "different"', l.length === 1 && l[0].name === 'dupe_decide' && [l[0].args.p_a, l[0].args.p_b].sort().join() === 'tst_c,tst_d' && l[0].args.p_decision === 'different', l);
    r = await sheet();
    check('after it the pair is gone; the skipped strong group is still waiting ("1 possible duplicate group")', /1 possible duplicate group\b/.test(r.head), r.head);
    r = await sheet(); check('the list now offers the skipped group again', /every group for now|Group 1 of 1/.test(r.text), r.text);
    if (/every group for now/.test(r.text)) { await clickText('Look at the skipped ones again'); await sleep(300); }
    r = await sheet(); check('the strong group is back on screen', /Same FCC ID/.test(r.text), r.text);
    // cancel the confirm
    await pg.evaluate(() => document.querySelectorAll('#dupeOv [data-keep]')[1].click()); await sleep(300);
    r = await topConfirm();
    check('"Same — keep this one" asks first and says the other one is removed and its stock/details move', r && r.yes && /Keep “TEST Ford 5 BTN Smart Key \(alt\)”/.test(r.text) && /“TEST Ford 5-Button Smart Key”/.test(r.text) && /removed from the list/.test(r.text) && /0 in stock/.test(r.text), r);
    await pg.screenshot({ path: path.join(OUT, 'dupes-confirm-phone.png') });
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).pop().querySelector('[data-no]').click()); await sleep(300);
    check('cancelling the confirm calls nothing', (await log()).filter(x => x.name === 'inventory_merge').length === 0, await log());
    // server error
    await pg.evaluate(() => { window.__mergeFail = true; document.querySelectorAll('#dupeOv [data-keep]')[1].click(); }); await sleep(300);
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).pop().querySelector('[data-yes]').click()); await sleep(600);
    const before = await pg.evaluate(() => JSON.parse(localStorage.getItem('__db')).inventory.map(x => x.id + ':' + x.qty + ':' + (x.deleted_at ? 'gone' : 'ok')).join());
    r = await pg.evaluate(() => { const o = Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').pop(); return o ? o.innerText : null; });
    check('a server error is shown in plain words: "Nothing was changed. …"', r && /Nothing was changed\./.test(r) && /already removed/.test(r), r);
    check('…and nothing changed (both items still there, same stock, still on the sheet)', /tst_a:0:ok,tst_b:3:ok/.test(before) && (await sheet()).names.length === 2, before);
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').forEach(o => o.querySelector('button').click())); await sleep(300);
    // success
    await pg.evaluate(() => { window.__mergeFail = false; window.__rpcLog.length = 0; document.querySelectorAll('#dupeOv [data-keep]')[1].click(); }); await sleep(300);
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).pop().querySelector('[data-yes]').click()); await sleep(1800);
    l = await log();
    check('"Same — keep this one" calls inventory_merge with the kept item as keep and the other as drop', l.length === 1 && l[0].name === 'inventory_merge' && l[0].args.p_keep === 'tst_b' && l[0].args.p_drop === 'tst_a', l);
    r = await pg.evaluate(() => ({ toasts: window.__toasts.slice(), inv: TKS.Inventory.all().map(x => x.id + ':' + x.qty).sort().join() }));
    check('a toast says it was merged, and the inventory list refreshed (the removed item is gone)', r.toasts.some(t => /Merged/.test(t)) && r.inv.indexOf('tst_a') < 0 && /tst_b:3/.test(r.inv), r);
    r = await sheet(); check('then it moves on: nothing left to look at', /No possible duplicates/.test(r.head), r && r.head);
    await pg.screenshot({ path: path.join(OUT, 'dupes-done-phone.png') });
    // reopen / reload: the pair marked "not the same" stays gone (and the merged one too)
    await click('#dupeOv [data-x]'); await sleep(200);
    check('closing removes the sheet', (await sheet()) === null, null);
    await click('#invDupes'); await sleep(800); r = await sheet(); check('reopening: still no duplicates (the "not the same" pair does not come back)', /No possible duplicates/.test(r.head), r && r.head);
    await click('#dupeOv [data-x]');
    await ready(true); await stub(); await click('#invDupes'); await sleep(800); r = await sheet();
    check('after reloading the app: the decision is read back from the server and the pair stays gone', /No possible duplicates/.test(r.head) && (await pg.evaluate(() => window.__rpcLog.some(x => x.name === 'dupe_decisions'))), r && r.head);
    await click('#dupeOv [data-x]');

    // ================= not signed in / demo =================
    await seed('owner', false); await ready(false);
    await pg.evaluate(() => { TKS.Inventory.save({ id: 'tst_x', name: 'TEST Demo Key One', sku: 'DEMO-100', category: 'Keys/Smart Key', grade: 'Aftermarket', qty: 0 }); TKS.Inventory.save({ id: 'tst_y', name: 'TEST Demo Key Two', sku: 'demo 100', category: 'Keys/Smart Key', grade: 'Aftermarket', qty: 2 }); });
    await click('#invDupes'); await sleep(600); r = await sheet();
    check('demo / signed out: finding still works', r && /1 possible duplicate group/.test(r.head) && /SKU is the same/.test(r.text), r && r.text);
    await clickText('Not the same'); await sleep(400);
    r = await pg.evaluate(() => { const o = Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').pop(); return o ? o.innerText : null; });
    check('demo: "Not the same" explains it needs the live app', r && /live/i.test(r), r);
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').forEach(o => o.querySelector('button').click())); await sleep(200);
    await pg.evaluate(() => document.querySelectorAll('#dupeOv [data-keep]')[0].click()); await sleep(300);
    r = await pg.evaluate(() => { const o = Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').pop(); return o ? { t: o.innerText, merge: !!o.querySelector('[data-yes]') } : null; });
    check('demo: "Same — keep this one" explains it needs the live app (no merge offered)', r && /live/i.test(r.t) && !r.merge, r);

    // ================= PC =================
    await pg.evaluate(() => Array.from(document.querySelectorAll('.chg-modal-ov')).filter(x => x.id !== 'dupeOv').forEach(o => o.querySelector('button').click()));
    await click('#dupeOv [data-x]');
    await seed('owner', true); await pg.setViewport({ width: 1366, height: 800 }); await pg.evaluate(() => localStorage.setItem('bt_theme', 'light'));
    await ready(true); await stub(); await click('#invDupes'); await sleep(900);
    r = await sheet(); check('PC: the two items sit side by side, no sideways scroll', await pg.evaluate(() => { const c = Array.from(document.querySelectorAll('.dupe-card')).map(x => x.getBoundingClientRect()); return c.length === 2 && Math.abs(c[0].top - c[1].top) < 2 && document.documentElement.scrollWidth - innerWidth <= 0; }), r && r.names);
    await pg.screenshot({ path: path.join(OUT, 'dupes-pc.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 3));
  } finally { await b.close(); srv.close(); }
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
