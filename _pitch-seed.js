/* ============================================================================
   _pitch-seed.js — DEMO DATA for investor-pitch screenshots ONLY.
   Injected into the page by the Playwright screenshot runner BEFORE the app's
   own scripts run, so the staff app boots already populated as an "active shop."
   Writes the SAME localStorage keys the app uses (app/store.js KEYS).
   Nothing here ships to production; it only exists for the screenshot pass.
   ========================================================================== */
(function () {
  var DAY = 86400000, now = Date.now();
  function set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function at(daysAgo, hour, min) { var d = new Date(now - daysAgo * DAY); d.setHours(hour || 10, min || 0, 0, 0); return d; }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var TAX = 8.625;  // Oklahoma City combined sales tax

  /* ---- signed-in OWNER (remembered Supabase token; read offline, no network) ---- */
  set('sb-gcshuhlksjznksspbigl-auth-token', {
    access_token: 'demo-pitch-token', token_type: 'bearer', expires_at: 9999999999,
    refresh_token: 'demo', user: { id: 'demo-owner', email: 'samer@turbokeysmith.com' }
  });
  try { localStorage.removeItem('bt_theme'); } catch (e) {}   // light theme for the pitch

  /* ---- shop config / identity / staff / services ---- */
  var STAFF = [
    { name: 'Samer Haddad', email: 'samer@turbokeysmith.com', owner: true,  role: 'owner' },
    { name: 'Tyler Boggs',  email: 'tyler@turbokeysmith.com', owner: false, role: 'manager' },
    { name: 'Mike Reyes',   email: 'mike@turbokeysmith.com',  owner: false, role: 'technician' },
    { name: 'Carlos Vega',  email: 'carlos@turbokeysmith.com',owner: false, role: 'technician' },
    { name: 'Dana Cole',    email: 'dana@turbokeysmith.com',  owner: false, role: 'front_desk' }
  ];
  var SERVICES = [
    { value: 'Car lockout', cat: 'automotive', price: 75 },
    { value: 'Car key duplication / spare', cat: 'automotive', price: 89 },
    { value: 'Car key replacement (lost all keys)', cat: 'automotive', price: 245 },
    { value: 'Transponder/chip key programming', cat: 'automotive', price: 145 },
    { value: 'Smart / proximity key programming', cat: 'automotive', price: 320 },
    { value: 'Push-to-start programming', cat: 'automotive', price: 295 },
    { value: 'Ignition repair/replacement', cat: 'automotive', price: 210 },
    { value: 'House lockout', cat: 'residential', price: 65 },
    { value: 'Rekey', cat: 'residential', price: 25 },
    { value: 'Deadbolt installation', cat: 'residential', price: 95 },
    { value: 'Smart lock installation', cat: 'residential', price: 160 },
    { value: 'Commercial rekey', cat: 'commercial', price: 35 },
    { value: 'Access control / keypad / electronic locks', cat: 'commercial', price: 480 },
    { value: 'Panic / exit device (push bar)', cat: 'commercial', price: 540 }
  ];
  set('tks_shop_config', {
    taxRate: TAX,
    taxableByCategory: { Labor: false, Materials: true, Travel: false, Programming: false, AfterHours: false },
    identity: {
      name: 'Turbo Keysmith', address: '4201 N MacArthur Blvd, Warr Acres, OK 73122',
      phone: '(405) 870-5397', email: 'samer@turbokeysmith.com', license: 'AC441081',
      logo: 'https://d17lvxud83eqj6.cloudfront.net/decc098b-8d60-486e-a4b4-504237a12fad.png',
      logoCustom: true, footer: 'Licensed • Bonded • Insured — OK Lic. #AC441081', termsUrl: ''
    },
    payments: { surchargePct: 2, drawerFloatCents: 12000 },
    warranty: { months: 12, defaultOn: true },
    locations: { van: true, shop: true },
    nastf: { d1Days: 5 },
    prefs: { offerSaveOtherService: true },
    access: {
      employees: STAFF,
      ownerEmails: ['samer@turbokeysmith.com'],
      staffEmails: STAFF.filter(function (s) { return !s.owner; }).map(function (s) { return s.email; }),
      quickFormPin: '4071', quickInvoiceEnabled: true, quickInvoiceDefault: true
    },
    services: SERVICES,
    serviceCats: ['automotive', 'residential', 'commercial', 'safe', 'emergency'],
    setup: { completed: true, done: { identity: 1, services: 1, access: 1, payments: 1, tax: 1 }, skipped: {} }
  });

  /* ---- customers ---- */
  var CUST = [
    ['Jordan Mills','individual','(405) 555-0142','jordan.mills@gmail.com','1224 NW 30th St, Oklahoma City, OK 73118'],
    ['Priya Natarajan','individual','(405) 555-0198','priya.n@outlook.com','708 Asp Ave, Norman, OK 73069'],
    ['Hilltop Auto Group','business','(405) 555-0110','fleet@hilltopauto.com','5601 S I-35 Service Rd, Oklahoma City, OK 73129'],
    ['Marcus Bell','individual','(405) 555-0167','mbell82@gmail.com','3320 W Hefner Rd, Oklahoma City, OK 73120'],
    ['Edmond Family Dental','business','(405) 555-0173','office@edmondfamilydental.com','1234 S Bryant Ave, Edmond, OK 73034'],
    ['Sara Whitfield','individual','(405) 555-0155','sara.whitfield@gmail.com','910 SW 89th St, Oklahoma City, OK 73139'],
    ['Tran Nguyen','individual','(405) 555-0121','tnguyen@yahoo.com','455 W Main St, Yukon, OK 73099'],
    ['Redbud Property Mgmt','business','(405) 555-0190','maintenance@redbudpm.com','2200 NW 50th St, Oklahoma City, OK 73112'],
    ['DeShawn Carter','individual','(405) 555-0188','dcarter@gmail.com','617 N Porter Ave, Norman, OK 73071'],
    ['Olivia Brooks','individual','(405) 555-0134','olivia.brooks@gmail.com','1801 NW 178th St, Edmond, OK 73012'],
    ['Moore Storage Center','business','(405) 555-0144','frontdesk@moorestorage.com','1900 N Eastern Ave, Moore, OK 73160'],
    ['Gabriel Ortiz','individual','(405) 555-0176','gortiz.okc@gmail.com','3001 S Western Ave, Oklahoma City, OK 73109']
  ];
  var customers = CUST.map(function (c, i) {
    return {
      id: 'cust_demo_' + i, customer: c[0], contact: c[0].split(' ')[0], phone: c[2], email: c[3],
      address: c[4], customerType: c[1], status: c[1] === 'business' ? 'contracting' : 'customer',
      serviceNeeded: '', source: 'staff', notes: '', lang: 'en',
      lastUsed: now - (i * 0.7 + 0.3) * DAY, createdAt: now - (40 - i) * DAY, updatedAt: now - i * DAY,
      deletedAt: null, deletedBy: null
    };
  });
  set('tks_customers', customers);

  /* ---- inventory (some intentionally low to show reorder flags) ---- */
  var INV = [
    ['Honda/Acura HON66 transponder key blank','HON66-TP','blank',38,12,1.95,1900],
    ['Toyota TOY44H-PT chip key blank','TOY44H','blank',6,12,2.40,2200],
    ['Ford H94/H92 PATS transponder blank','FORD-H94','blank',27,10,2.10,2000],
    ['GM B119 / B111 transponder blank','GM-B119','blank',31,10,1.80,1800],
    ['Chrysler/Dodge/Jeep FOBIK smart key','CHRY-FOBIK','fob',9,6,18.50,8900],
    ['Toyota 4-button smart proximity fob','TOY-PROX4','fob',4,6,34.00,14500],
    ['Ford 5-button PEPS smart fob','FORD-PEPS5','fob',7,6,29.00,13900],
    ['Honda 4-button driver-1 smart fob','HON-SMART4','fob',5,6,27.50,12900],
    ['Universal 4D/4C clonable transponder','XHORSE-4D','chip',64,20,0.95,900],
    ['KEYDIY universal remote (B-series)','KD-B','fob',22,10,6.50,3900],
    ['Xhorse XM38 universal smart key','XH-XM38','fob',14,8,12.00,7900],
    ['Emergency blade — HU101 (Ford/Volvo)','HU101-BL','blade',40,12,0.85,1200],
    ['Emergency blade — HU100 (GM/Opel)','HU100-BL','blade',12,12,0.85,1200],
    ['Kwikset SmartKey rekey pin kit','KW-SMARTKEY','res',18,8,9.00,0],
    ['Schlage SC1 5-pin house key blank','SC1','res',210,40,0.35,300],
    ['Kwikset KW1 house key blank','KW1','res',240,40,0.30,250],
    ['Grade-1 commercial mortise cylinder','MORT-CYL','com',8,6,22.00,9900],
    ['Push-bar exit device (panic, 36")','EXIT-36','com',3,3,180.00,54000],
    ['CR2032 fob battery (10-pack)','CR2032-10','supply',16,6,3.20,0],
    ['Lishi 2-in-1 pick — HU100R','LISHI-HU100R','tool',2,2,52.00,0],
    ['Lishi 2-in-1 pick — TOY2','LISHI-TOY2','tool',2,2,52.00,0],
    ['Smart-key emergency insert (assorted)','INSERT-ASST','supply',31,10,1.10,700]
  ];
  var inventory = INV.map(function (p, i) {
    return {
      id: 'part_demo_' + i, name: p[0], sku: p[1], category: p[2], qty: p[3], lowAt: p[4],
      unit: 'pc', cost: p[5], sellPriceCents: p[6] || null, location: 'shop', notes: '',
      supplier: i % 2 ? 'Key Innovations' : 'American Key Supply', reorderQty: p[4] * 4,
      fitment: '', createdAt: now - 45 * DAY, updatedAt: now - i * DAY
    };
  });
  set('tks_inventory', inventory);

  /* ---- scheduler bookings (drive the Dashboard jobs/week/type charts) ---- */
  var techNames = ['Mike Reyes', 'Carlos Vega', 'Tyler Boggs'];
  var bookSpecs = [
    [0, 9, 'auto', 'automotive', 'Smart / proximity key programming', 'Completed', 2, '2021 Toyota Highlander'],
    [0, 11, 'auto', 'automotive', 'Car key replacement (lost all keys)', 'In Progress', 0, '2018 Ford F-150'],
    [0, 14, 'res', 'residential', 'Rekey (4 locks)', 'Scheduled', 1, ''],
    [0, 16, 'com', 'commercial', 'Access control / keypad install', 'Scheduled', 1, ''],
    [1, 10, 'auto', 'automotive', 'Push-to-start programming', 'Completed', 0, '2020 Chevy Silverado'],
    [1, 13, 'auto', 'automotive', 'Car lockout', 'Completed', 2, '2016 Honda Accord'],
    [2, 9, 'res', 'residential', 'Deadbolt installation', 'Completed', 1, ''],
    [2, 15, 'auto', 'automotive', 'Transponder/chip key programming', 'Completed', 0, '2014 Nissan Altima'],
    [3, 11, 'com', 'commercial', 'Commercial rekey (12 cylinders)', 'Completed', 2, ''],
    [4, 12, 'auto', 'automotive', 'Car key duplication / spare', 'Completed', 1, '2019 Hyundai Sonata'],
    [5, 10, 'auto', 'automotive', 'Ignition repair/replacement', 'Completed', 0, '2012 Dodge Ram 1500'],
    [6, 14, 'res', 'residential', 'Smart lock installation', 'Completed', 1, '']
  ];
  var bookings = bookSpecs.map(function (b, i) {
    var c = customers[i % customers.length];
    var v = b[7] ? b[7].split(' ') : ['', '', ''];
    var d = at(b[0], b[1]);
    return {
      id: 'bk_demo_' + i, customerId: c.id,
      customer: { name: c.customer, phone: c.phone, email: c.email },
      jobType: b[2], subType: '', serviceCategory: b[3], serviceLabel: b[4],
      vehicle: { year: v[0] || '', make: v[1] || '', model: v.slice(2).join(' ') || '', vin: '', ignition: null },
      address: c.address, parked: true, date: iso(d), time: String(b[1]).padStart(2, '0') + ':00',
      duration: 45, status: b[5], notes: '', images: [], upsell: '',
      bookedBy: techNames[b[6]], createdAt: d.getTime() - DAY, updatedAt: d.getTime()
    };
  });
  set('tks_bookings', bookings);

  /* ---- receipts (drive Dashboard revenue/tax KPIs + Closeout drawer + A/R) ---- */
  // template: [serviceType, [ [desc, qty, amount, taxable], ... ] ]
  var R = [
    ['Automotive', [['Smart proximity key — cut, program & sync', 1, 320, true], ['Service call / mobile dispatch', 1, 49, false]], '2021 Toyota Highlander'],
    ['Automotive', [['All-keys-lost — 2 smart keys originated', 2, 245, true], ['Onboard programming (NASTF SDRM)', 1, 0, false]], '2018 Ford F-150'],
    ['Automotive', [['Car lockout — non-destructive entry', 1, 75, false]], '2016 Honda Accord'],
    ['Automotive', [['Transponder key — cut & program', 1, 145, true]], '2014 Nissan Altima'],
    ['Automotive', [['Push-to-start fob — program & test', 1, 295, true], ['Spare smart key', 1, 180, true]], '2020 Chevy Silverado'],
    ['Automotive', [['Spare key duplication (laser cut)', 1, 89, true]], '2019 Hyundai Sonata'],
    ['Automotive', [['Ignition cylinder replacement + key', 1, 210, true], ['Tow-free on-site repair', 1, 0, false]], '2012 Dodge Ram 1500'],
    ['Residential', [['Rekey — 4 locks to one key', 4, 25, true], ['Trip charge', 1, 39, false]], ''],
    ['Residential', [['Deadbolt — supply & install', 1, 95, true], ['Smart lock — supply & install', 1, 160, true]], ''],
    ['Commercial', [['Commercial rekey — 12 cylinders', 12, 35, true]], ''],
    ['Commercial', [['Access control keypad — supply & install', 1, 480, true], ['Programming & user enrollment', 1, 120, false]], ''],
    ['Residential', [['House lockout — after hours', 1, 95, false]], ''],
    ['Automotive', [['Key fob remote — program', 1, 65, true]], '2017 Kia Optima'],
    ['Automotive', [['Broken key extraction + new key', 1, 120, true]], '2015 GMC Sierra']
  ];
  var pays = ['Card', 'Cash', 'Card', 'Card', 'Check', 'Card', 'Cash', 'Card'];
  var techs = ['Mike Reyes', 'Carlos Vega', 'Tyler Boggs'];
  var receipts = [];
  var rno = 1247;
  // ~3 receipts/day across the last 13 days = a busy two weeks
  for (var day = 0; day < 13; day++) {
    var perDay = (day % 3 === 0) ? 4 : 3;
    for (var j = 0; j < perDay; j++) {
      var t = R[(day * 3 + j) % R.length];
      var hour = 8 + ((j * 3 + day) % 11);
      var d = at(day, hour, (j * 17) % 60);
      var items = t[1].map(function (it) {
        return { desc: it[0], qty: it[1], amount: it[2], taxable: it[3], discountMode: null, discountValue: null, partId: null };
      });
      var taxable = items.reduce(function (s, it) { return s + (it.taxable ? it.amount * it.qty : 0); }, 0);
      var nontax = items.reduce(function (s, it) { return s + (!it.taxable ? it.amount * it.qty : 0); }, 0);
      var subtotal = taxable + nontax;
      var tax = Math.round(taxable * TAX) / 100;
      var total = Math.round((subtotal + tax) * 100) / 100;
      var pay = pays[(day + j) % pays.length];
      var tech = techs[(day + j) % techs.length];
      // every ~9th doc is an unpaid invoice (Accounts Receivable); 1 estimate sprinkled in
      var isInvoice = ((day * 3 + j) % 9 === 5);
      var isEstimate = ((day * 3 + j) % 17 === 4);
      var docType = isEstimate ? 'estimate' : (isInvoice ? 'invoice' : 'receipt');
      var status = docType === 'estimate' ? '' : (docType === 'invoice' ? 'Unpaid' : 'Paid in Full');
      var c = customers[(day * 3 + j) % customers.length];
      var veh = (t[2] || '').split(' ');
      receipts.push({
        id: 'rcpt_demo_' + day + '_' + j,
        number: (docType === 'invoice' ? 'INV' : docType === 'estimate' ? 'EST' : 'TKS') + (rno++),
        docType: docType, status: status, date: iso(d), savedAt: d.getTime(),
        paidAt: docType === 'receipt' ? d.getTime() + 600000 : null,
        customer: c.customer, contact: c.customer.split(' ')[0], phone: c.phone, email: c.email,
        address: c.address, customerType: c.customerType, serviceType: t[0],
        vehYear: veh[0] || '', vehMake: veh[1] || '', vehModel: veh.slice(2).join(' ') || '', vin: '',
        items: items,
        totals: { taxable: taxable, nontax: nontax, discount: 0, subtotal: subtotal, tax: tax, surcharge: 0, total: total, taxRate: TAX, surchargeRate: 2 },
        taxRate: TAX, payment: docType === 'receipt' ? pay : 'Not specified',
        technician: tech, warranty: t[0] !== 'Estimate', warrantyMonths: 12,
        warrantyStart: d.getTime(), warrantyUntil: d.getTime() + 365 * DAY,
        notes: '', signature: null, nastf: null,
        cashLogged: docType === 'receipt' && (pay === 'Cash' || pay === 'Check'),
        stockApplied: docType === 'receipt', stockAppliedAt: docType === 'receipt' ? d.getTime() : null,
        source: null
      });
    }
  }
  set('tks_receipts', receipts);

  console.log('[pitch-seed] active shop seeded:', customers.length, 'customers,', inventory.length, 'parts,', bookings.length, 'bookings,', receipts.length, 'receipts');
})();
