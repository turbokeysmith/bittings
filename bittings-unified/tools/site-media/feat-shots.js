// Screenshots for the getbittings.com feature pages: the REAL app, run against the stand-in cloud with made-up sample data
// ("Your Shop", made-up customers / staff, a year of sales sized like a busy one-van shop). Nothing leaves this PC except
// the chart library and fonts. usage: node feat-shots.js [onlyDevice] → ./cand2/f-<slug>-<pc|tab|phone>.webp
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = 'D:/Work/Code/tk-phase3/bittings-unified', OUT = path.join(__dirname, 'cand2'); fs.mkdirSync(OUT, { recursive: true });
const FAKE = fs.readFileSync(path.join(ROOT, 'tools/qa/rebuild-fake-cloud.js'), 'utf8').replace("email:'samer@turbokeysmith.com'", "email:'alex@example.com'").replace("name:'TEST Owner'", "name:'Alex'");
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ONLY = process.argv[2] || '';

// ---------- seed (runs in the page) ----------
function seed() {
  const iso = new Date(Date.now() - 20 * 60000).toISOString(), now = Date.now(), D = n => { const d = new Date(Date.now() + n * 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
  const inventory = [
    K('k1', { name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', category: 'Keys/Smart Key', fitment: '2015-2020 Ford F-150', qty: 6, cost: 38, sell_price_cents: 16500, fcc_id: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM' }),
    K('k2', { name: 'Ford F-150 2015-2020 Flip Key', sku: 'FORD-N5F', category: 'Keys/Remote Head / Flip', fitment: '2015-2020 Ford F-150', qty: 4, cost: 16, sell_price_cents: 6500, fcc_id: 'N5F-A08TAA', chip: 'Hitag Pro (ID49)', grade: 'Aftermarket' }),
    K('k3', { name: 'Ford Transponder Key H92', sku: 'H92-PT', category: 'Keys/Transponder', fitment: '2011-2020 Ford F-150', qty: 12, cost: 6, sell_price_cents: 2500, chip: '4D-63 80-bit' }),
    K('k4', { name: 'Honda Civic 2016-2021 4-Button Smart Key', sku: 'HON-KR5V2X', category: 'Keys/Smart Key', fitment: '2016-2021 Honda Civic', qty: 5, cost: 29, sell_price_cents: 14500, fcc_id: 'KR5V2X', chip: 'Hitag 3 (ID47)', grade: 'Aftermarket' }),
    K('k5', { name: 'Toyota RAV4 2019-2021 3-Button Smart Key', sku: 'TOY-HYQ14FBC', category: 'Keys/Smart Key', fitment: '2019-2021 Toyota RAV4', qty: 2, cost: 41, sell_price_cents: 17500, fcc_id: 'HYQ14FBC', chip: 'Texas 8A', grade: 'OEM' }),
    K('k6', { name: 'Chevrolet Silverado 2019-2021 5-Button Flip Key', sku: 'GM-M3N-32337200', category: 'Keys/Remote Head / Flip', fitment: '2019-2021 Chevrolet Silverado 1500', qty: 7, cost: 14, sell_price_cents: 5500, fcc_id: 'M3N-32337200', chip: 'Hitag 2 (ID46)', grade: 'Aftermarket' }),
    K('k7', { name: 'Nissan Altima 2019-2023 4-Button Smart Key', sku: 'NIS-KR5TXN4', category: 'Keys/Smart Key', fitment: '2019-2023 Nissan Altima', qty: 0, cost: 27, sell_price_cents: 13500, fcc_id: 'KR5TXN4', chip: 'Hitag AES (4A)', grade: 'Aftermarket' }),
    K('k8', { name: 'Jeep Grand Cherokee 2014-2021 Smart Key', sku: 'CHR-M3N-40821302', category: 'Keys/Smart Key', fitment: '2014-2021 Jeep Grand Cherokee', qty: 3, cost: 24, sell_price_cents: 12500, fcc_id: 'M3N-40821302', chip: 'Hitag AES (4A)', grade: 'Aftermarket' }),
    K('k9', { name: 'Toyota Transponder Key TOY44H', sku: 'TOY44H-PT', category: 'Keys/Transponder', fitment: '2013-2019 Toyota Corolla', qty: 9, cost: 7, sell_price_cents: 3000, chip: 'Texas H 128-bit' }),
    K('k10', { name: 'Hyundai Elantra 2017-2020 Flip Key', sku: 'HYU-OSLOKA-423T', category: 'Keys/Remote Head / Flip', fitment: '2017-2020 Hyundai Elantra', qty: 1, cost: 15, sell_price_cents: 6000, fcc_id: 'OSLOKA-423T', chip: '4D-60 80-bit', grade: 'Aftermarket' }),
    K('k11', { name: 'Ram 1500 2013-2018 Fobik Key', sku: 'CHR-GQ4-53T', category: 'Keys/Smart Key', fitment: '2013-2018 Ram 1500', qty: 4, cost: 13, sell_price_cents: 9500, fcc_id: 'GQ4-53T', chip: 'Hitag 2 (ID46)', grade: 'Aftermarket' }),
    K('k12', { name: 'Kwikset KW1 Brass Key Blank', sku: 'KW1-BR', category: 'Keys/Mechanical', qty: 140, cost: 0.4, sell_price_cents: 400 }),
    K('a1', { name: 'Leather Key Fob Cover', sku: 'ACC-LTH', category: 'Accessories/Skins & Covers', qty: 18, cost: 3, sell_price_cents: 1500 }),
    K('a2', { name: 'Coil Key Ring', sku: 'ACC-COIL', category: 'Accessories/Lanyards & Coils', qty: 25, cost: 1, sell_price_cents: 800 })];
  const J = (id, name, day, time, veh, sub, total, status, where) => ({ id, shop_id: 's', customer_name: name, date: D(day), time, status, deleted_at: null, updated_at: iso,
    data: { id, customer: { name, phone: '555-0100' }, date: D(day), time, status, jobType: 'auto', subType: sub, technician: 'Alex', technicianId: null, vehicle: veh, quote: { total, tax: 0, subtotal: total }, address: '', serviceWhere: where || '', createdAt: now, updatedAt: now } });
  const V = (y, mk, md) => ({ year: y, make: mk, model: md });
  const bookings = [
    J('b1', 'Jordan M.', 0, '09:00', V('2015', 'Ford', 'F-150'), 'Smart key — all keys lost', 290, 'Completed'),
    J('b2', 'Riley Auto Sales', 0, '11:30', V('2019', 'Honda', 'Civic'), 'Spare key', 185, 'En Route', 'mobile'),
    J('b3', 'Casey T.', 0, '14:00', V('2021', 'Toyota', 'RAV4'), 'Smart key programming', 240, 'Scheduled', 'shop'),
    J('b4', 'Morgan P.', 0, '16:15', V('2012', 'Chevrolet', 'Malibu'), 'Ignition repair', 160, 'Scheduled'),
    J('b5', 'Taylor R.', 1, '10:00', V('2018', 'Nissan', 'Altima'), 'Smart key — spare', 210, 'Scheduled', 'shop'),
    J('b6', 'Northside Motors', 1, '13:30', V('2020', 'Jeep', 'Grand Cherokee'), 'All keys lost', 320, 'Scheduled', 'mobile'),
    J('b7', 'Sam K.', 2, '09:30', V('2016', 'Hyundai', 'Elantra'), 'Flip key', 140, 'Scheduled'),
    J('b8', 'Avery L.', 3, '15:00', V('2014', 'Ram', '1500'), 'Fobik key', 175, 'Scheduled', 'mobile'),
    J('b9', 'Drew H.', -1, '08:30', V('2017', 'Ford', 'Escape'), 'Car lockout', 85, 'Completed', 'mobile'),
    J('b10', 'Quinn B.', -1, '12:00', V('2019', 'Toyota', 'Camry'), 'Smart key — spare', 225, 'Completed', 'shop'),
    J('b11', 'Eastside Auto', -2, '10:15', V('2018', 'Chevrolet', 'Equinox'), 'Spare keys x3', 390, 'Completed', 'mobile'),
    J('b12', 'Parker W.', 2, '14:30', V('2020', 'Kia', 'Soul'), 'Ignition cylinder', 260, 'Scheduled', 'shop'),
    J('b13', 'Logan S.', 4, '11:00', V('2016', 'Honda', 'Accord'), 'All keys lost', 275, 'Scheduled', 'mobile'),
    J('b14', 'Blake F.', 1, '16:00', V('2021', 'Ford', 'Bronco Sport'), 'Smart key programming', 245, 'Scheduled', 'shop')];
  localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, customers: [], bookings, web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [], receipt_docs: [],
    shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'Ironwood Lock & Key' }, taxableByCategory: { Materials: true } } }] }));
  localStorage.setItem('tks_vehicle_keyways', JSON.stringify([{ make: 'Ford', model: 'F-150', year_start: 2015, year_end: 2020, keyway: 'HU101', transponder_system: 'Hitag Pro ID49', programming_path: 'OBD', oem_only: 'No', nastf_required: 'No' }]));
  localStorage.setItem('__role', 'owner');
  localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-2222-4333-8444-555555555555', email: 'alex@example.com' } }));
}

