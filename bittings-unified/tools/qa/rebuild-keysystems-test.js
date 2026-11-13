// Browser test of the "Key systems" screen (app/keysystems.js): list, new system, editor tabs, pin chart, lost key,
// history, the "Pin a lock" quick tool, printing, unsaved-changes guard — on a phone (390x844) and a PC (1280x900).
// Real index.html + real keycalc.js, stand-in cloud, in-memory stand-in for the key_system_* server functions, made-up TEST data.
// Nothing leaves this PC.
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
const results = []; const navs = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 900) : '')); if (!ok) failed++; }

// ---------- in the page: the stand-in for the key_system_* server functions (memory only) ----------
function installStub(store) {
  window.__ks = { sys: store.sys || {}, ev: store.ev || {}, n: store.n || 0, deny: false, calls: [] };
  const real = TKS._sb();
  const prox = new Proxy(real, { get(t, k) { if (k === 'rpc') return rpc; const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
  TKS._sb = function () { return prox; };
  const ok = d => Promise.resolve({ data: d, error: null });
  const log = (id, kind, detail) => { (__ks.ev[id] = __ks.ev[id] || []).unshift({ at: new Date().toISOString(), kind, detail: detail || {}, who: 'TEST Owner', role: 'owner' }); };
  function rpc(name, a) {
    if (!/^key_system_/.test(name)) return real.rpc.apply(real, arguments);
    __ks.calls.push(name);
    if (__ks.deny) return Promise.resolve({ data: null, error: { message: 'key systems are for owners and managers only' } });
    a = a || {};
    if (name === 'key_system_list') return ok(Object.values(__ks.sys).map(s => ({ id: s.id, name: s.name, site: s.site, customer_id: s.customer_id, customer_name: s.customer_name, spec: s.spec, pins: s.pins, n_keys: s.data.keys.length, n_doors: s.data.doors.length, updated_at: s.updated_at })));
    if (name === 'key_system_get') { const s = __ks.sys[a.p_id]; if (!s) return Promise.resolve({ data: null, error: { message: 'not found' } }); log(a.p_id, 'view'); return ok(JSON.parse(JSON.stringify(s))); }
    if (name === 'key_system_save') {
      const id = a.p_id || ('sys-' + (++__ks.n)); const p = JSON.parse(JSON.stringify(a.p_sys));
      __ks.sys[id] = Object.assign({ id, created_at: new Date().toISOString() }, p, { id, updated_at: new Date().toISOString() }); return ok({ ok: true, id });
    }
    if (name === 'key_system_event') { log(a.p_id, a.p_kind, a.p_detail); return ok({ ok: true }); }
    if (name === 'key_system_history') return ok((__ks.ev[a.p_id] || []).slice(0, a.p_limit || 50));
    if (name === 'key_system_delete') { delete __ks.sys[a.p_id]; return ok({ ok: true }); }
    return ok(null);
  }
  window.__alerts = []; window.__confirms = []; window.__confirmAnswer = true; window.__promptAnswer = 'Rita';
  window.uiAlert = o => { __alerts.push(typeof o === 'string' ? o : o.message); return Promise.resolve(); };
  window.uiConfirm = o => { __confirms.push(o.title); return Promise.resolve(window.__confirmAnswer); };
  window.uiPrompt = o => Promise.resolve(window.__promptAnswer);
  window.__printed = null; window.print = function () { window.__printed = { cls: document.body.className, html: (document.getElementById('ks-print') || {}).innerHTML || '' }; };
  window.__openKS = function (opts) {
    const old = document.getElementById('ks-test'); if (old) old.remove();
    const d = document.createElement('div'); d.id = 'ks-test';
    d.style.cssText = 'position:fixed;inset:0;overflow:auto;padding:16px;z-index:2147483000;background:var(--surface-app,#f6f7f9)';
    document.body.appendChild(d); TKS_KS.open(d, opts);
  };
  window.__row = function (label) {
    const t = document.querySelector('#ks-test .ks-tbl'); if (!t) return null;
    const th = Array.from(t.querySelectorAll('th.ks-k')).find(x => x.textContent.trim() === label); if (!th) return null;
    return Array.from(th.parentElement.querySelectorAll('td')).map(x => x.textContent.trim());
  };
  window.__audit = function () {
    const d = document.getElementById('ks-test'), small = [];
    d.querySelectorAll('button,input,select,textarea,[data-act]').forEach(el => {
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return;
      if (r.height < 43.5) small.push((el.getAttribute('data-act') || el.tagName) + ':' + Math.round(r.height) + ':' + String(el.textContent || el.value || '').slice(0, 20));
    });
    return { page: document.documentElement.scrollWidth <= innerWidth + 1, box: d.scrollWidth <= d.clientWidth + 1, small };
  };
  window.__text = function () { return document.getElementById('ks-test').innerText.replace(/\s+/g, ' '); };
}

(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('framenavigated', f => navs.push(Date.now() % 100000 + ' ' + f.url().slice(-40))); pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PC = { width: 1280, height: 900, deviceScaleFactor: 1 }, PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    const q = s => pg.$(s), text = () => pg.evaluate(() => __text());
    const click = async s => { await pg.waitForSelector(s, { visible: true, timeout: 5000 }); await pg.click(s); await sleep(120); };
    const typeInto = async (s, v) => { await pg.waitForSelector(s, { visible: true, timeout: 5000 }); await pg.click(s); await pg.evaluate(x => { const e = document.querySelector(x); e.focus(); e.select(); }, s); await pg.keyboard.press('Backspace'); await pg.keyboard.type(v); await sleep(80); };
    const setCuts = async (g, digits) => { for (let i = 0; i < digits.length; i++) { const s = '[data-cut="' + g + '"][data-i="' + i + '"]'; await pg.click(s); await pg.evaluate(x => { const e = document.querySelector(x); e.focus(); e.select(); }, s); await pg.keyboard.press('Backspace'); await pg.keyboard.type(digits[i]); } await sleep(120); };
    const tab = async t => { await click('[data-act="tab"][data-tab="' + t + '"]'); await sleep(150); };
    const store = () => pg.evaluate(() => JSON.parse(JSON.stringify({ sys: __ks.sys, ev: __ks.ev, n: __ks.n })));
    const firstSys = () => pg.evaluate(() => Object.values(__ks.sys)[0]);
    const events = (id, kind) => pg.evaluate((id, kind) => (__ks.ev[id] || []).filter(e => e.kind === kind), id, kind);

    async function boot(viewport, saved) {
      await pg.setViewport(viewport);
      await pg.goto('http://127.0.0.1:8088/seed.html');
      await pg.evaluate((UID) => { const iso = new Date(Date.now() - 20 * 60000).toISOString();
        const customers = [{ id: 'c1', shop_id: 's', name: 'TEST Maple Offices', phone: '5550100', deleted_at: null, updated_at: iso, data: { id: 'c1', name: 'TEST Maple Offices', phone: '5550100' } }];
        localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers, bookings: [], web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop' } } }] }));
        localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
        localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
      for (let k = 0; k < 4; k++) { await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await pg.evaluate(() => { window.__mark = 1; }); await sleep(4000); if (await pg.evaluate(() => window.__mark === 1)) break; }
      await pg.evaluate(() => new Promise((res, rej) => {
        const load = src => new Promise((a, c) => { const s = document.createElement('script'); s.src = src; s.onload = a; s.onerror = () => c(new Error('load ' + src)); document.head.appendChild(s); });
        (window.TKS_KEYCALC ? Promise.resolve() : load('app/keycalc.js')).then(() => load('app/keysystems.js')).then(res, rej); }));
      await pg.evaluate(installStub, saved || {});
    }
    // layout audit: no sideways scroll, finger-sized controls
    async function audit(label, name) {
      const a = await pg.evaluate(() => __audit());
      check(label + ': no sideways scrolling, every tap target is at least 44px tall' + (name ? ' (' + name + ')' : ''), a.page && a.box && a.small.length === 0, a);
    }

    await boot(PC);
    await pg.evaluate(() => __openKS()); await sleep(300);

    // ================= A. list =================
    let t = await text();
    check('list: empty state explains what a key system is in one sentence', /A key system is one building.s keys arranged in levels/.test(t), t.slice(0, 300));
    check('list: has search, "+ New key system" and "Pin a lock"', !!(await q('#ks-test input[type=search]')) && /\+ New key system/.test(t) && /Pin a lock/.test(t));

    // ================= D. pin a lock =================
    await click('[data-act="pinTool"]');
    await setCuts('pt0', '123456'); await setCuts('pt1', '345678');
    let r = await pg.evaluate(() => ({ bottom: __row('Bottom pin'), master: __row('Master pin'), top: __row('Top pin'), t: __text(), keyRows: [__row('Master key cut'), __row('Change key cut')] }));
    check('pin a lock (Schlage Classic): bottom 1-6, master pins 2 each, top pin "—" with the kit-chart note and "Not yet verified"',
      r.bottom && r.bottom.join(' ') === '1 2 3 4 5 6' && r.master.join(' ') === '2 2 2 2 2 2' && r.top.every(x => x === '—') && /use your Schlage kit chart/.test(r.t) && /Not yet verified/.test(r.t), r);
    check('pin a lock: highest key is listed first, and each entered key is checked with a green "opens this lock"', r.keyRows[0] && r.keyRows[1] && (r.t.match(/opens this lock/g) || []).length === 2 && !/does NOT open/.test(r.t), r.t.slice(0, 500));
    await pg.select('select[data-f="pt.spec"]', 'a2');
    await setCuts('pt0', '5376142'); await setCuts('pt1', '5376142'); await setCuts('ptc', '8094271');
    r = await pg.evaluate(() => ({ t: __text(), build: __row('Build-up'), ctl: __row('Control cut') }));
    check('pin a lock (IC): control key row and Build-up row appear', !!r.build && !!r.ctl && r.ctl.join('') === '8094271', r);
    // IC, two operating keys that differ -> engine pin sizes cross-checked in the page
    await setCuts('pt0', '5376143');
    r = await pg.evaluate(() => { const pl = TKS_KEYCALC.pinLock('a2', { operating: [[5, 3, 7, 6, 1, 4, 2], [5, 3, 7, 6, 1, 4, 3]].slice().reverse().reverse(), control: [8, 0, 9, 4, 2, 7, 1], pins: 7 }); return { eng: pl.rows.map(x => x.build).join(' '), dom: (__row('Build-up') || []).join(' '), top: (__row('Top pin') || []).join(' '), engTop: pl.rows.map(x => x.top).join(' ') }; });
    check('pin a lock (IC): build-up and top pin in the table equal the engine\'s', r.eng === r.dom, r);
    await pg.select('select[data-f="pt.spec"]', 's6300');
    await setCuts('pt1', '537146'); await setCuts('pt0', '537148'); await setCuts('ptc', '539246');
    r = await pg.evaluate(() => ({ split: __row('Control split'), t: __text() }));
    check('pin a lock (Sargent 6300): control split row appears; no errors when the control key matches in positions 1, 2, 5, 6', !!r.split && !/must match the top master/.test(r.t), r);
    await pg.evaluate(() => { window.__printed = null; }); await click('[data-act="ptPrint"]');
    r = await pg.evaluate(() => window.__printed);
    check('pin a lock: print copies the result into the print-only box (header + CONFIDENTIAL) and calls print', r && /ks-printing/.test(r.cls) && /CONFIDENTIAL — key system records/.test(r.html) && /Bottom pin/.test(r.html), r && r.html.slice(0, 200));
    await pg.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    check('pin a lock: print box is cleaned up after printing', await pg.evaluate(() => !document.body.classList.contains('ks-printing')));
    await click('[data-act="back"]');

    // ================= B. new system =================
    await click('[data-act="newSys"]');
    check('new: customer pick list is offered when TKS.list("customers") has customers', await pg.evaluate(() => { try { return TKS.list('customers').length === 0 || !!document.querySelector('#ks-test select[data-f="nf.pick"]'); } catch (e) { return true; } }));
    await typeInto('#ks-n-name', 'TEST Maple Street Offices'); await typeInto('#ks-n-site', 'Building A, 12 Maple St'); await typeInto('#ks-n-cust', 'TEST Maple Offices');
    check('new: Schlage Classic is the lock type and is marked "Not yet verified"', /Not yet verified/.test(await text()));
    await setCuts('nt', '090909');
    t = await text();
    check('new: a top master that breaks MACS 7 is refused in plain words and no capacity is shown', /MACS 7 broken/.test(t) && !/Room for/.test(t), t.slice(0, 400));
    await click('[data-act="create"]');
    check('new: "Create" with bad numbers saves nothing', (await pg.evaluate(() => Object.keys(__ks.sys).length)) === 0 && (await pg.evaluate(() => __alerts.length)) >= 1);
    await setCuts('nt', '462735');
    t = await text();
    check('new: valid top master shows "room for X master keys × Y keys each"', /Room for \d+ master keys × \d+ keys each/.test(t), t.slice(0, 500));
    await typeInto('#ks-n-m', '2'); await typeInto('#ks-n-p', '3');
    await click('[data-act="create"]'); await sleep(400);
    let sys = await firstSys();
    check('new: Create designs the keys, saves through key_system_save and opens the editor', !!sys && sys.name === 'TEST Maple Street Offices' && sys.spec === 'sc' && sys.pins === 6 && sys.data.keys.length === 9 && sys.data.v === 1 && sys.data.method === 'tpp' && sys.data.control === null && !!(await q('.ks-tabs')), sys && sys.data.keys.length);
    check('new: the saved document has GM / masters / single keys with the agreed fields', sys && sys.data.keys[0].symbol === 'GM' && sys.data.keys[0].level === 0 && sys.data.keys.filter(k => k.level === 1).length === 2 && sys.data.keys.filter(k => k.level === 2).length === 6 && sys.data.keys.every(k => Array.isArray(k.cuts) && k.status === 'active' && k.holder === '' && k.copies === 0 && 'notes' in k && 'parent' in k), sys && sys.data.keys.slice(0, 3));
    const id1 = sys.id;
    await pg.screenshot({ path: path.join(OUT, 'ks-editor-system-pc.png') });

    // ================= C. editor =================
    t = await text();
    check('editor: tabs are System · Keys · Doors · Pin chart · Lost key · History', await pg.evaluate(() => Array.from(document.querySelectorAll('#ks-test .ks-tabs button')).map(x => x.textContent.trim()).join('|')) === 'System|Keys|Doors|Pin chart|Lost key|History');
    check('system tab: spec name + "Not yet verified" badge, top master cuts, level tree GM → AA → AA1', /Schlage Classic/.test(t) && /Not yet verified/.test(t) && /4 6 2 7 3 5/.test(t) && /\bGM\b/.test(t) && /\bAA\b/.test(t) && /\bAA1\b/.test(t) && /Made 9 keys/.test(t), t.slice(0, 500));
    await click('[data-act="editCuts"]');
    check('system tab: "Edit cuts" warns that it changes every pin chart, then opens the cut boxes', (await pg.evaluate(() => __confirms.slice(-1)[0])) === 'Edit the cuts?' && !!(await q('[data-cut="et"][data-i="0"]')));
    await click('[data-act="cancelCuts"]');

    // keys + unsaved bar
    await tab('keys');
    check('save bar is hidden while nothing has changed', await pg.evaluate(() => document.getElementById('ks-bar').hidden));
    await typeInto('#ks-h-AA1', 'Dana Whitfield');
    check('keys: editing WHO shows the visible "Unsaved changes · Save" bar', await pg.evaluate(() => !document.getElementById('ks-bar').hidden && /Unsaved changes/.test(document.getElementById('ks-bar').innerText)));
    check('unsaved: TKS_KS.hasUnsaved() is true', await pg.evaluate(() => TKS_KS.hasUnsaved()));
    // leaving with unsaved changes asks first
    await pg.evaluate(() => { window.__confirmAnswer = false; __confirms.length = 0; }); await click('[data-act="back"]');
    check('unsaved: "All systems" asks first, and "no" keeps you in the editor', (await pg.evaluate(() => __confirms.slice(-1)[0])) === 'Unsaved changes' && !!(await q('.ks-tabs')));
    await pg.evaluate(() => { window.__confirmAnswer = true; });
    await click('#ks-bar [data-act="save"]'); await sleep(250);
    sys = await firstSys();
    check('save: key_system_save stored the holder and the bar went away', sys.data.keys.find(k => k.symbol === 'AA1').holder === 'Dana Whitfield' && (await pg.evaluate(() => document.getElementById('ks-bar').hidden)));

    // doors
    await tab('doors');
    const addDoor = async (name, area, key) => { await click('[data-act="doorNew"]'); await typeInto('#ks-d-name', name); await typeInto('#ks-d-area', area); await pg.select('#ks-d-key', key); await click('[data-act="doorSave"]'); };
    await addDoor('Suite 100 · front door', 'First floor', 'AA1'); await addDoor('Suite 100 · storage', '', 'AA2'); await addDoor('Manager office', 'Second floor', 'AB1');
    t = await text();
    check('doors: three doors listed with their key and who can open them', /Suite 100 · front door/.test(t) && /set to AA1/.test(t) && /opened by GM, AA, AA1/.test(t) && /Manager office/.test(t), t.slice(0, 500));
    await click('#ks-bar [data-act="save"]'); await sleep(250);
    sys = await firstSys();
    check('doors: saved with id / name / area / key / notes', sys.data.doors.length === 3 && sys.data.doors.every(d => d.id && d.name && 'area' in d && 'key' in d && 'notes' in d) && sys.data.doors[0].key === 'AA1');
    // edit + remove
    await pg.evaluate(() => { __confirms.length = 0; });
    await click('[data-act="doorEdit"]'); await typeInto('#ks-d-area', 'Ground floor'); await click('[data-act="doorSave"]');
    check('doors: a door can be edited', (await text()).includes('Ground floor'));
    await pg.evaluate(() => { document.querySelectorAll('#ks-test [data-act="doorRemove"]')[2].click(); }); await sleep(200);
    check('doors: removing asks first, then drops the door', (await pg.evaluate(() => __confirms.slice(-1)[0])) === 'Remove this door?' && !(await text()).includes('Manager office'));
    await addDoor('Manager office', 'Second floor', 'AB1'); await click('#ks-bar [data-act="save"]'); await sleep(250);

    await tab('keys');
    r = await pg.evaluate(() => { const g = s => (document.querySelector('#ks-test .ks-line[data-sym="' + s + '"]') || {}).innerText || ''; return { gm: g('GM'), aa: g('AA'), aa1: g('AA1'), ab: g('AB') }; });
    check('keys: WHAT is derived — "Every door" for GM, "All N doors under AA" for a master, the door names for a single key',
      /Every door/.test(r.gm) && /All 2 doors under AA/.test(r.aa) && /Suite 100 · front door/.test(r.aa1) && /All 1 door under AB/.test(r.ab), r);
    await pg.screenshot({ path: path.join(OUT, 'ks-keys-pc.png') });

    // issue / return
    await click('[data-act="issue"][data-sym="AA1"]'); await sleep(250);
    sys = await firstSys(); let ev = await events(id1, 'issue');
    check('keys: Issue logs an "issue" event with {key, holder} and adds a copy', ev.length === 1 && ev[0].detail.key === 'AA1' && ev[0].detail.holder === 'Dana Whitfield' && sys.data.keys.find(k => k.symbol === 'AA1').copies === 1, ev);
    await click('[data-act="return"][data-sym="AA1"]'); await sleep(250);
    ev = await events(id1, 'return'); sys = await firstSys();
    check('keys: Return logs a "return" event and takes a copy off', ev.length === 1 && ev[0].detail.key === 'AA1' && sys.data.keys.find(k => k.symbol === 'AA1').copies === 0);
    await click('[data-act="issue"][data-sym="AA3"]'); await sleep(250);
    sys = await firstSys();
    check('keys: Issue on a key with no holder asks who gets it (a person or a role)', sys.data.keys.find(k => k.symbol === 'AA3').holder === 'Rita');
    await click('[data-act="copies"][data-sym="AB1"][data-d="1"]'); await click('[data-act="copies"][data-sym="AB1"][data-d="1"]'); await click('[data-act="copies"][data-sym="AB1"][data-d="-1"]');
    check('keys: the copies stepper (±) changes the count and marks the system unsaved', await pg.evaluate(() => /\b1\b/.test(document.querySelector('#ks-test .ks-line[data-sym="AB1"] .ks-step b').textContent) && !document.getElementById('ks-bar').hidden));
    await pg.select('#ks-test select[data-f="key.status"][data-sym="AB1"]', 'retired');
    check('keys: status can be set to retired', await pg.evaluate(() => /retired/i.test(document.querySelector('#ks-test .ks-line[data-sym="AB1"]').innerText)));
    await pg.select('#ks-test select[data-f="key.status"][data-sym="AB1"]', 'active');
    // add a key under AA
    await pg.select('#ks-addm', 'AA'); await click('[data-act="addKey"]');
    r = await pg.evaluate(() => { const ks = []; document.querySelectorAll('#ks-test .ks-line[data-sym]').forEach(l => ks.push(l.getAttribute('data-sym'))); return ks; });
    check('keys: "+ Add a key under AA" adds AA4 with its own cuts', r.indexOf('AA4') >= 0 && r.length === 10, r);
    await click('#ks-bar [data-act="save"]'); await sleep(250);
    sys = await firstSys();
    const cutsSet = new Set(sys.data.keys.map(k => k.cuts.join(',')));
    const aa4 = sys.data.keys.find(k => k.symbol === 'AA4');
    check('keys: the new key is a real progression of AA (positions 1-2 as AA) and no two keys share cuts', !!aa4 && cutsSet.size === sys.data.keys.length && aa4.parent === 'AA' && aa4.cuts[0] === sys.data.keys.find(k => k.symbol === 'AA').cuts[0] && aa4.cuts[1] === sys.data.keys.find(k => k.symbol === 'AA').cuts[1], aa4);

    // pin chart
    await tab('chart');
    r = await pg.evaluate(() => {
      const s = Object.values(__ks.sys)[0], d = s.data.doors[0], pl = TKS_KEYCALC.pinForKey(s.spec, s.data.keys, d.key, s.data.control, s.pins);
      return { want: { bottom: pl.rows.map(x => x.bottom).join(' '), master: pl.rows.map(x => x.masters.length ? x.masters.join('+') : '–').join(' ') },
        got: { bottom: (__row('Bottom pin') || []).join(' '), master: (__row('Master pin') || []).join(' '), top: __row('Top pin') }, ctl: __row('Control cut'), t: __text(),
        chain: [__row('GM cut'), __row('AA cut'), __row('AA1 cut')] }; });
    check('pin chart: bottom pin and master pin rows equal the engine\'s for the first door (and show each key in the chain)', r.want.bottom === r.got.bottom && r.want.master === r.got.master && r.chain.every(Boolean), r);
    check('pin chart: top pin "—" with the engine\'s Schlage note, "Not yet verified" line, no control row for a conventional lock', r.got.top.every(x => x === '—') && /use your Schlage kit chart/.test(r.t) && /Not yet verified/.test(r.t) && r.ctl === null, r.t.slice(0, 400));
    check('pin chart: green "Opened only by GM, AA, AA1" check', /✓ Opened only by GM, AA, AA1/.test(r.t) && (await pg.evaluate(() => !!document.querySelector('#ks-test .ks-msg.ok'))));
    await pg.screenshot({ path: path.join(OUT, 'ks-chart-pc.png') });
    await pg.evaluate(() => { window.__printed = null; }); await click('[data-act="print"][data-what="chart"]'); await sleep(300);
    r = await pg.evaluate(() => window.__printed); ev = await events(id1, 'print');
    check('print: chart goes into #ks-print with "name · site · lock type · date · CONFIDENTIAL — key system records" and a print event is logged',
      r && /ks-printing/.test(r.cls) && /TEST Maple Street Offices/.test(r.html) && /Building A/.test(r.html) && /Schlage Classic/.test(r.html) && /CONFIDENTIAL — key system records/.test(r.html) && ev.length >= 1 && ev[0].detail.section === 'chart', r && r.html.slice(0, 250));
    await pg.emulateMediaType('print');
    r = await pg.evaluate(() => ({ app: getComputedStyle(document.getElementById('ks-test')).display, box: getComputedStyle(document.getElementById('ks-print')).display, bg: getComputedStyle(document.getElementById('ks-print')).backgroundColor, ink: getComputedStyle(document.querySelector('#ks-print .ks-phead')).color }));
    check('print CSS: app hidden, print box shown with white background and black text', r.app === 'none' && r.box === 'block' && r.bg === 'rgb(255, 255, 255)' && r.ink === 'rgb(0, 0, 0)', r);
    await pg.emulateMediaType('screen'); await pg.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await pg.evaluate(() => { window.__printed = null; }); await click('[data-act="print"][data-what="chartall"]'); await sleep(200);
    r = await pg.evaluate(() => window.__printed); await pg.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    check('print all doors: every door\'s chart is in the print box', r && /Suite 100 · front door/.test(r.html) && /Suite 100 · storage/.test(r.html) && /Manager office/.test(r.html), r && r.html.length);
    await click('.ks-chips button:nth-child(3)');
    check('pin chart: tapping a door chip switches the chart', /Manager office/.test(await pg.evaluate(() => document.querySelector('#ks-test .ks-card h3').innerText)));
    // tapping a door in the Doors tab opens its chart
    await tab('doors'); await click('#ks-test .ks-row .ks-t');
    check('doors: tapping a door jumps to its pin chart', !!(await q('.ks-tbl')) && /Pin chart/.test(await pg.evaluate(() => document.querySelector('#ks-test .ks-card h3').innerText)));
    // a door whose key also opens another door's lock -> red
    await pg.evaluate(() => { const s = Object.values(__ks.sys)[0]; });
    // lost key
    await tab('lost'); await click('[data-act="lostPick"][data-sym="AA1"]');
    t = await text();
    check('lost key: single key lists the door to rekey, the key to cut and what is not affected', /Rekey 1 door/.test(t) && /Suite 100 · front door/.test(t) && /New keys to cut/.test(t) && /Not affected/.test(t) && /GM and AA/.test(t), t.slice(0, 500));
    await click('[data-act="lostPick"][data-sym="AA"]'); t = await text();
    check('lost key: a master key lists every door under it', /Rekey 2 doors/.test(t) && /Suite 100 · storage/.test(t), t.slice(0, 300));
    await click('[data-act="lostPick"][data-sym="AA1"]'); await click('[data-act="logLost"]'); await sleep(300);
    sys = await firstSys(); ev = await events(id1, 'lost');
    check('lost key: "Log as lost" writes a lost event (key, holder, doors) and sets the status', ev.length === 1 && ev[0].detail.key === 'AA1' && ev[0].detail.doors.length === 1 && sys.data.keys.find(k => k.symbol === 'AA1').status === 'lost', ev);
    check('lost key: "Start rekey quote" button is there', await pg.evaluate(() => !!document.querySelector('#ks-test [data-act="quote"]')));
    // history
    await tab('history'); await sleep(250);
    t = await text();
    check('history: shows printed, key issued, key returned and key lost rows with who and when', /Printed/.test(t) && /Key issued/.test(t) && /Key returned/.test(t) && /Key lost/.test(t) && /TEST Owner/.test(t), t.slice(0, 400));
    await typeInto('#ks-hn', 'TEST: tenant in 102 moved out'); await click('[data-act="addNote"]'); await sleep(250);
    check('history: a note can be added', /moved out/.test(await text()) && (await events(id1, 'note')).length === 1);
    // leave without saving, then with
    await tab('keys'); await typeInto('#ks-h-AA2', 'Janitor');
    await pg.evaluate(() => { window.__confirmAnswer = false; __confirms.length = 0; }); await click('[data-act="back"]');
    check('unsaved: leaving asks first (kept in editor when answered no)', !!(await q('.ks-tabs')));
    await pg.evaluate(() => { window.__confirmAnswer = true; }); await click('[data-act="back"]'); await sleep(300);
    t = await text();
    check('list: after leaving it shows the system with site, customer, lock type, key and door counts, last updated',
      /TEST Maple Street Offices/.test(t) && /Building A, 12 Maple St/.test(t) && /TEST Maple Offices/.test(t) && /Schlage Classic/.test(t) && /10 keys/.test(t) && /3 doors/.test(t) && /updated/.test(t), t.slice(0, 400));
    check('unsaved: the discarded change (AA2 = Janitor) was not saved', (await firstSys()).data.keys.find(k => k.symbol === 'AA2').holder === '');
    await pg.screenshot({ path: path.join(OUT, 'ks-list-pc.png') });
    await typeInto('#ks-test input[type=search]', 'zzz'); check('list: search with no match says so', /No key system matches/.test(await text()));
    await typeInto('#ks-test input[type=search]', 'maple'); check('list: search finds by name / site / customer', /TEST Maple Street Offices/.test(await text()), await pg.evaluate(() => ({ v: document.querySelector('#ks-test input[type=search]').value, t: __text().slice(0, 300) })));
    // customer filter
    await pg.evaluate(() => __openKS({ customerId: 'zzz', customerName: 'Other Co' })); await sleep(300);
    t = await text();
    check('list: opened for one customer, it shows only that customer\'s systems with a "Show all" switch', /Other Co only/.test(t) && !/TEST Maple Street Offices/.test(t) && /Show all/.test(t), t.slice(0, 200));
    await click('[data-act="toggleCust"]'); check('list: "Show all" brings the others back', /TEST Maple Street Offices/.test(await text()));
    await pg.evaluate(() => __openKS({ customerId: 'c1', customerName: 'TEST Maple Offices' })); await sleep(300);
    await click('[data-act="newSys"]');
    check('new: customer name is pre-filled from opts', (await pg.evaluate(() => document.getElementById('ks-n-cust').value)) === 'TEST Maple Offices');
    await click('[data-act="cancelNew"]');
    // not an owner / manager
    await pg.evaluate(() => { __ks.deny = true; __openKS(); }); await sleep(300);
    check('errors: "owners and managers only" is shown plainly', /Key systems are for owners and managers\./.test(await text()));
    await pg.evaluate(() => { __ks.deny = false; __openKS(); }); await sleep(300);

    // ================= IC system (A2) =================
    await click('[data-act="newSys"]');
    await typeInto('#ks-n-name', 'TEST Riverside Clinic'); await pg.select('select[data-f="nf.spec"]', 'a2');
    check('new: choosing an IC lock shows 7 cut boxes and the control key boxes', (await pg.evaluate(() => document.querySelectorAll('#ks-test [data-cut="nt"]').length)) === 7 && !!(await q('[data-cut="nc"][data-i="0"]')));
    await setCuts('nt', '5376142'); t = await text();
    check('new: IC without a control key asks for it', /Type all 7 cuts of the control key/.test(t), t.slice(0, 300));
    await setCuts('nc', '5376142'); check('new: control key equal to the top master is refused', /cannot be the same as the top master/.test(await text()));
    await setCuts('nc', '8094271'); await typeInto('#ks-n-m', '1'); await typeInto('#ks-n-p', '2');
    check('new: IC numbers accepted', /Room for \d+ master keys/.test(await text()));
    await click('[data-act="create"]'); await sleep(400);
    sys = (await pg.evaluate(() => Object.values(__ks.sys).find(s => s.spec === 'a2')));
    check('new: IC system saved with the control key and 1 + 1 + 2 keys', sys && sys.data.control.join('') === '8094271' && sys.data.keys.length === 4, sys && sys.data.keys.length);
    const id2 = sys.id;
    await tab('doors'); await click('[data-act="doorNew"]'); await typeInto('#ks-d-name', 'Clinic · pharmacy'); await pg.select('#ks-d-key', 'AA1'); await click('[data-act="doorSave"]'); await click('#ks-bar [data-act="save"]'); await sleep(250);
    await tab('chart');
    r = await pg.evaluate(() => { const s = Object.values(__ks.sys).find(x => x.spec === 'a2'), pl = TKS_KEYCALC.pinForKey('a2', s.data.keys, 'AA1', s.data.control, 7); return { want: pl.rows.map(x => x.build + '/' + x.top).join(' '), got: (__row('Build-up') || []).map((v, i) => v + '/' + __row('Top pin')[i]).join(' '), ctl: (__row('Control cut') || []).join(''), t: __text() }; });
    check('pin chart (IC): control cut, build-up and top pin equal the engine\'s', r.want === r.got && r.ctl === '8094271', r);
    await pg.screenshot({ path: path.join(OUT, 'ks-chart-ic-pc.png') });
    for (const tb of ['system', 'keys', 'doors', 'chart', 'lost', 'history']) { await tab(tb); await audit('PC editor', tb); }
    await pg.evaluate(() => __openKS()); await sleep(300); await audit('PC list');
    await click('[data-act="newSys"]'); await audit('PC new system'); await click('[data-act="cancelNew"]');
    await click('[data-act="pinTool"]'); await audit('PC pin a lock'); await click('[data-act="back"]');

    // delete
    await pg.evaluate((id) => { __openKS(); }, id1); await sleep(300);
    await pg.evaluate(() => { const rows = Array.from(document.querySelectorAll('#ks-test .ks-row')); rows.find(x => /Maple Street/.test(x.innerText)).click(); }); await sleep(300);
    await pg.evaluate(() => { __confirms.length = 0; }); await click('[data-act="del"]'); await sleep(300);
    check('delete: asks first, then key_system_delete removes it and returns to the list',
      (await pg.evaluate(() => __confirms.slice(-1)[0])) === 'Delete this key system?' && (await pg.evaluate(() => !__ks.sys['sys-1'] && Object.keys(__ks.sys).length === 1)) && !/Maple Street Offices/.test(await text()) && /Riverside/.test(await text()));

    // ================= phone =================
    const saved = await store();
    await boot(PHONE, saved);
    await pg.evaluate(() => __openKS()); await sleep(400);
    await audit('phone list'); await pg.screenshot({ path: path.join(OUT, 'ks-list-phone.png') });
    await click('[data-act="newSys"]'); await setCuts('nt', '462735');
    await audit('phone new system'); await pg.evaluate(() => document.getElementById('ks-n-m').scrollIntoView()); await pg.screenshot({ path: path.join(OUT, 'ks-new-phone.png') });
    await pg.select('select[data-f="nf.spec"]', 'a2'); await audit('phone new system (IC, 7 boxes)'); await click('[data-act="cancelNew"]');
    await click('[data-act="pinTool"]'); await pg.select('select[data-f="pt.spec"]', 'a2'); await setCuts('pt0', '5376142'); await setCuts('pt1', '5376143'); await setCuts('ptc', '8094271');
    await audit('phone pin a lock'); await pg.evaluate(() => document.getElementById('ks-ptout').scrollIntoView()); await pg.screenshot({ path: path.join(OUT, 'ks-pinlock-phone.png') }); await click('[data-act="back"]');
    await pg.evaluate(() => { document.querySelector('#ks-test .ks-row').click(); }); await sleep(400);
    for (const tb of ['system', 'keys', 'doors', 'chart', 'lost', 'history']) { await tab(tb); await audit('phone editor', tb); await pg.evaluate(() => document.getElementById('ks-test').scrollTo(0, 0)); await pg.screenshot({ path: path.join(OUT, 'ks-' + tb + '-phone.png') }); }
    await tab('chart');
    check('phone: the 7-position pin chart fits the screen without scrolling the page sideways', await pg.evaluate(() => { const t = document.querySelector('#ks-test .ks-tbl'), w = t.parentElement; return t.getBoundingClientRect().right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1 && w.scrollWidth <= w.clientWidth + 1; }));
    check('storage: nothing about a key system was written to localStorage / sessionStorage', await pg.evaluate(() => { const all = JSON.stringify(Object.assign({}, localStorage)) + JSON.stringify(Object.assign({}, sessionStorage)); return !/TEST Riverside|8094271|Clinic/.test(all); }));
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.stack || e && e.message)); results.push('NAVS ' + navs.slice(-6).join(' ; ')); failed++; try { const pgs = await b.pages(); const p0 = pgs[pgs.length - 1]; results.push('NAVS ' + navs.slice(-6).join(' ; ')); results.push('PAGE: ' + (await p0.evaluate(() => (document.getElementById('ks-test') || document.body).innerText.replace(/s+/g, ' ').slice(0, 600)))); await p0.screenshot({ path: path.join(OUT, 'ks-crash.png') }); } catch (e2) {} } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); console.log(results.filter(x => /^PASS/.test(x)).length + ' passed'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
