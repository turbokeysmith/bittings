/**
 * Turbo Keysmith widgets — self-hosted replacement for the retired
 * localmarketingmanager.com embeds.
 *
 * Routes (all iframe-embeddable):
 *   /reviews      Google-reviews carousel (KV "reviews")
 *   /local-posts  Google Business posts grid (KV "posts"); blank until GBP
 *                 API access is approved
 *   /health       JSON status (last refresh, last error, counts)
 *   /refresh?key=ADMIN_KEY   force the cron refresh now
 *
 * Cron (every 6h):
 *   1. Refresh Google rating + review count via Places API (works today).
 *   2. Try the Business Profile API (v4) for the full review list + posts.
 *      Fails 429 until Google approves API access — that's expected.
 *   3. Auto-reply to new 4-5★ reviews (rotating templates, first name only,
 *      never anything older than the activation watermark).
 *   4. 1-3★ reviews: NO auto-reply — email the owner via Web3Forms instead.
 */

const BUSINESS = 'Turbo Keysmith';

// Service-aware reply composer for 4-5★ reviews.
// We read the review text, work out which job it most likely describes, thank
// the customer for that specific job, and mention one genuinely adjacent
// service. Detection is deliberately conservative: anything we cannot classify
// with confidence falls back to a warm generic reply, because a public reply
// describing the WRONG job is far worse than a slightly generic one.
// Variety comes from a stable hash of the review id, so a given review always
// produces the same text (safe against double-posting variants).
const SERVICE_REPLIES = [
  {
    key: 'ignition',
    test: /ignition|key (?:broke|snapped|stuck|jammed)|broke (?:my|our|the) key|key off in/i,
    did: [
      'So glad we could get that ignition sorted out for you',
      'Happy we could get the key out and your ignition turning again',
    ],
    offer: [
      'If you ever want a spare cut before it turns into an emergency, we can handle that too — every key we make carries a 6-month warranty',
      'Might be worth grabbing a spare while everything is fresh — ours come with a 6-month warranty',
    ],
  },
  {
    key: 'fob',
    test: /fob|transponder|remote start|pcm|push[- ]?(?:to[- ])?start|program/i,
    did: [
      'Really glad we could get your key programmed and working',
      'Happy the programming went smoothly for you',
    ],
    offer: [
      'If you ever want a spare programmed as a backup, we do those too — and every key we cut is covered by a 6-month warranty',
      'We can program a spare any time you want a backup, and all our keys carry a 6-month warranty',
    ],
  },
  {
    key: 'auto_lockout',
    test: /lock(?:ed)?[^.!?]{0,30}(?:car|truck|vehicle|van)|locked out[^.!?]{0,20}(?:car|truck|vehicle)|keys? (?:locked )?in the (?:car|truck)/i,
    did: [
      'Glad we could get you back into your vehicle quickly',
      'Happy we could get you back on the road without a long wait',
    ],
    offer: [
      'If you do not have a spare key yet, that is the one thing that keeps this from happening twice — we can cut and program one whenever suits you',
      'A spare key is the best insurance against a repeat of that day, and we can sort one out any time',
    ],
  },
  {
    key: 'home_lockout',
    test: /lock(?:ed)?[^.!?]{0,30}(?:house|home|apartment)|out of (?:my|our|the) (?:house|home|apartment)|back (?:in)?to (?:my|our|the) (?:house|home)/i,
    did: [
      'Glad we could get you back inside quickly',
      'Happy we could get your door open and get you back in',
    ],
    offer: [
      'If you ever want the locks rekeyed or a smart lock fitted so you are never stuck outside again, we handle both',
      'We also do rekeying and smart-lock installs whenever you want to make getting in a bit easier',
    ],
  },
  {
    key: 'auto_rekey',
    test: /re-?key(?:ed|ing)?[^.!?]{0,20}(?:car|truck|vehicle|ignition)/i,
    did: [
      'Glad we could get your vehicle rekeyed and back in order',
      'Happy we could get the vehicle rekeyed for you',
    ],
    offer: [
      'If you ever want a spare cut and programmed as a backup, we can sort that out — every key we make carries a 6-month warranty',
      'A spare is always worth having, and all our keys are covered by a 6-month warranty',
    ],
  },
  {
    key: 'rekey',
    test: /re-?key/i,
    not: /car|truck|vehicle|ignition|fob/i,
    did: [
      'Glad we could get your locks rekeyed and give you peace of mind',
      'Happy we could get everything rekeyed for you',
    ],
    offer: [
      'If you ever want to add a smart lock or upgrade a deadbolt, we can take care of that as well',
      'We also fit smart locks and high-security deadbolts whenever you want to take it a step further',
    ],
  },
  {
    key: 'lock_work',
    test: /smart lock|dead ?bolt|new locks?|install(?:ed|ing)?[^.!?]{0,15}lock|lock (?:install|repair|change)|changed (?:my|our|the) locks/i,
    did: [
      'Glad we could get your locks sorted out',
      'Happy the lock work went smoothly for you',
    ],
    offer: [
      'If you ever want the rest of the house rekeyed to one key, that is an easy job for us',
      'We can also rekey everything to a single key whenever you want to simplify things',
    ],
  },
  {
    key: 'commercial',
    test: /(?:my|our|the|their) (?:business|office|shop|store|building)|store ?front|commercial|master[- ]key|office building/i,
    did: [
      'Glad we could get your business taken care of',
      'Happy we could get you sorted with minimal disruption',
    ],
    offer: [
      'If you ever need master-key systems or high-security locks across the premises, that is very much our thing',
      'We also set up master-key systems and high-security hardware whenever you need it',
    ],
  },
  {
    key: 'car_key',
    test: /(?:car|truck|vehicle|van) key|key (?:for|to) (?:my|our|the) (?:car|truck|vehicle)|spare key|duplicate key|key replacement|lost (?:my|our|the) keys?/i,
    did: [
      'Really glad we could get you a working key sorted',
      'Happy we could get your key made and get you going again',
    ],
    offer: [
      'If you ever want a second one as a backup, we can cut and program it — all our keys carry a 6-month warranty',
      'A spare is always worth having, and every key we make is covered by a 6-month warranty',
    ],
  },
];

