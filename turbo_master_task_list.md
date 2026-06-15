# Turbo Keysmith — Master Task List
*One place to see every project, what's done, what's left, and where we are.
Keep this updated after each work session. Status key: ✅ done · 🔨 in progress ·
⏸️ parked (waiting on a decision/credential) · ⬜ not started.*

Last updated: 2026-06-14 23:55 CDT (Claude Code) — NEW staff tool: Lishi & Programming Reference (lishi.html, VIN-fed, pre-populated, corrections loop); public-site UI polish + Cloudflare preview; Certifications hub; /es/ mirror

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
