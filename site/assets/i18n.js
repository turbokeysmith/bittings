/* ==========================================================================
   Language toggle — NAVIGATES between an English page and its full Spanish
   (/es/) mirror, instead of doing partial in-place translation.

   Why: the /es/ pages are complete, hand-written Spanish. The old in-place
   toggle only swapped the elements that had data-i18n (nav, trust strip,
   footer headings), leaving the body in English — a half-translated page.
   Navigating to the real /es/ page gives 100% Spanish (and vice-versa).

   Target URL = the page's own <link rel="alternate" hreflang="…"> (so it's
   always the correct counterpart); we use only its PATHNAME so it works on
   the pages.dev preview and the live domain alike. Falls back to computing
   the path if the hreflang link is missing.
   ========================================================================== */
(function () {
  function isSpanish() { return /(^|\/)es(\/|$)/.test(location.pathname || '/'); }

  function counterpartPath() {
    var es = isSpanish();
    var link = document.querySelector(
      es ? 'link[rel="alternate"][hreflang="en"]' : 'link[rel="alternate"][hreflang="es"]'
    );
    if (link && link.getAttribute('href')) {
      try { return new URL(link.href, location.href).pathname; } catch (e) {}
    }
    var p = location.pathname || '/';
    if (es) return p.replace(/(^|\/)es(\/|$)/, '$1');          // /es/automotive/ -> /automotive/
    return (p === '/' || p === '') ? '/es/' : '/es' + p;        // /automotive/ -> /es/automotive/
  }

  var GLOBE = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" aria-hidden="true" style="display:inline-block;flex:none"><circle cx="12" cy="12" r="9"/>' +
    '<path d="M3 12h18"/><path d="M12 3c2.6 2.6 2.6 15.4 0 18M12 3c-2.6 2.6-2.6 15.4 0 18"/></svg>';

  function inject() {
    if (document.getElementById('langToggleBtn')) return;
    var es = isSpanish();
    var a = document.createElement('a');
    a.id = 'langToggleBtn';
    a.className = 'langtoggle';
    a.href = counterpartPath();
    a.setAttribute('aria-label', es ? 'Switch to English' : 'Cambiar a Español');
    a.innerHTML = GLOBE + '<span>' + (es ? 'EN' : 'ES') + '</span>';

    // New premium header (converted pages): drop it into .navcta, right of Call now.
    var navcta = document.querySelector('header .navcta');
    if (navcta) {
      var nt = navcta.querySelector('.navtoggle');
      if (nt) navcta.insertBefore(a, nt); else navcta.appendChild(a);
      return;
    }
    // Legacy two-row header (not-yet-converted pages incl. /es/).
    var bar = document.querySelector('header.site .bar');
    if (!bar) return;
    var ref = bar.querySelector('.navtoggle') || bar.querySelector('.head-call');
    if (ref) bar.insertBefore(a, ref); else bar.appendChild(a);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
