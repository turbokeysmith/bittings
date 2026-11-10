// Merge NHTSA vPIC models into the app's model catalog → bittings-unified/app/ymm-catalog.js
const fs=require('fs'); global.window={}; require(__dirname+'/../../app/lishi-seed.js');
const seed=window.TKS_LISHI_SEED.models; const raw=JSON.parse(fs.readFileSync(__dirname+'/raw.json','utf8'));
const JUNK=/chassis|cutaway|stripped|motor ?home|\bbus\b|\blcf\b|^f-?[5-8]\d0|medium|low cab|kodiak|topkick|^w\d{4}|^n[pq]r|^f[tv]r|glider|incomplete|commercial|^t\d{3,}|^c\d{4,}|^[a-z]?\d{4,}$|^c[4-8]500|tilt|forward control|^p\d{2}|^g\d{4}|^L[A-Z]{1,3}\d{4}$|ambulance|hearse|limo/i;
const DENY={ Ford:/^(LT|AT|LL|LS|LN|LA|FT|CF|B-?)\d|^LT[LS]|^LNT|^CFT|^F-Super Duty|^'34|^E-550|^Malibu Sedan|^Cordova|^Classic Sedan|^GT MKII/,
  GMC:/P Truck Forward|Electric Vehicle|Cruise Origin/, Chevrolet:/^3 ton|GMT-400|U100|Matiz|Optra|Epica|Kalos|Orlando|Onix|BrightDrop/,
  MINI:/^(Pete|KW|FL|Mack)$/, Isuzu:/^(F[RSV]R|F\d|T\dF)/, Mitsubishi:/^F[EGHKM]\d|FEC7/, Hyundai:/Xcient/, Kia:/Miami/, Tesla:/^(Semi|Cybercab)$/,
  Rivian:/^(RCV|EDV)$/, 'Land Rover':/WB$|New Range Rover/, Toyota:/FCHV/, Pontiac:/Matiz/ };
const VOLVO_OK=/^(\d{3} Series|C\d{2}|S\d{2}|V\d{2}|XC\d{2}|EX\d{2}|EC40|V\d{2}CC|S60CC|EX30 CC|C70 \/ C30)$/;
function fixName(mk,n){
  n=n.split(',')[0].trim();   // "750i, Alpina B7" → "750i"
  const AL={ Chevrolet:{'Silverado LD':'Silverado 1500','Silverado LTD':'Silverado 1500','Silverado HD':'Silverado 2500/3500','Suburban HD':'Suburban','Impala Limited':'Impala','Malibu Limited':'Malibu','Malibu Classic':'Malibu','Cruze Limited':'Cruze','Traverse Limited':'Traverse','Caprice Police Vehicle':'Caprice'},
    GMC:{'Sierra HD':'Sierra 2500/3500','Sierra Limited':'Sierra 1500'}, Ford:{'F-150 Heritage':'F-150','F-350':'F-250/350','F-250':'F-250/350'},
    Dodge:{'Caravan/Grand Caravan':'Grand Caravan','Ram Wagon':'Ram Van'}, Chrysler:{'Town and Country':'Town & Country','Concorde/LHS':'Concorde'} };
  if(AL[mk] && AL[mk][n]) return AL[mk][n];
  if(mk==='BMW'){ if(/^(Alpina|ActiveE|B[678]$)/.test(n)) return ''; const a=n.match(/^ActiveHybrid (\d)/); if(a) return a[1]+' Series';
    const m=n.match(/^M?(\d)\d\d[a-zA-Z]*$/); if(m) return m[1]+' Series'; return n; }
  if(mk==='Volvo' && n==='C70 / C30') return '';
  return n; }
const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'').replace(/class/,'');
const SEEDKEY=mk=>Object.keys(seed).find(k=>k.toLowerCase()===mk.toLowerCase());
const acc={}; // mk → name → Set(years)
for(const mk of Object.keys(raw)){
  for(const [name0,info] of Object.entries(raw[mk])){
    if(JUNK.test(name0) || (DENY[mk] && DENY[mk].test(name0))) continue;
    if(mk==='Volvo' && !VOLVO_OK.test(name0)) continue;
    if(mk==='GMC' && /^[A-Z]{1,4}$/.test(name0)) continue;
    const name=fixName(mk,name0); if(!name) continue;
    const yrs=Object.keys(info).filter(k=>/^\d{4}$/.test(k)).map(Number); if(!yrs.length) continue;
    const s=((acc[mk]=acc[mk]||{})[name]=acc[mk][name]||new Set()); yrs.forEach(y=>s.add(y));
  }
}
const extra={}, report={};
for(const mk of Object.keys(acc)){
  const existing=(seed[SEEDKEY(mk)]||[]).map(r=>r[0]); const mkn=norm(mk);
  for(const [name,set] of Object.entries(acc[mk])){
    const n=norm(name); const yrs=[...set].sort((a,b)=>a-b);
    const runs=[]; let a=yrs[0], p=yrs[0]; for(const y of yrs.slice(1)){ if(y>p+1){ runs.push([a,p]); a=y; } p=y; } runs.push([a,p]);
    // same model already in the hand-made list (exact, "Mazda3"↔"3", or "Silverado"↔"Silverado 1500") → keep its name, add the years
    let targets=existing.filter(e=>norm(e)===n || norm(e)===mkn+n || mkn+norm(e)===n);
    if(!targets.length) targets=existing.filter(e=>n.length>=4 && norm(e).startsWith(n));
    const isNew=!targets.length; if(isNew) targets=[name];
    for(const t of targets) for(const [x,y] of runs) (extra[mk]=extra[mk]||[]).push([t,x,y]);
    if(isNew) (report[mk]=report[mk]||[]).push(name+' '+runs.map(r=>r[0]+'-'+r[1]).join('/'));
  }
  extra[mk].sort((a,b)=>a[0].localeCompare(b[0])||a[1]-b[1]);
}
const out=`/* Vehicle model catalog — US makes / models / years 1995–2026 from the NHTSA vPIC database (vpic.nhtsa.dot.gov),
   built ${new Date().toISOString().slice(0,10)} by a one-off script (heavy commercial trucks filtered out; BMW trims folded into
   "3 Series" etc.; Mercedes "GLC-Class" → "GLC"). Generated — rerun the build rather than hand-editing.
   Merged INTO TKS_LISHI_SEED.models: the hand-made list stays first and keeps its names ("Silverado 1500"), so
   Start-a-job, the Scheduler, the invoice page, Inventory and the fitment matcher all read one full list.
   Rows are [model, firstYear, lastYear]; a model sold in separate runs (Ford Ranger) has one row per run. */
(function(){
  var EXTRA=${JSON.stringify(extra)};
  try{ var S=window.TKS_LISHI_SEED=window.TKS_LISHI_SEED||{}; var M=S.models=S.models||{};
    Object.keys(EXTRA).forEach(function(mk){ var key=Object.keys(M).filter(function(k){ return k.toLowerCase()===mk.toLowerCase(); })[0]||mk;
      M[key]=(M[key]||[]).concat(EXTRA[mk]); }); }catch(e){}
})();
`;
fs.writeFileSync(__dirname+'/../../app/ymm-catalog.js',out);
fs.writeFileSync(__dirname+'/new-models.txt',Object.entries(report).map(([k,v])=>k+': '+v.join(', ')).join('\n'));
console.log('written', (out.length/1024).toFixed(0)+' KB', 'makes', Object.keys(extra).length, 'new models', Object.values(report).reduce((s,v)=>s+v.length,0));
