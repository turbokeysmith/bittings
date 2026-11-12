/* Receipts — thin native read-only viewer (de-iframed). Lists TKS receipts
   (All / NASTF·D1, search, warranty + D1 badges) and renders / prints / downloads /
   shares each one via the shared TKS_RECEIPTS engine (app/receipts-engine.js).
   Read-only: no create / charge / edit (those stay in the builder reached from
   Start-a-Job). All DOM lookups are scoped to #view-receipts. */
(function () {
  var root = document.getElementById('view-receipts'); if (!root) return;
  var tab = 'all', query = '', cur = null;
  function gid(id) { return root.querySelector('#' + id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function money(v) { return '$' + (Number(v) || 0).toFixed(2); }
  function getHistory() { try { return (window.TKS && TKS.list && TKS.list('receipts')) || []; } catch (e) { try { return JSON.parse(localStorage.getItem('tks_receipts') || '[]'); } catch (_) { return []; } } }
  // 8z48: closed (paid) receipts are edit-locked for anyone who is not a manager / owner — mirrors receiptClosed() in bittings.html
  function closed(r) { if (!r || (r.docType || '') === 'estimate') return false; if (r.status !== 'Paid in Full') return false; if (/^card$/i.test(String(r.payment || '')) && !r.paidAt) return false; return true; }
  function canEditClosed() { try { var role = (window.TKS && TKS.auth && TKS.auth.staffRole) ? TKS.auth.staffRole() : null; if (role) return role === 'owner' || role === 'manager'; return !!(TKS.auth.isOwner && TKS.auth.isOwner()); } catch (e) { return false; } }
  function vehStr(r) { var v = r.vehicle || {}; return [r.vehYear || v.year, r.vehMake || v.make, r.vehModel || v.model].filter(Boolean).join(' ') +
    ((Array.isArray(r.moreVehicles) && r.moreVehicles.length) ? (' ' + r.moreVehicles.map(function (m) { return [m.year, m.make, m.model, m.vin, m.text].filter(Boolean).join(' '); }).join(' ')) : ''); }   // 8z84: search finds the other vehicles too
  function desc(r) { var it = r.items || []; if (it.length) return it[0].desc + (it.length > 1 ? (' +' + (it.length - 1) + ' more') : ''); return r.serviceType || 'Service'; }

  var PAGE = 60, shown = 60, lastPageKey = '';   // 8z70: how many documents are drawn

  function render() {
    var sub = gid('rcSub'); if (sub) sub.textContent = tab === 'nastf' ? 'NASTF · D1 worklist · newest first' : 'Read-only history · search & reprint';
    var s = gid('rcSearch'); if (s) s.style.display = tab === 'all' ? 'block' : 'none';
    root.querySelectorAll('#rcTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.rt === tab); });
    var list = gid('rcList'); if (!list) return;
    var hist = getHistory().slice();
    /* 8z81 (owner: "if it has been converted then we don't need to see it again"): an estimate that became an invoice or a
       receipt is not listed any more — only the document it became. (The record itself is kept; it comes back if that
       invoice is ever deleted.) */
    var became = {}; hist.forEach(function (x) { if (x && x.fromEstimate) became[x.fromEstimate] = 1; });
    hist = hist.filter(function (r) { return !((r.docType || '') === 'estimate' && became[r.number]); });
    if (tab === 'nastf') hist = hist.filter(function (r) { return r.nastf && r.nastf.type; });
    var q = query.trim().toLowerCase();
    if (q && tab === 'all') hist = hist.filter(function (r) { return [r.number, r.customer, r.date, r.address, r.vin, vehStr(r), (r.items || []).map(function (i) { return i.desc; }).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0; });
    // 8z39: Register sales carry paidAt, not savedAt — without this they sorted to the very bottom of the list.
    function when(r) { var p = r.paidAt; return Number(r.savedAt) || (typeof p === 'number' ? p : Date.parse(p || '')) || 0; }   // paidAt is a millisecond number on Register sales
    hist.sort(function (a, b) { return when(b) - when(a); });
    if (!hist.length) { list.innerHTML = '<div class="rc-empty">' + (tab === 'nastf' ? 'No NASTF jobs yet — tag a job NASTF on the register or in the document builder.' : (q ? 'No receipts match that search.' : 'No receipts yet — charge a job on the register or Start-a-Job.')) + '</div>'; return; }
    var E = window.TKS_RECEIPTS || {};
    // 8z70: the list used to draw every document (about 1,800) each time anything changed — slow on a phone. It now
    // draws the newest 60 and a "Show more" button; searching still looks through all of them.
    var pageKey = tab + '|' + q; if (pageKey !== lastPageKey) { lastPageKey = pageKey; shown = PAGE; }
    var all = hist; hist = all.slice(0, shown);
    list.innerHTML = hist.map(function (r) {
      var total = r.totals ? r.totals.total : (r.amount || 0);
      var isN = !!(r.nastf && r.nastf.type);
      var d1 = (isN && window.TKS_D1) ? TKS_D1.pillHTML(r.nastf, { showType: true, small: true }) : '';
      var warrC = E.warrantyPillCompactHTML ? E.warrantyPillCompactHTML(r) : '';
      var warrF = E.warrantyPillHTML ? E.warrantyPillHTML(r) : '';
      var badges = (warrF || d1) ? ('<div class="ro-badges">' + warrF + d1 + '</div>') : '';
      return '<div class="ro-item" data-id="' + esc(r.id || '') + '"><div class="ro-open" tabindex="0" role="button" title="Tap to view">' +
        '<div class="ro-top"><span class="ro-num">' + esc(r.number || r.id || '') + '</span>' + warrC + '<span class="ro-amt">' + money(total) + '</span></div>' +
        '<div class="ro-cust">' + esc(r.customer || '(no name)') + '</div>' +
        ((r.docType === 'estimate') ? ('<div class="ro-desc" style="font-weight:700">📋 Estimate — not billed yet</div>') : '') +
        (String(r.internalNotes || '').trim() ? '<div class="ro-desc" style="font-style:italic">🔒 ' + esc(String(r.internalNotes).trim().slice(0, 140)) + '</div>' : '') + '<div class="ro-desc">' + esc(r.date || (r.paidAt && !isNaN(new Date(r.paidAt).getTime()) ? new Date(r.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '')) + ' · ' + esc(desc(r)) + '</div>' + badges + '</div>' +
        '<div class="rc-rowactions"><button class="rcv" data-act="view">👁 View</button><button class="rcv" data-act="print">🖨 Print</button><button class="rcv" data-act="send">📤 Send</button><button class="rcv" data-act="pdf">⬇ PDF</button>' + ((r.id && !(closed(r) && !canEditClosed())) ? '<button class="rcv" data-act="edit">✏️ Edit</button>' : '') + '</div></div>';
    }).join('') + (all.length > hist.length ? ('<button type="button" id="rcMore" class="bt-btn bt-btn--secondary" style="width:100%;min-height:48px;margin:10px 0 4px">Show ' + Math.min(PAGE, all.length - hist.length) + ' more  ·  ' + (all.length - hist.length) + ' older not shown</button>') : '');
    var more = gid('rcMore'); if (more) more.onclick = function () { shown += PAGE; render(); };
    list.querySelectorAll('.ro-item').forEach(function (it) {
      var r = hist.find(function (x) { return (x.id || '') === it.getAttribute('data-id'); });
      var open = it.querySelector('.ro-open'); if (open) open.onclick = function () { openViewer(r); };
      it.querySelectorAll('.rcv').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation(); var a = b.dataset.act;
          /* 8z46: Edit opens THIS document in the builder (same number, saved in place — never a new receipt) */
          if (a === 'edit') { try { sessionStorage.setItem('tks_edit_receipt', JSON.stringify(r)); } catch (_) {} location.href = 'bittings.html'; return; }
          if (a === 'print') { paper(r, b); return; }   // 8z81
          try { if (a === 'view') openViewer(r); else if (a === 'send') { window.TKS_RECEIPTS && TKS_RECEIPTS.share(r, 'en', true); } else if (a === 'pdf') { window.TKS_RECEIPTS && TKS_RECEIPTS.makePDF(r, 'en', false); } }
          catch (err) { (window.uiAlert || window.alert)((err && err.message) || 'Action failed.'); }
        };
      });
    });
  }
  function openViewer(r) {
    if (!r) return; cur = r;
    var doc = gid('rcViewerDoc'), ttl = gid('rcViewerTitle');
    try { doc.innerHTML = (window.TKS_RECEIPTS ? TKS_RECEIPTS.buildCardHTML(r) : '<div style="padding:24px">Engine not loaded.</div>'); }
    catch (e) { doc.innerHTML = '<div style="padding:24px;text-align:center">Could not render — tap Download for the PDF.</div>'; }
    if (ttl) ttl.textContent = (r.docType === 'invoice' ? 'Invoice' : r.docType === 'estimate' ? 'Estimate' : 'Receipt') + ' ' + (r.number || r.id || '');
    // 8z90: a NASTF receipt shows its photo box (licence, proof of ownership…) under the document
    try { var d1 = (r.nastf && r.nastf.type) || (Array.isArray(r.moreVehicles) && r.moreVehicles.some(function (v) { return v && v.d1 === true; }));
      if (d1 && r.id && window.TKS_RDOCS && r.docType !== 'estimate') { var bx = document.createElement('div'); bx.style.padding = '0 12px 12px'; doc.appendChild(bx); TKS_RDOCS.panel(bx, r, { pdf: function (x) { return TKS_RECEIPTS.makePDF(x, 'en', false, true); } }); } } catch (e) { }
    var v = gid('rcViewer'); v.classList.add('open'); v.setAttribute('aria-hidden', 'false');
  }
  function closeViewer() { var v = gid('rcViewer'); v.classList.remove('open'); v.setAttribute('aria-hidden', 'true'); var d = gid('rcViewerDoc'); if (d) d.innerHTML = ''; cur = null; }

  root.querySelectorAll('#rcTabs button').forEach(function (b) { b.onclick = function () { tab = b.dataset.rt; render(); }; });
  var sb = gid('rcSearch'); if (sb) sb.oninput = function () { query = sb.value; render(); };
  var cl = gid('rcvClose'); if (cl) cl.onclick = closeViewer;
  var vw = gid('rcViewer'); if (vw) vw.onclick = function (e) { if (e.target === vw) closeViewer(); };
  var dl = gid('rcvDownload'); if (dl) dl.onclick = function () { if (cur) { try { TKS_RECEIPTS.makePDF(cur, 'en', false); } catch (e) { } } };
  /* 8z81 (owner: "if I go to the Receipts tab and hit print it automatically sends it to PDF"): Print here now goes to the
     receipt printer when this computer has one (the counter computer), exactly like the document screen; the full-page
     PDF is only offered when it does not. A reprint never opens the cash drawer. */
  function fullPage(r) { try { var o = TKS_RECEIPTS.makePDF(r, 'en', false, true); if (o && o.blob) { var u = URL.createObjectURL(o.blob); window.open(u, '_blank'); setTimeout(function () { try { URL.revokeObjectURL(u); } catch (e) { } }, 60000); } } catch (e) { } }
  function paper(r, btn) {
    if (!r) return;
    if (!(window.TKS_HW && TKS_HW.printDoc && window.TKS_RECEIPTS && TKS_RECEIPTS.paperCopy)) { fullPage(r); return; }
    var copy; try { copy = TKS_RECEIPTS.paperCopy(r); } catch (e) { fullPage(r); return; }
    TKS_HW.printDoc(copy, { btn: btn, reprint: true, fullPage: function () { fullPage(r); },
      ask: function (t, b) { return window.uiConfirm ? uiConfirm({ title: t, message: b, okText: 'Open full page' }) : Promise.resolve(window.confirm(t + '\n\n' + b)); },
      alert: function (t, b) { if (window.uiAlert) uiAlert({ title: t, message: b }); else window.alert(t + '\n\n' + b); } });
  }
  var pr = gid('rcvPrint'); if (pr) pr.onclick = function () { paper(cur, pr); };
  window.renderReceipts = render;
})();
