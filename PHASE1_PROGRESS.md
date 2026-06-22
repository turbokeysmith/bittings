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
- ⬜ **Minor remaining local confirms** (low-stakes, local data, inside already-gated screens): lishi "Clear corrections log" + dup-save warn; setup employee/service/quick-link row deletes (currently no confirm). Convert to the shared modal in a quick pass.

## Stage 1b — Fleet + per-location inventory  ⬜ NOT STARTED
- ⬜ `vans` table (fleet_no/vin/nickname/plate/status; ≥1 of fleet#/VIN)
- ⬜ `staff.home_van_id` (remembered tech↔van) + reassignment (logged)
- ⬜ `inventory_locations` (per-location qty; stock stays with the van)
- ⬜ move (tech+) / receive (front_desk+) / adjust (manager+) + RLS
- ⬜ guided reassignment move; auto-flag part-not-on-van
- ⬜ refine inventory RLS to per-location move/receive

## Stage 1c — Jobs + status + assignment + accountability  ⬜ NOT STARTED
- ⬜ Promote `bookings` jsonb → columns (status, assignment, reconciliation_pending, cancel reason)
- ⬜ Status state machine (scheduled→…→completed + on_hold/canceled); own-job rules; front-desk scheduled-only
- ⬜ `job_staff` join (lead/split_partner/assist)
- ⬜ Reconciliation gates (photo proof in private Storage bucket attached to the job; reason notes; post-cut key return)
- ⬜ `reconciliation_pending` + responsible tech + amount hooks for Phase 2

## Stage 1d — Finish: field-level money + remaining gating  ⬜ NOT STARTED
- ⬜ Role-aware views/RPCs so cost/margin is physically absent from technician/front_desk payloads
- ⬜ Technician sees own commission only (placeholder until Phase 2)
- ⬜ Remaining UI gating (status controls, pricing, setup, etc.)
- ⬜ Auth checks on pay-record/pay-create-intent/pay-terminal/pay-status (authenticated)
- ⬜ Final docs: PROJECT_HANDOFF / turbo_master_task_list / CLAUDE.md / Supabase docs

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
- *(each later stage appends its own server-verified results here)*

## 👁️ Human-only visual checks — BATCHED for final sweep (don't action one at a time)
1. **Technician** (`turbokeysmith@gmail.com` / `TurboTech1!`): on every page, confirm these are **not visible** — customer Remove, part Delete, Refund/Void, scheduler booking 🗑, lishi/programmers reference 🗑; and Setup says "Managers only".
2. **Manager** (temporarily set the gmail to manager, or use a manager test login): confirm customer **Remove** IS visible (soft-delete) but part Delete / booking 🗑 (hard) are **not**; Setup IS accessible; Refund/Void IS visible.
3. **Owner** (`samer@…`): confirm a delete shows the **centered modal** (Cancel highlighted/default, red action), not a top banner — on customer, part, booking, refund/void, reference rows.
4. **Phantom-delete**: as a non-permitted role, trigger any delete that slips through → row should **reappear with a toast**, not vanish.
5. **Soft-delete round-trip**: as manager, Remove a customer → it disappears from the list; reload → still gone (synced); (owner restore UI is a later follow-up).
6. YMM dropdowns + VIN autofill behave on Start-a-Job, Scheduler, Receipts (quick + guided).
7. *(more added per stage)*

## 🧰 Git / packaging notes
- All Phase-1 app work (UI-gating + YMM dropdowns) is intermingled in the same files on `phase1-roles-security` (uncommitted client work being committed as WIP to preserve it).
- 🚩 **Owner decision at final review:** how to split git history — the YMM dropdown work was originally to live on its **own branch off main**; it's now intertwined with the Phase-1 UI layer. Options at packaging: (a) keep all on the Phase-1 branch, or (b) I cherry-pick the YMM commits onto a separate branch. Deferred to final sign-off (not blocking the build).
