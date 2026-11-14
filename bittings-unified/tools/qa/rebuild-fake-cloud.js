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
  ['in','is','gte','lte','lt','or','not','ilike','match'].forEach(function(m){ Q.prototype[m]=function(){ return this; }; });
  Q.prototype.range=function(a,b){ this.rng=[a,b]; return this; };
  Q.prototype.maybeSingle=function(){ this.one=true; return this; };
  Q.prototype.insert=function(row){ this.mode='insert'; this.row=row; return this; };
  Q.prototype.update=function(row){ this.mode='update'; this.row=row; return this; };
  Q.prototype.delete=function(){ this.mode='delete'; return this; };
  Q.prototype.upsert=function(row){ this.mode='upsert'; this.row=row; return this; };
  Q.prototype.run=function(){
    var d=db(), rows=d[this.t]||[], self=this, pass=function(r){ return self.f.every(function(fn){ return fn(r); }); };
    window.__net.push(this.mode+' '+this.raw+(this.mode==='update'?(' '+Object.keys(this.row||{}).join(',')):''));
    if(this.t==='staff'){ var me={ role: localStorage.getItem('__role')||'owner', active:true, user_id:UID, name:'TEST Owner' };
      var team=null; try{ team=JSON.parse(localStorage.getItem('__staff')||'null'); }catch(e){}   // a test may set __staff = the whole team (home vans and all)
      if(team && team.length){ me=team.filter(function(x){ return x.user_id===UID; })[0]||me; return { data: this.one?me:JSON.parse(JSON.stringify(team)), error:null }; }
      return { data: this.one?me:[me], error:null }; }
    if(this.mode==='select'){ var k=this.ord||'id', out=rows.filter(pass).sort(function(a,b){ return String(a[k])<String(b[k])?-1:1; }); if(this.desc) out.reverse(); if(this.rng) out=out.slice(this.rng[0], this.rng[1]+1); if(this.lim) out=out.slice(0,this.lim); return { data: this.one?(out[0]||null):JSON.parse(JSON.stringify(out)), error:null }; }
    if(this.mode==='insert'||this.mode==='upsert'){ var outR=[];   // one row, or a list of rows (the real library takes both)
      (Array.isArray(this.row)?this.row:[this.row]).forEach(function(row0){ var r=Object.assign({}, row0); if(!r.id) r.id='00000000-0000-4000-8000-'+String(1000000000000+rows.length).slice(1); r.updated_at=new Date().toISOString(); var ix=rows.findIndex(function(x){ return x.id===r.id; }); if(ix>=0) rows[ix]=Object.assign(rows[ix], r); else rows.push(r); outR.push(r); });
      d[this.t]=rows; save(d); return { data:outR, error:null }; }
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
      var v=null; if(name==='mfa_pending') v=false; if(name==='shop_tier') v=localStorage.getItem('__tier')||'pro'; if(name==='seat_usage') v=[{used:2,allowed:5}];
      if(name==='billing_state'){ try{ v=JSON.parse(localStorage.getItem('__bill')||'null'); }catch(e){ v=null; } }   // 8z136: a test sets __tier / __bill to play a shop's billing state
      // 8z148: key hand-overs (8z120), played simply — a key sent to a van waits in unit_transfers until it is accepted
      if(/^unit_(send|accept|set_bin|transfer_cancel|transfers_pending)$/.test(name)){ var ud=db(), team2=[]; try{ team2=JSON.parse(localStorage.getItem('__staff')||'[]')||[]; }catch(e){}
        var meS=team2.filter(function(x){ return x.user_id===UID; })[0]||{}, namesFor=function(loc){ return team2.filter(function(x){ return x.home_van_id && ('van:'+x.home_van_id)===loc; }).map(function(x){ return x.name; }); };
        var vanNm=function(loc){ var vv=(ud.vans||[]).filter(function(x){ return ('van:'+x.id)===loc; })[0]; return vv?(vv.nickname||'Van'):'the van'; };
        ud.unit_transfers=ud.unit_transfers||[]; var un=(ud.inventory_units||[]).filter(function(x){ return x.id===(args||{}).p_unit; })[0];
        var bumpLoc=function(item, loc, by){ ud.inventory_locations=ud.inventory_locations||[]; var row=ud.inventory_locations.filter(function(x){ return x.item_id===item && x.location===loc; })[0]; if(!row){ row={ id:'il'+Date.now()+Math.random(), item_id:item, location:loc, qty:0 }; ud.inventory_locations.push(row); } row.qty=(row.qty||0)+by; };
        if(name==='unit_transfers_pending'){ var rows2=ud.unit_transfers.map(function(t){ var u2=(ud.inventory_units||[]).filter(function(x){ return x.id===t.unit_id; })[0]||{}, it=(ud.inventory||[]).filter(function(x){ return x.id===t.item_id; })[0]||{};
            return { unit_id:t.unit_id, serial:u2.serial, item_id:t.item_id, item_name:it.name, sku:it.sku, from:t.from, to:t.to, van_name:vanNm(t.to), sent_by_name:'TEST Owner', sent_at:t.sent_at, for_names:namesFor(t.to) }; });
          v={ mine: rows2.filter(function(r2){ return meS.home_van_id && r2.to===('van:'+meS.home_van_id); }), sent: rows2 }; }
        else if(!un){ return later({ data:null, error:{ message:'No key with that serial in this shop.' } }); }
        else if(name==='unit_send'){ if(un.location===args.p_to) v={ ok:false, code:'same_place', error:'This key is already there.' };
          else if(String(args.p_to).indexOf('van:')===0){ ud.unit_transfers=ud.unit_transfers.filter(function(t){ return t.unit_id!==un.id; }); ud.unit_transfers.push({ unit_id:un.id, item_id:un.item_id, from:un.location, to:args.p_to, sent_at:new Date().toISOString() }); v={ ok:true, pending:true, to:args.p_to, van_name:vanNm(args.p_to), for_names:namesFor(args.p_to) }; }
          else { bumpLoc(un.item_id, un.location, -1); bumpLoc(un.item_id, args.p_to, 1); un.location=args.p_to; v={ ok:true, pending:false, to:args.p_to }; } }
        else if(name==='unit_accept'){ var tr=ud.unit_transfers.filter(function(t){ return t.unit_id===un.id; })[0]; if(!tr) return later({ data:null, error:{ message:'This key is not waiting to be scanned in.' } });
          bumpLoc(un.item_id, un.location, -1); bumpLoc(un.item_id, tr.to, 1); un.location=tr.to; ud.unit_transfers=ud.unit_transfers.filter(function(t){ return t.unit_id!==un.id; }); v={ ok:true, to:tr.to, van_name:vanNm(tr.to), item_id:un.item_id, serial:un.serial, bin:'' }; }
        else if(name==='unit_transfer_cancel'){ ud.unit_transfers=ud.unit_transfers.filter(function(t){ return t.unit_id!==un.id; }); v={ ok:true }; }
        else if(name==='unit_set_bin'){ un.bin=String(args.p_bin||''); v={ ok:true, bin:un.bin }; }
        save(ud); }
      if(name==='key_failed'){ var kd=db(), ku=(kd.inventory_units||[]).filter(function(x){ return x.id===(args||{}).p_unit && x.status==='in_stock'; })[0];   // 8z151: one exact key marked failed
        if(!ku) return later({ data:null, error:{ message:'no in-stock unit of that item to mark failed' } });
        ku.status='failed'; ku.disposition=String(args.p_reason||'failed'); (kd.inventory_locations||[]).forEach(function(x){ if(x.item_id===ku.item_id && x.location===ku.location) x.qty=Math.max(0,(x.qty||0)-1); }); save(kd); v={ failed_unit:ku.id }; }
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
