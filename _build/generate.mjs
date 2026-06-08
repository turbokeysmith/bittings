// ============================================================
// Generate all service-area pages + hub + sitemap + robots, and
// patch the footer/areaServed on the hand-maintained pages.
//
// Usage:
//   node _build/generate.mjs            -> build ALL tiers
//   node _build/generate.mjs 0,1        -> build only tiers 0 and 1 (preview)
// ============================================================
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  PHONE_E164, PHONE_DISPLAY, SITE, AREA_SERVED, rel, esc,
  head, header, trust, footer, mobilebar, reviewSlot, photoSlots
} from './engine.mjs';
import { CITIES, TIER_LABELS } from './cities.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = join(__dirname, '..', 'site');

// which tiers to build this run
const arg = process.argv[2];
const TIERS = arg ? arg.split(',').map(s => Number(s.trim())) : [0,1,2,3,4];
const built = CITIES.filter(c => TIERS.includes(c.tier));

const tel = `tel:${PHONE_E164}`;
const ANNOTATE = `<!-- Local facts (landmarks/highways/distances) are best-effort from general
     OKC-metro knowledge; verify before relying. Review & photo slots are labeled
     placeholders — not shown as live testimonials until a real one is pasted in. -->`;

function write(relPath, content) {
  const full = join(SITE_DIR, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf8');
}

// ---------- shared body bits ----------
function steps(cityName) {
  return `<section><div class="wrap">
  <div class="sec-head"><h2>How It Works</h2><p>Three simple steps — no stress.</p></div>
  <div class="steps">
    <div class="step"><div class="num">1</div><h3>Call</h3><p>Call or text ${PHONE_DISPLAY}. Tell us what's going on and where you are.</p></div>
    <div class="step"><div class="num">2</div><h3>We come to you</h3><p>As a mobile locksmith, we bring the shop to your door in ${esc(cityName)}.</p></div>
    <div class="step"><div class="num">3</div><h3>Back in business</h3><p>Keys cut, locks fixed, you're rolling again — and you can pay on the spot.</p></div>
  </div>
</div></section>`;
}

function serviceCard(href, icon, title, desc, cta) {
  return `    <a class="scard" href="${href}">
      <div class="icon">${icon}</div><h3>${esc(title)}</h3>
      <p>${esc(desc)}</p>
      <span class="more">${esc(cta)} →</span>
    </a>`;
}

// service cards for a city main page (depth 1)
function cityServiceCards(c) {
  const r = rel(1);
  if (c.hasSub) {
    return [
      serviceCard(`automotive/`, '🚗', 'Automotive', c.sub.auto, 'See automotive'),
      serviceCard(`residential/`, '🏠', 'Residential', c.sub.res, 'See residential'),
      serviceCard(`commercial/`, '🏢', 'Commercial', c.sub.comm, 'See commercial'),
      serviceCard(`${r}emergency/`, '🚨', 'Emergency', `24-hour lockout & lost-key help across ${c.name} and the metro.`, 'See emergency')
    ].join('\n');
  }
  return [
    serviceCard(`${r}automotive/`, '🚗', 'Automotive', `Car key replacement, fob programming & car lockouts in ${c.name}.`, 'See automotive'),
    serviceCard(`${r}residential/`, '🏠', 'Residential', `Rekeys, lock installation & smart locks for ${c.name} homes.`, 'See residential'),
    serviceCard(`${r}commercial/`, '🏢', 'Commercial', `Master keys, high-security & business locks in ${c.name}.`, 'See commercial'),
    serviceCard(`${r}emergency/`, '🚨', 'Emergency', `24-hour lockout & lost-key help in ${c.name}.`, 'See emergency')
  ].join('\n');
}

// ---------- city main / combined page ----------
function renderCity(c) {
  const r = rel(1);
  const canonical = `${SITE}/${c.slug}`;
  const h = head({ title:c.metaTitle, desc:c.metaDesc, canonical, depth:1 });
  const subNote = c.hasSub
    ? `<p>Browse our ${c.name} <a href="automotive/">automotive</a>, <a href="residential/">residential</a>, and <a href="commercial/">commercial</a> locksmith services below, or just call — we come to you.</p>`
    : '';
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${r}service-areas/">Service Areas</a> › ${esc(c.name)}</p>
  <h1>${esc(c.h1)}</h1>
  <p>${esc(c.intro)}</p>
  ${subNote}
  <p style="text-align:center;margin:24px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 Call your ${esc(c.name)} locksmith: ${PHONE_DISPLAY}</a></p>
</div></div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>Locksmith Services in ${esc(c.name)}</h2><p>Cars, homes, and businesses — tap a service or just call.</p></div>
  <div class="cards">
${cityServiceCards(c)}
  </div>
</div></section>

${steps(c.name)}

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>What ${esc(c.name)} Customers Say</h2><p>Real reviews from our Google Business Profile.</p></div>
  ${reviewSlot(`${c.name} customer`)}
</div></section>

${photoSlots(c.name)}

<section><div class="wrap">
  <div class="sec-head"><h2>Need a locksmith in ${esc(c.name)}?</h2><p>Licensed OK #AC441081 · rated 5.0★ · mobile — we come to you.</p></div>
  <p style="text-align:center;margin:0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
  <p style="text-align:center;margin:16px 0 0"><a href="${r}service-areas/">← See all Turbo Keysmith service areas</a></p>
</div></section>`;
  return wrap(h, 1, body);
}

// ---------- sub-page (automotive / residential / commercial) ----------
const SERVICE_DEF = {
  automotive: {
    h1: (city) => `Car Key Replacement & Auto Locksmith in ${city}, OK`,
    title: (city) => `Car Key Replacement in ${city}, OK | Mobile Auto Locksmith`,
    desc: (city, hook) => `${hook} Mobile auto locksmith in ${city}, OK — car keys, fob programming, lockouts. Call ${PHONE_DISPLAY}.`,
    lead: (city, hook) => `${hook} Turbo Keysmith is a mobile auto locksmith that comes to you anywhere in ${city} — no tow needed. We cut and program replacement keys, smart keys, and remote fobs for nearly all makes and models, right in your driveway or parking lot. As a NASTF-authorized locksmith with dealer-level programming tools, we handle modern transponder and push-to-start systems that most shops send back to the dealership — usually faster and for less.`,
    lead2: (city) => `Our van is stocked to replace lost keys, fix or replace failing ignitions, and get you back behind the wheel after a lockout with zero damage to your vehicle. Honest flat rates, quoted up front, every time we roll out to ${city}.`,
    cta: (city) => `📞 Call your ${city} car locksmith: ${PHONE_DISPLAY}`,
    sections: [
      ['Car Key Replacement & Duplication','New keys and spare keys for all makes and models, cut and programmed on-site.'],
      ['Transponder Key & Key-Fob Programming','Dealer-level programming for smart keys, remotes, and push-to-start fobs.'],
      ['Car Lockout Service','Locked your keys in the car? Fast, damage-free entry, 24 hours Mon–Sat.'],
      ['Ignition Repair & Replacement','Worn or stuck ignition? We diagnose, repair, or replace it and get you rolling.']
    ]
  },
  residential: {
    h1: (city) => `Residential Locksmith in ${city}, OK`,
    title: (city) => `Residential Locksmith in ${city}, OK | Rekeys & Smart Locks`,
    desc: (city, hook) => `${hook} Rekeys, deadbolts, smart locks & lockout help in ${city}, OK. Call ${PHONE_DISPLAY}.`,
    lead: (city, hook) => `${hook} Turbo Keysmith keeps ${city} homeowners secure with mobile residential locksmith service that comes to your door. We rekey locks so old keys stop working, install and repair deadbolts and door hardware, set up smart locks, and get you back inside fast when you're locked out — any hour, with fair flat-rate pricing and no mess left behind.`,
    lead2: (city) => `Just moved into a ${city} home or had a roommate move out? Rekeying is the quick, affordable way to make sure only the people you trust can open your doors.`,
    cta: (city) => `📞 Call your ${city} home locksmith: ${PHONE_DISPLAY}`,
    sections: [
      ['Lock Rekeying','Moved in or lost a key? We rekey your locks so only your keys work — no full replacement needed.'],
      ['Lock Installation & Repair','New deadbolts, handle sets, and door hardware installed or repaired right.'],
      ['Smart Lock Installation','Keyless entry and smartphone-controlled locks, installed and set up for you.'],
      ['Home Lockout Service','Locked out of the house? Fast, damage-free entry, 24 hours Mon–Sat.']
    ]
  },
  commercial: {
    h1: (city) => `Commercial Locksmith for ${city} Businesses`,
    title: (city) => `Commercial Locksmith in ${city}, OK | Master Keys & Locks`,
    desc: (city, hook) => `${hook} Master keys, high-security & business locks in ${city}, OK. Call ${PHONE_DISPLAY}.`,
    lead: (city, hook) => `${hook} Turbo Keysmith helps ${city} businesses stay protected with mobile commercial locksmith service — high-security lock installation, master-key systems that put the right doors in the right hands, lock repair, and fast lockout response so a stuck door never costs you a day's work. Licensed, local, and upfront about pricing, we tailor each job to how your business actually runs.`,
    lead2: (city) => `Whether you manage one ${city} storefront or several locations, we'll build a keying plan that's simple to run and tough to beat.`,
    cta: (city) => `📞 Call your ${city} business locksmith: ${PHONE_DISPLAY}`,
    sections: [
      ['High-Security Lock Installation','Commercial-grade locks that stand up to wear, weather, and break-in attempts.'],
      ['Master-Key Systems','One organized system so the right people open the right doors — and nobody else.'],
      ['Commercial Lockout Service','Locked out of the office or shop? Quick response to get you back to work.'],
      ['Commercial Lock Repair','Sticking, worn, or damaged hardware repaired or replaced on-site.']
    ]
  }
};

