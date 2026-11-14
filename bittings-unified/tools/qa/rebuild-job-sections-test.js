// Browser test of 8z159: the Scheduler's job form ("Quick form") in collapsing sections, like the quote form.
// Real page, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-job-sections-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8115, BASE = 'http://127.0.0.1:' + PORT;
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
      const data = { id: 'jE', date: today, time: '10:30', status: 'Scheduled', jobType: 'auto', subType: 'TEST Lockout and spare key',
        customer: { name: 'TEST Sections Customer', phone: '4055550177' }, vehicle: { year: '2015', make: 'Ford', model: 'F-150' },
        addr: { street: '12 Test Lane', unit: '', city: 'Tulsa', state: 'OK', zip: '74103' }, address: '12 Test Lane, Tulsa, OK 74103', serviceWhere: 'mobile',
        items: [{ desc: 'TEST Lockout', qty: 1, each: 100, amount: 100, taxable: false }, { desc: 'TEST Spare key', qty: 1, each: 150, amount: 150, taxable: true }],
        quote: { subtotal: 250, tax: 12.94, total: 262.94, taxRate: 8.625 } };
      const bookings = [{ id: 'jE', shop_id: 's', date: today, time: '10:30', customer_name: 'TEST Sections Customer', deleted_at: null, updated_at: iso, data }];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625 } }];
      localStorage.setItem('__db', JSON.stringify({ receipts: [], inventory: [], customers: [], bookings, shop_config, web_leads: [], payment_transactions: [], audit_log: [] }));
      localStorage.setItem('__role', 'owner');
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);
    const boot = async () => { await pg.goto(BASE + '/index.html?go=schedule', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 15000 }); await sleep(3500); };
    const open = async (id) => { await pg.evaluate((id) => document.querySelector('[data-open="' + id + '"]').click(), id); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1200); };
    const closeForm = async () => { await pg.evaluate(() => document.querySelectorAll('.sch-modal').forEach(x => x.remove())); await sleep(300); };
    const state = () => pg.evaluate(() => {
      const sh = document.querySelector('.sch-modal .sheet'); if (!sh) return null;
      const secs = Array.from(sh.querySelectorAll(':scope > section.qs')).filter(s => s.style.display !== 'none');
      const foot = sh.querySelector('.qs-foot'), save = document.getElementById('sjSave');
      const fr = foot ? foot.getBoundingClientRect() : null, sr = save ? save.getBoundingClientRect() : null;
      return {
        scrollH: sh.scrollHeight, overflow: sh.scrollWidth - sh.clientWidth,
        ids: Array.from(sh.querySelectorAll(':scope > section.qs')).map(s => s.dataset.sec),
        open: secs.filter(s => s.classList.contains('open')).map(s => s.dataset.sec),
        sums: Object.fromEntries(Array.from(sh.querySelectorAll(':scope > section.qs')).map(s => [s.dataset.sec, s.querySelector('.qs-s').textContent])),
        minHead: Math.min.apply(null, secs.map(s => Math.round(s.querySelector('.qs-h').getBoundingClientRect().height)).concat([999])),
        maxClosed: Math.max.apply(null, secs.filter(s => !s.classList.contains('open')).map(s => Math.round(s.getBoundingClientRect().height)).concat([0])),
        footH: fr ? Math.round(fr.height) : 0, footHasSave: !!(foot && foot.querySelector('#sjSave')), footTotal: foot ? (foot.querySelector('.qs-total') || {}).innerText : '',
        saveInView: sr ? (sr.top >= 0 && sr.bottom <= window.innerHeight) : false, saveH: sr ? Math.round(sr.height) : 0,
        heads: secs.filter(s => { const r = s.querySelector('.qs-h').getBoundingClientRect(); return r.bottom <= (fr ? fr.top : 800) + 1 && r.top >= 0; }).length,
        mode: sh._tksSections ? sh._tksSections.mode() : null, h3: (sh.querySelector('h3') || {}).textContent
      };
    });
    const clickHead = (id) => pg.evaluate((id) => document.querySelector('.sch-modal .qs[data-sec="' + id + '"] .qs-h').click(), id);
    await boot();

    // 1. flat height first
    await pg.evaluate(() => localStorage.setItem('tks_form_sections', 'off'));
    await open('jE'); let f = await state();
    const flatH = await pg.evaluate(() => document.querySelector('.sch-modal .sheet').scrollHeight);
    check('1a. with the preference "off" the form stays flat (no sections) and measures its original height', f.ids.length === 0 && flatH > 1500, { flatH, ids: f.ids });
    await closeForm();
    await pg.evaluate(() => localStorage.removeItem('tks_form_sections'));
    await open('jE'); let s = await state();
    await pg.screenshot({ path: path.join(OUT, 'job-sections-edit.png') });
    const order = ['when', 'customer', 'location', 'vehicle', 'job', 'contract', 'notes'];
    check('1b. sections exist in the stated order, "when" open, the rest closed, nothing overflows sideways, headers >= 44px, title stays on top',
      JSON.stringify(s.ids) === JSON.stringify(order) && JSON.stringify(s.open) === '["when"]' && s.overflow <= 0 && s.minHead >= 44 && /Edit job/.test(s.h3), s);

    // 2. shorter
    const cut = 1 - s.scrollH / flatH;
    check('2. the sectioned form is at least 45% shorter than the flat one', cut >= 0.45, { flatH, sectionedH: s.scrollH, cutPct: Math.round(cut * 100) });

    // 3. summaries
    await clickHead('when'); await sleep(200);   // close it so every header shows its answer
    s = await state();
    await pg.screenshot({ path: path.join(OUT, 'job-sections-closed.png') });
    check('3. closed headers show the answers', /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2} · 10:30 AM · Unassigned · Scheduled$/.test(s.sums.when) && s.sums.customer === 'TEST Sections Customer · 4055550177' && s.sums.vehicle === '2015 Ford F-150' && /^TEST Lockout and spare key · \$262\.94$/.test(s.sums.job) && s.sums.location === '12 Test Lane, Tulsa' && s.sums.contract === 'Tap to fill in' && s.sums.notes === 'Tap to fill in' && s.maxClosed <= 64, { maxClosed: s.maxClosed, sums: s.sums });   // nothing filled in = the empty placeholder
    await clickHead('when'); await sleep(200);

    // 4. pinned bar
    await pg.evaluate(() => { document.querySelector('.sch-modal .sheet').scrollTop = 0; }); await sleep(200);
    s = await state();
    check('4. pinned bar <= 96px, holds the total and #sjSave, #sjSave is in the viewport at the top of the form', s.footH > 0 && s.footH <= 96 && s.footHasSave && /\$262\.94/.test(s.footTotal) && s.saveInView && s.saveH >= 44, { footH: s.footH, total: s.footTotal, saveInView: s.saveInView, saveH: s.saveH });
    check('4b. first screen of an existing job: open "When & who", at least three more headers, and the pinned bar', s.open[0] === 'when' && s.heads >= 4, { heads: s.heads });

    // 5. change the time, tap the moved Save, nothing else changed
    await pg.evaluate(() => { const t = document.getElementById('sjTime'); t.value = '14:15'; t.dispatchEvent(new Event('input', { bubbles: true })); t.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
    const sv = await pg.$('#sjSave'); await sv.tap(); await sleep(1800);
    const j = await pg.evaluate(() => TKS.Bookings.get('jE'));
    check('5. saving from the pinned bar: new time saved, every other field unchanged',
      j.time === '14:15' && j.customer.name === 'TEST Sections Customer' && j.customer.phone === '4055550177' && j.vehicle.year === '2015' && j.vehicle.make === 'Ford' && j.vehicle.model === 'F-150' &&
      j.items.length === 2 && j.items[0].desc === 'TEST Lockout' && j.items[0].each === 100 && j.items[1].desc === 'TEST Spare key' && j.items[1].each === 150 && j.items[1].taxable === true && j.quote.total === 262.94 && j.subType === 'TEST Lockout and spare key' && j.addr.street === '12 Test Lane' && j.addr.city === 'Tulsa',
      { time: j.time, items: j.items, quote: j.quote, vehicle: j.vehicle, customer: j.customer });

    // 6. one open at a time / show everything / persists
    await open('jE');
    await clickHead('customer'); await sleep(150); s = await state();
    const oneOk = JSON.stringify(s.open) === '["customer"]';
    await pg.evaluate(() => document.querySelector('.sch-modal .qs-mode').click()); await sleep(200); s = await state();
    const allOk = s.open.length === s.ids.length - 1 || s.open.length === s.ids.filter(() => true).length;   // contract hidden for none: owner sees all 7
    const allN = s.open.length;
    await closeForm(); await open('jE'); s = await state();
    check('6. one open at a time; "Show everything" opens all; the choice survives re-opening the form', oneOk && allN === 7 && s.mode === 'open' && s.open.length === 7 && await pg.evaluate(() => localStorage.getItem('tks_form_sections')) === 'open', { oneOk, allN, mode: s.mode, open: s.open });
    await pg.evaluate(() => document.querySelector('.sch-modal .qs-mode').click()); await sleep(200); s = await state();
    check('6b. "One section at a time" puts it back (saved as the preference)', s.mode === 'one' && s.open.length === 1 && await pg.evaluate(() => localStorage.getItem('tks_form_sections')) === 'one', { mode: s.mode, open: s.open });
    await closeForm();

    // 7. a NEW job
    await pg.evaluate(() => document.querySelector('#view-schedule [data-new]').click());
    await pg.waitForSelector('#stQuick', { timeout: 8000 }); await pg.evaluate(() => document.getElementById('stQuick').click());
    await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1200);
    s = await state();
    await pg.screenshot({ path: path.join(OUT, 'job-sections-new.png') });
    check('7a. a NEW job opens on "customer"', JSON.stringify(s.open) === '["customer"]' && /new job/.test(s.h3), { open: s.open, h3: s.h3 });
    await clickHead('job'); await sleep(150);
    await pg.evaluate(() => { const d = document.getElementById('sjDate'); d.value = ''; d.dispatchEvent(new Event('change', { bubbles: true })); });   // the board's day is preset: clear it so nothing is filled
    await (await pg.$('#sjSave')).tap(); await sleep(600);
    const msg = await pg.evaluate(() => document.getElementById('sjMsg').textContent); s = await state();
    check('7b. saving an empty new job: a message in #sjMsg, and the section it is about ("customer") opens', msg.length > 5 && JSON.stringify(s.open) === '["customer"]', { msg, open: s.open });
    check('7c. new job: Save draft sits in a normal row at the end (not pinned)', await pg.evaluate(() => { const d = document.getElementById('sjDraftBtn'); return !!d && !d.closest('.qs-foot') && !d.closest('.qs'); }));
    await closeForm();

    // 9. dark mode (before the technician reload)
    await open('jE');
    await pg.evaluate(() => { document.documentElement.setAttribute('data-bt-theme', 'dark'); document.documentElement.setAttribute('data-theme', 'dark'); }); await sleep(300);
    const dark = await pg.evaluate(() => { const f = document.querySelector('.qs-foot'), sh = document.querySelector('.sch-modal .sheet'); return { bg: getComputedStyle(f).backgroundColor, sheet: getComputedStyle(sh).backgroundColor, border: getComputedStyle(document.querySelector('.qs')).borderTopColor }; });
    check('9. dark mode: the pinned bar background is not white (when the sheet is dark) and always matches the sheet', dark.bg !== 'rgba(0, 0, 0, 0)' && dark.bg === dark.sheet && (dark.sheet === 'rgb(255, 255, 255)' || dark.bg !== 'rgb(255, 255, 255)'), dark);
    await pg.screenshot({ path: path.join(OUT, 'job-sections-dark.png') });
    await pg.evaluate(() => document.documentElement.removeAttribute('data-bt-theme')); await closeForm();

    // 8. a technician
    await pg.evaluate(() => localStorage.setItem('__role', 'technician')); await boot();
    await open('jE'); s = await state();
    check('8. a technician: the form is sectioned, no Contracting section, no page errors', s && s.ids.indexOf('contract') >= 0 && !s.open.includes('contract') && await pg.evaluate(() => { const c = document.querySelector('.qs[data-sec="contract"]'); return !!c && c.style.display === 'none'; }) && errs.length === 0, { ids: s && s.ids, errs: errs.slice(0, 3) });
    await pg.screenshot({ path: path.join(OUT, 'job-sections-tech.png') });

    check('10. no page errors anywhere', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
