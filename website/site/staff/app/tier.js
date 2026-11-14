/* ============================================================================
   app/tier.js — subscription PLAN gating on the client (mirrors the server
   matrix public.tier_feature in supabase/phase8/8z136_billing_lock_and_notices.sql).
   The SERVER is the source of truth (tier_allows / require_tier); this only MIRRORS
   locks in the UI so the shop sees "upgrade to access" on features their plan doesn't
   include. It never grants access — gated RPCs re-check require_tier() server-side.
   Exposes window.TKS_TIER = { tier, allows, seats, seatsLeft, applyGates, showUpgrade, load,
                               matrix, navFeature, billing }.
   seatsLeft(): seats still free (allowed - used), or null when the shop has no known
   entitlement. 0 = full — staff-invite then answers 402 {error:'SEAT_LIMIT', used, allowed, tier}.

   8z136 (owner, 2026-11-13) — the shop's own Bittings bill:
     • a payment that did not go through → a red bar for the owner with the date to fix it by
       (7 days of grace), and a button straight to Stripe's page for updating the card
     • grace run out, plan ended, or no plan yet → a lock screen over the whole app. The owner
       updates the card or chooses a plan from it; everyone else is told to ask the owner.
       Nothing is deleted, and it unlocks by itself once the payment clears.
     • a founder price about to end → a note for the owner with the date and the new price
   The state comes from the database (public.billing_state); tier 'none' = nothing included.
   ========================================================================= */
