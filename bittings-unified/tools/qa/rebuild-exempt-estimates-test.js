// Browser test of 8z78 + 8z79: tax-exempt sales (certificate, totals, print, Reports, Settings), "In shop" on an
// estimate and on the job, the estimates list (search / edit / schedule), and pay in Reports.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 800) : '')); if (!ok) failed++; }
// server stand-ins the generic fake cloud does not have
function stubServer() {
  const sb = TKS._sb(), real = sb.rpc.bind(sb); window.__rpc = [];
  sb.rpc = function (name, args) {
    const ok = v => new Promise(r => setTimeout(() => r({ data: v, error: null }), 30));
    if (name === 'tax_exemption_review') { window.__rpc.push(name + ' ' + JSON.stringify(args)); const d = JSON.parse(localStorage.getItem('__db')); (d.tax_exemptions || []).forEach(c => { if (c.id === args.p_id) { if (args.p_action === 'verify') c.verified_at = new Date().toISOString(); if (args.p_action === 'revoke') c.revoked_at = new Date().toISOString(); } }); localStorage.setItem('__db', JSON.stringify(d)); return ok({ ok: true }); }
    if (name === 'payroll_paid') { window.__rpc.push(name); return ok([{ user_id: 'u-tech', name: 'TEST Jayden', period_start: '2026-10-25', period_end: '2026-11-07', minutes: 3690, rate_cents: 1500, gross_cents: 92250, paid_at: new Date().toISOString() }]); }
    if (name === 'commission_day_rows') { window.__rpc.push(name); return ok([{ tech_id: 'u-tech', tech_name: 'TEST Jayden', day: new Date().toISOString().slice(0, 10), base_cents: 40000, commission_cents: 4000, held_cents: 1000, met_min: true }]); }
    return real(name, args);
  };
}
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK' }, taxableByCategory: { Materials: true } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_form_sections', 'open');   /* 8z158: the form's sections all open, so this test still checks the fields themselves */ localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    let r;
    const openQuote = async () => { await pg.goto('http://127.0.0.1:8088/bittings.html?quote=1', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2200); };
    const tots = () => pg.evaluate(() => Array.from(document.querySelectorAll('#qiTot div')).map(d => d.innerText.replace(/\n/g, ' = ')));
    const tx = () => pg.evaluate(() => { const o = document.querySelector('.tx-ov'); return o ? o.innerText.replace(/\s+/g, ' ').trim() : null; });
    const txClick = (sel) => pg.evaluate((sel) => { const o = document.querySelector('.tx-ov'); const x = o && o.querySelector(sel); if (x) x.click(); return !!x; }, sel);
    const txSet = (id, v) => pg.evaluate((id, v) => { const x = document.querySelector('.tx-ov #' + id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
    const txErr = () => pg.evaluate(() => (document.querySelector('.tx-ov #txErr') || {}).innerText || '');
    const sign = () => pg.evaluate(() => { const c = document.querySelector('.tx-ov #txSig'); c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect();
      const ev = (t, x, y) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 1 }));
      ev('pointerdown', 20, 60); ev('pointermove', 80, 30); ev('pointermove', 140, 90); ev('pointermove', 220, 50); ev('pointerup', 220, 50); });
    const fillLine = async (desc, amt) => { await pg.type('.qi-item .qiDesc', desc);
      await pg.evaluate((amt) => { const row = document.querySelector('.qi-item'); const a = row.querySelector('.qiAmt'); a.value = amt; a.dispatchEvent(new Event('input', { bubbles: true })); const c = row.querySelector('.qiCat'); c.value = 'Materials'; c.dispatchEvent(new Event('change', { bubbles: true }));   /* 8z96: only a part can be taxed */ const t = row.querySelector('.qiTax'); if (!t.checked) t.click(); }, amt); await sleep(400); };
    const setCust = (name, phone, addr) => pg.evaluate((name, phone, addr) => { const s = (id, v) => { const x = document.querySelector(id); x.value = v; x.dispatchEvent(new Event('input', { bubbles: true })); x.dispatchEvent(new Event('change', { bubbles: true })); }; s('#qiName', name); s('#qiPhone', phone); const p = addr.split(', '); s('#qiStreet', p[0] || ''); s('#qiCity', p[1] || ''); s('#qiState', p[2] || ''); }, name, phone, addr);   // address is now Street / City / State / ZIP boxes (was one #qiAddr)

    // ================= 1. Quick quote: tax exempt (resale) + In shop =================
    await openQuote();
    r = await pg.evaluate(() => ({ ex: (document.querySelector('#qiExBtn') || {}).innerText, where: Array.from(document.querySelectorAll('#qiWhere button')).map(x => x.innerText) }));
    check('the quote has a "Tax exempt…" button and an In shop / Mobile choice', /Tax exempt…/.test(r.ex || '') && r.where.length === 2 && /In shop/.test(r.where[0]) && /Mobile/.test(r.where[1]), r);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(300);
    r = await tx();
    check('with no customer name it asks for the name first', /Type the customer's name first/.test(r || ''), r);
    await txClick('[data-x2]');
    await setCust('TEST Dealer Motors', '405-555-0101', '500 Test Auto Row, Testville, OK');
    await fillLine('TEST Smart key', '100');
    r = await tots();
    check('before the exemption the quote charges tax ($100 + 8.625%)', r.some(x => /Sales tax \(8\.625%\) = \$8\.63/.test(x)) && r.some(x => /Total with tax = \$108\.63/.test(x)), r);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(500);
    r = await tx();
    check('nothing on file yet → it offers to record their exemption', /Nothing on file for this customer yet/.test(r || '') && /Record their exemption/.test(r || ''), r);
    await txClick('[data-new]'); await sleep(300);
    r = await pg.evaluate(() => ({ kinds: Array.from(document.querySelectorAll('.tx-k b')).map(x => x.innerText), name: document.querySelector('#txName').value, addr: document.querySelector('#txAddr').value, ask: document.querySelector('#txAsk').innerText, stmt: document.querySelector('#txStmt').innerText }));
    check('the form lists the kinds of exemption and starts filled in from the customer', r.kinds.join('|') === 'Resale|Exempt organization|100% disabled veteran|Agricultural permit|Manufacturer permit|Other' && r.name === 'TEST Dealer Motors' && /500 Test Auto Row/.test(r.addr) && /sales tax permit/.test(r.ask) && /bought for resale/.test(r.stmt), r);
    await pg.screenshot({ path: path.join(OUT, 'exempt-form.png') });
    await txClick('#txSave'); await sleep(150); const e1 = await txErr();
    await txSet('txBiz', 'Used car dealer'); await txClick('#txSave'); await sleep(150); const e2 = await txErr();
    await txSet('txNum', '123456'); await txClick('#txSave'); await sleep(150); const e3 = await txErr();
    await sign(); await txClick('#txSave'); await sleep(150); const e4 = await txErr();
    check('it will not save without the type of business, the permit number, the signature and the signer\'s name', /kind of business/.test(e1) && /permit \/ exemption number/.test(e2) && /sign in the box/.test(e3) && /name of the person signing/.test(e4), { e1, e2, e3, e4 });
    await txSet('txSigner', 'TEST Pat Dealer'); await txSet('txExp', '2020-01-01'); await txClick('#txSave'); await sleep(150);
    check('an expired permit is refused', /already expired/.test(await txErr()), await txErr());
    await txSet('txExp', '2029-12-31'); await txClick('#txSave'); await sleep(900);
    r = { open: await tx(), tots: await tots(), btn: await pg.evaluate(() => document.querySelector('#qiExBtn').innerText), info: await pg.evaluate(() => document.querySelector('#qiExInfo').innerText),
      row: await pg.evaluate(() => (JSON.parse(localStorage.getItem('__db')).tax_exemptions || [])[0] || null), rate: await pg.evaluate(() => document.querySelector('#qiTaxRate').disabled) };
    check('saved: the certificate is stored (resale, number, business, signature) and the box closes',
      r.open === null && !!r.row && r.row.kind === 'resale' && r.row.permit_number === '123456' && r.row.business_type === 'Used car dealer' && /^data:image\/png/.test(r.row.signature || '') && r.row.signer_name === 'TEST Pat Dealer' && r.row.customer_phone === '4055550101' && r.row.expires_on === '2029-12-31', r.row && Object.assign({}, r.row, { signature: (r.row.signature || '').slice(0, 30) }));
    check('the quote now charges no tax and says why', r.tots.some(x => /Sales tax — exempt = \$0\.00/.test(x)) && r.tots.some(x => /^Total = \$100\.00/.test(x)) && /Tax exempt ✓/.test(r.btn) && /No sales tax on this document\. Resale · 123456 — TEST Dealer Motors/.test(r.info) && r.rate === true, { tots: r.tots, btn: r.btn, info: r.info, rateLocked: r.rate });
    await pg.evaluate(() => { document.querySelector('#qiWhere [data-w="shop"]').click(); document.querySelector('#qiTot').scrollIntoView({ block: 'center' }); }); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'exempt-quote.png') });
    await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(900);
    r = await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST Dealer Motors'); const pv = document.querySelector('.rc-body') ? document.querySelector('.rc-body').innerText.replace(/\s+/g, ' ') : '';
      return { err: (document.querySelector('#qiErr') || {}).innerText || '', doc: d && { docType: d.docType, number: d.number, taxRate: d.taxRate, tax: d.totals && d.totals.tax, total: d.totals && d.totals.total, where: d.serviceWhere, ex: d.taxExempt && { kind: d.taxExempt.kind, n: d.taxExempt.permitNumber, cert: !!d.taxExempt.certId, by: d.taxExempt.appliedBy, sig: d.taxExempt.signedAt ? 'signed' : '' } }, pv }; });
    check('the estimate is saved with tax rate 0, the exemption it relied on, and "In shop"', !!r.doc && r.doc.docType === 'estimate' && r.doc.taxRate === 0 && r.doc.tax === 0 && r.doc.total === 100 && r.doc.where === 'shop' && r.doc.ex && r.doc.ex.kind === 'resale' && r.doc.ex.n === '123456' && r.doc.ex.cert && r.doc.ex.sig === 'signed', r.doc || r.err);
    check('the printed estimate shows EXEMPT, the certificate details and where to come', /Sales Tax EXEMPT/.test(r.pv) && /TAX EXEMPT — Resale/.test(r.pv) && /Permit \/ exemption no\.: 123456/.test(r.pv) && /Type of business: Used car dealer/.test(r.pv) && /Service: In shop — 1 Test Shop Rd/.test(r.pv), r.pv.slice(0, 900));
    await pg.evaluate(() => { const x = document.querySelector('.rc-tot'); if (x) x.scrollIntoView({ block: 'center' }); }); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'exempt-printed.png') });
    const pdf = await pg.evaluate(() => { try { const d = TKS.list('receipts').find(x => x.customer === 'TEST Dealer Motors'); const o = makePDF(d, 'en', false, true); return { ok: !!(o && o.blob && o.blob.size > 2000), name: o && o.filename }; } catch (e) { return { ok: false, err: String(e.message) }; } });
    check('the PDF of an exempt, in-shop estimate builds', pdf.ok, pdf);

    // ================= 2. Same customer again: the certificate on file is offered, nothing retyped =================
    await openQuote();
    await setCust('TEST Dealer Motors', '405-555-0101', ''); await fillLine('TEST Remote', '50'); await sleep(900);
    r = await pg.evaluate(() => document.querySelector('#qiExInfo').innerText);
    check('a later quote for the same customer says an exemption is on file', /has a tax exemption on file \(Resale · 123456\)/.test(r), r);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(500);
    r = await tx();
    check('the box lists it: signed, expiry, and that no photo is on file yet', /On file for this customer/.test(r || '') && /Resale — TEST Dealer Motors · no\. 123456/.test(r || '') && /signed/.test(r || '') && /no photo/.test(r || '') && /Use this/.test(r || ''), r);
    await txClick('[data-use]'); await sleep(400);
    r = await tots();
    check('"Use this" applies it in one tap', r.some(x => /Sales tax — exempt = \$0\.00/.test(x)) && r.some(x => /^Total = \$50\.00/.test(x)), r);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(400);
    await txClick('[data-remove]'); await sleep(400);
    r = await tots();
    check('"Remove" puts the tax back', r.some(x => /Sales tax \(8\.625%\) = \$4\.31/.test(x)), r);

    // ================= 3. Disabled veteran: the card has to be seen at every sale =================
    await openQuote();
    await setCust('TEST Vet Customer', '405-555-0202', '77 Test Vet Ln, Testville, OK'); await fillLine('TEST House key', '20');
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(400); await txClick('[data-new]'); await sleep(300);
    await txClick('.tx-k[data-k="veteran"]'); await sleep(250);
    r = await pg.evaluate(() => ({ card: getComputedStyle(document.querySelector('#txCardW')).display, biz: getComputedStyle(document.querySelector('#txBizW')).display, sig: document.querySelector('#txSigM').innerText, ask: document.querySelector('#txAsk').innerText }));
    await txSet('txNum', 'EXM-55555'); await txClick('#txSave'); await sleep(150); const v1 = await txErr();
    check('veteran: no signature or business needed, but the card must be ticked as seen', r.card !== 'none' && r.biz === 'none' && /optional/.test(r.sig) && /exemption card/.test(r.ask) && /seen the card/.test(v1), { r, v1 });
    await txClick('#txSaw'); await txClick('#txSave'); await sleep(900);
    r = await tots();
    check('veteran exemption saved and applied', r.some(x => /Sales tax — exempt = \$0\.00/.test(x)), r);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(400); await txClick('[data-remove]'); await sleep(300);
    await pg.evaluate(() => document.querySelector('#qiExBtn').click()); await sleep(400); await txClick('[data-use]'); await sleep(300);
    r = await tx(); await txClick('[data-ok]'); await sleep(150); const v2 = await txErr();
    check('using a veteran\'s certificate again asks to see the card again', /I saw the Oklahoma Tax Commission exemption card at this sale/.test(r || '') && /seen the card/.test(v2), { r, v2 });
    await txClick('#txSaw'); await txClick('[data-ok]'); await sleep(300);
    await pg.evaluate(() => document.querySelector('#qiGo').click()); await sleep(900);
    r = await pg.evaluate(() => { const d = TKS.list('receipts').find(x => x.customer === 'TEST Vet Customer'); return d && { tax: d.totals.tax, kind: d.taxExempt && d.taxExempt.kind, seen: d.taxExempt && d.taxExempt.cardSeen }; });
    check('the veteran\'s estimate records that the card was seen', !!r && r.tax === 0 && r.kind === 'veteran' && r.seen === true, r);

    // ================= 4. The estimates list: see them all, search, edit, schedule =================
    await pg.evaluate(async () => { localStorage.setItem('__role', 'technician'); try { await TKS.clearDeviceCache(); } catch (e) {} });
    await pg.goto('http://127.0.0.1:8088/bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await sleep(2800);
    r = await pg.evaluate(() => ({ open: document.getElementById('histPanel').classList.contains('open'), builder: !!document.querySelector('.qi-box'),
      card: (function () { const c = document.querySelector('#chat .res-home'); return c ? { title: c.querySelector('h2').innerText, btns: Array.from(c.querySelectorAll('button')).map(x => x.innerText) } : null; })() }));
    // CHANGED (landing): the menu used to open the list straight away; it now lands on the "Quotes & estimates" card
    // (New estimate + Estimates (n), no Receipts button) and the list is one tap on "Estimates (n)".
    check('menu → lands on the Quotes & estimates card, NOT the list: "New estimate" + "Estimates (2)", no Receipts button, no builder', !r.open && !r.builder && r.card && r.card.title === 'Quotes & estimates' && r.card.btns.join('|') === '💬 New estimate|📋 Estimates (2)', r);
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(400);
    r = await pg.evaluate(() => ({ open: document.getElementById('histPanel').classList.contains('open'), filter: (document.querySelector('.hist-filter button.active') || {}).innerText, builder: !!document.querySelector('.qi-box'),
      rows: Array.from(document.querySelectorAll('#histList .hist-item')).map(x => x.innerText.replace(/\s+/g, ' ')), acts: Array.from(document.querySelectorAll('#histList .hist-item')).map(x => Array.from(x.querySelectorAll('.hi-actions button')).filter(b => b.offsetParent && !b.classList.contains('tks-cap-hidden')).map(b => b.innerText).slice(0, 2).join('|')) }));
    check('"Estimates (2)" opens the list of the open estimates', r.open && r.filter === 'Estimates' && !r.builder && r.rows.length === 2, r);
    check('each estimate leads with Book it (8z153: was Schedule) and Edit — for a technician too — and shows In shop / Tax exempt', r.acts.every(a => a === '📅 Book it|✏️ Edit') && r.rows.some(x => /TEST Dealer Motors/.test(x) && /🏪 In shop · 🏛 Tax exempt/.test(x) && /405-555-0101/.test(x)), r);
    await pg.screenshot({ path: path.join(OUT, 'estimates-list.png') });
    // ---- Quotes & estimates: no big "＋ New quote" in the list any more (the card has "New estimate"); Done and Cancel come back to the card ----
    r = await pg.evaluate(() => ({ title: document.querySelector('#histPanel .pp-head b').innerText, oldBtn: !!document.getElementById('histNewQuoteBtn'), hint: /Quote a caller, then schedule it or bill it from here./.test(document.getElementById('histPanel').innerText) }));
    check('CHANGED: the list has no "＋ New quote" button and no hint line any more', r.title === 'Quotes & estimates' && !r.oldBtn && !r.hint, r);
    await pg.evaluate(() => document.querySelector('#histPanel .pp-head button').click()); await sleep(400);
    r = await pg.evaluate(() => ({ open: document.getElementById('histPanel').classList.contains('open'), card: !!document.querySelector('#chat .res-home #homeNew') }));
    check('CHANGED: Done in the list returns to the Quotes & estimates card', !r.open && r.card, r);
    await pg.evaluate(() => document.getElementById('homeNew').click()); await sleep(900);
    r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, histOpen: document.getElementById('histPanel').classList.contains('open'), type: (document.querySelector('.qiTB.on') || { dataset: {} }).dataset.t }));
    check('CHANGED: tapping "New estimate" opens the builder as an Estimate (Build a quote; 8z153)', /Build a quote/.test(r.title || '') && r.type === 'estimate' && !r.histOpen, r);
    await pg.screenshot({ path: path.join(OUT, 'quotes-new-phone.png') });
    await pg.evaluate(() => document.getElementById('qiCancel').click()); await sleep(600);
    r = await pg.evaluate(() => ({ builder: !!document.querySelector('.qi-box'), open: document.getElementById('histPanel').classList.contains('open'), card: !!document.querySelector('#chat .res-home #homeNew') }));
    check('CHANGED: Cancel on a new estimate lands back on the card (not the list)', !r.builder && !r.open && r.card, r);
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(400);
    r = await pg.evaluate(() => { const s = document.getElementById('histSearch'); s.value = 'vet'; s.dispatchEvent(new Event('input', { bubbles: true })); const a = document.querySelectorAll('#histList .hist-item').length; s.value = '0101'; s.dispatchEvent(new Event('input', { bubbles: true })); const b2 = Array.from(document.querySelectorAll('#histList .hist-item')).map(x => x.querySelector('.hi-cust').innerText); s.value = 'zzzz'; s.dispatchEvent(new Event('input', { bubbles: true })); const c = document.getElementById('histList').innerText; s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); return { a, b2, c }; });
    check('search finds an estimate by name or by phone digits', r.a === 1 && r.b2.join() === 'TEST Dealer Motors' && /Nothing matches/.test(r.c), r);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#histList .hist-item')).find(x => /TEST Dealer Motors/.test(x.innerText)); it.querySelector('[data-act="edit"]').click(); }); await sleep(900);
    r = await pg.evaluate(() => ({ title: (document.querySelector('#qiTitle') || {}).innerText, name: (document.querySelector('#qiName') || {}).value, where: (document.querySelector('#qiWhere button.on') || {}).innerText, ex: (document.querySelector('#qiExBtn') || {}).innerText, tot: Array.from(document.querySelectorAll('#qiTot div')).map(d => d.innerText.replace(/\n/g, ' = ')) }));
    check('Edit opens that estimate with In shop and the exemption still on it', /Edit EST-/.test(r.title || '') && r.name === 'TEST Dealer Motors' && /In shop/.test(r.where || '') && /Tax exempt ✓/.test(r.ex || '') && r.tot.some(x => /^Total = \$100\.00/.test(x)), r);
    // owner schedules it
    await pg.evaluate(async () => { localStorage.setItem('__role', 'owner'); try { await TKS.clearDeviceCache(); } catch (e) {} });
    await pg.goto('http://127.0.0.1:8088/bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await sleep(2800);
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(400);   // the list is one tap from the card now
    // 8z153: "Book it" opens a small sheet (date / time / technician); its Book it button creates the job directly on the schedule — no Quick form
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#histList .hist-item')).find(x => /TEST Dealer Motors/.test(x.innerText)); it.querySelector('[data-act="sched"]').click(); });
    await pg.waitForSelector('#bkSheet #bkGo', { timeout: 5000 }); await sleep(300);
    // today in the SHOP'S time, not UTC: after 6 pm Central the UTC date is already tomorrow, the job was booked for tomorrow and its card
    // was not on today's board (this check failed every evening and passed every morning)
    await pg.evaluate(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }; set('bkDate', d.toISOString().slice(0, 10)); set('bkTime', '14:00'); });
    await Promise.all([pg.waitForNavigation({ waitUntil: 'domcontentloaded' }), pg.evaluate(() => document.getElementById('bkGo').click())]);
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 });
    await pg.waitForFunction(() => (TKS.Bookings.all() || []).some(x => /^EST-/.test(x.fromEstimate || '')), { timeout: 15000 }); await sleep(1200);
    r = await pg.evaluate(() => { const j = (TKS.Bookings.all() || []).find(x => /^EST-/.test(x.fromEstimate || '')); return j && { time: j.time, status: j.status, where: j.serviceWhere, ex: j.taxExempt && j.taxExempt.permitNumber, total: j.quote && j.quote.total, lines: (j.items || []).length }; });
    check('8z153: Book it created the booking directly (14:00, Scheduled, In shop, exempt, $100, a line)', !!r && r.time === '14:00' && r.status === 'Scheduled' && r.where === 'shop' && r.ex === '123456' && r.total === 100 && r.lines >= 1, r);
    // 8z153: the form is no longer opened for us; open the created job's card to look inside it
    await pg.evaluate(() => { const j = (TKS.Bookings.all() || []).find(x => /^EST-/.test(x.fromEstimate || '')); document.querySelector('[data-open="' + j.id + '"]').click(); });
    await pg.waitForSelector('#sjSave', { timeout: 15000 }); await sleep(900);
    r = await pg.evaluate(() => ({ url: location.pathname, name: document.getElementById('sjName').value, where: (document.querySelector('#sjWhere button.on') || {}).innerText, addrHidden: getComputedStyle(document.getElementById('sjAddrWrap')).display === 'none',
      tot: document.getElementById('sjChTot').innerText.replace(/\s+/g, ' '), ex: (document.getElementById('sjExBtn') || {}).innerText }));
    check('Book it creates the job: its form shows In shop chosen (no address asked), tax exempt carried over', /index\.html/.test(r.url) && r.name === 'TEST Dealer Motors' && /In shop/.test(r.where || '') && r.addrHidden && /Tax — exempt \$0\.00/.test(r.tot) && /Total \$100\.00/.test(r.tot) && /Tax exempt ✓ \(Resale · 123456\)/.test(r.ex || ''), r);
    await pg.screenshot({ path: path.join(OUT, 'job-inshop-exempt.png') });
    await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1200);
    r = await pg.evaluate(() => { const j = (TKS.list('bookings') || []).find(x => x.customer && x.customer.name === 'TEST Dealer Motors'); const card = Array.from(document.querySelectorAll('.sch-card')).map(x => x.innerText.replace(/\s+/g, ' ')).find(x => /TEST Dealer Motors/.test(x)) || '';
      const d = j ? jobToInvoiceDraft(j) : null; return { job: j && { where: j.serviceWhere, ex: j.taxExempt && j.taxExempt.permitNumber, from: j.fromEstimate, tax: j.quote && j.quote.tax, total: j.quote && j.quote.total }, card, draft: d && d.then ? 'promise' : (d && { where: d.serviceWhere, ex: !!d.taxExempt }) }; });
    check('the saved job keeps In shop, the exemption (no tax in its total) and which estimate it came from', !!r.job && r.job.where === 'shop' && r.job.ex === '123456' && /^EST-/.test(r.job.from || '') && r.job.tax === 0 && r.job.total === 100, r.job);
    check('the job card says "In shop" and "Tax exempt"', /🏪 In shop — customer comes in/.test(r.card) && /🏛 Tax exempt/.test(r.card), r.card);
    await pg.goto('http://127.0.0.1:8088/bittings.html?estimates=1', { waitUntil: 'domcontentloaded' }); await sleep(2800);
    await pg.evaluate(() => document.getElementById('homeEst').click()); await sleep(400);   // the list is one tap from the card now
    // CHANGED: a scheduled estimate is no longer in the list (it is not "open"); search still finds it, tagged "On the schedule"
    r = await pg.evaluate(() => { const rows = () => Array.from(document.querySelectorAll('#histList .hist-item')).map(x => x.innerText.replace(/\s+/g, ' ')); const listed = rows().some(x => /TEST Dealer Motors/.test(x));
      const s = document.getElementById('histSearch'); s.value = 'dealer'; s.dispatchEvent(new Event('input', { bubbles: true })); const found = rows().find(x => /TEST Dealer Motors/.test(x)) || ''; s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#histPanel .pp-head button').click(); return { listed, found, btn: (document.getElementById('homeEst') || {}).innerText }; });
    check('back in the list the scheduled estimate is gone (open ones only); search still finds it "On the schedule"; the card counts one fewer', !r.listed && /📅 On the schedule \d{4}-\d\d-\d\d 14:00/.test(r.found) && /Book again/.test(r.found) && r.btn === '📋 Estimates (1)', r);

    // ================= 5. Settings → Sales tax: the certificates on file =================
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(stubServer);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="settings"]').click()); await sleep(900);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('.railItem')).find(x => /Sales tax/.test(x.innerText)); if (it) it.click(); }); await sleep(1200);
    r = await pg.evaluate(() => { const bx = document.getElementById('f_txList'); return bx ? { text: bx.innerText.replace(/\s+/g, ' '), help: bx.parentElement.innerText.replace(/\s+/g, ' ').slice(0, 2000), n: bx.querySelectorAll('.tx-cert').length } : null; });
    check('Settings → Sales tax explains what paper is needed and lists both certificates with what is still owed', !!r && r.n === 2 && /Resale — TEST Dealer Motors · no\. 123456/.test(r.text) && /100% disabled veteran — TEST Vet Customer · no\. EXM-55555/.test(r.text) && /I checked this permit/.test(r.text) && /90 days/.test(r.help) && /OkTAP/.test(r.help), r);
    await pg.evaluate(() => document.getElementById('f_txList').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'exempt-settings.png') });
    await pg.evaluate(() => { const c = Array.from(document.querySelectorAll('#f_txList .tx-cert')).find(x => /TEST Dealer Motors/.test(x.innerText)); c.querySelector('[data-act="verify"]').click(); }); await sleep(900);
    r = await pg.evaluate(() => ({ calls: window.__rpc.filter(x => /tax_exemption_review/.test(x)), text: Array.from(document.querySelectorAll('#f_txList .tx-cert')).map(x => x.innerText.replace(/\s+/g, ' ')).find(x => /TEST Dealer Motors/.test(x)) }));
    check('the owner marks a permit as checked', r.calls.length === 1 && /"p_action":"verify"/.test(r.calls[0]) && /checked by a manager/.test(r.text || ''), r);

    // ================= 6. Reports: tax-exempt sales + pay =================
    await pg.evaluate(() => { const now = new Date().toISOString(); const recs = TKS.list('receipts'); const ex = recs.find(x => x.customer === 'TEST Dealer Motors');
      const rows = [ { id: 'p1', invoice_id: ex.id, method: 'cash', status: 'completed', base_cents: 10000, tax_cents: 0, cost_cents: 3000, created_at: now, description: 'TEST exempt sale', technician: 'TEST Jayden' },
                     { id: 'p2', invoice_id: 'none', method: 'cash', status: 'completed', base_cents: 21725, tax_cents: 1725, cost_cents: 5000, created_at: now, description: 'TEST taxed sale', technician: 'TEST Jayden' } ];
      TKPay.dayTransactions = async function () { return { rows: rows }; };
      const bk = TKS.Bookings.all(); const j = bk.find(x => x.customer && x.customer.name === 'TEST Dealer Motors'); j.contract = { name: 'TEST Mike Contractor', amount: 60, paidAt: Date.now() }; j.status = 'Completed'; TKS.Bookings.save(j);
      document.querySelector('.bt-sidebar .bt-nav__item[data-go="reports"]').click(); });
    await sleep(2500);
    r = await pg.evaluate(() => ({ ex: (document.getElementById('repExemptCard') || {}).innerText.replace(/\s+/g, ' '), pay: (document.getElementById('repPayCard') || {}).innerText.replace(/\s+/g, ' '), profit: (document.getElementById('repProfitCard') || {}).innerText.replace(/\s+/g, ' '), n: (_repExport.exempt || []).length }));
    check('Reports lists the tax-exempt sale with the certificate and offers the file for the tax return', /Tax-exempt sales \$100\.00/.test(r.ex || '') && /TEST Dealer Motors — Resale · 123456/.test(r.ex || '') && /Exempt sales \(file for the tax return\)/.test(r.ex || '') && r.n === 1, r.ex);
    check('Reports says paperwork is still owed on a certificate (no photo of nothing required → none flagged for resale / veteran)', !/still need paperwork/.test(r.ex || ''), r.ex);
    check('Reports shows pay: wages marked paid, commission earned, contractors paid, total, and what is left',
      /Hourly wages paid \$922\.50/.test(r.pay || '') && /TEST Jayden — Oct 25 to Nov 7 · 61h 30m · pay day/.test(r.pay || '') && /Commission earned \$40\.00/.test(r.pay || '') && /\(\$10\.00 more on hold\)/.test(r.pay || '') && /Contractors paid \$60\.00/.test(r.pay || '') && /TEST Mike Contractor — 1 job/.test(r.pay || '') && /Total pay \$1022\.50/.test(r.pay || '') && /Left after pay/.test(r.pay || ''), r.pay);
    const leftOk = await pg.evaluate(() => { const p = document.getElementById('repProfitCard').innerText.replace(/\s+/g, ' '), y = document.getElementById('repPayCard').innerText.replace(/\s+/g, ' '); const m = p.match(/Profit (− )?\$([\d.]+)/), l = y.match(/Left after pay (− )?\$([\d.]+)/); if (!m || !l) return { m: !!m, l: !!l }; const profit = (m[1] ? -1 : 1) * parseFloat(m[2]), left = (l[1] ? -1 : 1) * parseFloat(l[2]); return { profit, left, ok: Math.abs((profit - 922.5 - 40) - left) < 0.011 }; });
    check('"Left after pay" = profit − wages − commission (the contractor is not taken off twice)', leftOk.ok === true, leftOk);
    await pg.evaluate(() => document.getElementById('repPayCard').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'reports-pay-exempt.png') });
    const csv = await pg.evaluate(() => new Promise(res => { const orig = URL.createObjectURL; URL.createObjectURL = function (blob) { try { blob.text().then(t => res(t)); } catch (e) { res('ERR'); } return orig.call(URL, blob); }; document.getElementById('repExemptCsv').click(); setTimeout(() => res('TIMEOUT'), 2500); }));
    check('the exempt-sales file has the columns the Tax Commission asks about', /Date,Document,Customer,Exemption,Name on permit \/ card,Address,Type of business,Permit \/ exemption number/.test(csv) && /TEST Dealer Motors,Resale,TEST Dealer Motors,"500 Test Auto Row, Testville, OK",Used car dealer,123456,2029-12-31,100\.00,cash/.test(csv), csv.slice(0, 600));
    await pg.evaluate(async () => { localStorage.setItem('__role', 'manager'); });
    check('no errors on any page', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
