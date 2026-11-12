// Browser test of 8z90: a NASTF D1 cannot be saved without the vehicle's colour, miles and tag ("No miles" / "No tag"
// count); each extra vehicle is asked D1 yes / no; licence + proof-of-ownership photos are filed against the receipt
// (QR code on a computer, camera button on a phone); the Register asks the same three things.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
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
// the file store + "which shop am I" the generic stand-in cloud does not have
function stubFiles() { const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__up = [];
  sb.rpc = function (name, args) { if (name === 'current_shop') return Promise.resolve({ data: 'shop-1', error: null }); return real(name, args); };
  sb.storage.from = function (bucket) { return { upload: function (p, blob) { window.__up.push(bucket + ' ' + p + ' ' + (blob && blob.type)); return Promise.resolve({ data: { path: p }, error: null }); }, createSignedUrl: function () { return Promise.resolve({ data: { signedUrl: 'about:blank' }, error: null }); } }; }; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PC = { width: 1280, height: 900, deviceScaleFactor: 1 }, PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    await pg.setViewport(PC);
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => { const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const inventory = [{ id: 'k1', shop_id: 's', name: 'TEST smart key', sku: 'T-K1', category: 'Keys/Smart Key', qty: 3, cost: 20, sell_price_cents: 15000, deleted_at: null, updated_at: iso }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], receipt_docs: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop' }, services: [{ cat: 'automotive', en: 'TEST programming', value: 'TEST programming', price: '125' }] } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
    let r;
    const setV = (sel, v, ev) => pg.evaluate((sel, v, ev) => { const e = document.querySelector(sel); if (e.type === 'checkbox') { e.checked = !!v; } else e.value = v; e.dispatchEvent(new Event(ev || 'change', { bubbles: true })); if (!ev) e.dispatchEvent(new Event('input', { bubbles: true })); }, sel, v, ev);
    const go = async () => { await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(500); return pg.evaluate(() => (document.querySelector('#qiErr') || {}).innerText || ''); };

    // ================= 1. The document builder =================
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2200);
    await pg.evaluate(stubFiles);
    await pg.evaluate(() => { const s = (id, v) => { const x = document.querySelector(id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); }; s('#qiName', 'TEST D1 Customer'); s('#qiPhone', '405-555-0404');
      const row = document.querySelector('.qi-item'); const d = row.querySelector('.qiDesc'); d.value = 'TEST key and programming'; d.dispatchEvent(new Event('input', { bubbles: true })); const a = row.querySelector('.qiAmt'); a.value = '200'; a.dispatchEvent(new Event('input', { bubbles: true })); });
    await setV('#qiVYear', '2015'); await setV('#qiVMake', 'Ford'); await setV('#qiVModel', 'F-150'); await sleep(300);
    r = await pg.evaluate(() => !!document.querySelector('#qiD1Veh0'));
    await pg.evaluate(() => Array.from(document.querySelectorAll('.qiNB')).find(x => x.dataset.n === 'Customer D1').click()); await sleep(300);
    r = { before: r, after: await pg.evaluate(() => { const w = document.querySelector('#qiD1Veh0'); return w ? w.innerText.replace(/\s+/g, ' ') : null; }) };
    check('choosing a NASTF D1 asks for the vehicle color, the miles and the tag (with "No miles" / "No tag")', r.before === false && /Vehicle color/.test(r.after || '') && /Miles \(odometer\)/.test(r.after || '') && /No miles/.test(r.after || '') && /Tag #/.test(r.after || '') && /No tag on the vehicle/.test(r.after || ''), r);
    const e1 = await go();
    await setV('#qiD1Veh0 .rd1-color', 'Blue'); const e2 = await go();
    await setV('#qiD1Veh0 .rd1-nomiles', true, 'change'); const e3 = await go();
    check('it will not save until all three are answered — one message at a time', /pick the vehicle color/.test(e1) && /type the miles, or tick “No miles”/.test(e2) && /type the tag #, or tick “No tag”/.test(e3), { e1, e2, e3 });
    await setV('#qiD1Veh0 .rd1-tag', 'abc1234');
    await pg.evaluate(() => document.getElementById('qiAddVeh').click()); await sleep(300);
    await setV('#qiMoreVeh .mvY', '2018'); await setV('#qiMoreVeh .mvMk', 'Honda'); await setV('#qiMoreVeh .mvMd', 'Civic'); await sleep(400);
    r = await pg.evaluate(() => { const w = document.querySelector('#qiMoreVeh .mvD1'); return { shown: w && w.style.display !== 'none', text: w ? w.innerText.replace(/\s+/g, ' ') : '' }; });
    const e4 = await go();
    check('a second vehicle is asked "NASTF D1 for this vehicle?" and it has to be answered', r.shown === true && /NASTF D1 for this vehicle\?/.test(r.text) && /Yes — D1 for this vehicle/.test(r.text) && /Vehicle 2: choose whether it needs a NASTF D1/.test(e4), { r, e4 });
    await pg.evaluate(() => document.querySelector('#qiMoreVeh .mvD1B[data-d="1"]').click()); await sleep(200);
    const e5 = await go();
    await setV('#qiMoreVeh .mvD1F .rd1-color', 'Red'); await setV('#qiMoreVeh .mvD1F .rd1-miles', '84210'); await setV('#qiMoreVeh .mvD1F .rd1-notag', true, 'change');
    await pg.screenshot({ path: path.join(OUT, 'd1-form.png') });
    const e6 = await go(); await sleep(600);
    r = await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST D1 Customer'); return d && { id: d.id, color: d.vehColor, miles: d.odometer, tag: d.plate, nastf: d.nastf && d.nastf.type, v2: d.moreVehicles && d.moreVehicles[0], pv: document.querySelector('.rc-body') ? document.querySelector('.rc-body').innerText.replace(/\s+/g, ' ') : '' }; });
    check('"Yes" for vehicle 2 needs its own three answers; then it saves', /Vehicle 2 \(NASTF D1\): pick the vehicle color/.test(e5) && e6 === '' && !!r, { e5, e6 });
    check('saved: Blue / No miles / ABC1234 on the first vehicle; vehicle 2 = D1, Red / 84210 / No tag', !!r && r.color === 'Blue' && r.miles === 'No miles' && r.tag === 'ABC1234' && r.nastf === 'Customer D1' && r.v2 && r.v2.d1 === true && r.v2.color === 'Red' && r.v2.odometer === '84210' && r.v2.plate === 'No tag' && r.v2._n === undefined, r && { color: r.color, miles: r.miles, tag: r.tag, v2: r.v2 });
    check('the printed receipt shows them', !!r && /Color: Blue/.test(r.pv) && /Plate: ABC1234/.test(r.pv) && /Vehicle 2: 2018 Honda Civic · NASTF D1 — Red, 84210 mi, No tag/.test(r.pv), r && r.pv.slice(0, 600));
    const rid = r && r.id;

    // ---- the photo box on the finished receipt (a computer: QR + upload from this computer) ----
    await sleep(600);
    r = await pg.evaluate(() => { const bx = document.querySelector('.d1-docs'); return bx ? { text: bx.innerText.replace(/\s+/g, ' '), qr: !!bx.querySelector('.rd-qr svg'), pcBtn: Array.from(bx.querySelectorAll('[data-add]')).map(x => x.innerText)[0] } : null; });
    check('the finished D1 receipt shows the photo box: licence + proof of ownership for EACH D1 vehicle, all missing, with a QR code and "Upload from this computer"',
      !!r && /D1 photos — /.test(r.text) && /3 still missing/.test(r.text) && /Driver's license Missing/.test(r.text) && /Proof of ownership — 2015 Ford F-150 Missing/.test(r.text) && /Proof of ownership — 2018 Honda Civic Missing/.test(r.text) && r.qr === true && /Upload from this computer/.test(r.pcBtn || '') && /Add them from a phone/.test(r.text), r);
    await pg.evaluate(() => document.querySelector('.d1-docs').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'd1-photos-pc.png') });
    r = await pg.evaluate(async (rid) => { const f = new File([new Uint8Array([1, 2, 3])], 'a.pdf', { type: 'application/pdf' });
      const a = await TKS_RDOCS.add(rid, 'license', 0, f), b2 = await TKS_RDOCS.add(rid, 'ownership', 1, f);
      document.querySelector('.d1-docs [data-refresh]').click(); await new Promise(res => setTimeout(res, 700));
      return { a, b2, up: window.__up, rows: JSON.parse(localStorage.getItem('__db')).receipt_docs.map(x => [x.receipt_id === rid, x.kind, x.veh_idx, /^shop-1\//.test(x.path)].join(' ')), text: document.querySelector('.d1-docs').innerText.replace(/\s+/g, ' ') }; }, rid);
    check('a file is stored in the private folder and filed against THIS receipt (and the right vehicle); the box updates', r.a.ok && r.b2.ok && r.up.length === 2 && /^receipt-docs shop-1\//.test(r.up[0]) && r.rows.join(' | ') === 'true license 0 true | true ownership 1 true' &&
      /1 still missing/.test(r.text) && /Driver's license ✓ 1 on file/.test(r.text) && /Proof of ownership — 2018 Honda Civic ✓ 1 on file/.test(r.text) && /Proof of ownership — 2015 Ford F-150 Missing/.test(r.text), { rows: r.rows, text: r.text.slice(0, 500) });

    // ---- the phone that scanned the QR code ----
    const url = await pg.evaluate((rid) => TKS_RDOCS.pageUrl({ id: rid }), rid);
    await pg.setViewport(PHONE);
    await pg.goto(url, { waitUntil: 'domcontentloaded' }); await sleep(3000);
    r = await pg.evaluate(() => ({ text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 700), builder: !!document.querySelector('.qi-box'), cam: Array.from(document.querySelectorAll('[data-add][data-cam]')).length, qr: !!document.querySelector('.rd-qr') }));
    check('the QR address opens straight on that receipt\'s photo page on the phone: camera buttons, no blank document, no second QR', /bittings\.html\?docs=/.test(url) && /Photos for TKS-/.test(r.text) && /TEST D1 Customer/.test(r.text) && r.builder === false && r.cam >= 3 && r.qr === false && /Take photo/.test(r.text), { url, r });
    await pg.screenshot({ path: path.join(OUT, 'd1-photos-phone.png') });

    // ================= 2. The Register =================
    await pg.setViewport(PC);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="payments"]').click()); await sleep(1000);
    r = await pg.evaluate(() => { posAddLine({ type: 'custom', desc: 'TEST key', unitCents: 20000, taxable: true }); _chgUnlocked = true; posSetNastf('Customer D1'); const bx = document.getElementById('posD1Fields'); return { shown: bx.style.display !== 'none', text: bx.innerText.replace(/\s+/g, ' ') }; });
    check('Register: a D1 sale shows the same three questions', r.shown && /Vehicle color/.test(r.text) && /No miles/.test(r.text) && /No tag/.test(r.text), r);
    r = await pg.evaluate(() => { posCheckoutThen('cash'); return document.getElementById('chgStatus').innerText; });
    check('Register: it will not take the payment until they are answered', /NASTF D1: pick the vehicle color/.test(r), r);
    r = await pg.evaluate(() => { const bx = document.getElementById('posD1Fields'); const s = (sel, v) => { const e = bx.querySelector(sel); if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); };
      s('.rd1-color', 'White'); s('.rd1-miles', '120500'); s('.rd1-notag', true); posVeh.year = '2015'; posVeh.make = 'Ford'; posVeh.model = 'F-150'; const p = posBuildPayload(); posSetNastf(''); const p2 = posBuildPayload(); return { veh: p.vehicle, nastf: p.nastf, plain: p2.vehicle }; });
    check('Register: the answers go with the sale\'s vehicle (and a sale that is not a D1 is unchanged)', !!r.veh && r.veh.color === 'White' && r.veh.odometer === '120500' && r.veh.plate === 'No tag' && r.veh.make === 'Ford' && r.nastf === 'Customer D1' && !!r.plain && r.plain.color === undefined, r);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
