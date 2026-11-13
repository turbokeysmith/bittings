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
    check('size list: small, medium, wide, large, xl, xxl, 2x3 (tall), 4x6 (ship), custom', r.sizes.join() === 'small,medium,wide,large,xl,xxl,tall,ship,custom', r.sizes);
    check('small ZPL keeps ^PW406 ^LL203 with the name, price and SKU', /\^PW406/.test(r.small) && /\^LL203/.test(r.small) && /Ford F-150/.test(r.small) && /\$165\.00/.test(r.small) && /FORD-R8134/.test(r.small) && !/Fits:/.test(r.small) && !/\^PQ/.test(r.small), r.small.slice(0, 700));
    check('large ZPL is ^PW609 ^LL406 and adds FCC ID:, Fits: and Type:', /\^PW609/.test(r.large) && /\^LL406/.test(r.large) && /Fits: 2015-2020 Ford F-150/.test(r.large) && /FCC ID: M3N-A2C31243300/.test(r.large) && /Type: Smart Key/.test(r.large) && /Type: Smart Key - OEM/.test(r.large) && /\^GB/.test(r.large), r.large.slice(0, 1200));
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

    // ---- 8z104: "Fits:" always on big labels, bigger type on bigger labels, Vertical / Horizontal ----
    r = await pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text', noFit = Object.assign({}, PART, { fitment: '' });
      const texts = la => la.els.filter(T).map(e => e.rows.join(' '));
      const off = la => { let n = 0; la.els.forEach(e => { if (e.t === 'text' && (e.x + e.w > la.PW + 1 || e.y + e.rows.length * e.font > la.LL + 1)) n++; if (e.t === 'qr' && (e.x + e.size > la.PW || e.y + e.size > la.LL)) n++; if (e.t === 'line' && (e.x + e.w > la.PW + 1 || e.y > la.LL)) n++; }); return n; };
      const nameFont = la => la.els.filter(T)[0].font, fitsFont = la => (la.els.filter(T).find(e => /^Fits:/.test(e.rows[0])) || {}).font || 0;
      const big = {}; ['large', 'xl', 'xxl', 'tall', 'ship'].forEach(id => { const a = L.layoutFor(PART, null, id, { logo: false }), b = L.layoutFor(noFit, null, id, { logo: false });
        const fe = b.els.filter(T).find(e => e.rows[0] === 'Fits:'), lines = b.els.filter(e => e.t === 'line');
        big[id] = { fits: texts(a).some(t => /^Fits: 2015/.test(t)), blank: !!fe, rules: lines.length, ruleUnder: fe ? lines.filter(l => l.y > fe.y && l.y < fe.y + fe.font * 3).length : 0, name: nameFont(a), fitsF: fitsFont(a), off: off(a) + off(b) }; });
      const small = L.layoutFor(noFit, null, 'small'), med = L.layoutFor(noFit, null, 'medium');
      // orientation
      const can = L.SIZES.map(s => s.id).filter(id => L.canTurn(id));
      const tallV = L.layoutFor(PART, null, 'tall', { orient: 'v', logo: false }), tallH = L.layoutFor(PART, null, 'tall', { orient: 'h', logo: false });
      const shipV = L.layoutFor(PART, null, 'ship', { orient: 'v', logo: false }), shipH = L.layoutFor(PART, null, 'ship', { orient: 'h', logo: false });
      const lgH = L.layoutFor(PART, null, 'large', { orient: 'h', logo: false }), lgV = L.layoutFor(PART, null, 'large', { orient: 'v', logo: false });
      const zH = L.toZPL(tallH, 2), zV = L.toZPL(tallV, 1), zLV = L.toZPL(lgV, 1);
      const cv = L.toCanvas(tallH, 1), px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let dark = 0; for (let i = 0; i < px.length; i += 4) if (px[i] < 128) dark++;
      return { big, smallFits: texts(small).concat(texts(med)).filter(t => /^Fits/.test(t)).length, can,
        tallV: [tallV.PW, tallV.LL, !!tallV.turned], tallH: [tallH.PW, tallH.LL, !!tallH.turned], shipH: [shipH.PW, shipH.LL, !!shipH.turned], lgV: [lgV.PW, lgV.LL, !!lgV.turned], lgH: [lgH.PW, lgH.LL, !!lgH.turned],
        offTurn: off(tallH) + off(shipH) + off(lgV) + off(shipV),
        zH: { pw: (zH.match(/\^PW(\d+)/) || [])[1], ll: (zH.match(/\^LL(\d+)/) || [])[1], gfa: (zH.match(/\^GFA/g) || []).length, fd: /\^FD/.test(zH), pq: /\^PQ2/.test(zH) },
        zV: { pw: (zV.match(/\^PW(\d+)/) || [])[1], fd: /\^FD/.test(zV) }, zLV: { pw: (zLV.match(/\^PW(\d+)/) || [])[1], ll: (zLV.match(/\^LL(\d+)/) || [])[1], fd: /\^FD/.test(zLV) },
        canvas: [cv.width, cv.height, dark], shipName: nameFont(shipV), lgName: nameFont(lgH), shipFits: fitsFont(shipV), lgFits: fitsFont(lgH) }; }, PART);
    check('big labels always carry "Fits:" — the vehicle when it is filled in, otherwise "Fits:" with room to write and NO lines (only the rule above the SKU)', Object.values(r.big).every(b => b.fits && b.blank && b.rules === 1 && b.ruleUnder === 0 && b.off === 0) && r.smallFits === 0, r.big);
    check('the bigger the label, the bigger the type (4 × 6 name and Fits line are well above the 3 × 2 ones)', r.shipName >= r.lgName * 1.4 && r.shipFits >= r.lgFits * 1.4 && r.lgFits >= 18, { lgName: r.lgName, shipName: r.shipName, lgFits: r.lgFits, shipFits: r.shipFits });
    check('Vertical / Horizontal is offered on the big sizes only (not 2 × 1, 2.25 × 1.25, 3 × 1)', r.can.includes('large') && r.can.includes('tall') && r.can.includes('ship') && r.can.includes('xl') && !r.can.includes('small') && !r.can.includes('medium') && !r.can.includes('wide'), r.can);
    check('2 × 3 roll: Vertical is the roll as it feeds (406 × 609); Horizontal is laid out 609 wide and turned for the printer', r.tallV.join() === '406,609,false' && r.tallH[0] === 609 && r.tallH[2] === true && r.lgH.join() === '609,406,false' && r.lgV[2] === true && r.offTurn === 0, { tallV: r.tallV, tallH: r.tallH, lgV: r.lgV, lgH: r.lgH, shipH: r.shipH, off: r.offTurn });
    check('a turned label goes to the Zebra as one picture at the roll\'s own width (no loose text), copies still work; an unturned one is ordinary label code', r.zH.gfa === 1 && !r.zH.fd && r.zH.pq && Number(r.zH.pw) >= 406 && Number(r.zH.pw) <= 460 && Number(r.zH.ll) === 609 && r.zV.fd && Number(r.zLV.ll) === 406 && !r.zLV.fd && r.canvas[2] > 2000, { zH: r.zH, zV: r.zV, zLV: r.zLV, canvas: r.canvas });

    const rt = await pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text', f = (id, v) => { const la = L.layoutFor(PART, null, id, { textSize: v, logo: false, orient: 'v' }), tx = la.els.filter(T); return [tx[0].font, tx[tx.length - 1].font, (tx.find(e => /^Fits:/.test(e.rows[0])) || {}).font]; };
      return { tall: { s: f('tall', 's'), m: f('tall', 'm'), l: f('tall', 'l') }, ship: { s: f('ship', 's'), m: f('ship', 'm'), l: f('ship', 'l') }, def: TKS_HW.prefs().labels.textSize || 'm' }; }, PART);
    check('text size on big labels: Small < Medium < Large (name, SKU and detail lines), Medium unless chosen, and a 4 × 6 Medium is bigger than a 2 × 3 Medium',
      rt.def === 'm' && [0, 1, 2].every(i => rt.ship.s[i] < rt.ship.m[i] && rt.ship.m[i] < rt.ship.l[i]) && rt.tall.s[1] < rt.tall.l[1] && rt.tall.s[2] <= rt.tall.m[2] && rt.tall.m[2] <= rt.tall.l[2] && rt.ship.m[0] > rt.tall.m[0], rt);

    r = await pg.evaluate(() => { const keep = localStorage.getItem('tks_hw_prefs'), p = JSON.parse(keep); p.labels.size = 'tall'; p.labels.sizesOn = ['small', 'tall']; p.labels.orient = { tall: 'v' }; localStorage.setItem('tks_hw_prefs', JSON.stringify(p)); return keep; });
    await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS_HW && TKS_HW.labels, { timeout: 15000 }); await sleep(1500);
    { const m = await pg.evaluate(() => { const P = TKS_HW.prefs().labels, L = TKS_HW.labels.layoutFor({ sku: 'X-1', name: 'TEST' }, null); return { size: P.size, on: P.sizesOn, or: (P.orient || {}).large, dims: [L.PW, L.turned] }; });
      check('anything saved under the short-lived "2 in across" entry comes back to the one 2 × 3 entry, keeping its layout (Vertical: 406 wide, turned on the 3-across roll)', m.size === 'large' && m.on.join() === 'small,large' && m.or === 'v' && m.dims[0] === 406 && m.dims[1] === true, m); }
    await pg.evaluate((keep) => { localStorage.setItem('tks_hw_prefs', keep); }, r); await pg.reload({ waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS_HW && TKS_HW.labels, { timeout: 15000 }); await sleep(1500);

    { const rx = await pg.evaluate((PART) => { const L = TKS_HW.labels, P = TKS_HW.prefs().labels, T = e => e.t === 'text';
        const a = L.layoutFor(PART, null, 'large', { orient: 'h', logo: false }), av = L.layoutFor(PART, null, 'large', { orient: 'v', logo: false });
        P.rollTurn = { large: true }; const b = L.layoutFor(PART, null, 'large', { orient: 'h', logo: false }), bv = L.layoutFor(PART, null, 'large', { orient: 'v', logo: false }), zb = L.toZPL(bv, 1); P.rollTurn = {};
        const many = Object.assign({}, PART, { fitment: ['2007-2014 Chevrolet Tahoe', '2007-2014 Chevrolet Suburban', '2007-2014 GMC Yukon', '2007-2013 Chevrolet Silverado', '2007-2013 GMC Sierra', '2009-2016 Chevrolet Traverse', '2007-2016 GMC Acadia', '2008-2016 Buick Enclave'].join('\n') });
        const fitsOf = (la) => (la.els.filter(T).find(e => /^Fits:/.test(e.rows[0])) || { rows: [] }).rows.join(' ');
        const big = L.layoutFor(many, null, 'ship', { logo: false }), txt = fitsOf(big), off = L.layoutFor(many, null, 'ship', { logo: false, fits: false }), offMed = L.layoutFor(PART, null, 'medium', { fits: false });
        const over = big.els.filter(e => e.t === 'text' && (e.x + e.w > big.PW + 1 || e.y + e.rows.length * e.font > big.LL + 1)).length;
        return { a: [a.PW, !!a.turned], av: [av.PW, !!av.turned], b: [b.PW, !!b.turned], bv: [bv.PW, !!bv.turned], zb: /\^FD/.test(zb), txt, hasSixth: /Silverado/.test(txt), more: /\+5 more/.test(txt), over, offFits: fitsOf(off), offMed: fitsOf(offMed), offOther: off.els.filter(T).some(e => /^FCC ID:/.test(e.rows[0])) }; }, PART);
      check('one "2 × 3" entry: the 3-inch side is across the printer — Horizontal prints straight (609 wide), Vertical is turned; ticking "my roll feeds the other way" swaps that', rx.a.join() === '609,false' && rx.av.join() === '406,true' && rx.b.join() === '609,true' && rx.bv.join() === '406,false' && rx.zb, rx);
      check('a long Fits list stops after THREE vehicles and says how many more; with "Print what it fits" off the line is gone and the other details stay', /Tahoe/.test(rx.txt) && /Yukon/.test(rx.txt) && !rx.hasSixth && rx.more && rx.over === 0 && rx.offFits === '' && rx.offMed === '' && rx.offOther, rx); }

    { const rb = await pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text', P2 = Object.assign({}, PART, { location: 'bin 3' }), res = {}, bad = [];
        ['small', 'medium', 'wide', 'large', 'xl', 'xxl', 'ship'].forEach(id => { ['h', 'v'].forEach(o => { const la = L.layoutFor(P2, null, id, { kind: 'bin', orient: o }), tx = la.els.filter(T), bin = tx.find(e => e.rows[0] === 'BIN 3'), nm = tx.find(e => /Ford F-150/.test(e.rows.join(' '))), sku = tx.find(e => /FORD-R8134/.test(e.rows[0]));
          res[id + ':' + o] = bin ? [bin.font, nm ? nm.font : 0] : null;
          if (!bin || !sku || !la.els.some(e => e.t === 'qr') || (nm && bin.font < nm.font * 1.5)) bad.push([id, o, 'missing/small', !!bin, !!sku]);
          la.els.forEach(e => { if (e.t === 'text' && (e.x + e.w > la.PW - la.shift + 1 || e.y + e.rows.length * e.font > la.LL + 1 || e.rows.some(t => t.length * 0.55 * e.font > e.w + 1))) bad.push([id, o, 'off', e.rows[0].slice(0, 12), e.x, e.y, e.w, e.font]); if (e.t === 'qr' && (e.x + e.size > la.PW || e.y + e.size > la.LL)) bad.push([id, o, 'qr off']); });
          for (let i = 0; i < tx.length; i++) for (let j = i + 1; j < tx.length; j++) { const A = tx[i], B = tx[j]; if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.rows.length * B.font && B.y < A.y + A.rows.length * A.font) bad.push([id, o, 'overlap', A.rows[0].slice(0, 10), B.rows[0].slice(0, 10)]); } }); });
        const z = L.buildZPL(P2, { size: 'small', kind: 'bin' }), key = L.buildZPL(P2, { size: 'small' }), noBin = L.layoutFor(PART, null, 'small', { kind: 'bin' }).els.filter(T).map(e => e.rows[0]);
        return { res, bad, zBin: /BIN 3/.test(z), zPrice: /\$165/.test(z), keyHasBin: /BIN 3/.test(key), noBin }; }, PART);
      check('bin label: the bin in big letters (at least 1.5× the name), the key name, its SKU and QR code — on every size and layout, nothing off the label or overlapping; no price on it; key labels are unchanged', rb.bad.length === 0 && rb.zBin && !rb.zPrice && !rb.keyHasBin, { bad: rb.bad.slice(0, 4), res: rb.res }); }

    { const rl = await pg.evaluate(async (PART) => { const L = TKS_HW.labels, P = TKS_HW.prefs().labels, keep = JSON.stringify(P.tweaks || null), keepOr = JSON.stringify(P.orient || null), U = { id: 'u1', serial: 'AB12C34', acquired_at: '2026-11-03T10:00:00Z' };
        const pos = (la) => { const e = la.els.find(x => x.t === 'text' && /^\$/.test(x.text)), q = la.els.find(x => x.t === 'qr'); return [e.x, e.y, q.x, q.y]; };
        P.tweaks = { 'large:h': { price: { dx: 40, dy: 30, s: 1 }, qr: { dx: 6, dy: 4, s: 1 } } };
        const before = pos(L.layoutFor(PART, U, 'large', { orient: 'h' })); const did = L.anchorLegacy('large'); const tw = JSON.parse(JSON.stringify(P.tweaks['large:h'])); const after = pos(L.layoutFor(PART, U, 'large', { orient: 'h' })), again = L.anchorLegacy('large');
        P.tweaks = JSON.parse(keep) || undefined; if (!P.tweaks) delete P.tweaks;
        const v = L.layoutFor(PART, null, 'large', { orient: 'v', logo: false }), svg = L.toSVG(v), h = L.layoutFor(PART, null, 'large', { orient: 'h', logo: false });
        return { did, again, tw, before, after, v: [v.PW, v.LL, v.fullLL, v.rollShift], vb: (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || []).slice(1).map(Number), h: [h.LL, h.fullLL] }; }, PART);
      check('moves saved the old way (as offsets) are pinned once to the spot they had on the sample label — nothing shifts when that happens', rl.did === true && rl.again === false && rl.tw.price.ax != null && rl.tw.price.dx === undefined && rl.tw.qr.ax != null && rl.before.every((n, i) => Math.abs(n - rl.after[i]) <= 2), rl);
      check('the picture of a turned (Vertical) label is the WHOLE label, including the strip at the foot the printer cannot use; an unturned label is unchanged', rl.v[3] > 0 && rl.v[2] === rl.v[1] + rl.v[3] && rl.vb[0] === rl.v[0] && rl.vb[1] === rl.v[2] && rl.v[2] === 609 && rl.h[0] === rl.h[1], rl); }

    { const rp = await pg.evaluate((PART) => { const L = TKS_HW.labels, P = TKS_HW.prefs().labels, keep = JSON.stringify(P.tweaks || null), T = e => e.t === 'text';
        const bmw = { id: 'k9', name: 'TEST BMW 3/5 06-10 (KR55WK49127)', sku: 'BMW-1451 AM', category: 'Keys/Smart Key', grade: 'Aftermarket', sellPriceCents: 15000, fccId: 'KR55WK49127', chip: 'Philips ID46',
          fitment: ['2006-2012 BMW 3 Series', '2005-2010 BMW 5 Series', '2007-2011 BMW 6 Series', '2008-2011 BMW X3', '2007-2013 BMW X5', '2008-2014 BMW X6', '2009-2015 BMW Z4', '2004-2012 BMW 1 Series'].join('\n') };
        const U = { id: 'u9', serial: 'AKA6FGM', acquired_at: '2026-11-13T10:00:00Z' }, out = [];
        for (const [size, or] of [['large', 'v'], ['large', 'h'], ['ship', 'v']]) for (const ay of [150, 205, 240]) {
          P.tweaks = {}; P.tweaks[size + ':' + or] = { details: { ax: 6, ay: ay, s: 1 } };
          const la = L.layoutFor(bmw, U, size, { orient: or, logo: false }), tx = la.els.filter(T), sku = tx.find(e => e.bold), det = tx.filter(e => /^(Fits:|FCC ID:|Chip:)/.test(e.rows[0])), typ = tx.find(e => /^Type:/.test(e.rows[0]));
          const rule = la.els.find(e => e.t === 'line'), skuTop = Math.min(sku.y, rule ? rule.y : 1e9, typ ? typ.y : 1e9), detBottom = det.length ? Math.max.apply(null, det.map(e => e.y + e.rows.length * e.font)) : 0;
          out.push({ k: size + ':' + or + '@' + ay, lines: det.map(e => e.rows[0].slice(0, 5) + '×' + e.rows.length).join(','), type: !!typ && typ.y + typ.font <= (rule ? rule.y : sku.y), over: det.length ? detBottom > skuTop : false, sn: tx.some(e => /^SN: AKA6FGM/.test(e.text)), fd: (L.toZPL(la, 1).match(/Type:|Chip:/g) || []).length });
        }
        P.tweaks = JSON.parse(keep) || undefined; if (!P.tweaks) delete P.tweaks; return out; }, PART);
      check('a details block pinned low + a long Fits list never prints over the SKU line: never over the Type line above it either: it gives up the Chip, then Fits lines, then Fits — the FCC ID, the Type and the serial number always print', rp.every(x => !x.over && x.sn && x.type && /FCC I/.test(x.lines)) && rp.some(x => !/Chip:/.test(x.lines)), rp); }

    { const ru = await pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text', U = { id: 'u1', serial: 'AB12C34', acquired_at: '2026-11-03T10:00:00Z' }, res = {};
        const tp = Object.assign({}, PART, { category: 'Keys/Transponder', name: 'TEST transponder key', fccId: '' }), flip = Object.assign({}, PART, { category: 'Keys/Remote Head / Flip', name: 'TEST flip key' });
        const lines = (la) => la.els.filter(T).map(e => e.rows[0]).filter(x => /^(Fits:|FCC ID:|Chip:|Type:)/.test(x)).map(x => x.split(':')[0]);
        ['large', 'xl', 'ship'].forEach(id => { ['h', 'v'].forEach(o => { const la = L.layoutFor(PART, U, id, { orient: o, logo: false, tweaks: null }), tx = la.els.filter(T), sku = tx.find(e => e.bold), sn = tx.find(e => /^SN: AB12C34/.test(e.text)), qr = la.els.find(e => e.t === 'qr');
          res[id + ':' + o] = { under: !!sn && sn.y >= sku.y + sku.font - 2 && sn.y <= sku.y + sku.font + 8 && sn.x === sku.x, smaller: !!sn && sn.font <= sku.font * 0.62, inside: !!sn && sn.y + sn.font <= la.LL + 1, notUnderQr: !!sn && sn.y > qr.y + qr.size + 20, order: lines(la).join('>') }; }); });
        const moved = L.layoutFor(PART, U, 'large', { orient: 'h', logo: false, tweaks: { sku: { ax: 60, ay: 150, s: 1 } } }), mt = moved.els.filter(T), ms = mt.find(e => e.bold), mn = mt.find(e => /^SN: /.test(e.text));
        const small = L.layoutFor(PART, U, 'small'), ssn = small.els.filter(T).find(e => /^SN: /.test(e.text)), sqr = small.els.find(e => e.t === 'qr');
        return { res, smart: lines(L.layoutFor(PART, null, 'ship', { logo: false, tweaks: null })).join('>'), tp: lines(L.layoutFor(tp, null, 'ship', { logo: false, tweaks: null })).join('>'), flip: lines(L.layoutFor(flip, null, 'ship', { logo: false, tweaks: null })).join('>'),
          follows: !!mn && Math.abs(mn.y - (ms.y + ms.font + 2)) <= 3 && mn.x === ms.x,
          group: (() => { const out = {}; ['large', 'xl', 'ship'].forEach(id => { ['h', 'v'].forEach(o => { const a = L.layoutFor(PART, U, id, { orient: o, logo: false, tweaks: null }), b = L.layoutFor(PART, U, id, { orient: o, logo: false, tweaks: { sku: { ax: 30, ay: 100, s: 1 } } });
            const pick = (la) => { const x = la.els.filter(T), ty = x.find(e => /^Type: /.test(e.rows[0])), sk = x.find(e => e.bold), sn = x.find(e => /^SN: /.test(e.text)), ru = la.els.find(e => e.t === 'line'); return [ty, ru, sk, sn]; };
            const pa = pick(a), pb = pick(b), d = pa.map((e, i) => e && pb[i] ? [pb[i].x - e.x, pb[i].y - e.y].join() : 'missing');
            out[id + ':' + o] = { one: d.every(x => x === d[0] && x !== 'missing' && x !== '0,0'), stacked: !!pa[0] && pa[0].y + pa[0].font <= pa[1].y && pa[1].y < pa[2].y && pa[2].y < pa[3].y, noUnit: !a.blocks.unit, blk: pa.every(e => e && e.b === 'sku') }; }); }); return out; })(),
          smallUnit: !!small.blocks.unit, smallUnderQr: !!ssn && ssn.y > sqr.y + sqr.size - 2 }; }, PART);
      check('big labels: the serial number sits right under the SKU in smaller type (not under the QR code), on every big size and layout, and follows the SKU if the SKU is moved; small labels keep it under the QR code', Object.values(ru.res).every(x => x.under && x.smaller && x.inside && x.notUnderQr) && ru.follows && ru.smallUnderQr, ru);
      check('big labels: Type, the rule, the SKU and the serial number are ONE block — stacked in that order, and all four move by exactly the same amount when the block is moved (every big size and layout); small labels keep the serial as its own box', Object.values(ru.group).every(x => x.one && x.stacked && x.noUnit && x.blk) && ru.smallUnit, ru.group);
      check('details: FCC ID first, Type (OEM / aftermarket) always kept; on a roomy label a smart key still shows its Chip, and a transponder leads with its Chip', ru.smart === 'FCC ID>Fits>Chip>Type' && ru.flip === 'FCC ID>Fits>Chip>Type' && /^Chip>Fits/.test(ru.tp) && /Type$/.test(ru.tp), { smart: ru.smart, flip: ru.flip, tp: ru.tp });
      { const rc = await pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text', U = { id: 'u1', serial: 'AB12C34', acquired_at: '2026-11-03T10:00:00Z' };
          const bmw = Object.assign({}, PART, { name: 'TEST BMW 3/5 06-10 (KR55WK49127)', grade: 'Aftermarket', chip: 'Philips ID46', fitment: ['2006-2012 BMW 3 Series', '2005-2010 BMW 5 Series', '2007-2011 BMW 6 Series', '2008-2011 BMW X3', '2007-2013 BMW X5', '2008-2014 BMW X6'].join('\n') });
          const lines = (la) => la.els.filter(T).map(e => e.rows[0]).filter(x => /^(Fits:|FCC ID:|Chip:|Type:)/.test(x)).map(x => x.split(':')[0]).join('>');
          const out = {}; ['s', 'm', 'l'].forEach(ts => { ['h', 'v'].forEach(o => { out[ts + o] = lines(L.layoutFor(bmw, U, 'large', { orient: o, logo: true, textSize: ts, tweaks: null })); }); }); return out; }, PART);
        check('a 2 × 3 smart-key label keeps FCC ID first and Type last at every text size (the chip prints when it fits)', Object.values(rc).every(x => /^FCC ID/.test(x) && /Type$/.test(x)), rc); }
      { const rb = await pg.evaluate((PART) => { const L = TKS_HW.labels, U = { id: 'u1', serial: 'AB12C34' }, out = {};
          ['large', 'xl', 'ship'].forEach(id => { ['h', 'v'].forEach(o => { const la = L.layoutFor(PART, U, id, { orient: o, logo: false, tweaks: null }); let minX = 1e9, minY = 1e9, maxX = 0, maxY = 0;
            la.els.forEach(e => { const w = e.t === 'qr' ? e.size : e.w, h = e.t === 'qr' ? e.size : (e.t === 'text' ? e.rows.length * e.font : 3); minX = Math.min(minX, e.x); minY = Math.min(minY, e.y); maxX = Math.max(maxX, e.x + (e.t === 'text' ? Math.min(w, Math.ceil(Math.max.apply(null, e.rows.map(r => r.length)) * 0.56 * e.font)) : w)); maxY = Math.max(maxY, e.y + h); });
            out[id + ':' + o] = [minX, minY, la.PW - la.shift - maxX, la.LL - maxY]; }); });
          const sm = L.layoutFor(PART, U, 'small'); return { out, smallLeft: Math.min.apply(null, sm.els.map(e => e.x)) }; }, PART);
        check('big labels have a small white border: nothing closer than 0.09 in (18 dots) to any edge; the 2 × 1 keeps its tighter margin', Object.values(rb.out).every(v => v.every(n => n >= 18)) && rb.smallLeft === 12, rb); } }

    // ---- settings ----
    const openSettings = async () => { await pg.evaluate(() => TKS_HW.openSettings()); await sleep(600); await pg.evaluate(() => { const c = document.querySelector('[data-szcard="small"]'); c && c.scrollIntoView({ block: 'start' }); }); await sleep(200); };
    const closeAll = async () => { await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await sleep(200); };
    await openSettings();
    r = await pg.evaluate(() => { const cards = Array.from(document.querySelectorAll('[data-szcard]')); const lab = Array.from(document.querySelectorAll('[data-szcard] label:has(input)')); const inp = Array.from(document.querySelectorAll('[data-szcard] input[type=checkbox],[data-szcard] input[type=radio]'));
      return { vis: cards.filter(c => c.offsetParent !== null).map(c => c.getAttribute('data-szcard')), pick: (function () { const p = document.getElementById('hwLbPick'); return p ? Array.from(p.options).map(o => o.textContent) : null; })(),
        cards: cards.length, svgs: cards.filter(c => c.querySelector('svg')).length, heading: /Label size in the printer/.test(document.body.innerText), note: /holds one roll at a time/.test(document.body.innerText),
        smallH: lab.filter(l => l.offsetParent !== null && l.getBoundingClientRect().height < 43).length, w: Array.from(document.querySelectorAll('[data-szsample]')).map(d => Math.round(d.firstChild.getBoundingClientRect().width)),
        tickSmall: !document.querySelector('[data-szon]') && !document.querySelector('input[name=hwLbSize]'), defSmall: document.getElementById('hwLbPick').value === 'small', kept: ['hwLbDpi', 'hwLbDark', 'hwLbShift', 'hwLbSpeed', 'hwLbDev', 'hwLbScan', 'hwLbPrev', 'hwLbTest'].every(i => document.getElementById(i)) }; });
    check('settings: heading, one-roll note, a size list (no separate 3 × 2 — it is the same label as 2 × 3) and ONE size on screen with its picture', r.heading && r.note && r.cards === 8 && r.svgs === 8 && r.vis.join() === 'small' && !!r.pick && r.pick.length === 8 && /2 × 1 in$/.test(r.pick[0]) && !r.pick.some(t => /3 × 2/.test(t)) && r.pick.some(t => /2 × 3 in$/.test(t)), r);
    { const pickSize = (id) => pg.evaluate((id) => { const p = document.getElementById('hwLbPick'); p.value = id; p.dispatchEvent(new Event('change', { bubbles: true })); const c = document.querySelector('[data-szcard="' + id + '"]'); return { vis: Array.from(document.querySelectorAll('[data-szcard]')).filter(x => x.offsetParent !== null).map(x => x.getAttribute('data-szcard')), w: Math.round(c.querySelector('[data-szsample]').firstChild.getBoundingClientRect().width), or: !!c.querySelector('input[name="hwLbOr_' + id + '"]') }; }, id);
      const a = await pickSize('large'); await sleep(150); const b2 = await pickSize('xl'); await sleep(150); const c2 = await pickSize('small'); await sleep(150);
      check('settings: picking a size in the list shows that size alone, drawn to scale, with Horizontal / Vertical on the big ones; tap rows are ≥ 44px', a.vis.join() === 'large' && b2.vis.join() === 'xl' && c2.vis.join() === 'small' && c2.w === 180 && b2.w === 360 && a.or && b2.or && !c2.or && r.smallH === 0, { a, b2, c2, smallH: r.smallH }); }
    check('settings: the list shows the size in use (Small) and there are no "we have this size" / "use by default" ticks; printer/DPI/darkness/margin/speed/test buttons still there', r.tickSmall && r.defSmall && r.kept, r);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-pc.png') });
    // tick large + medium, make large the default
    await pg.evaluate(() => { const p = document.getElementById('hwLbPick'); p.value = 'xl'; p.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    r = await pg.evaluate(() => ({ p: JSON.parse(localStorage.getItem('tks_hw_prefs')).labels, z: TKS_HW.labels.buildZPL({ sku: 'X-1', name: 'TEST', sellPriceCents: 100 }) }));
    const ro = await pg.evaluate(() => ({ or: Array.from(document.querySelectorAll('input[name^="hwLbOr_"]')).map(i => i.name.slice(7) + ':' + i.value + (i.checked ? '*' : '')), small: !!document.querySelector('input[name="hwLbOr_small"]') }));
    check('settings: each big size has Horizontal / Vertical (the roll\'s own way is ticked to start); small sizes do not', ro.or.includes('xl:h*') && ro.or.includes('xl:v') && ro.or.includes('large:h*') && ro.or.includes('ship:v*') && !ro.or.some(x => /^tall:/.test(x)) && ro.or.includes('ship:v*') && !ro.small, ro.or);
    check('picking another size in Settings changes what prints (and widthIn/heightIn follow)', r.p.size === 'xl' && r.p.sizesOn.join() === 'xl' && r.p.widthIn === 4 && r.p.heightIn === 2 && /\^PW812/.test(r.z) && /\^LL406/.test(r.z), { size: r.p.size, on: r.p.sizesOn, w: r.p.widthIn });
    // test label prints the default size
    zpls.length = 0; await pg.evaluate(() => document.getElementById('hwLbTest').click()); await sleep(700);
    check('Test label prints the default size', zpls.length === 1 && /\^PW812/.test(zpls[0]), zpls.map(z => z.slice(0, 40)));
    await pg.evaluate(() => { const p = document.getElementById('hwLbPick'); p.value = 'large'; p.dispatchEvent(new Event('change', { bubbles: true })); p.scrollIntoView({ block: 'start' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-large-pc.png') });
    await closeAll();
    // back to small default but keep small+large ticked
    await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'small'; P.sizesOn = ['small']; P.widthIn = 2; P.heightIn = 1; TKS_HW.save(); });

    // ---- phone settings ----
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await openSettings();
    r = await pg.evaluate(() => { const cd = document.querySelector('[data-szcard="xl"]').closest('div[style*="max-height"]') || document.body; const els = Array.from(document.querySelectorAll('[data-szcard], [data-szcard] svg')); return { docX: document.documentElement.scrollWidth - innerWidth, modalX: cd.scrollWidth - cd.clientWidth, over: els.filter(e => e.getBoundingClientRect().right > innerWidth + 1).length, tap: Array.from(document.querySelectorAll('[data-szcard] label:has(input), #hwLbPick')).filter(l => l.offsetParent !== null && l.getBoundingClientRect().height < 43).length }; });
    check('phone: settings has no sideways scroll, samples fit, tap rows ≥ 44px', r.docX <= 0 && r.modalX <= 0 && r.over === 0 && r.tap === 0, r);
    await pg.evaluate(() => { const p = document.getElementById('hwLbPick'); p.value = 'large'; p.dispatchEvent(new Event('change', { bubbles: true })); p.scrollIntoView({ block: 'start' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'labels-settings-phone.png') });
    await closeAll(); await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'small'; P.sizesOn = ['small']; P.widthIn = 2; P.heightIn = 1; TKS_HW.save(); }); await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    // ---- inventory row → dialog ----
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(1500);
    const rowBtn = async (sku) => pg.evaluate((sku) => { const row = Array.from(document.querySelectorAll('#view-inventory .row, #view-inventory [class*=row]')).find(x => x.innerText.includes(sku) && x.querySelector('[data-label]')); const bt = row && row.querySelector('[data-label]'); if (bt) { bt.click(); return true; } return false; }, sku);
    check('inventory row shows the 🏷️ button', await rowBtn('FORD-R8134'), null); await sleep(900);
    r = await pg.evaluate(() => { const t = document.body.innerText; const chips = Array.from(document.querySelectorAll('#plChips button')).map(x => x.innerText.trim()); return { title: /Print labels/.test(t), name: /Ford F-150 2015-2020 5-Button Smart Key/.test(t), chips, set: document.getElementById('plSetTxt').innerText, link: !!document.querySelector('[data-set]'), noChoices: !document.querySelector('#plSizes, #plOr, #plTs, #plFits, #plLogo'), svg: !!document.querySelector('#plSample svg'), mode: Array.from(document.querySelectorAll('input[name=plMode]')).map(x => x.value + (x.checked ? '*' : '')), go: document.getElementById('plGo').innerText }; });
    check('dialog: title + part name, a number box and ONE button "Print all (7 in stock)" (no 1/2/3/5/10 chips), live sample, button says Print 1 label', r.title && r.name && r.chips.join('|') === 'Print all (7 in stock)' && !!(await pg.$('#plNum')) && r.svg && /Print 1 label$/.test(r.go), r);
    check('dialog: no size / layout / text-size / logo / Fits choices — one line says what Settings has ("Label: Small 2 × 1 in.") with a "Change label size or layout" link', r.noChoices && /^Label: Small 2 × 1 in\.$/.test(r.set) && r.link, r);
    check('dialog: serialized + in-stock units found → "own label" (chosen to start, so the serial prints) vs "same label"', r.mode.join() === 'own*,same', r.mode);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-pc.png') });
    const click = (sel) => pg.evaluate((sel) => document.querySelector(sel).click(), sel);
    // 1 label, small
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('print 1 (small) → that key\'s own label with its serial number, 2x1, no ^PQ', zpls.length === 1 && /SN: AB12C/.test(zpls[0]) && /\^PW406/.test(zpls[0]) && !/\^PQ/.test(zpls[0]), zpls.map(z => z.slice(0, 40)));
    check('success toast + dialog closes', await pg.evaluate(() => /1 label sent to the printer\./.test(document.body.innerText) && !document.getElementById('plGo')), null);
    // 3 labels, large
    await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'xl'; P.sizesOn = ['xl']; TKS_HW.save(); });
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    await pg.evaluate(() => { const i = document.getElementById('plNum'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
    r = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, tier: document.querySelector('#plSample svg').getAttribute('data-tier'), txt: document.getElementById('plSample').innerText }));
    check('dialog (4 × 2 set in Settings): typing 3 updates the button and the sample (tier 3 shows Fits/FCC)', /Print 3 labels$/.test(r.go) && r.tier === '3' && /Fits:/.test(r.txt) && /FCC ID:/.test(r.txt), r);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-large-pc.png') });
    await pg.evaluate(() => document.querySelector('input[name=plMode][value=same]').click()); await sleep(150);
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('print 3 (4 × 2) as "same label" → one ZPL ^PW812 with ^PQ3', zpls.length === 1 && /\^PW812/.test(zpls[0]) && /\^PQ3/.test(zpls[0]) && /Fits:/.test(zpls[0]), zpls.map(z => z.slice(-30)));
    // remembered size
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
    r = await pg.evaluate(() => document.getElementById('plSetTxt').innerText);
    check('the line at the bottom follows Settings (4 × 2, Horizontal, Medium text)', /^Label: Extra large 4 × 2 in · Horizontal · Medium text\.$/.test(r), r);
    await click('[data-set]'); await sleep(800);
    r = await pg.evaluate(() => ({ box: !!document.getElementById('plGo'), pick: (document.getElementById('hwLbPick') || {}).value }));
    check('"Change label size or layout" closes the print box and opens Settings at the label size', !r.box && r.pick === 'xl', r);
    await closeAll(); await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'small'; P.sizesOn = ['small']; P.widthIn = 2; P.heightIn = 1; TKS_HW.save(); });
    await sleep(2800); await rowBtn('FORD-R8134'); await sleep(900);
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
    await pg.evaluate(() => { const i = document.getElementById('plNum'); i.value = '3'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await pg.evaluate(() => document.querySelector('input[name=plMode][value=own]').click()); await sleep(200);
    r = await pg.evaluate(() => document.getElementById('plNote').innerText);
    zpls.length = 0; await click('#plGo'); await sleep(900);
    check('3 of 7 with own labels → first 3 units, newest first, and says so', /first 3 keys \(newest first\)/.test(r) && zpls.length === 1 && (zpls[0].match(/\^XA/g) || []).length === 3 && /AB12C36/.test(zpls[0]) && /AB12C34/.test(zpls[0]) && !/AB12C33/.test(zpls[0]), { r });
    // typed number, 60 asks to confirm (dialogs are accepted by the test)
    await sleep(2800); await rowBtn('T-BLANK'); await sleep(900);
    r = await pg.evaluate(() => ({ chips: Array.from(document.querySelectorAll('#plChips button')).map(x => x.innerText.trim()).join('|'), mode: document.querySelectorAll('input[name=plMode]').length, sizes: !document.getElementById('plSizeWrap') }));
    check('plain part (not serialized): "Print all (4 in stock)", no own-label choice', r.chips === 'Print all (4 in stock)' && r.mode === 0, r);
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
    await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'xl'; P.sizesOn = ['xl']; TKS_HW.save(); });
    await sleep(2800);
    const ok = await pg.evaluate(() => TKS_HW.labels.openPrintDialog({ id: 'k1', name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', category: 'Keys/Smart Key', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150', fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM' }, { inStock: 7, fetchUnits: async () => [{ id: 'u_a', serial: 'AB12C30', acquired_at: '2026-11-03T10:00:00Z' }, { id: 'u_b', serial: 'AB12C31' }] }) && true); await sleep(700);

    r = await pg.evaluate(() => { const card = document.getElementById('plGo').closest('div[style*="max-height"]'); const bt = Array.from(document.querySelectorAll('#plChips button, #plKind button, [data-set], #plGo, #plCancel, [name=plMode]')).filter(x => x.getBoundingClientRect().height < 43 && x.type !== 'radio'); return { docX: document.documentElement.scrollWidth - innerWidth, cardX: card.scrollWidth - card.clientWidth, small: bt.map(x => x.id || x.innerText), svgR: Math.round(document.querySelector('#plSample svg').getBoundingClientRect().right), vw: innerWidth }; });
    check('phone: dialog fits (no sideways scroll), buttons/chips ≥ 44px, sample inside the screen', r.docX <= 0 && r.cardX <= 0 && r.small.length === 0 && r.svgR <= r.vw, r);
    await pg.screenshot({ path: path.join(OUT, 'labels-dialog-phone.png') });
    await pg.evaluate(() => document.getElementById('plCancel').click());
    // ---- 8z108: text size and "Print what it fits" in the print box ----
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.evaluate(() => { document.querySelectorAll('[data-x]').forEach(x => x.click()); const P = TKS_HW.prefs().labels; P.size = 'large'; P.sizesOn = ['small', 'large']; P.textSize = 'm'; P.fits = true; P.orient = { large: 'h' }; delete P.tweaks; TKS_HW.save(); });
    await pg.evaluate((PART) => TKS_HW.labels.openPrintDialog(PART, { inStock: 2 }), PART); await sleep(500);

    r = await pg.evaluate(() => ({ set: document.getElementById('plSetTxt').innerText, txt: document.getElementById('plSample').textContent }));
    check('print box follows Settings: "Label: Large 2 × 3 in · Horizontal · Medium text." and the picture has the Fits line', /^Label: Large 2 × 3 in · Horizontal · Medium text\.$/.test(r.set) && /Fits: 2015/.test(r.txt), r);
    await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await openSettings();
    await pg.evaluate(() => { document.querySelector('input[name=hwLbText][value=s]').click(); const f = document.getElementById('hwLbFits'); if (f.checked) f.click(); document.querySelector('input[name="hwLbOr_large"][value=v]').click(); }); await sleep(300); await closeAll();
    await pg.evaluate((PART) => TKS_HW.labels.openPrintDialog(PART, { inStock: 2 }), PART); await sleep(500);
    r = await pg.evaluate(() => ({ p: TKS_HW.prefs().labels.textSize, f: TKS_HW.prefs().labels.fits, set: document.getElementById('plSetTxt').innerText, txt: document.getElementById('plSample').textContent }));
    check('Small text, Vertical and "Print what it fits" off — chosen in Settings — are what the print box shows next time', r.p === 's' && r.f === false && /· Vertical · Small text\.$/.test(r.set) && !/Fits:/.test(r.txt), r);
    await pg.evaluate(() => { document.querySelectorAll('[data-x]').forEach(x => x.click()); const P = TKS_HW.prefs().labels; P.textSize = 'm'; P.fits = true; P.orient = { large: 'h' }; TKS_HW.save(); });

    // ---- 8z126: reprint the label of one chosen serial number (printing never makes a new key or serial) ----
    { await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click()));
      const U = [{ id: 'u_a', serial: 'AB12C30', location: 'shop' }, { id: 'u_b', serial: 'AB12C31', location: 'van:1' }, { id: 'u_c', serial: 'AB12C32', location: 'shop' }];
      await pg.evaluate((PART, U) => TKS_HW.labels.openPrintDialog(PART, { inStock: 3, fetchUnits: async () => U }), PART, U); await sleep(600);
      let p = await pg.evaluate(() => ({ chips: Array.from(document.querySelectorAll('#plPick [data-pick]')).map(b => b.innerText.replace(/\s+/g, ' ').trim()), small: Array.from(document.querySelectorAll('#plPick [data-pick]')).filter(b => b.getBoundingClientRect().height < 43).length, go: document.getElementById('plGo').innerText }));
      check('print box for a serial-numbered item lists its keys by serial number (with where each is)', p.chips.join('|') === 'AB12C30 · shop|AB12C31 · van|AB12C32 · shop' && p.small === 0 && /Print 1 label$/.test(p.go), p);
      await click('#plPick [data-pick="u_c"]'); await sleep(250);
      p = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, note: document.getElementById('plNote').innerText, sample: document.getElementById('plSample').textContent, num: document.getElementById('plNum').value }));
      check('tapping AB12C32 chooses that key: the picture shows its serial and the note says no key is added', /Print 1 label$/.test(p.go) && /SN: AB12C32/.test(p.sample) && /No key is added/.test(p.note) && p.num === '1', p);
      zpls.length = 0; await click('#plGo'); await sleep(800);
      const first = zpls[0] || '';
      await pg.evaluate((PART, U) => TKS_HW.labels.openPrintDialog(PART, { inStock: 3, fetchUnits: async () => U }), PART, U); await sleep(600);
      await click('#plPick [data-pick="u_c"]'); await sleep(200); zpls.length = 0; await click('#plGo'); await sleep(800);
      check('printing it — and printing it again — gives the SAME serial number each time, one label, nothing else', /SN: AB12C32/.test(first) && (first.match(/\^XA/g) || []).length === 1 && !/AB12C30|AB12C31/.test(first) && zpls.length === 1 && /SN: AB12C32/.test(zpls[0]) && !/AB12C30|AB12C31/.test(zpls[0]), { first: first.slice(-60), second: (zpls[0] || '').slice(-60) });
      await pg.evaluate((PART, U) => TKS_HW.labels.openPrintDialog(PART, { inStock: 3, fetchUnits: async () => U }), PART, U); await sleep(600);
      await click('#plPick [data-pick="u_a"]'); await click('#plPick [data-pick="u_b"]'); await sleep(200);
      p = await pg.evaluate(() => document.getElementById('plGo').innerText); await pg.evaluate(() => { const b = document.querySelector('[data-pickclear]'); if (b) b.click(); }); await sleep(200);
      const after = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, on: document.querySelectorAll('#plPick [aria-pressed="true"]').length }));
      check('two tapped → "Print 2 labels"; clear goes back to the newest key', /Print 2 labels$/.test(p) && /Print 1 label$/.test(after.go) && after.on === 0, { p, after });
      await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await sleep(200); }

    // ---- 8z109: bin label in the print box ----
    await pg.evaluate((PART) => TKS_HW.labels.openPrintDialog(PART, { inStock: 7 }), PART); await sleep(400);
    r = await pg.evaluate(() => ({ kinds: Array.from(document.querySelectorAll('#plKind [data-kind]')).map(b => b.innerText + (b.getAttribute('aria-disabled') ? ' (off)' : '')), note: document.getElementById('plKindNote').innerText }));
    check('print box, item with no bin: "Bin label" is greyed out and says to give the item a Bin / shelf first', r.kinds.join('|') === 'Key labels|Bin label (off)' && /Bin \/ shelf first/.test(r.note), r);
    await click('#plKind [data-kind="bin"]'); await sleep(200);
    check('…and tapping it changes nothing', await pg.evaluate(() => /Print 1 label$/.test(document.getElementById('plGo').innerText)), null);
    await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await pg.evaluate(() => { const P = TKS_HW.prefs().labels; P.size = 'small'; P.sizesOn = ['small']; P.widthIn = 2; P.heightIn = 1; TKS_HW.save(); });
    await pg.evaluate((PART) => TKS_HW.labels.openPrintDialog(Object.assign({}, PART, { location: 'Drawer B-4' }), { inStock: 7 }), PART); await sleep(400);
    await pg.evaluate(() => { const i = document.getElementById('plNum'); i.value = '5'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(200);
    await click('#plKind [data-kind="bin"]'); await sleep(300);
    r = await pg.evaluate(() => ({ kinds: Array.from(document.querySelectorAll('#plKind [data-kind]')).map(b => b.innerText + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')), go: document.getElementById('plGo').innerText, num: document.getElementById('plNum').value, all: !!document.querySelector('#plChips [data-all]'), txt: document.getElementById('plSample').textContent, fits: document.getElementById('plFitsWrap') ? 'shown' : 'none', note: document.getElementById('plKindNote').innerText }));
    check('item with a bin: "Bin label (Drawer B-4)" → one label, no "Print all", the picture shows the bin in capitals with the key name and SKU', r.kinds.join('|') === 'Key labels|Bin label (Drawer B-4)*' && /Print 1 bin label$/.test(r.go) && r.num === '1' && !r.all && /DRAWER B-4/.test(r.txt) && /FORD-R8134/.test(r.txt) && !/\$165/.test(r.txt) && r.fits === 'none' && /bin or drawer/.test(r.note), r);
    await pg.screenshot({ path: path.join(OUT, 'labels-bin-pc.png') });
    zpls.length = 0; await click('#plGo'); await sleep(700);
    check('printing it sends ONE label with the bin on it', zpls.length === 1 && /DRAWER B-4/.test(zpls[0]) && !/\^PQ/.test(zpls[0]) && /\^PW406/.test(zpls[0]), zpls.map(z => z.slice(0, 60)));
    await pg.evaluate((PART) => TKS_HW.labels.openPrintDialog(Object.assign({}, PART, { location: 'Drawer B-4' }), { inStock: 7 }), PART); await sleep(400);
    await pg.evaluate(() => { const i = document.getElementById('plNum'); i.value = '5'; i.dispatchEvent(new Event('input', { bubbles: true })); }); await click('#plKind [data-kind="bin"]'); await sleep(150); await click('#plKind [data-kind="key"]'); await sleep(200);
    r = await pg.evaluate(() => ({ go: document.getElementById('plGo').innerText, num: document.getElementById('plNum').value, all: !!document.querySelector('#plChips [data-all]') }));
    check('switching back to "Key labels" brings back the count that was typed (5) and "Print all"', /Print 5 labels$/.test(r.go) && r.num === '5' && r.all, r);
    await pg.evaluate(() => document.querySelectorAll('[data-x]').forEach(x => x.click())); await sleep(200);

    // ---- 8z110 / 8z118: stock list — out of stock goes last in its group; the tiles are the filters ----
    r = await pg.evaluate(() => { const mk = (name, qty, cat) => ({ id: name, name, qty, category: cat || 'Keys/Smart Key', lowAt: 2 });
      const sorted = [mk('TEST A out', 0), mk('TEST B low', 1), mk('TEST C plenty', 9), mk('TEST D out', 0), mk('TEST E shell', 3, 'Keys/Key Shell'), mk('TEST F shell out', 0, 'Keys/Key Shell')].sort(invGroupSort).map(p => p.name);
      const all = TKS.Inventory.all(), p = Object.assign({}, all[0], { id: 'test_out_1', name: 'TEST Out Of Stock Key', sku: 'TEST-OUT', qty: 0 }); TKS.Inventory.save(p); renderInventory();
      return { sorted, view: invStockView() }; }); await sleep(400);
    check('stock list order inside a group: running low first, then in stock, then OUT OF STOCK last — group by group', r.sorted.join('|') === 'TEST B low|TEST C plenty|TEST A out|TEST D out|TEST E shell|TEST F shell out' && r.view === 'all', r);
    { const snap = () => pg.evaluate(() => { const t = (id) => { const e = document.getElementById(id); return e ? e.innerText.replace(/\s+/g, ' ').trim() + (e.getAttribute('aria-pressed') === 'true' ? ' *' : '') : null; };
        return { rows: document.querySelectorAll('#view-inventory .part').length, out: /TEST Out Of Stock Key/.test(document.getElementById('view-inventory').innerText), inSt: /Ford F-150 2015-2020 5-Button/.test(document.getElementById('view-inventory').innerText), all: t('invAllChip'), low: t('invLowChip'), old: !!document.querySelector('[data-stockview], #invOutChip'), saved: localStorage.getItem('tks_inv_stock_view') }; });
      const tap = async (id) => { await pg.evaluate((id) => document.getElementById(id).click(), id); await sleep(400); return snap(); };
      const a0 = await snap(), low = await tap('invLowChip'), back = await tap('invAllChip');
      check('the first tile says "all" (selected to start) and there is no separate All / In stock / Out of stock control', /^\d+ all \*$/.test(a0.all) && /^\d+ low \/ out$/.test(a0.low) && !a0.old && a0.out && a0.inSt, a0);
      check('tapping "low / out" lists only what is low or out of stock — what to order (remembered on this device)', low.out && !low.inSt && low.rows >= 1 && low.rows < a0.rows && low.saved === 'low' && /showing only these/.test(low.low) && /\*$/.test(low.low) && !/\*$/.test(low.all), low);
      check('tapping "all" brings everything back', back.out && back.inSt && back.rows === a0.rows && /\*$/.test(back.all) && back.saved === 'all', back); }

    // ---- 8z107: "Move things around" ----
    await openSettings();
    await pg.evaluate(() => { const p = document.getElementById('hwLbPick'); p.value = 'large'; p.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    await click('[data-szedit="large"]'); await sleep(500);
    const ed = (f) => pg.evaluate(f);
    r = await ed(() => ({ boxes: Array.from(document.querySelectorAll('#leStage [data-blk]')).map(b => b.getAttribute('data-blk')), chips: Array.from(document.querySelectorAll('#leChips [data-chip]')).map(b => b.innerText), read: document.getElementById('leRead').innerText, svg: !!document.querySelector('#leStage svg') }));
    check('editor: the label with a box on each part (Name, QR code, Price, Details, and Type + SKU + Serial as one) and a button for each', r.svg && r.boxes.sort().join() === 'details,name,price,qr,sku' && r.chips.join() === 'Name,QR code,Price,Details,Type + SKU + Serial' && /in its usual place/.test(r.read), r);
    await pg.screenshot({ path: path.join(OUT, 'labels-move-pc.png') });
    const tapLe = async (a, n) => { for (let i = 0; i < (n || 1); i++) { await pg.evaluate((a) => document.querySelector('[data-le="' + a + '"]').click(), a); } await sleep(120); };
    const priceEl = () => pg.evaluate((PART) => { const L = TKS_HW.labels, T = e => e.t === 'text' && /^\$/.test(e.text), SU = { id: 'u_sample', serial: 'K7Q2M9X', acquired_at: '2026-11-03T10:00:00Z' }, a = L.layoutFor(PART, SU, 'large', { tweaks: null }).els.find(T), b = L.layoutFor(PART, null, 'large'), e = b.els.find(T); return { was: [a.x, a.y, a.font], now: e ? [e.x, e.y, e.font] : null, zpl: e ? TKS_HW.labels.toZPL(b, 1).indexOf('^FO' + e.x + ',' + e.y + '^A0N,' + e.font) >= 0 : false, tw: (TKS_HW.prefs().labels.tweaks || {})[b.twKey] || null, key: b.twKey }; }, PART);
    await click('#leChips [data-chip="price"]'); await sleep(150); await tapLe('r', 3); await tapLe('d', 2); await tapLe('plus', 2);
    r = await priceEl(); r.read = await ed(() => document.getElementById('leRead').innerText);
    check('Price moved right 3 and down 2 steps and made bigger: saved for this size + layout as a fixed place, the printer code carries it, and the readout says where it is', r.key === 'large:h' && r.tw && r.tw.price.ax != null && r.tw.price.s === 1.1 && Math.abs(r.now[0] - r.was[0] - 12) <= 2 && Math.abs(r.now[1] - r.was[1] - 8) <= 2 && r.now[2] > r.was[2] && r.zpl && /fixed \d\.\d\d in from the left, \d\.\d\d in from the top/.test(r.read) && /110%/.test(r.read), r);
    await click('#leChips [data-chip="sku"]'); await sleep(150); await tapLe('r', 90); await tapLe('d', 90);
    r = await pg.evaluate((PART) => { const b = TKS_HW.labels.layoutFor(PART, null, 'large'), q = b.blocks.sku; return { q, W: b.PW - b.shift, H: b.LL }; }, PART);
    check('nothing can be pushed off the label (SKU moved 90 steps right and down stops at the edge)', r.q.x + r.q.w <= r.W + 1 && r.q.y + r.q.h <= r.H + 1 && r.q.x >= 0, r);
    await click('#leChips [data-chip="details"]'); await sleep(150); await tapLe('hide');
    r = await pg.evaluate((PART) => { const b = TKS_HW.labels.layoutFor(PART, null, 'large'); return { hidden: !!(b.blocks.details && b.blocks.details.hidden), any: b.els.some(e => e.t === 'text' && /^(Fits:|FCC ID:|Chip:)/.test(e.text)), type: b.els.some(e => e.t === 'text' && /^Type:/.test(e.text)), btn: document.getElementById('leHide').innerText, read: document.getElementById('leRead').innerText }; }, PART);
    check('Hide takes Details off the label (and offers Show); the Type line stays — it belongs to the SKU group', r.hidden && !r.any && r.type && r.btn === 'Show' && /will not print/.test(r.read), r);
    // drag the QR with the mouse
    { const bx = await pg.evaluate(() => { const b = document.querySelector('#leStage [data-blk="qr"]').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      await pg.mouse.move(bx[0], bx[1]); await pg.mouse.down(); await pg.mouse.move(bx[0] + 30, bx[1] + 20, { steps: 4 }); await pg.mouse.up(); await sleep(250);
      r = await pg.evaluate((PART) => { const b = TKS_HW.labels.layoutFor(PART, null, 'large'), a = TKS_HW.labels.layoutFor(PART, null, 'large', { tweaks: null }); return { tw: (TKS_HW.prefs().labels.tweaks || {})['large:h'].qr, moved: [b.els.find(e => e.t === 'qr').x - a.els.find(e => e.t === 'qr').x, b.els.find(e => e.t === 'qr').y - a.els.find(e => e.t === 'qr').y] }; }, PART);
      check('dragging a box moves that part (QR code dragged right and down)', !!r.tw && r.tw.ax != null && r.moved[0] > 0 && r.moved[1] > 0, r); }
    // 8z114: pull the corner handle of the QR code inwards → smaller; the serial number is its own box
    { await click('#leChips [data-chip="qr"]'); await sleep(200);
      const hb = await pg.evaluate(() => { const h = document.querySelector('#leStage [data-blk="qr"] [data-handle]'); if (!h) return null; const b = h.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
      const before = await pg.evaluate((PART) => TKS_HW.labels.layoutFor(PART, null, 'large').els.find(e => e.t === 'qr').size, PART);
      if (hb) { await pg.mouse.move(hb[0], hb[1]); await pg.mouse.down(); await pg.mouse.move(hb[0] - 30, hb[1] - 30, { steps: 4 }); await pg.mouse.up(); await sleep(250); }
      r = await pg.evaluate((PART) => ({ s: ((TKS_HW.prefs().labels.tweaks || {})['large:h'].qr || {}).s, now: TKS_HW.labels.layoutFor(PART, null, 'large').els.find(e => e.t === 'qr').size, read: document.getElementById('leRead').innerText }), PART);
      check('pulling the QR code\'s corner handle inwards makes it smaller (and the readout shows the size)', !!hb && r.s < 1 && r.now < before && /size \d+%/.test(r.read), { hb: !!hb, before, r });
      const pre = await pg.evaluate((PART) => { const la = TKS_HW.labels.layoutFor(PART, { id: 'u1', serial: 'AB12C34' }, 'large'), f = (re) => la.els.find(e => e.t === 'text' && re.test(e.rows[0])); return { ty: f(/^Type: /).y, sn: f(/^SN: /).y, sk: la.els.find(e => e.t === 'text' && e.bold).y }; }, PART);
      await click('#leChips [data-chip="sku"]'); await sleep(150); await tapLe('u', 3);
      r = await pg.evaluate((PART) => { const U = { id: 'u1', serial: 'AB12C34' }, L = TKS_HW.labels, b = L.layoutFor(PART, U, 'large'), f = (la, re) => la.els.find(e => e.t === 'text' && re.test(e.rows[0])), tw = (TKS_HW.prefs().labels.tweaks || {})['large:h'];
        const short = Object.assign({}, PART, { name: 'TEST RAV4 22-23' }), c = L.layoutFor(short, U, 'large');
        return { ty: f(b, /^Type: /).y, sn: f(b, /^SN: /).y, sk: b.els.find(e => e.t === 'text' && e.bold).y, sku: tw.sku, unitChip: !!document.querySelector('#leChips [data-chip="unit"]'), zpl: L.toZPL(b, 1).indexOf('SN: AB12C34') >= 0 && /Type: /.test(L.toZPL(b, 1)), shortTy: f(c, /^Type: /).y, read: document.getElementById('leRead').innerText }; }, PART);
      check('Type + SKU + Serial move as one box: 3 steps up moves all three by the same amount, on the printed label too; there is no separate Serial box on a big label', !!r.sku && r.sku.ax != null && !r.unitChip && r.ty < pre.ty && (pre.ty - r.ty) === (pre.sn - r.sn) && (pre.ty - r.ty) === (pre.sk - r.sk) && r.zpl && /^Type \+ SKU \+ Serial/.test(r.read), { pre, r });
      check('a moved part stays at the SAME spot whatever key prints (a short one-line name used to pull it up — the screen and the print now agree)', r.shortTy === r.ty, r); }
    await pg.screenshot({ path: path.join(OUT, 'labels-move-changed-pc.png') });
    await tapLe('done'); await sleep(400);
    r = await pg.evaluate(() => ({ open: !!document.getElementById('leStage'), note: (document.querySelector('[data-szmoved="large"]') || {}).innerText, other: (document.querySelector('[data-szmoved="xl"]') || {}).innerText }));
    check('Done closes it; Settings says this label has been changed (other sizes are untouched)', !r.open && /moved things/.test(r.note || '') && !(r.other || ''), r);
    await click('[data-szedit="large"]'); await sleep(400); await tapLe('resetall'); await sleep(200);
    r = await pg.evaluate((PART) => { const a = TKS_HW.labels.layoutFor(PART, null, 'large', { tweaks: null }), b = TKS_HW.labels.layoutFor(PART, null, 'large'); return { tw: (TKS_HW.prefs().labels.tweaks || {})['large:h'] || null, same: JSON.stringify(a.els.map(e => [e.x, e.y, e.font || e.size])) === JSON.stringify(b.els.map(e => [e.x, e.y, e.font || e.size])) }; }, PART);
    check('"Put everything back" returns the label to the automatic layout', !r.tw && r.same, r);
    await tapLe('done'); await sleep(300); await closeAll();
    // phone
    await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await openSettings(); await pg.evaluate(() => { const p = document.getElementById('hwLbPick'); p.value = 'large'; p.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    await click('[data-szedit="large"]'); await sleep(500); await click('#leChips [data-chip="price"]'); await sleep(200);
    r = await pg.evaluate(() => { const st = document.getElementById('leStage'), card = st.parentElement, sr = st.getBoundingClientRect(); return { docX: document.documentElement.scrollWidth - innerWidth, cardX: card.scrollWidth - card.clientWidth, stageR: Math.round(sr.right), vw: innerWidth, small: Array.from(card.querySelectorAll('button')).filter(b => b.offsetParent !== null && (b.getBoundingClientRect().height < 40)).map(b => b.innerText) }; });
    check('phone: the editor fits (no sideways scroll), the label is inside the screen, buttons are finger-sized', r.docX <= 0 && r.cardX <= 0 && r.stageR <= r.vw && r.small.length === 0, r);
    await pg.screenshot({ path: path.join(OUT, 'labels-move-phone.png') });
    await tapLe('done'); await sleep(200); await closeAll();

    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.stack || e)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