// Used when the review is pure praise with no identifiable job in it.
const GENERIC_REPLIES = [
  'Thank you so much, {name}! It was a pleasure helping you out. Car keys, home rekeys, or anything commercial — we have got you covered whenever you need us. — Turbo Keysmith',
  'Really appreciate you taking the time to leave this, {name}! Glad we could get you taken care of, and we are here any time you need keys or locks handled. — Turbo Keysmith',
  '{name}, thank you! Reviews like yours are why we do what we do. Anything from a spare key to a full rekey, just give us a shout. — Turbo Keysmith',
  'Thanks a ton, {name}! We are glad everything went smoothly, and we are a call away whenever you need us again. — Turbo Keysmith',
  'Thank you for the kind words, {name}! It means a lot to our small team — and we are here for car keys, lockouts, and lock work any time. — Turbo Keysmith',
  'We appreciate you, {name}! Thanks for trusting us with the job — any time you need a key or a lock handled, we are a call away. — Turbo Keysmith',
];

const STAR_NUM = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (path === '/reviews') return await reviewsPage(env);
      if (path === '/local-posts') return await postsPage(env);
      if (path === '/health') return await healthPage(env);
      if (path === '/stats') return await statsPage(env);
      if (path === '/refresh') {
        if (!(await keyOk(url.searchParams.get('key'), env.ADMIN_KEY))) {
          return json({ error: 'forbidden' }, 403);
        }
        const report = await refreshAll(env);
        return json(report);
      }
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.log(JSON.stringify({ level: 'error', path, message: String(err && err.stack || err) }));
      return json({ error: 'internal' }, 500);
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAll(env).catch((err) => {
      console.log(JSON.stringify({ level: 'error', cron: true, message: String(err && err.stack || err) }));
    }));
  },
};

/* ---------------- data refresh ---------------- */

