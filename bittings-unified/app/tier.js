/* ============================================================================
   app/tier.js — subscription TIER gating on the client (mirrors the server
   matrix in supabase/phase4/4a_tiers.sql). The SERVER is the source of truth
   (tier_allows / require_tier); this only MIRRORS locks in the UI so the shop
   sees "upgrade to access" on features their plan doesn't include. It never
   grants access — gated RPCs re-check require_tier() server-side.
   Exposes window.TKS_TIER = { tier, allows, seats, applyGates, showUpgrade, load }.
   ========================================================================= */
(function () {
  // Client mirror of the server CASE matrix (keep in sync with 4a_tiers.sql).
  var MATRIX = {
    lookup: ['lookup', 'keycodes', 'programmers', 'lishi'],
    starter: ['lookup', 'keycodes', 'programmers', 'lishi', 'pos', 'receipts', 'customers', 'inventory', 'scheduler'],
    pro: ['lookup', 'keycodes', 'programmers', 'lishi', 'pos', 'receipts', 'customers', 'inventory', 'scheduler', 'commission', 'fleet', 'reports', 'dashboard', 'nastf', 'closeout', 'move_requests']
  };
  // nav data-go / data-links → feature key
  var NAV_FEATURE = {
    payments: 'pos', startjob: 'pos', customers: 'customers', receipts: 'receipts', schedule: 'scheduler',
    commission: 'commission', inventory: 'inventory', fleet: 'fleet', programmers: 'programmers',
    dashboard: 'dashboard', history: 'closeout', reports: 'reports', lishi: 'lishi', settings: null
  };
  var TIER_LABEL = { lookup: 'Lookup', starter: 'Starter', pro: 'Pro' };
  var TIER_RANK = { lookup: 0, starter: 1, pro: 2 };
  // lowest tier that unlocks a feature (for the upgrade prompt)
  function tierFor(feature) { for (var t of ['lookup', 'starter', 'pro']) if (MATRIX[t].indexOf(feature) >= 0) return t; return 'pro'; }

  var _tier = 'pro', _seats = { used: 0, allowed: 0 };

  function tier() { return _tier; }
  function allows(feature) { if (!feature) return true; return (MATRIX[_tier] || MATRIX.lookup).indexOf(feature) >= 0; }
  function seats() { return _seats; }

  // Resolve the current tier: demo/offline → local flag; cloud → shop_tier() RPC.
  function load() {
    try {
      if (localStorage.getItem('tks_demo_mode') === '1') {
        _tier = localStorage.getItem('tks_demo_tier') || 'pro';
        var staff = []; try { staff = JSON.parse(localStorage.getItem('tks_demo_staff') || '[]'); } catch (e) {}
        _seats = { used: staff.length, allowed: 5 };
        applyGates(); return Promise.resolve(_tier);
      }
    } catch (e) {}
    try {
      if (window.TKS && TKS.auth && TKS.auth.isSignedIn && TKS.auth.isSignedIn() && TKS._sb) {
        var sb = TKS._sb();
        return Promise.all([sb.rpc('shop_tier'), sb.rpc('seat_usage')]).then(function (res) {
          if (res[0] && !res[0].error && res[0].data) _tier = res[0].data;
          var su = res[1] && res[1].data && res[1].data[0]; if (su) _seats = { used: su.used, allowed: su.allowed };
          applyGates(); return _tier;
        }).catch(function () { applyGates(); return _tier; });
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
  }

  function renderPill() {
    var host = document.getElementById('sideSignedIn'); if (!host || !host.parentElement) return;
    var pill = document.getElementById('tierPill');
    if (!pill) { pill = document.createElement('div'); pill.id = 'tierPill'; pill.className = 'tier-pill'; host.parentElement.insertBefore(pill, host); }
    var s = seats();
    pill.innerHTML = '<span class="tp-tier tp-' + _tier + '">' + (TIER_LABEL[_tier] || _tier) + ' plan</span>' +
      (s.allowed ? '<span class="tp-seats">' + s.used + '/' + s.allowed + ' seats</span>' : '') +
      (_tier !== 'pro' ? '<button class="tp-up" type="button">Upgrade ↑</button>' : '');
    var up = pill.querySelector('.tp-up'); if (up) up.onclick = function () { showUpgrade(null); };
  }

  // Intercept clicks on tier-locked nav (capture phase, before the data-go handler).
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('.bt-nav__item,.bt-bottomnav__item');
    if (el && el.classList.contains('tier-locked')) { e.preventDefault(); e.stopImmediatePropagation(); showUpgrade(el.dataset.go); }
  }, true);

  function showUpgrade(go) {
    var feature = go ? NAV_FEATURE[go] : null;
    var need = feature ? tierFor(feature) : (_tier === 'lookup' ? 'starter' : 'pro');
    var ov = document.getElementById('tierUpOv');
    if (!ov) {
      ov = document.createElement('div'); ov.id = 'tierUpOv'; ov.className = 'tier-up-ov';
      ov.innerHTML = '<div class="tier-up"><div class="tu-h">Upgrade your plan</div><div class="tu-b"></div>' +
        '<div class="tu-actions"><button class="tu-cancel" type="button">Not now</button><button class="tu-go" type="button">Upgrade</button></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('open'); });
      ov.querySelector('.tu-cancel').onclick = function () { ov.classList.remove('open'); };
    }
    var label = feature ? (feature.charAt(0).toUpperCase() + feature.slice(1)) : 'more features';
    ov.querySelector('.tu-b').innerHTML = 'Your shop is on the <b>' + (TIER_LABEL[_tier] || _tier) + '</b> plan. ' +
      (feature ? '<b>' + label + '</b> is included with the <b>' + TIER_LABEL[need] + '</b> plan.' : 'Unlock more with a higher plan.') +
      '<div class="tu-grid"><div class="tu-col' + (_tier === 'lookup' ? ' cur' : '') + '"><b>Lookup</b><span>VIN · Lishi · programmers · keycodes</span></div>' +
      '<div class="tu-col' + (_tier === 'starter' ? ' cur' : '') + '"><b>Starter</b><span>+ Register · Receipts · Customers · Inventory · Scheduler</span></div>' +
      '<div class="tu-col' + (_tier === 'pro' ? ' cur' : '') + '"><b>Pro</b><span>+ Commission · Fleet · Reports · Dashboard · NASTF</span></div></div>';
    var goBtn = ov.querySelector('.tu-go'); goBtn.textContent = 'Upgrade to ' + TIER_LABEL[need];
    goBtn.onclick = function () { startCheckout(need); };
    ov.classList.add('open');
  }

  function startCheckout(targetTier) {
    // Stripe Checkout (subscription) — TEST MODE. Wired in app via the billing
    // edge function; until test keys are configured this surfaces a clear notice.
    if (window.TKS_BILLING && TKS_BILLING.startCheckout) { TKS_BILLING.startCheckout(targetTier); return; }
    (window.uiAlert || window.alert)('Billing is not configured yet (Stripe test keys pending). This will open Stripe Checkout for the ' + (TIER_LABEL[targetTier] || targetTier) + ' plan.');
  }

  window.TKS_TIER = { tier: tier, allows: allows, seats: seats, applyGates: applyGates, showUpgrade: showUpgrade, load: load };
  if (document.readyState !== 'loading') load(); else document.addEventListener('DOMContentLoaded', load);
})();
