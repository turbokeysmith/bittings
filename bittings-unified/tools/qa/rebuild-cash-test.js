// Browser test of 8z94: Cash at the Register asks how much the customer handed over and shows the change
// BEFORE the sale is recorded; too little cannot be confirmed; Cancel records nothing; card and check are unchanged.
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
function check(name, ok, detail) { results.push((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined ? '  → ' + JSON.stringify(detail).slice(0, 700) : '')); if (!ok) failed++; }
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
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], receipt_docs: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop' } } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => document.querySelector('.bt-sidebar .bt-nav__item[data-go="payments"]').click()); await sleep(1000);
    // the till's server calls, stood in: count what would have been recorded
    await pg.evaluate(() => { window.__rec = []; _chgUnlocked = true;
      TKS.POS.checkout = () => Promise.resolve({ data: 'TKS-TEST-1' }); TKS.POS.decrementStock = () => Promise.resolve({});
      TKPay.recordCashCheck = (stub, method, o) => { window.__rec.push(method + ' ' + stub.totals.total); o.onDone({ captured_cents: Math.round(stub.totals.total * 100) }); return Promise.resolve(); };
      posAddLine({ type: 'custom', desc: 'TEST key', unitCents: 20000, taxable: true }); });
    const dlg = () => pg.evaluate(() => { const d = document.querySelector('.chg-modal-ov #uiCashIn'); if (!d) return null; const ov = d.closest('.chg-modal-ov');
      return { title: ov.querySelector('.chg-modal-h b').innerText, quick: Array.from(ov.querySelectorAll('[data-q]')).map(x => x.innerText), lbl: ov.querySelector('#uiCashLbl').innerText, amt: ov.querySelector('#uiCashAmt').innerText, canSave: !ov.querySelector('[data-yes]').disabled }; });
    const type = v => pg.evaluate(v => { const i = document.getElementById('uiCashIn'); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    let r;

    await pg.evaluate(() => document.getElementById('chgCash').click()); await sleep(300);
    r = await dlg(); const rec0 = await pg.evaluate(() => window.__rec.length);
    check('Cash opens a box asking what the customer gave — nothing is recorded yet, and it cannot be confirmed empty',
      !!r && /Cash — total \$217\.25/.test(r.title) && rec0 === 0 && r.canSave === false && r.amt === '—', { r, rec0 });
    check('one-tap amounts: Exact, then the next dollar / $5 / $50 / $100 up', !!r && JSON.stringify(r.quick) === JSON.stringify(['Exact', '$218', '$220', '$250', '$300']), r && r.quick);
    await type('200'); r = await dlg();
    check('too little cash says how much is still owed and cannot be confirmed', /Not enough/i.test(r.lbl) && r.amt === '$17.25' && r.canSave === false, r);
    await pg.evaluate(() => { const i = document.getElementById('uiCashIn'); i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); await sleep(200);
    check('pressing Enter with too little does nothing', !!(await dlg()) && (await pg.evaluate(() => window.__rec.length)) === 0);
    await pg.evaluate(() => document.querySelector('.chg-modal-ov [data-q="22000"]').click()); r = await dlg();
    check('tapping $220 shows the change: $2.75', /^CHANGE DUE$/i.test(r.lbl) && r.amt === '$2.75' && r.canSave === true, r);
    await pg.screenshot({ path: path.join(OUT, 'cash-change-pc.png') });
    await pg.evaluate(() => document.querySelector('.chg-modal-ov [data-no]').click()); await sleep(300);
    r = await pg.evaluate(() => ({ open: !!document.querySelector('.chg-modal-ov'), rec: window.__rec.length, lines: posTicket.length }));
    check('Cancel records nothing and keeps the ticket', !r.open && r.rec === 0 && r.lines === 1, r);

    await pg.evaluate(() => document.getElementById('chgCash').click()); await sleep(300);
    await pg.evaluate(() => document.querySelector('.chg-modal-ov [data-q="21725"]').click()); r = await dlg();
    check('Exact shows "No change"', /No change/i.test(r.lbl) && r.amt === '$0.00' && r.canSave === true, r);
    await type('250'); await pg.evaluate(() => document.querySelector('.chg-modal-ov [data-yes]').click()); await sleep(900);
    r = await pg.evaluate(() => ({ open: !!document.querySelector('.chg-modal-ov'), rec: window.__rec, status: document.getElementById('chgStatus').innerText, big: (document.getElementById('chgChangeBig') || {}).innerText || '', lines: posTicket.length }));
    check('confirming records ONE cash sale for the sale amount (not the cash handed over) and clears the ticket', !r.open && JSON.stringify(r.rec) === '["cash 217.25"]' && r.lines === 0, r);
    check('the change stays on screen after the sale: $32.75, cash received $250.00', /change due \$32\.75/i.test(r.status) && /\$32\.75/.test(r.big) && /Cash received \$250\.00/.test(r.big), r);
    await pg.screenshot({ path: path.join(OUT, 'cash-change-after.png') });

    // card and check do not ask for cash
    await pg.evaluate(() => { posAddLine({ type: 'custom', desc: 'TEST key', unitCents: 20000, taxable: true }); document.getElementById('chgCard').click(); }); await sleep(300);
    r = await pg.evaluate(() => { posCheckoutThen('card'); return { cashBox: !!document.getElementById('uiCashIn'), status: document.getElementById('chgStatus').innerText, rec: window.__rec.length }; });
    check('Card is unchanged: no cash box (it still asks for the customer first)', !r.cashBox && /Card needs the customer/.test(r.status) && r.rec === 1, r);

    // phone
    await pg.setViewport(PHONE);   // switching to a phone reloads the page
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && typeof posAddLine === 'function', { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => { if (typeof show === 'function') show('payments'); _chgUnlocked = true; if (!posTicket.length) posAddLine({ type: 'custom', desc: 'TEST key', unitCents: 20000, taxable: true }); posCheckoutThen('cash'); }); await sleep(400);
    await type('220');
    r = await pg.evaluate(() => { const m = document.querySelector('.chg-modal-ov .chg-modal').getBoundingClientRect(), y = document.querySelector('.chg-modal-ov [data-yes]').getBoundingClientRect(), q = document.querySelector('.chg-modal-ov [data-q]').getBoundingClientRect();
      return { fits: m.left >= 0 && m.right <= innerWidth + 1, saveOnScreen: y.bottom <= innerHeight && y.height >= 44, quickH: Math.round(q.height) }; });
    check('phone: the box fits the screen, buttons are finger-sized, and Record is reachable', r.fits && r.saveOnScreen && r.quickH >= 44, r);
    await pg.screenshot({ path: path.join(OUT, 'cash-change-phone.png') });
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
