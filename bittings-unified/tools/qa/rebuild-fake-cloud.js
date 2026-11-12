// Stand-in for the Supabase library, served in place of app/vendor/supabase-js-2.119.0.js by the tests.
// Tables live in localStorage.__db so they survive a reload, like a server. Nothing leaves the PC.
(function(){
  var DELAY = 60, UID = '11111111-2222-4333-8444-555555555555';
  function db(){ try{ return JSON.parse(localStorage.getItem('__db')||'null') || {}; }catch(e){ return {}; } }
  function save(d){ localStorage.setItem('__db', JSON.stringify(d)); }
  var VIEW = { inventory_safe:'inventory', receipts_safe:'receipts' };
  window.__net = []; window.__calls = [];
  function Q(table){ this.t = VIEW[table]||table; this.raw=table; this.mode='select'; this.f=[]; this.rng=null; this.lim=null; this.desc=null; }
  Q.prototype.select=function(){ return this; };
  Q.prototype.eq=function(k,v){ this.f.push(function(r){ return r[k]===v; }); return this; };
  Q.prototype.neq=function(k,v){ this.f.push(function(r){ return r[k]!==v; }); return this; };
  Q.prototype.gt=function(k,v){ this.f.push(function(r){ return String(r[k]||'')>String(v); }); return this; };
  Q.prototype.order=function(k,o){ this.ord=k; this.desc=!!(o&&o.ascending===false); return this; };
  Q.prototype.limit=function(n){ this.lim=n; return this; };
  ['in','is','gte','lte','or','not','ilike','match'].forEach(function(m){ Q.prototype[m]=function(){ return this; }; });
  Q.prototype.range=function(a,b){ this.rng=[a,b]; return this; };
  Q.prototype.maybeSingle=function(){ this.one=true; return this; };
  Q.prototype.insert=function(row){ this.mode='insert'; this.row=row; return this; };
  Q.prototype.update=function(row){ this.mode='update'; this.row=row; return this; };
  Q.prototype.delete=function(){ this.mode='delete'; return this; };
  Q.prototype.upsert=function(row){ this.mode='upsert'; this.row=row; return this; };
  Q.prototype.run=function(){
    var d=db(), rows=d[this.t]||[], self=this, pass=function(r){ return self.f.every(function(fn){ return fn(r); }); };
    window.__net.push(this.mode+' '+this.raw+(this.mode==='update'?(' '+Object.keys(this.row||{}).join(',')):''));
    if(this.t==='staff'){ var me={ role: localStorage.getItem('__role')||'owner', active:true, user_id:UID, name:'TEST Owner' }; return { data: this.one?me:[me], error:null }; }
    if(this.mode==='select'){ var k=this.ord||'id', out=rows.filter(pass).sort(function(a,b){ return String(a[k])<String(b[k])?-1:1; }); if(this.desc) out.reverse(); if(this.rng) out=out.slice(this.rng[0], this.rng[1]+1); if(this.lim) out=out.slice(0,this.lim); return { data: this.one?(out[0]||null):JSON.parse(JSON.stringify(out)), error:null }; }
    if(this.mode==='insert'||this.mode==='upsert'){ var r=Object.assign({}, this.row); if(!r.id) r.id='00000000-0000-4000-8000-'+String(1000000000000+rows.length).slice(1); r.updated_at=new Date().toISOString(); var ix=rows.findIndex(function(x){ return x.id===r.id; }); if(ix>=0) rows[ix]=Object.assign(rows[ix], r); else rows.push(r); d[this.t]=rows; save(d); return { data:[r], error:null }; }
    if(this.mode==='update'){ rows.forEach(function(x){ if(pass(x)){ Object.assign(x, self.row); } }); d[this.t]=rows; save(d); return { data:null, error:null }; }
    if(this.mode==='delete'){ var gone=rows.filter(pass); d[this.t]=rows.filter(function(x){ return !pass(x); }); save(d); return { data:gone, error:null }; }
    return { data:null, error:null };
  };
  Q.prototype.then=function(ok,bad){ var self=this; return new Promise(function(res){ setTimeout(function(){ res(self.run()); }, DELAY); }).then(ok,bad); };
  var user={ id:UID, email:'samer@turbokeysmith.com', user_metadata:{ password_set:true } };
  function later(v){ return new Promise(function(r){ setTimeout(function(){ r(v); }, DELAY); }); }
  var realFetch = window.fetch;
  window.fetch = function(url, opt){
    if(/\/functions\/v1\//.test(String(url))){ window.__calls.push('fn '+String(url).split('/functions/v1/')[1]); return Promise.resolve(new Response('{}', { status:200, headers:{'content-type':'application/json'} })); }
    return realFetch.apply(this, arguments);
  };
  window.supabase = { createClient: function(){ return {
    from: function(t){ return new Q(t); },
    rpc: function(name, args){ window.__calls.push('rpc '+name);
      var v=null; if(name==='mfa_pending') v=false; if(name==='shop_tier') v='pro'; if(name==='seat_usage') v=[{used:2,allowed:5}];
      if(name==='log_activity'){ var d=db(); d.audit_log=(d.audit_log||[]).concat([{ id:'a'+Date.now()+Math.random(), user_id:UID, role:'owner', action:args.p_action, entity_type:args.p_entity_type, entity_id:args.p_entity_id, detail:args.p_detail, created_at:new Date().toISOString() }]); save(d); }
      return later({ data:v, error:null }); },
    functions: { invoke: function(){ return later({ data:null, error:null }); } },
    storage: { from: function(){ return { getPublicUrl: function(){ return { data:{ publicUrl:'' } }; }, createSignedUrl: function(){ return later({ data:null, error:null }); } }; } },
    auth: { getSession: function(){ return Promise.resolve({ data:{ session:{ user:user, access_token:'x' } } }); },
            getUser: function(){ return later({ data:{ user:user } }); },
            onAuthStateChange: function(cb){ setTimeout(function(){ cb('INITIAL_SESSION', { user:user }); }, 0); return { data:{ subscription:{ unsubscribe:function(){} } } }; },
            mfa: { getAuthenticatorAssuranceLevel: function(){ return later({ data:{ currentLevel:'aal1', nextLevel:'aal1' } }); }, listFactors: function(){ return later({ data:{ totp:[] } }); } },
            signOut: function(){ return Promise.resolve(); } } }; } };
})();
