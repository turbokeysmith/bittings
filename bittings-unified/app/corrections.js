/* ==========================================================================
   Corrections — one running log of "this data is wrong / here's what actually
   worked", shared across the whole app. Used inline under each VEHICLE (Start a
   job + Lishi) and each PROGRAMMER (Coverage), instead of a separate tab.

   Store: localStorage 'tks_corrections' = [{ id, scope, ref, refLabel, text,
   by, ts, resolved }]. Same-origin, so every page/tool sees the same log.

   API (window.TKS_CORR):
     .all()                       -> all corrections, newest first
     .forRef(ref)                 -> corrections whose ref matches (case-insensitive)
     .add({scope,ref,refLabel,text,by})
     .remove(id)
     .resolve(id)                 -> toggle a correction's "resolved" flag
     .mountBox(el, {scope,ref,refLabel,by})
         renders a self-contained "⚠ Report a correction" widget into `el`,
         scoped to one ref. Theme-agnostic (translucent surfaces, inherits text
         colour) so it reads correctly in light AND dark on any page.
   ========================================================================== */
(function(){
  var KEY = 'tks_corrections';

  function read(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]') || []; }catch(e){ return []; } }
  function write(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
  function uid(){ return 'cx' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-3); }
  function norm(s){ return String(s==null?'':s).toLowerCase().replace(/\s+/g,' ').trim(); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]; }); }

  function whoami(){
    try{ if(window.TKS && TKS.auth && TKS.auth.isSignedIn && TKS.auth.isSignedIn()) return TKS.auth.email()||''; }catch(e){}
    return '';
  }

  var API = {
    all: function(){ return read(); },
    forRef: function(ref){ var r=norm(ref); return read().filter(function(c){ return norm(c.ref)===r; }); },
    add: function(o){
      o = o||{};
      var a = read();
      var rec = { id:uid(), scope:o.scope||'', ref:o.ref||'', refLabel:o.refLabel||o.ref||'',
                  text:o.text||'', by:(o.by!=null?o.by:whoami()), ts:Date.now(), resolved:false };
      a.unshift(rec); write(a); return rec;
    },
    remove: function(id){ write(read().filter(function(c){ return c.id!==id; })); },
    resolve: function(id){ var a=read(); for(var i=0;i<a.length;i++){ if(a[i].id===id){ a[i].resolved=!a[i].resolved; break; } } write(a); }
  };

  // ---- one-time CSS (theme-agnostic) ----------------------------------------
  function ensureCss(){
    if(document.getElementById('tkcorr-css')) return;
    var st = document.createElement('style'); st.id = 'tkcorr-css';
    st.textContent = [
      '.tkcorr{margin-top:10px;font-size:13px;}',
      '.tkcorr-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;background:rgba(216,138,0,.12);',
        'border:1px solid rgba(216,138,0,.45);color:#c8323c;border-radius:8px;padding:6px 11px;font-weight:700;',
        'font-size:12.5px;font-family:inherit;-webkit-tap-highlight-color:transparent;}',
      '.tkcorr-toggle:hover{background:rgba(216,138,0,.2);}',
      '.tkcorr-toggle .tkcorr-n{background:#c8323c;color:#fff;border-radius:999px;padding:0 6px;font-size:11px;min-width:16px;text-align:center;}',
      '.tkcorr-body{margin-top:8px;}',
      '.tkcorr-text{width:100%;box-sizing:border-box;min-height:54px;resize:vertical;border-radius:8px;',
        'border:1px solid rgba(128,128,128,.4);background:rgba(128,128,128,.08);color:inherit;font:inherit;font-size:13px;padding:8px 10px;outline:none;}',
      '.tkcorr-text::placeholder{color:rgba(128,128,128,.85);}',
      '.tkcorr-actions{display:flex;gap:8px;margin-top:7px;flex-wrap:wrap;}',
      '.tkcorr-add{cursor:pointer;background:#c8323c;border:none;color:#fff;border-radius:8px;padding:7px 14px;font-weight:800;font-size:12.5px;font-family:inherit;}',
      '.tkcorr-add:active{transform:scale(.97);}',
      '.tkcorr-list{margin-top:9px;display:flex;flex-direction:column;gap:6px;}',
      '.tkcorr-item{border:1px solid rgba(128,128,128,.28);border-radius:8px;padding:7px 9px;background:rgba(128,128,128,.06);line-height:1.4;}',
      '.tkcorr-item.done{opacity:.55;}',
      '.tkcorr-item.done .tkcorr-itext{text-decoration:line-through;}',
      '.tkcorr-meta{margin-top:4px;font-size:11px;color:rgba(128,128,128,.95);display:flex;gap:10px;flex-wrap:wrap;}',
      '.tkcorr-meta a{cursor:pointer;text-decoration:underline;color:inherit;}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
  }

  API.mountBox = function(el, opts){
    if(!el) return;
    opts = opts||{};
    ensureCss();
    var ref = opts.ref||'', refLabel = opts.refLabel||ref, scope = opts.scope||'';

    function render(open){
      var items = API.forRef(ref);
      el.innerHTML =
        '<div class="tkcorr">'
        + '<button type="button" class="tkcorr-toggle">⚠ Something wrong?'
        +   (items.length ? '<span class="tkcorr-n">'+items.length+'</span>' : '')
        + '</button>'
        + '<div class="tkcorr-body" style="display:'+(open?'block':'none')+'">'
        +   '<textarea class="tkcorr-text" placeholder="What’s wrong, or what actually worked? e.g. &quot;code series is 80000 not 40000&quot; · &quot;HU101 keyway, not HU100&quot;"></textarea>'
        +   '<div class="tkcorr-actions"><button type="button" class="tkcorr-add">Add correction</button></div>'
        +   (items.length ? '<div class="tkcorr-list">' + items.map(function(c){
              return '<div class="tkcorr-item'+(c.resolved?' done':'')+'">'
                + '<div class="tkcorr-itext">'+esc(c.text)+'</div>'
                + '<div class="tkcorr-meta">'
                +   '<span>'+new Date(c.ts).toLocaleDateString()+(c.by?(' · '+esc(c.by)):'')+'</span>'
                +   '<a data-cx-resolve="'+c.id+'">'+(c.resolved?'reopen':'mark fixed')+'</a>'
                +   '<a data-cx-del="'+c.id+'">remove</a>'
                + '</div></div>';
            }).join('') + '</div>' : '')
        + '</div></div>';

      var toggle = el.querySelector('.tkcorr-toggle');
      var body   = el.querySelector('.tkcorr-body');
      toggle.addEventListener('click', function(){
        var showing = body.style.display!=='none';
        body.style.display = showing ? 'none' : 'block';
        if(!showing){ var ta=el.querySelector('.tkcorr-text'); if(ta) ta.focus(); }
      });
      var addBtn = el.querySelector('.tkcorr-add');
      if(addBtn) addBtn.addEventListener('click', function(){
        var ta = el.querySelector('.tkcorr-text'); var t = ta ? ta.value.trim() : '';
        if(!t) return;
        API.add({ scope:scope, ref:ref, refLabel:refLabel, text:t });
        render(true);
      });
      el.querySelectorAll('[data-cx-del]').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); API.remove(a.getAttribute('data-cx-del')); render(true); }); });
      el.querySelectorAll('[data-cx-resolve]').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); API.resolve(a.getAttribute('data-cx-resolve')); render(true); }); });
    }
    render(false);
  };

  window.TKS_CORR = API;
})();
