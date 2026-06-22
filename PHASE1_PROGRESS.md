# Phase 1 — Build Progress (authoritative tracker)

**This file is the source of truth for where the Phase 1 build stands.** Updated as work proceeds.
Branch: `phase1-roles-security` (not merged to `main`). Server = real enforcement; UI mirrors it.

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
- 🚩 **Owner decision flagged:** "Take payment / New Charge" is currently **manager-only** in the app, but the matrix says **all staff** take payment. Left as-is (more restrictive); your call whether technicians should take card payments.
- ⬜ Job-status **own-job** UI restriction (a tech sees status only on *their* jobs) + the fleet/move/receive/reconciliation screens are part of the **1b/1c UI** (not built yet → nothing rendering to gate); the DB already enforces own-job/front-desk-scheduled-only.
- ⬜ Tiny local confirms still on native `confirm`: lishi "Clear corrections log", setup employee/service deletes (low-stakes, inside manager-gated screens).

## Stage 1b — Fleet + per-location inventory  🔨 DB DONE & PROVEN (UI pending in 1d)
- ✅ `vans` table (fleet_no/vin/nickname/plate/status; ≥1 of fleet#/VIN via check constraint); RLS: select=staff, insert/update=manager+, delete=owner
- ✅ `staff.home_van_id` FK → vans (remembered tech↔van; reassignment is a manager update, logged via audit on the move)
- ✅ `inventory_locations` (per-location qty; 'shop' | 'van:<id>'); writes locked to RPCs only; backfilled existing stock to 'shop'
- ✅ RPCs (role-checked, logged): `inv_move` (tech+), `inv_receive` (front_desk+→shop), `inv_adjust` (manager+ write-off)
- ✅ legacy `inventory.qty` kept as synced TOTAL via `fn_sync_inv_total` trigger (verified: total = sum of locations)
- ✅ **Server-verified** (manager/front_desk/technician): move=tech+, receive=fd+, adjust=mgr+, create-van=mgr+ — all PASS
- ⬜ **UI** (in 1d): van picker, home-van auto-select, move/receive/adjust screens, guided reassignment move, auto-flag "part not on van"

## Stage 1c — Jobs + status + assignment + accountability  🔨 DB DONE & PROVEN (UI pending in 1d)
- ✅ `bookings` promoted: `status` column (+check), `reconciliation_pending`, `responsible_tech`, `quote_cents`, `cancel_reason`, `cancel_detail`, `completed_at`
- ✅ `job_staff` join (lead/split_partner/assist) + `is_own_job()` helper
- ✅ `job_parts` (used/returned/pending; `is_cut_key`; `proof_path`) — reconciliation tracking
- ✅ Status state machine via `job_set_status` RPC: **manager any · technician own-jobs only · front-desk never**; completing requires all parts reconciled (gate)
- ✅ `job_cancel` RPC: **reason required**; front-desk **scheduled-only**; technician own-jobs; unreconciled → sets `reconciliation_pending` + responsible tech (Phase-2 hold hook)
- ✅ `job_reconcile_part` RPC: returning a **cut key requires photo proof** (no honor-system tap)
- ✅ **Guard trigger** blocks direct status/reconciliation edits — must go through the RPCs (proven: direct UPDATE DENIED)
- ✅ Private `job-proof` Storage bucket + RLS (1d UI uploads the photo)
- ✅ **Server-verified** (manager/front_desk/technician): every cell incl. own-job, front-desk-scheduled-only, recon gate, cut-key proof, guard — all PASS
- ⬜ **UI** (in 1d): status controls on jobs (own-job), cancel/reschedule with reason pick-list, reconciliation flow + photo capture, on-hold/reopen

## Stage 1d — Finish: field-level money + remaining gating  🔨 PARTIAL
- ✅ **Cost physically absent** for technician/front_desk — `inventory_safe` view (cost NULL unless manager) + app reads inventory through it (`readTable`). Server-verified: tech cost=NULL, manager cost=real.
- ⬜ Receipt-level margin/profit payload-stripping for non-managers (jsonb has nested per-line costs — needs a jsonb transform or split columns). App already hides cost on screen via `_isOwnerForCosts()`; payload-strip is the remaining bit.
- ⬜ Technician sees own commission only (placeholder until Phase 2)
- ⬜ Auth checks on pay-record/pay-create-intent/pay-terminal/pay-status (authenticated) — 4 LIVE payment fns; warrants its own careful pass (lower-risk: they don't move money out; gateway verify_jwt already on)
- ⬜ **New UI screens** (the big remaining build; needs human visual verification): fleet/van management · inventory move/receive/adjust + guided reassignment move + "part not on van" flag · job status controls (own-job) · cancel/reschedule reason pick-list · reconciliation flow + photo capture
- ⬜ Final docs: PROJECT_HANDOFF / turbo_master_task_list / CLAUDE.md / Supabase setup docs

---

## 📌 WHERE THE BUILD STANDS (for the owner's final review)
**Complete & server-proven (DB / security layer):** Stage 0, 1a, 1b, 1c — every role rule verified with live test users. Cost-hiding view done. Destructive-action **UI gating + honest deletes + shared confirm modal + manager soft-delete** done across all 6 pages. YMM dropdowns done.
**Remaining (mostly UI + one small server item):** the new fleet/inventory-move/job-status/reconciliation **screens**, pay-* fn auth, receipt-margin payload strip, final docs. These are built on top of the proven server foundation — the rules are already enforced by the database; the remaining work surfaces them in the interface.

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
- *(each later stage appends its own server-verified results here)*

## 👁️ Human-only visual checks — BATCHED for final sweep (I can't drive a real login)
Flip the gmail's role in the DB between checks (`update staff set role='…' where user_id='db339cc7-…'`), hard-refresh, and confirm the **role chip** (top-right) reads the role.

**As TECHNICIAN** — should see ONLY: view customers (+Add/edit), view inventory **with no cost** and **no +/− / move / Add / Save / cost field**, references, jobs with a status picker, take-the-quoted-price. Should NOT see: Remove customer, Refund/Void, Delete (part/booking/invoice/reference), Dashboard/Reports/Closeout, Setup, cost/margin anywhere, part-picker in Receipts.
**As FRONT_DESK** — like technician, PLUS no **status picker** on jobs (front desk can't change status). Still no inventory write, no cost, no refund/void, no delete, no dashboard/setup.
**As MANAGER** — should now SEE: Dashboard/Reports/Closeout, Setup, Refund/Void, inventory Add/edit/+−/move/cost, cost/margin, customer **Remove** (soft-delete). Should NOT see: part/booking/**invoice** hard-Delete (owner-only).
**As OWNER** — everything, including hard-Delete; a delete shows the **centered modal** (Cancel default, red action).

Cross-cutting:
- **Phantom-delete**: as any blocked role, if a delete slips through → row reappears + toast (server kept it).
- **Soft-delete round-trip**: manager Remove a customer → gone from list; reload → still gone.
- **YMM** dropdowns + VIN autofill on Start-a-Job, Scheduler, Receipts (quick + guided).
- **Role chip** shows the real role on every page; gold for manager/owner.

## 🧰 Git / packaging notes
- All Phase-1 app work (UI-gating + YMM dropdowns) is intermingled in the same files on `phase1-roles-security` (uncommitted client work being committed as WIP to preserve it).
- 🚩 **Owner decision at final review:** how to split git history — the YMM dropdown work was originally to live on its **own branch off main**; it's now intertwined with the Phase-1 UI layer. Options at packaging: (a) keep all on the Phase-1 branch, or (b) I cherry-pick the YMM commits onto a separate branch. Deferred to final sign-off (not blocking the build).
