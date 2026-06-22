# Phase 2 — Build Progress (authoritative tracker)

**Source of truth for where the Phase 2 build stands.** Branch: `phase2-pos-commission` (off `phase1-roles-security`, not merged to main). DB changes additive/idempotent; Phase-1 work preserved.

**Guiding principle (same as Phase 1):** the database is the enforcement; the UI mirrors it. Respect every existing role rule — **techs/front-desk see sell price only, never cost/margin**; **pricing/discount edits = manager+ (enforced server-side, not just hidden)**; **all staff can take payment**.

**Owner directives baked in:**
- **Run straight through 2a→2d** — don't stop for a per-stage OK. Self-verify server-side as you go; **batch decisions + human-visual checks for the end**. Stop mid-run only for (a) a decision that genuinely can't wait, or (b) anything that costs money.
- Commission is **fill-in-the-blank in Setup, not hardcoded** (Bittings is a product). Build the owner's own config fully wired now; structure the other models selectable-but-stubbed.
- Owner's commission config to seed: **daily-minimum + % on service-call & programming, exclude parts, earned on completion + collection, full-quote hold on unreconciled**.
- Services price list + tax rate: seed **empty/blank** — owner fills during testing.

## Status legend: ✅ Done · 🔨 In progress · ⬜ Not started · 🚩 Decision/assumption flagged

---

## STAGE 2a — POS / Cash-Register ticket screen  🔨 IN PROGRESS
**🚩 Looks wrong but expected until a later sub-stage:**
- The commission tags (`part`/`service`/`programming`) ride on each line but **do nothing visible yet** — 2b reads them.
- Services price list + tax rate are **blank** until the owner fills them (seeded empty by design).
- The per-tech ledger + manager sign-off screen don't exist yet (2c/2d).

### 2a DB foundation ✅ (server-proven)
- ✅ `inventory.sell_price_cents` (customer sell price; cost stays separate + masked). `inventory_safe` exposes sell price to all, cost to managers only.
- ✅ `services` table (name, category service/programming/labor, price_cents, active) — RLS: read = staff, write = manager+. Seeded empty.
- ✅ `pos_checkout(payload)` RPC — re-prices catalog lines **server-side** (techs can't tamper), **gates discount/price-override to manager+**, builds a `receipts` row (with `lineType` tags + COGS) for the existing pay flow, returns the receipt id.
- ✅ `pos_decrement_stock(receipt)` RPC — on completion, decrement each part line from the ticket's location via the 1b inventory ledger (idempotent).
- 📄 Repo: `bittings-app/supabase/phase2/2a_pos_catalog_checkout.sql`

### 2a UI
- ⬜ POS register replaces the type-in-an-amount New Charge: running ticket of line items (part/service/programming), qty, unit price, line total; auto subtotal → tax → total.
- ⬜ Parts pull from inventory (sell price); services from the price list; line tagged part/service/programming.
- ⬜ Role-aware: techs/front-desk build + take payment but **can't edit a price or discount** (manager+); ties to the customer record.
- ⬜ Setup → Services price-list editor (manager+).

### 2a verification (server-side, test users)
- ⬜ Tech checkout at catalog prices → OK; tech checkout with a discount/price-override → REJECTED; manager → OK.
- ⬜ Catalog prices are server-authoritative (client-sent price ignored for catalog lines).
- ⬜ Stock decrements from the correct location on completion; tax + total auto-calculate.

---

## STAGE 2b — Configurable commission engine  ⬜ NOT STARTED
Setup → Commission (fill-in-the-blank): pays-on (whole-job / labor / service-call+programming / pick line-types), structure (flat % / daily-min+% / tiered / flat-per-job), exclude-parts, earned-when (completion+collection vs completion), unreconciled→full-quote hold. Owner's config wired end-to-end; other models selectable-but-stubbed. Commission computes **server-side** off the tagged, collected, completed ticket.

## STAGE 2c — Per-tech commission ledger  ⬜ NOT STARTED
Per-tech ledger (jobs, earned, collected, daily-min met/shortfall, holds), tied to `job_staff` (assist earns nothing). Each tech sees only their own; manager/owner see all (server-enforced). Full-quote hold shows as frozen/pending.

## STAGE 2d — Manager sign-off / reconciliation-approval screen  ⬜ NOT STARTED
Lists jobs flagged from cancel/reschedule/unreconciled; manager confirms equipment unused / cut key returned (1c photo shown) and **releases the hold** (which releases the commission hold) or upholds it; every action audit-logged; manager/owner only.

---

## DEFERRED (captured, not building now)
- Phase 3 — serialized inventory + the SKU/barcode-scan part of the POS (scanner hardware).
- Go-live hardware: barcode scanner, thermal printer, cash drawer.
- De-iframe rebuild.

## Server-side verification log
- 2026-06-22 (2a): technician + owner test users — tech catalog checkout server-priced (part/service amounts correct) PASS · tech discount BLOCKED · tech part-price override BLOCKED · tech custom-priced line BLOCKED · manager discount PASS · per-location stock decrement (10→7) PASS · decrement idempotent PASS. Test data self-cleaned (services table left empty by design).

## 👁️ Human-only visual checks — BATCHED for the final sweep
- *(appends as UI lands)*
