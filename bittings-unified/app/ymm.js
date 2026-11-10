/* ============================================================================
   Shared Year / Make / Model helper — ONE source of truth for every
   vehicle-entry screen (Start-a-Job, Scheduler, Receipts/Bittings, Lishi).
   ----------------------------------------------------------------------------
   Goals (identical everywhere):
     • Year / Make / Model are real <select> dropdowns.
     • Cascade: Year resets Make + Model; Make resets Model.
     • VIN decode still auto-fills: a decoded value is injected as an <option>
       (and selected) even when it isn't in the catalog, so nothing is lost.
   Pages build their <select> option strings from these helpers, so a fix here
   reaches all screens at once.
   ========================================================================== */
(function () {
  // Canonical make list (kept in sync across all screens).
  // 8x: every US make 1995–2026 (models come from app/ymm-catalog.js — NHTSA vPIC — merged into TKS_LISHI_SEED.models)
  var MAKES = ['Acura','Alfa Romeo','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Fiat','Ford','Genesis','GMC','Honda','Hummer','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Land Rover','Lexus','Lincoln','Lucid','Maserati','Mazda','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Oldsmobile','Plymouth','Polestar','Pontiac','Porsche','Ram','Rivian','Saab','Saturn','Scion','smart','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo'];

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); }
  function ls(k){ try{ var v=localStorage.getItem(k); return v?JSON.parse(v):[]; }catch(e){ return []; } }
  function yMatch(r,y){ y=Number(y); if(!y) return true; var a=Number(r.year_start)||0, b=Number(r.year_end)||9999; return y>=a && y<=b; }

  // Model names for a make (+ optional year), from the Lishi seed catalog and any
  // saved vehicle data. Year-filtered when a year is supplied.
  function modelList(make, year){
    var mk=(make||'').trim(); if(!mk) return [];
    var yr=Number(year)||0, seen={}, out=[];
    function add(n){ n=(n||'').trim(); if(!n) return; var k=n.toLowerCase(); if(seen[k]) return; seen[k]=1; out.push(n); }
    try{ var cat=(window.TKS_LISHI_SEED && TKS_LISHI_SEED.models) || {};
      var key=Object.keys(cat).filter(function(k){ return k.toLowerCase()===mk.toLowerCase(); })[0];
      (key?cat[key]:[]).forEach(function(r){ var a=Number(r[1])||0, b=Number(r[2])||9999; if(!yr||(yr>=a&&yr<=b)) add(r[0]); });
    }catch(e){}
    try{ ls('tks_vehicle_keyways').forEach(function(r){ if(r.make && r.make.toLowerCase()===mk.toLowerCase() && (!yr||yMatch(r,yr))) add(r.model); }); }catch(e){}
    out.sort(function(a,b){ return a.localeCompare(b); });
    return out;
  }

  // Build <option> HTML, selecting `cur`. If `cur` is set but not in the list
  // (e.g. a VIN-decoded value), it's appended as a selected option so it sticks.
  function optionsHTML(items, cur, placeholder){
    var c=(cur==null?'':String(cur)), cl=c.toLowerCase(), found=false;
    var html='<option value="">'+esc(placeholder||'—')+'</option>';
    items.forEach(function(it){ var v=String(it), sel=(c && v.toLowerCase()===cl); if(sel) found=true;
      html+='<option'+(sel?' selected':'')+'>'+esc(v)+'</option>'; });
    if(c && !found) html+='<option selected>'+esc(c)+'</option>';
    return html;
  }

  window.TKS_YMM = {
    MAKES: MAKES,
    modelList: modelList,
    // <select> option strings for each box, each honoring a current value.
    yearOptionsHTML: function(cur, lo){
      var hi=2026, low=lo||1995, items=[]; for(var y=hi;y>=low;y--) items.push(String(y));
      if(cur && items.indexOf(String(cur))<0) items.unshift(String(cur));
      return optionsHTML(items, cur, 'Year…');
    },
    makeOptionsHTML: function(cur){ return optionsHTML(MAKES, cur, 'Make…'); },
    modelOptionsHTML: function(make, year, cur){
      if(!(make||'').trim()) return '<option value="">Model — pick a make</option>';
      return optionsHTML(modelList(make, year), cur, 'Model…');
    }
  };
})();
