/* ============================================================================
   TKImport — shared inventory importer (Setup wizard AND the Inventory tile use
   the SAME module — built once). Upload .xlsx/.csv → auto-detect headers → map
   each column to the app's inventory fields → preview → import (skipping dupes)
   → report. Reads the app's real inventory fields via TKS.Inventory; never
   assumes. Requires: app/store.js (TKS) and SheetJS (window.XLSX) for .xlsx.
   ============================================================================ */
(function () {
  // The app's inventory fields (mirrors store.js Inventory shape / CLOUD_MAP).
  var FIELDS = [
    { k: 'name', label: 'Part name', req: true, hints: ['name', 'part', 'description', 'desc', 'item'] },
    { k: 'sku', label: 'SKU / part #', hints: ['sku', 'part #', 'part no', 'partnumber', 'part number', 'number', 'code', 'mpn'] },
    { k: 'category', label: 'Category', hints: ['category', 'type', 'group', 'class'] },
    { k: 'qty', label: 'Qty on hand', hints: ['qty', 'quantity', 'stock', 'on hand', 'onhand', 'count', 'available'] },
    { k: 'lowAt', label: 'Low-stock at', hints: ['low', 'reorder at', 'min', 'minimum', 'lowstock', 'low at'] },
    { k: 'unit', label: 'Unit', hints: ['unit', 'uom'] },
    { k: 'cost', label: 'Unit cost', hints: ['cost', 'price', 'unit cost', 'buy', 'wholesale'] },
    { k: 'location', label: 'Location', hints: ['location', 'bin', 'shelf', 'aisle', 'spot', 'loc'] },
    { k: 'supplier', label: 'Supplier', hints: ['supplier', 'vendor', 'source'] },
    { k: 'reorderQty', label: 'Reorder qty', hints: ['reorder qty', 'reorder quantity', 'order qty', 'reorder'] },
    { k: 'fitment', label: 'Fits (vehicles / VIN)', hints: ['fit', 'fits', 'fitment', 'vehicle', 'application', 'vin', 'compatible'] },
    { k: 'notes', label: 'Notes', hints: ['note', 'notes', 'comment', 'remark'] }
  ];
  var INT_FIELDS = { qty: 1, lowAt: 1, reorderQty: 1 };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

  // --- tiny CSV parser (handles quotes, commas, CRLF) ---
  function parseCSV(text) {
    var rows = [], row = [], cur = '', i = 0, q = false, ch;
    text = String(text).replace(/^﻿/, '');
    for (; i < text.length; i++) {
      ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
        else cur += ch;
      } else {
        if (ch === '"') q = true;
        else if (ch === ',') { row.push(cur); cur = ''; }
        else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
        else if (ch === '\r') { /* skip */ }
        else cur += ch;
      }
    }
    if (cur.length || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  function autoMap(headers) {
    var map = {}, used = {};
    FIELDS.forEach(function (f) {
      var found = -1;
      for (var h = 0; h < headers.length; h++) {
        if (used[h]) continue;
        var nh = norm(headers[h]);
        if (!nh) continue;
        if (f.hints.some(function (hint) { return nh === hint || nh.indexOf(hint) !== -1 || hint.indexOf(nh) !== -1; })) { found = h; break; }
      }
      if (found >= 0) { map[f.k] = found; used[found] = true; }
      else map[f.k] = -1;
    });
    return map;
  }

  var ov = null;
  function close() { if (ov) { ov.remove(); ov = null; } }
  function sheet(html) {
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100001;display:flex;align-items:center;justify-content:center;overflow:auto;padding:14px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;';
    ov.innerHTML = '<div style="background:#1b1f27;color:#f4f5f7;width:100%;max-width:620px;border-radius:16px;padding:16px;margin:auto;max-height:92vh;overflow:auto;">' + html + '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    var x = ov.querySelector('[data-x]'); if (x) x.onclick = close;
    return ov;
  }
  var S = 'background:#11141a;border:1px solid #2a2f3a;border-radius:10px;color:#f4f5f7;padding:9px 11px;font-size:16px;box-sizing:border-box;';
  var BTN = 'border:none;border-radius:11px;padding:12px 14px;font-weight:800;font-size:15px;cursor:pointer;min-height:46px;';

  function open(opts) {
    opts = opts || {};
    stagePick(opts);
  }

  function stagePick(opts) {
    sheet(
      '<div style="display:flex;align-items:center;margin-bottom:8px"><b style="font-size:17px">📥 Import inventory</b>' +
      '<button data-x style="margin-left:auto;background:none;border:none;color:#9aa3af;font-size:26px;cursor:pointer;width:44px;height:44px">&times;</button></div>' +
      '<div style="color:#9aa3af;font-size:13px;line-height:1.5;margin-bottom:12px">Choose an <b>.xlsx</b> or <b>.csv</b> file. The first row should be your column headers.</div>' +
      '<input id="tkiFile" type="file" accept=".csv,.xlsx,.xls" style="' + S + 'width:100%">' +
      '<div id="tkiErr" style="color:#f0a0a6;font-size:13px;margin-top:8px;min-height:16px"></div>'
    );
    ov.querySelector('#tkiFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      var err = ov.querySelector('#tkiErr'); err.textContent = 'Reading…';
      var isXlsx = /\.xls[xm]?$/i.test(f.name);
      var reader = new FileReader();
      reader.onload = function (ev) {
        try {
          var rows;
          if (isXlsx) {
            if (!window.XLSX) { err.textContent = 'Spreadsheet support not loaded (need internet for .xlsx). Try a .csv export instead.'; return; }
            var wb = XLSX.read(ev.target.result, { type: 'array' });
            var ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
          } else {
            rows = parseCSV(ev.target.result);
          }
          rows = (rows || []).filter(function (r) { return r && r.some(function (c) { return String(c).trim() !== ''; }); });
          if (rows.length < 2) { err.textContent = 'Couldn’t find a header row + at least one data row.'; return; }
          var headers = rows[0].map(function (h) { return String(h).trim(); });
          var data = rows.slice(1);
          stageMap(opts, headers, data);
        } catch (ex) { err.textContent = 'Could not read that file: ' + (ex.message || ex); }
      };
      if (isXlsx) reader.readAsArrayBuffer(f); else reader.readAsText(f);
    });
  }

  function stageMap(opts, headers, data) {
    var map = autoMap(headers);
    function opts_(sel) {
      var o = '<option value="-1">— skip —</option>';
      headers.forEach(function (h, i) { o += '<option value="' + i + '"' + (sel === i ? ' selected' : '') + '>' + esc(h || ('Column ' + (i + 1))) + '</option>'; });
      return o;
    }
    var fieldRows = FIELDS.map(function (f) {
      return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:7px">' +
        '<div style="flex:0 0 150px;font-size:13px;color:#cbd2da">' + esc(f.label) + (f.req ? ' <span style="color:#f2b43a">*</span>' : '') + '</div>' +
        '<select data-f="' + f.k + '" style="' + S + 'flex:1">' + opts_(map[f.k]) + '</select></div>';
    }).join('');
    sheet(
      '<div style="display:flex;align-items:center;margin-bottom:8px"><b style="font-size:17px">Match your columns</b>' +
      '<button data-x style="margin-left:auto;background:none;border:none;color:#9aa3af;font-size:26px;cursor:pointer;width:44px;height:44px">&times;</button></div>' +
      '<div style="color:#9aa3af;font-size:12.5px;margin-bottom:10px">' + headers.length + ' columns · ' + data.length + ' rows. Map each app field to one of your columns (auto-guessed below). <b>Part name</b> is required.</div>' +
      fieldRows +
      '<div id="tkiPrev" style="margin-top:10px"></div>' +
      '<div id="tkiErr" style="color:#f0a0a6;font-size:13px;margin:8px 0;min-height:16px"></div>' +
      '<div style="display:flex;gap:8px;margin-top:6px"><button id="tkiBack" style="' + BTN + 'background:rgba(255,255,255,.06);border:1px solid #2a2f3a;color:#9aa3af">‹ Back</button>' +
      '<button id="tkiGo" style="' + BTN + 'flex:1;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff">Preview &amp; import ›</button></div>'
    );
    function readMap() { var m = {}; ov.querySelectorAll('select[data-f]').forEach(function (s) { m[s.dataset.f] = parseInt(s.value, 10); }); return m; }
    function preview() {
      var m = readMap(); var cols = FIELDS.filter(function (f) { return m[f.k] >= 0; });
      var rows = data.slice(0, 5).map(function (r) {
        return '<tr>' + cols.map(function (f) { return '<td style="padding:4px 8px;border-top:1px solid #2a2f3a;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">' + esc(r[m[f.k]]) + '</td>'; }).join('') + '</tr>';
      }).join('');
      ov.querySelector('#tkiPrev').innerHTML = cols.length ? ('<div style="font-size:11px;color:#9aa3af;margin:6px 0 4px">Preview (first 5):</div><div style="overflow:auto;border:1px solid #2a2f3a;border-radius:10px"><table style="border-collapse:collapse"><thead><tr>' + cols.map(function (f) { return '<th style="padding:5px 8px;text-align:left;font-size:11px;color:#9aa3af">' + esc(f.label) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>') : '';
    }
    ov.querySelectorAll('select[data-f]').forEach(function (s) { s.onchange = preview; });
    preview();
    ov.querySelector('#tkiBack').onclick = function () { stagePick(opts); };
    ov.querySelector('#tkiGo').onclick = function () {
      var m = readMap();
      if (!(m.name >= 0)) { ov.querySelector('#tkiErr').textContent = 'Map “Part name” to one of your columns first.'; return; }
      doImport(opts, data, m);
    };
  }

  function doImport(opts, data, m) {
    if (!(window.TKS && TKS.Inventory)) { ov.querySelector('#tkiErr').textContent = 'Inventory store not available.'; return; }
    // Build a dup index from existing stock (by sku, else name).
    var existing = TKS.Inventory.all() || [];
    var have = {};
    existing.forEach(function (p) {
      var k = (p.sku && String(p.sku).trim()) ? ('s:' + String(p.sku).trim().toLowerCase()) : ('n:' + String(p.name || '').trim().toLowerCase());
      if (k !== 'n:') have[k] = true;
    });
    var imported = 0, skipped = 0, blank = 0;
    data.forEach(function (r) {
      var part = {};
      FIELDS.forEach(function (f) {
        if (m[f.k] >= 0) {
          var v = r[m[f.k]];
          v = (v == null) ? '' : String(v).trim();
          if (INT_FIELDS[f.k]) part[f.k] = parseInt(String(v).replace(/[^0-9-]/g, ''), 10) || 0;
          else if (f.k === 'cost') part.cost = (v === '') ? '' : (parseFloat(String(v).replace(/[^0-9.\-]/g, '')) || 0);
          else part[f.k] = v;
        }
      });
      if (!(part.name && part.name.trim())) { blank++; return; }
      var key = (part.sku && part.sku.trim()) ? ('s:' + part.sku.trim().toLowerCase()) : ('n:' + part.name.trim().toLowerCase());
      if (have[key]) { skipped++; return; }
      have[key] = true;
      try { TKS.Inventory.save(part); imported++; } catch (e) { skipped++; }
    });
    sheet(
      '<div style="display:flex;align-items:center;margin-bottom:10px"><b style="font-size:17px">Import complete</b>' +
      '<button data-x style="margin-left:auto;background:none;border:none;color:#9aa3af;font-size:26px;cursor:pointer;width:44px;height:44px">&times;</button></div>' +
      '<div style="font-size:15px;line-height:1.9">' +
      '✅ <b>' + imported + '</b> part(s) imported<br>' +
      (skipped ? ('↩︎ <b>' + skipped + '</b> skipped (already in stock — matched by SKU/name)<br>') : '') +
      (blank ? ('⚠️ <b>' + blank + '</b> row(s) skipped (no part name)<br>') : '') +
      '</div>' +
      '<button id="tkiDone" style="' + BTN + 'width:100%;margin-top:14px;background:linear-gradient(180deg,#22994a,#156632);color:#fff">Done</button>'
    );
    ov.querySelector('#tkiDone').onclick = function () { close(); if (typeof opts.onDone === 'function') try { opts.onDone({ imported: imported, skipped: skipped, blank: blank }); } catch (e) {} };
  }

  window.TKImport = { open: open };
})();
