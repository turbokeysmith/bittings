# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-06-22 (Claude Code) &nbsp;·&nbsp; see the **Changelog** (section 11) for the
timeline of what was done and when. **🚀 The public website is now LIVE on `https://turbokeysmith.com`
via Cloudflare (see the 2026-06-19 changelog entry).** Repo folder is now **`turbokeysmith-main/`**, split into
**`website/`** (public site) and **`bittings-app/`** (staff app) — see §8. A **blog** ("Notes from the Key Man")
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

**How the website is maintained:** the public site is **hand-maintained static HTML** in
`website/site/` — that folder is the single source of truth. **Edit those files directly and
deploy.** There is **no build step** and **no generator to run.**

> ⚠️ **The old page generator is RETIRED** (archived to `_archive/_build-generator-RETIRED/`). It
> fell out of sync with the live site — it emits emoji icons where the live pages use SVG icons, so
> running it would regress ~220 pages. **Do NOT run it.** It is kept only as a historical reference.

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
(no _build/)            Generator RETIRED — archived to _archive/_build-generator-RETIRED/. Site is
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
