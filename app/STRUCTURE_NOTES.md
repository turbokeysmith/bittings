# Turbo Keysmith — App structure build (front-end only)

Branch: **`app-structure`** (off `public-website`). Nothing published. Commit-as-you-go.
All data is **localStorage today**; every read/write goes through one data layer with a
single, clearly-marked **CLOUD SWAP POINT** so the cloud can be wired later without
touching screen code.

## Preview (local, still running)
- **Staff app** (dark): http://127.0.0.1:8088/  → Customers · Receipts · Scheduler · Payments · Inventory
- **Public site** (light): http://127.0.0.1:8099/  → contact form at `/contact/`

## What was built this pass
1. **Shared data layer** — `app/store.js` (`window.TKS`). One place for Customers,
   Inventory, Bookings. Reuses the existing `tks_*` localStorage keys so the customer
   list is genuinely shared across every tile. Cloud swap = implement `CloudAdapter`,
   flip `ADAPTER`. (Public-site copy at `site/app/store.js`.)
2. **Inventory tile** (in `index.html`) — full UI: parts list, add/edit/delete, qty
   on-hand with +/- steppers, **low-stock flag** (LOW/OUT badges + "low/out" count),
   search, summary chips. Matches the dark app design, mobile-first. ("SOON" removed.)
3. **Contact form** — `site/contact/index.html` (light, matches the public site).
   Fields: name, phone, email, address, **service needed**, notes. On submit saves a
   **lead** to the shared Customers list via `TKS.Customers.addLead` (dedupes by phone).
   Validation + success state. Linked from the homepage contact section + footer.
4. **Scheduler** (`scheduler.html`) — added an in-app **Day view**: date nav, hour-by-hour
   grid built from local `tks_bookings`, tap an open slot to start a booking pre-filled
   with that date/time. The guided new-employee intake flow already existed and is kept.
5. **Connected tiles** — Customers, Receipts (bittings), Scheduler all read/write the
   same `tks_customers`. Added **"‹ Apps"** back-to-shell links in Scheduler + Receipts
   so you can move between tools cleanly.

---

## ⚠️ Stubbed / waiting on a cloud or Google decision (every spot)
| # | Where | What's stubbed | Needs |
|---|-------|----------------|-------|
| 1 | `app/store.js` → `ADAPTER` | All storage is localStorage (per-device, no sync) | Cloud DB + login (Supabase) |
| 2 | Scheduler → Day view "Google Calendar" box | Labeled **NOT CONNECTED**. Only opens Google Calendar / add-event deep-links / `.ics`. No 2-way sync, no credentials. | Google decision (below) |
| 3 | Contact form (`site/contact/`) | Saves lead to localStorage only. **No email/SMS alert**, no server. Shares with staff app **only if same origin**. | Cloud insert + notify |
| 4 | `site/app/store.js` | Duplicate copy of the data layer for the public site | Cloud version centralizes it |
| 5 | **Payments tile** (`index.html` → `view-payments`) | Still a placeholder — points at a separate, not-yet-deployed payment app | Processor + deployed URL / server keys |
| 6 | **Staff login** (`cloud-test.html`) | Supabase login page exists but does **not** gate the app/pages yet | Auth wiring decision |
| 7 | Receipts (`bittings.html`) | Works locally, shares customers; no cloud persistence | Cloud DB |

---

## ❓ Decisions I need from you
- **A. Cloud backend** — Confirm **Supabase** (already referenced in `cloud-test.html`) as the
  DB + auth. Then I'll build `CloudAdapter` for the same `TKS.*` methods. (I'll need the
  project URL + anon key and a go-ahead on tables: customers, inventory, bookings, receipts.)
- **B. Contact form** — Keep it on the **public site (light)** feeding leads to Customers?
  Note: public site and staff app are likely **different origins**, so true sharing needs
  the cloud. Also — where should new leads notify you (email? SMS?)?
- **C. Google Calendar** — Do you want **real 2-way sync** (needs Google OAuth credentials +
  a small server), or is the current **open/add-to-Google-Calendar deep-link** approach
  enough? Sync = I'll need a Google Cloud project + consent screen.
- **D. Payments** — Which processor (Stripe / Square / other), and is the separate payment
  app going to be deployed? Give me its URL to wire the tile, or we fold payments in here
  (needs server-side keys).
- **E. Deploy topology** — Are the public site (`site/`) and staff app (root `index.html`)
  served from the **same domain/origin**? This decides localStorage sharing in the demo and
  how cloud auth is scoped.
- **F. Inventory fields** — Current: name, SKU, qty, low-at, category, unit cost, location,
  notes. Add anything (supplier, reorder qty, barcode)?
- **G. Branch** — Keep building on `app-structure` and merge to `public-website` when you're
  happy, or open a PR?