// ---------- server stand-ins after the app has loaded (runs in the page) ----------
function stubs() {
  // a year of made-up sales, sized like a busy shop (~$245k so far this year, ~1,300 payments, ~$190 average)
  let seedN = 7; const rnd = () => { seedN = (seedN * 16807) % 2147483647; return (seedN - 1) / 2147483646; };
  const monthly = [18400, 15900, 14800, 18900, 20300, 21100, 25300, 26100, 25200, 43200, 21600, 0];
  const techs = ['Alex', 'Jordan', 'Sam'], what = ['Smart key — all keys lost', 'Spare smart key', 'Car lockout', 'Flip key + programming', 'Transponder key', 'Ignition repair', 'Fleet spare keys', 'Key code + cut'];
  const meth = () => { const x = rnd(); return x < .6 ? 'reader' : x < .7 ? 'link' : x < .82 ? 'cash' : x < .95 ? 'cashapp' : 'check'; };
  const rows = []; const today = new Date(); let id = 0;
  monthly.forEach((target, m) => { if (!target) return; const last = (m === today.getMonth()) ? today.getDate() : new Date(today.getFullYear(), m + 1, 0).getDate();
    let left = target * 100; while (left > 3000) { const sale = Math.min(left, Math.round((60 + rnd() * 260) * 100 / 5) * 5); left -= sale;
      const day = 1 + Math.floor(rnd() * last), hr = 8 + Math.floor(rnd() * 10), parts = Math.round(sale * (.35 + rnd() * .3)), tax = Math.round(parts * .08625), cost = Math.round(parts * (.22 + rnd() * .12));
      const dt = new Date(today.getFullYear(), m, day, hr, Math.floor(rnd() * 60)); if (dt > today) continue;
      rows.push({ id: 'p' + (++id), invoice_id: 'r' + id, method: meth(), status: 'completed', base_cents: sale + tax, tax_cents: tax, cost_cents: cost, captured_cents: sale + tax, created_at: dt.toISOString(), description: what[Math.floor(rnd() * what.length)], technician: techs[Math.floor(rnd() * 3)], card_funding: 'credit' }); } });
  window.__sales = rows;
  if (window.TKPay) TKPay.dayTransactions = async function (from, to) { const a = from ? new Date(from) : new Date(0), b = to ? new Date(to) : new Date(); return { rows: rows.filter(r => { const d = new Date(r.created_at); return d >= a && d < b; }).sort((x, y) => x.created_at < y.created_at ? 1 : -1) }; };
  const sb = TKS._sb(), real = sb.rpc.bind(sb);
  const ok = v => new Promise(r => setTimeout(() => r({ data: v, error: null }), 30));
  const people = [{ user_id: 'u1', name: 'Jordan', rate: 2400 }, { user_id: 'u2', name: 'Sam', rate: 2100 }, { user_id: 'u3', name: 'Riley', rate: 1800 }];
  sb.rpc = function (name, args) {
    if (name === 'payroll_paid') { const out = []; const a = new Date(args && args.p_from || Date.now() - 3e10), b = new Date(args && args.p_to || Date.now());
      for (let t = new Date(today.getFullYear(), 0, 4); t < today; t = new Date(t.getTime() + 14 * 864e5)) { const end = new Date(t.getTime() + 13 * 864e5), pay = new Date(end.getTime() + 5 * 864e5); if (pay < a || pay >= b || pay > today) continue;
        people.forEach((p, i) => { const min = (68 + ((t.getDate() * (i + 3)) % 14)) * 60; out.push({ user_id: p.user_id, name: p.name, period_start: t.toISOString().slice(0, 10), period_end: end.toISOString().slice(0, 10), minutes: min, rate_cents: p.rate, gross_cents: Math.round(min / 60 * p.rate), paid_at: pay.toISOString(), payday: pay.toISOString().slice(0, 10) }); }); }
      return ok(out); }
    if (name === 'commission_day_rows') { const a = new Date(args && args.p_from || Date.now() - 3e10), b = new Date(args && args.p_to || Date.now()); const by = {};
      rows.forEach(r => { const d = new Date(r.created_at); if (d < a || d >= b || r.technician === 'Alex') return; const k = r.technician + '|' + r.created_at.slice(0, 10); const o = by[k] || (by[k] = { tech_id: 'u-' + r.technician, tech_name: r.technician, day: r.created_at.slice(0, 10), base_cents: 0, commission_cents: 0, held_cents: 0, met_min: true }); o.base_cents += r.base_cents - r.tax_cents; o.commission_cents += Math.round((r.base_cents - r.tax_cents) * .1); });
      return ok(Object.values(by)); }
    if (name === 'timesheet_rows') { const out = []; const names = ['Jordan', 'Sam', 'Riley', 'Alex'];
      for (let d = 0; d < 6; d++) names.forEach((n, i) => { const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d); if (day.getDay() === 0) return;
        const inT = new Date(day.getTime() + (7.5 + i * .25) * 36e5), outT = d === 0 && i < 2 ? null : new Date(inT.getTime() + (8.5 + ((d + i) % 3) * .5) * 36e5);
        out.push({ id: 't' + d + i, staff_name: n, clock_in: inT.toISOString(), clock_out: outT ? outT.toISOString() : null, minutes: outT ? Math.round((outT - inT) / 6e4) : Math.round((Date.now() - inT) / 6e4), out_reason: outT ? 'end_of_day' : null, edited: d === 2 && i === 1 }); });
      return ok(out); }
    if (name === 'current_shop') return ok('s');
    return real(name, args);
  };
  try { TKS.Fleet.staff = async () => ({ data: [{ user_id: 'u0', name: 'Alex', role: 'owner' }, { user_id: 'u1', name: 'Jordan', role: 'technician' }, { user_id: 'u2', name: 'Sam', role: 'technician' }, { user_id: 'u3', name: 'Riley', role: 'front_desk' }] }); } catch (e) {}
}
const hideLogo = () => { document.querySelectorAll('img').forEach(i => { if (/tks_logo|tks_mark|^data:image/.test(i.getAttribute('src') || '')) i.style.display = 'none'; }); };

