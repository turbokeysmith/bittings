// Browser test (demo data) of the main page after the rebuild: home screen, navigation, quote hand-off, tax flag on job parts.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');   // bittings-unified/
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const results = []; let failed = 0;
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 500) : '')); if (!ok) failed++; }
const active = pg => pg.evaluate(() => (document.querySelector('.view.active') || {}).id || null);
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    for (const cfg of [{ role: 'owner', phone: true }, { role: 'technician', phone: true }, { role: 'owner', phone: false }]) {
      const tag = cfg.role + (cfg.phone ? ' phone' : ' desktop');
      const ctx = await b.createBrowserContext(); const pg = await ctx.newPage();
      const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
      await pg.setViewport(cfg.phone ? { width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1280, height: 800 });
      await pg.goto('http://127.0.0.1:8088/START-DEMO.html', { waitUntil: 'networkidle2' }).catch(() => {});
      await sleep(1500);
      await pg.evaluate((role) => {
        localStorage.setItem('tks_demo_role', role); sessionStorage.clear();
        if (role !== 'owner') for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { try { const o = JSON.parse(localStorage[k]); o.user.email = 'tech@example.com'; localStorage[k] = JSON.stringify(o); } catch (e) {} }
      }, cfg.role);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {});
      await sleep(2500);
      const home = cfg.phone ? 'view-schedule' : 'view-payments';
      let r = { active: await active(pg), bar: await pg.evaluate(() => Array.from(document.querySelectorAll('.bt-bottomnav__item')).map(x => x.innerText.replace(/\s+/g, ' ').trim())),
        side: await pg.evaluate(() => Array.from(document.querySelectorAll('.bt-sidebar .bt-nav__item[data-go]')).filter(x => x.style.display !== 'none' && !x.classList.contains('tks-cap-hidden')).map(x => x.dataset.go)),
        sched: await pg.evaluate(() => ((document.getElementById('schBody') || {}).innerText || '').slice(0, 60)) };
      check(tag + ': opens on the home screen', r.active === home, r);
      check(tag + ': no Start a job anywhere; Quick quote in the menu', r.side.indexOf('startjob') < 0 && r.side.indexOf('quote') >= 0 && !r.bar.some(x => /Start job/.test(x)), { side: r.side, bar: r.bar });
      if (cfg.phone) { await pg.screenshot({ path: path.join(OUT, 'home-' + cfg.role + '.png') });
        check(tag + ': scheduler has drawn', !/^Loading/.test(r.sched || 'Loading') && r.sched.length > 5, r.sched);
        check(tag + ': bottom bar = Schedule, Quote, Receipts, Stock, More', JSON.stringify(r.bar) === JSON.stringify(['📅 Schedule', '💬 Quote', '🧾 Receipts', '📦 Stock', '⋯ More']), r.bar); }
      // walk every menu item that is shown
      const walk = [];
      for (const go of r.side.filter(g => g !== 'quote' && g !== 'reconcile' && g !== 'returns')) {
        if (cfg.phone && go === 'payments') continue;   // Register is desktop-only
        await pg.evaluate((go) => { const el = document.querySelector('.bt-sidebar .bt-nav__item[data-go="' + go + '"]'); el.click(); }, go); await sleep(350);
        walk.push(go + ':' + (await active(pg)));
        await pg.evaluate(() => { try { window.closeAllOverlays && closeAllOverlays(); } catch (e) {} });
      }
      check(tag + ': every menu item opens its screen', walk.every(w => { const [g, v] = w.split(':'); return v === 'view-' + g; }), walk);
      // Back button → home
      await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="customers"]').click()); await sleep(200);
      await pg.evaluate(() => document.getElementById('backBtn').click()); await sleep(500);
      check(tag + ': Back goes home', (await active(pg)) === home, await active(pg));
      // old link
      await pg.goto('http://127.0.0.1:8088/index.html?go=startjob', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1500);
      check(tag + ': an old "start job" link lands on home', (await active(pg)) === home, await active(pg));
      // refresh keeps the screen
      await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="inventory"]').click()); await sleep(300);
      await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1500);
      check(tag + ': a refresh reopens the screen you were on', (await active(pg)) === 'view-inventory', await active(pg));

      if (cfg.phone) {
        // ---- tax flag: a key pulled for a job arrives on the invoice as taxed Materials ----
        const d = await pg.evaluate(async () => {
          const part = TKS.Inventory.all()[0];
          const realDemo = TKS.isDemo;
          TKS.Jobs = Object.assign(TKS.Jobs || {}, { parts: () => Promise.resolve({ data: [{ item_id: part.id, state: 'reserved' }] }) }); TKS.isDemo = () => false;
          const draft = await jobToInvoiceDraft({ id: 'TESTJOB1', jobType: 'auto', subType: 'TEST lost key', customer: { name: 'TEST Customer', phone: '4055550100' },
            items: [{ desc: 'TEST Key cut (taxed)', qty: 1, each: 40, amount: 40, taxable: true }, { desc: 'TEST Programming labor', qty: 1, each: 80, amount: 80, taxable: false }] });
          TKS.isDemo = realDemo;
          return { part: part.name, items: draft.items };
        });
        const partLine = d.items.find(x => x.partId);
        check(tag + ': job part is handed over as taxed Materials', !!partLine && partLine.taxable === true && partLine.category === 'Materials', d.items);
        await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-item', { timeout: 5000 }).catch(() => {}); await sleep(400);
        const rows = await pg.evaluate(() => Array.from(document.querySelectorAll('.qi-item:not(.disc)')).map(x => ({ desc: x.querySelector('.qiDesc').value, tax: x.querySelector('.qiTax').checked, cat: x.querySelector('.qiCat').value })));
        check(tag + ': on the invoice the tax boxes arrive ticked (charge line + the key), labor not', rows.length === 3 && rows[0].tax === true && rows[1].tax === false && rows[2].tax === true && rows[2].cat === 'Materials', rows);
        await pg.evaluate(() => { const t = document.querySelector('#qiTot'); if (t) t.scrollIntoView({ block: 'center' }); }); await sleep(150);
        if (cfg.role === 'owner') await pg.screenshot({ path: path.join(OUT, 'tax-carried-over.png') });

        // ---- estimate → "Schedule this job" opens the job form already filled in ----
        await pg.evaluate(() => sessionStorage.setItem('tks_quote_job', JSON.stringify({ fromEstimate: 'EST-TEST-1', serviceType: 'Automotive', customer: { name: 'TEST Caller', phone: '4055550111' },
          vehicle: { year: '2015', make: 'Toyota', model: 'Camry' }, items: [{ desc: 'TEST Car key', qty: 1, each: 120, amount: 120, taxable: true }], ts: Date.now() })));
        await pg.goto('http://127.0.0.1:8088/index.html?go=schedule&newjob=quote', { waitUntil: 'networkidle2' }).catch(() => {}); await sleep(1800);
        const f = await pg.evaluate(() => { const m = document.querySelector('.sch-modal'); if (!m) return null;
          return { name: (m.querySelector('#sjName') || {}).value, phone: (m.querySelector('#sjPhone') || {}).value, year: (m.querySelector('#sjYear') || {}).value, make: (m.querySelector('#sjMake') || {}).value,
            charge: (m.querySelector('.chD') || {}).value, taxed: (m.querySelector('.chT') || {}).checked, notes: (m.querySelector('#sjINotes') || {}).value, view: (document.querySelector('.view.active') || {}).id }; });
        check(tag + ': estimate opens in the Scheduler as a filled-in new job', !!f && f.name === 'TEST Caller' && f.year === '2015' && f.make === 'Toyota' && /EST-TEST-1/.test(f.notes || '') && f.view === 'view-schedule' && f.charge === 'TEST Car key' && f.taxed === true, f);
        if (cfg.role === 'owner') await pg.screenshot({ path: path.join(OUT, 'quote-to-job.png') });
        await pg.evaluate(() => { localStorage.removeItem('tks_sj_draft'); });
      }
      check(tag + ': no page errors', errs.length === 0, errs.slice(0, 5));
      await ctx.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
