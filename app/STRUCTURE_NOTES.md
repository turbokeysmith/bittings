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

## Update 2026-06-10 — scheduler/forms/VIN/images

**`app/store.js` (data layer) — new API**
- `TKS.Bookings`: `STATUSES`, `get`, `save` (insert/update by id), `setStatus`, `remove`,
  `active()`, `archived()`, `isArchived(b)`, `forCustomer(cust)`. `isArchived` = status
  Completed/Canceled **or** `date < today` (local TZ). Booking shape gained `customerId`,
  `status`, `serviceCategory`/`serviceLabel`, `vehicle.ignition`, `images[]`.
- `TKS.Services`: canonical 5-item catalog (`{value,en,es,cat}`) + `fromJob(jobType,subType)` →
  `{value,cat}` so the scheduler **auto-derives** the service category from the coaching tiles.
- `TKS.decodeVin(vin)`: the only networked helper — NHTSA vPIC
  (`/decodevinvalues/<vin>`), returns `{year,make,model,vin}`. (No VIN API pre-existed in the repo.)
- `Inventory.search` now also matches `fitment` + `vin`. `Customers.upsert` already dedupes by
  phone→name; the scheduler + both contact forms now write through it.
- **Sync note:** `site/app/store.js` is a copy kept in sync for the public forms.

**`scheduler.html`** — now loads `app/store.js` and writes bookings/customers through TKS
(fallback to localStorage if TKS is absent). New `booking` detail view (status picker, Add-to-
Schedule, edit, delete); status color tags via `STATUS_META`; vehicle step requires VIN **or**
Y/M/M + ignition; `decodeVinNow()` auto-fills from the VIN; `googleUrl()` adds
`add=turbokeysmith@gmail.com`. Job-photo slots are gated off (`.job-photos{display:none}` until
`images[]` is non-empty).

**Forced guided flow + owner PIN bypass (2026-06-10).** Booking can ONLY start via the guided flow
(`startFlow`) or the PIN-gated quick form — the Day-view "+ Book" shortcut and `startFlowAt()` were
removed (Day view is view/open-only). `validateStep` now also requires `jobtype`, `subtype`, and the
`upsell` answer (messages via `#stepMsg`/`stepMsgSet`). The owner bypass is a single swap point:
`requestOwnerAccess(onGranted)` (today a PIN screen → `submitOwnerPin` checks
`window.TKS_OWNER.QUICK_FORM_PIN` from `app/cloud-config.js`; later replace its body with an
owner-role check). On success → `startQuickForm` → `renderQuickForm` (a one-screen plain form using
the same `booking` object + `bindInputs()`), saved via the shared `saveBooking` (so customer upsert
+ serviceCategory derivation are identical). It's per-booking: the only entries to the quick form are
through the PIN each time; "New booking" and "Book another" always call `startFlow`.

**`index.html`** — customer form shows read-only **Job history** (`TKS.Bookings.forCustomer`);
customer rows show an **ES badge** when `lang==='es'`; Inventory has a **🔎 VIN** decode→filter and
a **Fits (vehicles/VIN)** field.

**Public contact forms** — EN (`site/contact/`, hand-maintained) and ES (`site/es/contact/`,
**generated** by `_build/generate.mjs → esContact()`). Both use the canonical 5-option dropdown
with **fixed English `value`** (Spanish only changes the displayed text), an "Other (describe)"
free-text box stored as typed, and `addLead(..., {lang:'es'})` on the Spanish side. **Edit the ES
form in the generator, not the output file** (regeneration overwrites it).

**City photos** — `_build/engine.mjs photoSlots(label, photos)` and `generate.mjs esPhotoSlots`
are now conditional: real `<figure class="photo">` gallery when a city has `photos:[...]` in
`_build/cities.mjs`, else a hidden HTML comment (no empty boxes). Images live in
`site/assets/cities/` (`<city>-1.jpg`, `<city>-2.jpg`); only the 4 original cities have them.
Regenerate with `node _build/generate.mjs`.

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
