# Turbo Keysmith — Master Task List
*One place to see every project, what's done, what's left, and where we are.
Keep this updated after each work session. Status key: ✅ done · 🔨 in progress ·
⏸️ parked (waiting on a decision/credential) · ⬜ not started.*

Last updated: 2026-06-10 (Claude Code)

> **Canonical doc:** `PROJECT_HANDOFF.md` is the owner-facing source of truth (the file uploaded
> to Claude Desktop). This task list defers to it — **if the two ever conflict, the handoff wins.**

---

## PROJECT 1 — Public Website  ·  status: 🔨 built, not live
**Where we are:** 25-city site built on `app-structure` branch, fresh design, SEO copy,
conversion features. Done enough to set down. NOT published.

- ✅ Replica/fresh design, Clean Trust palette (white / `#C8102E` red / `#FFB200` amber)
- ✅ Core pages: Home, Automotive, Residential, Commercial, Emergency, Pay Now, FAQ, Certifications
- ✅ SEO copy + unique meta titles/descriptions per page; schema in `<head>`
- ✅ Conversion features: sticky tap-to-call, trust strip, service cards, how-it-works, before/after slots, mobile sticky call/text/WhatsApp bar
- ✅ 25-city service-area pages (trimmed to ~30-mi radius, Blanchard = edge)
- ✅ Service Areas hub, sitemap.xml, robots.txt, footer link
- ✅ Stripe Buy Button on Pay Now; 4 Google review/photo/post/FAQ widgets
- ✅ "¿Hablas español?" text/WhatsApp button
- ✅ 25 keepers re-sorted by proximity into clean groups (hub shows 4 distance bands, closest→farthest)
- ⏸️ **GO LIVE** (publish to GitHub Pages → review → domain switch) — deliberately last; protects Google ranking
- 📝 Note: verify local landmark details on city pages before live; fill real photo slots

## PROJECT 2 — Spanish Site (/es/)  ·  status: 🔨 full draft built, unpublished
**Where we are:** Complete 98-page `/es/` mirror built as an unpublished DRAFT. Awaiting a terms-only proofread, then publish.

- ✅ `/es/` framework + hreflang + language toggle (EN ↔ ES)
- ✅ Full machine-translated page bodies — all 98 `/es/` pages built (home, 25 cities + sub-pages, hub, contact, metro service pages)
- ✅ Held back safely: every page `noindex`, excluded from sitemap, blocked in `robots.txt`, visible "BORRADOR — DRAFT" banner
- ✅ Glossary already exists (`site/es/GLOSSARY.md` + `_build/es.mjs`) — fix a term once, re-run `node _build/generate.mjs`
- ✅ **DECIDED — language toggle = Option A:** the 🌐 button will **navigate to the matching `/es/`
  page** (full Spanish page), with a **back-to-English link on the `/es/` side**. NOT in-place
  translation. (Today the toggle only swaps chrome on the English page; the `/es/` pages exist but
  are unreachable from it.)
- ⬜ **Prerequisite (must come first):** proofread `/es/` — especially technical locksmith terms
  (key fob, rekey, deadbolt, transponder) against the glossary
- ⬜ **Prerequisite (must come first):** publish `/es/` — remove `noindex`, add to `sitemap.xml`,
  unblock in `robots.txt`, drop the DRAFT banners
- ⬜ **Then** rewire the 🌐 toggle to navigate EN ↔ `/es/` (only after the two steps above — do NOT
  point the button at unpublished/unproofread pages)
- 📝 Sequence: **proofread → publish → rewire toggle.** Queued, not built yet.
- 📝 Note: hire confirmed "good enough" — still worth a terms-only pass before live

## PROJECT 3 — Staff App  ·  status: 🔨 in progress
**Where we are:** Five tiles built, shared customer list, cloud wired (auto-syncs when signed in).

