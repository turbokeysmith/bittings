# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-06-08 15:49 CDT &nbsp;·&nbsp; see the **Changelog** (section 11) for the
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
- **Scheduler** — opens `scheduler.html`, a guided phone-intake/booking flow for new employees.
  **Added:** an in-app **Day view** (calendar grid of a day's jobs with tappable open time
  slots), and a "‹ Apps" back link. Google Calendar is shown as a clearly-labeled
  **"NOT CONNECTED"** placeholder (it only opens Google Calendar in a new tab; no real sync).
- **Payments** — a **UI shell only**: amount, customer picker, payment-method buttons, a live
  "Charge $X" label. **It does not take real payments** — clearly labeled as a demo.
- **Inventory** — fully built: parts list, add/edit/delete, quantity with +/- buttons,
  **low-stock flag**, search, summary counts, and **supplier + reorder-quantity** fields (low
  rows show a reorder hint).

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

**Verified working at the database level** (tables, columns, rules all correct). **Not yet
verified end-to-end** in the live browser — that just needs a staff member to sign in and add a
test record.

---

## 7. What is STUBBED or still needs a decision
These are the open items an advisor should focus on:

1. **Scheduler + Receipts don't use the cloud yet.** They still read customers from localStorage.
   When signed in, the Customers + Inventory tiles use the cloud but those two pages don't — so
   their lists can diverge. They each need the same small "connect" wiring. *Decision: wire them?*
2. **Public contact form can't write to the cloud.** Website visitors aren't signed in, and the
   database only allows signed-in writes, so website leads currently save locally only. Landing
   them in the cloud needs a small Supabase "edge function" or a public-insert rule.
   *Decision: which approach + where should new leads notify the owner (email/SMS)?*
3. **Payments are a visual shell only.** No real card processing. *Decision: which processor
   (Stripe/Square), or open the separate payment app — provide its URL.*
4. **Google Calendar is a placeholder.** Opens Google Calendar in a tab; no two-way sync.
   *Decision: real sync (needs Google sign-in setup) or keep the simple link?*
5. **Spanish covers the chrome + homepage + contact form, not the long city-page text.**
   *Decision: translate all city/service page bodies? (content work).*
6. **Nothing is deployed/published.** *Decision: where to host, and is the public site on the
   same web address as the staff app?*
7. **Optional security hardening** flagged by Supabase: set a fixed search_path on the
   `touch_updated_at` function; enable leaked-password protection in Auth settings. Both minor.
8. **Local → cloud migration** of any existing demo data was intentionally NOT done (avoids
   duplicates). *Decision: copy existing local data up once?*

---

## 8. File map (where things live)
```
index.html              Staff app shell (Customers, Payments, Inventory live here)
bittings.html           Receipts/invoice builder (existing; added a back link)
scheduler.html          Booking + intake flow (added Day view + back link)
cloud-test.html         Staff login page (Supabase auth) — existed before
app/store.js            THE data layer (localStorage + Supabase adapter)
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
