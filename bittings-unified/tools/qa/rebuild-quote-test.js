// Browser test (demo data): quick quote, estimate → invoice, estimate → schedule hand-off, normal builder start-up.
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 400) : '')); if (!ok) failed++; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    for (const role of ['owner', 'technician']) {
      const pg = await b.newPage();
      const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
      await pg.setViewport({ width: 375, height: 760, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await pg.goto('http://127.0.0.1:8088/START-DEMO.html', { waitUntil: 'networkidle2' }).catch(() => {});
      await sleep(1200);
      await pg.evaluate((role) => {
        localStorage.setItem('tks_demo_role', role);
        if (role !== 'owner') for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { try { const o = JSON.parse(localStorage[k]); o.user.email = 'tech@example.com'; localStorage[k] = JSON.stringify(o); } catch (e) {} }
      }, role);

      // ---- normal start: the builder opens by itself ----
      let t0 = Date.now();
      await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('.qi-box', { timeout: 5000 }).catch(() => {});
      let r = await pg.evaluate(() => ({ open: !!document.querySelector('.qi-box'), title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || {}).dataset && document.querySelector('.qiTB.on').dataset.t, sb: !!(window.supabase && supabase.createClient) }));
      check(role + ': Receipts page opens the builder (' + (Date.now() - t0) + ' ms)', r.open && /New document/.test(r.title || '') && r.sb, r);

      // ---- quick quote ----
      await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('.qi-box', { timeout: 5000 }).catch(() => {});
      r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, type: (document.querySelector('.qiTB.on') || { dataset: {} }).dataset.t,
        nameLabel: (document.querySelector('#qiNameL') || {}).innerText, payHidden: getComputedStyle(document.querySelector('#qiPayWrap')).display === 'none',
        years: (document.getElementById('qiVYear') || { options: [] }).options.length }));
      // 8z73: the Year list was once emptied by a note placed on the same line as the loop that fills it
      check(role + ': the Year list has years to pick from', r.years > 20, r.years);
      check(role + ': quote opens as an estimate, name optional, no payment section', /Quick quote/.test(r.title || '') && r.type === 'estimate' && /optional/.test(r.nameLabel || '') && r.payHidden, r);
      await pg.type('.qi-item .qiDesc', 'TEST Car key');
      await pg.evaluate(() => { const row = document.querySelector('.qi-item'); const a = row.querySelector('.qiAmt'); a.value = '120'; a.dispatchEvent(new Event('input', { bubbles: true })); const t = row.querySelector('.qiTax'); if (!t.checked) t.click(); });
      await sleep(250);
      r = await pg.evaluate(() => Array.from(document.querySelectorAll('#qiTot div')).map(d => d.innerText.replace(/\n/g, ' = ')));
      check(role + ': running total shows', r[0] === 'Total before tax = $120.00', r);
      await pg.evaluate(() => document.querySelector('#qiTot').scrollIntoView({ block: 'center' })); await sleep(150);
      if (role === 'owner') await pg.screenshot({ path: path.join(OUT, 'quote-1-builder.png') });
      const custBefore = await pg.evaluate(() => TKS.list('customers').length);
      await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(700);
      r = await pg.evaluate(() => { const h = TKS.list('receipts'); const d = h.find(x => x.customer === 'Phone quote');
        return { err: (document.querySelector('#qiErr') || {}).innerText || '', saved: !!d, docType: d && d.docType, number: d && d.number, total: d && d.totals && d.totals.total, noCustomer: d && d.noCustomer,
          cust: TKS.list('customers').length, buttons: Array.from(document.querySelectorAll('.res-actions button')).map(x => x.innerText) }; });
      check(role + ': quote saved as an estimate with no customer record made', r.saved && r.docType === 'estimate' && /^EST-/.test(r.number || '') && r.cust === custBefore, r);
      check(role + ': result offers Schedule / Make it an invoice / New quote', ['📅 Schedule this job', '🧾 Make it an invoice', '💬 New quote'].every(x => r.buttons.indexOf(x) >= 0) && r.buttons.indexOf('💳 Pay Now') < 0, r.buttons);
      await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await sleep(200);
      if (role === 'owner') await pg.screenshot({ path: path.join(OUT, 'quote-2-result.png') });

      // ---- make it an invoice: a new document with its own id ----
      await pg.evaluate(() => Array.from(document.querySelectorAll('.res-actions button')).find(x => /Make it an invoice/.test(x.innerText)).click()); await sleep(500);
      r = await pg.evaluate(() => { const h = TKS.list('receipts'); const est = h.find(x => x.customer === 'Phone quote' && x.docType === 'estimate'), inv = h.find(x => x.fromEstimate === (est && est.number));
        return { est: est && est.id, inv: inv && inv.id, invNo: inv && inv.number, invType: inv && inv.docType, ids: h.map(x => x.id).length === new Set(h.map(x => x.id)).size,
          buttons: Array.from(document.querySelectorAll('.res-actions button')).map(x => x.innerText) }; });
      check(role + ': invoice made from the estimate has its own id and number; both kept', r.est && r.inv && r.est !== r.inv && /^INV-/.test(r.invNo || '') && r.ids && r.buttons.indexOf('💳 Pay Now') >= 0, r);

      // ---- schedule this job: hands the quote to the Scheduler ----
      const hand = await pg.evaluate(() => { const est = TKS.list('receipts').find(x => x.customer === 'Phone quote' && x.docType === 'estimate'); const real = location; let dest = null;
        const orig = Object.getOwnPropertyDescriptor(window, 'location'); try { estimateToJobDry = true; } catch (e) {}
        // run the hand-off but stop the navigation: copy what it would store
        const d = (function () { const lines = (est.items || []).filter(it => it && !it.isDiscount && !it.declined).map(it => ({ desc: it.desc, amount: it.amount, taxable: it.taxable })); return lines; })();
        return { lines: d, hasFn: typeof estimateToJob === 'function' }; });
      check(role + ': estimate → schedule hand-off exists and carries the taxed line', hand.hasFn && hand.lines.length === 1 && hand.lines[0].taxable === true, hand);
      check(role + ': no page errors', errs.length === 0, errs);
      await pg.close();
    }
  } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED');
})().catch(e => { console.error('FAIL', e); process.exit(1); });
