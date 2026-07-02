# Bittings — What the app does right now (plain-English map)

**For the owner.** This is the bird's-eye view of the whole product in one page, in plain
language. When it feels huge, come here. Status is honest:
**✅ DONE** (built + tested) · **🟡 IN PROGRESS** (partly built / needs a real-device or go-live step) ·
**⬜ NOT STARTED**.

_Last updated: 2026-07-02 (overnight pre-pilot build — see the block below)._

---

## ⚡ 2026-07-02 overnight: the pre-pilot punch-list got DONE
Everything from `PRE_PILOT_REVIEW.md` that could be done safely was built, verified and pushed
(one commit per item, each revertible). What moved to **✅ DONE**:

- **Multi-shop readiness (the real blockers):**
  - **Each shop has its own Settings + commission rules** (both were physically one-row-only before). ✅
  - **Add a teammate from Settings** — you type name/email/role, the app creates their login with a
    temp password you hand them. No more Supabase dashboard. Owner-only. ✅
  - **Every server function now checks the caller's SHOP, not just their role** (21 functions —
    sign-off lists, NASTF worklist, inventory ops, jobs, POS, units, counts, warranty/returns). Proven
    live: the QA shop can no longer see even one row of your real shop's data through any of them. ✅
  - **Billing + card-reader helpers bound to the caller's shop** (an Upgrade click or reader list can
    never touch another shop's Stripe). ✅
  - **Hardcoded owner-email + PIN `1234` bootstrap removed** — roles come only from the staff table /
    each shop's own Setup. ✅
- **Polish:** Commission = techs see **their own only**, front desk sees none ✅ · nothing clips
  off-screen on a phone (390px) ✅ · all the washed-out tags/badges/buttons now readable in BOTH
  themes ✅ · payment endpoints all behind the origin allow-list ✅ (at go-live: set `ALLOWED_ORIGINS`).
- **New screens (quick wins):** 📦 **Receive units** (starts serialized tracking: supplier/batch/cost
  per unit) ✅ · 📜 **Activity** (owner-only audit trail — who touched what) ✅ · 🖨️ **auto-print
  receipt on sale** (checkbox; a printer problem never blocks a sale) ✅ · **N-parts-missing-cost**
  nudge in Inventory ✅ · **Manage subscription** button (Stripe portal) ✅.
- **Safety net:** the multi-tenant isolation proof grew to **29/29 PASS** and every view renders
  clean in both themes.

Left for you (deliberately): leaked-password protection (paid tier), Spanish publish, thermal logo
test, website-leads-to-app, the de-dup cleanup week, and the real-device sweep. Details + the few
open flags: `PRE_PILOT_REVIEW.md`.

---

## ⏱ 2026-07-02: Shift + machine-lock + time clock (NEW — off until you switch it on)
A time clock that ties "using the shop PC" to "being on the clock":
- **Login = clock in** for the day (username + password). **Clock out** (Lunch / Personal / End of
  day) = clock out **and** log out.
