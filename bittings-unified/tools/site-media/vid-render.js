// Records the two website videos in headless Chrome: canvas animation of the story frames + the narration WAVs → MP4
// (H.264 / AAC via MediaRecorder), plus a poster JPG and a WebVTT captions file. usage: node vid-render.js [pc|phone]
const http = require('http'), fs = require('fs'), path = require('path'); const puppeteer = require('puppeteer');
const DIR = __dirname, VID = path.join(DIR, 'vid'), OUT = path.join(VID, 'out'); fs.mkdirSync(OUT, { recursive: true });
const MIME = { '.html': 'text/html', '.png': 'image/png', '.wav': 'audio/wav', '.json': 'application/json' };
const srv = http.createServer((q, s) => {
  const u = new URL(q.url, 'http://x');
  if (q.method === 'POST' && u.pathname === '/save') { const name = path.basename(u.searchParams.get('name')); const chunks = []; q.on('data', c => chunks.push(c)); q.on('end', () => { fs.writeFileSync(path.join(OUT, name), Buffer.concat(chunks)); s.end('ok'); }); return; }
  if (u.pathname === '/render.html') { s.writeHead(200, { 'content-type': 'text/html' }); return s.end(PAGE); }
  if (u.pathname === '/vid-script.json') { s.writeHead(200, { 'content-type': 'application/json' }); return s.end(fs.readFileSync(path.join(DIR, 'vid-script.json'))); }
  const p = path.join(VID, decodeURIComponent(u.pathname));
  fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end('nf'); } s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
});
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;800;900&family=JetBrains+Mono:wght@600&display=block" rel="stylesheet"></head>
<body style="margin:0;background:#000"><canvas id="c" width="1920" height="1080"></canvas>
<script>
const W = 1920, H = 1080, RED = '#c42a36', BG = '#15181e', INK = '#f3f4f6', DIM = '#a3abb6';
const c = document.getElementById('c'), x = c.getContext('2d');
const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
function wrap(t, maxW) { const words = t.split(' '), lines = []; let cur = ''; for (const w of words) { const n = cur ? cur + ' ' + w : w; if (x.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; } if (cur) lines.push(cur); return lines; }
function rr(X, Y, w, h, r) { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); }
function brand(cx, cy, size, align) { x.font = '900 ' + size + 'px Archivo'; x.textAlign = align || 'center'; x.textBaseline = 'middle'; x.fillStyle = INK; x.fillText('Bittings', cx - (align === 'left' ? 0 : x.measureText('.').width / 2), cy); const w = x.measureText('Bittings').width; x.fillStyle = RED; x.fillText('.', (align === 'left' ? cx + w : cx + w / 2 - x.measureText('.').width / 2) + 2, cy); x.textAlign = 'left'; }
function card(kind, cfg, p) { x.fillStyle = BG; x.fillRect(0, 0, W, H); const g = x.createRadialGradient(W * 0.7, 0, 50, W * 0.7, 0, 1100); g.addColorStop(0, 'rgba(196,42,54,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalAlpha = Math.min(1, p * 3); brand(W / 2, 400, 150);
  x.textAlign = 'center'; x.fillStyle = DIM; x.font = '600 30px "JetBrains Mono"'; x.fillText(kind === 'intro' ? cfg.title.toUpperCase() : 'GETBITTINGS.COM', W / 2, 540);
  x.fillStyle = INK; x.font = '700 54px Archivo'; x.fillText(kind === 'intro' ? 'A job from the first call to checkout' : 'Shop software built for locksmiths, by locksmiths.', W / 2, 630);
  if (kind === 'outro') { x.fillStyle = RED; rr(W / 2 - 230, 710, 460, 96, 18); x.fill(); x.fillStyle = '#fff'; x.font = '800 40px Archivo'; x.fillText('Request access', W / 2, 760); }
  x.globalAlpha = 1; x.textAlign = 'left'; }
function pcScene(img, s, p, idx, n, cfg) { // image covers the frame, slow zoom toward (fx,fy)
  const z = 1 + 0.07 * p, iw = img.width, ih = img.height, sc = Math.max(W / iw, H / ih) * z, dw = iw * sc, dh = ih * sc;
  const fx = s.fx == null ? 0.5 : s.fx, fy = s.fy == null ? 0.4 : s.fy; const ox = (W - dw) * fx, oy = (H - dh) * fy;
  x.drawImage(img, ox, oy, dw, dh);
  const gr = x.createLinearGradient(0, H - 330, 0, H); gr.addColorStop(0, 'rgba(10,12,16,0)'); gr.addColorStop(1, 'rgba(10,12,16,0.92)'); x.fillStyle = gr; x.fillRect(0, H - 330, W, 330);
  x.fillStyle = 'rgba(15,17,22,0.86)'; rr(40, 34, 520, 64, 32); x.fill(); brand(72, 67, 34, 'left'); x.fillStyle = DIM; x.font = '600 22px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText(cfg.title.toUpperCase(), 250, 68);
  x.fillStyle = RED; x.fillRect(80, H - 190, 10, 112);
  x.fillStyle = '#ff6b73'; x.font = '600 26px "JetBrains Mono"'; x.textBaseline = 'alphabetic'; x.fillText('STEP ' + (idx + 1) + ' OF ' + n, 112, H - 160);
  x.fillStyle = INK; x.font = '800 62px Archivo'; x.fillText(s.cap, 112, H - 92); }
function phoneScene(img, s, p, idx, n, cfg) {
  x.fillStyle = BG; x.fillRect(0, 0, W, H); const g = x.createRadialGradient(560, 540, 50, 560, 540, 900); g.addColorStop(0, 'rgba(196,42,54,0.16)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const ph = 960, pw = ph * img.width / img.height, px = 560 - pw / 2, py = (H - ph) / 2 + 6 - 8 * p;
  x.fillStyle = '#05070a'; rr(px - 16, py - 16, pw + 32, ph + 32, 58); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 2; x.stroke();
  x.save(); rr(px, py, pw, ph, 44); x.clip(); x.drawImage(img, px, py, pw, ph); x.restore();
  brand(1010, 150, 46, 'left'); x.fillStyle = DIM; x.font = '600 24px "JetBrains Mono"'; x.textBaseline = 'middle'; x.fillText(cfg.title.toUpperCase(), 1010, 210);
  x.textBaseline = 'alphabetic'; x.fillStyle = '#ff6b73'; x.font = '600 28px "JetBrains Mono"'; x.fillText('STEP ' + (idx + 1) + ' OF ' + n, 1010, 430);
  x.fillStyle = INK; x.font = '800 72px Archivo'; wrap(s.cap, 800).forEach((l, i) => x.fillText(l, 1010, 520 + i * 84));
  for (let i = 0; i < n; i++) { x.fillStyle = i === idx ? RED : 'rgba(255,255,255,0.22)'; rr(1010 + i * 46, 870, 34, 10, 5); x.fill(); } }
window.run = async function (kind) {
  await document.fonts.load('900 60px Archivo'); await document.fonts.load('800 60px Archivo'); await document.fonts.load('700 60px Archivo'); await document.fonts.load('600 20px "JetBrains Mono"');
  const all = await (await fetch('/vid-script.json')).json(), cfg = all[kind];
  const ac = new AudioContext({ sampleRate: 48000 }), dest = ac.createMediaStreamDestination();
  const buf = async name => ac.decodeAudioData(await (await fetch('/audio/' + name + '.wav')).arrayBuffer());
  const items = [{ kind: 'intro', a: await buf(kind + '-intro'), say: cfg.intro }];
  for (let i = 0; i < cfg.scenes.length; i++) items.push({ kind: 'scene', s: cfg.scenes[i], idx: i, img: await loadImg('/' + cfg.scenes[i].img + '.png'), a: await buf(kind + '-s' + String(i + 1).padStart(2, '0')), say: cfg.scenes[i].say });
  items.push({ kind: 'outro', a: await buf(kind + '-outro'), say: cfg.outro });
  let t = 0; items.forEach(it => { it.lead = 0.55; it.start = t; it.dur = it.lead + it.a.duration + (it.kind === 'outro' ? 1.8 : 0.75); t += it.dur; }); const total = t;
  const draw = (it, local) => { const p = Math.min(1, local / it.dur); if (it.kind === 'scene') (kind === 'pc' ? pcScene : phoneScene)(it.img, it.s, p, it.idx, cfg.scenes.length, cfg); else card(it.kind, cfg, p); };
  // poster
  draw(items[1], items[1].dur * 0.5); const poster = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86)); await fetch('/save?name=' + kind + '-poster.jpg', { method: 'POST', body: poster });
  const stream = new MediaStream([(window.__vt = c.captureStream(0).getVideoTracks()[0]), dest.stream.getAudioTracks()[0]]);
  const type = 'video/mp4;codecs=avc1.42E01E,mp4a.40.2'; const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1800000, audioBitsPerSecond: 96000 }); const parts = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); };
  const stopped = new Promise(r => rec.onstop = r);
  draw(items[0], 0); rec.start(1000); const t0 = ac.currentTime + 0.25;
  items.forEach(it => { const src = ac.createBufferSource(); src.buffer = it.a; src.connect(dest); src.start(t0 + it.start + it.lead); });
  await new Promise(done => { function frame() { const now = ac.currentTime - t0; if (now >= total + 0.2) return done();
      const cur = items.find(it => now >= it.start && now < it.start + it.dur) || items[items.length - 1], i = items.indexOf(cur), local = Math.max(0, now - cur.start);
      draw(cur, local); if (i > 0 && local < 0.45) { x.globalAlpha = 1 - local / 0.45; draw(items[i - 1], items[i - 1].dur); x.globalAlpha = 1; }
      window.__vt.requestFrame(); setTimeout(frame, 33); } frame(); });
  rec.stop(); await stopped; const blob = new Blob(parts, { type: 'video/mp4' });
  await fetch('/save?name=' + kind + '.mp4', { method: 'POST', body: blob });
  const fmt = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = (s % 60).toFixed(3).padStart(6, '0'); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + ss; };
  const vtt = 'WEBVTT\\n\\n' + items.map((it, i) => (i + 1) + '\\n' + fmt(0.25 + it.start + it.lead) + ' --> ' + fmt(0.25 + it.start + it.lead + it.a.duration + 0.2) + '\\n' + it.say + '\\n').join('\\n');
  await fetch('/save?name=' + kind + '.vtt', { method: 'POST', body: vtt });
  return { total: total.toFixed(1), size: blob.size };
};
</script></body></html>`;
(async () => {
  await new Promise(r => srv.listen(8089, '127.0.0.1', r));
  const b = await puppeteer.launch({ headless: 'new', protocolTimeout: 900000, args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  try { const pg = await b.newPage(); pg.on('pageerror', e => console.log('PAGEERROR', e.message)); pg.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
    await pg.setViewport({ width: 1920, height: 1080 }); await pg.goto('http://127.0.0.1:8089/render.html', { waitUntil: 'networkidle0' });
    for (const k of ['pc', 'phone']) { if (process.argv[2] && process.argv[2] !== k) continue; const t = Date.now(); const r = await pg.evaluate(k => window.run(k), k); console.log(k, 'length', r.total + 's', Math.round(r.size / 1048576 * 10) / 10 + 'MB', 'took', Math.round((Date.now() - t) / 1000) + 's'); }
  } finally { await b.close(); srv.close(); }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
