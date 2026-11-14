// Does the Bittings Print Helper die? Runs a COPY of tools/print-helper/helper.js on port 18765 with a stand-in print.ps1
// (nothing is printed) and throws the three suspect situations at it.  node helper-crash-test.js [path-to-helper.js]
const fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process'), http = require('http');
const SRC = process.argv[2] || 'D:/Work/Code/tk-phase3/bittings-unified/tools/print-helper/helper.js';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helper-test-'));
let src = fs.readFileSync(SRC, 'utf8');
if (!/const PORT = 8765;/.test(src)) throw new Error('PORT line not found');
src = src.replace('const PORT = 8765;', 'const PORT = 18765;');
fs.writeFileSync(path.join(dir, 'helper.js'), src);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const post = (p, obj, timeout) => new Promise((resolve) => { const data = Buffer.from(JSON.stringify(obj));
  const rq = http.request({ host: '127.0.0.1', port: 18765, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': data.length }, timeout: timeout || 45000 },
    (rs) => { let b = ''; rs.on('data', c => b += c); rs.on('end', () => resolve({ status: rs.statusCode, body: b.slice(0, 160) })); });
  rq.on('error', (e) => resolve({ netError: e.code || e.message })); rq.on('timeout', () => { rq.destroy(); resolve({ netError: 'timeout' }); });
  rq.end(data); });
const alive = () => new Promise((resolve) => { const rq = http.request({ host: '127.0.0.1', port: 18765, path: '/nope', method: 'GET', timeout: 3000 }, (rs) => { rs.resume(); resolve(true); }); rq.on('error', () => resolve(false)); rq.on('timeout', () => { rq.destroy(); resolve(false); }); rq.end(); });
async function scenario(name, ps1, zplBytes) {
  fs.writeFileSync(path.join(dir, 'print.ps1'), ps1);
  const child = cp.spawn(process.execPath, [path.join(dir, 'helper.js')], { stdio: ['ignore', 'pipe', 'pipe'] });
  let err = '', exited = null; child.stderr.on('data', d => err += d); child.on('exit', (c) => exited = c);
  await sleep(1200);
  const zpl = '^XA' + 'A'.repeat(zplBytes) + '^XZ';
  const t = Date.now(); const r = await post('/zpl', { zpl });
  await sleep(1500);
  const up = exited === null && await alive();
  console.log((up ? 'SURVIVED ' : 'DIED     ') + name + '  → answer ' + JSON.stringify(r) + ' after ' + ((Date.now() - t) / 1000).toFixed(1) + ' s' + (exited !== null ? '  exit code ' + exited : '') + (err ? '\n         stderr: ' + err.trim().split('\n').slice(0, 4).join(' | ').slice(0, 400) : ''));
  try { child.kill(); } catch (e) {}
  await sleep(300); return up;
}
(async () => {
  const quick = 'param([string]$Action) $null = [Console]::In.ReadToEnd(); Write-Output "{}"';
  const a = await scenario('a normal 190 KB label', quick, 190000);
  const b = await scenario('one job of 15 big labels (2.8 MB — over the helper\'s 2 MB limit)', quick, 2800000);
  const c = await scenario('the print script quits at once without reading the label (1.5 MB)', 'param([string]$Action) exit 1', 1500000);
  const d = await scenario('the print script hangs past the 30 s limit (jammed spooler), 1.5 MB label', 'param([string]$Action) Start-Sleep -Seconds 45', 1500000);
  console.log([a, b, c, d].every(Boolean) ? 'HELPER NEVER DIED' : 'HELPER DIED in at least one case');
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
})();
