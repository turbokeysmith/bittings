#!/usr/bin/env node
// Nightly backup of the Bittings cloud database to this PC (8z72, 2026-11-12).
//
// Why this exists: the Supabase project has NO backups on its current plan (checked 2026-11-12:
// `supabase backups list` → none, point-in-time recovery off). Until the plan is upgraded, this is the only copy
// of the shop's data outside the cloud.
//
// What it does: reads every table in the `public` schema (read-only) and writes one JSON file per table, plus the
// database's functions, row rules, indexes and triggers as text, into a dated folder. Keeps the newest 30 folders
// and the first one of each month. No Docker / pg_dump needed — it uses the Supabase CLI this PC is already logged in to.
//
//   node bittings-unified/tools/backup/backup-db.mjs            (run from the repo root, or anywhere)
//   BITTINGS_BACKUP_DIR=E:\somewhere node …/backup-db.mjs        (another destination)
//
// Restoring is described in README.md next to this file. Part photos (Supabase Storage) are NOT included.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..', '..');
const DEST = process.env.BITTINGS_BACKUP_DIR || 'D:\\Work\\Backups\\db';
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);   // 2026-11-12-06-30 (UTC)
const dir = path.join(DEST, stamp);
const tmp = path.join(os.tmpdir(), 'bittings-backup-' + process.pid + '.sql');
const log = (...a) => console.log(new Date().toISOString(), ...a);

function query(sql) {
  fs.writeFileSync(tmp, sql);
  // --agent no: always the plain form (a JSON array of rows). Inside an AI-assistant session the CLI wraps the rows in
  // an object instead, and the scheduled task is not such a session — the first scheduled run failed on that difference.
  const out = execSync(`npx supabase@3.0.0 db query --remote --read-only --file "${tmp.replace(/\\/g, '/')}" --output-format json --agent no`,
    { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 29, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  let j;
  try { j = JSON.parse(out); } catch { const a = out.indexOf('['), o = out.indexOf('{'); const first = (a >= 0 && (o < 0 || a < o)) ? '[' : '{';
    j = JSON.parse(out.slice(out.indexOf(first), out.lastIndexOf(first === '[' ? ']' : '}') + 1)); }
  if (Array.isArray(j)) return j;
  if (j._tag === 'Error' || j.error) throw new Error(JSON.stringify(j.error || j).slice(0, 400));
  return j.rows || [];
}

let failed = 0;
try {
  fs.mkdirSync(dir, { recursive: true });
  const tables = query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`).map(r => r.table_name);
  if (!tables.length) throw new Error('no tables listed — is the Supabase CLI still logged in?');
  const summary = { at: new Date().toISOString(), project: 'gcshuhlksjznksspbigl', tables: {} };
  for (const t of tables) {
    if (!/^[a-z0-9_]+$/.test(t)) { log('skipped odd table name', t); continue; }
    try {
      const rows = query(`select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as rows from public."${t}" x`)[0].rows;
      fs.writeFileSync(path.join(dir, t + '.json'), JSON.stringify(rows));
      summary.tables[t] = rows.length;
    } catch (e) { failed++; summary.tables[t] = 'FAILED: ' + String(e.message).slice(0, 160); log('table', t, 'FAILED', String(e.message).slice(0, 160)); }
  }
  // who can sign in (ids + e-mails only — never passwords) so staff rows can be matched to people after a restore
  try { const u = query(`select coalesce(jsonb_agg(jsonb_build_object('id', id, 'email', email, 'created_at', created_at, 'last_sign_in_at', last_sign_in_at)), '[]'::jsonb) as rows from auth.users`)[0].rows;
    fs.writeFileSync(path.join(dir, '_auth_users.json'), JSON.stringify(rows_ok(u))); summary.tables._auth_users = u.length; } catch (e) { summary.tables._auth_users = 'not readable'; }
  // the shape of the database, as text
  const part = (name, sql, col) => { try { fs.writeFileSync(path.join(dir, name), query(sql).map(r => r[col]).join('\n\n') + '\n'); } catch (e) { failed++; log(name, 'FAILED', String(e.message).slice(0, 160)); } };
  part('_functions.sql', `select pg_get_functiondef(p.oid) || ';' as def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname`, 'def');
  part('_columns.txt', `select table_name || '.' || column_name || ' ' || data_type || coalesce(' default ' || column_default, '') || case when is_nullable='NO' then ' not null' else '' end as def from information_schema.columns where table_schema='public' order by table_name, ordinal_position`, 'def');
  part('_policies.sql', `select 'create policy ' || polname || ' on public.' || c.relname || ' — cmd ' || polcmd::text || coalesce(' using (' || pg_get_expr(polqual, polrelid) || ')', '') || coalesce(' with check (' || pg_get_expr(polwithcheck, polrelid) || ')', '') as def from pg_policy p join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname, polname`, 'def');
  part('_indexes.sql', `select indexdef || ';' as def from pg_indexes where schemaname='public' order by tablename, indexname`, 'def');
  part('_triggers.sql', `select pg_get_triggerdef(t.oid) || ';' as def from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname, t.tgname`, 'def');
  summary.failed = failed;
  summary.bytes = fs.readdirSync(dir).reduce((s, f) => s + fs.statSync(path.join(dir, f)).size, 0);
  fs.writeFileSync(path.join(dir, '_summary.json'), JSON.stringify(summary, null, 1));
  log('backup written to', dir, '—', Object.keys(summary.tables).length, 'tables,', Math.round(summary.bytes / 1024), 'KB,', failed, 'failed');

  // keep the newest 30 and the first of each month
  const all = fs.readdirSync(DEST, { withFileTypes: true }).filter(d => d.isDirectory() && /^\d{4}-\d\d-\d\d-\d\d-\d\d$/.test(d.name)).map(d => d.name).sort();
  const firstOfMonth = new Set(); const seenMonth = {}; all.forEach(n => { const m = n.slice(0, 7); if (!seenMonth[m]) { seenMonth[m] = 1; firstOfMonth.add(n); } });
  all.slice(0, Math.max(0, all.length - 30)).filter(n => !firstOfMonth.has(n)).forEach(n => { fs.rmSync(path.join(DEST, n), { recursive: true, force: true }); log('removed old backup', n); });
  fs.writeFileSync(path.join(DEST, '_last-run.txt'), `${new Date().toISOString()}  ${failed ? 'FINISHED WITH ' + failed + ' FAILURE(S)' : 'OK'}  ${dir}\n`);
} catch (e) {
  failed++;
  log('BACKUP FAILED:', e.message);
  try { fs.mkdirSync(DEST, { recursive: true }); fs.writeFileSync(path.join(DEST, '_last-run.txt'), `${new Date().toISOString()}  FAILED  ${String(e.message).slice(0, 300)}\n`); } catch {}
} finally { try { fs.unlinkSync(tmp); } catch {} }
function rows_ok(x) { return x; }
process.exit(failed ? 1 : 0);
