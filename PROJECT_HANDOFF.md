# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-11-12 16:30 CST (Claude Code, on the new shop PC "TK-Main", remote session) &nbsp;·&nbsp; see the **Changelog** (section 11) for the
timeline of what was done and when. **🚀 The public website is now LIVE on `https://turbokeysmith.com`
via Cloudflare (see the 2026-06-19 changelog entry).** Repo folder is now **`turbokeysmith-main/`**, split into
**`website/`** (public site) and **`bittings-unified/`** (the staff app — active source tree; the older
`bittings-app/` copy is retired under `_archive/`) — see §8. A **blog** ("Notes from the Key Man")
and a rewritten **FAQ** are now live; the stale-CSS cache bug is fixed (see the 2026-06-19 PM-4 changelog).
**Next session: the Bittings staff app.**

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
phone 405-870-5397, based at 9201 N Council Rd, Suite A, Oklahoma City, OK 73132 (moved Nov 2026; was 4201 N MacArthur Blvd, Warr Acres).

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

**How the website is maintained:** the public site is **hand-maintained static HTML** in
`website/site/` — that folder is the single source of truth. **Edit those files directly and
deploy.** There is **no build step** and **no generator to run.**

> ⚠️ **The old page generator is RETIRED and is NOT in this repo.** It fell out of sync with the live
> site — it emitted emoji icons where the live pages use SVG icons, so running it would have regressed
> ~220 pages. It was archived locally during cleanup and never committed here, so there is nothing to run.

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
    **today's drawer** (collected, split by card/cash/check, surcharge, refunds) and now includes a
    **denomination drawer count → branded Deposit Slip** (enter how many of each bill/coin; it computes
    total cash counted, the deposit (counted − **starting float**), and today's **over/short** vs
    expected cash — then **📤 Share/Save** it as a PDF or **copy** the summary). The **starting float
    carries over** from the previous close (what you keep becomes tomorrow's opening float); it defaults
    to your Settings float (**$120**, set in Setup → Payments, raise as you grow) and is **editable per
    day right on Closeout (owner-only)**. If the count comes up **under the starting float**, it warns
    and tells you exactly how much cash to add to restore it — or you can continue (the slip notes the
    shortfall, deposit $0). And **📊 Transaction
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
- **Programmers (Key Programmer Coverage)** — a Home tile (`programmers.html`) that, from a VIN or
  make+year, shows a **per-tool capability matrix** (Add key / AKL / Remote · OBD or bench · what it needs)
  across the tools you mark as owned (your seven by default — Autel IM608 Pro 2, IM508, KM100; Xhorse Key Tool
  Max; SmartPro; AutoProPad G2; Lonsdor K518 — with variants like AutoProPad G2/Turbo/G3 selectable). Coverage is
  grouped by immobilizer platform and is a **verify-on-tool guide** that hardens from real jobs via a corrections
  loop. Staff app only. *(See the Changelog for detail.)*
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
   - **Proofreading checklist (Spanish pages needing a fluent reviewer before publish):**
     **🚩 MUST (legal/technical, blocking):** `/es/warranty/` and `/es/terms/` — these carry an extra red
     "needs professional review" banner. **Also proofread** (machine-translation drafts, like the rest of
     `/es/`): `/es/financing/`, `/es/faq/`, the financing/warranty teasers on `/es/` home + the 4 `/es/`
     service pages, and the `/es/automotive/` warranty section. Spanish source for all of it is in
     `_build/es.mjs` (the proofreader edits there, then `node _build/generate.mjs`). Payment brand names
     (Klarna/Afterpay/Zip/Amazon Pay/Cash App Pay/Link/PayPal) stay in English on purpose.
     **🚩 ALSO MUST (accuracy-critical):** the 6 Spanish credential pages — `/es/certifications/google-verified/`,
     `/es/oklahoma-license/`, `/es/nastf/`, `/es/keyless2go/`, `/es/omla/`, `/es/okbfaa/` — each carries an
     extra red "needs proofread" banner. Verify the credential facts/terms read correctly in Spanish.
6. **Nothing is deployed/published yet — but the host is now DECIDED: Cloudflare.** Public site →
   **Cloudflare Pages** (deploy the `website/site/` folder); domain DNS → **moved to Cloudflare** for speed +
   free SSL; **GoDaddy stays only as the registrar** (and keeps hosting email). Full step-by-step in
   **`DEPLOY_CLOUDFLARE.md`** (account → verify email/MX records → switch nameservers → deploy → verify
   on a temp `*.pages.dev` URL → flip the domain, reversibly). The **staff app** goes later on its own
   subdomain (`app.turbokeysmith.com`), kept `noindex`. **PREVIEW IS LIVE (2026-06-14):** `site/` is
   deployed to the Cloudflare Pages project **`turbokeysmith`** at **https://turbokeysmith.pages.dev**
   (free `*.pages.dev` address) via a Pages:Edit API token — **no custom domain, no DNS; turbokeysmith.com
   untouched**. All pages return 200; widgets/schema/hours verified. *Still to do: owner phone sign-off on
   the preview, then the domain cutover together (add custom domain + DNS) per the runbook.*
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
4. **Finish the money loop** — ✅ sending the customer a receipt is done (via your phone's own apps;
   pending your mobile sign-off). Still open: auto-email yourself the day's Closeout totals, decide
   sales tax if any items are taxable, and (future) a thermal-printer print path.

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

> **📁 Repo structure (since 2026-06-19):** the repo folder is **`turbokeysmith-main/`**. Inside it the
> staff-app files listed below now live under **`bittings-app/`** (e.g. `bittings-app/index.html`,
> `bittings-app/app/store.js`, `bittings-app/supabase/`, `bittings-app/_source/` for the Lishi raw data), and
> the public website lives under **`website/`** (`website/site/` — hand-maintained static HTML, the source of
> truth — plus `website/_tools/`; **the old `_build/` generator is RETIRED/archived, do not run it**). Shared project docs stay at the repo root. Paths *within* each folder are unchanged —
> only the parent folders are new. **Deploy:** `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`.

```
index.html              Staff app shell (Customers + Job history, Payments, Inventory + VIN search)
bittings.html           Receipts/invoice builder (existing; added a back link)
scheduler.html          Booking + intake flow (Day view, edit, status, VIN/ignition, Add-to-Schedule)
lishi.html              Lishi/keyway/programming reference (VIN→card, search, notes + corrections log)
                        — stores: tks_lishi_tools, tks_vehicle_keyways, tks_lishi_corrections, tks_vin_cache
programmers.html        Key Programmer Coverage (staff app) — VIN/make→year → per-tool add-key/AKL/remote
                        matrix for the 7 owned tools; organized by immobilizer platform; corrections loop
                        — stores: tks_prog_devices, tks_prog_coverage, tks_prog_corrections (+ tks_vin_cache)
cloud-test.html         Staff login page (Supabase auth) — existed before
app/store.js            THE data layer (Customers, Inventory, Bookings CRUD, Services, VIN decode)
app/pay.js              Shared Pay Now engine (New Charge + cash/check + transaction queries)
site/assets/cities/     Real city photos pulled from the live site (Edmond/Moore/Norman/Midwest)
app/cloud-config.js     Supabase project URL + public key + owner allowlist/PIN + on/off switches
app/STRUCTURE_NOTES.md  Detailed notes on the staff-app build + cloud + payments
supabase/customers_setup.sql      Customers table SQL
supabase/app_tables_setup.sql     Inventory/Bookings/Receipts table SQL
supabase/payments_setup.sql       Payments tables (transactions + events) SQL
supabase/functions/               The 7 Stripe edge functions (version-controlled) + README
                                  (pay-create-intent, pay-record, pay-refund, pay-status,
                                   pay-terminal, pay-void, stripe-webhook — all deployed + ACTIVE)
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
  site/es/              Spanish site (published + indexed; /es/blog/ is a noindex draft mirror)
  site/blog/            Blog "Notes from the Key Man" — index (in-page search + category filter),
                        /blog/{slug}/ posts, /blog/category/{6 slugs}/, feed.xml (RSS), search-index.json,
                        blog/assets/ (hero images). Public FAQ lives at site/faq/.
(no _build/)            Generator RETIRED — not in this repo (never committed). Site is
                        hand-maintained static HTML in website/site/. Do NOT run a generator.
PROJECT_HANDOFF.md      This file
DEPLOY_CLOUDFLARE.md    Step-by-step runbook to host on Cloudflare Pages + move DNS (deploy guide)
site/_headers           Cloudflare Pages caching + security headers for the public site
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

### 2026-11-13, evening (big labels: fill, logo, "Fits:", Vertical / Horizontal · one "Quotes & estimates" screen) — LIVE (85abf43de1d6), NOT committed
- **Print box (8z103):** the 1/2/3/5/10 chips are gone — a number box (`#plNum`) and one "Print all (N in stock)" button.
- **Big labels (tier 3, 8z103 + 8z104)** in `app/hardware.js` `layoutFor` → `build3(k, g)`:
  type is scaled up as far as it goes (k up to 4) without dropping a line; a long key name shrinks on its own; leftover
  white space is shared out between the lines (g). "Fits:" is ALWAYS on a big label — the vehicle when filled in,
  otherwise "Fits:" + two rules to write on. Optional shop logo band across the top (`prefs.labels.logo`, Settings tick
  `hwLbLogo`, print-box tick `plLogo`; only when a logo is uploaded).
- **New sizes:** `tall` 2 × 3 in and `ship` 4 × 6 in (the owner's new big rolls — exact roll size still to be confirmed
  from the box).
- **Vertical / Horizontal** on sizes whose both sides are ≥ 1.75 in (`canTurn`, `orientOf`, pref
  `prefs.labels.orient[sizeId]` = 'h' | 'v', default = the way the roll feeds). Settings size cards and the print box
  both show the choice. A turned label is laid out on the turned shape and sent to the Zebra as ONE picture
  (`toCanvas` → quarter turn → `^GFA`, `turnedZPL`); unturned labels are ordinary ZPL as before. Tall (taller-than-wide)
  layouts put the name across the top, QR + price side by side, details full width.
- **Niimbot:** drawing now goes through `TKS_HW.labels.toCanvas` (one renderer); Settings tick `hwNbTurn`
  ("Horizontal layout on the tall 50 × 80 mm roll").
- **NOT yet seen on paper:** none of the big sizes, the turned picture, or the logo band has been printed on the real
  ZD420 or the B1. First real print should check: direction of the turn, darkness of the picture, logo sharpness.
- **Menu cleanup step 2:** one menu item "Quotes & estimates" (`data-go="estimates"`) opens the estimates list with a
  "＋ New quote" button (`newQuoteFromList()` in bittings.html); the old `quote` nav entry is a hidden legacy button.
  Known leftover: on that screen the phone bottom bar lights "Receipts" instead of "Quotes".
- Tests: `rebuild-labels-test.js` (8092), `rebuild-niimbot-test.js` (8093), `rebuild-menu-test.js` (8091), app, quote
  (its taxed line now uses Materials, per 8z96), exempt-estimates, profit, multiveh, cash, deposit-print, contrast sweep — all pass.

### 2026-11-13, afternoon (label sizes + print box · Niimbot Bluetooth) — LIVE, committed 40daa12
- **8z101 Label sizes and the print box** (owner: "print one, two, three… or all the quantity"; "what size label do you
  use, with a sample of each; more information as the size gets bigger"). `app/hardware.js`: `LABEL_SIZES` (small 2×1,
  medium 2¼×1¼, wide 3×1, large 3×2, xl 4×2, xxl 4×3, custom), prefs `labels.size / sizesOn / customW / customH`; ONE
  layout engine `layoutFor(part, unit, sizeId, opt)` → `toZPL()` for the Zebra and `toSVG()` for the on-screen sample
  (tier 1 = today's 2×1 label, tier 2 adds a "Fits:" line, tier 3 adds FCC ID / chip / type, serial + received date on unit
  labels). Settings → Printers & scanner shows a sample card per size ("We have this size" / "Use by default").
  `TKS_HW.labels.openPrintDialog(part, { inStock, fetchUnits })` — the 🏷 button on each inventory row now opens it:
  1 / 2 / 3 / 5 / 10 / "All in stock (N)" / any number, size chips (only the ticked sizes), live sample, and for serialised
  keys "each key's own label" vs "same label × N" (`^PQn`). Test `tools/qa/rebuild-labels-test.js`.
  The bigger Zebra rolls are not installed yet — owner to confirm their exact size; nothing printed on paper yet.
- **8z102 Niimbot over Bluetooth** (owner: "not everyone has a shop printer… we have a B1"). `app/niimbot.js`
  (`TKS_NIIM`): draws the SAME layout on a canvas at 203 dpi (B1 head = 384 dots; rolls 50×30 default, 50×50, 50×80, 40×30,
  40×20, 30×20 mm) and prints through **NiimBlueLib 0.49.1** (MIT, vendored at `app/vendor/niimbluelib-0.49.1.min.js` +
  licence, loaded only when printing; owner approved including it). Web Bluetooth only: Chrome on Android / Windows.
  iPhone: the print box offers "Save the label as a picture" (share sheet / download) — or Bluefy browser (untested).
  prefs `niimbot { enabled, model, size, density }`; Settings block "4 · Bluetooth label printer (Niimbot)" with sample +
  "Connect and print a test label"; the print box shows a Printer choice when both printers are on. Research:
  `docs/research/niimbot-bluetooth-2026-11-13.md`. Test `tools/qa/rebuild-niimbot-test.js` (Bluetooth stood in).
  **NOT yet tried on the real B1** — first real test = owner's Android + B1 (genuine rolls; print direction, darkness and
  alignment on rolls narrower than 50 mm are unverified). Only B1 / B21 (48 mm head) are listed; D11 / D110 need a
  narrow layout.