(function () {
  // Client mirror of the server matrix (keep in sync with public.tier_feature — tools/qa/rebuild-plans-test.js compares them).
  var LOOKUP = ['lookup', 'keycodes', 'programmers', 'lishi'];
  var STARTER = LOOKUP.concat(['pos', 'receipts', 'customers', 'inventory', 'scheduler', 'fitment', 'estimates', 'leads']);
  var PRO = STARTER.concat(['commission', 'fleet', 'reports', 'dashboard', 'nastf', 'closeout', 'move_requests', 'timesheets', 'keysystems']);
  var MATRIX = { none: [], lookup: LOOKUP, starter: STARTER, pro: PRO };
  // 8k: 'fitment' = finding keys by vehicle (VIN box, year/make/model, FCC ID / chip, fits-first pickers) — Starter and up
  var FEATURE_LABEL = { fitment: 'Finding keys by vehicle (VIN, year / make / model, FCC ID)', pos: 'The Register', estimates: 'Quotes & estimates', leads: 'Leads',
    timesheets: 'Timesheets', keysystems: 'Key systems', nastf: 'NASTF paperwork', move_requests: 'Van stock requests', closeout: 'Closeout' };
  // nav data-go / data-links → feature key (null = every plan; not listed = never locked)
  var NAV_FEATURE = {
    payments: 'pos', startjob: 'pos', customers: 'customers', receipts: 'receipts', schedule: 'scheduler',
    commission: 'commission', inventory: 'inventory', fleet: 'fleet', programmers: 'programmers',
    dashboard: 'dashboard', history: 'closeout', reports: 'reports', lishi: 'lishi', settings: null,
    estimates: 'estimates', quote: 'estimates', leads: 'leads', timesheets: 'timesheets', keysystems: 'keysystems',
    reconcile: 'inventory', returns: 'inventory'
  };
  var TIER_LABEL = { none: 'No', lookup: 'Lookup', starter: 'Starter', pro: 'Pro' };
  var REGULAR = { lookup: 69, starter: 129, pro: 199 };          // regular monthly prices (the website's Plans block)
  var PLAN_BLURB = { lookup: 'The reference tools, for one person.', starter: 'Run the counter and the van. 2 users.', pro: 'For a shop with a team. 5 users.' };
  // lowest tier that unlocks a feature (for the upgrade prompt)
  function tierFor(feature) { for (var t of ['lookup', 'starter', 'pro']) if (MATRIX[t].indexOf(feature) >= 0) return t; return 'pro'; }

  var _tier = 'pro', _seats = { used: 0, allowed: 0 }, _bill = null;

  function tier() { return _tier; }
  function allows(feature) { if (!feature) return true; return (MATRIX[_tier] || MATRIX.lookup).indexOf(feature) >= 0; }
  function seats() { return _seats; }
  // (8m) free seats; null when the entitlement is unknown (no subscriptions row / not loaded)
  function seatsLeft() { var s = _seats || {}; if (!s.allowed) return null; return Math.max(0, Number(s.allowed) - Number(s.used || 0)); }
  function billing() { return _bill; }

  // Resolve the current tier: demo/offline → local flag; cloud → shop_tier() RPC.
  var _loadedAt = 0;
  function load(force) {
    try {
      if (localStorage.getItem('tks_demo_mode') === '1') {
        _tier = localStorage.getItem('tks_demo_tier') || 'pro';
        var staff = []; try { staff = JSON.parse(localStorage.getItem('tks_demo_staff') || '[]'); } catch (e) {}
        _seats = { used: staff.length, allowed: 5 }; _bill = null;
        applyGates(); paintBilling(); return Promise.resolve(_tier);
      }
    } catch (e) {}
    try {
      if (window.TKS && TKS.auth && TKS.auth.isSignedIn && TKS.auth.isSignedIn() && TKS._sb) {
        var sb = TKS._sb();
        // 8z64: this runs on every change notice; the plan does not change minute to minute. load(true) forces a fresh read.
        if (!force && _loadedAt && (Date.now() - _loadedAt) < 60000) { applyGates(); return Promise.resolve(_tier); }
        _loadedAt = Date.now();
        var soft = function (p) { return Promise.resolve(p).then(function (r) { return r; }, function () { return null; }); };
        return Promise.all([sb.rpc('shop_tier'), sb.rpc('seat_usage'), soft(sb.rpc('billing_state'))]).then(function (res) {
          if (res[0] && !res[0].error && res[0].data) _tier = res[0].data; else _loadedAt = 0;   // no answer → ask again on the next notice
          var su = res[1] && res[1].data && res[1].data[0]; if (su) _seats = { used: su.used, allowed: su.allowed };
          var bs = res[2] && !res[2].error && res[2].data; if (bs && typeof bs === 'object' && bs.state) _bill = bs;
          applyGates(); paintBilling(); return _tier;
        }).catch(function () { _loadedAt = 0; applyGates(); return _tier; });
      }
    } catch (e) {}
    applyGates(); return Promise.resolve(_tier);
  }

  function applyGates() {
    document.querySelectorAll('.bt-nav__item,.bt-bottomnav__item').forEach(function (el) {
      var f = NAV_FEATURE[el.dataset.go]; if (f === undefined) return;
      var locked = f && !allows(f);
      el.classList.toggle('tier-locked', !!locked);
      if (locked) el.setAttribute('title', TIER_LABEL[tierFor(f)] + ' plan — tap to upgrade'); else if (el.getAttribute('title') && /plan — tap to upgrade/.test(el.getAttribute('title'))) el.removeAttribute('title');
    });
    renderPill();
    // 8k: screens that gate their own controls by plan re-render once the tier is known
    try { if (window.renderInventory && document.getElementById('view-inventory') && document.getElementById('view-inventory').offsetParent !== null) renderInventory(); } catch (e) {}
  }

  function renderPill() {
    var host = document.getElementById('sideSignedIn'); if (!host || !host.parentElement) return;
    var pill = document.getElementById('tierPill');
    if (!pill) { pill = document.createElement('div'); pill.id = 'tierPill'; pill.className = 'tier-pill'; host.parentElement.insertBefore(pill, host); }
    var s = seats();
    pill.innerHTML = '<span class="tp-tier tp-' + _tier + '">' + (TIER_LABEL[_tier] || _tier) + ' plan</span>' +
      (s.allowed ? '<span class="tp-seats' + (seatsLeft() === 0 ? ' tp-seats--full' : '') + '"' +
        (seatsLeft() === 0 ? ' style="color:var(--amber,#f2b43a);font-weight:700" title="Seats full — upgrade your plan or add a seat to invite more staff"' : '') +
        '>' + s.used + '/' + s.allowed + ' seats' + (seatsLeft() === 0 ? ' · full' : '') + '</span>' : '') +
      (_tier !== 'pro' ? '<button class="tp-up" type="button">Upgrade ↑</button>' : '');
    var up = pill.querySelector('.tp-up'); if (up) up.onclick = function () { showUpgrade(null); };
  }

  // Intercept clicks on tier-locked nav (capture phase, before the data-go handler).
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('.bt-nav__item,.bt-bottomnav__item');
    if (el && el.classList.contains('tier-locked')) { e.preventDefault(); e.stopImmediatePropagation(); showUpgrade(el.dataset.go); }
  }, true);

  function showUpgrade(go) {
    // accepts a nav target (data-go) OR a feature key such as 'fitment' (8k)
    var feature = go ? (Object.prototype.hasOwnProperty.call(NAV_FEATURE, go) ? NAV_FEATURE[go] : go) : null;
    var need = feature ? tierFor(feature) : (_tier === 'lookup' || _tier === 'none' ? 'starter' : 'pro');
    var ov = document.getElementById('tierUpOv');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'tierUpOv'; ov.className = 'tier-up-ov';
      ov.innerHTML = '<div class="tier-up"><div class="tu-h">Upgrade your plan</div><div class="tu-b"></div>' +
        '<div class="tu-actions"><button class="tu-cancel" type="button">Not now</button><button class="tu-go" type="button">Upgrade</button></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('open'); });
      ov.querySelector('.tu-cancel').onclick = function () { ov.classList.remove('open'); };
    }
    var label = feature ? (FEATURE_LABEL[feature] || (feature.charAt(0).toUpperCase() + feature.slice(1))) : 'more features';
    ov.querySelector('.tu-b').innerHTML = 'Your shop is on the <b>' + (TIER_LABEL[_tier] || _tier) + '</b> plan. ' +
      (feature ? '<b>' + label + '</b> is included with the <b>' + TIER_LABEL[need] + '</b> plan.' : 'Unlock more with a higher plan.') +
      '<div class="tu-grid"><div class="tu-col' + (_tier === 'lookup' ? ' cur' : '') + '"><b>Lookup</b><span>VIN · Lishi · programmers · keycodes</span></div>' +
      '<div class="tu-col' + (_tier === 'starter' ? ' cur' : '') + '"><b>Starter</b><span>+ Register · Quotes · Receipts · Customers · Inventory · Scheduler · Leads · Keys by vehicle (VIN / year-make-model / FCC)</span></div>' +
      '<div class="tu-col' + (_tier === 'pro' ? ' cur' : '') + '"><b>Pro</b><span>+ Commission · Timesheets · Fleet · Reports · Dashboard · NASTF</span></div></div>';
    var goBtn = ov.querySelector('.tu-go'); goBtn.textContent = 'Upgrade to ' + TIER_LABEL[need];
    goBtn.onclick = function () { startCheckout(need); };
    ov.classList.add('open');
  }

  function startCheckout(targetTier) {
    // Stripe Checkout for the plan — or, for a shop that already has a subscription, Stripe's billing portal (billing-checkout decides).
    if (window.TKS_BILLING && TKS_BILLING.startCheckout) return TKS_BILLING.startCheckout(targetTier);
    (window.uiAlert || window.alert)('Billing is not set up on this device yet.');
  }

  /* ---------------- 8z136: the shop's own bill — bar, lock screen ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function dayOf(iso) { try { return new Date(iso).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); } catch (e) { return ''; } }
  function dateOf(iso) { try { return new Date(iso).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { return ''; } }
  function ensureStyle() {
    if (document.getElementById('billCss')) return;
    var st = document.createElement('style'); st.id = 'billCss';
    st.textContent =
      '#billBar{position:sticky;top:0;z-index:60;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 14px;margin:0 0 10px;border-radius:12px;font-size:14.5px;line-height:1.35;color:#fff;background:#b3262f;box-shadow:0 6px 20px rgba(0,0,0,.25)}' +
      '#billBar.note{background:#2f4a6b}' +
      '#billBar .bb-t{flex:1 1 240px;min-width:0}' +
      '#billBar button{flex:0 0 auto;min-height:40px;padding:8px 14px;border-radius:10px;border:0;font-weight:800;font-size:14px;cursor:pointer;background:#fff;color:#8f1f27}' +
      '#billBar.note button{color:#1d3350}' +
      /* above the phone's bottom menu (2147483000 — it sits over every pop-up), so a locked app cannot be used behind the lock;
         the app's own message boxes are lifted above the lock while it shows, so an error from one of its buttons can be read */
      'body.bill-locked .chg-modal-ov{z-index:2147483150 !important;bottom:0 !important}' +
      '#billLock{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,10,14,.94);overflow:auto}' +
      '#billLock .bl{width:100%;max-width:520px;margin:auto;background:var(--card,#1b1f27);color:var(--ink,#f2f4f7);border-radius:18px;padding:22px;box-shadow:0 20px 70px rgba(0,0,0,.6)}' +
      '#billLock h2{margin:0 0 8px;font-size:21px;line-height:1.25}' +
      '#billLock p{margin:0 0 12px;font-size:15px;line-height:1.5}' +
      '#billLock .bl-plans{display:grid;gap:10px;margin:14px 0}' +
      '#billLock .bl-plan{display:flex;align-items:center;gap:12px;border:1px solid var(--edge,rgba(255,255,255,.16));border-radius:12px;padding:12px}' +
      '#billLock .bl-plan div{flex:1 1 auto;min-width:0}' +
      '#billLock .bl-plan b{display:block;font-size:16px}' +
      '#billLock .bl-plan span{display:block;font-size:13px;color:var(--dim,#9aa1ac)}' +
      '#billLock button{min-height:44px;padding:10px 16px;border-radius:11px;border:1px solid var(--edge,rgba(255,255,255,.2));background:transparent;color:inherit;font-weight:700;font-size:15px;cursor:pointer}' +
      '#billLock button.go{background:var(--red,#c8323c);border-color:var(--red,#c8323c);color:#fff}' +
      '#billLock .bl-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:6px}' +
      '#billLock .bl-msg{min-height:20px;font-size:13.5px;color:var(--amber,#f2b43a);margin-top:10px}';
    document.head.appendChild(st);
  }
  function isDemo() { try { return localStorage.getItem('tks_demo_mode') === '1'; } catch (e) { return false; } }
  function openPortal() { if (window.TKS_BILLING && TKS_BILLING.openPortal) return TKS_BILLING.openPortal(); }
  function signOut() { try { TKS.auth.signOut().then(function () { location.reload(); }, function () { location.reload(); }); } catch (e) { location.reload(); } }
  function busy(btn, on) { if (!btn) return; btn.disabled = !!on; if (on) { btn.dataset.t = btn.textContent; btn.textContent = 'One moment…'; } else if (btn.dataset.t) btn.textContent = btn.dataset.t; }
  function run(btn, fn) { busy(btn, true); Promise.resolve().then(fn).then(function () { setTimeout(function () { busy(btn, false); }, 4000); }, function () { busy(btn, false); }); }

  var _noteHidden = null;
  function paintBilling() {
    var b = _bill, st = (b && !isDemo()) ? b.state : null, owner = !!(b && b.is_owner);
    paintBar(b, st, owner); paintLock(b, st, owner);
    // keep checking while something is wrong, so it clears by itself when the payment goes through
    clearTimeout(paintBilling._t);
    if (st && st !== 'ok' && st !== 'unknown') paintBilling._t = setTimeout(function () { load(true); }, Date.now() < _fastUntil ? 3000 : 30000);
  }
  function paintBar(b, st, owner) {
    var bar = document.getElementById('billBar'), html = '', note = false, act = null, label = '';
    if (owner && st === 'past_due') {
      html = '<b>Your Bittings payment did not go through.</b> Update the card by <b>' + esc(dayOf(b.grace_ends_at)) + '</b> to keep the shop running. Nothing is lost.';
      label = 'Update card'; act = openPortal;
    } else if (owner && st === 'ok' && b.founder_ends_at && !b.cancel_at) {
      var days = (Date.parse(b.founder_ends_at) - Date.now()) / 86400000, key = 'tks_founder_note_' + String(b.founder_ends_at).slice(0, 10), seen = null;
      try { seen = localStorage.getItem(key); } catch (e) {}
      if (days > 0 && days <= 45 && !seen && _noteHidden !== key) {
        note = true; label = 'OK';
        html = 'Your founder price ends on <b>' + esc(dateOf(b.founder_ends_at)) + '</b>. From then your ' + esc(TIER_LABEL[b.plan] || '') + ' plan is <b>$' + (REGULAR[b.plan] || '') + ' a month</b>. You do not need to do anything.';
        act = function () { _noteHidden = key; try { localStorage.setItem(key, '1'); } catch (e) {} paintBilling(); };
      }
    }
    if (!html) { if (bar) bar.remove(); return; }
    ensureStyle();
    if (!bar) { bar = document.createElement('div'); bar.id = 'billBar'; bar.setAttribute('role', 'alert');
      var host = document.querySelector('.bt-pagewrap') || document.body; host.insertBefore(bar, host.firstChild); }
    bar.className = note ? 'note' : '';
    bar.innerHTML = '<div class="bb-t">' + html + '</div><button type="button">' + label + '</button>';
    var btn = bar.querySelector('button'); btn.onclick = function () { if (note) act(); else run(btn, act); };
  }
  function paintLock(b, st, owner) {
    var lock = document.getElementById('billLock');
    var on = st === 'locked' || st === 'ended' || st === 'none';
    try { document.body.classList.toggle('bill-locked', on); } catch (e) {}
    if (!on) { if (lock) lock.remove(); return; }
    var sig = st + '|' + owner;
    if (lock && lock.dataset.sig === sig) return;          // already showing this — don't wipe a button mid-tap
    ensureStyle();
    if (!lock) { lock = document.createElement('div'); lock.id = 'billLock'; lock.setAttribute('role', 'dialog'); lock.setAttribute('aria-modal', 'true'); document.body.appendChild(lock); }
    lock.dataset.sig = sig;
    var h = '<div class="bl">';
    if (!owner) {
      h += '<h2>Bittings is paused for this shop</h2><p>The shop\'s Bittings subscription needs the owner\'s attention. Nothing has been deleted. Ask the owner to sign in and sort out the payment; Bittings unlocks by itself after that.</p>';
    } else if (st === 'locked') {
      h += '<h2>Bittings is paused for this shop</h2><p>The last payment did not go through and the ' + esc(b.grace_days || 7) + ' days to fix it have run out. <b>Nothing has been deleted.</b> Update the card and Bittings unlocks by itself as soon as the payment goes through.</p>' +
        '<div class="bl-row"><button type="button" class="go" data-a="portal">Update card</button></div>';
    } else {
      h += '<h2>' + (st === 'ended' ? 'Your plan has ended' : 'Choose a plan to start') + '</h2><p>' +
        (st === 'ended' ? 'Your shop\'s data is still here. Choose a plan to carry on.' : 'Pick the plan for your shop. You can change it later.') +
        ' You will see the exact price, including any founder discount, on the next screen before you pay.</p><div class="bl-plans">' +
        ['lookup', 'starter', 'pro'].map(function (t) {
          return '<div class="bl-plan" data-row="' + t + '"><div><b>' + TIER_LABEL[t] + ' · $' + REGULAR[t] + ' / month</b><span>' + PLAN_BLURB[t] + '</span></div><button type="button" class="go" data-plan="' + t + '">Choose</button></div>';
        }).join('') + '</div>';
      // the founder price, when this shop qualifies (asked from the server — it knows; the screen never guesses)
      try { if (window.TKS_BILLING && TKS_BILLING.offer) TKS_BILLING.offer().then(function (o) {
        var lk = document.getElementById('billLock'); if (!o || !lk || lk.dataset.sig !== sig) return;
        ['lookup', 'starter', 'pro'].forEach(function (t) {
          var row = lk.querySelector('.bl-plan[data-row="' + t + '"]'); if (!row) return;
          if (o.plans && o.plans[t] === false) { row.querySelector('button').disabled = true; row.querySelector('span').textContent = 'Not available to buy yet.'; return; }
          if (o.founder) { var off = Number(o.founder_off) || 50, mo = Number(o.founder_months) || 12;
            row.querySelector('b').textContent = TIER_LABEL[t] + ' · $' + (REGULAR[t] - off) + ' / month';
            row.querySelector('span').textContent = PLAN_BLURB[t] + ' Founder price for your first ' + mo + ' months, then $' + REGULAR[t] + '.'; }
        });
      }, function () {}); } catch (e) {}
    }
    h += '<div class="bl-row"><button type="button" data-a="check">Check again</button><button type="button" data-a="out">Sign out</button></div><div class="bl-msg" aria-live="polite"></div></div>';
    lock.innerHTML = h;
    lock.onclick = function (e) {
      var btn = e.target.closest && e.target.closest('button'); if (!btn) return;
      var msg = lock.querySelector('.bl-msg');
      if (btn.dataset.plan) run(btn, function () { return startCheckout(btn.dataset.plan); });
      else if (btn.dataset.a === 'portal') run(btn, openPortal);
      else if (btn.dataset.a === 'out') signOut();
      else if (btn.dataset.a === 'check') { busy(btn, true); load(true).then(function () { busy(btn, false); if (document.getElementById('billLock') && msg) msg.textContent = 'Still waiting for the payment. If you have just paid, give it a minute.'; }); }
    };
  }

  // Back from Stripe (checkout or the billing portal): look every few seconds for a minute, then clean the address.
  var _fastUntil = 0;
  try {
    var m = /[?&]billing=(success|portal|cancel)\b/.exec(location.search);
    if (m) {
      if (m[1] !== 'cancel') _fastUntil = Date.now() + 60000;
      var clean = location.pathname + location.search.replace(/([?&])billing=[a-z]+&?/, '$1').replace(/[?&]$/, '') + location.hash;
      history.replaceState(null, '', clean);
    }
  } catch (e) {}
  document.addEventListener('visibilitychange', function () { if (!document.hidden && _bill && _bill.state !== 'ok') load(true); });

  window.TKS_TIER = { tier: tier, allows: allows, seats: seats, seatsLeft: seatsLeft, applyGates: applyGates, showUpgrade: showUpgrade, load: load,
    matrix: MATRIX, navFeature: NAV_FEATURE, billing: billing };
  if (document.readyState !== 'loading') load(); else document.addEventListener('DOMContentLoaded', load);
})();
