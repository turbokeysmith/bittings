// Runs the REAL pages on their signed-in (non-demo) path against a stand-in cloud: the Supabase library file is swapped
// for an in-page fake with 300 ms per request, so start-up timing and the device copy can be seen end to end.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const UID = '11111111-2222-4333-8444-555555555555';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const FAKE = `
(function(){
  var DELAY = 300, UID='${UID}', EMAIL='tech@example.com';
  function db(){ try{ return JSON.parse(localStorage.getItem('__db')||'null') || {}; }catch(e){ return {}; } }
  function save(d){ localStorage.setItem('__db', JSON.stringify(d)); }
  var VIEW = { inventory_safe:'inventory', receipts_safe:'receipts' };
  window.__net = [];
  function Q(table){ this.t = VIEW[table]||table; this.raw=table; this.mode='select'; this.f=[]; this.rng=null; }
  Q.prototype.select=function(){ return this; };
  Q.prototype.eq=function(k,v){ this.f.push(function(r){ return r[k]===v; }); return this; };
  Q.prototype.gt=function(k,v){ this.f.push(function(r){ return String(r[k]||'')>String(v); }); return this; };
  ['order','limit','in','is','neq','gte','lte','or','not','ilike','match'].forEach(function(m){ Q.prototype[m]=function(){ return this; }; });
  Q.prototype.range=function(a,b){ this.rng=[a,b]; return this; };
  Q.prototype.maybeSingle=function(){ this.single=true; return this; };
  Q.prototype.insert=function(row){ this.mode='insert'; this.row=row; return this; };
  Q.prototype.update=function(row){ this.mode='update'; this.row=row; return this; };
  Q.prototype.delete=function(){ this.mode='delete'; return this; };
  Q.prototype.upsert=function(row){ this.mode='upsert'; this.row=row; return this; };
  Q.prototype.run=function(){
    var d=db(), rows=d[this.t]||[], self=this, pass=function(r){ return self.f.every(function(fn){ return fn(r); }); };
    window.__net.push(this.mode+' '+this.raw);
    if(this.t==='staff'){ var me={ role: localStorage.getItem('__role')||'technician', active:true, user_id:UID, name:'TEST Tech' }; return { data: this.single?me:[me], error:null }; }
    if(this.mode==='select'){ var out=rows.filter(pass).sort(function(a,b){ return String(a.id)<String(b.id)?-1:1; }); if(this.rng) out=out.slice(this.rng[0], this.rng[1]+1); return { data: this.single?(out[0]||null):JSON.parse(JSON.stringify(out)), error:null }; }
    if(this.mode==='insert'){ var r=Object.assign({}, this.row); if(!r.id) r.id='00000000-0000-4000-8000-'+String(1000000000000+rows.length).slice(1); r.updated_at=new Date().toISOString(); rows.push(r); d[this.t]=rows; save(d); return { data:[r], error:null }; }
    if(this.mode==='update'){ rows.forEach(function(x){ if(pass(x)){ Object.assign(x, self.row); x.updated_at=new Date().toISOString(); } }); save(d); return { data:null, error:null }; }
    if(this.mode==='delete'){ var gone=rows.filter(pass); d[this.t]=rows.filter(function(x){ return !pass(x); }); save(d); return { data:gone, error:null }; }
    return { data:null, error:null };
  };
  Q.prototype.then=function(ok,bad){ var self=this; return new Promise(function(res){ setTimeout(function(){ res(self.run()); }, DELAY); }).then(ok,bad); };
  var user={ id:UID, email:EMAIL, user_metadata:{ password_set:true } };
  function later(v){ return new Promise(function(r){ setTimeout(function(){ r(v); }, DELAY); }); }
  window.supabase = { createClient: function(){ return {
    from: function(t){ return new Q(t); },
    rpc: function(name){ window.__net.push('rpc '+name);
      var v=null; if(name==='mfa_pending') v=false; if(name==='shop_tier') v='pro'; if(name==='seat_usage') v=[{used:2,allowed:5}]; if(name==='shift_status') v=null;
      return later({ data:v, error:null }); },
    functions: { invoke: function(){ return later({ data:null, error:null }); } },
    storage: { from: function(){ return { getPublicUrl: function(){ return { data:{ publicUrl:'' } }; }, createSignedUrl: function(){ return later({ data:null, error:null }); } }; } },
    auth: { getSession: function(){ return Promise.resolve({ data:{ session:{ user:user, access_token:'x' } } }); },
            getUser: function(){ window.__net.push('auth getUser'); return later({ data:{ user:user } }); },
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    for (const role of ['technician', 'owner']) {
      const ctx = await b.createBrowserContext(); const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', e => errs.push(String(e.message)+' @ '+String(e.stack||'').split(String.fromCharCode(10)).slice(1,4).join(' | '))); pg.on('console', m => { const t=m.text(); if(/TKS cloud|staying local|flush/.test(t)) console.log('CONSOLE:', t.slice(0,300)); });
      await pg.setRequestInterception(true);
      pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u)) rq.continue(); else rq.abort(); });   // nothing leaves this PC
      await pg.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await pg.goto('http://127.0.0.1:8088/seed.html');
      await pg.evaluate((UID, role) => {
        const iso = '2026-11-11T12:00:00.000000+00:00', today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); const day = today.toISOString().slice(0, 10);
        const receipts = []; for (let i = 1; i <= 1800; i++) receipts.push({ id: 'r' + String(i).padStart(5, '0'), data: { id: 'r' + String(i).padStart(5, '0'), number: 'TKS-TEST-' + i, customer: 'TEST Customer ' + (i % 40), docType: 'receipt', status: 'Paid in Full', payment: 'Cash', savedAt: Date.now() - i * 3600000, date: '11/11/2026', items: [{ desc: 'TEST Service', amount: 50 + i % 70, taxable: false, qty: 1 }], totals: { subtotal: 50, tax: 0, total: 50 + i % 70, grossSubtotal: 50, discount: 0, taxable: 0, nontax: 50, surcharge: 0 } }, deleted_at: null, created_at: iso, updated_at: iso });
        const inventory = []; for (let i = 1; i <= 520; i++) inventory.push({ id: 'p' + i, name: 'TEST Key ' + i, sku: 'TK' + i, category: 'Aftermarket', qty: i % 5, low_at: 1, cost: null, sell_price_cents: 4500, fitment: '2015-2020 Toyota Camry', updated_at: iso });
        const customers = []; for (let i = 1; i <= 40; i++) customers.push({ id: '00000000-0000-4000-8000-' + String(100000000000 + i), name: 'TEST Customer ' + i, phone: '40555501' + String(i).padStart(2, '0'), is_contracting: false, customer_type: 'individual', updated_at: iso });
        const bookings = [{ id: 'b1', date: day, time: '09:00', customer_name: 'TEST Customer 1', updated_at: iso, data: { id: 'b1', jobType: 'auto', subType: 'TEST lost key', date: day, time: '09:00', status: 'Scheduled', customer: { name: 'TEST Customer 1', phone: '4055550101' }, vehicle: { year: '2015', make: 'Toyota', model: 'Camry' } } }];
        localStorage.setItem('__db', JSON.stringify({ receipts, inventory, customers, bookings, shop_config: [] }));
        localStorage.setItem('__role', role);
        localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: role === 'owner' ? 'samer@turbokeysmith.com' : 'tech@example.com' } }));
      }, UID, role);

      const timeHome = async (label) => {
        const t0 = Date.now();
        await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
        await pg.waitForFunction(() => { const s = document.getElementById('schBody'); return s && /TEST Customer 1/.test(s.innerText || ''); }, { timeout: 15000 }).catch(() => {});
        const ms = Date.now() - t0;
        const st = await pg.evaluate(() => ({ view: (document.querySelector('.view.active') || {}).id, job: /TEST Customer 1/.test((document.getElementById('schBody') || {}).innerText || ''), role: (document.querySelector('.rolebadge') || {}).innerText,
          receipts: TKS.list('receipts').length, adapter: TKS.adapter(), reads: window.__net.filter(n => /^select (receipts|inventory)/.test(n)).length }));
        return Object.assign({ label, ms }, st);
      };
      const cold = await timeHome('first load');
      check(role + ': first load (downloads everything) shows the day\'s job', cold.job && cold.adapter === 'cloud' && cold.receipts === 1800, cold);
      await sleep(1200);
      const warm = await timeHome('second load');
      check(role + ': second load shows the job from the device copy, faster', warm.job && warm.receipts === 1800 && warm.ms < cold.ms, { cold_ms: cold.ms, warm_ms: warm.ms, role: warm.role });
      await sleep(1500);
      const badge = await pg.evaluate(() => ({ role: (document.querySelector('.rolebadge') || {}).innerText, clock: !!document.querySelector('#clkBtn'), net: window.__net.length }));
      check(role + ': role badge is right after the catch-up', role === 'owner' ? /Owner/i.test(badge.role || '') : /Technician/i.test(badge.role || ''), badge);
      if (role === 'technician') { await pg.screenshot({ path: path.join(OUT, 'cloud-home-tech.png') }); check('technician: Clock in button shows', badge.clock, badge); }

      // Receipts list inside the app
      await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="receipts"]').click()); await sleep(600);
      const rl = await pg.evaluate(() => ({ view: (document.querySelector('.view.active') || {}).id, text: ((document.getElementById('view-receipts') || {}).innerText || '').slice(0, 120) }));
      check(role + ': Receipts list shows documents', rl.view === 'view-receipts' && /TKS-TEST-/.test(rl.text), rl);

      // Receipts page (separate page): opens from the device copy
      let t0 = Date.now();
      await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('.qi-box', { timeout: 8000 }).catch(() => {});
      const bt = await pg.evaluate(() => ({ ms: 0, open: !!document.querySelector('.qi-box'), customers: (document.querySelectorAll('#qiCustList option') || []).length, receipts: TKS.list('receipts').length, adapter: TKS.adapter(),
        costField: !!(document.querySelector('.qi-item .cost') && getComputedStyle(document.querySelector('.qi-item .cost')).display !== 'none') }));
      bt.ms = Date.now() - t0;
      check(role + ': Receipts page opens its builder from the device copy, already knowing the customers', bt.open && bt.adapter === 'cloud' && bt.receipts === 1800 && bt.customers >= 40 && bt.ms < 1500, bt);
      check(role + ': pricing fields follow the role (owner sees cost, technician does not)', bt.costField === (role === 'owner'), bt.costField);
      check(role + ': no page errors', errs.length === 0, errs.slice(0, 6));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
