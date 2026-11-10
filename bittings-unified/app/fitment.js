/* ============================================================================
   TKS_FIT — vehicle fitment for inventory keys / remotes (2026-11-08).
   ----------------------------------------------------------------------------
   The owner types (or pastes from the distributor) a free-text "Fits" list:
       2018-2021 enclave 2020-2021 encore 2018-2020 regal
       Buick Enclave 2018-2021, Encore 2020-2021 · FCC HYQ4EA
   and the app turns it into vehicle entries {ys, ye, make, model}, inferring the
   make from the model name (Enclave → Buick) via the Lishi/Ilco model catalog
   (TKS_LISHI_SEED.models) and any saved vehicle keyway rows. Any year/make/model
   lookup — Inventory finder, Register "Add a part", Start-a-job, invoice part
   picker, or just typing "2019 enclave" in the Inventory search — then finds every
   key whose list covers that vehicle. The text itself is still what is stored
   (inventory.fitment); nothing is parsed server-side.

   API (all synchronous, no DOM):
     TKS_FIT.parse(text)            → [{ys, ye, make, model, raw, resolved}]
     TKS_FIT.parseQuery(q)          → {year, make, model, resolved} or null
     TKS_FIT.itemFits(item, veh)    → true when item.fitment covers {year, make, model}
     TKS_FIT.filter(items, veh)     → items that fit (exact-model hits first)
     TKS_FIT.label(entry)           → "2018–2021 Buick Enclave"
     TKS_FIT.summary(text)          → "2018–2021 Buick Enclave · 2020–2021 Buick Encore"
     TKS_FIT.canonMake(s)           → "Chevrolet" for "chevy" / "CHEVROLET", '' if unknown
   Works in the browser (window.TKS_FIT) and in node (module.exports) for tests.
   ========================================================================== */
