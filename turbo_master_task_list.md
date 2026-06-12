# Turbo Keysmith — Master Task List
*One place to see every project, what's done, what's left, and where we are.
Keep this updated after each work session. Status key: ✅ done · 🔨 in progress ·
⏸️ parked (waiting on a decision/credential) · ⬜ not started.*

Last updated: 2026-06-12 (Claude Code)

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

## TRACK B — Payments + money tools (single-shop, Turbo Keysmith)  ·  status: ✅ BUILT in TEST mode; awaiting your browser test + live cutover
**Direction (2026-06-11):** after auditing TurboStripe (your live desktop POS), payments were
**rebuilt into the portal** per audit **Option B** — Supabase **edge functions + Stripe.js**,
**single-account direct charges** (NOT Connect; Connect parked for multi-tenant). The earlier
Netlify tile is fully superseded. Full design + ops in `supabase/PAYMENTS.md`. Everything below is
**TEST mode** until live keys are swapped in.

### B1 — Charging engine ✅
- ✅ Verified spikes (stripe-node in Deno edge; server-driven Terminal from edge; **credit-only 2%
  surcharge enforceable** via manual-capture funding detection).
- ✅ Schema (`payment_transactions` / `payment_events`, integer cents, RLS, service_role grants) +
  **6 edge functions, version-controlled in `supabase/functions/`**: `pay-create-intent` (invoice-id
  → authoritative base, idempotent), `stripe-webhook` (verified, source of truth, credit-only
  capture), `pay-status`, `pay-refund`, `pay-terminal`, **`pay-record`** (cash/check, no Stripe/no
  surcharge).
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
- ✅ **Transaction History** — owner-only Home tile: lands on **today** (daily-reset default; nothing
  deleted, stays filed under customer). **Period** dropdown (Today/Week/Month/Quarter/Year) +
  **graph type** dropdown (bar/line/area/pie/doughnut, Chart.js). **Total Jobs / Sales / Cost /
  Profit** cards, each **toggleable** (choice persists).
- ✅ **Profit + per-technician commission — plumbed, not yet wired:** `payment_transactions` gained
  `cost_cents` (profit = captured − cost) + `technician` (indexed); `inventory.cost` already stored.
  Today Cost = $0 / Profit = Sales until a sale carries a part-cost / tech.

### B4 — Next steps (Payments)
- ⬜ **YOUR browser test (TEST mode):** sign in → build an invoice → Pay Now → simulate credit/debit
  → type card `4242 4242 4242 4242`; try a New Charge + a cash/check; open Closeout + Transaction
  History. Confirm amounts in the Stripe **test** dashboard.
- ⬜ **Wire Cost & Profit** (the big one): let a receipt/charge **pick the inventory part(s) used**
  (pulls `inventory.cost` → sets `cost_cents`) and **tag a technician**; then Cost/Profit/commission
  light up. *(Decision: parts-on-receipt vs. a quick cost box — see Decisions.)*
- ⬜ **Auto-decrement inventory on sale** once parts are linked (sale reduces stock → low-stock flags
  stay honest). Natural companion to the Cost/Profit wiring.
- ⬜ **Refund / void from the Transaction History tile** (today `pay-refund` exists but has no button
  in the UI — only reachable by the engine).
- ⬜ **Cutover to LIVE:** swap `sk_live_`/`pk_live_` (same secret slot), register the LIVE webhook,
  one real charge, **retire `TurboStripe.exe` + rotate the old leaked key.**
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
- ⬜ **Receipt delivery** — email/text the customer their receipt after a charge (and a PDF/print).
  Right now a receipt exists in the system but isn't sent to the customer.
- ⬜ **Daily email summary** — auto-email you the Closeout totals at end of day (Supabase scheduled
  function). Saves opening the app to reconcile.
- ⬜ **Sales tax** — if any items are taxable, decide tax handling now (the receipt has a `tax` slot
  but it's $0). Oklahoma rules; affects Profit math.
- ⬜ **Tips** — if you want to allow tips on card, add it before live (affects surcharge base).
- ⬜ **Refund/void button** in the UI (engine already supports it — see B4).

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
1. ⏸️ **Profit/cost model** — how does a part's cost attach to a sale? **(a)** pick the inventory
   part(s) used on the receipt (auto-pulls cost) or **(b)** a quick "cost" box per charge. Drives
   whether Total Cost/Profit + commission show real numbers. *(Track B4. You picked "revenue only
   for now" — this is the decision that turns it on.)*
2. ⏸️ **Payments go-live timing** — when to swap to live keys, do one real charge, and retire
   `TurboStripe.exe` (+ rotate the old key). (Track B4)
3. ⏸️ **Sales tax** — taxable items? Decide before live; affects the receipt + Profit. (Additional)
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
2. **Decide the profit/cost model** (Decision 1) → **wire Cost & Profit** (parts-on-receipt + tech),
   then auto-decrement inventory on a sale. This is the highest-value next build — it turns the new
   reporting tiles into real profit/commission numbers.
3. **Payments go-live** (Track B4) — swap live keys, one real charge, retire `TurboStripe.exe`,
   **rotate the old key.** Do after #1, when you're confident.
4. **Receipt delivery + daily summary** (Additional) — small wins that make the money tools feel
   complete.
5. **Track E — public leads to the cloud + lead alerts** (edge function) — independent; can run any
   time.
6. **Track D — Spanish** proofread → publish → rewire toggle (independent; needs a proofreader).
7. **Track C — go-live** last, the careful domain switch.
8. **Track F — multi-tenant** stays parked until the single-shop shop is humming.
