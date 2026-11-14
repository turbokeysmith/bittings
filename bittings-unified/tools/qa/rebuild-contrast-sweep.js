// Dark-mode readability sweep. Opens every screen and the main pop-ups in dark mode (demo data) and lists text whose
// colour is too close to what is behind it. Usage: node contrast.js [phone|desktop]  → prints groups, saves screenshots.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = process.env.TKS_ROOT || path.resolve(__dirname, '..', '..');   // bittings-unified/
const OUT = path.join(__dirname, 'audit', 'contrast'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const MODE = process.argv[2] || 'phone';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));

// runs in the page: every visible piece of text → contrast against the first solid background behind it
function scan(where) {
  function parse(c) { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
  function lum(c) { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); }
  function over(top, under) { const a = top.a; return { r: top.r * a + under.r * (1 - a), g: top.g * a + under.g * (1 - a), b: top.b * a + under.b * (1 - a), a: 1 }; }
  function bgOf(el) { const stack = []; let n = el, img = false;
    while (n && n.nodeType === 1) { const cs = getComputedStyle(n); const c = parse(cs.backgroundColor); if (cs.backgroundImage && cs.backgroundImage !== 'none') { img = img || /gradient|url/.test(cs.backgroundImage); if (/gradient/.test(cs.backgroundImage)) { const g = cs.backgroundImage.match(/rgba?\([^)]+\)/g); if (g && g.length) { const gc = parse(g[g.length - 1]); if (gc && gc.a > 0.5) { stack.push(gc); break; } } } }
      if (c && c.a > 0) { stack.push(c); if (c.a >= 0.99) { bgOf.last = n; break; } } n = n.parentElement; }
    let base = { r: 255, g: 255, b: 255, a: 1 }; const htmlBg = parse(getComputedStyle(document.documentElement).backgroundColor), bodyBg = parse(getComputedStyle(document.body).backgroundColor);
    if (bodyBg && bodyBg.a > 0) base = over(bodyBg, base); else if (htmlBg && htmlBg.a > 0) base = over(htmlBg, base);
    let out = base; for (let i = stack.length - 1; i >= 0; i--) out = over(stack[i], out); return out; }
  function visible(el) { const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) return false;
    let n = el; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return false; n = n.parentElement; } return true; }
  function sig(el) { const parts = []; let n = el, k = 0; while (n && n.nodeType === 1 && k < 3) { let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; else if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 2).join('.'); parts.unshift(s); n = n.parentElement; k++; } return parts.join(' > '); }
  const found = []; const seen = new Set();
  const els = Array.from(document.querySelectorAll('body *'));
  for (const el of els) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|OPTION|IFRAME|CANVAS)$/i.test(el.tagName)) continue;
    let text = ''; let isField = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    if (isField) { if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'hidden' || el.type === 'file' || el.type === 'range' || el.type === 'color') continue; text = el.tagName === 'SELECT' ? ((el.options[el.selectedIndex] || {}).text || '') : (el.value || el.placeholder || ''); if (!text) text = '(empty field)'; }
    else { for (const c of el.childNodes) if (c.nodeType === 3 && c.textContent.trim()) text += c.textContent.trim() + ' '; text = text.trim(); }
    if (!text) continue; if (!visible(el)) continue;
    if (/^[\s\u{1F000}-\u{1FFFF}\u2600-\u27BF\uFE0F•·×✕✓›‹→←+\-–—|/]+$/u.test(text)) continue;   // icons / punctuation only
    const cs = getComputedStyle(el); let fg = parse(cs.color); if (!fg) continue;
    if (isField && !el.value && el.placeholder && el.tagName !== 'SELECT') { const ps = getComputedStyle(el, '::placeholder'); const pc = parse(ps.color); if (pc) fg = pc; }
    bgOf.last = null; const bg = bgOf(el); const isl = bgOf.last; const island = isl ? (isl.tagName.toLowerCase() + (isl.id ? '#' + isl.id : '') + (isl.className && typeof isl.className === 'string' ? '.' + isl.className.trim().split(/\s+/).join('.') : '')) : '(page)';
    const colorVar = (function () { const st = el.getAttribute('style') || ''; return /color\s*:/.test(st.replace(/background[^;]*;?/g, '')) ? 'inline' : ''; })();
    const op = (function () { let o = 1, n = el; while (n && n.nodeType === 1) { o *= parseFloat(getComputedStyle(n).opacity || '1'); n = n.parentElement; } return o; })();
    const fgc = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, bg);
    const L1 = lum(fgc), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && parseInt(cs.fontWeight, 10) >= 700);
    const limit = big ? 3 : 4.5;
    if (ratio < limit) { const key = sig(el) + '|' + Math.round(fgc.r) + ',' + Math.round(fgc.g) + ',' + Math.round(fgc.b) + '|' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b);
      if (seen.has(key)) continue; seen.add(key);
      found.push({ where, sig: sig(el), text: text.slice(0, 46), ratio: Math.round(ratio * 100) / 100, fg: 'rgb(' + [fgc.r, fgc.g, fgc.b].map(Math.round).join(',') + ')', bg: 'rgb(' + [bg.r, bg.g, bg.b].map(Math.round).join(',') + ')', lightOnLight: L1 > 0.4 && L2 > 0.4, field: isField, island: island, inline: colorVar, self: el === isl, px: Math.round(parseFloat(cs.fontSize)) }); }
  }
  return found;
}

