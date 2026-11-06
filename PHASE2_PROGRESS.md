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
- ✅ **Role-aware:** any signed-in staff builds the ticket + takes payment; **+ Custom line, price override, and Discount are manager-only** (UI gated `editPricing` **and** server-enforced in `pos_checkout`). Ties to the customer (required for card/check).
- ✅ **Refined (2026-06-23, owner testing):** Register is the **desktop hero** (top of nav, opens first on desktop) and is **desktop-only** (`pos-desktop-only`); **Start-a-job is the mobile-only** payment path (`pos-mobile-only`, phone default). **Automotive vs Residential/Commercial toggle** sources the service list per job type; **Automotive captures VIN + Year/Make/Model** (auto-decode) and `pos_checkout` now **stores the vehicle on the receipt** (`data.vehicle` + `vehYear/vehMake/vehModel/vin`). **Removed the "Sell stock from" + "Technician/sales-rep" pickers** — always **Shop** stock, always the **logged-in user** as the seller; the **mobile Start-a-job/Quick-Invoice** likewise drops its editable Technician box (always the logged-in user). Line items render as a **white spreadsheet (black text)**, theme-independent. **Unpriced** catalog items can be priced by **anyone**; **changing a set price stays manager-only** (server-enforced).
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

## STAGE 2e — NASTF consolidation + D1 filing-deadline tracking  ✅ (server-proven + UI; pending device sign-off)
Owner tweak (2026-06-23): one read-only **Receipts** destination with **[All | NASTF]** tabs; a single **NASTF tag** captured on **both** hero surfaces (desktop register + mobile Start-a-Job) that starts a **D1 filing countdown**.
- ✅ **DB (`2e_nastf_d1_tracking.sql`, live):**
  - `pos_checkout` now stamps the NASTF tag + D1 deadline on the register receipt — `data.nastf = {type, d1Days, d1DueDate, d1Filed:false}`; the window comes from `shop_config.data.nastf.d1Days` (**default 5**, manager-set in Setup).
  - `set_d1_filed(receipt, filed)` — **job-scoped, server-enforced**: a manager/owner, the staff in `job_staff` for the receipt's bookingId, **or** the seller (`technicianId`) on a walk-up POS sale can file. Nobody else. Audit-logged.
  - `can_file_d1(receipt)` (UI mirror) + `nastf_worklist(include_filed)` — the shared outstanding-D1 worklist, **urgency-sorted** (unfiled first, soonest-due first) with a per-row `can_file`.
