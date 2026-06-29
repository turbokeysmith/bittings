/* ──────────────────────────────────────────────────────────────────────────
   TKS_D1 — shared NASTF "D1 filing" countdown helper.
   One source of truth for the color-degrading badge used on the register,
   Start-a-Job, and the Receipts → NASTF worklist. A NASTF-tagged receipt
   carries data.nastf = { type, d1Days, d1DueDate:'YYYY-MM-DD', d1Filed, ... }.
   The countdown starts when the job is tagged (the receipt date) and runs
   d1Days (default 5, manager-set in Setup). Badge clears when D1 is filed.

   Color ladder (by whole days remaining):
     ≥4 → green · 3 → yellow · 2 → orange · 1 → red · ≤0 → dark red (overdue)
   ────────────────────────────────────────────────────────────────────────── */
(function (global) {
  var COLORS = {
    green:  { bg: '#1c7d3e', fg: '#fff' },
    yellow: { bg: '#caa200', fg: '#1a1a1a' },
    orange: { bg: '#e07a1f', fg: '#fff' },
    red:    { bg: '#c8323c', fg: '#fff' },
    dark:   { bg: '#7d1620', fg: '#fff' },
    filed:  { bg: '#2e3a30', fg: '#9fe3b5' }
  };

  // midnight-anchored whole-day difference (due − today), so the count ticks once per day.
  function daysLeft(dueDate) {
    if (!dueDate) return null;
    var due = new Date(dueDate + 'T00:00:00');
    if (isNaN(due.getTime())) return null;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((due - today) / 86400000);
  }

  function tierFor(days) {
    if (days == null) return 'green';
    if (days <= 0) return 'dark';
    if (days === 1) return 'red';
    if (days === 2) return 'orange';
    if (days === 3) return 'yellow';
    return 'green';
  }

  // Build a badge model from a receipt's nastf object (or a {d1Days} preview before save).
  function badge(nastf) {
    nastf = nastf || {};
    if (nastf.d1Filed) {
      return { filed: true, overdue: false, days: null, tier: 'filed',
               colors: COLORS.filed, label: 'D1 filed ✓', type: nastf.type || '' };
    }
    // before save there's no d1DueDate yet — preview from d1Days (full window remaining).
    var days = (nastf.d1DueDate) ? daysLeft(nastf.d1DueDate)
             : (nastf.d1Days != null ? Number(nastf.d1Days) : 5);
    var tier = tierFor(days);
    var label;
    if (days == null) label = 'D1 required';
    else if (days > 1) label = days + ' days to file D1';
    else if (days === 1) label = '1 day to file D1';
    else if (days === 0) label = 'D1 due today';
    else label = 'D1 ' + Math.abs(days) + 'd OVERDUE';
    return { filed: false, overdue: (days != null && days <= 0), days: days, tier: tier,
             colors: COLORS[tier], label: label, type: nastf.type || '' };
  }

  // Inline HTML pill. opts.small for a compact variant; opts.showType to prefix the D1 type.
  function pillHTML(nastf, opts) {
    if (!nastf || (!nastf.type && nastf.d1Days == null)) return '';
    opts = opts || {};
    var b = badge(nastf);
    var pad = opts.small ? '2px 7px' : '3px 9px';
    var fs = opts.small ? '11px' : '12px';
    var txt = (opts.showType && b.type ? (b.type + ' · ') : '') + b.label;
    var pulse = (b.overdue && !b.filed) ? ';animation:d1pulse 1.1s ease-in-out infinite' : '';
    return '<span class="d1-badge" style="display:inline-block;border-radius:999px;font-weight:800;'
      + 'font-size:' + fs + ';padding:' + pad + ';background:' + b.colors.bg + ';color:' + b.colors.fg + pulse + '">'
      + txt + '</span>';
  }

  global.TKS_D1 = { daysLeft: daysLeft, tierFor: tierFor, badge: badge, pillHTML: pillHTML, COLORS: COLORS };
})(typeof window !== 'undefined' ? window : this);
