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

/* ===== Live Google-review tally =====
   Pages ship a static "250+" fallback; this swaps in the real count from the
   widgets Worker (updated every 6h from Google). Cached in localStorage for
   an hour so repeat views update instantly with no network wait. */
(function () {
  var API = 'https://turbokeysmith-widgets.turbokeysmith.workers.dev/stats';
  var RE = /250\+/g;

  function apply(total) {
    if (!total || total < 250) return; // never show something lower than the old floor
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node, hits = [];
    while ((node = walker.nextNode())) {
      var tag = node.parentNode && node.parentNode.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') continue;
      if (RE.test(node.nodeValue)) hits.push(node);
      RE.lastIndex = 0;
    }
    for (var i = 0; i < hits.length; i++) {
      hits[i].nodeValue = hits[i].nodeValue.replace(RE, String(total) + '+');
    }
  }

  function start() {
    try {
      var cached = JSON.parse(localStorage.getItem('tkReviewStats') || 'null');
      if (cached && cached.total) apply(cached.total);
      if (cached && Date.now() - cached.at < 3600000) return;
    } catch (e) {}
    fetch(API).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.total) return;
      apply(d.total);
      try { localStorage.setItem('tkReviewStats', JSON.stringify({ total: d.total, at: Date.now() })); } catch (e) {}
    }).catch(function () {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
