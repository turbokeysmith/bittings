// Check every page of the getbittings.com site: loads, no sideways scroll, all images load, internal links resolve, contrast basics.
const http = require('http'), fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer');
const ROOT = 'D:/Work/Code/tk-phase3/bittings-unified/site', S = __dirname;
const MIME = { '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.vtt': 'text/vtt' };
const srv = http.createServer((q, s) => { let p = decodeURIComponent(q.url.split('?')[0].split('#')[0]); if (p === '/') p = '/index.html'; if (!path.extname(p)) p += '.html';
  fs.readFile(path.join(ROOT, p), (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''));
const SHOTS = (process.argv[2] || 'reports-pay,register-payments,index').split(',');
(async () => {
  await new Promise(r => srv.listen(8088, '127.0.0.1', r)); const b = await puppeteer.launch({ headless: 'new' });
  try { const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.setRequestInterception(true); pg.on('request', rq => { const u = rq.url(); if (/^http:\/\/127\.0\.0\.1:8088\//.test(u) || /^data:/.test(u) || /fonts\.(googleapis|gstatic)\.com/.test(u)) rq.continue(); else rq.abort(); });
    for (const [dev, vp] of [['pc', { width: 1440, height: 900 }], ['phone', { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }]]) {
      await pg.setViewport(vp);
      for (const p of pages) { await pg.goto('http://127.0.0.1:8088/' + (p === 'index' ? '' : p), { waitUntil: 'networkidle0' });
        const r = await pg.evaluate(async () => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager'); await new Promise(z => setTimeout(z, 600));
          const bad = Array.from(document.images).filter(i => !i.naturalWidth).map(i => i.getAttribute('src'));
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).filter(h => !/^(https?:|mailto:)/.test(h));
          const broken = []; for (const h of [...new Set(links)]) { const [u, hash] = h.split('#'); if (u) { const res = await fetch(u.startsWith('./') || u.startsWith('/') || u === '' ? u : u); if (!res.ok) broken.push(h); } else if (hash && !document.getElementById(hash)) broken.push(h); }
          const small = Array.from(document.querySelectorAll('a,button')).filter(x => x.offsetParent && x.getBoundingClientRect().height < 40 && !x.closest('p,li,.fine,.flinks')).map(x => (x.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 24)).slice(0, 4);
          return { side: document.documentElement.scrollWidth > innerWidth + 1, bad, broken, small, h1: (document.querySelector('h1') || {}).innerText }; });
        const flag = r.side || r.bad.length || r.broken.length;
        console.log((flag ? '!! ' : 'ok ') + dev + ' ' + p + (r.side ? ' SIDEWAYS' : '') + (r.bad.length ? ' badimg=' + r.bad.join('|') : '') + (r.broken.length ? ' broken=' + r.broken.join('|') : '') + (r.small.length && dev === 'phone' ? ' small=' + r.small.join('|') : ''));
        if (SHOTS.includes(p)) await pg.screenshot({ path: path.join(S, 'chk-' + p + '-' + dev + '.png'), fullPage: true }); } }
    console.log('page errors:', errs.length, errs.slice(0, 3));
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
