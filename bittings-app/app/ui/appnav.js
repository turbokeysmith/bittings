/* ============================================================================
   Persistent app navigation (shared)
   A fixed bottom bar that is ALWAYS on screen on every staff sub-page and never
   scrolls away. Same 5 destinations everywhere: Home · Receipts · Customers ·
   Scheduler · Lishi. Drop-in: <script src="app/ui/appnav.js"></script> near the
   end of <body>. It injects its own CSS + markup, highlights the current page,
   reserves space at the bottom so nothing hides behind it, and lifts the
   scheduler's own bottom button bar above it.
   NOTE: bittings.html (Receipts) builds an equivalent bar inline because its
   full-height chat layout needs the bar as a flex child, not a fixed overlay —
   do NOT also load this there.
   ========================================================================== */
(function(){
  if(window.__TK_APPNAV__) return; window.__TK_APPNAV__ = true;

  // Embedded inside the dashboard (iframe)? Then the parent's left menu IS the navigation —
  // don't show our own bar, and hide this page's "‹ Apps" back-links so they can't nest the
  // dashboard inside itself. (Runs at end of <body>, so the page's anchors already exist.)
  try{
    if(window.self !== window.top){
      var fn = function(){
        var bn = document.getElementById('tkAppNav'); if(bn) bn.style.display='none';
        document.querySelectorAll('a[href="index.html"], a[href^="index.html?"]').forEach(function(a){ a.style.display='none'; });
      };
      if(document.body) fn(); else document.addEventListener('DOMContentLoaded', fn);
      return;
    }
  }catch(e){ return; }

  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  var H = 56; // bar height (not counting the iPhone safe-area inset)

  var TABS = [
    { label:'Home',      ic:'🏠', href:'index.html',              page:'index.html'    },
    { label:'Receipts',  ic:'🧾', href:'bittings.html',           page:'bittings.html' },
    { label:'Customers', ic:'👤', href:'index.html?go=customers',  page:'__customers'   },
    { label:'Scheduler', ic:'📅', href:'scheduler.html',          page:'scheduler.html'},
    { label:'Lishi',     ic:'🔑', href:'lishi.html',              page:'lishi.html'    }
  ];

  var css = [
    '#tkAppNav{position:fixed;left:0;right:0;bottom:0;z-index:9000;display:flex;',
      'background:#1f1f1f;border-top:1px solid #3a3a3a;',
      'padding-bottom:env(safe-area-inset-bottom);',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}',
    '#tkAppNav a{flex:1;min-width:0;text-decoration:none;color:#9aa1ac;',
      'font-size:10px;font-weight:600;line-height:1.2;text-align:center;',
      'display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 2px 6px;',
      '-webkit-tap-highlight-color:transparent;}',
    '#tkAppNav a .ic{font-size:18px;line-height:1;}',
    '#tkAppNav a.active{color:#fff;}',
    '#tkAppNav a.active .ic{filter:drop-shadow(0 0 4px rgba(200,50,50,.6));}',
    '#tkAppNav a:active{background:#2a2a2a;}',
    /* reserve space so page content is never hidden behind the bar */
    'body{padding-bottom:calc(' + H + 'px + env(safe-area-inset-bottom)) !important;}',
    /* the scheduler wizard has its own fixed bottom button bar (.nav) — lift it above ours */
    '.nav{bottom:calc(' + H + 'px + env(safe-area-inset-bottom)) !important;}'
  ].join('');

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  function build(){
    if(document.getElementById('tkAppNav')) return;
    var nav = document.createElement('nav');
    nav.id = 'tkAppNav';
    nav.setAttribute('aria-label','Main navigation');
    nav.innerHTML = TABS.map(function(t){
      var active = (t.page === page) ? ' class="active"' : '';
      return '<a href="' + t.href + '"' + active + '>' +
             '<span class="ic">' + t.ic + '</span>' + t.label + '</a>';
    }).join('');
    document.body.appendChild(nav);
  }

  if(document.body) build();
  else document.addEventListener('DOMContentLoaded', build);
})();
