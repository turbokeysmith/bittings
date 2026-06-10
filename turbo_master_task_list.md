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

### A1 — Turn the cloud on (YOUR 2 steps — unblocks the rest of Track A)
- ⬜ Run `supabase/app_tables_setup.sql` in the Supabase project
- ⬜ Sign in via `cloud-test.html` and add a test record to confirm end-to-end sync
- 📝 The scheduler + contact form now write **through TKS**, so once this works, bookings and
  website leads sync too (not just Customers/Inventory).

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
- ⬜ **Force the guided flow** — make the guided intake the ONLY way to book (today you can also
  book straight from Day view, which skips coaching)
- ⬜ **Per-booking PIN bypass** — owner/admin PIN to skip the forced flow for one booking
- ⏸️ **Google Calendar real 2-way sync** — currently deep-link + guest-invite only. Decide: real
  OAuth sync (needs Google sign-in + server) or keep the link? *(See Decisions.)*
- ⬜ Other scheduler fixes/updates (TBD — list specifics)

### A4 — Remaining data wiring
- ⬜ Wire **Receipts** (`bittings.html`) through TKS too (still reads localStorage directly)
- ⬜ **Staff login gating** — `cloud-test.html` auth doesn't yet gate the app
- ⬜ Decide: copy existing local demo data up to the cloud once? (skipped to avoid duplicates)

---

## TRACK B — Payments  ·  status: ⏸️ parked / next up after Track A
- ✅ Stripe Buy Button (public site Pay Now)
- ⬜ Deploy the separate payment app (Netlify) with keys in env (NOT in code)
- ⬜ Wire the staff Payments tile to real charging via the BBPOS WisePOS E reader
- ⬜ Confirm Stripe is the processor; locate/deploy the payment app URL
- 📝 Note: secret (sk_) keys go in server/env only; surcharge 2%; this runs on the shop PC

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

## CROSS-PROJECT DECISIONS STILL OPEN
1. ⏸️ **Lead notifications** — email or text on a new lead? (Track E)
2. ⏸️ **Contact form → cloud** — edge function vs public-insert rule (Track E)
3. ⏸️ **Google Calendar** — real 2-way sync vs the current deep-link + guest invite (Track A3)
4. ⏸️ **Domain go-live** — the careful, sequenced switch (Track C)
5. ⬜ Minor Supabase security hardening (search_path on a function; leaked-password protection)

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