function renderSub(c, svc) {
  const def = SERVICE_DEF[svc];
  const hookMap = { automotive:c.sub.auto, residential:c.sub.res, commercial:c.sub.comm };
  const hook = hookMap[svc];
  const r = rel(2);
  const canonical = `${SITE}/${c.slug}/${svc}`;
  const h = head({ title: def.title(c.name), desc: def.desc(c.name, hook), canonical, depth:2 });
  const siblings = ['automotive','residential','commercial'].filter(s => s !== svc);
  const sibLinks = siblings.map(s => `<a href="../${s}/">${s[0].toUpperCase()+s.slice(1)} in ${esc(c.name)}</a>`).join(' · ');
  const sectionHtml = def.sections.map(([t,p]) => `  <h2>${esc(t)}</h2>\n  <p>${esc(p)}</p>`).join('\n');
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${r}service-areas/">Service Areas</a> › <a href="../">${esc(c.name)}</a> › ${svc[0].toUpperCase()+svc.slice(1)}</p>
  <h1>${esc(def.h1(c.name))}</h1>
  <p>${esc(def.lead(c.name, hook))}</p>
  <p>${esc(def.lead2(c.name))}</p>
${sectionHtml}
  <p style="margin-top:20px">More for ${esc(c.name)}: ${sibLinks} · <a href="${r}emergency/">24-hour emergency</a></p>
  <p style="text-align:center;margin:24px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${esc(def.cta(c.name))}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="../">← Back to ${esc(c.name)} locksmith services</a></p>
</div></div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>What ${esc(c.name)} Customers Say</h2></div>
  ${reviewSlot(`${c.name} ${svc} customer`)}
</div></section>

${photoSlots(`${c.name} ${svc}`)}`;
  return wrap(h, 2, body);
}

// page wrapper (head already includes <!DOCTYPE>..</head>)
function wrap(h, depth, body) {
  return `${h}
<body>
${header(depth)}
${trust()}
${body}
${footer(depth)}
${mobilebar()}
<script src="${rel(depth)}assets/i18n.js" defer></script>
</body></html>
`;
}

// ---------- Service Areas hub ----------
function renderHub() {
  const canonical = `${SITE}/service-areas`;
  const h = head({
    title:'Service Areas | Turbo Keysmith — Mobile Locksmith Across the OKC Metro',
    desc:'Turbo Keysmith is a mobile locksmith serving Oklahoma City and 24 nearby cities within about 30 miles — Edmond, Norman, Yukon, Moore, Guthrie and more. Find your city. Call 405-870-5397.',
    canonical, depth:1
  });
  // Groups are distance bands (0 = closest). Within a group, keep the data-file
  // order, which is closest -> farthest from the Warr Acres base (do NOT alphabetize).
  const groups = [0,1,2,3,4].filter(t => TIERS.includes(t)).map(t => {
    const list = built.filter(c => c.tier === t)
      .map(c => `      <a class="scard" href="../${c.slug}/"><h3>${esc(c.name)}</h3><span class="more">${esc(c.name)} locksmith →</span></a>`)
      .join('\n');
    if (!list) return '';
    return `  <div class="sec-head" style="margin-top:8px"><h2>${esc(TIER_LABELS[t])}</h2></div>
  <div class="cards">
${list}
  </div>`;
  }).filter(Boolean).join('\n\n');

  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose" style="text-align:center">
  <h1>Where We Work — Mobile Locksmith Service Areas</h1>
  <p>Turbo Keysmith is based at 4201 N MacArthur Blvd in Warr Acres and drives to you across the
  Oklahoma City metro and beyond. Find your city below — every area gets the same licensed
  (OK #AC441081), flat-rate, mobile service. Don't see your town? Call us anyway — if you're near
  the metro, we probably cover you.</p>
  <p style="margin:20px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 Call ${PHONE_DISPLAY}</a></p>
</div></div></section>

<section class="surface"><div class="wrap">
${groups}
</div></section>

<section><div class="wrap">
  <div class="sec-head"><h2>Serving the Oklahoma City Metro</h2><p>Mobile locksmith covering OKC and the surrounding cities — we come to you.</p></div>
  <div class="mapbox">
    <iframe title="Turbo Keysmith service area — Oklahoma City metro" loading="lazy"
      src="https://www.google.com/maps?q=Warr+Acres,+Oklahoma&z=9&output=embed"></iframe>
  </div>
</div></section>`;
  return wrap(h, 1, body);
}

