// Bittings Print Helper — lets the Bittings web app (https://bittings.app, formerly https://turbokeysmith.com/staff/) print on this PC:
//   • receipts → the Star TSP100/TSP143 through its Windows driver (GDI), then cash-drawer kick
//   • labels   → the Zebra ZD420/ZD421 as raw ZPL
// Listens on 127.0.0.1 only (nothing on the network can reach it) and only answers the Bittings origins.
// Endpoints: GET /status · POST /receipt {lines:[{text,align,bold,big}], drawer, copies} · POST /zpl {zpl,copies} · POST /drawer
//            POST /reset — clears every waiting print job and restarts the Windows print spooler ("Reset printing" in the app)
// Runs as a Windows scheduled task at startup (install.ps1). Printing is done by print.ps1 (PowerShell + .NET).
//
// v2 (8z137, 2026-11-13): the helper DIED at the counter. A 15-label job jammed the Windows print queue, the next print
// script hung, was stopped at its 30 s limit while the label was still being handed to it, and the unhandled pipe error
// took the whole helper down ("Can't reach the Bittings Print Helper"). Now: a failed hand-over is just a failed print,
// nothing unexpected can end the process, jobs run one at a time, an over-size job is answered instead of cut off, and
// /reset un-jams the queue. install.ps1 also starts the helper again within a minute if it is ever not running.
'use strict';
const http = require('http'), { execFile } = require('child_process'), path = require('path'), fs = require('fs'), os = require('os');
const PORT = 8765;
const VERSION = 2;
const MAX_BODY = 12e6;
const ALLOWED = [/^https:\/\/bittings\.app$/, /^https:\/\/turbokeysmith\.com$/, /^https:\/\/www\.turbokeysmith\.com$/, /^https:\/\/[a-z0-9-]+\.turbokeysmith\.pages\.dev$/, /^http:\/\/(127\.0\.0\.1|localhost):8088$/];
const PS1 = path.join(__dirname, 'print.ps1');
const LOG = path.join(__dirname, 'helper.log');
function log(m) { try { fs.appendFileSync(LOG, new Date().toISOString() + ' ' + m + os.EOL); } catch (e) {} }
// nothing unexpected may end the helper — write it down and carry on
process.on('uncaughtException', (e) => log('UNCAUGHT ' + String((e && e.stack) || e).slice(0, 600)));
process.on('unhandledRejection', (e) => log('UNHANDLED ' + String((e && e.stack) || e).slice(0, 600)));

function ps(args, input, timeoutMs) {
  return new Promise((resolve) => {
    let p;
    try {
      p = execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', PS1].concat(args),
        { windowsHide: true, timeout: timeoutMs || 30000, maxBuffer: 1 << 20 }, (err, stdout, stderr) => {
          const timedOut = !!(err && err.killed);
          resolve({ ok: !err, out: String(stdout || '').trim(), err: err ? (timedOut ? 'the printer did not answer in time (the print queue may be jammed — use "Reset printing")' : String(stderr || err.message).trim()) : '' });
        });
    } catch (e) { return resolve({ ok: false, out: '', err: 'could not start the print script: ' + String(e.message || e) }); }
    // the script may end (or be stopped at its time limit) while the job is still being handed to it — that is a failed
    // print, never a reason for the helper to stop
    p.on('error', () => {});
    if (p.stdin) { p.stdin.on('error', () => {}); try { if (input != null) p.stdin.write(input); p.stdin.end(); } catch (e) {} }
  });
}
// one print job at a time: two scripts talking to the spooler at once only makes a jam worse
let chain = Promise.resolve();
function queued(fn) { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; }

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
  // an over-size job is read to its end and then refused with an answer — cutting the connection made the app say
  // "can't reach the helper", which sent people looking for the wrong problem
  return new Promise((resolve, reject) => { let b = '', over = false;
    req.on('data', (c) => { if (over) return; b += c; if (b.length > MAX_BODY) { over = true; b = ''; } });
    req.on('error', (e) => reject(e));
    req.on('end', () => { if (over) return reject(new Error('That is too much to print in one go — print fewer labels at a time.'));
      try { resolve(b ? JSON.parse(b) : {}); } catch (e) { reject(new Error('bad JSON')); } }); });
}
function send(res, code, obj) { try { if (res.headersSent || res.writableEnded) return; res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); } catch (e) {} }

