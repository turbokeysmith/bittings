# Phase 3 — Front-End Unification + Native Scheduler (authoritative tracker)

**Source of truth for the front-end unification build.** Branch: `phase3-frontend-unification`
(off `phase2-pos-commission`, not merged to main). Created 2026-06-26.

## The goal (plain version)
The backend is proven and valuable. The front-end is *inconsistent* because the staff app glues
separate pages together with **iframes** — each embedded page carries its own chrome/CSS, so the
app looks and behaves like several apps stitched together (plus cache quirks). Phase 3 gives the
**same proven engine a new, single body**: one design system, one nav, **no iframe seams**, every
screen reading/writing the **same Supabase backend** — and replaces the Google-Calendar-based
scheduler with a **native in-app calendar**.

## Hard rules (do not break)
- **KEEP UNTOUCHED:** the Supabase backend and all of it — tables, RLS/role matrix, audit log,
  edge functions, POS `pos_checkout`/stock, commission engine, job state machine, reconciliation,
  NASTF/D1, cost-masking views, and the locksmith intelligence (VIN→Lishi→programmer→key-blank).
  We are giving the engine a new body, **not rebuilding the engine**.
- **REBUILD ONLY:** the front-end shell/UI (unified design system, no iframes) + the native scheduler.
- **The live/proven app stays the fallback the entire time.** `bittings-app/` is frozen; all work
  happens in the clone `bittings-unified/`. Cut over only when the new app passes a full sweep.
- **The investor demo (`START-DEMO.html` in `bittings-app/`) stays intact** — don't disturb it.
- Server = enforcement; UI only mirrors it. Build in sub-stages; keep this tracker current.

## Status legend: ✅ Done · 🔨 In progress · ⬜ Not started · 🚩 Decision/assumption flagged

---

## THE CLONE (Stage 0) ✅
- ✅ Branch `phase3-frontend-unification` created off `phase2-pos-commission` (latest proven state).
- ✅ Clone folder **`bittings-unified/`** created from `bittings-app/` (full source: all 7 tool pages,
  `app/`, `supabase/`, assets). Demo + desktop-shortcut tooling excluded (canonical copies stay in
  `bittings-app/`). `bittings-app/` is the untouched fallback.
- 🚩 **Decision (reversible):** the "clone" is a **second folder** (`bittings-unified/`) rather than a
  branch-only copy, so the old and new apps can be **run side-by-side** during cutover and the owner
  always has a working fallback to open. Cost: ~3 MB duplicated source on this branch until cutover.

---

## CURRENT ARCHITECTURE (what we're unifying) — verified 2026-06-26

The shell is **`index.html`** (sidebar `nav.bt-nav` + mobile `nav.bt-bottomnav`). `<main>` holds an
`<iframe id="btEmbed">` AND a native `.bt-pagewrap`. Nav buttons are one of two kinds:

| Screen | Nav attr | How it renders today | Unify action |
|---|---|---|---|
| Register (POS) | `data-go="payments"` | **Native** view in shell | keep (already unified) |
| Start a job (mobile hero) | `data-go="startjob"` | **Native** | keep |
| Customers | `data-go="customers"` | **Native** | keep |
| Commission | `data-go="commission"` | **Native** | keep |
| Inventory | `data-go="inventory"` | **Native** | keep |
| Dashboard | `data-go="dashboard"` | **Native** (owner) | keep |
| Closeout | `data-go="history"` | **Native** (owner) | keep |
| Reports | `data-go="reports"` | **Native** (owner) | keep |
| **Receipts** | `data-embed="bittings.html?receipts=1"` | **IFRAME** (638 KB page) | **de-iframe** |
| **Scheduler** | `data-embed="scheduler.html"` | **IFRAME** | **replace w/ native calendar** |
| **Fleet** | `data-embed="fleet.html"` | **IFRAME** (owner) | **de-iframe** |
| **Lishi & Keys** | `data-embed="lishi.html"` | **IFRAME** | **de-iframe** |
| **Programmers** | `data-embed="programmers.html"` | **IFRAME** | **de-iframe** |
| **Settings** | `data-embed="setup.html"` | **IFRAME** (owner) | **de-iframe** |

