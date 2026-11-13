/* 8z115 — serial numbers on the receipt, the customer and the scan screen (READ ONLY).
   A sale marks each key's own record sold and stamps the receipt + customer on it (server side, pos_decrement_stock).
   This file only ASKS the server which keys were sold (units_for_receipt / units_for_customer, supabase/phase8/8z115)
   and shows them. It never writes anything and never touches a sale. Not signed in / demo / function not installed yet
   → every call quietly answers [] and nothing extra appears on screen.

   window.TKS_UNITS = {
     forReceipt(r)   → Promise<[{id, serial, item_id, item_name, sku, status, sold_at}]>   (sets r._serials for printing)
     forCustomer(id) → Promise<[{…, receipt_id, receipt_number, vehicle}]>                (newest first)
     linesFor(r)     → [{ index, serials:[…] }]  which receipt line each serial belongs to (by the line's partId)
     receiptBoxHTML(units) → '' | html for the small "Serial numbers" box
     renderCustKeys(box, customer, openReceipt(receiptId)) → appends "Keys sold to this customer" to box
   } */
(function () {
  'use strict';
  var cache = {};                      // receipt id → { t, p }
  var EMPTY_TTL = 30000;               // an empty answer is re-asked after 30 s (a paid invoice gets its keys at payment time)

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function canAsk() {
    try { if (!window.TKS || !TKS._sb) return false; if (TKS.isDemo && TKS.isDemo()) return false; if (TKS.auth && TKS.auth.isSignedIn && !TKS.auth.isSignedIn()) return false; return true; } catch (e) { return false; }
  }
  function ask(fn, args) {
    if (!canAsk()) return Promise.resolve([]);
    try {
      return Promise.resolve(TKS._sb().rpc(fn, args)).then(function (res) {
        var d = res && !res.error ? res.data : null;
        return Array.isArray(d) ? d : [];
      }, function () { return []; });
    } catch (e) { return Promise.resolve([]); }
  }
  function keep(r, units) {
    try { Object.defineProperty(r, '_serials', { value: units, enumerable: false, configurable: true, writable: true }); } catch (e) { }
  }

  function forReceipt(r) {
    var id = r && (r.id || r.number); if (!id) return Promise.resolve([]);
    var hit = cache[id];
    if (hit && (hit.n > 0 || Date.now() - hit.t < EMPTY_TTL)) return hit.p.then(function (u) { keep(r, u); return u; });
    var p = ask('units_for_receipt', { p_receipt: String(id) });
    cache[id] = { t: Date.now(), n: -1, p: p };
    return p.then(function (u) { cache[id].n = u.length; keep(r, u); return u; });
  }
  // receiptIds: the receipts the customer screen already lists for this person (matched by name / phone)
  function forCustomer(id, receiptIds) { var ids = (receiptIds || []).filter(Boolean).map(String).slice(0, 500); return (id || ids.length) ? ask('units_for_customer', { p_customer: id ? String(id) : '', p_receipts: ids }) : Promise.resolve([]); }

  function linesFor(r) {
    var out = [], s = r && r._serials, items = r && r.items;
    if (!Array.isArray(s) || !Array.isArray(items)) return out;
    s.forEach(function (u) {
      if (!u || !u.serial) return;
      var i = items.findIndex(function (it) { return it && !it.isDiscount && !it.declined && it.partId && String(it.partId) === String(u.item_id); });
      if (i < 0) return;
      var hit = out.find(function (o) { return o.index === i; });
      if (!hit) { hit = { index: i, serials: [] }; out.push(hit); }
      hit.serials.push(String(u.serial));
    });
    return out;
  }

  function receiptBoxHTML(units) {
    if (!units || !units.length) return '';
    return '<div class="uk-box" style="margin:0 12px 12px;padding:10px 12px;border:1px solid rgba(128,128,128,.4);border-radius:10px;background:rgba(128,128,128,.08);color:inherit;text-align:left">' +
      '<div style="font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px;opacity:.85">Serial numbers</div>' +
      units.map(function (u) {
        return '<div class="uk-row" style="display:flex;flex-wrap:wrap;gap:2px 10px;align-items:baseline;padding:4px 0;font-size:14px;overflow-wrap:anywhere">' +
          '<b style="font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px">' + esc(u.serial || '—') + '</b>' +
          '<span>' + esc(u.item_name || u.item_id || '') + '</span>' +
          (u.sku ? '<span style="opacity:.75;font-size:12.5px">' + esc(u.sku) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
  }

  var tok = 0;
  function renderCustKeys(box, c, openReceipt, receiptIds) {
    if (!box) return;
    var mine = ++tok; box._ukTok = mine;
    var old = box.querySelector('.uk-sec'); if (old) old.remove();
    if (!c || (!c.id && !(receiptIds || []).length)) return;
    forCustomer(c.id, receiptIds).then(function (units) {
      if (box._ukTok !== mine || !units.length) return;
      var old2 = box.querySelector('.uk-sec'); if (old2) old2.remove();
      var sec = document.createElement('div'); sec.className = 'uk-sec';
      sec.innerHTML = '<div class="hist-h" style="margin-top:14px">Keys sold to this customer (' + units.length + ')</div>' +
        units.map(function (u, i) {
          var when = u.sold_at ? String(u.sold_at).slice(0, 10) : '';
          return '<div class="hist-row uk-row" style="align-items:center;gap:10px"><div class="hist-main" style="min-width:0;overflow-wrap:anywhere">' +
            '<b style="font-family:ui-monospace,Menlo,Consolas,monospace;letter-spacing:1px">' + esc(u.serial || '—') + '</b> ' + esc(u.item_name || u.item_id || '') +
            '<div class="hist-svc">' + esc([when, u.vehicle, u.receipt_number ? ('#' + u.receipt_number) : ''].filter(Boolean).join(' · ')) + '</div></div>' +
            (u.receipt_id && openReceipt ? '<button type="button" class="uk-open" data-i="' + i + '" style="flex:0 0 auto;min-height:44px;min-width:72px;padding:0 12px;border-radius:9px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;font-weight:700;cursor:pointer">Open</button>' : '') + '</div>';
        }).join('');
      box.appendChild(sec);
      sec.querySelectorAll('.uk-open').forEach(function (b) { b.onclick = function () { try { openReceipt(units[+b.dataset.i].receipt_id, units[+b.dataset.i].receipt_number); } catch (e) { } }; });
    });
  }

  window.TKS_UNITS = { forReceipt: forReceipt, forCustomer: forCustomer, linesFor: linesFor, receiptBoxHTML: receiptBoxHTML, renderCustKeys: renderCustKeys };
})();
