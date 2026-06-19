/* lishi-seed.js — shared Lishi tool + vehicle seed data. Sliced verbatim from
   lishi.html. ensureSeed()/applyCodeSeries() run at the bottom. Keep in sync. */
(function(){
function readLS(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } }
function writeLS(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
function uid(p){ return (p||'id')+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

const K_TOOLS='tks_lishi_tools', K_VEH='tks_vehicle_keyways', K_CORR='tks_lishi_corrections', K_VIN='tks_vin_cache';

/* ---- field schemas (label + key) ---- */
const TOOL_FIELDS=[
  ['tool_designation','Tool designation'],['keyway','Keyway'],['tool_type','Tool type'],
  ['wafer_positions','Wafer positions'],['usage','Usage (door/ign/trunk)'],['key_blank','Key blank'],
  ['notes','Notes'],['video_url','Video URL'],['source','Source']
];
const VEH_FIELDS=[
  ['make','Make'],['model','Model'],['year_start','Year start'],['year_end','Year end'],['keyway','Keyway'],
  ['coded','Coded (Yes/No)'],['door_location','Door location'],['can_pick_ignition','Can pick ignition'],
  ['transponder_system','Transponder system'],['programming_path','Programming path'],
  ['oem_only','OEM only (Yes/No)'],['nastf_required','NASTF required (Yes/No)'],['code_series','Code series'],['notes','Notes'],['source','Source']
];

/* ============================== SEED DATA ============================== */
const SEED_TOOLS=[
  {tool_designation:'HU101',keyway:'HU101',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HU101',video_url:'',source:'Original Lishi; UHS Hardware',notes:''},
  {tool_designation:'HU100',keyway:'HU100',tool_type:'2-in-1 pick/decoder',wafer_positions:'10',usage:'door/ign',key_blank:'HU100 / B111',video_url:'',source:'Original Lishi; CLK Supplies',notes:''},
  {tool_designation:'HU100R',keyway:'HU100R',tool_type:'2-in-1 pick/decoder',wafer_positions:'10',usage:'door/ign',key_blank:'HU100R',video_url:'',source:'Original Lishi; CLK Supplies',notes:'BMW track key'},
  {tool_designation:'FO38',keyway:'FO38',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door',key_blank:'FO38 / H72',video_url:'',source:'Original Lishi; UHS Hardware',notes:'Older Ford/Lincoln/Mercury 8-cut'},
  {tool_designation:'TOY48',keyway:'TOY48',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'TOY48',video_url:'',source:'Original Lishi; CLK Supplies',notes:'Toyota/Lexus high-security'},
  {tool_designation:'TOY43',keyway:'TOY43',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'TOY43 / TR47',video_url:'',source:'Original Lishi; LockPickWorld',notes:'Older Toyota/Scion'},
  {tool_designation:'TOY40',keyway:'TOY40',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door',key_blank:'TOY40',video_url:'',source:'Original Lishi',notes:'Older Toyota'},
  {tool_designation:'TOY51',keyway:'TOY51',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'TOY51',video_url:'',source:'Classic Lishi; UHS Hardware',notes:''},
  {tool_designation:'HON66',keyway:'HON66',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HON66',video_url:'',source:'Original Lishi; CLK Supplies',notes:'Honda/Acura high-security'},
  {tool_designation:'HON58R',keyway:'HON58R',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HON58R',video_url:'',source:'Original Lishi',notes:'Older Honda/Acura'},
  {tool_designation:'HU66',keyway:'HU66',tool_type:'2-in-1 pick/decoder',wafer_positions:'8/10',usage:'door/ign',key_blank:'HU66',video_url:'',source:'Original Lishi; LockPickWorld',notes:'VW/Audi/Seat/Skoda; multiple versions (V.2/V.3)'},
  {tool_designation:'HU162T(9)',keyway:'HU162T',tool_type:'2-in-1 pick/decoder',wafer_positions:'9',usage:'door/ign',key_blank:'HU162T',video_url:'',source:'Original Lishi; CLK Supplies',notes:'VAG MQB; also a 10-cut version exists'},
  {tool_designation:'HU64',keyway:'HU64',tool_type:'2-in-1 pick/decoder',wafer_positions:'4-track',usage:'door/ign',key_blank:'HU64',video_url:'',source:'Original Lishi',notes:'Mercedes-Benz 4-track'},
  {tool_designation:'HU92',keyway:'HU92',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HU92',video_url:'',source:'Original Lishi',notes:'Older BMW/MINI'},
  {tool_designation:'HU83',keyway:'HU83',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HU83',video_url:'',source:'Original Lishi',notes:'Peugeot/Citroën'},
  {tool_designation:'CY24',keyway:'CY24',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'Y160 / Y159 / CY24',video_url:'',source:'Original Lishi; UHS Hardware',notes:'Chrysler/Dodge/Jeep/Ram'},
  {tool_designation:'NSN14',keyway:'NSN14',tool_type:'2-in-1 pick/decoder',wafer_positions:'10',usage:'door/ign',key_blank:'NSN14 / DA31',video_url:'',source:'Original Lishi',notes:'Older Nissan/Infiniti/Subaru'},
  {tool_designation:'DA34',keyway:'DA34',tool_type:'2-in-1 pick/decoder',wafer_positions:'10',usage:'door/ign',key_blank:'DA34',video_url:'',source:'Original Lishi; CLK Supplies',notes:'Newer Nissan/Infiniti high-security'},
  {tool_designation:'HY15',keyway:'HY15',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HY15',video_url:'',source:'Original Lishi',notes:'Older Hyundai/Kia'},
  {tool_designation:'HY20',keyway:'HY20',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'HY20 / HY18',video_url:'',source:'Original Lishi; UHS Hardware',notes:'Hyundai/Kia laser/high-security'},
  {tool_designation:'KK10',keyway:'KK10',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'KK10',video_url:'',source:'Classic Lishi',notes:'Newer Kia'},
  {tool_designation:'MAZ24',keyway:'MAZ24',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'MAZ24',video_url:'',source:'Original Lishi',notes:'Mazda'},
  {tool_designation:'DAT17',keyway:'DAT17',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'DAT17 / NSN11',video_url:'',source:'Classic Lishi; LockPickWorld',notes:'Subaru'},
  {tool_designation:'MIT11',keyway:'MIT11',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'MIT11',video_url:'',source:'Original Lishi',notes:'Mitsubishi'},
  {tool_designation:'B111 (GM)',keyway:'B111',tool_type:'2-in-1 pick/decoder',wafer_positions:'10',usage:'door/ign',key_blank:'B111 / HU100',video_url:'',source:'CLK Supplies; UHS Hardware',notes:'GM 10-cut (same keyway as HU100)'},
  {tool_designation:'GM37/B102',keyway:'B102',tool_type:'2-in-1 pick/decoder',wafer_positions:'8',usage:'door/ign',key_blank:'B102 / B106',video_url:'',source:'Classic Lishi',notes:'Older GM (pre-2010), incl. VATS/PK3'}
];

const SEED_VEH=[
  // FORD / LINCOLN
  v('Ford','F-150','2015','2020','HU101','Yes','Driver door','Yes','Ford 128-bit (PATS)','OBD: AutoProPad/Autel/SmartPro; add-key easy','No','No',''),
  v('Ford','F-250/350','2017','2022','HU101','Yes','Driver door','Yes','Ford 128-bit (PATS)','OBD: AutoProPad/Autel','No','No',''),
  v('Ford','Focus','2012','2018','HU101','Yes','Driver door','Yes','Ford 80-bit/128-bit','OBD','No','No',''),
  v('Ford','Fusion','2013','2020','HU101','Yes','Driver door','Yes','Ford 128-bit','OBD','No','No',''),
  v('Ford','Escape','2013','2019','HU101','Yes','Driver door','Yes','Ford 128-bit','OBD','No','No',''),
  v('Ford','Explorer','2011','2019','HU101','Yes','Driver door','Yes','Ford 128-bit','OBD','No','No',''),
  v('Ford','Mustang','2015','2023','HU101','Yes','Driver door','Yes','Ford 128-bit','OBD','No','No',''),
  v('Ford','Crown Victoria','1998','2011','FO38','Yes','Driver door','Yes','Ford PATS (older)','OBD/onboard','No','No','8-cut'),
  v('Lincoln','MKZ','2013','2020','HU101','Yes','Driver door','Yes','Ford 128-bit','OBD','No','No',''),
  // GM (Chevrolet/GMC/Buick/Cadillac)
  v('Chevrolet','Silverado 1500','2014','2018','HU100','Yes','Driver door','Yes','GM Hitag2 (8-cut)','OBD: AutoProPad/Autel','No','No',''),
  v('Chevrolet','Malibu','2013','2020','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('Chevrolet','Equinox','2010','2017','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('Chevrolet','Cruze','2011','2019','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('Chevrolet','Camaro','2010','2015','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('GMC','Sierra 1500','2014','2018','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('Buick','Enclave','2008','2017','HU100','Yes','Driver door','Yes','GM Hitag2','OBD','No','No',''),
  v('Cadillac','Escalade','2015','2020','HU100','Yes','Driver door','N/A','GM Hitag2 (proximity)','OBD; AKL may need relearn wait','No','No','Push-to-start prox'),
  v('Chevrolet','Impala','2006','2013','B102','Yes','Driver door','Yes','GM PK3+ / Hitag2','OBD/onboard','No','No','Older platform'),
  // TOYOTA / LEXUS
  v('Toyota','Camry','2012','2017','TOY48','Yes','Driver door','Yes','Toyota G/H chip','OBD; AKL on H-chip may need dealer/emulator','No','No',''),
  v('Toyota','Corolla','2014','2019','TOY48','Yes','Driver door','Yes','Toyota H chip','OBD; H-chip AKL harder','No','No',''),
  v('Toyota','RAV4','2013','2018','TOY48','Yes','Driver door','Yes','Toyota G/H chip','OBD','No','No',''),
  v('Toyota','Tacoma','2016','2023','TOY48','Yes','Driver door','Yes','Toyota H chip','OBD','No','No',''),
  v('Toyota','Tundra','2014','2021','TOY48','Yes','Driver door','Yes','Toyota G/H chip','OBD','No','No',''),
  v('Toyota','Highlander','2014','2019','TOY48','Yes','Driver door','Yes','Toyota G/H chip','OBD','No','No',''),
  v('Toyota','Camry','2002','2006','TOY43','Yes','Driver door','Yes','Toyota 4C/4D','OBD/onboard','No','No','Older'),
  v('Lexus','RX350','2010','2015','TOY48','Yes','Driver door','N/A','Toyota G (smart)','OBD; smart system','No','No',''),
  // HONDA / ACURA
  v('Honda','Civic','2006','2015','HON66','Yes','Driver door','Yes','Honda G / ID46','OBD','No','No',''),
  v('Honda','Accord','2008','2017','HON66','Yes','Driver door','Yes','Honda G / ID46','OBD','No','No',''),
  v('Honda','CR-V','2007','2016','HON66','Yes','Driver door','Yes','Honda G / ID46','OBD','No','No',''),
  v('Honda','Pilot','2009','2015','HON66','Yes','Driver door','Yes','Honda G / ID46','OBD','No','No',''),
  v('Acura','TL','2009','2014','HON66','Yes','Driver door','Yes','Honda G / ID46','OBD','No','No',''),
  v('Honda','Civic','2001','2005','HON58R','Yes','Driver door','Yes','Honda ID13/ID48','OBD/onboard','No','No','Older'),
  // CHRYSLER / DODGE / JEEP / RAM
  v('Dodge','Charger','2011','2023','CY24','Yes','Driver door','Yes','Chrysler 4A / PCF7941','OBD; PIN often required (read from BCM)','No','No',''),
  v('Chrysler','300','2011','2023','CY24','Yes','Driver door','Yes','Chrysler 4A','OBD; PIN often required','No','No',''),
  v('Jeep','Wrangler','2007','2018','CY24','Yes','Driver door','Yes','Chrysler 4A','OBD; PIN often required','No','No',''),
  v('Jeep','Grand Cherokee','2011','2021','CY24','Yes','Driver door','N/A','Chrysler 4A (prox)','OBD; PIN; some need 12+min wait','No','No',''),
  v('Ram','1500','2013','2018','CY24','Yes','Driver door','Yes','Chrysler 4A','OBD; PIN often required','No','No',''),
  // VW / AUDI (VAG)
  v('Volkswagen','Jetta','2011','2018','HU66','Yes','Driver door','Yes','Megamos ID48 / MQB','OBD pre-MQB; MQB needs advanced tools','No','No','Check MQB by year'),
  v('Volkswagen','Golf','2015','2021','HU162T','Yes','Driver door','Yes','VAG MQB','Advanced tools / dealer; often OEM path','Yes','No','MQB immobilizer'),
  v('Audi','A4','2009','2016','HU66','Yes','Driver door','Yes','Megamos ID48','OBD pre-MQB; later dealer','No','No',''),
  v('Audi','Q5','2018','2023','HU162T','Yes','Driver door','N/A','VAG MQB/MQB-EVO','Dealer/advanced','Yes','No','MQB'),
  // NISSAN / INFINITI
  v('Nissan','Altima','2013','2018','DA34','Yes','Driver door','Yes','Nissan Hitag2','OBD; PIN/BCM code required','No','No',''),
  v('Nissan','Sentra','2013','2019','DA34','Yes','Driver door','Yes','Nissan Hitag2','OBD; PIN required','No','No',''),
  v('Nissan','Rogue','2014','2020','DA34','Yes','Driver door','N/A','Nissan Hitag2 (prox)','OBD; PIN required','No','No',''),
  v('Nissan','Altima','2002','2006','NSN14','Yes','Driver door','Yes','Nissan ID40/ID60','OBD/onboard','No','No','Older'),
  v('Infiniti','G37','2008','2013','DA34','Yes','Driver door','N/A','Nissan Hitag2 (prox)','OBD; PIN required','No','No',''),
  // HYUNDAI / KIA
  v('Hyundai','Elantra','2017','2020','HY20','Yes','Driver door','Yes','Hyundai 8A / Texas DST80','OBD','No','No',''),
  v('Hyundai','Sonata','2015','2019','HY20','Yes','Driver door','Yes','Hyundai 8A','OBD','No','No',''),
  v('Kia','Optima','2016','2020','KK10','Yes','Driver door','Yes','Kia 8A','OBD','No','No',''),
  v('Kia','Sorento','2016','2020','HY20','Yes','Driver door','N/A','Kia 8A (prox)','OBD','No','No',''),
  // MAZDA / SUBARU / MITSUBISHI
  v('Mazda','Mazda3','2014','2018','MAZ24','Yes','Driver door','Yes','Mazda 4D/G','OBD','No','No',''),
  v('Mazda','CX-5','2013','2016','MAZ24','Yes','Driver door','N/A','Mazda G (prox)','OBD','No','No',''),
  v('Subaru','Outback','2015','2019','DAT17','Yes','Driver door','Yes','Subaru G','OBD','No','No',''),
  v('Subaru','Forester','2014','2018','DAT17','Yes','Driver door','Yes','Subaru G','OBD','No','No',''),
  v('Mitsubishi','Outlander','2014','2020','MIT11','Yes','Driver door','Yes','Mitsubishi 8A','OBD','No','No',''),
  // BMW / MERCEDES (mostly OEM/advanced)
  v('BMW','3 Series','2012','2018','HU100R','No','Driver door (often none)','N/A','BMW FEM/BDC','OEM / advanced tools; bench often needed','Yes','No','FEM/BDC — frequently dealer'),
  v('BMW','3 Series','2006','2011','HU92','No','Driver door','N/A','BMW CAS3/CAS3+','Advanced tools (CAS); bench','Yes','No',''),
  v('Mercedes-Benz','C-Class','2008','2014','HU64','No','Driver door','No','Mercedes FBS3','OEM / advanced; AKL specialist','Yes','Yes','FBS — dealer/specialist')
];
function v(make,model,ys,ye,keyway,coded,door,pick,trans,prog,oem,nastf,notes){
  return {make,model,year_start:ys,year_end:ye,keyway,coded,door_location:door,can_pick_ignition:pick,
    transponder_system:trans,programming_path:prog,oem_only:oem,nastf_required:nastf,code_series:'',notes:notes||'',
    source:'Cross-ref: LockPickWorld/CLK/UHS lists (2026-06-15)'};
}

/* ---- the rest of the Original/Classic Lishi range (cars, trucks, Euro, moto, residential) ---- */
function tdef(d,kw,usage,blank,notes,src,type,pos){
  return {tool_designation:d,keyway:kw,tool_type:type||'2-in-1 pick/decoder',wafer_positions:pos||'',
    usage:usage||'door/ign',key_blank:blank||kw,notes:notes||'',video_url:'',source:src||'Original Lishi range'};
}
const EXTRA_TOOLS=[
  // GM / American (older)
  tdef('B106','B106','','','Older GM','Classic Lishi'), tdef('B107','B107','','','Older GM','Classic Lishi'),
  tdef('B110','B110','','','Older GM','Classic Lishi'), tdef('GM45','GM45','','','GM','Original Lishi'),
  tdef('DWO4','DWO4','','','Daewoo / Chevrolet','Original Lishi'), tdef('DWO5','DWO5','','','Daewoo / Chevrolet','Original Lishi'),
  // Ford / Lincoln
  tdef('HU198','HU198','','','Newer Ford/Lincoln high-security','Original Lishi'),
  tdef('FO21 (Tibbe)','FO21','','FO21','Ford/Jaguar Tibbe','Original Lishi','2-in-1 Tibbe decoder'),
  // Chrysler / Dodge / Jeep
  tdef('CY22','CY22','','','Older Chrysler','Original Lishi'), tdef('CY23','CY23','','','Older Chrysler','Original Lishi'),
  // Toyota / Lexus / Scion
  tdef('TOY2','TOY2','','','Older Toyota','Original Lishi'), tdef('TOY38R','TOY38R','','','Toyota','Original Lishi'),
  tdef('TOY47','TOY47','','','Toyota','Original Lishi'), tdef('TOY43R','TOY43R','','','Toyota','Original Lishi'),
  // Honda / Acura
  tdef('HON63','HON63','','','Honda/Acura','Original Lishi'), tdef('HON70','HON70','','','Honda','Original Lishi'),
  // Nissan / Infiniti / Subaru
  tdef('NSN11','NSN11','','','Nissan','Original Lishi'), tdef('DA31','DA31','','','Nissan/Subaru','Original Lishi'),
  tdef('HU87','HU87','','','Subaru/Suzuki','Original Lishi'),
  // Hyundai / Kia
  tdef('HY16','HY16','','','Hyundai','Original Lishi'), tdef('HY17','HY17','','','Hyundai/Kia','Original Lishi'),
  tdef('HY18','HY18','','','Hyundai/Kia','Original Lishi'), tdef('HY22','HY22','','','Hyundai','Original Lishi'),
  tdef('KIA7','KIA7','','','Kia','Original Lishi'), tdef('KIA2','KIA2','','','Kia','Original Lishi'),
  tdef('KK12','KK12','','','Kia newer','Classic Lishi'),
  // Mazda / Mitsubishi / Suzuki / SsangYong / Mahindra
  tdef('MAZ13','MAZ13','','','Older Mazda','Original Lishi'),
  tdef('MIT8','MIT8','','','Mitsubishi','Original Lishi'), tdef('MIT6','MIT6','','','Mitsubishi','Original Lishi'),
  tdef('SZ14','SZ14','','','Suzuki','Original Lishi'), tdef('HU133','HU133','','','Suzuki','Original Lishi'),
  tdef('SYG','SYG','','','SsangYong','Original Lishi'), tdef('MAH','MAH','','','Mahindra','Original Lishi'),
  // VW / Audi / Seat / Skoda (VAG)
  tdef('HU162T(10)','HU162T','','HU162T','VAG MQB 10-cut','Original Lishi','2-in-1 pick/decoder','10'),
  tdef('HU162T(8)','HU162T','','HU162T','VAG 8-cut','Original Lishi','2-in-1 pick/decoder','8'),
  tdef('HU162','HU162','','','VAG older','Original Lishi'), tdef('HU49','HU49','','','Older VW/Audi','Original Lishi'),
  tdef('HU66(V.3)','HU66','','HU66','VAG version 3','Original Lishi'),
  // BMW / Mini
  tdef('HU58','HU58','','','Older BMW','Original Lishi'), tdef('HU136','HU136','','','BMW/Mini','Original Lishi'),
  // Mercedes / Smart
  tdef('HU39','HU39','','','Older Mercedes','Original Lishi'), tdef('YM23','YM23','','','Mercedes/Smart','Original Lishi'),
  // Volvo
  tdef('HU56','HU56','','','Volvo','Original Lishi'), tdef('HU56R','HU56R','','','Volvo','Original Lishi'),
  tdef('NE66','NE66','','','Volvo','Original Lishi'),
  // Renault / Dacia
  tdef('VAC102','VAC102','','','Renault','Original Lishi'), tdef('NE73','NE73','','','Renault','Original Lishi'),
  tdef('VA2T','VA2T','','','Renault/Peugeot','Original Lishi'), tdef('VA6','VA6','','','Renault/Peugeot','Original Lishi'),
  tdef('NE38','NE38','','','Renault','Original Lishi'),
  // Peugeot / Citroën
  tdef('NE78','NE78','','','Peugeot/Citroën','Original Lishi'), tdef('SX9','SX9','','','Citroën','Original Lishi'),
  // Fiat / Alfa / Lancia
  tdef('GT15','GT15','','','Fiat','Original Lishi'), tdef('SIP22','SIP22','','','Fiat/Alfa/Lancia','Original Lishi'),
  tdef('GT10','GT10','','','Fiat','Original Lishi'),
  // Opel / Vauxhall / Saab
  tdef('HU43','HU43','','','Opel/Vauxhall','Original Lishi'), tdef('HU46','HU46','','','Opel/Vauxhall','Original Lishi'),
  tdef('YM28','YM28','','','Opel/Vauxhall','Original Lishi'), tdef('NE72','NE72','','','Saab','Original Lishi'),
  // Motorcycle / scooter range
  tdef('HON-MOTO','HON-MOTO','ign','HON-MOTO','Honda motorcycle','Original Lishi','Motorcycle 2-in-1'),
  tdef('YH35R','YH35R','ign','YH35R','Yamaha motorcycle','Original Lishi','Motorcycle 2-in-1'),
  tdef('SUZU-MOTO','SUZU-MOTO','ign','SUZU-MOTO','Suzuki motorcycle','Original Lishi','Motorcycle 2-in-1'),
  tdef('KW-MOTO','KW-MOTO','ign','KW-MOTO','Kawasaki motorcycle','Original Lishi','Motorcycle 2-in-1'),
  tdef('HD-MOTO','HD-MOTO','ign','HD-MOTO','Harley-Davidson','Original Lishi','Motorcycle 2-in-1'),
  tdef('KYMCO','KYMCO','ign','KYMCO','Kymco scooter','Original Lishi','Motorcycle 2-in-1'),
  tdef('SYM','SYM','ign','SYM','SYM scooter','Original Lishi','Motorcycle 2-in-1'),
  // Residential / padlock range
  tdef('KW1','KW1','door','KW1','Kwikset residential','Original Lishi','Residential 2-in-1'),
  tdef('KW5','KW5','door','KW5','Kwikset SmartKey','Original Lishi','Residential 2-in-1'),
  tdef('SC1','SC1','door','SC1','Schlage residential','Original Lishi','Residential 2-in-1'),
  tdef('SC4','SC4','door','SC4','Schlage residential','Original Lishi','Residential 2-in-1'),
  tdef('WR5','WR5','door','WR5','Weiser residential','Original Lishi','Residential 2-in-1'),
  tdef('AM5','AM5','door','AM5','American padlock','Original Lishi','Residential 2-in-1'),
  tdef('M1 (1176)','M1','door','M1 / 1176','Master padlock','Original Lishi','Residential 2-in-1'),
  tdef('HU66(V.2)','HU66','','HU66','VAG version 2','Original Lishi'),
  tdef('WK2','WK2','door','WK2','Weslock residential','Original Lishi','Residential 2-in-1'),
  tdef('BE2','BE2','door','BE2','Baldwin residential','Original Lishi','Residential 2-in-1'),
  tdef('Y1','Y1','door','Y1','Yale residential','Original Lishi','Residential 2-in-1'),
  tdef('AR1','AR1','door','AR1','Arrow residential','Original Lishi','Residential 2-in-1')
];
/* ===== AUTHORITATIVE tool list — fetched verbatim from Original Lishi's own site =====
   Source: https://www.originallishi.com/lishi-tools-full-list/ (fetched 2026-06-15).
   tool_designation = Lishi's exact name; keyway = the common short keyway so it resolves
   to the vehicle table. Supersedes the earlier hand-compiled SEED_TOOLS/EXTRA_TOOLS. */
const OL='originallishi.com/lishi-tools-full-list (fetched 2026-06-15)', R='Reader', M='Motorcycle reader';
const LISHI_OFFICIAL=[
  tdef('B016/GM37','GM37','door/ign','B102','GM',OL), tdef('B111','B111','door/ign','B111','GM Z-keyway (10-cut)',OL,'2-in-1 pick/decoder','10'),
  tdef('BAOJUN','BAOJUN','door/ign','BAOJUN','Baojun (China)',OL), tdef('BQSB','BQSB','door/ign','BQSB','China',OL),
  tdef('BW9MH','BW9MH','door/ign','BW9MH','China',OL), tdef('BYD01','BYD01','door/ign','BYD01','BYD',OL), tdef('BYD01R','BYD01R','door/ign','BYD01R','BYD',OL),
  tdef('CHAANGAN','CHANGAN','door/ign','CHANGAN','Changan (China)',OL),
  tdef('CY24','CY24','door/ign','Y160','Chrysler/Dodge/Jeep',OL), tdef('CY24-CV','CY24','door/ign','Y160','Chrysler commercial van',OL), tdef('CY24 TRUCK','CY24','door/ign','Y160','Ram trucks',OL),
  tdef('DAT12R','DAT12R','door/ign','DAT12R','Subaru',OL), tdef('DW04R V.2','DWO4','door/ign','DWO4','Daewoo/Chevrolet',OL),
  tdef('FO38','FO38','door','FO38','Ford (older 8-cut)',OL,'2-in-1 pick/decoder','8'), tdef('FORD 2017','HU198','door/ign','HU198','Ford 2017+ (HU198)',OL),
  tdef('GM39','GM39','door/ign','GM39','GM (side-cut)',OL), tdef('GM45','GM45','door/ign','GM45','GM',OL), tdef('HAIMA','HAIMA','door/ign','HAIMA','Haima (China)',OL),
  tdef('HON58R','HON58R','door/ign','HON58R','Honda/Acura (older)',OL), tdef('HON66','HON66','door/ign','HON66','Honda/Acura',OL,'2-in-1 pick/decoder','8'),
  tdef('HU39','HU39','door/ign','HU39','Mercedes (older)',OL), tdef('HU43','HU43','door/ign','HU43','Opel/Vauxhall',OL), tdef('HU46','HU46','door/ign','HU46','Opel/Vauxhall',OL),
  tdef('HU49','HU49','door/ign','HU49','VW/Audi (older)',OL), tdef('HU56','HU56','door/ign','HU56','Volvo',OL), tdef('HU58','HU58','door/ign','HU58','BMW (older)',OL),
  tdef('HU64 V.2','HU64','door/ign','HU64','Mercedes-Benz (4-track)',OL),
  tdef('HU66 Generation 1&2','HU66','door/ign','HU66','VW/Audi/Seat/Skoda',OL), tdef('HU66 V.3','HU66','door/ign','HU66','VW/Audi/Seat/Skoda',OL),
  tdef('HU71','HU71','door/ign','HU71','Land Rover / older',OL), tdef('HU92','HU92','door/ign','HU92','BMW/Mini',OL), tdef('HU92(10) V.3','HU92','door/ign','HU92','BMW (10-cut)',OL,'2-in-1 pick/decoder','10'),
  tdef('HU100 V.3 (8 Cut)','HU100','door/ign','HU100','GM (8-cut)',OL,'2-in-1 pick/decoder','8'), tdef('HU100(10) V.3 (10 Cut)','HU100','door/ign','HU100','GM (10-cut)',OL,'2-in-1 pick/decoder','10'),
  tdef('HU100R V.3','HU100R','door/ign','HU100R','BMW',OL,'2-in-1 pick/decoder','10'), tdef('HU101(10) V.3','HU101','door/ign','HU101','Ford',OL,'2-in-1 pick/decoder','10'),
  tdef('HU162 (VAG2015)','HU162','door/ign','HU162','VW/Audi MQB',OL), tdef('HU162-SC9','HU162','door/ign','HU162','VAG (9-cut)',OL,'2-in-1 pick/decoder','9'), tdef('HU162-SC10 V.3','HU162','door/ign','HU162','VAG (10-cut)',OL,'2-in-1 pick/decoder','10'),
  tdef('HY16','HY16','door/ign','HY16','Hyundai/Kia',OL), tdef('HY17/HYN15','HY17','door/ign','HY17','Hyundai/Kia',OL), tdef('HY20','HY20','door/ign','HY20','Hyundai/Kia (laser)',OL), tdef('HY22','HY22','door/ign','HY22','Hyundai/Kia',OL),
  tdef('HYN7R','HYN7R','door/ign','HYN7R','Hyundai',OL), tdef('HYN11 V.3','HYN11','door/ign','HYN11','Hyundai',OL),
  tdef('HYN14R/HY15 V.2','HY15','door/ign','HY15','Hyundai/Kia (older)',OL), tdef('HYN14R(HY16)','HY16','door/ign','HY16','Hyundai',OL), tdef('HYN22','HYN22','door/ign','HYN22','Hyundai',OL),
  tdef('ICF03','ICF03','door/ign','ICF03','Iveco / commercial',OL), tdef('K5 V.3','K5','door/ign','K5','Kia (K5/Optima)',OL),
  tdef('MAZ24R V.2','MAZ24','door/ign','MAZ24','Mazda',OL), tdef('MAZDA(2014)','MAZ24','door/ign','MAZ24','Mazda (2014+)',OL),
  tdef('MIT11R','MIT11','door/ign','MIT11','Mitsubishi',OL), tdef('MIT8','MIT8','door/ign','MIT8','Mitsubishi',OL), tdef('MIT9/MIT6','MIT6','door/ign','MIT6','Mitsubishi',OL),
  tdef('NE38 V.2 Boot','NE38','trunk','NE38','Renault/Saab (boot)',OL), tdef('NE66AG','NE66','door/ign','NE66','Volvo',OL), tdef('NE71R V.2','NE71','door/ign','NE71','Renault/Fiat',OL),
  tdef('NE72','NE72','door/ign','NE72','Saab/Renault',OL), tdef('NE78','NE78','door/ign','NE78','Peugeot/Citroën',OL),
  tdef('NSN14 Dr/Bt','NSN14','door/trunk','NSN14','Nissan/Infiniti (door/boot)',OL), tdef('NSN14 Ign V.3','NSN14','ign','NSN14','Nissan/Infiniti (ignition)',OL),
  tdef('QIRUI','QIRUI','door/ign','QIRUI','Chery (China)',OL), tdef('SIP22','SIP22','door/ign','SIP22','Fiat/Alfa/Lancia/Iveco',OL), tdef('SRT2018','SRT2018','door/ign','SRT2018','2018+ platform',OL),
  tdef('SX9','SX9','door/ign','SX9','Citroën',OL), tdef('TOY2T','TOY2','door/ign','TOY2','Toyota (older)',OL), tdef('TOY43','TOY43','door/ign','TOY43','Toyota/Scion',OL),
  tdef('TOY43AT Dr/Bt','TOY43AT','door/trunk','TOY43AT','Toyota (door/boot)',OL), tdef('TOY43AT Ign','TOY43AT','ign','TOY43AT','Toyota (ignition)',OL), tdef('TOY43R','TOY43R','door/ign','TOY43R','Toyota',OL),
  tdef('TOY48','TOY48','door/ign','TOY48','Toyota/Lexus (high-security)',OL,'2-in-1 pick/decoder','8'),
  tdef('VA2T','VA2T','door/ign','VA2T','Renault',OL), tdef('VA6','VA6','door/ign','VA6','Renault/Peugeot',OL), tdef('VAC102','VAC102','door/ign','VAC102','Renault',OL),
  tdef('YM23','YM23','door/ign','YM23','Mercedes/Smart',OL), tdef('YM30','YM30','door/ign','YM30','Opel / GM Korea',OL), tdef('ZD30','ZD30','door/ign','ZD30','China',OL),
  // Readers (decode-only)
  tdef('B106 (Reader)','B106','read','B106','GM reader',OL,R), tdef('FO38 (Reader)','FO38','read','FO38','Ford reader',OL,R), tdef('CY24 (Reader)','CY24','read','CY24','Chrysler reader',OL,R),
  tdef('GM39 V.3 (Reader)','GM39','read','GM39','GM reader',OL,R), tdef('HU66 (Reader)','HU66','read','HU66','VAG reader',OL,R), tdef('HU92 (Reader)','HU92','read','HU92','BMW reader',OL,R), tdef('NSN14 (Reader)','NSN14','read','NSN14','Nissan reader',OL,R),
  // Motorcycle readers
  tdef('HON71 (Moto)','HON71','ign','HON71','Honda motorcycle',OL,M), tdef('KW14 V.2 (Moto)','KW14','ign','KW14','Kawasaki motorcycle',OL,M), tdef('SU14 V.2 (Moto)','SU14','ign','SU14','Suzuki motorcycle',OL,M), tdef('YH35R V.2 (Moto)','YH35R','ign','YH35R','Yamaha motorcycle',OL,M)
];
// Cross-referenced ADDITIONS — automotive Lishi tools found across Classic Lishi, Original Lishi,
// UHS Hardware, American Key Supply, CLK Supplies, Key Innovations & LockPickWorld (scrubbed 2026-06-15)
// that were NOT already in the list above. Conflicts with existing rows are NOT changed here —
// they're logged in LISHI_CROSSREF_REVIEW.md for the owner to approve.
const XR='Cross-ref 2026-06-15: Classic+Original Lishi, UHS, AKS, CLK, Key Innovations, LockPickWorld';
const CROSSREF_ADD=[
  tdef('HONDA2020','HON2020','door/ign','HON2020','Honda 2020+ models',XR),
  tdef('HONDA2021','HON2021','door/ign','HON2021','Honda 2021+ models (5-cut)',XR),
  tdef('HON77','HON77','door/ign','HON77','Honda (high-security)',XR),
  tdef('HY20R','HY20R','door/ign','HY20R','Hyundai/Kia (trunk & ignition)',XR),
  tdef('HY30','HY30','door/ign','HY30','Hyundai',XR),
  tdef('K9','K9','door/ign','K9','Kia/Hyundai (KK7/KK9)',XR),
  tdef('K9 V.4 (Ioniq6)','K9','door','K9','Kia/Hyundai/Genesis 2024+ (Ioniq6, GV80) door locks',XR),
  tdef('KIA3R','KIA3R','door/ign','KIA3R','Kia (KK3)',XR),
  tdef('KY14','KY14','door/ign','KY14','Kia (KK8)',XR),
  tdef('IONIQ5','IONIQ5','door/ign','KK12','Hyundai Ioniq5 / Tucson 2021+',XR),
  tdef('CY24R','CY24R','door/ign','CY24R','Jeep Grand Cherokee 2021+ (reverse)',XR),
  tdef('Ford 2021','FORD2021','door/ign','FORD2021','Ford Transit 2021+',XR),
  tdef('MAZ26R','MAZ26R','door/ign','MAZ26R','Mazda 2019+ (door/boot)',XR),
  tdef('MAZDA2024-SM','MAZDA2024','door/ign','MAZDA2024','Mazda 2024+ (CX-30, smart keyway)',XR),
  tdef('TOY2018','TOY2018','door/ign','TOY2018','Toyota 2018+ keyway',XR),
  tdef('TOY(2014) V.2','TOY2014','door/ign','TOY2014','Toyota 2014 keyway',XR),
  tdef('TOY40','TOY40','door/ign','TOY40','Lexus / Toyota (long, quad lifter)',XR),
  tdef('TOY51','TOY51','door/ign','TOY51','Toyota',XR),
  tdef('TOY2T v.5','TOY2T','door/ign','TOY2T','Toyota/Lexus (80K-series 2-track)',XR),
  tdef('DAT17','DAT17','door/ign','DAT17','Subaru',XR),
  tdef('YM15','YM15','door/ign','YM15','Mercedes Sprinter (10-cut)',XR),
  tdef('HU36','HU36','door/ign','HU36','Mercedes (ignition/door/trunk)',XR),
  tdef('HU23/MB18','HU23','door/ign','HU23','Classic Mercedes-Benz (ignition & door)',XR),
  tdef('HU83','HU83','door/ign','HU83','Peugeot / Citroën / Fiat / Mini Cooper (2004-2010) / MAN — 2-track 8-cut','Verified: classiclishi.com/product/classic-lishi-hu83 (2026-06-15)'),
  tdef('HU134','HU134','door/ign','HU134','Kia Venga 2010+ / Suzuki',XR),
  tdef('SIP16','SIP16','door/ign','SIP16','Fiat/Alfa/Maserati/Lancia (twin lifter)',XR),
  tdef('WT47T','WT47T','door/ign','WT47T','Saab (4-track)',XR),
  tdef('HI1','HI1','door/ign','HI1','Hino trucks',XR),
  tdef('ISU5/B113','ISU5','door/ign','ISU5','Isuzu trucks (NPR)',XR),
  tdef('GM25R','GM25R','door/ign','GM25R','Kenworth / Briggs & Stratton trucks (twin lifter)',XR),
  tdef('VNL-2024','VNL2024','door/ign','VNL2024','Volvo VNL trucks 2024+ (7-cut)',XR)
];
const ALL_TOOLS = LISHI_OFFICIAL.concat(CROSSREF_ADD);   // authoritative + cross-ref additions

/* ---- many more vehicles (compact: per-make transponder/programming defaults) ---- */
const MK={
  Ford:{t:'Ford 128-bit (PATS)',p:'OBD: AutoProPad/Autel'}, Lincoln:{t:'Ford 128-bit (PATS)',p:'OBD: AutoProPad/Autel'},
  Chevrolet:{t:'GM Hitag2 (8-cut)',p:'OBD: AutoProPad/Autel'}, GMC:{t:'GM Hitag2 (8-cut)',p:'OBD: AutoProPad/Autel'},
  Buick:{t:'GM Hitag2 (8-cut)',p:'OBD: AutoProPad/Autel'}, Cadillac:{t:'GM Hitag2 (8-cut)',p:'OBD: AutoProPad/Autel'},
  Toyota:{t:'Toyota G/H chip',p:'OBD; AKL on H-chip may need dealer/emulator'}, Lexus:{t:'Toyota G (smart)',p:'OBD; smart system'},
  Scion:{t:'Toyota 4D/G',p:'OBD'}, Honda:{t:'Honda G / ID46',p:'OBD'}, Acura:{t:'Honda G / ID46',p:'OBD'},
  Nissan:{t:'Nissan Hitag2',p:'OBD; PIN/BCM code required'}, Infiniti:{t:'Nissan Hitag2',p:'OBD; PIN/BCM code required'},
  Dodge:{t:'Chrysler 4A',p:'OBD; PIN often required'}, Chrysler:{t:'Chrysler 4A',p:'OBD; PIN often required'},
  Jeep:{t:'Chrysler 4A',p:'OBD; PIN often required'}, Ram:{t:'Chrysler 4A',p:'OBD; PIN often required'},
  Volkswagen:{t:'VAG (Megamos/MQB by year)',p:'OBD pre-MQB; MQB advanced/dealer'}, Audi:{t:'VAG (Megamos/MQB by year)',p:'OBD pre-MQB; MQB advanced/dealer'},
  Hyundai:{t:'Hyundai 8A / Texas DST',p:'OBD'}, Kia:{t:'Kia 8A / Texas DST',p:'OBD'},
  Mazda:{t:'Mazda 4D/G',p:'OBD'}, Subaru:{t:'Subaru G',p:'OBD'}, Mitsubishi:{t:'Mitsubishi 8A',p:'OBD'}, Volvo:{t:'Volvo (CEM)',p:'Advanced tools / dealer'}
};
function vm(make,model,ys,ye,keyway,o){ o=o||{}; const d=MK[make]||{t:'',p:''};
  return {make,model,year_start:String(ys),year_end:String(ye),keyway,coded:o.coded||'Yes',
    door_location:o.door||'Driver door',can_pick_ignition:o.pick||'Yes',transponder_system:o.t||d.t,
    programming_path:o.p||d.p,oem_only:o.oem||'No',nastf_required:o.nastf||'No',code_series:o.code_series||'',notes:o.notes||'',
    source:'Cross-ref: LockPickWorld/CLK/UHS lists (2026-06-15)'}; }
const P={pick:'N/A'};   // proximity / push-to-start: no mechanical ignition cylinder to pick

/* ---- per-brand model catalog (drives the dropdowns; [model, yearStart, yearEnd]).
   Year-filtered so e.g. a Crown Victoria (ends 2011) never shows for a 2024 lookup. ---- */
const MODELS={
  Ford:[['F-150',1997,2025],['F-250/350',1999,2025],['F-450',2017,2025],['Ranger',2019,2025],['Maverick',2022,2025],['Bronco',2021,2025],['Bronco Sport',2021,2025],['Escape',2001,2025],['Edge',2007,2024],['Explorer',2002,2025],['Expedition',1997,2025],['Fusion',2006,2020],['Focus',2000,2018],['Fiesta',2011,2019],['Taurus',1996,2019],['Mustang',1996,2025],['Mustang Mach-E',2021,2025],['EcoSport',2018,2022],['Transit',2015,2025],['Transit Connect',2010,2023],['Flex',2009,2019],['Crown Victoria',1998,2011],['C-Max',2013,2018]],
  Lincoln:[['Navigator',1998,2025],['Aviator',2003,2025],['Nautilus',2019,2025],['Corsair',2020,2025],['MKZ',2007,2020],['MKX',2007,2018],['MKC',2015,2019],['MKS',2009,2016],['MKT',2010,2019],['Continental',2017,2020],['Town Car',1998,2011]],
  Chevrolet:[['Silverado 1500',1999,2025],['Silverado 2500/3500',2001,2025],['Colorado',2004,2025],['Tahoe',1995,2025],['Suburban',1995,2025],['Traverse',2009,2025],['Equinox',2005,2025],['Blazer',2019,2025],['Trax',2013,2025],['Trailblazer',2021,2025],['Malibu',1997,2025],['Impala',2000,2020],['Cruze',2011,2019],['Sonic',2012,2020],['Spark',2013,2022],['Camaro',2010,2024],['Corvette',1997,2025],['Bolt EV',2017,2023],['Volt',2011,2019],['Express',1996,2025],['Cobalt',2005,2010],['HHR',2006,2011]],
  GMC:[['Sierra 1500',1999,2025],['Sierra 2500/3500',2001,2025],['Canyon',2004,2025],['Yukon',1995,2025],['Acadia',2007,2025],['Terrain',2010,2025],['Savana',1996,2025],['Hummer EV',2022,2025]],
  Buick:[['Enclave',2008,2025],['Encore',2013,2022],['Encore GX',2020,2025],['Envision',2016,2025],['Envista',2024,2025],['LaCrosse',2005,2019],['Regal',2011,2020],['Verano',2012,2017],['Lucerne',2006,2011]],
  Cadillac:[['Escalade',1999,2025],['XT4',2019,2025],['XT5',2017,2025],['XT6',2020,2025],['CT4',2020,2025],['CT5',2020,2025],['CT6',2016,2020],['ATS',2013,2019],['CTS',2003,2019],['SRX',2004,2016],['XTS',2013,2019],['DTS',2006,2011],['Lyriq',2023,2025]],
  Toyota:[['Camry',1992,2025],['Corolla',1993,2025],['RAV4',1996,2025],['Tacoma',1995,2025],['Tundra',2000,2025],['Highlander',2001,2025],['4Runner',1990,2025],['Sequoia',2001,2025],['Sienna',1998,2025],['Prius',2001,2025],['Avalon',1995,2022],['Yaris',2006,2020],['C-HR',2018,2022],['Venza',2009,2024],['Corolla Cross',2022,2025],['Supra',2020,2025],['GR86',2017,2025],['Land Cruiser',1990,2025],['Matrix',2003,2013],['Solara',1999,2008]],
  Lexus:[['ES',1990,2025],['IS',2001,2025],['GS',1993,2020],['LS',1990,2025],['RX',1999,2025],['GX',2003,2025],['LX',1996,2025],['NX',2015,2025],['UX',2019,2025],['RC',2015,2025],['RZ',2023,2025],['CT',2011,2017]],
  Scion:[['tC',2005,2016],['xB',2004,2015],['xD',2008,2014],['xA',2004,2006],['FR-S',2013,2016],['iA',2016,2016],['iM',2016,2016]],
  Honda:[['Civic',1996,2025],['Accord',1990,2025],['CR-V',1997,2025],['Pilot',2003,2025],['Odyssey',1995,2025],['HR-V',2016,2025],['Passport',2019,2025],['Ridgeline',2006,2025],['Fit',2007,2020],['Insight',2010,2022],['Element',2003,2011],['CR-Z',2011,2016],['Crosstour',2010,2015],['Prologue',2024,2025]],
  Acura:[['MDX',2001,2025],['RDX',2007,2025],['TLX',2015,2025],['ILX',2013,2022],['TL',1996,2014],['TSX',2004,2014],['RL',1996,2012],['RLX',2014,2020],['ZDX',2010,2013],['Integra',2023,2025],['NSX',2017,2022]],
  Nissan:[['Altima',1993,2025],['Sentra',1995,2025],['Maxima',1995,2023],['Versa',2007,2025],['Rogue',2008,2025],['Murano',2003,2025],['Pathfinder',1996,2025],['Frontier',1998,2025],['Titan',2004,2024],['Armada',2004,2025],['Kicks',2018,2025],['Juke',2011,2017],['Leaf',2011,2025],['370Z',2009,2020],['Z',2023,2025],['GT-R',2009,2025],['Quest',2004,2017]],
  Infiniti:[['Q50',2014,2025],['Q60',2014,2022],['QX50',2014,2025],['QX55',2022,2025],['QX60',2014,2025],['QX80',2014,2025],['G35',2003,2007],['G37',2008,2013],['FX35/QX70',2003,2017],['M/Q70',2006,2019]],
  Dodge:[['Charger',2006,2023],['Challenger',2008,2023],['Durango',1998,2025],['Journey',2009,2020],['Grand Caravan',1990,2020],['Dart',2013,2016],['Avenger',2008,2014],['Caliber',2007,2012],['Nitro',2007,2012],['Hornet',2023,2025]],
  Chrysler:[['300',2005,2023],['Pacifica',2017,2025],['Town & Country',1990,2016],['Voyager',2020,2025],['200',2011,2017],['Sebring',1995,2010],['PT Cruiser',2001,2010]],
  Jeep:[['Wrangler',1997,2025],['Grand Cherokee',1993,2025],['Cherokee',2014,2023],['Compass',2007,2025],['Renegade',2015,2025],['Gladiator',2020,2025],['Patriot',2007,2017],['Liberty',2002,2012],['Commander',2006,2010],['Grand Wagoneer',2022,2025],['Wagoneer',2022,2025]],
  Ram:[['1500',1994,2025],['2500/3500',1994,2025],['ProMaster',2014,2025],['ProMaster City',2015,2022],['Dakota',1997,2011]],
  Volkswagen:[['Jetta',1990,2025],['Passat',1990,2022],['Golf',1990,2021],['GTI',2006,2025],['Tiguan',2009,2025],['Atlas',2018,2025],['Atlas Cross Sport',2020,2025],['Taos',2022,2025],['Beetle',1998,2019],['Touareg',2004,2017],['CC',2009,2017],['Arteon',2019,2023],['ID.4',2021,2025]],
  Audi:[['A3',2006,2025],['A4',1996,2025],['A5',2008,2025],['A6',1995,2025],['A7',2012,2025],['A8',1997,2025],['Q3',2015,2025],['Q5',2009,2025],['Q7',2007,2025],['Q8',2019,2025],['e-tron',2019,2025],['Q4 e-tron',2022,2025],['TT',2000,2023]],
  Hyundai:[['Elantra',1992,2025],['Sonata',1990,2025],['Accent',1995,2022],['Tucson',2005,2025],['Santa Fe',2001,2025],['Santa Cruz',2022,2025],['Palisade',2020,2025],['Kona',2018,2025],['Veloster',2012,2022],['Venue',2020,2025],['Ioniq',2017,2022],['Ioniq 5',2022,2025],['Ioniq 6',2023,2025],['Genesis',2009,2016],['Azera',2006,2017],['Veracruz',2007,2012]],
  Kia:[['Optima',2001,2020],['K5',2021,2025],['Forte',2010,2025],['Soul',2010,2025],['Sportage',2005,2025],['Sorento',2003,2025],['Telluride',2020,2025],['Seltos',2021,2025],['Niro',2017,2025],['Rio',2001,2025],['Carnival',2022,2025],['Sedona',2002,2021],['Stinger',2018,2023],['Cadenza',2014,2020],['EV6',2022,2025],['Soul EV',2015,2025]],
  Mazda:[['Mazda3',2004,2025],['Mazda6',2003,2021],['CX-5',2013,2025],['CX-30',2020,2025],['CX-9',2007,2023],['CX-50',2023,2025],['CX-90',2024,2025],['CX-3',2016,2021],['MX-5 Miata',1990,2025],['CX-7',2007,2012],['Tribute',2001,2011],['Mazda5',2006,2015],['RX-8',2004,2011]],
  Subaru:[['Outback',1995,2025],['Forester',1998,2025],['Impreza',1993,2025],['Crosstrek',2013,2025],['Legacy',1990,2025],['Ascent',2019,2025],['WRX',2015,2025],['BRZ',2013,2025],['Solterra',2023,2025],['Baja',2003,2006],['Tribeca',2006,2014]],
  Mitsubishi:[['Outlander',2003,2025],['Outlander Sport',2011,2025],['Eclipse Cross',2018,2025],['Mirage',2014,2025],['Lancer',2002,2017],['Eclipse',1995,2012],['Galant',1994,2012],['Endeavor',2004,2011],['Montero',1992,2006]],
  BMW:[['3 Series',1996,2025],['5 Series',1996,2025],['7 Series',1995,2025],['X1',2013,2025],['X3',2004,2025],['X5',2000,2025],['X7',2019,2025],['4 Series',2014,2025],['2 Series',2014,2025],['X4',2015,2025],['X6',2008,2025],['1 Series',2008,2013],['Z4',2003,2025],['i4',2022,2025],['iX',2022,2025],['8 Series',2019,2025]],
  'Mercedes-Benz':[['C-Class',1994,2025],['E-Class',1996,2025],['S-Class',1992,2025],['GLC',2016,2025],['GLE',2016,2025],['GLA',2015,2025],['GLB',2020,2025],['GLS',2017,2025],['A-Class',2019,2022],['CLA',2014,2025],['GLK',2010,2015],['ML',1998,2015],['Sprinter',2007,2025],['Metris',2016,2023],['CLS',2006,2023]],
  Volvo:[['XC90',2003,2025],['XC60',2010,2025],['XC40',2019,2025],['S60',2001,2025],['S90',2017,2025],['V60',2015,2025],['V90',2017,2025],['S40',2000,2011],['XC70',2003,2016],['C30',2008,2013],['S80',1999,2016]]
};
/* keyway by make + era (used when no verified row exists → tagged "matched by keyway") */
function inferKeyway(make,year){
  year=Number(year)||2025;
  switch(make){
    case 'Ford': case 'Lincoln': return year<2012?'FO38':'HU101';
    case 'Chevrolet': case 'GMC': case 'Buick': case 'Cadillac': return year<2010?'B102':'HU100';
    case 'Toyota': case 'Lexus': return year<2004?'TOY43':'TOY48';
    case 'Scion': return 'TOY43';
    case 'Honda': case 'Acura': return year<2003?'HON58R':'HON66';
    case 'Nissan': case 'Infiniti': return 'NSN14';
    case 'Dodge': case 'Chrysler': case 'Jeep': case 'Ram': return 'CY24';
    case 'Volkswagen': case 'Audi': return year<2015?'HU66':'HU162';
    case 'Hyundai': case 'Kia': return year<2011?'HY15':'HY20';
    case 'Mazda': return 'MAZ24';
    case 'Subaru': return 'DAT12R';
    case 'Mitsubishi': return 'MIT8';
    case 'BMW': return year<2012?'HU92':'HU100R';
    case 'Mercedes-Benz': return 'HU64';
    case 'Volvo': return year<2008?'NE66':'HU101';
    default: return '';
  }
}
const EXTRA_VEH=[
  // Ford / Lincoln
  vm('Ford','Edge','2011','2020','HU101'), vm('Ford','Ranger','2019','2023','HU101'),
  vm('Ford','Expedition','2015','2022','HU101'), vm('Ford','Transit','2015','2023','HU101'),
  vm('Ford','Taurus','2010','2019','HU101'), vm('Ford','Fiesta','2011','2019','HU101'),
  vm('Ford','EcoSport','2018','2022','HU101'), vm('Ford','Bronco Sport','2021','2023','HU101'),
  vm('Ford','Maverick','2022','2023','HU101'), vm('Ford','F-150','2004','2008','FO38',{notes:'Older 8-cut'}),
  vm('Lincoln','Navigator','2015','2022','HU101',P), vm('Lincoln','Nautilus','2019','2023','HU101',P),
  // Chevrolet / GMC / Buick / Cadillac
  vm('Chevrolet','Traverse','2009','2017','HU100'), vm('Chevrolet','Tahoe','2015','2020','HU100'),
  vm('Chevrolet','Suburban','2015','2020','HU100'), vm('Chevrolet','Trax','2015','2022','HU100'),
  vm('Chevrolet','Sonic','2012','2020','HU100'), vm('Chevrolet','Colorado','2015','2022','HU100'),
  vm('Chevrolet','Express','2010','2022','B111',{notes:'Van'}), vm('Chevrolet','Silverado 2500/3500','2015','2019','HU100'),
  vm('GMC','Terrain','2010','2017','HU100'), vm('GMC','Acadia','2007','2016','HU100'),
  vm('GMC','Yukon','2015','2020','HU100'), vm('GMC','Canyon','2015','2022','HU100'),
  vm('Buick','Encore','2013','2022','HU100'), vm('Buick','LaCrosse','2010','2016','HU100'),
  vm('Buick','Regal','2011','2017','HU100'), vm('Cadillac','ATS','2013','2019','HU100'),
  vm('Cadillac','CTS','2014','2019','HU100'), vm('Cadillac','XT5','2017','2022','HU100',P),
  vm('Cadillac','SRX','2010','2016','HU100'),
  // Toyota / Lexus / Scion
  vm('Toyota','Sienna','2011','2020','TOY48'), vm('Toyota','Prius','2010','2015','TOY48',P),
  vm('Toyota','4Runner','2010','2023','TOY48'), vm('Toyota','Sequoia','2008','2022','TOY48'),
  vm('Toyota','Yaris','2012','2018','TOY43'), vm('Toyota','Avalon','2013','2018','TOY48'),
  vm('Toyota','C-HR','2018','2022','TOY48'), vm('Toyota','Venza','2009','2015','TOY48'),
  vm('Toyota','Camry','2007','2011','TOY43',{notes:'Older'}),
  vm('Lexus','ES350','2013','2018','TOY48',P), vm('Lexus','GX460','2010','2022','TOY48',P),
  vm('Lexus','IS250/350','2006','2013','TOY48'), vm('Lexus','NX','2015','2021','TOY48',P),
  vm('Scion','tC','2008','2016','TOY43'), vm('Scion','xB','2008','2015','TOY43'),
  // Honda / Acura
  vm('Honda','Odyssey','2011','2017','HON66'), vm('Honda','Fit','2009','2020','HON66'),
  vm('Honda','HR-V','2016','2022','HON66'), vm('Honda','Ridgeline','2006','2023','HON66'),
  vm('Honda','Passport','2019','2023','HON66'), vm('Honda','Insight','2019','2022','HON66'),
  vm('Acura','MDX','2007','2020','HON66',P), vm('Acura','RDX','2013','2020','HON66',P),
  vm('Acura','ILX','2013','2022','HON66'), vm('Acura','TSX','2009','2014','HON66'),
  // Nissan / Infiniti
  vm('Nissan','Maxima','2009','2018','DA34'), vm('Nissan','Murano','2009','2020','DA34',P),
  vm('Nissan','Pathfinder','2013','2020','DA34',P), vm('Nissan','Frontier','2005','2019','DA34'),
  vm('Nissan','Titan','2016','2022','DA34'), vm('Nissan','Versa','2012','2019','DA34'),
  vm('Nissan','Kicks','2018','2022','DA34'), vm('Nissan','Armada','2017','2022','DA34',P),
  vm('Nissan','Juke','2011','2017','DA34'), vm('Infiniti','Q50','2014','2022','DA34',P),
  vm('Infiniti','QX60','2014','2020','DA34',P),
  // Chrysler / Dodge / Jeep / Ram
  vm('Dodge','Durango','2011','2023','CY24',P), vm('Dodge','Challenger','2011','2023','CY24'),
  vm('Dodge','Grand Caravan','2008','2020','CY24'), vm('Chrysler','Pacifica','2017','2023','CY24',P),
  vm('Chrysler','Town & Country','2008','2016','CY24'), vm('Jeep','Cherokee','2014','2022','CY24',P),
  vm('Jeep','Compass','2017','2022','CY24'), vm('Jeep','Renegade','2015','2022','CY24'),
  vm('Jeep','Patriot','2007','2017','CY24'), vm('Ram','2500/3500','2013','2018','CY24'),
  vm('Ram','ProMaster','2014','2022','CY24'),
  // VW / Audi
  vm('Volkswagen','Passat','2012','2019','HU66'), vm('Volkswagen','Tiguan','2009','2017','HU66'),
  vm('Volkswagen','Tiguan','2018','2023','HU162T',{oem:'Yes',notes:'MQB'}), vm('Volkswagen','Atlas','2018','2023','HU162T',{oem:'Yes',notes:'MQB'}),
  vm('Volkswagen','Beetle','2012','2019','HU66'), vm('Audi','A3','2015','2020','HU162T',{oem:'Yes',notes:'MQB'}),
  vm('Audi','A6','2012','2018','HU66',P), vm('Audi','Q7','2017','2023','HU162T',{oem:'Yes',notes:'MQB'}),
  // Hyundai / Kia
  vm('Hyundai','Tucson','2016','2021','HY20'), vm('Hyundai','Santa Fe','2013','2018','HY20'),
  vm('Hyundai','Accent','2012','2017','HY15'), vm('Hyundai','Kona','2018','2022','HY20'),
  vm('Hyundai','Veloster','2012','2018','HY20'), vm('Kia','Soul','2014','2019','HY20'),
  vm('Kia','Forte','2014','2018','HY20'), vm('Kia','Sportage','2017','2022','HY20'),
  vm('Kia','Sedona','2015','2021','HY20'), vm('Kia','Rio','2012','2017','HY15'),
  vm('Kia','Telluride','2020','2023','HY20',P),
  // Mazda / Subaru / Mitsubishi / Volvo
  vm('Mazda','CX-9','2016','2022','MAZ24',P), vm('Mazda','CX-3','2016','2021','MAZ24'),
  vm('Mazda','Mazda6','2014','2021','MAZ24'), vm('Mazda','MX-5 Miata','2016','2022','MAZ24'),
  vm('Subaru','Impreza','2012','2019','DAT17'), vm('Subaru','Crosstrek','2013','2022','DAT17'),
  vm('Subaru','Legacy','2015','2019','DAT17'), vm('Subaru','Ascent','2019','2022','DAT17',P),
  vm('Subaru','WRX','2015','2021','DAT17'), vm('Mitsubishi','Eclipse Cross','2018','2022','MIT11'),
  vm('Mitsubishi','Mirage','2014','2022','MIT8'), vm('Mitsubishi','Lancer','2008','2017','MIT8'),
  vm('Volvo','XC60','2010','2017','HU56',P), vm('Volvo','XC90','2016','2022','HU101',P)
];
/* ---- current-generation rows (2018–2025), fills the recent-year gap ---- */
const EXTRA_VEH2=[
  vm('Cadillac','Escalade','2021','2025','HU100',P), vm('Cadillac','XT4','2019','2025','HU100',P),
  vm('Cadillac','XT5','2021','2025','HU100',P), vm('Cadillac','XT6','2020','2025','HU100',P),
  vm('Cadillac','CT4','2020','2025','HU100',P), vm('Cadillac','CT5','2020','2025','HU100',P),
  vm('Chevrolet','Silverado 1500','2019','2025','HU100'), vm('Chevrolet','Tahoe','2021','2025','HU100',P),
  vm('Chevrolet','Suburban','2021','2025','HU100',P), vm('Chevrolet','Equinox','2018','2025','HU100'),
  vm('Chevrolet','Traverse','2018','2025','HU100'), vm('Chevrolet','Malibu','2016','2024','HU100'),
  vm('Chevrolet','Trailblazer','2021','2025','HU100'), vm('Chevrolet','Blazer','2019','2025','HU100',P),
  vm('Chevrolet','Colorado','2023','2025','HU100'), vm('Chevrolet','Trax','2021','2025','HU100'),
  vm('GMC','Sierra 1500','2019','2025','HU100'), vm('GMC','Yukon','2021','2025','HU100',P),
  vm('GMC','Terrain','2018','2025','HU100'), vm('GMC','Acadia','2017','2025','HU100'),
  vm('GMC','Canyon','2023','2025','HU100'), vm('Buick','Encore GX','2020','2025','HU100'),
  vm('Buick','Envision','2021','2025','HU100',P), vm('Buick','Enclave','2018','2025','HU100',P),
  vm('Ford','F-150','2021','2025','HU101'), vm('Ford','Super Duty','2023','2025','HU101'),
  vm('Ford','Explorer','2020','2025','HU101',P), vm('Ford','Escape','2020','2025','HU101'),
  vm('Ford','Bronco','2021','2025','HU101'), vm('Ford','Edge','2021','2024','HU101'),
  vm('Ford','Maverick','2022','2025','HU101'),
  vm('Toyota','Camry','2018','2024','TOY48'), vm('Toyota','Corolla','2020','2025','TOY48'),
  vm('Toyota','RAV4','2019','2025','TOY48'), vm('Toyota','Highlander','2020','2025','TOY48',P),
  vm('Toyota','Tundra','2022','2025','TOY48',P), vm('Toyota','Tacoma','2024','2025','TOY48',P),
  vm('Toyota','Sienna','2021','2025','TOY48',P),
  vm('Honda','Civic','2016','2025','HON66'), vm('Honda','Accord','2018','2025','HON66'),
  vm('Honda','CR-V','2017','2025','HON66'), vm('Honda','Pilot','2016','2025','HON66'),
  vm('Honda','HR-V','2023','2025','HON66'),
  vm('Nissan','Altima','2019','2025','DA34'), vm('Nissan','Rogue','2021','2025','DA34',P),
  vm('Nissan','Sentra','2020','2025','DA34'), vm('Nissan','Frontier','2022','2025','DA34'),
  vm('Nissan','Pathfinder','2022','2025','DA34',P),
  vm('Hyundai','Elantra','2021','2025','HY20'), vm('Hyundai','Tucson','2022','2025','HY20',P),
  vm('Hyundai','Santa Fe','2019','2025','HY20',P), vm('Kia','Sportage','2023','2025','HY20',P),
  vm('Kia','Sorento','2021','2025','HY20',P), vm('Kia','Forte','2019','2025','HY20'),
  vm('Jeep','Wrangler','2018','2025','CY24'), vm('Jeep','Gladiator','2020','2025','CY24'),
  vm('Jeep','Grand Cherokee','2022','2025','CY24',P), vm('Ram','1500','2019','2025','CY24'),
  vm('Subaru','Outback','2020','2025','DAT17'), vm('Subaru','Forester','2019','2025','DAT17'),
  vm('Subaru','Crosstrek','2018','2025','DAT17')
];
const ALL_VEH = SEED_VEH.concat(EXTRA_VEH).concat(EXTRA_VEH2);
const SEEDVER = 8;   // bump when SEED_* changes to merge new rows into existing installs

/* ---- Key CODE SERIES (the blind-code range used to cut keys by code), by vehicle.
   PUBLICLY-SOURCED ONLY — never guessed. Most modern high-security keys (HU101, B119…)
   don't publish a code series, so this list is intentionally sparse and grows as values
   are verified. applyCodeSeries() fills a matching vehicle row's empty code_series; it
   NEVER overwrites a value the owner typed in the Lishi editor. ---- */
const CODE_SERIES_SRC=[
  // Hand-read from the 2025 Ilco ref for common models the bulk extract dropped:
  // Group 1 (owner-confirmed platform codes):
  {make:'Chrysler', model:'300', ys:2011, ye:2023, series:'M1-M2618', src:'Owner'},
  {make:'Ram', model:'1500', ys:2019, ye:2025, series:'M1-M2618', src:'Owner'},
  {make:'Ram', model:'2500/3500', ys:2013, ye:2018, series:'M1-M2618', src:'Owner'},
  {make:'GMC', model:'Yukon', ys:2021, ye:2025, series:'V0001-V5573', src:'Owner'},
  {make:'GMC', model:'Canyon', ys:2015, ye:2022, series:'Z0001-Z6314', src:'Owner'},
  {make:'GMC', model:'Canyon', ys:2023, ye:2025, series:'Z0001-Z6314', src:'Owner'},
  {make:'GMC', model:'Acadia', ys:2007, ye:2016, series:'Z0001-Z6314 / V0001-V5573', note:'8-cut Z / 10-cut V — check key', src:'Owner'},
  // Toyota is by blade (owner): TR47/TOY43 10-cut=50000-69999, TOY48=40000-49999, TOY40 prox=80000-89999
  {make:'Toyota', model:'Camry', ys:2002, ye:2006, series:'50000-69999', note:'TR47/TOY43 10-cut', src:'Owner'},
  {make:'Scion', model:'tC', ys:2008, ye:2016, series:'50000-69999', note:'TOY43', src:'Owner'},
  {make:'Toyota', model:'Prius', ys:2010, ye:2015, series:'40000-49999 / 80000-89999', note:'TOY48 / TOY40 prox', src:'Owner'},
  {make:'Toyota', model:'C-HR', ys:2018, ye:2022, series:'40000-49999 / 80000-89999', note:'TOY48 / TOY40 prox', src:'Owner'},
  {make:'Toyota', model:'Tacoma', ys:2024, ye:2025, series:'40000-49999 / 80000-89999', note:'TOY48 / TOY40 prox', src:'Owner'},
  {make:'Ram', model:'ProMaster', ys:2014, ye:2022, series:'M0001-M2618', note:'CY24', src:'Owner'},
  {make:'Toyota', model:'Camry', ys:2018, ye:2024, series:'80000-89999', src:'Ilco 2025'},
  {make:'Toyota', model:'Highlander', ys:2014, ye:2019, series:'40000-49999', src:'Ilco 2025'},
  {make:'Toyota', model:'Highlander', ys:2020, ye:2025, series:'50000-69999', src:'Ilco 2025'},
  {make:'Toyota', model:'Avalon', ys:2013, ye:2018, series:'80000-89999', src:'Ilco 2025'},
  {make:'GMC', model:'Acadia', ys:2017, ye:2025, series:'V0001-V5573', src:'Ilco 2025'},
  {make:'Honda', model:'Accord', ys:2018, ye:2025, series:'K001-N718', src:'Ilco 2025'},
  // Second pass — read from 2025 PDF/xlsx for models the bulk match missed:
  {make:'Chevrolet', model:'Silverado 2500/3500', ys:2015, ye:2019, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Lexus', model:'IS250/350', ys:2006, ye:2013, series:'40000-49999 / 80000-89999', card:'950, 3102', src:'Ilco 2025'},
  {make:'Dodge', model:'Grand Caravan', ys:2008, ye:2020, series:'M1-M2618', card:'745', src:'Ilco 2025'},
  {make:'Subaru', model:'WRX', ys:2015, ye:2021, series:'32000-39999', card:'3646', src:'Ilco 2025'},
  {make:'Cadillac', model:'CT5', ys:2020, ye:2025, series:'Z0001-Z6314', card:'2200', src:'Ilco 2025'},
  {make:'Ford', model:'Super Duty', ys:2023, ye:2025, series:'10001-11500', card:'1838', src:'Ilco 2025'},
  {make:'Cadillac', model:'XT4', ys:2019, ye:2025, series:'V0001-V5718', src:'Ilco 2025'},
  {make:'Cadillac', model:'XT5', ys:2017, ye:2022, series:'V0001-V5718', src:'Ilco 2025'},
  {make:'Cadillac', model:'XT5', ys:2021, ye:2025, series:'V0001-V5718', src:'Ilco 2025'},
  {make:'Cadillac', model:'XT6', ys:2020, ye:2025, series:'V0001-V5718', src:'Ilco 2025'},
  {make:'Scion', model:'xB', ys:2008, ye:2015, series:'50000-69999', src:'Ilco 2025'},
  {make:'Subaru', model:'Ascent', ys:2019, ye:2022, series:'70000-79999', src:'Ilco 2025'},
  // Subaru rule per owner (locksmith): non-prox 32000-39999; prox 70000-79999 (’13+) or 90000-99999 (’16+)
  {make:'Subaru', model:'Forester', ys:2014, ye:2018, series:'32000-39999 / 70000-79999 / 90000-99999', note:'non-prox 32000 · prox 70000(13+)/90000(16+)', src:'Owner'},
  {make:'Subaru', model:'Forester', ys:2019, ye:2025, series:'32000-39999 / 70000-79999 / 90000-99999', note:'non-prox 32000 · prox 70000/90000', src:'Owner'},
  {make:'Subaru', model:'Crosstrek', ys:2013, ye:2022, series:'32000-39999 / 70000-79999 / 90000-99999', note:'non-prox 32000 · prox 70000(13+)/90000(16+)', src:'Owner'},
  {make:'Subaru', model:'Crosstrek', ys:2018, ye:2025, series:'32000-39999 / 70000-79999 / 90000-99999', note:'non-prox 32000 · prox 70000/90000', src:'Owner'},
  {make:'Ford', model:'F-150', ys:2015, ye:2020, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'F-250/350', ys:2017, ye:2022, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Focus', ys:2012, ye:2018, series:'10001-11500 / 11501-13000', card:'1838, 3497', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Fusion', ys:2013, ye:2020, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Escape', ys:2013, ye:2019, series:'10001-11500 / 11501-13000', card:'1838, 3497', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Explorer', ys:2011, ye:2019, series:'1X-1706X / 10001-11500 / 1-4000', card:'1838, 612', note:'Texas Instruments Encrypted Code System', src:'Ilco 2025'},
  {make:'Ford', model:'Mustang', ys:2015, ye:2023, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Crown Victoria', ys:1998, ye:2011, series:'1X-1706X', card:'612', note:'Texas Instruments (4C) Encrypted System', src:'Ilco 2025'},
  {make:'Lincoln', model:'MKZ', ys:2013, ye:2020, series:'1X-1706X / 10001-11500', card:'1838, 612', note:'Texas Instruments 80 Bit Encrypted System', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Silverado 1500', ys:2014, ye:2018, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Malibu', ys:2013, ye:2020, series:'Z0001-Z6314 / G0000-G3631 / V0001-V5718', card:'2020, 2200, 3647', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Equinox', ys:2010, ye:2017, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Cruze', ys:2011, ye:2019, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Camaro', ys:2010, ye:2015, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'GMC', model:'Sierra 1500', ys:2014, ye:2018, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Buick', model:'Enclave', ys:2008, ye:2017, series:'G0000-G3631', card:'2020', note:'Circle +, Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Cadillac', model:'Escalade', ys:2015, ye:2020, series:'V0001-V5718', card:'3647', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Impala', ys:2006, ye:2013, series:'G0000-G3631', card:'2020', note:'Circle +, Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Toyota', model:'Corolla', ys:2014, ye:2019, series:'50000-69999 / 40000-49999', card:'1420, 950', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'RAV4', ys:2013, ye:2018, series:'50000-69999', card:'1420', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'Tacoma', ys:2016, ye:2023, series:'50000-69999 / 80000-89999', card:'1420, 3102', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'Tundra', ys:2014, ye:2021, series:'50000-69999 / 80000-89999', card:'1420, 3102', note:'Texas Instruments 80 Bit Encrypted System', src:'Ilco 2025'},
  {make:'Lexus', model:'RX350', ys:2010, ye:2015, series:'40000-49999', card:'950', note:'High Security Key, Texas Instruments (4D68) En', src:'Ilco 2025'},
  {make:'Honda', model:'Civic', ys:2006, ye:2015, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'CR-V', ys:2007, ye:2016, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'Pilot', ys:2009, ye:2015, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Acura', model:'TL', ys:2009, ye:2014, series:'K001-N718', card:'2354', note:'High Security Key. Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'Civic', ys:2001, ye:2005, series:'5001-8442 / K001-N718', card:'2354, 262', note:'Megamos (13) Fixed Code System', src:'Ilco 2025'},
  {make:'Dodge', model:'Charger', ys:2011, ye:2023, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Jeep', model:'Wrangler', ys:2007, ye:2018, series:'M1-M2618 / DE1-DE11210', card:'583, 745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Jeep', model:'Grand Cherokee', ys:2011, ye:2021, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Nissan', model:'Altima', ys:2013, ye:2018, series:'1-22185', card:'607', note:'Philips Crypto (47) Hitag3', src:'Ilco 2025'},
  {make:'Nissan', model:'Sentra', ys:2013, ye:2019, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Rogue', ys:2014, ye:2020, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Altima', ys:2002, ye:2006, series:'1-22185', card:'607', note:'Texas Instruments (4D60) Encrypted System', src:'Ilco 2025'},
  {make:'Infiniti', model:'G37', ys:2008, ye:2013, series:'40000-41520', card:'607', src:'Ilco 2025'},
  {make:'Hyundai', model:'Elantra', ys:2017, ye:2020, series:'M0001-M2500 / B0001-B3000 / T1001-T3500', card:'2503, 3336, 4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Hyundai', model:'Sonata', ys:2015, ye:2019, series:'K1-K2500', card:'2372', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Kia', model:'Optima', ys:2016, ye:2020, series:'D0001-D3000 / K1-K2500 / D1-D3000', card:'2372, 4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Sorento', ys:2016, ye:2020, series:'C1001-C3500 / UM1001-UM3500', card:'3618', note:'High Security Key', src:'Ilco 2025'},
  {make:'Mazda', model:'Mazda3', ys:2014, ye:2018, series:'10100-12283', card:'288', note:'Philips (47) Encrypted System', src:'Ilco 2025'},
  {make:'Mazda', model:'CX-5', ys:2013, ye:2016, series:'10100-12283', card:'288', note:'Texas Instruments (4D63) Encrypted System', src:'Ilco 2025'},
  {make:'Subaru', model:'Outback', ys:2015, ye:2019, series:'32000-39999 / 90000-99999', card:'3646, 3964', note:'Texas Instruments (82) Encrypted System', src:'Ilco 2025'},
  {make:'Mitsubishi', model:'Outlander', ys:2014, ye:2020, series:'30010-32009', card:'288', note:'Philips Encrypted System', src:'Ilco 2025'},
  {make:'BMW', model:'3 Series', ys:2006, ye:2011, series:'1-8100', card:'1842', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Edge', ys:2011, ye:2020, series:'1X-1706X / 10001-11500 / 1-4000', card:'1838, 612', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Ranger', ys:2019, ye:2023, series:'1-4000 / 10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Expedition', ys:2015, ye:2022, series:'1X-1706X / 10001-11500 / 1-4000', card:'1838, 612', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Transit', ys:2015, ye:2023, series:'10001-11500', card:'1838', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Ford', model:'Taurus', ys:2010, ye:2019, series:'1X-1706X', card:'612', note:'Texas Instruments (4D63) Encrypted Code System', src:'Ilco 2025'},
  {make:'Ford', model:'Fiesta', ys:2011, ye:2019, series:'10001-11500', card:'1838', note:'Texas Instruments (4D63) Encrypted Code System', src:'Ilco 2025'},
  {make:'Ford', model:'EcoSport', ys:2018, ye:2022, series:'10001-11500 / 1-4000', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Bronco Sport', ys:2021, ye:2023, series:'30001-31544', card:'4320', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Maverick', ys:2022, ye:2023, series:'30001-31544', card:'4320', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'F-150', ys:2004, ye:2008, series:'1X-1706X', card:'612', note:'Texas Instruments (4C) Encrypted System', src:'Ilco 2025'},
  {make:'Lincoln', model:'Navigator', ys:2015, ye:2022, series:'1X-1706X / 10001-11500', card:'1838, 612', note:'Texas Instruments 80 Bit Encrypted System', src:'Ilco 2025'},
  {make:'Lincoln', model:'Nautilus', ys:2019, ye:2023, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Traverse', ys:2009, ye:2017, series:'G0000-G3631', card:'2020', note:'Circle +, Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Tahoe', ys:2015, ye:2020, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Suburban', ys:2015, ye:2020, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Trax', ys:2015, ye:2022, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Sonic', ys:2012, ye:2020, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Colorado', ys:2015, ye:2022, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Express', ys:2010, ye:2022, series:'S000A-S999K / V0001-V5573', card:'3647, 567', note:'Circle +, Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'GMC', model:'Terrain', ys:2010, ye:2017, series:'Z0001-Z6314', card:'2200', src:'Ilco 2025'},
  {make:'GMC', model:'Yukon', ys:2015, ye:2020, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Buick', model:'Encore', ys:2013, ye:2022, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Buick', model:'LaCrosse', ys:2010, ye:2016, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Buick', model:'Regal', ys:2011, ye:2017, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Cadillac', model:'ATS', ys:2013, ye:2019, series:'Z0001-Z6314 / V0001-V5718', card:'2020, 3647', note:'Circle +, Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Cadillac', model:'CTS', ys:2014, ye:2019, series:'V0001-V5718', card:'3647', src:'Ilco 2025'},
  {make:'Cadillac', model:'SRX', ys:2010, ye:2016, series:'Z0001-Z6314 / V0001-V5718', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Toyota', model:'Sienna', ys:2011, ye:2020, series:'80000-89999 / 50000-69999', card:'1420, 3102', note:'Texas Instruments 80 Bit Encrypted System', src:'Ilco 2025'},
  {make:'Toyota', model:'Sequoia', ys:2008, ye:2022, series:'50000-69999 / 80000-89999', card:'1420, 3102', note:'Texas Instruments (4D67) Encrypted System', src:'Ilco 2025'},
  {make:'Toyota', model:'Yaris', ys:2012, ye:2018, series:'50000-69999 / 10100-12283', card:'1420, 288', note:'Texas Instruments 80 Bit Encrypted System', src:'Ilco 2025'},
  {make:'Toyota', model:'Venza', ys:2009, ye:2015, series:'40000-49999 / 50000-69999', card:'1420, 950', note:'Texas Instruments (4D67) Encrypted System', src:'Ilco 2025'},
  {make:'Lexus', model:'ES350', ys:2013, ye:2018, series:'80000-89999', card:'3102', note:'High Security Key', src:'Ilco 2025'},
  {make:'Lexus', model:'GX460', ys:2010, ye:2022, series:'80000-89999', card:'3102', note:'High Security Key', src:'Ilco 2025'},
  {make:'Lexus', model:'NX', ys:2015, ye:2021, series:'80000-89999', card:'3102', note:'High Security Key Texas Instruments 128 bit (4', src:'Ilco 2025'},
  {make:'Honda', model:'Odyssey', ys:2011, ye:2017, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'Fit', ys:2009, ye:2020, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'HR-V', ys:2016, ye:2022, series:'K001-N718', card:'2354', note:'Philips (47) Encrypted System', src:'Ilco 2025'},
  {make:'Honda', model:'Ridgeline', ys:2006, ye:2023, series:'K001-N718', card:'2354', note:'High Security Key, Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Honda', model:'Passport', ys:2019, ye:2023, series:'K001-N718', card:'2354', note:'High Security Key, Philips (49-1C) Encrypted S', src:'Ilco 2025'},
  {make:'Honda', model:'Insight', ys:2019, ye:2022, series:'K001-N718', card:'2354', src:'Ilco 2025'},
  {make:'Acura', model:'MDX', ys:2007, ye:2020, series:'K001-N718', card:'2354', note:'High Security Key. Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Acura', model:'RDX', ys:2013, ye:2020, series:'K001-N718', card:'2354', src:'Ilco 2025'},
  {make:'Acura', model:'ILX', ys:2013, ye:2022, series:'001-N718', card:'2354', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Acura', model:'TSX', ys:2009, ye:2014, series:'K001-N718', card:'2354', note:'High Security Key. Philips (46) Encrypted Syst', src:'Ilco 2025'},
  {make:'Nissan', model:'Maxima', ys:2009, ye:2018, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Murano', ys:2009, ye:2020, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder Key', src:'Ilco 2025'},
  {make:'Nissan', model:'Pathfinder', ys:2013, ye:2020, series:'1-22185', card:'607', note:'Philips Crypto (47) Hitag3', src:'Ilco 2025'},
  {make:'Nissan', model:'Frontier', ys:2005, ye:2019, series:'1-22185', card:'607', note:'Texas Instruments (4D60) Encrypted System', src:'Ilco 2025'},
  {make:'Nissan', model:'Titan', ys:2016, ye:2022, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Versa', ys:2012, ye:2019, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Kicks', ys:2018, ye:2022, series:'1-22185 / 1-221855', card:'607', note:'Philips Crypto (47) Hitag3', src:'Ilco 2025'},
  {make:'Nissan', model:'Armada', ys:2017, ye:2022, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Juke', ys:2011, ye:2017, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Infiniti', model:'Q50', ys:2014, ye:2022, series:'1-22185 / 40000-41520', card:'607', note:'Philips Crypto (46)Transponder key', src:'Ilco 2025'},
  {make:'Infiniti', model:'QX60', ys:2014, ye:2020, series:'1-22185 / 40000-41520', card:'607', note:'Philips Crypto (46)Transponder key', src:'Ilco 2025'},
  {make:'Dodge', model:'Durango', ys:2011, ye:2023, series:'M1-M2618', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Dodge', model:'Challenger', ys:2011, ye:2023, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Chrysler', model:'Pacifica', ys:2017, ye:2023, series:'M1-M2618', card:'745', src:'Ilco 2025'},
  {make:'Chrysler', model:'Town & Country', ys:2008, ye:2016, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Jeep', model:'Cherokee', ys:2014, ye:2022, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Jeep', model:'Compass', ys:2017, ye:2022, series:'M1-M2618 / DE1-DE11210', card:'583, 745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Jeep', model:'Renegade', ys:2015, ye:2022, series:'DE1-DE11210', card:'583', note:'Megamos Encrypted (48) System (128 Bit)', src:'Ilco 2025'},
  {make:'Jeep', model:'Patriot', ys:2007, ye:2017, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Hyundai', model:'Tucson', ys:2016, ye:2021, series:'K1-K2500 / D1-D3000', card:'2372, 4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Hyundai', model:'Santa Fe', ys:2013, ye:2018, series:'C1001-C3500', card:'3618', src:'Ilco 2025'},
  {make:'Hyundai', model:'Accent', ys:2012, ye:2017, series:'T1001-T3500', card:'3336', note:'High Security Key', src:'Ilco 2025'},
  {make:'Hyundai', model:'Kona', ys:2018, ye:2022, series:'H1-H2500 / B0001-B3000', card:'4129, 4362', note:'Texas Instruments 128 bit AES', src:'Ilco 2025'},
  {make:'Hyundai', model:'Veloster', ys:2012, ye:2018, series:'T1001-T3500 / B0001-B3000', card:'3336, 4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Soul', ys:2014, ye:2019, series:'K1-K2500 / E1-E2500 / B0001-B3000', card:'2372, 4129', note:'Texas Instruments (4D60) 80 Bit System', src:'Ilco 2025'},
  {make:'Kia', model:'Forte', ys:2014, ye:2018, series:'WD1001-WD3500', card:'3003', src:'Ilco 2025'},
  {make:'Kia', model:'Sportage', ys:2017, ye:2022, series:'K1-K2500 / D1-D3000 / B0001-B3000', card:'2372, 4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Sedona', ys:2015, ye:2021, series:'K1-K2500', card:'2372', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Rio', ys:2012, ye:2017, series:'K1-K2500 / E1-E2500', card:'2372', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Telluride', ys:2020, ye:2023, series:'D0001-D3000', card:'4129', src:'Ilco 2025'},
  {make:'Mazda', model:'CX-9', ys:2016, ye:2022, series:'10100-12283', card:'288', note:'Texas Instruments (4D63) Encrypted System', src:'Ilco 2025'},
  {make:'Mazda', model:'CX-3', ys:2016, ye:2021, series:'10100-12283 / 20100-22283', card:'288', note:'Philips (47) Encrypted System', src:'Ilco 2025'},
  {make:'Mazda', model:'Mazda6', ys:2014, ye:2021, series:'10100-12283', card:'288', note:'Philips (47) Encrypted System', src:'Ilco 2025'},
  {make:'Mazda', model:'MX-5 Miata', ys:2016, ye:2022, series:'10100-12283', card:'288', note:'Texas Instruments (80 Bit) Encrypted Code Syst', src:'Ilco 2025'},
  {make:'Subaru', model:'Impreza', ys:2012, ye:2019, series:'32000-39999 / T001-3000', card:'3646, 702', note:'Texas Instruments (82) Encrypted System', src:'Ilco 2025'},
  {make:'Subaru', model:'Legacy', ys:2015, ye:2019, series:'32000-39999 / 90000-99999', card:'3646, 3964', note:'Texas Instruments (82) Encrypted System', src:'Ilco 2025'},
  {make:'Mitsubishi', model:'Eclipse Cross', ys:2018, ye:2022, series:'30010-32009', card:'288', note:'NXP Encrypted (ID47) System', src:'Ilco 2025'},
  {make:'Mitsubishi', model:'Mirage', ys:2014, ye:2022, series:'30010-32009', card:'288', note:'Philips Encrypted (46) System', src:'Ilco 2025'},
  {make:'Mitsubishi', model:'Lancer', ys:2008, ye:2017, series:'30010-32009', card:'288', note:'2008 Optional FOB', src:'Ilco 2025'},
  {make:'Cadillac', model:'Escalade', ys:2021, ye:2025, series:'Z0001-Z6314', card:'3647', src:'Ilco 2025'},
  {make:'Cadillac', model:'CT4', ys:2020, ye:2025, series:'Z0001-Z6314', card:'2200', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Silverado 1500', ys:2019, ye:2025, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Tahoe', ys:2021, ye:2025, series:'V0001-V5573 / Z0001-Z6314', card:'2200, 3647', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Suburban', ys:2021, ye:2025, series:'V0001-V5573 / Z0001-Z6314', card:'2200, 3647', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Equinox', ys:2018, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Traverse', ys:2018, ye:2025, series:'V0001-Z6000', card:'2200', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Malibu', ys:2016, ye:2024, series:'Z0001-Z6314 / V0001-V5718', card:'2200, 3647', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Trailblazer', ys:2021, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Blazer', ys:2019, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Colorado', ys:2023, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Chevrolet', model:'Trax', ys:2021, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'GMC', model:'Sierra 1500', ys:2019, ye:2025, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'GMC', model:'Terrain', ys:2018, ye:2025, series:'V0001-V5573', card:'3647', src:'Ilco 2025'},
  {make:'Buick', model:'Encore GX', ys:2020, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Buick', model:'Envision', ys:2021, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Z1-2000(card 758), Z2001-4000(card 923), & Z40', src:'Ilco 2025'},
  {make:'Buick', model:'Enclave', ys:2018, ye:2025, series:'Z0001-Z6314', card:'2200', note:'Philips PCF7937E', src:'Ilco 2025'},
  {make:'Ford', model:'F-150', ys:2021, ye:2025, series:'10001-11500', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Explorer', ys:2020, ye:2025, series:'10001-11500 / 1-4000', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Escape', ys:2020, ye:2025, series:'30001-31544 / 1-4000', card:'1838, 4320', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Bronco', ys:2021, ye:2025, series:'30001-31544 / 10001-11500 / 1-4000', card:'1838, 4320', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Edge', ys:2021, ye:2024, series:'10001-11500 / 1-4000', card:'1838', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Ford', model:'Maverick', ys:2022, ye:2025, series:'30001-31544', card:'4320', note:'Philips (46) PCF7939PA', src:'Ilco 2025'},
  {make:'Toyota', model:'Corolla', ys:2020, ye:2025, series:'40000-49999 / 80000-89999 / 50000-69999', card:'1420, 3102, 950', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'RAV4', ys:2019, ye:2025, series:'50000-69999 / 40000-49999', card:'1420, 950', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'Tundra', ys:2022, ye:2025, series:'50000-69999', card:'1420', note:'Texas Instruments (4D74) 128 bit System', src:'Ilco 2025'},
  {make:'Toyota', model:'Sienna', ys:2021, ye:2025, series:'80000-89999', card:'3102', src:'Ilco 2025'},
  {make:'Honda', model:'Civic', ys:2016, ye:2025, series:'K001-N718 / V001-W100', card:'2354, 4517', note:'High Security Key, Philips (49-1C) Encrypted S', src:'Ilco 2025'},
  {make:'Honda', model:'CR-V', ys:2017, ye:2025, series:'K001-N718 / V001-W100', card:'2354, 4517', note:'High Security Key, Philips (49-1C) Encrypted S', src:'Ilco 2025'},
  {make:'Honda', model:'Pilot', ys:2016, ye:2025, series:'K001-N718 / V001-W100', card:'2354, 4517', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Honda', model:'HR-V', ys:2023, ye:2025, series:'V001-W100', card:'4517', src:'Ilco 2025'},
  {make:'Nissan', model:'Altima', ys:2019, ye:2025, series:'40000-41520 / 1-22185', card:'607', src:'Ilco 2025'},
  {make:'Nissan', model:'Rogue', ys:2021, ye:2025, series:'1-22185', card:'607', note:'Philips Crypto (47) Hitag3', src:'Ilco 2025'},
  {make:'Nissan', model:'Sentra', ys:2020, ye:2025, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Frontier', ys:2022, ye:2025, series:'1-22185', card:'607', note:'Philips Crypto (46) Transponder key', src:'Ilco 2025'},
  {make:'Nissan', model:'Pathfinder', ys:2022, ye:2025, series:'1-22185', card:'607', src:'Ilco 2025'},
  {make:'Hyundai', model:'Elantra', ys:2021, ye:2025, series:'B0001-B3000', card:'4129', src:'Ilco 2025'},
  {make:'Hyundai', model:'Tucson', ys:2022, ye:2025, series:'D1-D3000 / K1-K2500 / H1-H2500', card:'2372, 4129', src:'Ilco 2025'},
  {make:'Hyundai', model:'Santa Fe', ys:2019, ye:2025, series:'C1001-C3500 / B0001-B3000 / S3001-S5409', card:'3618, 4192, 5096', src:'Ilco 2025'},
  {make:'Kia', model:'Sportage', ys:2023, ye:2025, series:'D1-D3000', card:'4129', src:'Ilco 2025'},
  {make:'Kia', model:'Sorento', ys:2021, ye:2025, series:'B0001-B3000', card:'4129', note:'High Security Key', src:'Ilco 2025'},
  {make:'Kia', model:'Forte', ys:2019, ye:2025, series:'D1-D3000 / B0001-B3000', card:'4129', src:'Ilco 2025'},
  {make:'Jeep', model:'Wrangler', ys:2018, ye:2025, series:'DE1-DE11210', card:'583', src:'Ilco 2025'},
  {make:'Jeep', model:'Gladiator', ys:2020, ye:2025, series:'DE1-DE11210', card:'583', src:'Ilco 2025'},
  {make:'Jeep', model:'Grand Cherokee', ys:2022, ye:2025, series:'M1-M2618', card:'745', note:'Philips (46) Encrypted System', src:'Ilco 2025'},
  {make:'Subaru', model:'Outback', ys:2020, ye:2025, series:'32000-39999 / 90000-99999', card:'3646, 3964', src:'Ilco 2025'},
  {make:'Toyota', model:'Camry', ys:2012, ye:2017, series:'50000-69999', src:'Keyline 2015'},
  {make:'Honda', model:'Accord', ys:2008, ye:2017, series:'K001-N718', src:'Keyline 2015'},
  {make:'Ram', model:'1500', ys:2013, ye:2018, series:'M0001-M2618', src:'Keyline 2015'},
  {make:'Toyota', model:'4Runner', ys:2010, ye:2023, series:'50000-69999', note:'Opt. PROX; two possible keys', src:'Keyline 2015'},
  {make:'Toyota', model:'Camry', ys:2007, ye:2011, series:'50000-69999', src:'Keyline 2015'},
  {make:'Mitsubishi', model:'Eclipse', ys:2004, ye:2007, series:'F1-F1571', src:'lockpicks.com'},
  {make:'Mitsubishi', model:'Endeavor', ys:2004, ye:2007, series:'F1-F1571', src:'lockpicks.com'},
  {make:'Mitsubishi', model:'Galant', ys:2004, ye:2007, series:'F1-F1571', src:'lockpicks.com'},
  {make:'Lincoln', model:'Corsair', ys:2020, ye:2022, series:'30001-31544', src:'American Key Supply'}
];
function applyCodeSeries(){
  const V=readLS(K_VEH,[])||[]; if(!V.length) return; let ch=0;
  V.forEach(r=>{
    if(r.code_series) return;                                   // never clobber an owner-entered value
    const mk=(r.make||'').trim().toLowerCase(), md=(r.model||'').trim().toLowerCase();
    const ys=Number(r.year_start)||0, ye=Number(r.year_end)||9999;
    const hit=CODE_SERIES_SRC.find(c=> c.make.toLowerCase()===mk && c.model.toLowerCase()===md && c.ys<=ye && c.ye>=ys);
    if(hit){ r.code_series=hit.series; r.code_series_src=hit.src; if(hit.note) r.code_series_note=hit.note; if(hit.card) r.code_card=hit.card; ch++; }
  });
  // One-time owner-defined keyway rules (VW/Audi/Volvo) — runs once, then owner edits persist.
  if(!readLS('tks_cs_keyfix2', false)){
    V.forEach(r=>{
      const mk=(r.make||'').toLowerCase(), kw=(r.keyway||'').toUpperCase().trim();
      const set=(s,n)=>{ r.code_series=s; r.code_series_src='Owner'; r.code_series_note=n||''; r.code_card=''; ch++; };
      if((mk==='volkswagen'||mk==='audi') && kw==='HU66') set('0001-8110');
      else if((mk==='volkswagen'||mk==='audi') && kw==='HU162T'){ if(r.code_series){ r.code_series=''; r.code_series_src=''; r.code_series_note=''; r.code_card=''; ch++; } }
      else if(mk==='volvo' && kw==='HU56') set('DH0001-DH4000');
      else if(mk==='volvo' && kw==='HU101') set('04001-09001 / 4001-9001','use with or without leading 0');
    });
    V.forEach(r=>{ if(r.code_series && r.code_series.indexOf('Z0001-Z6000')>=0){ r.code_series=r.code_series.replace(/Z0001-Z6000/g,'Z0001-Z6314'); ch++; } });
    writeLS('tks_cs_keyfix2', true);
  }
  if(ch) writeLS(K_VEH,V);
}

/* ---- seed once if empty; on version bump, MERGE new rows (never clobbers edits) ---- */
function ensureSeed(){
  if(!readLS('tks_lishi_seeded',false)){
    if(!(readLS(K_TOOLS,[])||[]).length) writeLS(K_TOOLS, ALL_TOOLS.map(x=>Object.assign({id:uid('lt')},x)));
    if(!(readLS(K_VEH,[])||[]).length)   writeLS(K_VEH,   ALL_VEH.map(x=>Object.assign({id:uid('vk')},x)));
    writeLS('tks_lishi_seeded',true); writeLS('tks_lishi_seedver',SEEDVER); return;
  }
  const sv=readLS('tks_lishi_seedver',1)||1;
  if(sv<5){
    // v5: RESET the tools store to the authoritative Original Lishi list (the earlier
    // hand-compiled names were partly off). Carry over any notes by designation, and
    // keep any existing tool that has a note but isn't on the official list.
    const cur=readLS(K_TOOLS,[])||[]; const noteBy={};
    cur.forEach(r=>{ const k=String(r.tool_designation).toUpperCase(); if((r.notes||'').trim()) noteBy[k]=r.notes; });
    const fresh=ALL_TOOLS.map(x=>{ const o=Object.assign({id:uid('lt')},x); const n=noteBy[String(x.tool_designation).toUpperCase()]; if(n) o.notes=n; return o; });
    const haveT=new Set(fresh.map(r=>String(r.tool_designation).toUpperCase()));
    cur.forEach(r=>{ const k=String(r.tool_designation).toUpperCase(); if(!haveT.has(k) && (r.notes||'').trim()){ fresh.push(r); haveT.add(k); } });
    writeLS(K_TOOLS,fresh);
  } else if(sv<SEEDVER){
    const T=readLS(K_TOOLS,[])||[]; const have=new Set(T.map(r=>String(r.tool_designation).toUpperCase()));
    ALL_TOOLS.forEach(s=>{ const k=String(s.tool_designation).toUpperCase(); if(!have.has(k)){ T.push(Object.assign({id:uid('lt')},s)); have.add(k); } });
    writeLS(K_TOOLS,T);
  }
  // vehicles: always add any missing rows (never clobbers edits)
  const V=readLS(K_VEH,[])||[]; const vh=new Set(V.map(r=>(r.make+'|'+r.model+'|'+r.year_start+'|'+r.keyway).toUpperCase()));
  ALL_VEH.forEach(s=>{ const k=(s.make+'|'+s.model+'|'+s.year_start+'|'+s.keyway).toUpperCase(); if(!vh.has(k)){ V.push(Object.assign({id:uid('vk')},s)); vh.add(k); } });
  writeLS(K_VEH,V);
  // v6: re-source previously-installed rows now that they're cross-referenced vs the supplier lists
  if(sv<6){ const Vr=readLS(K_VEH,[])||[]; let ch=0; Vr.forEach(r=>{ if(/^Compiled from public/.test(r.source||'')){ r.source='Cross-ref: LockPickWorld/CLK/UHS lists (2026-06-15)'; ch++; } }); if(ch) writeLS(K_VEH,Vr); }
  // v8: the old seed mislabeled smart-key/push-to-start ignitions as "Caution". Fix already-installed
  // rows to the corrected Yes/No/N/A — but NEVER touch a caution the OWNER added (those carry ign_caution).
  if(sv<8){
    const Vr=readLS(K_VEH,[])||[]; let ch=0;
    const fix={}; ALL_VEH.forEach(s=>{ fix[(s.make+'|'+s.model+'|'+s.year_start+'|'+s.keyway).toUpperCase()]=s.can_pick_ignition; });
    Vr.forEach(r=>{ if(String(r.can_pick_ignition)==='Caution' && !(r.ign_caution||'').trim()){
      const k=(r.make+'|'+r.model+'|'+r.year_start+'|'+r.keyway).toUpperCase();
      r.can_pick_ignition = fix[k]!=null?fix[k]:'N/A'; ch++; } });
    if(ch) writeLS(K_VEH,Vr);
  }
  writeLS('tks_lishi_seedver',SEEDVER);
}
ensureSeed();
applyCodeSeries();   // fill sourced code series onto matching vehicles (never clobbers edits)

  try{ window.TKS_LISHI_SEED = { tools:(typeof ALL_TOOLS!=='undefined'?ALL_TOOLS:[]), veh:(typeof ALL_VEH!=='undefined'?ALL_VEH:[]), models:(typeof MODELS!=='undefined'?MODELS:{}) }; }catch(e){}
})();