**The 6 iframe seams = the whole job** (5 de-iframe + Scheduler rebuilt native).

### Design system
- Canonical: **`app/ui/bittings-ui.css`** (~17 KB) — the native views already use it. Plus a tiny
  `app/ui/legacy-dark.css`. The 6 embedded pages carry their **own** styles → the visual drift.
- **Plan:** one design system = `bittings-ui.css` as the single source; every de-iframed screen drops
  its private chrome and adopts the shared tokens/components + the shell's light/dark theme (no
  cross-iframe theme syncing needed once they're native).

### Shared data layer (unchanged, reused as-is)
`app/store.js` (`window.TKS`) + `app/pay.js`, `access.js`, `d1.js`, `ymm.js`, `corrections.js`,
`inventory-import.js`, `ilco-2025.js`, `lishi-seed.js`, `cloud-config.js`. All screens already route
through these — de-iframing reuses them directly (no new data plumbing).

---

## NATIVE SCHEDULER — data model (replaces the Google-Calendar deep-link)
Reads/writes the **existing** Supabase data (no Google dependency, no new backend):
- **`bookings`** (the appointment/job record: customer, vehicle/VIN, address, date/time, status,
  assigned tech) — already the scheduler's store via TKS.
- **`staff`** roster (assignment dropdown, tech self-scope) + **`vans`** (dispatch).
- **`job_staff`** / job status state machine + reconciliation (already enforced server-side).
- Calendar surfaces: **Day** (exists today) → add **Week/Month** + drag/tap-to-reschedule that write
  back to `bookings` through TKS. Keep the booking **intake flow** (it's the only booking path) and the
  status state machine; only the *calendar view layer* is new. Keep the existing "Add to Schedule"
  Google deep-link as an **optional export**, not the system of record.
- 🚩 Decision to confirm: drop the Google deep-link entirely, or keep it as a one-tap export button.

---

## BUILD ORDER (sub-stages)
- **3.0 Clone + tracker + inventory** ✅ (this doc).
- **3.1 Unified shell pass** ⬜ — in `bittings-unified/index.html`, make the shell render the 6
  embedded screens as **native views** (remove the `btEmbed` iframe path) one at a time, sharing
  `bittings-ui.css`. Start with the simplest (Fleet/Settings), end with the heaviest (Receipts,
  built from `bittings.html`'s 638 KB).
- **3.2 De-iframe each tool** ⬜ — Fleet → Settings → Programmers → Lishi → Receipts. Each: lift its
  markup/logic into the shell as a `data-go` view, drop its private CSS, verify role-gating + data.
- **3.3 Native scheduler** ⬜ — Day/Week/Month calendar over `bookings`, reschedule writes back,
  intake flow preserved, Google link demoted to optional export.
- **3.4 Full self-verification** ⬜ — every screen native, no iframes; role gating (owner vs staff)
  holds; reads/writes hit the same Supabase rows the old app did.
- **3.5 Cutover** ⬜ — only after a full device sweep passes: point the run/deploy at
  `bittings-unified/`, keep `bittings-app/` as the fallback until confirmed.

## Human-only checks — BATCHED for the end (owner device sweep)
- Every screen looks/behaves like one app (no iframe seam, consistent theme) on iPhone Safari +
  Android Chrome, for owner AND signed-in staff.
- Owner-gating still hides owner-only tools (Fleet/Dashboard/Closeout/Reports/Settings) from staff.
- Native scheduler: create/open/reschedule a booking; it persists to the same cloud record.

## 📌 WHERE PHASE 3 STANDS
Stage 0 complete: branch + clone + architecture inventory + scheduler data model captured. Backend
untouched. Next: 3.1 unified shell pass in `bittings-unified/`, de-iframing the simplest screens first.
