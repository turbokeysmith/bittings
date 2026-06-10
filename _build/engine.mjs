// ============================================================
// Turbo Keysmith — service-area page generator (shared engine)
// Plain static HTML, reuses the existing /site/assets/styles.css
// design system exactly. No runtime/build step ships to the site;
// this only emits .html files. Run: node _build/generate.mjs
// ============================================================

export const PHONE_E164 = '+14058705397';
export const PHONE_DISPLAY = '405-870-5397';
export const SITE = 'https://turbokeysmith.com';

// Master service-area list (every city the business serves).
// Used verbatim in every page's schema.org areaServed, regardless of
// which city pages have been generated yet. ADD new cities here too.
// 25 cities within a ~30-mile radius of Warr Acres, ordered closest -> farthest.
export const AREA_SERVED = [
  'Warr Acres','Bethany','The Village','Nichols Hills','Oklahoma City',
  'Yukon','Piedmont','Del City','Mustang','Midwest City','Edmond','Spencer',
  'Moore','Nicoma Park','Jones','Choctaw','Newcastle','Tuttle',
  'Norman','Harrah','El Reno','Guthrie','Goldsby','Noble','Blanchard'
];

// relative prefix to site root for a page nested `depth` folders deep
export const rel = (depth) => '../'.repeat(depth);

