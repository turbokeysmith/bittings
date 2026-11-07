// Bittings local server — Node version of _devserver.py (the shop PC has Node, not Python).
// Serves THIS folder over http://localhost:8088 with caching disabled, so the app always runs
// from a real http origin (printer SDKs, cloud sign-in and the edge-function origin allow-list
// all expect http://localhost:8088, never file://).
//
//   node _devserver.js            → http://127.0.0.1:8088  (also reachable as http://localhost:8088)
//   node _devserver.js 8090       → another port
//
// START-BITTINGS.ps1 starts this automatically; you normally never run it by hand.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname;
const port = Number(process.argv[2] || 8088);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8',
  '.pdf': 'application/pdf', '.webmanifest': 'application/manifest+json'
};
const noCache = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent((req.url || '/').split('?')[0]); } catch (e) { res.writeHead(400, noCache); return res.end('bad path'); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403, noCache); return res.end('forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, noCache); return res.end('404 ' + p); }
    res.writeHead(200, Object.assign({ 'Content-Type': types[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size }, noCache));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') { console.log('port ' + port + ' already in use — another Bittings server is probably running. Nothing to do.'); process.exit(0); }
  console.error(e); process.exit(1);
});
server.listen(port, '127.0.0.1', () => console.log('Bittings: serving ' + root + ' on http://localhost:' + port + '  (Ctrl+C to stop)'));
