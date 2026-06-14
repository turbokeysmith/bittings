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
  head, header, trust, footer, mobilebar, reviewSlot, photoSlots,
  schema, REVIEWS_WIDGET, LOCAL_POSTS_WIDGET, socialIcons, AWARD_BADGE
} from './engine.mjs';
import { CITIES, TIER_LABELS } from './cities.mjs';
import { GLOSSARY, U, SVC, METRO, HOME, HUB, GROUP_LABELS, CONTACT, CITIES_ES,
         FINANCING as ES_FIN, WARRANTY as ES_WAR, TERMS as ES_TERMS, FAQ as ES_FAQ,
         FAQ_META as ES_FAQ_META, FINTEASER as ES_FINTEASER, WARRTEASER as ES_WARRTEASER,
         CREDS as ES_CREDS, CERTHUB as ES_CERTHUB, BUSINESSRATE as ES_BUSINESSRATE, CRED_REVIEW_NOTE as ES_CRED_NOTE,
         AWARD as ES_AWARD } from './es.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_DIR = join(__dirname, '..', 'site');

// which tiers to build this run
const arg = process.argv[2];
const TIERS = arg ? arg.split(',').map(s => Number(s.trim())) : [0,1,2,3,4];
const built = CITIES.filter(c => TIERS.includes(c.tier));

const tel = `tel:${PHONE_E164}`;

// reciprocal hreflang alternates (EN canonical + ES draft + x-default)
const altPair = (enPath, esPath) => [
  { hreflang:'en', href:`${SITE}${enPath}` },
  { hreflang:'es', href:`${SITE}${esPath}` },
  { hreflang:'x-default', href:`${SITE}${enPath}` }
];
const ANNOTATE = `<!-- Local facts (landmarks/highways/distances) are best-effort from general
     OKC-metro knowledge; verify before relying. -->`;

// Resolve a city's "Our Work" photos to relative <img> srcs, or null if the
// city has none yet (so the gallery stays hidden — no empty boxes).
function cityPhotoSrcs(c, prefix) {
  if (!Array.isArray(c.photos) || !c.photos.length) return null;
  return c.photos.map(f => `${prefix}assets/cities/${f}`);
}

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
  const h = head({ title:c.metaTitle, desc:c.metaDesc, canonical, depth:1,
                   alts: altPair('/'+c.slug, '/es/'+c.slug) });
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

${photoSlots(c.name, cityPhotoSrcs(c, r))}

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
  const h = head({ title: def.title(c.name), desc: def.desc(c.name, hook), canonical, depth:2,
                   alts: altPair(`/${c.slug}/${svc}`, `/es/${c.slug}/${svc}`) });
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
    canonical, depth:1, alts: altPair('/service-areas', '/es/service-areas')
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

// ---------- Financing / Payment-Options page ----------
function renderFinancing() {
  const r = rel(1);
  const canonical = `${SITE}/financing`;
  const h = head({
    title:'Affordable Locksmith & Payment Plans in OKC | Turbo Keysmith',
    desc:'Affordable locksmith in Oklahoma City done right — licensed, NASTF-certified work with flexible, interest-free payment plans (Klarna, Afterpay, Zip) in secure checkout. Not the cheapest; the best value. Call 405-870-5397.',
    canonical, depth:1
  });
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <h1>Affordable Locksmith Service in OKC — Without Cutting Corners</h1>
  <p>Searching for a cheap or affordable locksmith in Oklahoma City? Honest answer: we're not the cheapest — and when it's your car, home, or family's security, you probably don't want the cheapest. We're the <strong>best value</strong>: licensed, NASTF-certified, high-quality work paired with flexible payment options, so an unexpected lockout never has to wait for payday.</p>

  <h2>Quality work, paid your way</h2>
  <p>Through our secure checkout you can split your bill into <strong>4 interest-free payments</strong> on qualifying jobs with <strong>Klarna, Afterpay, or Zip</strong> — approval takes seconds and the work gets done today. We also accept all major cards, cash, and fast digital checkout with <strong>Amazon Pay, Cash App Pay, and Link</strong>. <em>(PayPal Pay-in-4 available on request — just ask.)</em></p>
  <p>We're one of the only locksmiths in the OKC metro offering pay-later financing.</p>

  <h2>Why "cheap" can cost more</h2>
  <p>A botched key program, an unnecessarily drilled lock, or a bargain part that fails fast — the cheapest locksmith often ends up the most expensive. We do it right the first time, and flexible payments mean you get that quality without the upfront sting.</p>

  <h2>When financing helps most</h2>
  <p>Best for bigger, unexpected jobs — lost-all-keys car key replacement, smart-lock installs, whole-home rekeys, and commercial security upgrades.</p>

  <div class="btnrow" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:26px">
    <a class="btn btn-call btn-lg" href="${r}contact/">Get an Instant Quote</a>
    <a class="btn btn-call btn-lg" href="${tel}">📞 Call ${PHONE_DISPLAY}</a>
    <a class="btn btn-ghost btn-lg" href="${r}pay-now/">Pay Now</a>
  </div>
</div></div></section>`;
  return wrap(h, 1, body);
}

// ---------- 6-Month Key Warranty page ----------
function renderWarranty() {
  const r = rel(1);
  const canonical = `${SITE}/warranty`;
  const h = head({
    title:'6-Month Car Key Warranty | Turbo Keysmith — OKC Locksmith',
    desc:'Every automotive key & remote we program is backed by a 6-month workmanship warranty — programming, remote/push-to-start function, and the cut. See full coverage, exclusions, and how it works. Call 405-870-5397.',
    canonical, depth:1
  });
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <h1>6-Month Key Warranty — We Stand Behind Our Work</h1>
  <p>Every automotive key and remote we program is backed by a <strong>6-month workmanship warranty</strong>. If a key or fob we made fails because of a defect — it loses its programming, the buttons quit, the push-to-start or remote-start stops being recognized, or the key won't turn due to a faulty cut — we'll repair or reprogram it at <strong>no charge for parts or labor</strong> for six months.</p>

  <h2>What's covered</h2>
  <p>Programming / immobilizer recognition, remote and proximity (push-to-start) function, any remote-start we set up, the mechanical cut, and defects in the key or fob we supplied.</p>

  <h2>What's not covered</h2>
  <p>Lost or stolen keys; physical or water damage (dropped, run over, crushed, chewed, liquid); dead fob batteries (a normal wear item); and issues caused by the vehicle rather than the key — a dead car battery, faulty vehicle wiring or immobilizer, or manufacturer/dealer software updates that erase programming.</p>

  <h2>How it works</h2>
  <p>If a covered defect happens within 6 months, call us.</p>
  <ul>
    <li><strong>If your vehicle can be driven,</strong> bring it to us and we'll fix or reprogram a covered defect free. If you'd prefer we come to you, that's fine — but a service-call fee applies.</li>
    <li><strong>If your vehicle can't be driven,</strong> we'll come to you free for a covered defect, anywhere within our greater-OKC service area (about a 30-mile radius).</li>
    <li><strong>Outside our service area,</strong> the defect is still covered but travel is not — we don't provide mobile service, reimburse another locksmith, or cover towing for vehicles more than ~30 miles out or out of town. You're welcome to bring it to us.</li>
    <li>A service-call fee applies and is <strong>not waived</strong> if we come out and the issue turns out to be damage, a dead vehicle battery, or not a key problem.</li>
  </ul>

  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 Questions? Call ${PHONE_DISPLAY}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="${r}terms/">See full Terms &amp; Conditions →</a></p>
</div></div></section>`;
  return wrap(h, 1, body);
}

