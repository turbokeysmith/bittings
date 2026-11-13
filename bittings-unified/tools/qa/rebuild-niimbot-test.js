// Browser test of 8z102: NIIMBOT Bluetooth label printing as a second printer choice.
// No real printer here: the Bluetooth connection is stood in. What IS real: the label picture (384 × 240 dots for a
// 50 × 30 mm roll on a B1), the library's image encoder run on that picture, the print box, Settings, and the
// "no Bluetooth" (iPhone) path that hands over the label as a picture. Made-up TEST data. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8093;
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  → ' + JSON.stringify(detail).slice(0, 700))); if (!ok) failed++; }
const PART = { id: 'k1', name: 'TEST Ford F-150 2015-2020 5-Button Smart Key', sku: 'T-FORD-R8134', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150', fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', category: 'Keys/Smart Key', grade: 'OEM', qty: 7 };
(async () => {
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const boot = async (pg, vp, prefs) => { await pg.setViewport(vp); await pg.goto('http://127.0.0.1:' + PORT + '/seed.html');
      await pg.evaluate((prefs) => { const iso = new Date(Date.now() - 20 * 60000).toISOString(); localStorage.clear();
        localStorage.setItem('__db', JSON.stringify({ receipts: [], customers: [], bookings: [], inventory: [{ id: 'k1', shop_id: 's', name: 'TEST Ford F-150 2015-2020 5-Button Smart Key', sku: 'T-FORD-R8134', category: 'Keys/Smart Key', fitment: '2015-2020 Ford F-150', fcc_id: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', grade: 'OEM', qty: 7, cost: 38, sell_price_cents: 16500, deleted_at: null, updated_at: iso }],
          shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.5, updated_at: iso, data: { taxRate: 8.5, identity: { name: 'TEST Shop' }, setup: { completed: true } } }] }));
        localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_hw_prefs', JSON.stringify(prefs));
        localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-2222-4333-8444-555555555555', email: 't@example.com' } })); }, prefs);
      await pg.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && window.TKS_NIIM && window.TKS_HW, { timeout: 15000 }); await sleep(2500); };
    const newPage = async () => { const pg = await b.newPage(); pg._errs = []; pg.on('pageerror', e => pg._errs.push(String(e.message)));
      await pg.setRequestInterception(true); pg.on('request', rq => new RegExp('^https?://127\\.0\\.0\\.1:' + PORT + '/|^blob:|^data:').test(rq.url()) ? rq.continue() : rq.abort()); return pg; };
    const BOTH = { labels: { enabled: true, size: 'small', sizesOn: ['small', 'large'] }, niimbot: { enabled: true, model: 'B1', size: '50x30', density: 3 } };
    const PHONE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

    // ================= 1. the label picture and the library =================
    const pg = await newPage(); await boot(pg, PHONE, BOTH);
    let r = await pg.evaluate(async (PART) => { const NB = TKS_NIIM, c = NB.canvasFor(PART, null, '50x30'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let black = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 128) black++;
      const L = NB.layout(PART, null, '50x30'), over = L.els.filter(e => (e.t === 'text' && (e.x + e.w > L.PW + 1 || e.y + e.font * (e.rows ? e.rows.length : 1) > L.LL + 1)) || (e.t === 'qr' && (e.x + e.size > L.PW || e.y + e.size > L.LL))).length;
      const lib = await NB.loadLib(); const enc = lib.ImageEncoder.encodeCanvas(c, lib.PageColorType.SingleColor, 'top');
      const big = NB.layout(PART, null, '50x80'), small = NB.layout(PART, null, '40x20');
      return { w: c.width, h: c.height, pct: black / (c.width * c.height), over, shift: L.shift, tier: L.tier, texts: L.els.filter(e => e.t === 'text').map(e => e.text).join(' | '), cols: enc.cols, rows: enc.rows, rowsData: (enc.rowsData || []).length,
        tiers: [small.tier, L.tier, big.tier], bigTexts: big.els.filter(e => e.t === 'text').map(e => e.text).join(' | '), tasks: lib.printTaskNames.indexOf('B1') >= 0, cap: typeof window.Capacitor }; }, PART);
    check('a 50 × 30 mm label is drawn 384 × 240 dots — the full width of the B1\'s print head', r.w === 384 && r.h === 240, r);
    check('the picture has the QR code, name, price and part number on it, nothing runs off the label, and there is no Zebra left-margin shift', r.pct > 0.03 && r.pct < 0.6 && r.over === 0 && r.shift === 0 && /\$165\.00/.test(r.texts) && /T-FORD-R8134/.test(r.texts), r);
    check('the printing library loads on demand, has the B1 print routine, and turns the picture into 240 rows of 384 dots', r.tasks && r.cols === 384 && r.rows === 240, { cols: r.cols, rows: r.rows, rowsData: r.rowsData });
    check('bigger rolls carry more: 40 × 20 = basics, 50 × 30 adds "Fits", 50 × 80 adds FCC ID and type', r.tiers.join() === '1,2,3' && /Fits:/.test(r.texts) && /FCC ID:/.test(r.bigTexts) && /Type:/.test(r.bigTexts), { tiers: r.tiers, big: r.bigTexts });

    // ---- 8z103: big labels use the room, and carry the shop logo when one is uploaded ----
    r = await pg.evaluate(async (PART) => { const HW = TKS_HW.labels, f = e => e.t === 'text';
      const plain = HW.layoutFor(PART, null, 'large', { fill: false }), filled = HW.layoutFor(PART, null, 'large');
      const nameFont = L => L.els.filter(f)[0].font, lastTextBottom = L => Math.max.apply(null, L.els.filter(f).filter(e => e.b !== 'sku').map(e => e.y + e.font * (e.rows ? e.rows.length : 1)));
      // upload a logo (a made-up black bar with white text) and let the label code load it
      const c = document.createElement('canvas'); c.width = 600; c.height = 150; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 600, 150); x.fillStyle = '#c00'; x.fillRect(20, 30, 560, 90); x.fillStyle = '#fff'; x.font = '700 60px sans-serif'; x.fillText('TEST LOGO', 120, 98);
      const real = TKS.Config.identity; TKS.Config.identity = () => Object.assign({}, real.call(TKS.Config), { logo: c.toDataURL('image/png') });
      const im = await HW.ensureLogo(); const withLogo = HW.layoutFor(PART, null, 'large'), lg = withLogo.els.find(e => e.t === 'logo');
      const zpl = HW.toZPL(withLogo, 1), svg = HW.toSVG(withLogo), small = HW.layoutFor(PART, null, 'small'), off = HW.layoutFor(PART, null, 'large', { logo: false });
      const nb = TKS_NIIM.layout(PART, null, '50x80'), nbc = TKS_NIIM.canvasFor(PART, null, '50x80'), px = nbc.getContext('2d').getImageData(0, 0, nbc.width, Math.round(nb.els.find(e => e.t === 'logo').h + 14)).data; let dark = 0; for (let i = 0; i < px.length; i += 4) if (px[i] < 128) dark++;
      const over = L => L.els.filter(e => (e.t === 'text' && (e.x + e.w > L.PW + 1 || e.y + e.font * (e.rows ? e.rows.length : 1) > L.LL + 1)) || (e.t === 'logo' && (e.x + e.w > L.PW || e.y + e.h > L.LL)) || (e.t === 'qr' && e.y + e.size > L.LL)).length;
      return { plainFont: nameFont(plain), filledFont: nameFont(filled), plainBottom: Math.round(lastTextBottom(plain)), filledBottom: Math.round(lastTextBottom(filled)), LL: plain.LL, sameLines: plain.els.filter(f).length === filled.els.filter(f).length,
        loaded: !!im, logo: lg ? { w: lg.w, h: lg.h, y: lg.y } : null, qrBelow: lg ? withLogo.els.find(e => e.t === 'qr').y >= lg.y + lg.h : false, gfa: (zpl.match(/\^GFA/g) || []).length, svgImg: /<image /.test(svg), smallLogo: small.els.some(e => e.t === 'logo'), offLogo: off.els.some(e => e.t === 'logo'),
        nbLogo: nb.els.some(e => e.t === 'logo'), nbDark: dark, over: over(withLogo) + over(filled) + over(nb) }; }, PART);
    check('large labels use the room: the type is bigger and the text reaches further down, with the same lines on it', r.filledFont > r.plainFont && r.filledBottom > r.plainBottom + 20 && r.sameLines, { plainFont: r.plainFont, filledFont: r.filledFont, plainBottom: r.plainBottom, filledBottom: r.filledBottom, LL: r.LL });
    check('with a logo uploaded, a large label carries it across the top (the QR code and text start below it) — on the Zebra code, the sample and the Niimbot picture', r.loaded && !!r.logo && r.logo.y <= 24 && r.qrBelow && r.gfa >= 2 && r.svgImg && r.nbLogo && r.nbDark > 300, r);
    check('small labels never get the logo, the logo can be switched off, and nothing runs off any label', !r.smallLogo && !r.offLogo && r.over === 0, r);
    await pg.evaluate(async (PART) => { const d = document.createElement('div'); d.id = 'lgShow'; d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#667;padding:14px;overflow:auto;display:flex;flex-direction:column;gap:14px;align-items:center';
      for (const sz of ['large', 'xl']) { const w = document.createElement('div'); w.style.width = sz === 'large' ? '330px' : '360px'; w.innerHTML = TKS_HW.labels.toSVG(TKS_HW.labels.layoutFor(PART, null, sz)); d.appendChild(w); }
      const c = TKS_NIIM.sampleCanvas(PART, null, '50x80'); c.style.maxWidth = '210px'; d.appendChild(c); document.body.appendChild(d); }, PART); await sleep(500);
    await pg.screenshot({ path: path.join(OUT, 'labels-logo-fill-phone.png') }); await pg.evaluate(() => document.getElementById('lgShow').remove());

    // ================= 2. the print box with both printers =================
    await pg.evaluate((PART) => { window.__nb = []; const NB = TKS_NIIM; let conn = false;
      NB.connect = () => { window.__nb.push('connect'); conn = true; return Promise.resolve({ connected: true, name: 'B1-TEST' }); };
      NB.status = () => ({ connected: conn, name: conn ? 'B1-TEST' : '' });
      NB.printPart = (p, copies, size) => { window.__nb.push('part x' + copies + ' ' + size + ' ' + p.sku); return Promise.resolve(copies); };
      NB.printUnits = (u, p, size) => { window.__nb.push('units ' + u.length + ' ' + size); return Promise.resolve(u.length); };
      TKS_HW.labels.openPrintDialog(PART, { inStock: 7 }); }, PART); await sleep(400);
    const dlg = () => pg.evaluate(() => { const g = document.getElementById('plGo'); if (!g) return null; const card = g.closest('div[role="dialog"], .hw-card, div');
      return { prn: Array.from(document.querySelectorAll('#plPrn button')).map(x => x.innerText.trim() + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')), go: g.innerText.trim(), note: document.getElementById('plNote').innerText, sizeShown: !!document.getElementById('plSizeWrap'),
        sample: (document.querySelector('#plSample canvas') ? 'canvas ' + document.querySelector('#plSample canvas').width + 'x' + document.querySelector('#plSample canvas').height : (document.querySelector('#plSample svg') ? 'svg' : 'none')), err: document.getElementById('plErr').innerText }; });
    r = await dlg();
    check('with both printers on, the print box asks which printer (counter printer first)', !!r && r.prn.join() === 'Counter printer*,Bluetooth (Niimbot)' && r.sample === 'svg' && !r.sizeShown, r);   // 8z111: the size comes from Settings, it is not asked again
    await pg.evaluate(() => document.querySelector('#plPrn [data-prn="niimbot"]').click()); await sleep(300); r = await dlg();
    check('choosing the Niimbot shows its own label (50 × 30 mm) as a picture and offers "Connect the printer and print"', r.prn[1] === 'Bluetooth (Niimbot)*' && r.sample === 'canvas 768x480' && /50 × 30 mm/.test(r.note) && /Connect the printer and print 1/.test(r.go) && !r.sizeShown, r);
    await pg.screenshot({ path: path.join(OUT, 'niimbot-dialog-phone.png') });
    r = await pg.evaluate(() => { const g = document.getElementById('plGo').getBoundingClientRect(), chips = Array.from(document.querySelectorAll('#plPrn button, #plChips button')).map(x => Math.round(x.getBoundingClientRect().height)); return { side: document.documentElement.scrollWidth > innerWidth + 1, go: Math.round(g.height), chips: Math.min.apply(null, chips) }; });
    check('phone: the print box fits, buttons are finger-sized', !r.side && r.go >= 44 && r.chips >= 44, r);
    await pg.evaluate(() => { document.querySelector('#plChips [data-all]').click(); }); await sleep(200);
    await pg.evaluate(() => document.getElementById('plGo').click()); await sleep(700);
    r = await pg.evaluate(() => ({ calls: window.__nb, open: !!document.getElementById('plGo'), last: localStorage.getItem('tks_lbl_printer') }));
    check('"Print all (7 in stock)" on the Niimbot: connects on that tap, prints 7 on the 50 × 30 roll, and closes', JSON.stringify(r.calls) === JSON.stringify(['connect', 'part x7 50x30 T-FORD-R8134']) && !r.open && r.last === 'niimbot', r);
    await pg.evaluate((PART) => { window.__nb.length = 0; TKS_HW.labels.openPrintDialog(PART, { inStock: 7, fetchUnits: async () => [{ id: 'u1', serial: 'AAA1111' }, { id: 'u2', serial: 'BBB2222' }, { id: 'u3', serial: 'CCC3333' }] }); }, PART); await sleep(500);
    r = await dlg(); const remembered = r.prn[1] === 'Bluetooth (Niimbot)*', already = /^🖨 Print/.test(r.go);
    await pg.evaluate(() => { document.querySelector('#plChips [data-all]').click(); }); await sleep(200); await pg.evaluate(() => document.getElementById('plGo').click()); await sleep(600);
    r = await pg.evaluate(() => window.__nb);
    check('it remembers the Niimbot, stays connected (no second connect), and serialised keys print one label each', remembered && already && JSON.stringify(r) === JSON.stringify(['units 3 50x30']), { remembered, already, r });

    // ================= 3. Settings =================
    await pg.evaluate(() => TKS_HW.openSettings()); await sleep(500);
    r = await pg.evaluate(() => { const en = document.getElementById('hwNbEn'), sz = document.getElementById('hwNbSize'), c = document.querySelector('#hwNbSample canvas'); if (!en) return { none: true };
      const before = c ? c.width + 'x' + c.height : ''; sz.value = '50x50'; sz.dispatchEvent(new Event('change', { bubbles: true })); const c2 = document.querySelector('#hwNbSample canvas');
      return { en: en.checked, models: Array.from(document.getElementById('hwNbModel').options).map(o => o.value), before, after: c2 ? c2.width + 'x' + c2.height : '', saved: JSON.parse(localStorage.getItem('tks_hw_prefs')).niimbot, btn: document.getElementById('hwNbTest').innerText, h: Math.round(document.getElementById('hwNbTest').getBoundingClientRect().height) }; });
    check('Settings has a Niimbot section: on/off, model (B1), roll size with a sample that follows the size, and a test button', !r.none && r.en && r.models[0] === 'B1' && r.before === '768x480' && r.after === '768x800' && r.saved.size === '50x50' && /Connect and print a test label/.test(r.btn) && r.h >= 44, r);
    await pg.evaluate(() => document.getElementById('hwNbSample').scrollIntoView({ block: 'center' })); await sleep(200); await pg.screenshot({ path: path.join(OUT, 'niimbot-settings-phone.png') });
    check('no page errors (Android-style phone)', pg._errs.length === 0, pg._errs.slice(0, 3)); await pg.close();

    // ================= 4. only a Niimbot, on an iPhone (no Bluetooth in the browser) =================
    const ip = await newPage(); await ip.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
    await ip.evaluateOnNewDocument(() => { try { Object.defineProperty(Navigator.prototype, 'bluetooth', { get() { return undefined; }, configurable: true }); } catch (e) {} });
    await boot(ip, PHONE, { labels: { enabled: false }, niimbot: { enabled: true, model: 'B1', size: '50x30', density: 3 } });
    await ip.evaluate(() => { const n = Array.from(document.querySelectorAll('[data-go="inventory"]')).find(x => x.offsetParent) || document.querySelector('[data-go="inventory"]'); n.click(); }); await sleep(1500);
    r = await ip.evaluate(() => ({ btn: !!document.querySelector('[data-label]'), sup: TKS_NIIM.supported(), why: TKS_NIIM.whyNot() }));
    check('with only a Niimbot switched on, each key still has its 🏷 label button', r.btn, r);
    check('on an iPhone it says plainly that the browser cannot print over Bluetooth, and what to do', r.sup === false && /iPhones and iPads cannot print over Bluetooth/.test(r.why) && /picture/.test(r.why), r);
    await ip.evaluate(() => { window.__dl = []; navigator.canShare = () => true; navigator.share = d => { window.__dl.push(d.files[0].name + ' ' + d.files[0].type); return Promise.resolve(); }; const oc = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl.push(this.download); return; } return oc.call(this); }; document.querySelector('[data-label]').click(); }); await sleep(600);
    r = await ip.evaluate(() => ({ go: (document.getElementById('plGo') || {}).innerText, prn: getComputedStyle(document.getElementById('plPrnWrap')).display, note: document.getElementById('plNote').innerText }));
    check('the print box on an iPhone offers "Save the label as a picture" (no printer choice when there is only one)', /Save the label as a picture/.test(r.go || '') && r.prn === 'none' && /cannot print over Bluetooth/.test(r.note), r);
    await ip.screenshot({ path: path.join(OUT, 'niimbot-iphone-dialog.png') });
    await ip.evaluate(() => document.getElementById('plGo').click()); await sleep(900);
    r = await ip.evaluate(() => window.__dl);
    check('tapping it opens the phone\'s share sheet with the label as a PNG picture named after the part number', r.length === 1 && /^label-T-FORD-R8134\.png image\/png$/.test(r[0]), r);
    check('no page errors (iPhone)', ip._errs.length === 0, ip._errs.slice(0, 3)); await ip.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
