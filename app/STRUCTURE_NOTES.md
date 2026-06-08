# Turbo Keysmith — App structure build (front-end only)

Branch: **`app-structure`** (off `public-website`). Nothing published. No cloud spend, no
credentials wired. All data is **localStorage today**; every read/write goes through one
data layer (`app/store.js`, `window.TKS`) with a single **CLOUD SWAP POINT**.

## Preview (local, still running)
- **Staff app** (dark): http://127.0.0.1:8088/  → Customers · Receipts · Scheduler · Payments · Inventory
- **Public site** (light): http://127.0.0.1:8099/  → contact form `/contact/`, language toggle 🌐 in the header

## Built so far
1. **Shared data layer** `app/store.js` — Customers / Inventory / Bookings over the existing
   `tks_*` keys, so the customer list is shared across every tile.
2. **Inventory tile** — list, add/edit/delete, qty +/- steppers, **low-stock flag**, search,
   summary chips, **supplier + reorder-qty** fields (low rows show a reorder hint).
3. **Contact form** (`site/contact/`) — saves a lead to the shared Customers list; fully bilingual.
4. **Scheduler day view** — hour grid from `tks_bookings`, tap an open slot to book; Google
   Calendar shown as a **NOT CONNECTED** placeholder.
5. **Connected tiles** — shared customer list + "‹ Apps" back links.
6. **Supabase CloudAdapter (READY, OFF)** — `app/store.js`. Cache-backed, same API as local;
   per-table mappers. Dormant until `TKS.connectCloud({url, anonKey})`.
7. **SQL** — `supabase/customers_setup.sql` (exists) + **`supabase/app_tables_setup.sql`**
   (inventory incl. supplier/reorder_qty, bookings, receipts) with RLS, policies, grants, triggers.
8. **Spanish toggle** — `site/assets/i18n.js`; chrome translated site-wide, homepage hero +
   contact form fully translated.
9. **Payments tile UI shell** — amount, shared-customer picker, method control, live Charge
   label; charging is a clearly-labeled demo stub.
10. **A11y + mobile pass** — labels associated, keyboard-operable rows, focus-visible outlines,
    16px inputs, ≥40px tap targets, reduced-motion, aria-live messages.

---

## ✅ CLOUD IS NOW WIRED (using your existing project)
The staff app (`index.html`) now loads supabase-js + `app/cloud-config.js` (the SAME project
URL + publishable key already in `cloud-test.html`) and **auto-connects when an employee is
signed in**. Not signed in / offline / table missing → it stays on localStorage. A status pill
in the header shows **☁ Synced** vs **On this device**.

Verified offline against a mock Supabase: insert / update / delete and all field mapping
(name↔customer, reorderQty↔reorder_qty, local-id→adopted-uuid) are correct. I could **not**
run it against the live project from here (no network in my environment) — so please verify:

### To see it sync (your 2 steps)
1. **Run the SQL** in Supabase → SQL Editor: `supabase/app_tables_setup.sql`
   (creates `inventory`, `bookings`, `receipts`; the `customers` table already exists).
2. **Sign in** via the Staff Login (`cloud-test.html`), then open the app. The pill should
   read **☁ Synced**. Add a part in Inventory / a customer in Customers and confirm the row
   appears in the matching Supabase table.
   - To force everything back to local while testing: set `AUTO_CONNECT: false` in
     `app/cloud-config.js`.

### Heads-up / decisions
- **Scheduler + Receipts still read customers from localStorage.** When you're signed in, the
  shell's Customers + Inventory tiles use the cloud, but `scheduler.html` / `bittings.html`
  don't yet — so their customer lists can diverge from the cloud. They each need the same
  3-line bootstrap + their customer reads routed through `TKS`. **Want me to wire those two as
  well?** (Bigger edit in `bittings.html`; I'd want you to spot-check after.)
- **Public contact form can't write to the cloud yet.** Website visitors aren't signed in, and
  RLS only allows authenticated inserts — so leads still save locally. To land website leads in
  the cloud we need either a public-insert policy or a small Supabase **edge function**
  (recommended). Your call.
- **Migration:** I did NOT auto-push your local demo data to the cloud (avoids duplicates). If
  you want existing local customers/parts copied up once, say so and I'll add a one-time import.

## ❓ Still need decisions on
- **Google Calendar** — real 2-way sync (needs Google OAuth + a server) or keep the current
  open/add-to-Google-Calendar deep links? (Sync needs a Google Cloud project + consent screen.)
- **Payments** — processor (Stripe / Square / other) and whether to fold payments into this app
  (needs server-side keys) or open the existing separate payment app (send its URL).
- **Spanish coverage** — chrome + homepage + contact are translated now. Want the full city/
  service page bodies translated too? (That's content work — I can do it page by page.)
- **Email/SMS on new leads** — where should contact-form submissions notify you?

---

## File map (this workstream)
- `app/store.js` — data layer + CloudAdapter (source of truth)
- `site/app/store.js` — public-site copy (kept in sync)
- `supabase/app_tables_setup.sql` — inventory/bookings/receipts schema
- `site/assets/i18n.js` — language toggle
- `index.html` — staff shell (Inventory + Payments live here)
- `scheduler.html` — day view added
- `site/contact/index.html` — contact form
