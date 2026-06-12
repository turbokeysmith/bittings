# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-06-12 15:46 CDT &nbsp;·&nbsp; see the **Changelog** (section 11) for the
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
  **The guided intake is now the only way to book** — the Day view is view/open-only (its old
  "+ Book" shortcut is gone), and every step must be answered to advance. An owner can take a
  **per-booking shortcut**: a 🔒 "Quick form" on the Home screen asks for an **owner PIN** and then
  opens one plain quick-entry form (all fields, no coaching steps); the next booking goes back to
  forced guided. The PIN is set in `app/cloud-config.js`, and the gate is built as a single
  swap-point so it can become an owner-only login check later without touching the flow.
- **Payments** — real card processing, built into the portal itself (single-shop, **TEST mode**).
  There are **two places to take money**, both using the same secure engine: **Receipts → Pay Now**
  (pay a finished invoice) and the **Payments tile → New Charge** (for no-invoice jobs like lockouts —
  type an amount, what it was for, and an optional customer). Each offers **three buttons: 💳 Card,
  💵 Cash, 🧾 Check.** Card works **in-shop** (the WisePOS E reader) or **in the field** (a typed-card
  field hosted by Stripe). A **2% surcharge applies to credit cards only** (never debit, never cash or
  check — Oklahoma law), shown before you charge. Cash and check are just recorded. **Taking payment is
  owner-only** (a trainee signed in as staff is blocked; with nobody signed in there's a PIN). The
  card number never touches our code or our database — it goes straight to Stripe; the secret key lives
  only in the cloud (never in the app or the website). *(Going live = swapping to live keys after you
  rehearse with test cards — see "Suggested next steps".)*
  - **Two owner-only money tiles** on the Home screen (a trainee won't see them): **🧮 Closeout** counts
    **today's drawer** (collected, split by card/cash/check, surcharge, refunds), and **📊 Transaction
    History** opens on **today** (older sales stay filed under each customer; nothing is deleted) with a
    **period dropdown** (Today / Week / Month / Quarter / Year), a **switchable graph** (bar / line /
    area / pie / doughnut), and **Total Jobs / Sales / Cost / Profit** cards you can turn on and off.
    **Cost and Profit show $0 for now** — they fill in once we attach a part's cost (and a technician)
    to a sale; the Inventory already stores each part's cost, ready for that step.
- **Inventory** — fully built: parts list, add/edit/delete, quantity with +/- buttons,
  **low-stock flag**, search, summary counts, **supplier + reorder-quantity** fields, a **"Fits
  (vehicles / VIN)" field**, and a **🔎 VIN search** that decodes a VIN to make/model to find the
  matching key/fob.
- **Customers** — now also shows a read-only **Job history** under each customer (their past
  bookings, newest-first) and an **"ES" badge** on any lead that came in through the Spanish
  contact form, so staff know to expect Spanish on the callback.
- **Vendor tools** — the Home screen has two quick-link buttons that open the shop's main vendor
  sites (**American Key Supply** and **Key Innovations**) in a new tab. *Note: actually locking the
  shop PC down so it can ONLY reach those sites + the app is a separate Windows/browser setup (a
  managed-browser allowlist or kiosk mode), not part of this app — a later task.*

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

**Confirmed live in the browser (2026-06-10):** signed in as `samer@turbokeysmith.com` and the staff
app flipped to **☁ Synced** — cloud sync is working end-to-end. Both the staff app and the scheduler
auto-connect the moment a staff session exists.

**Gotcha worth remembering:** sign in at the **same web address the app runs on** (e.g.
`http://127.0.0.1:8088`), not the `file://` page. The browser keeps the login separate per address,
so signing in on a double-clicked `file://` page won't carry to the served app (it'll stay "On this
device"). `localhost` and `127.0.0.1` also count as different — pick one and stick with it.

**Cloud setup is complete.** The one leftover advisory — leaked-password protection — is a
**Pro-plan-only** feature, so it's deferred/optional on the current plan (revisit only if you
upgrade to Pro). It's the lowest-severity item and doesn't affect security of the data, which is
already guarded by row-level security.

**Who's signed in + roles.** The staff app now shows a small bar with the signed-in email and a
role badge — **OWNER** or **STAFF** — plus a Sign out (and a Staff Login link when signed out).
"Owner" is decided by an **email allowlist** in `app/cloud-config.js` (`TKS_OWNER.OWNER_EMAILS`,
currently `samer@turbokeysmith.com`); everyone else who signs in is **staff**. Owner-only actions
(today: the scheduler's Quick form) unlock automatically for the owner, are denied to a signed-in
employee, and fall back to the PIN only when nobody is signed in. *This is a **soft** gate — it
recognizes who you are and protects owner-only things, but it doesn't lock a logged-out person out
of the app entirely (offline/local use still works). A hard "must sign in" block can be added later.*

---

## 7. What is STUBBED or still needs a decision
These are the open items an advisor should focus on:

1. **Done — Receipts now uses the shared data layer.** `bittings.html` reads/writes customers, shops
   and receipts **through TKS** and auto-connects to the cloud when a staff member is signed in, so
   it shares the one deduped list and syncs like everything else. *(Staff app now also shows who's
   signed in + their role; see section 6.)*
2. **Public contact form can't write to the cloud.** Website visitors aren't signed in, and the
   database only allows signed-in writes, so website leads currently save locally only. Landing
   them in the cloud needs a small Supabase "edge function" or a public-insert rule.
   *Decision: which approach + where should new leads notify the owner (email/SMS)?*
3. **Payments are real and working in TEST mode** (Stripe, built into the portal). Card + cash +
   check, invoice Pay Now + New Charge, owner-gated, with Closeout + Transaction History tiles.
   *Open items, not blockers:* **(a)** decide how a part's **cost** attaches to a sale so **Cost /
   Profit / commission** show real numbers (pick the part(s) on the receipt vs. a quick cost box);
   **(b)** **go live** — swap live keys, one real charge, retire the old `TurboStripe.exe` desktop app
   **and rotate its old key**; **(c)** sales tax + sending the customer a receipt. Full detail:
   `supabase/PAYMENTS.md`.
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

## 7.5 Suggested next steps (by area) — my read, your call
*Most of the building is done. Here's what I'd line up next, plainest-first. The deeper task list
with statuses is `turbo_master_task_list.md`.*

**Payments / money (the active area)**
1. **Test it yourself in TEST mode** — sign in, build an invoice and Pay Now, do a New Charge, try a
   cash and a check, then open Closeout and Transaction History. No risk; just confirms it all feels
   right before real money.
2. ✅ **Real Cost & Profit — done.** A sale can pick parts from Inventory (or take a manual cost),
   subtracts stock when paid (and restores on void), and tags a technician — so Total Cost/Profit are
   real now. Leftover slivers: a *filter by technician* and a *refund/void button* in the history.
3. **Go live** — swap in the live Stripe keys, run one real card, retire the old desktop app
   (`TurboStripe.exe`) and **rotate its old key** (security-important). Do this once you're confident
   from step 1.
4. **Finish the money loop** — email/text/print the customer a receipt; auto-email yourself the
   day's Closeout totals; decide sales tax if any items are taxable.

**Website**
5. **Public leads into the cloud** — today website leads save only on the device that took them. A
   small cloud script lands them in the shared database, plus an **email alert** when one arrives.
6. **Spanish** — get the draft `/es/` pages proofread (locksmith terms), publish them, then point the
   🌐 button at them. The proofreader is the only real blocker.
7. **Go live with the website** — decide hosting, then the careful publish → check → domain switch
   (kept for last to protect Google ranking).

**Later**
8. **Backups/export** (don't let a year of records live in one place), **error visibility**, and a
   **real-device test** of the card reader + phone before relying on them.
9. **Selling the app to other locksmiths** stays parked until your own shop is running on it.

---

## 8. File map (where things live)
```
index.html              Staff app shell (Customers + Job history, Payments, Inventory + VIN search)
bittings.html           Receipts/invoice builder (existing; added a back link)
scheduler.html          Booking + intake flow (Day view, edit, status, VIN/ignition, Add-to-Schedule)
cloud-test.html         Staff login page (Supabase auth) — existed before
app/store.js            THE data layer (Customers, Inventory, Bookings CRUD, Services, VIN decode)
app/pay.js              Shared Pay Now engine (New Charge + cash/check + transaction queries)
site/assets/cities/     Real city photos pulled from the live site (Edmond/Moore/Norman/Midwest)
app/cloud-config.js     Supabase project URL + public key + owner allowlist/PIN + on/off switches
app/STRUCTURE_NOTES.md  Detailed notes on the staff-app build + cloud + payments
supabase/customers_setup.sql      Customers table SQL
supabase/app_tables_setup.sql     Inventory/Bookings/Receipts table SQL
supabase/payments_setup.sql       Payments tables (transactions + events) SQL
supabase/functions/               The 6 Stripe edge functions (version-controlled) + README
supabase/PAYMENTS.md              Payments architecture + operations + go-live steps
TurboStripe_AUDIT.md              Audit of the old desktop POS + why we chose the portal build
turbo_master_task_list.md         The deep task list (every track, statuses, next steps)
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

### 2026-06-12
- **Standing rule: every change must be verified on iPhone + Android before "done" (15:46):** added a
  permanent rule (in `CLAUDE.md`) that any new feature must work on **both iPhone (Safari) and Android
  (Chrome)**, for **owner and signed-in staff**, on a small phone (fits/scrolls, tap targets, touch
  inputs, no hover, owner-gating holds) before it's called done — and if a real device can't be tested
  here, you get exact phone-test steps instead of an assumption. Applied retroactively: the payments
  UI, the money tiles, and the new parts/cost capture are now marked **"code-complete, pending your
  mobile sign-off"** (they pass a static mobile review but haven't been run on a real phone from here).
- **Parts on a sale → real Cost & Profit, plus inventory stock + technician (15:40):** on the receipt
  builder you can now **add the actual part(s) you used from Inventory** (search by name, SKU, fitment,
  or VIN — same as the Inventory tile). The customer still sees only the **sale price**; the part's
  **cost** is captured quietly so the books can show **profit**. Every line also has a **manual cost
  box** (for parts not in inventory or one-off jobs), and labor/no-part lines (like a lockout) count as
  **$0 cost**. When a sale is **paid**, the used quantity is **subtracted from stock** (and the
  low-stock flag trips automatically); if you later **void/delete** a paid sale, the stock is **added
  back**. Stock only moves on a real paid sale — never on an unfinished draft. You can also **tag a
  technician** on the sale (sets up the commission view). The new **Total Cost** and **Total Profit**
  in Transaction History now fill with real numbers (the cost is read on the server from the saved
  receipt, so it can't be faked). Owner-only; the receipt style is unchanged. *(All still TEST mode.)*
- **Two owner-only money tiles: Closeout + Transaction History (11:25):** the day-closeout and the
  transaction history are now **their own tiles on the Home screen, just for you** — a trainee signed in
  as staff won't see them. **Closeout** counts today's drawer (collected, split by card/cash/check,
  surcharge, refunds). **Transaction History** opens on **today** (the daily "reset" — nothing is ever
  deleted, older sales just drop off the default view and stay filed under each customer) and has a
  **period dropdown** (Today / Week / Month / Quarter / Year) plus a **graph you can switch between bar,
  line, area, pie and doughnut**. It shows **Total Jobs, Total Sales, Total Cost and Total Profit**, and
  you can **turn each of those on or off**. Groundwork laid for **profit and per-technician commission**:
  Inventory already holds each part's **cost**, and every sale can now carry a cost and a technician —
  today Cost shows $0 / Profit equals Sales until parts (and techs) are attached to a sale, then those
  numbers and a "filter by technician" fill in with no rebuild.
- **Cash & check tenders + a day-closeout history (00:34):** both pay screens (the invoice **Pay Now**
  and the Payments-tile **New Charge**) now offer three buttons — **💳 Card**, **💵 Cash**, **🧾 Check**.
  Cash/check are recorded straight through (no Stripe) and — as required by law — carry **no surcharge**;
  card still adds the 2% credit-only surcharge. Added a **History** screen in the Payments tile to
  **close out the day**: pick the range and it totals everything collected, broken down by card / cash /
  check, plus surcharge collected and any refunds, over a list of each transaction (time, method, status,
  amount). Still all in TEST mode. (New `pay-record` cloud function; cash path rehearsed at $25.)
- **Quick invoice + New Charge (carried over from the prior session):** Receipts has an **owner-only
  Quick invoice** form (a one-screen shortcut so you skip the chat; trainees can't see it; there's an
  on/off switch and an "open it automatically when I'm signed in" setting). The Payments tile gained
  **New Charge** for no-invoice jobs like lockouts — type an amount + what it was for + an optional
  customer, and charge it; it quietly creates a receipt so the books and the customer's history stay
  complete (or stays anonymous if you skip the name). Both are owner-gated.

### 2026-06-11
- **Payments rebuilt into the portal — Supabase edge functions, rehearsed (16:10):** after auditing
  TurboStripe (the owner's live desktop POS — see `TurboStripe_AUDIT.md`), chose **Option B**: a fresh
  payment system in the portal stack (**Supabase Edge Functions + Stripe.js**, single-account direct
  charges, NOT Connect). Verified the unknowns (stripe-node in Deno edge, server-driven Terminal from
  edge, **credit-only 2% surcharge via manual-capture funding detection**), built the schema +
  5 edge functions + a verified webhook (source of truth), and **passed a full TEST rehearsal**
  (credit $102 w/ 2%, debit $100 none, refund, idempotency). Added a **Pay Now** action to Receipts
  (reader + typed-card Payment Element, 2% credit disclosure, failure UX). All TEST; secret server-side
  only. Details in `supabase/PAYMENTS.md`. The earlier Netlify single-shop tile is superseded.
- **Payments wired (single-shop, TEST mode) (10:16):** added a one-time **Payment setup** screen to
  the staff app — you enter the payment app's Netlify URL, WisePOS reader ID, Stripe publishable key,
  currency, and 2% surcharge (saved on the device, nothing hardcoded). The **secret key is never in
  the app** — the screen instructs pasting `STRIPE_SECRET_KEY` into Netlify env only. Wired the
  Payments tile to the existing Netlify app: card-present via the **WisePOS E** (+ Simulate-tap in
  test) and **typed-card** via Stripe's hosted field; TEST/LIVE banner + surcharge breakdown. The
  separate payment backend functions gained **CORS + request-driven reader/currency** (in the
  payments repo — needs a redeploy). The **sellable multi-tenant product** is parked (Track F); plan
  captured in chat.

### 2026-06-10
- **A4 — Receipts on the cloud + login gating + owner role (18:09):** wired **Receipts**
  (`bittings.html`) through TKS so it shares the one deduped customer list and syncs receipts when
  signed in. Added a **staff-login bar** to the staff app showing who's signed in and their role
  (**OWNER**/**STAFF**) + Sign out. Added `TKS.auth` (who's signed in / is-owner / role / sign-out)
  to the data layer, with owner decided by an email allowlist in `app/cloud-config.js`
  (`TKS_OWNER.OWNER_EMAILS`). Upgraded the scheduler's `requestOwnerAccess` swap point so the
  **owner's login unlocks the Quick form with no PIN**, a signed-in **employee is denied**, and the
  **PIN is the fallback only when nobody is signed in**. Also made the staff app's Home/Inventory
  "sync" notes reflect the real cloud state (no more stale "sync arrives" line).
- **Vendor quick-links (17:55):** added two Home-screen buttons in the staff app opening American
  Key Supply + Key Innovations in a new tab (styled to match). Noted that a true "PC can only reach
  these sites" lockdown is a separate Windows/browser setup, not an app feature.
- **Scheduler finished — forced guided flow + owner PIN bypass (17:52):** the guided
  question-by-question intake is now the ONLY way to book (removed the Day-view "+ Book" shortcut;
  Day view is view/open-only; job type, sub-type, and the upsell answer are now required so no step
  can be skipped or jumped). Added a per-booking **"Quick form (owner)"** on Home: enter the owner
  **PIN** → one plain quick-entry form (all fields, no guided steps) → next booking is forced-guided
  again. The PIN lives in `app/cloud-config.js` (`TKS_OWNER.QUICK_FORM_PIN`, default `1234` — change
  it), and the access check is a single swap point (`requestOwnerAccess()`) ready to become an
  owner-login permission once auth gates the app. Both paths save through TKS as before.
- **Cloud sync CONFIRMED live in the browser (17:26):** signed in as `samer@turbokeysmith.com` at
  `http://127.0.0.1:8088` and the staff app flipped to ☁ Synced. Root cause of the earlier
  "can't sign in / stays local" was signing in on the `file://` page — the browser scopes the
  session per web address, so it didn't carry to the served app. Fix = sign in at the same address
  the app runs on. Only remaining cloud item: enable leaked-password protection (Auth toggle).
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
