// Browser test of 8z80: 🖨 Print on the Receipts / invoice screen. With the Bittings Print Helper answering (the counter
// computer) the receipt goes to the receipt printer; without it the page offers the full-page copy.
// Real page, signed-in path, stand-in cloud and a stand-in print helper, made-up TEST data. Nothing leaves this PC.
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
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message))); const dialogs = []; pg.on('dialog', d => { dialogs.push(d.type() + ': ' + d.message().slice(0, 120)); d.dismiss().catch(() => {}); });
    await pg.setRequestInterception(true);
    let helperOn = false; const jobs = [];
    const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-allow-private-network': 'true' };
    pg.on('request', rq => { const u = rq.url();
      if (/127\.0\.0\.1:8765/.test(u)) { if (!helperOn) return rq.abort();
        if (rq.method() === 'POST' && /\/receipt/.test(u)) { try { jobs.push(JSON.parse(rq.postData() || '{}')); } catch (e) { jobs.push({ bad: true }); } }
        return rq.respond({ status: 200, contentType: 'application/json', headers: CORS, body: '{"ok":true}' }); }
      if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK 73000', phone: '405-555-0000', logo: (function () { const c = document.createElement('canvas'); c.width = 300; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 300, 200); x.fillStyle = '#d33'; x.fillRect(100, 60, 120, 60); x.fillStyle = '#bbb'; x.fillRect(100, 130, 120, 12); return c.toDataURL('image/png'); })() } } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [], tax_exemptions: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_form_sections', 'open');   /* 8z158: the form's sections all open, so this test still checks the fields themselves */ localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } }));
    }, UID);
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2200);
    let r;
    // three saved documents: a card receipt (tax exempt, in shop, with a vehicle), a cash receipt paid just now, an estimate
    await pg.evaluate(() => {
      const base = (o) => Object.assign({ date: 'November 12, 2026', serviceType: 'Automotive', technician: 'TEST Owner', items: [{ desc: 'TEST Smart key', amount: 200, qty: 1, taxable: true }, { desc: 'TEST Programming', amount: 125, qty: 1, taxable: false }] }, o);
      const ex = { certId: 'c-1', kind: 'veteran', kindLabel: '100% disabled veteran', holderName: 'TEST Pat Customer', permitNumber: 'EXM-55555', statement: 'x' };
      const docs = [
        base({ id: 'r1', number: 'TKS-TEST-0001', docType: 'receipt', customer: 'TEST Pat Customer', payment: 'Card', status: 'Paid in Full', paidAt: Date.now(), taxRate: 0, taxExempt: ex, serviceWhere: 'shop', vehYear: '2015', vehMake: 'Ford', vehModel: 'F-150', vin: '1FTEW1EG0FFA00001', notes: 'TEST note for the customer',
          totals: { grossSubtotal: 325, discount: 0, taxable: 200, nontax: 125, taxableAfter: 200, nontaxAfter: 125, subtotal: 325, tax: 0, taxRate: 0, surcharge: 0, surchargeRate: 0, total: 325 } }),
        base({ id: 'r2', number: 'TKS-TEST-0002', docType: 'receipt', customer: 'TEST Cash Customer', payment: 'Cash', status: 'Paid in Full', paidAt: Date.now(), taxRate: 8.625,
          totals: { grossSubtotal: 325, discount: 0, taxable: 200, nontax: 125, taxableAfter: 200, nontaxAfter: 125, subtotal: 325, tax: 17.25, taxRate: 8.625, surcharge: 0, surchargeRate: 0, total: 342.25 } }),
        base({ id: 'r3', number: 'EST-TEST-0003', docType: 'estimate', customer: 'TEST Quote Customer', payment: 'Not specified', status: '', taxRate: 8.625,
          totals: { grossSubtotal: 325, discount: 0, taxable: 200, nontax: 125, taxableAfter: 200, nontaxAfter: 125, subtotal: 325, tax: 17.25, taxRate: 8.625, surcharge: 0, surchargeRate: 0, total: 342.25 } }) ];
      docs.push(base({ id: 'r4', number: 'EST-TEST-0004', docType: 'estimate', customer: 'TEST Converted Customer', payment: 'Not specified', status: '', taxRate: 8.625, totals: docs[2].totals }));
      docs.push(base({ id: 'r5', number: 'TKS-TEST-0005', docType: 'receipt', customer: 'TEST Converted Customer', payment: 'Cash', status: 'Paid in Full', paidAt: Date.now() - 3600000, fromEstimate: 'EST-TEST-0004', taxRate: 8.625, totals: docs[1].totals }));
      saveHistory(docs); document.querySelectorAll('.qi-ov').forEach(x => x.remove());
    });
    const show = (id) => pg.evaluate((id) => { const d = getHistory().find(x => x.id === id); chat.innerHTML = ''; renderFinished(d); return Array.from(document.querySelectorAll('.res-actions button')).map(x => x.innerText); }, id);
    const clickPrint = () => pg.evaluate(() => { const bt = Array.from(document.querySelectorAll('.res-actions button')).find(x => /Print/.test(x.innerText)); bt.click(); });
    const printBtn = () => pg.evaluate(() => { const bt = Array.from(document.querySelectorAll('.res-actions button')).find(x => /Print|printer/.test(x.innerText)); return bt ? bt.innerText : null; });
    const modalTxt = () => pg.evaluate(() => { const bd = document.getElementById('modalBackdrop'); const open = bd && (bd.classList.contains('open') || getComputedStyle(bd).display !== 'none'); return open ? (document.getElementById('modalTitle').innerText + ' | ' + document.getElementById('modalBody').innerText) : null; });
    const modalBtn = (label) => pg.evaluate((label) => { const x = Array.from(document.querySelectorAll('#modalBtns button')).find(z => z.innerText === label); if (x) x.click(); return !!x; }, label);

    r = await show('r1');
    check('a finished receipt has a 🖨 Print button', r.indexOf('🖨 Print') >= 0, r);
    await pg.screenshot({ path: path.join(OUT, 'print-button.png') });

    // ---- no receipt printer on this computer ----
    helperOn = false;
    await clickPrint(); await sleep(1500);
    r = await modalTxt();
    check('on a computer without the receipt printer it says so and offers the full-page copy', /No receipt printer on this computer/.test(r || '') && /full-page copy/.test(r || '') && jobs.length === 0, r);
    const pop = new Promise(res => { b.once('targetcreated', t => res(t.url())); setTimeout(() => res('none'), 3000); });
    await modalBtn('Yes'); const opened = await pop;
    check('"Yes" opens the full-page PDF to print', /^blob:/.test(opened), opened);

    // ---- the counter computer: helper answers ----
    helperOn = true;
    r = await pg.evaluate(() => ({ enabled: TKS_HW.prefs().thermal.enabled }));
    await show('r1'); await clickPrint(); await sleep(900);
    const j1 = jobs[jobs.length - 1] || {}; const txt = (j1.lines || []).map(l => l.text).join('\n');
    check('with the printer helper it prints the receipt — even though "thermal" was never switched on in Hardware settings', r.enabled === false && jobs.length === 1 && (j1.lines || []).length > 10, { enabled: r.enabled, jobs: jobs.length });
    check('the paper receipt has the shop, number, customer, vehicle, items, EXEMPT tax, total, how it was paid and the exemption',
      /1 Test Shop Rd/.test(txt) && (j1.logo ? !/^TEST Shop$/m.test(txt) : /TEST Shop/.test(txt)) /* 8z97: no name under the logo */ && /^Receipt\s+\S/m.test(txt) && !/Receipt: /.test(txt) && /Thank you![\s\S]*# TKS-TEST-0001/.test(txt) && /Customer: TEST Pat Customer/.test(txt) && /Vehicle: 2015 Ford F-150/.test(txt) && /VIN: 1FTEW1EG0FFA00001/.test(txt) && /Service: In shop/.test(txt) &&
      /TEST Smart key\s+\$200\.00/.test(txt) && /TEST Programming\s+\$125\.00/.test(txt) && /Tax\s+EXEMPT/.test(txt) && /TOTAL\s+\$325\.00/.test(txt) && /Paid by\s+Card/.test(txt) && /Status\s+Paid in Full/.test(txt) &&
      /Tax exempt: 100% disabled veteran - EXM-55555 - TEST Pat Customer/.test(txt.replace(/\n/g, ' ')) && /Note: TEST note for the customer/.test(txt), txt);
    check('a card receipt does not open the cash drawer', j1.drawer === false, j1.drawer);
    const lg = await pg.evaluate((b64) => new Promise(res => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); const p = x.getImageData(0, 0, i.width, i.height).data; let black = 0, other = 0; for (let k = 0; k < p.length; k += 4) { if (p[k] < 40 && p[k + 1] < 40 && p[k + 2] < 40) black++; else if (!(p[k] > 215 && p[k + 1] > 215 && p[k + 2] > 215)) other++; } res({ w: i.width, h: i.height, black, other }); }; i.onerror = () => res(null); i.src = 'data:image/png;base64,' + b64; }), j1.logo || '');
    check('the shop logo is sent with the receipt: cropped to the artwork (no white margin) and turned solid black', !!lg && lg.w === 120 && lg.h >= 80 && lg.h <= 84 && lg.black > lg.w * lg.h * 0.8 && lg.other < lg.w * lg.h * 0.05, lg);
    check('the button confirms it was sent', /Sent to the printer/.test(await printBtn() || ''), await printBtn());
    await show('r2'); await clickPrint(); await sleep(900);
    const j2 = jobs[jobs.length - 1] || {}; const t2 = (j2.lines || []).map(l => l.text).join('\n');
    check('a cash receipt paid just now prints with tax and opens the drawer', jobs.length === 2 && /Tax \(8\.625%\)\s+\$17\.25/.test(t2) && /TOTAL\s+\$342\.25/.test(t2) && /Paid by\s+Cash/.test(t2) && j2.drawer === true, { drawer: j2.drawer, t2: t2.slice(0, 400) });
    await show('r3'); await clickPrint(); await sleep(900);
    const j3 = jobs[jobs.length - 1] || {}; const t3 = (j3.lines || []).map(l => l.text).join('\n');
    check('an estimate prints as an estimate (no "Paid by"), drawer stays shut', jobs.length === 3 && /^Estimate\s+\S/m.test(t3) && /# EST-TEST-0003/.test(t3) && /ESTIMATE - valid 7 days/.test(t3) && !/Paid by/.test(t3) && j3.drawer === false, t3.slice(0, 500));

    // ---- History: reprint ----
    await pg.evaluate(() => { openHist(); }); await sleep(400);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#histList .hist-item')).map(x => Array.from(x.querySelectorAll('.hi-actions button')).some(bb => /🖨 Print/.test(bb.innerText))));
    check('every row in History has 🖨 Print', r.length === 4 && r.every(Boolean), r);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#histList .hist-item .hi-num')).map(x => x.innerText));
    check('an estimate that was turned into a receipt is not listed any more — only the receipt', r.indexOf('EST-TEST-0004') < 0 && r.indexOf('TKS-TEST-0005') >= 0 && r.indexOf('EST-TEST-0003') >= 0, r);
    r = await pg.evaluate(() => { setHistFilter('estimate'); const a = Array.from(document.querySelectorAll('#histList .hist-item .hi-num')).map(x => x.innerText); setHistFilter('all'); return a; });
    check('…and it is gone from the Estimates list too', r.join() === 'EST-TEST-0003', r);
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#histList .hist-item')).find(x => /TEST Cash Customer/.test(x.innerText)); it.querySelector('[data-act="print"]').click(); }); await sleep(900);
    const j4 = jobs[jobs.length - 1] || {};
    check('a reprint from History prints again but never opens the cash drawer', jobs.length === 4 && j4.drawer === false, { jobs: jobs.length, drawer: j4.drawer });

    // ---- the Receipts tab of the main app ----
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="receipts"]').click()); await sleep(1200);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rcList .ro-item')).map(x => ({ num: x.querySelector('.ro-num').innerText, print: !!x.querySelector('[data-act="print"]'), text: x.innerText.replace(/\s+/g, ' ').slice(0, 160) })));
    /* changed with the list merge: the list is receipts + invoices only (3 rows); a waiting quote shows up only when searched */
    check('Receipts & invoices list: every row has 🖨 Print, quotes are not listed, and the converted estimate is not listed', r.length === 3 && r.every(x => x.print) && !r.some(x => /^EST-/.test(x.num)) && r.some(x => x.num === 'TKS-TEST-0005'), r);
    await pg.evaluate(() => { const s = document.getElementById('rcSearch'); s.value = 'EST-TEST-0003'; s.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    r = await pg.evaluate(() => Array.from(document.querySelectorAll('#rcList .ro-item')).map(x => ({ num: x.querySelector('.ro-num').innerText, text: x.innerText.replace(/\s+/g, ' ').slice(0, 160) })));
    check('Receipts & invoices list: an estimate found by search is labelled as one', r.some(x => x.num === 'EST-TEST-0003' && /Estimate — not billed yet/.test(x.text)), r);
    await pg.evaluate(() => { const s = document.getElementById('rcSearch'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(300);
    const before = jobs.length;
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => /TKS-TEST-0001/.test(x.innerText)); it.querySelector('[data-act="print"]').click(); }); await sleep(1200);
    const j5 = jobs[jobs.length - 1] || {}; const t5 = (j5.lines || []).map(l => l.text).join('\n');
    check('Receipts tab: Print on a row goes to the receipt printer (not a PDF), with the logo, drawer shut', jobs.length === before + 1 && /# TKS-TEST-0001/.test(t5) && /Tax\s+EXEMPT/.test(t5) && /Vehicle: 2015 Ford F-150/.test(t5) && !!j5.logo && j5.drawer === false, { jobs: jobs.length - before, drawer: j5.drawer, logo: !!j5.logo, t5: t5.slice(0, 300) });
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => /TKS-TEST-0002/.test(x.innerText)); it.querySelector('[data-act="view"]').click(); }); await sleep(700);
    r = await pg.evaluate(() => { const v = document.getElementById('rcViewer'); return v ? v.innerText.replace(/\s+/g, ' ').slice(0, 200) : null; });
    await pg.evaluate(() => document.getElementById('rcvPrint').click()); await sleep(1200);
    const j6 = jobs[jobs.length - 1] || {}; const t6 = (j6.lines || []).map(l => l.text).join('\n');
    check('Receipts tab: Print inside the opened receipt goes to the receipt printer too; a cash reprint keeps the drawer shut', jobs.length === before + 2 && /# TKS-TEST-0002/.test(t6) && /Paid by\s+Cash/.test(t6) && j6.drawer === false, { jobs: jobs.length - before, drawer: j6.drawer });
    await pg.evaluate(() => { const it = Array.from(document.querySelectorAll('#rcList .ro-item')).find(x => /TKS-TEST-0001/.test(x.innerText)); it.querySelector('[data-act="view"]').click(); }); await sleep(700);
    r = await pg.evaluate(() => (document.getElementById('rcvDoc') || document.getElementById('rcViewer')).innerText.replace(/\s+/g, ' '));
    check('Receipts tab: the opened tax-exempt receipt shows EXEMPT, the exemption and In shop', /Sales Tax EXEMPT/.test(r) && /TAX EXEMPT — 100% disabled veteran/.test(r) && /Service: In shop/.test(r), r.slice(0, 700));
    helperOn = false; await sleep(3000);   // the button is busy for a moment after a print
    await pg.evaluate(() => document.getElementById('rcvPrint').click()); await sleep(1200);
    r = await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); return d ? d.innerText.replace(/\s+/g, ' ') : null; });
    check('Receipts tab on a computer without the printer: it asks before opening the full page', /No receipt printer on this computer/.test(r || '') && /Open full page/.test(r || ''), r);
    await pg.evaluate(() => { const d = Array.from(document.querySelectorAll('.chg-modal-ov')).pop(); if (d) d.querySelector('[data-no]').click(); });
    helperOn = true;
    await pg.goto('http://127.0.0.1:8088/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(1500);


    // ---- this page's scanning is left as it was ----
    r = await pg.evaluate(() => new Promise(res => { let got = 0; window.addEventListener('tks-scan', () => got++); const k = key => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); 'u_abc123'.split('').forEach(k); k('Enter'); setTimeout(() => res(got), 200); }));
    check('loading the printer code did not switch on keyboard-scanner capture on this page', r === 0, r);
    check('no browser pop-up boxes were used (only the ones the app draws itself)', dialogs.length === 0, dialogs);
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
