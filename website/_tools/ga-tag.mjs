#!/usr/bin/env node
// Google Analytics (GA4) guard for the public site.
//
// The site is hand-maintained static HTML with no shared header, so the GA tag has to live in
// every page. The ONE source of truth for the tag is website/_tools/ga-snippet.html.
//
//   node website/_tools/ga-tag.mjs            -> CHECK: fails (exit 1) if any page is missing the tag
//   node website/_tools/ga-tag.mjs --fix      -> FIX: stamps the tag into every page that lacks it
//   node website/_tools/ga-tag.mjs <dir>      -> check a different folder (e.g. a test copy)
//
// Run automatically by website/_tools/deploy-site.mjs (before every deploy) and the git pre-push hook.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MEASUREMENT_ID = 'G-8LY4YD2YFG';
const here = path.dirname(fileURLToPath(import.meta.url));
const snippet = fs.readFileSync(path.join(here, 'ga-snippet.html'), 'utf8').trimEnd();

const args = process.argv.slice(2);
const fix = args.includes('--fix');
const siteDir = path.resolve(args.find(a => !a.startsWith('--')) || path.join(here, '..', 'site'));

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return /\.html?$/i.test(e.name) ? [p] : [];
  });
}

// The tag only counts if it is inside <head> ... </head> and loads gtag.js for our ID.
function hasTag(html) {
  const head = html.match(/<head[\s>][\s\S]*?<\/head>/i);
  return !!head && head[0].includes(`googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`)
    && head[0].includes(`gtag('config', '${MEASUREMENT_ID}')`);
}

function insertTag(html) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  const block = eol + snippet.replace(/\r?\n/g, eol);
  // Right after <meta charset> if present (charset must stay first), else right after <head>.
  const charset = /<head[^>]*>\s*<meta\s+charset=[^>]*>/i;
  if (charset.test(html)) return html.replace(charset, m => m + block);
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, m => m + block);
  return null;
}

if (!fs.existsSync(siteDir)) {
  console.error(`\n❌ GA CHECK FAILED: site folder not found: ${siteDir}\n`);
  process.exit(1);
}

const files = htmlFiles(siteDir);
const missing = files.filter(f => !hasTag(fs.readFileSync(f, 'utf8')));
const rel = f => path.relative(siteDir, f).split(path.sep).join('/');

if (fix) {
  let fixed = 0;
  for (const f of missing) {
    const out = insertTag(fs.readFileSync(f, 'utf8'));
    if (out === null) { console.error(`  ! no <head> in ${rel(f)} — add the tag by hand`); continue; }
    fs.writeFileSync(f, out);
    fixed++;
  }
  console.log(`GA tag added to ${fixed} page(s); ${files.length - missing.length} already had it.`);
  process.exit(fixed === missing.length ? 0 : 1);
}

if (files.length === 0 || missing.length) {
  console.error('\n' + '='.repeat(64));
  console.error(`❌ GOOGLE ANALYTICS CHECK FAILED — ${MEASUREMENT_ID} missing`);
  console.error('='.repeat(64));
  if (files.length === 0) console.error(`No HTML pages found in ${siteDir}`);
  missing.slice(0, 50).forEach(f => console.error('  missing: ' + rel(f)));
  if (missing.length > 50) console.error(`  ...and ${missing.length - 50} more`);
  console.error(`\n${missing.length} of ${files.length} page(s) have no GA tag in <head>.`);
  console.error('Fix it with:  node website/_tools/ga-tag.mjs --fix\n');
  process.exit(1);
}
console.log(`✅ GA check passed: all ${files.length} pages have ${MEASUREMENT_ID} in <head>.`);