// ---------- sitemap.xml + robots.txt ----------
function renderSitemap() {
  const urls = [];
  const add = (path) => urls.push(`${SITE}/${path}`.replace(/\/$/, '/') );
  // core pages
  ['','automotive/','residential/','commercial/','emergency/','faq/','blog/','certifications/','pay-now/','service-areas/','contact/']
    .forEach(p => urls.push(`${SITE}/${p}`));
  built.forEach(c => {
    urls.push(`${SITE}/${c.slug}/`);
    if (c.hasSub) ['automotive','residential','commercial'].forEach(s => urls.push(`${SITE}/${c.slug}/${s}/`));
  });
  const body = urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}
function renderRobots() {
  return `User-agent: *
Allow: /
# internal planning/copy docs — not for indexing
Disallow: /*.md$

Sitemap: ${SITE}/sitemap.xml
`;
}

// ---------- patch hand-maintained pages (footer + areaServed) ----------
const HAND_PAGES = [
  'index.html','automotive/index.html','residential/index.html','commercial/index.html',
  'emergency/index.html','faq/index.html','blog/index.html','certifications/index.html','pay-now/index.html'
];
function patchHandPages() {
  const areaItems = AREA_SERVED.map(n => `    { "@type": "Place", "name": ${JSON.stringify(n)} }`).join(',\n');
  const areaBlock = `"areaServed": [\n${areaItems}\n  ]`;
  for (const rp of HAND_PAGES) {
    const full = join(SITE_DIR, rp);
    if (!existsSync(full)) { console.warn('  skip (missing):', rp); continue; }
    let html = readFileSync(full, 'utf8');
    const depth = rp.includes('/') ? 1 : 0;
    const r = rel(depth);
    // 1) areaServed array -> full list
    html = html.replace(/"areaServed":\s*\[[\s\S]*?\]/, areaBlock);
    // 2) footer Service Areas column -> hub link + featured
    const newCol = `<div><h4>Service Areas</h4>
      <a href="${r}service-areas/"><strong style="color:#fff">All Service Areas →</strong></a>
      <a href="${r}oklahoma-city/">Oklahoma City</a><a href="${r}edmond/">Edmond</a>
      <a href="${r}norman/">Norman</a><a href="${r}yukon/">Yukon</a></div>`;
    html = html.replace(/<div><h4>Service Areas<\/h4>[\s\S]*?<\/div>/, newCol);
    // 3) language toggle script (idempotent)
    if (!/assets\/i18n\.js/.test(html)) {
      html = html.replace('</body>', `<script src="${r}assets/i18n.js" defer></script>\n</body>`);
    }
    writeFileSync(full, html, 'utf8');
    console.log('  patched:', rp);
  }
}

// ---------- run ----------
console.log(`Building tiers [${TIERS.join(',')}] — ${built.length} cities`);
let count = 0;
for (const c of built) {
  write(`${c.slug}/index.html`, renderCity(c)); count++;
  if (c.hasSub) {
    for (const svc of ['automotive','residential','commercial']) {
      write(`${c.slug}/${svc}/index.html`, renderSub(c, svc)); count++;
    }
  }
}
write('service-areas/index.html', renderHub());
write('sitemap.xml', renderSitemap());
write('robots.txt', renderRobots());
console.log(`Wrote ${count} city pages + hub + sitemap + robots`);
console.log('Patching hand-maintained pages…');
patchHandPages();
console.log('Done.');
