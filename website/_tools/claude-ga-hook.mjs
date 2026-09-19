#!/usr/bin/env node
// Claude Code hook (wired in .claude/settings.json) that keeps the Google Analytics tag automatic:
//  - PostToolUse: after Claude writes/edits a site page (or runs a shell command touching website/site),
//    stamp the GA tag into any page missing it (ga-tag.mjs --fix).
//  - PreToolUse (Bash): block a raw `wrangler pages deploy` — deploys must go through deploy-site.mjs,
//    which runs the GA check first.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let raw = '';
for await (const chunk of process.stdin) raw += chunk;
const input = JSON.parse(raw || '{}');
const tool = input.tool_name || '';
const ti = input.tool_input || {};
const cmd = String(ti.command || '');

if (input.hook_event_name === 'PreToolUse') {
  if (tool === 'Bash' && /wrangler(\.cmd)?\s+pages\s+deploy/i.test(cmd)) {
    console.log(JSON.stringify({ hookSpecificOutput: {
      hookEventName: 'PreToolUse', permissionDecision: 'deny',
      permissionDecisionReason: 'Raw wrangler deploys skip the Google Analytics check. Use `node website/_tools/deploy-site.mjs` (production) or `node website/_tools/deploy-site.mjs preview`.',
    } }));
  }
  process.exit(0);
}

// PostToolUse
const file = String(ti.file_path || '').split('\\').join('/');
const touchesSite = /website\/site\/.*\.html?$/i.test(file) || (tool === 'Bash' && /website.site/i.test(cmd));
if (!touchesSite) process.exit(0);

const r = spawnSync(process.execPath, [path.join(here, 'ga-tag.mjs'), '--fix'], { encoding: 'utf8' });
const added = Number((r.stdout.match(/GA tag added to (\d+)/) || [])[1] || 0);
if (r.status !== 0) {
  console.log(JSON.stringify({ systemMessage: 'Google Analytics auto-fix FAILED: ' + (r.stderr || r.stdout).trim() }));
} else if (added > 0) {
  console.log(JSON.stringify({
    systemMessage: `Google Analytics tag auto-added to ${added} page(s).`,
    hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: `GA hook added the GA4 tag (G-8LY4YD2YFG) to ${added} page(s) under website/site.` },
  }));
}
