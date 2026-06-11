# Turbo Keysmith — Master Task List
*One place to see every project, what's done, what's left, and where we are.
Keep this updated after each work session. Status key: ✅ done · 🔨 in progress ·
⏸️ parked (waiting on a decision/credential) · ⬜ not started.*

Last updated: 2026-06-10 (Claude Code)

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

## TRACK B — Payments (single-shop, Turbo Keysmith)  ·  status: 🔨 built, awaiting your config + deploy
**Scope:** single-shop for now. The sellable multi-tenant version is **parked** (see Track F).
- ✅ Stripe Buy Button (public site Pay Now)
- ✅ **Payment Setup screen** in the staff app (Payments → ⚙ Payment setup): you enter the Netlify
  URL, WisePOS reader ID (tmr_), publishable key (pk_), currency, and 2% surcharge — saved app-side,
  **nothing hardcoded**. The **secret key is never entered in the app** (instructions point you to
  paste it into Netlify env only).
- ✅ **Payments tile wired** to the existing Netlify app: card-present via the **WisePOS E**
  (terminal-charge → poll status; **Simulate-tap** button in test mode) and **typed-card** (field)
  via Stripe's hosted card field. TEST/LIVE banner + surcharge breakdown.
- ✅ **Backend functions updated** (CORS + read reader/currency from the request) in the separate
  payments repo — **must be redeployed** for the staff app to reach them.
- ⬜ **YOUR steps:** (1) deploy the updated payment app to Netlify; (2) set `STRIPE_SECRET_KEY`
  (sk_test_…) in Netlify env (+ optional `ALLOWED_ORIGIN`); (3) enter the Netlify URL + pk_test_ +
  reader (tmr_ or a simulated reader) + 2% in the Setup screen; (4) rehearse with test cards.
- ⏸️ Go LIVE (swap to live keys) — only after test-mode rehearsal succeeds.
- 📝 Secret (sk_) lives in Netlify env only; field/Bluetooth reader + Tap-to-Pay are a later native phase.

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

---

## TRACK F — Sellable multi-tenant version  ·  status: ⏸️ PARKED (deliberate)
The dashboard as a **product sold to other locksmiths** (each buyer their own Stripe/data/logins,
nothing hardcoded). Parked on purpose while we finish the single-shop build. When resumed, it's a
foundation change (orgs + memberships + `org_id` + per-org RLS; Stripe **Connect** recommended over
collecting buyers' secret keys; payments on **Supabase edge functions**). Full plan captured in chat
2026-06-11; see also the memory note. Do NOT build on single-shop assumptions that block this later.

## CROSS-PROJECT DECISIONS STILL OPEN
1. ⏸️ **Lead notifications** — email or text on a new lead? (Track E)
2. ⏸️ **Contact form → cloud** — edge function vs public-insert rule (Track E)
3. ⏸️ **Google Calendar** — real 2-way sync vs the current deep-link + guest invite (Track A3)
4. ⏸️ **Domain go-live** — the careful, sequenced switch (Track C)
5. ✅ Supabase security hardening — `search_path` pinned on `touch_updated_at`. Leaked-password
   protection is **Pro-plan-only**, so it's deferred/optional (revisit if you upgrade).

---

## RECOMMENDED CROSS-TRACK ORDER (my read — your call)
1. **A1 — turn the cloud on** (run the SQL, sign in, add a test record). Everything data-related
   leans on this, and the scheduler + forms now sync through it.
2. **A3 — finish the scheduler** (force guided flow + PIN bypass) while it's fresh — small and
   self-contained.
3. **A4 — wire Receipts + staff-login gating** so every tile shares one cloud list behind auth.
4. **Track B — Payments** (deploy the payment app + WisePOS reader).
5. **Track D — Spanish** proofread → publish → rewire toggle (independent; can run in parallel).
6. **Track C — go-live** last, when you're ready for the careful domain switch.