async function refreshAll(env) {
  const report = { at: new Date().toISOString() };
  const state = (await env.WIDGETS.get('state', 'json')) || {};

  // 1. Places API — rating + review count (available today, no GBP approval needed)
  try {
    const pr = await fetchJson(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${env.PLACE_ID}` +
      `&fields=rating,user_ratings_total,reviews&reviews_no_translations=true&key=${env.MAPS_API_KEY}`);
    if (pr.status === 'OK' && pr.result) {
      report.places = { rating: pr.result.rating, total: pr.result.user_ratings_total };
      const existing = (await env.WIDGETS.get('reviews', 'json')) || {};
      existing.rating = pr.result.rating;
      existing.total = pr.result.user_ratings_total;
      existing.updatedAt = report.at;
      // Until GBP is approved the review list itself also comes from Places (5 reviews).
      if (existing.source !== 'gbp') {
        existing.source = 'places-seed';
        existing.reviews = (pr.result.reviews || []).map((v) => ({
          name: v.author_name, rating: v.rating, text: v.text,
          when: v.relative_time_description, photo: v.profile_photo_url, time: v.time,
        }));
      }
      await env.WIDGETS.put('reviews', JSON.stringify(existing));
    } else {
      report.places = { error: pr.status || 'no result' };
    }
  } catch (err) {
    report.places = { error: String(err) };
  }

  // 2. Business Profile API — full reviews + posts + auto-reply (once approved)
  try {
    const token = await gbpAccessToken(env);
    const account = await gbpFirstAccount(token);
    const location = await gbpFirstLocation(token, account);
    const locPath = `${account}/${location.split('/').slice(-2).join('/')}`; // accounts/{a}/locations/{l}

    const reviews = await gbpAllReviews(token, locPath);
    // First successful GBP sync sets the watermark: nothing older ever gets
    // auto-replied or alerted (prevents blasting years of history on day one).
    if (!state.watermark) state.watermark = new Date().toISOString();

    const data = (await env.WIDGETS.get('reviews', 'json')) || {};
    data.source = 'gbp';
    data.updatedAt = report.at;
    data.reviews = reviews.map((r) => ({
      id: r.reviewId,
      name: r.reviewer && r.reviewer.displayName || 'A customer',
      rating: STAR_NUM[r.starRating] || 5,
      text: r.comment || '',
      when: relativeTime(r.createTime),
      photo: r.reviewer && r.reviewer.profilePhotoUrl || '',
      time: Math.floor(new Date(r.createTime).getTime() / 1000),
      replied: !!r.reviewReply,
    })).filter((r) => r.text);
    await env.WIDGETS.put('reviews', JSON.stringify(data));
    report.gbp = { reviews: data.reviews.length };

    // Auto-reply / alert pass — only reviews newer than the watermark.
    let replied = 0, alerted = 0;
    for (const r of reviews) {
      if (!r.createTime || r.createTime <= state.watermark) continue;
      const stars = STAR_NUM[r.starRating] || 0;
      if (stars >= 4 && !r.reviewReply) {
        const ok = await gbpReply(token, locPath, r.reviewId, await composeReply(r));
        if (ok) replied++;
      } else if (stars > 0 && stars <= 3) {
        const seenKey = `alerted:${r.reviewId}`;
        if (!(await env.WIDGETS.get(seenKey))) {
          await sendAlertEmail(env, r, stars);
          await env.WIDGETS.put(seenKey, '1', { expirationTtl: 60 * 60 * 24 * 90 });
          alerted++;
        }
      }
    }
    report.gbp.autoReplied = replied;
    report.gbp.alertsSent = alerted;

    // Posts feed
    const posts = await gbpPosts(token, locPath);
    await env.WIDGETS.put('posts', JSON.stringify({ updatedAt: report.at, posts }));
    report.gbp.posts = posts.length;
    state.lastGbpSuccess = report.at;
    delete state.lastGbpError;
  } catch (err) {
    // Expected (429 RESOURCE_EXHAUSTED) until Google approves API access.
    state.lastGbpError = { at: report.at, message: String(err).slice(0, 300) };
    report.gbp = { error: state.lastGbpError.message };
  }

  state.lastRun = report.at;
  await env.WIDGETS.put('state', JSON.stringify(state));
  return report;
}

/* ---------------- Google helpers ---------------- */

async function gbpAccessToken(env) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token: env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`token refresh failed: ${JSON.stringify(data).slice(0, 200)}`);
  return data.access_token;
}

async function gbpFirstAccount(token) {
  const data = await gbpFetch(token, 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts');
  const acct = data.accounts && data.accounts[0] && data.accounts[0].name; // "accounts/123"
  if (!acct) throw new Error('no GBP accounts visible');
  return acct;
}

async function gbpFirstLocation(token, account) {
  const data = await gbpFetch(token,
    `https://mybusinessbusinessinformation.googleapis.com/v1/${account}/locations?readMask=name,title&pageSize=10`);
  const loc = data.locations && data.locations[0] && data.locations[0].name; // "locations/456"
  if (!loc) throw new Error('no GBP locations visible');
  return loc;
}

async function gbpAllReviews(token, locPath) {
  const out = [];
  let pageToken = '';
  for (let i = 0; i < 5; i++) { // up to 250 reviews
    const data = await gbpFetch(token,
      `https://mybusiness.googleapis.com/v4/${locPath}/reviews?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ''}`);
    out.push(...(data.reviews || []));
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

async function gbpPosts(token, locPath) {
  const data = await gbpFetch(token, `https://mybusiness.googleapis.com/v4/${locPath}/localPosts?pageSize=9`);
  return (data.localPosts || []).map((p) => ({
    summary: p.summary || '',
    date: p.createTime,
    photo: p.media && p.media[0] && p.media[0].googleUrl || '',
    url: p.searchUrl || '',
    cta: p.callToAction && p.callToAction.url || '',
  }));
}

async function gbpReply(token, locPath, reviewId, comment) {
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locPath}/reviews/${reviewId}/reply`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ comment }),
  });
  if (!res.ok) {
    console.log(JSON.stringify({ level: 'warn', replyFailed: reviewId, status: res.status, body: (await res.text()).slice(0, 200) }));
  }
  return res.ok;
}

async function fetchJson(url) {
  const res = await fetch(url);
  return res.json();
}

async function gbpFetch(token, url) {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(`GBP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function sendAlertEmail(env, review, stars) {
  const name = review.reviewer && review.reviewer.displayName || 'A customer';
  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      access_key: env.WEB3FORMS_KEY,
      from_name: 'Turbo Keysmith Website',
      subject: `⚠️ New ${stars}-star Google review from ${name} — reply personally`,
      message:
        `${name} left a ${stars}-star review on your Google Business Profile.\n\n` +
        `"${review.comment || '(no text)'}"\n\n` +
        `This review was NOT auto-replied (1-3 star reviews never are).\n` +
        `Please respond personally in the Google Business Profile app or at:\n` +
        `https://business.google.com/reviews`,
    }),
  });
  if (!res.ok) console.log(JSON.stringify({ level: 'warn', alertEmailFailed: res.status }));
}