// ---------- Terms & Conditions / Service Agreement page (+ print-to-PDF) ----------
function renderTerms() {
  const r = rel(1);
  const canonical = `${SITE}/terms`;
  const h = head({
    title:'Terms & Conditions / Service Agreement | Turbo Keysmith',
    desc:'Turbo Keysmith service agreement: authorization & ownership, pricing & payment, the 6-month automotive key warranty, limitation of liability, and agreement. Licensed OK #AC441081.',
    canonical, depth:1
  });
  const body = `<!-- LEGAL: have a licensed attorney review the authorization, warranty, and
     liability clauses before relying on this document. Keep in sync with /warranty/
     and the app invoice signature line. -->
<section><div class="wrap"><div class="prose">
  <div class="tc-brand"><img src="${r}assets/logo.png" alt="Turbo Keysmith"><div><strong>Turbo Keysmith</strong><br>4201 N MacArthur Blvd, Warr Acres, OK 73122 · ${PHONE_DISPLAY} · OK Lic. #AC441081</div></div>
  <h1>Terms &amp; Conditions — Service Agreement</h1>
  <p class="noprint" style="text-align:right"><button class="btn btn-call" onclick="window.print()">⬇ Download / Print PDF</button></p>

  <h2>1. Authorization &amp; Ownership</h2>
  <p>By requesting service and signing, you confirm you own the vehicle or property, or are authorized to approve this work, and that any ID or proof of ownership requested was provided truthfully. We may decline or stop service if ownership/authorization can't be verified.</p>

  <h2>2. Pricing &amp; Payment</h2>
  <p>We provide a price before work begins; payment is due on completion. We accept cash, debit/credit cards, digital wallets (Amazon Pay, Cash App Pay, Link), and pay-later financing (Klarna, Afterpay, Zip; PayPal Pay-in-4 on request). A surcharge of up to 2% applies to <strong>credit-card payments only</strong> — never debit or financing — and is disclosed before charging. Financing is provided by third parties under their own terms; we are paid in full at the time of service.</p>

  <h2>3. 6-Month Automotive Key Warranty</h2>
  <p>Every automotive key and remote we program is backed by a 6-month workmanship warranty. <strong>Covered:</strong> programming/immobilizer recognition, remote and proximity (push-to-start) function, any remote-start we set up, the mechanical cut, and defects in the key or fob we supplied. <strong>Not covered:</strong> lost or stolen keys; physical or water damage; dead fob batteries; and vehicle-side issues (dead car battery, faulty wiring or immobilizer, or manufacturer/dealer software updates that erase programming). <strong>Service:</strong> if your vehicle is drivable, bring it to us and a covered defect is repaired or reprogrammed free; if it can't be driven, we come to you free within our greater-OKC service area (~30-mile radius). Outside that area the defect is covered but travel is not. A service-call fee applies and is not waived if the issue turns out to be damage, a dead vehicle battery, or not a key problem. Full terms: <a href="${r}warranty/">our Warranty page</a>.</p>

  <h2>4. Limitation of Liability</h2>
  <p>We are not responsible for pre-existing conditions, prior damage, or mechanical/electrical faults not caused by our work. Our total liability for any claim is limited to the amount paid for the service. We are not liable for indirect or consequential losses.</p>

  <h2>5. Agreement</h2>
  <p>By signing our invoice/receipt, you acknowledge you have read and agree to these Terms &amp; Conditions.</p>

  <p style="color:var(--dim);font-size:13px;margin-top:24px">Turbo Keysmith · OK Lic. #AC441081 · ${PHONE_DISPLAY} · turbokeysmith.com/terms</p>
</div></div></section>
<style>
  .tc-brand{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .tc-brand img{height:46px;width:auto}
  @media print{ header.site,.trust,.mobilebar,footer.site,.noprint,button{display:none!important} body{background:#fff;color:#000} }
</style>`;
  return wrap(h, 1, body);
}

// ---------- Certifications hub + dedicated credential pages ----------
// BusinessRate = review-based recognition (NOT a license) — plain text, no link/badge.
const BUSINESSRATE = 'Top-Rated Locksmith — BusinessRate (based on verified customer reviews).';
const CREDS = [
  { slug:'certifications/google-verified', group:'license', featured:true, name:'Google Verified',
    title:'Google Verified Locksmith in OKC | Turbo Keysmith',
    metaDesc:"Turbo Keysmith carries Google's Verified badge — Google background-checks, license-validates and insurance-verifies the business. What the badge means for you. Call 405-870-5397.",
    h1:'Google Verified — Independently Vetted by Google',
    teaser:"Google's trust mark for businesses that pass its Local Services vetting — background, license and insurance checks.",
    whatIs:"We carry Google's Google Verified badge — the trust mark Google displays for businesses that pass its Local Services vetting.",
    whatTakes:'To earn it, Google vets the business through background checks, license validation, and insurance verification.',
    whatMeans:"Google itself has confirmed we're a real, licensed, insured, background-checked locksmith — an independent third-party vote of confidence before you ever pick up the phone." },
  { slug:'oklahoma-license', group:'license', featured:true, name:'Oklahoma Locksmith License #AC441081',
    title:'Oklahoma Locksmith License #AC441081 | Turbo Keysmith',
    metaDesc:'Turbo Keysmith holds Oklahoma Locksmith License #AC441081 (Oklahoma Dept. of Labor) — fingerprinting, FBI background check and a state exam. Why a licensed locksmith matters. Call 405-870-5397.',
    h1:'Oklahoma Locksmith License #AC441081',
    teaser:'State-issued license #AC441081 — Oklahoma is one of ~15 states that require fingerprinting, an FBI background check and a competency exam.',
    whatIs:"Oklahoma is one of only about 15 states that legally require locksmiths to be licensed — most don't, meaning anyone can claim the title. Licensing runs through the Oklahoma Department of Labor's Alarm, Locksmith & Fire Sprinkler program.",
    whatTakes:'Earning it requires fingerprinting, an FBI background check, and passing the state competency exam.',
    whatMeans:"You're trusting your home, vehicle, or business security to someone the state has background-checked, tested, and holds accountable — your first protection against the locksmith scams on the rise." },
  { slug:'nastf', group:'license', name:'NASTF Vehicle Security Professional (VSP)',
    title:'NASTF Vehicle Security Professional (VSP) Locksmith | Turbo Keysmith',
    metaDesc:'Turbo Keysmith is NASTF VSP–credentialed with a personal LSID — dealer-level, vetted access to manufacturer key codes and immobilizer data. What it means for your car keys. Call 405-870-5397.',
    h1:'NASTF Vehicle Security Professional (VSP) — LSID Credentialed',
    teaser:'Vetted, dealer-level access to manufacturer key codes and immobilizer data, with a personal LSID.',
    whatIs:'The National Automotive Service Task Force is a non-profit founded in 2000 by the automakers and the independent repair industry, and its Vehicle Security Professional Registry vets and credentials professional locksmiths to access manufacturer security systems.',
    whatTakes:"Getting credentialed means passing a background check and agreeing to strict terms, after which you're issued a personal Locksmith Identification (LSID) number assigned one-to-one to the individual.",
    whatMeans:'This is legitimate, dealer-level access — it lets us pull the same secure key codes and immobilizer data the dealership uses, so we can make and program keys for virtually any make, the right way, as a vetted professional rather than a sketchy code broker.' },
  { slug:'keyless2go', group:'license', name:'Keyless2Go Certified Locksmith',
    title:'Keyless2Go Certified Locksmith | Turbo Keysmith — OKC',
    metaDesc:'Turbo Keysmith is a Keyless2Go Certified locksmith — OE-grade, FCC-registered car key fobs with transparent upfront pricing, up to 70% under dealer. Call 405-870-5397.',
    h1:'Keyless2Go Certified Locksmith',
    teaser:'Certified installer of OE-grade, FCC-registered key fobs — transparent pricing, up to 70% under the dealership.',
    whatIs:"Keyless2Go is one of the nation's leading aftermarket car-key remote brands, with over 5 million fobs sold, known for OE-grade, FCC-registered components.",
    whatTakes:'Their Certified Installer Network verifies participants are genuine professional locksmiths and holds them to a code of conduct with transparent upfront pricing, no surprise upcharges, and a customer review system you must keep a satisfactory rating in to stay certified.',
    whatMeans:'Premium, dealer-quality key parts covering the vast majority of vehicles, at savings of up to 70% versus the dealership — with pricing you see before any work begins.' },
  { slug:'omla', group:'assoc', name:'Oklahoma Master Locksmith Association (OMLA)', link:'https://omla.com',
    title:'Oklahoma Master Locksmith Association (OMLA) Member | Turbo Keysmith',
    metaDesc:'Turbo Keysmith is a member of the Oklahoma Master Locksmith Association (OMLA) — ongoing training and higher professional standards. Call 405-870-5397.',
    h1:'Oklahoma Master Locksmith Association (OMLA)',
    teaser:"The state's professional locksmith association — ongoing training and higher security standards.",
    whatIs:"OMLA is the state's professional locksmith association, dedicated to cooperation among Oklahoma locksmiths and promoting higher standards of security and professionalism.",
    whatTakes:'Members have access to ODOL-sanctioned license-prep and continuing-education classes covering locksmithing and access control.',
    whatMeans:'Membership signals a locksmith who invests in ongoing training and holds themselves to the profession’s standards rather than just winging it.' },
  { slug:'okbfaa', group:'assoc', name:'Oklahoma Burglar & Fire Alarm Association (OKBFAA)', link:'https://okbfaa.org',
    title:'Oklahoma Burglar & Fire Alarm Association (OKBFAA) Member | Turbo Keysmith',
    metaDesc:'Turbo Keysmith is a member of the Oklahoma Burglar & Fire Alarm Association (OKBFAA) — current on electronic security codes and standards for commercial work. Call 405-870-5397.',
    h1:'Oklahoma Burglar & Fire Alarm Association (OKBFAA)',
    teaser:'Membership in the state electronic-security association — current on access-control codes and standards.',
    whatIs:'OKBFAA is committed to promoting licensed professionals in the electronic security industry and educating members on the latest products, codes, and standards, working closely with the Oklahoma Department of Labor.',
    whatMeans:'It shows we stay current on electronic security and access-control standards — especially relevant for business and commercial security work.' }
];
const credHref = (slug) => slug.startsWith('certifications/') ? slug.slice('certifications/'.length) + '/' : '../' + slug + '/';