const server = http.createServer(async (req, res) => {
  req.on('error', () => {}); res.on('error', () => {});
  const okOrigin = cors(req, res);
  if (req.method === 'OPTIONS') { res.writeHead(okOrigin ? 204 : 403); return res.end(); }
  if (!okOrigin) return send(res, 403, { error: 'origin not allowed' });
  try {
    if (req.method === 'GET' && req.url === '/status') {
      const r = await ps(['-Action', 'status']);
      let info = {}; if (r.ok) { try { info = JSON.parse(r.out || '{}'); } catch (e) { info = { error: 'bad status answer' }; } } else info = { error: r.err };
      return send(res, 200, Object.assign({ ok: true, helper: 'bittings-print-helper', version: VERSION, canReset: true }, info));
    }
    if (req.method === 'POST' && req.url === '/receipt') {
      const b = await body(req); const job = JSON.stringify({ lines: (b.lines || []).slice(0, 400), drawer: !!b.drawer, cols: Math.min(64, Math.max(24, b.cols | 0 || 48)), copies: Math.min(3, Math.max(1, b.copies | 0 || 1)),
        logo: (typeof b.logo === 'string' && b.logo.length < 600000 && /^[A-Za-z0-9+/=]+$/.test(b.logo)) ? b.logo : '' });   // 8z81: shop logo (base64 PNG) drawn above the text
      const r = await queued(() => ps(['-Action', 'receipt'], job)); log('receipt ' + (r.ok ? 'ok' : 'ERR ' + r.err));
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'print failed' });
    }
    if (req.method === 'POST' && req.url === '/zpl') {
      const b = await body(req); const zpl = String(b.zpl || ''); if (!/^\s*\^XA/.test(zpl)) return send(res, 400, { error: 'not ZPL' });
      const copies = Math.min(50, Math.max(1, b.copies | 0 || 1));
      const r = await queued(() => ps(['-Action', 'zpl'], JSON.stringify({ zpl: new Array(copies).fill(zpl).join('\n') })));
      log('zpl ' + (r.ok ? 'ok' : 'ERR ' + r.err) + ' ' + Math.round(zpl.length * copies / 1024) + 'KB');
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'label failed' });
    }
    if (req.method === 'POST' && req.url === '/drawer') {
      const r = await queued(() => ps(['-Action', 'drawer'])); log('drawer ' + (r.ok ? 'ok' : 'ERR ' + r.err));
      return send(res, r.ok ? 200 : 500, r.ok ? { ok: true } : { error: r.err || 'drawer failed' });
    }
    if (req.method === 'POST' && req.url === '/reset') {
      await body(req).catch(() => ({}));
      const r = await ps(['-Action', 'reset'], null, 120000); log('reset ' + (r.ok ? 'ok ' + r.out : 'ERR ' + r.err));   // not queued: it must get past a stuck job
      let info = {}; try { info = JSON.parse(r.out || '{}'); } catch (e) {}
      return send(res, r.ok ? 200 : 500, r.ok ? Object.assign({ ok: true }, info) : { error: r.err || 'reset failed' });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message || e) }); }
});
server.on('clientError', (e, socket) => { try { socket.destroy(); } catch (x) {} });
server.on('error', (e) => { log('SERVER ERROR ' + String(e.message || e)); if (e && e.code === 'EADDRINUSE') process.exit(0); });   // another copy already has the port — leave it to that one
server.listen(PORT, '127.0.0.1', () => log('listening on 127.0.0.1:' + PORT + ' (v' + VERSION + ')'));