(function (root) {
  var MAKES = ['Acura','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ford','GMC','Genesis','Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Land Rover','Lexus','Lincoln','Mazda','Mercedes-Benz','MINI','Mitsubishi','Nissan','Pontiac','Ram','Saturn','Scion','Subaru','Suzuki','Toyota','Volkswagen','Volvo',
               'Fiat','Alfa Romeo','Tesla','Porsche','Hummer','Oldsmobile','Mercury','Isuzu','Smart','Rivian','Polestar','Plymouth','Saab','Lucid','Maserati'];
  var ALIAS = { chevy:'Chevrolet', chev:'Chevrolet', vw:'Volkswagen', volkswagon:'Volkswagen', mercedes:'Mercedes-Benz', benz:'Mercedes-Benz', mb:'Mercedes-Benz',
                landrover:'Land Rover', 'land rover':'Land Rover', 'range rover':'Land Rover', mini:'MINI', 'mini cooper':'MINI', 'alfa':'Alfa Romeo', 'alfa romeo':'Alfa Romeo',
                olds:'Oldsmobile', 'mercedes benz':'Mercedes-Benz', 'mercedes-benz':'Mercedes-Benz', gm:'GM', 'general motors':'GM', mopar:'Chrysler' };
  // Brand groups: a 'GM' entry covers every GM make (a "GM 10-19" key fits Chevy/GMC/Buick/Cadillac lookups)
  var GROUP={ GM:{ Chevrolet:1, GMC:1, Buick:1, Cadillac:1, Pontiac:1, Saturn:1, Oldsmobile:1, Hummer:1 } };
  // words that are never part of a model name (distributor noise: "FCC ID HYQ4EA", "smart key w/ remote start")
  var STOP = { fcc:1, fccid:1, id:1, 'fcc id':1, pn:1, 'p/n':1, oem:1, 'w/':1, 'w/o':1, with:1, without:1, smart:1, key:1, keys:1, remote:1, fob:1, fobik:1, blank:1, only:1,
               for:1, fits:1, and:1, '&':1, the:1, prox:1, proximity:1, transponder:1, chip:1, button:1, buttons:1, btn:1, bt:1, 'remote start':1, start:1, hatch:1, hatc:1,
               trunk:1, trnk:1, flip:1, head:1, shell:1, case:1, cover:1, all:1, models:1, model:1, series:1, am:1, ref:1, refurb:1, px:1, pt:1, rs:1, rmt:1, sk:1, rhk:1,
               smrt:1, smr:1, prx:1, peps:1, air:1, tail:1, super:1, spr:1, chrome:1, black:1, reusable:1, programmable:1, universal:1, wired:1, 'e-brd':1, strat:1, strattec:1,
               '2dr':1, '4dr':1, dr:1, door:1, sedan:1, coupe:1, hatchback:1, wagon:1, truck:1, trucks:1, pickup:1, van:1, suv:1, suvs:1, hybrid:1, ev:1, awd:1, '4wd':1, '2wd':1,
               '3-button':1, '4-button':1, '5-button':1, '6-button':1, '7-button':1, '5-b':1, '4-b':1, '3-bt':1, '2nd-ge':1, '2nd-gen':1, 'g-chip':1, 'h-chip':1, 'd-chip':1, 'g-board':1 };

  function norm(s){ return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]+/g,''); }
  function titleCase(s){ return String(s||'').replace(/\S+/g, function(w){ return w.length<=3 && w===w.toUpperCase() ? w : (w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()); }); }

  function canonMake(s){
    var k=String(s||'').trim().toLowerCase().replace(/\.$/,''); if(!k) return '';
    if(ALIAS.hasOwnProperty(k)) return ALIAS[k];
    var kn=norm(k);
    for(var i=0;i<MAKES.length;i++){ if(norm(MAKES[i])===kn) return MAKES[i]; }
    return '';
  }

  // ---- model catalog: make → [{name, n(normalized), ys, ye}] (built lazily, refreshed when sources change) ----
  var _cat=null, _catKey='';
  function catalog(){
    var seed=null, kw=null;
    try{ seed=(root.TKS_LISHI_SEED && root.TKS_LISHI_SEED.models) || null; }catch(e){}
    try{ if(root.localStorage){ var v=root.localStorage.getItem('tks_vehicle_keyways'); kw=v?JSON.parse(v):null; } }catch(e){}
    var key=(seed?Object.keys(seed).length:0)+':'+(kw?kw.length:0);
    if(_cat && key===_catKey) return _cat;
    var cat={};
    function add(make, name, ys, ye){ make=canonMake(make)||String(make||'').trim(); name=String(name||'').trim(); if(!make||!name) return;
      var list=cat[make]||(cat[make]=[]); var n=norm(name); if(!n) return;
      for(var i=0;i<list.length;i++){ if(list[i].n===n) return; }
      list.push({name:name, n:n, ys:Number(ys)||0, ye:Number(ye)||9999}); }
    if(seed){ Object.keys(seed).forEach(function(mk){ (seed[mk]||[]).forEach(function(r){ add(mk, r[0], r[1], r[2]); }); }); }
    if(kw && kw.length){ kw.forEach(function(r){ if(r && r.make && r.model) add(r.make, r.model, r.year_start, r.year_end); }); }
    // longest names first so "Silverado 1500" wins over "Silverado"
    Object.keys(cat).forEach(function(mk){ cat[mk].sort(function(a,b){ return b.n.length-a.n.length; }); });
    _cat=cat; _catKey=key; return cat;
  }

  // Does `n` (normalized words joined) start with catalog model `m.n`? Word-boundary aware via the raw words.
  function wordsStartWith(words, modelName){
    var mn=norm(modelName), acc='';
    for(var i=0;i<words.length;i++){ acc+=norm(words[i]); if(acc===mn) return i+1; if(acc.length>=mn.length) return 0; }
    return 0;
  }
  // Find the best catalog model among `words` (which start right after the make). Returns {name, used} or null.
  function matchModel(make, words){
    if(GROUP[make]){ var best=null; Object.keys(GROUP[make]).forEach(function(mk){ var r=matchModel(mk, words); if(r && (!best || r.used>best.used)) best={name:r.name, used:r.used, make:mk}; }); return best; }
    var list=catalog()[make]||[];
    for(var i=0;i<list.length;i++){ var used=wordsStartWith(words, list[i].name); if(used) return {name:list[i].name, used:used}; }
    return null;
  }
  function inferMake(words, prefer){
    var cat=catalog(), hits=[];
    Object.keys(cat).forEach(function(mk){ var m=matchModel(mk, words); if(m) hits.push({make:mk, name:m.name, used:m.used}); });
    if(!hits.length) return null;
    if(prefer){ for(var i=0;i<hits.length;i++){ if(hits[i].make===prefer) return hits[i]; } }
    hits.sort(function(a,b){ return b.used-a.used; });
    return hits[0];
  }

  // ---- tokenizer ----
  var RANGE=/^(19\d{2}|20\d{2})\s*(?:-|–|—|to|thru|through|\/)\s*((?:19|20)?\d{2})(?:\+)?$/i;   // 2018-2021, 2018–21, 2018 to 2021
  var YEAR=/^(19\d{2}|20\d{2})(\+|up)?$/i;                                                     // 2019, 2018+, 2018up
  var RANGE2=/^(\d{2})-(\d{2})\+?$/;                                                           // distributor shorthand: 08-14, 17-20
  var YEAR2=/^(\d{2})\+$/;                                                                     // 16+
  var NOW=(new Date()).getFullYear()+2;
  function y2(n){ n=+n; return (2000+n<=NOW) ? 2000+n : 1900+n; }                             // 08 → 2008, 98 → 1998
  function tokenize(text){
    var t=String(text||'').replace(/\([^)]*\)/g,' ')          // drop parentheticals
      .replace(/\([^)]*$/,' ')                                  // …and a truncated "(HYQ12BBY," with no closing paren
      .replace(/(\d)\s*(?:-|–|—)\s*(\d)/g,'$1-$2')              // tighten "2018 - 2021" → "2018-2021"
      .replace(/([A-Za-z])(\d{2}-\d{2}|\d{4}-\d{2,4})\b/g,'$1 $2') // "ROGUE14-19", "MAXMA13-15" → split model from years
      .replace(/\b(\d{2}-\d{2}|\d{4}-\d{2,4})([A-Za-z])/g,'$1 $2')
      .replace(/\b(\d{3,4})(\d{2}-\d{2})\b/g,'$1 $2')              // "150019-24" → "1500 19-24"
      .replace(/([A-Za-z])-(\d{2}-\d{2}|\d{4}-\d{2,4})\b/g,'$1 $2')  // "Traverse-18-20" → "Traverse 18-20"
      .replace(/\b([A-Za-z]{2,4}\d[A-Za-z0-9-]*)\/([A-Za-z]{2,3})\b/g,'$1$2')   // "HYQ1EA/ES", "HYQ14FBA/FBB" = one code, not a model list
      .replace(/([A-Za-z0-9])\/([A-Za-z0-9])/g,'$1 / $2')       // "CAMARO/CRUZE/MALIBU" → separate model words
      .replace(/\/(?=\s|$)/g,' ')                                // dangling "12-13/" → "12-13"
      .replace(/\b(\d{4})\s+(?:to|thru|through)\s+(\d{2,4})\b/ig,'$1-$2')   // "2015 to 2020"
      .replace(/\b(\d{4})\s*-\s*(up|present|current|now)\b/ig,'$1+')
      .replace(/[\n\r]+/g,' ␞ ')   // 8y: a new line = a new vehicle line
      .replace(/[,;|•·\t]+/g,' ␟ ')                        // hard separators → marker
      .replace(/\s+-\s+/g,' ␟ ')                                // " - " between vehicles
      .replace(/:/g,' ');
    var out=[]; t.split(/\s+/).forEach(function(w){ if(!w) return;
      if(w==='␟'){ out.push({t:'sep'}); return; }
      if(w==='␞'){ out.push({t:'sep', line:true}); return; }
      var m=w.match(RANGE); if(m){ var a=+m[1], b=+m[2]; if(b<100) b=Math.floor(a/100)*100+b; if(b<a) b=a; out.push({t:'year', ys:a, ye:b, raw:w}); return; }
      m=w.match(YEAR); if(m){ out.push({t:'year', ys:+m[1], ye:(m[2]?9999:+m[1]), raw:w}); return; }
      m=w.match(RANGE2); if(m){ var a2=y2(m[1]), b2=y2(m[2]); if(b2<a2) b2=a2; out.push({t:'year', ys:a2, ye:(/\+$/.test(w)?9999:b2), raw:w}); return; }
      m=w.match(YEAR2); if(m){ out.push({t:'year', ys:y2(m[1]), ye:9999, raw:w}); return; }
      var cw=w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9\/+]+$/g,'');
      var al=ALIAS_WORD[cw.toLowerCase()];
      if(al){ al.split(' ').forEach(function(x){ out.push({t:'word', w:x}); }); return; }
      out.push({t:'word', w:cw});
    });
    return out.filter(function(x){ return x.t!=='word' || x.w; });
  }
  // Distributor shorthand seen on real invoices/labels → catalog spelling (make OR model; multi-word allowed)
  var ALIAS_WORD = { crv:'CR-V', hrv:'HR-V', acrd:'Accord', elmnt:'Element', avln:'Avalon', cam:'Camry', maxma:'Maxima', path:'Pathfinder',
    chrs:'Chrysler', chrys:'Chrysler', cdllc:'Cadillac', jep:'Jeep', jp:'Jeep', silv:'Silverado', eqnx:'Equinox', trav:'Traverse', stang:'Mustang',
    high:'Highlander', seq:'Sequoia', tun:'Tundra', rav:'RAV4', scn:'Scion', sci:'Scion', lex:'Lexus', toy:'Toyota', mcry:'Mercury', mitsbishi:'Mitsubishi',
    vlkswgn:'Volkswagen', elntra:'Elantra', rm:'Ram', prsch:'Porsche', cross:'Crosstour', '4run':'4Runner', expl:'Explorer', exped:'Expedition',
    'f-srs':'F-150 F-250 F-350', 'f-series':'F-150 F-250 F-350', fseries:'F-150 F-250 F-350', sub:'Suburban', tah:'Tahoe', trailblzr:'Trailblazer',
    hghlndr:'Highlander', cor:'Corolla', corol:'Corolla', odys:'Odyssey', pil:'Pilot', sil:'Silverado', chal:'Challenger', chlgr:'Challenger', chrgr:'Charger' };

  function stripStop(words){ return words.filter(function(w){ return !STOP[w.toLowerCase()]; }); }
  // A part-number-looking token (HYQ4EA, M3N-A2C31243300, 5WK50079): letters+digits mixed, 4+ chars. Hyphenated short
  // model names (F-150, CX-5, CR-V) are kept; catalog models (4Runner, GLC300) are matched BEFORE this filter runs.
  function codeLike(w){ var c=w.replace(/-/g,''); return /\d/.test(c) && /[a-z]/i.test(c) && c.length>=4 && !(/^[a-z]{1,2}-?\d{1,4}$/i.test(w)); }

  // Key-blank / distributor codes that ride along in a description but are not vehicles (Y160, B111, H92, HO03, HD106, TOY48…)
  var KEYBLANK=/^(Y1\d{2}|B1[0-2]\d|B9[0-9]|H\d{2,3}|HO0\d|HD\d{2,3}|HY\d{2}|KK\d{2}|MZ\d{2}|NI0\d|DA\d{2}|TOY\d{2}[A-Z0-9]*|HU\d{2,3}|PT0\d|FO\d{2}[A-Z0-9]*|TR\d{2}|X\d{3}|K-?B1\d{2})$/i;
  var JUNK={ star:1, hat:1, co:1, fo:1, sv:1, trns:1, trnpn:1, smll:1, hd:1, master:1, or:1, blds:1, refill:1, mfk:1, bm:1, ikey:1, maxiim:1, baf:1, iyz:1, rover:1, jag:1,
             vvdi:1, k:1, kd:1, aut:1, superchip:1, 'circle-plus':1, 'pk3':1, hs:1, 'h-chp':1, 'g-chp':1, chp:1, keyless:1, entry:1, metal:1, ct:1, cut:1 };
  var ALLCONS_OK={ sts:1, tsx:1, tlx:1, ilx:1, rsx:1, nsx:1, zdx:1, rlx:1, glc:1, gle:1, gls:1, cls:1, clk:1, slk:1, slc:1, xj:1, xf:1, xk:1, xe:1, crz:1, lx:1, gx:1, nx:1, rx:1, ux:1, tc:1, xb:1, xd:1 };
  function junk(w){ var l=w.toLowerCase();
    if(JUNK[l] || KEYBLANK.test(w) || codeLike(w)) return true;
    if(/^\d+$/.test(w)) return !(w.length===3 || w.length===4);                 // "3" (3 Button), "221" → junk; "500" / "1500" may be models
    var letters=w.replace(/[^a-z]/ig,'');
    if(letters.length<=3 && !/[aeiouy]/i.test(letters) && !ALLCONS_OK[l] && !/-/.test(w)) return true;   // "KE", "FO", "P", "W", "FBB"
    return false; }

  function resolve(seg, sticky){
    var words=stripStop(seg.words.slice()), ys=seg.ys||0, ye=seg.ye||(seg.ys?seg.ys:9999), raw=seg.raw.join(' ').trim();
    // 1. leading makes — any number: "Chrysler Dodge Jeep 04-19", "GMC Chevrolet Suburban Tahoe Yukon 15-20"
    var makes=[];
    while(words.length){ var two=(words[0]+' '+(words[1]||'')).trim(), c2=words.length>1?canonMake(two):'', c1=canonMake(words[0]);
      if(c2){ makes.push(c2); words=words.slice(2); } else if(c1){ makes.push(c1); words=words.slice(1); } else break; }
    var explicit=makes.length>0, out=[];
    function entry(make, model, resolved){ return { ys:ys, ye:ye, make:make, model:model, raw:raw, resolved:resolved }; }
    function makeOnly(){ makes.forEach(function(mk){ out.push(entry(mk, '', true)); }); }
    // 2. nothing after the make(s) → make-only entries (a make + year lookup still finds them)
    if(!words.length){ if(explicit) makeOnly(); return out; }
    // 3. consume model groups left to right; each catalog hit is its own entry, unknown words become
    //    unresolved entries under the current make, junk/codes are skipped
    var cur=words.slice(), guard=0, lastMake=explicit?makes[0]:(sticky||'');
    while(cur.length && guard++<16){
      var hit=null;
      if(explicit){ for(var i=0;i<makes.length && !hit;i++){ var mm=matchModel(makes[i], cur); if(mm) hit={make:mm.make||makes[i], name:mm.name, used:mm.used}; } }
      else hit=inferMake(cur, lastMake);
      if(hit){ out.push(entry(hit.make, hit.name, true)); lastMake=hit.make; cur=cur.slice(hit.used); continue; }
      var w=cur.shift(), wmk=canonMake(w);
      if(wmk){ makes=[wmk]; explicit=true; lastMake=wmk; continue; }
      if(junk(w)) continue;
      if(/^\d+$/.test(w) && !explicit) continue;                                // a bare "500" only counts right after a make
      out.push(entry(lastMake, /^[a-z]{1,2}-?\d/i.test(w)?w.toUpperCase():titleCase(w), false));
    }
    if(!out.length && explicit) makeOnly();                                      // model words were all junk → make-only
    return out;
  }

  var _cache={}, _cacheN=0;
  function parse(text){
    text=String(text||'').trim(); if(!text) return [];
    if(_cache.hasOwnProperty(text)) return _cache[text];
    var toks=tokenize(text), segs=[], cur=null, lineNo=0;
    function open(){ cur={words:[], ys:0, ye:0, yearPos:'', raw:[], line:lineNo}; }
    function close(){ if(cur && (cur.words.length||cur.ys)) segs.push(cur); cur=null; }
    open();
    toks.forEach(function(tk){
      if(tk.t==='sep'){ close(); if(tk.line) lineNo++; open(); return; }
      if(tk.t==='year'){ if(cur.ys){ close(); open(); } cur.ys=tk.ys; cur.ye=tk.ye; cur.yearPos=cur.words.length?'after':'before'; cur.raw.push(tk.raw); return; }
      if(cur.yearPos==='after'){ close(); open(); }
      cur.words.push(tk.w); cur.raw.push(tk.w);
    });
    close();
    // 8y: a segment with no years of its own shares the years of its group. Years-first lists ("2005-2008 Dodge Magnum,
    // Charger") carry forward; years-after lists ("Camaro, Cruze, Malibu 2016-2020") fill backward. A make-only line or a
    // list with no years anywhere is left alone (fits any year, as before). A segment that starts with its OWN make
    // (a separate "Chevrolet Blazer" line) is its own vehicle and keeps "any year", unless the years sit on a bare make line
    // right next to it ("Hyundai Elantra" + "Hyundai 21-22" = one vehicle split over two lines).
    function makeOnlySeg(x){ return x.words.length>0 && x.words.every(function(w){ return !!canonMake(w); }); }
    segs.forEach(function(sg, i){
      if(sg.ys || !sg.words.length) return;
      var prev=null, next=null, j;
      for(j=i-1;j>=0;j--){ if(segs[j].ys){ prev=segs[j]; break; } }
      for(j=i+1;j<segs.length;j++){ if(segs[j].ys){ next=segs[j]; break; } }
      var src=null;
      if(prev && prev.yearPos==='before') src=prev;          // "2005-2008 Magnum, Charger"
      else if(next && next.yearPos==='after') src=next;      // "Camaro, Cruze, Malibu 2016-2020"
      else if(prev) src=prev;                                 // "Charger 2015-2020, Challenger"
      if(src && src.line!==sg.line && canonMake(sg.words[0]) && !makeOnlySeg(src)) src=null;   // own make, real neighbour vehicle → independent
      if(src){ sg.ys=src.ys; sg.ye=src.ye; sg.inherited=true; }
    });
    var out=[], sticky='';
    segs.forEach(function(s){ resolve(s, sticky).forEach(function(e){ if(e.make) sticky=e.make; if(e.model||e.make) out.push(e); }); });
    // a year with no words = "same vehicles as the previous entry" is meaningless; dropped above (no model/make)
    if(_cacheN>400){ _cache={}; _cacheN=0; }
    _cache[text]=out; _cacheN++;
    return out;
  }

  function modelMatch(entryModel, qModel){
    var e=norm(entryModel), q=norm(qModel); if(!e||!q) return false;
    if(e===q) return 2;
    // entry "Silverado" covers query "Silverado 1500"; entry "Encore" covers "Encore GX" (query more specific than the list)
    if(q.length>e.length && q.indexOf(e)===0) return 1;
    return 0;
  }
  function entryFits(e, veh){
    var y=parseInt(veh.year,10)||0, mk=canonMake(veh.make)||String(veh.make||'').trim(), md=String(veh.model||'').trim();
    if(!mk && !md) return 0;
    if(y && e.ys && (y<e.ys || y>e.ye)) return 0;
    if(mk && e.make && norm(mk)!==norm(e.make)){ if(!(GROUP[e.make] && GROUP[e.make][canonMake(mk)||mk])) return 0; }
    if(md){ if(!e.model) return e.make ? 0.5 : 0;        // 8v: make-only entry ("Chrysler/Dodge/Jeep 04-19") — NOT a model match; filter() drops it unless {loose:true}
             return modelMatch(e.model, md); }
    return e.make ? 1 : 0;   // make-only lookup
  }
  function itemScore(item, veh){ var es=parse(item&&item.fitment), best=0; for(var i=0;i<es.length;i++){ var s=entryFits(es[i], veh); if(s>best) best=s; } return best; }
  function itemFits(item, veh){ return itemScore(item, veh)>0; }
  // 8v (owner): "a 2020 Charger needs the one just for the 2020 Charger" — with a model chosen, only parts whose
  // fits name that model are returned. opts.loose also returns parts that list the make with no model.
  function filter(items, veh, opts){
    if(!veh || !(veh.make||veh.model)) return [];
    var min=(veh.model && !(opts&&opts.loose)) ? 1 : 0.01;
    return (items||[]).map(function(it){ return {it:it, s:itemScore(it, veh)}; }).filter(function(x){ return x.s>=min; })
      .sort(function(a,b){ return b.s-a.s; }).map(function(x){ return x.it; });
  }
  // A search-box query like "2019 enclave" / "buick encore" / "19 regal"? → vehicle, else null.
  function parseQuery(q){
    q=String(q||'').trim(); if(!q || q.length<3) return null;
    var es=parse(q); if(!es.length) return null;
    var e=es[0]; if(!e.resolved) return null;                 // only a catalog-recognised vehicle counts
    return { year: e.ys && e.ys===e.ye ? String(e.ys) : (e.ys && e.ye!==9999 ? String(e.ys) : ''), make:e.make, model:e.model, resolved:true };
  }
  function label(e){ var yr=e.ys?(e.ye===9999?e.ys+'+':(e.ye===e.ys?String(e.ys):e.ys+'–'+e.ye)):''; return [yr, e.make, e.model].filter(Boolean).join(' '); }
  function summary(text){ return parse(text).map(label).join(' · '); }
  function vehLabel(veh){ return [veh&&veh.year, veh&&(canonMake(veh.make)||veh.make), veh&&veh.model].filter(Boolean).join(' '); }

  var api={ parse:parse, parseQuery:parseQuery, itemFits:itemFits, filter:filter, label:label, summary:summary, canonMake:canonMake, vehLabel:vehLabel, MAKES:MAKES, _tokenize:tokenize };
  root.TKS_FIT=api;
  if(typeof module!=='undefined' && module.exports) module.exports=api;
})(typeof window!=='undefined' ? window : globalThis);