function renderCredPage(c) {
  const depth = c.slug.split('/').length;
  const r = rel(depth);
  const canonical = `${SITE}/${c.slug}`;
  const h = head({ title:c.title, desc:c.metaDesc, canonical, depth });
  const parts = [`  <h2>What it is</h2>\n  <p>${esc(c.whatIs)}</p>`];
  if (c.whatTakes) parts.push(`  <h2>What it takes to earn</h2>\n  <p>${esc(c.whatTakes)}</p>`);
  parts.push(`  <h2>What it means for you</h2>\n  <p>${esc(c.whatMeans)}</p>`);
  const extLink = c.link ? `\n  <p><a href="${c.link}" target="_blank" rel="noopener">${esc(c.link.replace('https://',''))} →</a></p>` : '';
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${r}certifications/">Certifications</a> › ${esc(c.name)}</p>
  <h1>${esc(c.h1)}</h1>
${parts.join('\n')}${extLink}
  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="${r}certifications/">← All certifications &amp; credentials</a></p>
</div></div></section>`;
  return wrap(h, depth, body);
}
function renderCertHub() {
  const canonical = `${SITE}/certifications`;
  const h = head({ title:'Certifications, Licenses & Credentials | Turbo Keysmith — OKC Locksmith',
    desc:'Turbo Keysmith is a fully licensed, vetted Oklahoma locksmith: Google Verified, OK License #AC441081, NASTF VSP, Keyless2Go Certified, plus OMLA & OKBFAA membership. What each credential means for you. Call 405-870-5397.',
    canonical, depth:1 });
  const teaser = (c) => `    <a class="scard" href="${credHref(c.slug)}"><h3>${esc(c.name)}</h3><p>${esc(c.teaser)}</p><span class="more">Learn more →</span></a>`;
  const lic = CREDS.filter(c => c.group === 'license');
  const licOrdered = [...lic.filter(c => c.featured), ...lic.filter(c => !c.featured)]; // Google Verified + OK license first
  const assoc = CREDS.filter(c => c.group === 'assoc');
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose" style="text-align:center">
  <h1>Certifications, Licenses &amp; Credentials</h1>
  <p>When you let a locksmith into your home, car, or business, credentials matter. Turbo Keysmith is a
  fully licensed, vetted, local Oklahoma locksmith — here's the proof, and what each one means for you.</p>
</div></div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>Licenses &amp; Credentials</h2><p>Independently verified — the credentials that take real vetting to earn.</p></div>
  <div class="cards">
${licOrdered.map(teaser).join('\n')}
  </div>
</div></section>

<section><div class="wrap">
  <div class="sec-head"><h2>Professional Associations</h2><p>Memberships that signal ongoing training and professional standards.</p></div>
  <div class="cards">
${assoc.map(teaser).join('\n')}
  </div>
</div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>Recognition</h2><p>Earned from our verified customer reviews — separate from the licenses above.</p></div>
  ${AWARD_BADGE}
  <p style="text-align:center;color:var(--dim);margin:6px 0 0">${esc(BUSINESSRATE)}</p>
</div></section>

<section><div class="wrap">
  <p style="text-align:center;margin:0"><a class="btn btn-call btn-lg" href="${tel}">📞 Call Turbo Keysmith: ${PHONE_DISPLAY}</a></p>
</div></section>`;
  return wrap(h, 1, body);
}

