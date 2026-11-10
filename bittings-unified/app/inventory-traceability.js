/* ============================================================================
   Inventory traceability UI — screens on top of the phase6 engine (RPCs).
   Does NOT rebuild the engine; every action calls a proven RPC:
     • cycle_start / cycle_save_line / cycle_complete   (reconcile)
     • warranty_replace / key_failed / return_update    (dispositions + returns)
     • inventory_dashboard                              (feeds the Inventory summary strip)
     • unit lookup (inventory_units select)             (scan-to-unit "story" panel)
   Cloud-only (the engine is server-side). Falls back to a clear "sign in" message
   offline. Role rules are enforced server-side; the UI mirrors them for clarity.
   Dialogs use the app's themed uiAlert / uiConfirm (index.html) — never native alert().
   ========================================================================== */
(function () {
  'use strict';
  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function demo() { try { return !!(window.TKS && TKS.isDemo && TKS.isDemo()); } catch (e) { return false; } }
  function E(s){ return (window.esc2 ? esc2(s) : String(s == null ? '' : s)); }
  // themed dialogs (index.html exposes them on window); fall back quietly if they're missing
  function say(msg, title){ try { if (window.uiAlert) return uiAlert({ title: title || 'Heads up', message: msg }); } catch (e) {} try { console.warn(msg); } catch (e2) {} return Promise.resolve(); }
  function ask(opts){ try { if (window.uiConfirm) return uiConfirm(opts); } catch (e) {} return Promise.resolve(true); }
  function money(c){ return '$' + ((c || 0) / 100).toFixed(2); }
  function fmtDate(d){ try { var x = new Date(d); if (isNaN(x.getTime())) return ''; return x.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }
  var UNIT_RE = /^u_[0-9a-f]{32}$/i;
  function looksLikeUnit(code){ code = String(code || '').trim(); return UNIT_RE.test(code) || /^u_/i.test(code); }
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
    var status = document.getElementById('rcStatus'), list = document.getElementById('rcCountList'), sum = document.getElementById('rcSummary');
    var startBtn = document.getElementById('rcStart'), finishBtn = document.getElementById('rcFinish');
    var cancelBtn = document.getElementById('rcCancel');
    var locSel = document.getElementById('rcLoc'), assignSel = document.getElementById('rcAssign');
    if (!status) return;
    sum.innerHTML = '';
    if (!s) { status.textContent = 'Sign in to the cloud to run a stock count.'; list.innerHTML = '';
      [startBtn, finishBtn, cancelBtn, locSel, assignSel].forEach(function (el){ if (el) el.style.display = 'none'; }); return; }
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
      cancelBtn.style.display = rc.countId ? '' : 'none';
      status.textContent = rc.countId ? ('Counting ' + locLabel() + ' — changes save automatically.')
        : 'Pick a location, optionally assign someone, then Start count.';
      if (rc.countId) rcItems(); else list.innerHTML = '';
      startBtn.onclick = async function (){
        startBtn.disabled = true;
        var r = await s.rpc('cycle_start', { p_assigned: assignSel.value || null, p_note: '' });
        startBtn.disabled = false;
        if (r.error) { status.textContent = 'Could not start: ' + r.error.message; return; }
        rc.countId = r.data; startBtn.style.display = 'none'; finishBtn.style.display = ''; cancelBtn.style.display = '';
        status.textContent = 'Counting ' + locLabel() + ' — changes save automatically.'; rcItems();
      };
      finishBtn.onclick = async function (){
        finishBtn.disabled = true;
        var r = await s.rpc('cycle_complete', { p_count: rc.countId });
        finishBtn.disabled = false;
        if (r.error) { status.textContent = 'Could not finish: ' + r.error.message; return; }
        rcSummary(r.data); rc.countId = null; finishBtn.style.display = 'none'; cancelBtn.style.display = 'none'; startBtn.style.display = ''; list.innerHTML = '';
      };
      // Discard an open count without applying it (server: cycle_cancel, manager+).
      cancelBtn.onclick = async function (){
        var ok = true;
        try { if (window.TKS_ACCESS && TKS_ACCESS.confirmDanger) ok = await TKS_ACCESS.confirmDanger({ title: 'Discard this count?', message: 'Nothing will be applied to stock. The count sheet is thrown away.', confirmLabel: 'Discard' }); else ok = await ask({ title: 'Discard this count?', message: 'Nothing will be applied.', okText: 'Discard', danger: true }); } catch (e) { ok = await ask({ title: 'Discard this count?', message: 'Nothing will be applied.', okText: 'Discard', danger: true }); }
        if (!ok) return;
        cancelBtn.disabled = true;
        var r = await s.rpc('cycle_cancel', { p_count: rc.countId });
        cancelBtn.disabled = false;
        if (r.error) { status.textContent = 'Could not discard: ' + r.error.message; return; }
        rc.countId = null; cancelBtn.style.display = 'none'; finishBtn.style.display = 'none'; startBtn.style.display = ''; list.innerHTML = '';
        status.textContent = 'Count discarded — nothing was applied. Start another anytime.';
      };
    } else {
      // assigned-staff view: resume an open count assigned to me
      startBtn.style.display = 'none'; assignSel.style.display = 'none'; finishBtn.style.display = 'none'; cancelBtn.style.display = 'none';
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
    var s = sb(), list = document.getElementById('rcCountList'); if (!s || !list) return;
    var rows = [];
    try { rows = ((await s.from('inventory_locations').select('item_id,qty,inventory(name,sku,deleted_at,category,fcc_id,chip)').eq('location', rc.loc)).data) || []; } catch (e) {}
    rows = rows.filter(function (r){ return r.inventory && !r.inventory.deleted_at; });
    if (!rows.length) { list.innerHTML = '<div class="empty">No stock recorded at ' + E(locLabel()) + ' yet.</div>'; return; }
    // 8z12: which key info is missing (same rule as the Stock "missing FCC ID / chip" tile)
    var FCC_SUBS = { 'Smart Key':1, 'Remote / Fob':1, 'Remote Head / Flip':1, 'Super Remote':1 };
    function needs(inv){ var sub = String(inv.category || '').split('/').slice(1).join('/').trim();
      return { fcc: !!FCC_SUBS[sub] && !String(inv.fcc_id || '').trim(), chip: sub === 'Transponder' && !String(inv.chip || '').trim() }; }
    var missingN = rows.filter(function (r){ var n = needs(r.inventory); return n.fcc || n.chip; }).length;
    var INP = 'height:40px;border-radius:9px;border:1px solid rgba(200,150,40,.6);background:transparent;color:inherit;padding:0 10px;font-size:16px;min-width:0;flex:1 1 160px';
    list.innerHTML = (missingN ? '<div class="sub" style="margin:0 0 10px;padding:8px 10px;border-radius:9px;background:rgba(242,180,58,.14)">🔎 <b>' + missingN + '</b> part' + (missingN === 1 ? '' : 's') + ' here are missing an FCC ID or chip — read it off the key or package and type it in while you count. It saves on its own.</div>' : '') +
      rows.map(function (r){
      var exp = r.qty || 0, nd = needs(r.inventory);
      var keyInfo = (nd.fcc || nd.chip) ? ('<div class="rckey" style="flex-basis:100%;display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          (nd.fcc ? '<input class="rcfcc" placeholder="FCC ID (on the back of the remote)" autocapitalize="characters" spellcheck="false" style="' + INP + ';text-transform:uppercase">' : '') +
          (nd.chip ? '<input class="rcchip" list="pChipList" placeholder="Chip (e.g. Mitsubishi N chip)" autocomplete="off" style="' + INP + '">' : '') +
          '<span class="rckeymsg sub" style="flex:0 0 auto"></span></div>') : '';
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
        keyInfo + '</div>';
    }).join('');
    list.querySelectorAll('.crow').forEach(function (row){
      var inp = row.querySelector('.rccount'), rs = row.querySelector('.rcreason'), exp = +row.dataset.exp;
      function reflect(){ rs.style.display = ((+inp.value || 0) - exp) !== 0 ? '' : 'none'; }
      row.querySelectorAll('.rcpm').forEach(function (b){ b.onclick = function (){ inp.value = Math.max(0, (+inp.value || 0) + (+b.dataset.d)); reflect(); save(row); }; });
      inp.onchange = function (){ if (+inp.value < 0) inp.value = 0; reflect(); save(row); };
      rs.onchange = function (){ save(row); };
      reflect();
      // 8z12: FCC ID / chip typed during the count → saved to the part (only these two fields)
      var fi = row.querySelector('.rcfcc'), ci = row.querySelector('.rcchip'), km = row.querySelector('.rckeymsg');
      function saveKey(){
        var s3 = sb(); if (!s3 || !rc.countId) return;
        var fv = fi ? fi.value.trim() : '', cv = ci ? ci.value.trim() : ''; if (!fv && !cv) return;
        km.textContent = 'Saving…';
        s3.rpc('cycle_set_key_info', { p_count: rc.countId, p_item: row.dataset.item, p_fcc: fv || null, p_chip: cv || null }).then(function (res){
          if (res.error) { km.textContent = '⚠ ' + res.error.message; km.style.color = '#e0555f'; return; }
          km.style.color = ''; km.textContent = '✓ saved';
          [fi, ci].forEach(function (x){ if (x && x.value.trim()) { x.style.borderColor = 'rgba(44,170,110,.7)'; } });
        });
      }
      [fi, ci].forEach(function (x){ if (x) x.onchange = saveKey; });
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
        if (r.error) { b.disabled = false; say(r.error.message, 'Could not update'); return; }
        window.renderReturns();
      };
    });
  };

  // =========================== INVENTORY DASHBOARD → SUMMARY STRIP ============
  // Called from renderInventory (index.html). Fetches the manager-only
  // inventory_dashboard numbers (stock value at cost / retail, warranty + failed
  // units, returns still to send) and hands them to the ONE summary strip
  // (index.html: invStripSetCloud → the "stock value" / "open returns" chips).
  // No session / demo / non-manager → hands null and the strip falls back to
  // the locally computed value and hides the returns chip. Renders nothing itself.
  window.renderInvDash = async function () {
    function feed(d){ try { if (window.invStripSetCloud) window.invStripSetCloud(d || null); } catch (e) {} }
    var s = sb(); if (!s) { feed(null); return; }
    if (demo()) { feed(null); return; }   // 8j: demo has no live session — nothing to fetch
    var r = null;
    try { r = await s.rpc('inventory_dashboard', {}); } catch (e) { r = { error: e }; }
    if (!r || r.error || !r.data) { feed(null); return; }   // non-managers get an error → local numbers only
    feed(r.data);
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
    var s = sb(); if (!s || demo()) { say(demo() ? 'Marking a unit failed needs the live app (the demo has no serialized units).' : 'Sign in to the cloud first.'); return; }
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
    var s = sb(); if (!s || demo()) { say(demo() ? 'Warranty replacement needs the live app (the demo has no serialized units).' : 'Sign in to the cloud first.'); return; }
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

  // =========================== RECEIVE UNITS (serialize) =====================
  // C-#16: the front door of the phase-6 traceability engine. Receiving units
  // flips the item to serialized (server: unit_ensure_serialized inside
  // unit_receive) and records supplier / batch / per-unit cost for each unit.
  // 8i: <option>s for the shop's configured suppliers (Setup › Inventory), for datalists
  function supplierOptions() { try { return (TKS.Config.suppliers() || []).map(function (s) { return '<option value="' + E(s.name) + '">'; }).join(''); } catch (e) { return ''; } }
  // Supplier is prefilled from the part's own Supplier field; the order # is asked for
  // (recommended, skippable with a themed confirm) so units can be matched to the
  // supplier invoice later. After a successful receive, when the Zebra label printer is
  // enabled, the button becomes "🏷️ Print N unit labels" (one Code-128 label per unit id).
  window.invReceiveUnits = async function (itemId, itemName) {
    var s = sb(); if (!s || demo()) { say(demo() ? 'Receiving serialized units needs the live app (the demo has no cloud session).' : 'Sign in to the cloud first.'); return; }
    var part = null; try { part = TKS.Inventory.get(itemId); } catch (e) {}
    var preSup = (part && part.supplier) ? String(part.supplier) : '';
    var m = modal('📦 Receive units (serial-tracked)',
      '<div class="sub" style="margin-bottom:8px">' + E(itemName) + ' — records each unit individually (supplier, order #, cost), so every key can be traced from receiving to sale, warranty or return. Receiving this way turns on per-unit tracking for this item.</div>' +
      '<label>Into location</label><select id="ruLoc" style="' + INP + '">' + (await locOptions(s)) + '</select>' +
      '<label>How many</label><input id="ruQty" type="number" inputmode="numeric" min="1" value="1" style="' + INP + '">' +
      '<label>Supplier' + (preSup ? ' <span class="sub">— from the part</span>' : ' (optional)') + '</label><input id="ruSup" list="ruSupList" value="' + E(preSup) + '" placeholder="e.g. American Key Supply" style="' + INP + '">' +
      '<datalist id="ruSupList">' + supplierOptions() + '</datalist>' +   // 8i: the shop's suppliers from Setup › Inventory
      '<label>Supplier invoice / order # <span class="sub">(recommended)</span></label><input id="ruBatch" placeholder="e.g. INV-88213 or PO-1042" style="' + INP + '">' +
      '<label>Cost per unit $ (optional — falls back to the item’s cost)</label><input id="ruCost" type="number" inputmode="decimal" step="0.01" min="0" placeholder="e.g. 12.50" style="' + INP + '">' +
      '<button id="ruGo" style="' + BTN + '">Receive into stock</button>' +
      '<div id="ruMsg" class="sub" style="margin-top:8px"></div>');
    m.body.querySelector('#ruGo').onclick = async function () {
      var btn = m.body.querySelector('#ruGo'), msg = m.body.querySelector('#ruMsg');
      var qty = parseInt(m.body.querySelector('#ruQty').value, 10) || 0;
      if (qty < 1) { msg.textContent = 'Quantity must be at least 1.'; return; }
      var costRaw = (m.body.querySelector('#ruCost').value || '').trim();
      var costCents = costRaw === '' ? null : Math.round(parseFloat(costRaw) * 100);
      if (costCents !== null && (isNaN(costCents) || costCents < 0)) { msg.textContent = 'Cost must be a positive amount (or blank).'; return; }
      var supplier = (m.body.querySelector('#ruSup').value || '').trim();
      var batch = (m.body.querySelector('#ruBatch').value || '').trim();
      if (!batch) {
        var go = await ask({ title: 'Receive without an order number?', message: 'You won’t be able to match these keys to a supplier invoice later.', okText: 'Receive anyway', cancelText: 'Go back', danger: true });
        if (!go) { try { m.body.querySelector('#ruBatch').focus(); } catch (e) {} return; }
      }
      btn.disabled = true; msg.textContent = 'Receiving…';
      var r = await s.rpc('unit_receive', {
        p_item: itemId, p_location: m.body.querySelector('#ruLoc').value, p_qty: qty,
        p_supplier: supplier, p_batch: batch,
        p_unit_cost_cents: costCents
      });
      if (r.error) { msg.textContent = r.error.message; btn.disabled = false; return; }
      var ids = Array.isArray(r.data) ? r.data.filter(Boolean) : [];
      msg.textContent = '✓ Received ' + (ids.length || qty) + ' unit(s) — each is now individually tracked.';
      afterChange();
      // Labels: one per unit when the Zebra printer is enabled on this workstation
      var lbOn = false; try { lbOn = !!(window.TKS_HW && TKS_HW.prefs && TKS_HW.prefs().labels && TKS_HW.prefs().labels.enabled && TKS_HW.labels && TKS_HW.labels.printUnits); } catch (e) {}
      if (!lbOn || !ids.length) { setTimeout(m.close, 1100); return; }
      var nowIso = new Date().toISOString();
      var units = ids.map(function (id){ return { id: id, acquired_at: nowIso, supplier: supplier, batch: batch }; });
      var partForLabel = part || { id: itemId, name: itemName, sku: '' };
      btn.textContent = '🏷️ Print ' + ids.length + ' unit label' + (ids.length === 1 ? '' : 's'); btn.disabled = false;
      var done = document.createElement('button'); done.type = 'button'; done.textContent = 'Done — no labels';
      done.style.cssText = 'width:100%;margin-top:8px;padding:12px;min-height:44px;border-radius:10px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;font-weight:600;cursor:pointer';
      btn.insertAdjacentElement('afterend', done);
      done.onclick = m.close;
      btn.onclick = function () {
        btn.disabled = true; msg.textContent = 'Printing ' + units.length + ' label(s)…';
        TKS_HW.labels.printUnits(units, partForLabel).then(function (n){ msg.textContent = '✓ ' + n + ' label(s) sent to the printer.'; setTimeout(m.close, 1100); })
          .catch(function (err){ msg.textContent = (err && err.message) || String(err); btn.disabled = false; });
      };
    };
  };

  // =========================== UNIT LOOKUP + "STORY" PANEL ====================
  // A scanned per-unit label (Code-128 of the unit id, u_ + 32 hex) → the unit's story:
  // part + SKU, brand + grade, supplier + order #, received when/by whom, cost, where
  // it is now, sale (receipt / customer / date) and disposition, with the actions a
  // tech needs on the spot. Also opened from the Inventory toolbar ("🔎 Scan a key")
  // with a text box for shops without a scanner (unit id OR SKU).
  // Reads inventory_units directly (staff have select). Demo mode: a clear note.
  window.unitLookup = async function (code) {
    code = String(code || '').trim();
    if (demo()) throw new Error('Unit lookup needs the live app — the demo has no serialized units.');
    var s = sb(); if (!s) throw new Error('Sign in to the cloud to look up a key.');
    var r = await s.from('inventory_units').select('*').eq('id', code).maybeSingle();
    if (r.error) throw new Error(r.error.message);
    if (!r.data) throw new Error('No key with id “' + code + '” in this shop.');
    var part = null; try { part = TKS.Inventory.get(r.data.item_id); } catch (e) {}
    return { unit: r.data, part: part };
  };
  var ST_LABEL = { in_stock: 'In stock', sold: 'Sold', warranty_out: 'Out on warranty', failed: 'Failed', lost: 'Lost', written_off: 'Written off' };
  var ST_COLOR = { in_stock: '#1c7d3e', sold: '#2b6cb0', warranty_out: '#b7791f', failed: '#a3252e', lost: '#a3252e', written_off: '#6b7280' };
  function findPartLocal(code){
    var all = []; try { all = TKS.Inventory.all() || []; } catch (e) {}
    var lc = code.toLowerCase();
    return all.find(function (p){ return String(p.sku || '').toLowerCase() === lc; }) ||
           all.find(function (p){ return String(p.id) === code; }) ||
           all.find(function (p){ return String(p.sku || '').toLowerCase().indexOf(lc) === 0; }) || null;
  }
  var ROW = 'display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-top:1px solid rgba(128,128,128,.22);font-size:14px';
  var ACT = 'flex:1 1 140px;min-height:44px;padding:10px 12px;border-radius:10px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;font-weight:700;cursor:pointer;font-size:14px';
  var upOpen = null;   // the panel that is open right now — a scan while it's open feeds it instead of stacking another
  window.openUnitPanel = function (code) {
    code = String(code || '').trim();
    if (upOpen && document.body.contains(upOpen.ov)) { if (code) { upOpen.inp.value = code; upOpen.find(code); } else { try { upOpen.inp.focus(); } catch (e) {} } return upOpen.m; }
    var m = modal('🔎 Key lookup',
      '<div style="display:flex;gap:8px;align-items:stretch;margin-bottom:10px">' +
        '<input id="upCode" placeholder="Scan or type a unit id (u_…) or SKU" autocomplete="off" autocapitalize="off" spellcheck="false" style="' + INP + 'margin:0;flex:1;min-width:0">' +
        '<button id="upGo" type="button" style="flex:0 0 auto;min-width:72px;min-height:44px;padding:0 14px;border-radius:9px;border:none;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font-weight:700;cursor:pointer">Find</button>' +
      '</div>' +
      '<div id="upOut" class="sub">Scan a key’s label, or type its unit id or the part’s SKU.</div>' +
      // 8r: phone camera (QR unit labels / SKU barcodes); hidden when the page has no camera access (plain http, desktop without camera)
      ((window.TKS_CAM && TKS_CAM.available()) ? '<button id="upCam" type="button" style="margin-top:10px;width:100%;min-height:46px;border-radius:10px;border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;font-weight:700;font-size:15px;cursor:pointer">📷 Scan with the camera</button>' : ''));
    var inp = m.body.querySelector('#upCode'), out = m.body.querySelector('#upOut');
    function note(html){ out.innerHTML = '<div style="' + CARD + ';font-size:14px;line-height:1.5">' + html + '</div>'; }
    function partHead(part, fallbackName){
      var brand = ''; try { brand = window.partBrand ? partBrand(part) : (part.brand || ''); } catch (e) {}
      var grade = ''; try { grade = (window.partGrade && part) ? partGrade(part) : (part.grade || ''); } catch (e) {}
      if (grade === 'Unsorted') grade = '';
      return '<div style="font-weight:800;font-size:16px;line-height:1.3">' + E((part && part.name) || fallbackName || '(part)') + '</div>' +
        '<div class="sub" style="margin-top:2px">' + [part && part.sku, brand, grade].filter(Boolean).map(E).join(' · ') + '</div>';
    }
    async function story(unit, part){
      var s = sb();
      var vans = [], who = '', custName = '';
      try { vans = ((await s.from('vans').select('id,nickname,fleet_no')).data) || []; } catch (e) {}
      if (unit.created_by) { try { var st = await s.from('staff').select('user_id,name').eq('user_id', unit.created_by).maybeSingle(); who = (st.data && st.data.name) || ''; } catch (e) {} }
      if (unit.sold_customer_id) { try { var c = (TKS.Customers.all() || []).find(function (x){ return x.id === unit.sold_customer_id; }); custName = (c && (c.customer || c.name)) || ''; } catch (e) {} }
      if (!custName && unit.sold_receipt_id) { try { var rc = await s.from('receipts').select('data').eq('id', unit.sold_receipt_id).maybeSingle(); custName = (rc.data && rc.data.data && rc.data.data.customer) || ''; } catch (e) {} }
      function locName(l){ if (l === 'shop') return '🏪 Shop'; if (String(l).indexOf('van:') === 0) { var v = vans.find(function (x){ return x.id === String(l).slice(4); }); return '🚐 ' + ((v && (v.nickname || ('Van ' + (v.fleet_no || '')))) || 'Van'); } return l || '—'; }
      var st = unit.status || 'in_stock';
      var pName = (part && part.name) || unit.item_id;
      var rows = [
        ['Status', '<b style="color:' + (ST_COLOR[st] || 'inherit') + '">' + E(ST_LABEL[st] || st) + '</b>' + (st === 'in_stock' ? ' · ' + E(locName(unit.location)) : '')],
        ['Supplier', E(unit.supplier || (part && part.supplier) || '—')],
        ['Invoice / order #', unit.batch ? E(unit.batch) : '<span class="sub">— not recorded</span>'],
        ['Received', E(fmtDate(unit.acquired_at || unit.created_at) || '—') + (who ? ' · by ' + E(who) : '')],
        ['Unit cost', unit.unit_cost_cents != null ? money(unit.unit_cost_cents) : '<span class="sub">—</span>']
      ];
      if (unit.sold_receipt_id || unit.sold_at) rows.push(['Sold', [fmtDate(unit.sold_at), unit.sold_receipt_id ? ('receipt ' + unit.sold_receipt_id) : '', custName].filter(Boolean).map(E).join(' · ') || '—']);
      if (unit.disposition) rows.push([st === 'warranty_out' ? 'Warranty' : 'Disposition', E(unit.disposition)]);
      out.innerHTML = '<div style="' + CARD + '">' + partHead(part, unit.item_id) +
        '<div class="sub" style="margin:6px 0 8px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;word-break:break-all">' + E(unit.id) + '</div>' +
        rows.map(function (r){ return '<div style="' + ROW + '"><span class="sub" style="flex:0 0 auto">' + r[0] + '</span><span style="text-align:right">' + r[1] + '</span></div>'; }).join('') +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
          '<button type="button" id="upWarr" style="' + ACT + '">🛡️ Warranty replacement</button>' +
          '<button type="button" id="upFail" style="' + ACT + '">⚠️ Mark failed → return</button>' +
          (part && window.openStockPanel ? '<button type="button" id="upMove" style="' + ACT + '">📍 Move / stock</button>' : '') +
          '<button type="button" id="upClose" style="' + ACT + ';border-color:transparent;font-weight:600">Close</button>' +
        '</div>';
      var itemId = unit.item_id;
      out.querySelector('#upWarr').onclick = function (){ m.close(); if (window.invWarranty) invWarranty(itemId, pName); };
      out.querySelector('#upFail').onclick = function (){ m.close(); if (window.invFailed) invFailed(itemId, pName); };
      var mv = out.querySelector('#upMove'); if (mv) mv.onclick = function (){ m.close(); try { openStockPanel(part); } catch (e) {} };
      out.querySelector('#upClose').onclick = m.close;
    }
    async function partUnits(part){
      // SKU typed/scanned → the part, plus (live app) its most recent units to pick from
      var head = '<div style="' + CARD + '">' + partHead(part) +
        '<div class="sub" style="margin-top:6px">On hand: <b>' + (parseInt(part.qty, 10) || 0) + '</b>' + (part.supplier ? ' · supplier ' + E(part.supplier) : '') + '</div></div>';
      if (demo() || !sb()) { out.innerHTML = head + '<div class="sub" style="margin-top:10px">' + (demo() ? 'Per-unit history (received / sold / warranty) needs the live app — the demo has no serialized units.' : 'Sign in to see this part’s individual units.') + '</div>'; return; }
      out.innerHTML = head + '<div class="sub" style="margin-top:10px">Loading units…</div>';
      var units = [];
      try { units = ((await sb().from('inventory_units').select('id,status,location,supplier,batch,acquired_at,sold_at').eq('item_id', part.id).order('acquired_at', { ascending: false }).limit(25)).data) || []; } catch (e) {}
      if (!units.length) { out.innerHTML = head + '<div class="sub" style="margin-top:10px">No serialized units for this part yet — use 📦 Receive units on its row to start tracking each key.</div>'; return; }
      out.innerHTML = head + '<div class="sub" style="margin:10px 0 4px">Units (newest first) — tap one for its story</div>' +
        units.map(function (u){ return '<button type="button" class="upU" data-id="' + E(u.id) + '" style="display:flex;width:100%;justify-content:space-between;gap:10px;align-items:center;min-height:44px;padding:8px 10px;margin-top:6px;border-radius:9px;border:1px solid rgba(128,128,128,.3);background:transparent;color:inherit;cursor:pointer;text-align:left;font-size:13px">' +
          '<span style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11.5px;word-break:break-all">' + E(u.id) + '</span>' +
          '<span style="flex:0 0 auto;color:' + (ST_COLOR[u.status] || 'inherit') + ';font-weight:700">' + E(ST_LABEL[u.status] || u.status) + '</span></button>'; }).join('');
      out.querySelectorAll('.upU').forEach(function (b){ b.onclick = function (){ inp.value = b.dataset.id; find(b.dataset.id); }; });
    }
    async function find(v){
      v = String(v || '').trim(); if (!v) { out.innerHTML = '<div class="sub">Type or scan something first.</div>'; return; }
      if (looksLikeUnit(v)) {
        if (demo()) { note('<b>Unit lookup needs the live app.</b><br>The demo has no cloud session or serialized units. In the live app, scanning a key’s label opens its story here: part, supplier and order #, when it was received, where it is, and its sale or warranty history.'); return; }
        if (!sb()) { note('Sign in to the cloud to look up a key by its unit id.'); return; }
        out.innerHTML = '<div class="sub">Looking up ' + E(v) + '…</div>';
        try { var res = await window.unitLookup(v); await story(res.unit, res.part); }
        catch (e) { note(E((e && e.message) || String(e))); }
        return;
      }
      var p = findPartLocal(v);
      if (!p) { note('No part with SKU “' + E(v) + '”. Scan a key label (unit id) or type the exact SKU.'); return; }
      await partUnits(p);
    }
    m.body.querySelector('#upGo').onclick = function (){ find(inp.value); };
    var camBtn = m.body.querySelector('#upCam');
    if (camBtn) camBtn.onclick = function (){ TKS_CAM.scan({ title: '📷 Scan a key', hint: 'Point the camera at the key label’s QR code (or a SKU barcode).' })
      .then(function (code){ inp.value = code; find(code); })
      .catch(function (e){ if (e && e.message !== 'cancelled') note(e.message || String(e)); }); };
    inp.addEventListener('keydown', function (e){ if (e.key === 'Enter') { e.preventDefault(); find(inp.value); } });
    upOpen = { m: m, ov: m.ov, inp: inp, find: find };
    if (code) { inp.value = code; find(code); } else { setTimeout(function (){ try { inp.focus(); } catch (e) {} }, 40); }
    return m;
  };
  window.unitPanelOpen = function (){ return !!(upOpen && document.body.contains(upOpen.ov)); };
})();
