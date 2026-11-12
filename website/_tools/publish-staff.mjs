#!/usr/bin/env node
// Publish the Bittings staff app under website/site/staff/ (copied from bittings-unified/) and make every
// "Staff Login" link on the site point at /staff/signin.html. Then deploy with: node website/_tools/deploy-site.mjs
// Usage (from the repo root):  node website/_tools/publish-staff.mjs
// Copies only what the browser needs — no docs, supabase/, tools/, demo or sandbox pages. Re-runnable.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const SRC = path.join(REPO, 'bittings-unified');
const SITE = path.join(REPO, 'website', 'site');
const DST = path.join(SITE, 'staff');
const FILES = ['index.html', 'bittings.html', 'signin.html', 'sw.js', 'cloud-test.html', 'Bittings.ico', 'favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'tks_logo.png', 'tks_mark.png'];

function copyDir(a, b) { fs.mkdirSync(b, { recursive: true }); for (const e of fs.readdirSync(a, { withFileTypes: true })) { const s = path.join(a, e.name), d = path.join(b, e.name); if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d); } }

fs.rmSync(DST, { recursive: true, force: true }); fs.mkdirSync(DST, { recursive: true });
for (const f of FILES) if (fs.existsSync(path.join(SRC, f))) fs.copyFileSync(path.join(SRC, f), path.join(DST, f));
copyDir(path.join(SRC, 'app'), path.join(DST, 'app'));
try { fs.unlinkSync(path.join(DST, 'app', 'STRUCTURE_NOTES.md')); } catch {}

// 8z40: version stamp — the app compares this with the version it loaded and offers "Update ready"
{ const crypto = await import('node:crypto'); const h = crypto.createHash('sha1'); const list = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((x, y) => x.name < y.name ? -1 : 1)) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else list.push(p); } })(DST);
  for (const p of list) { h.update(path.relative(DST, p)); h.update(fs.readFileSync(p)); }
  const v = h.digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(DST, 'version.json'), JSON.stringify({ v, at: new Date().toISOString() }));
  console.log('staff app version ' + v); }

let n = 0, bytes = 0; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { n++; bytes += fs.statSync(p).size; } } })(DST);
console.log(`staff app copied: ${n} files, ${(bytes / 1024 / 1024).toFixed(1)} MB → website/site/staff/`);

let pages = 0, links = 0;
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'staff') walk(p); continue; } if (!/\.html?$/i.test(e.name)) continue;
  const before = fs.readFileSync(p, 'utf8');
  const after = before.replace(/href="(?:\.\.\/)*cloud-test\.html"/g, () => { links++; return 'href="/staff/signin.html"'; });
  if (after !== before) { fs.writeFileSync(p, after); pages++; } } })(SITE);
console.log(`Staff Login links rewritten: ${links} in ${pages} pages (0 = already pointing at /staff/signin.html)`);
console.log('Next: node website/_tools/deploy-site.mjs   (needs CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID in the environment)');
