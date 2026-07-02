/* ============================================================================
   app/timeclock.js — shift + machine-lock + time tracking (owner spec 2026-07-02).
   ----------------------------------------------------------------------------
   window.TKS_CLOCK. Ties "using the machine" to "being on the clock":

     • Full login (username+password on the login page) → arrives here signed in
       → AUTO CLOCK-IN for the day (shift_clock_in, idempotent).
     • Idle for N minutes (default 5, Settings) OR the "Lock now" button →
       LOCK overlay. A PIN unlocks:
         – same user's PIN  → just unlock (still clocked in — NOT a re-clock-in),
         – a teammate's PIN → SWITCH session to them (server mints the token) so
           their actions credit correctly; blocked unless they're clocked in,
           except a 6-digit manager/owner PIN which can always take the machine,
         – wrong PIN        → message + offer full logout / login as new user.
     • Clock out (Lunch / Personal / End of Day) → clock out + FULL logout →
       returning needs username+password again.

   SAFETY: two switches, BOTH default OFF, and BOTH required to arm anything —
     • shop setting  Config.timeclock.enabled   (Settings → Time clock; per shop)
     • per-device    localStorage tks_tc_device  ("this is a shop workstation")
   So turning the shop feature on does nothing until you also mark the shop PC.
   Phones (device flag off) never lock and never auto-clock. When inactive this
   module adds NO overlay and changes NO existing behavior.
   ========================================================================== */
