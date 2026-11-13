/* 8z116 (owner, 2026-11-13): "I have 101 items that are out of stock, but some of those are probably different part
   numbers or SKUs that I need to either merge or delete … I — or the owner/manager — can say yes it's the same and it
   either deletes one or merges them, or no it's not and it stays in the system as it is."

   Two parts, both in this file:
     1. TKS_DUPES.find(items, opts)  — pure function: groups of items that are probably the same thing, each with a reason
        in plain words and a strength ('strong' | 'medium'). No network, no page access (except partGrade when present).
     2. the review sheet behind Inventory → "🧹 Find duplicates" (owner / manager). It reads the "not the same" decisions
        (dupe_decisions), shows one group at a time, and calls dupe_decide / inventory_merge (see
        supabase/phase8/8z116_inventory_merge.sql). Nothing changes on this device until the server says yes.
   The sheet always works on PAIRS: a group of three shows its closest pair; after the answer the group is worked out again. */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------- 1. the finder */
  function str(v) { return String(v == null ? '' : v); }
  function catSplit(p) { var s = str(p && p.category), i = s.indexOf('/'); return i < 0 ? { top: s.trim() || 'Other', sub: '' } : { top: s.slice(0, i).trim() || 'Other', sub: s.slice(i + 1).trim() }; }
  function alnum(s) { return str(s).toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  function grade(p) {
    try { if (typeof global.partGrade === 'function') return str(global.partGrade(p)).toLowerCase(); } catch (e) {}
    return str(p && p.grade).trim().toLowerCase();
  }
  function fullYear(y) { y = String(y); if (y.length === 4) return y; var n = parseInt(y, 10); return String(n < 70 ? 2000 + n : 1900 + n); }
  /* "13-15" and "2013-2015" are the same years; "5-Button", "5 BTN" and "5B" are the same thing */
  function normName(s) {
    s = str(s).toLowerCase();
    s = s.replace(/\b(\d{4}|\d{2})\s*(?:-|–|—|to)\s*(\d{4}|\d{2})\b/g, function (m, a, b) { return fullYear(a) + ' ' + fullYear(b); });
    s = s.replace(/\b(\d)\s*-?\s*(?:buttons?|btns?|b)\b/g, '$1btn');
    return s.replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function buttonsOf(p) {
    var m = /\b(\d)\s*-?\s*(?:buttons?|btns?|b)\b/i.exec(str(p && p.name)); return m ? m[1] : '';
  }
  var BLADE_RE = /\b(KW\d+|SC\d+|Y\d{2,3}|HU\d{2,3}[A-Z]?|TOY\d{2,3}[A-Z]?|HON\d{2,3}[A-Z]?|MAZ\d+|NSN\d{2}|HY\d{2}|KK\d+|GM\d{2}|B\d{2,3}|FO\d{2}|VA\d[A-Z]?|MIT\d+|SUB\d+)\b/;
  function bladeOf(p) { var m = BLADE_RE.exec((str(p && p.name) + ' ' + str(p && p.sku)).toUpperCase()); return m ? m[1] : ''; }
  function plural(sub) {
    var l = sub.toLowerCase();
    return /(key|fob|shell|transponder|remote|flip|fobs?)$/.test(l) ? l + 's' : l;
  }
  function pairKey(a, b) { a = str(a); b = str(b); return a < b ? a + '|' + b : b + '|' + a; }
  function inStock(p) { return (parseInt(p && p.qty, 10) || 0) > 0; }

  var CHIP_BLADE_SUBS = { 'Transponder': 1, 'Mechanical': 1 };

  function find(items, opts) {
    opts = opts || {};
    var decided = {};
    (opts.decided || []).forEach(function (d) { if (typeof d === 'string') decided[d] = 1; else if (d) decided[pairKey(d.a, d.b)] = 1; });
    var list = (items || []).filter(function (p) { return p && p.id != null && !p.deletedAt; })
      .sort(function (x, y) { return str(x.id) < str(y.id) ? -1 : str(x.id) > str(y.id) ? 1 : 0; });
    var info = {};
    list.forEach(function (p) {
      var c = catSplit(p);
      info[p.id] = { p: p, top: c.top, sub: c.sub, grade: grade(p), fcc: alnum(p.fccId), sku: alnum(p.sku), vsku: alnum(p.vendorSku),
        supplier: str(p.supplier).trim().toLowerCase(), name: normName(p.name), btn: buttonsOf(p), chip: alnum(p.chip), blade: bladeOf(p) };
    });

    // 1) bucket by each kind of evidence (so 600 items never means 180,000 comparisons)
    var rules = []; // { tier, key(info) → '' (none) | bucket text, why(a, b) }
    rules.push({ tier: 'strong', key: function (i) { return i.fcc.length >= 3 && i.sub ? 'f|' + i.top + '|' + i.sub + '|' + i.grade + '|' + i.fcc : ''; },
      why: function (a) { return 'Same FCC ID and both are ' + (a.btn ? a.btn + '-button ' : '') + plural(a.sub); }, needGrade: true });
    rules.push({ tier: 'strong', key: function (i) { return i.vsku.length >= 3 && i.supplier ? 'v|' + i.top + '|' + i.grade + '|' + i.supplier + '|' + i.vsku : ''; },
      why: function () { return 'Same supplier part number from the same supplier'; }, needGrade: true });
    rules.push({ tier: 'strong', key: function (i) { return i.sku.length >= 3 ? 's|' + i.top + '|' + i.grade + '|' + i.sku : ''; },
      why: function () { return 'The SKU is the same (apart from capital letters and dashes)'; }, needGrade: true });
    rules.push({ tier: 'medium', key: function (i) { return i.sku.length >= 3 ? 's2|' + i.top + '|' + i.sku : ''; },
      why: function () { return 'The SKU is the same (apart from capital letters and dashes), but one is OEM and the other is not'; }, onlyCrossGrade: true });
    rules.push({ tier: 'medium', key: function (i) { return i.name.length >= 4 ? 'n|' + i.top + '|' + i.name : ''; },
      why: function () { return 'The names are the same once years and punctuation are ignored'; } });
    rules.push({ tier: 'medium', key: function (i) { return CHIP_BLADE_SUBS[i.sub] && i.blade && (i.chip || i.sub === 'Mechanical') ? 'c|' + i.top + '|' + i.sub + '|' + i.chip + '|' + i.blade : ''; },
      why: function (a) { return a.sub === 'Mechanical' ? 'Same blade (' + a.blade + ') and both are mechanical keys' : 'Same chip and same blade (' + a.blade + ') and both are ' + plural(a.sub); } });

    var pairs = {}; // key → { a, b, tier, reasons[] }
    rules.forEach(function (rule) {
      var buckets = {};
      list.forEach(function (p) { var k = rule.key(info[p.id]); if (k) (buckets[k] || (buckets[k] = [])).push(p.id); });
      Object.keys(buckets).sort().forEach(function (k) {
        var ids = buckets[k]; if (ids.length < 2 || ids.length > 40) return;
        for (var x = 0; x < ids.length; x++) for (var y = x + 1; y < ids.length; y++) {
          var A = info[ids[x]], B = info[ids[y]], pk = pairKey(ids[x], ids[y]);
          if (decided[pk]) continue;
          if (A.top !== B.top) continue;                                   // never across the top categories
          if (A.btn && B.btn && A.btn !== B.btn) continue;                 // 4-button and 5-button are different keys
          var sameGrade = A.grade === B.grade;
          if (rule.onlyCrossGrade && sameGrade) continue;                  // (the strong SKU rule already has those)
          var cur = pairs[pk];
          if (cur && cur.tier === 'strong' && rule.tier !== 'strong') continue;
          if (!cur) cur = pairs[pk] = { a: ids[x], b: ids[y], tier: rule.tier, reasons: [] };
          else if (cur.tier !== rule.tier) { cur.tier = rule.tier; cur.reasons = []; }
          var why = rule.why(A, B); if (cur.reasons.indexOf(why) < 0) cur.reasons.push(why);
        }
      });
    });
    // an OEM and an aftermarket key are never a "strong" match, whatever else matches
    Object.keys(pairs).forEach(function (k) { var pr = pairs[k]; if (pr.tier === 'strong' && info[pr.a].grade !== info[pr.b].grade) delete pairs[k]; });

    // 2) groups: connected pieces of the strong pairs first, then of the medium pairs among what is left
    var parent = {};
    function root(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    function join(a, b) { if (!(a in parent)) parent[a] = a; if (!(b in parent)) parent[b] = b; var ra = root(a), rb = root(b); if (ra !== rb) { if (ra < rb) parent[rb] = ra; else parent[ra] = rb; } }
    var keys = Object.keys(pairs).sort(), groups = [], inGroup = {};
    ['strong', 'medium'].forEach(function (tier) {
      parent = {};
      var edges = keys.filter(function (k) { var pr = pairs[k]; return pr.tier === tier && !inGroup[pr.a] && !inGroup[pr.b]; });
      edges.forEach(function (k) { join(pairs[k].a, pairs[k].b); });
      var by = {};
      Object.keys(parent).forEach(function (id) { (by[root(id)] || (by[root(id)] = [])).push(id); });
      Object.keys(by).sort().forEach(function (r) {
        var ids = by[r].sort(); if (ids.length < 2) return;
        var set = {}; ids.forEach(function (id) { set[id] = 1; inGroup[id] = 1; });
        var prs = edges.filter(function (k) { return set[pairs[k].a]; }).map(function (k) {
          var pr = pairs[k]; return { a: pr.a, b: pr.b, strength: tier, reason: pr.reasons.join('; ') };
        });
        groups.push({ id: ids.join('|'), strength: tier, items: ids.map(function (id) { return info[id].p; }), pairs: prs,
          reason: prs[0].reason, outOfStock: ids.filter(function (id) { return !inStock(info[id].p); }).length });
      });
    });
    groups.sort(function (g, h) {
      if (g.strength !== h.strength) return g.strength === 'strong' ? -1 : 1;
      if (g.outOfStock !== h.outOfStock) return h.outOfStock - g.outOfStock;
      return g.id < h.id ? -1 : g.id > h.id ? 1 : 0;
    });
    return groups;
  }

  /* ---------------------------------------------------------------- 2. the sheet */
  function esc(s) { return str(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { try { return global.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function live() { try { return !!sb() && !(TKS.isDemo && TKS.isDemo()) && !!(TKS.auth && TKS.auth.isSignedIn()); } catch (e) { return false; } }
  function say(m) { try { if (global.TKS_ACCESS && TKS_ACCESS.toast) { TKS_ACCESS.toast(m); return; } } catch (e) {} }
  function alertBox(title, message) { if (typeof global.uiAlert === 'function') return global.uiAlert({ title: title, message: message }); global.alert(title + '\n' + message); }
  function plainError(e) {
    var m = str(e && (e.message || e.details || e)).trim();
    if (/TIER_LOCKED/.test(m)) return 'Your plan does not include this.';
    if (!m || /failed to fetch|networkerror|network request/i.test(m)) return 'There was no connection to the server.';
    return m;
  }
  function money(c) { return (c === '' || c == null || isNaN(Number(c))) ? '—' : '$' + (Number(c) / 100).toFixed(2); }
  function cost(c) { return (c === '' || c == null || isNaN(Number(c)) || Number(c) === 0) ? '—' : '$' + Number(c).toFixed(2); }
  function kind(p) { var g = grade(p), s = catSplit(p).sub || catSplit(p).top; return s + ' · ' + (/^oem/.test(g) ? 'OEM' : g === 'aftermarket' ? 'AM' : (str(p.grade) || '—')); }

  var CSS = '.dupe-modal{max-width:820px!important;height:100%;max-height:none!important;display:flex;flex-direction:column;overflow:hidden!important}' +
    '.dupe-body{flex:1 1 auto;overflow-y:auto;overflow-x:hidden;min-height:0}' +
    '.dupe-why{padding:10px 12px;border-radius:10px;border:1px solid var(--edge);background:var(--bg);color:var(--ink);font-size:14.5px;line-height:1.45;margin-bottom:12px}' +
    '.dupe-why b{font-weight:800}.dupe-tag{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--dim);margin-bottom:4px}' +
    '.dupe-cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
    '@media (max-width:700px){.dupe-cards{grid-template-columns:1fr}}' +
    '.dupe-card{min-width:0;border:1px solid var(--edge);border-radius:12px;padding:12px;background:var(--bg);color:var(--ink)}' +
    '.dupe-card h3{margin:0 0 8px;font-size:16px;line-height:1.3;color:var(--ink);word-break:break-word;overflow-wrap:anywhere}' +
    '.dupe-row{display:flex;gap:8px;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid var(--edge)}' +
    '.dupe-row:last-of-type{border-bottom:0}.dupe-row span:first-child{color:var(--dim);flex:0 0 auto}.dupe-row span:last-child{color:var(--ink);text-align:right;min-width:0;word-break:break-word;overflow-wrap:anywhere}' +
    '.dupe-out{color:var(--red,#c8323c)!important;font-weight:700}' +
    '.dupe-card .btn,.dupe-foot .btn{min-height:44px;width:100%;margin-top:10px}' +
    '.dupe-foot{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.dupe-foot .btn{flex:1 1 150px}' +
    '.dupe-note{font-size:13px;color:var(--dim);margin-top:10px;line-height:1.45}';

  function ensureCss() { if (document.getElementById('dupeCss')) return; var s = document.createElement('style'); s.id = 'dupeCss'; s.textContent = CSS; document.head.appendChild(s); }

  function openScreen() {
    ensureCss();
    var ov = document.createElement('div'); ov.className = 'chg-modal-ov'; ov.id = 'dupeOv';
    ov.innerHTML = '<div class="chg-modal dupe-modal" role="dialog" aria-label="Find duplicates"><div class="chg-modal-h"><b id="dupeHead">🧹 Possible duplicates</b>' +
      '<button type="button" class="chg-modal-x" data-x aria-label="Close" style="min-width:44px;min-height:44px">×</button></div><div class="dupe-body" id="dupeBody"><div class="dupe-note">Looking…</div></div></div>';
    document.body.appendChild(ov);
    var body = ov.querySelector('#dupeBody'), head = ov.querySelector('#dupeHead');
    var state = { decided: [], gone: {}, skipped: {}, busy: false, shown: '' };
    function close() { ov.remove(); document.removeEventListener('keydown', onkey); }
    function onkey(e) { if (e.key === 'Escape' && document.querySelectorAll('.chg-modal-ov').length === 1) close(); }
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) close(); });
    ov.querySelector('[data-x]').onclick = close;
    document.addEventListener('keydown', onkey);

    function items() { var all = []; try { all = TKS.Inventory.all(); } catch (e) {} return all.filter(function (p) { return !state.gone[p.id]; }); }
    function groups() { return find(items(), { decided: state.decided }); }
    function byId(id) { return items().filter(function (p) { return p.id === id; })[0]; }

    function cardHtml(p, other, i) {
      var q = parseInt(p.qty, 10) || 0;
      function row(l, v, cls) { return '<div class="dupe-row"><span>' + l + '</span><span' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(v || '—') + '</span></div>'; }
      return '<div class="dupe-card" data-card="' + i + '"><h3>' + esc(p.name || '(no name)') + '</h3>' +
        row('SKU', p.sku) + row('Supplier no.', p.vendorSku) + row('Type', kind(p)) + row('FCC ID', p.fccId) + row('Chip', p.chip) +
        row('In stock', String(q), q <= 0 ? 'dupe-out' : '') + row('Cost', cost(p.cost)) + row('Price', money(p.sellPriceCents)) + row('Bin', p.location) +
        '<button type="button" class="btn save" data-keep="' + i + '">Same — keep this one</button></div>';
    }

    function paint() {
      var gs = groups(), open = gs.filter(function (g) { return !state.skipped[g.id]; });
      head.textContent = '🧹 ' + (gs.length ? gs.length + ' possible duplicate group' + (gs.length === 1 ? '' : 's') : 'No possible duplicates');
      if (!gs.length) { body.innerHTML = '<div class="dupe-why"><b>Nothing left to look at.</b> No two items look like the same part' + (state.decided.length ? ' (pairs you marked “not the same” are left out)' : '') + '.</div><div class="dupe-foot"><button type="button" class="btn" data-close>Close</button></div>'; body.querySelector('[data-close]').onclick = close; return; }
      if (!open.length) { body.innerHTML = '<div class="dupe-why"><b>That is every group for now.</b> ' + gs.length + ' skipped.</div><div class="dupe-foot"><button type="button" class="btn save" data-again>Look at the skipped ones again</button><button type="button" class="btn" data-close>Close</button></div>';
        body.querySelector('[data-again]').onclick = function () { state.skipped = {}; paint(); }; body.querySelector('[data-close]').onclick = close; return; }
      var g = open[0], pr = g.pairs[0], A = byId(pr.a), B = byId(pr.b);
      state.shown = g.id; var pos = gs.indexOf(g) + 1;
      body.innerHTML = '<div class="dupe-why"><span class="dupe-tag">Group ' + pos + ' of ' + gs.length + ' · ' + (g.strength === 'strong' ? 'strong match' : 'possible match') + '</span><br><b>' + esc(pr.reason) + '.</b></div>' +
        '<div class="dupe-cards">' + cardHtml(A, B, 0) + cardHtml(B, A, 1) + '</div>' +
        (g.items.length > 2 ? '<div class="dupe-note">This group has ' + g.items.length + ' items. Showing the closest two; the rest come up after.</div>' : '') +
        '<div class="dupe-foot"><button type="button" class="btn" data-diff>Not the same</button><button type="button" class="btn" data-skip>Skip for now</button></div>' +
        '<div class="dupe-note">“Same — keep this one” moves the other item’s stock, history and any missing details onto the one you keep, and removes the other from the list. “Not the same” leaves both as they are and this pair never comes back.</div>';
      body.querySelectorAll('[data-keep]').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-keep'); merge(i ? B : A, i ? A : B); }; });
      body.querySelector('[data-diff]').onclick = function () { different(A, B); };
      body.querySelector('[data-skip]').onclick = function () { state.skipped[g.id] = 1; paint(); };
    }

    function need() { alertBox('Needs the live app', 'This is the demo, so nothing can be merged or saved here. Sign in to the real Bittings app to do this — finding duplicates works either way.'); }
    function lock(on) { state.busy = on; body.querySelectorAll('button').forEach(function (b) { b.disabled = on; }); }

    function different(A, B) {
      if (state.busy) return; if (!live()) return need();
      lock(true);
      Promise.resolve(sb().rpc('dupe_decide', { p_a: A.id, p_b: B.id, p_decision: 'different' })).then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error('No answer from the server.');
        state.decided.push({ a: A.id, b: B.id }); say('Saved — those two will not come up again.'); lock(false); paint();
      }).catch(function (e) { lock(false); alertBox('Not saved', 'Nothing was changed. ' + plainError(e)); });
    }

    function merge(keep, drop) {
      if (state.busy) return; if (!live()) return need();
      var q = parseInt(drop.qty, 10) || 0;
      uiConfirm({ title: 'Merge these two?', okText: 'Yes, merge them',
        message: 'Keep “' + keep.name + '”' + (keep.sku ? ' (' + keep.sku + ')' : '') + '. “' + drop.name + '”' + (drop.sku ? ' (' + drop.sku + ')' : '') + ' will be removed from the list: its ' + q + ' in stock and any details the kept item is missing (FCC ID, chip, price, bin, fits) move to “' + keep.name + '”.' }).then(function (ok) {
        if (!ok) return;
        if (!live()) return need();
        lock(true);
        Promise.resolve(sb().rpc('inventory_merge', { p_keep: keep.id, p_drop: drop.id })).then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error('No answer from the server.');
          if (!(r.data && r.data.ok)) throw new Error('The server did not confirm the merge.');
          state.gone[drop.id] = 1; say('Merged — “' + drop.name + '” is now part of “' + keep.name + '”.');
          var done = function () { lock(false); paint(); };
          var rf; try { rf = TKS.refresh && TKS.refresh(true); } catch (e) {}
          Promise.resolve(rf).then(done, done);
        }).catch(function (e) { lock(false); alertBox('Not merged', 'Nothing was changed. ' + plainError(e)); });
      });
    }

    // first look: what was already marked "not the same"
    function start() {
      if (!live()) { paint(); return; }
      Promise.resolve(sb().rpc('dupe_decisions')).then(function (r) {
        if (r && !r.error && Array.isArray(r.data)) state.decided = r.data.map(function (d) { return { a: d.a, b: d.b }; });
        else if (r && r.error) body.insertAdjacentHTML('beforebegin', '<div class="dupe-note">Could not read the earlier “not the same” answers (' + esc(plainError(r.error)) + '). Pairs you already answered may show again.</div>');
        paint();
      }, function () { paint(); });
    }
    start();
    return { close: close };
  }

  global.TKS_DUPES = { find: find, pairKey: pairKey, open: openScreen };
  function wire() { var b = document.getElementById('invDupes'); if (b) b.onclick = openScreen; }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(window);
