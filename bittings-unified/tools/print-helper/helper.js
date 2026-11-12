// Bittings Print Helper — lets the Bittings web app (https://bittings.app, formerly https://turbokeysmith.com/staff/) print on this PC:
//   • receipts → the Star TSP100/TSP143 through its Windows driver (GDI), then cash-drawer kick
//   • labels   → the Zebra ZD420/ZD421 as raw ZPL
// Listens on 127.0.0.1 only (nothing on the network can reach it) and only answers the Bittings origins.
// Endpoints: GET /status · POST /receipt {lines:[{text,align,bold,big}], drawer, copies} · POST /zpl {zpl,copies} · POST /drawer
// Runs as a Windows scheduled task at startup (install.ps1). Printing is done by print.ps1 (PowerShell + .NET).
'use strict';
const http = require('http'), { execFile } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const PORT = 8765;
const ALLOWED = [/^https:\/\/bittings\.app$/, /^https:\/\/turbokeysmith\.com$/, /^https:\/\/www\.turbokeysmith\.com$/, /^https:\/\/[a-z0-9-]+\.turbokeysmith\.pages\.dev$/, /^http:\/\/(127\.0\.0\.1|localhost):8088$/];
const PS1 = path.join(__dirname, 'print.ps1');
const LOG = path.join(__dirname, 'helper.log');
function log(m) { try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + m + os.EOL); } catch (e) {} }

function ps(args, input) {
  return new Promise((resolve) => {
    const p = execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1].concat(args),
      { windowsHide: true, timeout: 30000, maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
        resolve({ ok: !err, out: String(stdout || '').trim(), err: err ? String(stderr || err.message).trim() : '' });
      });
    if (input != null) { p.stdin.write(input); }
    p.stdin.end();
  });
}
function cors(req, res) {
  const o = req.headers.origin || '';
  if (ALLOWED.some((r) => r.test(o))) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');   // Chrome: public site → localhost
    return true;
  }
  return !o;   // no Origin (e.g. a local test) is fine; a foreign site is refused
}
function body(req) {
  return new Promise((resolve, reject) => { let b = ''; req.on('data', (c) => { b += c; if (b.length > 2e6) { reject(new Error('too big')); req.destroy(); } });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(new Error('bad JSON')); } }); });
}
function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }

http.createServer(async (req, res) => {
  const okOrigin = cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(okOrigin ? 204 : 403); return res.end(); }
  if (!okOrigin) return send(res, 403, { error: 'origin not allowed' });
  try {
    if (req.method === 'GET' && req.url === '/status') {
      const r = await ps(['-Action', 'status']);
      return send(res, 200, Object.assign({ ok: true, helper: 'bittings-print-helper', version: 1 }, r.ok ? JSON.parse(r.out || '{}') : { error: r.err }));
    }
    if (req.method === 'POST' && req.url === '/receipt') {
      const b = await body(req); const job = JSON.stringify({ lines: (b.lines || []).slice(0, 400), drawer: !!b.drawer, cols: Math.min(64, Math.max(24, b.cols | 0 || 48)), copies: Math.min(3, Math.max(1, b.copies | 0 || 1)),
        logo: (typeof b.logo === 'string' && b.logo.length < 600000 && /^[A-Za-z0-9+/=]+$/.test(b.logo)) ? b.logo : '' });   // 8z81: shop logo (base64 PNG) drawn above the text
      const r = await ps(['-Action', 'receipt'], job); log('receipt ' + (r.ok ? 'ok' : 'ERR ' + r.err));
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'print failed' });
    }
    if (req.method === 'POST' && req.url === '/zpl') {
      const b = await body(req); const zpl = String(b.zpl || ''); if (!/^\s*\^XA/.test(zpl)) return send(res, 400, { error: 'not ZPL' });
      const copies = Math.min(50, Math.max(1, b.copies | 0 || 1));
      const r = await ps(['-Action', 'zpl'], JSON.stringify({ zpl: new Array(copies).fill(zpl).join('\n') })); log('zpl ' + (r.ok ? 'ok' : 'ERR ' + r.err));
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'label failed' });
    }
    if (req.method === 'POST' && req.url === '/drawer') {
      const r = await ps(['-Action', 'drawer']); log('drawer ' + (r.ok ? 'ok' : 'ERR ' + r.err));
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'drawer failed' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
}).listen(PORT, '127.0.0.1', () => log('listening on 127.0.0.1:' + PORT));