### 2026-11-13, later (Key systems first build · menu groups · menu scroll fix · "coming soon" on the site) — LIVE
- **8z100 Key systems** (owners / managers; menu → Keys & stock → 🔑 Key systems). Server: `supabase/phase8/8z100_key_systems.sql`
  (APPLIED) — tables `key_systems` (one jsonb document per system) + `key_system_events`; NO direct table access for anyone;
  functions `key_system_list / get / save / event / history / delete` (manager-only, every open is logged as "view").
  Client: `app/keycalc.js` (pure math, `TKS_KEYCALC`: SPECS sc / a2 / s6300 all `verified:false`, validateKey, pinLock, opens,
  checkSystemLock, progressions, designTPP, pinForKey; test `tools/qa/keycalc-test.js`, 60 checks incl. the Schlage SFIC
  and Sargent 6300 manual examples) and `app/keysystems.js` (`TKS_KS.open(root)`: list, new system, editor tabs System /
  Keys / Doors / Pin chart / Lost key / History, "Pin a lock" quick tool, on-screen first, print optional; nothing is kept
  in browser storage; test `tools/qa/rebuild-keysystems-test.js`, 88 checks). Every chart says **Not yet verified** until a
  spec is checked against a real lock (owner's friend) — flip `verified` in SPECS per spec then. Schlage Classic top pins
  are NOT calculated (rule not confirmed). Not built yet: trade split / add-on billing, technician view of one job's chart,
  rotating-constant method, more brands (see `docs/keyway-spec-request.md`), "Start rekey quote" only opens a blank quote.
- **Menu cleanup step 1:** sidebar grouped under headings Daily work · Keys & stock · Team & pay · Owner (`.bt-navgrp`,
  `syncNavHeads()` hides a heading with no visible items); Timesheets moved from the footer into Team & pay.
  Salary / Commission no longer carries the Reports tab bar, and Reports' tab bars no longer have a Salary tab.
  Remaining steps (owner said go ahead; do one at a time): one Quotes & estimates screen; one Receipts & invoices list;
  Lookup (Lishi + Programmers + Keycodes) as tabs; Team & pay tabs; Dashboard into Reports; pay rules into Settings.
- **Menu scroll fix** (owner's phone screenshots): the whole side menu is now one scroller (it was only the middle list), with
  bottom padding that clears the phone's bottom bar — Settings was unreachable in portrait, and in landscape only the footer
  showed. Check script kept at `tools/qa/rebuild-menu-test.js` (port 8091).
- **getbittings.com:** new section `#master-keys` "Coming soon — Master key systems and pin charts" with two teaser pictures
  (`site/assets/soon-*.webp`, from the mock) and a "Tell me when it is ready" button that pre-fills the request note.

### 2026-11-13 (Hardware → Settings; residential / commercial research) — LIVE, committed 9c8ab25
- **8z99:** printers / scanner / cash drawer / labels panel is now **Settings → Printers & scanner** (step `hardware` in the
  setup STEPS list); the 🖨️ Hardware button left the Inventory toolbar.
- Residential / commercial trade + master-key calculator: **research and plan only** — `docs/RESCOM_PLAN.md`,
  `docs/research/master-keying-research-2026-11-13.md`, `docs/keyway-spec-request.md`, on-screen mock
  `bittings-unified/mock/master-key-calculator.html` (temporarily at bittings.app/mock/master-key; the next publish removes it).
  Owner is collecting manufacturer specs; nothing is built.

### 2026-11-13, early (receipt name, deposit slip print, website videos) — LIVE, committed 4997297
- **8z97 receipt:** when the logo prints, the shop name line under it is left out (`tokens()` / `helperLines(r, logoPrinted)`
  in `app/hardware.js`; the name is still printed when there is no logo). Owner request with a photo of the paper.
- **8z98 Closeout → "🖨 Print deposit slip"** (`printDepositSlip` in index.html; `TKS_HW.thermal.printLines(lines)` new in
  hardware.js — posts to the helper's `/receipt`, never opens the drawer). Slip: shop + address, DEPOSIT SLIP, date, count
  by denomination, total / less float / CASH TO DEPOSIT (big), today's checks + cash-and-checks total, expected and
  over/short, counted by, printed time, signature + bank lines. Checks come from the day's payments
  (`lastCloseout.checkCents/checkCount`). Test: `tools/qa/rebuild-deposit-print-test.js`.
- **Videos on getbittings.com** (`#watch`): "At the shop counter" (1:29) and "Mobile tech in the van" (1:14), 1920×1080
  MP4 + poster + captions in `site/assets/video/`. Mock shop **Ironwood Lock & Key** (owner: "don't use my data").
  How to remake them: `bittings-unified/tools/site-media/README.md`. Voice = Windows built-in "Mark"; the owner may want a
  better voice (his own recording, or a paid voice service) — not decided.

### 2026-11-13, early (getbittings.com feature pages + Google) — LIVE, not committed yet
- Owner: each "What it does" box clickable with its own page, big PC / tablet / phone screenshots, large sample numbers
  like the shop's own year, "always updating / more features coming", then index the site on Google.
- `bittings-unified/site/`: 8 pages (`key-lookup`, `key-inventory`, `quotes-scheduling`, `register-payments` (PC + tablet
  only — the register is not for phones), `nastf-d1`, `reports-pay`, `team-time-clock`, `phone-tablet-pc`), shared
  `site.css`; index cards are links ("See it →"); new `#updates` section "Always getting better" (+ one line in Plans).
- Pictures `site/assets/f-<slug>-<pc|tab|phone>.webp` = the real app on the stand-in cloud with made-up data ("Your Shop",
  made-up staff/customers, ~$250k / ~1,300 payments for the year — sized like the owner's 2026 ~$234k / 1,273, not his
  data). Made by a scratchpad Puppeteer script (stubs TKPay.dayTransactions, payroll_paid, commission_day_rows,
  timesheet_rows, TKS.Fleet.staff; switches screens by clicking the menu — `show()` alone leaves Scheduler/Timesheets "Loading…").
- SEO: `sitemap.xml` (9 URLs) + `robots.txt`; every page has a canonical; only legal.html is noindex.
- **Google Search Console** (owner's Google account): URL-prefix property `https://getbittings.com/`, verified by the
  `google-site-verification` meta tag in `site/index.html` (**do not remove it**); sitemap submitted (9 pages found);
  indexing of the home page requested. Google decides when it appears (days to weeks).

### 2026-11-12, midnight (website moved to getbittings.com; app stays on bittings.app) — LIVE, not committed yet
- Owner: "upload the site to getbittings.com and have the app run on bittings.app".
- The marketing pages left the app: `bittings-unified/welcome.html` → **`bittings-unified/site/index.html`**, `legal.html` →
  `site/legal.html`, pictures `app/assets/site/` → `site/assets/`. Log in links go to `https://bittings.app/signin`.
  `publish-staff.mjs` no longer copies them.
- New Cloudflare Pages project **`getbittings`** (created with `wrangler pages project create --force`; without --force
  wrangler 4.161 tries to make a Workers project and fails). Deploy: **`node website/_tools/deploy-getbittings.mjs`**
  (copies site/ + the app icons, writes `_headers` and `_redirects`: /welcome → /, /signin and /login → bittings.app/signin,
  /terms and /privacy → /legal#…; refuses to deploy if a Log in link points inside the app folder).
- Cloudflare changes (owner's account, through the browser): custom domain getbittings.com moved from project `bittings-app`
  to `getbittings` (API); DNS CNAME `getbittings.com` → `getbittings.pages.dev` (was bittings-app.pages.dev); the redirect
  rule on the getbittings.com zone ("all to bittings.app") now only sends **www.getbittings.com → https://getbittings.com**
  (renamed "www to getbittings.com"). www's CNAME still points at bittings-app.pages.dev — harmless, the rule answers first.
- The app (`deploy-app.mjs`) now writes `_redirects`: /welcome, /legal, /terms, /privacy on bittings.app → getbittings.com.
- **Founder prices** (owner confirmed): regular $69 / $129 / $199 shown crossed out, founder $19 / $79 / $149 for the first
  shops, kept while the plan stays active (also in legal.html Terms §3). Inquiry only — nothing billed; Stripe later.
  The home page no longer has `noindex` (search engines may list it); `legal.html` still has it (draft wording).

### 2026-11-12, late night (cash change · sales tax worksheet · services never taxed · landing page part 2) — LIVE, not committed yet
- **8z94 Cash at the Register** (owner: "it didn't give me the opportunity to fill in how much the customer gave me"): Cash now
  opens `uiCashTender(totalCents)` (index.html) — amount handed over, one-tap amounts (Exact / next $1 / $5 / $50 / $100),
  change shown before the sale is recorded; too little cannot be confirmed; the change stays on screen after the sale
  (`#chgChangeBig`). Nothing new is stored and the card path is untouched. Not on the paper receipt yet. Test: `rebuild-cash-test.js`.
- **8z95 Reports → "Sales tax worksheet"** (owner: "break it down by category between keys, accessories, services … to file
  sales tax every month"): `repBreakdown` (index.html) sorts every sale line into the stock list's top category (Keys,
  Accessories…), "Services / labor", "Other parts / materials" or "Not itemized"; columns Sales / Taxable / Not taxed; then
  the return figures (total − not taxable − exempt = taxable; tax collected; a check against the shop rate with a warning when
  they differ by $1+); `⬇ Sales tax file` (`repTaxCsv`) = category + sub-category table and every line. Test: `rebuild-taxcat-test.js`.
- **8z96 Services / labor are never taxed** (owner: "there are no taxable services/labor it all should be no tax"). Cause of a
  taxed "Car lockout" on 2026-11-12 (`rcpt_mwds0ek2em7pn`, $6.47 tax on $75): `presetTaxable()` in the builder matched the word
  "lock". Now: `taxAllowed(category, partId)` + `svcTaxOn()` (bittings.html and index.html); only Materials / a stock part can
  be ticked taxable, and the builder also enforces it when it reads the rows (a document that is already PAID keeps what it
  charged). Register: custom service has no "Taxable line" box; catalog services are untaxed whatever their saved flag says.
  Settings → Tax shows only Materials; `mergeConfig` (store.js) forces Labor / Travel / Programming / AfterHours to false.
  A job line ticked "Taxed part" in the Scheduler arrives on the invoice as Materials. Escape hatch for a future shop in a
  state that taxes labor: `config.taxServices` (no screen). The Reports worksheet also counts services as not taxable whatever
  an old / imported line says (most imported "taxable labor" lines were never actually taxed).
  NOT done: the server (`pos_checkout`) still trusts a custom line's `taxable` flag — the client no longer sends true for services.
- **Landing page part 2**: `welcome.html` has a "One login. Every screen." section (CSS laptop / tablet / phone frames with real
  app screenshots: `app/assets/site/shot-pc-inventory-dark.webp`, `shot-tablet-register-light.webp`), the contact email
  **support@bittings.app** (no phone, no address — owner's instruction), and footer links to the new **`legal.html`**
  (`#terms`, `#cancellation`, `#privacy`). Both pages are in FILES in `publish-staff.mjs`, both `noindex`, nothing links to them.
- **`legal.html` is a DRAFT, not reviewed by a lawyer.** Owner decisions baked in that he has not confirmed: legal name shown as
  "Turbo Keysmith LLC"; full refund of the first payment within 30 days; no part-month refunds; read-only 30 days after
  cancelling then deletion within 90; unpaid → read-only at 14 days, closed at 45; liability cap = 12 months of fees;
  Oklahoma law / Oklahoma County courts; 30 days' notice of price or terms changes.
- **support@bittings.app** — set up in the owner's Cloudflare account (Email Routing, through the browser on the shop PC; the
  deploy token cannot see the zone): rule support@ → the owner's existing verified inbox, MX + SPF records added (verified
  by DNS lookup). Receive-only: replies go out from the owner's own mailbox unless "send as" is set up. Not yet proven with a real email.

### 2026-11-12, night (Bittings landing page, first build: `welcome.html`) — LIVE at bittings.app/welcome, not committed yet
- Owner shared a mockup ("Bittings Website@2x.png") and asked for price points + "start building this".
- `bittings-unified/welcome.html`: one self-contained page (no app code). Hero per the mockup, What it does (8 cards), Plans,
  Questions, Request access. Dark by default with a Light mode toggle (`bt_site_theme`). Added to FILES in `publish-staff.mjs`.
- The two phone pictures are real app screens with made-up data: `app/assets/site/shot-keys-dark.png`, `shot-home-light.png`
  (made by a Puppeteer script against the stand-in cloud; re-make them the same way if the app's look changes).
- **Request access** posts to the public function `submit_web_lead` for the TK shop → shows up in the owner's Leads list with
  service "Bittings access request · <plan>". No new server code.
- **Prices on the page are a SUGGESTION the owner has not confirmed**: Lookup $19, Starter $79 (2 users, +1% on cards as
  `pay-create-intent` already does), Pro $149 (5 users), extra user $20. Benchmarks: Omega LockSync (Key Innovations' launch
  partner) $129 for 1 user / $199 for 3, +$25 a user; KeyBolt about $59–$99; Jobber $49–$199; Housecall Pro $79–$329.
- NOT built: any subscription billing, sign-up, or per-plan user limits — plans are still set by hand per shop (`app/tier.js`).
- The page is `noindex` and nothing links to it yet. Making it the front door (signed-out visitors / getbittings.com) is the
  owner's call. Not yet seen on a real phone.

### 2026-11-12, evening (📁 NASTF folder: D1 photos + receipt PDF, one folder per customer and vehicle) — LIVE, not committed yet
- Owner: "set up a NASTF folder … it downloads the PDF and images to that folder and adds each customer to their own file, so I
  can just drag the whole file over to NASTF. Customer's last name and last 6 of the VIN as the file name."
- D1 photo box (`app/receipt-docs.js`): each file has **Download**; **📁 Save to my NASTF folder** (Chrome / Edge on a
  computer — the folder is picked once and remembered in IndexedDB `tks_fs`) writes `<folder>/<Lastname>_<last 6 of VIN>/` with
  the receipt PDF, the licence and that vehicle's proof of ownership — one folder per D1 vehicle; **Change folder** picks
  another. Where a browser cannot write into a folder (phones, Safari, Firefox) the same set is one zip with that name
  (`zipBlob`, stored not compressed). Name rules: `folderName(r, idx)` — vehicle owner's name on a contracting D1, company
  suffixes dropped, receipt number when there is no VIN.
- **Tested:** `rebuild-d1-test.js` (16 checks, stand-in folder). **Not tested:** the real folder picker on the shop computer.

### 2026-11-12, end of day (fits lists for 132 keys · D1 tag and miles are typed, not photographed) — LIVE
- **Fits lists (8z91).** Owner: "find me the fitments" (links come later, once he has checked the vendors). 141 keys had no
  fits list. 132 were filled, only where the list was empty (`supabase/phase8/8z91_fitments_from_titles.sql`, undo = blank those
  ids): 56 straight from the supplier's own description (model + years in the key's name), 20 with the model list of a
  same-FCC-ID key already in stock cut to the years in the name (**to be checked by the owner**), 56 with make + years only
  (they show under "might fit"). 9 universal keys (Autel IKEY, Xhorse) were left blank on purpose. Nothing was looked up on the
  web — no vendor page was read. 417 of 426 keys still have no website link.
- **D1:** the plate and the odometer are typed (required since 8z90), so their photo slots and the "License Plate photo /
  Odometer Reading photo" checklist lines are gone. Photos = driver's licence, proof of ownership, anything else.

### 2026-11-12, late afternoon (Register ticket · receiving is assigned · automatic key prices · one-tap reprice · D1 form + photos) — LIVE, not committed yet
- **Register ticket (8z85).** Owner: "the select-customer box covers the product description." The ticket table could not
  shrink and slid under the customer box. SKU now sits under the description (one column fewer), the ticket can never be
  wider than its column, and under ~1100 px the customer box drops below the ticket.
- **Receiving has to be assigned (8z86).** Owner: "it gave him the option without me telling him he can. I need to assign
  the receivables to him." Inventory → 📥 Receive: the owner / a manager picks the person (+ optional note); the Receive
  tab and "+ Add" open on that login until they tap **Finished**; the owner then sees what was booked in. Server:
  `receive_tasks`, `receive_task_assign / _close`, `receive_tasks_list`; `inv_add_new` refuses a non-manager with no
  open task. **Not changed:** receiving more of one existing item from its stock panel (📍 → Receive) is still open to
  technicians (8z9, owner's earlier request) — say the word and it gets the same gate.
- **Automatic key prices (8z87).** Owner asked for a percentage: he had been at about 5× cost (80% margin; his medians:
  smart key cost $55 → $222.50, remote-head $25 → $115, transponder $7 → $25) and found it too high once programming, the
  service call and travel are added. Suggested and set as the starting point: keys (remote-head, flip, transponder,
  remote) = cost + 150% (2.5×, 60% margin); smart keys = cost + 200% (3×, 67% margin); rounded up to the next $5; never
  under $25 / $75. All in Settings › Inventory › Automatic key prices. On the new-item form the price fills itself from
  the cost; a price typed by hand is never overwritten (one-tap "Use $X").
- **One-tap reprice (8z89).** Same block: "Change every key's price to these rules…" → shows how many go up / down, a
  list, a file — nothing changes until confirmed; then all at once (`inv_reprice_apply`), with **Undo**
  (`inv_reprice_undo`, leaves alone any price changed by hand since). Keys with no cost are skipped and counted.
- **D1 form (8z90).** Owner: color, miles and tag # are required ("no tag / no miles can be selected, but it has to be
  selected"), in the builder AND at the Register; each extra vehicle is asked "NASTF D1 for this vehicle?" Yes / No, with
  its own three answers; licence + proof of ownership (one per D1 vehicle) are filed against the receipt
  (`receipt_docs` + private bucket `receipt-docs`, 8z88). On a computer the receipt shows a **QR code** — a phone signed
  in to Bittings scans it and lands on that receipt's photo page (`bittings.html?docs=<id>`) — plus "Upload from this
  computer"; on a phone it is a camera button. Photos do NOT block the sale (a failed upload in the field must never
  stop a job); the box says in red what is missing.
- **Found, not fixed:** Settings → Time clock "Enable the time clock & lock" is never saved (`TKS.Config.save` ignores
  the `timeclock` group). Left alone on purpose: fixing it would let the counter computer start locking after 5 idle
  minutes while nobody has a 6-digit PIN yet. Decide with the owner.
- **Owner's note for later:** many imported keys are missing their website link and "fits" list — do last.
- **Tested:** `rebuild-d1-test.js` (12), `rebuild-stock-add-test.js` (36), every older suite, sweep 0; database trials
  on the QA shop for 8z86 / 8z88 / 8z89 (rolled back). **Not tested:** a real photo upload, the QR scan on a real phone,
  the Register D1 sale end to end, a real bulk reprice.

### 2026-11-12, mid-afternoon (🚗 more than one vehicle on a document and on a job) — LIVE, not committed yet
- **Owner:** "we need to be able to add a 2nd, 3rd vehicle … a couple that come in for multiple different vehicles, or we
  go to them and do multiple cars."
- **Quote / invoice / receipt:** "➕ Add another vehicle" under the vehicle. Each extra vehicle has its own year / make /
  model, VIN look-up, free-text description and its own **key list** with prices. Once there are two or more vehicles
  every line asks "For which vehicle?" (a key added from a vehicle's list is already tied to it; a typed line starts as
  "the whole job"). The printed copy, the PDF and the paper receipt list every vehicle and add the vehicle after each
  line that belongs to one. Removing a vehicle hands its lines back to "the whole job".
- **Scheduler job:** "➕ Add another vehicle" on the job form (year / make / model / VIN each); the card shows them; they
  travel estimate → job → invoice.
- **Not done:** the job form's key picker (which reserves keys for the van) still works for the FIRST vehicle only —
  keys for the others are added on the invoice. NASTF D1 paperwork is still for the first vehicle; a second D1 vehicle
  needs its own document. Job charges do not remember which vehicle a line is for (the invoice does).
- **Tested:** `tools/qa/rebuild-multiveh-test.js` (13 checks) + every older suite. **Not tested:** on a real phone.

### 2026-11-12, mid-afternoon (🖨 Receipts tab + logo · estimates that were converted · Reorder · wages by pay day · 📥 Receive task) — LIVE, not committed yet
- **Receipts tab prints on the receipt printer too.** The owner found that Print inside the app's Receipts tab still
  opened a PDF (that tab uses its own copy of the print code, `app/receipts-engine.js` + `receipts-view.js`). One shared
  routine now: `TKS_HW.printDoc`. Every row has 🖨 Print; so does the opened receipt and the read-only viewer. That copy
  of the print code also learned tax-exempt and In shop (it did not show them).
- **Logo on the paper receipt** (owner: "how can I print my logo on the receipt?"). The shop logo from Settings is
  cropped to the artwork, turned solid black (a thermal printer has no grey) and drawn above the text. On by default;
  switch: Inventory → 🖨️ Hardware → "Print the shop logo at the top of the receipt". **The counter computer's print
  helper was updated for this** (`helper.js` + `print.ps1`, backups `*.bak-20261112*` beside them). `print.ps1` gained
  `-Action preview` (draws the receipt into a PNG instead of on paper) — the layout was checked that way on the real
  Star driver before switching it on. **Not yet seen on paper.**
- **A converted estimate disappears** (owner: "if it has been converted then we don't need to see it again"). An estimate
  that became an invoice / receipt (`fromEstimate`) is no longer listed in the Receipts tab, History or Estimates. The
  record is kept and comes back if that invoice is deleted. Jobs billed from a scheduled estimate carry `fromEstimate` too.
- **Duplicate service removed** (owner): "Push-to-start programming" — same thing as "Smart / proximity key programming"
  ($125). Taken out of the shop's list (33 → 32 services) and out of the built-in catalog.
- **Reorder** (owner: "I have things at 0 quantity … it says nothing to reorder"): no item had a low-stock point, so
  nothing ever counted as low. Out of stock now always counts (`TKS.Inventory.isLow`); 98 items at zero show OUT and
  appear on the Reorder list.
- **Wages in Reports count on the pay day** (owner: "no wages for last month"): he had marked eleven past periods paid
  in one sitting on 11 Nov, so all landed in November. `payroll_paid` now uses each period's pay day (8z79b):
  October shows 2 periods ($2,477.75), November 1 ($1,346.50).
- **📥 Receive task** (owner: "how can Jayden receive inventory and add keys we don't have … I need him to be able to
  edit prices and cost when adding keys. I want it as a task like Reconcile"). Inventory → **📥 Receive** tab (all staff):
  search an item → type how many came in → Receive; "➕ New item" opens the full form — name, price, cost, manufacturer,
  supplier, website link, what it fits, quantity — also for a technician (server `inv_add_new`, 8z83 / 8z83b). The same
  SKU cannot be added twice. On items that already exist a technician still cannot change name / price / cost / quantity.
  An item added without a price shows **NO PRICE** in the stock list.
- **Tested:** `rebuild-print-test.js` (24), `rebuild-stock-add-test.js` (17), every older suite, database trials (8z79b
  on the shop's real pay records read-only-style in a rolled-back transaction; 8z83 / 8z83b 12 cases on the QA shop).
  **Not tested:** any of it on a real phone; the logo on real paper; a technician's real login adding a real key.

### 2026-11-12, afternoon (🖨 paper receipt from the Receipts screen) — LIVE, not committed yet
- **Why:** the owner made an estimate, turned it into an invoice, took a card payment (receipt TKS-2026-1112C, $325, paid,
  first real tax-exempt sale) and could not print it: only the Register could reach the receipt printer; the Receipts /
  invoice screen could only save or send a PDF.
- **Now:** 🖨 **Print** on the finished document, on both "payment went through" boxes and on every History row. If the
  computer has the Bittings Print Helper (the counter computer with the Star printer) it prints there — even when
  "thermal" was never switched on in Hardware settings. On any other computer it says there is no receipt printer and
  offers the full-page PDF for that computer's own printer. The cash drawer opens only for cash / check paid in the last
  10 minutes, never on a reprint. The slip now names the document (Receipt / Invoice / Estimate) and carries the
  vehicle, VIN, In shop / Mobile, "Tax EXEMPT" with the exemption, the warranty line and the customer note.
- **Tested:** `tools/qa/rebuild-print-test.js` (13 checks, stand-in print helper). **Not tested:** on the real counter
  computer and printer.
- **First real try failed (owner: "it's printing as a PDF, not to the Star printer"). Two causes, both fixed 13:15 CST:**
  (1) the button asked the helper for `/status` first and gave up after 3 s — on the counter computer that check alone
  takes ~2.8 s (it starts PowerShell), so it always fell back to the PDF. It now sends the receipt straight to
  `/receipt`; only "nothing listening on this computer" offers the PDF. (2) The helper installed on the counter computer
  was the old copy that refuses `https://bittings.app`. It was replaced with the repo copy over WinRM and restarted
  (old file kept as `C:\ProgramData\BittingsPrint\helper.js.bak-20261112`); checked: answers bittings.app and
  turbokeysmith.com, refuses any other site. **Still not seen printing from the Receipts screen on the real printer.**

### 2026-11-12, early afternoon (🏛 tax-exempt sales · 🏪 In shop · 📋 Estimates list · 💵 pay in Reports) — LIVE, not committed yet
- **Tax exempt** (owner: "get tax exempt as an option with whatever we need … to be compliant"). A **Tax exempt** button on
  every quote, invoice and receipt, and on a Scheduler job's charges. It records the customer's certificate once and
  offers it again next time. While it is on, the document's tax rate is 0 and the document carries a snapshot of the
  certificate; the printed copy and the PDF say EXEMPT with the permit details and the certification wording.
  What it asks for follows the Oklahoma rules (OAC 710:65-7-6 to 7-17, read 2026-11-12 from the Cornell LII copy):
  resale = name, address, type of business, permit number, signature · exempt organisation = letter / card photo + signed
  statement · 100% disabled veteran = the card seen at every sale (tick box), photo or name / address / number ·
  agricultural / manufacturer permit · other. The paper must be in hand within 90 days of the sale: Settings → Sales tax
  lists every certificate, what is still owed and the days left; the owner can mark "I checked this permit" (OkTAP
  look-up) or withdraw one. Nothing is ever deleted. **Reports** has a "Tax-exempt sales" card and a file for the return.
  **Not done: the Register.** Its checkout takes the tax rate from the server (8b, on purpose), so an exempt counter sale
  goes through Receipts / an invoice for now. Adding it means changing `pos_checkout` — do that with the owner present.
  **Not legal advice** — the owner should have his accountant confirm the wording and how long to keep records (the
  retention period was not in the pages read).
- **In shop / Mobile** on a quote, invoice, receipt and on the job form (owner: "select in shop on the estimate if a
  customer calls and says they will be coming into the shop"). Optional. Prints "Service: In shop — <shop address>";
  the job form hides the address; the job card says "🏪 In shop".
- **Estimates list** (owner: "see all the estimates we created and be able to edit or add to schedule easily"). Menu →
  📋 Estimates (also a button on the Receipts home). Every estimate with **📅 Schedule** and **✏️ Edit** first (any role),
  search by name / phone / number / vehicle, and "📅 On the schedule <date>" once a job was booked from it.
- **Pay in Reports** (owner: "add salaries and commissions paid including employees and contractors"). A card under the
  profit card: hourly wages marked paid in the period (owner only), commission earned, contractors marked paid, total,
  and "Left after pay" = profit − wages − commission (contractors are already taken off the profit, not twice).
- **Tested:** `tools/qa/rebuild-exempt-estimates-test.js` (37 checks) + database trials on the QA shop (8z78: 18 cases,
  8z79: 5 cases, rolled back) + every older suite + dark-mode sweep 0. **Not tested:** on a real phone; a real photo
  upload of a permit (the storage rules were only checked to exist); the camera on iPhone / Android.

### 2026-11-12, midday (🔢 My PIN for everyone · clock in by PIN on the shop computer) — LIVE, not committed yet
- **Why:** the owner marked the shop computer (rule in force 11:31 CST) and then reported "he doesn't have a settings to add
  a PIN". Two gaps: "My PIN" was only in Settings → Access & managers, which a technician cannot open; and the shop computer
  had no quick way to clock a technician in — the lock screen answers a not-yet-clocked-in teammate's PIN with "start the
  day with a full login", so the only way in was signing the computer out and in again with e-mail + password.
- **My PIN** is now in the menu (🔢) for every signed-in person: 4 digits for staff, 6 for manager / owner. A technician's
  phone that cannot clock in offers "Set my PIN" when he has none.
- **Clock in by PIN** on a marked shop computer: a button in the top bar (whoever is signed in — the computer stays signed in
  as it was) and on the lock screen (type PIN, press ✓). Server: `shift_clock_in_pin` (8z77) — shop computer only, 5 wrong
  tries per 5 minutes, clock-IN only. Clock-out is unchanged (own phone or own login).
- **At the time of writing nobody at Turbo Keysmith had a PIN** (owner and technician both without). The technician sets
  his from his phone: menu → My PIN.
- **Tested:** `tools/qa/rebuild-pinclock-test.js` (19 checks) + database trial on the QA shop (18 cases, rolled back).
  **Not tested:** on a real phone or the real shop computer.

### 2026-11-12, late morning (🔑 keys on the Quick quote · ⏱ technicians clock in at the shop only) — LIVE, not committed yet
- **Quick quote: pick a vehicle, see the keys.** Choose year / make / model (or type a VIN) on a quote, invoice or receipt and
  a "Keys for <vehicle>" box appears under it: every key in stock that fits, grouped (smart keys, flip keys, remotes,
  transponders…), with OEM / aftermarket, FCC ID, chip, SKU, how many are on the shelf and the shelf price. "+ Add" puts the
  key on the document as a line at that price. Keys that only list the make and year are held back under "might fit".
  Above the list: what the shop's own vehicle reference says (keyway, chip system, how it is programmed, NASTF / OEM-only).
  It is the Scheduler's matcher, moved to one shared place (checked on the real stock list: 1,260 look-ups, identical results).
- **Technicians clock IN on a shop computer only; clock OUT anywhere** (owner: "cannot be done on mobile … they can clock
  out on their phone, but never in"). Enforced by the database, not just the button. Owners, managers and front desk are not
  affected. The rule is switched on for Turbo Keysmith.
  **IN FORCE since 2026-11-12 11:31 CST: the owner marked the shop computer ("Workstation · Win32", confirmed in shop_devices).** How a computer is marked: on that computer, sign in as owner → Settings → Time clock &
  lock → tick "This device is a shop computer". Until then phones keep working (otherwise a technician could not clock in at
  all). The mark is per browser and per address (turbokeysmith.com/staff and bittings.app are separate) — mark the one the
  shop computer actually uses. Clearing that browser's data removes the mark; tick it again.
- **Tested:** `tools/qa/rebuild-quotekeys-clock-test.js` (24 checks) + the database rule trial on the QA shop (14 cases,
  rolled back) + every older suite. **Not tested:** on a real phone; with a real marked shop computer.

### 2026-11-12, mid-morning (🔗 pay-by-link) — LIVE, waiting for the owner's one real test payment; not committed yet
The owner: "send a link for payment when out in the field … just do a link for mobile and keep the surcharge for the shop."
- **What staff see.** Pay Now on an unpaid invoice has a third way: **🔗 Send link**. "Create pay link" → the link, a green
  "💬 Text it to (405) …" button (opens the phone's own text app, addressed to the customer, message written), Share… and Copy.
- **What the customer sees.** A small page (`pay.html`: shop, invoice number, amount, one Pay button) and then **Stripe's own
  checkout page**. The card number never touches Bittings. After paying: "Paid — thank you".
- **No 2% surcharge on a link** (owner decision). The reader and typed card keep it. Reports count a link as a card payment
  with the typed-card fee rate (2.9% + 30¢ by default).
- **The invoice marks itself paid.** Stripe tells the server (`stripe-webhook`), which writes the payment and marks the
  invoice paid; phones pick it up on their next refresh and the stock catch-up takes the parts off. The sheet does not need
  to stay open. The link never expires, always charges the invoice's current total, and shows "Paid" once it is paid.
- **Safety.** A link carries a key only the server can make (a guessed invoice number shows nothing). Money can only be
  recorded against an invoice of the shop whose own Stripe account received it. The webhook change is an addition that only
  runs when no payment row exists for the payment AND it was made by a pay link; the reader / typed-card path is unchanged
  (the live webhook was downloaded first and was identical to the repo copy).
- **Tested:** `tools/qa/paylink-unit-test.mjs` (17 checks on the server code itself) and `tools/qa/rebuild-paylink-test.js`
  (17 browser checks with a stand-in for Stripe); live: guessed links refused, sign-in needed to create, only our two addresses
  may call it, the pay page works on both addresses. **NOT tested: a real payment.** That needs the owner: make a $1 invoice,
  Pay Now → Send link → pay it with his own card, then check the invoice turned to Paid and the payment is in Reports.
- **Not done:** Apple Pay / Google Pay appear only if they are switched on in the shop's Stripe settings; a link payment for
  an invoice that was edited after the customer opened Stripe's page charges the amount shown at that moment; texting goes
  from the phone's own number (no texting service).

### 2026-11-12, morning (💰 true profit · ⚡ job form freeze · ▾ pick-lists · bottom bar) — LIVE, not committed yet
The owner did a job from the Scheduler, took payment as "Other", and reported three things from his phone. All fixed and live
(version `1bc9e323b260`), tested with `tools/qa/rebuild-profit-test.js` (19 checks) plus the seven older suites and the dark-mode sweep.
- **Profit was the same as sales ($445 shown, $400 true).** A key added to a job in the Scheduler reached the invoice with no cost,
  so the payment was recorded with no cost. Fixed in three places: the job hands the key's cost to the invoice; the invoice builder
  fills a stock line's cost from stock when it has none; and the **database** now fills it in when any payment is recorded
  (`supabase/phase8/8z74_sale_cost_from_stock.sql`, applied live — needed because a technician's device is never sent costs).
  The three sales already affected (11–12 Nov, all the owner's, $85.50 of cost in total) were corrected.
- **Card fees now come off profit.** Reports → "How the profit adds up": sales − parts cost − card fees (+ the 2% surcharge
  collected) − contractors = profit. The fee is an **estimate** (Stripe's standard 2.7% + 5¢ on the reader, 2.9% + 30¢ typed);
  the rates are in Settings → Payments. The app does not read the exact fee back from Stripe. Cash / check / other: no fee.
  The export has a "Card fee (estimated)" column. "Net revenue" (which ignored fees) is gone — one profit figure now.
- **"After you select the vehicle it becomes extremely slow."** The vehicle-to-stock match re-read and re-parsed the whole saved
  keyway table thousands of times per look-up (`app/fitment.js catalog()`). Now cached. Measured with the shop's real 525-item
  stock list and the CPU slowed 6x: picking the model went from 20.9 s frozen to 0.5 s; "+ Add" on a key from 37.6 s to 0.7 s.
  This also speeds the "fits this vehicle" filters in Inventory, the Register and the invoice part picker.
- **"The drop-down box isn't working."** The service boxes (Scheduler charges; invoice / quote lines) used the browser's own
  suggestion list, which does not open on Android. Both now have our own tap-to-pick list with prices.
- **Receipts page bottom bar** had its own fixed six tabs (Schedule twice). It now shows the same tabs as the main app
  (the person's own picks) and "More", which opens the main app with the full menu out.
- **Shop hours on the public site (from another chat).** A cloud session had added the walk-in hours (Mon–Fri 10–6, Sat 12–5,
  closed Sun) to every page footer, the contact page and the Spanish home page, but only on GitHub (branch
  `ccr-72a5eb80-691dv0`, based on `main`) — a cloud session cannot deploy. Checked against the hours saved in Bittings (same),
  cherry-picked here as `dda1604`, deployed. Address is 9201 N Council Rd, Suite A on all 238 pages and in the structured data.
- **Found on the way:** with no chart library (offline) Reports crashed the second time it was drawn. Fixed.
- **Not done / to know:** not checked on a real phone; the fee is an estimate; the cost rule uses the stock item's current cost
  (not a per-key purchase cost); a fully refunded card sale's fee is not counted.

### 2026-11-12, later (📥 website leads · 💾 nightly backup · ⚠ error log · offline)
- **Website leads have their own spot.** The contact form on turbokeysmith.com (English and Spanish) now also sends
  each enquiry to Bittings. Menu → **Leads** shows them (with a count of new ones) and each lead has **📅 Add to
  Scheduler** (opens a new job already filled in), **💬 Quote** (opens the Quick quote with the person filled in),
  **📞 Call** and **✕ Dismiss**. The e-mail to the shop still goes out as before. A lead is not a customer until it
  is booked or quoted. *(New database table `web_leads`; the form can only add a lead, never read anything.)*
- **The database is now backed up every night.** Checked 12 Nov: the cloud plan has **no backups of its own**. A copy
  of every table is saved to `D:\Work\Backups\db` on the office PC at 2:30 AM (Windows scheduled task "Bittings
  database backup"); the newest 30 and the first of each month are kept. Part photos are not included. It is on the
  same PC — copy the folder elsewhere now and then. Upgrading Supabase to Pro adds real daily backups (recommended).
- **An error log the owner can read.** When something goes wrong in the app on any device (a script error, a failed
  save), it is written to **Activity → ⚠ Errors** with who, when, which screen and what happened.
- **A visible "🔄 Update" button** at the top of the app (next to Sign out) and on the Receipts page: gets the newest
  version and re-syncs. ("Update app" is also still under More.)
- **Opens with no connection.** After one normal visit, the app and the Receipts page open offline and show the last
  saved jobs, stock, customers and documents. Online it always loads fresh. A change made offline is kept and sent
  when the connection returns — **as long as the page stays open** (closing it first still loses the change).
- **Reports → ⬇ Export**: the period on screen as a CSV file for the accountant (one row per payment: sale, tax,
  surcharge, collected, refunded, cost, document number, customer).
- **Fixed a mistake from earlier the same night:** every **Year** dropdown (Quick quote, Scheduler job form, Register,
  Inventory) was empty for a few hours on 12 Nov. The change that let 2027 be picked had left a note on the same line as
  the code that fills the list, which switched that code off. Found from the owner's report, fixed, and a test now checks it.
- **Not built:** pay-by-link (texting a customer a link to pay). It needs new Stripe work that cannot be tested without
  a real payment — to be done with the owner present. Texting from the app was left out on purpose.
- Status: tested on this PC with a stand-in for the cloud; the lead function and the backup were run against the
  live cloud (test lead in the QA shop, then removed). **Pending sign-off on real devices.**

### 2026-11-12 (🛡️ seven till risks fixed)
The module-by-module review listed ways money, stock or customer data could go wrong. The owner said "fix them all".
None of these needed a database change.
- **A card sale that was paid but never took its parts off stock is now caught up.** (Late tap, closed tab, lost signal.)
  Any signed-in device checks for such sales a few minutes after they are paid and takes the stock, once. Imported
  history is never touched. *One real case from 11 Nov 3:12 PM (a Register card sale) predates the fix — check that part's count by hand.*
- **Stock counts that stick.** Signed in, the ± buttons on the stock list open "Stock by location" (Receive / Adjust)
  instead of changing a total the cloud later wiped; the part page's quantity box is read-only for a part that already
  exists; saving a part never writes a count.
- **"Mark as paid" records a real payment.** On a customer's unpaid invoice and in Receipts → History it now asks how it
  was paid (Cash / Check / Zelle·app / Other / Card) and records it, so the money shows in Closeout, Reports and
  commission. Card opens Pay Now on that document.
- **The cash drawer opens only for cash and check sales** — not for card sales, reprints or previews. Opening it by hand
  from Hardware settings is now written to the activity log.
- **Abandoned Register tickets are no longer shown as documents**, and an unpaid or part-paid receipt is tagged
  UNPAID / PART PAID instead of PAID.
- **A new customer with the same name as an existing one asks first** ("Update them" / "Add as new") instead of silently
  replacing that person's phone, email and address.
- **Register tax follows each service's own tax setting**, and saving Settings no longer drops that setting.
- **Dark mode is readable everywhere** (owner: "white backgrounds with silver writing — you can't see it"). The dark theme
  keeps many cards and pop-ups white on purpose; some of them were getting the dark theme's pale text (white on white —
  e.g. the headings in "Stock by location"), and text sitting on the dark page was getting the light theme's dim grey
  (Sign out, Home, counts, the phone bottom bar). Fixed for the known cases, plus a safety net that checks every piece
  of text in dark mode against what is behind it and darkens / lightens the same colour until it can be read — so
  pop-ups and screens nobody listed are covered too. A sweep of every screen and the main pop-ups went from about
  100 hard-to-read spots to none (phone) and one borderline status pill (computer). Light mode is unchanged.
- **The Receipts list draws 60 documents at a time** with "Show more" (it used to draw all ~1,800 on every change);
  search still looks through all of them.
- Status: tested on this PC with a stand-in for the cloud (owner login, phone size); **pending sign-off on real devices.**

### 2026-11-11 (🌐 Bittings gets its own address · 💳 card money goes straight to the shop)
- **⚡ The app opens fast now (late evening rebuild).** Before, every screen change downloaded every receipt, every part,
  every customer and every job again and waited for it; the Receipts page did the same all over again. Now each device
  keeps the last copy the cloud confirmed, opens from it straight away, and catches up in the background (only receipts
  that changed are fetched). The copy is per signed-in person and is wiped on sign-out and on the sign-in page.
  Devices also pick up each other's changes when the app comes back to the front, without a reload.
- **"Start a job" is gone** (owner decision, 11 Nov). One way to begin work: the **Scheduler** ("+ New job"), which is
  now the home screen on a phone (the Register stays home on a computer). Old "start job" links land on the home screen.
  Key and tool look-ups are still under **Lishi & Keys** and **Programmers**.
  A sale with no job starts from the **Receipts** list: **＋ New receipt / invoice** (and **💬 Quote**) at the top.
- **New: Quick quote** (menu and phone bottom bar). For a customer who calls for a price: the document builder opens as
  an Estimate, no name needed (filed as "Phone quote", no customer record is made). The finished estimate has
  **📅 Schedule this job** (opens a new job in the Scheduler already filled in — customer, vehicle, priced lines) and
  **🧾 Make it an invoice** (one tap; a new invoice with its own number, the estimate is kept).
- **Fixed: keys / parts pulled for a job now arrive on the invoice with the tax box already ticked** (as Materials).
  Before, only the lines typed by the office carried their tax setting; parts arrived as untaxed labor.
- **Fixed:** an invoice made from an estimate used to share the estimate's internal id (the two could overwrite each
  other). Deleting a receipt and editing a customer now find the record again at the moment of saving.
- **Phone bottom bar** default is now Schedule · Quote · Receipts · Stock · More (a bar someone already customised is kept).
- **A save the cloud did not accept is no longer treated as saved.** Before, if saving a receipt, job, customer or part
  failed (connection dropped, or the cloud said no), the app carried on as if it had worked and the change was lost on the
  next reload. Now it shows "Not saved to the cloud yet — still trying", tries again by itself, and says "Saved" when it
  goes through. A change the cloud refuses is reported once. A retried save can never make a second copy of a record.
- **Small clean-ups from the module-by-module review:** two unused files (about 130 KB) are no longer loaded on every
  open; the year lists go to next year (2027 vehicles could not be picked); the Lishi "In stock?" pill reads the shop's
  real stock (it said "Not in stock" wrongly when signed in); two unused dashboard functions removed; the messages
  "Getting the latest version…" and "Bottom bar saved" now actually show.
- **The review also listed things that are NOT fixed yet** (cash drawer opening on every print, "Mark as paid" not
  reaching Closeout, stock ± buttons that do not stick when signed in, Register tax ignoring the Setup categories, and
  more) — see `REBUILD_PLAN.md`, "Module review".
- **Not changed:** the card-payment path, the database, the page-cache rule that stops phones sitting on an old copy.
- **Stripe "refunds" explained:** they are not refunds. The app authorizes the sale plus the 2% credit surcharge, then
  captures only the sale amount when the card turns out to be debit; Stripe shows the un-captured 2% as "refunded".
  Nobody is charged it and there is no fee on it. Removing it means reading the card type before charging — planned,
  to be done with the owner present and a real card (see `REBUILD_PLAN.md`).
- **Restore point:** git tag `working-2026-11-11` (+ branch `backup/working-2026-11-11`, zip in `D:\Work\Backups`).
  `REBUILD_PLAN.md` at the repo root has the full plan, what is done, what is left, and how to go back.
- Status of all of the above: tested on this PC at phone size (owner and technician) with test data and a stand-in for
  the cloud; **pending sign-off on a real iPhone and Android with real logins.**
- **The staff app now also lives at `https://bittings.app`** (sign-in at `https://bittings.app/signin`). The old address,
  `turbokeysmith.com/staff/`, still works and shows the very same app; both are kept identical until the switch-over.
  `www.bittings.app`, `getbittings.com` and `www.getbittings.com` forward to it.
- **Card payments are now taken on the shop's own Stripe account** (owner decision, 11 Nov). Stripe charges its processing
  fee to the shop, and Bittings only receives its own small fee. Before this, Bittings was paying Stripe's fee
  (seen in testing: $2.80 lost on a $102 charge).
- **Bittings' fee depends on the plan:** Starter 1%, Pro 0%. A shop can be pinned to its own rate; Turbo Keysmith LLC is
  pinned to 1%. The fee is worked out before any card surcharge.
- **"I already have a Stripe account".** A shop owner can link the Stripe account they already use (keeping its customers
  and history) instead of opening a new one. Settings → Payments.
- **Stripe is in LIVE mode.** Settings → Payments now shows where the Stripe connection stands (not connected / needs
  information / Stripe is checking / connected) and what is still missing.
- **Phones can no longer sit on an old copy of the app.** The two app pages are never saved by the browser, and every
  sign-in opens a fresh address.
- **Fixed:** "Failed to send a request to the Edge Function" when the app called the cloud from the new address.
- **Technicians can raise a quantity on a job's invoice line** (a rekey booked for 1 lock turns out to be 3). The price per
  unit stays the office's price; the line amount follows the count. Before, a technician could only lower it.
- **Running totals while building a document.** Under the line items, the receipt / invoice / estimate builder now shows the
  **total before tax** (large), then sales tax and the total with tax, and it updates as lines, quantities and discounts
  change. Before, no total showed until the document was created. Checked at phone size for an owner and a technician;
  pending sign-off on a real iPhone and Android.
- **Clock in / Clock out button for staff, on any device.** At the top of the app a technician, manager or front-desk
  person now sees **Clock in**, or **On the clock since 9:57 AM · Clock out**. Clocking out asks why (Lunch / Personal /
  End of day) and **keeps them signed in**, so a technician can clock out at closing and still take after-hours jobs on
  commission. Before, the clock only worked on the shop computer and clocking out also signed the person out. On the shop
  computer that rule is unchanged. The owner does not get the button. Checked at phone size with a stand-in for the cloud;
  pending sign-off on a real iPhone and Android with Jayden’s login.
- **First typed-card payment in live mode worked:** Kristi Phipps, $96.90 ($95 + 2% credit surcharge), Visa credit, taken by
  Jayden on his phone at 5:30 PM. Stripe confirmed it. Jayden reported seeing a failure on his phone; cause not found.
  The invoice page now keeps checking instead of stopping at the first failed status check, and if it cannot confirm it
  says the card may have been charged and not to charge again.
- **Known issue: two receipts can get the same number** when they are made on different devices (Kristi Phipps and Luis
  Perez are both TKS-2026-1111B). They are separate records and nothing was overwritten; saving now matches on the
  record itself, not the number. Numbering still needs to be made unique across devices.
- **New: job drafts.** A new job that is not finished is kept as a draft on that device: close it, answer the phone, come
  back, and "+ New job" (now showing "📝 Continue job") offers to continue it with everything still filled in. The Quick
  form also has a "Save draft" button. A draft is not on the schedule until the job is created.
- **New: "Might fit" keys on a job.** Keys that list the make and year but not the model (or have no Fits and only say it
  in their name) now show in a separate "Might fit — not confirmed" section, instead of the job saying there are no keys
  (a 2013 Jetta showed none while VW 2011–2016 remotes were in stock).
- **New: Net revenue on Reports** = sales (sales tax left out) − parts costs − contractor amounts, with the three numbers shown.
- **Contracted out is owner / manager only** (hidden from technicians and front desk).
- **New: contracted-out jobs.** A scheduler job has a "🤝 Contracted out" box: the contractor's name and what they get.
  The job's total then shows the contractor's amount coming off and what the shop keeps, and the job card shows who has
  it. The Salary / Commission tab has a **Contractors** box: what is owed to each contractor (a job counts once it is
  Completed), jobs still coming up, and **Mark paid** per job. Technicians and front desk do not see any of it.
- **Reports and Closeout: tap a sale** to open that customer's page (their details and every invoice) with the tapped
  invoice open on top. A sale with no customer on file just opens the invoice.
- **All of Jayden's earlier pay periods were marked paid in bulk** at the owner's request (amounts at $15/h, no overtime).
- **Texting an invoice from the PC through Phone Link: tried, not working.** Opening a text to a number from Bittings
  made Phone Link show a different conversation, so nothing was sent. Not built.
- **After-hours commission now means the shop is CLOSED and the technician is clocked out** (owner, 11 Nov). Before, it only
  checked "clocked out", so a forgotten clock-in on a workday would have paid 25% on daytime sales. "Closed" follows the
  storefront hours in Settings → Hours & footer (now Mon–Fri 10–6, Sat 12–5, Sun closed).
- **Pay schedule is editable:** "⚙ Change pay schedule" in the Hourly pay box sets when a pay period starts, weekly or
  every 2 weeks, and the pay day.
- **New: hourly pay (payroll) for the owner.** The Commission tab is now **Salary / Commission**. At the top is an
  "Hourly pay" box: the two-week pay period (Sun–Sat ×2, paid the following Wednesday; first one 25 Oct – 7 Nov, paid
  Wed 11 Nov), each hourly person's hours from the time clock, their rate, overtime and the amount, with **Mark paid**.
  A green "Pay day" bar reminds the owner while anyone is unpaid ("Later" hides it until tomorrow). The hourly rate is set
  in Settings → Access & managers → Team logins ("Hourly $"); only the owner can see or change rates. Jayden is $15.00/hour.
  **Overtime is chosen per person** in that box: "No overtime (1099)" (the default, and what Jayden is on: every hour at
  $15) or "Overtime over 40 h a week at 1.5×". "See every shift" under each person lists every clock-in and clock-out in the period.
  Amounts are gross pay before taxes. Mark paid only records the payment; it does not move money.
- **Lockouts are labor.** "Car lockout" was being filed as Materials / Parts (which also gave it a warranty). Fixed, and
  TKS-2026-1111A (layefette gaines) corrected.
- **Reports clean-up:** the 8 automated "TEST — fee check" receipts and their failed test payment are deleted. Luis Perez's
  $165 (TKS-2026-1111B, card taken on the shop's other Stripe account) is now recorded so it shows in Reports and Closeout.
  **Known gap:** a receipt saved as "Card / Paid in Full" without using Pay Now is not counted in Reports. Until that is
  changed, pick **Other** for card payments taken outside Bittings.
- **Closed receipts are locked for technicians** (owner rule, 11 Nov). Once a receipt is paid, only a manager or the owner
  can edit it. "Paid" means Paid in Full by cash, check, Zelle or other, or by card once the card was actually charged.
  A card receipt that has not been charged yet, an unpaid invoice and an estimate can still be edited by a technician.
  A paid receipt also no longer shows "Pay Now". This is enforced on the app's screens, not yet in the database.
- **Fixed: "Type card" asked a technician for a "Stripe publishable key".** That box was a testing leftover on the invoice
  page. It is gone; the key now comes from the server, and the card field opens on the shop's own Stripe account.
  **Typing a card in by hand has still never been run with a real card in live mode — needs one real test.**
- **New: Edit on every receipt and invoice.** The Receipts list has an "✏️ Edit" button next to View / Send / PDF. It opens
  that document for changes and saves it under the same number, never as a new one. "Invoice this job" on a job that
  already has a receipt now offers "Open it to edit" and goes straight to that receipt.
- **New: internal notes (staff only).** The scheduler job form and the invoice form each have a "🔒 Internal notes" box.
  The note shows on the job card, carries from the job onto its invoice, and shows in the Receipts list and after saving,
  but it is never on the customer's receipt. The existing "Notes" box is now labelled as printed on the customer's copy.
- **Removed receipts stay out of every list**, and a new receipt can never take a number that is already in use.
- **Warranty only when hardware is sold** (owner rule, 11 Nov). A receipt gets the warranty only if it has a stocked part or
  a Materials / Parts line; service calls, programming and labor alone get none, whatever the tick box says. Register
  sales that include a part now show and print the standard warranty too (they had none). TKS-2026-1111B had its warranty removed.
- **A job can no longer quietly get a second receipt.** "Invoice this job" on a job that already has one now warns and
  offers to open the existing receipt. (TKS-2026-1111A and TKS-2026-1111B were both for the same Luis Perez job, $165 each. The owner had
  A removed and kept B; the $165 was taken on the Stripe account under Found, outside Bittings.)
- **After saving an invoice:** the old chat-style line ("Done! Here's…") is now a plain "✓ Receipt … saved", the page
  is titled "Receipts & invoices", and a job's receipt has a "Back to Scheduler" button. The builder is still its own
  page; moving it fully inside the app is a bigger job that has not been done.
- **New: charges on a scheduler job.** The job form has a "Charges for this job" box: add lines (what, qty, price each,
  taxable), and it shows the total with tax and with any keys picked for the job. The total shows on the job card.
  "Invoice this job" opens with those lines and prices already filled in, so the technician just takes the payment.
  A technician sees the charges but cannot change them, and their prices are locked on the invoice.
- **New: finished jobs look finished.** A job that is Completed and has a Paid-in-Full receipt is dimmed, its name is
  crossed out and it gets a green "✓ Paid" tag. Completed-but-unpaid jobs look as before.
  Both checked at iPhone and Android sizes in the test browser for an owner and a technician; **pending sign-off on real phones.**
- **Fixed: "Invoice this job" left the address blank and wrote "auto" as the work done.** The invoice now opens with the
  job's address, the right service type (Automotive / Residential / Commercial) and the service the job was booked for
  (for example "ESL") as the first line. Name, phone, vehicle and VIN already carried over. The price is filled only when
  the service matches one in Settings → Services. Checked on the shop PC with a real job; nothing was saved.
- **Fixed: Jayden could not be picked as the technician on a job.** The scheduler asked the cloud for the team only once
  each time the app opened; when that one request came back empty it stayed on the hand-typed Employees list (just Samer)
  for good. It now asks again until the team arrives. Checked in the owner's browser on the shop PC: the board has a Jayden
  column and the Technician dropdown on a job lists him. Not yet checked on a phone.
- **Jayden's November hours brought over from the old time clock** (owner's report, 11/01–11/11): 11/10 closed at 6:00 pm,
  today's 9:57 am clock-in added, and 11/02 (9:30 am) and 11/04 (10:00 am) added with the start times the owner gave.
  Total through 11/10 is 60:36. Each changed row carries a note.
- **First real card sale on the shop's own Stripe account: $185.33, Visa debit, on the reader (3:12 PM).** Stripe held
  $189.04 in case the card was credit, then released the $3.71 because it was debit. Stripe fee $5.05, Bittings fee $1.85,
  $178.43 to the shop. The sale exposed three faults, all fixed the same afternoon:
  1. **The Register did nothing after an approved card or cash sale** (no "approved" line, ticket not cleared, no
     send/print buttons, and the part was not taken out of stock). A coding mistake dating from June. Fixed; and if the
     finishing step ever fails again the payment sheet now says the card WAS charged and not to charge again.
  2. **Receipts only showed 1,000 of the shop's 1,763 receipts**, so the newest ones could be missing. The app now loads all of them.
  3. **Register sales sorted to the bottom of Receipts and had no date.** They now sort by when they were paid.
  **Still owed for that sale:** the SOUL 10-13 key (1) was never taken out of stock, so adjust it by hand. Fixes 2 and 3
  were not seen working with an owner login (the account was signed out everywhere mid-check); **pending owner + phone sign-off.**
- **Fixed: Team logins said "No staff rows yet." and Jayden could not be seen.** The Team logins card was asking the
  cloud for each person's pay plan, which signed-in users were never given permission to read, so the cloud refused the
  whole list and the app showed that as an empty team. Nobody was ever removed. The permission is now in place
  (pay plan only; PINs, phone numbers and addresses stay hidden), the card now says so plainly if the list cannot be
  loaded, and the scheduler now picks up the team even when it arrives late on a slow connection.
  Checked in the owner's browser on the shop PC: Team logins shows Samer and Jayden, and the scheduler has a Jayden column.
- **Fixed: an invited teammate was missing from the Employees list** (Settings → Access & managers). The list was only
  ever typed by hand, so Jayden, who was added with "Email invite", had a working login but was not on it. Now everyone
  with an active login is added to the list automatically when the screen opens (tap **Save** to keep it). Nobody is
  removed or renamed. Checked at iPhone and Android screen sizes in the test browser; **pending sign-off on real phones**.
- **Tested in Stripe's sandbox** (test shop, simulated reader): credit $102 with fee $0 (Pro) and $1.00 (1%), debit $100
  with no surcharge, part and full refunds. **Not tested:** typing a card number in by hand.
- **Still to do before the switch-over (needs the owner):**
  1. Finish Turbo Keysmith LLC's live Stripe connection (started, not yet able to take cards), then pair the card reader
     again (readers paired before today must be paired once more) and run one small real charge and refund.
  2. Try "I already have a Stripe account" from bittings.app with an owner login.
  3. Update the print helper on the counter PC; until then, printing from bittings.app does not work there
     (printing from the old address still does).
  4. At switch-over: point the website's "Staff Login" links (about 240 pages) at bittings.app, forward the old address,
     and change the sign-in email links to bittings.app. Staff then sign in once more and re-add their home-screen icon.
  5. Subscription billing (shops paying for Bittings plans) is not set up yet.
- **Status:** code-complete and published to both addresses; **pending mobile sign-off** on iPhone and Android for an
  owner and a staff member. Nothing from today is committed yet.

### 2026-11-09 (🔎 "missing FCC ID" list)
- **Missing FCC ID button on Stock.** A red tile counts the smart keys, remotes, flip heads and super remotes that have no
  FCC ID yet; tap it to list only those, open each part and fill in FCC ID. Tap again to see everything. On the real stock
  (9 Nov) that is 94 parts: 74 remotes / fobs, 15 smart keys, 5 flip heads. Transponders count when their **chip type** is blank (they go by chip, not FCC ID): 5 more, 99 in all. The tile reads "missing FCC ID / chip".
- **FCC IDs and chips filled from American Key Supply** (owner approved "fill them", 9 Nov). Our SKUs are AKS "EZ #" codes, so
  97 parts were matched to their AKS listing (a few from UHS / Key Innovations): FCC ID on 82, chip on 23, the 6 Autel /
  Xhorse universal keys set to "Universal", and 5 plain transponder keys (K-B120, K-NI04, TOY48BT4, Y160, Y164) moved from
  Remote / Fob to Transponder. Left alone: B110 AM and HU66-AM (not remotes; owner to decide). Backup of the old values and
  the lookup results: session scratchpad aks/ (backup-before-fill-2026-11-09.json, plan.json, fill.sql).
- **MicroBiz import (owner approved "import it", 9 Nov).** Source: MicroBiz "Qty On-Hand By SKU" + "By Description" PDFs
  (image-only Print-to-PDF; rendered with pdf.js, transcribed twice and cross-checked: 531 items, 4,603 units, $41,919.27).
  166 new parts added (ids mb_0001..0166, notes import:MB-2026-11-09; type/grade/FCC from AKS by EZ #), and on the 351
  existing parts: 67 shop quantities, 23 prices, 19 costs, 259 vendor # (AKS item #), supplier = American Key Supply. Names kept.
  Skipped 14 service SKUs (SRVC, REKEY, RMPROG, MTLKEY…). Negative MicroBiz counts set to 0. Verified: 0 mismatches; 519 parts,
  2,681 units, $41,536.77 at cost (= MicroBiz minus the skipped service items and negatives). Backup: scratchpad mb/backup-before-microbiz-2026-11-09.json.
- **Supplier brands + Your Car Key Guys logo.** Key Innovations keys (MicroBiz vendor KIN) → supplier Key Innovations, brand
  Keyless2Go (15 keys; Master Lock + key hider left unbranded). MicroBiz files YCKG parts under AKS; the 22 with vendor # "YCKG#…"
  → supplier Your Car Key Guys, brand YCKG. Your Car Key Guys added to the Home Vendors links (cloud config + store.js default).
  Logos: app/assets/vendor-logos/yckg.png (wordmark) + yckg-icon.png, mapped by website in index.html VENDOR_LOGOS — shown
  in the Vendors link sheet and on Setup › Inventory › Suppliers.
- **Brand follows the supplier.** On the part form every brand is listed under its own supplier (From American Key Supply: Blue
  Rocket · From Key Innovations: Keyless2Go · From Your Car Key Guys: YCKG). With Category = Aftermarket, typing the supplier
  (full name or short code AKS / KIN / YCKG) picks its brand; picking a house brand first fills in the supplier. OEM keys get no auto brand.
- **GPS tracker on each van** (groundwork for live van locations; owner is testing VitalGlow GPS, API access requested by email
  to cs@vitalglowlink.com). Fleet › Add/Edit van has a 📡 GPS tracker section (GPS company + device serial / IMEI); the van list
  shows it. New columns vans.gps_provider / vans.gps_device_id (supabase/phase8/8z_vans_gps.sql, applied).
- **Email links fixed.** Supabase Auth Site URL was still http://localhost:3000 (so Forgot-password links went nowhere). Now
  site_url = https://turbokeysmith.com/staff/signin.html and redirect allow-list = turbokeysmith.com/staff/**, www…, *.turbokeysmith.pages.dev,
  127.0.0.1:8088 (pushed with supabase config push; diff showed only those 2 changes).
- **Invite teammates by email (8z5).** Settings → Team logins → ✉️ Email invite (name, email, role; no temp password). staff-invite
  calls auth.admin.inviteUserByEmail; the link opens signin.html on "Create your password". Teammates who never signed in show
  ⏳ invite sent + **Resend invite**. Branded email templates are in bittings-unified/supabase/templates/ but Supabase only allows
  custom templates with custom SMTP → they go live when Resend is connected (owner creating the account).
- **2FA required for owners & managers (8z5).** aal_ok() now needs an aal2 session (or a server context); mfa_pending() is also true
  for a manager/owner with no authenticator; _shared/auth.ts requireRole refuses manager/owner without aal2 (all 7 functions that
  use it redeployed). The sign-in page forces setup (no "Not now"). Forgot-password: if the account has an authenticator, the
  6-digit code (or a backup code) is required before the new password saves.
- **Emails sent through Resend.** Domain turbokeysmith.com verified in Resend (owner added the DKIM/SPF/MX/CNAME records on the
  send./rsend. subdomains in Cloudflare; root MX for Outlook untouched). Supabase Auth custom SMTP = smtp.resend.com:465, user resend,
  a domain-scoped SENDING-ONLY key (not stored anywhere in the repo), from "Turbo Keysmith" <no-reply@turbokeysmith.com>. Branded
  invite/recovery templates (supabase/templates/) now live. Test reset email delivered to the Gmail inbox 9 Nov.
- **Chip box clearer (8z11).** Part form chip field says you can type any chip; suggestions = built-in list (+ Mitsubishi N chip, Megamos 13,
  4D-60/61/64/68, Toyota G, Hitag AES 4A …) + every chip already used in stock.
- **Fill FCC ID / chip during a stock count (8z12).** Technicians cannot edit parts; on Inventory → Reconcile, rows missing an FCC ID
  (smart key/remote/flip) or chip (transponder) get input boxes that save via cycle_set_key_info (open count; manager or the assignee;
  only fcc_id/chip; blank never erases; audit_log). Owner assigns the count to Jayden when starting it. phase8/8z12_count_key_info.sql.
- **Part photos (8z18).** Supabase Storage bucket part-images (public read; upload/replace/delete only by owner/manager/technician
  into their own <shop_id>/ folder; select policy needed for upsert). inventory.image = storage path (view + inv_update_info accept it).
  app/part-photo.js (TKS_PHOTO: url/thumb/view/pick/remove): camera or library → crop box (drag corners, move, rotate) → 640px white
  square WebP (JPEG on Safari) ~15-25 KB. Part screen shows the photo (tap = full screen) + Add/Replace/Remove; Stock list and
  stock-count rows show a thumbnail. 196 parts got their AKS product photo, auto-cropped: brand badges (BlueRocket, OEM Refurb,
  Keyless Factory, Ilco) and Made-in-USA flags removed, trimmed, ~15 KB each (~3 MB total). Paths <shop>/<id>-aks.webp.
- **Label layout final (8z29f/g, 10 Nov night).** Both labels: QR top-left, name + price on the right (price right under the name),
  part number BIG across the full bottom row (never shrunk). Key label: "SN: XXXXXXX" small right under the QR. Names trimmed by whole
  word with "..." (no "…" — the Zebra font prints it as garbage).
- **Keys for this vehicle (8z32, BUILT 10 Nov night).** Job form (Quick form / Edit job, auto jobs): after year/make/model, keys from
  TKS.Inventory.forVehicle grouped (smart / flip / remote / super / transponder / shell / blade), ignition-aware (turn key hides smart
  keys; push-to-start hides flip + transponder), FCC/chip/SKU/price/photo, stock Shop + each van (_invLocMap) and ✓ / not on the
  assigned tech's home van; + Add → job_parts {job_id,item_id,description} (new jobs: kept pending, written after save with retries);
  "On this job" list (✕ remove = manager, RLS); yellow "load onto the van" warning. Not yet in the step-by-step wizard.
- **Keys in the wizard (8z33).** Same box on the step-by-step New-job wizard (vehicle step, #wzKeys; shared kfvList/kfvCard/kfvFlush);
  picked keys (b.keyParts) written to job_parts after the wizard saves. Van check hidden until any van holds stock (8z32b — owner: vans
  get stock after the shop consolidation).
- **Transponders in the keys box (8z35).** Most transponders list only the make (+years) in Fits, so model-exact matching skipped them.
  kfvList adds make/year (loose) matches for Transponder / Mechanical / Key Shell; transponders kept only when their chip family
  (kfvChip: id49, 4d63, id46, 8a, 4d72, id13…) matches a chip on this car's model-specific keys (note "✓ same chip"), or all of the
  make with "check the chip" when no key lists a chip. Quick form now uses kfvList too. 2015 Fusion → FORD-H128-PT (Hitag Pro).
- **Owner rule (8z34): PEPS / proximity / prox = push-to-start = Smart Key.** Keys box treats such names as smart keys regardless of
  category. Recategorized imp_0146 FORD-R7989 AM (M3N-A2C31243300) and mb_0154 GM-915 OEM RF (PEPS) → Keys/Smart Key. Owner "fix them" (10 Nov): 15 more moved Remote / Fob → Smart Key (FORD-R8166 OEM/RC, FORD-R8197 AM, HON-501/514/514 REF/517,
  HYU-1333, KIA-1160, LEX-58, NIS-298/323/340/351, TOY-255); audit_log recategorize.
- **IDEA (owner, 10 Nov — not started):** public "Do you have my key?" on turbokeysmith.com: customer enters VIN or year/make/model +
  ignition → we show key PHOTOS only (no prices, part numbers or FCC IDs) with "In stock" / "Call to confirm"; "Request a quote for this
  key" sends the vehicle + chosen key photo into the quote/lead email so nobody has to call them back for the vehicle details. Needs a
  public read path (edge function or anon view exposing only name-safe fields + image + in-stock yes/no) — never prices/SKU/FCC.
- **NEXT (owner, 10 Nov night):** (a) key labels: move the price down a little so the full product name fits (like the part label).
  (b) SCHEDULER "Keys for this vehicle": after year/make/model, list TKS.Inventory.forVehicle(veh) grouped by sub-category (smart key /
  remote / flip / transponder / blade) with FCC, price, photo and stock by location (shop / each van); flag if not on the assigned tech's
  van ("load onto the van"); tap = TKS.Jobs.addPart (job_parts has item_id → also store item_id) so it flows to the invoice + key
  consolidation. Example: 2015 Focus → FORD-R8147 AM / FORD-R8048 AM; 2015 Fusion → FORD-R7986 AM, R8130 OEM, R7989 AM. NOTE: all
  stock is at location shop — vans need a Reconcile count before the van check means anything.
- **NEXT / owner wishes (10 Nov):** (1) LOCK THE COUNTER PC to Bittings only — Chrome kiosk + URL allow-list (turbokeysmith.com/staff
  + the vendor sites linked in Quick links, NASTF, Stripe), block email/YouTube/everything else (Chrome policies URLBlocklist [*] +
  URLAllowlist, or Windows Assigned Access). (2) Owner sends Cash App / Venmo / Zelle QR images → field payment screen. (3) Live Stripe
  keys → card-by-QR (Checkout link) + WisePOS E pairing. (4) Remove tkremote admin account on DESKTOP-VCTVAGI (password was shared in
  chat) + optionally Disable-PSRemoting there. (5) 6 Jayden single-punch days need times. (6) 2D/QR USB scanner to buy (ES4209G is 1D).
- **Scheduler address + vehicle (8z31).** Edit-job sheet: Street / Apt-Unit # / City / State (US list, default OK) / ZIP (booking.addr
  {street,unit,city,state,zip}; address composed "street, unit, City, ST ZIP"); old one-line addresses split by parseAddress (handles
  "City ST ZIP", "City, ST, ZIP", trailing Apt/Unit/#). Year/Make/Model are TKS_YMM dropdowns (model list follows make+year; VIN decode
  fills them). Wizard got Apt/Unit # + the state list.
- **Stripe 2026 merged (8z30).** Export (1,052 rows; 870 paid Jan 1-Nov 10 2026). 272 matched MicroBiz card sales (exact or +2-3%
  surcharge, ±2 days) → enriched: card_brand/funding, stripe PI, captured = Stripe amount, surcharge_cents. 598 never rung up → new
  non-taxable card service sales (receipt rcpt_st_*, payment method card, idempotency st_<charge>), $134,120.42; refunds kept.
  20 MicroBiz card sales ($3,996) have no Stripe charge (other terminal). Builder phase8/8z30_stripe_merge_builder.js.
- **Labels/serials (8z28-8z29).** Labels: QR drawn as ^GFA (qrcode-generator 1.4.4 vendored, MIT); part label QR+name(3 lines)+price+SKU;
  unit label (owner sketch) QR of 7-char serial + name/price/SKU + "SN: XXXXXXX". inventory_units.serial (31-char alphabet, unique per
  shop, trigger + backfill); scan/lookup accepts serial. Refresh keeps the screen (sessionStorage tks_view; 15 s wait; desktop no
  longer forces Register). Faster load: removed 4 missing SDK scripts, SheetJS lazy, CDN versions pinned, vendor cached 7 days.
- **Jayden time clock from MicroBiz (8z27).** emp_time.dbf (ID 002) → 105 shifts / 756.8 h into time_entries (Sep 2025 → today, today
  still open from 10:04). Paired per day; Jul 18 – Aug 8 punches were reversed (Out at arrival, In at leaving) → treated as shifts
  with a note. 6 single-punch days NOT imported (Sep 22 2025 in 9:26, Jul 17 in 10:18, Aug 8 out 12:07, Sep 19 in 12:21, Nov 2 out
  18:00, Nov 4 out 18:26) — owner to give times. Labels: shop ZD420 stock is 2.00x1.00 in (driver 200x100); hardware.js defaults
  2x1, layouts scale to height, left margin shiftX 40 dots (^LH). Test labels #1-#3 + receipts #1-#2 printed fine.
- **Counter printing (8z26).** Bittings Print Helper (bittings-unified/tools/print-helper: helper.js Node server on 127.0.0.1:8765 +
  print.ps1) installed on the MicroBiz/counter PC DESKTOP-VCTVAGI as scheduled task "Bittings Print Helper" (SYSTEM, at startup) in
  C:ProgramDataBittingsPrint. Receipts: GDI through the Star TSP100 Cutter (TSP143) driver (TSP100 is raster-only, no raw text); drawer:
  raw BEL + ESC p to the Star queue (to verify on hardware). Labels: raw ZPL to ZDesigner ZD420-203dpi. CORS only for turbokeysmith
  origins + Private-Network header. hardware.js: thermal.mode / labels.mode default helper; Hardware panel shows helper status +
  Open cash drawer. Test receipt + label printed 10 Nov (queues empty, physical check pending). Chrome may ask to allow local network.
- **Venmo + Cash App history (8z25, 10 Nov).** Non-taxable service sales (receipt rcpt_vm_*/rcpt_ca_<txid> + payment row method venmo /
  cashapp, idempotency vm_*/ca_*). Venmo: 37 typed by owner (amounts were AFTER the 1.9%+$0.10 fee -> recorded gross, fee in note), $5,932.03.
  Cash App CSV (Jan 5-Nov 9 2026): 177 imported $31,530.41; 3 skipped (already MicroBiz cashapp sales); 19 more ADDED (owner: jobs locksmiths did for
  each other — count what they sent us: Elite, Scissortail, Armor Keys, Juan Medina, Malek Javanpour) → Cash App total 196 / $36,526.41;
  7 EXCLUDED (purchases / refunds — not sales). Kept for
  later bookkeeping in phase8/8z25_cashapp_held_for_owner.json. Stripe export still to come: MATCH to
  existing card sales (attach brand/last4/PI/fee), do NOT create new sales. App: payMethodLabel knows venmo / zelle.
- **Tech sales privacy (8z24).** payment_transactions readable only by owner/manager/front desk; receipts: a technician reads only his
  own (created_by = new column default auth.uid(), or technicianId / technician e-mail / name = him) via receipt_is_mine(). Tested: Jayden 0
  payments, 218 receipts (217 MicroBiz sales he rang up); owner 936 / 932. Commission page hides commissionable/base from non-managers.
- **Pay plans (8z22).** staff.pay_plan commission | hourly | hourly_after_hours (+ after_hours_pct, default 25); owner sets it in Setup ->
  Access -> Team logins (staff_set_pay_plan). commission_day_rows: shop rule only for commission-plan people; hourly_after_hours earns
  pct of (payment - tax - refunds - cost) for sales paid while NOT clocked in (time_entries). Tech of a sale = technicianId, else the
  job responsible_tech, else technician e-mail. MicroBiz history excluded. Jayden = hourly + 25% after hours. Tested (rolled back).
- **Reports by date (8z23).** Period: Last month, Last year, Pick dates (from/to). Breakdown box: sales before tax, products vs services
  (line has partId or Materials/part category = product), taxable vs non-taxable, sales tax collected (owed), by payment type.
  TKPay.dayTransactions pages past the 1000-row API cap. Oct 2026 check: 13,865.70 = 6,716.70 products + 7,149.00 services, tax 571.14.
  NOTE: never put a dollar-quote sequence in a String.replace replacement (it means "rest of string") - it duplicated index.html once.
- **MicroBiz merged (8z20, 10 Nov).** Remote access to the MicroBiz PC (DESKTOP-VCTVAGI 192.168.1.202) over WinRM as a temporary local
  admin tkremote (delete when done; this PC trusts 192.168.1.202). MicroBiz = dBase files in C:Program Files (x86)MicrobizBusiness; locked files
  copied from a VSS snapshot (deleted after). Read with phase8/8z20_dbf_reader.js. Sales: 928 invoices (Dec 2024 → 9 Nov 2026) → receipts
  rcpt_mb_<invoice#> + 933 payment_transactions (idempotency_key mb_<inv>_<n>), totals $125,594.57, change given subtracted from cash,
  tender codes 1 cash, 2 MC/Visa, 3 Amex, 4 Discover, 0 debit → method card (+card_brand), 5 check, 9 cashapp, X commercial, Y mobile,
  other. Clerk SA/001 Samer, JG/002 Jayden → technician email. Builder: phase8/8z20_microbiz_sales_merge_builder.js. Parts: 5 new
  (mb_0167-0171), Metal Key = MTLKEY 949, qty Lanyard Skulls 4 / Duracell 11, junk part ford soft-deleted, 10 service prices from MicroBiz
  (phase8/8z20_microbiz_parts_sync.sql). App: payMethodLabel/payBucket/payCanRefund — reports + closeout show Card (terminal)/Cash App/
  Mobile/Commercial; Refund only for Stripe card or cash/check. Import tags removed from all notes (8z19; backup json).
- **Checks (8z21).** Register shows Check only when the selected customer is a business (commercial) customer; field invoice builder
  (bittings.html) no longer offers Check.
- **Lucky Line items filled (8z18b).** 93 accessories with Lucky Line UPCs (085721…) matched to luckyline.com (Shopify products.json; UPC digits
  7-11 = Lucky Line No.; lanyards per design C201-C210; checked by name). Filled ONLY empty fields: brand Lucky Line, Description (Lucky Line
  No. + title + specs), Link (luckyline.com product), photo (their packaged-card photo, trimmed, 640px WebP; 92 — SILICONE KEY RING left
  without, its match was a display box). Old values in audit_log luckyline_fill; match list + backup in phase8/8z18b_luckyline_*.json.
- **Makes for every part (8z16).** Count filter groups Accessories (category Accessories/*) and Universal (brand Universal / IKEY /
  Maxiim) instead of "no make"; fitment.js ALIAS knows MicroBiz shorthand (CHVRLT, FRD, LNCLN, MRC, NSSN, LXS, JAG, TOY …). Parts still without
  a make get a "Pick make…" box in the count (cycle_set_key_info p_make → make put in front of Fits). Data: 22 keys filled from key codes
  (8z16b_fill_makes.sql, old Fits kept in audit_log fill_make). Left: Y170-PT ID46, H128-PT HITAG, Metal Key, BAF IYZ, 17-25 SUV 5BTN.
- **Technicians edit part info (8z17).** Tap a part (Stock list or the name in a count) → part screen; a technician can change everything
  except name, sell price, cost and qty (those are read-only; qty changes go through a count). Save → inv_update_info (whitelisted columns,
  audit_log part_info_edit before/after) and TKS.Inventory.applyServerPatch mirrors it into cache+shadow. New inventory.link (+ view) with
  Open ↗; Notes relabelled "Description / notes". Cap partInfoEdit = owner/manager/technician. phase8/8z17_part_info_edit.sql.
- **Stock count: Done button, edit any FCC/chip, filter by make (8z15).** Counts now remember their location (cycle_start p_location).
  The assignee taps "Done — send to manager" → cycle_submit fills every untouched part as counted = expected and stamps
  submitted_at/by; "Make more changes" reopens (p_done=false) until a manager applies. Managers see "Counts in progress" (✅ done /
  ⏳ started) after a reload and open one to Finish & apply. Every row has editable FCC ID + Chip (yellow = missing; blank never
  erases; only changed values are sent). Make filter from fits/name via TKS_FIT (+ Other), plus "Only missing FCC / chip".
  phase8/8z15_count_submit.sql (applied; tested in a rolled-back transaction on the QA shop).
- **Card readers paired by each shop during setup (8z13).** Settings → Payments → 💳 Card readers: owner/manager taps "Add a card reader",
  types the 3-word pairing code the WisePOS E / S700 shows (Settings → admin PIN 07139 → Generate pairing code) + a name; the first time
  also the shop address (pre-filled from Business identity). pay-terminal (actions list/register/rename/remove/config) registers the reader
  on the PLATFORM Stripe account (card charges are destination charges made there) at the shop's own Terminal Location
  (shops.terminal_location_id, phase8/8z13_shop_terminal_location.sql). Every reader action and pay-create-intent now refuse a reader that
  is not at the caller shop's location (before: the reader list looked under the shop's Connect account — wrong account — and any reader
  id from the browser was accepted). Publishable key now comes from the server (secret STRIPE_PUBLISHABLE_KEY, set at go-live), not typed.
  Tested 9 Nov through the live functions in Stripe TEST mode on the QA shop: pair simulated reader → list → rename → foreign reader refused
  → charge → simulated tap → completed → refunded → removed (16/16 pass). Go-live still needs: live sk/pk + live webhook + Connect onboarding.
- **Open issues 9 Nov:** (1) Cloudflare zone cache rule caches /staff/* HTML for a long time and ignores Cache-Control /
  CDN-Cache-Control no-store → owner must Purge Everything + add a Bypass-cache rule for /staff/* (token here is Pages-only).
  (2) Supabase auth email_sent rate limit is still 2/hour; raising it needs config push WITH the [auth.email.smtp] section, which needs
  the Resend sending key (not kept anywhere). Next time: create a new sending key, push smtp + rate_limit email_sent=30 together.
  (3) A set-password link for an invited user who never set one now opens the full invite screen (8z10); staff-invite Resend covers it.
- **Authenticator QR fixed (8z8).** Supabase returns qr_code as a data: URL; it was written as HTML so the text data:image/svg+xml;utf-8,
  printed above the code (off-centre, no quiet zone). Now rendered as an image in a centred white square; verified it decodes (jsQR).
- **Technicians can receive stock (8z9).** Owner chose this over a combined tech+front-desk role. inv_receive + unit_receive role lists
  include technician (phase8/8z9_tech_receive.sql); store.js invReceive cap too.
- **Van map zoom (8z14).** On phones the VitalGlow login sat below a tall banner and was hard to reach in the panel. The iframe is now laid
  out at box size / zoom and scaled down (phones start at 60%, saved per device in tks_gps_zoom); − / + buttons in the panel header.
  "Safari ↗" renamed "Open ↗" (opens the phone's own browser — owner uses Android, tech uses iPhone).
- **Live van map (8z7).** Fleet → 📡 Live van map → VitalGlow tracking web app in a borderless panel above the bottom menu (their site
  allows embedding; checked headers). Close hides it (stays signed in); Safari ↗ opens it outside. Replace with our own map once VitalGlow
  API access arrives. Test login Turbo (test technician) / turbokeysmith@gmail.com deleted 9 Nov (auth user + staff + shop_members).
- **Invite fix + contact info (8z6).** The invite link signed the person straight in (the auth library reports the link session as
  INITIAL_SESSION, not SIGNED_IN). Now: either event with type=invite, plus a backstop — a user with invited_at and no
  user_metadata.password_set is sent to "Create your password" from signin.html and from the app boot. That screen also asks full name,
  mobile phone, home address (staff.phone/address, private: not in the staff select grant; update_my_profile / my_profile /
  staff_contacts RPCs, phase8/8z6_staff_contact.sql). Team logins shows email/phone/address to managers.
- **Backup codes (8z5).** 10 one-time codes shown once after setup (mfa_backup_codes, SHA-256 hashed; mfa_backup_codes_new/left RPCs);
  Settings shows codes left + Make new codes. Lost phone → "Use a backup code" on the code screen → mfa-recover edge function
  removes the old authenticator (5 wrong codes/hour limit, audit_log) → set up the new phone. SQL: supabase/phase8/8z5_*.sql.

### 2026-11-08, night (📱 Inventory readable on phones · all stock homed at the Shop)
- **Phone layout for Inventory rows:** the part name and details now run across the top; quantity buttons and the
  action buttons sit underneath.
- **Every screen checked on a phone** (124 screens: two iPhone sizes, light and dark). Nothing runs off the side;
  small buttons were made finger-sized and small dropdowns no longer make the iPhone zoom in.
- **Bottom menu always on screen on phones**, including over pop-ups and the invoice form. Tapping it closes whatever
  is open and switches screens. The invoice page now has the same menu (Start job · Receipts · Customers · Stock · Scheduler).
- **Vehicle lookups are exact.** Pick 2020 / Dodge / Charger and you see only keys whose fits name the Charger. Parts
  that just say "Dodge" (mostly blanks) sit behind a "+ N that list only Dodge" link.
- **"Start all-keys-lost job" is now "Start new job"** on the Start-a-job vehicle screen.
- **Swipe back stays in the app.** Each screen change is a step in the phone's back history, so swiping back from
  Customers returns to Inventory. Past the first screen it says "Swipe back again to leave the app". Coming back from the
  invoice page reopens the screen you were on.
- **Guided booking keeps your place.** Picking year / make / model (or ignition) no longer jumps to the top of the sheet.
- **Full vehicle list.** Every Year / Make / Model box now has every US make and model from 1995 to 2026 (from the
  federal NHTSA vehicle database): 49 makes, about 600 models that were missing. Example: 2005 Chrysler went from 3 models
  to 7 (adds 300C, Crossfire, Town & Country…). Heavy commercial trucks are left out. Refresh it yearly with
  `node bittings-unified/tools/ymm-catalog/vpic-fetch.js` then `vpic-build.js`.
- **Years carry across a list.** A part listed "2005-2008 Dodge Magnum, Charger" now fits only 2005-08 Chargers (it used to
  show for every Charger). A separate line that names its own make ("Chevrolet Blazer") still counts on its own. On the real
  stock this changed 2 parts, both for the better (CHRY-1683 → 2021-23 Jeep; HYU-1333 → 2021-22 Elantra).
- **All stock is at the Shop and Shop is the default.** The rows used to say "Van" because of an old per-device setting;
  the real stock table already had everything at the shop except one part (4 "ford" blanks in a van), which I folded into
  the shop count. Rows now show the real location and quantity ("🏪 Shop 9 · 🚐 Van 12 4"), and the filter row is
  **All / Shop / each van** from real data. New parts default to the shop.

### 2026-11-08, evening (📋 Dispatched lines locked for techs · running job log · 📷 scan keys out and back in · published on the website)
- **Dispatched job → invoice.** On the Scheduler, open a job and tap **🧾 Invoice this job**. The invoice opens with
  the booked service (at your Setup price) and the job's parts already on it, tagged "from dispatch". A tech can add
  lines but cannot delete or re-price a dispatched line. Instead they tap **Didn't do this** and pick a reason
  (customer declined, wrong key sent, couldn't do it on site, other). The line stays on the receipt struck through
  at $0 with the reason, quantity can only go down, and every change lands in the **Job log** you see on that job.
- **Technician discounts** are a per-shop setting in Settings › Access. Yours is 0, so techs see no discount button.
- **📷 Scan keys out and back in.** On the invoice, each line has a camera button: scan the key's QR label and that
  exact key is attached to the sale. If the customer declines, "Didn't do this" asks the tech to scan the key back in,
  and the key returns to stock (to the tech's van when known) with a log entry. "↩ Scan back in" is also on the
  finished-receipt screen for a decline after the sale. Works on iPhone and Android in the browser over https; the
  first tap asks to allow the camera once.
- **It is published (2026-11-08 evening).** Staff Login sits bottom-right in the website footer and opens the app at
  **turbokeysmith.com/staff** (sign-in page: turbokeysmith.com/staff/signin). Not indexed by search engines. The Cloudflare
  deploy token + account ID you gave me are saved on the shop PC only. **One thing to do in Cloudflare:** Caching →
  Configuration → **Purge Everything**, so phones that visited the site earlier today stop seeing the old footer link
  (it fixes itself within a day either way). Re-publishing is two commands (see STRUCTURE_NOTES).
- **One Supabase setting still on you:** Auth › URL Configuration → add https://turbokeysmith.com/staff/signin.html so
  Forgot-password emails return to the right page. Signing in with a password already works.
- Texting and tech tracking are parked in the roadmap at your request; nothing paid was added.

### 2026-11-08, late afternoon (✅ "Implement all your ideas" — scan a key, reorder list, seats, server plan checks, one Services step)
- **Brand never prints on receipts.** Checked: the brand (Blue Rocket, Autel…) shows only inside Inventory, never on a
  customer receipt or PDF. **RC = OEM recased** (refurbished, no logo) is recorded; those 2 keys stay under OEM Refurbished.
- **Scan a key, see its whole story.** Receiving serialized stock can now print one label per key (its own barcode).
  Scan that barcode anywhere in the app → a panel shows the part, brand, supplier, invoice/order number, date received
  and by whom, cost, where it is, and the sale it went out on, with Warranty replacement / Mark failed / Move buttons.
  On the Register, scanning a unit adds its part to the ticket. Inventory has a **🔎 Scan a key** button for typing a code.
  The label uses a **QR code** (your call) with the part name, SKU, received date and the id in small text; preview sent.
- **Order number when receiving.** The field now reads "Supplier invoice / order # (recommended)", the supplier is
  pre-filled from the part, and leaving the number blank asks "Receive without an order number?" first.
- **📋 Reorder list.** One tap lists everything at or below its low-stock point, grouped by supplier with suggested
  quantities and totals, plus Copy, Email (pre-addressed if the supplier has an **Order email** — new field in Setup ›
  Inventory) and CSV.
- **One summary strip on Inventory** (parts · low/out · missing cost · stock value at retail/cost · open returns).
- **Vendor SKU.** Every part can carry the supplier's own part number (next to Supplier on the part form). It is
  searchable, exported, importable from a spreadsheet column, and the Reorder list leads with it. **What goes to the
  supplier (Copy / Email) is only quantity, their part number and the part name** — your SKU, on-hand counts and costs stay
  on screen and in your own CSV. Parts that still have no vendor number are flagged in amber on the Reorder
  screen (tap to add it) so you can fill them in before you send.
- **Start a job carries the VIN and the customer** into the invoice (new optional Customer box on the materials step).
- **All pop-ups look the same now** — no more raw browser alerts in Programmers or Lishi.
- **Services are set up in one place:** Settings › Services shows the kinds of work and the priced list on one screen.
- **Plan checks now run on the server** inside every gated action (Register, inventory, scheduler, commission, NASTF,
  move requests). Your shop is Pro, so nothing changes for you, but a curious tech can no longer get Pro features from
  the browser console. **Seat limits are enforced** when inviting staff (server + database); Settings shows "Seats full —
  Upgrade" when you hit it.
- **Sign-in page renamed** to signin.html (the old cloud-test.html address forwards). **One setting you must change in
  Supabase:** Auth › URL Configuration currently has Site URL = localhost:3000 and no redirect list, so Forgot-password
  emails land on the wrong page until you add http://localhost:8088/signin.html, http://127.0.0.1:8088/signin.html and
  https://app.turbokeysmith.com/signin.html.
- Status: all headless checks pass (owner + tech, desktop + phone, light + dark). Pending your two-phone check, the Zebra
  label test, and "commit it".

### 2026-11-08, afternoon (🧹 Big clean-up · one invoice builder · one scheduler · "keys by vehicle" becomes a plan feature)
You said "plan it all out and start" on the review. Done this afternoon, all checked in headless Chrome (desktop and
phone, light and dark, owner and technician), **nothing committed yet**, every file backed up before each step:
- **Lighter and cleaner.** The PDF library was in the app three times and the Lishi key data twice — now once each
  (about 800 KB less to download on a phone). Dead code and 39 dead style rules removed. Three old pages
  (Lishi, Setup, Scheduler) are archived; every link to them now opens the matching screen inside the app.
  Stale pitch and dev-server scripts and six old progress documents moved to the archive folder.
- **One invoice builder.** The step-by-step chat flow is gone. The Quick invoice is now the builder for
  everyone, and it learned everything the chat had: business customers with a contact name, discounts,
  Zelle / Other payments, Partial payments with the amount paid and balance due, a category on every line,
  your configured service types, the NASTF photo checklist, on-screen signature, and "save as common job".
  Techs see no cost or discount controls. Editing a receipt no longer loses fields. **Start a job → Materials →
  Continue now arrives in the invoice already filled in** (it used to arrive empty). Zelle and Other sales now
  show in Closeout and Reports like cash.
- **One scheduler.** The guided phone-intake script (English and Spanish — greeting, customer, job type,
  details with VIN, schedule, upsell, confirm) now lives inside the Scheduler's **+ New job**. The plain
  "Quick form" is one tap away for managers and owners. Jobs land on the board exactly like before.
- **"Keys by vehicle" is a plan feature.** Year / Make / Model, the VIN box, FCC ID and chip, and the
  fits-first pickers are included from the **Starter** plan up. The server enforces it (a Lookup-plan shop
  never receives the fits data) and a new server function decodes VINs and counts them per shop for future
  metering. Your shop is Pro, so nothing changed for you.
- **Small fixes:** "Forgot password?" on the sign-in page with a set-new-password screen (one Supabase setting
  still needed: add the app's address to Auth › Redirect URLs); the hardware window follows light/dark;
  deep links to Reconcile and Returns work; the demo no longer spams the server; a long-standing style bug that
  silently disabled the dark palette is fixed.
- **Pending your two-phone check**, then say "commit it".

### 2026-11-08, later (🔎 Inventory finder — Category · Sub-category · Year/Make/Model · FCC ID · VIN boxes; tap "missing cost" to list those parts)
- **What you asked for, remotely:** a category filter; tap the "83 missing cost" box to see exactly those parts;
  Year / Make / Model as drop-downs; an FCC ID box and a VIN box, each **separate** so nobody has to guess
  which box does what (we can merge them later); and a sub-category filter (Remote, Smart, Mechanical…).
- **What you get on Inventory → Stock now:** one finder card with labelled boxes —
  **Category** (All · Aftermarket · OEM New · OEM Refurbished · Accessories · Services, each with a count),
  **Sub-category** (only the ones you actually stock in that category, with counts), **Year · Make · Model**
  (always on screen now; no button to find first), **FCC ID** (type any part of it, dashes and case don't
  matter), **VIN** + **Find** (decodes the VIN and fills in Year / Make / Model for you), and **Search** (the old
  box). A line under them says what's on ("Showing 12 of 390 · Aftermarket · Smart Key"), with **✕ Clear all
  filters** beside it. Filters stack.
- **"missing cost" is now a button.** Tap it → the list shows only the parts with no cost; tap it again → back to
  everything. (Managers/owners only, as before.)
- **How a key knows its category:** it reads the end of the SKU — **… AM** = Aftermarket, **… OEM** = OEM New,
  **… REF / REFURB / RC** = OEM Refurbished — which is how your SKUs are already written (277 AM, 48 OEM, 7
  refurbished in the cleaned list). Keys with none of those (about 50 — mostly plain blanks and the UNIV-IKEY
  rows) sit under **"Keys — unsorted"** in the Category list so you can find them and add the suffix; the Add /
  Edit part form now says this under SKU. Accessories and Services come from the part's category. **RC** on a SKU = OEM **recased** (a refurbished OEM key in a new shell, no logo) — confirmed by you, so it sorts under OEM Refurbished.
- **Services are SKUs now:** the part form's Category picker has a Services group (Key Cutting, Programming,
  Lockout, Rekey / Lock Work, Labor, Other Service). Setup → Services (the booking menu) is unchanged.
- **Status:** code-complete and checked in headless Chrome at desktop and phone size, light and dark, owner and
  technician (no sideways scroll, big tap targets, VIN decode works, every filter narrows the list). **Pending
  your two-phone check** (iPhone Safari + Android Chrome) before it's "done". Nothing changed in the database.
  Not committed yet — say "commit it" when you're happy.
- **Round 2 (same day) — every SKU now has its own Category / Sub-category / Brand, and suppliers carry their
  house brands.** You asked for a proper way to sort the unsorted keys, universal keys by maker, and brands tied to
  suppliers so a scanned warranty return tells you brand + distributor. Done:
  - **Add / Edit part:** **Category** (Aftermarket · OEM New · OEM Refurbished · Universal · Accessories ·
    Services), **Sub-category** (Smart Key, Remote / Fob, Super Remote for universals, Remote Head / Flip,
    Transponder, Key Shell, Mechanical; accessory and service lists for those), and **Brand**. Pick the
    **Supplier** (it now suggests your suppliers) and an Aftermarket key gets that supplier's brand automatically
    — American Key Supply → **Blue Rocket**, Key Innovations → **Keyless2Go**, Your Car Key Guys → **YCKG**. A
    Universal key offers the makers instead (Autel, Xhorse, KeyDIY, Lonsdor first; OBDSTAR, Launch, Topdon, JMA,
    Silca, Keyline, CGDI; or Other…).
  - **Database:** two new columns on every part (category grade + brand), filled in from your SKUs: **186
    Aftermarket, 34 OEM New, 4 OEM Refurbished, 6 Universal** (the five UNIV-IKEY rows = Autel; the XH-XKTO22EN
    "universal wired" remote = Xhorse), 100 accessories as they were. **23 keys are still unsorted** (plain
    blanks like H86/74, K-B120, the "ford" row, GM-928/925 …) — pick Category → Unsorted on Inventory, open each,
    choose its category, Save. Supplier was blank on every row, so I did **not** stamp Blue Rocket on all the
    Aftermarket keys; say the word and I'll do that in one go.
  - **Setup › Inventory** has a **Suppliers & their brands** list — your three are pre-filled with phone,
    website and address (AKS: 800-692-1898, americankeysupply.com, Las Vegas; Key Innovations: 640-224-0031,
    keyinnovations.com, Vernon Hills IL; Your Car Key Guys: 931-451-7881, yourcarkeyguys.com, Spring Hill TN —
    no street address published). Edit anything, add or remove suppliers; it saves as you type. Below it,
    **Universal key brands you stock** — tick the makers you carry. The same tick-list is on **Programmers › 🧰
    My tools**, where you pick your programmers.
  - **Inventory finder:** Category now includes Universal, and a **Brand** box appears (Blue Rocket, Autel …).
    Receiving serialized units suggests your suppliers too, so each unit knows its distributor.
- **Your test (both phones, owner then a staff login):** open Inventory → Stock. 1) Category → OEM New: only OEM
  rows, status line appears. 2) Sub-category → Smart Key. 3) ✕ Clear all filters → everything back. 4) Year 2019,
  Make Buick, Model Enclave → the HYQ4EA key. 5) FCC ID box: type hyq4 → same key. 6) VIN box: paste a real VIN,
  Find → Year/Make/Model fill in. 7) Tap the "missing cost" box → only no-cost parts; tap again → all. 8) Staff
  login: no "missing cost" box, everything else identical. 9) Open an Aftermarket key, type "American Key Supply"
  in Supplier → Brand shows Blue Rocket; change Category to Universal → Brand lists the makers. 10) Settings →
  Inventory: your three suppliers are listed; tick Autel → Programmers › My tools shows Autel ticked too.

### 2026-11-08 (🔑 Inventory knows which vehicles a key fits — FCC ID, transponder chip, year/make/model finder; the real stock list cleaned up)
- **The owner's idea:** type the distributor's fits list once ("2018-2021 enclave 2020-2021 encore
  2018-2020 regal"), give the key its FCC ID (HYQ4EA), and from then on *any* year/make/model lookup —
  2019 Enclave **or** 2019 Regal — brings that key up. Built end-to-end:
  - **Part form:** Category is now a picker (Keys → Smart Key / Remote / Remote Head / Transponder /
    Shell / Mechanical; Accessories → …; "Other…" keeps free text). **FCC ID** appears for Smart Key,
    Remote / Fob and Remote Head / Flip; **Transponder chip** (with a suggestion list) for Remote / Fob,
    Remote Head / Flip, Transponder and Smart Key. **Fits** is a paste box with a live "Reads as: 2018–2021
    Buick Enclave · …" line (make is optional — Enclave is recognised as a Buick) plus a small
    year-from / year-to / make / model helper that appends a line.
  - **Finding the key:** Inventory has a **🚗 Fits vehicle** button (year / make / model) and the
    search box understands "2019 enclave" or "buick regal"; the Register's **📦 Part** picker opens on
    the keys that fit the job's vehicle (tap the green bar to see everything); the invoice builder's
    part picker does the same; Start-a-job's "In your van" lists fitting keys first. VIN decode in
    Inventory now opens the finder instead of a text search. Rows and pickers show the FCC ID and chip.
  - **Distributor shorthand is understood:** "08-14", "16+", "ACRD/ELMNT", "CRV/Cross/FIT", "F-SERIES",
    "Chrysler/Dodge/Jeep 04-19" (one entry per make), "GM 10-19" (matches every GM brand), part numbers
    and "4-Button / w/ remote start" noise are ignored.
  - **Cloud:** migration **8h** adds `fcc_id` + `chip` to inventory and exposes them (and `serialized`)
    through the cost-masking view; importer and CSV export carry both. Applied live; test shop 6/6.
- **Your real inventory was cleaned up the same night** (owner request "go through our current
  inventory list and fix it"): 253 key rows read, **242 updated** — FCC ID filled on 130, chip on 120,
  112 generic "Remote / Fob" rows re-typed as Smart Key or Remote Head / Flip, Fits rewritten as
  year/make/model lines on 238 (the distributor's own vehicles first, then the other vehicles that FCC
  ID is sold for, from a web check across locksmith distributors). Part names, SKUs, quantities, costs
  and prices untouched. **Read `INVENTORY_CLEANUP_2026-11-08.md`:** 32 rows need your eye (FCC IDs that
  ship with two different chips — chip left blank on purpose), 94 remotes have no FCC ID printed in
  the description, 15 descriptions could not be read. A one-file rollback is saved next to the
  migrations.
- **Verified:** parser unit tests 31/31; headless UI probe 21/21 (form → finder → search → Register
  picker → Start-a-job); full 28-pass screen/theme sweep 0 JS errors; live test-shop checks 6/6
  (technician sees FCC/chip, never cost; cannot write them).

### 2026-11-07 (🔍 Deep review of the whole app on the new shop PC — 14 fixes, full checklist in `DEEP_REVIEW_2026-11-07.md`)
- **Where things stand:** the app code on this branch (`phase3-frontend-unification`, folder
  `bittings-unified/`) is the latest — nothing from the old PC was lost. All 14 screens render clean
  in both themes with zero JavaScript errors, the 4-role permission matrix matches the server exactly,
  and the multi-shop/payment isolation proof passes **33/33** on a real Postgres on this PC.
- **⚠️ The cloud database is PAUSED.** The Supabase project (`gcshuhlksjznksspbigl`) no longer answers
  — that's what a paused free-tier project looks like after months of no traffic (nothing touched it
  since July 2). **Until you restore it from the Supabase dashboard, nothing signed-in works:** no
  payments, no cloud inventory, no time clock. Your customers, receipts, transactions and the 352
  imported inventory items live only there — paused projects can be scheduled for deletion after 90
  days, so please do this first. Only you can (it needs your Supabase login).
- **Fixed today (each its own revertible commit, each verified in headless Chrome):**
  - **Activity** and **Timesheets** screens never displayed (clicking them showed a blank page).
  - **Reconcile (stock count)** was hidden from every signed-in person — owner included — and its
    item list rendered into the hidden Receipts screen.
  - **Warranty months set in Settings were silently thrown away** → every new invoice got no warranty
    while Settings kept showing the default.
  - **Inventory value report** always showed **$0 retail**.
  - A job cancelled on the dispatch board showed as **Scheduled** elsewhere and never auto-archived
    (two spellings of "Canceled").
  - **Register: a double tap on Cash/Check/Card recorded two sales.** The buttons now lock until the
    sale finishes (or fails).
  - **Editing a paid invoice subtracted its parts from stock a second time.**
  - A dropped connection during a payment left the Register frozen on "Recording…" and card polling
    stopped silently; now you get a clear message (and polling retries).
  - PIN-unlock and billing errors showed a generic line instead of the real reason.
  - `?go=reports` links opened owner-only screens for a technician (display only — data was always
    fenced).
  - Barcode scanner: holding a key was mis-read as a scan, and scanned codes were left typed into
    whatever field was focused.
  - Contrast misses the July pass left in **both** themes (Reports metric chips in dark, the amber
    "Reorder" line, helper text on the dark background, Dashboard weekday labels, grey hints on white).
  - **Demo/Sandbox safety:** a leftover demo flag can no longer skip the login or fake a role for a
    real account; a real sign-in clears it.
  - Calendar export invited **turbokeysmith@gmail.com for every shop** → now uses each shop's own email.
  - **Launching:** the "Bittings" desktop shortcut opened the app from `file://` (every doc says
    "run via localhost"; printers, cloud sign-in and the payment functions expect it). New
    `START-BITTINGS.ps1` starts a small Node server and opens `http://localhost:8088`; re-run
    `_make-shortcuts.ps1` on the shop PC to get the corrected shortcut.
- **Still open — money/stock items that need the cloud back to deploy and prove** (code review found
  them; see the review doc, section C): refunding a Register sale never returns parts to stock; card
  receipts print the pre-surcharge total; Register sales never flip the receipt to "Paid"; tax rate is
  trusted from the device at checkout; a few edge-function hardening items; Setup manager PINs are
  stored readable by any staff; invite temp-passwords have no "change password" path.
- **Evening — the money/stock and security batch, all live** (you said "do whatever you need" until
  go-live, so these were applied to the cloud and deployed without a check-in; every one was proven
  in the separate QA test shop, never in your real shop's data):
  - **Refunds put parts back on the shelf** (a new `pos_restock` routine; before, the dialog promised it
    and nothing happened). Signed-in sales now consume stock through one server path everywhere.
  - **Register sales now mark the receipt Paid**, and **card receipts show what the card was actually
    charged** (including the 2% when it applied) under the real receipt number.
  - **Sales tax comes from your Settings**, not from whatever the device sent.
  - **Payment plumbing hardened:** a charge can't exist in Stripe without a ledger row; refunds can't
    double-fire on a retry; a failed capture makes Stripe retry; closing the card sheet mid-charge now
    **cancels the live card prompt**, and the Register lists any abandoned card attempts with a
    "Cancel it" button.
  - **Security:** the Setup PINs that were stored readable by every staff member are gone (server strips
    them); the way an owner could hijack another person's shop membership is closed; the origin
    allow-list on the payment functions now really blocks `file://`; a **Change my password** card and a
    **My PIN** card (the lock-screen PIN could never be set from the app before) live in Settings → Access.
  - **PIN switching is shop-PC-only** (your choice): a manager PIN typed on a phone only unlocks that
    phone's own screen; switching users works only on a workstation a manager registered in
    Settings → Time clock.
  - **Google Authenticator** (your request): managers/owners can set up an authenticator app from the
    login page or Settings; once set up, that account has **no manager powers until the code is entered**
    on a new device (enforced in the database and the payment functions, not just the screen). You (owner)
    can **Reset 2FA** for a teammate who lost their phone from Settings → Access → Team logins.
  - **Your login:** a temporary password was set on `samer@turbokeysmith.com` and handed to you in chat —
    change it in Settings → Access → My login security.
  - **Inventory engine (later that night):** receiving a serialized key now creates the individual
    units (before, the count vanished on the next stock event); parts imported with a quantity now
    start with that quantity *in the shop* (they used to read 0 per location); a warranty replacement
    can't be issued twice for the same sale without a manager; finishing a stock count applies the
    *difference* you counted, so sales made while counting aren't undone; approving a tech's stock-move
    request moves the stock exactly once even on a double-tap; the spreadsheet importer no longer
    mistakes a "Price" column for your cost and now has a Sell-price column.
  - **Jobs:** a completed or cancelled job can only be reopened by a manager (and it's logged).
- **Later the same day:** you **restored the Supabase project** — verified from this PC: all tables
  from every phase exist, the security lockdowns held, 12/13 edge functions deployed (`billing-webhook`
  still pending, as before). You approved and I did: **merged `main` into this branch** (the November
  website work now lives here too), **archived the three dead pages** + unused code, and **pushed
  everything to GitHub**. Still yours: confirm your real data in the app, PIN-switch policy, tier
  gating timing, lookup-data gaps; then the section-C money/stock items can start.

### 2026-11-03 (📍 New shop address on every page — LIVE, pending owner phone check)
- Turbo Keysmith moved to **9201 N Council Rd, Suite A, Oklahoma City, OK 73132**. Updated on all 240 pages
  (English + Spanish): footer address, contact page, privacy/terms, and the hidden Google business data on
  every page (street, city, ZIP and the map pin, now 35.5633, -97.6567).
- The Warr Acres and Bethany pages no longer say the shop is *in* Warr Acres; they now say the Council Rd shop
  is minutes away. Copy about serving businesses along MacArthur Blvd was kept (still true).
- The "Google" map link on every page is the Business Profile short link — it follows the profile, so it is
  right as soon as the **owner updates the address in Google Business Profile** (please do this; Google and
  the site should match). Also update Yelp/Nextdoor/BBB/NASTF listings if they show the old address.
- Also changed on LocksmithsNearby.com: Turbo's listing shows the new address (manual override until Google
  updates).
- **Owner to-do: purge the Cloudflare cache** (dashboard → turbokeysmith.com → Caching → Configuration →
  Purge Cache → **Purge Everything**). Deployed 2026-11-03 14:50 CST; the homepage was still serving the old
  address from cache right after deploy (other pages checked were already new).

### 2026-10-31 (📝 New blog post: "Can a Locksmith Make a Key for a VW or Other European Car?" — LIVE, pending owner phone check)
- New post at `/blog/can-a-locksmith-make-a-vw-european-key/` (Car Keys & Fobs, by Sam The Key Man, dated
  Oct 31) — why most locksmiths won't touch VW/Audi/BMW/Mercedes, what we do on-site (the recent VW GTI job),
  the honest case-by-case caveat, and why not just go to the dealer. Five FAQs. Built by hand from the holiday
  travel post's HTML (same dark skin, header/footer, CTA style); no generator.
- Two photos from the owner's GTI job, already renamed in `website/site/blog/assets/`:
  `vw-gti-key-grille-okc.jpg` (hero — finished flip key in front of the GTI grille badge, portrait, cropped to
  4:3 on the page) and `vw-gti-cluster-programming-okc.jpg` (body — the key on the instrument-cluster circuit
  board at the bench). Each has a caption directly beneath. Two more GTI photos the owner dropped in
  (`vw-gti-instrument-cluster-okc.jpg`, `vw-gti-key-steering-wheel-okc.jpg`) are committed but not used yet.
- **The 36 MB video `vw-gti-key-reel.mp4` was moved OUT of the website folder** to `website/_media/` (not
  deployed, not committed). Cloudflare Pages refuses any file over 25 MB, so leaving it in `website/site/`
  would have broken every future deploy. If the owner wants the reel on the site it needs to be compressed
  well under 25 MB first (or hosted on YouTube/TikTok and embedded).
- Two Call-Now blocks; links to /automotive/ ("we come to you") and to the car-key cost post ("faster and
  cheaper than the dealership"). **Note:** the brief asked for `/blog/locksmith-vs-dealership-car-keys/`, but
  no such post exists — that URL just serves the homepage fallback. The link was pointed at the live
  "How Much Does It Cost to Replace a Car Key in OKC?" post instead, which has a "Locksmith vs. the dealership"
  section. If a dedicated locksmith-vs-dealership post is written later, update this link.
- Schema: BlogPosting + BreadcrumbList + FAQPage (FAQ schema checked word-for-word against the visible FAQ on
  the live page in a headless browser).
- Wired into: blog index (newest-first), Car Keys & Fobs category page, search-index.json (searching "vw" and
  "european" each surface only this post — checked live), sitemap.xml, feed.xml.
- **Status: LIVE on production.** Live check on turbokeysmith.com confirmed the real page `<title>`/H1, both
  images loading at full resolution with captions beneath, both Call-Now buttons dialing (405) 870-5397, both
  internal links returning the real target pages, and the post present in index/category/search/feed/sitemap.
  **Pending the owner's two-phone check** (iPhone Safari + Android Chrome): the headless 390×844 check showed
  no horizontal overflow and 61 px-tall Call-Now buttons.
- `bittings-app/app/STRUCTURE_NOTES.md` not touched — public-site-only change.

### 2026-10-28 (📝 New blog post: "Holiday Travel Checklist: Don't Get Locked Out This Season" — LIVE, pending owner phone check)
- New post at `/blog/holiday-travel-lockout-checklist/` (Locked Out & Emergencies, by Sam The Key Man, dated
  Oct 28) — a six-step pre-trip checklist: make a spare key, check the fob battery, find the fob's hidden
  mechanical key, mind your keys while loading, have a plan for the road, lock up the house the smart way.
  Four FAQs. Built by hand from the rekey post's HTML (same dark skin, header/footer, CTA style); no generator.
- New hero photo `website/site/blog/assets/holiday-travel-keys-okc.jpg` (SUV with roof-rack cargo, trunk open).
  The owner's original (`man packing luggage into car trunk.jpg`, 1.9 MB) was shrunk to a 1067×1600, ~200 KB web
  copy; the original was removed from the folder as unused.
- Two Call-Now blocks; links to /automotive/ ("cut and program a spare") and to the rekey post ("rekey").
  Schema: BlogPosting + BreadcrumbList + FAQPage (the FAQ schema was checked word-for-word against the visible
  FAQ in a headless browser).
- Wired into: blog index (newest-first), Locked Out & Emergencies category page, search-index.json (searching
  "holiday" and "spare key" both surface it — checked live), sitemap.xml, feed.xml.
- **Status: LIVE on production** (the brief said to publish without waiting). This time the live check looked at
  the page `<title>` and H1 on turbokeysmith.com, not just the status code, and they are the real post — the
  homepage-fallback cache problem from Oct 15 did not recur. Index, category page, search index, feed and
  sitemap on turbokeysmith.com all already carry the post, so no cache purge is needed.
  **Pending the owner's two-phone check** (iPhone Safari + Android Chrome): the headless 390×844 check showed
  no horizontal overflow, the hero loads with its caption directly beneath, and both Call-Now buttons are
  61 px tall.
- `bittings-app/app/STRUCTURE_NOTES.md` not touched — public-site-only change.

### 2026-10-15 (📝 New blog post: "Rekey vs. Replace Your Locks" — LIVE, pending owner phone check)
- New post at `/blog/rekey-vs-replace-locks/` (Home & Business Security — the first post in that category, by
  Sam The Key Man, dated Oct 15) — what rekeying does vs. replacing, when each is right, the move-in /
  tenant / employee / lost-key situations, which is cheaper, 5 FAQs. Two-column comparison table (on phones it
  swipes sideways with the row labels pinned on the left).
- Two new photos in `website/site/blog/assets/`: `rekey-vs-replace-locks-okc.jpg` (hero + social share image,
  worn doorknob with a key in it) and `locksmith-key-cutting-shop-okc.jpg` (key-cutting workbench, in the
  "What does rekeying actually do?" section). The owner's Pexels copies weren't in the repo folder, so the same
  two Pexels photos (IDs 36585227 and 34286675) were fetched from Pexels and resized to web size (94 KB / 229 KB)
  under the SEO filenames. No "pexels-…" filenames are referenced anywhere.
- Two Call-Now blocks; two links to /residential/ ("We quote it up front", "rekey multiple locks to work off one
  single key"). Full schema (BlogPosting + BreadcrumbList + FAQPage; FAQ schema checked word-for-word against
  the visible FAQ).
- Wired into: blog index (newest-first), Home & Business Security category page (replaces the "no posts yet"
  note), search-index.json (searching "rekey" surfaces it — checked in a headless phone-size browser),
  sitemap.xml, feed.xml.
- **Status: LIVE on production** (owner said to deploy without waiting). The deploy itself is correct (the post
  serves on turbokeysmith.pages.dev and when the cache is bypassed on turbokeysmith.com). **Pending the owner's two-phone check** (iPhone Safari + Android Chrome)
  this evening — the headless check (390×844) showed no horizontal overflow, both images load, tap targets are
  61 px tall, and the table scrolls sideways.
- **Cache problem (worse than last time) — and a lesson:** right after the deploy, turbokeysmith.com cached the
  WRONG page for the new post's URL: the site serves the homepage (as a 200) for any URL that doesn't exist yet,
  and the edge cache grabbed that homepage copy for `/blog/rekey-vs-replace-locks/` during the first minute or two
  after the deploy. Because the homepage's stylesheet link is relative, that cached copy renders as an unstyled,
  plain-text homepage at the post's address — which is what the owner saw on his phone ("looks horrible"). The
  owner purged the five URLs listed in the first report (`/blog/`, category page, `search-index.json`,
  `sitemap.xml`, `feed.xml`) and those are now current, but the **post URL itself also needs purging** (it wasn't
  on that list). Fix: Cloudflare dashboard → turbokeysmith.com → Caching → Configuration → **Purge Cache →
  Purge Everything** (simplest), or Custom Purge with `https://turbokeysmith.com/blog/rekey-vs-replace-locks/`.
  Claude Code's first "verified live" check was wrong: it accepted a 200 that was really the homepage fallback.
  **Going forward:** after every blog post, purge the new post's URL too, and check the page `<title>`, not just
  the status code. A proper `404.html` in `website/site/` would stop the homepage being served (and cached) for
  missing URLs in the first place — recommended, not yet done.
- Housekeeping: the Sep 22 transponder post files had been deployed but never committed to git; they were
  committed as their own commit before this work.

### 2026-09-22 (📝 New blog post: "Transponder Key vs. Key Fob vs. Push-to-Start" — LIVE)
- New post at `/blog/transponder-key-vs-fob-vs-push-to-start/` (Car Keys & Fobs, by Sam The Key Man,
  dated Sep 22) — what each key type is, how to tell which you have, why each costs what it does, 5 FAQs.
  Includes a comparison table (on phones it swipes sideways, with the row labels pinned on the left).
- Three new photos in `website/site/blog/assets/`: `car-key-fob-buttons-okc.jpg` (hero + social share
  image), `transponder-key-car-door-okc.jpg`, `push-to-start-button-okc.jpg`. Resized from full camera
  size (1–2 MB each) to web size (85–170 KB) so the page loads fast on phones.
- Two Call-Now blocks; links to the key-cost post and /automotive/. Full schema (BlogPosting +
  BreadcrumbList + FAQPage; FAQ schema checked word-for-word against the visible FAQ).
- Wired into: blog index (newest-first), Car Keys & Fobs category page, search-index.json (searching
  "push to start" and "transponder" both surface it — checked), sitemap.xml, feed.xml.
- **Status: LIVE on production** at https://turbokeysmith.com/blog/transponder-key-vs-fob-vs-push-to-start/ —
  owner OK'd it after the preview and ran the production deploy. Re-verified live: post, all 3 photos, both
  links and the category page serve the new version.
- **Cache note:** right after the deploy, Cloudflare kept serving saved (old) copies of `/blog/`,
  `/blog/search-index.json` and `/sitemap.xml` on turbokeysmith.com, even though the deploy itself had them
  (confirmed by adding `?cb=…` to the URL, and on turbokeysmith.pages.dev). Fix: Cloudflare dashboard →
  turbokeysmith.com → Caching → Configuration → **Purge Cache → Custom Purge**, paste those URLs. Worth
  doing after every blog post.
- Note: the owner dropped the photos into the older `Desktopittings	urbokeysmith-main` copy; that copy's
  blog is out of date (2 posts), so the post was built in the live `Desktop	urbokeysmith-main` copy.

### 2026-09-19 (📈 Google Analytics added to every page + a guard so it can't vanish)
- **Problem:** GA4 said "No data received" for turbokeysmith.com — the site had **no Google Analytics tag at all**.
- **Fixed:** added the GA4 tag (Measurement ID **G-8LY4YD2YFG**) to the `<head>` of **all 246 pages** (English +
  Spanish, blog, city pages, careers, turbo-premium). There is no shared header in this site, so every page carries its
  own copy; the one master copy of the tag is `website/_tools/ga-snippet.html`.
- **Guard:** `node website/_tools/ga-tag.mjs` checks every page and fails loudly if any is missing the tag;
  `--fix` adds it to any page that lacks it (use after creating new pages).
- **New deploy command:** `node website/_tools/deploy-site.mjs` (add `preview` for a preview deploy). It runs the check first and
  **refuses to deploy** if a page is missing the tag. A git pre-push hook (`.githooks/pre-push`) also blocks pushes.
- Verified: removing the tag from one page (test) made the check, the deploy command and the push hook all refuse.
- **Automatic for Claude:** project hooks (`.claude/settings.json`) re-add the tag to any page Claude creates or edits,
  and stop Claude from deploying with the old unchecked command. Active from the next Claude session onward.
- **Deployed to production 2026-09-19** — verified the live pages serve the tag. Owner to confirm visits appear in GA4 → Reports → Realtime.

### 2026-09-14 (🎉 GBP API APPROVED & LIVE + personalised auto-replies deployed)
- **Google approved the Business Profile API access** (submitted 2026-08-21, approved ~3.5 weeks later).
  Owner enabled the APIs in the Cloud console; everything that had been "armed and waiting" since August
  activated on the first run. The tell-tale was the error changing from `429` (quota 0, not approved) to
  `403 "API has not been used in project 1038005653431 or it is disabled"` — the classic approved-but-not-
  switched-on message.
- **What went live automatically:** review source flipped `places-seed` → `gbp`; the carousel went from a
  5-review Places sample to the **full 229 written reviews** (302 total ratings, ~73 are star-only with no
  text); the **"Latest Updates" posts section now shows 9 Google posts** and revealed itself on the live
  site with no redeploy (the `count>0` postMessage handler in `index.html` did its job).
- **Review history was protected exactly as designed:** the first successful sync stamped the watermark at
  `2026-09-14T21:11:36Z`; every pre-existing review predates it, so **0 auto-replies** went to the back
  catalogue. Only genuinely new 4–5★ reviews get replies from here.
- **Auto-replies are now personalised (owner request, deployed same day).** Replaced the 6 flat templates
  with a service-aware composer in `website/widgets-worker/src/index.js`: it reads the review text,
  classifies the job into one of **9 categories** (auto/home lockout, fob & programming, ignition, car key,
  car rekey, home rekey, lock work, commercial), thanks the customer for *that specific job*, and offers one
  genuinely adjacent service (lockout → spare key; home lockout → rekey/smart lock; key jobs → the 6-month
  warranty). Variety via stable hash of the review id, so a given review always yields the same text.
- **Deliberately conservative:** anything not confidently classified falls back to a warm generic reply —
  a public reply describing the WRONG job is far worse than a slightly generic one. Tested against all 227
  live reviews: ~40% classify to a specific job, ~60% are pure praise with no job mentioned → generic.
  New `not:` guard field lets a category exclude false contexts.
- **Two misfires caught in preview BEFORE deploying** (worth remembering the pattern): (1) the word
  "business" matched a customer writing *"this business was amazing"* about a **porch lockout** — was about
  to offer her master-key systems; commercial now requires a possessive signal ("my office", "our
  storefront"). (2) *"rekeyed my car"* matched the residential rekey rule and offered **deadbolts**; there is
  now a separate `auto_rekey` category. **Always preview replies against real reviews before deploying.**
- **Deployed:** version `51074891-26e5-4877-80d1-e845df955d92`. Verified post-deploy: `lastGbpError: null`,
  229 reviews, 9 posts, `autoReplied: 0`, watermark intact. Max reply length 245 chars (Google allows 4096).
- **Back-catalogue catch-up (same day, owner asked):** audited all 302 reviews via the API — **291 were
  already replied to by hand**, so this was never a mass blast: only **11 unreplied**, 10 of them recent
  5★ (2026-08-21 → 09-10). Replied to all 10 directly (1.5s apart), 0 failures. **301/302 now replied.**
- **Name handling hardened first — the dry run caught two that would have been embarrassing in public:**
  "N Shaw" (single initial) produced *"Thanks so much, friend!"*, and the account "My WorkStuff" produced
  *"Really appreciate you taking the time to leave this, My!"*. `firstName()` now returns null for bare
  initials, names containing digits, and a stoplist of non-name tokens (my/the/a/mr/dr/info/admin…), and
  the new `applyName()` drops the greeting cleanly instead ("Thank you so much!"). Deployed as version
  `8b5ec4a9-8fdc-46a9-b656-0b3b6b9e619e`.
- **⚠️ ONE UNREPLIED REVIEW REMAINS, DELIBERATELY: a 1★ from "Zach" dated 2025-08-19** — says a lock was
  drilled out, the replacement part was not on the truck, and calls went unanswered afterwards. The system
  will **never** auto-reply to 1–3★ by design. It is over a year old, still unanswered publicly, and sits
  on the profile where every prospective customer can read it. **Needs a personal reply from Sam.**
- **Still open:** mobile sign-off (iPhone Safari + Android Chrome — homepage + a city page, swipe the
  carousel, tap "Read all reviews") has been pending since August and is more meaningful now. Also worth
  eyeballing the **first real auto-reply** when a new 4–5★ review lands, to sign off on the tone; the owner
  was offered "— Sam, Turbo Keysmith" as a warmer sign-off and softer cross-sell, and chose to ship as-is.

### 2026-08-25 PM (📝 New blog post: "Why Won't My Key Turn in the Ignition?" — ON PREVIEW, awaiting phone check)
- New post at `/blog/key-wont-turn-in-ignition/` (Locked Out & Emergencies, by Sam The Key Man,
  dated Aug 25) — 5 causes a key won't turn, what not to do, 4 FAQs. Real shop photo hero (worn
  Ram key vs fresh cut, converted from the owner's WebP). Two Call-Now blocks; internal links to
  /automotive/ and the key-cost post. Full schema (BlogPosting + BreadcrumbList + FAQPage; FAQ
  schema verified word-for-word against visible text).
- Wired into: blog index (newest-first), Locked Out & Emergencies category page, search-index.json
  (search "ignition" surfaces it — verified), sitemap.xml, feed.xml.
- **Status: LIVE on production** at https://turbokeysmith.com/blog/key-wont-turn-in-ignition/ —
  owner approved after the preview phone check; re-verified live (post renders, hero loads, both
  CTAs dial, links resolve, index/category/search/sitemap/feed all serving the new post).

### 2026-08-25 (🔢 Review count is now a live running tally site-wide)
- Every hand-typed **"250+ Google reviews"** across the site (316 spots on 222 pages, English AND
  Spanish "reseñas") now updates itself to the real current count from Google — today it shows
  **"295+"**. The number comes from the same widgets Worker (new tiny `/stats` feed, refreshed every
  6 hours); the page script lives in `assets/i18n.js` (plus an inline copy on `turbo-premium.html`,
  the one page that doesn't load that file). If the feed is ever unreachable, pages safely show the
  static "250+" fallback baked into the HTML. Owner also restricted the Maps API key to Places API ✅.
- Verified in a headless browser on 4 page types (EN home, ES home, city page, premium page): all
  show 295+, zero stale 250+ left. Still **pending mobile sign-off** along with the widgets below.
- **GBP API approval: still pending with Google** (submitted 2026-08-21; auto-reply & posts feed
  remain armed and will self-activate).

### 2026-08-21 PM (⭐ Self-hosted widgets LIVE on all 92 pages — third-party provider fully replaced)
- **The reviews carousel is back**, now served by our own free Cloudflare Worker
  (`turbokeysmith-widgets`) instead of the dead paid provider. Live on the homepage and all 91
  city/service pages. Shows real Google reviews (5-star only), star badges, reviewer photos, swipe/arrow
  navigation, and a "Read all 293 reviews on Google" link. **Review count & star rating refresh
  automatically every 6 hours** (via the owner's Google Maps key — works today).
- **The "Latest Updates" (Google posts) section** is rebuilt the same way but stays **hidden until
  Google approves** the Business Profile API access (form submitted today; days to ~2 weeks). Once
  approved, the same system also unlocks: the FULL review list (not just 5), **auto-replies to new 4-5★
  reviews** (rotating natural templates, first names, never replies to anything pre-dating activation),
  and **email alerts to the owner for 1-3★ reviews** (those are never auto-replied). No action needed —
  it starts working by itself when Google approves.
- **Owner may still do 1 thing:** restrict the Google Maps API key to "Places API" in the Google Cloud
  console (security hardening; instructions were given in chat).
- **Status: code-complete, pending mobile sign-off** — needs the owner's phone check on iPhone Safari +
  Android Chrome (test steps given in chat): homepage + one city page, swipe the reviews, tap the
  "Read all reviews" link.

### 2026-08-21 (🔐 Privacy Policy page + Google API setup for self-hosted widgets)
- **Context:** the two paid third-party widgets from localmarketingmanager.com (the Google **reviews
  carousel** on the homepage + ~91 city pages, and the Google **posts feed** on the homepage) went dead —
  the provider now shows "This widget is no longer active." We are replacing both with **our own free,
  self-hosted widgets** (build in progress; see next entries when they land).
- **New public page: `/privacy/` (Privacy Policy)** — plain-language, matches the Terms page design; linked
  from the footer of the new page and added to the sitemap. Created because (a) the site collects contact/
  careers form data and should have one, and (b) Google requires a public privacy-policy link to publish
  the OAuth app used for the widget system. ⚠️ Not yet lawyer-reviewed (same status as Terms).
- **Google side (owner's account):** Google Cloud project `turbo-keysmith` created; Maps API key issued and
  filed in `.secrets/` (owner asked to restrict it to Places API); OAuth app "Turbo Keysmith Widgets"
  configured; **Business Profile API access form submitted — waiting on Google approval (days to ~2 weeks),
  quota is 0 until then.** Auto-reply-to-reviews plan approved by owner: auto-thank 4–5★, email alert (no
  auto-reply) for 1–3★.
- **Housekeeping:** `.secrets/` folder is now gitignored (it wasn't — risk of committing credentials);
  Google credentials filed there.

### 2026-07-02 PM (⏱ Shift + machine-lock + time-tracking system — built, OFF by default)
- **New: a time clock that ties "using the shop PC" to "being on the clock."** Plain-language:
  - **Start of day** — a full login (username + password) **clocks you in** for the day.
  - **Stepped away** — after N idle minutes (default 5, adjustable) or a **Lock now** button, the
    screen **locks**; a **PIN** unlocks it and you're right back in, **still clocked in** (locking
    is not a clock-out). **4-digit** PIN = staff, **6-digit** = manager/owner. A *different* valid
    PIN **switches the active user** so their work credits to them; a 6-digit manager PIN can always
    take the machine. Wrong PIN → message + a "full logout / log in as someone else" escape.
  - **Done** — **Clock out** (Lunch / Personal / End of day) clocks out **and logs out**; coming
    back needs a full login again.
  - **Off-site jobs are NOT a clock-out** — a tech on a field job is still clocked in; **travel time
    is read from the scheduler** (the gap between *En route* and *On site*), nothing new to do.
  - **Timesheets** — staff see **their own**; **owner/manager see everyone and can correct entries**
    (fix a missed clock-out, adjust times); **every correction is logged** (who/what/when). All
    shop-scoped.
  - **Manager override vs. switch are kept separate** — approving a discount/refund on someone's
    screen authorizes just that action and does **not** switch the logged-in user.
- **It's OFF until you turn it on.** Two switches, both default off, both required: a **shop toggle**
  (Settings → Time clock & lock) **and** a per-device **"this is a shop workstation"** checkbox. So
  flipping the shop switch does nothing until you also mark the shop PC — your techs' **phones never
  lock and never auto-clock**, and nothing about running real jobs/sales changes until you opt in.
- **Also fixed a real latent bug along the way:** the app never exposed its live cloud-client handle
  (`TKS._sb`), so the signed-in-only screens (Reconcile / Returns / warranty / serialized receiving
  and the tier check) were silently falling back to "sign in first" **even when signed in** — that's
  why they read "pending live-session." One line fixed it; those screens now work in the browser.
- **NEEDS YOUR DEVICE/EMPLOYEE TEST** (can't be confirmed headless): the real idle-lock timing, the
  on-screen PIN pad, PIN **session-switch** on a shared PC, and clock-out→login on the actual shop
  machine. The server pieces (clock in/out, PIN rules + uniqueness, unlock/switch, timesheet edit +
  audit, travel) are all live-verified on the QA test shop. See the report for the exact steps.

### 2026-07-02 PM (⚡ Overnight pre-pilot build — the whole review punch-list DONE)
- **You green-lit the full `PRE_PILOT_REVIEW.md` list; all 16 do-able items are built, verified
  live, and pushed** (one revertible commit each). Highlights, plain-language:
  - **A second shop now truly works end-to-end:** its own Settings + commission rules, its own
    plan/seat counts, and **every server function checks the caller's shop** — proven live: the QA
    test shop can't see or touch one row of your real shop's data through any function.
  - **You can add an employee from Settings** (name/email/role → the app creates their login with a
    temp password you hand over). This was the practical pilot blocker.
  - **Commission per your decision:** technicians see only their own; front desk sees none.
  - **Money-path hardening:** billing checkout + card-reader helpers bound to the caller's shop;
    all payment endpoints behind the origin allow-list; the old hardcoded owner-email/PIN removed.
  - **New:** 📦 Receive-units screen (starts serialized tracking) · 📜 owner-only Activity screen
    (the audit trail finally has a read UI) · 🖨️ auto-print-receipt-on-sale option · missing-cost
    nudge · Manage-subscription button (Stripe portal, deployed).
  - **Safety net grew:** the multi-tenant isolation proof is now **29/29 PASS**; a final sweep shows
    all 16 screens render clean in both themes with zero console errors.
- **Waiting on you:** deploy `billing-webhook` + Stripe price envs before billing go-live; set
  `ALLOWED_ORIGINS` when the app gets its real domain; leaked-password protection (paid tier);
  Spanish publish; thermal logo test; website-leads decision; real-device sweep.

### 2026-07-02 (🔍 Pre-pilot review: security fix applied + full findings report)
- **A full pre-pilot review of the whole codebase ran overnight** — security, half-finished work,
  redundancy, quick wins. **Read `PRE_PILOT_REVIEW.md` (repo root) — it's written for you**, with
  what was fixed (each fix = one revertible commit) and what needs YOUR decision (🔴/🟡/🟢).
- **Security fix applied + verified live:** the ~15 database functions that anyone-without-a-login
  could call (the QA audit's 🔴, incl. `create_shop` and one that leaked Stripe customer IDs) are
  now locked down (migration `phase5_5f`). Proven safe 4 ways: the multi-tenant isolation test
  passes **25/25** (a new check proves payment triggers still fire), anonymous calls now get
  "permission denied", a signed-in QA user still runs every app function, and the Supabase
  security linter shows **zero** anonymous-executable functions.
- **Small fixes:** customer edits now stamp their "last updated" time (QA audit item); the
  Reconcile screen got its missing "✕ Discard count" button; favicon 404 noise cleared; a stale
  code comment and two unused dev packages removed; the isolation test now runs on any PC.
- **Top decisions waiting on you (see the report):** Commission tab visible to techs (hide vs
  self-scope?); `billing-checkout` + a group of older server functions need shop-scoping before
  5 real shops coexist; Settings storage is one-shop-only (`shop_config` singleton); and there is
  **no staff-invite flow** — the practical pilot blocker.

### 2026-07-02 (📦 Inventory traceability engine built — serialized units, cycle count, warranty/returns)
- **Every unit of inventory can now be tracked individually** ("serialized"): each key gets its own
  ID and is traceable through its whole life — which supplier & batch it came from, and whether it was
  sold, failed, warranty-returned, sent back, or credited. **A sale now records exactly which unit
  went to which customer.**
- **Reconciliation (cycle count):** an assignable count where staff tap/type the count per item and
  pick a reason for any discrepancy (from a set list — required for the assigned staff, optional for
  you/managers); a manager applies it to stock.
- **Warranty replacement:** checks a customer's key is still in warranty, issues a new one from your
  stock (logged as warranty, **not** a sale), and puts the bad key on the supplier-return list.
- **Failed key** (never worked): pulled from stock, flagged to send back — separate from warranty.
- **Return-to-supplier list:** everything owed back, tagged by supplier, tracked needs-return → sent →
  credit/replacement received.
- **Inventory dashboard:** total retail & cost value of stock, plus warranty-replacement and failed-key
  counts.
- **Status:** the **engine is built and proven** in the test shop (22 automated checks passed), and
  the **screens are now built too** — the count screen, the 🛡️ warranty + ⚠️ failed buttons on
  inventory, the returns list, and the dashboard cards. They boot cleanly (no errors, light + dark),
  but the **live signed-in flow is pending your phone sweep** (I can't drive the signed-in app
  automatically). Built safely before the pilot so big structural changes only touched test data.
  Kept compatible with a future **per-key vehicle fitment** project (no rework needed later).
- Two new plain-English owner docs added: **`BITTINGS_OVERVIEW.md`** (everything the app does, with
  honest DONE/IN-PROGRESS status) and **`ROADMAP_AND_IDEAS.md`** (the parking lot: Now / Planned / Ideas).

### 2026-07-01 (🏦 Stripe Connect built — each shop gets paid directly, 1% platform fee · TEST)
- **Each shop can now connect its own Stripe account and get paid directly.** Before, all card money
  would have pooled into one account; now, when a shop connects, card charges deposit straight into
  **that shop's** bank. **Bittings automatically takes a 1% fee**; the shop pays the normal Stripe
  processing fee. Cash and check don't need any of this.
- **How a shop connects:** in **Settings → Payments** there's now a **"Card payouts — your Stripe
  account"** card. The owner taps **Connect your Stripe account**, Stripe collects their business
  info, bank, and ID (we never see or store banking data), and the card then shows **✓ Connected**.
  Until that's done, the app shows **"Not connected — card payments are off"** and card charges are
  blocked (cash/check still work).
- **Proven in test mode, end-to-end:** created a real connected account + onboarding link; confirmed
  card is blocked before connecting; then ran a **$60 test card charge** and verified in Stripe that
  the **1% ($0.60) platform fee** and the **transfer to the connected account** both applied, the shop
  bore Stripe's processing fee, and a **full refund** pulled the money back correctly. No real money.
- **Status:** server side is built, deployed, and verified. The **on-screen Connect card** is
  code-complete but its look/feel is **pending your device sweep** (couldn't render the signed-in app
  headless here). The **real Express onboarding** (entering business/bank/ID) is a phone step for you.
- *For the pilot:* every shop — including yours — connects its own account. I set up the test using a
  Stripe test connected account so the money mechanics are proven now.

### 2026-07-01 (💳 Payments proven end-to-end in TEST mode · fixed a hidden go-live blocker)
- **We ran real test payments all the way through for the first time — and they work.** In a
  safe, walled-off **test shop** (fake staff logins, no real customers, Stripe in **test mode** on the
  "Teal Jumper" account — no real money), a card charge with test card `4242…` went through:
  charge → the 2% credit-card surcharge applied correctly → **full refund** and a **partial refund**
  both worked → and **cash and check** sales recorded and **voided** correctly. Each step was checked
  in **both** Stripe's test dashboard and our own database, and they matched.
- **🔴 Found and fixed a hidden bug that would have blocked go-live.** Every payment (card, cash,
  refund, void) was actually **failing with a "tenant service unavailable" error** before reaching
  Stripe. Cause: when we added multi-shop separation (Phase 5), the payment system was never given
  permission to look up *which shop* the person taking payment belongs to. It had never surfaced
  because no card payment had ever been run through the live system before this test. **Fixed** with a
  one-line database permission (tracked as migration `5c`) — safe, exposes nothing new. **This is
  exactly the kind of thing that would have bitten you on your first real charge.**
- **🟡→✅ Reporting bug fixed:** a **partial** refund used to show as a **full** refund in
  Transaction History / Closeout (the money side was always correct in Stripe — only the on-screen
  record was wrong). Now the app tracks the exact refunded amount, shows a sale as *partially
  refunded*, and reports the correct net-collected. Verified in the test shop with a real partial
  refund (tracked as migration `5d`).
- **Test shop left in place on purpose** so you can do your own phone sweep (including typing a card
  in the app — the one thing that needs a real phone). Logins: `qa-owner@bittings-qa.test` etc.,
  password `QaTest!2026`. Tell me when to delete it.
- *(Also completed just before this: a full 27-check pass of the non-payment cloud actions —
  inventory moves, scheduler, D1 filing, customer add/edit/delete, and per-shop data separation — all
  passed. See `bittings-unified/docs/QA_AUDIT_2026-06-30.md`.)*

### 2026-06-30 (📖 Added EVERYTHING.md — the "read this first" orientation file · nested repo removed)
- **New `EVERYTHING.md` at the repo root** — a master orientation file for any fresh Code session
  or new machine: what Bittings + Turbo Keysmith are, the two codebases, the systems
  (GitHub/Supabase/Cloudflare/Stripe), what's built & proven (through multi-tenancy + payment
  isolation + hardware), how we work, and what's next (Stripe test → live → 5-shop pilot).
- **The stray nested git repo inside `bittings-unified/` was removed** — it had quietly caught a
  commit on the wrong history. It's now **one clean repo** that reliably pushes to GitHub; every
  file is tracked by the root repo (verified).

### 2026-06-29 (🗂️ Repo tidy: the app is now in one folder · stale copy archived · shop-PC parity backed up)
- **Everything for the Bittings app now lives under one folder, `bittings-unified/`.** The app's
  planning/audit docs were moved into **`bittings-unified/docs/`** and the one-off dev/data/pitch helper
  scripts into **`bittings-unified/tools/`** — they used to be loose at the top level mixed in with the
  website's files. Nothing about how the app runs changed; only where these support files sit.
- **The old, out-of-date app copy was retired to `_archive/`** (`_archive/bittings-app/` + the old zip).
  `bittings-unified/` is the one and only active app from here on. (Still recoverable from `_archive/`
  and GitHub if ever needed.)
- **Website-only docs** (`DEPLOY_CLOUDFLARE.md`, `SITE_PAGES_AUDIT.md`) moved in with the website
  (`website/`). The repo root now holds only whole-project files (this handoff, the master task list,
  the README, the developer config).
- **This shop PC's work is backed up to GitHub.** The shop-floor **hardware** features (barcode
  scanner, Star thermal receipt printer + cash drawer, Zebra label printer) and the **per-shop payment
  safety** changes that were only on this machine are now committed and pushed, so nothing is at risk of
  being lost. The shared cloud (database + payment functions) was re-checked and is fully in sync.

### 2026-06-27 PM (🚀 Unified app on a public URL · dev scaffolding stripped · old demo removed)
- **Unified Bittings is reachable from any device** for the owner's sweep via a Cloudflare **quick
  tunnel** (`cloudflared`) to the locally-served `bittings-unified` (couldn't use Cloudflare Pages —
  this PC isn't logged into Cloudflare; a permanent Pages deploy needs `wrangler login`). Points at the
  **live Supabase**, so sign-in works anywhere. The tunnel URL is temporary (lives with the session).
- **Dev scaffolding stripped** so it reads as a shipping product: the "On this device / ☁ Synced" data-
  location pills + the cloud-sync info notes are **hidden**; the sign-in page no longer shows a
  `127.0.0.1` address or the "Check connection" debug button; the Register's "(TEST until live keys)"
  banner is reworded; "connect to the cloud" fallback prompts reworded to plain "Sign in to…".
- **Old investor demo removed.** Deleted `bittings-app/START-DEMO.html` + `START-DEMO.bat` +
  `READ-ME-FIRST (laptop demo).txt` + the desktop-shortcut scripts + `Bittings.ico`. The **unified
  clone is the new base.** The rest of `bittings-app` is **kept as the fallback** until the device sweep
  proves the unified app, then it gets fully retired at cutover. All recoverable from GitHub.

### 2026-06-27 (🚐 Cross-device stock-move requests · scheduler test fixes · dark-mode date label)
- **Scheduler rebuilt as a dispatch tool** (per-tech board + Day/Week/Month, assign/reschedule/cancel,
  VIN, van flags) and then polished from your testing: **save now persists** (a duplicate-id bug fixed),
  **drag actually moves + confirms with a toast**, and the day label is **contextual** ("Today" only on
  today; "This week"/"Week of…"; the month) and **readable in dark mode** (moved into the nav).
- **NEW database table — needs to be applied.** Added **`move_requests`** so a technician's stock-move
  request reaches a manager on **any device** (before, it only lived on the tech's device). A manager
  sees the request, taps **Approve**, and the stock moves (via the existing move function); owner/manager
  still move stock directly. **Action required:** apply `bittings-app`'s new migration
  `supabase/phase3/3a_move_requests.sql` in the Supabase SQL editor (Code couldn't apply it — no DB tool
  on this PC). Until it's applied, requests fall back to same-device only; nothing breaks.

### 2026-06-26 22:10 CST (🏗️ Phase 3 kicked off — front-end unification on a clone)
- Started the **front-end unification** plan (the inconsistent iframe-glued staff app → one unified,
  iframe-free app on the same proven backend, plus a native in-app calendar).
- **Made a clone:** new branch `phase3-frontend-unification` + a copy of the staff app at
  **`bittings-unified/`**. The proven app (`bittings-app/`) and the investor demo stay **untouched as
  the fallback** the whole time; all rebuild work happens in the clone.
- **Mapped the job:** exactly **6 screens** are the iframe seams — Receipts, Scheduler, Fleet, Lishi,
  Programmers, Settings; the other 8 screens are already unified. Wrote the authoritative tracker
  **`PHASE3_FRONTEND_PROGRESS.md`** (architecture inventory, design-system plan, scheduler data model,
  staged build order). The backend is not touched by any of this.
- **All 6 bolted-on (iframe) screens are now unified** in the clone — they read as one app instead of
  pages glued together. **Fleet, Settings, Programmers** were rebuilt **natively** inside the app shell;
  **Lishi, Receipts, Scheduler** are **seamless mounts** (kept as their own files but with the old
  page-within-a-page header/back hidden, theme-synced — chosen for the big ones so we don't risk
  rewriting a proven 638 KB invoice screen). The proven backend was **not touched**. **Code-complete,
  pending the one device sweep.** *(Node.js was also installed — needed for the next website deploy.)*
- **Scheduler — rebuilt as a true dispatch tool.** (The first version was just a view-only calendar;
  the owner asked for a real field-service scheduler, so it was scrapped and rebuilt.) The clone now has:
  a **per-technician dispatch board** (a column for each tech + an Unassigned lane) plus **Day / Week /
  Month** calendar views. Each job card shows the customer, time, job type, vehicle, status, address and
  a one-tap **Navigate** link, and flags when a part **isn't on the assigned tech's van**. You can
  **create/edit a job** (with VIN decode that fills year/make/model, and pulling a customer from your
  existing list), **assign it to a tech**, move it through the field statuses (**Scheduled → En route →
  On site → In progress → Completed → Cancelled**, color-coded), and **drag** a job between techs to
  reassign or to another day to reschedule. Reschedule and cancel still ask for a **reason** (with the
  manager-signoff/parts warning), exactly like before. Replaces the Google-Calendar link — the in-app
  board is now the source of truth. The booking data and all the server-side job rules are unchanged.
  Verified by rendering it in a real (headless) browser; **drag + the signed-in cloud actions are on the
  owner's device-sweep list.**
- **Still to do:** the single device sweep (iPhone + Android, owner + staff), then the cutover (point the
  app at the unified version, keep the old one as the fallback until confirmed).

### 2026-06-26 22:00 CST (💾 New PC: Git installed · all work committed + backed up to GitHub)
- **New PC had no Git installed at all** — so weeks of recent work (the NASTF/D1 stage, the Ilco 2025
  key-blank import, the investor demo, blog post #2, plus 20+ edited core files) were sitting **uncommitted
  and un-backed-up** in the working folder. Installed Git (2.54.0) and **committed the whole batch** to the
  `phase2-pos-commission` branch.
- **Backed everything up to GitHub** (`github.com/turbokeysmith/bittings`). Previously **none** of the
  branches except `main`/`repo-cleanup` existed on GitHub — they lived only on the old PC. Pushed **all**
  branches: `phase2-pos-commission`, `phase1-roles-security` (192 commits), `app-structure` (146),
  `restructure` (136), `public-website` (21). Nothing now lives only on one machine.
- **Tidied what Git tracks:** the Cloudflare deploy cache (`.wrangler/`) and the regenerable demo zip
  (`bittings-app.zip`) are now ignored (they're rebuilt on demand, no need to store them).
- No app/website behavior changed — this was repo safety only.

### 2026-06-26 PM (🧰 Demo made self-contained · warranty fixes · Reports toggles · fleet/commission/NASTF in the demo)
- **Reports metric toggles now light up when tapped.** The Total Sales / Cost / Profit pills weren't re-rendering on
  click (their lit state drifted from the actual data) — fixed so tapping a pill updates it immediately.
- **Warranty now actually shows on the receipt list** — the live Receipts viewer (the read-only [All | NASTF] list)
  never had a warranty pill; it does now: a compact countdown in the top row (between the number and the amount)
  **plus** the full pill below, on both the All and the legacy lists.
- **Warranty colors:** green normally → **dark orange** in the last 30 days → **red** once expired (both pills).
- **Warranty math fixed:** a job done *today* now correctly shows a fresh ~6-month warranty (the demo previously
  used a random spread that could show "expired" on a same-day invoice). **Warranty is now 6 months** (Setup default
  + every demo receipt) and always counts from the job's own date. **Service-only jobs (lockouts, trip/dispatch
  fees) carry NO warranty** — only real work does.
- **Demo data overhauled to be realistic + self-contained.** The investor demo now seeds **30 receipts/invoices
  spread across the last 6 months** (a few today so Reports isn't empty), each with a **matching paid transaction**,
  so Receipts, Reports, Transaction History, Closeout and Commission all tell the *same* story. **Some are tagged
  NASTF** (Customer / Auction-Fleet D1, with the D1 countdown — a couple still outstanding, the rest filed). The
  warranty spread naturally shows green / about-to-expire / expired.
- **Fleet, Commission, NASTF and per-van stock now work in the offline demo.** Those screens normally read the
  cloud (which the offline demo can't reach), so they were blank. Added demo-only local fallbacks (guarded by the
  `tks_demo_mode` flag — inert in production): **3 work vans** (Ford Transit / Chevy Express / RAM ProMaster), the
  **staff roster**, inventory **split across shop + the 3 vans** (each van has its own stock, visible via the 📍
  stock-by-location panel), the **commission ledger** (computed from the seeded sales), and the **NASTF D1
  worklist**.
- **5 vehicles preloaded by VIN** so you can demo instantly offline (and show the Autel restriction notes on the
  newer Ford & Toyota). Paste any of these into Start-a-Job (automotive) or Programmers:
  - `1FTEW1EP5JFA12345` — **2018 Ford F-150** (newer Ford → Autel "2015+ removed" note)
  - `4T1B11HK5KU123456` — **2019 Toyota Camry** (Toyota → Autel "AKL removed / add-key only" note)
  - `1HGCV1F34JA123456` — 2018 Honda Accord
  - `3GCUYDED5LG123456` — 2020 Chevrolet Silverado 1500
  - `1N4AL3AP5GC123456` — 2016 Nissan Altima
- **Status:** code-complete; carefully traced but **not yet run in a live browser from here** — re-open
  `START-DEMO.html` (it reseeds) and eyeball Reports/Commission/Fleet/Receipts. Mobile (iPhone Safari + Android
  Chrome) sign-off still pending for the receipt-tile pills.

### 2026-06-26 (🖥️ Desktop app shortcuts · ⚙️ Settings left-rail · 🛡️ warranty on receipt tiles · demo Reports fixed)
- **Two desktop shortcuts (frameless Chrome "app" windows).** Running `bittings-app/Create Desktop Shortcut.bat`
  now puts **two** icons on the Desktop, both using the red Bittings logo and both opening in Chrome **app mode**
  (no address bar, no tabs — looks like an installed program): **"Bittings"** = the real staff app
  (`index.html`), **"Bittings Demo"** = the investor demo (`START-DEMO.html`, sample data). Each runs in its **own
  private Chrome profile** (`--user-data-dir`) so the demo's sample shop + its fake "signed-in" token can never
  leak into the real app (and vice-versa), and neither touches your normal Chrome. No local server needed.
- **Settings (Setup) now has a vertical category menu on the LEFT** instead of chips across the top — styled to
  match the main app's sidebar, with an **icon on every category** (🏪 Business identity, 💲 Sales tax, 💳 Payments,
  👥 Access, 🔗 Quick links, 🗂 Service types, 🛠 Services, 🕒 Hours, 📦 Inventory, ✅ Review). On a phone the rail
  stays vertical on the left but shrinks to a compact icon+label column. Pure UI; all setup logic unchanged.
- **Warranty tracker now shows on the receipt tiles too.** In Receipts, each tile shows a compact warranty
  countdown pill in the **top row, between the receipt number and the amount** (green → amber ≤30 days → red when
  expired) — **in addition to** the existing full pill below the description (both kept).
- **Demo fixes.** (1) The demo's seeded receipts now carry a **spread of warranty dates** so the new tile tracker
  shows every state (healthy / about-to-expire / expired) instead of all reading ~12 months. (2) **Reports was
  empty in the demo** because Reports reads the cloud `payment_transactions` table, which the offline demo can't
  reach — the demo now **seeds ~90 days of local transactions** and the pay engine serves them when a new
  `tks_demo_mode` flag is set (production never sets it, so it's inert there). Reports/Transaction-History/Closeout
  now populate in the demo.
- **Status:** code-complete; traced end-to-end but **not yet device-verified in a live browser** — pending an
  on-screen check (desktop Chrome for the shortcuts/Settings/Reports; iPhone Safari + Android Chrome for the
  receipt-tile warranty pill).

### 2026-06-24 (🔧 Programmers page now hides Autel AKL on Ford/Toyota too)
- **Fixed:** the **Programmers** reference page was still showing **Autel doing AKL on Ford and Toyota** — the Start-a-Job lookup already knew better, but the Programmers coverage grid was printing the raw seed. Both views now apply the same real-world removal: **Autel × Ford/Lincoln 2015+** shows **AKL "Removed" / add "Pre-2015 only"** (with the "Aug 2025 — use SmartPro/AutoProPad/Lonsdor for 2015+" note), and **Autel × Toyota/Lexus/Scion** shows **AKL "Removed" (add-key only)** with Lonsdor/AutoProPad called out. Applied in the page's display logic (`renderCards` + the compact summary), so it's live on reload — no re-seed needed, and your saved corrections still override.

### 2026-06-24 (📝 Blog post #2 — "Cost to Replace a Car Key in OKC" — built + on preview, pending your two-phone check)
- **New blog post hand-built** at `website/site/blog/car-key-replacement-cost-okc/` — "How Much Does It Cost to Replace a Car Key in Oklahoma City?" (category **Costs & Choosing a Locksmith**, by Sam The Key Man, dated June 24 2026). Real 2026 price ranges by key type ($50–$100 basic / $120–$250 transponder / $200–$450+ smart fob), why prices differ, locksmith-vs-dealer, the spare-key money-saver, the "$19 key" bait-and-switch warning, and 5 FAQs. Two **Call Now — (405) 870-5397** CTA blocks (top + bottom), the two Ford-Raptor photos, and internal links to the **Automotive**, **Financing**, and **FAQ** pages. Full schema (BlogPosting + BreadcrumbList + FAQPage, FAQ text matches the page word-for-word).
- **Wired into the site:** post card added to the **blog index** and the **Costs & Choosing a Locksmith** category page (newest-first), plus the URL added to `search-index.json`, `sitemap.xml`, and the RSS `feed.xml`.
- **On a PREVIEW branch only** — live + smoke-tested at **https://preview-cost-okc.turbokeysmith.pages.dev/blog/car-key-replacement-cost-okc/** (page, images, schema, and all wiring return 200). **Not on production yet** — waiting on your iPhone-Safari + Android-Chrome check before I deploy to `--branch=main` (and then delete the preview).

### 2026-06-24 (🚗 Ilco 2025 imported · key-data lookup fixed · UI theme unified)
- **Imported your Ilco 2025 reference** — extracted **1,642 vehicles** (code series + HPC card + keyway) verbatim from your `2025-auto-truck-key-blank-reference-guide.pdf`, validated against vehicles we already trusted (MKZ / Silverado / F-150 all matched). It's in `bittings-app/app/ilco-2025.js`; the Start-a-Job lookup now shows the code series **even for vehicles that had no Lishi keyway record**. Your **2009 Lincoln MKS** now returns its series (`1X-1706X`, card `612`) instead of nothing. Catalog code-series coverage jumped to **~70%** of all models, and the keyway shows from Ilco when there's no Lishi record.
- **Lookup bug fixed** — it no longer shows a *different model's* data when a model is missing (an MKS could show MKZ's keyway); it says "verify" instead.
- **`VEHICLE_DATA_GAPS.md`** lists what's still missing (mostly Lishi *keyway* records + some European/EV models not in the North-American Ilco guide). The extractor (`_ilco_extract.py`) re-runs if you get a newer Ilco PDF.
- **Programmer "needs dealer software" guard (with your physical tells)** — the lookup was over-promising (told you a 2025 Silverado was doable). Now, cross-referenced against what the programmers list as doable, it shows **"⚠ verify — might be dealer software only"** with the on-the-vehicle tell instead of a false green light: **Stellantis** (older *egg* FOBIK = doable, newer *square* prox = usually dealer/rolling-PIN), **GM** (newest *shark-fin* keys = dealer; older flip = doable w/ Global-B rolling-code calc), **Ford** (door keyhole *vertical* = doable, *horizontal* = dealer). Genuinely OEM-locked makes are hard-flagged **🔒 dealer-only**: **Tesla/Rivian/Lucid/Polestar**, **Mercedes FBS4 (2015+)**, **newest BMW**. Doable makes (Toyota/Hyundai/Honda/VW-Audi MQB49) are **not** falsely scared — only the very newest year (2025+) gets a mild "confirm your tool covers it." Researched via 2026 web search; the AKL pills drop to "verify"/"dealer." **Provenance:** the underlying coverage was *compiled by me from the tool-makers' own coverage lists* (Autel OTOFIX, Xhorse, AutoProPad, Lonsdor, Advanced Diagnostics) + consensus — a hint, not gospel — so the guard routes you to log what *actually* worked in the **Corrections** box (it then shows on that vehicle next time).
- **Tool-removal corrections (researched 2026)** — vendor coverage pages don't show when a *maker forces a tool to drop functions*. Confirmed + fixed: **Ford forced Autel to remove all 2015+ Ford key/IMMO (Aug 2025)** → Autel (IM608/IM508/KM100) no longer appears for Ford (your SmartPro/AutoProPad/Lonsdor still do); **Autel removed Toyota/Lexus AKL in the US** → Autel shows "add-key only" for Toyota, with Lonsdor/AutoProPad as the AKL tools. Handled in the lookup (`toolRestriction`), so it's immediate without re-seeding. Other makes verified still on Autel (Honda, Subaru, Hyundai/Kia, GM w/ rolling-code, VW/Audi MQB49).
- **UI consistency** — all menus/chrome now follow one theme: the **Receipts and Scheduler headers + bottom nav** are light in light mode / dark in dark mode (were always dark); the **role tag** moved off the top-right where it covered header buttons.

### 2026-06-23 (📱 Mobile fixes — Receipts setup removed, theme match, stock fits)
From hands-on phone testing:
- **Receipts no longer asks you to "set up your business again."** Bittings now **pulls your business identity from the main app's Setup** (name/address/phone/email/license/logo) and never shows its own welcome/setup screen. On a phone, the **Receipts** tab opens straight to the read-only list (no more "chat mode → desktop receipt" detour).
- **Light/dark screens matched up.** The **sign-in screen** ignored your Light/Dark choice (it was always light, so it looked "merged" with a dark app) — it now follows the app theme like every other screen.
- **Inventory/Stock fits the phone now.** The stock toolbar (Search + Import/Export/VIN/Add) was overflowing and forcing you to zoom out — it now **wraps**: the search gets its own row and the buttons flow below. The stock-by-location pop-up's From/To pickers also stack cleanly on small screens.
- **All of today's changes verified live** on the local server (so a hard-refresh on the phone shows them). Note the **Register is desktop-only by design** — on a phone you take payment through **Start-a-Job**, so the register-specific changes (white-box ticket, "Other", NASTF tag) appear on desktop; the **Receipts viewer, NASTF worklist/D1, and themed pop-ups** all work on mobile.

### 2026-06-23 (🛠 Dashboard dark-mode fix · pop-ups 100% themed in the main screens)
- **Dashboard readability:** in **dark mode** the "Jobs" and "Avg ticket" numbers were near-black on a dark card (and the panel stayed light) — fixed so the dashboard flips properly to dark with readable numbers. Light mode is unchanged.
- **Pop-ups, finished:** every browser pop-up in the **main app, Receipts builder, and Setup** is now the app's own centered, themed box — **zero plain browser dialogs** in those screens. (A handful of the smaller tool pages — Programmers, Lishi, Scheduler, the login helper — still use a couple of plain dialogs; those get swept the next time each is touched.)

### 2026-06-23 (➕ "Other" items on the register · themed pop-ups)
- On the **register**, the **Part** and **Service** pickers now have an **➕ Other (not listed)** row — add a one-off part or service with a price right there. **Anyone** can do it (it's setting a price for an unlisted item, not changing a set price). After you add an **Other service**, Bittings **offers to save it to your Services list** so it's there next time — with a small **"Don't ask again"** checkbox if you'd rather it stop offering. The Other-service goes under whichever tab you're on (Automotive vs Residential/Commercial).
- **Pop-up cleanup (sweep):** the register's price / discount / custom-line / clear-ticket / manager-PIN / mark-paid / commission-hold dialogs were switched from the browser's plain gray pop-ups to the app's own **centered, themed** boxes, so pop-ups match the rest of the app. (A few rare error notices still use the simple browser alert.)

### 2026-06-23 (👁 In-app invoice viewer in Receipts)
You can now **look at an invoice without downloading it**. In **Receipts** (either tab), **tap a receipt** and it opens in a **viewer that fills the screen** showing the actual invoice — no file lands in Downloads. Inside the viewer there's a **Print** and a **Download** button for when you do want the file, plus a **✕** to close (or tap outside / press Esc). So **viewing is the default and downloading is one tap away**, instead of a download every time. Works on desktop and phone (on phone it shows inline; if a particular phone browser can't preview, the Download button is right there). It stays **read-only** — viewing never opens an edit or charge path — and the invoice **never shows cost or profit** to anyone, so a tech/front-desk viewing it sees the same customer-safe numbers as everywhere else.

### 2026-06-23 (🛡️ NASTF + Receipts consolidated · D1 filing countdown)
Rolled the old "Receipts & NASTF" into **one read-only Receipts screen with two tabs**, and added a **D1 filing deadline tracker**:
- **Receipts is now view/search/reprint only** — one destination with **[All | NASTF]** tabs. **All** = a searchable history of every job/invoice (by number, customer, vehicle, VIN). **NASTF** = just the NASTF jobs, **sorted by urgency** (soonest D1 due first) so it reads as your outstanding-D1 worklist. There is **no way to create or charge here anymore** — charging happens **only on the register (desktop) and Start-a-Job (mobile)**, so you never have two payment paths.
- **One NASTF tag, on both hero screens.** The old "Was NASTF used?" question is now a single **NASTF tag** captured on the **register** (desktop — it was missing there before) **and** Start-a-Job (mobile). Tagging a job starts a **D1 filing countdown**.
- **D1 countdown badge** — default **5 days** (you can change it in **Setup → Payments → "NASTF D1 filing window"**). The badge counts down daily and **changes color as it gets urgent**: green (5–4) → yellow (3) → orange (2) → red (1) → **dark red/overdue**. It shows on the register, Start-a-Job, and the Receipts NASTF tab.
- **"D1 filed ✓" checkbox** stops the countdown and drops the job off the urgent list (still visible, marked filed). **Who can check it:** the staff member who actually did that job, plus any manager/owner — enforced on the server, not just hidden. Someone who wasn't on the job can't check it. (You still file the real D1 on the NASTF website; Bittings just tracks the deadline.)

### 2026-06-23 (🧾 Register refinements — automotive vehicle capture, one-person/one-location, white spreadsheet look)
Owner-driven cleanup of the new Register (Payments) screen after first hands-on testing:
- **Register is the desktop hero** — moved to the **top of the menu** and the app **opens to it on desktop**. **Hidden on phones** (no cash-register on mobile); the phone keeps **Start a job** as its default and only payment path, so there's never two payment screens on one device. **Start a job is hidden on desktop** for the same reason.
- **Automotive vs Residential/Commercial toggle** on the Register: pick the job type so an automotive ticket isn't cluttered with residential services (and vice-versa). When **Automotive**, the Register now captures the **VIN + Year / Make / Model** (VIN auto-decodes), and that vehicle is **saved on the receipt** (server-side).
- **One location, one person** — removed the "Sell stock from" and "Technician/sales-rep" pickers. The Register always sells from **Shop** stock (it's the shop counter) and credits the **logged-in user**. The **mobile Start-a-job** does the same: it always credits the logged-in user (the editable Technician box is gone) and uses the van by default.
- **Readability fix** — Register line items now render as a **white "spreadsheet" with black text** (each line a white box), independent of the app theme, so nothing is dark-on-dark; the vehicle Year/Make/Model selectors are now clearly visible.
- Unpriced catalog items can be added with a price by **anyone** (setting a missing price), but **changing a set price stays manager-only** — still enforced on the server.

### 2026-06-22 (💰 PHASE 2 BUILT — POS / Cash-Register + configurable commission engine; code-complete + server-proven, pending your numbers + phone sign-off)
The whole Phase 2 money engine is built on branch `phase2-pos-commission` (DB live on Supabase). Detail in `PHASE2_PROGRESS.md`.
- **2a — POS register replaces the "type-in-an-amount" charge box.** A real ticket: add **parts** (from inventory at a new **sell price**) and **services** (from a manager-editable price list), each with qty; it **adds up subtotal → tax → total** for you. Selling a part **decrements stock from the chosen van/shop**. **Anyone can build a ticket + take payment; only managers can change a price, add a custom-priced line, or give a discount** — and that's enforced on the **server** (a tech literally can't tamper with prices), not just hidden. Charges through the **same Stripe/cash flow** and files to the customer.
- **2b — Commission engine is fill-in-the-blank (not hardcoded — this is what makes it a product).** Setup the rules in **Commission → ⚙ Rules**: pay on (service-call+programming / whole-job / labor / pick), structure (**daily-minimum + %** / flat % / tiered / per-job), exclude parts, earned-when, and the unreconciled hold. Your model is pre-selected; you just enter the **% and the daily-minimum**. Commission is calculated **server-side** from paid, tagged sales.
- **2c — Per-tech commission ledger** (new **Commission** tile). A **technician sees only their own** earnings; **managers see everyone** + a tech filter. Shows commission, the commissionable base, the daily-minimum, and anything **on hold**.
- **2d — Manager sign-off screen** closes the loop: jobs flagged from a cancel/reschedule/unreconciled show under **"Awaiting manager sign-off"** with their parts + photo proof; **"Confirm unused & release"** releases the equipment hold **and** the commission hold (or "Keep hold"). Manager/owner only; every action is logged.
- **What's left for you:** enter your **part sell prices, services + prices, commission % + daily-minimum, and tax rate** (all seeded blank on purpose), then a **real-phone sweep** (checklist in `PHASE2_PROGRESS.md`). A few modeling choices are flagged there for you to confirm. Phase 3 (serialized inventory + barcode scan) stays deferred.

### 🔮 CAPTURED FOR PHASE 2 (now BUILT — see the entry above) — POS / Cash-Register Payment Screen
Logged 2026-06-22 at the owner's request so it isn't lost. **Replaces the current "type in an amount" charge box with a real cash register:**
- A **running ticket** of line items (parts + services), each **qty × price**, that **auto-adds up subtotal / tax / total** — nobody does math by hand.
- **Parts come from inventory** (real item + real **sell price**) and **subtract from stock when sold**; **services** come from a **manager-editable price list**.
- **Scan a SKU / barcode to drop a part on the ticket** (uses the go-live **barcode scanner** + **Phase 3 serialized inventory**).
- Keeps today's rules: techs/front-desk see **sell price only, never cost/margin**; **price/discount changes are manager+**; **all staff can take payment**. Then it charges the total through the **Stripe/cash flow we already built**.
- **Plan:** it's the **centerpiece of Phase 2** (it pairs with the **commission engine** — the ticket feeds commissions); the **scan / serialized** part finishes in **Phase 3** with the scanner. Full spec lives in `PHASE1_PROGRESS.md`.

### 2026-06-22 (📅 Scheduler pass — technician self-scope, assignment, structured address, prompt alignment)
- **Technician assignment is a DROPDOWN** (no typing) sourced from the **cloud staff roster** (shows each person + role, e.g. "Samer — Owner", "Turbo — Tech"); appears on the booking detail, the confirm step, and the Quick form. Matches the signed-in tech by a **stable ID** so the right person sees their job. (Settings → Access is the offline fallback.)
- **Technicians are now self-scoped:** a tech **sees only their own assigned jobs**, **can't open or edit** anyone's appointment (Edit hidden + guarded; their assignment shows read-only), but **can move the status** (progress bar) on their own jobs.
- **Cancel / Reschedule now require a note + warn** that all equipment/parts must be confirmed **unused and returned**, and **a manager must sign off** before stock is restored. The note is **required for staff but optional for the owner**. Centered, theme-matched modal; works online (routes cancel through the accountable cloud function) and offline. *(A dedicated manager "sign-off / approve & restore stock" screen is still to build — candidate for Phase 2 reconciliation.)*
- **Address is now Street / City / State / ZIP** (each its own line) instead of one free-text box; dropped the redundant "Where is the car parked?" field. The combined address still feeds the **one-tap calendar location** so the tech can navigate.
- **Coaching prompts aligned to each step:** the details step now *asks for the data it collects* (vehicle + address for cars, address for house/business) instead of generic small talk — and is correct for a house lockout. Native **time/date picker icons** are visible in dark mode now (`color-scheme`).

### 2026-06-22 (🎨 UX pass — centered pop-ups, dark-mode text, payment customer picker, inventory import/export, vendor-tool gating)
- **All pop-up boxes now open CENTERED** (were anchored to the top/bottom): the customer picker, inventory stock panel, job-cancel box, van form, Receipts "Pay Now"/"Pick a part"/"Quick invoice", Lishi & Programmers sheets, and the inventory importer.
- **Dark-mode text fixes + a standing rule:** light mode = black text, dark mode = white text, and **pop-ups match the current theme**. Fixed the main-page dark/light toggle (it was only theming the embedded tool, not the home page, and didn't stick on reload), made the shared confirm dialog/toast theme-aware, and themed the customer picker + inventory stock buttons so text flips with the theme.
- **New Charge → customer is tied to the database:** "Select / add customer" (search existing or add new → saved to customers). **Cash can be anonymous; Card & Check require a customer.** The closeout/transaction-history link is manager+.
- **Inventory:** added **Export to CSV**; **Import and Export are manager/owner only**; the VIN lookup is now a centered box (was a browser prompt pinned to the top).
- **Vendor tools:** **Keycodes** = owner/manager/technician; **Vendors + NASTF** = manager/owner only; **front-desk sees no vendor section**.

### 2026-06-22 (✅ Phase 1 TAIL complete — operating screens + payment auth + receipt cost-strip; code-complete, pending your phone sign-off)
- **Two decisions applied.** (1) **Taking payment is now open to ALL staff** (technician/front-desk/manager/owner) — the old "managers only" wall on *New Charge* is gone, and the **Payments** tile shows for everyone. (2) The **Year/Make/Model dropdown** work stays bundled with this Phase-1 branch (ships together).
- **The operating screens are built** (they drive the database rules we proved earlier):
  - **Fleet page (new 🚐 tile, managers/owner):** add/edit vans, set a van's status; **deleting a van and assigning each person's "home van" are owner-only** (matches the database).
  - **Inventory — stock by location:** tap 📍 on a part to see how many are at the **shop vs each van**, and **Move / Receive / Adjust** stock. Who sees what matches the rules: a **technician** can *move*, **front-desk** can *receive*, **managers** can *adjust/write-off*.
  - **Jobs — accountability panel (in the Scheduler):** the status buttons now run through the accountable engine (a tech can only change **their own** job; front-desk can't change status); **assign a lead tech**; a **parts checklist** to mark each part *used* or *returned* — **returning a cut key opens the camera and requires a photo**; a **"⚠ not on the tech's van"** flag with a one-tap **move to the van**; and **Cancel** that requires a reason. A job **can't be marked Completed until its parts are accounted for**.
- **The four remaining payment functions are now locked down** (record a cash/check payment, start a card charge, the card reader, payment status) — they now require a **signed-in staff member**, and every payment records *who* took it. **Heads-up:** taking a card/cash payment now needs you to be **signed in** (a PIN alone, with no sign-in, won't reach these). Deployed and tested.
- **Part cost/margin is now hidden from technicians & front-desk on receipts too** (not just inventory) — they literally don't receive the cost numbers; managers/owner still see everything. (Security scan: the two prior "view" warnings are cleared.)
- **What's left:** your **real-phone sign-off** (a checklist is in `PHASE1_PROGRESS.md`), and minor doc polish. Phase 2 (commissions) and the single-page rebuild remain future phases.
- Still on branch **`phase1-roles-security`** (not merged to `main`); the database changes + payment functions are already **live** on Supabase.

### 2026-06-22 (🔐 Phase 1 continued — 1b fleet/inventory · 1c jobs/accountability · 1d cost-hiding · full UI role-gating; all server-proven)
- **Stage 1b (fleet + per-location inventory) — LIVE & proven.** New `vans` table (company-owned; identified by fleet # and/or VIN; status active/maintenance/down/retired). Stock now lives at a **location** ('shop' or 'van:<id>') and **stays with the van, not the tech**. Three role-checked, logged actions: **move** (technician+), **receive** new stock to shop (front-desk+), **adjust/write-off** (manager+). The old single qty is kept as the synced total.
- **Stage 1c (jobs + accountability) — LIVE & proven.** Job **status** is a real field with a state machine (scheduled→en route→on site→in progress→completed, plus on-hold/canceled). Status changes go through guarded functions: **front desk can't change status; a technician only on their OWN jobs; managers any.** **Reconciliation gates:** a job can't be completed until every part is marked used or returned; a cancel **requires a reason**; **returning a cut key requires a photo**. Unreconciled cancels set a `reconciliation_pending` flag + responsible tech (the hook Phase 2's commission hold will use). Job assignment table (lead/split/assist) added. Private storage bucket for the proof photos created.
- **Stage 1d (started) — money privacy.** Part **cost is physically hidden** from technician/front-desk (the app reads inventory through a masking view that nulls cost unless manager/owner). Verified: tech sees cost = empty, manager sees the real cost.
- **Full role-based UI gating.** Controls a role can't use are now **hidden** (not just disabled): delete/refund/void, inventory edit + cost field, +/− and move, dashboard/closeout/reports, Setup, **edit/delete invoice**, reference-table deletes, job status picker. The gating is **robust** — re-applies on every screen redraw and once the role loads, and **fails safe (hides on doubt)**. Legacy owner-only tiles + the cost gate were rewired to the real staff role (so **managers** now correctly see their tools). **Manager soft-delete** for customers (hide, recoverable); hard-delete stays owner-only. **No more phantom deletes** — if the server blocks a delete, the row reappears (it was never really gone). One **centered confirm dialog** (Cancel default, red action) replaces browser pop-ups across all destructive actions. A **role chip** on every page shows the real role.
- **Verification:** every role rule above was proven at the database level by cycling the real test account through manager → front_desk → technician (live impersonation/JWTs) — not assumed. Living detail in **`PHASE1_PROGRESS.md`**.
- **Fixed an iframe cache bug** (the app loads each tool — Receipts/Scheduler/Lishi/Programmers/Setup — in an iframe; a stale cached copy was showing ungated buttons). Embeds now cache-bust. **Decision: keep the iframe architecture for now; a single-page rebuild is parked for a later phase.**
- **Still pending (Phase 1 tail, mostly UI):** the new SCREENS to drive 1b/1c (van management, inventory move/receive/adjust, job status controls, reconciliation photo capture) — the database already enforces these; auth checks on the other 4 payment functions; stripping cost/margin from receipt payloads; final docs. **Open owner decisions:** (1) should technicians take card payments? (app says manager-only; matrix says all staff) (2) git branch split for the YMM work.
- Work is on branch **`phase1-roles-security`** (SQL in `bittings-app/supabase/phase1/`); **not merged to `main`**.

### 2026-06-21 (🔐 Phase 1 / Stage 1a — real roles, RLS & audit foundation; LIVE)
- **The staff app now has a real, server-enforced permission system.** New `staff` table is the single source of
  truth for roles (owner / manager / front_desk / technician) — the hardcoded `OWNER_EMAILS` approach is replaced.
  Helpers `current_staff_role()/is_staff()/is_manager()/is_owner()`; `claim_first_owner()` one-time bootstrap
  (first account = owner; self-disabling). Owner seeded: **Samer** (`samer@turbokeysmith.com`).
- **Every `using(true)` RLS policy rewritten** to the permission matrix across customers, inventory, bookings,
  receipts, payment_transactions, payment_events, shop_config, staff, audit_log. A signed-in user with **no active
  staff row gets nothing**. Soft-delete (`deleted_at`/`deleted_by`) added; only owner can hard-delete; soft-delete
  is manager/owner only (guarded in the update policy). Append-only **`audit_log`** + triggers record soft/hard
  deletes. Personal **PINs hashed** (pgcrypto) via `set_my_pin()/verify_pin()` — shared `QUICK_FORM_PIN` retired
  from the security model. Website lead-intake (anon insert-only on customers) is **built but left OFF** until the
  form is wired with spam protection.
- **Refund/void gate upgraded to read role from `staff`** (Stage 0's interim email allow-list removed — no
  backdoor). Required `grant select on staff to service_role` (newly-created tables aren't auto-granted).
- **Proven live (Checkpoint 2 for 1a):** owner passes the refund gate via their staff role (v6, server logs);
  unauthenticated = 401; a no-staff user sees 0 of everything; technician can view customers but is **blocked** from
  inventory writes and soft-deletes (RLS 42501); manager **allowed** to write inventory. Test users created + torn
  down; project left with only the owner.
- Applied to the **live project** (additive; owner unaffected). Work on branch **`phase1-roles-security`** — still
  **not merged to `main`**. Next: **Stage 1b** (fleet/vans + per-location inventory + move/receive).

### 2026-06-20 PM (🔐 Phase 1 / Stage 0 — refund & void endpoints secured)
- **Closed an open-endpoint security hole.** `pay-refund` and `pay-void` ran as `service_role` with CORS `*` and
  **no auth check** — anyone with the public anon key could trigger a refund/void. They now **verify the caller's
  Supabase login (JWT) and reject anyone who isn't an active manager/owner** (401 no/invalid token · 403 wrong role).
  CORS locked from `*` to an **expandable allow-list** (localhost now; web-domain + native-app origins added later
  via env, no code change). Shared gate lives in `supabase/functions/_shared/auth.ts`; originals backed up under
  `supabase/_originals_pre_phase1/`.
- **Role source is self-upgrading:** uses the `staff` table once it exists (Stage 1a); until then an interim
  owner-email allow-list (`samer@turbokeysmith.com`). Deployed to the live project (functions only — no data touched).
- **Proven live:** unauthenticated / anon-key / garbage-token / no-token calls to refund **and** void all return 401;
  disallowed CORS origin not echoed. (Owner-allowed path confirmed separately.)
- This is **Stage 0** of Phase 1 (Roles, Security & Accountability). Next: **Stage 1a** — `staff` table +
  `current_role()` + real RLS + soft-delete + `audit_log`. Work is on branch **`phase1-roles-security`**; staged
  1a→1b→1c→1d, each tested with owner sign-off before the next. **Not yet merged to `main`.**


### 2026-06-20 (🔗 Link-in-bio page for Instagram · preview, pending mobile sign-off)
- **New mobile-first "link in bio" page at `/links/`** — hand-built static HTML (the retired generator was NOT
  used), for the Instagram bio link. Clean Linktree-style layout: the Turbo Keysmith logo, a short tagline, then a
  vertical stack of big thumb-friendly tap buttons, centered. Uses the site's premium dark skin (pulls in
  `assets/styles.css` + the Inter/Saira fonts and brand tokens); the layout is a small scoped `<style>` block.
- **Buttons, in order:** 📞 **Call Now** (`tel:+14058705397`, primary/biggest, brand-red gradient) · 💬 **Text Us**
  (`sms:+14058705397`) · 💳 **Pay Now** (`/pay-now/`) · 📝 **Read the Blog** ("Notes from the Key Man", `/blog/`) ·
  💰 **Payment Plans / Financing** (`/financing/`) · 🌐 **Full Website** (`/`). Trust line underneath: "Licensed
  Oklahoma locksmith • OK Lic. #AC441081 • NASTF certified • OKC metro."
- **Bilingual (EN + ES).** English at `/links/`, Spanish mirror at `/es/links/`. **Every button stays in its own
  language** — the Spanish page's buttons all point to `/es/...` (`/es/pay-now/`, `/es/blog/`, `/es/financing/`,
  `/es/`); the English page's all point to the English pages. A small **EN/ES toggle** at the top is the only
  cross-language link; `tel:`/`sms:` are shared (same phone). Reciprocal `hreflang` (en/es/x-default) on both.
- **Now uses the full Turbo Keysmith wordmark logo** (`assets/logo-full.png`), centered; the separate text name
  was dropped (a visually-hidden `h1` keeps it for accessibility).
- **SEO:** `<meta name="robots" content="noindex">` on both (utility pages — intentionally not in the sitemap or nav).
- **Status:** code-complete on the `links-page` branch; **deployed to a Cloudflare preview, pending the owner's
  two-phone check (iPhone Safari + Android Chrome)**. Promote to `--branch=main` and delete the preview only on the
  owner's OK.

### 2026-06-19 PM-4 (📝 Public blog launched · FAQ rewrite · CSS cache fix)
- **New public blog at `/blog/`** — hand-built static HTML (the retired generator was NOT used). Display name
  **"Notes from the Key Man"** with the tagline "Locked & Loaded — straight talk on keys, locks, and getting
  back on the road" (publisher in all schema stays the Organization **Turbo Keysmith**). The index has **in-page
  search + clickable, color-coded category filtering** done in plain browser JS (progressive enhancement — every
  post card is static HTML so it's fully crawlable and works with JS off). Built: **6 category pages**
  (`/blog/category/{slug}/`), a **seed post** (`/blog/locked-out-of-car-okc/`) with
  BlogPosting + Person (author "Sam The Key Man", with credentials) + Organization + BreadcrumbList + FAQPage
  schema, author byline + bio box, two Call-Now CTA blocks, internal links, and a **real Lishi HU100R hero
  photo**; an **RSS feed** (`/blog/feed.xml`), a `search-index.json`, blog + category URLs in the sitemap, a
  **"Blog" link added to the desktop nav site-wide**, and a `/es/blog/` **noindex BORRADOR mirror** for a future
  Spanish translator (no machine translation).
- **FAQ page rewritten** — 12 questions in emergency-first order (added How fast / How much / Insurance-roadside),
  hours now say **"24/6"**, the **FAQPage schema rebuilt** to match the visible Q&A word-for-word, LocalBusiness
  Mon–Sat hours set to **00:00–24:00** (open 24h), and the body links made root-relative (`/pay-now/`,
  `/financing/`, `/warranty/`).
- **Fixed the recurring "stale CSS after a deploy" bug at the root.** Cloudflare's dashboard **Browser Cache TTL**
  was overriding the `_headers` 5-minute rule with **4 hours**, so returning visitors kept old CSS and saw
  unstyled pages after a change. Set Browser Cache TTL to **"Respect Existing Headers"** (CSS now `max-age=300`)
  and adopted a site-wide **`styles.css?v=N`** version-bump convention. Future CSS changes reach everyone in
  ~5 minutes.
- **Workflow:** on owner approval, a change is promoted to `--branch=main` **and** its preview is deleted (the git
  feature branch + the Cloudflare preview deployment). 24 stale preview deployments were purged.
- **▶ Next session: the Bittings staff app (`bittings-app/`).**

### 2026-06-19 PM-3 (🗄️ Generator RETIRED — site is now hand-maintained static HTML)
- **The page generator is retired and archived.** Moved `website/_build/` →
  `_archive/_build-generator-RETIRED/` (with a `README.txt` explaining why) so it can never be run by accident.
  *(Correction, 2026-06-28: that archive folder was local-only and was never committed — it is **not in this
  GitHub repo**, confirmed across every branch and all history. There is no generator here to run.)*
- **Confirmed safe first:** nothing in the deployed `website/site/` references `_build/` (0 hits) — the generator
  was build-time-only and is never shipped, so moving it cannot affect the live site. Verified `website/site/`
  (222 pages) and the live deploy are untouched after the move.
- **Going forward: the public site is hand-maintained static HTML in `website/site/`** (the source of truth).
  Edit those files directly. **No build step, no generator.** Deploy with
  `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`.

### 2026-06-19 PM-2 (🗂️ Repo restructured — turbokeysmith-main + website/ + bittings-app/)
- **Renamed** the project folder `_live-clone/` → **`turbokeysmith-main/`** (cosmetic — the Cloudflare deploy is a
  direct Wrangler upload, **not** git-connected, so the folder name is invisible to it).
- **Split into two clear top-level folders, kept ONE git repo + history** (via `git mv` — 289 renames):
  **`website/`** = public site (`website/site/`) + generator (`website/_build/`) + `website/_tools/`;
  **`bittings-app/`** = the staff app (the 7 pages + `app/` + `supabase/` + app icons + `_source/` for Lishi raw
  data). Shared docs stayed at the repo root.
- **Public URLs did NOT change** — the move was rename-only (0 page-content changes). Verified byte-identical:
  a preview deploy reported **"0 files uploaded, 239 already cached."** Worked on a `restructure` branch → verified
  on a `restructure-preview` URL (owner mobile-checked iPhone + Android) → merged + deployed to production.
  **New deploy command:** `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`.
- **⚠️ Generator drift flagged:** running `website/_build/generate.mjs` no longer reproduces the live site (it emits
  emoji icons where the live pages use SVGs — a post-gen `site-emoji-pass.py` + hand-edits were never folded back
  into the templates). **Do NOT run the generator for deploys** — `website/site/` is the source of truth.
  Re-syncing the generator to the live pages is a separate future task.

### 2026-06-19 PM (🇪🇸 Spanish PUBLISHED + indexed · Contact links · WhatsApp green · www→apex redirect)
- **Spanish `/es/` is now LIVE and indexable** (owner approved the translation). Removed `noindex` from all
  **111** `/es/` pages, dropped the 8 red BORRADOR draft banners, unblocked `/es/` in `robots.txt`, and added
  all 111 Spanish URLs to `sitemap.xml` (**222 URLs total**). The 🌐 EN/ES toggle (which navigates to the
  matching `/es/` page) now works end-to-end. The `_build/` generator was updated to match (ES `noindex:false`,
  banners removed, `/es/` mirrored into the sitemap, robots no longer blocks `/es/`) so a regenerate won't revert it.
  *(Legal note: `/es/terms` and `/es/warranty` banners were removed on the owner's "approved" sign-off — if a
  bilingual attorney hasn't reviewed the legal wording, that's worth a final check since terms are contract-binding.)*
- **"Contact Us" added site-wide** — in the header nav (desktop + mobile) and footer of every EN/ES page, plus a
  **"Contact Us Now" / "Contáctanos ahora"** button in the homepage hero (full-width under the Call/WhatsApp pills).
- **All WhatsApp buttons/links are now WhatsApp brand green** (`#25D366`) via one site-wide CSS rule.
- **`www.turbokeysmith.com` now 301-redirects to the apex** (Cloudflare Redirect Rule), keeping one canonical address.
- **SSL set to Full (strict)** + Always-Use-HTTPS on.
- **Workspace cleanup (owner-approved).** Removed publicly-exposed junk from the live site (`site/files.zip`,
  internal `.md` planning docs, a backup CSS) and redeployed; deleted ~29.5 MB of duplicates/backups
  (`files - Copy/`, `_live-clone.zip`, two loose zips); and **moved** (not deleted) four superseded old copies
  (`files/`, `v2andScheduler/`, `_teamfile/`, `current netlify files/`) into `Desktop/bittings/_archive/`
  (5 unique files rescued into `_docs_private/` first). The active Bittings app and `_live-clone/` master were
  untouched; the unrelated `odol-market-report/` was left alone. A later decision is pending on permanently
  deleting `_archive/`. Full map in `CLEANUP_INVENTORY.md`.

### 2026-06-19 (🚀 WEBSITE LAUNCHED on turbokeysmith.com + premium skin + Spanish gaps + contact-form email)
- **The public website is LIVE at `https://turbokeysmith.com`.** Domain DNS was moved from GoDaddy to
  **Cloudflare** (registrar stays GoDaddy). The `site/` folder is served from **Cloudflare Pages** project
  `turbokeysmith` (production branch **`main`**). Apex + `www` both point to Pages; **HTTPS with Full (strict)
  SSL**, Always-Use-HTTPS, and automatic `http→https` redirect are on. All pages verified 200.
- **Email was preserved.** The shop's **Microsoft 365 (Outlook)** email records (MX, SPF, the M365 verification
  TXT, DKIM, DMARC, autodiscover, sip, lyncdiscover, msoid) were imported into Cloudflare and the mail/service
  records set to **DNS-only (grey cloud)** so Outlook keeps working. MX confirmed intact after cutover.
- **Deploy gotcha recorded:** deploys must use `npx wrangler pages deploy website/site --project-name=turbokeysmith
  --branch=main`. Without `--branch=main` they land on a throwaway **preview** URL and the real
  `turbokeysmith.pages.dev` (production) never updates — this caused an "the new skin won't show up" scare.
- **Public site got a premium "blackout" skin** (dark theme, red-gradient buttons — `site/assets/styles.css`,
  reference `site/turbo-premium.html`) across every EN/ES page.
- **Two missing Spanish pages added** — `/es/pay-now/` and `/es/blog/` (the EN→ES toggle was dumping visitors on
  the English homepage). EN/ES page parity is now complete; reciprocal `hreflang` added. `/es/` stays
  **noindex** (hidden) pending proofread, as before.
- **Contact form now emails leads to the shop.** Previously website leads saved only to the visitor's own
  browser (owner never saw them). Both `/contact/` and `/es/contact/` now POST to **Web3Forms** → emails
  **turbokeysmith@gmail.com** (Spanish leads use an English subject tagged `(ES)`), keeping the local save as a
  backup. *(Cloud/Customers-list landing of leads is still a future step.)*
- **Readability fix:** the contact "thank you" success box showed silver-on-white in the dark theme; its text
  is now near-black (EN + ES), plus a shared safety rule so any white box always gets dark text.
- *Still open after launch:* (optional) `www→apex` redirect rule for one canonical address; **proofread + publish
  the `/es/` Spanish pages**; resubmit `sitemap.xml` in Google Search Console; the staff app still goes later on
  its own `app.turbokeysmith.com` subdomain.

### 2026-06-17 PM-6 (Two brands kept straight: "Bittings" = the software · your shop = from Settings)
- **"Bittings" is the software's own name + logo** (the mark and word in the **left menu**). That's the product
  brand and stays the same for every shop — it is intentionally hardcoded and never changes per shop.
- **Your shop's branding now comes from Settings, everywhere it appears.** The **top header logo + name**, the
  **left-menu workspace line**, the **browser tab**, and **receipt share/email text** all use your **Business name**
  and **Logo** from Setup — nothing says "Turbo Keysmith" hardcoded anymore. So CCC Locksmith sees "CCC Locksmith",
  Elite sees "Elite", etc. The Setup screen and the Lishi/Programmers tabs were de-hardcoded too; the **Sign-in
  page** now shows the Bittings product brand (it's before login, so there's no shop yet).

### 2026-06-17 PM-5 (Customer names black-on-white in dark mode · VIN decodes everywhere incl. the invoice)
- **Customer list stays white with black text in dark mode** (owner preference) — the cards read like printed
  index cards, names are black and clearly visible, the box stays white.
- **VIN decoding works everywhere now, including the invoice.** Fixed the **Programmers** and **Lishi** "Decode VIN"
  buttons (a bad data row was making a *successful* decode look like a failure). The **Quick invoice** now auto-fills
  Year/Make/Model when you type or paste a 17-character VIN. (Start-a-job, the Inventory VIN search, and the chat
  invoice already decoded.)

### 2026-06-17 PM-4 (Dark-mode readability fix · hide data sources · "Something wrong?" corrections)
- **Dark mode is readable now.** The tool pages (Lishi, Programmers, Setup) and the customer list had gone
  dark-background-but-dark-text (invisible) — a stylesheet-priority bug. Fixed so text is light on dark everywhere.
  Customer names are no longer washed out. **Hard-refresh (Ctrl+Shift+R) once** to clear the old cached styles.
- **Data sources are hidden from the app.** The little "src: Ilco 2025"-style tags under code series (on the
  Start-a-job result and the Lishi card) are gone — customers don't see where the data came from. (We still keep the
  source in the file, just don't show it.)
- **"Something wrong?" corrections.** Removed the separate **Corrections** tab from Programmers. Instead, after you
  pick a vehicle in **Start a job**, there's a **"⚠ Something wrong?"** button at the bottom of the result — tap it to
  jot what's incorrect or what actually worked for that exact vehicle. Those notes build one running list (saved on the
  device, shared across the app) and show under that vehicle next time.

### 2026-06-17 PM-3 (Dark mode everywhere: every tool follows the Light/Dark toggle)
- **Receipts & NASTF, Scheduler, Lishi & Keys, Programmers, and Setup now switch to dark mode** along with the
  dashboard — they read the same Light/Dark setting. Lishi/Programmers/Setup share the dashboard's color system, so
  they pick up a shared dark stylesheet; Scheduler (which already had its own dark theme) now follows the global
  toggle; Receipts got a dark "chrome" (the printable receipt-card **preview stays white/paper** on purpose).
- **Toggling theme while a tool is open updates it live** (the embedded tool flips immediately, not on reopen).
- **Customer names readable in dark mode** — the customer cards had stayed white in dark mode, so the near-white
  names were washed out (white-on-white); the cards are now dark and the names full-contrast.

### 2026-06-17 PM-2 (Desktop: tools open inside the dashboard · sidebar footer · dark-mode contrast fix)
- **Tools now open inside the dashboard on desktop.** Click **Receipts, Scheduler, Lishi, Programmers, or Settings**
  in the left menu and the tool loads in the content panel *with the left menu still on screen* — no more jumping to
  a separate full page that hides the menu. On a **phone** they still open as their own full page (an embedded panel
  in a narrow column would be cramped). Inside an embedded tool, its own bottom bar / "‹ Apps" link is hidden so it
  can't nest the dashboard inside itself.
- **New left-menu footer (desktop), bottom-up: Synced → Signed in → Settings**, sitting right above the Light/Dark
  toggle. **Settings** (owner-only) replaces the old "⚙ Setup" link that used to sit in the top bar. "Signed in: you"
  and the "☁ Synced / On this device" status moved out of the page body/top bar into this footer.
- **Dark-mode contrast fixed.** In dark mode some text was showing **black-on-dark** or **white-on-white**. Cause:
  the dashboard/customers/forms/reports used an older color set that had no dark values, so it stayed light while the
  rest went dark. Added the missing dark colors so every screen now reads correctly in dark mode. *(The standalone
  tool pages don't follow the Light/Dark toggle yet — noted as a follow-up.)*

### 2026-06-17 PM (Edit through the Quick invoice form + a menu that's always on screen)
- **Editing a receipt now opens the Quick invoice form** (the fast, full-screen form) instead of the slow
  field-by-field chat editor — but only when the Quick invoice is turned on. Tap a past invoice → Edit → you get
  the same screen you used to create it, pre-filled with everything (customer, vehicle, line items, NASTF,
  warranty, payment). Saving **updates the original** invoice (same number/date) rather than creating a duplicate,
  and it won't double-log a cash/check payment that was already recorded. If the Quick invoice is off, the old
  chat editor still works exactly as before.
- **The main menu is now always on screen — on every page.** A persistent bottom nav bar
  (Home · Receipts · Customers · Scheduler · Lishi) is now fixed to the bottom of **every** staff page — Receipts,
  Lishi, Scheduler, Programmers, and Setup. It never scrolls away and is always one tap from any main tool, like a
  normal phone app's tab bar. (It's one shared component, so the bar looks and behaves the same everywhere.)
- **Deep-link into the dashboard's views.** `index.html?go=customers` (and any other view name) now opens that
  view on load — this is what the Receipts page's "Customers" tab uses to jump straight to the customer list.

### 2026-06-17 (Key code series — by vehicle — on the Start-a-Job card)
- **Code series now shows on the job lookup.** Start a Job → look up a vehicle → the result card has a **"Code
  series"** field (the blind-code range for cutting keys by code, e.g. `F1-F1571`). When we have a sourced value it
  shows with its source; otherwise it says **"Add in Lishi"** so you can type it.
- **It's a per-vehicle field you can edit.** Each vehicle in the Lishi reference now has a **Code series** field —
  edit it on the Lishi page and it sticks (and shows on the job card). Your edits are never overwritten by updates.
- **Honesty note (per your no-guessing rule):** code series are **not consistently published** in free sources —
  most modern high-security keys (Ford HU101, GM B119, etc.) don't list one at all, and American Key Supply blocks
  automated lookups. So I seeded **only the handful I could verify with a source** (e.g. Mitsubishi Eclipse/Endeavor/
  Galant '04–'07 → `F1-F1571`, lockpicks.com), and those specific vehicles aren't in the built-in list yet — so **no
  code series will show on existing vehicles until they're entered.** I did **not** guess any. To get real coverage:
  point me at a Strattec/AKS code-series chart and I'll import it accurately, name specific vehicles for me to verify
  one by one, or type them on the Lishi page as you go.
- **UPDATE (this session): real data loaded from your Keyline 2015 chart.** You provided two reference PDFs; the
  **2015 Keyline Key Application Chart** turned out to be a clean one-row-per-vehicle table with a real **Code
  Series** column, so I parsed it and filled **47 vehicles** with their code series (e.g. Toyota Camry/Corolla/RAV4
  `50,000-69,999`, Honda/Acura `K001-N718`, GM `Z0001-Z6000`/`G0001-G3631`/`V0002-V5573`, Ford `10001-11500`,
  Chrysler/Jeep/Ram/Dodge `M0001-M2618`, Nissan/Infiniti `00001-22185`). Each shows **src: Keyline 2015** and a
  short note where the chart had one. I only filled vehicles where the chart was **unambiguous** (one code across
  the matching years) — no guesses. The 2022 reference's tables are messier (multi-line) and I won't trust-parse
  them without more care, so newer (2016+) vehicles and the **HPC card number** column are still to do.
  *Status: 47 vehicles live; broader coverage + HPC card pending.*
- **UPDATE 2 (overnight): 196 of 230 vehicles now have a code series + 182 have HPC card numbers.** You found the
  Keycraze PDF library and the **2025 Ilco reference** (newest), and had Claude Desktop extract it into
  `Bittings_Key_Blank_Reference.xlsx` (3,212 records). I reviewed that file, fixed a comma-chopping glitch in its
  code column (e.g. `5,001-8442` had been split — I rebuilt them and confirmed against the clean rows), and mapped
  it onto your vehicles: **code series, the HPC 1200 card number, and notes** now show on the Start-a-Job card and
  are editable in Lishi. Vehicles with more than one key type show **all their code series** (e.g. a Corolla shows
  `50000-69999 / 40000-49999`, regular vs prox) so you pick by the actual key. Each entry is tagged with its source
  (mostly **Ilco 2025**, some **Keyline 2015** where 2025 didn't cover it). **Nothing was guessed.**
  ⚠️ **Two things for you to look at (left for the end): (1)** the Excel extract had **gaps** — it dropped some
  common models (Camry, Highlander, Prius, Avalon, Accord, C-HR); I hand-read the obvious ones back in from the
  PDF, but the file isn't 100% complete. **(2)** **34 vehicles still have no code series** — mostly European
  (BMW/Mercedes/Audi/Volvo, often OEM-only), heavy trucks, and a few ambiguous ones; list is in the task notes.
  *Status: 196/230 with code series, 182 with HPC card; 34 pending; spot-check recommended.*
- **UPDATE 3: second pass filled 12 more → 208/230 code series, 188 HPC cards, 22 blank.** Re-read both the PDF and
  the xlsx for the 34 holdouts; added the ones with a direct read (Silverado 2500/3500, Lexus IS250/350, Dodge
  Grand Caravan, Subaru WRX/Ascent, Cadillac CT5/XT4/XT5/XT6, Ford Super Duty, Scion xB). The remaining **22** are
  mostly European/OEM-only (Audi Q5/Q7, BMW 3-Series, Mercedes C-Class, Volvo XC90), platform-inferable but
  un-sourced (Chrysler 300 & Ram = Chrysler M-series; GMC Yukon/Canyon/Acadia = GM V-series; Subaru
  Forester/Crosstrek — since filled from owner's Subaru rule: non-prox 32000-39999, prox 70000-79999/90000-99999),
  and ambiguous/new-gen (Camry '02-06, Prius, C-HR, Scion tC, Tacoma '24-25) — left for owner
  confirmation rather than guessed.
- **UPDATE 5: owner keyway rules + group-1 fills → 215/230, 15 blank.** VW/Audi HU66 = 0001-8110 (corrected Ilco's
  0001-6000); VW/Audi HU162T = unknown→blank/editable; BMW = no code series; Volvo HU56 = DH0001-DH4000, HU101 =
  04001-09001 / 4001-9001 (with or without leading 0) — done as a one-time keyway migration in applyCodeSeries
  (guarded by tks_cs_keyfix1; corrects existing data once, never clobbers owner edits). Filled Chrysler 300 /
  Ram 1500 / Ram 2500-3500 = M1-M2618, GMC Yukon = V0001-V5573, GMC Canyon = Z0001-Z6000 (= Colorado). 15 still
  blank — HU162T VW/Audi, BMW (none), Mercedes C-Class / Ram ProMaster / 1st-gen GMC Acadia, and Toyota/Scion
  Camry'02-06 / Prius / C-HR / tC / Tacoma'24-25 (need owner values/rules).

### 2026-06-16 PM-4 (Mark paid from a customer, A/R + tax on dashboard, total-paid, warranty/T&C on the receipt)
- **Mark an invoice paid right from the customer.** Open a customer → tap an unpaid invoice → **"✓ Mark as paid"**.
  It converts to a paid receipt (and clears from the balance owed) exactly like the Receipts screen does, including
  using up any parts from inventory.
- **Money on the Dashboard.** The dashboard now shows **"Owed (A/R)"** — your total unpaid-invoice amount across
  all customers — and **"Tax collected"** (this month). 
- **Tax moved off Reports.** The "Tax collected" figure that was stuck on the Reports screen (couldn't be toggled
  off like the others) is **gone from Reports** and now lives on the Dashboard.
- **Total paid per customer, by period.** Each customer record shows **"Total paid (all-time)"** plus a breakdown
  for the **last 30 days / 90 days / 6 months / 1 year**.
- **Warranty prints on the receipt/invoice.** Customer copies now show **"6 months limited warranty"** (your set
  length, no date) on the receipt card and the PDF. (The in-app day-countdown pill is still there for you.)
- **Terms & Conditions link is now a setting.** Setup → Business identity has a **"Terms & Conditions link"** field.
  Whatever you paste prints on the receipt/PDF and in the signature line ("agreed to *[your shop]*'s Terms &
  Conditions"). **Leave it blank and the T&C wording is dropped** — so a shop without a terms page doesn't show a
  broken/placeholder link. *(Turbo Keysmith: set yours to `turbokeysmith.com/terms` in Setup — it's no longer
  hardcoded.)*
- *Status: code-complete, pending mobile sign-off.*

### 2026-06-16 PM-3 (Warranty tracking + open past invoices to see what was sold)
- **Standard warranty, set once in Setup.** Setup → Payments now has a **"Standard warranty (months)"** field
  (defaults to **6**) and a **"Add the warranty to new documents by default"** toggle. Set months to **0** to turn
  warranties off.
- **Warranty on receipts & invoices, with a live countdown pill.** New receipts and invoices carry the standard
  warranty (Quick invoice has a **warranty checkbox** you can untick per job; the chat flow applies your default).
  Estimates never get one. Each document then shows a **🛡 pill** — "184 days warranty left" (green), turning
  **amber under 30 days**, then **"Warranty expired"** (red) — on the receipt card and in the Receipts history, so
  you can tell at a glance if a returning customer is still covered.
- **Open a past invoice to see what was sold.** In a customer's record, the invoice list is now **tappable** —
  tap any invoice to open a read-only view showing the **line items (what was sold)**, totals, status, and the
  warranty pill. (Full edit/reprint/PDF still lives in Receipts.) Old invoices remain listed in Receipts → History
  too, now with the warranty pill for warranty lookups.
- *Status: code-complete, pending mobile sign-off.*

### 2026-06-16 PM-2 (Customer invoice history + balance owed, quick-invoice presets, category-correct add-item)
- **Customer invoice history + running balance owed.** Open any customer (Customers tile → tap a person/shop) and
  you now see their **Invoices & receipts** list (each with date, number, amount, and a PAID / UNPAID / ESTIMATE
  tag) **plus a "Balance owed"** total at the top when they have unpaid invoices — built for **Net-30 business
  accounts**. The owed amount is the sum of their unpaid invoices (it clears automatically when you mark an
  invoice paid in Receipts). Customers who owe money also show a red **"OWES $___"** badge right in the list, so
  you can see who's behind at a glance.
- **Quick invoice line items are no longer blank-only.** Each line's description now offers a **pick-list of your
  services** for the chosen job type (your Setup services + common locksmith jobs); picking one **auto-fills the
  price and the taxable box**. You can still type a custom description.
- **Fixed: "Add another item" showed the wrong category's items.** On the Start-a-job → Materials & Services
  screen, the "Add another item" dropdown listed automotive items (Transponder key, Remote/fob, Smart key) even on
  a Residential job. It's now **category-aware** — common items always, plus the right items for Auto / Residential
  / Commercial.
- *Status: code-complete, pending mobile sign-off.*

### 2026-06-16 PM (Repairs: NASTF quick-invoice, Lishi seed on Start-a-job, button contrast)
- **NASTF added to the Quick invoice.** The ⚡ Quick invoice now has an optional **NASTF D1** picker (shown
  only when Service = Automotive): **None / Customer / Auction-Fleet / Contracting**. Picking a type reveals
  exactly the audit fields that type needs (plate, odometer, authorizing-party or vehicle-owner details, etc.),
  required fields are enforced before "Create," and the finished receipt prints the same NASTF blocks as the
  chat flow. For **Contracting**, a note reminds you the "Customer name" is the contracting shop and the vehicle
  owner goes below. So you can now produce NASTF D1 paperwork from the fast path, not just the full interview.
- **Fixed: "Start a job" now shows the Lishi tool even if you never opened the Lishi page.** The job result card
  reads the Lishi tool + vehicle data from local storage, which was only ever filled in by visiting the Lishi
  page first. The seed (120 Lishi tools + 230 vehicles) now loads on the home screen too, via a new shared
  `app/lishi-seed.js`, so the keyway/tool/transponder populate on first use. (The Lishi page is unchanged.)
- **Fixed: hard-to-see buttons in the manual (non-quick-form) invoice flow.** Five special buttons — Decode VIN,
  From Inventory, owner Setup-service shortcuts, Custom item, and "Use $last-price" — had red text on a dark chip
  in the light theme, which washed out in daylight. They now use white text so they read clearly outdoors.
- *Status: code-complete, pending mobile sign-off (NASTF picker + buttons need an on-phone check).*

### 2026-06-16 (Start-a-job result card, Materials & Services step, van/shop inventory)
- **Start a job → Automotive now shows the whole job on one screen** (the selling point). After a VIN decode
  *or* a year/make/model pick, the result card displays — pulled live from your Lishi + Programmers + Inventory
  data — the **keyway + Lishi tool, transponder, ignition-pickable, an inventory check, programmer pills**
  (e.g. "Autel IM608 · AKL"), an OEM/NASTF flag, and an **"In your van"** parts list. (The reference comes from
  the Lishi & Programmers pages' data; empty → honest "—"/"Verify in Lishi", never fabricated.)
- **NEW "Materials & Services" step.** Selecting a service (Automotive *or* Residential/Commercial) now goes to a
  build-the-job screen that suggests **related materials & services to add** — your examples: a **rekey** offers a
  replacement lock / deadbolt / smart lock; a **car lockout** offers lost-key / spare / fob. Tap to include, add
  custom items, then **Continue to invoice** (opens Receipts). *(Auto-filling Receipts line items from that
  selection is the one remaining wire-up.)*
- **Inventory: "in the van" vs "in the shop".** In **Setup → Business identity** there's now a **"Where do you
  work?"** choice — **Mobile (van)** and/or **Physical shop**. If you use **both**, Inventory splits into van vs
  shop: each part shows its location, there's a **van / shop filter**, and a one-tap **"→ Shop" / "→ Van"** move
  button on every row (plus a van/shop picker on the part form). If you pick **only one**, inventory stays a single
  list with no split — fully mobile shops never see "shop" stock, and vice-versa. New parts default to **van**.
- **Fixed:** the service picker no longer shows the old "continue to the work order in Receipts" line — it now
  reads "continue to materials & services," matching the new step. *Status: code-complete, pending mobile sign-off.*

### 2026-06-15 (Home = "Start a job"; receipt split; Key Tool Max Pro)
- **"Start a job" is now the home screen.** When the app opens it lands on **Start a job** (was the tile grid).
- **The tile hub is gone — everything lives in the left menu.** The old grid of tiles on the home screen was
  removed; every destination (Customers, Receipts, Scheduler, Payments, Inventory, Lishi, Programmers, Dashboard,
  Closeout, Reports) **and the Vendor tools** (Keycodes + your quick-links) now live in the **left sidebar** on a
  computer and in a **slide-out "More" menu** on a phone (tap **More** in the bottom bar). Manager-only items stay
  hidden from staff. Nothing was lost — just moved into the menu.
- **Start a job → Automotive now works without a VIN.** A **"VIN / Year-Make-Model"** switch lets you look up by
  **year, make, and model** when you don't have a VIN; either way it shows the vehicle + an inventory snapshot and
  routes you into Lishi / Programmers / Receipts.
- **Receipt sending is now two clear buttons.** After a card payment, instead of one "Send receipt," you get
  **⬇ Download receipt** (saves the PDF) **and 📤 Send receipt** (opens the share sheet to text/email it).
- **Programmers: added Xhorse VVDI Key Tool Max Pro** to the selectable tool catalog (🧰 My tools). It's the Key
  Tool Max **with a built-in OBD + CAN-FD module** (so it does IMMO/OBD without the separate Mini OBD, and adds
  GM 2020+ CAN-FD cars). It shares the Key Tool Max coverage column. *Note: Xhorse doesn't publish a single
  compatibility chart — coverage lives in the device's own app + their remote-support list (links saved on the
  tool's entry); treat it as verify-on-device like the rest.*

### 2026-06-15 (Bittings design system — started; Home + "Start a job" done)
- **Adopted the "Bittings" design system** (a shared, reusable UI kit) and began rolling it across the staff app.
  This supersedes the ad-hoc light reskin earlier today with a real component library + a **theme toggle**.
  - **New shared files** (under `app/ui/`): **`bittings-ui.css`** (the whole design system — cards, buttons,
    pills, inputs, KPI stats, the sidebar/bottom-nav shell, tiles), **`bittings-ui.js`** (the light/dark theme
    toggle + memory), the **Bittings logo** SVGs (`assets/mark.svg`, `mark-mono.svg`, `assets/favicon.svg`), and
    **`demo.html`** — a reference page you can open to see the exact target look and flip the theme.
  - **Two themes, one switch:** **Studio (light)** is the default; a **🌙 Dark "Tactical"** field theme is one tap
    away (toggle in the sidebar; the choice is remembered, no flash on reload).
  - **Brand hierarchy:** the sidebar shows **Bittings** (the software) as the brand, with **your shop's name**
    (from your Setup config) as a separate boxed subheading beneath it — so the product and the locksmith company
    read as distinct.
  - **NEW "Start a job" front door** (first sidebar item): asks **Automotive / Residential / Commercial**, then
    **Automotive** → a VIN box that decodes the vehicle, shows an inventory snapshot, and routes you into the
    existing **Lishi & Keys** / **Programmers** / **Receipts** flows (those stay the source of truth — nothing
    duplicated or fabricated); **Residential/Commercial** → your real service list → the work order. The existing
    **Lishi & Keys** tab is unchanged.
  - **Done so far:** the **Home screen (`index.html`)** is wrapped in the new sidebar + phone bottom-nav (every
    existing destination wired to its real action; manager-only items still hidden from staff), plus the theme
    toggle and "Start a job." **Behavior, data, and gating are unchanged — purely the shell + new feature.**
  - **Still to do (next):** apply the same shell/components to the other pages — **Receipts (`bittings.html`),
    Scheduler, Lishi, Programmers, Setup, Login** — and generate the PNG favicons. **NASTF D1 logic on Receipts is
    untouchable** and will only be restyled, never changed. **Status = in progress; Home is code-complete pending
    mobile sign-off.**

### 2026-06-15 (light "Studio" reskin — whole staff app)
- **The whole staff app was re-themed from dark to the light "Studio" look** (the same palette as the new
  Manager Dashboard), so every screen now matches: light page (#f6f7f9), white cards, soft grey borders, dark
  text, with the brand red kept as the accent. **Converted all seven staff pages:** Home + all its screens
  (`index.html`), Receipts (`bittings.html`), Scheduler (`scheduler.html`), Lishi & Keys (`lishi.html`),
  Programmers (`programmers.html`), Setup (`setup.html`), and Staff Login (`cloud-test.html`).
  - **The public marketing website was deliberately NOT touched** — it keeps its own customer-facing design.
  - **The printed receipt preview stays "paper"** (white with a dark brand band) on purpose — that's how the
    receipt should look; only the app *around* it went light.
  - How it was done: each page's shared color tokens were repointed to the Studio palette (so the bulk flips
    cleanly), then the hand-picked dark spots were lightened and accent text was darkened for readability on
    white. No behavior/logic/data changed — purely visual.
  - **Status = code-complete, pending mobile sign-off.** A light theme needs a real-device contrast check —
    `bittings.html` (Receipts) has the most hand-tuned spots, so look it over closely on a phone. See the test
    steps the assistant provided.

### 2026-06-15 (manager dashboard)
- **NEW Manager Dashboard (staff app, manager-only).** A new **📈 Dashboard** Home tile opens a single
  at-a-glance screen for the current month: four **KPI cards** — **Revenue · Jobs · Repeat customers · Avg
  ticket** — over a **"Jobs this week"** bar chart and a **"Jobs by type"** breakdown. It's **read-only** (shows
  numbers, changes nothing) and **manager-only** (hidden from a signed-in staff member, exactly like Closeout /
  Transaction History).
  - **Every number is real** — pulled live through the existing data layer, nothing hardcoded. **Revenue, Jobs,
    and Avg ticket use the same definition as Transaction History** (completed card/cash/check sales, tax excluded),
    so the figures reconcile. **Repeat customers** and the two job charts read the scheduler's bookings.
  - **Honest deltas:** the little "▲ 12% vs last month" lines appear **only when there's real prior-month data**.
    On a new/empty shop the screen shows **$0 / — / zeros and no made-up trends** — never sample numbers.
  - **Export** button downloads the current month's figures as a CSV. The dashboard uses an approved **light
    "Studio" look** (a light panel inside the otherwise-dark app). **Status = code-complete, pending mobile
    sign-off** (iPhone Safari + Android Chrome, manager + staff). *(A full light reskin of the rest of the app is
    the next task.)*

### 2026-06-15 (key programmer coverage)
- **Fixed a date error:** an earlier session stamped that day's Lishi work as **2026-06-16** (a day ahead of
  the real clock). Corrected every occurrence back to **2026-06-15** across the handoff, `STRUCTURE_NOTES.md`,
  `LISHI_CROSSREF_REVIEW.md`, and the provenance tags inside `lishi.html` — they now match the real file dates.
- **NEW staff-app tool: Key Programmer Coverage (`programmers.html`)** — a new Home tile (**🖥️ Programmers**).
  It answers "**which of MY key machines can do this car, and how?**" Type a VIN (or pick make + year) and it
  shows, for each programmer the shop owns, whether it can **Add a key**, do an **All-Keys-Lost (AKL)**, or make
  a **Remote** — by **OBD or bench** — and what it **needs** (a PIN, a paid online calculation/license, tokens, or
  an add-on module). **Staff app only — not on the public website.**
  - **The 7 tools it covers:** Autel **IM608 Pro 2**, Autel **IM508**, Autel **KM100**, Xhorse **VVDI Key Tool
    Max**, **SmartPro** (Advanced Diagnostics), **AutoProPad G2** (XTool), and **Lonsdor K518**. Each is listed
    under **🧰 My tools** with its tier, the add-on modules it needs (e.g. IM508 needs the XP400 Pro; Key Tool Max
    needs a companion OBD tool), and how it's licensed (tokens, ADS cards, Lonsdor points) — editable to match
    your exact kit.
  - **Pick which tools you own:** the **🧰 My tools** tab is a **checklist** — only the tools you check appear in
    the Lookup matrix. The catalog also carries **variants** (AutoProPad **G2 / G2 Turbo / G3**, Lonsdor **K518 /
    Pro / ISE**, Autel **IM508 / IM508S**, Xhorse **Key Tool Max / Plus**, IM608 / IM608 Pro 2) so you can pick
    your exact model; each variant shares its family's coverage column. (Your seven are checked by default.)
  - **Organized by immobilizer platform** (e.g. "GM Hitag2," "Toyota H/4A," "FCA 4A (PIN)," "VAG MQB"), because
    that's how programmer coverage really clusters — one platform row covers many models. Seeded broadly across
    the major US makes (**~54 platform rows**, incl. older PK3/PATS/Sentry-Key eras and Volvo, Jaguar/Land Rover,
    MINI, Genesis, Fiat, Suzuki) from each maker's published coverage plus general locksmith consensus.
  - **Honesty (important):** programmer coverage **changes with every firmware update and by region**, and the
    makers don't publish clean exportable lists. So every row is marked **"verify on the tool"** — a starting
    guide, not a guarantee. The most trustworthy rows are the ones **you** confirm on a real job: a **📝
    Corrections** log lets you jot what actually worked ("IM608 did this 2021 Camry AKL via OBD, 1 token"),
    export it, and Code folds it into the table — so over time it becomes your shop's own proven coverage.
  - **Editable/durable:** full add/edit/delete for both the tools and the coverage rows, plus CSV export/import
    for backup. **Status = code-complete, pending mobile sign-off** (iPhone Safari + Android Chrome).

### 2026-06-15 (continued)
- **Lishi: easier way to set which tool works for a vehicle.** The recommended Lishi is matched from
  the vehicle's **keyway**, so adding a vehicle with the right keyway is what makes the tool show up.
  To make that foolproof: the Add/Edit-vehicle **Keyway box is now a pick-list** of the actual Lishi
  tools (type "HU1…" and choose "HU100 — HU100(10) V.3"), and any **inferred "Matched by keyway"** card
  now has a **"➕ Add to Vehicles"** button that opens the form pre-filled so you can save it as a real,
  confirmed vehicle in one tap. *(Staff app only.)*
- **Lishi "Ignition pickable" fixed — no more fabricated "Caution":** the old data blanket-tagged
  smart-key / push-to-start vehicles as **Caution**, which was wrong (those have **no ignition cylinder
  → N/A**, and immobilizer programming is a normal step, not a hazard). The field is now plain
  **Yes / No / N/A**. A **Caution** now appears **only when the owner adds one** via a new
  **"⚠ caution note"** button on each vehicle card — for real field hazards (e.g. *"must pick to CLOSED
  — won't return to OFF,"* like the 2015 Fusion). The note is saved on the row and shown next to the
  pill. A one-time migration (`SEEDVER=8`) corrects already-installed rows **without** touching any
  caution the owner already entered. *(Staff app only.)*
- **Lishi tools cross-referenced across 7 sources + 31 added + conflicts filed for review:** scrubbed
  the FULL automotive Lishi line from seven sources — **Classic Lishi** (classiclishi.com, all 11
  pages), **Original Lishi**, **UHS Hardware**, **American Key Supply**, **CLK Supplies**, **Key
  Innovations**, and **LockPickWorld** — and compared every tool against what was already in the app.
  - **Added 31 missing automotive tools** that multiple trusted suppliers sell but the app lacked —
    mostly **late-model US vehicles**: Honda 2020/2021, Hyundai/Kia HY20R, K9 & K9 V.4 (2024+
    Kia/Hyundai/Genesis incl. Ioniq6), KIA3R, KY14, Ioniq5, Jeep Grand Cherokee CY24R (2021+), Ford
    Transit 2021, Mazda MAZ26R (2019+) & MAZDA2024 (CX-30), Toyota TOY2018/TOY2014/TOY40/TOY51/TOY2T,
    Subaru DAT17, Mercedes Sprinter YM15, plus several Euro/commercial tools. (Tool table now merges
    these into existing installs via `SEEDVER=7`.)
  - **Fixed one keyway-alias bug:** DAT17 (Subaru) used to resolve to the DAT12R Isuzu/Hino heavy-truck
    tool; now that a real DAT17 exists, that alias was removed.
  - **Conflicts NOT auto-changed — filed for owner approval** in new **`LISHI_CROSSREF_REVIEW.md`**:
    e.g. the app currently mislabels **TOY43R** as "Toyota" (suppliers: Subaru/GMC/Chevy), **ICF03** as
    "Iveco" (suppliers: Ford Escape/Mazda Tribute), **DAT12R** as "Subaru" (suppliers: Isuzu/Hino), and
    a few keyway-alias mappings (KK10, B102). Owner ticks what to apply; nothing changed live yet.
  - **Honesty:** the *tool* list is now corroborated across all seven sources; the *year-by-year
    vehicle* mapping remains a compiled cross-reference (Lishi publishes no year tables) backed by the
    "Matched by keyway" inference + Corrections Log. *(Staff app only; not on the public site.)*

### 2026-06-15
- **Lishi lookup: year-filtered models + "Matched by keyway" fallback (06:06):** the Year / Make / Model
  boxes now behave like a real catalog. A new **`MODELS` catalog (27 makes)** drives the Model box, and
  **every model carries its real production years** — so picking **2024 Ford** no longer shows a Crown
  Victoria (it ended in 2011); you only see models actually sold that year. When there's **no verified
  vehicle row** for the exact year/model, the page now **infers the keyway from the make + era**
  (`inferKeyway` rules, e.g. Ford ≥2012 → HU101, GM ≥2010 → HU100, Toyota ≥2004 → TOY48, BMW ≥2012 →
  HU100R, Cadillac 2024 → HU100) and shows the card with a clear amber **"⚙ Matched by keyway — verify
  in field"** pill so staff know it's an inference, not a confirmed row. Changing the **Year** now
  re-filters the Model list and re-runs the lookup. **Honesty:** inferred cards are a best-guess by
  keyway family — confirm on the vehicle and log fixes in the Corrections Log. *(Staff app only; not on
  the public site.)*
- **Lishi tools rebuilt from Original Lishi's OWN site (verified fetch):** replaced the earlier
  hand-compiled tool list with the **actual published list fetched from
  `originallishi.com/lishi-tools-full-list`** (2026-06-15) — **89 tools** (76 two-in-one + 7 readers + 4
  motorcycle readers), exact Lishi designations (e.g., `HU100(10) V.3 (10 Cut)`, `HU101(10) V.3`,
  `NSN14 Dr/Bt`, `TOY43AT Ign`, `DAT12R`, `HU162-SC10 V.3`). `source` now cites the URL + fetch date.
  A keyway-alias map (DA34→NSN14, KK10→HY20, DAT17→DAT12R, HU162T→HU162, B102→B111) keeps every vehicle
  row resolving to a real Lishi tool. `SEEDVER=5` **resets** the installed Tools store to this
  authoritative list (carries over notes). **Honesty:** the *vehicle* year→keyway table is still a
  **compiled cross-reference** (Lishi doesn't publish year-level mappings) — accurate-but-verify, refined
  via the Corrections Log; only the *tool* list is straight from Lishi.

### 2026-06-14
- **NEW staff-app tool: Lishi & Programming Reference (`lishi.html`) (23:55):** a working, pre-populated
  pick/keyway/programming reference for shop use, fed by the VIN decoder. **Staff app only — not on the
  public site.** New Home tile **🔑 Lishi & Keys**.
  - **Two local stores (tks_ keys, readLS/writeLS):** `tks_lishi_tools` (tool_designation, keyway,
    tool_type, wafer_positions, usage, key_blank, notes, video_url, source) and `tks_vehicle_keyways`
    (make, model, year_start/end, keyway, coded, door_location, can_pick_ignition, transponder_system,
    programming_path, oem_only, nastf_required, notes, source). Plus `tks_lishi_corrections` (log) and
    `tks_vin_cache` (recent decodes).
  - **Pre-populated for real** from public factual sources (Original/Classic Lishi tool lists, CLK
    Supplies, UHS Hardware, LockPickWorld), normalized into our schema — **89 Lishi tools — the actual Original Lishi published 2-in-1 + reader + motorcycle list, fetched
    from originallishi.com/lishi-tools-full-list (verified 2026-06-15) — plus 230 vehicles across 25 makes** (Ford, GM, Toyota, Honda, Chrysler/Dodge/Jeep/Ram, VW/Audi, Nissan, Hyundai/Kia, Mazda,
    Subaru, Mitsubishi, BMW, Mercedes, + global). Every mapped vehicle keyway resolves to a tool. A
    **versioned seed merge** (`tks_lishi_seedver`/`SEEDVER`) adds new tools to existing installs on update
    without clobbering the owner's notes/edits. `source` holds provenance
    (shown small, not prominent). Seeds **once** if the store is empty — never clobbers edits.
  - **VIN decode → reference card:** uses `TKS.decodeVin`, caches to `tks_vin_cache`, matches make/model/
    year and shows keyway → recommended Lishi → **in stock?** (cross-checks `tks_inventory`) → coded →
    ignition-pickable → programming path, with an **OEM-only / NASTF-required** red badge when applicable.
    Brand colors #14171b / #ffb000 / #b82334.
  - **Two-way search:** by make/model/year, or by keyway/tool (for when you're holding a key, not a VIN).
  - **Notes + corrections loop:** every row has an inline-editable **notes** field; a separate
    **Corrections Log** to jot fixes/additions; one-click export to **.md or .csv** to hand to Code, then
    **Clear log**. Code applies the file to the tables and the round-trip repeats.
  - **Durable/editable:** full add/edit/delete (modal), **CSV import/export** per table for backup,
    **duplicate detection** on make/model/year + keyway (and tool designation). **Status = code-complete,
    pending mobile sign-off** (iPhone Safari + Android Chrome).

### 2026-06-14
- **Removed the Images/"Our Work" widget; added social icons + a "Best of 2026" award badge (11:00):**
  - **Images widget gone everywhere** (homepage, service pages, all city/sub pages) — in the generator
    (`engine.photoSlots` no longer emits it; the hand-page "Our Work" section is replaced). City pages with
    real on-domain photos keep that gallery; others render nothing.
  - **Social icons** (Instagram, TikTok, Facebook, YouTube, Nextdoor, Google) — clean inline-SVG links that
    open in a new tab — now in the **header** (desktop bar + mobile menu) and **footer** site-wide, and **in
    place of the old "Our Work" widget** on the homepage + service pages. Single source: `SOCIAL` /
    `socialIcons()` in `engine.mjs`. **schema `sameAs` updated to all six** (new Facebook `/turbokeysmith/`,
    Nextdoor, Google Maps profile) so the structured data matches what's shown.
  - **Award badge** — "🏆 Best of 2026 · Ranked #1 Locksmith in Western Oklahoma — BusinessRate" — a clean
    text pill (no link, no plaque graphic) **beside every reviews section**: homepage + all 91 city/sub
    pages (baked into `REVIEWS_WIDGET`), paired with the "⭐ 250+ Five-Star Reviews" headline; also under the
    certifications hub **Recognition** heading (kept separate from Licenses & Credentials). Replaced the old
    plain "Top-Rated — BusinessRate" homepage line.
  - **Spanish:** mirrored — social icons in es header/footer, Spanish award badge beside es reviews + es
    cert hub Recognition (DRAFT). New `.social-icons` + `.award-badge` styles in `assets/styles.css`.
  - *Checks:* 0 image-widget refs site-wide; JSON-LD valid (sameAs:6) on EN + ES; award badge on 93 EN
    pages; social icons in header+footer+in-place. Pending: phone sign-off.
- **Certifications rebuilt into a hub + 6 dedicated credential pages; BusinessRate as social proof (05:08):**
  all in the `_build/` generator (`CREDS` data + `renderCertHub`/`renderCredPage`; Spanish in `es.mjs`).
  - **`/certifications/` hub** split into **Licenses & Credentials** (Google Verified + OK License #AC441081
    featured first, then NASTF VSP, Keyless2Go) and **Professional Associations** (OMLA, OKBFAA), each a
    teaser linking to its own page. Now a **generated** page (removed from the hand-page list).
  - **6 dedicated pages**, unique Title/Meta/H1, "what it is / what it takes to earn / what it means for
    you": **/certifications/google-verified/**, **/oklahoma-license/**, **/nastf/**, **/keyless2go/**,
    **/omla/** (→ omla.com), **/okbfaa/** (→ okbfaa.org). Wording uses **"Google Verified"** (never
    "Google Guaranteed"/money-back).
  - **BusinessRate** = review-based recognition, **kept OUT of the credentials group** — plain-text social
    proof only (no link, no badge): on the homepage by the reviews widget, and under a **"Recognition"**
    heading on the hub.
  - **Nav/footer:** Certifications added to the main nav (footer/mobile already had it).
  - **Spanish:** full `/es/` mirror — `/es/certifications/` hub + the 6 `/es/` credential pages — kept
    `noindex`/draft; each credential page carries an extra red **"needs proofread (accuracy matters)"**
    banner. ES nav/footer now point Certifications at the Spanish hub. **🚩 All 6 ES credential pages need a
    fluent reviewer before publish** (added to the §7.5 proofreading checklist).
  - *Checks:* JSON-LD parses on all 7 EN pages; 3-part structure on the 6 detail pages; hub teaser links
    correct; sitemap +6; `/es/` still out of sitemap. Pending: phone sign-off.
- **Public site deployed to a Cloudflare Pages PREVIEW (later 06-14):** `site/` uploaded to the Pages
  project **`turbokeysmith`** → **https://turbokeysmith.pages.dev** (free preview; per-deploy alias also
  issued). Used a **Pages:Edit-only** API token (kept in the owner's Windows user env via `setx`, never in
  chat/git). **No custom domain, no DNS, no nameservers — `turbokeysmith.com` and GoDaddy untouched.**
  Verified live: all core pages + financing/warranty/terms/faq return 200; homepage shows the
  reviews/images/local-posts widgets + financing/warranty teasers; no `aggregateRating` in schema; hours
  read "Sunday until 5:00 am"; `/es/` still `noindex`. Next: owner phone sign-off, then domain cutover together.
- **Spanish `/es/` mirrored with the new English content — still UNPUBLISHED draft (00:22):** brought the
  recent English additions into the Spanish site, all in the `_build/` generator (`es.mjs` strings +
  `es*` render functions), and regenerated. **`/es/` stays `noindex`, out of the sitemap, blocked in
  `robots.txt`, with the DRAFT banner — and the 🌐 toggle was NOT changed** (still chrome-only; it points
  at `/es/` only after proofreading).
  - **New Spanish pages:** `/es/financing/`, `/es/warranty/`, `/es/terms/` (with print-to-PDF), and
    `/es/faq/` (new — the Spanish site had no FAQ before; includes a Spanish **FAQPage schema**, 8 Q&As,
    in sync with the visible page).
  - **Updated Spanish pages:** `/es/` home (financing + warranty teasers), `/es/automotive/` (warranty
    section + financing teaser), `/es/residential|commercial|emergency/` (financing teaser). **Every**
    `/es/` page got the new **nav + footer** (Financiamiento, Garantía, and FAQ now point to the Spanish
    pages instead of the English ones; Términos in the footer legal line).
  - **FAQ content mirrored:** updated "¿Cómo puedo pagar?" (cash/cards/Amazon Pay/Cash App Pay/Link +
    Klarna/Afterpay/Zip; PayPal Pay-in-4 on request), new "¿Ofrecen financiamiento o planes de pago?",
    new "¿Dan garantía a sus llaves de auto?" — visible + schema.
  - **⚠️ MUST be human-proofread before publish (extra red banner on the page itself):** **`/es/warranty/`**
    and **`/es/terms/`** — locksmith + legal terms can't rely on machine translation. Also new
    machine-translation copy to proofread with the rest of `/es/`: `/es/financing/`, `/es/faq/`, the
    financing/warranty teasers, and the `/es/automotive/` warranty section. (The English originals are
    unchanged.) See the full list in section 7 item 5.

### 2026-06-13
- **New pages: Financing, Warranty, Terms + FAQ/payment/warranty/signature updates (23:49):** all built
  in the `_build/` generator and regenerated (sitemap now 105 URLs).
  - **`/financing/` — "Affordable Locksmith & Payment Plans":** new page in the **main nav + footer**,
    unique Title/Meta/H1, same schema/header/footer. Positions on value (not cheapest, best value) and
    explains pay-later (Klarna/Afterpay/Zip, interest-free 4 payments) + wallets (Amazon Pay/Cash App
    Pay/Link) + PayPal Pay-in-4 on request. Honest claim: "one of the only" locksmiths offering pay-later.
    A **"Flexible financing available" teaser** links to it from the **homepage and all 4 service pages**.
  - **`/warranty/` — "6-Month Key Warranty":** dedicated page (full coverage / exclusions / how-it-works
    logistics), a **prominent warranty section on the Automotive page**, and a **homepage teaser**. Footer
    + mobile-nav link. Positioned as a differentiator (local competitors don't publish defined warranties).
  - **`/terms/` — Terms & Conditions / Service Agreement:** new page linked in the **footer legal line**,
    with a **Download/Print PDF** button (browser print-to-PDF with a branded print header). Covers
    authorization & ownership, pricing & payment, the 6-month key warranty, limitation of liability, and
    agreement. ⚠️ **Have an attorney review** the authorization/warranty/liability clauses before relying
    on it (flagged in an HTML comment too).
  - **FAQ:** rewrote "How can I pay?" (cash, all cards, Amazon Pay/Cash App Pay/Link, + pay-later
    Klarna/Afterpay/Zip, PayPal Pay-in-4 on request); **added** "Do you offer financing or payment plans?"
    and "Do you warranty your car keys?". Visible page **and** FAQPage schema both updated (now 8 Q&As,
    matched).
  - **Nav/footer are now single-source:** `patchHandPages()` overwrites each hand page's header + footer
    with the canonical `engine.header()/footer()`, so the Financing nav link + the Financing/Warranty/Terms
    footer links appear on every page and stay consistent on regenerate.
  - **App — surcharge (confirmed + tightened):** the 2% is **credit-card only** and always was for
    cash/check and BNPL/wallet *types* (Klarna/Afterpay/Zip/Amazon Pay/Cash App Pay resolve to non-card
    types → never surcharged). Closed one gap: a **wallet-backed card** (Link/Apple/Google Pay shows as a
    card with `card.wallet` set) is now explicitly treated as a wallet and **never surcharged** — only a
    genuine credit card (`type=card`/`card_present`, no wallet, `funding=credit`) gets the 2%. Edit is in
    `supabase/functions/stripe-webhook/index.ts` and is now **DEPLOYED LIVE** (2026-06-14, version 3,
    `verify_jwt:false` preserved; still TEST mode).
  - **App — invoice signature:** added the authorization line by the signature pad **and** on the printed
    receipt/PDF: "By signing, I authorize the work described and agree to Turbo Keysmith's Terms &
    Conditions (turbokeysmith.com/terms)." Kept in agreement with the website Warranty + Terms.
  - *Checks:* JSON-LD parses on the new pages + FAQ (8 Q); nav/footer links verified; bittings.html JS
    syntax-clean; **stripe-webhook redeployed live (v3) and verified**. **Pending:** real-device look
    (iPhone/Android) + Google Rich Results Test once the site is deployed; attorney review of `/terms/`.
- **Public site finalized — Google widgets integrated, schema/hours/cities locked, placeholders gone (22:55):**
  Did it all in the generator (`_build/`) and regenerated, so it survives future rebuilds.
  - **Widgets (localmarketingmanager.com Live Google Business):** the three iframe widgets are now
    wired in as a single source in `engine.mjs`. **Reviews** (with a plain-text "⭐ 250+ Five-Star
    Reviews on Google" backstop headline) and **Photos/"Our Work"** appear **site-wide** — homepage +
    all 91 city/sub pages — via `reviewSlot()`/`photoSlots()`. **Local Posts** is **homepage only**.
    All iframes are **lazy-loaded** (reviews loads after the page via its sizing script). On
    Edmond/Moore/Norman/Midwest City the **real on-domain job photos are kept** above the photos widget.
    Verified all three endpoints return HTTP 200.
  - **Schema:** every page (generated + hand pages) now uses the **one canonical `schema()`** Locksmith
    block (the generator overwrites each hand page's inline JSON-LD with it). **Removed
    `aggregateRating` + the 4 `review` entries** (self-serving, iframe-backed — Google penalty risk).
    **Hours** (Mon–Sat 24h `00:00–23:59`; Sun `00:00–05:00`) and the **full 25-city `areaServed`** now
    flow to **all 102 pages** (was inconsistent before). JSON-LD validated as parsing on samples.
  - **FAQ:** native `/faq/` page + `FAQPage` schema kept as the visible, primary FAQ; the
    localmarketingmanager FAQ widget was **not** added (removed its placeholder). FAQ hours text + the
    Locksmith schema + the homepage Hours card all agree (Sun until 5:00 am).
  - **Cleanup:** every owner-facing placeholder is gone from the live English pages — "Our Work" empty
    slots, the 3 homepage widget placeholders, the redundant "From Our Google Profile" section, the FAQ
    widget slot, the blog "POST SLOT" cards, the certifications "Credentials & Badges" empty slots, and
    dev NOTE comments. All enforced in `_build/` so they stay gone on regenerate.
  - *Checks:* JSON-LD parses + correct types on samples (homepage/service/faq/city/sub); widget
    endpoints 200; iframes responsive by design (width:100% + the reviews widget's resize breakpoints)
    and lazy-loaded. **Pending:** a real-device look (iPhone Safari + Android Chrome) on the deployed
    temp URL and Google's **Rich Results Test** on a live URL (needs the site deployed first).
- **Hosting DECIDED + deploy prepped — Cloudflare (17:22):** chose **Cloudflare Pages** for the public
  site + **Cloudflare DNS** (move nameservers; GoDaddy stays registrar + email). Reason: free, fastest
  CDN, unlimited bandwidth, free SSL. Prepped the repo: added **`site/_headers`** (asset caching +
  security headers), verified the `site/` folder is self-contained/depth-correct (serves on Pages as-is),
  and wrote a full **`DEPLOY_CLOUDFLARE.md`** runbook (with the email/MX-records safety check, a
  verify-on-temp-URL-before-cutover sequence, the speed toggles, and a reversible domain flip). Staff app
  deferred to its own `app.turbokeysmith.com` Pages project (needs Supabase auth-redirect + edge-function
  CORS updates first). **Not deployed yet** — needs the owner's Cloudflare account + GoDaddy nameserver
  change. See §7 item 6.
- **Hours — "Copy to…" shortcut so you don't set every day (15:10):** each day row in Setup → Hours now
  has a **⧉ Copy to…** dropdown. Set one day (say Monday 10–6), pick **All days**, **Mon–Fri**, or
  **Sat–Sun**, and it copies that day's whole schedule (open/closed/24 + times) onto those days
  instantly. Works on both the 🏪 Shop and 🚐 Service editors. *Code-complete, pending mobile sign-off.*
- **"Owner" is now called "Manager" everywhere you see it + each manager gets their own PIN (12:56):**
  Two changes the owner asked for. **(1) Wording:** every place the app used to say **Owner** now says
  **Manager** — the role badge in the top bar, the little badge on the Closeout/Reports tiles, the
  "managers only" messages, the scheduler's Quick-form labels (English **and** Spanish — *dueño* →
  *gerente*), and the Setup → **Access & managers** step. (This is purely the *word* you see; nothing
  about who-can-do-what changed, and "vehicle owner" wording on car paperwork is untouched.) **(2) A PIN
  per manager:** before, there was **one** shared PIN that unlocked manager-only things (taking a
  payment, the quick forms) when nobody was signed in. Now, in **Setup → Access**, each person you mark
  as a **Manager** gets their **own PIN** box — give each manager a different PIN. **Any** manager's PIN
  unlocks those actions, so you can tell who's who and change one person's PIN without affecting the
  others. The old single PIN still exists as an optional **"Shared fallback PIN"** (use it instead of,
  or alongside, personal PINs — or leave it blank). Works the same on the payments screen, the
  scheduler quick form, and the Receipts quick invoice. **Status = code-complete, pending mobile
  sign-off** (iPhone Safari + Android Chrome, manager + staff).
- **Two separate hour sets — Shop hours vs Service hours (12:47):** Setup → **Hours** now captures
  **two** schedules instead of one: **🏪 Shop / storefront hours** (walk-ins) and **🚐 Service hours**
  (when you take jobs in the field). They're independent per-day editors (Open / Closed / 24 hours, with
  open/close time pickers), because a shop is often open limited hours while service runs much later. An
  **overnight window** is entered as a normal open→close that ends after midnight on the **next** day —
  e.g. Sunday **12:00 AM–4:00 AM** captures "Saturday night" service for the club/party crowd. Stored as
  `serviceHours` in the cloud-synced config (mirrors the existing `hours` shape); existing configs get
  sensible defaults (Service = 24h Mon–Sat + Sun 12–4 AM) and migrate automatically. The Review step now
  lists both lines. *No screen shows hours to customers/staff yet — this is the data-capture step; a
  "we're open / on call now" display can read these later.* **Status = code-complete, pending mobile
  sign-off** (iPhone Safari + Android Chrome, owner + staff).
- **Deposit Slip — carryover starting float + shortfall handling + Settings float (10:37):** the float
  is now a real **carryover** — what you keep at close becomes the **next day's opening (starting)
  float**. The Closeout "starting float" is **editable per day (owner-only)** and defaults to the carried
  amount, or to your **Settings float** on a fresh start. Added a **Cash drawer float** field to
  **Setup → Payments** (default **$120**; raise it as the business grows). If the counted drawer is
  **under the starting float**, Closeout now **warns and tells you exactly how much cash to add** to
  bring it back — or lets you **continue** (deposit shows $0 and the slip records the shortfall). The
  deposit-slip PDF + copyable summary now show the **starting float** and any **float shortfall**.
  Owner-gated; whole-cents math. *Pending mobile sign-off.*
- **Closeout — end-of-day Deposit Slip added (10:22):** Closeout now has a **denomination drawer count**
  (how many $100/$50/$20/$10/$5/$2/$1 bills, $1 coins, and 50¢/25¢/10¢/5¢/1¢) that builds an
  **end-of-day deposit slip**. It shows, live on screen: **total cash counted**, the **float you keep in
  the drawer** (default **$120**, remembered between days), the **deposit amount** (counted − float), and
  **today's over/short** vs the cash the system expected (the day's recorded cash sales). You can
  **📤 Share/Save** it as a **branded PDF** (same look as the receipt — your logo + business name) the
  same way you share a receipt (phone Share sheet, or download on a computer), or **📋 Copy** a text
  summary. All money math is in whole cents. **Owner-only.** *(Built on `jsPDF`, added to the staff app
  for this; if it can't load offline, the slip still copies the text summary so it never dead-ends.)*
  **Status = code-complete, pending your mobile sign-off** (iPhone Safari + Android Chrome, owner + staff).
- **A5 BUILT — Setup is now the single source of truth for service types across all apps (09:50):**
  the scheduler and the invoice builder no longer keep their own hardcoded Automotive/Residential/
  Commercial lists — they read the categories (and, on invoices, the priced services) the owner picks
  in **Setup**. What changed: **(1)** a new shared helper `TKS.ServiceCats` in `app/store.js` reads the
  owner's offered categories + services from the cloud `shop_config` (localStorage fallback offline).
  **(2)** The scheduler's guided **job-type tiles** and the owner **Quick-form** dropdown are built from
  the owner's selected categories — so **Safe & Vault / Emergency / Access Control** appear when
  selected, and **Commercial disappears if you don't offer it**. New (non-core) categories book
  **"not in detail"** (a job type with no step-by-step sub-coaching; Car/House/Business keep their full
  flow incl. the VIN/ignition rules). **(3)** The invoice **"What type of service?"** picker lists your
  offered categories, and the line-item picker now **floats your Setup services to the top with a ★ and
  your set price pre-filled** (alongside the built-in common jobs). **(4)** The scheduler **call scripts
  stop saying "Turbo Keysmith"** — they auto-fill **your business name** (from Setup; "our shop" if
  blank) and the **signed-in tech's first name** ("Thanks for calling Acme Lock, this is Sam!"), in
  English and Spanish. An un-configured/offline shop still behaves exactly as before (the 3 core types).
  No data migration — existing bookings/receipts keep their stored values. **Status = code-complete,
  pending your mobile sign-off** (iPhone Safari + Android Chrome, owner + staff). *Heads-up for the
  books:* a **custom-named** Setup service (one not in the built-in catalog) is auto-sorted to
  Materials-taxable or Labor-non-taxable by a keyword guess — **double-check the taxable flag** on those
  lines until confirmed on real receipts.
- **Full status-report verification pass (09:32, report-only — no features changed):** audited the whole
  codebase against these docs and against the **live Supabase project**. Findings: all 7 cloud tables
  (`customers`, `inventory`, `bookings`, `receipts`, `payment_transactions`, `payment_events`,
  `shop_config`) exist with the documented columns (incl. `cost_cents`/`technician`/`tax_cents` and the
  lead fields), RLS on; all **7 payment edge functions are deployed and ACTIVE**, plus the webhook
  (`verify_jwt:false`, correct). Doc corrections made this pass: edge-function count **6 → 7** (pay-void
  was added but uncounted in the file map + task list). Two truths surfaced for the planning assistant:
  **(1)** Closeout was a **drawer count/summary only — no printable "deposit slip"** *(since built — see
  the 2026-06-13 10:22 changelog entry)*. **(2)** Two leftover verification functions
  (`spike-stripe`, `spike-terminal`) are still deployed live and should be **deleted at go-live cutover**.
  Security advisors: leaked-password protection still off (Pro-only, deferred) and the per-table RLS
  policies are `authenticated = full access` (correct/by-design for single-shop; **must become per-org
  for the multi-tenant Track F**). No code was modified.
- **"+ Add a service" now lives under each category:** in Setup → Services, every category has its own
  **"+ Add a service"** button that adds a blank custom row **to that category**. (Before, a single button
  at the bottom always dropped the new service into Automotive.) Verified end-to-end.
- **DONE (built 09:50 — see the top entry for this date) — one service list shared across all the apps:**
  *(originally planned earlier this day; now implemented.)* the categories and services
  you pick in Setup are now the **single source of truth** for the whole app — the **scheduler** and
  the **invoice/receipt** screens read your selections instead of each using its own hardcoded
  Automotive/Residential/Commercial list. *(To answer the question that prompted this: yes — that shared
  "file" already exists. It's the cloud `shop_config` record every screen loads; the apps just aren't all
  reading from it yet. Nothing about Commercial is being removed — every category you select still shows;
  ones you don't select simply won't clutter the screens.)* What this will do once built: **(1)** if you
  offer **Safe & Vault** (or Emergency / Access Control), it shows up as a job type in the scheduler and
  as a service type on invoices; categories you don't offer disappear. **(2)** On an invoice, after you
  pick a service type, the pick list shows **your Setup services with the prices you set** (pre-filled),
  **combined with** the built-in catalog's tax + Labor/Materials bookkeeping tags, and **filtered to that
  category** so you're not scrolling past car-key services to bill a house rekey. **(3)** The scheduler's
  call scripts stop saying "Turbo Keysmith" — they auto-fill **your** business name and the signed-in
  tech's **first name**. New categories appear "not in detail" (a job type, without the full step-by-step
  coaching that Automotive/Residential/Commercial have). Plan saved; **status when built = code-complete,
  pending your phone sign-off** (iPhone + Android, owner + staff).
- **Services rebuilt as a pick-and-price flow (00:42):** the confusing services grid is replaced by a
  clear **2-step** flow. **Step 1 — Service types:** tick the categories you work in (Automotive,
  Residential, Commercial, Safe & Vault, Emergency, Access Control, Other). **Step 2 — Services:** for
  each category you picked, the **common services are listed for you to check off**, each with an
  optional **price** box (enter a standard price, or leave blank for per-job). Checked services become
  your service list; there's an **"+ Add a service"** at the bottom for specialty work we didn't list.
  Fixes the earlier confusion (duplicate category headings / missing common services) — the full common
  list now always shows for your selected types. **Pre-checked:** when you tick a category in step 1, all
  its common services start checked so you just **uncheck what you don't do**; each category in step 2
  has a **Select all / Clear** button to flip the whole group at once **without removing the category**.
  Stored in the cloud-synced config.

### 2026-06-12
- **Quick links split from Services + organized into categories (22:51):** in Setup, **Vendors/links**
  and **Services** are now **two separate steps**. Quick links are grouped into **categories** — Vendors,
  NASTF / Registry, Programming & Tools, Reference & Lookups, Associations, Other — each with its own
  editable list (add/remove links). On the **Home screen**, each category only shows a tile **when it has
  at least one link** — **empty categories have no tile** (no clutter). **Keycodes** stays a built-in
  tile (the dealer/OEM portal list) and is always shown. Your existing vendor links carry over
  automatically. Stored in the cloud-synced config. the free-text hours box is replaced by a
  proper **per-day editor** — for each day (Mon–Sun) pick **Open / Closed / 24 hours**, and when open,
  pick the **open and close times** from dropdowns. Stored as structured data in the cloud config (any
  old free-text hours migrate automatically). First of a few "make it a dropdown where it makes sense"
  passes (one at a time).
  six fixes to the guided Setup page. **(1) Services:** replaced the short list with a **full locksmith
  catalog grouped by category** (Automotive, Residential, Commercial, Safe & Vault, Emergency/Other) —
  pre-filled and fully **add / remove / rename / reorder** (▲▼), stored in the cloud config (the old
  5–6 are folded in, not duplicated). **(2) Employees:** the freeform email boxes are now **Name +
  Email rows** with an **"Add user"** button and an **Owner** tick per person — owner powers follow the
  ticked emails. **(3) Inventory import:** a new optional step lets you **upload a .xlsx or .csv**,
  it **auto-detects your headers**, you **map each column** to the app's inventory fields (read from the
  real schema), **preview**, then **import — skipping duplicates** (by SKU or name) and reporting how
  many came in / were skipped. The **same importer is also on the Inventory tile** (📥 Import) — built
  once. **(4) Tighter sizing:** trimmed field/spacing sizes so short steps fit with Save/Continue
  visible without scrolling (inputs stay 16px so phones don't zoom). **(5) Placeholders** are now
  generic samples ("123 Main St", "(555) 123-4567") — never your real data; your entered values show as
  normal filled-in text. **(6) Everything persists** to the cloud-synced config on every keystroke/step
  — **where:** Supabase `shop_config` table, single row, `data` (JSON) column, mirrored to this device's
  storage; it repopulates on reopen so you only fill it in once.
- **Vendor tools → three tiles, each opening a tappable link list (21:54):** the Home "Vendor tools"
  area now has **Vendors**, **Keycodes**, and **NASTF** tiles; tapping one opens a list that opens each
  link in a new tab. **Vendors** holds American Key Supply + Key Innovations (from your config, editable
  in Setup). **Keycodes** is the dealer/OEM keycode portals, labeled by make (Toyota, Honda, Hyundai,
  Nissan, Mazda, GM, Ford, Chrysler/Jeep/Dodge/Ram, Kia, Mitsubishi, Subaru) — **dealer/OEM only, no
  third-party sites**. **NASTF** is the SDRM login. Each keycode row shows a per-make logo: it uses a
  real image from **`app/assets/keycode-logos/<make>.png`** if you drop one there, else the site's
  favicon, else the make's initial (filename guide is in that folder's README). These are **field tools
  available to any signed-in staff** (not owner-only). Lists are big, one-handed-tappable rows.
- **Guided first-run Setup wizard (also your editable Settings) (21:42):** a new **setup.html** walks a
  fresh install through everything in plain steps — **(1)** business identity + logo, **(2)** sales tax
  rate + which categories are taxed, **(3)** payments (the credit surcharge %, and a clear note that
  Stripe keys are *never* typed into the app — the secret lives in Supabase, the publishable key on the
  Pay screen), **(4)** access (owner email(s), staff, owner PIN, Quick-invoice switches), **(5)** vendor
  quick-links + the service list, **(6)** business hours + an optional receipt footer, and **(7)** a
  review that flags anything you skipped. Every step is **optional and saved as you go**, with a
  progress indicator and **"Finish later"** so an unfinished setup never blocks work. It opens
  **before Home on first run / when setup is incomplete**, and you can relaunch it anytime from the
  **⚙ Setup** link (Home) or the gear in Receipts. Everything is stored in the **cloud-synced owner
  config** so all your devices match, and it's owner-only. It feeds the real app: your **identity flows
  onto receipts/PDF**, **vendor links become the Home tiles**, your **owner emails/PIN** drive who sees
  owner tools, the **service list** feeds the booking form/scheduler, and the **footer** prints on
  receipts. (Built so it can later become per-shop onboarding for a sellable multi-tenant version.)
- **Owner-only tools are now hidden (not just disabled) for non-owners — and survive going offline
  (18:14):** Closeout, Transaction History, the Payments/New Charge tile, and the Receipts Settings
  gear are **removed from view** for a signed-in staff member, so trainees never see owner tools.
  Crucially, this is **offline-safe**: the app figures out "are you the owner?" from your remembered
  sign-in stored on the device, so if the internet drops mid-job the owner **keeps** their tools (we
  don't mistake "offline" for "not the owner"). Exactly what shows: **owner online** → everything;
  **owner offline (still signed in)** → everything; **staff** → owner tools hidden; **signed-out /
  fresh device** → the analytics tiles are hidden, but taking a payment + opening Settings still work
  via the **owner PIN** (so a fresh install can still be set up and an owner can still charge). Part of
  this same task — the **guided first-run Setup wizard** — is the larger remaining build; the full
  inventory of every configurable value was produced as its spec (see chat).
- **Text legibility / contrast fix (18:02):** the Home tile **titles** (Customers, Receipts, etc.) were
  rendering near-black on the dark tiles — actually darker than the gray descriptions under them — so
  the names were hard to read and the hierarchy was upside-down. Root cause: the title text had no
  color set, so it fell back to the browser's default near-black on the buttons. Titles are now the
  **brightest text on the tile** (near-white) with the description a readable step dimmer. Also went
  through all four app pages and **raised the too-dark small text** (faint hints/labels/sub-rows) to
  the readable accessibility standard while keeping the bright→dim hierarchy, and **enlarged two small
  buttons** (the Receipts history-row buttons and the panel "Done" button) to a thumb-friendly size.
  Scheduler and the login page were already fine. **Pending mobile sign-off.**
- **Entry experience: login-first, straight-home, never stranded + the real logo (17:34):**
  - **Login first, home after.** When the staff app opens **signed out and online**, it now shows the
    **Staff sign-in** screen first; after you sign in it drops you **straight to the Home screen** (no
    more "you have to tap Home"). A **remembered sign-in** skips the login entirely and goes straight
    Home.
  - **Never a dead-end with no signal (the van case).** Here's exactly how the no-internet / no-session
    case works: the app checks for a **remembered session token saved on the device** — that check is
    instant and needs no internet. **If a token exists → Home** (works offline; syncs when back online).
    **If there's no token but the phone is offline** (`navigator.onLine` false) → it does **not** bounce
    to login; it opens **Home in local mode** so you can keep working. **If there's no token and you're
    online** → it shows login first; and even there, a **"Use the app offline (no sign-in)"** button
    takes you into the app in local mode, so the login is never a wall. Login-first only happens when
    signing in is actually possible.
  - **Logo.** Put the real **Turbo Keysmith** logo on the **login screen** (full lockup) and the
    **Home header** (just the turbo mark next to the wordmark), and wired it onto the **receipts + PDF**
    (it was showing the old "Bittings" document-and-key icon). I picked `fulllogo_transparent.png` for
    the login (high-res, transparent, includes the wordmark) and a **cropped mark** from it for the
    header/receipt (since those already print "Turbo Keysmith" as text, the mark alone avoids doubling
    it). The PDF now **fits the logo to its real shape** so it's never stretched. Existing default
    installs auto-adopt the new logo; if you'd uploaded your own, it's kept.
- **Sales tax — configurable, not hardcoded (17:04):** you can now set a **sales-tax rate** (e.g.
  8.625%) and choose **which kinds of line items are taxable** (defaults: Parts/Materials **taxed**,
  Labor/Service **not** taxed) — in Receipts → Settings, **owner-only**, and it **syncs to the cloud**
  so every device matches. On a receipt, only taxable lines are taxed, **labor stays on its own line
  and is excluded** (Oklahoma exempts separately-stated labor — parts and labor are never lumped
  together), and **tax shows as its own line**. Because you're mobile and city rates vary, you can
  **override the rate on an individual receipt** (it defaults to your shop rate) — on the Quick invoice,
  or via Receipts → Edit → Tax rate. The math is done **on the server** from the saved receipt, so a
  phone can't fudge the amount or the tax. **Order on the bill:** tax the goods → that's the amount →
  then the 2% credit-card surcharge is added on top of that — and the Pay screen shows the subtotal,
  tax, amount, and surcharge before you charge. **Collected tax is pass-through:** it's **excluded from
  Total Sales and Profit**, and shown separately ("Tax collected" in Transaction History, "sales tax" in
  Closeout) so you know what to remit. Still TEST mode; owner-gated; **pending your mobile sign-off**.
- **Phone-layout cleanup pass (16:25):** from the full mobile audit — made things fit and tap nicely on
  a small phone. Dropped the extra **💬 Text / ✉️ Email** buttons from the receipt card (the **📤 Share**
  button already opens Messages/Mail and attaches the PDF, so they were redundant and crowding the bar);
  the remaining four buttons now wrap to two neat rows instead of clipping. Made the **Closeout** total
  chips wrap so all seven fit. Enlarged small tap targets (close ✕, the Refund button, the quick-invoice
  ✕/📦) toward a thumb-friendly size. Stopped the iPhone "zoom when you tap a field" on the login,
  the Transaction-History dropdowns, and the scheduler date box (raised their text to 16px). Replaced the
  pop-up that asked for the card key (typed-card) with a normal **input field** on the Pay screen. Still
  **pending your on-phone sign-off** (iPhone + Android).
- **Send a receipt from your own phone, plus refunds & a technician filter (16:04):** on a paid
  receipt — or right after Pay Now / New Charge — you can now **send the customer their receipt using
  your phone's own apps** (their number, their Gmail/Mail). **No email service, no key, no monthly
  cost.** The main button is **📤 Share**, which opens your phone's Share sheet with the **actual PDF
  attached** (pick Messages, Mail, Gmail, WhatsApp, AirDrop…). When the customer's phone/email is on
  file you also get quick **💬 Text** and **✉️ Email** buttons (these prefill a short summary — best-
  effort, since text prefill is unreliable on some Androids). On the shop computer (no Share sheet) it
  still just downloads/prints as before. *(New Charge sends a text summary; the full PDF lives in the
  Receipts flow.)* Also added: a **↩︎ Refund** button on each transaction in Transaction History
  (card refunds through Stripe, cash/check voided — and any parts go back to stock), and a **filter by
  technician** so you can see one person's sales. **Pending mobile sign-off** (see the rule above; I
  can't run real phones from here — test steps provided). **Future, not built:** printing to a
  **thermal receipt printer** instead of a PDF.
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