- ✅ Shared data layer (`app/store.js`) with cloud swap point
- ✅ Customers tile (add/edit/delete, search, business + NASTF accounts)
- ✅ Inventory tile (CRUD, low-stock flag, supplier + reorder-qty, search)
- ✅ Cloud wired to existing Supabase project; ☁ Synced / On-this-device pill
- 🔨 **Scheduler** — day view built; needs updating (see Project 5)
- ⏸️ **Payments tile** — UI shell only; needs real processing (see Project 4)
- ⬜ Wire **Scheduler + Receipts** to the cloud (still read customers from localStorage — lists can diverge)
- ⬜ Run `supabase/app_tables_setup.sql` + sign in to confirm syncing end-to-end (YOUR 2 steps)
- ⬜ Staff login (`cloud-test.html`) doesn't gate the app yet — wire auth
- ⬜ Decide: copy existing local demo data up to cloud once? (skipped to avoid duplicates)

## PROJECT 4 — Payments (Stripe + BBPOS WisePOS E)  ·  status: ⏸️ parked / next up
**Where we are:** Separate payment app exists (Netlify functions for terminal/WisePOS); not deployed. Tile is a shell.

- ✅ Stripe Buy Button (public site Pay Now)
- ⬜ Deploy the separate payment app (Netlify) with keys in env (NOT in code)
- ⬜ Wire the staff Payments tile to real charging via the BBPOS WisePOS E reader
- ⬜ Confirm Stripe is the processor; locate/deploy the payment app URL
- 📝 Note: secret (sk_) keys go in server/env only; surcharge 2%; this runs on the shop PC

## PROJECT 5 — Scheduler upgrade  ·  status: 🔨 needs work
**Where we are:** Day view + guided new-employee intake flow exist. Needs updating + fixes.

- ✅ Day view (hour grid, tap slot to book)
- ✅ Guided phone-intake/booking flow for new hire (this IS the new-hire coaching app — intake, customer interaction, upselling)
- ⬜ **Force the guided flow** — make the guided intake the ONLY way to book (today it's optional; you can also book straight from Day view, which skips coaching)
- ⬜ **Per-booking PIN bypass** — let an owner/admin enter a PIN to skip the forced flow for a single booking (experienced staff / quick entry)
- ⏸️ Google Calendar — currently a "NOT CONNECTED" placeholder (deep links only). Decide: real 2-way sync (needs Google OAuth + server) or keep deep links?
- ⬜ Other scheduler fixes/updates (TBD — list the specific fixes you want)
- 📝 Note: goal is killing double-bookings; coach new hire on intake + upselling

## PROJECT 6 — Other builds  ·  status: ✅ closed out
- ❌ **Android call-screening app** — SCRAPPED (2026-06-10). Was a separate Kotlin deliverable, never part of this web repo. Removed.
- ✅ **Guided scheduler/coaching app** for the new hire — this is the guided intake flow in the scheduler (see Project 5), already built.

---

## CROSS-PROJECT DECISIONS STILL OPEN
1. ⏸️ **Lead notifications** — when the contact form gets a lead, alert you by email or text? (email = free to start)
2. ⏸️ **Contact form → cloud** — needs a Supabase edge function so website leads (from non-signed-in visitors) reach the cloud
3. ⏸️ **Google Calendar** — real sync vs deep links (Project 5)
4. ⏸️ **Domain go-live** — the careful, sequenced switch (Project 1)
5. ⬜ Minor Supabase security hardening (search_path on a function; leaked-password protection)

---

## SUGGESTED NEXT ORDER (my read — your call)
1. **Confirm staff-app cloud syncing works** (run the SQL, sign in, add a test record) — everything leans on this
2. **Wire Scheduler + Receipts to the cloud** so all tiles share one list
3. **Payments** — deploy the payment app + wire the WisePOS reader (Project 4)
4. **Scheduler fixes** (Project 5) — once you list the specific updates
5. Then circle back to **go-live** (Project 1) when you're ready for the careful domain switch
