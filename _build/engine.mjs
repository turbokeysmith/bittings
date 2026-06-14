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

// ---- Social profiles (single source: footer/header icons + schema sameAs) ---
export const SOCIAL = [
  { name:'Instagram', url:'https://www.instagram.com/turbokeysmith/',
    svg:'<path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-.4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2z"/>' },
  { name:'TikTok', url:'https://www.tiktok.com/@turbokeysmith',
    svg:'<path d="M16.5 3c.3 2.3 1.7 4 3.9 4.3v2.7c-1.3.1-2.7-.3-3.9-1v5.8a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2 2.8V3h2.8z"/>' },
  { name:'Facebook', url:'https://www.facebook.com/turbokeysmith/',
    svg:'<path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8V12h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/>' },
  { name:'YouTube', url:'https://www.youtube.com/@TurboKeysmith',
    svg:'<path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.4 12 31 31 0 0 0 23 7.5zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z"/>' },
  { name:'Nextdoor', url:'https://nextdoor.com/pages/turbo-keysmith-warr-acres-ok/',
    svg:'<path d="M12 2 2 9.6h3V21h5v-6.2h4V21h5V9.6h3z"/>' },
  { name:'Google', url:'https://maps.app.goo.gl/DZYJ3x33cb5J2AJC9',
    svg:'<path d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1z"/>' }
];
export function socialIcons(extraClass) {
  return `<div class="social-icons${extraClass ? ' ' + extraClass : ''}">` +
    SOCIAL.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.name)}" title="${esc(s.name)}"><svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">${s.svg}</svg></a>`).join('') +
    `</div>`;
}

// ---- Award/recognition badge (review-based; sits beside the reviews) ----
export const AWARD_BADGE =
  `<div class="award-wrap"><span class="award-badge">🏆 Best of 2026 · Ranked #1 Locksmith in Western Oklahoma — BusinessRate</span></div>`;

// ---- localmarketingmanager.com Live Google Business widgets ----------------
// (Images/"Our Work" widget removed by request — replaced by social links.)
// The Reviews widget sizes its src by container width; the award badge + a
// plain-text "250+ Five-Star Reviews" headline sit above it.
export const LOCAL_POSTS_WIDGET =
  `<iframe src="https://www.localmarketingmanager.com/api/local-posts/turbo-keysmith-local-posts-widget" style="width: 100%; min-height: 480px; border: none;" title="Local Posts Widget" loading="lazy"></iframe>`;
export const REVIEWS_WIDGET =
  `${AWARD_BADGE}
<p style="text-align:center;font-weight:800;font-size:18px;margin:0 0 16px">⭐ 250+ Five-Star Reviews on Google</p>
<div id="reviewsWidgetContainer">
  <iframe id="reviewsWidget" style="width: 100%; border: none; min-height: 300px;" title="Reviews Widget"></iframe>
</div>
<script>
(function() {
  function getPageSizeForWidth(width){if(width<450)return 1;if(width<675)return 2;if(width<918)return 3;if(width<1144)return 4;return 5;}
  function setIframeSrc(){var iframe=document.getElementById("reviewsWidget");var container=document.getElementById("reviewsWidgetContainer");if(!iframe||!container){setTimeout(setIframeSrc,50);return;}var width=container.offsetWidth;if(width===0){setTimeout(setIframeSrc,50);return;}var pageSize=getPageSizeForWidth(width);var expectedSrc="https://www.localmarketingmanager.com/api/reviews/turbo-keysmith-review-widget?pageSize="+pageSize;if(iframe.src!==expectedSrc){iframe.src=expectedSrc;}}
  function init(){setIframeSrc();setTimeout(setIframeSrc,50);window.addEventListener("resize",setIframeSrc);}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();
</script>`;

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
    // NOTE: aggregateRating + review were intentionally REMOVED. They were
    // self-serving review markup backed only by an iframe widget (not visible
    // on-page reviews), which violates Google's structured-data policy and is a
    // manual-action risk. Visible reviews now come from the on-page Reviews
    // widget; no review/rating structured data is emitted.
    sameAs: SOCIAL.map(s => s.url)
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
      <a href="${r}financing/">Financing</a>
      <a href="${r}certifications/">Certifications</a>
      <a href="${r}faq/">FAQ</a>
      <a href="${r}pay-now/">Pay Now</a>
    </nav>
    <a class="head-call" href="tel:${PHONE_E164}"><span class="btn btn-call">📞 ${PHONE_DISPLAY}</span></a>
    ${socialIcons('bar-social')}
    <button class="navtoggle" aria-label="Menu" onclick="document.getElementById('m').classList.toggle('open')">☰</button>
  </div>
  <nav class="mobile" id="m">
    <a href="${r}index.html">Home</a>
    <a href="${r}automotive/">Automotive</a>
    <a href="${r}residential/">Residential</a>
    <a href="${r}commercial/">Commercial</a>
    <a href="${r}emergency/">Emergency</a>
    <a href="${r}financing/">Financing</a>
    <a href="${r}warranty/">Warranty</a>
    <a href="${r}blog/">Blog</a>
    <a href="${r}certifications/">Certifications</a>
    <a href="${r}faq/">FAQ</a>
    <a href="${r}pay-now/">Pay Now</a>
    ${socialIcons('mobile-social')}
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
      <a href="${r}financing/">Financing</a><a href="${r}warranty/">Key Warranty</a>
      <a href="${r}blog/">Blog</a><a href="${r}certifications/">Certifications</a>
      <a href="${r}faq/">FAQ</a><a href="${r}pay-now/">Pay Now</a></div>
    <div><h4>Service Areas</h4>
      <a href="${r}service-areas/"><strong style="color:#fff">All Service Areas →</strong></a>
      <a href="${r}oklahoma-city/">Oklahoma City</a><a href="${r}edmond/">Edmond</a>
      <a href="${r}norman/">Norman</a><a href="${r}yukon/">Yukon</a></div>
  </div>
  <div style="margin-top:22px">${socialIcons()}</div>
  <div class="legal">
    <span>Copyright © 2026 Turbo KeySmith — All Rights Reserved. · Licensed OK #AC441081 · <a href="${r}terms/" style="color:inherit">Terms &amp; Conditions</a></span>
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

// Reviews section body: the live Google reviews widget (with backstop headline).
// Same widget on every page; `label` is unused now but kept for call-site compat.
export function reviewSlot(label) {
  return REVIEWS_WIDGET;
}

// "Our Work" photos section. The Google images widget was removed by request.
// Renders ONLY when a city has real on-domain photos; otherwise nothing (no
// empty section, no widget).
export function photoSlots(label, photos) {
  const list = Array.isArray(photos) ? photos.filter(Boolean) : [];
  if (!list.length) return '';
  return `<section class="surface"><div class="wrap">
  <div class="sec-head"><h2>Our Work in ${esc(label)}</h2><p>Recent jobs around ${esc(label)}.</p></div>
  <div class="photo-grid">
      ${list.map(src => `<figure class="photo"><img src="${esc(src)}" alt="${esc(label)} locksmith work by Turbo Keysmith" loading="lazy"></figure>`).join('\n      ')}
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
