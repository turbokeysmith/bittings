// Pull model names per make/year/type from NHTSA vPIC (free public API) → vpic/raw.json
// Usage (from anywhere): node tools/ymm-catalog/vpic-fetch.js   (~15 min, ~4,700 free NHTSA requests) then vpic-build.js
const fs=require('fs');
const MAKES=['Acura','Alfa Romeo','Audi','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Fiat','Ford','Genesis','GMC','Honda','Hummer','Hyundai','Infiniti','Isuzu','Jaguar','Jeep','Kia','Land Rover','Lexus','Lincoln','Lucid','Maserati','Mazda','Mercedes-Benz','Mercury','MINI','Mitsubishi','Nissan','Oldsmobile','Plymouth','Polestar','Pontiac','Porsche','Ram','Rivian','Saab','Saturn','Scion','smart','Subaru','Suzuki','Tesla','Toyota','Volkswagen','Volvo'];
const TYPES=['car','mpv','truck']; const out={}; const jobs=[];
for(const mk of MAKES) for(let y=1995;y<=2026;y++) for(const t of TYPES) jobs.push([mk,y,t]);
let done=0, fail=0;
async function one([mk,y,t]){
  const url=`https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(mk)}/modelyear/${y}/vehicletype/${t}?format=json`;
  for(let a=0;a<4;a++){ try{ const r=await fetch(url); const j=await r.json();
      (j.Results||[]).forEach(x=>{ const m=(out[mk]=out[mk]||{}); const n=x.Model_Name.trim(); (m[n]=m[n]||{});
        m[n][y]=1; (m[n]._t=m[n]._t||{})[t]=1; }); done++; return; }catch(e){ await new Promise(r=>setTimeout(r,1500*(a+1))); } }
  fail++;
}
(async()=>{ let i=0; const N=8; await Promise.all(Array.from({length:N},async()=>{ while(i<jobs.length){ const j=jobs[i++]; await one(j); } }));
  fs.writeFileSync(__dirname+'/raw.json',JSON.stringify(out)); console.log('done',done,'fail',fail); })();
