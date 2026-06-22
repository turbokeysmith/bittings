/* ============================================================================
   app/access.js — role-aware UI gating + a shared destructive-confirm modal.
   ----------------------------------------------------------------------------
   Loaded on every staff-app page. Mirrors the server's permission matrix so the
   UI matches what the database actually allows:
     • TKS_ACCESS.can(cap)            → may the current role do this?
     • [data-cap="X"] on a control    → auto-hidden/disabled when the role can't.
     • TKS_ACCESS.confirmDanger({...}) → ONE centered "are you sure" dialog in our
                                         design system; Cancel is the default.
     • Honest deletes: store.js restores any row the server refused to delete and
       fires `tks:access-blocked`; we show a toast instead of a phantom delete.
   The server (RLS + edge functions) is the real enforcement — this is the
   matching UI layer so a tech/front-desk never even sees a control they can't use.
   ========================================================================== */
(function () {
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function can(cap){ try{ return !!(window.TKS && TKS.auth && TKS.auth.can(cap)); }catch(e){ return true; } }

  // Hide + disable any element marked data-cap="<capability>" the role can't use.
  function applyGates(root){
    root = root || document;
    try{
      root.querySelectorAll('[data-cap]').forEach(function(el){
        var ok = can(el.getAttribute('data-cap'));
        // toggle a CLASS (not inline display) so we never fight a control's own
        // show/hide logic — when allowed, the page decides visibility as before.
        el.classList.toggle('tks-cap-hidden', !ok);
        if ('disabled' in el) el.disabled = !ok;
      });
    }catch(e){}
  }

  // Centered confirm dialog. Returns a Promise<boolean>. Cancel is focused/default;
  // the destructive action is brand-red. Esc / backdrop / Cancel all resolve false.
  function confirmDanger(opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var prev = document.activeElement;
      var ov = document.createElement('div');
      ov.className = 'tks-cfm-ov';
      ov.innerHTML =
        '<div class="tks-cfm" role="dialog" aria-modal="true" aria-label="'+esc(opts.title||'Confirm')+'">'+
          '<div class="tks-cfm-title">'+esc(opts.title || 'Are you sure?')+'</div>'+
          '<div class="tks-cfm-body">'+esc(opts.message || "This can't be undone.")+'</div>'+
          '<div class="tks-cfm-actions">'+
            '<button type="button" class="tks-cfm-btn tks-cfm-cancel">'+esc(opts.cancelLabel || 'Cancel')+'</button>'+
            '<button type="button" class="tks-cfm-btn tks-cfm-danger">'+esc(opts.confirmLabel || 'Delete')+'</button>'+
          '</div>'+
        '</div>';
      function close(v){
        document.removeEventListener('keydown', onKey, true);
        ov.remove();
        try{ if(prev && prev.focus) prev.focus(); }catch(e){}
        resolve(v);
      }
      function onKey(e){
        if(e.key === 'Escape'){ e.preventDefault(); close(false); }
        if(e.key === 'Enter' && document.activeElement === cancelBtn){ e.preventDefault(); close(false); }
      }
      ov.addEventListener('mousedown', function(e){ if(e.target === ov) close(false); });
      document.body.appendChild(ov);
      var cancelBtn = ov.querySelector('.tks-cfm-cancel');
      ov.querySelector('.tks-cfm-danger').addEventListener('click', function(){ close(true); });
      cancelBtn.addEventListener('click', function(){ close(false); });
      document.addEventListener('keydown', onKey, true);
      cancelBtn.focus();   // Cancel is the default
    });
  }

  // Small transient toast (used when the server blocks an action).
  function toast(msg){
    try{
      var t = document.createElement('div');
      t.className = 'tks-toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function(){ t.classList.add('out'); }, 2600);
      setTimeout(function(){ t.remove(); }, 3100);
    }catch(e){}
  }

  // Styles injected here so the components look identical on every page regardless
  // of that page's own CSS. Uses the app's dark/brand palette.
  var css =
    '.tks-cfm-ov{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;'+
      'background:rgba(6,8,11,.66);backdrop-filter:blur(2px);padding:20px}'+
    '.tks-cfm{width:100%;max-width:400px;background:#16191f;color:#f4f5f6;border:1px solid #2a2f37;'+
      'border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.6);padding:22px 22px 18px;'+
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;animation:tkscfm .14s ease-out}'+
    '@keyframes tkscfm{from{transform:translateY(8px) scale(.98);opacity:0}to{transform:none;opacity:1}}'+
    '.tks-cfm-title{font-size:18px;font-weight:800;letter-spacing:.01em;margin:0 0 8px}'+
    '.tks-cfm-body{font-size:14.5px;line-height:1.5;color:#aeb4bd;margin:0 0 20px}'+
    '.tks-cfm-actions{display:flex;gap:10px;justify-content:flex-end}'+
    '.tks-cfm-btn{font-size:14.5px;font-weight:700;padding:11px 18px;border-radius:10px;cursor:pointer;border:1px solid transparent}'+
    '.tks-cfm-cancel{background:#21262e;color:#f4f5f6;border-color:#333a44}'+
    '.tks-cfm-cancel:hover{background:#2a313b}'+
    '.tks-cfm-cancel:focus-visible{outline:2px solid #8a93a0;outline-offset:2px}'+
    '.tks-cfm-danger{background:linear-gradient(180deg,#e4434f,#b21f29);color:#fff;box-shadow:0 6px 18px rgba(214,42,61,.34)}'+
    '.tks-cfm-danger:hover{filter:brightness(1.07)}'+
    '.tks-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99999;'+
      'background:#16191f;color:#f4f5f6;border:1px solid #2a2f37;border-left:3px solid #e4434f;'+
      'padding:12px 16px;border-radius:10px;font:600 14px system-ui;box-shadow:0 12px 34px rgba(0,0,0,.5);max-width:90vw;transition:opacity .4s}'+
    '.tks-toast.out{opacity:0}'+
    '.tks-cap-hidden{display:none !important}'+
    '#tks-role-chip{position:fixed;top:8px;right:10px;z-index:9998;background:#16191f;color:#cdd3da;border:1px solid #2a2f37;border-radius:999px;padding:3px 10px;font:700 11px system-ui,sans-serif;letter-spacing:.04em;opacity:.9;pointer-events:none}'+
    '#tks-role-chip.mgr{color:#f2b43a;border-color:#5a4a1e}';
  try{ var st = document.createElement('style'); st.textContent = css; (document.head||document.documentElement).appendChild(st); }catch(e){}

  // A small role chip on every page (the home page index.html shows its own badge).
  function renderRoleChip(){
    if(document.getElementById('authBar')) return;                 // index has its own role badge
    var a = window.TKS && TKS.auth, label = '', sr = null;
    try{ label = (a && a.roleLabel) ? a.roleLabel() : ''; sr = (a && a.staffRole) ? a.staffRole() : null; }catch(e){}
    var el = document.getElementById('tks-role-chip');
    if(!label){ if(el) el.remove(); return; }
    if(!el){ el = document.createElement('div'); el.id = 'tks-role-chip'; if(document.body) document.body.appendChild(el); }
    el.textContent = label;
    el.className = (sr==='owner' || sr==='manager' || (a && a.isOwner && a.isOwner())) ? 'mgr' : '';
  }

  // Re-apply gates + role chip whenever the role becomes known / changes, and at load.
  try{ if(window.TKS && TKS.onChange) TKS.onChange(function(){ applyGates(); renderRoleChip(); }); }catch(e){}
  if(document.readyState !== 'loading'){ applyGates(); renderRoleChip(); }
  document.addEventListener('DOMContentLoaded', function(){ applyGates(); renderRoleChip(); });
  window.addEventListener('tks:access-blocked', function(){
    toast("That wasn’t allowed — your role can’t do that. The item was kept.");
  });

  // Re-apply gates whenever the DOM changes — covers EVERY dynamically-rendered
  // control (lists, modals, panels) so a gated button can never linger visible.
  // Watches childList only (not attributes), so toggling our own class can't loop.
  var _gateTimer = null;
  function scheduleGate(){ if(_gateTimer) return; _gateTimer = setTimeout(function(){ _gateTimer = null; applyGates(); }, 50); }
  try {
    var mo = new MutationObserver(scheduleGate);
    function startObs(){ if(document.body){ mo.observe(document.body, { childList:true, subtree:true }); applyGates(); } }
    if(document.body) startObs(); else document.addEventListener('DOMContentLoaded', startObs);
  } catch(e){}

  window.TKS_ACCESS = { can: can, applyGates: applyGates, confirmDanger: confirmDanger, toast: toast };
})();
