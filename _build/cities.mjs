// ============================================================
// Per-city data. Tier 1–4 copy is transcribed verbatim from
// site/turbo_city_seo_copy.md (the hand-written SEO copy — "use this
// wording, don't re-template it"). The 4 pre-existing featured cities
// (Edmond/Moore/Norman/Midwest City) are written here in the same voice.
//
// tier: 0 = featured pre-existing metro city (combined page),
//       1,2 = main page + auto/residential/commercial sub-pages,
//       3,4 = single combined page.
// Tier 1 & 2 cities carry `sub` hooks (one unique line per service).
// ============================================================

export const CITIES = [
  // ---------- Featured pre-existing metro cities (tier 0, combined) ----------
  {
    slug:'edmond', name:'Edmond', tier:0, hasSub:false,
    metaTitle:'Edmond Locksmith OK | Car Keys, Home & Business | Turbo Keysmith',
    metaDesc:'Mobile locksmith in Edmond, OK. Car key replacement, home rekeys, smart locks & 24-hour lockout help near UCO, Downtown Edmond and the I-35 corridor. Call 405-870-5397.',
    h1:'Edmond’s Mobile Locksmith — Car, Home & Business',
    intro:'Edmond blends busy college life around the University of Central Oklahoma with established neighborhoods and fast-growing subdivisions out toward I-35. We cover all of it — car keys and fobs cut on-site, rekeys and smart locks for new and long-time homeowners, business locks downtown, and 24-hour lockout help — from a licensed mobile van that comes to you.'
  },
  {
    slug:'moore', name:'Moore', tier:0, hasSub:false,
    metaTitle:'Moore Locksmith OK | Car Keys, Rekeys & 24-Hour Lockouts',
    metaDesc:'Mobile locksmith in Moore, OK. Car key replacement, home rekeys, smart locks & fast lockout help along the I-35 corridor and Old Town Moore. Call 405-870-5397.',
    h1:'Moore’s Mobile Locksmith — We Come to You',
    intro:'Right between Oklahoma City and Norman on I-35, Moore is full of busy families and newer homes built and rebuilt over the years. We rekey homes after a move or closing, install smart locks and fresh deadbolts, replace lost car keys on-site, and answer lockout calls fast — flat-rate, day or night.'
  },
  {
    slug:'norman', name:'Norman', tier:0, hasSub:false,
    metaTitle:'Norman Locksmith OK | Car Keys, OU Rentals & Business Locks',
    metaDesc:'Mobile locksmith in Norman, OK. Car key replacement, student-rental rekeys, smart locks & business locks near OU and Campus Corner. Call 405-870-5397.',
    h1:'Norman’s Mobile Locksmith — Home of OU',
    intro:'Home to the University of Oklahoma, Norman runs on students, renters, and long-time residents alike. We rekey rentals between tenants, replace car keys and fobs on-site for commuters, install smart locks, and secure the shops around Campus Corner and along Main Street — all from a licensed mobile locksmith who comes to you.'
  },
  {
    slug:'midwest-city', name:'Midwest City', tier:0, hasSub:false,
    metaTitle:'Midwest City Locksmith OK | Tinker AFB | Car Keys & Lockouts',
    metaDesc:'Mobile locksmith in Midwest City, OK near Tinker AFB. Military-friendly car key replacement, home rekeys & 24-hour lockout help. Call 405-870-5397.',
    h1:'Midwest City Locksmith — Serving Tinker & Beyond',
    intro:'Built around Tinker Air Force Base, Midwest City is home to military families, commuters, and the busy retail along SE 29th and the Town Center. We replace car keys on-site, rekey homes between moves and deployments, install fresh deadbolts and smart locks, and answer lockouts fast — from a licensed local van.'
  },

  // ---------- TIER 1 — inner metro (main + 3 sub-pages) ----------
  {
    slug:'oklahoma-city', name:'Oklahoma City', tier:1, hasSub:true,
    metaTitle:'Locksmith in Oklahoma City, OK | Turbo Keysmith — Mobile & 24-Hour',
    metaDesc:'Mobile locksmith serving all of Oklahoma City — Downtown, Bricktown, Midtown & beyond. Car keys, home & business locks, 24-hour lockouts. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving All of Oklahoma City',
    intro:'Turbo Keysmith covers the whole city — from Downtown and Bricktown to Capitol Hill and the far NW and SW suburbs — with a fully stocked van that comes to you. Car key replacement, home rekeys, business security, and 24-hour lockout help, all from a licensed local locksmith (OK #AC441081). No tow, no shop visit, fair flat rates.',
    sub:{
      auto:'On-site car key & fob programming for all makes, anywhere in the city.',
      res:'Rekeys, lock installs, and smart locks for OKC homes.',
      comm:'Master keys & high-security locks for OKC businesses.'
    }
  },
  {
    slug:'bethany', name:'Bethany', tier:1, hasSub:true,
    metaTitle:'Bethany Locksmith | Car Keys, Rekeys & Lockouts | Turbo Keysmith',
    metaDesc:'Fast mobile locksmith in Bethany, OK — right next to our base. Rekeys, deadbolts, car key replacement & lockout help near NW 39th & SNU. Call 405-870-5397.',
    h1:'Your Local Bethany Locksmith — Minutes Away',
    intro:'Bethany sits right next to our Warr Acres home base, so you get some of our fastest response times in the metro. We handle the area’s many established homes along the NW 39th Expressway and near Southern Nazarene University — rekeys after a move, deadbolt upgrades, lockouts — plus car keys and small-business locks.',
    sub:{
      auto:'Quick car key & fob service for Bethany commuters.',
      res:'Rekeys & deadbolts for Bethany’s established homes.',
      comm:'Locks & master keys for NW 39th businesses.'
    }
  },
  {
    slug:'warr-acres', name:'Warr Acres', tier:1, hasSub:true,
    metaTitle:'Warr Acres Locksmith | Our Home Base — Fastest Response',
    metaDesc:'Turbo Keysmith is based in Warr Acres, OK. Fastest local response for car keys, home rekeys, business locks & 24-hour lockouts on the MacArthur corridor. Call 405-870-5397.',
    h1:'Warr Acres Locksmith — This Is Our Backyard',
    intro:'Warr Acres is home for us, so when you call from here you get the quickest response we offer. We take care of NW Oklahoma City homes and the small businesses along the MacArthur corridor — car keys, rekeys, lock repair, lockouts — day or night, with honest flat-rate pricing from a licensed neighbor.',
    sub:{
      auto:'Fastest car key & fob help in our home turf.',
      res:'Rekeys & lock repair for Warr Acres homes.',
      comm:'Business locks along MacArthur Blvd.'
    }
  },
  {
    slug:'the-village', name:'The Village', tier:1, hasSub:true,
    metaTitle:'The Village Locksmith OK | Rekeys, Smart Locks & Lockouts',
    metaDesc:'Mobile locksmith for The Village, OK. Rekeys, deadbolt upgrades, smart locks & lockout help for north-central mid-century homes. Call 405-870-5397.',
    h1:'Locksmith Services in The Village',
    intro:'The Village is a tight-knit north-central neighborhood full of well-kept mid-century homes, and we know their door hardware well. We rekey locks after a move, upgrade tired deadbolts, install smart locks, and get you back inside fast when you’re locked out.',
    sub:{
      auto:'Car key & fob replacement at your door.',
      res:'Rekeys & smart locks for Village homes.',
      comm:'Locks for Village-area shops & offices.'
    }
  },
  {
    slug:'nichols-hills', name:'Nichols Hills', tier:1, hasSub:true,
    metaTitle:'Nichols Hills Locksmith | High-Security & Smart Locks',
    metaDesc:'Discreet, licensed mobile locksmith for Nichols Hills, OK. High-security locks, smart-lock installs, rekeys & lockouts for upscale homes. Call 405-870-5397.',
    h1:'Trusted Locksmith for Nichols Hills Homes',
    intro:'Nichols Hills homeowners expect security done right and done discreetly — and that’s how we work. As a licensed, insured locksmith (OK #AC441081), we install high-security and smart locks, handle rekeys and lock upgrades, and respond quickly to lockouts, with the professionalism the neighborhood expects.',
    sub:{
      auto:'On-site key & fob service for luxury vehicles.',
      res:'High-security & smart locks for fine homes.',
      comm:'Access control & master keys for offices.'
    }
  },
  {
    slug:'yukon', name:'Yukon', tier:1, hasSub:true,
    metaTitle:'Yukon Locksmith OK | Car Keys, Home & Business | Turbo Keysmith',
    metaDesc:'Mobile locksmith in Yukon, OK. Car key replacement, home rekeys & business locks near Route 66 and Garth Brooks Blvd. 24-hour lockouts. Call 405-870-5397.',
    h1:'Yukon’s Mobile Locksmith — Car, Home & Business',
    intro:'From the historic Route 66 Main Street to the busy retail along Garth Brooks Boulevard, Yukon keeps growing — and we keep its drivers, homeowners, and shop owners covered. Lost car keys and fobs cut on-site, home rekeys, and commercial locks, all from a mobile van that comes to you across this west-metro community.',
    sub:{
      auto:'Car key & fob programming for Yukon commuters.',
      res:'Rekeys & smart locks for Yukon’s growing neighborhoods.',
      comm:'Business locks for Garth Brooks Blvd retail.'
    }
  },
  {
    slug:'del-city', name:'Del City', tier:1, hasSub:true,
    metaTitle:'Del City Locksmith | Military Discount | Car Keys & Lockouts',
    metaDesc:'Mobile locksmith in Del City, OK near Tinker AFB. Military discount, car key replacement, rekeys & 24-hour lockout help. Call 405-870-5397.',
    h1:'Del City Locksmith — Proud to Serve Our Military Families',
    intro:'Right next to Tinker Air Force Base, Del City is home to many military families — and we thank them with a military discount on our services. We replace lost car keys for commuters, rekey the area’s established homes, and answer lockout calls fast, all from a licensed local van.',
    sub:{
      auto:'Car key & fob replacement for Tinker-area commuters.',
      res:'Rekeys & deadbolts for Del City homes.',
      comm:'Locks & master keys for local businesses.'
    }
  },
  {
    slug:'mustang', name:'Mustang', tier:1, hasSub:true,
    metaTitle:'Mustang Locksmith OK | Car Keys, Smart Locks & Rekeys',
    metaDesc:'Mobile locksmith in Mustang, OK. Car key replacement, smart locks & new-home rekeys for this fast-growing SW community. 24-hour lockouts. Call 405-870-5397.',
    h1:'Locksmith for Mustang’s Growing Neighborhoods',
    intro:'Mustang is one of the metro’s fastest-growing suburbs, full of newer homes and busy families — exactly the work we love. We rekey freshly bought homes so old builder keys stop working, install smart locks, replace car keys on-site, and come to you fast when you’re locked out.',
    sub:{
      auto:'Car key & fob service for Mustang families.',
      res:'New-home rekeys & smart locks.',
      comm:'Locks for Mustang’s growing business strips.'
    }
  },
  {
    slug:'piedmont', name:'Piedmont', tier:1, hasSub:true,
    metaTitle:'Piedmont Locksmith OK | We Drive to You | Car Keys & Rekeys',
    metaDesc:'Mobile locksmith serving Piedmont, OK and its acreage homes. Car keys, rekeys & lockout help — we drive out to you. Call 405-870-5397.',
    h1:'Piedmont Locksmith — We Come Out to You',
    intro:'Piedmont’s homes are spread across plenty of NW countryside, and that’s no problem for a mobile locksmith — we drive out to you, no matter how far back the driveway runs. Lost car keys, home rekeys, and lockouts, handled on-site with honest flat rates.',
    sub:{
      auto:'On-site car key & fob replacement, however far out.',
      res:'Rekeys & locks for Piedmont acreage homes.',
      comm:'Locks for Piedmont businesses & shops.'
    }
  },
  {
    slug:'spencer', name:'Spencer', tier:1, hasSub:true,
    metaTitle:'Spencer Locksmith OK | Mobile Car Keys & Lockouts',
    metaDesc:'Mobile locksmith in Spencer, OK. Fast car key replacement, home rekeys & lockout help along the NE 23rd corridor. Call 405-870-5397.',
    h1:'Mobile Locksmith in Spencer',
    intro:'Spencer gets quick, friendly mobile locksmith service from a licensed local team. Whether you’ve locked your keys in the car along NE 23rd, need a home rekeyed, or lost your only key, we come to you and get it handled.',
    sub:{
      auto:'Car key & fob replacement at your location.',
      res:'Rekeys & lockouts for Spencer homes.',
      comm:'Locks for Spencer-area businesses.'
    }
  },
  {
    slug:'nicoma-park', name:'Nicoma Park', tier:1, hasSub:true,
    metaTitle:'Nicoma Park Locksmith OK | Rekeys, Car Keys & Lockouts',
    metaDesc:'Mobile locksmith in Nicoma Park, OK. Rekeys, car key replacement & 24-hour lockout help for this NE community near Choctaw. Call 405-870-5397.',
    h1:'Locksmith Services in Nicoma Park',
    intro:'Tucked beside Choctaw on the metro’s east side, Nicoma Park’s older homes often need a rekey or a lock refresh — and we’re glad to help. Car keys, rekeys, lock repair, and fast lockout service, all mobile and flat-rate.',
    sub:{
      auto:'Car key & fob service at your door.',
      res:'Rekeys & lock repair for older homes.',
      comm:'Locks for local businesses.'
    }
  },

  // ---------- TIER 2 — inner ring (main + 3 sub-pages) ----------
  {
    slug:'choctaw', name:'Choctaw', tier:2, hasSub:true,
    metaTitle:'Choctaw Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith in Choctaw, OK. Car key replacement, home rekeys & business locks for the metro’s east side. 24-hour lockouts. Call 405-870-5397.',
    h1:'Locksmith Serving Choctaw, Oklahoma',
    intro:'Choctaw’s “largest historic small town” charm comes with a mix of long-time homes and growing new neighborhoods near Choctaw Creek Park. We cover them all — car keys cut on-site, home rekeys, business locks, and fast lockout help from a licensed mobile van.',
    sub:{
      auto:'Car key & fob replacement for Choctaw drivers.',
      res:'Rekeys & smart locks for Choctaw homes.',
      comm:'Business locks & master keys.'
    }
  },
  {
    slug:'jones', name:'Jones', tier:2, hasSub:true,
    metaTitle:'Jones Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Jones, OK. Car key replacement, rekeys & lockout help for this small NE community. We come to you. Call 405-870-5397.',
    h1:'Mobile Locksmith for Jones, Oklahoma',
    intro:'Jones keeps its small-town, country feel, and a mobile locksmith fits it perfectly — we bring the shop to your driveway. Lost car keys, home rekeys, and lockouts handled on-site, no trip into the city needed.',
    sub:{
      auto:'On-site car key & fob service.',
      res:'Rekeys & lockouts for Jones homes.',
      comm:'Locks for Jones-area businesses & farms.'
    }
  },
  {
    slug:'harrah', name:'Harrah', tier:2, hasSub:true,
    metaTitle:'Harrah Locksmith OK | Car Keys, Rekeys & Lockouts',
    metaDesc:'Mobile locksmith in Harrah, OK. Car key replacement for commuters, home rekeys & 24-hour lockout help on the metro’s far east side. Call 405-870-5397.',
    h1:'Locksmith Services in Harrah',
    intro:'Out on the metro’s far east edge, Harrah’s commuters and homeowners still get full mobile locksmith service. We cut and program car keys on-site, rekey homes after a move, and answer lockout calls — we make the drive so you don’t have to.',
    sub:{
      auto:'Car keys & fobs for Harrah commuters.',
      res:'Rekeys & locks for Harrah homes.',
      comm:'Business locks for the area.'
    }
  },
  {
    slug:'newcastle', name:'Newcastle', tier:2, hasSub:true,
    metaTitle:'Newcastle Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith in Newcastle, OK. Car key replacement, home rekeys & commercial locks for this growing SW community. Call 405-870-5397.',
    h1:'Newcastle’s Mobile Locksmith',
    intro:'Just across the Canadian River and growing fast, Newcastle gets full mobile service — from car keys for the commute up I-44 to home rekeys in its new subdivisions and locks for businesses near the casino. We come to you, flat-rate.',
    sub:{
      auto:'Car key & fob replacement on-site.',
      res:'New-home rekeys & smart locks.',
      comm:'Business & master-key locks.'
    }
  },
  {
    slug:'el-reno', name:'El Reno', tier:2, hasSub:true,
    metaTitle:'El Reno Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith in El Reno, OK. Car key replacement, home rekeys & downtown business locks along Route 66 and I-40. Call 405-870-5397.',
    h1:'Locksmith Serving El Reno, Oklahoma',
    intro:'Home of the fried-onion burger and a proud Route 66 town, El Reno is the Canadian County seat with a busy downtown. We replace car keys on-site for I-40 commuters, rekey homes, and secure the shops and offices around Main Street.',
    sub:{
      auto:'Car key & fob service for El Reno drivers.',
      res:'Rekeys & lock repair for El Reno homes.',
      comm:'Downtown business locks & master keys.'
    }
  },
  {
    slug:'guthrie', name:'Guthrie', tier:2, hasSub:true,
    metaTitle:'Guthrie Locksmith OK | Historic Homes, Car Keys & Locks',
    metaDesc:'Mobile locksmith in Guthrie, OK. Lock repair & rekeys for historic homes, car key replacement & business locks downtown. Call 405-870-5397.',
    h1:'Locksmith for Guthrie’s Historic Homes & Businesses',
    intro:'Oklahoma’s first capital, Guthrie is famous for its Victorian downtown and historic homes — which often have older, character-rich locks that need a careful hand. We repair and rekey them, replace car keys on-site, and secure downtown’s historic storefronts.',
    sub:{
      auto:'Car key & fob replacement for Guthrie drivers.',
      res:'Rekeys & lock repair for historic homes.',
      comm:'Locks for downtown’s historic businesses.'
    }
  },
  {
    slug:'tuttle', name:'Tuttle', tier:2, hasSub:true,
    metaTitle:'Tuttle Locksmith OK | Mobile Car Keys, Rekeys & Lockouts',
    metaDesc:'Mobile locksmith serving Tuttle, OK. Car key replacement, home rekeys & lockout help for this growing SW town. We come to you. Call 405-870-5397.',
    h1:'Mobile Locksmith in Tuttle, Oklahoma',
    intro:'Tuttle’s small-town pace and growing new homes both get covered by our mobile van. We cut and program car keys on the spot, rekey homes after a closing, and answer lockouts across this SW community — flat rates, no shop trip.',
    sub:{
      auto:'On-site car key & fob service.',
      res:'New-home rekeys & smart locks.',
      comm:'Locks for Tuttle businesses.'
    }
  },

  // ---------- TIER 3 — outer ring (single combined page) ----------
  {
    slug:'blanchard', name:'Blanchard', tier:3, hasSub:false,
    metaTitle:'Blanchard Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Blanchard, OK. Car key replacement, home rekeys, business locks & lockout help — we drive out to you. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Blanchard',
    intro:'This growing SW bedroom community gets full mobile locksmith service from a licensed local team — car keys cut and programmed on-site, home rekeys, business locks, and lockout help. We make the drive to Blanchard so you don’t have to head into the city.'
  },
  {
    slug:'noble', name:'Noble', tier:3, hasSub:false,
    metaTitle:'Noble Locksmith OK | Car Keys, Rekeys & Lockouts',
    metaDesc:'Mobile locksmith in Noble, OK, the Rose Rock Capital. Car key replacement, home rekeys & 24-hour lockout help near Norman. Call 405-870-5397.',
    h1:'Mobile Locksmith for Noble, Oklahoma',
    intro:'Noble — the Rose Rock Capital just south of Norman — gets car keys, home rekeys, business locks, and fast lockout help, all on-site. One call brings a licensed mobile locksmith to your door, flat-rate and friendly.'
  },
  {
    slug:'goldsby', name:'Goldsby', tier:3, hasSub:false,
    metaTitle:'Goldsby Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Goldsby, OK near Riverwind. Car key replacement, rekeys & lockout help — we come to you. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Goldsby',
    intro:'Down near Riverwind, Goldsby’s homes and travelers get full mobile service — lost car keys made on-site, home rekeys, and lockout help. We bring the shop to you, with honest flat-rate pricing.'
  },
  {
    slug:'purcell', name:'Purcell', tier:3, hasSub:false,
    metaTitle:'Purcell Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith in Purcell, OK, Heart of Oklahoma. Car key replacement, home rekeys & business locks along I-35. Call 405-870-5397.',
    h1:'Locksmith Serving Purcell, Oklahoma',
    intro:'The “Heart of Oklahoma” and McClain County seat, Purcell sits right on I-35 — handy for our mobile van. We replace car keys on-site, rekey homes, and secure businesses, then hop the river to Lexington when needed.'
  },
  {
    slug:'shawnee', name:'Shawnee', tier:3, hasSub:false,
    metaTitle:'Shawnee Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Shawnee, OK. Car key replacement, home rekeys & business locks near OBU and FireLake. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Shawnee',
    intro:'The Pottawatomie County seat and home of OBU and FireLake, Shawnee is a solid drive east — and worth it. We bring car key replacement, home rekeys, and business locks to your door, no trip to the city required.'
  },
  {
    slug:'mcloud', name:'McLoud', tier:3, hasSub:false,
    metaTitle:'McLoud Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving McLoud, OK, home of the Blackberry Festival. Car keys, rekeys & lockout help — we come to you. Call 405-870-5397.',
    h1:'Mobile Locksmith for McLoud, Oklahoma',
    intro:'McLoud — Blackberry Festival country east of the metro — gets car keys, rekeys, and lockout help from a licensed mobile locksmith who drives out to you. Flat rates, no shop visit.'
  },
  {
    slug:'chickasha', name:'Chickasha', tier:3, hasSub:false,
    metaTitle:'Chickasha Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Chickasha, OK. Car key replacement, home rekeys & business locks for the Grady County seat. Call 405-870-5397.',
    h1:'Locksmith Serving Chickasha, Oklahoma',
    intro:'The Grady County seat and home of USAO and the Festival of Light, Chickasha gets full mobile service on our SW run — car keys cut on-site, home rekeys, and business locks, all flat-rate from a licensed local team.'
  },
  {
    slug:'kingfisher', name:'Kingfisher', tier:3, hasSub:false,
    metaTitle:'Kingfisher Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Kingfisher, OK, the Buffalo Capital. Car keys, home rekeys & business locks — we drive out to you. Call 405-870-5397.',
    h1:'Mobile Locksmith for Kingfisher, Oklahoma',
    intro:'The “Buffalo Capital” and a busy oil-and-ag town to the NW, Kingfisher gets car keys, home rekeys, and business locks from our mobile van. We make the drive so local drivers and homeowners don’t have to.'
  },
  {
    slug:'crescent', name:'Crescent', tier:3, hasSub:false,
    metaTitle:'Crescent Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Crescent, OK. Car key replacement, rekeys & lockout help for this small rural community. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Crescent',
    intro:'Small, rural, and north of the metro, Crescent still gets full mobile service — lost car keys made on-site, home rekeys, and lockout help. One call and we’re on our way.'
  },
  {
    slug:'lexington', name:'Lexington', tier:3, hasSub:false,
    metaTitle:'Lexington Locksmith OK | Car Keys, Rekeys & Lockouts',
    metaDesc:'Mobile locksmith serving Lexington, OK across the river from Purcell. Car keys, home rekeys & lockout help. Call 405-870-5397.',
    h1:'Mobile Locksmith for Lexington, Oklahoma',
    intro:'Just across the river from Purcell, Lexington gets car key replacement, home rekeys, and lockout help from a licensed mobile locksmith. We come to you, with honest flat rates.'
  },

  // ---------- TIER 4 — edge of 50 miles (single combined page) ----------
  {
    slug:'stillwater', name:'Stillwater', tier:4, hasSub:false,
    metaTitle:'Stillwater Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Stillwater, OK and OSU. Car key replacement, home rekeys & business locks. Call ahead for this longer run: 405-870-5397.',
    h1:'Mobile Locksmith Serving Stillwater & OSU',
    intro:'Cowboy country and a busy college town, Stillwater is at the edge of our range — so call ahead and we’ll plan the run. Car keys, student-rental rekeys, and business locks, all brought to you by a licensed mobile locksmith.'
  },
  {
    slug:'chandler', name:'Chandler', tier:4, hasSub:false,
    metaTitle:'Chandler Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Chandler, OK on Route 66. Car keys, home rekeys & lockout help — call ahead for this run. Call 405-870-5397.',
    h1:'Mobile Locksmith for Chandler, Oklahoma',
    intro:'A Route 66 town and Lincoln County seat at the edge of our range, Chandler gets car keys, rekeys, and lockout help when you call ahead so we can plan the drive. Licensed, mobile, flat-rate.'
  },
  {
    slug:'stroud', name:'Stroud', tier:4, hasSub:false,
    metaTitle:'Stroud Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Stroud, OK near the Tanger outlets. Car keys, rekeys & lockout help — call ahead for this run. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Stroud',
    intro:'Out on Route 66 and the turnpike near the Tanger outlets, Stroud sits at our outer edge — call ahead and we’ll make the trip with car keys, home rekeys, and lockout help.'
  },
  {
    slug:'prague', name:'Prague', tier:4, hasSub:false,
    metaTitle:'Prague Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Prague, OK, home of the Kolache Festival. Car keys, rekeys & lockout help — call ahead. Call 405-870-5397.',
    h1:'Mobile Locksmith for Prague, Oklahoma',
    intro:'Czech-heritage Prague — Kolache Festival country to the east — is at the edge of our range. Call ahead and we’ll bring car keys, home rekeys, and lockout help to your door.'
  },
  {
    slug:'cushing', name:'Cushing', tier:4, hasSub:false,
    metaTitle:'Cushing Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Cushing, OK, the Pipeline Crossroads. Car keys, home rekeys & business locks — call ahead for this run. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Cushing',
    intro:'Known as the Pipeline Crossroads of the World, Cushing is a longer run NE — call ahead and we’ll plan it. Car keys, home rekeys, and business locks, brought to you by a licensed mobile locksmith.'
  },
  {
    slug:'tecumseh', name:'Tecumseh', tier:4, hasSub:false,
    metaTitle:'Tecumseh Locksmith OK | Mobile Car Keys & Home Locks',
    metaDesc:'Mobile locksmith serving Tecumseh, OK near Shawnee. Car keys, rekeys & lockout help — call ahead for this run. Call 405-870-5397.',
    h1:'Mobile Locksmith for Tecumseh, Oklahoma',
    intro:'Just south of Shawnee at the edge of our range, Tecumseh gets car keys, home rekeys, and lockout help when you call ahead so we can plan the drive. Licensed, mobile, flat-rate.'
  },
  {
    slug:'pauls-valley', name:'Pauls Valley', tier:4, hasSub:false,
    metaTitle:'Pauls Valley Locksmith OK | Car Keys, Home & Business',
    metaDesc:'Mobile locksmith serving Pauls Valley, OK along I-35. Car keys, home rekeys & business locks — call ahead for this run. Call 405-870-5397.',
    h1:'Mobile Locksmith Serving Pauls Valley',
    intro:'The Garvin County seat down I-35 (and home of the Toy & Action Figure Museum), Pauls Valley is at our southern edge — call ahead and we’ll bring car keys, home rekeys, and business locks your way.'
  }
];

// Public-facing group headings for the Service Areas hub.
// (No internal "tier" wording — these are shown to visitors.)
export const TIER_LABELS = {
  0:'Popular metro cities', 1:'Oklahoma City & inner metro', 2:'Surrounding metro',
  3:'Outer metro towns', 4:'Edge of our range — call ahead'
};
