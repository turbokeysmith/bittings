// Browser test of the seven till fixes (8z69). Real pages, signed-in path, stand-in cloud (nothing leaves this PC).
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const UID = '11111111-2222-4333-8444-555555555555';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const FAKE = `
(function(){
  var DELAY = 60, UID='${UID}';
  function db(){ try{ return JSON.parse(localStorage.getItem('__db')||'null') || {}; }catch(e){ return {}; } }
  function save(d){ localStorage.setItem('__db', JSON.stringify(d)); }
  var VIEW = { inventory_safe:'inventory', receipts_safe:'receipts' };
  window.__net = []; window.__calls = [];
  function Q(table){ this.t = VIEW[table]||table; this.raw=table; this.mode='select'; this.f=[]; this.rng=null; }
  Q.prototype.select=function(){ return this; };
  Q.prototype.eq=function(k,v){ this.f.push(function(r){ return r[k]===v; }); return this; };
  Q.prototype.gt=function(k,v){ this.f.push(function(r){ return String(r[k]||'')>String(v); }); return this; };
  ['order','limit','in','is','neq','gte','lte','or','not','ilike','match'].forEach(function(m){ Q.prototype[m]=function(){ return this; }; });
  Q.prototype.range=function(a,b){ this.rng=[a,b]; return this; };
  Q.prototype.maybeSingle=function(){ this.one=true; return this; };
  Q.prototype.insert=function(row){ this.mode='insert'; this.row=row; return this; };
  Q.prototype.update=function(row){ this.mode='update'; this.row=row; return this; };
  Q.prototype.delete=function(){ this.mode='delete'; return this; };
  Q.prototype.upsert=function(row){ this.mode='upsert'; this.row=row; return this; };
  Q.prototype.run=function(){
    var d=db(), rows=d[this.t]||[], self=this, pass=function(r){ return self.f.every(function(fn){ return fn(r); }); };
    window.__net.push(this.mode+' '+this.raw+(this.mode==='update'?(' '+Object.keys(this.row||{}).join(',')):''));
    if(this.t==='staff'){ var me={ role: localStorage.getItem('__role')||'owner', active:true, user_id:UID, name:'TEST Owner' }; return { data: this.one?me:[me], error:null }; }
    if(this.mode==='select'){ var out=rows.filter(pass).sort(function(a,b){ return String(a.id)<String(b.id)?-1:1; }); if(this.rng) out=out.slice(this.rng[0], this.rng[1]+1); return { data: this.one?(out[0]||null):JSON.parse(JSON.stringify(out)), error:null }; }
    if(this.mode==='insert'||this.mode==='upsert'){ var r=Object.assign({}, this.row); if(!r.id) r.id='00000000-0000-4000-8000-'+String(1000000000000+rows.length).slice(1); r.updated_at=new Date().toISOString(); var ix=rows.findIndex(function(x){ return x.id===r.id; }); if(ix>=0) rows[ix]=Object.assign(rows[ix], r); else rows.push(r); d[this.t]=rows; save(d); return { data:[r], error:null }; }
    if(this.mode==='update'){ rows.forEach(function(x){ if(pass(x)){ Object.assign(x, self.row); x.updated_at=new Date().toISOString(); } }); save(d); return { data:null, error:null }; }
    if(this.mode==='delete'){ var gone=rows.filter(pass); d[this.t]=rows.filter(function(x){ return !pass(x); }); save(d); return { data:gone, error:null }; }
    return { data:null, error:null };
  };
  Q.prototype.then=function(ok,bad){ var self=this; return new Promise(function(res){ setTimeout(function(){ res(self.run()); }, DELAY); }).then(ok,bad); };
  var user={ id:UID, email:'samer@turbokeysmith.com', user_metadata:{ password_set:true } };
  function later(v){ return new Promise(function(r){ setTimeout(function(){ r(v); }, DELAY); }); }
  // the cloud functions the pages call with fetch(): pay-record marks the receipt paid, like the real one
  var realFetch = window.fetch;
  window.fetch = function(url, opt){
    if(/\\/functions\\/v1\\/pay-record/.test(String(url))){ var b=JSON.parse((opt&&opt.body)||'{}'); window.__calls.push('pay-record '+b.invoiceId+' '+b.method);
      var d=db(), row=(d.receipts||[]).find(function(x){ return x.id===b.invoiceId; });
      if(!row) return Promise.resolve(new Response(JSON.stringify({ error:'invoice not found in cloud' }), { status:404, headers:{'content-type':'application/json'} }));
      row.data=Object.assign({}, row.data, { status:'Paid in Full', docType:'receipt', payment:b.method.charAt(0).toUpperCase()+b.method.slice(1), paidAt:Date.now(), number:String(row.data.number||'').replace(/^INV/,'TKS') });
      row.updated_at=new Date(Date.now()+5).toISOString(); d.payments=(d.payments||[]).concat([{ invoice_id:b.invoiceId, method:b.method }]); save(d);
      return Promise.resolve(new Response(JSON.stringify({ ok:true, method:b.method, captured_cents:10000 }), { status:200, headers:{'content-type':'application/json'} })); }
    if(/\\/functions\\/v1\\//.test(String(url))) return Promise.resolve(new Response('{}', { status:200, headers:{'content-type':'application/json'} }));
    return realFetch.apply(this, arguments);
  };
  window.supabase = { createClient: function(){ return {
    from: function(t){ return new Q(t); },
    rpc: function(name, args){ window.__calls.push('rpc '+name+(args&&args.p_receipt?(' '+args.p_receipt):''));
      var v=null; if(name==='mfa_pending') v=false; if(name==='shop_tier') v='pro'; if(name==='seat_usage') v=[{used:2,allowed:5}];
      if(name==='pos_decrement_stock'){ var d=db(), row=(d.receipts||[]).find(function(x){ return x.id===args.p_receipt; }); if(row && !row.data.posStockApplied){ row.data.posStockApplied=true; row.updated_at=new Date(Date.now()+9).toISOString(); d.stockTaken=(d.stockTaken||0)+1; save(d); } }
      return later({ data:v, error:null }); },
    functions: { invoke: function(){ return later({ data:null, error:null }); } },
    storage: { from: function(){ return { getPublicUrl: function(){ return { data:{ publicUrl:'' } }; }, createSignedUrl: function(){ return later({ data:null, error:null }); } }; } },
    auth: { getSession: function(){ return Promise.resolve({ data:{ session:{ user:user, access_token:'x' } } }); },
            getUser: function(){ return later({ data:{ user:user } }); },
            onAuthStateChange: function(cb){ setTimeout(function(){ cb('INITIAL_SESSION', { user:user }); }, 0); return { data:{ subscription:{ unsubscribe:function(){} } } }; },
            mfa: { getAuthenticatorAssuranceLevel: function(){ return later({ data:{ currentLevel:'aal1', nextLevel:'aal1' } }); }, listFactors: function(){ return later({ data:{ totp:[] } }); } },
            signOut: function(){ return Promise.resolve(); } } }; } };
})();`;
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 600) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message) + ' @ ' + String(e.stack || '').split(String.fromCharCode(10)).slice(1, 3).join(' | ')));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = '2026-11-11T12:00:00.000000+00:00', now = Date.now();
      const tot = t => ({ subtotal: t, tax: 0, total: t, grossSubtotal: t, discount: 0, taxable: 0, nontax: t, surcharge: 0 });
      const R = (id, data) => ({ id, data: Object.assign({ id, savedAt: now - 3600000, date: '11/12/2026', taxRate: 0, items: [{ desc: 'TEST Service', amount: 100, qty: 1, taxable: false }], totals: tot(100) }, data), deleted_at: null, created_at: iso, updated_at: iso });
      const receipts = [
        R('rINV1', { number: 'INV-TEST-1', customer: 'TEST Ann Smith', docType: 'invoice', status: 'Unpaid', payment: 'Not specified', items: [{ desc: 'TEST Key', amount: 100, qty: 1, taxable: false, partId: 'p1' }] }),
        R('pos_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', { number: 'pos_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', customer: 'TEST Ann Smith', docType: 'receipt', status: 'Unpaid', source: 'pos' }),   // abandoned Register ticket
        R('rPART', { number: 'TKS-TEST-PART', customer: 'TEST Ann Smith', docType: 'receipt', status: 'Partial Payment', amountPaid: 40, payment: 'Cash' }),
        R('rLATE', { number: 'TKS-TEST-LATE', customer: 'TEST Bob', docType: 'receipt', status: 'Paid in Full', payment: 'Card', paidAt: now - 10 * 60000, items: [{ desc: 'TEST Fob', amount: 100, qty: 1, taxable: true, partId: 'p2' }] }),   // paid by card, stock never taken
        R('rcpt_mb_900', { number: '900', customer: 'TEST Old', docType: 'receipt', status: 'Paid in Full', payment: 'MC/Visa', paidAt: now - 10 * 60000, items: [{ desc: 'TEST imported', amount: 50, qty: 1, partId: 'p1' }] }),   // imported history — must never be touched
        R('rOLDPAID', { number: 'TKS-TEST-OLD', customer: 'TEST Bob', docType: 'receipt', status: 'Paid in Full', payment: 'Card', paidAt: Date.parse('2026-11-11T20:00:00Z'), items: [{ desc: 'TEST before the fix', amount: 50, qty: 1, partId: 'p1' }] })   // before the fix went live — not touched
      ];
      const inventory = [{ id: 'p1', name: 'TEST Key A', sku: 'TKA', category: 'Aftermarket', qty: 5, low_at: 1, sell_price_cents: 4500, updated_at: iso }, { id: 'p2', name: 'TEST Fob B', sku: 'TFB', category: 'Aftermarket', qty: 2, low_at: 1, sell_price_cents: 9000, updated_at: iso }];
      const customers = [{ id: '00000000-0000-4000-8000-000000000001', name: 'TEST Ann Smith', phone: '4055550101', email: 'ann@example.com', address: '1 Main St', is_contracting: false, customer_type: 'individual', updated_at: iso }];
      localStorage.setItem('__db', JSON.stringify({ receipts, inventory, customers, bookings: [], shop_config: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'samer@turbokeysmith.com' } }));
    }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 });
    await sleep(1500);

    // (5) abandoned Register ticket is not a document; tags tell the truth
    let r = await pg.evaluate(() => ({ ids: TKS.list('receipts').map(x => x.id), tagUnpaidReceipt: invStatusTag({ docType: 'receipt', status: 'Unpaid' }).replace(/<[^>]+>/g, ''), tagPart: invStatusTag({ docType: 'receipt', status: 'Partial Payment' }).replace(/<[^>]+>/g, ''), tagPaid: invStatusTag({ docType: 'receipt', status: 'Paid in Full' }).replace(/<[^>]+>/g, '') }));
    check('(5) an unpaid Register ticket is kept out of every list; status tags are truthful', r.ids.indexOf('pos_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') < 0 && r.ids.length === 5 && r.tagUnpaidReceipt === 'UNPAID' && r.tagPart === 'PART PAID' && r.tagPaid === 'PAID', r);

    // (1) the paid-by-card sale whose parts never came off is caught up — once — and history is left alone
    await pg.evaluate(() => stockSafetyNet()); await sleep(1500);
    await pg.evaluate(() => stockSafetyNet()); await sleep(1200);
    r = await pg.evaluate(() => ({ calls: window.__calls.filter(c => /pos_decrement_stock/.test(c)), taken: JSON.parse(localStorage.getItem('__db')).stockTaken || 0, flag: (TKS.list('receipts').find(x => x.id === 'rLATE') || {}).posStockApplied }));
    check('(1) a card sale that was paid but never took its parts is caught up exactly once; imported and older sales are not touched', r.calls.length === 1 && /rLATE/.test(r.calls[0]) && r.taken === 1 && r.flag === true, r);

    // (2) ± opens the stock panel instead of changing a number that will not stick; part page quantity is read-only
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(700);
    r = await pg.evaluate(() => { window.__net.length = 0; const before = TKS.Inventory.get('p1').qty; const row = Array.from(document.querySelectorAll('#view-inventory .plus'))[0]; let clickedStock = false;
      const sb = row && row.closest('.crow, .row, div').parentElement.querySelector('.moveloc[data-stock]'); if (sb) { const o = sb.onclick; sb.addEventListener('click', () => { clickedStock = true; }, true); }
      if (row) row.click(); return { hadPlus: !!row, before, after: TKS.Inventory.get('p1').qty, clickedStock }; });
    await sleep(600);
    check('(2) ± no longer changes the total when signed in', r.hadPlus && r.before === r.after, r);
    await pg.evaluate(() => { try { window.closeAllOverlays && closeAllOverlays(); } catch (e) {} document.querySelectorAll('.chg-modal-ov,.app-modal-ov,.modal-ov').forEach(x => x.remove()); });
    r = await pg.evaluate(async () => { openPart('p1'); await new Promise(z => setTimeout(z, 300)); const q = document.getElementById('pQty'); const ro = q.readOnly; q.readOnly = false; q.value = '99'; q.readOnly = ro;
      document.getElementById('pNotes').value = 'TEST note'; window.__net.length = 0; document.getElementById('pSave').click(); await new Promise(z => setTimeout(z, 900));
      const srv = JSON.parse(localStorage.getItem('__db')).inventory.find(x => x.id === 'p1');
      return { readOnly: ro, note: document.getElementById('partNote').textContent.slice(0, 60), updates: window.__net.filter(n => /^update inventory/.test(n)), serverQty: srv.qty, serverNotes: srv.notes, localQty: TKS.Inventory.get('p1').qty }; });
    check('(2) part page: quantity is read-only and saving the part never writes a count', r.readOnly === true && r.updates.length === 1 && !/(^|[ ,])qty(,|$)/.test(r.updates[0]) && r.serverQty === 5 && r.serverNotes === 'TEST note' && r.localQty === 5, r);

    // (6) same-name customer: asked, not overwritten
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="customers"]').click()); await sleep(400);
    r = await pg.evaluate(async () => { document.getElementById('custAdd').click(); await new Promise(z => setTimeout(z, 200));
      document.getElementById('fName').value = 'test ann smith'; document.getElementById('fPhone').value = '4055559999'; document.getElementById('fEmail').value = ''; document.getElementById('fAddress').value = '';
      document.getElementById('fSave').click(); await new Promise(z => setTimeout(z, 300));
      const dlg = document.querySelector('.chg-modal-ov'); const text = dlg ? dlg.innerText.slice(0, 220) : null; const before = TKS.list('customers').find(c => c.customer === 'TEST Ann Smith').phone;
      if (dlg) dlg.querySelector('[data-no]').click(); await new Promise(z => setTimeout(z, 900));   // "Add as new"
      const all = TKS.list('customers').filter(c => /ann smith/i.test(c.customer));
      return { asked: !!dlg, text, before, count: all.length, phones: all.map(c => c.phone).sort(), server: JSON.parse(localStorage.getItem('__db')).customers.filter(c => /ann smith/i.test(c.name)).length }; });
    check('(6) a new customer with an existing name asks first; "Add as new" keeps both and the original is untouched', r.asked && r.before === '4055550101' && r.count === 2 && r.phones.join() === '4055550101,4055559999' && r.server === 2, r);

    // (3) Mark as paid on the customer page records a real payment and takes the parts
    r = await pg.evaluate(async () => { window.__calls.length = 0; const inv = TKS.list('receipts').find(x => x.id === 'rINV1'); const c = TKS.list('customers').find(x => x.customer === 'TEST Ann Smith');
      openInvoiceModal(inv, c); await new Promise(z => setTimeout(z, 250));
      document.getElementById('invPaid').click(); await new Promise(z => setTimeout(z, 250));
      const sheet = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); const opts = sheet ? Array.from(sheet.querySelectorAll('[data-m]')).map(x => x.dataset.m).filter(Boolean) : [];
      return { opts }; });
    await pg.screenshot({ path: path.join(OUT, 'mark-paid-how.png') });
    r = Object.assign(r, await pg.evaluate(async () => { const sheet = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); sheet.querySelector('[data-m="check"]').click(); await new Promise(z => setTimeout(z, 1800));
      const d = JSON.parse(localStorage.getItem('__db')); const srv = d.receipts.find(x => x.id === 'rINV1').data; const loc = TKS.list('receipts').find(x => x.id === 'rINV1');
      return { calls: window.__calls.filter(c => /pay-record|pos_decrement/.test(c)), payments: d.payments || [], serverStatus: srv.status, serverNumber: srv.number, serverStock: srv.posStockApplied, localStatus: loc.status, localPay: loc.payment, modalGone: !document.getElementById('invPaid') }; }));
    check('(3) "Mark as paid" asks how, records the payment, marks it paid on the server and takes the parts', r.opts.join() === 'cash,check,zelle,other,card' && r.calls.join(' | ') === 'pay-record rINV1 check | rpc pos_decrement_stock rINV1' && r.payments.length === 1 && r.serverStatus === 'Paid in Full' && r.serverNumber === 'TKS-TEST-1' && r.serverStock === true && r.localStatus === 'Paid in Full' && r.localPay === 'Check' && r.modalGone, r);

    // (7) a service's tax setting survives a Settings save and reaches the Register line
    r = await pg.evaluate(async () => { TKS.Config.save({ services: [{ value: 'TEST Taxed service', en: 'TEST Taxed service', cat: 'automotive', price: '25', taxable: true }, { value: 'TEST Labor', en: 'TEST Labor', cat: 'automotive', price: '50' }] });
      document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click(); await new Promise(z => setTimeout(z, 500));
      const tab = Array.from(document.querySelectorAll('#view-settings [data-step], #view-settings .rail button, #view-settings button')).find(x => /^\s*(🧰|🛠|🔧)?\s*Services/i.test(x.innerText || ''));
      if (tab) tab.click(); await new Promise(z => setTimeout(z, 400));
      const saveBtn = Array.from(document.querySelectorAll('#view-settings button')).find(x => /^(Save|Save & continue|Save changes)/i.test((x.innerText || '').trim()));
      if (saveBtn) saveBtn.click(); await new Promise(z => setTimeout(z, 500));
      return { foundTab: !!tab, foundSave: !!saveBtn, services: TKS.Config.services().map(s => s.value + ':' + (s.taxable === true)) }; });
    check('(7) saving Settings keeps each service\'s tax setting', r.foundTab && r.foundSave && r.services.join() === 'TEST Taxed service:true,TEST Labor:false', r);
    check('no page errors', errs.length === 0, errs.slice(0, 5));
    await pg.close();

    // (4) cash drawer: only for cash / check sales — checked on the hardware module directly
    const pg2 = await b.newPage(); const errs2 = []; pg2.on('pageerror', e => errs2.push(String(e.message)));
    await pg2.setRequestInterception(true);
    const helper = [];
    pg2.on('request', rq => { const u = rq.url();
      const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-private-network': 'true' };
      if (/127\.0\.0\.1:8765/.test(u)) {
        if (rq.method() === 'POST' && /\/receipt/.test(u)) { try { helper.push(JSON.parse(rq.postData() || '{}').drawer); } catch (e) { helper.push('?'); } }
        return rq.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{"ok":true}' }); }
      if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u)) rq.continue(); else rq.abort(); });
    await pg2.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' }); await sleep(1500);
    const d = await pg2.evaluate(async () => { const p = TKS_HW.prefs(); p.thermal.enabled = true; p.thermal.mode = 'helper'; p.thermal.drawerKick = true; p.thermal.copies = 1;
      const rc = pay => ({ number: 'TEST-1', date: '2026-11-12', customer: 'TEST', payment: pay, status: pay ? 'Paid in Full' : '', items: [{ desc: 'TEST', amount: 10, qty: 1 }], totals: { grossSubtotal: 10, discount: 0, tax: 0, taxRate: 0, surcharge: 0, subtotal: 10, total: 10 } });
      const out = []; for (const pay of ['Cash', 'Check', 'Card', '']) { try { await TKS_HW.thermal.printReceipt(rc(pay)); out.push(pay + ':sent'); } catch (e) { out.push(pay + ':ERR ' + e.message); } } return out; });
    check('(4) the drawer opens for cash and check only — not for card sales or a plain reprint', helper.length === 4 && helper[0] === true && helper[1] === true && helper[2] === false && helper[3] === false, { sent: d, drawer: helper });
    await pg2.close();
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
