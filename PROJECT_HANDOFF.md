# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-06-10 17:11 CDT &nbsp;·&nbsp; see the **Changelog** (section 11) for the
timeline of what was done and when.

**Purpose of this file:** a single, self-contained briefing so another assistant (e.g. Claude
Desktop) can understand everything that has been built and changed, and advise the owner without
needing the raw code. Upload **just this file**.

> Plain-language note for the owner: this describes a locksmith business's **website** and a
> small **staff app**. Where a term might be unclear (like "the cloud"), there's a glossary at
> the bottom.

---

## 1. The big picture
There are **two separate products** in one code repository:

1. **Public website** (`/site/`) — what customers see at turbokeysmith.com. Marketing + SEO.
2. **Staff app** (`/index.html` + a few pages) — private tools the locksmith uses (customers,
   receipts, scheduler, payments, inventory). Not for customers.

Everything is **plain HTML/CSS/JavaScript** — no build framework, no server code. It runs as
static files. Data is stored in the browser today (**localStorage**) and can optionally sync to
a **cloud database (Supabase)** when staff sign in.

**Business facts used throughout:** Turbo Keysmith, mobile locksmith, licensed OK #AC441081,
phone 405-870-5397, based at 4201 N MacArthur Blvd, Warr Acres, OK 73122.

---

## 2. Git branches
- **`public-website`** — the website/SEO work (city pages, hub, sitemap).
- **`app-structure`** — branched off `public-website`; contains **everything above PLUS** the
  staff-app work and the cloud wiring. **This branch is the complete, current state.**
- Nothing has been published/deployed. All changes are local commits only.

---

## 3. Public website (`/site/`) — what was built
A big SEO expansion so the business ranks for "locksmith in <city>" across the metro.

- **102 live English pages** (plus 98 unpublished Spanish draft pages — see the Spanish item
  below), each with a unique page title, meta description, and H1 (verified — no duplicates).
- **25 city/area pages** covering the metro within **a ~30-mile radius** of the Warr Acres base
  (Blanchard is the farthest city we keep). They're grouped by distance and ordered
  closest→farthest:
  - **Home turf — minutes away** (5): Warr Acres, Bethany, The Village, Nichols Hills,
    Oklahoma City.
  - **Inner metro** (7): Yukon, Piedmont, Del City, Mustang, Midwest City, Edmond, Spencer.
  - **Surrounding metro** (6): Moore, Nicoma Park, Jones, Choctaw, Newcastle, Tuttle.
  - **Outer edge of our area** (7): Norman, Harrah, El Reno, Guthrie, Goldsby, Noble, Blanchard.
  - **22 of the 25** get a main page **plus** automotive/residential/commercial sub-pages;
    the 3 farthest small towns (Goldsby, Noble, Blanchard) get **one combined page each**
    (avoids thin "doorway" pages that hurt SEO).
  - *(Trimmed on 2026-06-08 from a wider ~40-city/~50-mile footprint. 14 farther towns —
    McLoud, Purcell, Crescent, Kingfisher, Lexington, Shawnee, Chickasha, Tecumseh, Chandler,
    Stroud, Prague, Cushing, Stillwater, Pauls Valley — were removed: pages, sub-pages, sitemap,
    and schema entries all gone, no dead links.)*
- **Service Areas hub** at `/site/service-areas/` lists all 25 by distance group in proximity
  order; linked from the footer of every page (kept out of the top menu on purpose).
- **`sitemap.xml`** (102 URLs) and **`robots.txt`**.
- **Schema.org `areaServed`** lists all **25 cities** (closest→farthest) on every page.
- **Spanish `/es/` site — full DRAFT, UNPUBLISHED (98 pages).** A complete Spanish mirror of the
  25-city structure lives under `/site/es/` (Spanish homepage, 25 city pages + 66 sub-pages, the
  service-areas hub, contact form, and the 4 metro service pages). It is a **machine-translation
  draft pending proofreading** and is intentionally held back:
  - Every `/es/` page shows a visible **"BORRADOR — pendiente de revisión / DRAFT — pending
    proofreading"** banner.
  - Every `/es/` page is **`noindex`**, kept **out of `sitemap.xml`**, and **blocked in
    `robots.txt`** (`Disallow: /es/`) — so search engines won't show it until you approve.
  - **hreflang** tags link each English page to its Spanish twin and back (reciprocal +
    x-default), ready for when a page is approved (just remove its `noindex`).
  - A **"¿Hablas español? Text/WhatsApp"** button is on every `/es/` page.
  - A **glossary** of key locksmith terms (key fob, rekey, deadbolt, transponder, lockout, …)
    with the chosen Spanish translations is at `/site/es/GLOSSARY.md`. The proofreader fixes a
    term there / in `_build/es.mjs` once and re-runs `node _build/generate.mjs` to apply it
    everywhere.
  - *(Separate from the older client-side 🌐 EN/ES toggle on the English pages, which only
    translates the shared chrome. When `/es/` is approved, repoint that toggle at `/es/`.)*
