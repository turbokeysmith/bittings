/* ============================================================================
   Bittings — offline shell (8z72, 2026-11-12).
   ----------------------------------------------------------------------------
   Why: with no signal the app could not even open. The shop's data is already
   kept on the device (app/store.js DevCache); this keeps the app's own files.

   The one rule that matters: ONLINE, THE NETWORK ALWAYS WINS. Every request goes
   to the network first, and only when that fails (no connection, or no answer in
   6 seconds for a page) is the saved copy used. So a phone can never sit on an
   old version because of this file — the worry that led to the "no-store" pages.

   Only this site's own GET requests are touched. The cloud (Supabase), Stripe and
   every other address pass straight through, untouched.
   To switch it off entirely: publish a sw.js that only calls
   self.registration.unregister().
   ============================================================================ */
'use strict';
var CACHE = 'bittings-shell-v1';

self.addEventListener('install', function (e) { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('bittings-shell-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// the saved copy is filed under the address without its "?…" part
function keyOf(url) { var u = new URL(url); return u.origin + u.pathname; }
// a page fetched through a redirect cannot be handed back for a navigation — keep a plain copy
function plain(resp) {
  return resp.blob().then(function (b) { return new Response(b, { status: 200, statusText: 'OK', headers: { 'content-type': resp.headers.get('content-type') || 'text/html; charset=utf-8' } }); });
}
function save(url, resp) {
  if (!resp || !resp.ok) return Promise.resolve();
  return plain(resp).then(function (copy) { return caches.open(CACHE).then(function (c) { return c.put(keyOf(url), copy); }); }).catch(function () {});
}
function saved(url) {
  var k = keyOf(url), tries = [k];
  if (/\.html$/.test(k)) tries.push(k.replace(/\.html$/, '')); else if (!/\/$/.test(k) && !/\.[a-z0-9]+$/i.test(k)) tries.push(k + '.html');
  if (/\/$/.test(k)) tries.push(k + 'index.html'); if (/\/index\.html$/.test(k)) tries.push(k.replace(/index\.html$/, ''));
  return caches.open(CACHE).then(function (c) {
    return tries.reduce(function (p, t) { return p.then(function (hit) { return hit || c.match(t); }); }, Promise.resolve(null));
  });
}

self.addEventListener('fetch', function (e) {
  var rq = e.request;
  try {
    if (rq.method !== 'GET') return;
    var u = new URL(rq.url);
    if (u.origin !== self.location.origin) return;                 // the cloud, Stripe, fonts… not ours to touch
    if (/\/version\.json$/.test(u.pathname)) return;                // the "is there a new version" check must be real
    var isPage = rq.mode === 'navigate';
    e.respondWith((function () {
      var net = fetch(rq).then(function (resp) {
        // keep a copy for the day there is no connection (a page is re-fetched plainly so the copy is usable)
        try {
          if (isPage) e.waitUntil(fetch(u.origin + u.pathname, { credentials: 'same-origin', cache: 'no-store' }).then(function (r2) { return save(rq.url, r2); }).catch(function () {}));
          else if (resp && resp.ok) e.waitUntil(save(rq.url, resp.clone()));
        } catch (err) {}
        return resp;
      });
      if (!isPage) return net.catch(function () { return saved(rq.url).then(function (hit) { return hit || Response.error(); }); });
      // a page: wait for the network, but not for ever when the signal is one bar
      return new Promise(function (resolve) {
        var done = false, t = setTimeout(function () { saved(rq.url).then(function (hit) { if (hit && !done) { done = true; resolve(hit); } }); }, 6000);
        net.then(function (resp) { if (!done) { done = true; clearTimeout(t); resolve(resp); } },
                 function () { clearTimeout(t); saved(rq.url).then(function (hit) { if (!done) { done = true; resolve(hit || new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:28px;background:#14171b;color:#f4f5f7"><h2>No connection</h2><p>Bittings has not been opened on this device before, so there is nothing saved to show. Connect and try again.</p></body>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8' } })); } }); });
      });
    })());
  } catch (err) { /* any doubt → let the browser do what it always did */ }
});