- **Screen locks when you step away** (idle, default 5 min, or a **Lock now** button). A **PIN**
  unlocks you — still clocked in (locking isn't a clock-out). **4-digit = staff, 6-digit =
  manager/owner.** A different PIN **switches the active user** so their work credits to them.
- **Field jobs aren't a clock-out** — travel time is read from your scheduler (En route → On site).
- **Timesheets:** staff see their own; you (and managers) see everyone and can **correct** entries —
  every fix is logged. All private to your shop.
- **It's OFF by default.** Turn it on in **Settings → Time clock & lock** *and* tick "this is a shop
  workstation" on the shop PC. Your techs' **phones never lock or auto-clock**. Nothing about
  running real jobs/sales changes until you opt in. **Status: ✅ built · 🟡 needs your on-device test**
  (idle timing, the PIN pad, switching users on a shared PC — see `PRE_PILOT_REVIEW.md`/report).

## The two products
- **Turbo Keysmith website** — your public marketing site at turbokeysmith.com. **✅ DONE (live).**
- **Bittings** — the private app you and your staff run the business on. Everything below is Bittings.

---

## Who can do what (roles & sign-in)
- **Four roles** — owner, manager, front desk, technician — each sees only what they should.
  Owners/managers see money, cost, and settings; technicians see their own jobs. **✅ DONE.**
- **Multi-shop** — the app is built so many shops can use it, each shop's data completely walled
  off from the others. Proven at the database level. **✅ DONE** (you're the first; pilot shops next).

## Money / payments
- **Register (take a payment)** — card, cash, or check, with the **2% credit-card surcharge**
  (credit only, per Oklahoma law) applied automatically. **✅ DONE (test mode).**
- **Invoices & receipts** — build an invoice, take payment on it, send/print the receipt. **✅ DONE.**
- **Refunds & voids** — full and **partial** refunds (partial now shows correctly), plus cash/check
  voids. **✅ DONE (test mode).**
- **Day closeout + deposit slip + transaction history** — count the drawer, see the day's totals,
  history with graphs. **✅ DONE.**
- **Get paid directly (Stripe Connect)** — each shop connects its own Stripe account and money lands
  in **their** bank; Bittings takes a **1% fee** automatically. **🟡 IN PROGRESS** — the engine is
  built and tested in test mode; the on-screen "Connect" card and the real bank/ID onboarding are a
  phone step for you, and **going live** (real cards) is still ahead.

## Inventory
- **Parts list** — add/edit parts, cost & sell price, low-stock flags, supplier & reorder, search,
  and a "fits which vehicles/VIN" note. **✅ DONE.**
- **Stock by location** — track stock at the shop and on each van; move / receive / adjust, with a
  technician request → manager approve flow for moves. **✅ DONE.**
- **Serialized inventory (every unit tracked individually)** — each key/unit gets its own ID and is
  traceable through its whole life: which supplier & batch it came from, and whether it was sold,
  failed, warranty-returned, sent back, or credited. A sale now records exactly which unit went to
  which customer. **✅ engine DONE · screens BUILT** (serialized stock shows through the normal
  inventory + dashboard; reconcile/warranty/failed/returns screens are in) — pending your phone sweep.
- **Reconciliation / cycle count** — a count you can assign to anyone; they tap or type the count per
  item, pick a reason for any discrepancy (from a set list), and a manager applies it. **✅ engine
  DONE · 🟡 screen IN PROGRESS.**
- **Warranty replacement** — a customer's key failed under warranty: the app checks it's still in
  warranty, gives them a new one from your stock (logged as warranty, not a sale), and puts the bad
  one on the supplier-return list. **✅ engine + screen BUILT** — pending your phone sweep for the live signed-in flow.
- **Failed key** — a key that never worked (bench failure): pulled from stock and flagged to send
  back to the supplier. **✅ engine + screen BUILT** — pending your phone sweep for the live signed-in flow.
- **Return-to-supplier tracking** — one list of everything owed back to suppliers (warranty + failed),
  tagged by supplier, tracked needs-return → sent → credit/replacement received. **✅ engine DONE ·
  🟡 screen IN PROGRESS.**
- **Inventory dashboard** — total retail value & cost of your stock, plus counts of warranty
  replacements and failed keys. **✅ engine + cards BUILT** (top of the Inventory screen) — pending
  your phone sweep.

## Scheduling / dispatch
- **Dispatch board** — a column per technician, day/week/month views, assign & drag jobs, statuses
  (scheduled → en route → on site → in progress → completed/cancelled), VIN decode, navigate link,
  and a warning when a needed part isn't on that tech's van. **✅ DONE** (finger-drag on a phone is on
  your device sweep).
- **Key-consolidation reminder** — if a job is cancelled/rescheduled with keys still out, a banner
  reminds staff to return them to stock. **✅ DONE.**

## The locksmith lookup tools
- **Lishi / keyway reference** — VIN or search → the right Lishi tool / keyway, with a corrections
  log. **✅ DONE.**
- **Key programmer coverage** — from a VIN or make/year, see which of your programmers can add a key /
  do all-keys-lost / do the remote, and how. **✅ DONE.**
- **VIN decode** — paste a VIN, get year/make/model, used across the app. **✅ DONE.**
- **NASTF D1 tracking** — tags NASTF jobs and tracks the D1 filing deadline with a countdown. **✅ DONE.**

## Commission
- **Commission engine** — configurable pay rules, per-tech, with manager sign-off/holds. **✅ DONE
  (engine).**

## Shop-floor hardware
- **Barcode scanner** — scan a part onto the register or into search. **🟡 code is ready; needs the
  physical scanner + a quick test.**
- **Star thermal receipt printer + cash drawer** — **🟡 built with an on-screen preview; needs the
  printer, its helper software, and a real-device test.**
- **Zebra label printer** — print SKU/barcode labels. **🟡 built with a preview; needs the printer +
  test.**

---

## Honest bottom line
The **business core is built and proven**: roles, multi-shop, customers, scheduling, receipts,
payments (test mode), inventory + the new full **traceability engine**, and the lookup tools. The
things still ahead are mostly **finishing screens** (the inventory-traceability UI), **real-device /
go-live steps** (Stripe live, hardware, phone sweep), and the **bigger future projects** in
`ROADMAP_AND_IDEAS.md`.
