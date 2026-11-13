// Browser test of 8z98: Closeout → "🖨 Print deposit slip" sends the deposit slip to the receipt printer (Print Helper),
// with the drawer count, cash to deposit, today's checks, over/short and signature lines; the drawer does NOT open.
// Real page, stand-in cloud, made-up TEST data; the Print Helper is stood in by the test. Nothing leaves this PC.
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
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message))); const jobs = [];
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url();
      if (/127\.0\.0\.1:8765\//.test(u)) { const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
        if (rq.method() === 'OPTIONS') return rq.respond({ status: 204, headers: H }); if (/\/receipt/.test(u)) jobs.push(JSON.parse(rq.postData() || '{}')); return rq.respond({ status: 200, contentType: 'application/json', headers: H, body: '{"ok":true}' }); }
      if (/^https?:\/\/127\.0\.0\.1:8088\//.test(u) || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await pg.goto('http://127.0.0.1:8088/seed.html');
    await pg.evaluate((UID) => { const iso = new Date(Date.now() - 20 * 60000).toISOString();
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings: [], web_leads: [], payment_transactions: [], audit_log: [], shop_config: [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, identity: { name: 'TEST Shop', address: '1 Test Shop Rd, Testville, OK 73000' } } }] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('bt_theme', 'dark'); localStorage.setItem('tks_drawer_float_carry', '12000');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'test-person@example.com' } })); }, UID);
    await pg.goto('http://127.0.0.1:8088/index.html', { waitUntil: 'domcontentloaded' });
    await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud' && window.TKPay, { timeout: 15000 }); await sleep(2500);
    await pg.evaluate(() => { const now = new Date().toISOString();
      TKPay.dayTransactions = async () => ({ rows: [ { id: 'a', method: 'cash', status: 'completed', base_cents: 21725, captured_cents: 21725, tax_cents: 1725, created_at: now, description: 'TEST cash sale' },
        { id: 'b', method: 'check', status: 'completed', base_cents: 50000, captured_cents: 50000, tax_cents: 0, created_at: now, description: 'TEST fleet check' },
        { id: 'c', method: 'reader', status: 'completed', base_cents: 30000, captured_cents: 30000, tax_cents: 0, created_at: now, description: 'TEST card' } ] }); });
    await pg.evaluate(() => { const n = Array.from(document.querySelectorAll('[data-go="history"]')).find(x => x.offsetParent) || document.querySelector('[data-go="history"]'); n.click(); }); await sleep(2500);
    // count the drawer: float $120 carried + today's $217.25 cash → 3 × $100, 1 × $20, 1 × $10, 7 × $1 and a quarter = $337.25
    r = await pg.evaluate(() => { const ins = Array.from(document.querySelectorAll('.denoms input')); const byLabel = {}; ins.forEach(i => { const row = i.closest('div'); byLabel[(row && row.innerText.trim().split(/\s+/)[0]) || i.id] = i; });
      const set = (re, v) => { const i = ins.find(x => re.test((x.closest('.denom, div') || {}).innerText || x.getAttribute('aria-label') || '')); if (i) { i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); } return !!i; };
      return { n: ins.length, labels: ins.map(i => i.getAttribute('aria-label') || '').slice(0, 12), a: set(/\$100/, 3), b: set(/\$20\b/, 1), c: set(/\$10\b/, 1), d: set(/\$1\b(?!0)/, 7), e: set(/25¢|\$0\.25|Quarter/i, 1), btn: !!document.getElementById('drawerPrintSlip') }; });
    var r;
    check('Closeout has a "Print deposit slip" button next to the PDF', r.btn, r);
    await sleep(300);
    const tot = await pg.evaluate(() => document.getElementById('drawerTotals').innerText.replace(/\s+/g, ' '));
    await pg.evaluate(() => document.getElementById('drawerPrintSlip').scrollIntoView({ block: 'center' })); await sleep(200);
    await pg.screenshot({ path: path.join(OUT, 'deposit-print-pc.png') });
    await pg.evaluate(() => document.getElementById('drawerPrintSlip').click()); await sleep(1200);
    const j = jobs[jobs.length - 1] || {}, txt = (j.lines || []).map(l => l.text).join('\n');
    check('it prints once, on the receipt printer, and the cash drawer stays shut', jobs.length === 1 && j.drawer === false, { jobs: jobs.length, drawer: j.drawer });
    check('the slip has the shop, DEPOSIT SLIP, the date and each counted denomination', /TEST Shop/.test(txt) && /DEPOSIT SLIP/.test(txt) && /\$100 bills x 3\s+\$300\.00/.test(txt), txt.slice(0, 500));
    check('cash to deposit = counted − float, printed big; today\'s checks and cash + checks are on it', /Total cash counted\s+\$337\.25/.test(txt) && /Less starting float\s+-\$120\.00/.test(txt) && /CASH TO DEPOSIT\s+\$217\.25/.test(txt) && (j.lines || []).some(l => l.big && /\$217\.25/.test(l.text)) && /Checks today \(1\)\s+\$500\.00/.test(txt) && /CASH \+ CHECKS TO DEPOSIT\s+\$717\.25/.test(txt), { tot, txt: txt.slice(300, 1200) });
    check('it shows balanced against today\'s cash sales and has lines to sign', /Expected cash \(cash sales\)\s+\$217\.25/.test(txt) && /Balanced vs expected/.test(txt) && /Signature: _+/.test(txt) && /Counted by:/.test(txt), txt.slice(-500));
    check('every line fits the 48-column paper', (j.lines || []).every(l => String(l.text).length <= 48), (j.lines || []).filter(l => String(l.text).length > 48).map(l => l.text));
    check('no page errors', errs.length === 0, errs.slice(0, 4));
    fs.writeFileSync(path.join(OUT, 'deposit-print-slip.txt'), txt);
    await pg.close();
  } catch (e) { results.push('CRASH ' + (e && e.message)); failed++; } finally { await b.close(); srv.close(); }
  console.log(results.join('\n')); console.log(failed ? ('\n' + failed + ' FAILED') : '\nALL PASSED'); process.exit(failed ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