- ✅ **Shared badge** (`app/d1.js` · `TKS_D1`): color-degrading D1 pill — **≥4d green · 3 yellow · 2 orange · 1 red · 0/overdue dark-red (pulsing)**; clears to "D1 filed ✓". Used identically on the register, Start-a-Job, and the NASTF tab.
- ✅ **Register (desktop):** NASTF tag selector (No / Customer D1 / Auction-Fleet / Contracting) inside the Automotive vehicle panel; live D1 badge preview; sent to `pos_checkout`.
- ✅ **Start-a-Job (mobile / bittings builder):** a saved NASTF receipt gets the D1 deadline stamped in `finish()` (preserves an existing deadline/filed status on re-save). The Quick-Invoice already captured the NASTF type.
- ✅ **Receipts = read-only history-first** (`bittings.html?receipts=1`): the "Receipts" nav (sidebar + phone bottom-nav) opens a **view/search/reprint-only** surface — **no create/charge/edit** (the builder + chat are suppressed; charging stays on the register + Start-a-Job). **[All]** = searchable history (number/customer/vehicle/VIN) with NASTF pills; **[NASTF]** = the worklist with D1 badges + the **"D1 filed ✓"** checkbox (enabled only when the server says `can_file`). Start-a-Job still opens the builder (no param).
- ✅ **Setup:** "NASTF D1 filing window (days)" field (manager) → `shop_config.data.nastf.d1Days`.
- ✅ **"Other" (unlisted) items on the register:** the Part + Service pickers have an **➕ Other** row → a themed entry (name + price + taxable). Sent as a **custom line**; `pos_checkout` was relaxed so **any staff** may add a custom-priced line (setting a price for an unlisted item — discounts + changing a *set* catalog price stay manager-only; verified tech-adds-Other PASS). An **Other service** then **offers to save to Setup → Services** (catalog group follows the Automotive/Residential tab; commission line-type inferred from the name) with a **"Don't ask again"** checkbox → `cfg.prefs.offerSaveOtherService` (cloud-synced).
- ✅ **Themed pop-up sweep:** register price/discount/custom/clear, manager-PIN, mark-paid, commission hold-release, and service-delete moved off native `prompt`/`confirm` to **centered, theme-matched** modals (`uiPrompt`/`uiConfirm`/`uiAlert`, built on `.chg-modal`). All custom overlays verified centered + themed (the `--surface-*/--text-*` vars resolve to the same colors as `--card/--ink` via `bittings-ui.css`). A few rare error `alert()`s remain native.
- ✅ **In-app invoice viewer** (read-only Receipts): **tap any row** (All or NASTF) → the invoice opens in a **modal viewer** (`#roViewer`) that renders the **existing PDF engine** (`makePDF(r,'en',false,true)` → blob → `<iframe>`) **inline — no auto-download**. Viewer has **🖨 Print** + **⬇ Download** + **✕ Close** (Esc/backdrop close). Works desktop + Android Chrome inline; the always-visible Download covers any browser that can't render inline (older iOS Safari). **Read-only** (no edit/charge). **Role-safe:** the PDF carries **sell prices only — never cost/margin** — so every role sees the same cost-free invoice (verified by reading `makePDF`: items show `it.amount`, totals are sell-side; cost never rendered).
- 📄 Repo: `bittings-app/supabase/phase2/2e_nastf_d1_tracking.sql` · `bittings-app/app/d1.js`.

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
- 2026-06-23 (register Other + popups): tech adds an Other custom service ($65, lineType=service) + Other part (lineType=part) PASS (pos_checkout custom-line gate relaxed; discounts/set-price-change still manager-only). Save-to-services writes `cfg.services` with cat = automotive/residential per tab. Native prompt/confirm on the register + adjacent flows replaced with themed centered modals; syntax-checked (0 interactive native dialogs left in index.html).
- 2026-06-23 (2e NASTF/D1): stamp `data.nastf={type,d1Days,d1DueDate,d1Filed}` on the register receipt (config-driven window: Setup d1Days=3 → due today+3 PASS) · `set_d1_filed` job-scoped — manager PASS · seller (technicianId) PASS · non-assigned tech BLOCKED PASS · `nastf_worklist` urgency-sorted (unfiled→soonest-due) with correct per-row `can_file` PASS. Security advisors: no new ERRORs (new RPCs are the standard staff-callable self-enforcing pattern). Test data self-cleaned.
- 2026-06-23 (2a register refinements): `pos_checkout` updated to persist the automotive vehicle (`data.vehicle` + `vehYear/vehMake/vehModel/vin`) — applied via `phase2_2a_pos_checkout_vehicle`. UI: Register desktop-only hero + Automotive/Res-Com toggle + VIN/YMM capture; "Sell stock from" + technician pickers removed (Shop + logged-in user); white-spreadsheet line items. Mobile Start-a-job Quick-Invoice technician box removed (always logged-in user). Syntax-checked index.html + bittings.html (OK). **Pending real-device sign-off** (vehicle persists on a real automotive sale; YMM selects visible/usable on the desktop register).

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
- **NASTF / D1:** on the **register** (Automotive) pick a NASTF type → a green D1 badge appears → charge it. Open **Receipts → NASTF**: the job is listed with its D1 countdown; **tick "D1 filed ✓"** as the staff who did it (or a manager) — it clears; as someone who **wasn't** on the job the checkbox is **disabled/blocked**. Confirm the **All** tab is **view/search/reprint only** (no New/charge/edit). On a **phone**, tag NASTF in **Start-a-Job** and confirm the same badge + worklist. In **Setup → Payments**, change **D1 filing window (days)** and confirm a new NASTF job uses it.