// HTML-escape for attribute/text content
export const esc = (s) => String(s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;');

// ---- schema.org Locksmith block (site-wide, full areaServed) ----
export function schema() {
  const obj = {
    '@context':'https://schema.org','@type':'Locksmith','name':'Turbo Keysmith',
    description:'Turbo Keysmith is your trusted Locksmith at 4201 N MacArthur Blvd, providing fast, professional service for anyone searching “Locksmith Near Me.” We offer Emergency Locksmith Near Me help, 24 Hour Locksmith response, and reliable Emergency Locksmith solutions for homes, businesses, and vehicles. Need a Car Locksmith or Auto Locksmith? We handle Car Key Replacement, Key Duplication, and rapid Car Lockout Service to get you back on the road quickly. Call Turbo Keysmith for dependable, local locksmith service you can count on.',
    url:'https://turbokeysmith.com/', telephone:'+14058705397',
    image:'https://d17lvxud83eqj6.cloudfront.net/decc098b-8d60-486e-a4b4-504237a12fad.png',
    logo:'https://d17lvxud83eqj6.cloudfront.net/decc098b-8d60-486e-a4b4-504237a12fad.png',
    currenciesAccepted:'USD', paymentAccepted:'Cash, Credit Card',
    address:{'@type':'PostalAddress',streetAddress:'4201 N MacArthur Blvd',addressLocality:'Warr Acres',addressRegion:'OK',postalCode:'73122',addressCountry:'US'},
    geo:{'@type':'GeoCoordinates',latitude:35.5139408,longitude:-97.6192871},
    openingHoursSpecification:[
      {'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],opens:'00:00',closes:'23:59'},
      {'@type':'OpeningHoursSpecification',dayOfWeek:['Sunday'],opens:'00:00',closes:'05:00'}
    ],
    areaServed: AREA_SERVED.map(n=>({'@type':'Place',name:n})),
    sameAs:['https://www.instagram.com/turbokeysmith/','https://www.tiktok.com/@turbokeysmith','https://www.facebook.com/247826765080233','https://www.youtube.com/@TurboKeysmith'],
    aggregateRating:{'@type':'AggregateRating',ratingValue:'5.0',reviewCount:258,bestRating:5,worstRating:1},
    review:[
      {'@type':'Review',author:{'@type':'Person',name:'T thibo'},reviewBody:'Outstanding customer service. What a great business! Sam really went the extra mile to get my 2015 Audi A6 key fob working. He even cleared about 20 other codes that the vehicle had that I have been researching and trying to fix for weeks! Highly recommended, they deserve your business and do outstanding work!',reviewRating:{'@type':'Rating',ratingValue:5}},
      {'@type':'Review',author:{'@type':'Person',name:'Sheref Hill'},reviewBody:"I don't leave reviews often, but Sam absolutely earned this one. I needed a new key and wasn't sure what the process would look like. From the moment I went to Sam, he made everything simple — friendly, professional, and he took the time to explain everything clearly. What I expected to be a frustrating experience ended up being one of the easiest service experiences I've had. He's honest, dependable, and genuinely invested in helping people. If I could give more than five stars, I would.",reviewRating:{'@type':'Rating',ratingValue:5}},
      {'@type':'Review',author:{'@type':'Person',name:'Katrina Jim'},reviewBody:'I am pleased with Turbo Keysmith. When I called he gave me an estimate and came out in a timely matter. Prices are reasonable. Sam is kind, honest, and reliable. Recommend using Turbo Keysmith.',reviewRating:{'@type':'Rating',ratingValue:5}},
      {'@type':'Review',author:{'@type':'Person',name:'Stacy Geswender'},reviewBody:'Sam came quickly and took care of me — they are amazing!!',reviewRating:{'@type':'Rating',ratingValue:5}}
    ]
  };
  return '<script type="application/ld+json">\n'+JSON.stringify(obj,null,2)+'\n</script>';
}

// ---- <head> ----
// opts: { title, desc, canonical, depth, lang='en', noindex=false,
//         assetRel (override for /es/ where assets are above the lang root),
//         alts=[{hreflang, href}] }  — alts renders reciprocal hreflang links.
export function head({title, desc, canonical, depth, lang='en', noindex=false, assetRel, alts}) {
  const r = assetRel !== undefined ? assetRel : rel(depth);
  const robots = noindex ? `\n<meta name="robots" content="noindex,nofollow">` : '';
  const hreflang = (alts && alts.length)
    ? '\n' + alts.map(a => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`).join('\n')
    : '';
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">${robots}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">${hreflang}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${canonical}">
<link rel="icon" href="${r}assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${r}assets/styles.css">
${schema()}
</head>`;
}

// ---- sticky header (main menu — NO Service Areas link, per spec) ----
export function header(depth) {
  const r = rel(depth);
  return `<header class="site">
  <div class="bar">
    <a class="brand" href="${r}index.html"><img src="${r}assets/logo.png" alt="Turbo Keysmith logo"><b>Turbo Keysmith</b></a>
    <nav class="main">
      <a href="${r}index.html">Home</a>
      <a href="${r}automotive/">Automotive</a>
      <a href="${r}residential/">Residential</a>
      <a href="${r}commercial/">Commercial</a>
      <a href="${r}emergency/">Emergency</a>
      <a href="${r}faq/">FAQ</a>
      <a href="${r}pay-now/">Pay Now</a>
    </nav>
    <a class="head-call" href="tel:${PHONE_E164}"><span class="btn btn-call">📞 ${PHONE_DISPLAY}</span></a>
    <button class="navtoggle" aria-label="Menu" onclick="document.getElementById('m').classList.toggle('open')">☰</button>
  </div>
  <nav class="mobile" id="m">
    <a href="${r}index.html">Home</a>
    <a href="${r}automotive/">Automotive</a>
    <a href="${r}residential/">Residential</a>
    <a href="${r}commercial/">Commercial</a>
    <a href="${r}emergency/">Emergency</a>
    <a href="${r}blog/">Blog</a>
    <a href="${r}certifications/">Certifications</a>
    <a href="${r}faq/">FAQ</a>
    <a href="${r}pay-now/">Pay Now</a>
  </nav>
</header>`;
}

export function trust() {
  return `<div class="trust"><div class="wrap">
  <div class="item"><span class="ic">⭐</span><span class="big">5.0 ★</span><span>250+ Google reviews</span></div>
  <div class="item"><span class="ic">🛡️</span><span class="big">Licensed</span><span>Oklahoma #AC441081</span></div>
  <div class="item"><span class="ic">🕒</span><span class="big">24-Hour</span><span>Monday–Saturday</span></div>
  <div class="item"><span class="ic">🚐</span><span class="big">Mobile</span><span>We come to you</span></div>
</div></div>`;
}

// ---- footer (Service Areas column now links the hub — per spec) ----
export function footer(depth) {
  const r = rel(depth);
  return `<footer class="site"><div class="wrap">
  <div class="cols">
    <div><h4>Turbo Keysmith</h4>
      <p style="color:#c2cad3;margin:0 0 10px">Your trusted mobile locksmith — always there when you need us.<br>4201 N MacArthur Blvd, Warr Acres, OK 73122</p>
      <a href="tel:${PHONE_E164}"><strong style="color:#fff">${PHONE_DISPLAY}</strong></a></div>
    <div><h4>Services</h4>
      <a href="${r}automotive/">Automotive</a><a href="${r}residential/">Residential</a>
      <a href="${r}commercial/">Commercial</a><a href="${r}emergency/">Emergency</a></div>
    <div><h4>Company</h4>
      <a href="${r}blog/">Blog</a><a href="${r}certifications/">Certifications</a>
      <a href="${r}faq/">FAQ</a><a href="${r}pay-now/">Pay Now</a></div>
    <div><h4>Service Areas</h4>
      <a href="${r}service-areas/"><strong style="color:#fff">All Service Areas →</strong></a>
      <a href="${r}oklahoma-city/">Oklahoma City</a><a href="${r}edmond/">Edmond</a>
      <a href="${r}norman/">Norman</a><a href="${r}yukon/">Yukon</a></div>
  </div>
  <div class="social" style="margin-top:22px">
    <a href="https://www.facebook.com/247826765080233">Facebook</a>
    <a href="https://www.instagram.com/turbokeysmith/">Instagram</a>
    <a href="https://www.tiktok.com/@turbokeysmith">TikTok</a>
    <a href="https://www.youtube.com/@TurboKeysmith">YouTube</a>
  </div>
  <div class="legal">
    <span>Copyright © 2026 Turbo KeySmith — All Rights Reserved. · Licensed OK #AC441081</span>
    <a class="staff-login" href="${r}../cloud-test.html" rel="nofollow">Staff Login</a>
  </div>
</div></footer>`;
}

export function mobilebar() {
  return `<nav class="mobilebar">
  <a class="call" href="tel:${PHONE_E164}"><span class="ic">📞</span>Call</a>
  <a class="text" href="sms:${PHONE_E164}"><span class="ic">💬</span>Text</a>
  <a class="wa" href="https://wa.me/14058705397"><span class="ic">🟢</span>WhatsApp</a>
</nav>`;
}

// labeled review slot (annotated placeholder — keeps content honest)
export function reviewSlot(label) {
  return `<div class="widget-slot"><b>⭐ LOCAL REVIEW SLOT — ${esc(label)}</b>
    <small>Paste a real Google review from a ${esc(label)} customer here, or leave for now. (Labeled slot — not shown to visitors as live until filled.)</small></div>`;
}

// "Our Work" photos. Renders a real gallery ONLY when a city has images
// (`photos` = array of resolved src paths). With no photos it returns a HIDDEN
// placeholder comment — never an empty/broken photo box shown to visitors.
export function photoSlots(label, photos) {
  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (!list.length) {
    return `<!-- "Our Work" gallery: no ${esc(label)} photos yet — section hidden until real images are added -->`;
  }
  const cards = list.map(src =>
    `<figure class="photo"><img src="${esc(src)}" alt="${esc(label)} locksmith work by Turbo Keysmith" loading="lazy"></figure>`
  ).join('\n      ');
  return `<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>Our Work in ${esc(label)}</h2><p>A look around ${esc(label)}, where we work every week.</p></div>
  <div class="photo-grid">
      ${cards}
  </div>
</div></section>`;
}

export function pageShell({head:h, depth, body}) {
  return `${h}
<body>
${header(depth)}
${trust()}
${body}
${footer(depth)}
${mobilebar()}
</body></html>
`;
}
