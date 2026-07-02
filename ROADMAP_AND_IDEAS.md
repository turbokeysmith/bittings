# Bittings — Roadmap & Ideas (the parking lot)

**For the owner.** A running list so nothing gets lost and current work doesn't get derailed. Three
buckets: **Now** (actively building / next up), **Planned** (agreed, not started yet), and **Ideas**
(captured, not committed — drop spur-of-the-moment thoughts here anytime). Plain English, honest.

_Last updated: 2026-07-02._

---

## 🔨 Now — actively building / next up
- **Inventory traceability — screens BUILT, pending your phone sweep.** Engine + screens are both in:
  serialized units, the reconcile/cycle-count screen (tap/type −(X)+, assign, reason dropdown,
  summary), 🛡️ warranty + ⚠️ failed buttons on inventory, the returns list, and the dashboard cards.
  They boot clean (light + dark); the **live signed-in flow is your phone sweep** to confirm.
- **Payments go-live rehearsal.** Test-card run-through is done; still ahead: connect real Stripe
  accounts, one real charge, retire the old TurboStripe desktop app + rotate its key.
- **Stripe Connect finish** — the on-screen "Connect your Stripe account" card render + real bank/ID
  onboarding on a phone (engine already works).

## 📋 Planned — agreed, scheduled, not started
- **Serialized inventory rollout** — engine done; roll it out item-by-item as stock is received.
- **Warranty / failure / return tracking** — engine done; lives on the screens above once built.
- **Per-key vehicle fitment** — build on the "fits which vehicles/VIN" idea so each key/unit can carry
  its exact vehicle fit. (The serialized-inventory structure was deliberately built to accept this
  later with no rework.)
- **MicroBiz / multi-app inventory import** — bring existing inventory in from MicroBiz (and/or other
  apps) so you don't re-enter it by hand.
- **Native app + offline-first sync** — a real installed app that keeps working with no signal and
  syncs when it's back (big project; changes how the app is delivered).
- **Live technician map** — see where techs are in real time (rides on the native app).
- **QuickBooks / accounting export** — hand your sales/tax/deposit data to QuickBooks or an accountant
  cleanly.
- **Hardware physical enablement** — plug in and test the barcode scanner, Star receipt printer + cash
  drawer, and Zebra label printer (code is ready; needs the devices + vendor software).
- **5-shop pilot** — onboard the first outside shops onto the multi-shop backend.
- **Spanish site publish** — proofread the `/es/` pages, publish, and point the language toggle at them.

## 💡 Ideas — captured, not committed
- **Progression-chart / key-code engine** — generate cut/progression charts from key codes.
- **Auto-print receipt on sale** (today it's a manual print button).
- **Website leads → cloud + owner alert** — public contact-form leads flow straight into Customers
  with a text/email ping.
- **Google Calendar two-way sync** (today it's a one-way "add to calendar" link).
- **Attach a part's real cost to each sale** so Cost/Profit/commission always show true numbers.
- _(Drop new ideas here anytime — they're safe here without pulling focus off current work.)_

---

_How to use this: when an idea strikes, tell me "add to the parking lot" and I'll drop it in **Ideas**.
When we decide to actually do one, it moves to **Planned**, then **Now** when we start. I keep this and
`BITTINGS_OVERVIEW.md` current as things move._
