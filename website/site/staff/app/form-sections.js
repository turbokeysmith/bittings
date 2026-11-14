/* form-sections.js  (8z158)
   Owner, 2026-11-14: the quote / invoice form is "very very long" on a phone. This file shortens it WITHOUT touching the
   form's own rules: after the form has built itself, it takes the form's existing rows and moves them (appendChild —
   never a copy, so every id and every listener the form attached still works) into collapsing sections.
     - one section open at a time; a finished section shrinks to ONE LINE that shows its answer
     - the total and the Save buttons stay pinned at the bottom of the screen
     - an error message opens the section that holds the field to fix
   TKS_SECTIONS.apply(box, config)      generic
   TKS_SECTIONS.quoteForm(modalOrBox)   the config for the quote / invoice builder (.qi-ov / .qi-box)
   Nothing here is needed for the form to work: if anything is missing, the section is skipped and the form is as it was. */
(function () {
  'use strict';
  if (window.TKS_SECTIONS) return;

  // ---------- CSS (once) ----------
  function injectCss() {
    if (document.getElementById('qsStyle')) return;
    var st = document.createElement('style'); st.id = 'qsStyle';
    st.textContent = [
      // the box's background must be explicit so the pinned footer (background:inherit) is right in light AND dark mode
      '.qi-box{background:#fff}',
      '[data-bt-theme="dark"] .qi-box{background:#1f232a}',
      '.qs{border:1px solid #e3e6ea;border-left:4px solid #e3e6ea;border-radius:10px;margin:8px 0;min-width:0;scroll-margin-top:8px}',
      '.qs.open{border-left-color:#c8323c}',
      '.qs-h{display:flex;align-items:center;gap:8px;width:100%;min-height:48px;box-sizing:border-box;padding:8px 12px;margin:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '.qs-ic{flex:0 0 auto;font-size:18px;line-height:1}',
      '.qs-t{flex:0 0 auto;font-weight:800}',
      '.qs-s{flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#5a616c;font-size:14px;text-align:right}',
      '.qs-s.empty{opacity:.6;font-style:italic}',
      '.qs.open .qs-s{display:none}',
      '.qs.open .qs-t{flex:1 1 auto}',
      '.qs-c{flex:0 0 auto;color:#5a616c}',
      '.qs-b{padding:0 12px 12px;min-width:0}',
      '.qs-b[hidden]{display:none}',
      // the Job section's button rows (Type / Service / NASTF) wrap into extra rows at the form's 84px minimum: let them share a row
      '.qs-b .qi-seg button{min-width:0;padding:8px 3px;font-size:12.5px}',
      '.qs-b .qi-l:first-child{margin-top:4px}',
      '.qs-next{display:block;width:100%;min-height:44px;margin-top:12px;border:1px solid #c8323c;border-radius:10px;background:transparent;color:#c8323c;font:inherit;font-weight:800;cursor:pointer}',
      '.qs-mode{display:block;margin:0 0 0 auto;min-height:32px;padding:4px 8px;border:0;background:none;color:#5a616c;font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}',
      // the pinned bar is the LAST child of the box: in the scroller it sticks to the bottom, and at the very end of the
      // form it is simply the last thing, so the content above it can always be scrolled fully clear of it
      '.qs-foot{position:sticky;bottom:0;z-index:3;background:inherit;margin:8px -16px -16px;padding:8px 16px max(8px,env(safe-area-inset-bottom));border-top:1px solid #dfe3e8;box-shadow:0 -6px 12px -8px rgba(0,0,0,.28);border-radius:0 0 16px 16px}',
      '.qs-foot .qi-err:empty{display:none}',
      '.qs-foot .qi-err{margin:0 0 6px}',
      '.qs-bar{display:flex;align-items:center;gap:10px}',
      '.qs-total{display:flex;flex-direction:column;flex:0 0 auto;line-height:1.1}',
      '.qs-total span{font-size:11px;color:#5a616c}',
      '.qs-total b{font-size:18px;font-weight:800}',
      '.qs-act{display:flex;gap:8px;flex:1 1 0;min-width:0}',
      '.qs-act>button{flex:1 1 0;min-width:0;min-height:48px;margin:0;padding:6px 8px;font-size:14px;line-height:1.15;white-space:normal}',
      '.qs-off,.qs-empty{display:none!important}',
      '.qs-all .qs-next{display:none}',
      '[data-bt-theme="dark"] .qs-total span{color:#9aa1ac}',
      '[data-bt-theme="dark"] .qs{border-color:#3a414c;border-left-color:#3a414c}',
      '[data-bt-theme="dark"] .qs.open{border-left-color:#e0525c}',
      '[data-bt-theme="dark"] .qs-s,[data-bt-theme="dark"] .qs-c,[data-bt-theme="dark"] .qs-mode{color:#9aa1ac}',
      '[data-bt-theme="dark"] .qs-next{border-color:#e0525c;color:#ff8d95}',
      '[data-bt-theme="dark"] .qs-foot{border-top-color:#3a414c;box-shadow:0 -6px 12px -8px rgba(0,0,0,.7)}',
      // 8z159: the Scheduler's job form (.sch-modal .sheet) colours itself with CSS variables, so the sections follow them (light AND dark)
      '.sch-modal .sheet .qs{border-color:var(--edge);border-left-color:var(--edge)}',
      '.sch-modal .sheet .qs.open{border-left-color:#c8323c}',
      '.sch-modal .sheet .qs-s,.sch-modal .sheet .qs-c,.sch-modal .sheet .qs-mode,.sch-modal .sheet .qs-total span{color:var(--dim)}',
      '.sch-modal .sheet .qs-t,.sch-modal .sheet .qs-total b{color:var(--ink)}',
      '.sch-modal .sheet .qs-next{border-color:#c8323c;color:#c8323c;background:transparent}',
      '.sch-modal .sheet .qs-s.empty{padding:0;text-align:right;font-size:14px;line-height:normal}',   // the page has a global .empty{padding:40px 10px;text-align:center}
      '.sch-modal .sheet .qs-b>label:first-child{margin-top:0}',
      '.sch-modal .sheet .qs-b .row2{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}',
      '.sch-modal .sheet .qs-b .row2>div,.sch-modal .sheet .qs-b input,.sch-modal .sheet .qs-b select{min-width:0;max-width:100%}',
      '.sch-modal .sheet .qs-foot{background:var(--card,#fff);margin:8px -18px -18px;padding:8px 18px max(8px,env(safe-area-inset-bottom));border-top:1px solid var(--edge)}',
      '.sch-modal .sheet .qs-foot .msg{margin:0 0 4px;min-height:0;font-size:12.5px;line-height:1.25}',
      '.sch-modal .sheet .qs-foot .msg:empty{display:none}',
      '.sch-modal .sheet .qs-act>.btn{border-radius:11px}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  function childOf(box, el) {   // the direct child of box that holds el (or null)
    while (el && el.parentNode !== box) el = el.parentNode;
    return el || null;
  }
  function safe(fn, box, dflt) { try { var v = fn(box); return v == null ? dflt : v; } catch (e) { return dflt; } }
  function txt(el) { return el ? String(el.textContent || '').replace(/\s+/g, ' ').trim() : ''; }

  // ---------- generic apply ----------
  function apply(box, config) {
    if (!box) return null;
    if (box._tksSections) return box._tksSections;
    config = config || {};
    injectCss();
    var storeKey = config.storeKey || 'tks_form_sections';
    var mode = 'one';
    try { mode = localStorage.getItem(storeKey) === 'open' ? 'open' : 'one'; } catch (e) {}

    // 1. work out every range BEFORE moving anything (moving changes who is a direct child of what)
    var plans = [], used = [];
    (config.sections || []).forEach(function (s) {
      var f = safe(s.first, box, null), l = safe(s.last, box, null);
      if (!f || !l || f.parentNode !== box || l.parentNode !== box) return;
      var nodes = [], n = f, ok = false;
      while (n) { nodes.push(n); if (n === l) { ok = true; break; } n = n.nextElementSibling; }
      if (!ok) return;
      if (nodes.some(function (x) { return used.indexOf(x) >= 0; })) return;
      nodes.forEach(function (x) { used.push(x); });
      plans.push({ s: s, nodes: nodes });
    });

    // 2. build the sections
    var secs = [];   // {id, el, head, body, sum, cap, cfg, open}
    plans.forEach(function (p, i) {
      var s = p.s, id = String(s.id), bodyId = 'qsb-' + id;
      var el = document.createElement('section'); el.className = 'qs'; el.setAttribute('data-sec', id);
      var head = document.createElement('button'); head.type = 'button'; head.className = 'qs-h';
      head.setAttribute('aria-expanded', 'false'); head.setAttribute('aria-controls', bodyId);
      var ic = document.createElement('span'); ic.className = 'qs-ic'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = s.icon || '';
      var t = document.createElement('span'); t.className = 'qs-t'; t.textContent = s.title || id;
      var sum = document.createElement('span'); sum.className = 'qs-s';
      var cap = document.createElement('span'); cap.className = 'qs-c'; cap.setAttribute('aria-hidden', 'true'); cap.textContent = '▸';
      head.appendChild(ic); head.appendChild(t); head.appendChild(sum); head.appendChild(cap);
      var body = document.createElement('div'); body.className = 'qs-b'; body.id = bodyId; body.hidden = true;
      box.insertBefore(el, p.nodes[0]);
      p.nodes.forEach(function (n) { body.appendChild(n); });   // a move, not a copy: ids and listeners stay
      var rec = { id: id, el: el, head: head, body: body, sum: sum, cap: cap, cfg: s, open: false };
      if (i < plans.length - 1) {
        var nx = document.createElement('button'); nx.type = 'button'; nx.className = 'qs-next'; nx.textContent = 'Next ›';
        nx.addEventListener('click', function () { next(rec); });
        body.appendChild(nx);
      }
      el.appendChild(head); el.appendChild(body);
      head.addEventListener('click', function () { if (rec.open) close(id); else open(id); });
      secs.push(rec);
    });

    var modeBtn = null;
    if (secs.length) {
      modeBtn = document.createElement('button'); modeBtn.type = 'button'; modeBtn.className = 'qs-mode';
      modeBtn.addEventListener('click', function () { setMode(mode === 'one' ? 'open' : 'one'); });
      box.insertBefore(modeBtn, secs[0].el);
    }

    // 3. the pinned footer
    // Only the error line and ONE compact row are pinned: the total on the left, the main buttons on the right.
    // footer.err(box) = the error element, footer.actions(box) = [{el, gate?}] buttons to move into the row (a move,
    // so ids and listeners stay), gate = an element whose inline display:"none" means "this button does not apply now".
    // footer.hide(box) = emptied rows to hide with our own class (the form owns their inline display).
    var foot = null, totalWrap = null, totalV = null, acts = [];
    if (config.footer) {
      var fc = config.footer;
      var errNode = safe(fc.err, box, null);
      acts = (safe(fc.actions, box, []) || []).filter(function (a) { return a && a.el; });
      foot = document.createElement('div'); foot.className = 'qs-foot';
      if (errNode) foot.appendChild(errNode);
      var bar = document.createElement('div'); bar.className = 'qs-bar';
      totalWrap = document.createElement('div'); totalWrap.className = 'qs-total';
      var tl = document.createElement('span'); tl.textContent = 'Total';
      totalV = document.createElement('b'); totalV.className = 'qs-total-v';
      totalWrap.appendChild(tl); totalWrap.appendChild(totalV); totalWrap.style.display = 'none';
      var act = document.createElement('div'); act.className = 'qs-act';
      acts.forEach(function (a) { act.appendChild(a.el); });
      bar.appendChild(totalWrap); bar.appendChild(act); foot.appendChild(bar);
      (safe(fc.hide, box, []) || []).forEach(function (n) { if (n) n.classList.add('qs-empty'); });
      box.appendChild(foot);
    }

    function byId(id) { for (var i = 0; i < secs.length; i++) if (secs[i].id === id) return secs[i]; return null; }
    function visible(r) { return r.el.style.display !== 'none'; }
    function paint(r) {
      r.el.classList.toggle('open', r.open);
      var ex = r.open ? 'true' : 'false';
      if (r.head.getAttribute('aria-expanded') !== ex) r.head.setAttribute('aria-expanded', ex);
      r.body.hidden = !r.open;
      var c = r.open ? '▾' : '▸'; if (r.cap.textContent !== c) r.cap.textContent = c;
    }
    function setOpen(r, v) { r.open = v; paint(r); }
    function open(id) {
      var r = byId(id); if (!r || !visible(r)) return;
      if (mode === 'one') secs.forEach(function (o) { if (o !== r && o.open) setOpen(o, false); });
      setOpen(r, true);
    }
    function close(id) { var r = byId(id); if (r) setOpen(r, false); }
    function scrollTo(r) { try { r.head.scrollIntoView({ block: 'nearest' }); } catch (e) {} }
    function next(r) {
      var i = secs.indexOf(r), n = null;
      for (var j = i + 1; j < secs.length; j++) if (visible(secs[j])) { n = secs[j]; break; }
      if (mode === 'one') { setOpen(r, false); if (n) open(n.id); }
    }
    function modeText() { box.classList.toggle('qs-all', mode === 'open'); if (modeBtn) { var t = mode === 'one' ? 'Show everything' : 'One section at a time'; if (modeBtn.textContent !== t) modeBtn.textContent = t; } }
    function applyOpenStates() {
      if (mode === 'open') { secs.forEach(function (r) { setOpen(r, true); }); return; }
      var keep = null;
      secs.forEach(function (r) { if (!keep && r.open && visible(r)) keep = r; });
      secs.forEach(function (r) { setOpen(r, r === keep); });
      if (!keep) {
        var want = byId(config.initial); if (!want || !visible(want)) want = secs.filter(visible)[0];
        if (want) setOpen(want, true);
      }
    }
    function setMode(m) {
      mode = m === 'open' ? 'open' : 'one';
      try { localStorage.setItem(storeKey, mode); } catch (e) {}
      modeText(); applyOpenStates();
    }

    // 4. refresh: summaries, follow-visibility, footer total. Writes only when the text really changed, so the
    // MutationObserver below (which sees our own writes too) settles at once instead of looping.
    function refresh() {
      secs.forEach(function (r) {
        var f = r.cfg.follow ? box.querySelector(r.cfg.follow) : null;
        if (r.cfg.follow) {
          var hide = !!f && f.style.display === 'none', want = hide ? 'none' : '';
          if (r.el.style.display !== want) r.el.style.display = want;
        }
        if (r.cfg.hideWhen) {   // 8z159: generic "hide this section when" (the form owns nothing here: our own class-free inline display, like follow)
          var hw = false; try { hw = !!r.cfg.hideWhen(box); } catch (e) {}
          var hwant = hw ? 'none' : ''; if (r.el.style.display !== hwant) r.el.style.display = hwant;
        }
        var s = ''; try { s = r.cfg.summary ? String(r.cfg.summary(box) || '') : ''; } catch (e) {}
        var show = s || 'Tap to fill in';
        if (r.sum.textContent !== show) r.sum.textContent = show;
        var emp = !s; if (r.sum.classList.contains('empty') !== emp) r.sum.classList.toggle('empty', emp);
      });
      if (foot) {
        var tt = ''; try { tt = String(config.footer.total ? config.footer.total(box) || '' : ''); } catch (e) {}
        if (totalV.textContent !== tt) totalV.textContent = tt;
        var dd = tt ? '' : 'none'; if (totalWrap.style.display !== dd) totalWrap.style.display = dd;
        acts.forEach(function (a) {
          var off = !!a.gate && a.gate.style.display === 'none';
          if (a.el.classList.contains('qs-off') !== off) a.el.classList.toggle('qs-off', off);
        });
      }
    }

    var timer = null;
    function later() { clearTimeout(timer); timer = setTimeout(refresh, 60); }
    ['input', 'change', 'click'].forEach(function (ev) { box.addEventListener(ev, later); });
    var mo = new MutationObserver(later);
    mo.observe(box, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    // 5. an error opens the section that holds the field to fix
    var errEl = config.errorEl ? safe(config.errorEl, box, null) : null;
    if (errEl && config.errorMap) {
      new MutationObserver(function () {
        var m = txt(errEl); if (!m) return;
        var map = config.errorMap;
        for (var i = 0; i < map.length; i++) {
          map[i][0].lastIndex = 0;
          if (map[i][0].test(m)) {
            var r = byId(map[i][1]);
            if (r && visible(r)) { if (mode === 'one') open(r.id); else setOpen(r, true); scrollTo(r); }
            break;
          }
        }
      }).observe(errEl, { childList: true, characterData: true, subtree: true });
    }

    modeText();
    refresh();
    applyOpenStates();

    var api = {
      open: open, close: close, refresh: refresh,
      mode: function () { return mode; }, setMode: setMode,
      sections: secs.map(function (r) { return r.id; })
    };
    box._tksSections = api;
    return api;
  }

  // ---------- the quote / invoice builder ----------
  function quoteForm(modalOrBox) {
    if (!modalOrBox) return null;
    var box = modalOrBox.classList && modalOrBox.classList.contains('qi-box') ? modalOrBox : modalOrBox.querySelector('.qi-box');
    if (!box) return null;
    if (box._tksSections) return box._tksSections;   // already done: do not touch the DOM again
    // Cancel gets its own full-width row after "Save & send" (not pinned); the old last row is left empty and hidden.
    var oldLast = (function () { var f = box.querySelectorAll(':scope > .qi-foot'); return f[f.length - 1]; })();
    var cancel = box.querySelector('#qiCancel'), sendRow = box.querySelector('#qiSendRow');
    if (cancel && sendRow && sendRow.parentNode === box) {
      var cr = document.createElement('div'); cr.className = 'qi-foot'; cr.id = 'qsCancelRow';
      cancel.style.flex = '1'; cancel.style.minHeight = '48px';
      cr.appendChild(cancel); sendRow.parentNode.insertBefore(cr, sendRow.nextSibling);
    }
    var Q = function (s) { return box.querySelector(s); };
    var val = function (s) { var e = Q(s); return e ? String(e.value || '').trim() : ''; };
    var on = function (s) { return Q(s + '.on'); };
    var cOf = function (s) { return childOf(box, Q(s)); };
    var join = function (a, sep) { return a.filter(Boolean).join(sep || ' · '); };

    // the grand total: paintTotals writes rows of <div><span>label</span><span>amount</span></div> into #qiTot and the
    // LAST row is always the total ("Total with tax" / "Total"), so read the last span of the last row.
    function totalText() {
      var t = Q('#qiTot'); if (!t) return '';
      var rows = t.querySelectorAll('div'); if (!rows.length) return '';
      var sp = rows[rows.length - 1].querySelectorAll('span');
      var m = /-?\$\s?[\d,]*\.?\d+/.exec(sp.length ? sp[sp.length - 1].textContent : '');
      return m ? m[0].replace(/\s/g, '') : '';
    }

    return apply(box, {
      storeKey: 'tks_form_sections',
      initial: (!val('#qiName') && !Array.prototype.some.call(box.querySelectorAll('.qi-item .qiDesc'), function (d) { return String(d.value || '').trim(); })) ? 'start' : 'charges',
      errorEl: function () { return Q('#qiErr'); },
      errorMap: [
        [/name|customer|phone|email/i, 'customer'],
        [/address|street/i, 'location'],
        [/vehicle|VIN|year|make|model/i, 'vehicle'],
        [/item|line|amount|price|description|discount/i, 'charges'],
        [/payment|paid/i, 'payment']
      ],
      footer: {
        err: function () { return Q('#qiErr'); },
        actions: function () { return [{ el: Q('#qiGoBook'), gate: Q('#qiBookRow') }, { el: Q('#qiGo') }]; },
        hide: function () { return [Q('#qiBookRow'), oldLast]; },
        total: totalText
      },
      sections: [
        { id: 'start', icon: '🧭', title: 'Job',
          first: function () { var h = Q('.qi-head'); return h && h.nextElementSibling; },
          last: function () { return cOf('#qiNastfWrap'); },
          summary: function () {
            var t = on('.qiTB'), tn = t ? { receipt: 'Receipt', invoice: 'Invoice', estimate: 'Estimate' }[t.dataset.t] || txt(t) : '';
            var nw = Q('#qiNeedWrap'), nb = on('.qiNeedB');
            var need = nw && nw.style.display !== 'none' && nb ? (nb.dataset.need === 'key' ? 'a key' : nb.dataset.need === 'service' ? 'a service' : '') : '';
            var nf = on('.qiNB'), nfs = nf && nf.dataset.n ? 'NASTF: ' + txt(nf) : '';
            return join([tn, txt(on('.qiSB')), need, nfs]);
          } },
        { id: 'customer', icon: '👤', title: 'Customer',
          first: function () { var c = Q('#qiCT'); return c && c.previousElementSibling; },
          last: function () { return cOf('#qiPhone'); },
          summary: function () {
            var s = join([val('#qiName'), val('#qiPhone')]);
            return s && on('.qiCB') && on('.qiCB').dataset.c === 'business' ? 'Business · ' + s : s;
          } },
        { id: 'location', icon: '📍', title: 'Location',
          first: function () { var c = Q('#qiStreet'); return c && c.previousElementSibling; },
          last: function () { return cOf('#qiWhere'); },
          summary: function () {
            var w = on('.qiWB'), wd = w ? w.dataset.w : '';
            if (wd === 'shop') return 'In shop';
            var a = join([val('#qiStreet'), val('#qiCity')], ', ');
            if (a) return a;
            return wd === 'mobile' ? 'Mobile' : '';
          } },
        { id: 'vehicle', icon: '🚗', title: 'Vehicle & keys', follow: '#qiVehWrap',
          first: function () { return cOf('#qiVehWrap'); }, last: function () { return cOf('#qiVehWrap'); },
          summary: function () {
            var v = join([val('#qiVYear'), val('#qiVMake'), val('#qiVModel')], ' ') || val('#qiVehText');
            if (!v) { var vin = val('#qiVin'); if (vin) v = 'VIN …' + vin.slice(-6); }
            var ig = Q('.qkIgn.on'), igs = ig ? (ig.dataset.ign === 'push' ? 'push to start' : ig.dataset.ign === 'keyed' ? 'turn key' : '') : '';
            var n = Array.prototype.filter.call(box.querySelectorAll('.qi-item'), function (r) { return !!(r.dataset && r.dataset.part) && !r.classList.contains('disc'); }).length;   // 8z158: an empty data-part is not a key
            return join([v, igs, n ? n + ' key' + (n === 1 ? '' : 's') + ' added' : '']);
          } },
        { id: 'charges', icon: '🧾', title: 'Charges',
          first: function () { return cOf('#qiQuickLow'); }, last: function () { return cOf('#qiExWrap'); },
          summary: function () {
            var n = 0;
            box.querySelectorAll('.qi-item').forEach(function (r) {
              if (r.dataset.disc || r.classList.contains('disc')) return;
              var d = r.querySelector('.qiDesc'); if (d && String(d.value || '').trim()) n++;
            });
            if (!n) return '';
            return join([n + ' line' + (n === 1 ? '' : 's'), totalText()]);
          } },
        { id: 'payment', icon: '💳', title: 'Payment', follow: '#qiPayWrap',
          first: function () { return cOf('#qiPayWrap'); }, last: function () { return cOf('#qiPayWrap'); },
          summary: function () { return join([txt(on('.qiPB')), txt(on('.qiST'))]); } },
        { id: 'more', icon: '📝', title: 'Notes, tax & signature',
          first: function () { return cOf('#qiTech'); }, last: function () { return cOf('#qiSigWrap'); },
          summary: function () { return val('#qiNotes') || val('#qiINotes') ? 'Notes added' : ''; } }
      ]
    });
  }

  // ---------- the Scheduler's job form (8z159) ----------
  // The sheet's real children are NOT in section order (phone and service share a row, date and time share a row, technician
  // and status come last), so first the form's own pieces are moved (never copied) into one wrapper per section, then apply()
  // groups the wrappers. Anything missing is skipped.
  function jobForm(sheetOrOverlay) {
    if (!sheetOrOverlay) return null;
    var box = sheetOrOverlay.classList && sheetOrOverlay.classList.contains('sheet') ? sheetOrOverlay : sheetOrOverlay.querySelector('.sheet');
    if (!box) return null;
    if (box._tksSections) return box._tksSections;
    var Q = function (s) { return box.querySelector(s); };
    var val = function (s) { var e = Q(s); return e ? String(e.value || '').trim() : ''; };
    var join = function (a, sep) { return a.filter(Boolean).join(sep || ' · '); };
    if (!Q('#sjSave') || !Q('#sjJt')) return null;
    var isNew = !!Q('#sjDraftBtn');
    var labelOf = function (el) { var p = el && el.previousElementSibling; return p && p.tagName === 'LABEL' ? p : null; };
    var up = function (el) { return el ? childOf(box, el) : null; };
    var rowOf = function (el) { var p = el; while (p && p !== box && !(p.classList && p.classList.contains('row2'))) p = p.parentNode; return p && p !== box ? p : null; };

    // 1. collect every piece BEFORE moving anything
    var jt = Q('#sjJt'), nameRow = up(Q('#sjName')), whereEl = Q('#sjWhere');
    var phoneDiv = Q('#sjPhone') ? Q('#sjPhone').parentNode : null, svcDiv = Q('#sjSvc') ? Q('#sjSvc').parentNode : null;
    var dateRow = rowOf(Q('#sjDate')), phoneRow = rowOf(Q('#sjPhone'));
    var groups = {
      when: [dateRow, labelOf(Q('#sjTech')), Q('#sjTech'), labelOf(Q('#sjSt')), Q('#sjSt')],
      customer: [labelOf(jt), jt, labelOf(nameRow), nameRow, Q('#sjCustList'), phoneDiv],
      location: [labelOf(whereEl), whereEl, Q('#sjAddrWrap')],
      vehicle: [up(Q('#sjVeh')), up(Q('#sjKeys'))],
      job: [svcDiv, up(Q('#sjCharges'))],
      contract: [up(Q('#sjContract')), up(Q('#sjContractIn'))],
      notes: [labelOf(Q('#sjINotes')), Q('#sjINotes'), up(Q('#sjJobLog'))]
    };
    var anchor = up(jt); anchor = labelOf(jt) || anchor;
    var mark = document.createElement('div'); mark.style.display = 'none';
    box.insertBefore(mark, anchor);
    var wraps = {};
    ['when', 'customer', 'location', 'vehicle', 'job', 'contract', 'notes'].forEach(function (id) {
      var nodes = groups[id].filter(function (n) { return !!n; });
      if (!nodes.length) return;
      var w = document.createElement('div'); w.className = 'qsw'; w.setAttribute('data-qsw', id);
      box.insertBefore(w, mark);
      nodes.forEach(function (n) { w.appendChild(n); });
      wraps[id] = w;
    });
    box.removeChild(mark);
    if (phoneRow && !phoneRow.children.length && phoneRow.parentNode) phoneRow.parentNode.removeChild(phoneRow);
    var W = function (id) { return function () { return wraps[id] || null; }; };

    // 2. readers
    function totalText() {   // the "Total" row of the charges totals box (the box has other rows: tax, you keep …)
      var t = Q('#sjChTot'); if (!t) return '';
      var rows = t.querySelectorAll('div');
      for (var i = 0; i < rows.length; i++) {
        var sp = rows[i].querySelectorAll(':scope > span');
        if (sp.length >= 2 && txt(sp[0]) === 'Total') { var m = /-?\$\s?[\d,]*\.?\d+/.exec(sp[sp.length - 1].textContent); return m ? m[0].replace(/\s/g, '') : ''; }
      }
      return '';
    }
    function dateText() {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(val('#sjDate')); if (!m) return '';
      try { return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); } catch (e) { return val('#sjDate'); }
    }
    function timeText() {
      var m = /^(\d{1,2}):(\d{2})/.exec(val('#sjTime')); if (!m) return '';
      var h = +m[1]; return (h % 12 || 12) + ':' + m[2] + ' ' + (h < 12 ? 'AM' : 'PM');
    }
    function techText() { var s = Q('#sjTech'); if (!s) return ''; var o = s.options[s.selectedIndex]; return o && s.value ? txt(o).replace(/\s+—.*$/, '') : 'Unassigned'; }
    function keyCount() { var m = /On this job \((\d+)\)/.exec(txt(Q('#sjKeys'))); return m ? +m[1] : 0; }
    function empty(el) { return !el || (!el.children.length && !txt(el)); }

    return apply(box, {
      storeKey: 'tks_form_sections',
      initial: isNew ? 'customer' : 'when',
      errorEl: function () { return Q('#sjMsg'); },
      errorMap: [
        [/could not add|key|VIN|decod/i, 'vehicle'],
        [/name|customer|phone/i, 'customer'],
        [/date|time/i, 'when'],
        [/charge|price/i, 'job']
      ],
      footer: {
        err: function () { return Q('#sjMsg'); },
        actions: function () { return [{ el: Q('#sjSave') }]; },
        total: totalText
      },
      sections: [
        { id: 'when', icon: '📅', title: 'When & who', first: W('when'), last: W('when'),
          summary: function () { return join([dateText(), timeText(), techText(), txt(Q('#sjSt .on'))]); } },
        { id: 'customer', icon: '👤', title: 'Customer', first: W('customer'), last: W('customer'),
          summary: function () { return join([val('#sjName'), val('#sjPhone')]); } },
        { id: 'location', icon: '📍', title: 'Location', first: W('location'), last: W('location'),
          summary: function () {
            var w = Q('#sjWhere .on'), wd = w ? w.dataset.w : '';
            if (wd === 'shop') return 'In shop';
            var a = join([val('#sjStreet'), val('#sjCity')], ', ');
            return a || (wd === 'mobile' ? 'Mobile' : '');
          } },
        { id: 'vehicle', icon: '🚗', title: 'Vehicle & keys', first: W('vehicle'), last: W('vehicle'),
          hideWhen: function () { var v = Q('#sjVeh'); return (!v || v.style.display === 'none') && empty(Q('#sjKeys')); },
          summary: function () {
            var v = Q('#sjVeh'), shown = v && v.style.display !== 'none';
            var n = keyCount();
            return join([shown ? join([val('#sjYear'), val('#sjMake'), val('#sjModel')], ' ') : '', n ? n + ' key' + (n === 1 ? '' : 's') + ' on the job' : '']);
          } },
        { id: 'job', icon: '🔧', title: 'Service & charges', first: W('job'), last: W('job'),
          summary: function () { return join([val('#sjSvc'), totalText()]); } },
        { id: 'contract', icon: '🤝', title: 'Contracting', first: W('contract'), last: W('contract'),
          hideWhen: function () { return empty(Q('#sjContract')) && empty(Q('#sjContractIn')); },
          summary: function () {
            var out = val('#sjConName'), co = val('#sjCinCo');
            if (!co && !Q('#sjCinCo')) { var m = /Job from (.+?)(?: · their job #|$)/.exec(txt(Q('#sjContractIn'))); co = m ? m[1].trim() : ''; }
            return join([out ? 'Out: ' + out : '', co ? 'From: ' + co : '']);
          } },
        { id: 'notes', icon: '📝', title: 'Notes & log', first: W('notes'), last: W('notes'),
          summary: function () { return val('#sjINotes') ? 'Notes added' : ''; } }
      ]
    });
  }

  window.TKS_SECTIONS = { apply: apply, quoteForm: quoteForm, jobForm: jobForm };
})();
