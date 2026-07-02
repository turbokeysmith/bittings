/* ============================================================================
   Inventory traceability UI — screens on top of the phase6 engine (RPCs).
   Does NOT rebuild the engine; every action calls a proven RPC:
     • cycle_start / cycle_save_line / cycle_complete   (reconcile)
     • warranty_replace / key_failed / return_update    (dispositions + returns)
     • inventory_dashboard                              (value cards)
   Cloud-only (the engine is server-side). Falls back to a clear "sign in" message
   offline. Role rules are enforced server-side; the UI mirrors them for clarity.
   ========================================================================== */
(function () {
  'use strict';
  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function E(s){ return (window.esc2 ? esc2(s) : String(s == null ? '' : s)); }
  var REASONS = [['','— pick a reason —'],['sold_from_van','Sold from van / not scanned'],
    ['failed_defective','Failed / defective'],['lost','Lost'],['miscount','Miscount'],['other','Other']];
  var PM = 'width:40px;height:40px;font-size:20px;line-height:1;border-radius:9px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;cursor:pointer;flex:0 0 auto';
  var CARD = 'padding:12px;border:1px solid rgba(128,128,128,.25);border-radius:12px';

  async function role(s){ try { return ((await s.rpc('current_staff_role')).data) || ''; } catch (e) { return ''; } }
  var isMgr = function(r){ return r === 'manager' || r === 'owner'; };

  // =========================== RECONCILE / CYCLE COUNT ======================
  var rc = { countId: null, loc: 'shop', role: '' };
  window.renderReconcile = async function () {
    var s = sb();
    var status = document.getElementById('rcStatus'), list = document.getElementById('rcList'), sum = document.getElementById('rcSummary');
    var startBtn = document.getElementById('rcStart'), finishBtn = document.getElementById('rcFinish');
    var locSel = document.getElementById('rcLoc'), assignSel = document.getElementById('rcAssign');
    if (!status) return;
    sum.innerHTML = '';
    if (!s) { status.textContent = 'Sign in to the cloud to run a stock count.'; list.innerHTML = '';
      [startBtn, finishBtn, locSel, assignSel].forEach(function (el){ if (el) el.style.display = 'none'; }); return; }
    rc.role = await role(s);
    var mgr = isMgr(rc.role);
    // locations: shop + vans
    var vans = []; try { vans = ((await s.from('vans').select('id,nickname,fleet_no')).data) || []; } catch (e) {}
    locSel.style.display = '';
    locSel.innerHTML = '<option value="shop">🏪 Shop</option>' + vans.map(function (v){
      return '<option value="van:' + v.id + '">🚐 ' + E(v.nickname || v.fleet_no || 'Van') + '</option>'; }).join('');
    locSel.value = rc.loc;
    locSel.onchange = function (){ rc.loc = locSel.value; if (rc.countId) rcItems(); };
    if (mgr) {
      var staff = []; try { staff = ((await s.from('staff').select('user_id,name,role').eq('active', true)).data) || []; } catch (e) {}
      assignSel.style.display = '';
      assignSel.innerHTML = '<option value="">— assign to (optional) —</option>' + staff.map(function (p){
        return '<option value="' + p.user_id + '">' + E(p.name || p.role) + '</option>'; }).join('');
      startBtn.style.display = rc.countId ? 'none' : '';
      finishBtn.style.display = rc.countId ? '' : 'none';
      status.textContent = rc.countId ? ('Counting ' + locLabel() + ' — changes save automatically.')
        : 'Pick a location, optionally assign someone, then Start count.';
      if (rc.countId) rcItems(); else list.innerHTML = '';
      startBtn.onclick = async function (){
        startBtn.disabled = true;
        var r = await s.rpc('cycle_start', { p_assigned: assignSel.value || null, p_note: '' });
        startBtn.disabled = false;
        if (r.error) { status.textContent = 'Could not start: ' + r.error.message; return; }
        rc.countId = r.data; startBtn.style.display = 'none'; finishBtn.style.display = '';
        status.textContent = 'Counting ' + locLabel() + ' — changes save automatically.'; rcItems();
      };
      finishBtn.onclick = async function (){
        finishBtn.disabled = true;
        var r = await s.rpc('cycle_complete', { p_count: rc.countId });
        finishBtn.disabled = false;
        if (r.error) { status.textContent = 'Could not finish: ' + r.error.message; return; }
        rcSummary(r.data); rc.countId = null; finishBtn.style.display = 'none'; startBtn.style.display = ''; list.innerHTML = '';
      };
    } else {
      // assigned-staff view: resume an open count assigned to me
      startBtn.style.display = 'none'; assignSel.style.display = 'none'; finishBtn.style.display = 'none';
      var me = null; try { me = (await s.auth.getUser()).data.user.id; } catch (e) {}
      var open = []; try { open = ((await s.from('cycle_counts').select('id').eq('status','open').eq('assigned_to', me).order('created_at',{ascending:false}).limit(1)).data) || []; } catch (e) {}
      if (open && open[0]) { rc.countId = open[0].id;
        status.textContent = 'You have a count to complete. Enter each count; a reason is required for anything that doesn’t match. Your manager finalizes it.';
        rcItems();
      } else { rc.countId = null; status.textContent = 'No count is assigned to you right now.'; list.innerHTML = ''; }
    }
  };
  function locLabel(){ var l = document.getElementById('rcLoc'); return (l && l.selectedOptions[0]) ? l.selectedOptions[0].textContent : 'stock'; }
  async function rcItems(){
    var s = sb(), list = document.getElementById('rcList'); if (!s || !list) return;
    var rows = [];
    try { rows = ((await s.from('inventory_locations').select('item_id,qty,inventory(name,sku,deleted_at)').eq('location', rc.loc)).data) || []; } catch (e) {}
    rows = rows.filter(function (r){ return r.inventory && !r.inventory.deleted_at; });
    if (!rows.length) { list.innerHTML = '<div class="empty">No stock recorded at ' + E(locLabel()) + ' yet.</div>'; return; }
    list.innerHTML = rows.map(function (r){
      var exp = r.qty || 0;
      return '<div class="crow" data-item="' + E(r.item_id) + '" data-exp="' + exp + '" style="align-items:center;flex-wrap:wrap;gap:8px">' +
        '<div style="flex:1;min-width:140px"><div class="nm">' + E(r.inventory.name || r.item_id) + '</div>' +
          '<div class="sub">' + E(r.inventory.sku || '') + ' · expected ' + exp + '</div></div>' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<button class="rcpm" data-d="-1" aria-label="minus" style="' + PM + '">−</button>' +
          '<input class="rccount" type="number" inputmode="numeric" value="' + exp + '" style="width:64px;height:40px;text-align:center;border-radius:9px;border:1px solid rgba(128,128,128,.45);background:transparent;color:inherit;font-size:16px">' +
          '<button class="rcpm" data-d="1" aria-label="plus" style="' + PM + '">+</button>' +
        '</div>' +
        '<select class="rcreason" style="display:none;flex:0 0 auto;min-height:40px;border-radius:9px">' +
          REASONS.map(function (o){ return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select>' +
        '</div>';
    }).join('');
    list.querySelectorAll('.crow').forEach(function (row){
      var inp = row.querySelector('.rccount'), rs = row.querySelector('.rcreason'), exp = +row.dataset.exp;
      function reflect(){ rs.style.display = ((+inp.value || 0) - exp) !== 0 ? '' : 'none'; }
      row.querySelectorAll('.rcpm').forEach(function (b){ b.onclick = function (){ inp.value = Math.max(0, (+inp.value || 0) + (+b.dataset.d)); reflect(); save(row); }; });
      inp.onchange = function (){ if (+inp.value < 0) inp.value = 0; reflect(); save(row); };
      rs.onchange = function (){ save(row); };
      reflect();
    });
    async function save(row){
      var s2 = sb(); if (!s2 || !rc.countId) return;
      var item = row.dataset.item, cnt = +row.querySelector('.rccount').value || 0, reason = row.querySelector('.rcreason').value || null;
      var r = await s2.rpc('cycle_save_line', { p_count: rc.countId, p_item: item, p_location: rc.loc, p_counted: cnt, p_reason: reason });
      var nm = row.querySelector('.nm');
      if (r.error) { nm.style.color = '#e0555f'; row.title = r.error.message; } else { nm.style.color = ''; row.title = 'saved ✓'; }
    }
  }
  function rcSummary(d){
    var sum = document.getElementById('rcSummary'); if (!sum || !d) return;
    sum.innerHTML = '<div style="' + CARD + '"><b>Count applied ✓</b><div class="sub" style="margin-top:6px">' +
      (d.lines || 0) + ' item(s) counted · ' + (d.adjusted || 0) + ' adjusted · net change ' +
      (d.net_delta > 0 ? '+' : '') + (d.net_delta || 0) + '</div></div>';
    document.getElementById('rcStatus').textContent = 'Done. Start another count anytime.';
  }

  // =========================== RETURN-TO-SUPPLIER LIST ======================
  var ret = { filter: 'open', role: '' };
  window.renderReturns = async function () {
    var s = sb(), seg = document.getElementById('retSeg'), status = document.getElementById('retStatus'), list = document.getElementById('retList');
    if (!status) return;
    if (!s) { status.textContent = 'Sign in to the cloud to see supplier returns.'; list.innerHTML = ''; if (seg) seg.innerHTML = ''; return; }
    ret.role = await role(s);
    var tabs = [['open','Open'],['warranty','Warranty'],['failed','Failed'],['resolved','Resolved'],['all','All']];
    seg.innerHTML = tabs.map(function (t){ return '<button class="seg-btn' + (ret.filter === t[0] ? ' on' : '') + '" data-f="' + t[0] + '" style="padding:8px 12px;margin-right:6px;border-radius:9px;border:1px solid rgba(128,128,128,.35);background:' + (ret.filter === t[0] ? 'rgba(128,128,128,.18)' : 'transparent') + ';color:inherit;cursor:pointer">' + t[1] + '</button>'; }).join('');
    seg.querySelectorAll('[data-f]').forEach(function (b){ b.onclick = function (){ ret.filter = b.dataset.f; window.renderReturns(); }; });
    var rows = [];
    try { rows = ((await s.from('supplier_returns').select('id,type,item_id,supplier,customer_id,original_receipt_id,status,note,created_at,inventory(name)').order('created_at', { ascending: false })).data) || []; } catch (e) { status.textContent = 'Could not load returns: ' + (e.message || e); return; }
    var open = ['needs_return','sent'];
    rows = rows.filter(function (r){
      if (ret.filter === 'open') return open.indexOf(r.status) >= 0;
      if (ret.filter === 'resolved') return open.indexOf(r.status) < 0;
      if (ret.filter === 'warranty' || ret.filter === 'failed') return r.type === ret.filter;
      return true;
    });
    var mgr = isMgr(ret.role);
    var needed = rows.filter(function (r){ return r.status === 'needs_return'; }).length;
    status.textContent = needed ? (needed + ' item(s) need to go back to a supplier.') : 'Warranty + failed keys owed back to suppliers, tracked to credit/replacement.';
    if (!rows.length) { list.innerHTML = '<div class="empty">Nothing here.</div>'; return; }
    var STLABEL = { needs_return: 'Needs return', sent: 'Sent', credited: 'Credited', replacement_received: 'Replacement received' };
    list.innerHTML = rows.map(function (r){
      var badge = r.type === 'warranty' ? '🛡️ Warranty' : '⚠️ Failed';
      var acts = '';
      if (mgr) {
        if (r.status === 'needs_return') acts = '<button class="retA" data-id="' + r.id + '" data-s="sent">Mark sent</button>';
        else if (r.status === 'sent') acts = '<button class="retA" data-id="' + r.id + '" data-s="credited">Credit received</button>' +
          '<button class="retA" data-id="' + r.id + '" data-s="replacement_received">Replacement received</button>';
      }
      return '<div class="crow" style="align-items:center;flex-wrap:wrap;gap:8px">' +
        '<div style="flex:1;min-width:160px"><div class="nm">' + badge + ' · ' + E((r.inventory && r.inventory.name) || r.item_id) + '</div>' +
          '<div class="sub">' + E(r.supplier || 'supplier —') + (r.type === 'warranty' && r.original_receipt_id ? (' · sale ' + E(r.original_receipt_id)) : '') + ' · ' + (STLABEL[r.status] || r.status) + '</div></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap">' + acts + '</div></div>';
    }).join('');
    list.querySelectorAll('.retA').forEach(function (b){
      b.style.cssText = 'padding:9px 12px;min-height:40px;border-radius:9px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;cursor:pointer;font-weight:600';
      b.onclick = async function (){ b.disabled = true;
        var r = await sb().rpc('return_update', { p_id: b.dataset.id, p_status: b.dataset.s });
        if (r.error) { b.disabled = false; alert(r.error.message); return; }
        window.renderReturns();
      };
    });
  };

  // =========================== INVENTORY DASHBOARD CARDS =====================
  // Called from renderInventory (index.html) — manager+ only; silent for others.
  window.renderInvDash = async function () {
    var el = document.getElementById('invDash'); if (!el) return;
    var s = sb(); if (!s) { el.innerHTML = ''; return; }
    var r = await s.rpc('inventory_dashboard', {});
    if (r.error || !r.data) { el.innerHTML = ''; return; }   // non-managers get an error → hide silently
    var d = r.data, money = function (c){ return '$' + ((c || 0) / 100).toFixed(2); };
    function card(label, val){ return '<div style="flex:1;min-width:120px;' + CARD + '"><div class="sub">' + label + '</div><div style="font-size:20px;font-weight:700;margin-top:2px">' + val + '</div></div>'; }
    el.innerHTML = '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      card('Stock retail value', money(d.retail_cents)) +
      card('Stock cost', money(d.cost_cents)) +
      card('Warranty replacements', d.warranty_replacements || 0) +
      card('Failed keys', d.failed_keys || 0) +
      card('Returns to send', d.returns_needed || 0) +
      '</div>';
  };

  // =========================== WARRANTY / FAILED MODALS ======================
  var INP = 'width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;font-size:16px;margin:4px 0 10px';
  var BTN = 'width:100%;padding:13px;border-radius:10px;border:none;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font-weight:700;cursor:pointer';
  function modal(title, bodyHtml) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="background:var(--card,#fff);color:var(--ink,#14171b);width:100%;max-width:460px;border-radius:16px;padding:16px;max-height:90vh;overflow:auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:17px">' + title + '</b>' +
      '<button class="tmX" style="background:none;border:none;font-size:24px;cursor:pointer;color:inherit;width:40px;height:40px">×</button></div>' +
      '<div class="tmBody">' + bodyHtml + '</div></div>';
    document.body.appendChild(ov);
    function close(){ ov.remove(); }
    ov.querySelector('.tmX').onclick = close;
    ov.addEventListener('click', function (e){ if (e.target === ov) close(); });
    return { ov: ov, close: close, body: ov.querySelector('.tmBody') };
  }
  async function locOptions(s) {
    var vans = []; try { vans = ((await s.from('vans').select('id,nickname,fleet_no')).data) || []; } catch (e) {}
    return '<option value="shop">🏪 Shop</option>' + vans.map(function (v){ return '<option value="van:' + v.id + '">🚐 ' + E(v.nickname || v.fleet_no || 'Van') + '</option>'; }).join('');
  }
  function afterChange(){ try { if (window.renderInventory) renderInventory(); } catch (e) {} try { if (window.renderInvDash) renderInvDash(); } catch (e) {} }

  window.invFailed = async function (itemId, itemName) {
    var s = sb(); if (!s) { alert('Sign in to the cloud first.'); return; }
    var m = modal('⚠️ Mark a unit failed',
      '<div class="sub" style="margin-bottom:8px">' + E(itemName) + ' — pulls one unit from stock and adds it to the supplier-return list. No customer (this key never reached one).</div>' +
      '<label>From location</label><select id="fkLoc" style="' + INP + '">' + (await locOptions(s)) + '</select>' +
      '<label>Reason (optional)</label><input id="fkReason" placeholder="e.g. wouldn’t program" style="' + INP + '">' +
      '<button id="fkGo" style="' + BTN + '">Mark failed → return list</button>' +
      '<div id="fkMsg" class="sub" style="margin-top:8px"></div>');
    m.body.querySelector('#fkGo').onclick = async function () {
      var btn = m.body.querySelector('#fkGo'); btn.disabled = true;
      var r = await s.rpc('key_failed', { p_item: itemId, p_location: m.body.querySelector('#fkLoc').value, p_reason: m.body.querySelector('#fkReason').value || '' });
      if (r.error) { m.body.querySelector('#fkMsg').textContent = r.error.message; btn.disabled = false; return; }
      m.body.querySelector('#fkMsg').textContent = '✓ Marked failed and added to the returns list.';
      afterChange(); setTimeout(m.close, 900);
    };
  };

  window.invWarranty = async function (itemId, itemName) {
    var s = sb(); if (!s) { alert('Sign in to the cloud first.'); return; }
    var units = [];
    try { units = ((await s.from('inventory_units').select('sold_receipt_id,sold_at').eq('item_id', itemId).eq('status', 'sold').not('sold_receipt_id', 'is', null).order('sold_at', { ascending: false })).data) || []; } catch (e) {}
    var ids = []; units.forEach(function (u){ if (u.sold_receipt_id && ids.indexOf(u.sold_receipt_id) < 0) ids.push(u.sold_receipt_id); });
    var recMap = {};
    if (ids.length) { try { var recs = ((await s.from('receipts').select('id,data,created_at').in('id', ids)).data) || [];
      recs.forEach(function (r){ recMap[r.id] = { cust: (r.data && r.data.customer) || '', num: (r.data && (r.data.number || r.id)) || r.id, date: (r.data && r.data.date) || (r.created_at || '').slice(0, 10) }; }); } catch (e) {} }
    var salesHtml = ids.length
      ? ids.map(function (id){ var r = recMap[id] || {}; return '<label style="display:flex;gap:8px;align-items:center;padding:8px;border:1px solid rgba(128,128,128,.3);border-radius:9px;margin-bottom:6px;cursor:pointer"><input type="radio" name="wrRcpt" value="' + E(id) + '"><span>' + E(r.cust || '(customer)') + ' · ' + E(r.date || '') + ' · ' + E(r.num || id) + '</span></label>'; }).join('')
      : '<div class="sub">No serialized sales of this item found to warranty against. (Warranty tracking applies to units sold after serialization.)</div>';
    var m = modal('🛡️ Warranty replacement',
      '<div class="sub" style="margin-bottom:8px">' + E(itemName) + ' — pick the original sale; the app checks it’s still under warranty, issues a new one from your chosen location (logged as warranty, not a sale), and puts the bad key on the return list.</div>' +
      '<label>Original sale</label><div style="margin-bottom:10px">' + salesHtml + '</div>' +
      '<label>Issue replacement from</label><select id="wrLoc" style="' + INP + '">' + (await locOptions(s)) + '</select>' +
      '<button id="wrGo" style="' + BTN + '" ' + (ids.length ? '' : 'disabled') + '>Issue warranty replacement</button>' +
      '<div id="wrMsg" class="sub" style="margin-top:8px"></div>');
    var go = m.body.querySelector('#wrGo');
    if (go) go.onclick = async function () {
      var sel = m.body.querySelector('input[name="wrRcpt"]:checked'), msg = m.body.querySelector('#wrMsg');
      if (!sel) { msg.textContent = 'Pick the original sale first.'; return; }
      go.disabled = true;
      var r = await s.rpc('warranty_replace', { p_original_receipt: sel.value, p_item: itemId, p_location: m.body.querySelector('#wrLoc').value });
      if (r.error) { msg.textContent = r.error.message; go.disabled = false; return; }
      msg.textContent = '✓ Warranty replacement issued. Bad key added to the returns list.';
      afterChange(); setTimeout(m.close, 1100);
    };
  };
})();
