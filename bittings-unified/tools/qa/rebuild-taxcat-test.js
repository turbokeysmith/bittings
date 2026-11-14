// Browser test of 8z95: Reports → "Sales tax worksheet" — sales by category (Keys, Accessories, Services…), each split
// into taxable / not taxed, the figures for the return, and the file with every line.
// Real page, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555';
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
// five TEST payments: key + programming · accessory + loose part · an exempt (resale) sale · one with no item list · one with a discount
function stubSales() { const now = new Date().toISOString();
  const rows = [
    { id: 'p1', invoice_id: 'r1', method: 'cash', status: 'completed', base_cents: 26294, tax_cents: 1294, cost_cents: 3000, created_at: now, description: 'TEST key + programming' },
    { id: 'p2', invoice_id: 'r2', method: 'reader', status: 'completed', base_cents: 3259, tax_cents: 259, cost_cents: 500, created_at: now, description: 'TEST accessory' },
    { id: 'p3', invoice_id: 'r3', method: 'check', status: 'completed', base_cents: 25000, tax_cents: 0, cost_cents: 3000, created_at: now, description: 'TEST exempt dealer' },
    { id: 'p4', invoice_id: 'none', method: 'cash', status: 'completed', base_cents: 10863, tax_cents: 863, cost_cents: 0, created_at: now, description: 'TEST no item list' },
    { id: 'p5', invoice_id: 'r5', method: 'cash', status: 'completed', base_cents: 9776, tax_cents: 776, cost_cents: 2000, created_at: now, description: 'TEST discounted key' },
    { id: 'p6', invoice_id: 'r1', method: 'cash', status: 'refunded', base_cents: 5000, tax_cents: 400, cost_cents: 0, created_at: now, description: 'TEST refunded — must not count' }];
  TKPay.dayTransactions = async function () { return { rows: rows }; }; }
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    const PC = { width: 1280, height: 900, deviceScaleFactor: 1 }, PHONE = { width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
    await pg.setViewport(PC);
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => { const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const inventory = [{ id: 'k1', shop_id: 's', name: 'TEST smart key', sku: 'T-K1', category: 'Keys/Smart Key', qty: 3, cost: 30, sell_price_cents: 15000, deleted_at: null, updated_at: iso },
                         { id: 'a1', shop_id: 's', name: 'TEST key ring', sku: 'T-A1', category: 'Accessories/Key Rings & Clips', qty: 9, cost: 2, sell_price_cents: 1000, deleted_at: null, updated_at: iso }];
      const I = (desc, amount, taxable, extra) => Object.assign({ desc, qty: 1, amount, taxable, cost: 0, unitCost: 0 }, extra || {});
      const receipts = [   // the app reads these through receipts_safe

        { id: 'r1', data: { id: 'r1', number: 'TKS-TEST-1', customer: 'TEST Walk-in', items: [I('TEST smart key', 150, true, { category: 'Materials', partId: 'k1', sku: 'T-K1' }), I('TEST programming', 100, false, { category: 'Labor' })] } },
        { id: 'r2', data: { id: 'r2', number: 'TKS-TEST-2', customer: 'TEST Casey', items: [I('TEST key ring', 10, true, { category: 'Materials', partId: 'a1' }), I('TEST loose battery', 20, true, { category: 'Materials' })] } },
        { id: 'r3', data: { id: 'r3', number: 'TKS-TEST-3', customer: 'TEST Dealer Motors', taxExempt: { kind: 'resale', permit_number: '123456', holder_name: 'TEST Dealer Motors' }, items: [I('TEST smart key', 200, true, { category: 'Materials', partId: 'k1' }), I('TEST programming', 50, false, { lineType: 'programming' })] } },
        { id: 'r7', data: { id: 'r7', number: 'TKS-TEST-7', customer: 'TEST Lockout', items: [I('TEST car lockout', 75, true, { category: 'Labor' })] } },   // a service line wrongly marked taxable
        { id: 'r5', data: { id: 'r5', number: 'TKS-TEST-5', customer: 'TEST Riley', items: [I('TEST smart key', 100, true, { category: 'Materials', sku: 't-k1' }), Object.assign(I('Discount', -10, false), { isDiscount: true })] } }];
      receipts.forEach(x => { x.shop_id = 's'; x.deleted_at = null; x.updated_at = iso; x.number = x.data.number; x.customer_name = x.data.customer; });
      localStorage.setItem('__db', JSON.stringify({ receipts, inventory, customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop' } } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_form_sections', 'open');   /* 8z158: the form's sections all open, so this test still checks the fields themselves */ localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(stubSales);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="reports"]').click()); await sleep(2500);
    let r = await pg.evaluate(() => { const bx = document.getElementById('repTaxBox'); if (!bx) return { none: true, brk: (document.getElementById('repBreak') || {}).innerText };
      const rows = {}; bx.querySelectorAll('.repCatRow').forEach(x => { const c = Array.from(x.children).map(y => y.innerText.trim()); rows[c[0]] = c.slice(1).join(' | '); });
      return { rows, order: Object.keys(rows), total: Array.from(document.getElementById('repCatTotal').children).map(y => y.innerText.trim()).join(' | '), text: bx.innerText.replace(/\s+/g, ' '), diff: !!document.getElementById('repTaxDiff'), btn: !!document.getElementById('repTaxCsv') }; });
    check('Reports shows a "Sales tax worksheet" for the period', !r.none && /Sales tax worksheet/.test(r.text) && /5 payments/.test(r.text) && /your rate 8\.625%/.test(r.text), r.none ? r : r.text.slice(0, 200));
    check('Keys: $440.00 sold — $240.00 taxable, $200.00 not taxed (the dealer\'s exempt key); the discount came off the key', !r.none && r.rows['Keys'] === '$440.00 | $240.00 | $200.00', r.rows);
    check('Accessories and loose parts are their own lines, both taxable', !r.none && r.rows['Accessories'] === '$10.00 | $10.00 | $0.00' && r.rows['Other parts / materials'] === '$20.00 | $20.00 | $0.00', r.rows);
    check('Services / labor: $150.00, none of it taxable (labor and programming together)', !r.none && r.rows['Services / labor'] === '$150.00 | $0.00 | $150.00', r.rows);
    check('a sale with no item list is shown as "Not itemized" and counted as taxable because tax was collected on it', !r.none && r.rows['Not itemized'] === '$100.00 | $100.00 | $0.00', r.rows);
    check('parts first, then services, then not itemized; the total line adds up; the refunded payment is not counted', !r.none && r.order.join() === 'Keys,Other parts / materials,Accessories,Services / labor,Not itemized' && r.total === 'Total | $720.00 | $370.00 | $350.00', { order: r.order, total: r.total });
    check('the figures for the return: total $720.00 − not taxable $150.00 − exempt $200.00 = taxable $370.00; tax collected $31.92',
      !r.none && /Total sales \(before tax\) \$720\.00/.test(r.text) && /Not taxable \(services \/ labor\) \$150\.00/.test(r.text) && /Tax-exempt sales \(certificate on file\) \$200\.00/.test(r.text) && /Taxable sales \$370\.00/.test(r.text) && /Sales tax collected \$31\.92/.test(r.text), r.text);
    check('the check line agrees (370 × 8.625% = $31.91) so there is no warning', !r.none && /Check: taxable sales × 8\.625% \$31\.91/.test(r.text) && !r.diff, { diff: r.diff });
    await pg.evaluate(() => document.getElementById('repTaxBox').scrollIntoView({ block: 'start' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'taxcat-pc.png') });

    r = await pg.evaluate(async () => { URL.createObjectURL = function (bl) { window.__blob = bl; return 'data:text/plain,x'; }; document.getElementById('repTaxCsv').click(); await new Promise(z => setTimeout(z, 200)); return window.__blob ? await window.__blob.text() : ''; });
    check('the file has the category table with sub-categories', /Keys,Smart Key,440\.00,240\.00,0\.00,200\.00/.test(r) && /Accessories,Key Rings & Clips,10\.00,10\.00,0\.00,0\.00/.test(r) && /Services \/ labor,Programming,50\.00,0\.00,50\.00,0\.00/.test(r) && /TOTAL,,720\.00,370\.00,150\.00,200\.00/.test(r), r.slice(0, 700));
    check('the file lists every line with its receipt, customer and tax treatment (the exempt one names the certificate)',
      /TKS-TEST-1,TEST Walk-in,TEST smart key,Keys,Smart Key,150\.00,Taxable/.test(r) && /TKS-TEST-3,TEST Dealer Motors,TEST smart key,Keys,Smart Key,200\.00,Tax-exempt \(certificate\),Resale/.test(r) && /TKS-TEST-5,TEST Riley,TEST smart key,Keys,Smart Key,90\.00,Taxable/.test(r) && (r.match(/\r\n/g) || []).length > 20, r.slice(-900));

    // a sale taxed at the wrong rate → the warning
    await pg.evaluate(() => { const now = new Date().toISOString(); TKPay.dayTransactions = async function () { return { rows: [{ id: 'q1', invoice_id: 'r1', method: 'cash', status: 'completed', base_cents: 25500, tax_cents: 500, cost_cents: 0, created_at: now, description: 'TEST under-taxed' }] }; }; renderReports(); }); await sleep(2000);
    r = await pg.evaluate(() => ({ diff: (document.getElementById('repTaxDiff') || {}).innerText || '', text: document.getElementById('repTaxBox').innerText.replace(/\s+/g, ' ') }));
    check('when the tax collected does not match the rate it says by how much', /Collected is \$7\.94 less than 8\.625% of the taxable sales/.test(r.diff), r.diff || r.text);

    // owner, 2026-11-12: "there are no taxable services / labor — it all should be no tax"
    await pg.evaluate(() => { const now = new Date().toISOString(); TKPay.dayTransactions = async function () { return { rows: [{ id: 'q2', invoice_id: 'r7', method: 'cash', status: 'completed', base_cents: 8147, tax_cents: 647, cost_cents: 0, created_at: now, description: 'TEST lockout taxed by mistake' }] }; }; renderReports(); }); await sleep(2000);
    r = await pg.evaluate(() => { const bx = document.getElementById('repTaxBox'), row = Array.from(bx.querySelectorAll('.repCatRow')).map(x => Array.from(x.children).map(y => y.innerText.trim()).join(' | ')); return { row, diff: (document.getElementById('repTaxDiff') || {}).innerText || '', text: bx.innerText.replace(/\s+/g, ' ') }; });
    check('a service line is NEVER counted as taxable, even when the sale line says it was — and the tax taken on it is pointed out',
      r.row.join() === 'Services / labor | $75.00 | $0.00 | $75.00' && /Taxable sales \$0\.00/.test(r.text) && /Sales tax collected \$6\.47/.test(r.text) && /Collected is \$6\.47 more/.test(r.diff) && /service or labor line that was taxed/.test(r.diff), r);

    // phone
    await pg.setViewport(PHONE);   // reloads the page
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && typeof renderReports === 'function', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(stubSales); await pg.evaluate(() => { if (typeof show === 'function') show('reports'); renderReports(); }); await sleep(3000);
    r = await pg.evaluate(() => { const bx = document.getElementById('repTaxBox'); if (!bx) return { none: true }; bx.scrollIntoView({ block: 'start' }); const rc = bx.getBoundingClientRect(), b2 = document.getElementById('repTaxCsv').getBoundingClientRect();
      return { fits: rc.left >= 0 && rc.right <= innerWidth + 1 && bx.scrollWidth <= bx.clientWidth + 1, page: document.documentElement.scrollWidth <= innerWidth + 1, btnH: Math.round(b2.height), keys: /Keys/.test(bx.innerText) }; });
    check('phone: the worksheet fits the screen with no sideways scroll and the file button is finger-sized', !r.none && r.fits && r.page && r.btnH >= 44 && r.keys, r);
    await sleep(200); await pg.screenshot({ path: path.join(OUT, 'taxcat-phone.png') });

    // ================= 8z96: a service can no longer be taxed anywhere a line is made =================
    await pg.setViewport(PC);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && typeof posOtherEntry === 'function', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate(async () => { _chgUnlocked = true; posOtherEntry('service', 'automotive'); await new Promise(z => setTimeout(z, 300));
      const ov = document.querySelector('.chg-modal-ov'), txt = ov ? ov.innerText : '', tick = document.getElementById('oeTax');
      return { note: /Services and labor are not taxed/.test(txt), label: /Taxable line/.test(txt), hidden: !!tick && tick.hidden, cats: TKS.Config.get().taxableByCategory, def: TKS.Config.taxableDefault('Labor') }; });
    check('Register: a custom service has no "Taxable line" box — it says services are not taxed', r.note && !r.label && r.hidden, r);
    check('the shop settings cannot make labor, travel, programming or after-hours taxable; parts still are', r.cats.Labor === false && r.cats.Travel === false && r.cats.Programming === false && r.cats.AfterHours === false && r.cats.Materials === true && r.def === false, r.cats);
    await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    r = await pg.evaluate(async () => { const wait = ms => new Promise(z => setTimeout(z, ms));
      const row = document.querySelector('.qiDesc').closest('.qi-item, .qiRow, div'), q = s => document.querySelector(s);
      const d = q('.qiDesc'), cat = q('.qiCat'), tax = q('.qiTax'), amt = q('.qiAmt');
      d.value = 'Car lockout'; d.dispatchEvent(new Event('change', { bubbles: true })); amt.value = '75'; amt.dispatchEvent(new Event('input', { bubbles: true })); await wait(200);
      const first = { cat: cat.value, tax: tax.checked };
      tax.checked = true; tax.dispatchEvent(new Event('change', { bubbles: true })); await wait(300);
      const said = /Services are not taxed/.test(document.body.innerText), after = tax.checked;
      const ok = Array.from(document.querySelectorAll('button')).find(b => b.offsetParent && /^(ok|got it|close)$/i.test(b.innerText.trim())); if (ok) ok.click(); await wait(200);
      cat.value = 'Materials'; cat.dispatchEvent(new Event('change', { bubbles: true })); tax.checked = true; tax.dispatchEvent(new Event('change', { bubbles: true })); await wait(200);
      const asPart = tax.checked;
      cat.value = 'Labor'; cat.dispatchEvent(new Event('change', { bubbles: true })); await wait(200);
      return { first, said, after, asPart, backToLabor: tax.checked, row: !!row }; });
    check('builder: "Car lockout" is Labor and NOT taxed (it used to be taxed because of the word "lock")', r.first.cat === 'Labor' && r.first.tax === false, r);
    check('builder: ticking tax on a service is refused with a plain message; a Materials / Parts line can be taxed; switching back to Labor takes the tick off', r.said && r.after === false && r.asPart === true && r.backToLabor === false, r);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
