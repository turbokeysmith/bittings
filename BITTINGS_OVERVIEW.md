# Bittings — What the app does right now (plain-English map)

**For the owner.** This is the bird's-eye view of the whole product in one page, in plain
language. When it feels huge, come here. Status is honest:
**✅ DONE** (built + tested) · **🟡 IN PROGRESS** (partly built / needs a real-device or go-live step) ·
**⬜ NOT STARTED**.

_Last updated: 2026-07-02._

---

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
  which customer. **✅ DONE (the engine) · 🟡 the screens for it are IN PROGRESS.**
- **Reconciliation / cycle count** — a count you can assign to anyone; they tap or type the count per
  item, pick a reason for any discrepancy (from a set list), and a manager applies it. **✅ engine
  DONE · 🟡 screen IN PROGRESS.**
- **Warranty replacement** — a customer's key failed under warranty: the app checks it's still in
  warranty, gives them a new one from your stock (logged as warranty, not a sale), and puts the bad
  one on the supplier-return list. **✅ engine DONE · 🟡 screen IN PROGRESS.**
- **Failed key** — a key that never worked (bench failure): pulled from stock and flagged to send
  back to the supplier. **✅ engine DONE · 🟡 screen IN PROGRESS.**
- **Return-to-supplier tracking** — one list of everything owed back to suppliers (warranty + failed),
  tagged by supplier, tracked needs-return → sent → credit/replacement received. **✅ engine DONE ·
  🟡 screen IN PROGRESS.**
- **Inventory dashboard** — total retail value & cost of your stock, plus counts of warranty
  replacements and failed keys. **✅ engine DONE · 🟡 cards on screen IN PROGRESS.**

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
