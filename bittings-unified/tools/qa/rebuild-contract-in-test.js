// Browser test of 8z152 (owner, 2026-11-14: "we have a way of contracting jobs out. We need a way to receive contracted jobs").
// A job another company sent to this shop: who, their job number, and how the money goes ("they pay us" / "we collect").
// Real page, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-contract-in-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8111, BASE = 'http://127.0.0.1:' + PORT;
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
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' });
  try {
    const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(String(e.message)));
    await pg.setRequestInterception(true);
    pg.on('request', rq => { const u = rq.url(); if (u.indexOf(BASE + '/') === 0 || /^blob:/.test(u) || /^data:/.test(u)) rq.continue(); else rq.abort(); });
    await pg.setViewport({ width: 390, height: 800, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await pg.goto(BASE + '/seed.html');
    await pg.evaluate((UID) => {
      const iso = new Date(Date.now() - 20 * 60000).toISOString();
      const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); const today = d.toISOString().slice(0, 10);
      const J = (id, name, time, o) => ({ id, shop_id: 's', date: today, time, customer_name: name, deleted_at: null, updated_at: iso, data: Object.assign({ id, date: today, time, status: 'Scheduled', jobType: 'auto', subType: 'TEST Car lockout', customer: { name, phone: '4055550100' }, vehicle: { year: '2018', make: 'Ford', model: 'F-150' } }, o) });
      const bookings = [J('jP', 'TEST Site Customer One', '09:00', {}), J('jC', 'TEST Site Customer Two', '11:00', { items: [{ desc: 'TEST Car lockout', qty: 1, each: 200, amount: 200, taxable: false }], quote: { subtotal: 200, tax: 0, total: 200, taxRate: 8.625 } })];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings, shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);
    const boot = async () => { await pg.goto(BASE + '/index.html?go=schedule', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500); };
    const open = async (id) => { await pg.evaluate((id) => document.querySelector('[data-open="' + id + '"]').click(), id); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1200); };
    const typeIn = async (sel, text) => { await pg.evaluate((sel) => { const el = document.querySelector(sel); el.scrollIntoView({ block: 'center' }); el.focus(); el.value = ''; }, sel); await pg.keyboard.type(text, { delay: 60 }); await pg.keyboard.press('Tab'); await sleep(250); };   // typed at a person's pace (a burst of fast keys is read as a barcode scan and pulled back out)
    const sect = () => pg.evaluate(() => { const bx = document.getElementById('sjContractIn'), ov = document.querySelector('.sch-modal .sheet') || document.body; return { text: bx ? bx.innerText.replace(/\s+/g, ' ').trim() : '', on: Array.from(document.querySelectorAll('#sjCinMode button[aria-pressed="true"]')).map(x => x.dataset.m).join(','), amt: !!document.getElementById('sjCinAmt'), totals: (document.getElementById('sjChTot') || {}).innerText ? document.getElementById('sjChTot').innerText.replace(/\s+/g, ' ') : '', minH: Math.min.apply(null, Array.from(document.querySelectorAll('#sjCinMode button')).map(x => Math.round(x.getBoundingClientRect().height)).concat([999])), overflow: ov.scrollWidth - ov.clientWidth }; });
    const card = (id) => pg.evaluate((id) => { const c = document.querySelector('[data-open="' + id + '"]'); const t = c ? (c.querySelector('[data-cin]') || {}).innerText : null; return t == null ? null : (t || '').replace(/\s+/g, ' ').trim(); }, id);
    await boot();

    // ================= "they pay us" =================
    await open('jP'); let r = await sect();
    check('the job form has "📥 Job from another company" (owner): company, their job number, and who collects the money — nothing chosen yet', /Job from another company/.test(r.text) && /Who collects the money\?/.test(r.text) && /They pay us/.test(r.text) && /We collect from the customer/.test(r.text) && r.on === '' && !r.amt && r.minH >= 44 && r.overflow <= 0, r);
    await typeIn('#sjCinCo', 'test abc roadside'); await typeIn('#sjCinRef', 'po-778');
    await pg.evaluate(() => document.querySelector('#sjCinMode button[data-m="they_pay"]').click()); await sleep(300);
    await typeIn('#sjCinAmt', '120'); r = await sect();
    check('"They pay us" $120: the form says the customer is not charged and the invoice goes to the company; the total box shows what they pay you', r.on === 'they_pay' && /They pay us \$/.test(r.text) && /customer on site is not charged/.test(r.text) && /Test Abc Roadside pays you \$120\.00/.test(r.totals), { on: r.on, totals: r.totals });
    await pg.evaluate(() => document.getElementById('sjContractIn').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'contract-in-form.png') });
    await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1800);
    r = await pg.evaluate(() => TKS.Bookings.get('jP').contractIn);
    check('saved on the job (the company name was capitalised; the job number is kept as typed)', r && r.company === 'Test Abc Roadside' && r.ref === 'po-778' && r.mode === 'they_pay' && r.amount === 120, r);
    r = await card('jP');
    check('the job card says who it is from and NOT to collect on site', r === '📥 From Test Abc Roadside · #po-778 · they pay — don’t collect on site · $120.00', r);
    await pg.evaluate(() => document.querySelector('[data-open="jP"]').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'contract-in-card.png') });
    r = await pg.evaluate(() => jobToInvoiceDraft(TKS.Bookings.get('jP')).then(d => ({ customer: d.customer, info: d.customerInfo && d.customerInfo.name, items: (d.items || []).map(x => x.name + ' | ' + x.price), notes: d.internalNotes })));
    check('"Invoice this job": made out to the company, one line for the agreed $120, and the staff note keeps who was on site and their job number', r.customer === 'Test Abc Roadside' && r.info === 'Test Abc Roadside' && r.items.length === 1 && r.items[0] === 'Contract job — TEST Car lockout (job # po-778) | 120' && /Job from Test Abc Roadside \(their job # po-778\) — Test Abc Roadside pays\. On site: TEST Site Customer One 4055550100/.test(r.notes), r);

    // ================= "we collect" =================
    await open('jC');
    await typeIn('#sjCinCo', 'test xyz dispatch');
    await pg.evaluate(() => document.querySelector('#sjCinMode button[data-m="we_collect"]').click()); await sleep(300);
    await typeIn('#sjCinAmt', '40'); r = await sect();
    check('"We collect" with a $40 cut on a $200 job: Total $200.00, their cut − $40.00, you keep $160.00', r.on === 'we_collect' && /Their cut \$/.test(r.text) && /Total \$200\.00/.test(r.totals) && /Test Xyz Dispatch’s cut − \$40\.00/.test(r.totals) && /You keep \$160\.00/.test(r.totals), { on: r.on, totals: r.totals });
    await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(1800);
    r = await card('jC');
    check('its card says to collect from the customer, and shows the cut', r === '📥 From Test Xyz Dispatch · collect from the customer · $40.00 their cut', r);
    r = await pg.evaluate(() => jobToInvoiceDraft(TKS.Bookings.get('jC')).then(d => ({ customer: d.customer, items: (d.items || []).map(x => x.name + ' | ' + x.price), notes: d.internalNotes })));
    check('its invoice stays with the customer at the job\'s own prices; the note names the company that sent it', r.customer === 'TEST Site Customer Two' && r.items.join(';') === 'TEST Car lockout | 200' && /Job from Test Xyz Dispatch/.test(r.notes), r);

    // ================= what is owed either way (Salary / Commission) =================
    await pg.evaluate(() => { ['jP', 'jC'].forEach(id => { const j = TKS.Bookings.get(id); j.status = 'Completed'; TKS.Bookings.save(j); }); renderContractors(); }); await sleep(600);
    const panel = () => pg.evaluate(() => (document.getElementById('contractInBox') || {}).innerText ? document.getElementById('contractInBox').innerText.replace(/\s+/g, ' ') : '');
    r = await panel();
    check('once both jobs are finished the list reads: they owe you $120.00 · you owe them $40.00, by company', /Jobs from other companies ?They owe you .120.00 · you owe them .40.00/.test(r) && /Test Abc Roadside ?.120.00 they owe you/.test(r) && /Test Xyz Dispatch ?.40.00 you owe them/.test(r) && /their job # po-778/.test(r), r.slice(0, 500));
    await pg.evaluate(() => { const bx = document.getElementById('contractInBox'); let p = bx; while (p && p !== document.body) { p.style.display = p.style.display === 'none' ? 'block' : p.style.display; p = p.parentElement; } }); await sleep(200);
    await pg.evaluate(() => document.querySelector('[data-cinpay="jP"]').click()); await sleep(500);
    await pg.evaluate(() => { const ok = Array.from(document.querySelectorAll('button')).filter(x => /^Mark settled$/.test(x.textContent.trim()) && !x.dataset.cinpay).pop(); if (ok) ok.click(); }); await sleep(700);
    r = await panel(); const st = await pg.evaluate(() => !!TKS.Bookings.get('jP').contractIn.settledAt);
    check('"Mark settled" on the first one: it leaves the open amount (they owe you $0.00) and is kept under "Already settled"', st && /They owe you \$0\.00 · you owe them \$40\.00/.test(r) && /Already settled \(1\)/.test(r), { settled: st, panel: r.slice(0, 300) });

    // ================= a technician =================
    await pg.evaluate(() => localStorage.setItem('__role', 'technician')); await boot();
    r = await card('jC');
    check('a technician\'s card says who the job is from and whether to collect — without the money', r === '📥 From Test Xyz Dispatch · collect from the customer', r);
    await open('jP'); r = await sect();
    check('a technician opening the job is told plainly: from that company, their job number, do not collect — and cannot change it', /📥 Job from Test Abc Roadside · their job # po-778/.test(r.text) && /They pay the shop — do not collect from the customer on site/.test(r.text) && !/Who collects/.test(r.text) && !/\$/.test(r.text), r.text);
    check('no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
