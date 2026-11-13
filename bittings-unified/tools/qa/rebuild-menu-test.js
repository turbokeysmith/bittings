// Check the menu fixes on a phone (portrait + landscape) and a PC: Settings is reachable, groups show, Salary screen has no Reports tabs.
const fs = require('fs'), path = require('path'), http = require('http'); const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), FAKE = fs.readFileSync(ROOT + '/tools/qa/rebuild-fake-cloud.js', 'utf8'), PORT = 8091, S = path.join(__dirname, 'audit');
const M = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/app/vendor/supabase-js-2.119.0.js') { s.writeHead(200, { 'content-type': 'text/javascript' }); return s.end(FAKE); } if (p === '/seed.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end('seed'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': M[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms)); let failed = 0; const check = (n, ok, d) => { console.log((ok ? 'PASS ' : 'FAIL ') + n + (ok ? '' : '  → ' + JSON.stringify(d).slice(0, 500))); if (!ok) failed++; };
(async () => { await new Promise(r => srv.listen(PORT, '127.0.0.1', r)); const b = await puppeteer.launch({ headless: 'new' });
  try { const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.setRequestInterception(true); pg.on('request', rq => new RegExp('127\\.0\\.0\\.1:' + PORT + '|^data:|^blob:').test(rq.url()) ? rq.continue() : rq.abort());
    const boot = async (vp, role) => { await pg.setViewport(vp); await pg.goto('http://127.0.0.1:' + PORT + '/seed.html');
      await pg.evaluate((role) => { const iso = new Date().toISOString(); localStorage.clear(); localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.5, updated_at: iso, data: { taxRate: 8.5, identity: { name: 'TEST Shop' }, setup: { completed: true } } }] })); localStorage.setItem('__role', role);
        localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: '11111111-2222-4333-8444-555555555555', email: 't@example.com' } })); }, role);
      await pg.goto('http://127.0.0.1:' + PORT + '/index.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2800); };
    const menuState = () => pg.evaluate(async () => { const sb = document.querySelector('.bt-sidebar'), st = document.getElementById('sideSettings'), bn = document.querySelector('.bt-bottomnav'); const bnTop = bn && getComputedStyle(bn).display !== 'none' ? bn.getBoundingClientRect().top : innerHeight;
      sb.scrollTop = 0; await new Promise(z => setTimeout(z, 100)); const first = Array.from(sb.querySelectorAll('.bt-nav__item')).find(x => x.offsetParent); const fr = first.getBoundingClientRect();
      sb.scrollTop = sb.scrollHeight; await new Promise(z => setTimeout(z, 150)); const r = st.getBoundingClientRect();
      const heads = Array.from(sb.querySelectorAll('.bt-navgrp')).filter(h => getComputedStyle(h).display !== 'none').map(h => h.innerText.trim());
      return { scrolls: sb.scrollHeight > sb.clientHeight + 2, firstVisibleAtTop: fr.top >= 0 && fr.bottom <= innerHeight, settingsShown: getComputedStyle(st).display !== 'none', settingsReachable: r.height >= 40 && r.top >= 0 && r.bottom <= bnTop + 1, bottom: Math.round(r.bottom), bnTop: Math.round(bnTop), heads }; });
    // phone portrait, owner
    await boot({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'owner');
    await pg.evaluate(() => document.getElementById('btMore').click()); await sleep(500);
    let r = await menuState(); check('phone portrait: the menu scrolls and Settings can be reached above the bottom bar', r.scrolls && r.settingsShown && r.settingsReachable, r);
    check('phone: the menu is grouped — Daily work, Keys & stock, Team & pay, Owner', r.heads.join('|') === 'DAILY WORK|KEYS & STOCK|TEAM & PAY|OWNER' || r.heads.join('|').toLowerCase() === 'daily work|keys & stock|team & pay|owner', r.heads);
    await pg.screenshot({ path: path.join(S, 'menu-phone-bottom.png') }); await pg.evaluate(() => { document.querySelector('.bt-sidebar').scrollTop = 0; }); await sleep(200); await pg.screenshot({ path: path.join(S, 'menu-phone-top.png') });
    // Salary / Commission
    await pg.evaluate(() => { document.querySelector('.bt-sidebar [data-go="commission"]').click(); }); await sleep(1500);
    r = await pg.evaluate(() => { const v = document.getElementById('view-commission'); return { active: v.classList.contains('active'), tabs: v.querySelectorAll('[data-reptab]').length, h1: (v.querySelector('h1') || {}).innerText, repTabs: Array.from(document.querySelectorAll('#view-reports [data-reptab]')).map(x => x.innerText.trim()) }; });
    check('Salary / Commission opens as its own screen with no Sales / Inventory / Returns tabs on top', r.active && r.tabs === 0 && /Salary/.test(r.h1 || ''), r);
    check('Reports keeps Sales, Inventory and Returns (no Salary tab)', r.repTabs.length === 3 && !r.repTabs.some(t => /Salary/.test(t)), r.repTabs);
    await pg.evaluate(() => { const sb = document.querySelector('.bt-sidebar'); if (sb.classList.contains('is-open')) document.getElementById('btScrim').click(); window.scrollTo(0, 0); }); await sleep(300); await pg.screenshot({ path: path.join(S, 'menu-salary-phone.png') });
    // phone landscape (wide enough for the side menu, very short)
    await boot({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'owner');
    r = await menuState(); check('phone sideways: the side menu scrolls from the first item down to Settings', r.scrolls && r.firstVisibleAtTop && r.settingsReachable, r);
    // technician: no empty "Owner" heading, no Settings
    await boot({ width: 390, height: 700, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, 'technician'); await pg.evaluate(() => document.getElementById('btMore').click()); await sleep(500);
    r = await menuState(); check('technician: no "Owner" heading and no Settings', !r.heads.some(h => /owner/i.test(h)) && !r.settingsShown, r);
    // PC: footer at the bottom, nothing cut
    await boot({ width: 1366, height: 768 }, 'owner'); r = await menuState(); check('PC: Settings is reachable in the side menu', r.settingsReachable, r);
    await pg.evaluate(() => { document.querySelector('.bt-sidebar').scrollTop = 0; }); await sleep(200); await pg.screenshot({ path: path.join(S, 'menu-pc.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 3));
  } finally { await b.close(); srv.close(); }
  console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); })().catch(e => { console.error('FAIL', e); process.exit(1); });
