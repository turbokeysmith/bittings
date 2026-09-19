#!/usr/bin/env node
// Safe deploy for the public site: runs the Google Analytics check first and REFUSES to deploy
// if any page is missing the tag. Usage (from the repo root):
//   node website/_tools/deploy-site.mjs              -> production (--branch=main)
//   node website/_tools/deploy-site.mjs preview      -> preview deploy on branch "preview"
//   add --dry-run to run the check and print the deploy command without deploying
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const branch = args.find(a => !a.startsWith('--')) || 'main';

const check = spawnSync(process.execPath, [path.join(here, 'ga-tag.mjs')], { cwd: repo, stdio: 'inherit' });
if (check.status !== 0) {
  console.error('Deploy ABORTED — fix the Google Analytics tag first (see above).');
  process.exit(1);
}

const cmd = `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=${branch}`;
if (dryRun) { console.log(`[dry run] would now run: ${cmd}`); process.exit(0); }
process.exit(spawnSync(cmd, { cwd: repo, stdio: 'inherit', shell: true }).status ?? 1);