- **Contact form** at `/site/contact/` (name, phone, email, address, service needed) that saves
  a lead to the Customers list. See "Stubbed" notes.
- **Spanish toggle (🌐 EN/ES)** in the header of every public page (`/site/assets/i18n.js`).
  Translates the shared chrome (menu, trust strip, footer) site-wide, plus the homepage hero and
  the full contact form. Long city-page body text is still English (translating those is a
  content task, not done yet).

**How the website is generated:** the city pages are produced by a small Node.js script in
`/_build/` from a data file, so the design stays consistent and changes are one command. The
owner does NOT need to run this; it's a developer tool.
- `/_build/cities.mjs` — the per-city copy (titles, intros, sub-page hooks).
- `/_build/engine.mjs` + `/_build/generate.mjs` — templates + generator.
- To rebuild after editing copy: `node _build/generate.mjs` (from the repo folder).

---

## 4. Staff app — what was built
The staff app is a single dark-themed page (`/index.html`) with five tiles. It shares one
customer list across all tools.

- **Customers** — add/edit/delete people, businesses, and contracting (NASTF) accounts. Search.
- **Receipts** — opens `bittings.html` (an existing invoice/paperwork builder). Unchanged except
  a "‹ Apps" back link was added.
- **Scheduler** — opens `scheduler.html`, a guided phone-intake/booking flow for new employees,
  now wired **through the shared data layer (TKS)** so its bookings and customers share one list
  with the rest of the app. **Built:** an in-app **Day view**; **edit any booking**; a **job status**
  on every booking (Scheduled / In Progress / Completed / Rescheduled / Canceled) shown as
  **color-coded tags** on the day view, job list, and booking detail; an **"Add to Schedule"**
  button that opens a pre-filled Google Calendar event with **`turbokeysmith@gmail.com` invited as
  guest** (the business calendar is the system of record) while keeping a **local mirror** on our
  scheduler; **car jobs require vehicle ID** — a **VIN** (which auto-fills year/make/model via a VIN
  lookup) **or** year/make/model typed in, **plus an ignition type** (push-to-start / keyed); and
  **dormant job-photo slots** (built but hidden until real field photos exist). Old jobs
  **auto-archive** off the active board (when Completed/Canceled or once the date passes) and file
  under the customer instead. Google Calendar **two-way sync** is still a pending decision (today
  it's the deep-link + guest invite, not a live sync).
  *Still planned: force the guided intake to be the only booking path, with a per-booking PIN to
  skip it for one booking.*
- **Payments** — a **UI shell only**: amount, customer picker, payment-method buttons, a live
  "Charge $X" label. **It does not take real payments** — clearly labeled as a demo.
- **Inventory** — fully built: parts list, add/edit/delete, quantity with +/- buttons,
  **low-stock flag**, search, summary counts, **supplier + reorder-quantity** fields, a **"Fits
  (vehicles / VIN)" field**, and a **🔎 VIN search** that decodes a VIN to make/model to find the
  matching key/fob.
- **Customers** — now also shows a read-only **Job history** under each customer (their past
  bookings, newest-first) and an **"ES" badge** on any lead that came in through the Spanish
  contact form, so staff know to expect Spanish on the callback.

**Accessibility + mobile:** labels tied to inputs, keyboard-operable rows, visible focus
outlines, 16px inputs (no zoom on iPhone), large tap targets, reduced-motion support.

---

## 5. The data layer (important — how data is stored)
There is ONE place all new code reads/writes data: **`/app/store.js`** (exposed as `window.TKS`).
This is what makes switching to the cloud a one-line change.

- **Today (default):** data is saved in the browser's **localStorage** under keys
  `tks_customers`, `tks_shops`, `tks_inventory`, `tks_bookings`, `tks_receipts`.
- **Cloud option:** `store.js` also contains a **Supabase adapter**. When staff sign in, the app
  calls `TKS.connectCloud(...)` and the SAME screens start reading/writing the cloud database
  instead — no screen code changes.
- A copy of `store.js` lives at `/site/app/store.js` for the public contact form (kept in sync).

**A header pill in the staff app shows where data is going:** "On this device" (local) vs
"☁ Synced" (cloud).

---

## 6. The cloud (Supabase) — current status
"The cloud" here means a **Supabase project** (hosted database + staff login). **It already
exists** — it was set up earlier and is referenced by the staff login page (`cloud-test.html`).

- **Project:** `gcshuhlksjznksspbigl.supabase.co` (config in `/app/cloud-config.js`; the key
  there is the public/"anon" key — safe to expose, protected by database rules).
- **Tables (all created and verified):** `customers`, `inventory` (incl. `supplier`,
  `reorder_qty`), `bookings`, `receipts`. SQL lives in `/supabase/*.sql`.
- **Security:** Row Level Security is ON; only **signed-in** staff can read/write. The public
  anon key alone cannot read or change anything.
- **How it turns on:** automatically, **only when a staff member is signed in** via Staff Login.
  If not signed in / offline / a table is missing, it silently stays on localStorage (safe).
- **To force it fully local:** set `AUTO_CONNECT: false` in `/app/cloud-config.js`.

**Verified end-to-end at the database level (2026-06-10):** all four tables exist; RLS lets only
signed-in staff read/write; a record written **as an authenticated user** lands in the right table
with the right columns (incl. the new `fitment` + lead fields). A **staff login already exists** —
`samer@turbokeysmith.com` (you don't need to create one). The `touch_updated_at` function's
search_path was pinned (a security-advisor item).

**The one thing still needing a real human:** sign in via Staff Login (`cloud-test.html`) as
`samer@turbokeysmith.com` (reset its password in Supabase if it's unknown), then add a record on
one device and confirm it shows on another — that's the live browser confirmation. Also flip on
**leaked-password protection** in Supabase → Auth settings (one toggle). Both the staff app and the
scheduler now auto-connect to the cloud the moment a staff session exists.

---

## 7. What is STUBBED or still needs a decision
These are the open items an advisor should focus on:

1. **Receipts doesn't use the shared data layer yet.** The **scheduler now goes through TKS** (so it
   syncs with everything else once the cloud is on), but **Receipts** (`bittings.html`) still reads
   localStorage directly — its customer list can diverge. It needs the same small "connect" wiring.
2. **Public contact form can't write to the cloud.** Website visitors aren't signed in, and the
   database only allows signed-in writes, so website leads currently save locally only. Landing
   them in the cloud needs a small Supabase "edge function" or a public-insert rule.
   *Decision: which approach + where should new leads notify the owner (email/SMS)?*
3. **Payments are a visual shell only.** No real card processing. *Decision: which processor
   (Stripe/Square), or open the separate payment app — provide its URL.*
4. **Google Calendar is a placeholder.** Opens Google Calendar in a tab; no two-way sync.
   *Decision: real sync (needs Google sign-in setup) or keep the simple link?*
5. **Spanish — the 🌐 toggle vs the `/es/` pages.** Today the 🌐 toggle only translates the
   *chrome* in place (nav/trust strip/footer + tagged bits); city/service **body text stays
   English**, and the full `/es/` pages exist but are **not connected to the button** (only an
   invisible `hreflang` link ties them, for Google). **DECIDED — Option A:** rewire the 🌐 toggle
   to **navigate to the matching `/es/` page**, with a **back-to-English link on the `/es/` side**.
   **Prerequisite sequence (must happen first, in order):** (1) proofread `/es/` — especially
   technical locksmith terms; (2) publish `/es/` — remove `noindex`, add to the sitemap, unblock
   `robots.txt`, drop the DRAFT banners; (3) then rewire the toggle. *Queued, not built yet.*
6. **Nothing is deployed/published.** *Decision: where to host, and is the public site on the
   same web address as the staff app?*
7. **Optional security hardening** flagged by Supabase: set a fixed search_path on the
   `touch_updated_at` function; enable leaked-password protection in Auth settings. Both minor.
8. **Local → cloud migration** of any existing demo data was intentionally NOT done (avoids
   duplicates). *Decision: copy existing local data up once?*

---

## 8. File map (where things live)
```
index.html              Staff app shell (Customers + Job history, Payments, Inventory + VIN search)
bittings.html           Receipts/invoice builder (existing; added a back link)
scheduler.html          Booking + intake flow (Day view, edit, status, VIN/ignition, Add-to-Schedule)
cloud-test.html         Staff login page (Supabase auth) — existed before
app/store.js            THE data layer (Customers, Inventory, Bookings CRUD, Services, VIN decode)
site/assets/cities/     Real city photos pulled from the live site (Edmond/Moore/Norman/Midwest)
app/cloud-config.js     Supabase project URL + public key + on/off switch
app/STRUCTURE_NOTES.md  Detailed notes on the staff-app build + cloud
supabase/customers_setup.sql      Customers table SQL
supabase/app_tables_setup.sql     Inventory/Bookings/Receipts table SQL
site/                   The public website (115 pages)
  site/index.html       Homepage
  site/contact/         Contact form
  site/service-areas/   Service-area hub
  site/<city>/          City pages (+ /automotive /residential /commercial sub-pages)
  site/assets/styles.css  Website design system
  site/assets/i18n.js     Spanish/English chrome toggle (older, client-side)
  site/sitemap.xml, site/robots.txt
  site/app/store.js     Copy of the data layer for the contact form
  site/es/              Spanish DRAFT site (noindex, unpublished); site/es/GLOSSARY.md = term list
_build/                 Developer-only generator for the city pages
  _build/es.mjs         Spanish source: glossary, UI strings, and per-city translations (edit here)
PROJECT_HANDOFF.md      This file
```

---

## 9. How to preview locally (for a developer)
From the repo folder:
- Staff app: `python -m http.server 8088` → open http://127.0.0.1:8088/
- Public site: `cd site && python -m http.server 8099` → open http://127.0.0.1:8099/
(Any static file server works.)

---

## 10. Glossary (plain language)
- **localStorage** — a small storage box inside one web browser on one device. Fast and free,
  but not shared between phones/computers and can be cleared.
- **The cloud / Supabase** — an online database + login service. Lets the same data appear on
  every device and stay backed up. There's a free tier that covers a business this size.
- **RLS (Row Level Security)** — database rules deciding who can see/change data. Here: only
  signed-in staff.
- **anon / publishable key** — a public ID for the cloud project. Safe to expose because RLS
  still guards the data.
- **Schema / sitemap / robots.txt** — behind-the-scenes files that help Google understand and
  list the website.
- **Stub / placeholder** — a screen that looks finished but isn't wired to do the real action
  yet (e.g., Payments).
- **Edge function** — a tiny cloud script, used (for example) to let the public contact form
  save a lead safely without giving the whole website write access to the database.

---

## 11. Changelog (newest first)
Dated record of major changes. Each entry = roughly a work session or milestone.

### 2026-06-10
- **Cloud verified end-to-end, server-side (17:11):** ran `app_tables_setup.sql` against the live
  project; confirmed all 4 tables + RLS (signed-in staff only); wrote a record **as an
  authenticated user** and confirmed it lands in the right table/columns, then cleaned it up. Found
  the new `fitment` (inventory) and lead fields (`service_needed`/`notes`/`lang`/`source` on
  customers) weren't in the cloud column mapping — **added the columns + mapped them in
  `store.js`** so they survive sync. Pinned `touch_updated_at` search_path. **Added the cloud
  bootstrap to the scheduler** so it auto-connects on sign-in (it was localStorage-only). A staff
  login already exists (`samer@turbokeysmith.com`). Remaining: a human sign-in to confirm in the
  browser + enable leaked-password protection.
- **Scheduler + forms — big build (16:44):**
  - Routed the **scheduler through the shared data layer (TKS)** — bookings + customers now share
    one list, **deduped by phone**. Added booking save/edit/status methods to `app/store.js`.
  - **Edit a booking**; **job status** (Scheduled / In Progress / Completed / Rescheduled /
    Canceled) with **color-coded tags** on the day view, job list, and a new booking-detail screen.
  - **"Add to Schedule"** opens a pre-filled Google Calendar event with **`turbokeysmith@gmail.com`
    invited as guest** (system of record) and keeps a **local mirror** on our scheduler.
  - **Customer link + Job history:** each booking stamped with `customerId` (+ phone); a read-only
    **Job history** now shows under each customer. Old jobs **auto-archive** (Completed/Canceled or
    past date) off the active board and file under the customer — nothing deleted.
  - **Car jobs require vehicle ID:** a **VIN** (auto-fills year/make/model via the free NHTSA vPIC
    API — there was no existing VIN API in the repo) **or** year/make/model, **plus ignition type**
    (push-to-start / keyed). **Inventory** is now searchable by **VIN / fitment** to find the key/fob.
  - **Public contact forms (EN + ES):** a **canonical 5-option service dropdown** — the Spanish form
    **displays Spanish but stores a fixed English value**, so leads land in the dataset in English.
    "Other" is the only free-text field, **stored exactly as typed**. Every lead saves to Customers
    **via TKS, deduped by phone**, and Spanish-form leads get an **"ES" badge** in the staff list.
  - **Job photo slots** added to bookings but **dormant** (hidden until real photos exist).
- **City photos (16:44):** pulled the existing images from the live turbokeysmith.com pages for the
  **4 original cities** (Edmond, Moore, Norman, Midwest City) into `site/assets/cities/` and wired
  them into a real "Our Work" gallery (EN + ES). The generator's photo section is now **conditional**
  — the other **21 cities show no empty/broken boxes** (hidden placeholders) until photos are added.
- **Scrapped:** the Android call-screening app (separate Kotlin deliverable, never in this repo).
- **Spanish toggle direction DECIDED — Option A (queued, not built):** the 🌐 toggle will navigate
  to the matching `/es/` page (with a back-to-English link on the `/es/` side), instead of the
  current chrome-only in-place translation. Clarified that the toggle and the `/es/` pages are two
  separate systems today, linked only by an invisible `hreflang` tag. Locked the prerequisite
  sequence: **proofread `/es/` → publish `/es/` (remove noindex, add to sitemap, unblock robots) →
  then rewire the toggle.** Do not point the button at unpublished/unproofread pages.
- **Master task list reconciled with the actual repo** (`turbo_master_task_list.md`): marked the
  proximity re-sort of the 25 cities as done (hub already shows the 4 distance bands); corrected
  the Spanish site to "full 98-page draft built, unpublished" (was understated as in-progress);
  noted the glossary already exists.
- **Android call-screening app SCRAPPED** — removed from the plan. It was a separate Kotlin
  deliverable and was never part of this web repo, so no code changes were needed here.
- **Scheduler — two changes planned (not built yet):** force the guided intake flow to be the
  only booking path, and add a per-booking PIN so an owner/admin can skip the flow for one
  booking. Logged as pending tasks.

### 2026-06-08
- **Spanish `/es/` site built as an unpublished DRAFT (15:49):** 98 machine-translated pages
  mirroring the 25-city English structure (home, cities + sub-pages, hub, contact, metro service
  pages). Every page is `noindex`, excluded from the sitemap, blocked in `robots.txt`, carries a
  visible DRAFT banner and a "¿Hablas español?" Text/WhatsApp button, and has reciprocal hreflang
  with its English twin. Added a locksmith-term glossary (`/site/es/GLOSSARY.md`) and the Spanish
  source in `_build/es.mjs` so the proofreader fixes terms once and regenerates.
- **Service area tightened to ~30 miles (14:37):** removed 14 farther towns (McLoud, Purcell,
  Crescent, Kingfisher, Lexington, Shawnee, Chickasha, Tecumseh, Chandler, Stroud, Prague,
  Cushing, Stillwater, Pauls Valley) and their pages/sub-pages. Kept 25 cities, re-grouped by
  distance into 4 bands (Home turf / Inner metro / Surrounding metro / Outer edge) and ordered
  closest→farthest. Regenerated pages, hub, `sitemap.xml`, `robots.txt`, and `areaServed`; added
  the contact page to the sitemap; Spanish group headings added. No dead links.
- **Docs:** added this `PROJECT_HANDOFF.md`, the technical `app/STRUCTURE_NOTES.md`, and a
  `CLAUDE.md` rule to keep both current after every major change; added this changelog +
  "Last updated" stamp.
- **Cloud (Supabase):** wrote the cloud data adapter + SQL; created and **verified** the
  `customers`, `inventory`, `bookings`, `receipts` tables in the existing Supabase project
  (RLS on, all policies scoped to signed-in staff). Staff app now auto-switches to the cloud
  when an employee is signed in (still needs a real sign-in end-to-end test).
- **Staff app — Payments:** built the Payments tile UI shell (amount, customer picker, method
  buttons). No real card processing yet (clearly labeled demo).
- **Public site — Spanish:** added a 🌐 EN/ES language toggle (chrome site-wide + homepage hero
  + full contact form).
- **Staff app — Inventory:** built the full Inventory tile (parts, qty, low-stock flag, search,
  supplier + reorder qty) on a new shared data layer (`app/store.js`).
- **Staff app — Scheduler:** added an in-app Day view with tappable time slots; Google Calendar
  left as a labeled "not connected" placeholder; added "‹ Apps" navigation.
- **Public site — Contact form:** added `/site/contact/` that captures leads into the Customers
  list.
- **Public website — SEO:** refreshed the 4 original city pages and built out ~40 city/area
  pages (115 pages total) across tiers, a Service Areas hub, `sitemap.xml`, `robots.txt`, and
  full `areaServed` schema.

---
*End of handoff. For deeper staff-app/cloud detail, `app/STRUCTURE_NOTES.md` can be uploaded too.*
