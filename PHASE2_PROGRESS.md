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

### 2a UI ✅ (code-complete; pending owner device sign-off)
- ✅ POS **register replaces** the type-in-an-amount New Charge (`index.html` Payments tile): running ticket of line items (part/service/programming), qty ± , line total; auto **subtotal → tax → total**; charge buttons show the live total.
- ✅ **Parts** pull from inventory at **sell price** (new `sellPriceCents`, added to the part editor); **Services** from the price list; each line tagged part/service/programming.
- ✅ **Role-aware:** any signed-in staff builds the ticket + takes payment; **+ Custom line, price override, and Discount are manager-only** (UI gated `editPricing` **and** server-enforced in `pos_checkout`). Ties to the customer (required for card/check). Location (shop/van) + technician (commission) selectors.
- ✅ Charge flow: `pos_checkout` (server-priced) → `TKPay.openForReceipt`/`recordCashCheck` with **`skipUpsert`** (so the server receipt can't be overwritten) → `pos_decrement_stock`. `pay.js` got the `skipUpsert` option.
- ✅ **Manager services editor** (the `services` price list) — add/delete with category + price, opened from the register.

### 2a verification (server-side, test users)
- ⬜ Tech checkout at catalog prices → OK; tech checkout with a discount/price-override → REJECTED; manager → OK.
- ⬜ Catalog prices are server-authoritative (client-sent price ignored for catalog lines).
- ⬜ Stock decrements from the correct location on completion; tax + total auto-calculate.

---

## STAGE 2b — Configurable commission engine  🔨 DB DONE & PROVEN (UI next)
- ✅ `commission_config` table (pays-on, structure, flat_pct, daily_min_cents, tiers, flat_per_job, exclude_parts, earned_when, hold_unreconciled) — RLS read=staff, write=manager+; owner's model seeded (values blank).
- ✅ `commission_day_rows(from,to,tech)` — server-side per-tech-per-day commission off **paid, tagged** POS sales; **all four structures implemented** (flat_pct · daily_min_pct=max(min,%) · flat_per_job=× distinct sales/day · tiered_pct=bracket-the-base-lands-in × whole). A **technician only sees their own** (server-forced). Held = linked booking `reconciliation_pending`.
- ✅ **Server-verified**: base excludes parts, daily-min wins over %, tech-sees-own-only. Repo: `2b_commission_config_calc.sql`. Data layer `TKS.Commission`.
- ✅ **UI:** **Commission rules editor** (⚙ Rules in the Commission view) — pays-on, structure, %, daily-min, exclude-parts, earned-when, hold-unreconciled (all selectable; owner fills the blank % + daily-min). Manager+ (`data-cap=setup`, server-enforced).

## STAGE 2c — Per-tech commission ledger  ✅ (code-complete; pending owner device sign-off)
- ✅ New **Commission** view (`index.html`, nav for all staff): period selector → per-tech-per-day ledger (commission, commissionable base, "daily min" tag, held amount) + totals. **A technician sees only their own**; manager/owner see all + a **tech filter**. Reads `commission_day_rows` (server-forced own-scope). Holds show as "on hold".

## STAGE 2d — Manager sign-off / reconciliation-approval screen  ✅ (server-proven + UI)
- ✅ `jobs_awaiting_signoff()` + `job_release_hold(job, action, note)` RPCs (manager+ only). The Commission view's **"⚠ Awaiting manager sign-off"** section lists flagged jobs (cancel/reschedule/unreconciled) with the **parts + photo-proof state**; **Confirm unused & release** clears the hold (→ releases the commission hold) or **Keep hold** upholds it; both audit-logged.
- ✅ **Server-verified**: tech can't list or release; owner lists + releases; release clears the reconciliation flag. Repo: `2d_signoff.sql`.

---

## DEFERRED (captured, not building now)
- Phase 3 — serialized inventory + the SKU/barcode-scan part of the POS (scanner hardware).
- Go-live hardware: barcode scanner, thermal printer, cash drawer.
- De-iframe rebuild.

## Server-side verification log
- 2026-06-22 (2a): technician + owner test users — tech catalog checkout server-priced (part/service amounts correct) PASS · tech discount BLOCKED · tech part-price override BLOCKED · tech custom-priced line BLOCKED · manager discount PASS · per-location stock decrement (10→7) PASS · decrement idempotent PASS. Test data self-cleaned (services table left empty by design).
- 2026-06-22 (2b): commission calc — base excludes parts (service-only 8000) PASS · daily-min wins over % (max($50, 10%·$80)=$50) PASS · technician sees only own rows PASS. Config reset, test data cleaned.
- 2026-06-22 (2d): sign-off — technician can't list holds + can't release (BLOCKED) PASS · owner lists the flagged job + releases it · release clears `reconciliation_pending` PASS. Self-created test booking cleaned.
- 2026-06-22 (2b tiered/per-job): tiered bracket (base $80 ≤ $500 → 5% → $4.00) PASS · flat-$-per-job ($25 × 1 sale → $25.00) PASS. Config reset, test data cleaned.

## 📌 WHERE PHASE 2 STANDS
**All four stages are code-complete and server-proven** (POS checkout pricing/discount gating, per-location stock decrement, commission math, sign-off — all verified with the technician + owner test users). Security advisors: no ERRORs. **Remaining: the owner fills in the blanks + a real-device sweep.** Branch `phase2-pos-commission` (not merged to main); DB + the `pay.js` `skipUpsert` change are live.

## ✋ Owner: fill in the blanks (seeded empty by design)
- **Part sell prices** (Inventory → edit a part → "Sell price") and **services + prices** (register → 🧾 Manage services). Without a sell price a part can't be added to a ticket.
- **Commission rules** (Commission → ⚙ Rules): enter the **%** and the **daily minimum $** (the model is pre-selected: service-call + programming, daily-min + %, parts excluded, earned on completion + collection, hold unreconciled).
- **Tax rate** lives in Setup → Sales tax (the register uses it).

## 🚩 Owner decisions to confirm (none blocked the build)
1. **Daily-min interpretation:** implemented as **max(daily-minimum, %×commissionable)** for each day the tech had a sale. Confirm vs. "minimum + % on top" or "minimum every scheduled day regardless of sales."
2. ✅ **Tiered % and flat-$-per-job are now fully built** (2026-06-22) — the Rules editor shows the right fields per structure (incl. a tier-bracket editor), and the calc implements them server-side (tiered: the bracket the day's total lands in sets the % on the whole; per-job: a flat $ per paid sale that day). Verified.
3. **Commission earner** = the **technician tagged on the register ticket** (the seller). True **split-partner** splitting + **assist earns nothing** via `job_staff` is partially honored (only the tagged tech earns); full split math is a follow-up.
4. **Walk-up POS sale "completion"** = the charge itself (collected); job-linked sales also respect the reconciliation hold. Confirm that's the intent.

## 👁️ Human-only visual checks — BATCHED for the final sweep
Sign in, then per role (flip the gmail's staff role + hard-refresh; the role chip confirms):
- **Register (Payments tile):** add a **part** (shows sell price) + a **service**; qty ±; subtotal/tax/total auto-update; pick **location** + **technician**; take **Cash** (anonymous OK) and **Card/Check** (customer required). As **technician**: **+ Custom, Discount, and Manage services are hidden/blocked**; as **manager**: all show and work.
- **Inventory:** edit a part → set **Sell price**; confirm it appears in the register part picker.
- **Commission view:** as **technician** see **only your own** ledger; as **manager** see all + the **tech filter** + **⚙ Rules** + the **Awaiting sign-off** section. Set rules (% + daily-min), take a register sale tagged to a tech, mark it paid, and confirm commission appears.
- **Sign-off:** cancel/reschedule a job (Scheduler) → it appears under **Awaiting manager sign-off** in Commission → **Confirm unused & release** clears it (and any commission hold).
- **Stock:** a register sale of a part **decrements** that part at the chosen location.