(function () {
  'use strict';
  var DEVICE_KEY = 'tks_tc_device';           // per-device "lock this workstation"
  var idleTimer = null, armed = false, overlay = null, clockedInThisSession = false, pinBuf = '';

  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function cfg() { try { return (TKS.Config.get().timeclock) || {}; } catch (e) { return {}; } }
  function featureOn() { return !!cfg().enabled; }
  function deviceOn() { try { return localStorage.getItem(DEVICE_KEY) === '1'; } catch (e) { return false; } }
  function idleMs() { var m = parseInt(cfg().idleMin, 10); if (!(m > 0)) m = 5; return m * 60 * 1000; }
  function signedIn() { try { return !!(TKS.auth && TKS.auth.isSignedIn()); } catch (e) { return false; } }
  // Active only when the shop feature + this device are BOTH on AND we're signed
  // into the cloud (a real session is what the lock protects and the clock needs).
  function active() { return featureOn() && deviceOn() && signedIn() && !!sb(); }

  // --------------------------------------------------------------- clock in --
  function autoClockIn() {
    var c = sb(); if (!c || clockedInThisSession) return;
    clockedInThisSession = true;                       // guard: once per loaded session
    try { c.rpc('shift_clock_in').then(function () {}, function () {}); } catch (e) {}
  }

  // ----------------------------------------------------------------- idle ----
  function resetIdle() {
    if (!armed) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(lock, idleMs());
  }
  var IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
  function arm() {
    if (armed) return; armed = true;
    IDLE_EVENTS.forEach(function (e) { document.addEventListener(e, resetIdle, { passive: true }); });
    resetIdle();
  }
  function disarm() {
    armed = false;
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    IDLE_EVENTS.forEach(function (e) { document.removeEventListener(e, resetIdle, { passive: true }); });
  }

  // ----------------------------------------------------------- lock overlay --
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shopName() { try { return (TKS.Config.identity().name || '').trim() || 'this workstation'; } catch (e) { return 'this workstation'; } }
  function whoName() { try { return (TKS.auth.email() || 'the current user'); } catch (e) { return 'the current user'; } }

  function buildOverlay() {
    var o = document.createElement('div');
    o.id = 'tcLock';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:linear-gradient(180deg,#0b0e12,#141922);color:#fff;display:flex;align-items:center;justify-content:center;padding:20px;font-family:inherit';
    o.innerHTML =
      '<div style="width:100%;max-width:360px;text-align:center">' +
        '<div style="font-size:34px">🔒</div>' +
        '<div style="font-weight:800;font-size:20px;margin-top:6px">' + esc(shopName()) + ' — locked</div>' +
        '<div id="tcWho" class="sub" style="color:#9aa3af;margin:6px 0 14px;font-size:13px"></div>' +
        '<div id="tcDots" style="letter-spacing:10px;font-size:30px;min-height:38px;margin-bottom:6px"></div>' +
        '<div id="tcMsg" style="min-height:20px;font-size:13px;margin-bottom:10px;color:#f0a0a6"></div>' +
        '<div id="tcPad" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:260px;margin:0 auto">' +
          [1,2,3,4,5,6,7,8,9].map(function (n) { return padBtn(n); }).join('') +
          '<button data-k="clear" style="' + padCss() + '">⌫</button>' +
          padBtn(0) +
          '<button data-k="ok" style="' + padCss() + '">✓</button>' +
        '</div>' +
        '<div style="margin-top:18px;border-top:1px solid rgba(255,255,255,.14);padding-top:14px">' +
          '<div class="sub" style="color:#9aa3af;font-size:12px;margin-bottom:8px">Done for now? Clock out (this also logs you out):</div>' +
          '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">' +
            outBtn('lunch', '🍔 Lunch') + outBtn('personal', '🚶 Personal') + outBtn('end_of_day', '🌙 End of day') +
          '</div>' +
          '<button id="tcFullLogin" style="margin-top:14px;background:none;border:none;color:#7fb8ff;cursor:pointer;font-size:13px;text-decoration:underline">Not you? Full logout / log in as someone else</button>' +
        '</div>' +
      '</div>';
    return o;
  }
  function padCss() { return 'font-size:22px;font-weight:700;padding:16px 0;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;cursor:pointer;min-height:58px'; }
  function padBtn(n) { return '<button data-k="' + n + '" style="' + padCss() + '">' + n + '</button>'; }
  function outBtn(reason, label) { return '<button data-out="' + reason + '" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;font-weight:600;cursor:pointer">' + label + '</button>'; }

  function renderDots() {
    var d = document.getElementById('tcDots'); if (d) d.textContent = pinBuf.replace(/./g, '•') || ' ';
  }
  function msg(m) { var e = document.getElementById('tcMsg'); if (e) e.textContent = m || ''; }

  function lock() {
    if (!active()) return;                             // never lock when inactive
    if (overlay) return;                               // already locked
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    pinBuf = '';
    overlay = buildOverlay();
    document.body.appendChild(overlay);
    var who = document.getElementById('tcWho'); if (who) who.textContent = 'Signed in: ' + whoName();
    renderDots();
    overlay.querySelector('#tcPad').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; var k = b.dataset.k;
      if (k === 'clear') { pinBuf = pinBuf.slice(0, -1); msg(''); renderDots(); return; }
      if (k === 'ok') { submitPin(); return; }
      if (/^[0-9]$/.test(k) && pinBuf.length < 6) { pinBuf += k; msg(''); renderDots();
        if (pinBuf.length === 4 || pinBuf.length === 6) { /* wait for ✓ so 4-digit staff can extend? no: */ } }
    });
    overlay.querySelectorAll('[data-out]').forEach(function (btn) {
      btn.onclick = function () { clockOut(btn.dataset.out); };
    });
    overlay.querySelector('#tcFullLogin').onclick = fullLogout;
  }

  function unlockUI() {
    if (overlay) { overlay.remove(); overlay = null; }
    pinBuf = '';
    resetIdle();                                       // restart the idle countdown
  }

  // ------------------------------------------------------------- PIN submit --
  function submitPin() {
    var c = sb(); if (!c) { msg('No cloud connection.'); return; }
    if (pinBuf.length !== 4 && pinBuf.length !== 6) { msg('Enter your 4-digit (staff) or 6-digit (manager) PIN.'); return; }
    var pin = pinBuf; msg('Checking…');
    c.functions.invoke('pin-unlock', { body: { pin: pin } }).then(function (r) {
      var d = r && r.data, err = r && r.error;
      if (err && !d) { msg('Could not check the PIN — try again.'); pinBuf = ''; renderDots(); return; }
      if (d && d.mode === 'unlock') { unlockUI(); return; }
      if (d && d.mode === 'switch') {
        msg('Switching to ' + (d.user ? d.user.name : 'teammate') + '…');
        c.auth.verifyOtp({ type: 'magiclink', token_hash: d.token_hash }).then(function (v) {
          if (v && v.error) { msg('Switch failed — use full login.'); return; }
          // Manager who wasn't clocked in → clock them in now, then reload as them.
          var finish = function () { location.reload(); };
          if (d.clocked_in === false) { try { c.rpc('shift_clock_in').then(finish, finish); } catch (e) { finish(); } }
          else finish();
        }, function () { msg('Switch failed — use full login.'); });
        return;
      }
      // errors from the function body (401/409/etc surface as d.error via invoke)
      var em = (d && d.error) || (err && err.message) || 'Incorrect PIN.';
      msg(em); pinBuf = ''; renderDots();
    }, function () { msg('Could not reach the server — try again.'); pinBuf = ''; renderDots(); });
  }

  // ----------------------------------------------------- clock out + logout --
  function clockOut(reason) {
    var c = sb(); if (!c) { fullLogout(); return; }
    msg('Clocking out…');
    var done = function () { try { c.auth.signOut().then(function () { location.reload(); }, function () { location.reload(); }); } catch (e) { location.reload(); } };
    try { c.rpc('shift_clock_out', { p_reason: reason }).then(done, done); } catch (e) { done(); }
  }
  function fullLogout() {
    var c = sb();
    try { if (c) c.auth.signOut().then(function () { location.reload(); }, function () { location.reload(); }); else location.reload(); }
    catch (e) { location.reload(); }
  }

  // ------------------------------------------------------------------ API ----
  var TKS_CLOCK = {
    // Called after the app connects to the cloud (or on load). Idempotent.
    init: function () {
      if (!active()) { disarm(); return; }
      autoClockIn();
      arm();
    },
    lockNow: function () { if (active()) lock(); },
    isActive: active,
    // Settings helpers (per-device flag)
    deviceEnabled: deviceOn,
    setDeviceEnabled: function (on) { try { localStorage.setItem(DEVICE_KEY, on ? '1' : '0'); } catch (e) {} this.init(); }
  };
  window.TKS_CLOCK = TKS_CLOCK;

  // Re-evaluate whenever settings likely changed or the tab regains focus.
  window.addEventListener('focus', function () { try { TKS_CLOCK.init(); } catch (e) {} });
})();
