// Tests app/store.js (device cache, background refresh, saves) against an in-page stand-in for the cloud.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const UID = '11111111-2222-4333-8444-555555555555';
const HARNESS = `<!doctype html><meta charset="utf-8"><title>store test</title>
<script>
// ---- stand-in cloud: tables live in localStorage so they survive a reload (like a real server) ----
(function(){
  var DELAY = 250;
  function db(){ try{ return JSON.parse(localStorage.getItem('__db')||'null') || {}; }catch(e){ return {}; } }
  function save(d){ localStorage.setItem('__db', JSON.stringify(d)); }
  var VIEW = { inventory_safe:'inventory', receipts_safe:'receipts' };
  window.__net = [];
  window.__seq = 0;
  function nowIso(){ window.__seq++; return new Date(Date.now()+window.__seq).toISOString().replace('Z','+00:00'); }
  function Q(table){ this.t = VIEW[table]||table; this.raw=table; this.mode='select'; this.f=[]; this.rng=null; this.single=false; this.ret=false; }
  Q.prototype.select=function(){ if(this.mode!=='select') this.ret=true; return this; };
  Q.prototype.eq=function(k,v){ this.f.push(function(r){ return r[k]===v; }); return this; };
  Q.prototype.gt=function(k,v){ this.f.push(function(r){ return String(r[k]||'')>String(v); }); return this; };
  Q.prototype.order=function(){ return this; };
  Q.prototype.limit=function(){ return this; };
  Q.prototype.range=function(a,b){ this.rng=[a,b]; return this; };
  Q.prototype.maybeSingle=function(){ this.single=true; return this; };
  Q.prototype.insert=function(row){ this.mode='insert'; this.row=row; return this; };
  Q.prototype.update=function(row){ this.mode='update'; this.row=row; return this; };
  Q.prototype.delete=function(){ this.mode='delete'; return this; };
  Q.prototype.upsert=function(row){ this.mode='upsert'; this.row=row; return this; };
  Q.prototype.run=function(){
    var d=db(), rows=d[this.t]||(d[this.t]=[]), self=this, pass=function(r){ return self.f.every(function(fn){ return fn(r); }); };
    window.__net.push(this.mode+' '+this.raw+(this.rng?(' '+this.rng[0]):''));
    if(window.__fail && window.__fail[this.raw]) return { data:null, error:{ message:'forced failure' } };
    if(this.mode!=='select'){
      var fw=window.__failWrites && window.__failWrites[this.t];           // the next n writes fail outright (nothing is stored)
      if(fw && fw.n>0){ fw.n--; return { data:null, error:{ message: fw.status ? 'refused' : 'Failed to fetch', code: fw.code||'' }, status: fw.status||0 }; }
      var la=window.__lostAnswers && window.__lostAnswers[this.t];         // the next n writes ARE stored but the answer never arrives
      if(la && la.n>0){ la.n--; window.__lostNow=true; }
    }
    if(this.t==='staff') return { data:{ role: localStorage.getItem('__role')||'technician', active:true }, error:null };
    if(this.t==='shop_config') return { data:[], error:null };
    if(this.mode==='select'){ var out=rows.filter(pass).sort(function(a,b){ return String(a.id)<String(b.id)?-1:1; }); if(this.rng) out=out.slice(this.rng[0], this.rng[1]+1); return { data: JSON.parse(JSON.stringify(out)), error:null }; }
    if(this.mode==='insert'){ var r=Object.assign({}, this.row); if(!r.id) r.id='00000000-0000-4000-8000-'+String(1000000000000+rows.length).slice(1);
      if(rows.some(function(x){ return x.id===r.id; })){ window.__dups=(window.__dups||0)+1; return { data:null, error:{ message:'duplicate key', code:'23505' }, status:409 }; }
      r.created_at=r.updated_at=nowIso(); rows.push(r); save(d);
      if(window.__lostNow){ window.__lostNow=false; return { data:null, error:{ message:'Failed to fetch' }, status:0 }; }
      return { data:[JSON.parse(JSON.stringify(r))], error:null }; }
    if(this.mode==='update'){ var n=0; rows.forEach(function(x){ if(pass(x)){ Object.assign(x, self.row); x.updated_at=nowIso(); n++; } }); save(d); return { data:null, error:null }; }
    if(this.mode==='delete'){ var gone=rows.filter(pass); d[this.t]=rows.filter(function(x){ return !pass(x); }); save(d); return { data: gone, error:null }; }
    return { data:null, error:null };
  };
  Q.prototype.then=function(ok, bad){ var self=this; return new Promise(function(res){ setTimeout(function(){ res(self.run()); }, DELAY); }).then(ok, bad); };
  window.__server = { db: db, save: save, touch: nowIso };
  window.supabase = { createClient: function(){ return {
    from: function(t){ return new Q(t); },
    rpc: function(){ return Promise.resolve({ data:null, error:null }); },
    auth: { getSession: function(){ return new Promise(function(r){ setTimeout(function(){ r({ data:{ session:{ user:{ id:'${UID}', email:'tech@example.com' } } } }); }, 30); }); },
            getUser: function(){ return new Promise(function(r){ setTimeout(function(){ r({ data:{ user:{ id:'${UID}', email:'tech@example.com' } } }); }, DELAY); }); },
            onAuthStateChange: function(cb){ setTimeout(function(){ cb('INITIAL_SESSION', { user:{ id:'${UID}', email:'tech@example.com' } }); }, 0); return { data:{ subscription:{ unsubscribe:function(){} } } }; },
            signOut: function(){ return Promise.resolve(); } } }; } };
})();
</script>
<script src="/app/store.js"></script>
<body>store test</body>`;
const srv = http.createServer((q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/t.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end(HARNESS); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': 'text/javascript' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8089, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    const URL = 'http://127.0.0.1:8089/t.html';
    await pg.goto(URL);
    // seed the "server" and a signed-in session, then reload so store.js starts with them
    await pg.evaluate((UID) => {
      const iso = n => new Date(Date.UTC(2026, 10, 11, 12, 0, n)).toISOString().replace('Z', '+00:00');
      const receipts = []; for (let i = 1; i <= 1500; i++) receipts.push({ id: 'r' + String(i).padStart(5, '0'), data: { number: 'TKS-' + i, total: i }, deleted_at: null, created_at: iso(0), updated_at: iso(0) });
      const d = { customers: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Ann', is_contracting: false, created_at: iso(0), updated_at: iso(0) }],
        inventory: [{ id: 'p1', name: 'Key A', qty: 3, updated_at: iso(0) }, { id: 'p2', name: 'Key B', qty: 1, updated_at: iso(0) }],
        bookings: [{ id: 'b1', data: { id: 'b1', date: '2026-11-12', customer: { name: 'Ann' } }, updated_at: iso(0) }], receipts: receipts };
      localStorage.setItem('__db', JSON.stringify(d));
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(40), user: { id: UID, email: 'tech@example.com' } }));
      return new Promise(function(res){ var rq=indexedDB.deleteDatabase('tks_cache'); rq.onsuccess=rq.onerror=rq.onblocked=function(){ res(true); }; });
    }, UID);

    // ---- 1. first load on this device: downloads everything, then keeps a copy ----
    await pg.goto(URL);
    let r = await pg.evaluate(async () => { const t0 = performance.now(); await TKS.connectCloud({ url: 'http://x', anonKey: 'k' }); const ms = Math.round(performance.now() - t0);
      return { ms, adapter: TKS.adapter(), receipts: TKS.list('receipts').length, inv: TKS.list('inventory').length, role: TKS.auth.staffRole(), net: window.__net.length, email: TKS.auth.email() }; });
    check('first load downloads all 1,500 receipts (2 pages)', r.receipts === 1500 && r.adapter === 'cloud', r);
    check('first load knows the role', r.role === 'technician', r.role);
    await sleep(900);   // let the device copy be written

    // ---- 2. second load: opens from the device copy without waiting for the network ----
    await pg.evaluate(() => { const d = __server.db(); d.receipts.push({ id: 'r90001', data: { number: 'TKS-NEW', total: 5 }, deleted_at: null, created_at: __server.touch(), updated_at: __server.touch() });
      d.receipts[0].data.total = 999; d.receipts[0].updated_at = __server.touch();
      d.bookings = [];   // the job was deleted on another device
      __server.save(d); });
    await pg.goto(URL);
    r = await pg.evaluate(async () => { const t0 = performance.now(); await TKS.connectCloud({ url: 'http://x', anonKey: 'k' }); const ms = Math.round(performance.now() - t0);
      const first = { ms, receipts: TKS.list('receipts').length, role: TKS.auth.staffRole(), netAtOpen: window.__net.length, bookings: TKS.list('bookings').length };
      const held = TKS.list('receipts'), heldRow = held[0]; let repaints = 0; TKS.onChange(() => repaints++);
      await TKS.ready;
      return { first, after: { receipts: TKS.list('receipts').length, sameArray: held === TKS.list('receipts'), sameRow: heldRow === TKS.list('receipts')[0], rowTotal: heldRow.total,
        hasNew: TKS.list('receipts').some(x => x.number === 'TKS-NEW'), bookings: TKS.list('bookings').length, repaints, net: window.__net.slice() } }; });
    check('second load opens from the device copy in well under the network time', r.first.ms < 200 && r.first.receipts === 1500 && r.first.role === 'technician', r.first);
    check('…then catches up behind: new receipt appears, changed one updates, deleted job goes', r.after.receipts === 1501 && r.after.hasNew && r.after.rowTotal === 999 && r.after.bookings === 0, { receipts: r.after.receipts, hasNew: r.after.hasNew, rowTotal: r.after.rowTotal, bookings: r.after.bookings });
    check('…without swapping the list or the row objects screens hold', r.after.sameArray && r.after.sameRow, { sameArray: r.after.sameArray, sameRow: r.after.sameRow });
    check('…and repaints once', r.after.repaints >= 1 && r.after.repaints <= 2, r.after.repaints);
    await sleep(900);

    // ---- 3. third load soon after: receipts are read as "changed since", not all 1,500 again ----
    await pg.evaluate(() => { const d = __server.db(); d.receipts.push({ id: 'r90002', data: { number: 'TKS-NEW2' }, deleted_at: null, created_at: __server.touch(), updated_at: __server.touch() });
      const x = d.receipts.find(q => q.id === 'r00002'); x.deleted_at = __server.touch(); x.updated_at = __server.touch(); __server.save(d); });
    await pg.goto(URL);
    r = await pg.evaluate(async () => { await TKS.connectCloud({ url: 'http://x', anonKey: 'k' }); await TKS.ready;
      return { receipts: TKS.list('receipts').length, hasNew2: TKS.list('receipts').some(x => x.number === 'TKS-NEW2'), removedGone: !TKS.list('receipts').some(x => x.id === 'r00002'),
        receiptReads: window.__net.filter(n => n.indexOf('select receipts_safe') === 0) }; });
    check('quick re-open reads only changed receipts (one small request) and still adds/removes correctly', r.receipts === 1501 && r.hasNew2 && r.removedGone && r.receiptReads.length === 1, r);

    // ---- 4. an edit made here while a refresh is in flight survives and is saved exactly once ----
    r = await pg.evaluate(async () => {
      window.__net.length = 0; window.__dups = 0;
      const d = __server.db(); d.receipts.find(q => q.id === 'r00003').data.total = 4242; d.receipts.find(q => q.id === 'r00003').updated_at = __server.touch(); __server.save(d);
      const p = TKS.refresh(true);                                   // refresh starts (network in flight)
      const list = TKS.list('receipts'); const mine = list.find(x => x.id === 'r00010'); mine.note = 'edited here';
      list.push({ id: 'rLOCAL1', number: 'LOCAL-1', total: 12 });   // a new receipt made here
      TKS.saveList('receipts', list);
      await p; await new Promise(z => setTimeout(z, 1500));
      const srv = __server.db().receipts;
      return { localKept: TKS.list('receipts').find(x => x.id === 'r00010').note, serverGotEdit: (srv.find(q => q.id === 'r00010').data || {}).note,
        serverGotInsert: srv.filter(q => q.id === 'rLOCAL1').length, remoteApplied: TKS.list('receipts').find(x => x.id === 'r00003').total, dups: window.__dups,
        writes: window.__net.filter(n => !/^select/.test(n)) }; });
    check('local edit + new receipt survive a refresh and reach the server once', r.localKept === 'edited here' && r.serverGotEdit === 'edited here' && r.serverGotInsert === 1 && r.remoteApplied === 4242 && r.dups === 0, r);

    // ---- 5. a save from a list read BEFORE another device added a row does not delete that row ----
    r = await pg.evaluate(async () => {
      const list = TKS.list('inventory');                            // screen reads the list…
      const d = __server.db(); d.inventory.push({ id: 'p3', name: 'Key C (added on another phone)', qty: 9, updated_at: __server.touch() }); __server.save(d);
      await TKS.refresh(true);                                       // …the other phone's part arrives…
      const p1 = list.find(x => x.id === 'p1'); p1.notes = 'bin A3'; p1.qty = 2; TKS.saveList('inventory', list);   // …then this screen saves what it holds
      await new Promise(z => setTimeout(z, 1500));
      const srv = __server.db().inventory;
      return { serverHasP3: srv.some(q => q.id === 'p3'), p1notes: srv.find(q => q.id === 'p1').notes, p1qty: srv.find(q => q.id === 'p1').qty, localHasP3: TKS.list('inventory').some(x => x.id === 'p3') }; });
    check('saving a list held from before a refresh keeps the other device\'s new row', r.serverHasP3 && r.p1notes === 'bin A3' && r.localHasP3, r);
    check('editing a part never writes its quantity to the cloud (the cloud owns the count)', r.p1qty === 3, r.p1qty);

    // ---- 6. a delete made here is pushed, and a refresh does not bring the row back ----
    r = await pg.evaluate(async () => {
      TKS.Inventory.remove('p2'); const p = TKS.refresh(true); await p; await new Promise(z => setTimeout(z, 1200));
      return { local: TKS.list('inventory').some(x => x.id === 'p2'), server: __server.db().inventory.some(q => q.id === 'p2') }; });
    check('a delete made here sticks through a refresh', !r.local && !r.server, r);

    // ---- 7. a failed refresh keeps the saved copy and the table stays on the cloud ----
    r = await pg.evaluate(async () => { window.__fail = { receipts_safe: true }; const before = TKS.list('receipts').length; await TKS.refresh(true); window.__fail = null;
      return { before, after: TKS.list('receipts').length, cloud: TKS.isCloud('receipts') }; });
    check('a failed refresh changes nothing', r.before === r.after && r.cloud, r);

    // ---- 7b. the connection drops while saving: the edit is NOT treated as saved, is retried, and then is saved ----
    r = await pg.evaluate(async () => {
      TKS._retryMs = 300; const ev = []; addEventListener('tks:save-failed', e => ev.push('failed:' + e.detail.count + ':' + e.detail.retrying)); addEventListener('tks:save-ok', () => ev.push('ok'));
      window.__failWrites = { receipts: { n: 2 } };                  // the next two writes get no answer
      const list = TKS.list('receipts'); list.find(x => x.id === 'r00020').note = 'saved after a retry'; TKS.saveList('receipts', list);
      await new Promise(z => setTimeout(z, 450));
      const mid = { server: (__server.db().receipts.find(q => q.id === 'r00020').data || {}).note || null };
      await TKS.refresh(true);                                       // a catch-up in the middle must not throw the edit away
      mid.localAfterRefresh = TKS.list('receipts').find(x => x.id === 'r00020').note;
      await new Promise(z => setTimeout(z, 2500));
      return { mid, ev, server: (__server.db().receipts.find(q => q.id === 'r00020').data || {}).note }; });
    check('a save that gets no answer is kept, retried and then saved (and the page is told)', r.mid.server === null && r.mid.localAfterRefresh === 'saved after a retry' && r.server === 'saved after a retry' && r.ev[0] === 'failed:1:true' && r.ev[r.ev.length - 1] === 'ok', r);

    // ---- 7c. the first try DID reach the cloud but its answer was lost: the retry must not make a second copy ----
    r = await pg.evaluate(async () => {
      window.__dups = 0; window.__lostAnswers = { receipts: { n: 1 }, customers: { n: 1 } };
      const rl = TKS.list('receipts'); rl.push({ id: 'rLOST1', number: 'LOST-1', total: 7 }); TKS.saveList('receipts', rl);
      TKS.Customers.upsert({ customer: 'TEST Lost Answer', phone: '4055550199' });
      await new Promise(z => setTimeout(z, 3000));
      const d = __server.db(); const c = TKS.list('customers').find(x => x.customer === 'TEST Lost Answer');
      return { receiptCopies: d.receipts.filter(q => q.id === 'rLOST1').length, customerCopies: d.customers.filter(q => q.name === 'TEST Lost Answer').length,
        customerIdIsUuid: /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(c && c.id || ''), localCustomers: TKS.list('customers').filter(x => x.customer === 'TEST Lost Answer').length }; });
    check('a lost answer never makes a second receipt or a second customer', r.receiptCopies === 1 && r.customerCopies === 1 && r.customerIdIsUuid && r.localCustomers === 1, r);

    // ---- 7d. the cloud refuses a change: it is reported, not retried for ever, and never written to the device copy ----
    r = await pg.evaluate(async () => {
      const ev = []; addEventListener('tks:save-failed', e => ev.push({ refused: e.detail.refused, retrying: e.detail.retrying }));
      window.__failWrites = { inventory: { n: 99, status: 403, code: '42501' } }; window.__net.length = 0;
      const list = TKS.list('inventory'); list.find(x => x.id === 'p1').qty = 77; TKS.saveList('inventory', list);
      await new Promise(z => setTimeout(z, 2000));
      const writes = window.__net.filter(n => /^update inventory/.test(n)).length; window.__failWrites = null;
      return { ev, writes, server: __server.db().inventory.find(q => q.id === 'p1').qty }; });
    check('a change the cloud refuses is reported once and not retried', r.ev.length === 1 && r.ev[0].refused === 1 && r.ev[0].retrying === false && r.writes === 1 && r.server !== 77, r);
    await sleep(700);
    await pg.goto(URL);
    r = await pg.evaluate(async () => { await TKS.connectCloud({ url: 'http://x', anonKey: 'k' }); return { p1: TKS.list('inventory').find(x => x.id === 'p1').qty }; });
    check('…and after a reload the device copy shows what the cloud really has', r.p1 !== 77, r);
    await pg.evaluate(async () => { await TKS.ready; });

    // ---- 8. signing out wipes the device copy; a different user never gets the first user's copy ----
    await sleep(900);
    r = await pg.evaluate(async () => { await TKS.auth.signOut(); const dbs = indexedDB.databases ? await indexedDB.databases() : []; return dbs.map(x => x.name); });
    check('signing out removes the device copy', r.indexOf('tks_cache') === -1, r);
    await pg.evaluate(() => localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(40), user: { id: '99999999-2222-4333-8444-555555555555', email: 'other@example.com' } })));
    await pg.goto(URL);
    r = await pg.evaluate(async () => { const t0 = performance.now(); await TKS.connectCloud({ url: 'http://x', anonKey: 'k' }); return { ms: Math.round(performance.now() - t0), receipts: TKS.list('receipts').length }; });
    check('a different person on the same device starts from the server, not from someone else\'s copy', r.ms > 200 && r.receipts > 0, r);
    check('no page errors', errs.length === 0, errs);
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
