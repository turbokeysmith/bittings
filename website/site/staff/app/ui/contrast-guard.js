/* ============================================================================
   app/ui/contrast-guard.js — dark-mode readability (8z70, owner 2026-11-12).
   ----------------------------------------------------------------------------
   "I've seen multiple pages with white backgrounds and silver writing. You can't
    see it. I like dark mode, so make sure I can actually see what I'm supposed to."

   The app's dark mode is a mix on purpose: the page is dark, but many cards,
   pop-ups and forms stay white (they read like printed cards). Text colours come
   from theme variables, so a white card inside the dark page could get the dark
   theme's pale text (white on white), and text sitting directly on the dark page
   could get the light theme's dim grey (dark grey on black).

   Two layers, DARK MODE ONLY (light mode is untouched):
   1. A few CSS rules for the systemic cases (below, injected once).
   2. A guard that looks at every piece of visible text, measures it against what
      is really behind it, and — only when it is too faint to read — moves the
      SAME colour darker or lighter until it is readable (a green tag stays
      green). It runs after each screen change, so pop-ups and screens nobody
      listed are covered as well. Switching back to light mode removes every
      change it made.
   Readability target: WCAG 4.5:1 for normal text, 3:1 for large / bold text.
   ============================================================================ */
(function () {
  'use strict';
  if (window.TKS_CONTRAST) return;
  var DOC = document, ROOT = DOC.documentElement;
  function dark() { return ROOT.getAttribute('data-bt-theme') === 'dark'; }

  // ---- 1. systemic rules ----
  try {
    var st = DOC.createElement('style'); st.id = 'tkContrastCss';
    st.textContent = [
      /* the "third-level" text colour of the dark theme was #5a616c — 2.6:1 on the dark page (bottom bar, counts, captions) */
      'html[data-bt-theme="dark"]{ --text-tertiary:#98a0ac; }',
      'html[data-bt-theme="dark"] .bt-bottomnav__item:not(.is-active){ color:#aab1bc; }',
      /* placeholders: readable on a dark field by default; the guard sets --tk-ph for a field that is white */
      'html[data-bt-theme="dark"] input::placeholder, html[data-bt-theme="dark"] textarea::placeholder{ color:var(--tk-ph,#9aa3af) !important; opacity:1 !important; }',
      /* white pop-ups / cards that inherited the dark theme\'s pale text: give them the light theme\'s ink */
      'html[data-bt-theme="dark"] :is(#stkCard, .stk-card){ color:#14171b; --ink:#14171b; --dim:#4b5563; --off:#6b7280; --text-primary:#14171b; --text-secondary:#374151; --text-tertiary:#5b6472; }',
      /* buttons that sit directly on the dark page and used the light theme\'s dim grey */
      'html[data-bt-theme="dark"] :is(#backBtn, #signOutBtn){ color:#d5d9e0; border-color:#4a515c; }',
      /* side menu: the active item was brand red on a dark red tint (2.3:1) */
      'html[data-bt-theme="dark"] .bt-sidebar .bt-nav__item.is-active{ color:#ffa3ac; }',
      'html[data-bt-theme="dark"] #view-schedule .av{ color:#14171b; }',
      /* the red "required" star on a dark form */
      'html[data-bt-theme="dark"] .qi-box .req{ color:#ff8a94; }'
    ].join('\n');
    (DOC.head || ROOT).appendChild(st);
  } catch (e) {}

  // ---- 2. the guard ----
  function parse(c) { var m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; var p = m[1].split(/[ ,\/]+/).map(parseFloat); return { r: p[0], g: p[1], b: p[2], a: (p.length > 3 && !isNaN(p[3])) ? p[3] : 1 }; }
  function lin(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
  function over(t, u) { var a = t.a; return { r: t.r * a + u.r * (1 - a), g: t.g * a + u.g * (1 - a), b: t.b * a + u.b * (1 - a), a: 1 }; }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toHsl(c) { var r = c.r / 255, g = c.g / 255, b = c.b / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4); h /= 6; } return { h: h, s: s, l: l }; }
  function fromHsl(o) { var h = o.h, s = o.s, l = o.l; function f(p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    if (!s) { var v = Math.round(l * 255); return { r: v, g: v, b: v, a: 1 }; } var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    return { r: Math.round(f(p, q, h + 1 / 3) * 255), g: Math.round(f(p, q, h) * 255), b: Math.round(f(p, q, h - 1 / 3) * 255), a: 1 }; }
  var pageBg = null;
  function basePage() { if (pageBg) return pageBg; var b = { r: 20, g: 23, b: 27, a: 1 };
    try { var hb = parse(getComputedStyle(ROOT).backgroundColor), bb = parse(getComputedStyle(DOC.body).backgroundColor); if (hb && hb.a > 0) b = over(hb, b); if (bb && bb.a > 0) b = over(bb, b); } catch (e) {} pageBg = b; return b; }
  // what is really behind this element: its own / its ancestors' backgrounds, composited
  function bgOf(el, memo) {
    var chain = [], n = el, hit = null;
    while (n && n.nodeType === 1) {
      if (memo && memo.has(n)) { hit = memo.get(n); break; }
      var cs = getComputedStyle(n), c = parse(cs.backgroundColor), img = cs.backgroundImage;
      if (img && img !== 'none' && /gradient/.test(img)) { var g = img.match(/rgba?\([^)]+\)/g); if (g && g.length) { var gc = parse(g[g.length - 1]); if (gc && gc.a > 0.5) { chain.push({ n: n, c: gc }); if (gc.a >= 0.99) break; } } }
      else if (c && c.a > 0) { chain.push({ n: n, c: c }); if (c.a >= 0.99) break; }
      else chain.push({ n: n, c: null });
      n = n.parentElement;
    }
    var out = hit || basePage();
    for (var i = chain.length - 1; i >= 0; i--) { if (chain[i].c) out = over(chain[i].c, out); if (memo) memo.set(chain[i].n, out); }
    return out;
  }
  // same hue, moved away from the background until it can be read. `op` = how see-through the text is (a dimmed row),
  // so the test is made on what the eye actually gets. Tries lighter and darker and keeps whichever can be read
  // (white on an amber pill cannot be; black can).
  function readable(fg, bg, limit, op) {
    function seenAs(c) { return over({ r: c.r, g: c.g, b: c.b, a: op }, bg); }
    function walk(up) { var h = toHsl(fg), c = fg, r = 0;
      for (var i = 0; i < 26; i++) { h.l = up ? Math.min(1, h.l + 0.04) : Math.max(0, h.l - 0.04); c = fromHsl(h); r = ratio(seenAs(c), bg); if (r >= limit || h.l <= 0 || h.l >= 1) break; }
      return { c: c, r: r }; }
    var first = walk(lum(bg) < 0.4); if (first.r >= limit) return first.c;
    var other = walk(lum(bg) >= 0.4); if (other.r >= limit) return other.c;
    var w = { r: 255, g: 255, b: 255, a: 1 }, k = { r: 17, g: 19, b: 23, a: 1 };
    return ratio(seenAs(w), bg) >= ratio(seenAs(k), bg) ? w : k;
  }
  function css(c) { return 'rgb(' + Math.round(c.r) + ',' + Math.round(c.g) + ',' + Math.round(c.b) + ')'; }
  var done = new WeakSet(), SKIP = /^(SCRIPT|STYLE|NOSCRIPT|OPTION|OPTGROUP|IFRAME|CANVAS|SVG|PATH|TEXT|TSPAN|IMG|VIDEO)$/i;
  var ICON = /^[\s←-⯿\u{1F000}-\u{1FFFF}️‍•·×✕✓›‹+\-–—|\/().,:*#]+$/u;

  function check(el, memo) {
    if (done.has(el) || SKIP.test(el.tagName)) return;
    if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return;   // not shown yet — look again when it is
    var cs = getComputedStyle(el); if (cs.visibility === 'hidden') return;
    done.add(el);
    var field = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    if (field && /^(checkbox|radio|hidden|file|range|color|button|submit|image)$/.test(el.type || '')) return;
    var bg = bgOf(el, memo), big = parseFloat(cs.fontSize) >= 18 || (parseFloat(cs.fontSize) >= 14 && parseInt(cs.fontWeight, 10) >= 700), limit = big ? 3 : 4.5;
    var op = 1, n = el; while (n && n.nodeType === 1) { op *= parseFloat(getComputedStyle(n).opacity || '1'); n = n.parentElement; }
    var own = parseFloat(cs.opacity || '1');
    var fg = parse(cs.color); if (!fg) return;
    var seen = over({ r: fg.r, g: fg.g, b: fg.b, a: fg.a * op }, bg);
    if (ratio(seen, bg) < limit) {
      var want = readable({ r: fg.r, g: fg.g, b: fg.b, a: 1 }, bg, limit + 0.3, Math.max(0.05, fg.a * op));
      el.style.setProperty('color', css(want), 'important'); el.setAttribute('data-tkc', '1');
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.style.setProperty('-webkit-text-fill-color', css(want), 'important');
      if (own < 0.8) { el.style.setProperty('opacity', '0.85', 'important'); el.setAttribute('data-tkc', '2'); }
    }
    if (field && el.tagName !== 'SELECT') {   // the grey hint inside an empty box
      var ph = lum(bg) > 0.4 ? { r: 95, g: 104, b: 117, a: 1 } : { r: 154, g: 163, b: 175, a: 1 };
      el.style.setProperty('--tk-ph', css(ph)); if (!el.hasAttribute('data-tkc')) el.setAttribute('data-tkc', 'p');
    }
  }
  var queue = null, running = false;
  function pass() {
    if (!dark() || running) return; running = true; pageBg = null;
    var memo = new Map(), list = [];
    try {
      var w = DOC.createTreeWalker(DOC.body, NodeFilter.SHOW_TEXT, null), t;
      while ((t = w.nextNode())) { var s = t.nodeValue; if (!s || !s.trim()) continue; var p = t.parentElement; if (!p || done.has(p) || SKIP.test(p.tagName)) continue; if (ICON.test(s.trim())) continue; list.push(p); }
      var f = DOC.querySelectorAll('input,textarea,select'); for (var i = 0; i < f.length; i++) if (!done.has(f[i])) list.push(f[i]);
    } catch (e) {}
    var k = 0;
    (function slice(deadline) {
      var t0 = Date.now();
      while (k < list.length && (Date.now() - t0) < 14) { try { check(list[k], memo); } catch (e) {} k++; }
      if (k < list.length) { (window.requestIdleCallback || function (fn) { return setTimeout(fn, 30); })(slice, { timeout: 200 }); }
      else running = false;
    })();
  }
  function schedule() { if (queue) return; queue = setTimeout(function () { queue = null; pass(); }, 180); }
  function forget(el) {
    if (!done.has(el)) return; done.delete(el);
    if (el.hasAttribute('data-tkc')) { el.style.removeProperty('color'); el.style.removeProperty('-webkit-text-fill-color'); if (el.getAttribute('data-tkc') === '2') el.style.removeProperty('opacity'); el.removeAttribute('data-tkc'); }
  }
  function clear() {   // light mode: undo everything the guard did
    try { DOC.querySelectorAll('[data-tkc]').forEach(function (el) { el.style.removeProperty('color'); el.style.removeProperty('-webkit-text-fill-color'); el.style.removeProperty('--tk-ph'); if (el.getAttribute('data-tkc') === '2') el.style.removeProperty('opacity'); el.removeAttribute('data-tkc'); }); } catch (e) {}
    done = new WeakSet();
  }
  function start() {
    try {
      new MutationObserver(function (muts) {
        for (var i = 0; i < muts.length; i++) { var m = muts[i];
          if (m.type === 'attributes' && m.target === ROOT) { clear(); schedule(); return; }           // theme switched
          if (m.type === 'attributes' && m.attributeName === 'style' && m.target.hasAttribute && m.target.hasAttribute('data-tkc')) continue;   // our own change
          // a class or style change can re-colour a small control (a menu item becoming the active one, a button
          // switching on): forget what was decided for it and its few children and look again
          if (m.type === 'attributes' && m.target.nodeType === 1 && m.target !== DOC.body) { var kids = m.target.getElementsByTagName('*');
            if (kids.length <= 40) { forget(m.target); for (var j = 0; j < kids.length; j++) forget(kids[j]); } }
          schedule(); }
      }).observe(ROOT, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-bt-theme', 'hidden', 'open'] });
    } catch (e) {}
    window.addEventListener('pageshow', schedule);
    schedule();
  }
  window.TKS_CONTRAST = { run: pass, clear: clear, busy: function () { return running || !!queue; } };
  if (DOC.body) start(); else DOC.addEventListener('DOMContentLoaded', start);
})();
