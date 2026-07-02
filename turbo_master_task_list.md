# Turbo Keysmith — Master Task List
*One place to see every project, what's done, what's left, and where we are.
Keep this updated after each work session. Status key: ✅ done · 🔨 in progress ·
⏸️ parked (waiting on a decision/credential) · ⬜ not started.*

Last updated: 2026-07-02 PM (Claude Code) — ⚡ **THE PRE-PILOT PUNCH-LIST IS DONE** (owner-authorized overnight run): all 16 do-able items from `PRE_PILOT_REVIEW.md` built + verified + pushed, one commit each. Multi-shop readiness: per-shop Settings & commission config, **staff invites from Settings** (temp-password, owner-only), all 21 DEFINER RPCs shop-fenced (live-proven: QA shop sees zero real-shop rows), billing-checkout/pay-terminal/tier fns shop-scoped, bootstrap owner-email+PIN removed. Polish: Commission tech-self-scope + front-desk hidden (owner decision), 390px overflow fixed, AA contrast both themes, CORS allow-list on every pay fn. New screens: 📦 Receive units (serialized), 📜 Activity (audit trail), 🖨️ auto-print on sale, missing-cost nudge, Manage-subscription (billing-portal deployed). Isolation proof now **29/29**. ⏸️ Owner items: deploy `billing-webhook` + STRIPE_PRICE envs (billing go-live), set ALLOWED_ORIGINS at domain switch, leaked-password protection (paid), Spanish publish, thermal logo, website-leads, device sweep. Earlier: 🔍 **PRE-PILOT REVIEW — read `PRE_PILOT_REVIEW.md` (repo root)**: whole-codebase review (security / missed / redundancy / quick wins). ✅ Fixed + verified live: **all anon-executable DB functions revoked** (migration `phase5_5f`, Supabase linter clean, isolation test **25/25** incl. a new post-revoke trigger probe), customer-edit `updatedAt` bump, Reconcile **✕ Discard count** button (wires the orphaned `cycle_cancel`), favicon 404, stale cost comment, unused deps, isolation test now portable across PCs. ⏸️ **Owner decisions (🔴s in the report):** Commission tab visible to techs (hide vs self-scope), `billing-checkout` wrong-shop subscription, older DEFINER RPCs not shop-scoped, `shop_config` single-row (blocks shop #2's Settings), **no staff-invite flow** (the practical pilot blocker), `pay-terminal` trusts a client account id. Earlier: 🔐 **PHASE 1 (Roles, Security & Accountability) is CODE-COMPLETE + in owner field-testing** (see **Track G** below + `PHASE1_PROGRESS.md` / `PROJECT_HANDOFF.md`): real roles + RLS + append-only audit, fleet + per-location inventory, job accountability (status state-machine, parts reconciliation w/ cut-key photo, cancel-with-reason), cost/margin hidden from techs & front-desk, all payment functions auth-gated. **This session's field-test fixes:** centered + theme-matched pop-ups, dark-mode text fix, New-Charge tied to the customer DB, vendor-tool role gating, and a **Scheduler pass** (technician self-scope: sees only own jobs / can't edit / status-only; cloud-roster technician dropdown; Street/City/State/ZIP address feeding the calendar; cancel/reschedule require a note + equipment-unused / manager-sign-off warning, optional for the owner). **Phase 2 (POS/cash-register + configurable commission engine) is now BUILT + server-proven** (branch `phase2-pos-commission`) — pending the owner's prices/% + a phone sweep; **next = Phase 3 (serialized inventory + barcode scan) or go-live hardware.** Earlier: 🔗 **Link-in-bio page built** at `/links/` + Spanish mirror `/es/links/` (for the Instagram bio link): hand-built static HTML, mobile-first Linktree style — full Turbo Keysmith wordmark logo (centered) + tagline + a vertical stack of big thumb-friendly buttons (📞 Call Now [primary, brand-red] · 💬 Text Us · 💳 Pay Now · 📝 Blog · 💰 Financing · 🌐 Full Website) + a license/NASTF trust line; matches the site's dark premium skin; **bilingual with an EN/ES toggle — every button stays in its own language** (ES buttons → `/es/...`), reciprocal hreflang; `noindex`, not in sitemap/nav. **On `links-page` branch → deploy to a Cloudflare PREVIEW pending the owner's two-phone check (iPhone Safari + Android Chrome); promote to `--branch=main` + delete preview only on owner OK.** Earlier (2026-06-19 night): 📝 **Public BLOG launched** at `/blog/` (display name "Notes from the Key Man"): in-page search + color-coded category filtering, 6 category pages, seed post with full schema, RSS, real Lishi hero photo; **FAQ rewritten** (12 Qs emergency-first, 24/6 hours, root-relative links, schema rebuilt); **stale-CSS cache bug fixed at the root** (Cloudflare Browser-Cache-TTL → Respect Existing Headers + `styles.css?v=N` versioning); previews now auto-deleted on approval. **▶ NEXT SESSION: the BITTINGS staff app (`bittings-app/`).** Earlier: 🗂️ **Repo restructured**: folder `_live-clone/` → `turbokeysmith-main/`; split into `website/` (hand-maintained static public site; **generator RETIRED/archived**) and `bittings-app/` (staff app), ONE git history (289 renames), public URLs unchanged & verified byte-identical; deploy now `wrangler pages deploy website/site --branch=main` (no build step / no generator). Earlier: 🚀 **PUBLIC SITE LAUNCHED at turbokeysmith.com** (GoDaddy→Cloudflare DNS, Cloudflare Pages, HTTPS Full-strict, www→apex redirect, M365 email preserved); **Spanish /es/ PUBLISHED + indexed** (noindex removed, draft banners dropped, robots unblocked, 222-URL sitemap, reciprocal hreflang); site-wide **Contact Us** in header/footer + **Contact Us Now** hero button; **WhatsApp brand-green**; **contact form now emails the shop** (Web3Forms, EN+ES). **File cleanup DONE** (owner-approved): removed public-site junk + deleted duplicates/backups (~29.5 MB) + archived 4 old folders to `_archive/` (recoverable); active Bittings app untouched, `_archive` deletion pending a later decision. Earlier: Start-a-job Automotive result card now shows real keyway/tool/transponder/ignition/programmer + "in your van" on one screen; NEW Materials & Services step (smart add-ons: rekey→lock, car lockout→lost key) before the invoice; Inventory van vs shop with move buttons gated by a Setup "Where do you work?" toggle (mobile/physical). Earlier: Home is now "Start a job" (tile hub removed → everything in the left sidebar / phone "More" drawer); Start-a-job Automotive VIN⇄Year/Make/Model; receipt send split into ⬇ Download + 📤 Send; added Xhorse Key Tool Max Pro to Programmers. Earlier: STARTED Bittings design system (app/ui/bittings-ui.css+js, logo SVGs, demo.html, light/dark theme toggle, sidebar/bottom-nav shell, NEW "Start a job" front door) — applied to index.html (Home) so far; other pages pending. Prior same day: Manager Dashboard (index.html view-dashboard, manager-only, real TKS/TKPay data, light "Studio" look) + WHOLE STAFF APP reskinned dark→light "Studio" (all 7 pages; public site untouched). Prior same day: Key Programmer Coverage (programmers.html, VIN/make→year → per-tool add-key/AKL/remote matrix for the 7 owned machines, platform-based, corrections loop); fixed a 06-16→06-15 date mislabel across the Lishi docs/data. Prior: Lishi & Programming Reference; public-site UI polish + Cloudflare preview; Certifications hub; /es/ mirror

> **📝 Public BLOG launched + FAQ rewrite (2026-06-19 night):** ✅ Hand-built static **blog at `/blog/`** (NOT the
> retired generator) — display name **"Notes from the Key Man"** + tagline; index with **in-page vanilla-JS search
> + clickable color-coded category filtering** (progressive enhancement, all cards static/crawlable); **6 category
> pages** (`/blog/category/{slug}/`, CollectionPage+BreadcrumbList); **seed post** `/blog/locked-out-of-car-okc/`
> with BlogPosting+Person("Sam The Key Man",credentials)+Organization+BreadcrumbList+FAQPage schema, byline, CTA
> blocks, internal links, author bio box, **real Lishi HU100R hero photo**; `search-index.json`, RSS `feed.xml`,
> sitemap + "Blog" nav site-wide; `/es/blog/` noindex BORRADOR mirror. ✅ **FAQ rewritten** — 12 Qs emergency-first
> (added How fast / How much / Insurance), **24/6** hours, FAQPage schema rebuilt word-for-word, LocalBusiness
> Mon–Sat 00:00–24:00, body links → `/pay-now/ /financing/ /warranty/`. ✅ **Fixed the recurring stale-CSS bug at
> the root:** Cloudflare **Browser Cache TTL → "Respect Existing Headers"** (was overriding `_headers` max-age=300
> with 4h) + a site-wide **`styles.css?v=N`** versioning convention; future CSS changes reach everyone in ~5 min.
> ✅ Workflow: on owner approval → promote to `--branch=main` AND delete the preview (git branch + CF preview
> deployment); 24 old previews purged. ⬜ **NEXT SESSION → the Bittings staff app (`bittings-app/`).**

> **🗂️ Repo restructure (2026-06-19):** ✅ Renamed the project folder `_live-clone/` → **`turbokeysmith-main/`**
> (cosmetic — Cloudflare deploy is direct Wrangler upload, not git-connected). ✅ Split into **`website/`**
> (`website/site/` + `website/_build/` generator + `website/_tools/`) and **`bittings-app/`** (the 7 staff pages +
> `app/` + `supabase/` + app icons + `_source/` Lishi data); shared docs at repo root. **ONE git repo + history**
> (`git mv`, 289 renames). **Public URLs unchanged** — rename-only move, 0 page-content changes; verified
> byte-identical (preview deploy = "0 files uploaded, 239 already cached"); done on a `restructure` branch →
> `restructure-preview` URL (owner mobile-checked iPhone+Android) → merged + deployed to production. **Deploy
> command now `wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`.** ⚠️ **Generator
> drift:** `website/_build/generate.mjs` no longer reproduces the live site (emoji vs the live SVG icons, from a
> post-gen `site-emoji-pass.py` + hand-edits never folded back) — **don't run it for deploys**; `website/site/` is
> the source of truth. ✅ **Generator RETIRED (2026-06-19)** — moved `website/_build/` to a **local**
> `_archive/_build-generator-RETIRED/` that was **never committed → not in this GitHub repo** so it can't be run
> by accident; the public site is now **hand-maintained static HTML in `website/site/`** (no build step, no
> generator). ✅ Repo-side there is nothing to delete — the archive is local-only (confirmed 2026-06-28).

> **🚀 LAUNCH + Spanish go-live (2026-06-19):** ✅ The **public website is LIVE at turbokeysmith.com** — DNS
> moved GoDaddy→Cloudflare (GoDaddy stays registrar), served from **Cloudflare Pages** (`turbokeysmith`, prod
> branch **`main`**); HTTPS **Full (strict)** + Always-HTTPS + **`www→apex` 301 redirect**; **Microsoft 365
> email preserved** (MX/SPF/DKIM/DMARC/autodiscover/sip kept **DNS-only**). ✅ **Spanish `/es/` PUBLISHED +
> indexable** (owner approved the translation): removed `noindex` from all **111** ES pages, dropped the 8
> BORRADOR draft banners, unblocked `/es/` in `robots.txt`, added 111 ES URLs to the sitemap (**222 total**),
> reciprocal **hreflang** on every page; 🌐 EN/ES toggle works end-to-end. ✅ **"Contact Us" site-wide** — desktop
> nav + mobile nav + footer on every EN/ES page, plus a full-width **"Contact Us Now" / "Contáctanos ahora"** hero
> button. ✅ **All WhatsApp buttons = brand green `#25D366`.** ✅ **Contact form now emails the shop** (Web3Forms →
> turbokeysmith@gmail.com; EN + ES, English subject tagged `(ES)`; local-save backup kept). The `_build/`
> generator was updated to match all of the above so a regenerate won't revert it. ✅ **File cleanup DONE (2026-06-19, owner-approved)** — see `CLEANUP_INVENTORY.md`.
> Removed from the live site: `site/files.zip` (was publicly downloadable), `site/turbo_city_seo_copy.md`,
> `site/es/GLOSSARY.md`, `site/assets/styles-LIGHT-backup.css` (redeployed). **Deleted** (~29.5 MB, not in git):
> `files - Copy/`, `_live-clone.zip`, `team file.zip`, `Bittings Design System.zip`. **Archived** (moved, not
> deleted, to `Desktop/bittings/_archive/`): `files/`, `v2andScheduler/`, `_teamfile/`, `current netlify files/`.
> Rescued 5 unique files from `files/` into `_docs_private/` first (AKS docs ×3 + welcome screenshots ×2). The
> active Bittings staff app, `_live-clone/` (name unchanged), and the unrelated `odol-market-report/` were NOT
> touched. ⬜ Later decision: whether to permanently delete `_archive/`. ⏸️ Payments still in **TEST mode** (separate track from the website launch).
> ⬜ Google Search Console: resubmit/confirm the 222-URL sitemap; ES pages index over the next days.

> **Manager Dashboard + light reskin (2026-06-15):** ✅ **Manager Dashboard** — new **📈 Dashboard** tile +
> `view-dashboard` in `index.html`, **manager-only** (`ownerHard`/`.owner-only`), **read-only**. KPI cards
> **Revenue · Jobs · Repeat customers · Avg ticket** (current month) + **Jobs this week** bars + **Jobs by type**.
> Revenue/Jobs/Avg = `TKPay.dayTransactions` (base−tax, completed) — **reconciles with Transaction History**;
> repeat% + charts = `TKS.Bookings`/`ServiceCats`. **Honest deltas only when prior-month data exists** (empty
> install → $0/—/zeros, no fabrication; 15-assertion node harness passed). CSV export. ⬜ Mobile sign-off pending.
> ✅ **Whole staff app reskinned dark→light "Studio"** to match — all 7 pages (index, bittings, scheduler, lishi,
> programmers, setup, cloud-test) via token repoint + targeted dark-color fixes + per-page accent-contrast
> override block. **Public `site/` untouched; the printed receipt preview kept as paper.** ⬜ Real-device contrast
> pass pending (Receipts = most hand-tuned).

> **Key Programmer Coverage (2026-06-15):** ✅ New **staff-app** page `programmers.html` + 🖥️ Programmers Home tile.
> Answers "which of MY key machines can do this car, and how?" VIN or make+year → a **per-tool matrix** (Add key /
> AKL / Remote · OBD or bench · needs PIN/license/tokens/module) across the tools you check as owned (your 7 by
> default: **Autel IM608 Pro 2, IM508, KM100; Xhorse VVDI Key Tool Max; SmartPro (Adv. Diagnostics); AutoProPad
> G2 (XTool); Lonsdor K518** — plus a selectable variant catalog: AutoProPad G2/Turbo/G3, Lonsdor K518/Pro/ISE,
> IM508/IM508S, Key Tool Max/Plus, via `owned`+`covkey`). **🧰 My tools = a checklist; only owned tools show in
> the Lookup.** Coverage is organized by **immobilizer platform** (~54 seed rows across the major US makes incl.
> older PK3/PATS/Sentry eras + Volvo/JLR/MINI/Genesis/Fiat/Suzuki), every row flagged
> **"verify on tool"** (vendor lists drift with firmware/region; none expose a clean export). Stores
> `tks_prog_devices` / `tks_prog_coverage` / `tks_prog_corrections`. Full add/edit/delete, CSV import/export,
> **📝 Corrections loop** so real jobs become the shop's own proven coverage. Research-backed sourcing per device
> (Autel OTOFIX, Xhorse app/blog, AD Info Quest/ADS#, XTool supportedvehicles, Lonsdor center). ⬜ Mobile sign-off
> pending. NOT on the public site. *Date note: corrected an earlier 06-16 mislabel back to the real 06-15 across
> the Lishi handoff/notes/review and `lishi.html` provenance tags.*

> **Lishi & Programming Reference (2026-06-14):** ✅ New **staff-app** page `lishi.html` + 🔑 Home tile.
> Two local stores `tks_lishi_tools` (89 — Original Lishi's actual published list, fetched from their site) + `tks_vehicle_keyways` (230, 25 makes), seeded from public
> sources (Original/Classic Lishi, CLK, UHS, LockPickWorld). VIN decode → reference card (keyway →
> recommended Lishi → in-stock vs tks_inventory → coded → ignition-pickable → programming path →
> OEM/NASTF badge). Two-way search (vehicle or keyway/tool). Inline notes per row + Corrections Log with
> .md/.csv export → Code applies → clear. Add/edit/delete, CSV import/export, dup detection. ⬜ Mobile
> sign-off pending. NOT on the public site (staff app only).

> **Social + award (2026-06-14):** ✅ Removed the localmarketingmanager Images/"Our Work" widget everywhere
> (generator). Added on-brand **social icon links** (IG, TikTok, FB, YouTube, Nextdoor, Google) in header +
> footer + in place of the old widget; schema **sameAs** now lists all 6. Added a text **award badge**
> "🏆 Best of 2026 · Ranked #1 Locksmith in Western Oklahoma — BusinessRate" beside every reviews section
> (homepage + 91 city/sub pages) + cert hub Recognition (no link/graphic). Spanish mirrored (draft). New
> `.social-icons`/`.award-badge` CSS. Single source: `SOCIAL`/`socialIcons()`/`AWARD_BADGE` in engine.mjs.

> **Certifications (2026-06-14):** ✅ Rebuilt `/certifications/` into a hub (Licenses & Credentials vs
> Professional Associations) + **6 dedicated pages** (google-verified, oklahoma-license, nastf, keyless2go,
> omla→omla.com, okbfaa→okbfaa.org), 3-part bios, "Google Verified" wording. **BusinessRate** = plain-text
> social proof (homepage reviews area + hub "Recognition"), NOT in the credentials group, no link/badge.
> Certifications added to main nav. Full Spanish `/es/` mirror, noindex/draft. 🚩 **All 6 ES credential
> pages need a fluent reviewer before publish** (extra red banner). EN cred pages live in the generator
> (`CREDS` in generate.mjs); ES in `es.mjs` (`CREDS`).

> **Spanish /es/ mirror (2026-06-14):** ✅ New `/es/financing/`, `/es/warranty/`, `/es/terms/` (print-to-PDF),
> `/es/faq/` (new, + Spanish FAQPage schema, 8 Q). Teasers on /es/ home + service pages; warranty section on
> /es/automotive. Every /es/ page's nav/footer now point Financiamiento/Garantía/FAQ at the Spanish pages.
> **/es/ stays noindex + draft + out of sitemap; toggle NOT flipped.** 🚩 **MUST human-proofread before
> publish:** `/es/warranty/` + `/es/terms/` (legal/locksmith). Also proofread: /es/financing, /es/faq,
> teasers, /es/automotive warranty section. Spanish source = `_build/es.mjs`.

> **New pages + payments/warranty (2026-06-13 late):** ✅ `/financing/` (nav+footer), `/warranty/`
> (Automotive section + homepage teaser + footer), `/terms/` (footer + print-to-PDF) — all in the
> generator. Financing teaser on homepage + 4 service pages. FAQ rewritten + 2 new Q&As (financing,
> warranty) in visible page **and** FAQPage schema (8 Q). Nav/footer now single-source across all pages.
> App: 2% surcharge confirmed **credit-card-only** and tightened so wallet-backed cards (Link/Apple/
> Google Pay) are never surcharged (`stripe-webhook` ✅ **redeployed live v3, verified**). Invoice
> signature now carries the T&C authorization line (screen + PDF). ⬜ Pending: attorney review of /terms/,
> real-device + Rich Results once deployed.

> **Public website (2026-06-13 PM):** ✅ **Finalized in the generator + regenerated.** localmarketingmanager
> Google widgets wired in — **Reviews + Photos site-wide** (homepage + all city/sub pages, lazy-loaded),
> **Local Posts homepage-only**; real on-domain photos kept on Edmond/Moore/Norman/Midwest City.
> Canonical `schema()` on every page with **aggregateRating + review REMOVED**, **hours** (Mon–Sat 24h,
> Sun 00:00–05:00) and **full 25-city areaServed** everywhere. Native `/faq/` + FAQPage kept (no LMM FAQ
> widget). **All owner-facing placeholders removed** (enforced in `_build/`). JSON-LD validated; widget
> endpoints 200. ⬜ Pending: real-device look + Google Rich Results Test once deployed.

> **Hosting (2026-06-13):** ✅ **DECIDED — Cloudflare Pages + Cloudflare DNS** (GoDaddy = registrar +
> email only). Prepped: `site/_headers`, verified `site/` deploys as-is, full **`DEPLOY_CLOUDFLARE.md`**
> runbook. ⬜ **Not deployed yet** — needs the owner's Cloudflare account + GoDaddy nameserver change
> (the email/MX verify step is the key safety gate). Staff app → later, own subdomain.

> **Latest (2026-06-13 PM):** ✅ **"Owner" relabeled to "Manager"** throughout the UI (badges, alerts,
> scheduler EN/ES, Setup) — wording only, role logic + code keys unchanged. ✅ **Per-manager PINs** —
> each manager set in Setup → Access has their own PIN; any manager's PIN unlocks manager actions; the
> old single PIN remains as an optional **shared fallback** (`TKS.auth.managerByPin`). ✅ **Two hour
> sets** — Setup now captures **🏪 Shop/storefront hours** and **🚐 Service hours** separately
> (`hours` + new `serviceHours`; overnight windows supported, e.g. Sun 12–4 AM), each day row with a
> **⧉ Copy to…** shortcut (All days / Mon–Fri / Sat–Sun) so you set one day and reuse it. All are
> **code-complete, pending mobile sign-off**. No screen displays hours to customers/staff yet (capture only).

> **Canonical doc:** `PROJECT_HANDOFF.md` is the owner-facing source of truth (the file uploaded
> to Claude Desktop). This task list defers to it — **if the two ever conflict, the handoff wins.**
>
> **How this list is ordered:** grouped into independent **tracks**, and within each track ordered
> by *what unblocks what*. The recommended cross-track order is at the bottom.

---

## TRACK A — Staff app + scheduler (the data engine)
*Everything here shares ONE data layer (`app/store.js` → `window.TKS`). Do the cloud step (A1)
first — it's what every other tile leans on.*

### A0 — Foundations already built ✅
- ✅ Shared data layer `app/store.js` (`TKS`) — Customers, Inventory, **Bookings (full CRUD)**,
  **Services catalog**, **VIN decode**, cloud swap point
- ✅ Customers tile (add/edit/delete, search, business + NASTF accounts)
- ✅ Inventory tile (CRUD, low-stock flag, supplier + reorder-qty, search) — **now searchable by
  fitment/VIN**
- ✅ Cloud adapter wired to existing Supabase project; ☁ Synced / On-this-device pill
- ✅ **Vendor quick-links** on the Home screen — American Key Supply + Key Innovations (open in a new
  tab), styled to match. The shop PC's main vendor tools, one tap away.
- 📝 **PC "can only reach these sites" lockdown is NOT an app feature.** Truly restricting the shop PC
  to the vendor sites + the app is a separate **Windows / browser setup** (managed-browser site
  allowlist or kiosk mode) — to tackle later, outside this codebase.

### A1 — Turn the cloud on  ·  ✅ DONE (confirmed end-to-end 2026-06-10)
- ✅ **SQL applied + verified:** all 4 tables exist (customers, inventory, bookings, receipts) with
  RLS = signed-in staff only; a record written as an authenticated user lands in the right
  table/columns (incl. `fitment` + lead fields). `touch_updated_at` search_path hardened.
- ✅ Staff app **and scheduler** auto-connect to the cloud when a staff session exists.
- ✅ Staff login `samer@turbokeysmith.com` confirmed, signed in, **sync verified live in the browser**
  (pill shows ☁ Synced).
- 📝 **Gotcha learned:** sign in at the SAME address the app runs on (`http://127.0.0.1:8088`), not
  the `file://` page — the browser scopes the login per-address, so a `file://` sign-in won't carry
  to the served app. (Same for `localhost` vs `127.0.0.1` — pick one.)
- ⏸️ **Leaked-password protection — deferred (optional):** it's a **Pro-plan-only** feature
  (Auth → Attack Protection), so it can't be toggled on the current plan. Lowest-severity advisory
  item; revisit only if/when you upgrade to Pro. **Cloud setup is otherwise complete.**

### A2 — Scheduler upgrades ✅ (built 2026-06-10)
- ✅ Routed the scheduler **through TKS** (was raw localStorage) — bookings + customers share one
  deduped list; **customers deduped by phone**
- ✅ **Edit a booking** — open any booking, change details/time, save back through TKS
- ✅ **Job status** — Scheduled / In Progress / Completed / Rescheduled / Canceled, **color-coded
  tags** on the day view + job list + booking detail
- ✅ **Add to Schedule** — opens the pre-filled Google Calendar link with **`turbokeysmith@gmail.com`
  invited as guest** (system of record) and saves a **local mirror** shown on our scheduler
- ✅ **Customer link + Job history** — each booking stamped with `customerId` (+ phone); a read-only
  **Job history** section under each customer (newest-first: date · service · status)
- ✅ **Archive** — a booking leaves the active board when **Completed/Canceled OR its date passes**;
  nothing deleted, it just files under the customer
- ✅ **Service category auto-derived** from the coaching tiles (no double entry on the staff side)
- ✅ **Vehicle (car jobs) REQUIRED:** VIN **or** year/make/model (not both); VIN **auto-fills** Y/M/M
  via the VIN API; **ignition type required** (push-to-start / keyed)
- ✅ **Job photo slots** on a booking — **built but dormant** (hidden until real photos exist)

### A5 — One service list shared across ALL apps (Setup = single source of truth)  ·  ✅ BUILT 2026-06-13 — ⏳ pending mobile sign-off
*The services + categories the owner picks in Setup now drive every app, instead of each app
hardcoding its own Automotive/Residential/Commercial list. The cloud "file" is Supabase
`shop_config` (one row) via `TKS.Config`; the scheduler + invoice now **read** from it.*
- ✅ **Per-category "+ Add a service" (2026-06-13)** — in Setup → Services each category has its own
  add button that adds a custom row **to that category** (was a single bottom button that always landed
  in Automotive). Logic-verified end-to-end.
- ✅ **Shared category helper in `app/store.js` (`TKS.ServiceCats`)** — canonical 7-category table with
  labels (EN/ES), scheduler short-code mapping (`automotive↔auto`, etc.), `active()` (owner's selected
  categories, fallback to the 3 core when un-configured), `invoiceActive()`, `keyForInvoice()`,
  `servicesFor(cat)`, `hasDetail(code)`. `Services.fromJob` extended so new categories
  (safe/emergency/…) keep their real `cat`. Mirrored to `site/app/store.js`. Logic-tested in node
  (unconfigured→3 core; configured→exact set; `fromJob('safe')`→`cat:'safe'`).
- ✅ **Scheduler reads it** — job-type **tiles** + **quick-form** options come from
  `ServiceCats.active()` (Safe & Vault etc. appear when selected; unselected hide). New categories book
  **"not in detail"** — the subtype + upsell steps are skipped (Car/House/Business keep full coaching +
  VIN/ignition). `subLabel` falls back to the shared category label so confirm / day view / job list /
  calendar read e.g. "Safe & vault", not "safe".
- ✅ **Scheduler scripts personalized** — greeting + closing (and the ICS PRODID) no longer hardcode
  **"Turbo Keysmith"**; `{biz}` = `Config.identity().name` (fallback "our shop"/"nuestra cerrajería") and
  `{techClause}` = the signed-in tech's first name from `Config.access().employees` (collapses when
  blank). EN + ES.
- ✅ **Invoice picker combined + category-filtered** (`bittings.html`) — the "What type of service?"
  options come from `ServiceCats.invoiceActive()`; the line picker **floats the owner's Setup services
  to the top with a ★ and the set price pre-filled**, alongside the built-in common jobs. A service's
  Labor/Materials + taxable come from a matching built-in seed by name; **custom-named** services fall to
  a keyword heuristic (parts→Materials/taxable, else Labor/non-taxable) — *verify the taxable flag on
  those until confirmed on real receipts.* The "Edit common job" admin svc dropdown also reads the
  owner's categories.
- 📝 No data migration: existing bookings (`jobType=auto/res/com`) and receipts
  (`serviceType=Automotive/…`) keep their stored values; only new categories use new values. Offline /
  un-configured shop falls back to exactly the 3 core categories everywhere.
- 📝 Plan file: `~/.claude/plans/eventual-stirring-puffin.md`. **Status = code-complete, pending mobile
  sign-off** (iPhone Safari + Android Chrome, owner + staff) per CLAUDE.md.

### A3 — Scheduler still to do
- ✅ **Force the guided flow (2026-06-10)** — the question-by-question intake is now the ONLY way to
  book. Removed the Day-view "+ Book" shortcut (Day view is view/open-only); each step must be
  answered to advance (job type, sub-type, and the upsell answer are now required too); no skipping,
  no jumping to the end.
- ✅ **Per-booking PIN bypass (2026-06-10)** — a 🔒 "Quick form (owner)" entry on Home asks for an
  owner PIN, then opens ONE plain quick-entry form (all fields, no guided steps). The next booking
  defaults back to forced guided. **Now upgraded (A4):** when the **owner** is signed in it unlocks
  with no PIN; a signed-in employee is denied; the **PIN is the fallback only when nobody is signed
  in**. PIN + owner allowlist live in `app/cloud-config.js`; `requestOwnerAccess()` is still the
  single swap point.
- ⏸️ **Google Calendar real 2-way sync** — currently deep-link + guest-invite only. Decide: real
  OAuth sync (needs Google sign-in + server) or keep the link? *(See Decisions.)*
- ⬜ Other scheduler fixes/updates (TBD — list specifics)

**Next (Track A):** mostly done. Optional polish — turn on job photos (the slots are built/dormant);
decide Google Calendar real-sync vs. keep the link; one-time copy of any local demo data to the cloud
(A4, skipped to avoid duplicates).

### A4 — Remaining data wiring  ·  ✅ DONE (2026-06-10)
- ✅ **Receipts wired through TKS** — `bittings.html` now shares the one deduped customer list and
  syncs receipts to the cloud when signed in (auto-connects like the other pages).
- ✅ **Staff-login awareness + roles** — the staff app shows **who's signed in and their role**
  (OWNER vs STAFF) with a Sign out, and a Staff Login link when signed out. Owner is set by email
  allowlist in `app/cloud-config.js` (`TKS_OWNER.OWNER_EMAILS`).
- ✅ **Owner-role unlock** — the scheduler's Quick form now unlocks instantly when the **owner** is
  signed in (no PIN); a signed-in **employee is denied**; the **PIN is the fallback only when nobody
  is signed in**. (`requestOwnerAccess` is still the single swap point.)
- 📝 This is a **soft gate** (it surfaces identity + gates owner-only actions) — it does NOT hard-block
  the app when logged out (offline/local use still works by design). A hard "must sign in to use the
  app" block can be added later if you want it.
- ⬜ Decide: copy existing local demo data up to the cloud once? (skipped to avoid duplicates)

---

## TRACK B — Payments + money tools (single-shop, Turbo Keysmith)  ·  status: ✅ BUILT in TEST mode; ⏳ pending your mobile sign-off (iPhone Safari + Android Chrome, owner + staff) + browser test + live cutover
> **📱 Mobile sign-off pending (CLAUDE.md rule):** the payment UI, the two money tiles, and the new
> parts/cost/technician capture were written mobile-first and pass a static review, but have **not been
> run on a real iPhone/Android** from here. Treat them as *code-complete, not done* until you confirm
> on both phones (steps in the relevant build reports).
**Direction (2026-06-11):** after auditing TurboStripe (your live desktop POS), payments were
**rebuilt into the portal** per audit **Option B** — Supabase **edge functions + Stripe.js**,
**single-account direct charges** (NOT Connect; Connect parked for multi-tenant). The earlier
Netlify tile is fully superseded. Full design + ops in `supabase/PAYMENTS.md`. Everything below is
**TEST mode** until live keys are swapped in.

### B1 — Charging engine ✅
- ✅ Verified spikes (stripe-node in Deno edge; server-driven Terminal from edge; **credit-only 2%
  surcharge enforceable** via manual-capture funding detection).
- ✅ Schema (`payment_transactions` / `payment_events`, integer cents, RLS, service_role grants) +
  **7 edge functions, version-controlled in `supabase/functions/`** (all deployed + ACTIVE, verified
  2026-06-13): `pay-create-intent` (invoice-id → authoritative base, idempotent), `stripe-webhook`
  (verified, source of truth, credit-only capture), `pay-status`, `pay-refund`, `pay-terminal`,
  **`pay-record`** (cash/check, no Stripe/no surcharge), and **`pay-void`** (cash/check void → refunded).
  *(Two leftover verification functions — `spike-stripe`, `spike-terminal` — are also still deployed
  live; delete them at cutover.)*
- ✅ **Rehearsal PASSED end-to-end through the live webhook** — credit $102 (2%), debit $100 (none),
  refund, idempotency, keyed client_secret; cash path recorded ($25).

### B2 — Ways to take money ✅
- ✅ **Invoice → Pay Now** in Receipts (`bittings.html`): reader (WisePOS E + test simulate) +
  typed-card Payment Element; 2% credit disclosure; failure UX.
- ✅ **New Charge** in the Payments tile (`index.html` + shared `app/pay.js`): no-invoice jobs
  (lockouts/walk-ups) — amount + service + optional customer → auto-creates a minimal receipt
  (authoritative server-side total) → same engine; files into customer history or anonymous.
- ✅ **Cash & Check** on both screens — recorded straight through, **no surcharge** (card-only).
- ✅ **Owner-gated** everywhere: owner signed in → grant; signed-in employee → deny; nobody signed
  in → PIN fallback (`TKS_OWNER.QUICK_FORM_PIN`). One swap point.
- ✅ **Quick invoice** in Receipts — owner-only one-screen shortcut (skip the chat), with an on/off
  switch + "open automatically when I'm signed in" (`TKS_OWNER.QUICK_INVOICE_*`).
- ✅ **NASTF D1 in the Quick invoice (2026-06-16) — ⏳ pending mobile sign-off.** Optional NASTF picker
  (None / Customer / Auction-Fleet / Contracting), shows only for Automotive; renders the type's audit
  fields, enforces required ones, and prints the same NASTF blocks as the chat flow.
- ✅ **Fixed: Start-a-job now shows the Lishi tool without opening the Lishi page first (2026-06-16).**
  Shared `app/lishi-seed.js` seeds `tks_lishi_tools`/`tks_vehicle_keyways` on the home screen too.
- ✅ **Fixed: washed-out buttons in the manual invoice flow (2026-06-16)** — Decode VIN / From Inventory /
  Setup-service / Custom item / Use-$last now use white text on their dark chips. ⏳ device contrast check.
- ✅ **Quick-invoice line items now have a service pick-list (2026-06-16) — ⏳ pending mobile sign-off.** Type or
  pick from your Setup services + common jobs for the chosen category; picking auto-fills price + taxable.
- ✅ **Customer invoice history + Net-30 balance owed (2026-06-16) — ⏳ pending mobile sign-off.** Each customer
  shows their invoices/receipts (PAID/UNPAID/ESTIMATE) and a "Balance owed" total; the Customers list shows a red
  "OWES $X" badge for anyone with unpaid invoices.
- ✅ **Fixed: "Add another item" on Materials & Services now category-aware (2026-06-16)** — no more Transponder/
  Remote/Smart-key under a Residential job.
- ✅ **Warranty tracking (2026-06-16) — ⏳ pending mobile sign-off.** Setup → Payments sets a standard warranty
  (default 6 months) + default-on toggle; receipts/invoices carry it (Quick invoice has a checkbox), estimates
  don't; a 🛡 pill shows days-left (green → amber ≤30d → red expired) on the receipt card + Receipts history.
- ✅ **Open a past invoice to see what was sold (2026-06-16) — ⏳ pending mobile sign-off.** Customer invoice list
  rows are tappable → read-only line-item view (what was sold + totals + warranty pill).
- ✅ **Mark invoice paid from the customer (2026-06-16) — ⏳ pending mobile sign-off.** "✓ Mark as paid" in the
  invoice view converts it to a paid receipt, clears the balance owed, and consumes stock — same as Receipts.
- ✅ **Owed (A/R) + Tax collected on the Dashboard (2026-06-16).** Tax removed from Reports (was stuck always-on)
  and moved to the dashboard alongside a new Owed (A/R) KPI.
- ✅ **Total paid per customer by period (2026-06-16).** All-time + last 30d/90d/6mo/1yr on the customer record.
- ✅ **Warranty + Terms on the receipt (2026-06-16) — ⏳ pending mobile sign-off.** "N months limited warranty"
  prints on the receipt/PDF; Terms & Conditions link is now a Setup field (blank = no T&C clause; multi-tenant).
- ✅ **Key code series + HPC card per vehicle (2026-06-17) — 196/230 vehicles, 182 with HPC card.** Start-a-Job
  card shows code series + HPC 1200 card + note + source; editable per-vehicle in Lishi. Built from owner's
  `Bittings_Key_Blank_Reference.xlsx` (2025 Ilco ref); fixed comma-chopping in its code column; aggregated all
  variant codes (regular/prox) per vehicle. Tagged Ilco 2025 / Keyline 2015. No guesses.
  ⚠️ FOR OWNER: xlsx dropped some common models (Camry/Highlander/Prius/Avalon/Accord/C-HR — partially hand-filled);
  34 vehicles still blank (Euro/OEM-only/trucks/ambiguous — see handoff); spot-check recommended. Still open:
  transponder/cloning-tool data for the Programmers page (Keyline 2015 + 2023/2025 refs have it).
- ✅ **Code series now 222/230** (2026-06-17). Owner gave keyway rules: Subaru (non-prox 32000-39999 / prox 70000 or
  90000), VW-Audi HU66=0001-8110 & HU162T=blank, BMW=none, Volvo HU56=DH0001-DH4000 / HU101=04001-09001(or 4001-9001),
  GM B106=G0000-G3631 / HU100 8-cut=Z0001-Z6314 / 10-cut=V0001-V5573, Toyota by blade (TR47/TOY43=50000-69999,
  TOY48=40000-49999, TOY40 prox=80000-89999), every CY24=M0001-M2618. SIP22 end found = DE1-DE11210. 8 blank left
  (6 VW/Audi HU162T unknown, BMW none, Mercedes C-Class HU64 pending).
- ✅ **Programmers: added Ilco/Keyline tools to the catalog (2026-06-17).** programmers.html SEED_DEVS +T-Code Pro(TCP),
  MVP Pro(MVPP), TKO (older Advanced Diagnostics, share Smart Pro coverage) + Silca RW5 / RW4 Plus / Plus Box / M-Box,
  Ilco EZ-Clone Plus (cloning machines, covkey 'clone', no per-make grid). SEEDVER 3→4 so existing installs pick them up.

### B3 — Money tools / reporting ✅ (2026-06-12)
- ✅ **Closeout** — owner-only Home tile: today's **drawer count** (collected, split card/cash/check,
  surcharge, refunds).
- ✅ **End-of-day Deposit Slip (2026-06-13) — ⏳ pending mobile sign-off.** Closeout has a
  **denomination drawer count** (bills + coins) that builds a deposit slip: **total counted**,
  **starting float**, **deposit = max(0, counted − starting float)**, and **over/short = counted −
  starting float − expected cash** (expected = the day's recorded cash sales). On-screen copyable summary
  **and** a **branded PDF** (jsPDF, receipt-style header/logo via `TKS.Config.identity`) **shared via
  `navigator.share`** (download fallback), mirroring `bittings.html`'s `shareDocument`. Integer-cents;
  **owner-gated** (`ownerHard()`); PDF degrades to copy-summary if jsPDF is unavailable offline.
- ✅ **Carryover starting float + shortfall + Settings float (2026-06-13).** The retained float carries
  to the next open: `finalizeCloseout` writes `tks_drawer_float_carry = retained` (= counted − deposit)
  on share/copy; the Closeout **starting-float input is owner-editable per day** and prefills from the
  carry, else the **Settings float** (`config.payments.drawerFloatCents`, new field in Setup → Payments,
  default $120). If counted < starting float, a **shortfall warning** shows how much cash to add to
  restore it (or continue → deposit $0, slip notes the shortfall). `settingsFloatCents`/
  `startingFloatPrefill`/`finalizeCloseout` in `index.html`; `f_float` field + gather in `setup.html`;
  `payments.drawerFloatCents` default in `store.js` (mirrored to `site/app/store.js`).
- ✅ **Deposit slip: View/Download PDF button (2026-06-13 10:58).** Added `openDepositSlip()` (opens the
  PDF in a new browser tab to view inline; download fallback if the tab is blocked) alongside Share +
  Copy — so the slip is viewable without going through email/share sheet.
- ✅ **Transaction History** — owner-only Home tile: lands on **today** (daily-reset default; nothing
  deleted, stays filed under customer). **Period** dropdown (Today/Week/Month/Quarter/Year) +
  **graph type** dropdown (bar/line/area/pie/doughnut, Chart.js). **Total Jobs / Sales / Cost /
  Profit** cards, each **toggleable** (choice persists).
- ✅ **Cost & Profit WIRED (2026-06-12 PM):** on the receipt builder (`bittings.html`) a sale can
  **pick real parts from Inventory** (searchable by name/SKU/fitment/VIN), capturing each part's stored
  **cost** behind the customer's sale price; a **manual cost box** on every line covers non-inventory /
  one-off jobs; labor/no-part lines default to **$0 cost**. The edge functions read the cost
  **server-side** from the stored receipt and fill `cost_cents`, so Transaction History's **Total Cost
  / Total Profit** show real numbers (validated: a $9.00 parts cost → `cost_cents` 900). Also **tag a
  technician** on the sale (Quick invoice field + chat default) → `technician` column populated, ready
  for the commission filter.
- ✅ **Inventory auto-decrements on a paid sale** (and **adds stock back** on a void/delete) — only on
  completed/paid sales, never drafts, guarded by a `stockApplied` flag so it can't double-apply.
  Low-stock flag is derived, so it trips automatically when stock crosses the threshold.

### B3.1 — Send receipt, technician filter, refunds ✅ (2026-06-12 PM) — ⏳ pending mobile sign-off
- ✅ **Send receipt via the device's own apps (no email service, no key, no cost).** Primary path =
  the **native Share sheet** (`navigator.share` with the **actual PDF file**) — on the Receipts/invoice
  flow it attaches the real PDF; on the Payments-tile **New Charge** it shares a **text summary** (that
  screen has no PDF engine). Plus best-effort **💬 Text** (`sms:`) and **✉️ Email** (`mailto:`)
  prefilled buttons when the customer's phone/email is on file. Surfaced on the on-screen receipt card,
  in **Pay Now** success, on saved-receipt **history rows**, and after a **New Charge**. Desktop with no
  share sheet falls back to download/print (unchanged).
- ✅ **Technician filter** in Transaction History (dropdown of whoever's tagged in the period →
  filters cards, graph, and list) — the commission view's filter half.
- ✅ **Refund / void button** per completed transaction in Transaction History: **card → `pay-refund`**
  (Stripe), **cash/check → new `pay-void`** function; both mark the row `refunded` and **return any
  parts to stock** (`reverseStockForInvoice`).

### B4 — Next steps (Payments)
- ⬜ **YOUR mobile + browser test (TEST mode), iPhone Safari + Android Chrome, owner + staff:** build an
  invoice (add a part from Inventory + qty/cost, tag a tech) → Pay Now → simulate credit/debit → type
  card `4242 4242 4242 4242`; try New Charge + cash/check; **Send receipt** (confirm what attaches on
  each phone); open Transaction History → check Cost/Profit, the **technician filter**, and a
  **refund**; confirm stock dropped then came back on refund. Confirm amounts in the Stripe **test**
  dashboard.
- ⬜ **Cutover to LIVE:** swap `sk_live_`/`pk_live_` (same secret slot), register the LIVE webhook,
  one real charge, **retire `TurboStripe.exe` + rotate the old leaked key**, and **delete the leftover
  `spike-stripe` / `spike-terminal` edge functions** (verification leftovers, still deployed).
- ⏸️ **FUTURE (do NOT build yet): thermal receipt printer** — print a real receipt to the shop's
  thermal printer instead of a PDF. Separate hardware/driver job (ESC/POS or the printer's web/USB
  bridge); revisit after go-live.
- ⏸️ Field/Bluetooth reader + Tap-to-Pay-on-phone — a later native phase.

---

## TRACK C — Public website (English)  ·  status: 🔨 built, not live
- ✅ Fresh design, Clean Trust palette; core pages (Home, Automotive, Residential, Commercial,
  Emergency, Pay Now, FAQ, Certifications)
- ✅ SEO copy + unique meta/H1 per page; schema in `<head>`
- ✅ 25-city service-area pages (~30-mi radius), grouped by proximity into 4 distance bands
- ✅ Service Areas hub, `sitemap.xml`, `robots.txt`, footer link
- ✅ Stripe Buy Button; Google review/photo/post/FAQ widgets; "¿Hablas español?" button
- ✅ **City photos — real images for the 4 original cities** (Edmond, Moore, Norman, Midwest City),
  pulled from the live turbokeysmith.com pages; the other 21 cities show **no empty boxes**
  (hidden placeholders until you take photos)
- ⬜ Replace the 4 cities' pulled images with your own better/branded photos when ready (optional)
- ⬜ Take + add photos for the other 21 cities (slots auto-appear once images exist — add to
  `_build/cities.mjs` `photos:[...]` and drop files in `site/assets/cities/`, then regenerate)
- 📝 Note: verify local landmark details on city pages before live
- ⏸️ **GO LIVE** (publish → review → domain switch) — deliberately last; protects Google ranking

**Next (Track C):** decide hosting + whether the public site and staff app share a web address;
then the careful go-live (publish → spot-check → domain switch). Photos for the other 21 cities are
optional and can trickle in after launch.

---

## TRACK D — Spanish site (`/es/`)  ·  status: 🔨 full draft built, unpublished
**Sequence (do in order): proofread → publish → rewire toggle.**
- ✅ Full 98-page `/es/` mirror (home, 25 cities + sub-pages, hub, contact, metro service pages)
- ✅ Held back safely: `noindex`, out of sitemap, blocked in `robots.txt`, visible DRAFT banner
- ✅ Glossary exists (`site/es/GLOSSARY.md` + `_build/es.mjs`)
- ✅ Spanish contact form uses the **canonical service dropdown** (Spanish display / fixed English
  value) + "Other" free-text + **ES lead marker** (see Track C/forms)
- ✅ **DECIDED — toggle = Option A:** 🌐 will navigate to the matching `/es/` page (back-to-English
  link on the `/es/` side); NOT in-place translation
- ⬜ **(1) Proofread `/es/`** — technical locksmith terms (key fob, rekey, deadbolt, transponder)
- ⬜ **(2) Publish `/es/`** — remove `noindex`, add to sitemap, unblock robots, drop DRAFT banners
- ⬜ **(3) Rewire the 🌐 toggle** to navigate EN ↔ `/es/` (only after 1 + 2)

**Next (Track D):** find a Spanish-fluent proofreader for the locksmith terms (step 1) — that's the
only real blocker; steps 2–3 are quick once the copy is trusted.

---

## TRACK E — Lead capture (public forms → Customers)  ·  status: ✅ built, cloud pending
- ✅ Contact form (EN + ES) saves leads to **Customers via TKS, deduped by phone**
- ✅ **Canonical 5-option service dropdown** on both forms: *Car lockout · Car key replacement /
  lost key · Home or business lockout · Rekey / new locks · Other (describe)* — Spanish form
  **displays Spanish but stores the fixed English value**; "Other" is the only free-text box and is
  **stored exactly as typed (never translated)**
- ✅ **"ES" marker** on any lead that came through the Spanish form (badge in the staff Customers
  list) so you know to expect Spanish on callback
- ⏸️ **Contact form → cloud** — visitors aren't signed in, so leads save locally only today; landing
  them in the cloud needs a Supabase edge function or public-insert rule *(See Decisions.)*
- ⏸️ **Lead notifications** — email/SMS alert when a lead arrives (email = free to start)

**Next (Track E):** pick the cloud-write path for public leads (Supabase **edge function** is the
clean answer — same pattern as payments) so website leads land in the cloud, then add an email alert
on a new lead. Both are small once chosen.

---

## TRACK F — Sellable multi-tenant version  ·  status: ⏸️ PARKED (deliberate)
The dashboard as a **product sold to other locksmiths** (each buyer their own Stripe/data/logins,
nothing hardcoded). Parked on purpose while we finish the single-shop build. When resumed, it's a
foundation change (orgs + memberships + `org_id` + per-org RLS; Stripe **Connect** recommended over
collecting buyers' secret keys; payments on **Supabase edge functions**). Full plan captured in chat
2026-06-11; see also the memory note. Do NOT build on single-shop assumptions that block this later.

**Next (Track F):** stays parked until the single-shop build is live and proven. When resumed, start
with orgs + memberships + `org_id` + per-org RLS, then Stripe **Connect** — the payment service layer
already carries optional `orgId`/`connectedAccountId` so it's a clean add-on, not a rewrite.

---

## TRACK G — Roles, Security & Accountability (Phase 1)  ·  status: ✅ CODE-COMPLETE + server-proven; ⏳ pending owner mobile/visual sign-off
*Turns the app's cosmetic roles into a real, database-enforced permission + accountability system
(separation of duties). Branch `phase1-roles-security` (not merged to main); DB migrations + edge
functions are LIVE on Supabase. Living detail: `PHASE1_PROGRESS.md`; plain-language: `PROJECT_HANDOFF.md`.*

### G1 — Roles, RLS & audit foundation ✅ (server-verified with test users)
- ✅ Real `staff` table (owner / manager / front-desk / technician); first account = owner; no-staff = no access.
- ✅ Every table's RLS rewritten to the role matrix; append-only `audit_log`; hashed PINs.
- ✅ All 6 payment edge functions require authenticated staff (refund/void manager+; record/intent/terminal/status any staff). Deployed + smoke-tested (anon → 401).

### G2 — Fleet + per-location inventory ✅ (DB proven + screens built)
- ✅ `vans` table; stock lives per **location** (shop + each van) and **stays with the van**; role-checked RPCs (move = tech+, receive = front-desk+, adjust/write-off = manager+); `inventory.qty` kept as synced total.
- ✅ **`fleet.html`** (manager+ van management; owner-only delete + home-van assignment) + per-part **📍 stock-by-location** panel (move/receive/adjust) in Inventory.

### G3 — Jobs + accountability ✅ (DB proven + screens built)
- ✅ Booking **status** state-machine (front-desk can't change; tech own-jobs only; managers any); completion blocked until parts reconciled; **cancel needs a reason**; **returning a cut key needs a photo**; guard trigger blocks direct status edits.
- ✅ Scheduler **job accountability panel**: lead assignment, parts checklist (used/returned + cut-key camera proof), "part not on the tech's van" flag + one-tap guided move, cancel-with-reason.

### G4 — Field-level money + UI gating ✅
- ✅ Cost/margin physically hidden from techs & front-desk in **both** inventory (`inventory_safe`) and receipts (`receipts_safe`).
- ✅ Robust client-side gating (`data-cap` → hidden, fail-closed, MutationObserver re-gate); honest deletes (blocked rows reappear); shared centered confirm modal; role chip on every page; manager soft-delete for customers.

### G5 — This session's field-test refinements ✅
- ✅ **Decisions applied:** take-payment = all staff; YMM dropdowns stay on the Phase-1 branch.
- ✅ **New Charge tied to the customer DB** (select existing / add new; required for card+check, optional for cash).
- ✅ **Vendor-tool gating:** Keycodes = owner/manager/tech; Vendors + NASTF = manager/owner; front-desk none.
- ✅ **Pop-ups centered + theme-matched; dark-mode text fixed** (main-page toggle now themes + persists; native time/date icons visible via `color-scheme`).
- ✅ **Scheduler:** technician self-scope (sees only own jobs, can't edit, status-only); **technician dropdown from the cloud staff roster** (shows roles, matches by stable ID); **Street/City/State/ZIP** address feeding the one-tap calendar; **cancel/reschedule require a note + equipment-unused / manager-sign-off warning** (note optional for owner); coaching prompts aligned to each step.

### G6 — Phase-1-adjacent items still OPEN (decide / build next)
- ⬜ **Manager "sign-off / approve & restore stock" screen** — a tech's cancel/reschedule is *flagged* for sign-off, but there's no screen yet where a manager reviews it, confirms equipment is unused, and releases the hold. *(Natural fit with Phase 2 reconciliation.)*
- ⬜ **Add the real team** to staff/Settings (only owner + one test technician exist) so the tech dropdown + self-scoping reflect actual people.
- ⏳ **Owner mobile/visual sign-off** — role-by-role checklist batched at the bottom of `PHASE1_PROGRESS.md`.
- ⬜ Final docs polish; decide whether to merge `phase1-roles-security` → main at packaging.

### ✅ PHASE 2 — Commission engine + **POS / Cash-Register screen** — BUILT (2026-06-22), server-proven, pending owner's numbers + phone sign-off
Branch `phase2-pos-commission`; DB live. Full detail/checklist in `PHASE2_PROGRESS.md`; plain-language in `PROJECT_HANDOFF.md`.
- ✅ **2a POS register** replaces the type-in-amount charge box: ticket of parts (inventory **sell price**) + services (manager price list), auto subtotal/tax/total, per-location **stock decrement on sale**, **server-enforced** pricing/discount (techs can't tamper), charges via the existing Stripe/cash flow → customer.
- ✅ **2b configurable commission** (fill-in-the-blank, not hardcoded): Setup → Commission rules (pays-on/structure/%/daily-min/exclude-parts/earned-when/hold); computed **server-side** from paid, tagged sales. Owner's model wired; tiered/per-job selectable-but-stubbed.
- ✅ **2c per-tech ledger** (Commission tile): tech sees own; manager sees all + filter; shows commission, base, daily-min, holds.
- ✅ **2d manager sign-off** (the G6 item): "Awaiting sign-off" list + confirm-unused-&-release clears the equipment **and** commission hold (audited, manager-only).
- ⬜ **Owner:** enter part sell prices, services + prices, commission % + daily-min, tax rate (seeded blank); real-device sweep; confirm the flagged modeling choices.

### 🔮 PHASE 3 (captured, NOT started) — Serialized inventory + barcode scan
- Per-unit IDs, batch/age, bad-batch recall, serial-level proof-of-return; the **SKU/barcode-scan** add-to-ticket part of the POS, with the **go-live scanner hardware** (+ thermal printer + cash drawer).

---

## ADDITIONAL — things we'll likely need (my suggestions, not yet requested)
*Forward-looking items that fall out of what we've built. None are started; flagged so Desktop can
prioritize.*

**Money / books**
- ✅ **Receipt delivery (2026-06-12)** — send via the device's own apps (native Share sheet attaches
  the PDF; best-effort Text/Email prefill), no email service. *(Pending mobile sign-off.)* The
  **thermal-printer** print path is a separate future task (flagged under Track B4).
- ⬜ **Daily email summary** — auto-email you the Closeout totals at end of day (Supabase scheduled
  function). Saves opening the app to reconcile.
- ✅ **Sales tax (2026-06-12)** — configurable rate + per-category taxable toggles (cloud-synced owner
  config), separately-stated labor excluded (OK rule), server-authoritative recompute, per-receipt
  override, pass-through (excluded from Sales/Profit; shown separately). *(Pending mobile sign-off.)*
- ⬜ **Tips** — if you want to allow tips on card, add it before live (affects surcharge base).
- ✅ **Refund/void button** in Transaction History (2026-06-12) — card via `pay-refund`, cash/check via
  `pay-void`, returns parts to stock. *(Pending mobile sign-off.)*

**Trust / safety**
- ⬜ **Data backup/export** — a one-tap "export everything to CSV/JSON" and/or scheduled Supabase
  backups, so a year of customers/receipts/transactions is never trapped in one place.
- ⬜ **Audit trail** — every charge already stamps `created_by`; surface a simple "who did what"
  view if multiple staff start taking money.
- ⬜ **Key rotation hygiene** — the old leaked `sk_live` in `TurboStripe.exe` must be **rotated at
  cutover** (already noted in B4; repeating because it's security-critical).

**Ops / reliability**
- ⬜ **Error visibility** — a lightweight way to see edge-function failures (Supabase logs are there;
  a tiny "something went wrong" surfacing in the app would help non-developers).
- ⬜ **Offline behavior** — the app already falls back to localStorage; document/QA what happens to a
  charge attempted with no internet (Stripe needs the network; cash/check should still record once
  back online).
- ⬜ **Real device test** — run the WisePOS E reader and a phone (typed-card) end-to-end before live,
  not just the simulator.

**Multi-tech (when you hire)**
- ⬜ **Technician accounts + attribution** — the `technician` column + commission filter are plumbed;
  the remaining work is letting staff sign in as themselves and tagging each sale to a tech.

## CROSS-PROJECT DECISIONS STILL OPEN
1. ✅ **Profit/cost model — DECIDED & BUILT (2026-06-12):** both ways — pick the inventory part(s) on
   the receipt (auto-pulls cost) **and** a manual per-line cost box for non-inventory/one-off lines;
   labor defaults to $0. Cost rides on the line behind the sale price; the edge functions read it
   server-side. Total Cost/Profit now show real numbers; technician tagging is in (commission filter
   UI still to come).
2. ⏸️ **Payments go-live timing** — when to swap to live keys, do one real charge, and retire
   `TurboStripe.exe` (+ rotate the old key). (Track B4)
3. ✅ **Sales tax — DECIDED & BUILT (2026-06-12):** configurable rate + per-category toggles, OK
   separately-stated-labor exclusion, server-authoritative, per-receipt override, pass-through.
4. ⏸️ **Receipt delivery** — email/text/PDF a receipt to the customer after a charge? (Additional)
5. ⏸️ **Lead notifications** — email or text on a new lead? (Track E)
6. ⏸️ **Contact form → cloud** — edge function vs public-insert rule (Track E)
7. ⏸️ **Google Calendar** — real 2-way sync vs the current deep-link + guest invite (Track A3)
8. ⏸️ **Domain go-live** — the careful, sequenced switch (Track C)
9. ✅ Supabase security hardening — `search_path` pinned on `touch_updated_at`. Leaked-password
   protection is **Pro-plan-only**, so it's deferred/optional (revisit if you upgrade).

---

## RECOMMENDED CROSS-TRACK ORDER (my read — your call)
*Update 2026-06-22: **Track G (Phase 1 — Roles/Security/Accountability) is code-complete + in field-testing.** The
clear next build is **Phase 2 (POS / cash-register ticket + commission engine)**, which also absorbs the open
manager sign-off/reconciliation screen (G6). Smaller near-term: add the real team to staff (G6), finish the owner's
mobile sign-off, and the long-standing payments live cutover (B4). The older order below still holds for the website/Spanish/leads tracks.*

*Tracks A (data engine) and the payments **build** are done. What's left, in the order I'd do it:*
1. **Test payments in the browser** (Track B4) — TEST-mode rehearsal of Pay Now, New Charge,
   cash/check, Closeout, Transaction History. Cheap, no risk, confirms it all works for you.
2. ✅ **Cost & Profit + inventory decrement + technician tagging — DONE (2026-06-12).** The
   reporting tiles now show real Cost/Profit; a sale consumes stock; technician is captured. Remaining
   slivers: a technician *filter* + a refund/void *button* (both small).
3. **Payments go-live** (Track B4) — swap live keys, one real charge, retire `TurboStripe.exe`,
   **rotate the old key.** Do after the browser test (#1), when you're confident.
4. **Receipt delivery + daily summary** (Additional) — small wins that make the money tools feel
   complete.
5. **Track E — public leads to the cloud + lead alerts** (edge function) — independent; can run any
   time.
6. **Track D — Spanish** proofread → publish → rewire toggle (independent; needs a proofreader).
7. **Track C — go-live** last, the careful domain switch.
8. **Track F — multi-tenant** stays parked until the single-shop shop is humming.
