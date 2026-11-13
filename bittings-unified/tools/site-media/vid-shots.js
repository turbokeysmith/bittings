// Story frames for the two website videos ("a job from the first call to checkout"): the REAL app on the stand-in cloud,
// mock business "Ironwood Lock & Key", made-up staff / customers / numbers. usage: node vid-shots.js [pc|phone] → ./vid/
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = 'D:/Work/Code/tk-phase3/bittings-unified', OUT = path.join(__dirname, 'vid'); fs.mkdirSync(OUT, { recursive: true });
const MOCK = 'Ironwood Lock & Key';
const FAKE = fs.readFileSync(path.join(ROOT, 'tools/qa/rebuild-fake-cloud.js'), 'utf8').replace("email:'samer@turbokeysmith.com'", "email:'alex@example.com'").replace("name:'TEST Owner'", "name:'Alex'");
const FS = fs.readFileSync(path.join(__dirname, 'feat-shots.js'), 'utf8');
const SEED = FS.slice(FS.indexOf('function seed()'), FS.indexOf('// ---------- server stand-ins')).split("'Your Shop'").join(JSON.stringify(MOCK)).split('you@yourshop.com').join('alex@example.com');
const STUBS = FS.slice(FS.indexOf('function stubs()'), FS.indexOf('const hideLogo'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); }
  if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('<!doctype html>seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ONLY = process.argv[2] || '';
const hideLogo = () => { document.querySelectorAll('img').forEach(i => { if (/tks_logo|tks_mark|^data:image/.test(i.getAttribute('src') || '')) i.style.display = 'none'; }); };

(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); pg.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 160)));
    pg.on('dialog', d => d.dismiss().catch(() => {}));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:|^data:/.test(u) || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net\/npm\/chart\.js/.test(u)) rq.continue(); else rq.abort(); });
    const DEV = { pc: { width: 1440, height: 900, deviceScaleFactor: 1.5, theme: 'dark' }, phone: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true, theme: 'dark' } };
    let dev = 'pc';
    const shot = async name => { await pg.evaluate(hideLogo); await pg.screenshot({ path: path.join(OUT, dev + '-' + name + '.png') }); console.log(' ', dev + '-' + name); };
    const load = async (file) => { const vp = DEV[dev]; await pg.setViewport(vp); await pg.goto('http://127.0.0.1:8088/seed.html'); await pg.evaluate('(' + SEED + ')()'); await pg.evaluate(t => localStorage.setItem('bt_theme', t), vp.theme);
      await pg.goto('http://127.0.0.1:8088/' + file, { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3000);
      if (file === 'index.html') await pg.waitForFunction(() => window.TKPay, { timeout: 15000 }).catch(() => {}); await pg.evaluate('(' + STUBS + ')()'); await pg.evaluate(hideLogo); };
    const view = async (v, wait) => { await pg.evaluate(v => { const n = Array.from(document.querySelectorAll('[data-go="' + v + '"]')).find(x => x.offsetParent) || document.querySelector('[data-go="' + v + '"]'); if (n) n.click(); else if (typeof show === 'function') show(v); }, v); await sleep(wait || 1600); await pg.evaluate(() => window.scrollTo(0, 0)); await sleep(200); };
    const into = (sel, block) => pg.evaluate((sel, block) => { const e = document.querySelector(sel); if (e) e.scrollIntoView({ block: block || 'start' }); return !!e; }, sel, block);
    const setv = (sel, v) => pg.evaluate((sel, v) => { const e = document.querySelector(sel); if (!e) return false; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return true; }, sel, v);
    const lastLine = (desc, amt) => pg.evaluate((desc, amt) => { const rows = document.querySelectorAll('.qi-item'); const r = rows[rows.length - 1]; const d = r.querySelector('.qiDesc'), a = r.querySelector('.qiAmt');
      d.value = desc; d.dispatchEvent(new Event('input', { bubbles: true })); d.dispatchEvent(new Event('change', { bubbles: true })); a.value = amt; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); }, desc, amt);
    const addItem = () => pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /^\+\s*Add item$/.test(x.innerText.trim())); if (b) b.click(); return !!b; });
    const addKey = () => pg.evaluate(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /^\+\s*Add$/.test(x.innerText.trim())); if (b) b.click(); return !!b; });
    const closeSug = () => pg.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.body.click(); });

    // ======================= PC at the counter =======================
    if (!ONLY || ONLY === 'pc') { dev = 'pc';
      await load('bittings.html?quote=1'); await load('bittings.html?quote=1'); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(1200);
      await pg.evaluate(() => { const nav = document.getElementById('appnav'); if (nav) nav.style.display = 'none'; });
      await setv('#qiName', 'Dana Whitfield'); await setv('#qiPhone', '405-555-0187'); await sleep(300);
      await pg.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await shot('01-call');
      await setv('#qiVYear', '2018'); await setv('#qiVMake', 'Ford'); await setv('#qiVModel', 'F-150'); await sleep(1300);
      await pg.evaluate(() => { const lab = Array.from(document.querySelectorAll('.qi-l')).find(x => /^Vehicle/.test(x.innerText)); (lab || document.body).scrollIntoView({ block: 'start' }); }); await sleep(400); await shot('02-keys');
      await addKey(); await sleep(600); await addItem(); await sleep(300); await lastLine('Smart / proximity key programming', '125'); await closeSug(); await sleep(500);
      await into('.qi-item', 'start'); await pg.evaluate(() => window.scrollBy(0, -60)); await sleep(400); await shot('03-quote');
      await pg.evaluate(() => { const t = document.querySelector('#qiTotals, .qi-totals, .qi-tot'); if (t) t.scrollIntoView({ block: 'center' }); }); await sleep(300); await shot('03b-total');
      await load('index.html'); await view('schedule'); await pg.evaluate(() => { const w = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /^Week$/.test(x.innerText.trim())); if (w) w.click(); }); await sleep(900); await shot('04-schedule');
      await view('payments'); await pg.evaluate(() => { try { chgShowForm(); } catch (e) {} _chgUnlocked = true;
        posAddLine({ type: 'custom', desc: 'Ford F-150 2015-2020 5-Button Smart Key', unitCents: 16500, taxable: true, lineType: 'part' }); posAddLine({ type: 'custom', desc: 'Smart / proximity key programming', unitCents: 12500, taxable: false, lineType: 'service' }); posAddLine({ type: 'custom', desc: 'Leather Key Fob Cover', unitCents: 1500, taxable: true, lineType: 'part' });
        TKS.POS.checkout = () => Promise.resolve({ data: 'IW-2026-1113A' }); TKS.POS.decrementStock = () => Promise.resolve({}); TKPay.recordCashCheck = (stub, method, o) => { o.onDone({ captured_cents: Math.round(stub.totals.total * 100) }); return Promise.resolve(); }; });
      await sleep(600); await into('.pos-grid', 'start'); await pg.evaluate(() => window.scrollBy(0, -110)); await sleep(300); await shot('05-register');
      await pg.evaluate(() => posCheckoutThen('cash')); await sleep(500); await pg.evaluate(() => { const qs = document.querySelectorAll('.chg-modal-ov [data-q]'); qs[qs.length - 1].click(); }); await sleep(400); await shot('06-cash');
      await pg.evaluate(() => document.querySelector('.chg-modal-ov [data-yes]').click()); await sleep(1200); await into('#chgStatus', 'center'); await sleep(300); await shot('07-done');
      await view('reports', 800); await pg.evaluate(() => { const s = document.getElementById('repPeriod'); s.value = 'month'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(4000);
      await into('#repPeriod', 'start'); await pg.evaluate(() => window.scrollBy(0, -20)); await sleep(500); await shot('08-reports');
    }
    // ======================= Mobile tech on the phone =======================
    if (!ONLY || ONLY === 'phone') { dev = 'phone';
      await load('index.html'); await load('index.html'); await view('schedule'); await sleep(400); await shot('01-day');
      await load('bittings.html?quote=1'); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(1200);
      await pg.evaluate(() => { const b = document.querySelector('#qiType [data-t="invoice"]'); if (b) b.click(); }); await sleep(400);
      await setv('#qiName', 'Riley Auto Sales'); await setv('#qiPhone', '405-555-0123'); await sleep(200);
      await setv('#qiVYear', '2019'); await setv('#qiVMake', 'Honda'); await setv('#qiVModel', 'Civic'); await sleep(1300);
      await pg.evaluate(() => { const lab = Array.from(document.querySelectorAll('.qi-l')).find(x => /^Vehicle/.test(x.innerText)); (lab || document.body).scrollIntoView({ block: 'start' }); }); await sleep(400); await shot('02-keys');
      await addKey(); await sleep(600); await addItem(); await sleep(300); await lastLine('Smart / proximity key programming', '125'); await closeSug(); await sleep(300);
      await addItem(); await sleep(300); await lastLine('Service call', '75'); await closeSug(); await sleep(500);
      await into('.qi-item', 'start'); await sleep(400); await shot('03-lines');
      await pg.evaluate(() => { const t = document.querySelector('#qiTotals, .qi-totals, .qi-tot'); if (t) t.scrollIntoView({ block: 'center' }); }); await sleep(300); await shot('03b-total');
      await pg.evaluate(() => { const w = document.getElementById('qiNastfWrap'); if (w) w.style.display = ''; const btn = document.querySelector('#qiNastf [data-n="Customer D1"]'); if (btn) btn.click(); }); await sleep(800);
      await pg.evaluate(() => { const f = document.getElementById('qiNastfFields'); if (!f) return; const pick = (sel, v) => { const e = f.querySelector(sel); if (!e) return; if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); e.dispatchEvent(new Event('input', { bubbles: true })); };
        pick('.rd1-color', 'Silver'); pick('.rd1-miles', '41870'); pick('.rd1-tag', 'JRT-306'); }); await sleep(300);
      await into('#qiNastfWrap', 'start'); await sleep(400); await shot('04-d1');
      // create the invoice → the finished screen (pay link / take payment / receipt / D1 photos)
      await pg.evaluate(() => { const g = document.getElementById('qiGo'); g.scrollIntoView({ block: 'center' }); g.click(); }); await sleep(2500);
      console.log('after create:', (await pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300))));
      console.log('buttons:', await pg.evaluate(() => Array.from(document.querySelectorAll('button')).filter(x => x.offsetParent).map(x => x.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).join(' | ').slice(0, 900)));
      await pg.evaluate(() => window.scrollTo(0, 0)); await sleep(300); await shot('05-created');
      await pg.evaluate(() => { const bx = document.querySelector('.d1-docs'); if (bx) bx.scrollIntoView({ block: 'start' }); }); await sleep(400); await shot('06-photos');
      await pg.evaluate(() => { const p = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /Pay Now/.test(x.innerText)); if (p) p.scrollIntoView({ block: 'center' }); }); await sleep(400); await shot('07-paynow');
      await pg.evaluate(() => { const p = Array.from(document.querySelectorAll('button')).find(x => x.offsetParent && /Pay Now/.test(x.innerText)); if (p) p.click(); }); await sleep(2500); await shot('08-paysheet');
      console.log('paysheet:', await pg.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(-500)));
    }
    console.log(fs.readdirSync(OUT).join(', '));
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
