/* ============================================================================
   app/keysystems.js - "Key systems" screen (residential / commercial master key systems).
   ----------------------------------------------------------------------------
   window.TKS_KS = { open(root, opts), hasUnsaved(), confirmLeave() }
     root  an empty <div> inside the app's screen
     opts  optional { customerId, customerName } - filters the list to one customer and pre-fills "New key system"
   The maths lives in window.TKS_KEYCALC (app/keycalc.js, must be loaded first). This file is only the screen:
   list, new system, editor (System / Keys / Doors / Pin chart / Lost key / History) and the "Pin a lock" quick tool.
   Server: key_system_list / _get / _save / _event / _history / _delete via TKS._sb().rpc (owners and managers only).
   SECURITY: a system's keys are the keys to a building. Nothing here is written to localStorage, sessionStorage or
   IndexedDB - the document lives in memory only, and printing is logged as a 'print' event.
   ES2017, no build step, no dependencies. All CSS is injected once as <style id="ks-css"> and scoped under .ks-root
   (the print rules need the body class, and are the only exception).
   ========================================================================== */
(function () {
  'use strict';

  var KC = window.TKS_KEYCALC;
  var SPEC_IDS = ['sc', 'a2', 's6300'];
  var LABELS = ['Change key', 'Master key', 'Grand master', 'Top master'];
  var KIND_TEXT = { print: 'Printed', issue: 'Key issued', 'return': 'Key returned', lost: 'Key lost', rekey: 'Rekeyed', 'export': 'Exported', note: 'Note', view: 'Opened', create: 'Created', save: 'Saved' };
  var CONF = 'CONFIDENTIAL — key system records';
  var cur = null;   // the open screen (so the app can ask "anything unsaved?")

  // ---------------------------------------------------------------- helpers ----
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { try { return (window.TKS && TKS._sb && TKS._sb()) || null; } catch (e) { return null; } }
  function rpc(name, args) {
    var c = sb();
    if (!c || !c.rpc) return Promise.resolve({ data: null, error: { message: 'Not connected to the cloud.' } });
    try {
      return Promise.resolve(c.rpc(name, args)).then(function (r) { return r || { data: null, error: { message: 'No answer from the cloud.' } }; },
        function (e) { return { data: null, error: { message: String((e && e.message) || e) } }; });
    } catch (e) { return Promise.resolve({ data: null, error: { message: String((e && e.message) || e) } }); }
  }
  function errText(e) {
    var m = String((e && e.message) || e || '');
    if (/owners and managers/i.test(m)) return 'Key systems are for owners and managers.';
    return m || 'Something went wrong.';
  }
  function ask(title, message, okText, danger) {
    if (typeof window.uiConfirm === 'function') return window.uiConfirm({ title: title, message: message, okText: okText || 'OK', danger: !!danger });
    return Promise.resolve(window.confirm(title + '\n\n' + message));
  }
  function tell(message, title) {
    if (typeof window.uiAlert === 'function') return window.uiAlert({ title: title || 'Heads up', message: message });
    window.alert(message); return Promise.resolve();
  }
  function askText(title, label, value) {
    if (typeof window.uiPrompt === 'function') return window.uiPrompt({ title: title, label: label, value: value || '' });
    return Promise.resolve(window.prompt(label, value || ''));
  }
  function fmtDate(s) { if (!s) return ''; try { return new Date(s).toLocaleDateString(); } catch (e) { return String(s); } }
  function fmtWhen(s) { if (!s) return ''; try { var d = new Date(s); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); } catch (e) { return String(s); } }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function specOf(id) { return KC.SPECS[id] || KC.SPECS.sc; }
  function specName(id) { return specOf(id).name; }
  function notVerified(id) { return !specOf(id).verified; }
  function notVerifiedLine(id) { return specName(id) + ' numbers are not yet verified against the maker’s charts. Check them against your kit chart before you pin a real lock.'; }
  function blank(n) { var a = []; for (var i = 0; i < n; i++) a.push(null); return a; }
  function fit(arr, n) { arr = (arr || []).slice(0, n); while (arr.length < n) arr.push(null); return arr; }
  function full(arr, n) { if (!arr || arr.length !== n) return false; for (var i = 0; i < n; i++) if (typeof arr[i] !== 'number') return false; return true; }
  function keyBy(keys, sym) { for (var i = 0; i < keys.length; i++) if (keys[i].symbol === sym) return keys[i]; return null; }

  // ---------------------------------------------------------------- styles ----
  var CSS = [
    '.ks-root{--ks-card:var(--surface-card,#fff);--ks-card2:var(--surface-sunken,#eef0f3);--ks-ink:var(--text-primary,#14171b);--ks-dim:var(--text-secondary,#5a616c);--ks-edge:var(--border-subtle,#e3e6ea);--ks-red:var(--brand-red,#b82334);--ks-who:#1d5fb8;--ks-what:#8a5a00;--ks-ok:#17803a;--ks-warn:#8a5a00;--ks-bad:#b3261e;--ks-okbg:rgba(34,153,74,.13);--ks-warnbg:rgba(255,176,0,.2);--ks-badbg:rgba(184,35,52,.12);color:var(--ks-ink);font-family:var(--font-sans,-apple-system,"Segoe UI",Roboto,Arial,sans-serif);font-size:15px;line-height:1.45;max-width:980px;margin:0 auto;min-width:0}',
    'html[data-bt-theme="dark"] .ks-root{--ks-who:#9ec5ff;--ks-what:#ffd48a;--ks-ok:#7be3aa;--ks-warn:#f6cd77;--ks-bad:#ff9aa0;--ks-okbg:rgba(34,153,74,.2);--ks-warnbg:rgba(255,176,0,.15);--ks-badbg:rgba(184,35,52,.24)}',
    '.ks-root *{box-sizing:border-box}',
    '.ks-root .ks-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin:0 0 12px}',
    '.ks-root .ks-head h2,.ks-root .ks-title{margin:0;font-size:21px;font-weight:900;letter-spacing:-.01em;min-width:0;overflow-wrap:anywhere}',
    '.ks-root .ks-sub{color:var(--ks-dim);font-size:13px}',
    '.ks-root .ks-acts{display:flex;flex-wrap:wrap;gap:8px}',
    '.ks-root .ks-card{background:var(--ks-card);border:1px solid var(--ks-edge);border-radius:14px;padding:14px;margin:0 0 12px;min-width:0}',
    '.ks-root .ks-card h3{margin:0 0 4px;font-size:17px;font-weight:800}',
    '.ks-root .ks-hint{color:var(--ks-dim);font-size:13px}',
    '.ks-root .ks-lab{display:block;font-size:12px;font-weight:700;color:var(--ks-dim);margin:10px 0 4px;text-transform:uppercase;letter-spacing:.04em}',
    '.ks-root input[type=text],.ks-root input[type=search],.ks-root input:not([type]),.ks-root select,.ks-root textarea{width:100%;min-height:46px;background:var(--ks-card2);color:var(--ks-ink);border:1px solid var(--ks-edge);border-radius:10px;padding:10px 12px;font:inherit;font-size:16px}',
    '.ks-root textarea{min-height:80px;resize:vertical}',
    '.ks-root .ks-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '@media(max-width:560px){.ks-root .ks-grid2{grid-template-columns:1fr}}',
    '.ks-root .ks-cuts{display:grid;grid-template-columns:repeat(auto-fit,minmax(38px,1fr));gap:6px;max-width:420px}',
    '.ks-root input.ks-cut{width:100%;min-width:0;min-height:52px;text-align:center;font:700 22px var(--font-mono,ui-monospace,Menlo,Consolas,monospace);padding:4px}',
    '.ks-root .ks-m,.ks-root .ks-mono{font-family:var(--font-mono,ui-monospace,Menlo,Consolas,monospace);letter-spacing:.06em}',
    '.ks-root .ks-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;border-radius:10px;border:1px solid var(--ks-edge);background:var(--ks-card2);color:var(--ks-ink);font:700 14px var(--font-sans,inherit);padding:8px 14px;cursor:pointer}',
    '.ks-root .ks-btn.red{background:var(--ks-red);border-color:transparent;color:#fff}',
    '.ks-root .ks-btn.danger{border-color:var(--ks-bad);color:var(--ks-bad)}',
    '.ks-root .ks-btn[disabled]{opacity:.5;cursor:not-allowed}',
    '.ks-root .ks-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--ks-edge);margin:0 0 12px}',
    '.ks-root .ks-tabs button{flex:1 0 auto;min-height:44px;background:none;border:0;border-bottom:3px solid transparent;color:var(--ks-dim);font:700 14px var(--font-sans,inherit);padding:8px 10px;cursor:pointer}',
    '.ks-root .ks-tabs button.on{color:var(--ks-ink);border-bottom-color:var(--ks-red)}',
    '.ks-root .ks-bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;background:var(--ks-warnbg);border:1px solid var(--ks-warn);color:var(--ks-warn);border-radius:12px;padding:8px 12px;margin:0 0 12px;font-weight:700;backdrop-filter:blur(6px)}',
    '.ks-root .ks-bar[hidden]{display:none}',
    '.ks-root .ks-row{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:11px 12px;min-height:60px;background:var(--ks-card);border:1px solid var(--ks-edge);border-radius:12px;margin:0 0 8px;cursor:pointer}',
    '.ks-root .ks-row .ks-l{min-width:0;flex:1}',
    '.ks-root .ks-row .ks-t{font-weight:800;overflow-wrap:anywhere}',
    '.ks-root .ks-row .ks-s{color:var(--ks-dim);font-size:13px;overflow-wrap:anywhere}',
    '.ks-root .ks-line{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;padding:11px 0;border-top:1px solid var(--ks-edge)}',
    '.ks-root .ks-line:first-child{border-top:0}',
    '.ks-root .ks-pill{display:inline-block;font:700 12px/1 var(--font-mono,monospace);border-radius:999px;padding:5px 9px;background:var(--ks-card2);border:1px solid var(--ks-edge);color:var(--ks-ink)}',
    '.ks-root .ks-pill.red{background:var(--ks-badbg);border-color:var(--ks-red);color:var(--ks-bad)}',
    '.ks-root .ks-pill.warn{background:var(--ks-warnbg);border-color:var(--ks-warn);color:var(--ks-warn)}',
    '.ks-root .ks-pill.ok{background:var(--ks-okbg);border-color:var(--ks-ok);color:var(--ks-ok)}',
    '.ks-root .ks-who{color:var(--ks-who)} .ks-root .ks-what{color:var(--ks-what)}',
    '.ks-root .ks-msg{border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14px}',
    '.ks-root .ks-msg.ok{background:var(--ks-okbg);color:var(--ks-ok)} .ks-root .ks-msg.bad{background:var(--ks-badbg);color:var(--ks-bad)} .ks-root .ks-msg.warn{background:var(--ks-warnbg);color:var(--ks-warn)}',
    '.ks-root .ks-msg.info{background:var(--ks-card2);color:var(--ks-dim)}',
    '.ks-root .ks-tree,.ks-root .ks-tree ul{list-style:none;margin:6px 0 0;padding:0}',
    '.ks-root .ks-tree ul{margin:4px 0 4px 14px;padding-left:12px;border-left:2px solid var(--ks-edge)} .ks-root .ks-tree li{margin:6px 0;overflow-wrap:anywhere}',
    '.ks-root .ks-scroll{overflow-x:auto;max-width:100%}',
    '.ks-root table.ks-tbl{width:100%;border-collapse:collapse;font-size:14px}',
    '.ks-root .ks-tbl th,.ks-root .ks-tbl td{padding:8px 4px;text-align:center;border-bottom:1px solid var(--ks-edge)}',
    '.ks-root .ks-tbl thead th{color:var(--ks-dim);font-size:11px;text-transform:uppercase;letter-spacing:.05em}',
    '.ks-root .ks-tbl th.ks-k{text-align:left;color:var(--ks-dim);font-weight:600;font-size:13px;white-space:nowrap;padding-right:8px}',
    '.ks-root .ks-tbl td.ks-pin{font-weight:800;font-size:17px} .ks-root .ks-tbl td.ks-bad{color:var(--ks-bad)}',
    '.ks-root .ks-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.ks-root .ks-chips button{min-height:44px;border-radius:999px;border:1px solid var(--ks-edge);background:var(--ks-card2);color:var(--ks-ink);font:700 13px var(--font-sans,inherit);padding:6px 14px;cursor:pointer}',
    '.ks-root .ks-chips button.on{background:var(--ks-red);border-color:transparent;color:#fff}',
    '.ks-root .ks-step{display:inline-flex;align-items:center;gap:4px}',
    '.ks-root .ks-step button{min-width:44px;padding:8px 0}',
    '.ks-root .ks-step b{min-width:28px;text-align:center;font-family:var(--font-mono,monospace)}',
    '.ks-root .ks-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:13px;margin-top:6px}',
    '.ks-root .ks-empty{text-align:center;padding:26px 12px;color:var(--ks-dim)}',
    '#ks-print{display:none}',
    '@media print{',
    'body.ks-printing{background:#fff!important}',
    'body.ks-printing > *:not(#ks-print){display:none!important}',
    'body.ks-printing > #ks-print{display:block!important;background:#fff;color:#000;padding:0;margin:0;max-width:none}',
    '#ks-print,#ks-print *{background:#fff!important;color:#000!important;border-color:#777!important;box-shadow:none!important}',
    '#ks-print .ks-phead{font-size:12px;font-weight:700;border-bottom:2px solid #000;padding-bottom:6px;margin-bottom:10px}',
    '#ks-print .ks-card{border:1px solid #777;border-radius:0;padding:8px;break-inside:avoid}',
    '#ks-print table{width:100%;border-collapse:collapse;font-size:12px} #ks-print th,#ks-print td{border-bottom:1px solid #999;padding:5px 3px;text-align:center}',
    '#ks-print th.ks-k{text-align:left} #ks-print .ks-pill{border:1px solid #444;padding:2px 6px}',
    '}'
  ].join('\n');
  function ensureCss() {
    if (document.getElementById('ks-css')) return;
    var st = document.createElement('style'); st.id = 'ks-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  // ---------------------------------------------------------------- shared HTML ----
  function btn(label, act, attrs, cls) { return '<button type="button" class="ks-btn' + (cls ? ' ' + cls : '') + '" data-act="' + act + '"' + (attrs ? ' ' + attrs : '') + '>' + label + '</button>'; }
  function cutsHTML(g, arr, label) {
    return '<div class="ks-cuts" role="group" aria-label="' + esc(label) + '">' + arr.map(function (v, i) {
      return '<input class="ks-cut" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="off" data-cut="' + g + '" data-i="' + i + '" value="' + (v == null ? '' : v) + '" aria-label="' + esc(label) + ' position ' + (i + 1) + '">';
    }).join('') + '</div>';
  }
  function msg(kind, html) { return '<div class="ks-msg ' + kind + '">' + html + '</div>'; }
  function specSelect(f, val) {
    return '<select data-f="' + f + '">' + SPEC_IDS.map(function (id) { return '<option value="' + id + '"' + (id === val ? ' selected' : '') + '>' + esc(specName(id)) + (notVerified(id) ? ' — Not yet verified' : '') + '</option>'; }).join('') + '</select>';
  }
  function pinsSelect(f, specId, val) {
    return '<select data-f="' + f + '">' + specOf(specId).pins.map(function (p) { return '<option value="' + p + '"' + (p === val ? ' selected' : '') + '>' + p + ' pins</option>'; }).join('') + '</select>';
  }
  function specFacts(id) {
    var s = specOf(id), bits = ['Cuts ' + s.depths[0] + '–' + s.depths[1]];
    if (s.increment) bits.push('step ' + s.increment);
    bits.push(s.macs != null ? 'MACS ' + s.macs : 'no MACS limit assumed');
    bits.push(s.ic ? 'IC core (control key needed)' : 'conventional cylinder');
    return bits.join(' · ');
  }

  // One table for a set of pinLock rows. labels[j] names the key whose cut is row.cuts[j].
  function tableHTML(spec, rows, labels) {
    function line(label, fn, pin) {
      return '<tr><th scope="row" class="ks-k">' + label + '</th>' + rows.map(function (r) {
        var v = fn(r), bad = typeof v === 'number' && v < 0;
        return '<td class="' + (pin ? 'ks-m ks-pin' : 'ks-m') + (bad ? ' ks-bad' : '') + '">' + esc(v) + '</td>';
      }).join('') + '</tr>';
    }
    var h = '<table class="ks-tbl"><thead><tr><th scope="col" class="ks-k">Position</th>' + rows.map(function (r) { return '<th scope="col">' + r.pos + '</th>'; }).join('') + '</tr></thead><tbody>';
    labels.forEach(function (lb, j) { h += line(esc(lb) + ' cut', function (r) { return r.cuts[j]; }); });
    if (spec.ic) h += line('Control cut', function (r) { return r.control; });
    h += line('Bottom pin', function (r) { return r.bottom; }, true);
    h += line('Master pin', function (r) { return r.masters.length ? r.masters.join('+') : '–'; }, true);
    if (spec.id === 'a2') h += line('Build-up', function (r) { return r.build; }, true);
    if (spec.id === 's6300') h += line('Control split', function (r) { return r.controlSplit == null ? '–' : r.controlSplit; }, true);
    h += line('Top pin', function (r) { return spec.id === 'sc' ? '—' : r.top; }, true);
    return h + '</tbody></table>';
  }
  function engineBlocks(spec, pl) {
    var h = '';
    (pl.errors || []).forEach(function (e) { h += msg('bad', esc(e)); });
    (pl.warnings || []).forEach(function (w) { h += msg('warn', '⚠ ' + esc(w)); });
    (pl.notes || []).forEach(function (n) { h += msg('warn', esc(n)); });
    if (!spec.verified) h += msg('warn', 'Not yet verified — ' + esc(notVerifiedLine(spec.id)));
    return h;
  }

  // ================================================================== screen ====
  function open(root, opts) {
    if (!root) return null;
    if (!KC) { root.innerHTML = '<div class="ks-root"><div class="ks-msg bad">The key calculator (keycalc.js) is not loaded.</div></div>'; ensureCss(); return null; }
    ensureCss();
    if (cur && cur.destroy) cur.destroy();
    root.classList.add('ks-root');
    var st = { root: root, opts: opts || {}, view: 'list', list: null, listErr: '', q: '', allCust: false, sys: null, dirty: false, tab: 'system', selDoor: null, lostKey: null,
      doorEdit: null, ed: null, f: null, pt: null, hist: null, histErr: '', flash: '', saving: false, customers: null };
    cur = st;

    function $(s) { return root.querySelector(s); }
    function body() { return $('#ks-body'); }
    function onBeforeUnload(e) { if (st.dirty) { e.preventDefault(); e.returnValue = ''; return ''; } }
    window.addEventListener('beforeunload', onBeforeUnload);
    st.destroy = function () {
      window.removeEventListener('beforeunload', onBeforeUnload);
      root.removeEventListener('click', onClick); root.removeEventListener('input', onInput); root.removeEventListener('change', onChange);
      root.innerHTML = ''; if (cur === st) cur = null;
    };
    function touch() { st.dirty = true; var b = $('#ks-bar'); if (b) b.hidden = false; }
    function confirmLeave() { return st.dirty ? ask('Unsaved changes', 'You have changes that are not saved. Leave without saving?', 'Leave', true) : Promise.resolve(true); }
    st.confirmLeave = confirmLeave;

    // ---- derived facts about the open system ----
    function keys() { return st.sys.data.keys; }
    function doors() { return st.sys.data.doors; }
    function holderOf(k) { return k.holder ? k.holder : ''; }
    function chainFor(sym) { return KC.chainOf(keys(), sym); }
    function doorsUnder(sym) { return doors().filter(function (d) { return d.key && chainFor(d.key).indexOf(sym) >= 0; }); }
    function whatText(k) {
      if (k.level === 0) return 'Every door';
      if (k.level === 1) { var n = doorsUnder(k.symbol).length; return 'All ' + n + ' door' + (n === 1 ? '' : 's') + ' under ' + k.symbol; }
      return doors().filter(function (d) { return d.key === k.symbol; }).map(function (d) { return d.name; }).join(', ');
    }
    function masters() { return keys().filter(function (k) { return k.level === 1; }); }
    function keyLabel(k) { return k.symbol + (k.holder ? ' · ' + k.holder : ''); }
    function printHead(title) {
      var s = st.sys;
      return '<div class="ks-phead">' + esc([title || (s && s.name), s && s.site, s && specName(s.spec), new Date().toLocaleDateString()].filter(Boolean).join(' · ')) + ' · ' + CONF + '</div>';
    }
    function setup() { var d = st.sys.data; return { tmk: d.tmk, control: d.control, pins: st.sys.pins, spec: st.sys.spec }; }
    function designCap() {
      var s = st.sys, d = s.data;
      var r = KC.designTPP(s.spec, { tmk: d.tmk, pins: s.pins, step: d.step || 2, masterPositions: d.masterPositions || [1, 2], mastersWanted: 0, keysPerMaster: 0 });
      return r && r.ok ? r.capacity : null;
    }

    // ---- loading / saving ----
    function loadList() {
      st.list = null; st.listErr = ''; draw();
      return rpc('key_system_list').then(function (r) {
        if (cur !== st) return;
        if (r.error) { st.listErr = errText(r.error); st.list = []; } else st.list = Array.isArray(r.data) ? r.data : [];
        if (st.view === 'list') draw();
      });
    }
    function normalize(row) {
      var d = row.data && typeof row.data === 'object' ? row.data : {};
      d.v = 1; d.method = d.method || 'tpp'; d.step = d.step || 2; d.masterPositions = d.masterPositions || [1, 2];
      d.tmk = d.tmk || []; d.control = d.control || null; d.keys = d.keys || []; d.doors = d.doors || []; d.notes = d.notes || '';
      d.keys.forEach(function (k) { k.holder = k.holder || ''; k.copies = k.copies || 0; k.status = k.status || 'active'; k.notes = k.notes || ''; if (k.parent === undefined) k.parent = null; });
      d.doors.forEach(function (x) { x.id = x.id || uid(); x.area = x.area || ''; x.key = x.key || ''; x.notes = x.notes || ''; });
      return { id: row.id || null, name: row.name || '', site: row.site || '', customer_id: row.customer_id || null, customer_name: row.customer_name || '',
        spec: SPEC_IDS.indexOf(row.spec) >= 0 ? row.spec : 'sc', pins: row.pins || specOf(row.spec).defaultPins, data: d, updated_at: row.updated_at };
    }
    function openSystem(id) {
      return rpc('key_system_get', { p_id: id }).then(function (r) {
        if (cur !== st) return;
        if (r.error || !r.data) { st.listErr = errText(r.error || { message: 'That key system could not be opened.' }); draw(); return; }
        st.sys = normalize(r.data); st.view = 'edit'; st.tab = 'system'; st.dirty = false; st.ed = null; st.doorEdit = null; st.hist = null;
        st.selDoor = st.sys.data.doors.length ? st.sys.data.doors[0].id : null;
        var first = st.sys.data.keys.filter(function (k) { return k.level > 0; })[0] || st.sys.data.keys[0];
        st.lostKey = first ? first.symbol : null;
        draw();
      });
    }
    function payload() {
      var s = st.sys;
      return { name: s.name, site: s.site, customer_id: s.customer_id || null, customer_name: s.customer_name, spec: s.spec, pins: s.pins, data: clone(s.data) };
    }
    function save() {
      if (st.saving) return Promise.resolve(false);
      if (!String(st.sys.name || '').trim()) { tell('Give the key system a name first (System tab).'); return Promise.resolve(false); }
      st.saving = true;
      return rpc('key_system_save', { p_id: st.sys.id || null, p_sys: payload() }).then(function (r) {
        st.saving = false;
        if (r.error || !r.data || r.data.ok === false) { tell(errText(r.error || { message: 'The key system could not be saved.' }), 'Not saved'); return false; }
        if (r.data.id) st.sys.id = r.data.id;
        st.dirty = false; var b = $('#ks-bar'); if (b) b.hidden = true;
        var h = $('#ks-ttl'); if (h) h.textContent = st.sys.name;
        return true;
      });
    }
    function event(kind, detail) { return rpc('key_system_event', { p_id: st.sys.id, p_kind: kind, p_detail: detail || {} }); }

    // ---- printing ----
    function doPrint(html, what, title) {
      var box = document.getElementById('ks-print');
      if (!box) { box = document.createElement('div'); box.id = 'ks-print'; box.className = 'ks-root ks-printbox'; document.body.appendChild(box); }
      box.innerHTML = printHead(title) + html;
      document.body.classList.add('ks-printing');
      var done = false;
      function clean() { if (done) return; done = true; document.body.classList.remove('ks-printing'); box.innerHTML = ''; window.removeEventListener('afterprint', clean); }
      window.addEventListener('afterprint', clean);
      setTimeout(clean, 120000);
      if (st.sys && st.sys.id) event('print', { section: what });
      try { window.print(); } catch (e) { clean(); }
    }

    // ================= A. list =================
    function listHTML() {
      var h = '<div class="ks-head"><div><h2 class="ks-title">Key systems</h2><div class="ks-sub">Master key systems for buildings — residential and commercial.</div></div>' +
        '<div class="ks-acts">' + btn('🔧 Pin a lock', 'pinTool') + btn('+ New key system', 'newSys', '', 'red') + '</div></div>';
      h += '<input type="search" data-f="q" placeholder="Search by name, site or customer" aria-label="Search key systems" value="' + esc(st.q) + '">';
      if (st.opts.customerId || st.opts.customerName) {
        h += '<div class="ks-msg info" style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap">' +
          '<span>' + (st.allCust ? 'Showing every customer' : 'Showing ' + esc(st.opts.customerName || 'this customer') + ' only') + '</span>' +
          btn(st.allCust ? 'Show only this customer' : 'Show all', 'toggleCust') + '</div>';
      }
      h += '<div id="ks-rows" style="margin-top:10px">' + rowsHTML() + '</div>';
      return h;
    }
    function filtered() {
      var q = st.q.trim().toLowerCase(), list = st.list || [];
      return list.filter(function (r) {
        if (!st.allCust && (st.opts.customerId || st.opts.customerName)) {
          var okId = st.opts.customerId && r.customer_id === st.opts.customerId;
          var okName = st.opts.customerName && String(r.customer_name || '').toLowerCase() === String(st.opts.customerName).toLowerCase();
          if (!okId && !okName) return false;
        }
        return !q || [r.name, r.site, r.customer_name].join(' ').toLowerCase().indexOf(q) >= 0;
      });
    }
    function rowsHTML() {
      if (st.list === null) return '<div class="ks-empty">Loading…</div>';
      if (st.listErr) return msg('bad', esc(st.listErr));
      var rows = filtered();
      if (!rows.length) {
        if (st.list.length) return '<div class="ks-empty">No key system matches.</div>';
        return '<div class="ks-card ks-empty"><b style="color:var(--ks-ink)">No key systems yet.</b><br>A key system is one building’s keys arranged in levels — each person’s key opens their own doors, a manager’s key opens a group, and the top master opens everything.</div>';
      }
      return rows.map(function (r) {
        var nk = r.n_keys || 0, nd = r.n_doors || 0;
        return '<div class="ks-row" role="button" tabindex="0" data-act="openSys" data-id="' + esc(r.id) + '"><div class="ks-l"><div class="ks-t">' + esc(r.name || '(no name)') + '</div>' +
          '<div class="ks-s">' + esc([r.site, r.customer_name].filter(Boolean).join(' · ') || 'No site or customer') + '</div>' +
          '<div class="ks-s">' + esc(specName(r.spec)) + ' · ' + nk + ' key' + (nk === 1 ? '' : 's') + ' · ' + nd + ' door' + (nd === 1 ? '' : 's') + (r.updated_at ? ' · updated ' + esc(fmtDate(r.updated_at)) : '') + '</div></div><span class="ks-pill">Open ›</span></div>';
      }).join('');
    }

    // ================= B. new system =================
    function startNew() {
      var spec = 'sc';
      st.f = { name: '', site: '', customer_id: st.opts.customerId || null, customer_name: st.opts.customerName || '', spec: spec, pins: specOf(spec).defaultPins,
        tmk: blank(specOf(spec).defaultPins), ctl: blank(specOf(spec).defaultPins), masters: 3, per: 3 };
      st.view = 'new'; loadCustomers(); draw();
    }
    function loadCustomers() {
      var c = []; try { if (window.TKS && TKS.list) c = TKS.list('customers') || []; } catch (e) { c = []; }
      st.customers = (Array.isArray(c) ? c : []).map(function (x) { return { id: x.id, name: x.name || (x.data && x.data.name) || '' }; }).filter(function (x) { return x.name; })
        .sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    function newHTML() {
      var f = st.f, S = specOf(f.spec);
      var h = '<div class="ks-head"><h2 class="ks-title">New key system</h2><div class="ks-acts">' + btn('‹ Cancel', 'cancelNew') + '</div></div>';
      h += '<div class="ks-card"><h3>The building</h3>';
      h += '<label class="ks-lab" for="ks-n-name">System name</label><input type="text" id="ks-n-name" data-f="nf.name" placeholder="e.g. Maple Street Offices" value="' + esc(f.name) + '">';
      h += '<label class="ks-lab" for="ks-n-site">Site / address</label><input type="text" id="ks-n-site" data-f="nf.site" placeholder="e.g. Building A, 12 Maple St" value="' + esc(f.site) + '">';
      if (st.customers && st.customers.length) {
        h += '<label class="ks-lab" for="ks-n-pick">Pick a customer (optional)</label><select id="ks-n-pick" data-f="nf.pick"><option value="">— type a name below instead —</option>' +
          st.customers.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === f.customer_id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>';
      }
      h += '<label class="ks-lab" for="ks-n-cust">Customer name</label><input type="text" id="ks-n-cust" data-f="nf.customer_name" placeholder="Who owns or manages the building" value="' + esc(f.customer_name) + '"></div>';
      h += '<div class="ks-card"><h3>The lock</h3><div class="ks-grid2"><div><label class="ks-lab">Lock type</label>' + specSelect('nf.spec', f.spec) + '</div>' +
        '<div><label class="ks-lab">Pins</label>' + pinsSelect('nf.pins', f.spec, f.pins) + '</div></div>';
      h += '<div class="ks-hint" style="margin-top:8px">' + esc(specFacts(f.spec)) + '</div>';
      if (notVerified(f.spec)) h += msg('warn', '<b>Not yet verified.</b> ' + esc(notVerifiedLine(f.spec)));
      h += '</div>';
      h += '<div class="ks-card"><h3>Top master key</h3><div class="ks-hint">The cuts of the key that opens everything. Every other key is worked out from it. Type one digit per box, bow to tip.</div>' +
        cutsHTML('nt', f.tmk, 'Top master') + '';
      if (S.ic) h += '<label class="ks-lab">Control key (IC core removal)</label>' + cutsHTML('nc', f.ctl, 'Control key');
      h += '<div id="ks-nvalid"></div></div>';
      h += '<div class="ks-card"><h3>How big</h3><div class="ks-grid2"><div><label class="ks-lab" for="ks-n-m">Master keys (AA, AB…)</label><input type="text" id="ks-n-m" inputmode="numeric" data-f="nf.masters" value="' + esc(f.masters) + '"></div>' +
        '<div><label class="ks-lab" for="ks-n-p">Keys under each master</label><input type="text" id="ks-n-p" inputmode="numeric" data-f="nf.per" value="' + esc(f.per) + '"></div></div></div>';
      h += '<div class="ks-acts">' + btn('Create', 'create', '', 'red') + btn('Cancel', 'cancelNew') + '</div>';
      return h;
    }
    // what is wrong (or still missing) with the numbers typed so far
    function checkNew(f) {
      var S = specOf(f.spec), n = f.pins, errs = [], hints = [], cap = null, ready = false;
      if (!full(f.tmk, n)) hints.push('Type all ' + n + ' cuts of the top master.');
      else {
        var v = KC.validateKey(f.spec, f.tmk, { pins: n });
        v.errors.forEach(function (e) { errs.push('Top master: ' + e); });
        if (S.ic) {
          if (!full(f.ctl, n)) hints.push('Type all ' + n + ' cuts of the control key.');
          else {
            var vc = KC.validateKey(f.spec, f.ctl, { pins: n });
            vc.errors.forEach(function (e) { errs.push('Control key: ' + e); });
            if (vc.ok && f.ctl.join('') === f.tmk.join('')) errs.push('The control key cannot be the same as the top master.');
            if (v.ok && vc.ok && f.spec === 's6300') KC.pinLock(f.spec, { operating: [f.tmk], control: f.ctl, pins: n }).errors.forEach(function (e) { errs.push(e); });
          }
        }
        if (!errs.length && !hints.length) {
          var d = KC.designTPP(f.spec, { tmk: f.tmk, pins: n, step: 2, masterPositions: [1, 2], mastersWanted: 0, keysPerMaster: 0 });
          if (d.ok) { cap = d.capacity; ready = true; } else d.errors.forEach(function (e) { errs.push(e); });
        }
      }
      var m = parseInt(f.masters, 10), p = parseInt(f.per, 10);
      if (ready) {
        if (!(m >= 1)) { errs.push('Master keys: type a number, 1 or more.'); ready = false; }
        else if (m > cap.masters) { errs.push('This top master only has room for ' + cap.masters + ' master keys.'); ready = false; }
        if (!(p >= 0 && String(f.per).trim() !== '')) { errs.push('Keys under each master: type a number, 0 or more.'); ready = false; }
        else if (p > cap.perMaster) { errs.push('Each master only has room for ' + cap.perMaster + ' keys.'); ready = false; }
      }
      return { errors: errs, hints: hints, cap: cap, ready: ready, m: m, p: p };
    }
    function paintNewValid() {
      var el = $('#ks-nvalid'); if (!el) return;
      var c = checkNew(st.f), h = '';
      c.errors.forEach(function (e) { h += msg('bad', esc(e)); });
      if (!c.errors.length) c.hints.forEach(function (x) { h += msg('info', esc(x)); });
      if (c.cap) h += msg('ok', '✓ These numbers work for ' + esc(specName(st.f.spec)) + '. Room for <b>' + c.cap.masters + '</b> master keys × <b>' + c.cap.perMaster + '</b> keys each (before spacing checks).');
      el.innerHTML = h;
    }
    function create() {
      var f = st.f, c = checkNew(f);
      if (!String(f.name).trim()) { tell('Give the key system a name (for example the building’s name).'); return; }
      if (!c.ready) { paintNewValid(); tell(c.errors[0] || c.hints[0] || 'Fill in the top master first.', 'Not ready yet'); return; }
      var d = KC.designTPP(f.spec, { tmk: f.tmk, pins: f.pins, step: 2, masterPositions: [1, 2], mastersWanted: c.m, keysPerMaster: c.p });
      if (!d.ok) { tell(d.errors.join(' '), 'Could not design that'); return; }
      var doc = { v: 1, method: 'tpp', step: 2, masterPositions: [1, 2], tmk: f.tmk.slice(), control: specOf(f.spec).ic ? f.ctl.slice() : null,
        keys: d.keys.map(function (k) { return { symbol: k.symbol, cuts: k.cuts.slice(), level: k.level, parent: k.parent || null, holder: '', copies: 0, status: 'active', notes: '' }; }), doors: [], notes: '' };
      var nm = doc.keys.filter(function (k) { return k.level === 1; }).length;
      st.sys = { id: null, name: f.name.trim(), site: f.site.trim(), customer_id: f.customer_id || null, customer_name: f.customer_name.trim(), spec: f.spec, pins: f.pins, data: doc };
      save().then(function (ok) {
        if (!ok) { st.sys = null; return; }
        st.flash = 'Made ' + doc.keys.length + ' keys: the top master, ' + nm + ' master key' + (nm === 1 ? '' : 's') + ' and ' + (doc.keys.length - 1 - nm) + ' single keys.' +
          (nm < c.m || doc.keys.length - 1 - nm < c.m * c.p ? ' Some were left out because they would break the cut spacing rules.' : '');
        st.view = 'edit'; st.tab = 'system'; st.selDoor = null; st.hist = null;
        st.lostKey = (doc.keys.filter(function (k) { return k.level > 0; })[0] || doc.keys[0]).symbol;
        draw();
      });
    }

    // ================= C. editor =================
    function editHTML() {
      var s = st.sys, tabs = [['system', 'System'], ['keys', 'Keys'], ['doors', 'Doors'], ['chart', 'Pin chart'], ['lost', 'Lost key'], ['history', 'History']];
      var h = '<div class="ks-head"><div style="min-width:0"><h2 class="ks-title" id="ks-ttl">' + esc(s.name) + '</h2><div class="ks-sub">' + esc([s.site, s.customer_name, specName(s.spec)].filter(Boolean).join(' · ')) + '</div></div>' +
        '<div class="ks-acts">' + btn('‹ All systems', 'back') + '</div></div>';
      h += '<div class="ks-bar" id="ks-bar"' + (st.dirty ? '' : ' hidden') + '><span>Unsaved changes</span>' + btn('Save', 'save', '', 'red') + '</div>';
      if (st.flash) { h += msg('ok', esc(st.flash)); st.flash = ''; }
      h += '<div class="ks-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" class="' + (st.tab === t[0] ? 'on' : '') + '" aria-selected="' + (st.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
      h += '<div id="ks-body">' + tabHTML() + '</div>';
      return h;
    }
    function tabHTML() {
      switch (st.tab) {
        case 'keys': return tabKeys();
        case 'doors': return tabDoors();
        case 'chart': return tabChart();
        case 'lost': return tabLost();
        case 'history': return tabHistory();
        default: return tabSystem();
      }
    }
    function drawTab() {
      var b = body(); if (b) b.innerHTML = tabHTML();
      root.querySelectorAll('.ks-tabs button').forEach(function (x) { var on = x.getAttribute('data-tab') === st.tab; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
      if (st.tab === 'history' && st.hist === null) loadHistory();
    }

    // ---- System tab ----
    function treeHTML() {
      var ks = keys();
      function kids(p) { return ks.filter(function (k) { return k.parent === p; }); }
      function line(k, note) {
        return '<span class="ks-pill red">' + esc(k.symbol) + '</span> <span class="ks-mono">' + k.cuts.join(' ') + '</span>' + (k.holder ? ' <span class="ks-who">· ' + esc(k.holder) + '</span>' : '') + (note ? ' <span class="ks-hint">' + note + '</span>' : '') + (k.status !== 'active' ? ' <span class="ks-pill warn">' + esc(k.status) + '</span>' : '');
      }
      var gm = ks.filter(function (k) { return k.level === 0; })[0]; if (!gm) return '<div class="ks-hint">No keys yet.</div>';
      return '<ul class="ks-tree"><li>' + line(gm, 'top master — opens everything') + '<ul>' + kids(gm.symbol).map(function (m) {
        return '<li>' + line(m, 'master') + '<ul>' + kids(m.symbol).map(function (c) { return '<li>' + line(c) + '</li>'; }).join('') + '</ul></li>';
      }).join('') + '</ul></li></ul>';
    }
    function tabSystem() {
      var s = st.sys, d = s.data, S = specOf(s.spec), cap = designCap();
      var h = '<div class="ks-card"><h3>Details</h3>' +
        '<label class="ks-lab" for="ks-s-name">System name</label><input type="text" id="ks-s-name" data-f="sys.name" value="' + esc(s.name) + '">' +
        '<div class="ks-grid2"><div><label class="ks-lab" for="ks-s-site">Site</label><input type="text" id="ks-s-site" data-f="sys.site" value="' + esc(s.site) + '"></div>' +
        '<div><label class="ks-lab" for="ks-s-cust">Customer</label><input type="text" id="ks-s-cust" data-f="sys.customer_name" value="' + esc(s.customer_name) + '"></div></div></div>';
      h += '<div class="ks-card"><h3>Lock and method</h3><div class="ks-line"><div><b>' + esc(S.name) + '</b> · ' + s.pins + ' pins</div>' + (notVerified(s.spec) ? '<span class="ks-pill warn">Not yet verified</span>' : '<span class="ks-pill ok">Verified</span>') + '</div>' +
        '<div class="ks-hint">' + esc(specFacts(s.spec)) + '</div><div class="ks-hint">Method: total position progression · ' + (d.step || 2) + '-step · master positions ' + (d.masterPositions || []).join(', ') + '</div>';
      (S.notes || []).forEach(function (n) { h += '<div class="ks-hint">' + esc(n) + '</div>'; });
      if (S.source) h += '<div class="ks-hint">Source: ' + esc(S.source) + '</div>';
      if (notVerified(s.spec)) h += msg('warn', esc(notVerifiedLine(s.spec)));
      h += '</div>';
      h += '<div class="ks-card"><h3>Top master key (GM)</h3><div class="ks-hint">The key that opens everything. Every other key is worked out from it.</div>';
      if (st.ed) {
        h += '<label class="ks-lab">Top master cuts</label>' + cutsHTML('et', st.ed.tmk, 'Top master');
        if (S.ic) h += '<label class="ks-lab">Control key cuts</label>' + cutsHTML('ec', st.ed.ctl, 'Control key');
        h += '<div id="ks-evalid"></div><div class="ks-acts" style="margin-top:10px">' + btn('Apply new cuts', 'applyCuts', '', 'red') + btn('Cancel', 'cancelCuts') + '</div>';
      } else {
        h += '<label class="ks-lab">Cuts, bow to tip</label><div class="ks-mono" style="font-size:22px;font-weight:700">' + d.tmk.join(' ') + '</div>';
        if (S.ic && d.control) h += '<label class="ks-lab">Control key</label><div class="ks-mono" style="font-size:22px;font-weight:700">' + d.control.join(' ') + '</div>';
        h += '<div class="ks-acts" style="margin-top:10px">' + btn('Edit cuts', 'editCuts') + '</div>';
      }
      h += '</div>';
      h += '<div class="ks-card"><h3>Levels</h3><div class="ks-hint">Positions 1–2 make the master keys (AA, AB…); the rest make each person’s or door’s key (AA1, AA2…).</div>' + treeHTML();
      var nm = masters().length, ns = keys().filter(function (k) { return k.level === 2; }).length;
      h += '<div class="ks-hint" style="margin-top:8px">You have ' + nm + ' master key' + (nm === 1 ? '' : 's') + ' and ' + ns + ' single key' + (ns === 1 ? '' : 's') + '.' +
        (cap ? ' Room to grow: ' + cap.masters + ' master keys × ' + cap.perMaster + ' keys each.' : '') + '</div></div>';
      h += '<div class="ks-card"><h3>Notes</h3><textarea data-f="sys.notes" aria-label="Notes" placeholder="Anything worth remembering about this system">' + esc(d.notes) + '</textarea></div>';
      h += '<div class="ks-acts">' + btn('🖨 Print system sheet', 'print', 'data-what="system"') + btn('Delete this system', 'del', '', 'danger') + '</div>';
      return h;
    }
    function checkEdit() {
      var e = st.ed, s = st.sys, errs = [], S = specOf(s.spec), n = s.pins;
      if (!full(e.tmk, n)) errs.push('Type all ' + n + ' cuts of the top master.');
      else KC.validateKey(s.spec, e.tmk, { pins: n }).errors.forEach(function (x) { errs.push('Top master: ' + x); });
      if (S.ic) {
        if (!full(e.ctl, n)) errs.push('Type all ' + n + ' cuts of the control key.');
        else {
          KC.validateKey(s.spec, e.ctl, { pins: n }).errors.forEach(function (x) { errs.push('Control key: ' + x); });
          if (full(e.tmk, n) && e.ctl.join('') === e.tmk.join('')) errs.push('The control key cannot be the same as the top master.');
          if (!errs.length && s.spec === 's6300') KC.pinLock(s.spec, { operating: [e.tmk], control: e.ctl, pins: n }).errors.forEach(function (x) { errs.push(x); });
        }
      }
      return errs;
    }
    function paintEdValid() { var el = $('#ks-evalid'); if (!el) return; var e = checkEdit(); el.innerHTML = e.length ? e.map(function (x) { return msg('bad', esc(x)); }).join('') : ''; }
    function applyCuts() {
      var errs = checkEdit(); if (errs.length) { paintEdValid(); return; }
      var s = st.sys, d = s.data, e = st.ed, same = e.tmk.join() === d.tmk.join();
      var ms = masters(), counts = ms.map(function (m) { var mx = 0; keys().forEach(function (k) { if (k.parent === m.symbol) { var nn = parseInt(String(k.symbol).slice(m.symbol.length), 10); if (nn > mx) mx = nn; } }); return mx; });
      var res = null;
      if (!same) {
        res = KC.designTPP(s.spec, { tmk: e.tmk, pins: s.pins, step: d.step || 2, masterPositions: d.masterPositions || [1, 2], mastersWanted: ms.length, keysPerMaster: counts });
        if (!res.ok) { tell(res.errors.join(' '), 'Could not apply'); return; }
      }
      ask('Change the cuts?', 'This changes every pin chart in this system' + (same ? '' : ', and re-cuts every key from the new top master (keys already cut will no longer match)') + '. Continue?', 'Change cuts', true).then(function (yes) {
        if (!yes) return;
        if (res) { res.keys.forEach(function (nk) { var k = keyBy(d.keys, nk.symbol); if (k) k.cuts = nk.cuts.slice(); }); d.tmk = e.tmk.slice(); }
        if (specOf(s.spec).ic) d.control = e.ctl.slice();
        st.ed = null; touch(); drawTab();
      });
    }

    // ---- Keys tab ----
    function tabKeys() {
      var ms = masters();
      var h = '<div class="ks-card"><h3>Keys</h3><div class="ks-legend"><span class="ks-who">● Who has it</span><span class="ks-what">● What it opens</span><span class="ks-hint">Fill in either, both, or neither.</span></div><div style="margin-top:6px">';
      h += keys().map(function (k) {
        var what = whatText(k), inactive = k.status !== 'active';
        return '<div class="ks-line" data-sym="' + esc(k.symbol) + '"><div style="min-width:0;flex:1 1 220px">' +
          '<div><span class="ks-pill red">' + esc(k.symbol) + '</span> <span class="ks-mono" style="font-weight:700">' + k.cuts.join(' ') + '</span> ' + (inactive ? '<span class="ks-pill warn">' + esc(k.status) + '</span>' : '') + '</div>' +
          '<label class="ks-lab ks-who" for="ks-h-' + esc(k.symbol) + '">● Who has it</label><input type="text" id="ks-h-' + esc(k.symbol) + '" data-f="key.holder" data-sym="' + esc(k.symbol) + '" placeholder="Person or role, e.g. Janitor" value="' + esc(k.holder) + '">' +
          '<div class="ks-hint" style="margin-top:6px"><span class="ks-what">● What it opens:</span> ' + (what ? esc(what) : '—') + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">' +
          '<div class="ks-step"><button type="button" class="ks-btn" data-act="copies" data-d="-1" data-sym="' + esc(k.symbol) + '" aria-label="One fewer copy of ' + esc(k.symbol) + '">−</button><b title="copies cut">' + k.copies + '</b><button type="button" class="ks-btn" data-act="copies" data-d="1" data-sym="' + esc(k.symbol) + '" aria-label="One more copy of ' + esc(k.symbol) + '">+</button></div>' +
          '<div class="ks-hint">cut</div>' +
          '<select data-f="key.status" data-sym="' + esc(k.symbol) + '" aria-label="Status of ' + esc(k.symbol) + '">' + ['active', 'lost', 'retired'].map(function (x) { return '<option value="' + x + '"' + (k.status === x ? ' selected' : '') + '>' + x.charAt(0).toUpperCase() + x.slice(1) + '</option>'; }).join('') + '</select>' +
          '<div class="ks-acts">' + btn('Issue', 'issue', 'data-sym="' + esc(k.symbol) + '"' + (inactive ? ' disabled' : '')) + btn('Return', 'return', 'data-sym="' + esc(k.symbol) + '"' + (k.copies < 1 ? ' disabled' : '')) + '</div></div></div>';
      }).join('') + '</div></div>';
      if (ms.length) {
        h += '<div class="ks-card"><h3>Add a key</h3><div class="ks-hint">Takes the next unused key under a master.</div><label class="ks-lab" for="ks-addm">Under master</label>' +
          '<select id="ks-addm">' + ms.map(function (m) { return '<option value="' + esc(m.symbol) + '">' + esc(m.symbol) + (m.holder ? ' · ' + esc(m.holder) : '') + '</option>'; }).join('') + '</select>' +
          '<div class="ks-acts" style="margin-top:10px">' + btn('+ Add a key under…', 'addKey', '', 'red') + '</div></div>';
      }
      h += '<div class="ks-acts">' + btn('🖨 Print key list (for cutting)', 'print', 'data-what="keys"') + '</div>';
      return h;
    }
    function addKey() {
      var sel = $('#ks-addm'), m = sel && keyBy(keys(), sel.value); if (!m) return;
      var s = st.sys, d = s.data, mm = masters(), mi = mm.indexOf(m);
      var under = keys().filter(function (k) { return k.parent === m.symbol; }), mx = 0, used = {};
      under.forEach(function (k) { used[k.cuts.join(',')] = 1; var nn = parseInt(String(k.symbol).slice(m.symbol.length), 10); if (nn > mx) mx = nn; });
      var kpm = mm.map(function (x, i) { return i === mi ? under.length + 30 : 0; });
      var r = KC.designTPP(s.spec, { tmk: d.tmk, pins: s.pins, step: d.step || 2, masterPositions: d.masterPositions || [1, 2], mastersWanted: mm.length, keysPerMaster: kpm });
      if (!r.ok) { tell(r.errors.join(' '), 'Could not add a key'); return; }
      var next = null;
      for (var i = 0; i < r.keys.length; i++) { var c = r.keys[i]; if (c.parent === m.symbol && c.level === 2 && !used[c.cuts.join(',')] && c.cuts.join(',') !== m.cuts.join(',')) { next = c; break; } }
      if (!next) { tell('There is no room for more keys under ' + m.symbol + '. Try another master.', 'No room'); return; }
      d.keys.push({ symbol: m.symbol + (mx + 1), cuts: next.cuts.slice(), level: 2, parent: m.symbol, holder: '', copies: 0, status: 'active', notes: '' });
      touch(); drawTab();
    }
    function issueReturn(kind, sym) {
      var k = keyBy(keys(), sym); if (!k) return;
      var go = function (holder) {
        if (holder === null) return;
        k.holder = holder; k.copies = Math.max(0, k.copies + (kind === 'issue' ? 1 : -1));
        event(kind, { key: sym, holder: k.holder }).then(function (r) {
          if (r.error) { tell(errText(r.error)); return; }
          return save().then(function () { drawTab(); });
        });
      };
      if (kind === 'return') return go(k.holder);
      if (k.holder) return go(k.holder);
      askText('Issue key ' + sym, 'Who is getting this key? (a person or a role)', '').then(function (v) { go(v === null ? null : String(v).trim()); });
    }

    // ---- Doors tab ----
    function keyOptions(sel) {
      return '<option value="">— not set yet —</option>' + keys().map(function (k) { return '<option value="' + esc(k.symbol) + '"' + (k.symbol === sel ? ' selected' : '') + '>' + esc(keyLabel(k)) + '</option>'; }).join('');
    }
    function tabDoors() {
      var e = st.doorEdit, h = '';
      if (e) {
        h += '<div class="ks-card"><h3>' + (e.isNew ? 'Add a door' : 'Edit door') + '</h3>' +
          '<label class="ks-lab" for="ks-d-name">What it is</label><input type="text" id="ks-d-name" data-f="df.name" placeholder="e.g. Suite 101 · front door" value="' + esc(e.name) + '">' +
          '<label class="ks-lab" for="ks-d-area">Area (optional)</label><input type="text" id="ks-d-area" data-f="df.area" placeholder="e.g. First floor" value="' + esc(e.area) + '">' +
          '<label class="ks-lab" for="ks-d-key">Key it is set to</label><select id="ks-d-key" data-f="df.key">' + keyOptions(e.key) + '</select>' +
          '<label class="ks-lab" for="ks-d-notes">Notes (optional)</label><input type="text" id="ks-d-notes" data-f="df.notes" value="' + esc(e.notes) + '">' +
          '<div class="ks-acts" style="margin-top:10px">' + btn('Save door', 'doorSave', '', 'red') + btn('Cancel', 'doorCancel') + '</div></div>';
      }
      h += '<div class="ks-card"><h3>Doors &amp; areas</h3><div class="ks-hint">The physical side: each door or area and which key it is set to. Tap one for its pin chart.</div><div style="margin-top:8px">';
      if (!doors().length) h += '<div class="ks-empty">No doors yet. Add the first one below.</div>';
      h += doors().map(function (d) {
        var ch = d.key ? chainFor(d.key) : [];
        return '<div class="ks-row" role="button" tabindex="0" data-act="chartDoor" data-id="' + esc(d.id) + '"><div class="ks-l"><div class="ks-t ks-what">' + esc(d.name) + '</div>' +
          '<div class="ks-s">' + esc([d.area, d.key ? 'set to ' + d.key : 'key not set', ch.length ? 'opened by ' + ch.join(', ') : ''].filter(Boolean).join(' · ')) + '</div></div>' +
          '<div class="ks-acts">' + btn('Edit', 'doorEdit', 'data-id="' + esc(d.id) + '"') + btn('Remove', 'doorRemove', 'data-id="' + esc(d.id) + '"', 'danger') + '</div></div>';
      }).join('');
      h += '</div></div><div class="ks-acts">' + btn('+ Add a door', 'doorNew', '', 'red') + btn('🖨 Print door list', 'print', 'data-what="doors"') + '</div>';
      return h;
    }

    // ---- Pin chart tab ----
    function chartFor(door) {
      var s = st.sys, S = specOf(s.spec), chain = door.key ? chainFor(door.key) : [];
      var out = { title: door.name, sub: '', table: '', checks: '', empty: false };
      if (!chain.length) { out.empty = true; out.checks = msg('info', 'Pick which key this door is set to (Doors tab) to see its pin chart.'); return out; }
      var pl = KC.pinForKey(s.spec, keys(), door.key, s.data.control, s.pins);
      var k = keyBy(keys(), door.key);
      out.sub = 'Set to <b>' + esc(door.key) + '</b>' + (k && k.holder ? ' · <span class="ks-who">' + esc(k.holder) + '</span>' : '') + ' · opened by ' + esc(chain.join(' → ')) + ' · ' + esc(S.name);
      if (!pl.rows.length) { out.checks = engineBlocks(S, pl); return out; }
      out.table = '<div class="ks-scroll">' + tableHTML(S, pl.rows, chain) + '</div>';
      var chk = KC.checkSystemLock(pl.rows, chain, keys());
      out.checks = chk.ok ? msg('ok', '✓ Opened only by ' + esc(chain.join(', ')) + '. No other key in this system opens this door.')
        : msg('bad', '✗ Also opened by ' + esc(chk.extra.join(', ')) + ' — that key should not open this door. Pick a different key for it.');
      out.checks += engineBlocks(S, pl);
      return out;
    }
    function chartCard(door) {
      var c = chartFor(door);
      return '<div class="ks-card"><h3>' + esc(door.name) + '</h3><div class="ks-hint">' + c.sub + '</div>' + c.table + c.checks + '</div>';
    }
    function tabChart() {
      var ds = doors();
      if (!ds.length) return '<div class="ks-card"><h3>Pin chart</h3><div class="ks-empty">Add a door first (Doors tab). A pin chart is worked out for one door at a time.</div></div>';
      var d = ds.filter(function (x) { return x.id === st.selDoor; })[0] || ds[0]; st.selDoor = d.id;
      var c = chartFor(d);
      return '<div class="ks-card"><h3>Pin chart · <span class="ks-what">' + esc(d.name) + '</span></h3>' +
        '<div class="ks-chips">' + ds.map(function (x) { return '<button type="button" data-act="chartDoor" data-id="' + esc(x.id) + '" class="' + (x.id === d.id ? 'on' : '') + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' +
        '<div class="ks-hint" style="margin-top:8px">' + c.sub + '</div>' + c.table + c.checks + '</div>' +
        '<div class="ks-acts">' + btn('🖨 Print this chart', 'print', 'data-what="chart"', 'red') + btn('🖨 Print all doors', 'print', 'data-what="chartall"') + '</div>';
    }

    // ---- Lost key tab ----
    function lostFacts() {
      var k = keyBy(keys(), st.lostKey); if (!k) return null;
      var ds = doorsUnder(k.symbol), recut = keys().filter(function (x) { return x.symbol === k.symbol || chainFor(x.symbol).indexOf(k.symbol) >= 0; });
      return { k: k, doors: ds, recut: recut, lvl: k.level === 0 ? 'the top master' : k.level === 1 ? 'a master key' : 'a single key' };
    }
    function lostBody(f) {
      var k = f.k, others = chainFor(k.symbol).filter(function (x) { return x !== k.symbol; });
      return msg(k.level === 2 ? 'warn' : 'bad', '<b>' + esc(k.symbol) + '</b> is ' + f.lvl + '. Rekey <b>' + f.doors.length + ' door' + (f.doors.length === 1 ? '' : 's') + '</b>.') +
        '<div class="ks-line"><div><div style="font-weight:800" class="ks-what">Doors to rekey</div><div class="ks-hint">' + (f.doors.map(function (d) { return esc(d.name); }).join('<br>') || '— none of your doors are set to this key') + '</div></div></div>' +
        '<div class="ks-line"><div><div style="font-weight:800">New keys to cut</div><div class="ks-hint">' + f.recut.map(function (x) { return esc(x.symbol) + (x.holder ? ' (<span class="ks-who">' + esc(x.holder) + '</span>)' : '') + ' — ' + Math.max(1, x.copies) + ' cop' + (Math.max(1, x.copies) > 1 ? 'ies' : 'y'); }).join('<br>') + '</div></div></div>' +
        '<div class="ks-line"><div><div style="font-weight:800">Not affected</div><div class="ks-hint">' + (k.level === 2 ? 'All other keys' + (others.length ? ', including ' + esc(others.join(' and ')) + ',' : '') + ' keep working.' : 'Keys outside ' + esc(k.symbol) + ' keep working.') + '</div></div></div>';
    }
    function tabLost() {
      if (!keys().length) return '<div class="ks-card"><div class="ks-empty">No keys yet.</div></div>';
      if (!keyBy(keys(), st.lostKey)) st.lostKey = keys()[0].symbol;
      var f = lostFacts();
      return '<div class="ks-card"><h3>A key was lost</h3><div class="ks-hint">Pick the key. The doors to rekey and the keys to cut are listed — nothing else changes.</div>' +
        '<div class="ks-chips">' + keys().map(function (k) { return '<button type="button" data-act="lostPick" data-sym="' + esc(k.symbol) + '" class="' + (k.symbol === st.lostKey ? 'on' : '') + '">' + esc(keyLabel(k)) + '</button>'; }).join('') + '</div>' +
        '<div style="margin-top:10px">' + lostBody(f) + '</div></div>' +
        '<div class="ks-acts">' + btn('Log as lost', 'logLost', '', f.k.status === 'lost' ? 'danger' : 'red') + btn('Start rekey quote', 'quote') + btn('🖨 Print rekey list', 'print', 'data-what="lost"') + '</div>';
    }
    function logLost() {
      var f = lostFacts(); if (!f) return;
      if (f.k.status === 'lost') { tell(f.k.symbol + ' is already logged as lost.'); return; }
      ask('Log ' + f.k.symbol + ' as lost?', 'This is written to the history and the key is marked lost. Rekey ' + f.doors.length + ' door' + (f.doors.length === 1 ? '' : 's') + ' next.', 'Log as lost', true).then(function (yes) {
        if (!yes) return;
        f.k.status = 'lost';
        event('lost', { key: f.k.symbol, holder: f.k.holder, doors: f.doors.map(function (d) { return d.name; }) }).then(function (r) {
          if (r.error) { f.k.status = 'active'; tell(errText(r.error)); return; }
          save().then(function () { drawTab(); });
        });
      });
    }

    // ---- History tab ----
    function loadHistory() {
      if (!st.sys.id) { st.hist = []; return; }
      st.hist = null; st.histErr = '';
      rpc('key_system_history', { p_id: st.sys.id, p_limit: 100 }).then(function (r) {
        if (cur !== st) return;
        if (r.error) { st.histErr = errText(r.error); st.hist = []; } else st.hist = Array.isArray(r.data) ? r.data : [];
        if (st.tab === 'history') { var b = body(); if (b) b.innerHTML = tabHistory(); }
      });
    }
    function histText(r) {
      var d = r.detail || {}, bits = [];
      if (d.key) bits.push('key ' + d.key); if (d.holder) bits.push(d.holder); if (d.section) bits.push(d.section);
      if (d.doors && d.doors.length) bits.push(d.doors.length + ' door' + (d.doors.length === 1 ? '' : 's')); if (d.text) bits.push(d.text);
      return bits.join(' · ');
    }
    function tabHistory() {
      var h = '<div class="ks-card"><h3>History</h3><div class="ks-hint">Who printed, issued, returned or lost what, and when.</div><div style="margin-top:8px">';
      if (st.hist === null) h += '<div class="ks-empty">Loading…</div>';
      else if (st.histErr) h += msg('bad', esc(st.histErr));
      else if (!st.hist.length) h += '<div class="ks-empty">Nothing recorded yet.</div>';
      else h += st.hist.map(function (r) {
        return '<div class="ks-line"><div style="min-width:0"><div style="font-weight:800">' + esc(KIND_TEXT[r.kind] || r.kind) + '</div><div class="ks-hint">' + esc(histText(r)) + '</div></div>' +
          '<div class="ks-hint" style="text-align:right">' + esc(fmtWhen(r.at)) + '<br>' + esc([r.who, r.role].filter(Boolean).join(' · ')) + '</div></div>';
      }).join('');
      h += '</div></div><div class="ks-card"><h3>Add a note</h3><input type="text" id="ks-hn" aria-label="Note" placeholder="e.g. Tenant in 102 moved out, key returned">' +
        '<div class="ks-acts" style="margin-top:10px">' + btn('Add note', 'addNote') + '</div></div>';
      return h;
    }

    // ---- print builders (no buttons or inputs inside) ----
    function printSection(what) {
      var s = st.sys, d = s.data, S = specOf(s.spec), h = '';
      if (what === 'system') {
        h += '<div class="ks-card"><b>Top master</b> <span class="ks-mono">' + d.tmk.join(' ') + '</span>' + (S.ic && d.control ? '<br><b>Control key</b> <span class="ks-mono">' + d.control.join(' ') + '</span>' : '') + '<br>' + esc(specFacts(s.spec)) + '</div>' +
          '<div class="ks-card"><b>Levels</b>' + treeHTML() + '</div>' + (d.notes ? '<div class="ks-card"><b>Notes</b><br>' + esc(d.notes) + '</div>' : '') + (notVerified(s.spec) ? '<p>Not yet verified — ' + esc(notVerifiedLine(s.spec)) + '</p>' : '');
        return h;
      }
      if (what === 'keys') {
        return '<div class="ks-card"><table><thead><tr><th class="ks-k">Key</th><th>Cuts</th><th class="ks-k">Who has it</th><th class="ks-k">What it opens</th><th>Cut</th><th>Status</th></tr></thead><tbody>' +
          keys().map(function (k) { return '<tr><td class="ks-k"><b>' + esc(k.symbol) + '</b></td><td class="ks-mono">' + k.cuts.join(' ') + '</td><td class="ks-k">' + esc(k.holder || '—') + '</td><td class="ks-k">' + esc(whatText(k) || '—') + '</td><td>' + k.copies + '</td><td>' + esc(k.status) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (what === 'doors') {
        return '<div class="ks-card"><table><thead><tr><th class="ks-k">Door / area</th><th class="ks-k">Area</th><th>Set to</th><th class="ks-k">Opened by</th></tr></thead><tbody>' +
          doors().map(function (x) { return '<tr><td class="ks-k"><b>' + esc(x.name) + '</b></td><td class="ks-k">' + esc(x.area || '') + '</td><td>' + esc(x.key || '—') + '</td><td class="ks-k">' + esc(x.key ? chainFor(x.key).join(', ') : '') + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      if (what === 'chart') { var dd = doors().filter(function (x) { return x.id === st.selDoor; })[0] || doors()[0]; return dd ? chartCard(dd) : ''; }
      if (what === 'chartall') return doors().map(chartCard).join('');
      if (what === 'lost') { var f = lostFacts(); return f ? '<div class="ks-card"><h3>Lost key ' + esc(f.k.symbol) + '</h3>' + lostBody(f) + '</div>' : ''; }
      return '';
    }

    // ================= D. pin a lock =================
    function startPin() {
      st.pt = { spec: 'sc', pins: 6, n: 2, rows: [0, 1, 2, 3].map(function () { return { cuts: blank(6) }; }), control: blank(6) };
      st.view = 'pin'; draw(); paintPt();
    }
    function ptResize() { var p = st.pt; p.rows.forEach(function (r) { r.cuts = fit(r.cuts, p.pins); }); p.control = fit(p.control, p.pins); }
    function pinHTML() {
      var p = st.pt, S = specOf(p.spec), h = '<div class="ks-head"><div><h2 class="ks-title">🔧 Pin a lock</h2><div class="ks-sub">Quick tool — nothing is saved.</div></div><div class="ks-acts">' + btn('‹ Back', 'back') + '</div></div>';
      h += '<div class="ks-card"><div class="ks-grid2"><div><label class="ks-lab">Lock type</label>' + specSelect('pt.spec', p.spec) + '</div><div><label class="ks-lab">Pins</label>' + pinsSelect('pt.pins', p.spec, p.pins) + '</div></div>';
      h += '<div class="ks-hint" style="margin-top:8px">' + esc(specFacts(p.spec)) + '</div></div>';
      h += '<div class="ks-card"><h3>Keys that must open this lock</h3><div class="ks-hint">Type the cuts of each key, bow to tip. Use 2 to 4 rows: the change key, then the master above it, and so on.</div>';
      for (var i = 0; i < p.n; i++) h += '<label class="ks-lab">' + LABELS[i] + '</label>' + cutsHTML('pt' + i, p.rows[i].cuts, LABELS[i]);
      if (S.ic) h += '<label class="ks-lab">Control key (IC core)</label>' + cutsHTML('ptc', p.control, 'Control key');
      h += '<div class="ks-acts" style="margin-top:10px">' + (p.n < 4 ? btn('+ Add a row', 'ptAdd') : '') + (p.n > 2 ? btn('Remove last row', 'ptRemove') : '') + '</div></div>';
      h += '<div id="ks-ptout"></div><div class="ks-acts">' + btn('🖨 Print', 'ptPrint', '', 'red') + '</div>';
      return h;
    }
    function ptResult() {
      var p = st.pt, S = specOf(p.spec), errs = [], ok = [];
      var rows = p.rows.slice(0, p.n), labels = LABELS.slice(0, p.n), i;
      for (i = 0; i < rows.length; i++) {
        if (!full(rows[i].cuts, p.pins)) return { html: msg('info', 'Type all ' + p.pins + ' cuts for ' + (i === 0 ? 'the first key' : 'each key') + ' (' + LABELS[i] + ' is not complete).') };
        KC.validateKey(p.spec, rows[i].cuts, { pins: p.pins }).errors.forEach(function (e) { errs.push(LABELS[i] + ': ' + e); });
      }
      if (S.ic) {
        if (!full(p.control, p.pins)) return { html: msg('info', 'Type all ' + p.pins + ' cuts of the control key.') };
        KC.validateKey(p.spec, p.control, { pins: p.pins }).errors.forEach(function (e) { errs.push('Control key: ' + e); });
      }
      if (errs.length) return { html: errs.map(function (e) { return msg('bad', esc(e)); }).join('') };
      // the engine (and the pin chart) lists the highest key first, like GM → AA → AA1
      var top = rows.slice().reverse(), topLabels = labels.slice().reverse();
      var pl = KC.pinLock(p.spec, { operating: top.map(function (r) { return r.cuts; }), control: S.ic ? p.control : null, pins: p.pins });
      var h = '';
      if (pl.rows.length) {
        h += '<div class="ks-card"><h3>Pin chart</h3><div class="ks-scroll">' + tableHTML(S, pl.rows, topLabels) + '</div>';
        rows.forEach(function (r, i) { var o = KC.opens(pl.rows, r.cuts); ok.push(msg(o ? 'ok' : 'bad', (o ? '✓ ' : '✗ ') + esc(labels[i]) + ' (<span class="ks-mono">' + r.cuts.join(' ') + '</span>) ' + (o ? 'opens this lock.' : 'does NOT open this lock.'))); });
        h += ok.join('') + '</div>';
      }
      h += '<div class="ks-card">' + engineBlocks(S, pl) + '</div>';
      return { html: h, title: 'Pin a lock' };
    }
    function paintPt() { var el = $('#ks-ptout'); if (el) el.innerHTML = ptResult().html; }

    // ================= drawing & events =================
    function draw() {
      var h;
      if (st.view === 'new') h = newHTML();
      else if (st.view === 'pin') h = pinHTML();
      else if (st.view === 'edit' && st.sys) h = editHTML();
      else h = listHTML();
      root.innerHTML = h;
      if (st.view === 'new') paintNewValid();
      if (st.view === 'pin') paintPt();
      if (st.view === 'edit' && st.tab === 'history' && st.hist === null) loadHistory();
      if (st.view === 'list' && !st.q) { /* keep the search box empty and un-focused */ }
    }
    function goList() { st.view = 'list'; st.sys = null; st.dirty = false; st.f = null; st.ed = null; loadList(); }

    function getArr(g) {
      if (g === 'nt') return st.f.tmk; if (g === 'nc') return st.f.ctl;
      if (g === 'et') return st.ed.tmk; if (g === 'ec') return st.ed.ctl;
      if (g === 'ptc') return st.pt.control;
      var m = /^pt(\d)$/.exec(g); return m ? st.pt.rows[+m[1]].cuts : null;
    }
    function cutChanged(g) { if (g === 'nt' || g === 'nc') paintNewValid(); else if (g === 'et' || g === 'ec') paintEdValid(); else paintPt(); }

    function onInput(e) {
      var el = e.target;
      if (el.getAttribute && el.getAttribute('data-cut')) {
        var g = el.getAttribute('data-cut'), i = +el.getAttribute('data-i'), arr = getArr(g); if (!arr) return;
        var ch = String(el.value).replace(/\D/g, '').slice(-1);
        el.value = ch; arr[i] = ch === '' ? null : parseInt(ch, 10);
        if (ch !== '') { var nxt = root.querySelector('[data-cut="' + g + '"][data-i="' + (i + 1) + '"]'); if (nxt) { nxt.focus(); try { nxt.select(); } catch (x) {} } }
        cutChanged(g); return;
      }
      if (el.tagName === 'SELECT' || !el.getAttribute || !el.getAttribute('data-f')) return;
      field(el, false);
    }
    function onChange(e) {
      var el = e.target;
      if (el.tagName === 'SELECT' && el.getAttribute('data-f')) field(el, true);
    }
    function field(el, isChange) {
      var p = el.getAttribute('data-f').split('.'), sc = p[0], k = p[1], v = el.value;
      if (sc === 'q') { st.q = v; var r = $('#ks-rows'); if (r) r.innerHTML = rowsHTML(); return; }
      if (sc === 'nf') {
        var f = st.f;
        if (k === 'pick') { var c = (st.customers || []).filter(function (x) { return String(x.id) === v; })[0]; f.customer_id = c ? c.id : null; if (c) f.customer_name = c.name; draw(); return; }
        if (k === 'spec') { f.spec = v; f.pins = specOf(v).defaultPins; f.tmk = fit(f.tmk, f.pins); f.ctl = fit(f.ctl, f.pins); draw(); return; }
        if (k === 'pins') { f.pins = parseInt(v, 10); f.tmk = fit(f.tmk, f.pins); f.ctl = fit(f.ctl, f.pins); draw(); return; }
        f[k] = v; if (k === 'customer_name') f.customer_id = null; if (k === 'masters' || k === 'per') paintNewValid(); return;
      }
      if (sc === 'pt') {
        var t = st.pt;
        if (k === 'spec') { t.spec = v; t.pins = specOf(v).defaultPins; } else t.pins = parseInt(v, 10);
        ptResize(); draw(); return;
      }
      if (sc === 'sys') {
        if (k === 'notes') st.sys.data.notes = v; else st.sys[k] = v;
        touch(); return;
      }
      if (sc === 'key') {
        var key = keyBy(keys(), el.getAttribute('data-sym')); if (!key) return;
        key[k] = v; touch(); if (k === 'status' && isChange) drawTab(); return;
      }
      if (sc === 'df' && st.doorEdit) st.doorEdit[k] = v;
    }

    function onClick(e) {
      var t = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!t || !root.contains(t) || t.disabled) return;
      var a = t.getAttribute('data-act'), id = t.getAttribute('data-id'), sym = t.getAttribute('data-sym');
      switch (a) {
        case 'pinTool': startPin(); break;
        case 'newSys': startNew(); break;
        case 'cancelNew': goList(); break;
        case 'toggleCust': st.allCust = !st.allCust; draw(); break;
        case 'openSys': openSystem(id); break;
        case 'create': create(); break;
        case 'back': confirmLeave().then(function (yes) { if (yes) goList(); }); break;
        case 'tab': st.tab = t.getAttribute('data-tab'); st.ed = null; drawTab(); break;
        case 'save': save(); break;
        case 'del':
          ask('Delete this key system?', '"' + st.sys.name + '" and all of its keys, doors and history will be removed. This cannot be undone.', 'Delete', true).then(function (yes) {
            if (!yes) return;
            rpc('key_system_delete', { p_id: st.sys.id }).then(function (r2) { if (r2.error) { tell(errText(r2.error)); return; } st.dirty = false; goList(); });
          }); break;
        case 'editCuts':
          ask('Edit the cuts?', 'Changing the top master or the control key changes every pin chart in this system. Only do this if the numbers were typed wrong.', 'Edit cuts', true).then(function (yes) {
            if (!yes) return; st.ed = { tmk: fit(st.sys.data.tmk, st.sys.pins), ctl: fit(st.sys.data.control || [], st.sys.pins) }; drawTab();
          }); break;
        case 'applyCuts': applyCuts(); break;
        case 'cancelCuts': st.ed = null; drawTab(); break;
        case 'copies': var kk = keyBy(keys(), sym); if (kk) { kk.copies = Math.max(0, kk.copies + parseInt(t.getAttribute('data-d'), 10)); touch(); drawTab(); } break;
        case 'issue': issueReturn('issue', sym); break;
        case 'return': issueReturn('return', sym); break;
        case 'addKey': addKey(); break;
        case 'doorNew': st.doorEdit = { isNew: true, id: uid(), name: '', area: '', key: '', notes: '' }; drawTab(); break;
        case 'doorEdit': var dd = doors().filter(function (x) { return x.id === id; })[0]; if (dd) { st.doorEdit = Object.assign({ isNew: false }, dd); drawTab(); } break;
        case 'doorCancel': st.doorEdit = null; drawTab(); break;
        case 'doorSave':
          var de = st.doorEdit; if (!String(de.name).trim()) { tell('Say what the door or area is, e.g. "Suite 101 · front door".'); break; }
          var rec = { id: de.id, name: de.name.trim(), area: de.area.trim(), key: de.key, notes: de.notes };
          if (de.isNew) doors().push(rec); else { var ix = doors().map(function (x) { return x.id; }).indexOf(de.id); if (ix >= 0) doors()[ix] = rec; }
          st.selDoor = st.selDoor || rec.id; st.doorEdit = null; touch(); drawTab(); break;
        case 'doorRemove':
          var dr = doors().filter(function (x) { return x.id === id; })[0]; if (!dr) break;
          ask('Remove this door?', dr.name + ' will be taken off the list. The keys are not changed.', 'Remove', true).then(function (yes) {
            if (!yes) return; var d2 = st.sys.data; d2.doors = d2.doors.filter(function (x) { return x.id !== id; }); if (st.selDoor === id) st.selDoor = null; touch(); drawTab();
          }); break;
        case 'chartDoor': st.selDoor = id; st.tab = 'chart'; st.doorEdit = null; drawTab(); if (e.target.closest('.ks-row')) window.scrollTo && window.scrollTo(0, 0); break;
        case 'lostPick': st.lostKey = sym; drawTab(); break;
        case 'logLost': logLost(); break;
        case 'quote':
          confirmLeave().then(function (yes) { if (yes) { st.dirty = false; window.location.href = 'bittings.html?quote=1'; } }); break;
        case 'addNote':
          var ni = $('#ks-hn'), txt = ni ? ni.value.trim() : ''; if (!txt) break;
          event('note', { text: txt }).then(function (r3) { if (r3.error) { tell(errText(r3.error)); return; } loadHistory(); }); break;
        case 'print': doPrint(printSection(t.getAttribute('data-what')), t.getAttribute('data-what')); break;
        case 'ptAdd': st.pt.n = Math.min(4, st.pt.n + 1); draw(); break;
        case 'ptRemove': st.pt.n = Math.max(2, st.pt.n - 1); draw(); break;
        case 'ptPrint': var res = ptResult(); doPrint(res.html, 'pinlock', 'Pin a lock · ' + specName(st.pt.spec)); break;
      }
    }
    root.addEventListener('click', onClick);
    root.addEventListener('input', onInput);
    root.addEventListener('change', onChange);
    root.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.getAttribute && e.target.getAttribute('role') === 'button' && e.target.getAttribute('data-act')) { e.preventDefault(); e.target.click(); }
    });

    st.view = 'list'; loadList();
    return { destroy: st.destroy };
  }

  window.TKS_KS = {
    open: open,
    hasUnsaved: function () { return !!(cur && cur.dirty); },
    confirmLeave: function () { return cur && cur.confirmLeave ? cur.confirmLeave() : Promise.resolve(true); }
  };
})();