// ---------- sitemap.xml + robots.txt ----------
function renderSitemap() {
  const urls = [];
  const add = (path) => urls.push(`${SITE}/${path}`.replace(/\/$/, '/') );
  // core pages
  ['','automotive/','residential/','commercial/','emergency/','financing/','warranty/','terms/','faq/','blog/','certifications/','pay-now/','service-areas/','contact/']
    .forEach(p => urls.push(`${SITE}/${p}`));
  CREDS.forEach(c => urls.push(`${SITE}/${c.slug}/`));   // 6 dedicated credential pages
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
# Spanish pages are an unpublished DRAFT (also noindex). Keep crawlers out until approved.
Disallow: /es/

Sitemap: ${SITE}/sitemap.xml
`;
}

// ---------- patch hand-maintained pages (footer + areaServed) ----------
const HAND_PAGES = [
  'index.html','automotive/index.html','residential/index.html','commercial/index.html',
  'emergency/index.html','faq/index.html','blog/index.html','pay-now/index.html'
  // NOTE: certifications/index.html is now GENERATED (renderCertHub), not hand-maintained.
];
function patchHandPages() {
  // The Google images widget was removed; in its place the hand pages (homepage +
  // service pages) get an on-brand "Follow us" social row. (The regex still keys
  // on the old "Our Work" heading to find the section to replace.)
  const ourWork = `<section class="surface"><div class="wrap"><div class="social-follow">
  <div class="sec-head"><h2>See Our Work — Follow Turbo Keysmith</h2><p>Latest jobs, tips, and reviews on social.</p></div>
  ${socialIcons()}
</div></div></section>`;
  for (const rp of HAND_PAGES) {
    const full = join(SITE_DIR, rp);
    if (!existsSync(full)) { console.warn('  skip (missing):', rp); continue; }
    let html = readFileSync(full, 'utf8');
    const depth = rp.includes('/') ? 1 : 0;
    const r = rel(depth);

    // 1) SCHEMA: replace the page's first (Locksmith) JSON-LD block with the
    //    canonical schema() — one source for hours, full 25-city areaServed, and
    //    no aggregateRating/review. (On /faq/ this leaves the 2nd FAQPage block
    //    untouched.) Function replacer avoids $-pattern interpretation.
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => schema());

    // 2) WIDGETS + placeholder cleanup (each is a no-op where the marker is absent)
    //    a) "Our Work" placeholder slots -> live images widget (homepage + service pages)
    html = html.replace(/<section[^>]*><div class="wrap">\s*<div class="sec-head"><h2>Our Work<\/h2>[\s\S]*?<\/section>/, () => ourWork);
    //    a2) Certifications "Credentials & Badges" empty photo-slots -> removed
    //        (the info-grid above already lists the real credentials)
    html = html.replace(/\s*<h2>Credentials[\s\S]*?<div class="ba">[\s\S]*?<\/div>\s*<\/div>/, '');
    //    b) Reviews carousel placeholder -> live reviews widget (homepage)
    html = html.replace(/<div class="widget-slot"><b>⭐ GOOGLE REVIEWS CAROUSEL[\s\S]*?<\/div>/, () => REVIEWS_WIDGET);
    //    c) Redundant "Google photos" section removed (photos now live in "Our Work")
    html = html.replace(/\s*<!-- =====+ Google photos[\s\S]*?<\/section>/, '');
    //    d) Local-posts placeholder -> live local-posts widget (homepage only)
    html = html.replace(/<div class="widget-slot"><b>📰 GOOGLE LOCAL POSTS[\s\S]*?<\/div>/, () => LOCAL_POSTS_WIDGET);
    //    e) Google FAQ widget placeholder -> removed (native FAQ + FAQPage schema stay)
    html = html.replace(/<div class="widget-slot"[^>]*><b>❓ GOOGLE FAQ[\s\S]*?<\/div>\s*/, '');
    //    f) Blog "POST SLOT" placeholders -> removed (real posts are a later task)
    html = html.replace(/<div class="scard"><div class="icon">📝<\/div><h3>POST SLOT \d<\/h3><p>[^<]*<\/p><\/div>\s*/g, '');
    html = html.replace(/<div class="cards" style="margin-top:8px">\s*<\/div>/, '');
    //    g) Owner-facing dev NOTE comments removed
    html = html.replace(/<!-- NOTE[\s\S]*?-->\s*/g, '');

    // 3) header + footer -> canonical engine versions, so every hand page shares
    //    one nav (incl. the Financing link) and one footer (incl. Financing /
    //    Key Warranty / Terms links). Depth-aware via header(depth)/footer(depth).
    html = html.replace(/<header class="site">[\s\S]*?<\/header>/, () => header(depth));
    html = html.replace(/<footer class="site">[\s\S]*?<\/footer>/, () => footer(depth));
    // 4) language toggle script (idempotent)
    if (!/assets\/i18n\.js/.test(html)) {
      html = html.replace('</body>', `<script src="${r}assets/i18n.js" defer></script>\n</body>`);
    }
    writeFileSync(full, html, 'utf8');
    console.log('  patched:', rp);
  }
}

// ============================================================
//  /es/  — Spanish DRAFT tree (noindex, out of sitemap, hreflang, draft banner)
// ============================================================
const esBanner = () => `<div style="background:var(--amber);color:var(--amber-ink);text-align:center;font-weight:800;font-size:13px;padding:8px 14px;letter-spacing:.2px">${esc(U.banner)}</div>`;
const esHablas = () => `<div style="text-align:center;padding:12px 18px;background:var(--surface)"><a class="btn btn-call" href="https://wa.me/14058705397">${esc(U.hablas)}</a></div>`;
const tt = (s, city) => esc(s.replace(/\{city\}/g, city).replace(/\{label\}/g, city));

function esHeadCommon({ title, desc, enPath, esPath, esDepth }) {
  return head({ title, desc, canonical:`${SITE}${esPath}`, lang:'es', noindex:true,
    assetRel:'../'.repeat(esDepth), alts: altPair(enPath, esPath) });
}
function esHeader(d) {
  const a = '../'.repeat(d), e = '../'.repeat(d-1);
  const N = U.nav;
  return `<header class="site">
  <div class="bar">
    <a class="brand" href="${e}index.html"><img src="${a}assets/logo.png" alt="Turbo Keysmith logo"><b>Turbo Keysmith</b></a>
    <nav class="main">
      <a href="${e}index.html">${esc(N.home)}</a>
      <a href="${e}automotive/">${esc(N.automotive)}</a>
      <a href="${e}residential/">${esc(N.residential)}</a>
      <a href="${e}commercial/">${esc(N.commercial)}</a>
      <a href="${e}emergency/">${esc(N.emergency)}</a>
      <a href="${e}financing/">${esc(N.financing)}</a>
      <a href="${e}certifications/">${esc(N.certifications)}</a>
      <a href="${e}faq/">${esc(N.faq)}</a>
      <a href="${a}pay-now/">${esc(N.payNow)}</a>
    </nav>
    <a class="head-call" href="tel:${PHONE_E164}"><span class="btn btn-call">📞 ${PHONE_DISPLAY}</span></a>
    <button class="navtoggle" aria-label="Menú" onclick="document.getElementById('m').classList.toggle('open')">☰</button>
  </div>
  <div class="subbar"><div class="wrap">${socialIcons('subbar-icons')}</div></div>
  <nav class="mobile" id="m">
    <a href="${e}index.html">${esc(N.home)}</a>
    <a href="${e}automotive/">${esc(N.automotive)}</a>
    <a href="${e}residential/">${esc(N.residential)}</a>
    <a href="${e}commercial/">${esc(N.commercial)}</a>
    <a href="${e}emergency/">${esc(N.emergency)}</a>
    <a href="${e}financing/">${esc(N.financing)}</a>
    <a href="${e}warranty/">${esc(N.warranty)}</a>
    <a href="${a}blog/">${esc(N.blog)}</a>
    <a href="${e}certifications/">${esc(N.certifications)}</a>
    <a href="${e}faq/">${esc(N.faq)}</a>
    <a href="${a}pay-now/">${esc(N.payNow)}</a>
  </nav>
</header>`;
}
function esTrust() {
  return `<div class="trust"><div class="wrap">
${U.trust.map(([ic,b,s]) => `  <div class="item"><span class="ic">${ic}</span><span class="big">${esc(b)}</span><span>${esc(s)}</span></div>`).join('\n')}
</div></div>`;
}
function esFooter(d) {
  const a = '../'.repeat(d), e = '../'.repeat(d-1), F = U.footer, N = U.nav;
  return `<footer class="site"><div class="wrap">
  <div class="cols">
    <div><h4>Turbo Keysmith</h4>
      <p style="color:#c2cad3;margin:0 0 10px">${esc(F.tagline)}<br>4201 N MacArthur Blvd, Warr Acres, OK 73122</p>
      <a href="tel:${PHONE_E164}"><strong style="color:#fff">${PHONE_DISPLAY}</strong></a></div>
    <div><h4>${esc(F.services)}</h4>
      <a href="${e}automotive/">${esc(N.automotive)}</a><a href="${e}residential/">${esc(N.residential)}</a>
      <a href="${e}commercial/">${esc(N.commercial)}</a><a href="${e}emergency/">${esc(N.emergency)}</a></div>
    <div><h4>${esc(F.company)}</h4>
      <a href="${e}financing/">${esc(N.financing)}</a><a href="${e}warranty/">${esc(N.warranty)}</a>
      <a href="${a}blog/">${esc(N.blog)}</a><a href="${e}certifications/">${esc(N.certifications)}</a>
      <a href="${e}faq/">${esc(N.faq)}</a><a href="${e}contact/">${esc(N.contact)}</a></div>
    <div><h4>${esc(F.areas)}</h4>
      <a href="${e}service-areas/"><strong style="color:#fff">${esc(F.allAreas)}</strong></a>
      <a href="${e}oklahoma-city/">Oklahoma City</a><a href="${e}edmond/">Edmond</a>
      <a href="${e}norman/">Norman</a><a href="${e}yukon/">Yukon</a></div>
  </div>
  <div class="footer-social">${socialIcons('subbar-icons')}</div>
  <div class="legal"><span>${esc(F.copyright)} · <a href="${e}terms/" style="color:inherit">${esc(N.terms)}</a></span>
    <a class="staff-login" href="${a}../cloud-test.html" rel="nofollow">${esc(F.staff)}</a></div>
</div></footer>`;
}
function esMobilebar() {
  return `<nav class="mobilebar">
  <a class="call" href="tel:${PHONE_E164}"><span class="ic">📞</span>${esc(U.mobilebar.call)}</a>
  <a class="text" href="sms:${PHONE_E164}"><span class="ic">💬</span>${esc(U.mobilebar.text)}</a>
  <a class="wa" href="https://wa.me/14058705397"><span class="ic">🟢</span>${esc(U.mobilebar.wa)}</a>
</nav>`;
}
function esWrap(h, d, body) {
  return `${h}
<body>
${esBanner()}
${esHeader(d)}
${esHablas()}
${esTrust()}
${body}
${esFooter(d)}
${esMobilebar()}
</body></html>
`;
}
const esReviewSlot = (label) => `<div class="award-wrap"><span class="award-badge">${esc(ES_AWARD)}</span></div>
  <div class="widget-slot"><b>${tt(U.reviewSlot, label)}</b>
    <small>${tt(U.reviewSlotSub, label)}</small></div>`;
function esPhotoSlots(label, photos) {
  const W = U.work;
  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (!list.length) {
    return `<!-- Galería "Nuestro trabajo": aún no hay fotos de ${esc(label)} — oculta hasta agregar imágenes reales -->`;
  }
  const cards = list.map(src =>
    `<figure class="photo"><img src="${esc(src)}" alt="${esc(W.title)} — ${esc(label)}" loading="lazy"></figure>`
  ).join('\n      ');
  return `<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${esc(W.title)} — ${esc(label)}</h2><p>${tt(W.sub, label)}</p></div>
  <div class="photo-grid">
      ${cards}
  </div>
</div></section>`;
}
function esSteps(city) {
  const H = U.howWorks;
  return `<section><div class="wrap">
  <div class="sec-head"><h2>${esc(H.title)}</h2><p>${esc(H.sub)}</p></div>
  <div class="steps">
    <div class="step"><div class="num">1</div><h3>${esc(H.s1[0])}</h3><p>${esc(H.s1[1])}</p></div>
    <div class="step"><div class="num">2</div><h3>${esc(H.s2t)}</h3><p>${tt(H.s2, city)}</p></div>
    <div class="step"><div class="num">3</div><h3>${esc(H.s3[0])}</h3><p>${esc(H.s3[1])}</p></div>
  </div>
</div></section>`;
}
function esServiceCards(c, d) {
  const e = '../'.repeat(d-1), N = U.nav, C = U.cardCta;
  const card = (href, icon, key, desc) => `    <a class="scard" href="${href}">
      <div class="icon">${icon}</div><h3>${esc(N[key])}</h3>
      <p>${esc(desc)}</p>
      <span class="more">${esc(C[key])} →</span>
    </a>`;
  if (c.hasSub) {
    return [
      card(`automotive/`, '🚗', 'automotive', c.es.sub.auto),
      card(`residential/`, '🏠', 'residential', c.es.sub.res),
      card(`commercial/`, '🏢', 'commercial', c.es.sub.comm),
      card(`${e}emergency/`, '🚨', 'emergency', U.cardDesc.emerSub(c.name))
    ].join('\n');
  }
  return [
    card(`${e}automotive/`, '🚗', 'automotive', U.cardDesc.autoSub(c.name)),
    card(`${e}residential/`, '🏠', 'residential', U.cardDesc.resSub(c.name)),
    card(`${e}commercial/`, '🏢', 'commercial', U.cardDesc.commSub(c.name)),
    card(`${e}emergency/`, '🚨', 'emergency', U.cardDesc.emerSub(c.name))
  ].join('\n');
}
function esCity(c) {
  const d = 2, e = '../', E = c.es;
  const h = esHeadCommon({ title:E.metaTitle, desc:E.metaDesc, enPath:'/'+c.slug, esPath:'/es/'+c.slug, esDepth:d });
  const subNote = c.hasSub
    ? `<p>Explora nuestros servicios de cerrajería en ${esc(c.name)} — <a href="automotive/">automotriz</a>, <a href="residential/">residencial</a> y <a href="commercial/">comercial</a> — abajo, o solo llama. Vamos a ti.</p>`
    : '';
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${e}service-areas/">${esc(U.footer.areas)}</a> › ${esc(c.name)}</p>
  <h1>${esc(E.h1)}</h1>
  <p>${esc(E.intro)}</p>
  ${subNote}
  <p style="text-align:center;margin:24px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${tt(U.callCity, c.name)}</a></p>
</div></div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${tt(U.citySvcHead, c.name)}</h2><p>${esc(U.citySvcSub)}</p></div>
  <div class="cards">
${esServiceCards(c, d)}
  </div>
</div></section>

${esSteps(c.name)}

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${tt(U.whatCustomers, c.name)}</h2><p>${esc(U.realReviews)}</p></div>
  ${esReviewSlot(c.name)}
</div></section>

${esPhotoSlots(c.name, cityPhotoSrcs(c, '../../'))}

<section><div class="wrap">
  <div class="sec-head"><h2>${tt(U.needHead, c.name)}</h2><p>${esc(U.needSub)}</p></div>
  <p style="text-align:center;margin:0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
  <p style="text-align:center;margin:16px 0 0"><a href="${e}service-areas/">${esc(U.seeAll)}</a></p>
</div></section>`;
  return esWrap(h, d, body);
}
function esSub(c, svc) {
  const d = 3, e = '../'.repeat(d-1), def = SVC[svc];
  const hook = { automotive:c.es.sub.auto, residential:c.es.sub.res, commercial:c.es.sub.comm }[svc];
  const h = esHeadCommon({ title:def.title(c.name), desc:def.desc(c.name, hook), enPath:`/${c.slug}/${svc}`, esPath:`/es/${c.slug}/${svc}`, esDepth:d });
  const sibs = ['automotive','residential','commercial'].filter(s => s !== svc)
    .map(s => `<a href="../${s}/">${esc(U.nav[s])} en ${esc(c.name)}</a>`).join(' · ');
  const sect = def.sections.map(([t,p]) => `  <h2>${esc(t)}</h2>\n  <p>${esc(p)}</p>`).join('\n');
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${e}service-areas/">${esc(U.footer.areas)}</a> › <a href="../">${esc(c.name)}</a> › ${esc(U.nav[svc])}</p>
  <h1>${esc(def.h1(c.name))}</h1>
  <p>${esc(def.lead(c.name, hook))}</p>
  <p>${esc(def.lead2(c.name))}</p>
${sect}
  <p style="margin-top:20px">${tt(U.moreFor, c.name)} ${sibs} · <a href="${e}emergency/">${esc(U.emergency24)}</a></p>
  <p style="text-align:center;margin:24px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${esc(def.cta(c.name))}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="../">${tt(U.backCity, c.name)}</a></p>
</div></div></section>

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${tt(U.whatCustomers, c.name)}</h2></div>
  ${esReviewSlot(c.name + ' ' + U.nav[svc].toLowerCase())}
</div></section>

${esPhotoSlots(c.name + ' ' + U.nav[svc].toLowerCase())}`;
  return esWrap(h, d, body);
}
function esHub(esBuilt) {
  const d = 2;
  const h = esHeadCommon({ title:HUB.title, desc:HUB.desc, enPath:'/service-areas', esPath:'/es/service-areas', esDepth:d });
  const groups = [0,1,2,3].map(t => {
    const list = esBuilt.filter(c => c.tier === t)
      .map(c => `      <a class="scard" href="../${c.slug}/"><h3>${esc(c.name)}</h3><span class="more">${tt(HUB.cityCta, c.name)}</span></a>`).join('\n');
    if (!list) return '';
    return `  <div class="sec-head" style="margin-top:8px"><h2>${esc(GROUP_LABELS[t])}</h2></div>
  <div class="cards">
${list}
  </div>`;
  }).filter(Boolean).join('\n\n');
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose" style="text-align:center">
  <h1>${esc(HUB.h1)}</h1>
  <p>${esc(HUB.intro)}</p>
  <p style="margin:20px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
</div></div></section>
<section class="surface"><div class="wrap">
${groups}
</div></section>
<section><div class="wrap">
  <div class="sec-head"><h2>${esc(HUB.mapHead)}</h2><p>${esc(HUB.mapSub)}</p></div>
  <div class="mapbox"><iframe title="Turbo Keysmith — Oklahoma City" loading="lazy" src="https://www.google.com/maps?q=Warr+Acres,+Oklahoma&z=9&output=embed"></iframe></div>
</div></section>`;
  return esWrap(h, d, body);
}
function esService(key) {
  const d = 2, e = '../', m = METRO[key];
  const h = esHeadCommon({ title:m.title, desc:m.desc, enPath:'/'+m.slug, esPath:'/es/'+m.slug, esDepth:d });
  const leads = m.leads.map(p => `  <p>${esc(p)}</p>`).join('\n');
  const sect = m.sections.map(([t,p]) => `  <h2>${esc(t)}</h2>\n  <p>${esc(p)}</p>`).join('\n');
  const warrSection = key === 'automotive' ? `
<section class="surface"><div class="wrap"><div class="prose">
  <h2>${esc(ES_WAR.h1)}</h2>
  <p>${esc(ES_WAR.intro)}</p>
  <p><strong>${esc(ES_WAR.coveredHead)}:</strong> ${esc(ES_WAR.coveredBody)} <strong>${esc(ES_WAR.notCoveredHead)}:</strong> ${esc(ES_WAR.notCoveredBody)}</p>
  <p><a href="${e}warranty/">Leer la garantía completa →</a></p>
</div></div></section>` : '';
  const finTeaser = `
<section><div class="wrap"><div class="cards">
  <a class="scard" href="${e}financing/"><div class="icon">💳</div><h3>${esc(ES_FINTEASER.title)}</h3><p>${esc(ES_FINTEASER.body)}</p><span class="more">${esc(ES_FINTEASER.more)}</span></a>
</div></div></section>`;
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <h1>${esc(m.h1)}</h1>
${leads}
${sect}
  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${esc(m.cta)}</a></p>
</div></div></section>
${warrSection}
${finTeaser}
${esPhotoSlots(U.nav[key] || key)}`;
  return esWrap(h, d, body);
}
function esHome() {
  const d = 1, m = METRO;
  const h = esHeadCommon({ title:HOME.title, desc:HOME.desc, enPath:'/', esPath:'/es/', esDepth:d });
  const N = U.nav, C = U.cardCta;
  const card = (href, icon, key, desc) => `    <a class="scard" href="${href}"><div class="icon">${icon}</div><h3>${esc(N[key])}</h3><p>${esc(desc)}</p><span class="more">${esc(C[key])} →</span></a>`;
  const body = `<div class="hero"><div class="wrap">
  <h1>${esc(HOME.h1)}</h1>
  <p class="lead">${esc(HOME.lead)}</p>
  <div class="btnrow">
    <a class="btn btn-call btn-lg" href="tel:${PHONE_E164}">${esc(HOME.callBtn)}</a>
    <a class="btn btn-ghost btn-lg" href="https://wa.me/14058705397">💬 WhatsApp</a>
  </div>
</div></div>

<section><div class="wrap">
  <div class="sec-head"><h2>${esc(HOME.servicesHead)}</h2><p>${esc(HOME.servicesSub)}</p></div>
  <div class="cards">
${card('automotive/', '🚗', 'automotive', U.cardDesc.autoSub('OKC'))}
${card('residential/', '🏠', 'residential', U.cardDesc.resSub('OKC'))}
${card('commercial/', '🏢', 'commercial', U.cardDesc.commSub('OKC'))}
${card('emergency/', '🚨', 'emergency', U.cardDesc.emerSub('OKC'))}
  </div>
</div></section>

<section><div class="wrap"><div class="cards">
  <a class="scard" href="financing/"><div class="icon">💳</div><h3>${esc(ES_FINTEASER.title)}</h3><p>${esc(ES_FINTEASER.body)}</p><span class="more">${esc(ES_FINTEASER.more)}</span></a>
  <a class="scard" href="warranty/"><div class="icon">🛡️</div><h3>${esc(ES_WARRTEASER.title)}</h3><p>${esc(ES_WARRTEASER.body)}</p><span class="more">${esc(ES_WARRTEASER.more)}</span></a>
</div></div></section>

${esSteps('OKC')}

<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${esc(HOME.areaHead)}</h2><p>${esc(HOME.areaSub)}</p></div>
  <div class="mapbox"><iframe title="Oklahoma City" loading="lazy" src="https://www.google.com/maps?q=Warr+Acres,+Oklahoma&z=10&output=embed"></iframe></div>
  <p style="text-align:center;margin:20px 0 0"><a href="service-areas/">${esc(U.footer.allAreas)}</a></p>
</div></section>

<section><div class="wrap">
  <div class="sec-head"><h2>${esc(HOME.contactHead)}</h2><p>${esc(HOME.contactSub)}</p></div>
  <div class="info-grid">
    <div class="card"><b>${esc(HOME.infoCall)}</b><a href="tel:${PHONE_E164}">405-870-5397</a></div>
    <div class="card"><b>${esc(HOME.infoAddr)}</b>4201 N MacArthur Blvd,<br>Warr Acres, OK 73122</div>
    <div class="card"><b>${esc(HOME.infoHours)}</b>${HOME.hoursVal}</div>
    <div class="card"><b>${esc(HOME.infoArea)}</b>${esc(HOME.areaVal)}</div>
  </div>
  <p style="text-align:center;margin:24px 0 0"><a class="btn btn-red btn-lg" href="contact/">${esc(HOME.sendMsg)}</a></p>
</div></section>`;
  return esWrap(h, d, body);
}
function esContact() {
  const d = 2, a = '../'.repeat(d), C = CONTACT;
  const h = esHeadCommon({ title:C.title, desc:C.desc, enPath:'/contact', esPath:'/es/contact', esDepth:d });
  // Canonical service options: Spanish text DISPLAYS, fixed English value="" is
  // what gets stored, so a Spanish selection lands in the dataset in English.
  const SERVICE_OPTS = [
    ['Car lockout', 'Auto bloqueado'],
    ['Car key replacement / lost key', 'Reemplazo de llave / llave perdida'],
    ['Home or business lockout', 'Casa o negocio bloqueado'],
    ['Rekey / new locks', 'Recodificar / cerraduras nuevas'],
    ['Other (describe)', 'Otro (describe)']
  ];
  const opts = SERVICE_OPTS.map(([v, label]) => `      <option value="${esc(v)}">${esc(label)}</option>`).join('\n');
  const body = `<section><div class="wrap">
  <div class="sec-head"><h1>${esc(C.h1)}</h1><p>${esc(C.lead)} <a href="tel:${PHONE_E164}">405-870-5397</a>.</p></div>
  <form class="cform" id="contactForm" novalidate>
    <label for="cName">${esc(C.fName)} <span class="req">*</span></label>
    <input id="cName" type="text" autocomplete="name" placeholder="${esc(C.phName)}" required>
    <label for="cPhone">${esc(C.fPhone)} <span class="req">*</span></label>
    <input id="cPhone" type="tel" autocomplete="tel" placeholder="(405) 555-0123" required>
    <label for="cEmail">${esc(C.fEmail)}</label>
    <input id="cEmail" type="email" autocomplete="email" placeholder="nombre@correo.com">
    <label for="cAddress">${esc(C.fAddress)}</label>
    <input id="cAddress" type="text" autocomplete="street-address" placeholder="Calle, ciudad">
    <label for="cService">${esc(C.fService)} <span class="req">*</span></label>
    <select id="cService" required>
      <option value="">${esc(C.choose)}</option>
${opts}
    </select>
    <div id="cOtherWrap" style="display:none">
      <label for="cOther">${esc(C.otherLabel || 'Cuéntanos qué necesitas')} <span class="req">*</span></label>
      <input id="cOther" type="text" placeholder="${esc(C.otherPh || 'Describe el servicio')}">
    </div>
    <label for="cNotes">${esc(C.fNotes)}</label>
    <textarea id="cNotes" placeholder="${esc(C.phNotes)}"></textarea>
    <div class="submitrow"><button class="btn btn-call btn-lg" type="submit">${esc(C.send)}</button></div>
    <p class="msg" id="cMsg" role="alert" aria-live="assertive"></p>
  </form>
  <div class="cf-success" id="cSuccess" role="status" aria-live="polite">
    <div class="big" aria-hidden="true">✅</div>
    <h2>${esc(C.successH)}</h2><p>${esc(C.successP)}</p>
    <a class="btn btn-call btn-lg" href="tel:${PHONE_E164}">📞 405-870-5397</a>
  </div>
  <p class="cf-note">${esc(C.noteTalk)}</p>
</div></section>
<style>
  .cform{max-width:600px;margin:0 auto;background:#fff;border:1px solid var(--edge);border-radius:var(--r);box-shadow:var(--shadow);padding:26px;}
  .cform label{display:block;font-weight:700;font-size:14px;margin:14px 0 6px;color:var(--ink);}
  .cform .req{color:var(--red);}
  .cform input,.cform select,.cform textarea{width:100%;border:1px solid var(--edge);border-radius:11px;padding:13px 14px;font-size:16px;font-family:inherit;color:var(--ink);background:#fff;outline:none;}
  .cform textarea{min-height:90px;resize:vertical;}
  .cform .err{border-color:var(--red)!important;}
  .cform .msg{margin-top:16px;font-weight:600;} .cform .msg.bad{color:var(--red);}
  .cform .submitrow{margin-top:22px;} .cform .btn{width:100%;}
  .cf-note{max-width:600px;margin:14px auto 0;font-size:13px;color:var(--dim);text-align:center;}
  .cf-success{max-width:600px;margin:0 auto;background:#fff;border:1px solid var(--edge);border-radius:var(--r);box-shadow:var(--shadow);padding:34px 26px;text-align:center;display:none;}
  .cf-success .big{font-size:46px;}
</style>
<script src="${a}app/store.js"></script>
<script>
(function(){var f=document.getElementById('contactForm'),m=document.getElementById('cMsg');
function g(i){return document.getElementById(i);}
var sel=g('cService'),ow=g('cOtherWrap');
function syncOther(){ow.style.display=(sel.value==='Other (describe)')?'block':'none';}
sel.addEventListener('change',syncOther);syncOther();
f.addEventListener('submit',function(e){e.preventDefault();m.textContent='';m.className='msg';
var bad=[];['cName','cPhone','cService','cOther'].forEach(function(i){var el=g(i);if(el)el.classList.remove('err');});
if(!g('cName').value.trim()){g('cName').classList.add('err');bad.push('cName');}
if(!g('cPhone').value.trim()){g('cPhone').classList.add('err');bad.push('cPhone');}
if(!g('cService').value){g('cService').classList.add('err');bad.push('cService');}
var other=g('cOther')?g('cOther').value.trim():'';
if(g('cService').value==='Other (describe)'&&!other){g('cOther').classList.add('err');bad.push('cOther');}
if(bad.length){m.textContent=${JSON.stringify(C.validate)};m.className='msg bad';g(bad[0]).focus();return;}
var notes=g('cNotes').value.trim();
if(g('cService').value==='Other (describe)'&&other){notes='Other service: '+other+(notes?'\\n'+notes:'');}
try{TKS.Customers.addLead({customer:g('cName').value.trim(),phone:g('cPhone').value.trim(),email:g('cEmail').value.trim(),address:g('cAddress').value.trim(),serviceNeeded:g('cService').value,notes:notes,lang:'es'});}catch(err){}
f.style.display='none';g('cSuccess').style.display='block';window.scrollTo({top:0,behavior:'smooth'});});})();
</script>`;
  return esWrap(h, d, body);
}
function esGlossaryMd() {
  const rows = GLOSSARY.map(([en, es]) => `| ${en} | ${es} |`).join('\n');
  return `# Turbo Keysmith — Spanish glossary (DRAFT)

These are the chosen Spanish translations for key locksmith terms. To change one,
edit it in \`_build/es.mjs\` (the GLOSSARY array and the templates that use it),
then re-run \`node _build/generate.mjs\` — it updates every /es/ page at once.

| English | Español (chosen) |
|---|---|
${rows}
`;
}

// English hand pages that have an /es/ twin get reciprocal hreflang (idempotent).
function patchEnHreflang() {
  const map = [
    ['index.html','/','/es/'], ['automotive/index.html','/automotive','/es/automotive'],
    ['residential/index.html','/residential','/es/residential'], ['commercial/index.html','/commercial','/es/commercial'],
    ['emergency/index.html','/emergency','/es/emergency'], ['contact/index.html','/contact','/es/contact']
  ];
  for (const [rp, en, es] of map) {
    const full = join(SITE_DIR, rp);
    if (!existsSync(full)) continue;
    let html = readFileSync(full, 'utf8');
    if (/rel="alternate" hreflang=/.test(html)) continue;
    const block = `\n<link rel="alternate" hreflang="en" href="${SITE}${en}">\n<link rel="alternate" hreflang="es" href="${SITE}${es}">\n<link rel="alternate" hreflang="x-default" href="${SITE}${en}">`;
    html = html.replace(/(<link rel="canonical"[^>]*>)/, `$1${block}`);
    writeFileSync(full, html, 'utf8');
    console.log('  hreflang:', rp);
  }
}

// ---- NEW Spanish pages (mirrored from English; DRAFT, noindex) ----
function esFinancing() {
  const d = 2, e = '../', a = '../../', F = ES_FIN;
  const h = esHeadCommon({ title:F.title, desc:F.desc, enPath:'/financing', esPath:'/es/financing', esDepth:d });
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose">
  <h1>${esc(F.h1)}</h1>
  <p>${esc(F.intro)}</p>
  <h2>${esc(F.payHead)}</h2>
  <p>${esc(F.payBody)}</p>
  <p>${esc(F.oneOf)}</p>
  <h2>${esc(F.cheapHead)}</h2>
  <p>${esc(F.cheapBody)}</p>
  <h2>${esc(F.whenHead)}</h2>
  <p>${esc(F.whenBody)}</p>
  <div class="btnrow" style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:26px">
    <a class="btn btn-call btn-lg" href="${e}contact/">${esc(F.ctaQuote)}</a>
    <a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a>
    <a class="btn btn-ghost btn-lg" href="${a}pay-now/">${esc(F.payNow)}</a>
  </div>
</div></div></section>`;
  return esWrap(h, d, body);
}
function esWarranty() {
  const d = 2, e = '../', W = ES_WAR;
  const h = esHeadCommon({ title:W.title, desc:W.desc, enPath:'/warranty', esPath:'/es/warranty', esDepth:d });
  const bullets = W.bullets.map(b => `    <li>${esc(b)}</li>`).join('\n');
  const body = `${ANNOTATE}
<div style="background:#7a1f1f;color:#fff;text-align:center;font-weight:700;font-size:13px;padding:8px 14px">${esc(W.reviewNote)}</div>
<section><div class="wrap"><div class="prose">
  <h1>${esc(W.h1)}</h1>
  <p>${esc(W.intro)}</p>
  <h2>${esc(W.coveredHead)}</h2>
  <p>${esc(W.coveredBody)}</p>
  <h2>${esc(W.notCoveredHead)}</h2>
  <p>${esc(W.notCoveredBody)}</p>
  <h2>${esc(W.howHead)}</h2>
  <p>${esc(W.howIntro)}</p>
  <ul>
${bullets}
  </ul>
  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${esc(W.cta)}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="${e}terms/">${esc(W.seeTerms)}</a></p>
</div></div></section>`;
  return esWrap(h, d, body);
}
function esTerms() {
  const d = 2, e = '../', a = '../../', T = ES_TERMS;
  const h = esHeadCommon({ title:T.title, desc:T.desc, enPath:'/terms', esPath:'/es/terms', esDepth:d });
  const body = `<!-- LEGAL (ES): traduccion BORRADOR — requiere revision profesional bilingue antes de usarse. -->
<div style="background:#7a1f1f;color:#fff;text-align:center;font-weight:700;font-size:13px;padding:8px 14px">${esc(T.reviewNote)}</div>
<section><div class="wrap"><div class="prose">
  <div class="tc-brand"><img src="${a}assets/logo.png" alt="Turbo Keysmith"><div><strong>Turbo Keysmith</strong><br>4201 N MacArthur Blvd, Warr Acres, OK 73122 · ${PHONE_DISPLAY} · OK Lic. #AC441081</div></div>
  <h1>${esc(T.h1)}</h1>
  <p class="noprint" style="text-align:right"><button class="btn btn-call" onclick="window.print()">${esc(T.printBtn)}</button></p>
  <h2>${esc(T.s1h)}</h2><p>${esc(T.s1)}</p>
  <h2>${esc(T.s2h)}</h2><p>${esc(T.s2)}</p>
  <h2>${esc(T.s3h)}</h2><p>${esc(T.s3)} <a href="${e}warranty/">Garantía →</a></p>
  <h2>${esc(T.s4h)}</h2><p>${esc(T.s4)}</p>
  <h2>${esc(T.s5h)}</h2><p>${esc(T.s5)}</p>
  <p style="color:var(--dim);font-size:13px;margin-top:24px">${esc(T.footLine)}</p>
</div></div></section>
<style>
  .tc-brand{display:flex;align-items:center;gap:12px;margin-bottom:10px}
  .tc-brand img{height:46px;width:auto}
  @media print{ header.site,.trust,.mobilebar,footer.site,.noprint,button{display:none!important} body{background:#fff;color:#000} }
</style>`;
  return esWrap(h, d, body);
}
function esFaq() {
  const d = 2, e = '../', a = '../../', M = ES_FAQ_META;
  const h = esHeadCommon({ title:M.title, desc:M.desc, enPath:'/faq', esPath:'/es/faq', esDepth:d });
  // FAQPage schema — built from the same array as the visible Q&As (kept in sync).
  const faqLd = { '@context':'https://schema.org', '@type':'FAQPage',
    mainEntity: ES_FAQ.map(f => ({ '@type':'Question', name:f.q, acceptedAnswer:{ '@type':'Answer', text:f.a } })) };
  const faqSchema = '<script type="application/ld+json">\n' + JSON.stringify(faqLd, null, 2) + '\n</script>';
  const linkHref = (key) => key === 'pay-now' ? `${a}pay-now/` : `${e}${key}/`;
  const items = ES_FAQ.map(f => {
    const lnk = f.link ? ` <a href="${linkHref(f.link.href)}">${esc(f.link.label)}</a>` : '';
    return `  <div class="faq-item"><h3>${esc(f.q)}</h3><p>${esc(f.a)}${lnk}</p></div>`;
  }).join('\n');
  const body = `${ANNOTATE}
${faqSchema}
<section><div class="wrap"><div class="prose">
  <h1>${esc(M.h1)}</h1>
  <p>${esc(M.intro)}</p>
${items}
  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">${esc(M.still)}</a></p>
</div></div></section>`;
  return esWrap(h, d, body);
}

function esCredPage(c) {
  const d = 1 + c.slug.split('/').length, e = '../'.repeat(d-1), L = ES_CERTHUB;
  const h = esHeadCommon({ title:c.title, desc:c.metaDesc, enPath:'/'+c.slug, esPath:'/es/'+c.slug, esDepth:d });
  const parts = [`  <h2>${esc(L.whatIs)}</h2>\n  <p>${esc(c.whatIs)}</p>`];
  if (c.whatTakes) parts.push(`  <h2>${esc(L.whatTakes)}</h2>\n  <p>${esc(c.whatTakes)}</p>`);
  parts.push(`  <h2>${esc(L.whatMeans)}</h2>\n  <p>${esc(c.whatMeans)}</p>`);
  const extLink = c.link ? `\n  <p><a href="${c.link}" target="_blank" rel="noopener">${esc(c.link.replace('https://',''))} →</a></p>` : '';
  const body = `${ANNOTATE}
<div style="background:#7a1f1f;color:#fff;text-align:center;font-weight:700;font-size:13px;padding:8px 14px">${esc(ES_CRED_NOTE)}</div>
<section><div class="wrap"><div class="prose">
  <p style="font-size:13px;color:var(--dim);margin:0 0 6px"><a href="${e}certifications/">${esc(L.crumb)}</a> › ${esc(c.name)}</p>
  <h1>${esc(c.h1)}</h1>
${parts.join('\n')}${extLink}
  <p style="text-align:center;margin:26px 0 0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
  <p style="text-align:center;margin:14px 0 0"><a href="${e}certifications/">${esc(L.backHub)}</a></p>
</div></div></section>`;
  return esWrap(h, d, body);
}
function esCertHub() {
  const d = 2, L = ES_CERTHUB;
  const h = esHeadCommon({ title:L.title, desc:L.desc, enPath:'/certifications', esPath:'/es/certifications', esDepth:d });
  const teaser = (c) => `    <a class="scard" href="${credHref(c.slug)}"><h3>${esc(c.name)}</h3><p>${esc(c.teaser)}</p><span class="more">${esc(L.learnMore)}</span></a>`;
  const lic = ES_CREDS.filter(c => c.group === 'license');
  const licOrdered = [...lic.filter(c => c.featured), ...lic.filter(c => !c.featured)];
  const assoc = ES_CREDS.filter(c => c.group === 'assoc');
  const body = `${ANNOTATE}
<section><div class="wrap"><div class="prose" style="text-align:center">
  <h1>${esc(L.h1)}</h1>
  <p>${esc(L.intro)}</p>
</div></div></section>
<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${esc(L.licHead)}</h2><p>${esc(L.licSub)}</p></div>
  <div class="cards">
${licOrdered.map(teaser).join('\n')}
  </div>
</div></section>
<section><div class="wrap">
  <div class="sec-head"><h2>${esc(L.assocHead)}</h2><p>${esc(L.assocSub)}</p></div>
  <div class="cards">
${assoc.map(teaser).join('\n')}
  </div>
</div></section>
<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>${esc(L.recHead)}</h2></div>
  <div class="award-wrap"><span class="award-badge">${esc(ES_AWARD)}</span></div>
  <p style="text-align:center;color:var(--dim);margin:6px 0 0">${esc(ES_BUSINESSRATE)}</p>
</div></section>
<section><div class="wrap">
  <p style="text-align:center;margin:0"><a class="btn btn-call btn-lg" href="${tel}">📞 ${PHONE_DISPLAY}</a></p>
</div></section>`;
  return esWrap(h, d, body);
}

function buildEs() {
  const esBuilt = built.map(c => ({ ...c, es: CITIES_ES[c.slug] }));
  const missing = esBuilt.filter(c => !c.es).map(c => c.slug);
  if (missing.length) throw new Error('Missing ES translation for: ' + missing.join(', '));
  let n = 0;
  write('es/index.html', esHome()); n++;
  for (const key of ['automotive','residential','commercial','emergency']) { write(`es/${key}/index.html`, esService(key)); n++; }
  write('es/service-areas/index.html', esHub(esBuilt)); n++;
  write('es/contact/index.html', esContact()); n++;
  write('es/financing/index.html', esFinancing()); n++;
  write('es/warranty/index.html', esWarranty()); n++;
  write('es/terms/index.html', esTerms()); n++;
  write('es/faq/index.html', esFaq()); n++;
  write('es/certifications/index.html', esCertHub()); n++;
  for (const c of ES_CREDS) { write(`es/${c.slug}/index.html`, esCredPage(c)); n++; }
  for (const c of esBuilt) {
    write(`es/${c.slug}/index.html`, esCity(c)); n++;
    if (c.hasSub) for (const svc of ['automotive','residential','commercial']) { write(`es/${c.slug}/${svc}/index.html`, esSub(c, svc)); n++; }
  }
  write('es/GLOSSARY.md', esGlossaryMd());
  return n;
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
write('financing/index.html', renderFinancing());
write('warranty/index.html', renderWarranty());
write('terms/index.html', renderTerms());
write('certifications/index.html', renderCertHub());
for (const c of CREDS) write(`${c.slug}/index.html`, renderCredPage(c));
write('sitemap.xml', renderSitemap());
write('robots.txt', renderRobots());
console.log(`Wrote ${count} city pages + hub + sitemap + robots`);
const esN = buildEs();
console.log(`Wrote ${esN} Spanish DRAFT pages under /es/ (noindex, not in sitemap) + glossary`);
console.log('Patching hand-maintained pages…');
patchHandPages();
patchEnHreflang();
console.log('Done.');
