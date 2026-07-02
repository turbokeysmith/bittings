// Recon: seed demo, load app, dump auth state + nav + views + theme mechanism + console.
const puppeteer = require('puppeteer');
const BASE = 'http://127.0.0.1:8088';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const logs = [];
  page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));

  // 1) seed the demo (writes localStorage, then redirects to index.html)
  await page.goto(BASE + '/START-DEMO.html', { waitUntil: 'load' });
  // wait for the redirect into index.html
  await page.waitForFunction(() => location.pathname.endsWith('/index.html') || location.pathname === '/index.html', { timeout: 15000 }).catch(()=>{});
  await new Promise(r => setTimeout(r, 1500));

  const probe = await page.evaluate(() => {
    const out = {};
    const a = window.TKS && window.TKS.auth;
    out.hasTKS = !!window.TKS;
    if (a) {
      const caps = ['hardDelete','softDelete','refundVoid','inventoryWrite','editPricing','manageStaff','setup','viewAudit','editReference','jobStatus','invMove','invReceive','takePayment','keycodes','vendorTools'];
      out.auth = {
        isSignedIn: a.isSignedIn && a.isSignedIn(),
        email: a.email && a.email(),
        isOwner: a.isOwner && a.isOwner(),
        staffRole: a.staffRole && a.staffRole(),
        roleLabel: a.roleLabel && a.roleLabel(),
        can: Object.fromEntries(caps.map(c => [c, a.can ? a.can(c) : null]))
      };
    }
    // views
    out.views = [...document.querySelectorAll('.view[id^="view-"]')].map(v => ({ id: v.id, active: v.classList.contains('active') }));
    // theme: documentElement/body attrs + classes
    out.root = { htmlClass: document.documentElement.className, htmlData: document.documentElement.getAttribute('data-theme'), bodyClass: document.body.className, btTheme: localStorage.getItem('bt_theme') };
    // nav: find clickable elements that look like nav (data-go/data-view/onclick referencing view)
    const navCandidates = [...document.querySelectorAll('[data-go],[data-view],[data-nav],nav a,nav button,.nav a,.nav button,aside a,aside button,[role="navigation"] a,[role="navigation"] button')];
    out.nav = navCandidates.slice(0, 60).map(el => ({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent||'').trim().slice(0, 30),
      dataGo: el.getAttribute('data-go'), dataView: el.getAttribute('data-view'),
      id: el.id || null, cls: el.className || null, hidden: el.offsetParent === null
    }));
    // any global nav function names
    out.globals = Object.keys(window).filter(k => /nav|view|route|go|show/i.test(k)).slice(0, 30);
    return out;
  });

  console.log(JSON.stringify({ probe, console: logs.slice(-40) }, null, 2));
  await browser.close();
})().catch(e => { console.error('RECON FAILED:', e.message); process.exit(1); });