(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  const all = [];
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setViewport(MODE === 'phone' ? { width: 390, height: 800, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { width: 1366, height: 860 });
    await pg.goto('http://127.0.0.1:8088/START-DEMO.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1300);
    await pg.evaluate(() => { localStorage.setItem('tks_demo_role', 'owner'); localStorage.setItem('bt_theme', 'dark'); sessionStorage.clear(); });
    const grab = async (where, shot) => { const f = await pg.evaluate(scan, where); f.forEach(x => all.push(x)); if (shot) await pg.screenshot({ path: path.join(OUT, MODE + '-' + where.replace(/[^a-z0-9]+/gi, '_') + '.png') }); return f.length; };
    const closeAll = () => pg.evaluate(() => { try { window.closeAllOverlays && closeAllOverlays(); } catch (e) {} document.querySelectorAll('.chg-modal-ov,.sch-modal,.app-modal-ov,.clk-ov,.qi-ov,.tier-ov').forEach(x => x.remove()); });

    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(2200);
    const theme = await pg.evaluate(() => document.documentElement.getAttribute('data-bt-theme'));
    console.log('theme attribute:', theme);
    const views = await pg.evaluate(() => Array.from(document.querySelectorAll('.bt-sidebar .bt-nav__item[data-go]')).filter(x => x.style.display !== 'none' && x.dataset.go !== 'quote' && x.dataset.go !== 'estimates').map(x => x.dataset.go));
    for (const v of views) {
      if (MODE === 'phone' && v === 'payments') continue;
      await pg.evaluate((v) => document.querySelector('.bt-sidebar .bt-nav__item[data-go="' + v + '"]').click(), v); await sleep(700);
      await grab('view:' + v, true);
      // sub-tabs
      const tabs = await pg.evaluate(() => Array.from(document.querySelectorAll('.view.active [data-invtab], .view.active [data-reptab], .view.active .rc-tabs button, .view.active .seg button, .view.active .seg2 button')).map((x, i) => i).slice(0, 8));
      for (const i of tabs) { const ok = await pg.evaluate((i) => { const t = Array.from(document.querySelectorAll('.view.active [data-invtab], .view.active [data-reptab], .view.active .rc-tabs button, .view.active .seg button, .view.active .seg2 button'))[i]; if (!t || t.offsetParent === null) return false; t.click(); return true; }, i); if (!ok) continue; await sleep(450); await grab('view:' + (await pg.evaluate(() => (document.querySelector('.view.active') || {}).id || '?')) + ':tab' + i, false); }
      await closeAll();
    }
    // settings: every step in the rail
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click()); await sleep(600);
    const steps = await pg.evaluate(() => Array.from(document.querySelectorAll('#view-settings [data-step]')).map(x => x.dataset.step));
    for (const st of steps) { await pg.evaluate((st) => { const x = document.querySelector('#view-settings [data-step="' + st + '"]'); if (x) x.click(); }, st); await sleep(450); await grab('settings:' + st, true); }
    // pop-ups in the main app
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="schedule"]').click()); await sleep(700);
    await pg.evaluate(() => { const c = document.querySelector('#schBody [data-open]'); if (c) c.click(); }); await sleep(700); await grab('popup:job form', true); await closeAll();
    await pg.evaluate(() => { const n = document.querySelector('#schBody [data-new]'); if (n) n.click(); }); await sleep(600); await pg.evaluate(() => { const g = document.querySelector('#stGuided'); if (g) g.click(); }); await sleep(800); /* 8z153: chooser, then the guided wizard */ await grab('popup:new job wizard', true);
    for (let i = 0; i < 6; i++) { const moved = await pg.evaluate(() => { const n = Array.from(document.querySelectorAll('.sch-wizmodal button')).find(x => /next|continue|start/i.test(x.innerText || '') && !x.disabled); if (!n) return false; n.click(); return true; }); if (!moved) break; await sleep(400); await grab('popup:wizard step ' + (i + 2), i < 2); }
    await closeAll();
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="customers"]').click()); await sleep(500);
    await pg.evaluate(() => { const r = document.querySelector('#view-customers .crow'); if (r) r.click(); }); await sleep(600); await grab('customer form', true);
    await pg.evaluate(() => { const r = document.querySelector('#view-form [data-inv], #view-form .crow'); if (r) r.click(); }); await sleep(500); await grab('popup:invoice / job from customer', true); await closeAll();
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(600);
    await pg.evaluate(() => { const r = document.querySelector('#view-inventory .crow .nm, #view-inventory .crow'); if (r) r.click(); }); await sleep(600); await grab('part page', true);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(400);
    await pg.evaluate(() => { const r = document.querySelector('#view-inventory .moveloc'); if (r) r.click(); }); await sleep(600); await grab('popup:stock by location', true); await closeAll();
    await pg.evaluate(() => { const r = document.getElementById('invAdd'); if (r) r.click(); }); await sleep(500); await grab('new part', false);
    if (MODE !== 'phone') { await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="payments"]').click()); await sleep(600);
      for (const sel of ['#chgAddPart', '#chgAddService', '#chgAddOther', '#chgCustBtn', '#chgDiscount']) { const ok = await pg.evaluate((sel) => { const x = document.querySelector(sel); if (!x) return false; x.click(); return true; }, sel); if (ok) { await sleep(450); await grab('popup:register ' + sel, true); await closeAll(); } } }
    await pg.evaluate(() => { try { uiConfirm({ title: 'TEST question', message: 'TEST message text' }); uiPrompt && uiPrompt({ title: 'TEST prompt', message: 'TEST', placeholder: 'type here' }); } catch (e) {} }); await sleep(300); await grab('popup:confirm + prompt', true); await closeAll();
    await pg.evaluate(() => { try { TKS_ACCESS.toast('TEST toast message'); } catch (e) {} }); await sleep(200); await grab('toast', false);
    // receipts page
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 6000 }).catch(() => {}); await sleep(500);
    await grab('receipts: builder', true);
    await pg.evaluate(() => { const q = s => document.querySelector(s); q('.qiSB[data-s="Automotive"]') && q('.qiSB[data-s="Automotive"]').click(); const n = Array.from(document.querySelectorAll('.qiNB')).find(x => x.dataset.n === 'Customer D1'); if (n) n.click(); }); await sleep(400); await grab('receipts: builder automotive + NASTF', true);
    await pg.evaluate(() => { document.querySelector('#qiAddDisc') && document.querySelector('#qiAddDisc').click(); document.querySelector('#qiName').value = 'TEST Customer'; const r = document.querySelector('.qi-item'); r.querySelector('.qiDesc').value = 'TEST Key'; r.querySelector('.qiAmt').value = '50'; document.querySelector('#qiGo').click(); }); await sleep(900);
    await grab('receipts: finished document', true);
    await pg.evaluate(() => { try { openHist(); } catch (e) {} }); await sleep(500); await grab('receipts: history panel', true);
    await pg.evaluate(() => { try { closeHist(); openCustPicker(function () {}, false, null); } catch (e) {} }); await sleep(400); await grab('receipts: customer picker', true);
    await pg.evaluate(() => { try { closeCust(); appConfirm('TEST title', 'TEST body'); } catch (e) {} }); await sleep(300); await grab('receipts: confirm box', true);
    /* changed with the list merge: the old read-only list (bittings.html?receipts=1) is gone; the one list is the main app's Receipts & invoices screen */
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' }); await sleep(2500);
    await pg.evaluate(() => { const b = document.querySelector('.bt-sidebar [data-go="receipts"]'); if (b) b.click(); }); await sleep(1200); await grab('receipts & invoices: list', true);
    await pg.evaluate(() => { const v = document.querySelector('#rcList .ro-open'); if (v) v.click(); }); await sleep(500); await grab('receipts & invoices: viewer', true);
    await pg.goto('http://127.0.0.1:8088/signin.html', { waitUntil: 'domcontentloaded' }); await sleep(900); await grab('sign-in page', true);
    console.log('page errors:', errs.length, errs.slice(0, 3));
  } finally { await b.close(); srv.close(); }
  // report: group by signature + colours
  const groups = {}; all.forEach(x => { const k = x.sig + '|' + x.fg + '|' + x.bg; (groups[k] = groups[k] || { n: 0, wheres: new Set(), x }).n++; groups[k].wheres.add(x.where); });
  const list = Object.values(groups).sort((a, b2) => (b2.x.lightOnLight - a.x.lightOnLight) || (a.x.ratio - b2.x.ratio));
  fs.writeFileSync(path.join(OUT, MODE + '-report.json'), JSON.stringify(list.map(g => Object.assign({}, g.x, { n: g.n, wheres: Array.from(g.wheres) })), null, 1));
  console.log('low-contrast groups:', list.length, ' light-on-light:', list.filter(g => g.x.lightOnLight).length);
  list.slice(0, 70).forEach(g => console.log((g.x.lightOnLight ? 'LL ' : '   ') + String(g.x.ratio).padEnd(5) + g.x.fg.padEnd(18) + ' on ' + g.x.bg.padEnd(18) + (g.x.field ? ' [field] ' : ' ') + g.x.sig.slice(-70).padEnd(70) + ' "' + g.x.text.slice(0, 26) + '"  @' + Array.from(g.wheres).slice(0, 2).join('; ')));
})().catch(e => { console.error('FAIL', e); process.exit(1); });