(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); pg.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 160)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:|^data:/.test(u) || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net\/npm\/chart\.js/.test(u)) rq.continue(); else rq.abort(); });
    const DEV = { pc: { width: 1440, height: 900, deviceScaleFactor: 1.5, theme: 'dark' }, tab: { width: 1024, height: 768, deviceScaleFactor: 2, isMobile: true, hasTouch: true, theme: 'light' }, phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, theme: 'dark' } };
    const shoot = (slug, dev) => pg.screenshot({ path: path.join(OUT, 'f-' + slug + '-' + dev + '.webp'), type: 'webp', quality: 86 });
    const load = async (dev, file) => { const vp = DEV[dev]; await pg.setViewport(vp); await pg.goto('http://127.0.0.1:8088/seed.html'); await pg.evaluate(seed); await pg.evaluate(t => localStorage.setItem('bt_theme', t), vp.theme);
      await pg.goto('http://127.0.0.1:8088/' + file, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3000); if (file === 'index.html') await pg.waitForFunction(() => window.TKPay, { timeout: 15000 }).catch(() => console.log('no TKPay')); await pg.evaluate(stubs); await pg.evaluate(hideLogo); };
    const view = async (v, wait) => { await pg.evaluate(v => { const n = Array.from(document.querySelectorAll('[data-go="' + v + '"]')).find(x => x.offsetParent) || document.querySelector('[data-go="' + v + '"]'); if (n) n.click(); else if (typeof show === 'function') show(v); }, v); await sleep(wait || 1600); await pg.evaluate(hideLogo); await pg.evaluate(() => window.scrollTo(0, 0)); await sleep(200); };
    const scrollTo = (sel, off) => pg.evaluate((sel, off) => { const e = typeof sel === 'string' ? document.querySelector(sel) : null; if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - (off || 12)); }, sel, off);
    for (const dev of ['pc', 'tab', 'phone']) { if (ONLY && ONLY !== dev) continue;
      // warm-up load so the shop name is cached on the device
      await load(dev, 'index.html'); await load(dev, 'index.html');
      // 8 phone-tablet-pc: the home screen
      await shoot('phone-tablet-pc', dev);
      // 3 schedule
      await view('schedule'); if (dev !== 'phone') { await pg.evaluate(() => { const w = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /^Week$/.test(x.innerText.trim())); if (w) w.click(); }); await sleep(900); }
      await shoot('quotes-scheduling', dev);
      // 2 inventory
      await view('inventory'); await pg.evaluate((dev) => { const h = Array.from(document.querySelectorAll('#view-inventory *')).find(x => x.children.length === 0 && /^parts$/.test((x.innerText || '').trim())); const box = h && h.closest('.chip, div'); if (box) window.scrollTo(0, box.getBoundingClientRect().top + scrollY - (dev === 'phone' ? 70 : 24)); }, dev); await sleep(400);
      await shoot('key-inventory', dev);
      // 4 register (not on the phone)
      if (dev !== 'phone') { await view('payments'); await pg.evaluate(() => { try { chgShowForm(); } catch (e) {} try { posVeh.year = '2018'; posVeh.make = 'Ford'; posVeh.model = 'F-150'; posFillYmm && posFillYmm(); } catch (e) {}
          posAddLine({ type: 'custom', desc: 'Ford F-150 2015-2020 5-Button Smart Key', unitCents: 16500, taxable: true, lineType: 'part' }); posAddLine({ type: 'custom', desc: 'Smart / proximity key programming', unitCents: 12500, taxable: false, lineType: 'service' }); posAddLine({ type: 'custom', desc: 'Leather Key Fob Cover', unitCents: 1500, taxable: true, lineType: 'part' }); });
        await sleep(600); await scrollTo('.pos-grid', dev === 'pc' ? 120 : 90); await sleep(300); await shoot('register-payments', dev); }
      // 6 reports — this year
      await view('reports', 800); await pg.evaluate(() => { const s = document.getElementById('repPeriod'); s.value = 'year'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(4500); await pg.evaluate(hideLogo);
      await scrollTo('#repPeriod', dev === 'phone' ? 70 : 20); await sleep(500); await shoot('reports-pay', dev);
      await scrollTo('#repPayCard', dev === 'phone' ? 70 : 20); await sleep(300); await pg.screenshot({ path: path.join(OUT, 'x-pay-' + dev + '.webp'), type: 'webp', quality: 86 });
      await scrollTo('#repTaxBox', dev === 'phone' ? 70 : 20); await sleep(300); await pg.screenshot({ path: path.join(OUT, 'x-tax-' + dev + '.webp'), type: 'webp', quality: 86 });
      // 7 team / timesheets
      await view('timesheets', 2500); await shoot('team-time-clock', dev);
      await view('commission', 2500); await pg.screenshot({ path: path.join(OUT, 'x-commission-' + dev + '.webp'), type: 'webp', quality: 86 });
      // 1 lookup + 5 D1 — the document builder
      await load(dev, 'bittings.html?quote=1'); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(1500);
      const set = (sel, v) => pg.evaluate((sel, v) => { const e = document.querySelector(sel); if (!e) return; e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, sel, v);
      await set('#qiVYear', '2018'); await set('#qiVMake', 'Ford'); await set('#qiVModel', 'F-150'); await sleep(1200);
      await pg.evaluate(() => { const nav = document.getElementById('appnav'); if (nav) nav.style.display = 'none'; const lab = Array.from(document.querySelectorAll('.qi-l')).find(x => /^Vehicle/.test(x.innerText)); (lab || document.querySelector('#qiVehWrap') || document.body).scrollIntoView({ block: 'start' }); }); await sleep(400);
      await shoot('key-lookup', dev);
      await pg.evaluate(() => { const s = (id, v) => { const x = document.querySelector(id); if (x) { x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); } }; s('#qiName', 'Jordan Miller'); s('#qiPhone', '405-555-0142');
        const w = document.getElementById('qiNastfWrap'); if (w) w.style.display = ''; const btn = document.querySelector('#qiNastf [data-n="Customer D1"]'); if (btn) btn.click(); });
      await sleep(800);
      await pg.evaluate(() => { const f = document.getElementById('qiNastfFields'); if (!f) return; const pick = (sel, v) => { const e = f.querySelector(sel); if (!e) return; if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new Event('input', { bubbles: true })); };
        pick('.rd1-color', 'White'); pick('.rd1-miles', '84250'); pick('.rd1-tag', 'KLM-482'); });
      await sleep(400); console.log('D1:', await pg.evaluate(() => { const w = document.getElementById('qiNastfWrap'); if (!w) return 'no wrap'; w.scrollIntoView({ block: 'start' }); return w.offsetHeight + ' ' + (document.getElementById('qiNastfFields') || {}).innerText.slice(0, 80); })); await sleep(400);
      await shoot('nastf-d1', dev);
      console.log(dev, 'done');
    }
    console.log(fs.readdirSync(OUT).map(f => f + ' ' + Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + 'KB').join(', '));
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
