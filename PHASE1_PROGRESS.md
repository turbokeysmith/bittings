# Phase 1 — Build Progress (authoritative tracker)

**This file is the source of truth for where the Phase 1 build stands.** Updated as work proceeds.
Branch: `phase1-roles-security` (not merged to `main`). Server = real enforcement; UI mirrors it.

> **2026-06-22 — Phase 1 tail COMPLETE (code-complete; pending the owner's mobile/visual sign-off).**
> Built this session: the **1b/1c operating screens** (fleet management, inventory move/receive/adjust, job status/cancel/reconcile + photo, part-not-on-van flag + guided move), the **payment-function auth** (deployed + tested), and the **receipt cost-strip**. Owner decisions applied: **take payment = all staff**; **YMM stays on the Phase-1 branch**. Security advisors cleared (no ERRORs). Remaining = the human device sweep (batched below) + final docs.

**Guiding principle:** the database (RLS + edge functions) is the enforcement. The client only *mirrors* it
(hide controls a role can't use). A UI gap is cosmetic; a DB gap is a breach. DB enforcement is proven (see §Verification).

**Owner directives baked in:**
- Proceed autonomously; stop only for (a) a genuine owner decision, (b) anything that costs money, (c) final sign-off.
- Sequence: finish **UI-gating rollout (all 6 pages)** → **1b** (fleet + per-location inventory) → **1c** (jobs + status) → **1d** (finish: cost/margin views + remaining gating). *(UI-gating is normally part of 1d but is being finished first at owner's request — noted so the plan can't drift.)*
- Managers get **soft-delete** for customers (hide, recoverable); hard-delete stays owner-only.
- Human-only visual checks are **batched** at the bottom for one final sweep — not surfaced one at a time.

---

## Status legend: ✅ Done · 🔨 In progress · ⬜ Not started · 🚩 Decision/assumption flagged

## Stage 0 — Secure refund/void edge functions  ✅ DONE (deployed, proven)
- ✅ JWT verify + manager/owner gate + expandable CORS on `pay-refund` (v6) / `pay-void` (v4)
- ✅ Reads role from `staff` (no email backdoor)

## Stage 1a — Security foundation  ✅ DONE (live, proven)
- ✅ `staff` table + `current_staff_role()`/`is_*()` helpers + `claim_first_owner()` bootstrap (owner = Samer)
- ✅ Hashed PINs (`set_my_pin`/`verify_pin`)
- ✅ Soft-delete columns (`deleted_at`/`deleted_by`) on customers/inventory/bookings/receipts
- ✅ `audit_log` (append-only) + delete triggers
- ✅ All `using(true)` RLS rewritten to the matrix; no-staff = no access
- ✅ `grant select on staff to service_role` (edge fn role lookup)
- ✅ Full server-verified matrix sweep (manager/front_desk/technician) — all PASS

## UI-gating rollout (destructive-action slice of 1d)  ✅ DONE (code-complete; visual checks batched)
Foundation (shared, all 6 pages):
- ✅ `store.js`: real role from `staff` → `TKS.auth.can(cap)`; capability map (incl. `softDelete`, `editReference`)
- ✅ `store.js`: **honest delete** — cloud adapter restores any row the server refused to delete (no phantom deletes) + fires `tks:access-blocked`
- ✅ `app/access.js`: centered confirm modal (Cancel default, brand-red action) + `applyGates()` ([data-cap] hide/disable via `.tks-cap-hidden` class) + toast; loaded on all 6 pages
Per-page destructive controls (gate + route confirm through the shared modal):
- ✅ index.html — customer **Remove = manager soft-delete** (`softDelete`); delete part (owner `hardDelete`); refund/void (manager+ `refundVoid`)
- ✅ manager **soft-delete** for customers (sets `deleted_at`; mapping syncs as UPDATE; list hides soft-deleted; works for people + shops)
- ✅ scheduler.html — delete booking (owner `hardDelete`, gated at render) + modal
- ✅ bittings.html — loads access.js (modal + honest-delete); no row-delete to gate (receipts immutable; refund/void live in index)
- ✅ lishi.html — vehicle/tool reference-row deletes gated (`editReference` = manager+) + modal
- ✅ programmers.html — device/coverage reference-row deletes gated (`editReference`) + modal
- ✅ setup.html — page gate widened from owner-only → **manager+** (`can('setup')`)

### Full control-by-control gating pass (every role only sees its matrix) ✅
- ✅ **Robust re-gating**: access.js now runs a **MutationObserver** (re-applies gates 50ms after any DOM change) + re-applies on `TKS.onChange` (role-load) + DOMContentLoaded. Gated controls use `data-cap` → hidden via class; nothing slips through on a late/dynamic render.
- ✅ **Legacy `.owner-only`/`.owner-soft` rewired to the real role** (`ownerHard`=manager+ when signed in, `ownerSoft`=manager+) — so a **manager** now correctly sees Dashboard/Closeout/Reports/Setup/Payments, while technician/front_desk don't (signed-out behavior preserved).
- ✅ **Cost-gate rewired to manager+** (`_isOwnerForCosts` → `can('editPricing')`): part cost, margin, part-picker, tax-rate hidden from technician/front_desk; visible to manager/owner. (Plus the `inventory_safe` view already nulls cost in the payload.)
- ✅ **Scheduler manager-elevation** (`requestOwnerAccess`) → `can('setup')` (manager+).
- ✅ Controls gated by `data-cap` (hidden, not just disabled): customer Remove (softDelete) · part Delete (hardDelete) · part **cost field / Save / +-/ move / Add** (inventoryWrite) · Refund/Void (refundVoid) · booking 🗑 (hardDelete) · job **status picker** (jobStatus = owner/mgr/tech, not front_desk) · lishi/programmers reference 🗑 (editReference) · invoice Delete (hardDelete) · Setup page (setup).
- ✅ **Role chip on every page** (access.js injects it; index uses its own badge) — prints the real role.
- ✅ **RESOLVED (owner decision 2026-06-22): "Take payment / New Charge" opened to ALL staff** — manager-only gate removed (index.html `chgGate`); Payments nav now visible to every signed-in staff; `takePayment` cap = all 4 roles. (Also fixed bittings Settings gate to real role so **managers** reach Settings.)
- ✅ Job-status **own-job** UI restriction built (scheduler accountability panel: a tech's status picker is read-only on jobs that aren't theirs); fleet/move/receive/reconciliation screens built (see 1b/1c UI below).
- ⬜ Tiny local confirms still on native `confirm`: lishi "Clear corrections log", setup employee/service deletes (low-stakes, inside manager-gated screens).

## Stage 1b — Fleet + per-location inventory  ✅ DB PROVEN + UI BUILT
- ✅ `vans` table (fleet_no/vin/nickname/plate/status; ≥1 of fleet#/VIN via check constraint); RLS: select=staff, insert/update=manager+, delete=owner
- ✅ `staff.home_van_id` FK → vans (remembered tech↔van; reassignment is a manager update, logged via audit on the move)
- ✅ `inventory_locations` (per-location qty; 'shop' | 'van:<id>'); writes locked to RPCs only; backfilled existing stock to 'shop'
- ✅ RPCs (role-checked, logged): `inv_move` (tech+), `inv_receive` (front_desk+→shop), `inv_adjust` (manager+ write-off)
- ✅ legacy `inventory.qty` kept as synced TOTAL via `fn_sync_inv_total` trigger (verified: total = sum of locations)
- ✅ **Server-verified** (manager/front_desk/technician): move=tech+, receive=fd+, adjust=mgr+, create-van=mgr+ — all PASS
- ✅ **UI BUILT**: **`fleet.html`** (new manager+ page) — van add/edit/status, owner-only delete + home-van assignment per crew; wired as a **Fleet** nav tile. **`index.html` inventory** — each part gets a 📍 **stock-by-location panel** (shop + each van) with role-gated Move (`invMove`)/Receive (`invReceive`)/Adjust (`inventoryWrite`) calling the proven RPCs; data layer `TKS.Fleet`/`TKS.InvOps` in store.js. UI gates mirror the server exactly (verified against `pg_policies`).

## Stage 1c — Jobs + status + assignment + accountability  ✅ DB PROVEN + UI BUILT
- ✅ `bookings` promoted: `status` column (+check), `reconciliation_pending`, `responsible_tech`, `quote_cents`, `cancel_reason`, `cancel_detail`, `completed_at`
- ✅ `job_staff` join (lead/split_partner/assist) + `is_own_job()` helper
- ✅ `job_parts` (used/returned/pending; `is_cut_key`; `proof_path`) — reconciliation tracking
- ✅ Status state machine via `job_set_status` RPC: **manager any · technician own-jobs only · front-desk never**; completing requires all parts reconciled (gate)
- ✅ `job_cancel` RPC: **reason required**; front-desk **scheduled-only**; technician own-jobs; unreconciled → sets `reconciliation_pending` + responsible tech (Phase-2 hold hook)
- ✅ `job_reconcile_part` RPC: returning a **cut key requires photo proof** (no honor-system tap)
- ✅ **Guard trigger** blocks direct status/reconciliation edits — must go through the RPCs (proven: direct UPDATE DENIED)
- ✅ Private `job-proof` Storage bucket + RLS (1d UI uploads the photo)
- ✅ **Server-verified** (manager/front_desk/technician): every cell incl. own-job, front-desk-scheduled-only, recon gate, cut-key proof, guard — all PASS
- ✅ **UI BUILT** (`scheduler.html` job detail, cloud only): a **Job accountability panel** — authoritative RPC status (the familiar picker now routes through `job_set_status`, read-only for a tech on a non-own job), **lead assignment** (manager+), **parts reconciliation** (mark used/returned; a returned **cut key opens the camera** and uploads to `job-proof`), **"part not on the lead's van" auto-flag + one-tap guided move** (`inv_move` shop→van), and **Cancel-with-reason** (reason pick-list → `job_cancel`). `TKS.Jobs` data layer in store.js. **End-to-end server-proven** (see log).

## Stage 1d — Finish: field-level money + remaining gating  ✅ DONE (code-complete)
- ✅ **Cost physically absent** for technician/front_desk — `inventory_safe` view (cost NULL unless manager) + app reads inventory through it (`readTable`). Server-verified: tech cost=NULL, manager cost=real.
- ✅ **Receipt-level margin stripped** for non-managers — `receipts_safe` view nulls per-line `cost`/`unitCost` for technician/front_desk; app reads receipts via the view. Edge functions still read the base table (COGS intact). **Server-verified**: tech=no cost, owner=full. Both cost views recreated `security_invoker` (cleared the `security_definer_view` ERRORs).
- ✅ **Auth checks on pay-record/pay-create-intent/pay-terminal/pay-status** — added `requireStaff` (verified JWT + active-staff) to all four; `created_by` now the verified uid (was an *unverified* decode). **Deployed + smoke-tested** (anon → 401). ⚠️ Behavior change: taking a card/cash payment now requires being **signed in** (PIN-only-no-session can't hit these fns) — flagged for the owner.
- ✅ **New UI screens built** (the big remaining build — see 1b/1c UI above): fleet/van management · inventory move/receive/adjust + guided reassignment move + "part not on van" flag · job status (own-job) · cancel/reschedule reason pick-list · reconciliation + photo capture.
- ⬜ Technician sees own commission only — **deferred to Phase 2** (commission engine; the `reconciliation_pending` hold hook is already in place).
- 🔨 Final docs: PROJECT_HANDOFF ✅ (changelog updated) · STRUCTURE_NOTES 🔨 · turbo_master_task_list / CLAUDE.md as needed.

---

## 📌 WHERE THE BUILD STANDS (for the owner's final review)
**Phase 1 is code-complete.** Stages 0 · 1a · 1b · 1c · 1d are built AND server-proven — every role rule verified with live test users / impersonation. The **operating screens** (fleet, inventory move/receive/adjust, job status/cancel/reconcile + photo, part-not-on-van + guided move) are wired to the proven RPCs with UI gates that mirror the DB. Cost is hidden from non-managers in **both** inventory and receipt payloads. The four payment functions now require authenticated staff (deployed). Destructive-action gating + honest deletes + shared confirm modal + manager soft-delete + YMM dropdowns: done across all pages.
**Remaining:** the owner's **mobile/visual sign-off** (batched below — I can't drive a real phone login) and the last doc touch-ups. Phase 2 (commissions) and the de-iframe rebuild stay future phases.

---

## 🚩 "Looks wrong but expected until a later stage"
- **Cost / margin is still visible to technician & front_desk** (UI and payload) until **1d** builds the role-aware views. Expected.
- **Technicians can't touch inventory at all** right now (writes are manager+ in 1a's interim RLS). Per-location **move** for techs lands in **1b**. Expected.
- **Job status / own-job / front-desk-scheduled-only rules aren't enforced** yet — `bookings` update is `is_staff` interim until **1c** promotes status to a column. Expected.
- **No "restore deleted customer" / permanent-purge UI** yet — managers soft-delete (recoverable); owner-only hard-delete is DB-enforced; a trash/restore + purge screen is a 1d/follow-up. Expected.
- 🚩 **Assumption:** Lishi/Programmer **reference-row deletes** gated to manager+ (shared shop reference; local data). Flagging since the matrix didn't cover reference editing. Techs can still *add/correct* entries.

## ✅ Server-side verification log (the test-user method)
- 1a matrix sweep (manager/front_desk/technician, all cells): PASS
- Hard-delete (customers/bookings/receipts/inventory) for all 3 non-owner roles: DENIED
- Refund/void live JWTs: technician 403, front_desk 403, manager 404(passed), owner passed
- 1b RPCs (move/receive/adjust/fleet) + total trigger: all roles PASS
- 1c jobs (status own-job, front-desk scheduled-only, recon gate, cut-key proof, guard): all roles PASS
- 1d cost view: technician cost=NULL, manager cost=real
- 2026-06-22: **receipt hard-delete by technician = 0 rows** (RLS owner-only holds; the bittings invoice "Delete" was a LOCAL history delete, never touched the DB — receipts count unchanged, no hard_delete audit). Roles confirmed: gmail=technician, samer=owner.
- 2026-06-22 (tail): **1c end-to-end RPC proof** (technician on a real booking, rolled back clean): own-job in_progress PASS · complete-with-pending-part BLOCKED · return-cut-key-without-photo BLOCKED · reconcile-used PASS · complete-after-reconcile PASS · cancel-empty-reason BLOCKED · direct status UPDATE (no RPC) BLOCKED by guard. All 7 = expected.
- 2026-06-22 (tail): **receipts_safe** — technician payload has no per-line `cost`/`unitCost`; owner sees full cost. **inventory_safe** still masks. Both now `security_invoker`.
- 2026-06-22 (tail): **pay-record / pay-create-intent / pay-terminal / pay-status** deployed with `requireStaff`; anon POST → **401** on all four (smoke-tested).
- 2026-06-22 (tail): **security advisors** — the two `security_definer_view` ERRORs cleared; remaining warnings are the intended role-checked RPC API (each self-enforces) + the owner's optional "leaked password protection" auth toggle. `fn_guard_booking_status` EXECUTE revoked (trigger-only).
- 2026-06-22 (tail): UI van/inventory/job gates verified against `pg_policies` (vans insert/update=manager, delete=owner; staff update=owner → home-van assign owner-only; inv RPCs tech+/fd+/mgr+).

## 👁️ Human-only visual checks — BATCHED for final sweep (I can't drive a real login)
Flip the gmail's role in the DB between checks (`update staff set role='…' where user_id='db339cc7-…'`), hard-refresh, and confirm the **role chip** (top-right) reads the role.

**As TECHNICIAN** — should see ONLY: view customers (+Add/edit), view inventory **with no cost** and **no +/− / move / Add / Save / cost field**, references, jobs with a status picker, take-the-quoted-price. Should NOT see: Remove customer, Refund/Void, Delete (part/booking/invoice/reference), Dashboard/Reports/Closeout, Setup, cost/margin anywhere, part-picker in Receipts.
**As FRONT_DESK** — like technician, PLUS no **status picker** on jobs (front desk can't change status). Still no inventory write, no cost, no refund/void, no delete, no dashboard/setup.
**As MANAGER** — should now SEE: Dashboard/Reports/Closeout, Setup, Refund/Void, inventory Add/edit/+−/move/cost, cost/margin, customer **Remove** (soft-delete). Should NOT see: part/booking/**invoice** hard-Delete (owner-only).
**As OWNER** — everything, including hard-Delete; a delete shows the **centered modal** (Cancel default, red action).

**NEW 1b/1c operating screens (cloud — must be signed in):**
- **Fleet** (manager/owner): nav shows **🚐 Fleet**; add a van (fleet # or VIN required), edit it, change status; as **manager** the **Delete van** button and the **Crew & home vans** panel are hidden (owner-only); as **owner** both show and a delete uses the centered modal. Tech/front_desk: no Fleet tile.
- **Inventory stock-by-location** (signed in): tap 📍 on a part → panel shows shop + each van qty. **Technician**: sees **Move** only (no Receive/Adjust). **Front_desk**: sees **Receive** only. **Manager/owner**: Move + Receive + Adjust. Each action updates the totals; a blocked action shows the server's reason.
- **Job accountability** (scheduler → open a job): **Technician** on *their* job can set status + reconcile parts; on someone else's job the status picker is greyed + a "not your job" note. **Front_desk**: status picker hidden. **Manager/owner**: full, plus assign lead. Mark a **cut key returned** → the **camera/file picker** opens and a photo is required. **"⚠ Not on <tech>'s van"** appears on a part not on the lead's van, with **Move 1 → van**. Try to set **Completed** with a pending part → blocked with a message. **Cancel this job** → reason pick-list required.
- **Take payment** (decision 1): as **technician**, the **Payments** tile shows and **New Charge** opens (no "manager-only" wall). A card/cash charge requires being **signed in** (expected).

Cross-cutting:
- **Phantom-delete**: as any blocked role, if a delete slips through → row reappears + toast (server kept it).
- **Soft-delete round-trip**: manager Remove a customer → gone from list; reload → still gone.
- **YMM** dropdowns + VIN autofill on Start-a-Job, Scheduler, Receipts (quick + guided).
- **Role chip** shows the real role on every page; gold for manager/owner.
- **Receipt cost**: as technician, open a saved receipt → no cost/margin anywhere (screen *and* payload); as manager → cost shows.

## 🧰 Git / packaging notes
- All Phase-1 app work (roles/gating + 1b/1c screens + YMM dropdowns) lives on `phase1-roles-security`, **not merged to `main`**. Edge functions + DB migrations are already **live** on the Supabase project (deploys/migrations aren't branch-bound).
- ✅ **RESOLVED (owner decision 2026-06-22): YMM stays on the Phase-1 branch** — ship it all together; no history split.
- New files this session: `bittings-app/fleet.html`, plus the `receipts_safe` view + the `requireStaff` helper. New SQL recorded under `bittings-app/supabase/phase1/`.
