# Bittings database backup

**Why:** the Supabase project (`gcshuhlksjznksspbigl`, "bittings") has **no backups** on its current plan
(checked 2026-11-12: `supabase backups list` → none; point-in-time recovery off). This is the only copy of the shop's
data outside the cloud until the plan is upgraded (Supabase Pro includes daily backups — recommended).

## What runs

- Script: `bittings-unified/tools/backup/backup-db.mjs`
- When: every night at 2:30 AM by the Windows scheduled task **"Bittings database backup"** on the office PC
  (if the PC was off at 2:30 it runs when the PC next starts). The PC must be on and the user signed in.
- Where: `D:\Work\Backups\db\<date-time>\` — one `.json` file per table, plus the database's functions, columns,
  row rules, indexes and triggers as text, and `_summary.json` (row counts).
- Kept: the newest 30 backups and the first backup of each month.
- Did it run? `D:\Work\Backups\db\_last-run.txt` (one line: time, OK / FAILED, folder) and `_task.log`.

Run it by hand: `node bittings-unified/tools/backup/backup-db.mjs` (from the repo root).

## What is NOT in it

- Part photos (Supabase Storage).
- Passwords (never readable). `_auth_users.json` has the sign-in e-mails and ids only.
- It is on the same PC as everything else. Copy `D:\Work\Backups` to another drive or cloud folder now and then.
- It contains customer details and hashed PINs — treat the folder as private.

## Restoring

There is no one-button restore; it is done table by table, by someone who knows SQL, because it depends on what was lost.

1. Pick the backup folder. `_summary.json` shows how many rows each table had.
2. One table, e.g. `receipts`, into a database that already has the schema (the SQL in `bittings-unified/supabase/`,
   or `_functions.sql` / `_columns.txt` / `_policies.sql` from the backup as the reference):

   ```sql
   -- paste the file's contents in place of <JSON>
   insert into public.receipts
   select * from jsonb_populate_recordset(null::public.receipts, '<JSON>'::jsonb)
   on conflict (id) do nothing;      -- or "do update set …" to overwrite
   ```

3. Order matters when everything is restored: `shops`, `shop_members`, `staff`, `shop_config` first; then `customers`,
   `inventory`, `inventory_locations`, `inventory_units`; then `bookings`, `receipts`, `payment_transactions` and the rest.
4. Row rules use the signed-in user's id. After a full restore into a NEW project the people must exist in
   Authentication with the same ids (`_auth_users.json`), or `staff` / `shop_members` must be re-pointed.
