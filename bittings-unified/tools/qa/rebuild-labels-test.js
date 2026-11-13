// Browser test of the label sizes + "Print labels" dialog: Settings → What size labels do you use? (sample per size),
// inventory 🏷️ → how many / which size / each key's own label, and the layout engine (ZPL + on-screen sample).
// Real page, stand-in cloud, stand-in Print Helper (captures POST /zpl). Made-up TEST data. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8092;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html><title>seed</title>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 900) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    let asked = ''; pg.on('dialog', d => { asked = d.message(); d.accept().catch(() => {}); });
    const zpls = []; let helperDown = false;
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url();
      if (/127\.0\.0\.1:8765\//.test(u)) { if (helperDown) return rq.abort(); const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
        if (rq.method() === 'OPTIONS') return rq.respond({ status: 204, headers: H });
        if (/\/zpl/.test(u)) zpls.push(JSON.parse(rq.postData() || '{}').zpl || '');
        return rq.respond({ status: 200, contentType: 'application/json', headers: H, body: '{"ok":true}' }); }
      if (new RegExp('^https?://127\\.0\\.0\\.1:' + PORT + '/').test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.goto('http://127.0.0.1:' + PORT + '/seed.html');
    await pg.evaluate((UID) => { const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, low_at: 0, reorder_qty: 0, cost: 20, sell_price_cents: 16500, chip: '', fcc_id: '', grade: '', supplier: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('k1', { name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', category: 'Keys/Smart Key', qty: 7, serialized: true, fitment: '2015-2020 Ford F-150', fcc_id: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM' }),
        K('k2', { name: 'TEST plain key blank', sku: 'T-BLANK', category: 'Keys/Blank', qty: 4 })];
      const units = []; for (let i = 0; i < 7; i++) units.push({ id: 'u_' + i, item_id: 'k1', serial: 'AB12C3' + i, status: 'in_stock', location: 'shop', acquired_at: '2026-11-0' + (i + 1) + 'T10:00:00Z' });
      units.push({ id: 'u_sold', item_id: 'k1', serial: 'SOLD001', status: 'sold', location: 'shop', acquired_at: '2026-10-01T10:00:00Z' });
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory, inventory_units: units, customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('tks_hw_prefs', JSON.stringify({ labels: { enabled: true, mode: 'helper', shiftX: 40, dpi: 203, widthIn: 2, heightIn: 1, darkness: 20, speed: 3 } }));   // OLD-style saved prefs (no size)
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
    await pg.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && window.TKS_HW, { timeout: 15000 }); await sleep(2500);
    let r;
    const PART = { id: 'k1', name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', category: 'Keys/Smart Key', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150', fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM' };

    // ---- engine ----
    r = await pg.evaluate((PART) => { const L = TKS_HW.labels, P = TKS_HW.prefs().labels; return {
      size: P.size, on: P.sizesOn, w: P.widthIn, small: L.buildZPL(PART), large: L.buildZPL(PART, { size: 'large' }), x3: L.buildZPL(PART, { copies: 3 }),
      unitL: L.buildUnitZPL({ id: 'u_1', serial: 'AB12C34', acquired_at: '2026-11-03T10:00:00Z' }, PART, { size: 'large' }), unitS: L.buildUnitZPL({ id: 'u_1', serial: 'AB12C34' }, PART),
      sizes: L.SIZES.map(s => s.id) }; }, PART);
    check('old saved prefs (2x1, no size) become the Small size, ticked', r.size === 'small' && r.on.join() === 'small' && r.w === 2, { size: r.size, on: r.on });
    check('size list: small, medium, wide, large, xl, xxl, custom', r.sizes.join() === 'small,medium,wide,large,xl,xxl,custom', r.sizes);
    check('small ZPL keeps ^PW406 ^LL203 with the name, price and SKU', /\^PW406/.test(r.small) && /\^LL203/.test(r.small) && /Ford F-150/.test(r.small) && /\$165\.00/.test(r.small) && /FORD-R8134/.test(r.small) && !/Fits:/.test(r.small) && !/\^PQ/.test(r.small), r.small.slice(0, 700));
    check('large ZPL is ^PW609 ^LL406 and adds Fits:, FCC ID:, Chip:', /\^PW609/.test(r.large) && /\^LL406/.test(r.large) && /Fits: 2015-2020 Ford F-150/.test(r.large) && /FCC ID: M3N-A2C31243300/.test(r.large) && /Chip: Hitag Pro/.test(r.large) && /Type: Smart Key - OEM/.test(r.large) && /\^GB/.test(r.large), r.large.slice(0, 1200));
    check('copies 3 → ^PQ3 right before ^XZ', /\^PQ3\n\^XZ$/.test(r.x3), r.x3.slice(-30));
    check('unit labels: small has SN, large also has Received date', /SN: AB12C34/.test(r.unitS) && !/Received/.test(r.unitS) && /SN: AB12C34/.test(r.unitL) && /Received: 2026-11-03/.test(r.unitL), { s: r.unitS.slice(-200), l: r.unitL.slice(-400) });

    // nothing off the label, any size, long text
    r = await pg.evaluate(() => { const L = TKS_HW.labels, bad = [], dots = {}; const long = { name: 'Chevrolet Silverado Suburban Tahoe Yukon Sierra 2007-2014 Extra Long Name Remote Head Key With Everything', sku: 'GM-LONG-SKU-12345-ABCDEFGHIJ', sellPriceCents: 123456, fitment: '2007-2014 Chevrolet Silverado 1500 2500HD 3500HD Suburban Tahoe Avalanche GMC Sierra Yukon XL Denali', fccId: 'OHT01060512-EXTRA', chip: 'Philips 46 Texas Crypto 4D-63 80-bit extra long', category: 'Keys/Remote Head Key', grade: 'Aftermarket' };
        L.SIZES.forEach(s => { [null, { id: 'u_1', serial: 'ABCDEFG', acquired_at: '2026-11-03T10:00:00Z' }].forEach(u => { const la = L.layoutFor(long, u, s.id); dots[s.id] = la.PW + 'x' + la.LL + ' tier ' + la.tier;
          la.els.forEach(e => { if (e.t === 'text') { const rows = e.rows.length; if (e.x + e.w > la.PW - la.shift + 1 || e.y + rows * e.font > la.LL || rows > e.lines || e.rows.some(t => t.length * 0.55 * e.font > e.w + 1)) bad.push([s.id, !!u, e.text.slice(0, 20), e.x, e.y, e.w, e.font]); }
            if (e.t === 'qr' && (e.x + e.size > la.PW || e.y + e.size > la.LL)) bad.push([s.id, 'qr']); });
          const txt = la.els.filter(e => e.t === 'text'), qr = la.els.find(e => e.t === 'qr');   // text blocks must not sit on each other
          for (let i = 0; i < txt.length; i++) for (let j = i + 1; j < txt.length; j++) { const A = txt[i], B = txt[j]; if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.rows.length * B.font && B.y < A.y + A.rows.length * A.font) bad.push([s.id, 'overlap', A.text.slice(0, 12), B.text.slice(0, 12)]); }
          txt.forEach(A => { if (A.x < qr.x + qr.size && qr.x < A.x + A.w && A.y < qr.y + qr.size && qr.y < A.y + A.rows.length * A.font) bad.push([s.id, 'qr-overlap', A.text.slice(0, 12)]); }); }); });
      return { bad, dots }; });
    check('no text or QR runs off (or sits on another) in any size, with a long name + fitment', r.bad.length === 0, r.bad.slice(0, 5));
    results.push('INFO dots: ' + JSON.stringify(r.dots));

    // ---- settings ----
    const openSettings = async () => { await pg.evaluate(() => TKS_HW.openSettings()); await sleep(600); await pg.evaluate(() => { const c = document.querySelector('[data-szcard="small"]'); c && c.scrollIntoView({ block: 'start' }); }); await sleep(200); };
    const closeAll = async () => { await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await sleep(200); };
    await openSettings();
    r = await pg.evaluate(() => { const cards = Array.from(document.querySelectorAll('[data-szcard]')); const lab = Array.from(document.querySelectorAll('[data-szcard] label:has(input)')); const inp = Array.from(document.querySelectorAll('[data-szcard] input[type=checkbox],[data-szcard] input[type=radio]'));
      return { cards: cards.length, svgs: cards.filter(c => c.querySelector('svg')).length, heading: /What size labels do you use\?/.test(document.body.innerText), note: /holds one roll at a time/.test(document.body.innerText),
        smallH: lab.filter(l => l.getBoundingClientRect().height < 43).length, w: Array.from(document.querySelectorAll('[data-szsample]')).map(d => Math.round(d.firstChild.getBoundingClientRect().width)),
        tickSmall: document.querySelector('[data-szon="small"]').checked, defSmall: document.querySelector('input[name=hwLbSize][value=small]').checked, kept: ['hwLbDpi', 'hwLbDark', 'hwLbShift', 'hwLbSpeed', 'hwLbDev', 'hwLbScan', 'hwLbPrev', 'hwLbTest'].every(i => document.getElementById(i)) }; });
    check('settings: heading, one-roll note, a card with a drawn sample for every size (incl. custom)', r.heading && r.note && r.cards === 7 && r.svgs === 7, r);
    check('settings: samples are drawn to scale (small < large < xl widths) and tap rows are ≥ 44px', r.w[0] < r.w[3] && r.w[3] < r.w[4] && r.smallH === 0, r);
    check('settings: small ticked + default; printer/DPI/darkness/margin/speed/test buttons still there', r.tickSmall && r.defSmall && r.kept, r);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-pc.png') });
    // tick large + medium, make large the default
    await pg.evaluate(() => { const set = (sel) => { const e = document.querySelector(sel); e.click(); }; set('[data-szon="large"]'); set('[data-szon="medium"]'); set('input[name=hwLbSize][value=large]'); }); await sleep(300);
    r = await pg.evaluate(() => ({ p: JSON.parse(localStorage.getItem('tks_hw_prefs')).labels, z: TKS_HW.labels.buildZPL({ sku: 'X-1', name: 'TEST', sellPriceCents: 100 }) }));
    check('saving a new default size changes what prints (and widthIn/heightIn follow)', r.p.size === 'large' && r.p.sizesOn.join() === 'small,medium,large' && r.p.widthIn === 3 && r.p.heightIn === 2 && /\^PW609/.test(r.z) && /\^LL406/.test(r.z), { size: r.p.size, on: r.p.sizesOn, w: r.p.widthIn });
    // test label prints the default size
    zpls.length = 0; await pg.evaluate(() => document.getElementById('hwLbTest').click()); await sleep(700);
    check('Test label prints the default size', zpls.length === 1 && /\^PW609/.test(zpls[0]), zpls.map(z => z.slice(0, 40)));
    await pg.evaluate(() => { document.querySelector('[data-szcard="large"]').scrollIntoView({ block: 'start' }); }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-large-pc.png') });
    await closeAll();
    // back to small default but keep small+large ticked
    await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'small'; P.sizesOn = ['small', 'large']; P.widthIn = 2; P.heightIn = 1; TKS_HW.save(); });

    // ---- phone settings ----
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await openSettings();
    r = await pg.evaluate(() => { const cd = document.querySelector('[data-szcard="large"]').closest('div[style*="max-height"]') || document.body; const els = Array.from(document.querySelectorAll('[data-szcard], [data-szcard] svg')); return { docX: document.documentElement.scrollWidth - innerWidth, modalX: cd.scrollWidth - cd.clientWidth, over: els.filter(e => e.getBoundingClientRect().right > innerWidth + 1).length, tap: Array.from(document.querySelectorAll('[data-szcard] label:has(input)')).filter(l => l.getBoundingClientRect().height < 43).length }; });
    check('phone: settings has no sideways scroll, samples fit, tap rows ≥ 44px', r.docX <= 0 && r.modalX <= 0 && r.over === 0 && r.tap === 0, r);
    await pg.evaluate(() => { document.querySelector('[data-szcard="large"]').scrollIntoView({ block: 'start' }); }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-phone.png') });
    await closeAll(); await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    // ---- inventory row → dialog ----
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(1500);
    const rowBtn = async (sku) => pg.evaluate((sku) => { const row = Array.from(document.querySelectorAll('#view-inventory .row, #view-inventory [class*=row]')).find(x => x.innerText.includes(sku) && x.querySelector('[data-label]')); const bt = row && row.querySelector('[data-label]'); if (bt) { bt.click(); return true; } return false; }, sku);
    check('inventory row shows the 🏷️ button', await rowBtn('FORD-R8134'), null); await sleep(900);
    r = await pg.evaluate(() => { const t = document.body.innerText; const chips = Array.from(document.querySelectorAll('#plChips button')).map(x => x.innerText.trim()); return { title: /Print labels/.test(t), name: /Ford F-150 2015-2020 5-Button Smart Key/.test(t), chips, sizes: Array.from(document.querySelectorAll('#plSizes button')).map(x => x.innerText.trim()), svg: !!document.querySelector('#plSample svg'), mode: Array.from(document.querySelectorAll('input[name=plMode]')).map(x => x.value + (x.checked ? '*' : '')), go: document.getElementById('plGo').innerText }; });
    check('dialog: title + part name, chips 1/2/3/5/10/All in stock (7), live sample, button says Print 1 label', r.title && r.name && r.chips.join('|') === '1|2|3|5|10|All in stock (7)' && r.svg && /Print 1 label$/.test(r.go), r);
    check('dialog: size chips show only the ticked sizes (Small, Large)', r.sizes.length === 2 && /Small/.test(r.sizes[0]) && /Large/.test(r.sizes[1]), r.sizes);
    check('dialog: serialized + in-stock units found → "own label" vs "same label" choice', r.mode.join() === 'own,same*', r.mode);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-pc.png') });
    const click = (sel) => pg.evaluate((sel) => document.querySelector(sel).click(), sel);
    // 1 label, small
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('print 1 (small) → one ZPL, 2x1, no ^PQ', zpls.length === 1 && /\^PW406/.test(zpls[0]) && !/\^PQ/.test(zpls[0]), zpls.map(z => z.slice(0, 40)));
    check('success toast + dialog closes', await pg.evaluate(() => /1 label sent to the printer\./.test(document.body.innerText) && !document.getElementById('plGo')), null);
    // 3 labels, large
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    await click('#plChips [data-n="3"]'); await click('#plSizes [data-sz="large"]'); await sleep(200);
    r = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, tier: document.querySelector('#plSample svg').getAttribute('data-tier'), txt: document.getElementById('plSample').innerText }));
    check('dialog: picking 3 + Large updates the button and the sample (tier 3 shows Fits/FCC)', /Print 3 labels$/.test(r.go) && r.tier === '3' && /Fits:/.test(r.txt) && /FCC ID:/.test(r.txt), r);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-large-pc.png') });
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('print 3 (large) → one ZPL ^PW609 with ^PQ3', zpls.length === 1 && /\^PW609/.test(zpls[0]) && /\^PQ3/.test(zpls[0]) && /Fits:/.test(zpls[0]), zpls.map(z => z.slice(-30)));
    // remembered size
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    check('dialog remembers the last size used on this device', await pg.evaluate(() => document.querySelector('#plSizes [data-sz="large"]').getAttribute('aria-pressed') === 'true'), null);
    // All in stock → own labels (7 units)
    await click('#plChips [data-all]'); await sleep(200);
    r = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, mode: Array.from(document.querySelectorAll('input[name=plMode]')).map(x => x.value + (x.checked ? '*' : '')).join() }));
    check('All in stock (7) defaults to each key\'s own label', /Print 7 labels$/.test(r.go) && r.mode === 'own*,same', r);
    zpls.length = 0; await click('#plGo'); await sleep(900);
    const own = zpls[0] || '';
    check('All in stock → 7 unit labels in one job, each with its own serial (newest first)', zpls.length === 1 && (own.match(/\^XA/g) || []).length === 7 && /SN: AB12C36/.test(own) && /SN: AB12C30/.test(own) && !/SOLD001/.test(own) && !/\^PQ/.test(own) && own.indexOf('AB12C36') < own.indexOf('AB12C30'), { n: (own.match(/\^XA/g) || []).length });
    // All in stock, same label ×7
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    await click('#plChips [data-all]'); await sleep(100); await pg.evaluate(() => document.querySelector('input[name=plMode][value=same]').click()); await sleep(200);
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('All in stock + "same label" → one label with ^PQ7', zpls.length === 1 && (zpls[0].match(/\^XA/g) || []).length === 1 && /\^PQ7/.test(zpls[0]), zpls.map(z => z.slice(-20)));
    // 3 own labels out of 7
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    await click('#plChips [data-n="3"]'); await pg.evaluate(() => document.querySelector('input[name=plMode][value=own]').click()); await sleep(200);
    r = await pg.evaluate(() => document.getElementById('plNote').innerText);
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('3 of 7 with own labels → first 3 units, newest first, and says so', /first 3 keys \(newest first\)/.test(r) && zpls.length === 1 && (zpls[0].match(/\^XA/g) || []).length === 3 && /AB12C36/.test(zpls[0]) && /AB12C34/.test(zpls[0]) && !/AB12C33/.test(zpls[0]), { r });
    // typed number, 60 asks to confirm (dialogs are accepted by the test)
    await sleep(2800); await rowBtn('T-BLANK'); await sleep(900);
    r = await pg.evaluate(() => ({ chips: Array.from(document.querySelectorAll('#plChips button')).map(x => x.innerText.trim()).join('|'), mode: document.querySelectorAll('input[name=plMode]').length, sizes: !!(document.getElementById('plSizeWrap').offsetParent) }));
    check('plain part (not serialized): chips with All in stock (4), no own-label choice', r.chips === '1|2|3|5|10|All in stock (4)' && r.mode === 0, r);
    await pg.evaluate(() => { const i = document.getElementById('plNum'); i.value = '60'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
    zpls.length = 0; asked = '';
    await click('#plGo'); await sleep(900);
    check('a typed 60 asks to confirm, then prints ^PQ60', /60 labels/.test(asked) && /\^PQ60/.test(zpls[0] || ''), { asked, z: (zpls[0] || '').slice(-20) });
    // printing off → plain words
    await sleep(2800); await rowBtn('T-BLANK'); await sleep(700);
    await pg.evaluate(() => { TKS_HW.prefs().labels.enabled = false; });
    zpls.length = 0; await click('#plGo'); await sleep(400);
    check('label printing off → "Turn on label printing in Settings → Printers & scanner"', await pg.evaluate(() => /Turn on label printing in Settings/.test(document.getElementById('plErr').innerText)) && zpls.length === 0, null);
    await pg.evaluate(() => { TKS_HW.prefs().labels.enabled = true; });
    // helper down → error shown in dialog
    helperDown = true;
    await click('#plGo'); await sleep(1500);
    check('printer unreachable → plain-words error inside the dialog, button usable again', await pg.evaluate(() => /Can.t reach the Bittings Print Helper/.test(document.getElementById('plErr').innerText) && !document.getElementById('plGo').disabled), await pg.evaluate(() => document.getElementById('plErr').innerText));
    helperDown = false; await closeAll();

    // ---- phone dialog ----
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.sizesOn = ['small', 'medium', 'large', 'xl']; TKS_HW.save(); });
    await sleep(2800);
    const ok = await pg.evaluate(() => TKS_HW.labels.openPrintDialog({ id: 'k1', name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', category: 'Keys/Smart Key', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150', fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM' }, { inStock: 7, fetchUnits: async () => [{ id: 'u_a', serial: 'AB12C30', acquired_at: '2026-11-03T10:00:00Z' }, { id: 'u_b', serial: 'AB12C31' }] }) && true); await sleep(700);
    await pg.evaluate(() => { document.querySelector('#plSizes [data-sz="large"]').click(); }); await sleep(300);
    r = await pg.evaluate(() => { const card = document.getElementById('plGo').closest('div[style*="max-height"]'); const bt = Array.from(document.querySelectorAll('#plChips button, #plSizes button, #plGo, #plCancel, [name=plMode]')).filter(x => x.getBoundingClientRect().height < 43 && x.type !== 'radio'); return { docX: document.documentElement.scrollWidth - innerWidth, cardX: card.scrollWidth - card.clientWidth, small: bt.map(x => x.id || x.innerText), svgR: Math.round(document.querySelector('#plSample svg').getBoundingClientRect().right), vw: innerWidth }; });
    check('phone: dialog fits (no sideways scroll), buttons/chips ≥ 44px, sample inside the screen', r.docX <= 0 && r.cardX <= 0 && r.small.length === 0 && r.svgR <= r.vw, r);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-phone.png') });
    await pg.evaluate(() => document.getElementById('plCancel').click());
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.stack || e)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
