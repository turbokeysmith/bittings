/* ==========================================================================
   bittings-ui.js — theme toggle + persistence for the Bittings reskin.
   Studio (light) is the default; Tactical (dark) is opt-in and remembered.
   No dependencies. Safe to load with a normal <script src> before </body>.
   ========================================================================== */
(function () {
  var KEY = 'bt_theme'; // 'light' | 'dark'

  function current() {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function apply(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-bt-theme', 'dark');
    else document.documentElement.removeAttribute('data-bt-theme');
    // reflect on any toggle controls
    document.querySelectorAll('.bt-themetoggle [data-bt-set]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-bt-set') === theme);
    });
    // keep the browser chrome colour in sync
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14171b' : '#f6f7f9');
  }
  function set(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    apply(theme);
  }

  // expose
  window.BittingsTheme = { get: current, set: set, toggle: function () { set(current() === 'dark' ? 'light' : 'dark'); } };

  // wire any .bt-themetoggle buttons + apply saved theme once the DOM is ready
  function init() {
    document.querySelectorAll('.bt-themetoggle [data-bt-set]').forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-bt-set')); });
    });
    apply(current());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  No-flash snippet — paste this in <head> of every page, BEFORE the stylesheet,
  so a remembered dark theme is applied before first paint:

  <script>try{if(localStorage.getItem('bt_theme')==='dark')document.documentElement.setAttribute('data-bt-theme','dark');}catch(e){}</script>

  Toggle markup (drop in the sidebar footer or top bar):

  <div class="bt-themetoggle">
    <button data-bt-set="light">☀ Light</button>
    <button data-bt-set="dark">🌙 Dark</button>
  </div>
*/
