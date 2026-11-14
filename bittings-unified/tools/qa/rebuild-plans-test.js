// 8z136 — plans and the shop's own bill: the menu locks by plan, a failed payment shows a bar, and a shop with no usable plan is locked (app/tier.js). Standalone page + fake cloud. Port 8103.
const http = require('http'), fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer');
const ROOT = path.resolve(__dirname, '..', '..'), PORT = 8103, BASE = 'http://127.0.0.1:' + PORT, OUT = path.join(__dirname, 'out');
let fails = 0; const check = (name, ok, info) => { if (ok) console.log('ok   ' + name); else { fails++; console.log('FAIL ' + name + '  → ' + JSON.stringify(info)); } };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const NAVS = ['payments', 'customers', 'receipts', 'schedule', 'commission', 'inventory', 'fleet', 'programmers', 'dashboard', 'history', 'reports', 'lishi', 'settings', 'estimates', 'leads', 'timesheets', 'keysystems', 'activity'];
const PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body>
<style>body{background:#11141a;color:#f2f4f7;font-family:system-ui;margin:0;padding:12px}:root{--card:#1b1f27;--ink:#f2f4f7;--dim:#9aa1ac;--edge:rgba(255,255,255,.16);--red:#c8323c;--amber:#f2b43a}.bt-nav__item{font-size:9px;padding:1px 3px;margin:1px}</style>
<main class="bt-main"><div class="bt-pagewrap"><header class="app">x</header></div></main>
<div><div id="sideSignedIn">TEST Owner</div></div>
${NAVS.map(x => `<button class="bt-nav__item" data-go="${x}">${x}</button>`).join('\n')}
<script>
  window.FAKE = { tier:'pro', seats:{used:2, allowed:5}, bill:{state:'ok', tier:'pro', plan:'pro', is_owner:true, grace_days:7}, calls:[] };
  Object.assign(FAKE, JSON.parse(new URLSearchParams(location.search).get('s')||'{}'));
  window.TKS = { auth:{ isSignedIn:()=>true, signOut:()=>{ FAKE.calls.push('signOut'); try{ sessionStorage.setItem('signedOut','1'); }catch(e){} return Promise.resolve(); } },
    _sb:()=>({ rpc:(n)=>{ FAKE.calls.push('rpc:'+n); if(n==='shop_tier') return Promise.resolve({data:FAKE.tier,error:null}); if(n==='seat_usage') return Promise.resolve({data:[FAKE.seats],error:null});
      if(n==='billing_state'){ if(FAKE.noBill) return Promise.resolve({data:null,error:{message:'not found'}}); return Promise.resolve({data:FAKE.bill,error:null}); } return Promise.resolve({data:null,error:{message:'unknown'}}); } }) };
  window.TKS_BILLING = { startCheckout:(t)=>{ FAKE.calls.push('checkout:'+t); }, openPortal:()=>{ FAKE.calls.push('portal'); } };
  if (FAKE.offer) TKS_BILLING.offer = ()=>Promise.resolve(FAKE.offer);   // what the server says this shop is offered
</script>
<script src="/app/tier.js"></script></body>`;
const srv = http.createServer((q, s) => { const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/t.html') { s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return s.end(PAGE); }
  if (p === '/blank.html') { s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return s.end('<!doctype html><body>blank'); }
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }); s.end(d); }); });
const iso = (days) => new Date(Date.now() + days * 864e5).toISOString();
const bill = (o) => Object.assign({ state: 'ok', tier: 'pro', plan: 'pro', is_owner: true, grace_days: 7 }, o);
const STARTER_LOCKED = 'commission,dashboard,fleet,history,keysystems,reports,timesheets';
const LOOKUP_OPEN = ['programmers', 'lishi', 'settings', 'activity'], NONE_OPEN = ['settings', 'activity'];
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new' }); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  // open a scenario fresh: clean storage (plus any storage preset), then the page
  const open = async (scn, opts) => { opts = opts || {};
    await pg.goto(BASE + '/blank.html'); await pg.evaluate((ls) => { localStorage.clear(); sessionStorage.clear(); for (const k in ls) localStorage.setItem(k, ls[k]); }, opts.ls || {});
    await pg.goto(BASE + '/t.html?s=' + encodeURIComponent(JSON.stringify(scn || {})) + (opts.extra || ''), { waitUntil: 'load' }); await sleep(opts.wait || 450); };
  const q = (sel) => pg.evaluate((s) => !!document.querySelector(s), sel);
  const txt = (sel) => pg.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
  const clickBtn = (scope, text) => pg.evaluate((sc, t) => { const bt = [].find.call(document.querySelectorAll(sc + ' button'), x => x.textContent.trim() === t); if (bt) bt.click(); return !!bt; }, scope, text);
  const btnTexts = (scope) => pg.evaluate((sc) => [].map.call(document.querySelectorAll(sc + ' button'), x => x.textContent.trim()), scope);
  const calls = () => pg.evaluate(() => FAKE.calls.filter(c => !/^rpc:/.test(c)));
  const lockedNav = () => pg.evaluate(() => [].filter.call(document.querySelectorAll('.bt-nav__item.tier-locked'), x => x.dataset.go).map(x => x.dataset.go).sort().join());
  const expectLocked = (tier) => pg.evaluate((t) => [].filter.call(document.querySelectorAll('.bt-nav__item'), el => { const f = TKS_TIER.navFeature[el.dataset.go]; return f !== undefined && f !== null && TKS_TIER.matrix[t].indexOf(f) < 0; }).map(x => x.dataset.go).sort().join(), tier);
  const lockedPlan = (open_) => NAVS.filter(x => open_.indexOf(x) < 0).sort().join();
  try {
    // 1 - menu by plan
    const plans = { pro: '', starter: STARTER_LOCKED, lookup: lockedPlan(LOOKUP_OPEN), none: lockedPlan(NONE_OPEN) };
    const label = { pro: 'Pro plan: nothing in the menu is locked', starter: 'Starter plan: only Commission, Fleet, Dashboard, History, Reports, Timesheets and Key systems are locked',
      lookup: 'Lookup plan: everything is locked except Programmers, Lishi, Settings and Activity', none: 'No plan: everything is locked except Settings and Activity' };
    for (const t of ['pro', 'starter', 'lookup', 'none']) {
      await open({ tier: t, bill: bill({ tier: t, plan: t }) });
      const got = await lockedNav(), exp = await expectLocked(t);
      check(label[t], got === plans[t], { got, expected: plans[t] });
      check(label[t].split(':')[0] + ': the menu agrees with the plan table in the code (TKS_TIER.matrix and navFeature)', exp === plans[t] && got === exp, { fromTable: exp, hardCoded: plans[t], got });
    }

    // 2 - upgrade box
    await open({ tier: 'starter', bill: bill({ tier: 'starter', plan: 'starter' }) });
    await pg.evaluate(() => document.querySelector('[data-go="timesheets"]').click()); await sleep(100);
    let r = await pg.evaluate(() => ({ open: document.getElementById('tierUpOv').classList.contains('open'), btn: document.querySelector('#tierUpOv .tu-go').textContent }));
    check('Starter: tapping a locked item (Timesheets) opens the upgrade box', r.open, r);
    check('The upgrade box button reads "Upgrade to Pro"', r.btn === 'Upgrade to Pro', r);
    await pg.evaluate(() => document.querySelector('#tierUpOv .tu-go').click());
    check('Tapping "Upgrade to Pro" starts the Pro checkout', (await calls()).join() === 'checkout:pro', await calls());

    // 3 - ok
    await open({ tier: 'pro', bill: bill() });
    check('A shop in good standing sees no red bar and no lock screen', !(await q('#billBar')) && !(await q('#billLock')), null);

    // 4 - past due, owner
    const due = iso(3);
    await open({ tier: 'starter', bill: bill({ state: 'past_due', tier: 'starter', plan: 'starter', grace_ends_at: due }) });
    const dayWords = await pg.evaluate((d) => ({ wd: new Date(d).toLocaleDateString([], { weekday: 'long' }), mo: new Date(d).toLocaleDateString([], { month: 'long' }) }), due);
    let bt = await txt('#billBar') || '';
    check('Payment failed (owner): a bar says the payment "did not go through" and gives the date to fix it by (' + dayWords.wd + ', ' + dayWords.mo + ')', /did not go through/.test(bt) && bt.includes(dayWords.wd) && bt.includes(dayWords.mo), bt);
    check('Payment failed (owner): the shop is not locked yet and the menu still follows the Starter plan', !(await q('#billLock')) && (await lockedNav()) === STARTER_LOCKED, await lockedNav());
    await pg.screenshot({ path: path.join(OUT, 'plans-bar-pastdue.png') });
    await clickBtn('#billBar', 'Update card'); await sleep(100);
    check('The bar\'s "Update card" button opens Stripe\'s card page (portal)', (await calls()).join() === 'portal', await calls());

    // 5 - past due, not owner
    await open({ tier: 'starter', bill: bill({ state: 'past_due', tier: 'starter', plan: 'starter', is_owner: false, grace_ends_at: due }) });
    check('Payment failed (not the owner): no bar and no lock screen', !(await q('#billBar')) && !(await q('#billLock')), null);

    // 6 - locked, owner
    await open({ tier: 'none', bill: bill({ state: 'locked', tier: 'none', plan: 'pro' }) });
    bt = await txt('#billLock') || ''; let bts = await btnTexts('#billLock');
    check('Locked (owner): the lock screen says Bittings is "paused" and "Nothing has been deleted"', /paused/.test(bt) && /Nothing has been deleted/.test(bt), bt);
    check('Locked (owner): buttons are "Update card", "Check again" and "Sign out" and there are no plan choices', bts.indexOf('Update card') >= 0 && bts.indexOf('Check again') >= 0 && bts.indexOf('Sign out') >= 0 && !(await q('#billLock [data-plan]')), bts);
    await clickBtn('#billLock', 'Update card'); await sleep(100);
    check('Locked (owner): "Update card" opens Stripe\'s card page (portal)', (await calls()).join() === 'portal', await calls());

    // 7 - locked, not owner
    await open({ tier: 'none', bill: bill({ state: 'locked', tier: 'none', plan: 'pro', is_owner: false }) });
    bt = await txt('#billLock') || ''; bts = await btnTexts('#billLock');
    check('Locked (not the owner): the lock screen tells them to ask the owner', /ask the owner/i.test(bt), bt);
    check('Locked (not the owner): no "Update card" button and no plan choices, but "Sign out" is there', bts.indexOf('Update card') < 0 && !(await q('#billLock [data-plan]')) && bts.indexOf('Sign out') >= 0, bts);
    await Promise.all([pg.waitForNavigation({ waitUntil: 'load', timeout: 5000 }).catch(() => null), clickBtn('#billLock', 'Sign out')]);
    await sleep(300);
    check('Locked (not the owner): "Sign out" signs them out', await pg.evaluate(() => sessionStorage.getItem('signedOut') === '1'), null);

    // 8 - none, owner
    await open({ tier: 'none', bill: bill({ state: 'none', tier: 'none', plan: null }) });
    bt = await txt('#billLock') || '';
    const plansShown = await pg.evaluate(() => [].map.call(document.querySelectorAll('#billLock [data-plan]'), x => x.dataset.plan).join());
    check('No plan yet (owner): three plans to choose (Lookup, Starter, Pro) at $69, $129 and $199', plansShown === 'lookup,starter,pro' && /\$69/.test(bt) && /\$129/.test(bt) && /\$199/.test(bt), { plansShown, bt });
    await pg.screenshot({ path: path.join(OUT, 'plans-lock-owner.png') });
    await pg.evaluate(() => document.querySelector('#billLock [data-plan="starter"]').click()); await sleep(100);
    check('Choosing Starter starts the Starter checkout', (await calls()).join() === 'checkout:starter', await calls());

    // 8b - the founder price, when the server says this shop qualifies; a plan that cannot be bought yet is switched off
    await open({ tier: 'none', bill: bill({ state: 'none', tier: 'none', plan: null }), offer: { plans: { lookup: true, starter: true, pro: false }, founder: true, founder_off: 50, founder_months: 12 } });
    const fo = await pg.evaluate(() => ({ lookup: document.querySelector('#billLock [data-row="lookup"]').textContent, starter: document.querySelector('#billLock [data-row="starter"]').textContent,
      proOff: document.querySelector('#billLock [data-plan="pro"]').disabled, pro: document.querySelector('#billLock [data-row="pro"]').textContent }));
    check('A shop that qualifies sees the founder price: Starter $79 / month for the first 12 months, then $129 (Lookup $19, then $69)', /Starter · \$79 \/ month/.test(fo.starter) && /first 12 months, then \$129/.test(fo.starter) && /Lookup · \$19 \/ month/.test(fo.lookup) && /then \$69/.test(fo.lookup), fo);
    check('A plan that is not set up to be bought yet cannot be chosen', fo.proOff === true && /Not available/.test(fo.pro), fo);
    await pg.screenshot({ path: path.join(OUT, 'plans-lock-founder.png') });
    await open({ tier: 'none', bill: bill({ state: 'none', tier: 'none', plan: null }), offer: { plans: { lookup: true, starter: true, pro: true }, founder: false } });
    check('A shop that does not qualify (it has subscribed before) sees the regular prices', /Starter · \$129 \/ month/.test(await txt('#billLock [data-row="starter"]') || ''), await txt('#billLock [data-row="starter"]'));

    // 9 - ended, owner
    await open({ tier: 'none', bill: bill({ state: 'ended', tier: 'none', plan: 'pro' }) });
    const h2 = await txt('#billLock h2') || '';
    check('Plan ended (owner): the heading says "Your plan has ended" and the three plans are offered', /Your plan has ended/.test(h2) && (await pg.evaluate(() => document.querySelectorAll('#billLock [data-plan]').length)) === 3, h2);

    // 10 - unlocks by itself after Check again
    await open({ tier: 'none', bill: bill({ state: 'locked', tier: 'none', plan: 'pro' }) });
    check('(setup) the shop starts locked', await q('#billLock'), null);
    await pg.evaluate(() => { FAKE.tier = 'starter'; FAKE.bill = { state: 'ok', tier: 'starter', plan: 'starter', is_owner: true }; });
    await clickBtn('#billLock', 'Check again'); await sleep(500);
    check('Once the payment has gone through, "Check again" removes the lock and the Starter menu applies', !(await q('#billLock')) && (await lockedNav()) === STARTER_LOCKED, { lock: await q('#billLock'), nav: await lockedNav() });

    // 11 - still locked
    await open({ tier: 'none', bill: bill({ state: 'locked', tier: 'none', plan: 'pro' }) });
    await clickBtn('#billLock', 'Check again'); await sleep(500);
    const msg = await txt('#billLock .bl-msg') || '';
    check('"Check again" while still locked says "Still waiting for the payment"', /Still waiting/.test(msg) && await q('#billLock'), msg);

    // 12 - back from Stripe
    await open({ tier: 'none', bill: bill({ state: 'locked', tier: 'none', plan: 'pro' }) }, { extra: '&billing=success' });
    check('Back from Stripe: "billing=" is cleaned out of the address', !(await pg.evaluate(() => location.search.indexOf('billing=') >= 0)), await pg.evaluate(() => location.search));
    check('(setup) still locked right after coming back', await q('#billLock'), null);
    await sleep(600);
    await pg.evaluate(() => { FAKE.tier = 'starter'; FAKE.bill = { state: 'ok', tier: 'starter', plan: 'starter', is_owner: true }; });
    let gone = true; try { await pg.waitForFunction(() => !document.getElementById('billLock'), { timeout: 5500, polling: 200 }); } catch (e) { gone = false; }
    check('Back from Stripe: the lock disappears by itself within a few seconds of the payment clearing (no tap)', gone, null);

    // 13 - founder note
    const fb = (o) => ({ tier: 'starter', bill: bill(Object.assign({ tier: 'starter', plan: 'starter', founder_ends_at: iso(40) }, o)) });
    const fscn = fb(), fkey = fscn.bill.founder_ends_at;
    await open(fscn);
    bt = await txt('#billBar') || '';
    check('Founder price ending in 40 days (owner): a calm note says "founder price ends" and "$129 a month"', await q('#billBar.note') && /founder price ends/.test(bt) && /\$129 a month/.test(bt), bt);
    await clickBtn('#billBar', 'OK'); await sleep(100);
    check('Tapping OK removes the founder note', !(await q('#billBar')), null);
    await pg.evaluate(() => TKS_TIER.load(true)); await sleep(300);
    check('The founder note stays gone after the shop re-reads its plan', !(await q('#billBar')), null);
    await pg.reload({ waitUntil: 'load' }); await sleep(450);
    check('The founder note stays gone after the page is reloaded (remembered on this device)', !(await q('#billBar')) && await pg.evaluate((d) => Object.keys(localStorage).some(k => k.indexOf(d.slice(0, 10)) >= 0), fkey), await pg.evaluate(() => Object.keys(localStorage)));
    await open({ tier: 'starter', bill: bill({ tier: 'starter', plan: 'starter', founder_ends_at: iso(80) }) });
    check('Founder price ending in 80 days: no note yet', !(await q('#billBar')), await txt('#billBar'));
    await open(fb({ is_owner: false }));
    check('Founder price ending: staff who are not the owner see no note', !(await q('#billBar')), await txt('#billBar'));
    await open(fb({ cancel_at: iso(20) }));
    check('Founder price ending but the plan is being cancelled: no note', !(await q('#billBar')), await txt('#billBar'));

    // 14 - demo mode
    await open({ tier: 'pro', bill: bill({ state: 'locked', tier: 'none', plan: 'pro' }) }, { ls: { tks_demo_mode: '1', tks_demo_tier: 'starter' } });
    check('Demo mode: never locked, no bar, and the Starter plan applies to the menu', !(await q('#billLock')) && !(await q('#billBar')) && (await lockedNav()) === STARTER_LOCKED, { lock: await q('#billLock'), nav: await lockedNav() });
    await pg.goto(BASE + '/blank.html'); await pg.evaluate(() => localStorage.clear());

    // 15 - older server with no billing_state
    await open({ tier: 'starter', noBill: true });
    check('An older server without billing_state: no bar, no lock, and the menu is still gated by plan', !(await q('#billBar')) && !(await q('#billLock')) && (await lockedNav()) === STARTER_LOCKED, { nav: await lockedNav() });

    // 16
    check('no script errors', errs.length === 0, errs);
  } catch (e) { fails++; console.log('CRASH ' + (e && e.stack || e)); }
  await b.close(); srv.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
