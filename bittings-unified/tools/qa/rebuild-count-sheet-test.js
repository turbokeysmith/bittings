// 8z135 — the stock-count sheet (Inventory → Reconcile): every number typed is saved, in order, and a failed save is loud.
// Standalone: loads app/inventory-traceability.js into a bare page with a fake cloud. Port 8102.
const http = require('http'), fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8102;
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info)); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PAGE = `<!doctype html><meta charset="utf-8"><body>
<div id="rcStatus"></div><div id="rcSummary"></div>
<select id="rcLoc"></select><select id="rcAssign"></select><button id="rcStart">Start</button><button id="rcFinish">Finish</button><button id="rcCancel">Cancel</button>
<div id="rcCountList"></div>
<script>
  window.FAKE = { role: 'technician', calls: [], stored: {}, live: {}, maxLive: {}, failItem: null, delays: {} , n: 0 };
  function chain(table){ var q = { select: function(){ return q; }, eq: function(){ return q; }, is: function(){ return q; }, order: function(){ return q; }, limit: function(){ return q; },
    then: function (res, rej){ var d = [];
      if (table === 'staff') d = [{ user_id: 'me', name: 'TEST Tech', role: 'technician' }];
      if (table === 'cycle_counts') d = [{ id: 'c1', assigned_to: 'me', created_at: '2026-11-13T15:00:00Z', location: 'shop', submitted_at: null, submitted_by: null }];
      if (table === 'inventory_locations') d = [
        { item_id: 'a', qty: 2, inventory: { name: 'TEST key A', sku: 'TEST-A', deleted_at: null, category: 'Keys/Smart Key', fcc_id: 'X1', chip: '', fitment: 'Toyota', brand: '', image: null } },
        { item_id: 'b', qty: 5, inventory: { name: 'TEST key B', sku: 'TEST-B', deleted_at: null, category: 'Keys/Smart Key', fcc_id: 'X2', chip: '', fitment: 'Ford', brand: '', image: null } },
        { item_id: 'c', qty: 1, inventory: { name: 'TEST key C', sku: 'TEST-C', deleted_at: null, category: 'Keys/Smart Key', fcc_id: 'X3', chip: '', fitment: 'Honda', brand: '', image: null } }];
      if (table === 'inventory') d = [
        { id: 'a', name: 'TEST key A', sku: 'TEST-A', deleted_at: null, merged_into: null, category: 'Keys/Smart Key', fcc_id: 'X1', chip: '', fitment: 'Toyota' },
        { id: 'n', name: 'TEST new key (no shop record)', sku: 'TEST-N', deleted_at: null, merged_into: null, category: 'Keys/Smart Key', fcc_id: 'X9', chip: '', fitment: 'BMW' },
        { id: 'm', name: 'TEST merged-away key', sku: 'TEST-M', deleted_at: null, merged_into: 'a', category: 'Keys/Smart Key', fcc_id: '', chip: '', fitment: '' }];
      return Promise.resolve({ data: d, error: null }).then(res, rej); } }; return q; }
  var cloud = { from: chain, auth: { getUser: function(){ return Promise.resolve({ data: { user: { id: 'me' } } }); } },
    rpc: function (name, a){
      if (name === 'current_staff_role') return Promise.resolve({ data: FAKE.role, error: null });
      if (name === 'cycle_save_line') { var k = a.p_item, i = ++FAKE.n; FAKE.live[k] = (FAKE.live[k] || 0) + 1; FAKE.maxLive[k] = Math.max(FAKE.maxLive[k] || 0, FAKE.live[k]);
        var d = (FAKE.delays[k] || []).shift(); if (d == null) d = 20;
        return new Promise(function (res){ setTimeout(function (){ FAKE.live[k]--;
          if (FAKE.failItem === k) { FAKE.calls.push({ name: name, item: k, failed: true }); return res({ data: null, error: { message: 'a discrepancy reason is required' } }); }
          FAKE.stored[k] = { counted: a.p_counted, reason: a.p_reason }; FAKE.calls.push({ name: name, item: k, counted: a.p_counted, reason: a.p_reason }); res({ data: null, error: null }); }, d); }); }
      FAKE.calls.push({ name: name }); return Promise.resolve({ data: {}, error: null }); } };
  window.TKS = { _sb: function(){ return cloud; } };
</script>
<script src="/app/inventory-traceability.js"></script></body>`;
const srv = http.createServer((q, s) => { const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/t.html') { s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return s.end(PAGE); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); s.end(d); }); });
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' }); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  try {
    await pg.goto('http://127.0.0.1:' + PORT + '/t.html', { waitUntil: 'networkidle0' });
    await pg.evaluate(() => window.renderReconcile()); await sleep(300);
    let r = await pg.evaluate(() => ({ rows: [].map.call(document.querySelectorAll('#rcCountList .crow'), x => x.dataset.item + ':' + x.dataset.exp), done: !!document.getElementById('rcDone') }));
    check('the Shop sheet lists every part — also one with no shop stock record yet (expected 0); a merged-away part is not on it', r.rows.slice().sort().join() === 'a:2,b:5,c:1,n:0' && r.done, r);

    // quick taps: the cloud answers the FIRST save slowest — an older number must never land last
    await pg.evaluate(() => { FAKE.delays.a = [400, 300, 200, 100, 10]; const row = document.querySelector('.crow[data-item="a"]'), plus = row.querySelector('.rcpm[data-d="1"]'); for (let i = 0; i < 5; i++) plus.click(); });
    await sleep(1500);
    r = await pg.evaluate(() => ({ stored: FAKE.stored.a, maxLive: FAKE.maxLive.a, calls: FAKE.calls.filter(c => c.item === 'a').length, shown: document.querySelector('.crow[data-item="a"] .rccount').value, tick: !!document.querySelector('.crow[data-item="a"] .rcok'), reason: document.querySelector('.crow[data-item="a"] .rcreason').value, unsaved: document.querySelector('.crow[data-item="a"]').dataset.unsaved }));
    check('five quick taps on +: what the cloud holds is the number on screen (7), saves for one part never overlap, and the ✓ shows', r.stored && r.stored.counted === 7 && r.shown === '7' && r.maxLive === 1 && r.calls <= 2 && r.tick && r.unsaved === '0', r);
    check('a changed count with no reason picked is saved as "Miscount" (it used to be refused without a word)', r.stored && r.stored.reason === 'miscount' && r.reason === 'miscount', r);

    // a number typed in, then changed again while the first save is still on its way
    await pg.evaluate(() => { FAKE.delays.b = [300, 10]; const row = document.querySelector('.crow[data-item="b"]'), inp = row.querySelector('.rccount'); inp.value = '9'; inp.onchange(); });
    await sleep(260);
    await pg.evaluate(() => { const row = document.querySelector('.crow[data-item="b"]'), inp = row.querySelector('.rccount'); inp.value = '3'; inp.onchange(); });
    await sleep(900);
    r = await pg.evaluate(() => ({ stored: FAKE.stored.b, maxLive: FAKE.maxLive.b }));
    check('changing a number while its first save is still travelling: the second number is what ends up saved', r.stored && r.stored.counted === 3 && r.maxLive === 1, r);

    // the new part with no shop record can be counted
    await pg.evaluate(() => { const row = document.querySelector('.crow[data-item="n"]'), inp = row.querySelector('.rccount'); inp.value = '4'; inp.onchange(); });
    await sleep(500);
    r = await pg.evaluate(() => FAKE.stored.n);
    check('a part with no shop stock record can be counted (4 saved, expected 0)', r && r.counted === 4 && r.reason === 'miscount', r);

    // a save the cloud refuses: said on the row, and Done will not send
    await pg.evaluate(() => { FAKE.failItem = 'c'; FAKE.calls.length = 0; const row = document.querySelector('.crow[data-item="c"]'); row.querySelector('.rcpm[data-d="1"]').click(); });
    await sleep(500);
    r = await pg.evaluate(() => { const row = document.querySelector('.crow[data-item="c"]'); return { err: (row.querySelector('.rcerr') || {}).textContent || '', tick: !!row.querySelector('.rcok'), unsaved: row.dataset.unsaved }; });
    check('a save the cloud refuses is said on the row in words ("Not saved …"), with no ✓', /Not saved: a discrepancy reason is required/.test(r.err) && !r.tick && r.unsaved === '1', r);
    await pg.evaluate(() => document.getElementById('rcDone').click()); await sleep(400);
    r = await pg.evaluate(() => ({ submit: FAKE.calls.filter(c => c.name === 'cycle_submit').length, status: document.getElementById('rcStatus').textContent }));
    check('"Done — send to manager" refuses while a part is unsaved, and says how many', r.submit === 0 && /1 part did not save/.test(r.status), r);

    // fixed → Done sends, and a tap made a moment before Done is saved BEFORE the count is sent
    await pg.evaluate(() => { FAKE.failItem = null; FAKE.calls.length = 0; FAKE.delays.c = [150]; document.querySelector('.crow[data-item="c"] .rcpm[data-d="1"]').click(); document.getElementById('rcDone').click(); });
    await sleep(900);
    r = await pg.evaluate(() => ({ order: FAKE.calls.map(c => c.name + (c.item ? ':' + c.item + '=' + c.counted : '')), stored: FAKE.stored.c, err: !!document.querySelector('.crow[data-item="c"] .rcerr') }));
    check('once it saves, Done sends — and the tap made just before Done is saved first (save, then send)', r.order.join() === 'cycle_save_line:c=3,cycle_submit' && r.stored.counted === 3, r);
    check('no script errors', errs.length === 0, errs);
  } catch (e) { fails++; console.log('CRASH ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
