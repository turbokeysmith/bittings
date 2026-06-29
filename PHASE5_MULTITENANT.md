# Phase 5 — True multi-tenancy (per-shop isolation) — tracker

**Goal (from the security audit):** the backend isolated by *role* only, not by *shop* — the blocker
for a multi-shop pilot. Phase 5 makes every business its own **shop**, with all data fenced by
`shop_id` in RLS, while the existing owner/manager/front-desk/tech rules keep working **inside** each
shop. Built on the clone, server-first, proven on a real Postgres.

## Status: ✅ BUILT + DB-PROVEN (pending: you apply the SQL; 5 pilot shops onboard via signup)

### What shipped
- **`supabase/phase5/5a_multitenant.sql`** — the migration:
  - `shops` + `shop_members(shop_id, user_id, role, active)` tenant-root tables.
  - `current_shop()` (the caller's shop, from membership) + `current_staff_role()`/`is_staff()`
    made shop-aware.
  - **`shop_id` added to all 17 shop-owned tables** (customers, inventory, inventory_locations,
    bookings, receipts, vans, staff, job_staff, job_parts, commission_config, services,
    move_requests, payment_transactions, payment_events, audit_log, shop_config, subscriptions),
    backfilled to one shop, defaulted to `current_shop()`, indexed.
  - **One `RESTRICTIVE` policy per table** (`shop_id = current_shop()`) — AND-ed *under* the existing
    PERMISSIVE role policies, so we did NOT rewrite the dozens of role policies; the tenant fence is
    added on top. Reads + writes must satisfy both the role rule and the shop fence.
  - **Existing single-shop data migrated** into one shop ("Turbo Keysmith") — nothing breaks.
  - **`create_shop(name)`** onboarding RPC — a signed-in user with no shop becomes the owner of a
    brand-new isolated shop. A trigger keeps `shop_members` in sync with the app's `staff` roster.
- **Client** (`app/store.js` `TKS.Shop`, `index.html`): `TKS.Shop.ensure()` runs on first signed-in
  boot (each new pilot owner gets their own shop, named from their business identity); saving the
  business name renames the shop. Demo path is untouched.

### Proven at the DB level — `supabase/phase5/isolation_test.js`
Spins up a **real Postgres** (embedded-postgres), builds the exact pattern (shops + members +
`current_shop()` + role funcs + restrictive fence), seeds **2 shops with their own users + data**,
and runs the cross-tenant sweep. **Result: 14/14 PASS.** Shop A cannot SELECT / UPDATE / DELETE /
INSERT into Shop B's data; sees only its own shop + members; and the **role rules still hold within
a shop** (tech reads but can't write inventory; owner can). Run: `npm i embedded-postgres && node
supabase/phase5/isolation_test.js`.

### YOU need to (exact steps in the report): apply `phase5/5a_multitenant.sql` in the Supabase SQL
editor (after phase1–4), then create your 5 pilot owners — each signs up → `create_shop` → isolated space.

### Follow-up (tracked, not in this migration)
- **Edge functions run as `service_role` (bypass RLS)** — the payment functions must stamp `shop_id`
  and only act within the receipt's shop. Do as a deliberate next step so the live charge path isn't
  changed here. (Same note in `SECURITY_AUDIT_PHASE4.md`.)
- Storage paths / realtime filters per shop; cross-tenant tests against the live DB with 2 real auth users.
