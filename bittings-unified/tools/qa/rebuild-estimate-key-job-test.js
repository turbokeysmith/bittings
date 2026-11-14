// Browser test of 8z145 + 8z146 (owner, 2026-11-14).
//   8z146  the service buttons on an estimate learn: what this shop usually adds for the same kind of job comes first
//          (a push-to-start key, a turn-key key, a service with no key, house work).
//   8z145  a key picked on an estimate goes onto the job AS ITS KEY when the estimate is scheduled: the job form shows it
//          already added (no picking it again), it is priced once at the quoted price, it is saved on the job (so the van
//          check and the cancel step know about it) and the invoice gets it once, linked to stock.
// Real pages, signed-in path, stand-in cloud, made-up TEST data. Nothing leaves this PC.   node tools/qa/rebuild-estimate-key-job-test.js
const http = require('http'), fs = require('fs'), path = require('path');
const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(__dirname, 'audit'); try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}
const FAKE = fs.readFileSync(path.join(__dirname, 'rebuild-fake-cloud.js'), 'utf8');
const UID = '11111111-2222-4333-8444-555555555555', PORT = 8108, BASE = 'http://127.0.0.1:' + PORT;
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
      const K = (id, o) => Object.assign({ id, shop_id: 's', qty: 3, cost: 20, sell_price_cents: 15000, chip: '', fcc_id: '', grade: '', deleted_at: null, updated_at: iso }, o);
      const inventory = [
        K('key1', { name: 'TEST FORD F-150 2015-2017 5-Button PEPS', sku: 'T-KEY1', category: 'Keys/Smart Key', fitment: 'Ford F-150 2015-2017', qty: 6, cost: 45, sell_price_cents: 22500 }),
        K('key2', { name: 'TEST FORD F-150 2015-2020 Flip Key', sku: 'T-KEY2', category: 'Keys/Remote Head / Flip', fitment: 'Ford F-150 2015-2020', qty: 2, cost: 30, sell_price_cents: 16500 }),
        K('key3', { name: 'TEST Ford transponder blank', sku: 'T-KEY3', category: 'Keys/Transponder', fitment: 'Ford F-150 2011-2020', qty: 12, cost: 4, sell_price_cents: 4500 })];
      const S = (cat, value, price) => ({ cat, en: value, es: '', value, price: price == null ? '' : String(price) });
      const services = [S('automotive', 'TEST Car lockout', 65), S('automotive', 'TEST Smart key programming', 125), S('automotive', 'TEST Service call', 95), S('automotive', 'TEST Ignition repair'), S('automotive', 'TEST Key fob programming', 75), S('automotive', 'TEST Transponder programming', 60),
        S('residential', 'TEST House lockout', 85), S('residential', 'TEST Rekey', 15)];
      const shop_config = [{ id: 'c1', shop_id: 's', tax_rate: 8.625, updated_at: iso, data: { taxRate: 8.625, serviceCats: ['automotive', 'residential', 'commercial'], services } }];
      // the shop's past documents — what the buttons learn from
      let n = 0; const svc = (desc, amount) => ({ desc, qty: 1, amount, taxable: false, category: 'Labor' }), key = (id, desc, amount) => ({ desc, qty: 1, amount, taxable: true, category: 'Materials', partId: id });
      const D = (o) => { n++; const id = 'rcpt_t' + n; return { id, shop_id: 's', deleted_at: null, created_at: iso, updated_at: iso, data: Object.assign({ id, number: 'INV-TEST-' + n, docType: 'invoice', customer: 'TEST Past ' + n, date: '2026-10-0' + ((n % 9) + 1), savedAt: Date.now() - n * 86400000, status: 'Paid in Full', totals: { total: 100 } }, o) }; };
      const receipts = [
        D({ serviceType: 'Automotive', vehIgnition: 'push', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125), svc('TEST Service call', 95)] }),
        D({ serviceType: 'Automotive', vehIgnition: 'push', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125), svc('TEST Service call', 95)] }),
        D({ serviceType: 'Automotive', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125), svc('TEST Service call', 95)] }),   // no ignition written down → read from the kind of key (a smart key)
        D({ serviceType: 'Automotive', vehIgnition: 'keyed', items: [key('key3', 'TEST Ford transponder blank', 45), svc('TEST Transponder programming', 60)] }),
        D({ serviceType: 'Automotive', items: [key('key3', 'TEST Ford transponder blank', 45), svc('TEST Transponder programming', 60), svc('TEST Transponder programming', 60)] }),   // twice on one document counts once
        D({ serviceType: 'Automotive', need: 'service', items: [svc('TEST Car lockout', 65)] }),
        D({ serviceType: 'Automotive', items: [svc('TEST Car lockout', 65), svc('TEST Ignition repair', 180)] }),
        D({ serviceType: 'Residential', items: [svc('TEST Rekey', 15)] }), D({ serviceType: 'Residential', items: [svc('TEST Rekey', 15)] }),
        // newer documents say where the work was done: three push-to-start jobs IN THE SHOP (no service call on any of them)
        D({ serviceType: 'Automotive', vehIgnition: 'push', serviceWhere: 'shop', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125)] }),
        D({ serviceType: 'Automotive', vehIgnition: 'push', serviceWhere: 'shop', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125)] }),
        D({ serviceType: 'Automotive', vehIgnition: 'push', serviceWhere: 'shop', items: [key('key1', 'TEST FORD F-150 2015-2017 5-Button PEPS', 225), svc('TEST Smart key programming', 125), svc('TEST Key fob programming', 75)] }),
        // and a third turn-key job, a mobile one
        D({ serviceType: 'Automotive', vehIgnition: 'keyed', items: [key('key3', 'TEST Ford transponder blank', 45), svc('TEST Transponder programming', 60), svc('TEST Service call', 95)] })];
      localStorage.setItem('__db', JSON.stringify({ receipts, inventory, customers: [], bookings: [], shop_config, web_leads: [], payment_transactions: [], audit_log: [], job_parts: [] }));
      localStorage.setItem('__role', 'owner'); localStorage.setItem('tks_form_sections', 'open');   /* 8z158: the form's sections all open, so this test still checks the fields themselves */
      localStorage.setItem('sb-test-auth-token', JSON.stringify({ access_token: 'x'.repeat(60), expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: UID, email: 'owner@test.invalid' } }));
    }, UID);

    // ================= 1. the buttons learn =================
    await pg.goto(BASE + '/bittings.html?quote=1', { waitUntil: 'domcontentloaded' });
    await pg.waitForSelector('.qi-box', { timeout: 15000 }); await sleep(2500);
    const setSel = async (id, v) => { await pg.evaluate((id, v) => { const el = document.querySelector('#' + id); el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v); await sleep(350); };
    const tap = async (sel) => { await pg.evaluate((sel) => { const el = document.querySelector(sel); if (!el) throw new Error('nothing to tap: ' + sel); el.click(); }, sel); await sleep(500); };
    const names = x => x.map(s => s.replace(/^✓ /, '').replace(/\$[\d.]+$/, '').replace(/^TEST /, ''));
    const state = () => pg.evaluate(() => { const chips = id => Array.from(document.querySelectorAll('#' + id + ' .qq-b')).map(x => x.innerText.replace(/\s+/g, ' ').trim()); const box = document.querySelector('.qi-box');
      return { top: chips('qiQuickTop'), low: chips('qiQuickLow'), topHead: (document.querySelector('#qiQuickTop .qq-h') || {}).innerText || '', lowHead: (document.querySelector('#qiQuickLow .qq-h') || {}).innerText || '',
        ign: Array.from(document.querySelectorAll('#qiKeys .qkIgn')).map(x => x.dataset.ign + (x.classList.contains('on') ? '*' : '')).join(','), overflow: box.scrollWidth - box.clientWidth,
        lines: Array.from(document.querySelectorAll('.qi-item')).filter(x => !x.classList.contains('disc')).map(x => x.querySelector('.qiDesc').value + ' | ' + x.querySelector('.qiAmt').value) }; });
    await setSel('qiVYear', '2015'); await setSel('qiVMake', 'Ford'); await setSel('qiVModel', 'F-150'); await sleep(300);

    // ---- 8z147: the kinds of key are collapsing bars (one open at a time) ----
    const grp = () => pg.evaluate(() => { const shown = el => !!el && el.offsetParent !== null; const kb = document.getElementById('qiKeys');
      return { bars: Array.from(kb.querySelectorAll('.qk-gb')).map(x => x.querySelector('.qk-gt').textContent + ' [' + x.querySelector('.qk-gn').textContent + ']' + (x.classList.contains('open') ? ' open' : '') + (x.querySelector('.qk-gon') ? ' ' + x.querySelector('.qk-gon').textContent : '')),
        rows: kb.querySelectorAll('.qk-row').length, rowsShown: Array.from(kb.querySelectorAll('.qk-row')).filter(shown).map(x => x.querySelector('.qk-n').textContent.replace(/^TEST /, '').slice(0, 22)), minH: Math.min.apply(null, Array.from(kb.querySelectorAll('.qk-gb')).map(x => Math.round(x.getBoundingClientRect().height)).concat([999])), overflow: document.querySelector('.qi-box').scrollWidth - document.querySelector('.qi-box').clientWidth }; });
    let g = await grp();
    check('the key list opens as three closed bars — one per kind of key, each with its count — and no key cards to scroll through', g.bars.length === 3 && g.bars.every(x => /\[1\]$/.test(x)) && g.rows === 3 && g.rowsShown.length === 0 && g.minH >= 44 && g.overflow <= 0, g);
    await pg.evaluate(() => document.getElementById('qiKeys').scrollIntoView({ block: 'start' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'keys-collapsed.png') });
    await pg.evaluate(() => document.querySelectorAll('#qiKeys .qk-gb')[0].click()); await sleep(400); g = await grp();
    const firstOpen = g.rowsShown.slice();
    check('tap a bar: only that kind of key opens', g.rowsShown.length === 1 && g.bars.filter(x => / open/.test(x)).length === 1 && / open/.test(g.bars[0]), g);
    await pg.evaluate(() => document.querySelectorAll('#qiKeys .qk-gb')[2].click()); await sleep(400); g = await grp();
    check('tap another bar: it opens and the first one closes (one open at a time)', g.rowsShown.length === 1 && g.rowsShown[0] !== firstOpen[0] && / open/.test(g.bars[2]) && !/ open/.test(g.bars[0]), g);
    await pg.screenshot({ path: path.join(OUT, 'keys-one-open.png') });
    await pg.evaluate(() => document.querySelectorAll('#qiKeys .qk-gb')[2].click()); await sleep(400); g = await grp();
    check('tap the open bar again: it closes', g.rowsShown.length === 0 && g.bars.every(x => !/ open/.test(x)), g);
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign="push"]').click()); await sleep(400); g = await grp();
    check('push-to-start leaves one kind of key: it is shown open, with no bar to tap', g.bars.length === 0 && g.rowsShown.length === 1 && /F-150 2015-2017/.test(g.rowsShown[0]), g);
    await pg.evaluate(() => document.querySelector('#qiKeys .qkIgn[data-ign=""]').click()); await sleep(400);
    const low = () => pg.evaluate(() => Array.from(document.querySelectorAll('.qq-b.low')).map(x => x.dataset.n.replace(/^TEST /, '')));
    await tap('.qiNeedB[data-need="service"]'); let r = await state();
    check('a service job: the services this shop put on past no-key jobs come first (lockout ×2, ignition repair ×1), then the rest by how much they are used at all', names(r.top).join(' ; ') === 'Car lockout ; Ignition repair ; Smart key programming ; Service call ; Transponder programming ; Key fob programming' && /your most used first/.test(r.topHead), { top: names(r.top), head: r.topHead });
    await pg.screenshot({ path: path.join(OUT, 'learn-service.png') });

    await tap('.qiNeedB[data-need="key"]'); await sleep(300); r = await state();
    check('a key job, ignition not chosen yet: what goes with keys in general comes first, nothing is greyed', names(r.low).join(' ; ') === 'Smart key programming ; Service call ; Transponder programming ; Key fob programming ; Car lockout ; Ignition repair' && /your most used first/.test(r.lowHead) && (await low()).length === 0, { low: names(r.low), head: r.lowHead, ign: r.ign });

    await tap('#qiKeys .qkIgn[data-ign="keyed"]'); r = await state(); let lw = await low();
    check('turn-key chosen: its usual service leads (transponder programming — one of those jobs never said turn-key and was read from its key); smart key programming, only ever sold with push-to-start, sinks to the bottom and is greyed — LEARNED, not by its name', names(r.low).join(' ; ') === 'Transponder programming ; Service call ; Key fob programming ; Car lockout ; Ignition repair ; Smart key programming' && lw.join(',') === 'Smart key programming' && /your usual for turn-key first/.test(r.lowHead), { low: names(r.low), greyed: lw, head: r.lowHead });
    await tap('#qiKeys .qkIgn[data-ign="push"]'); r = await state(); lw = await low();
    check('push-to-start chosen: smart key programming and service call lead; transponder programming (only ever sold with turn-key keys) is last and greyed; key fob programming, used once with push-to-start, is NOT pushed down', names(r.low).join(' ; ') === 'Smart key programming ; Service call ; Key fob programming ; Car lockout ; Ignition repair ; Transponder programming' && lw.join(',') === 'Transponder programming' && /your usual for push-to-start first/.test(r.lowHead) && r.overflow <= 0, { low: names(r.low), greyed: lw, head: r.lowHead, overflow: r.overflow });

    await tap('.qiWB[data-w="shop"]'); r = await state(); lw = await low();
    check('push-to-start AND in the shop: the in-shop habits lead (smart key programming, key fob programming); the service call — only ever charged when the shop went out — drops to the bottom', names(r.low).join(' ; ') === 'Smart key programming ; Key fob programming ; Car lockout ; Ignition repair ; Service call ; Transponder programming' && lw.join(',') === 'Service call,Transponder programming' && /your usual for push-to-start, in the shop first/.test(r.lowHead), { low: names(r.low), greyed: lw, head: r.lowHead });
    await pg.evaluate(() => document.getElementById('qiQuickLow').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'learn-key-push-shop.png') });
    await tap('.qiWB[data-w="mobile"]'); r = await state(); lw = await low();
    check('push-to-start AND mobile: the service call is back up, right after smart key programming', names(r.low).join(' ; ') === 'Smart key programming ; Service call ; Key fob programming ; Car lockout ; Ignition repair ; Transponder programming' && lw.join(',') === 'Transponder programming' && /your usual for push-to-start, mobile first/.test(r.lowHead), { low: names(r.low), greyed: lw, head: r.lowHead });
    await pg.evaluate(() => document.getElementById('qiQuickLow').scrollIntoView({ block: 'center' })); await sleep(250);
    await pg.screenshot({ path: path.join(OUT, 'learn-key-push-mobile.png') });

    await tap('.qiSB[data-s="Residential"]'); r = await state();
    check('house work learns too: Rekey (used twice) is ahead of House lockout (never used)', names(r.top).join(' ; ') === 'Rekey ; House lockout' && /first/.test(r.topHead), { top: names(r.top), head: r.topHead });
    await tap('.qiSB[data-s="Automotive"]'); await sleep(300);

    // ================= 2. the estimate's key goes onto the job =================
    await tap('#qiKeys .qkIgn[data-ign="keyed"]');   // a flip key is a turn-key key
    await pg.evaluate(() => document.querySelector('#qiKeys .qk-add[data-id="key2"]').click()); await sleep(700);
    await pg.evaluate(() => { const row = document.querySelector('.qi-item[data-part="key2"]'); const a = row.querySelector('.qiAmt'); a.value = '140.00'; a.dispatchEvent(new Event('input', { bubbles: true })); a.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(400);
    await tap('#qiQuickLow .qq-b[data-n="TEST Service call"]'); r = await state();
    check('the estimate: a flip key quoted at $140 (its shelf price is $165) and a service call', r.lines.length === 2 && r.lines.some(x => /Flip Key \| 140\.00$/.test(x)) && r.lines.some(x => x === 'TEST Service call | 95.00'), r.lines);
    await tap('#qiGo'); await sleep(1500);
    const est = await pg.evaluate(() => { const h = getHistory()[0] || {}; return { num: h.number, type: h.docType, items: (h.items || []).map(x => ({ d: x.desc, a: Number(x.amount), p: x.partId || '' })) }; });
    check('saved as an estimate; the key line knows which stock key it is', est.type === 'estimate' && est.items.some(x => x.p === 'key2' && x.a === 140), est);
    check('estimate page: no errors', errs.length === 0, errs.slice(0, 4));

    await pg.evaluate(() => { estimateToJob(getHistory()[0]); });
    await pg.waitForFunction(() => /index\.html/.test(location.pathname) && window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 });
    await pg.waitForSelector('#sjSave', { timeout: 15000 }); await sleep(2600);
    const form = () => pg.evaluate(() => { const kb = document.getElementById('sjKeys'), tot = document.getElementById('sjChTot'), ov = document.querySelector('.sch-modal .sheet') || document.body;
      return { rows: Array.from(document.querySelectorAll('#sjCharges .chD')).map(x => x.value), added: kb ? Array.from(kb.querySelectorAll('div')).filter(x => /^✓ Added$/.test(x.textContent.trim())).length : -1, addBtns: kb ? kb.querySelectorAll('.sjkAdd').length : -1,
        onJob: kb ? ((kb.innerText.match(/On this job \((\d+)\)[^\n]*\n?([^\n]*)/) || []).slice(1, 3).join(' / ')) : '', keysText: kb ? kb.innerText.replace(/\s+/g, ' ') : '', totals: tot ? tot.innerText.replace(/\s+/g, ' ') : '', overflow: ov.scrollWidth - ov.clientWidth }; });
    r = await form();
    check('the job form opens with the estimate\'s lines AND its key already on the job — marked ✓ Added, listed under "On this job", nothing to pick again', r.rows.length === 2 && r.added === 1 && /^1 \/ /.test(r.onJob) && /Flip Key/.test(r.onJob) && /price is in the charges/.test(r.keysText), { rows: r.rows, added: r.added, onJob: r.onJob });
    check('the key is priced ONCE, at the quoted $140: Charges $235.00, no "Keys picked above" amount, tax on the key only, total $247.08', /Charges \$235\.00/.test(r.totals) && !/Keys picked above/.test(r.totals) && /Total \$247\.08/.test(r.totals) && r.overflow <= 0, { totals: r.totals, overflow: r.overflow });
    // 8z147 on the job form: the kinds of key are bars; the one holding the key already on the job says so
    const jgrp = () => pg.evaluate(() => { const shown = el => !!el && el.offsetParent !== null; const kb = document.getElementById('sjKeys');
      return { bars: Array.from(kb.querySelectorAll('.sjkGrp')).map(x => x.innerText.replace(/\s+/g, ' ').trim() + (x.getAttribute('aria-expanded') === 'true' ? ' open' : '')), cardsShown: Array.from(kb.querySelectorAll('.sjkGrpBody')).filter(shown).length, minH: Math.min.apply(null, Array.from(kb.querySelectorAll('.sjkGrp')).map(x => Math.round(x.getBoundingClientRect().height)).concat([999])) }; });
    let jg = await jgrp();
    check('job form (a turn-key car, so no smart keys): the kinds of key are closed bars; the flip-key bar says "✓ 1 added"', jg.bars.length === 2 && jg.cardsShown === 0 && jg.bars.filter(x => /✓ 1 added/.test(x)).length === 1 && /Flip/.test(jg.bars.find(x => /✓ 1 added/.test(x))) && jg.minH >= 44, jg);
    await pg.evaluate(() => { const bt = Array.from(document.querySelectorAll('#sjKeys .sjkGrp')).find(x => /Flip/.test(x.innerText)); bt.click(); }); await sleep(500); jg = await jgrp();
    check('job form: tap a bar and only that kind opens', jg.cardsShown === 1 && jg.bars.filter(x => / open$/.test(x)).length === 1, jg);
    await pg.evaluate(() => { const k = document.getElementById('sjKeys'); if (k) k.scrollIntoView({ block: 'center' }); }); await sleep(300);
    await pg.screenshot({ path: path.join(OUT, 'estkey-job-form.png') });

    // taking the key off the unsaved job takes its charge with it (and the list offers it again)
    await pg.evaluate(() => { const x = document.querySelector('#sjKeys .sjkDel'); x.click(); }); await sleep(600); r = await form();
    check('✕ on the key (job not saved yet): the key and its $140 line both come off', r.rows.length === 1 && r.added === 0 && /Charges \$95\.00/.test(r.totals), { rows: r.rows, added: r.added, totals: r.totals });
    // start again from the estimate
    await pg.evaluate(() => { document.querySelectorAll('.sch-modal').forEach(x => x.remove()); try { jobDraftClear('tks_sj_draft'); } catch (e) {} });
    await pg.goto(BASE + '/bittings.html', { waitUntil: 'domcontentloaded' }); await pg.waitForFunction(() => window.TKS && typeof getHistory === 'function' && getHistory().length >= 10, { timeout: 20000 }); await sleep(800);
    await pg.evaluate((num) => { estimateToJob(getHistory().find(x => x.number === num)); }, est.num);
    await pg.waitForFunction(() => /index\.html/.test(location.pathname) && window.TKS && TKS.adapter && TKS.adapter() === 'cloud', { timeout: 20000 });
    await pg.waitForSelector('#sjSave', { timeout: 15000 }); await sleep(2600);
    await pg.evaluate(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
      set('sjDate', d.toISOString().slice(0, 10)); set('sjTime', '10:30'); if (!document.getElementById('sjName').value) set('sjName', 'TEST Caller'); if (!document.getElementById('sjPhone').value) set('sjPhone', '4055550199'); if (!document.getElementById('sjStreet').value) set('sjStreet', '1 TEST St'); });
    await sleep(300); await pg.evaluate(() => document.getElementById('sjSave').click()); await sleep(3200);
    r = await pg.evaluate((num) => { const j = (TKS.Bookings.all() || []).find(x => x.fromEstimate === num); if (!j) return { msg: (document.getElementById('sjMsg') || {}).textContent || 'no job' };
      const d = JSON.parse(localStorage.getItem('__db')); return { id: j.id, items: (j.items || []).map(x => x.desc + ' ' + x.amount + ' ' + (x.partId || '-')), total: (j.quote || {}).total, parts: (d.job_parts || []).filter(p => p.job_id === j.id).map(p => p.item_id + ' ' + p.description) }; }, est.num);
    check('saved: the job\'s key line keeps its stock link, the total is $247.08, and the key is recorded on the job (one entry)', r.items && r.items.length === 2 && r.items.some(x => /Flip Key 140 key2$/.test(x)) && r.total === 247.08 && r.parts.length === 1 && /^key2 /.test(r.parts[0]), r);
    const jid = r.id;

    // the invoice gets the key once, linked to stock, at the quoted price
    r = await pg.evaluate((jid) => jobToInvoiceDraft(TKS.Bookings.get(jid)).then(d => (d.items || []).map(x => ({ n: x.name, p: x.price, q: x.qty, part: x.partId || '', cat: x.category || '', tax: x.taxable, cost: x.unitCost || 0 }))), jid);
    check('"Invoice this job": two lines — the key ONCE (linked to stock, a part, taxed, $140, its cost along for profit) and the service call', r.length === 2 && r.filter(x => x.part === 'key2').length === 1 && r.some(x => x.part === 'key2' && x.p === '140' && x.cat === 'Materials' && x.tax === true && x.cost === 30) && r.some(x => x.n === 'TEST Service call' && x.p === '95' && !x.part), r);

    // open the saved job again: still one key, still priced once
    await pg.evaluate((jid) => { const el = document.querySelector('[data-open="' + jid + '"]'); if (!el) throw new Error('no card'); el.click(); }, jid); await pg.waitForSelector('#sjSave', { timeout: 8000 }); await sleep(1800);
    r = await form();
    check('opening the saved job: the key is on it (✓ Added), priced once — Charges $235.00, total $247.08', r.added === 1 && /^1 \/ /.test(r.onJob) && /Charges \$235\.00/.test(r.totals) && !/Keys picked above/.test(r.totals) && /Total \$247\.08/.test(r.totals), { added: r.added, onJob: r.onJob, totals: r.totals });

    // cancel it: the keys step now has something to name
    await pg.evaluate(() => { document.querySelector('#sjSt button[data-s="canceled"]').click(); document.getElementById('sjSave').click(); }); await sleep(900);
    await pg.evaluate(() => { const n = document.getElementById('rmNote'); if (n) n.value = 'TEST customer found the key'; document.getElementById('rmOk').click(); }); await sleep(1500);
    await pg.evaluate(() => document.getElementById('ksNow').click()); await sleep(1500);
    r = await pg.evaluate(() => { const m = Array.from(document.querySelectorAll('.sch-modal')).pop(); return m ? m.innerText.replace(/\s+/g, ' ') : ''; });
    check('cancelling that job: "Consolidate keys now" lists the key by name with Returned / Used', /Consolidate keys \/ parts/.test(r) && /Flip Key/.test(r) && /Returned/.test(r) && /Used/.test(r), r.slice(0, 300));
    await pg.screenshot({ path: path.join(OUT, 'estkey-cancel.png') });
    check('no errors', errs.length === 0, errs.slice(0, 4));
  } catch (e) { check('CRASH', false, String(e && e.stack || e).slice(0, 900)); }
  await b.close(); srv.close();
  console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'ALL PASSED'); process.exit(failed ? 1 : 0);
})();