/* ---------------- pages ---------------- */

async function reviewsPage(env) {
  const data = (await env.WIDGETS.get('reviews', 'json')) || { rating: 5, total: 0, reviews: [] };
  const reviews = (data.reviews || []).filter((r) => r.rating >= 4 && r.text);
  const cards = reviews.map((r) => `
    <article class="card">
      <div class="top">
        ${r.photo ? `<img class="avatar" src="${esc(r.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : '<div class="avatar ph"></div>'}
        <div><div class="name">${esc(r.name)}</div><div class="when">${esc(r.when || '')}</div></div>
        <svg class="g" viewBox="0 0 24 24" aria-label="Google review"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4z"/><path fill="#34A853" d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC04" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.9 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1z"/></svg>
      </div>
      <div class="stars" aria-label="${r.rating} stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
      <p class="text">${esc(r.text)}</p>
    </article>`).join('');

  return html(`
<style>
  :root{color-scheme:light}
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:transparent;font-family:'Montserrat',Arial,sans-serif;-webkit-font-smoothing:antialiased}
  .rail-wrap{position:relative;max-width:1400px;margin:0 auto;padding:4px 8px}
  .rail{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:8px 4px 16px}
  .rail::-webkit-scrollbar{display:none}
  .card{flex:0 0 min(300px,82vw);scroll-snap-align:start;background:#fff;border-radius:12px;
        box-shadow:0 4px 16px rgba(17,17,17,.15);padding:18px;height:250px;display:flex;flex-direction:column}
  .top{display:flex;align-items:center;gap:10px}
  .avatar{width:40px;height:40px;border-radius:50%;object-fit:cover;flex:0 0 40px}
  .avatar.ph{background:#e5e7eb}
  .name{font-weight:700;font-size:14px;color:#111}
  .when{font-size:12px;color:#6b7280}
  .g{width:20px;height:20px;margin-left:auto;flex:0 0 20px}
  .stars{color:#FBBC04;font-size:16px;letter-spacing:2px;margin:8px 0 6px}
  .text{font-size:13.5px;line-height:1.45;color:#1f2937;overflow-y:auto;flex:1;padding-right:4px}
  .nav{position:absolute;top:45%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;
       border:none;background:#fff;box-shadow:0 2px 8px rgba(17,17,17,.25);cursor:pointer;z-index:5;
       font-size:18px;color:#111;line-height:1}
  .nav.prev{left:-2px}.nav.next{right:-2px}
  @media (min-width:700px){.rail-wrap{padding:4px 48px}.nav.prev{left:2px}.nav.next{right:2px}}
  .footer{text-align:center;padding:2px 0 10px;font-size:13px}
  .footer a{color:#c8102e;font-weight:700;text-decoration:none;font-family:'Montserrat'}
  @media (hover:none){.nav{display:none}}
</style>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap" rel="stylesheet">
<div class="rail-wrap">
  <button class="nav prev" aria-label="Previous reviews">‹</button>
  <div class="rail" id="rail">${cards || '<p style="font-family:Montserrat;padding:20px">Loading reviews…</p>'}</div>
  <button class="nav next" aria-label="Next reviews">›</button>
</div>
<div class="footer"><a href="${esc(env.REVIEWS_URL)}" target="_blank" rel="noopener">Read all ${data.total || ''} reviews on Google →</a></div>
<script>
  var rail=document.getElementById('rail');
  function step(){var c=rail.querySelector('.card');return c?c.getBoundingClientRect().width+16:316}
  document.querySelector('.prev').onclick=function(){rail.scrollBy({left:-step(),behavior:'smooth'})};
  document.querySelector('.next').onclick=function(){rail.scrollBy({left:step(),behavior:'smooth'})};
  try{parent.postMessage({tkw:'reviews',count:${reviews.length}},'*')}catch(e){}
</script>`);
}

async function postsPage(env) {
  const data = (await env.WIDGETS.get('posts', 'json')) || { posts: [] };
  const posts = data.posts || [];
  const cards = posts.map((p) => `
    <article class="post">
      ${p.photo ? `<img src="${esc(p.photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
      <div class="date">${p.date ? esc(new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })) : ''}</div>
      <p>${esc(p.summary)}</p>
      ${p.cta || p.url ? `<a href="${esc(p.cta || p.url)}" target="_blank" rel="noopener">Learn more →</a>` : ''}
    </article>`).join('');

  return html(`
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{background:transparent;font-family:'Montserrat',Arial,sans-serif}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(260px,90vw),1fr));gap:12px;max-width:1100px;margin:0 auto;padding:8px}
  .post{background:#fff;border-radius:12px;border:1px solid #e5e7eb;box-shadow:0 4px 16px rgba(0,0,0,.1);padding:16px}
  .post img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;margin-bottom:10px}
  .date{color:#6b7280;font-size:12.5px;font-weight:700;margin-bottom:6px}
  .post p{font-size:13.5px;line-height:1.45;color:#111827}
  .post a{display:inline-block;margin-top:8px;color:#c8102e;font-weight:700;font-size:13.5px;text-decoration:none}
</style>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700&display=swap" rel="stylesheet">
<div class="grid">${cards}</div>
<script>try{parent.postMessage({tkw:'posts',count:${posts.length}},'*')}catch(e){}</script>`);
}

// Tiny public feed for the site's live review tally (fetched by i18n.js on
// every page). CORS-open + edge-cached so 92 pages cost ~nothing.
async function statsPage(env) {
  const data = (await env.WIDGETS.get('reviews', 'json')) || {};
  return new Response(JSON.stringify({ rating: data.rating || 5, total: data.total || 0 }), {
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=3600',
    },
  });
}

async function healthPage(env) {
  const state = (await env.WIDGETS.get('state', 'json')) || {};
  const reviews = (await env.WIDGETS.get('reviews', 'json')) || {};
  const posts = (await env.WIDGETS.get('posts', 'json')) || {};
  return json({
    lastRun: state.lastRun || null,
    lastGbpSuccess: state.lastGbpSuccess || null,
    lastGbpError: state.lastGbpError || null,
    watermark: state.watermark || null,
    reviewSource: reviews.source || null,
    rating: reviews.rating || null,
    totalReviews: reviews.total || null,
    reviewsStored: (reviews.reviews || []).length,
    postsStored: (posts.posts || []).length,
  });
}

/* ---------------- utils ---------------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Builds the public reply for one 4-5★ review: thank the person by first name,
// name the job we actually did for them, and offer one adjacent service.
async function composeReply(review) {
  const name = firstName(review.reviewer && review.reviewer.displayName);
  const text = String(review.comment || '');
  const svc = text
    ? SERVICE_REPLIES.find((s) => s.test.test(text) && !(s.not && s.not.test(text)))
    : null;
  if (!svc) {
    const g = GENERIC_REPLIES[await stableIndex(review.reviewId, GENERIC_REPLIES.length)];
    return applyName(g, name);
  }
  const did = svc.did[await stableIndex(review.reviewId + ':d', svc.did.length)];
  const offer = svc.offer[await stableIndex(review.reviewId + ':o', svc.offer.length)];
  const greet = name ? `Thanks so much, ${name}!` : 'Thanks so much!';
  return `${greet} ${did}. ${offer}. — ${BUSINESS}`;
}

// Returns a usable personal first name, or null when the display name is not a
// person (business/handle accounts like "My WorkStuff", or a bare initial).
// A null name makes composeReply drop the greeting rather than print nonsense.
const NOT_A_NAME = new Set(['my','the','a','an','mr','mrs','ms','dr','and','we','our','info','admin']);
function firstName(displayName) {
  const first = String(displayName || '').trim().split(/\s+/)[0].replace(/[^\p{L}\p{N}'-]/gu, '');
  if (!first || first.length < 2) return null;
  if (/\d/.test(first)) return null;
  if (NOT_A_NAME.has(first.toLowerCase())) return null;
  return first[0].toUpperCase() + first.slice(1);
}

// Inserts the name into a template, or removes the placeholder cleanly when we
// have no usable name ("Thank you so much, {name}!" -> "Thank you so much!").
function applyName(tpl, name) {
  if (name) return tpl.replace('{name}', name);
  const t = tpl.replace(/,\s*\{name\}/g, '').replace(/\{name\},\s*/g, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
async function stableIndex(seed, mod) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(seed)));
  return new Uint8Array(buf)[0] % mod;
}

function relativeTime(iso) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
  const y = Math.floor(days / 365);
  return `${y} year${y === 1 ? '' : 's'} ago`;
}

async function keyOk(given, expected) {
  if (!given || !expected) return false;
  const enc = new TextEncoder();
  const a = await crypto.subtle.digest('SHA-256', enc.encode(given));
  const b = await crypto.subtle.digest('SHA-256', enc.encode(expected));
  return crypto.subtle.timingSafeEqual(a, b);
}

function html(body) {
  return new Response(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${BUSINESS} widget</title></head>
<body>${body}</body></html>`, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj, null, 1), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
