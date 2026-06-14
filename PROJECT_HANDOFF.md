# Turbo Keysmith — Project Handoff (read me first)

**Last updated:** 2026-06-14 11:09 CDT (Claude Code) &nbsp;·&nbsp; see the **Changelog** (section 11) for the
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
   **Cloudflare Pages** (deploy the `site/` folder); domain DNS → **moved to Cloudflare** for speed +
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
  site/es/              Spanish DRAFT site (noindex, unpublished); site/es/GLOSSARY.md = term list
_build/                 Developer-only generator for the city pages
  _build/es.mjs         Spanish source: glossary, UI strings, and per-city translations (edit here)
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
