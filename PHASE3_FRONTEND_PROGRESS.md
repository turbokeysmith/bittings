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
- **3.1 Unified shell pass** 🔨 — in `bittings-unified/index.html`, make the shell render the 6
  embedded screens as **native views** (remove the `btEmbed` iframe path) one at a time, sharing
  the shell design system. **Pattern proven on Fleet** (see 3.2). Remaining: Settings, Programmers,
  Lishi, Receipts.
**🚩 STRATEGY DECISION (owner, 2026-06-26):** two techniques by page size —
- **Small self-contained pages → full inline port** (their markup+CSS+JS lifted into the shell as a
  native `data-go` view). Done: Fleet, Settings, Programmers.
- **Large pages → seamless module-mount** (keep the page as its own file, mount it into the shell's
  content area with the shared design system + theme and **no visible iframe chrome / no page-within-a-page
  header**, so it reads as one app without a risky huge rewrite). Applies to **Lishi (121 KB)** and
  **Receipts / bittings.html (638 KB)** — owner chose module-mount for Receipts; same rationale covers Lishi.

- **3.2 De-iframe each tool** 🔨 — Fleet → Settings → Programmers (inline, done) · Lishi → Receipts
  (seamless module-mount). Each: native/seamless in the shell, shared design system, role-gating + data intact.
  - ✅ **Fleet** (code-complete, pending device sign-off) — the **template** for the rest. Done as
    5 coordinated edits to `index.html`: (1) Fleet's component CSS folded in, **scoped under
    `#view-fleet`** so it reuses the shell's themed `--card/--edge/--ink/--red` vars and an `#id`
    selector outranks any global class collision; (2) nav button switched `data-embed="fleet.html"`
    → `data-go="fleet"`; (3) a `#view-fleet` view div added; (4) `'fleet'` added to the `views`
    array + a `renderFleet()` dispatch in the `[data-go]` handler; (5) Fleet's JS lifted **verbatim
    into an IIFE** exposing `window.renderFleet` (helpers `esc/render/loadVans/…` stay closure-scoped
    so they can't collide with the shell's globals), rendering into `#fleetBody`, modal namespaced
    `.fl-modal`. Server rules untouched (vans_insert/update=manager+, delete/staff_update=owner;
    `data-cap` gates preserved). `fleet.html` is now orphaned in the clone (kept until cutover).
    🚩 **Pending real-device verify** (no browser/Node here): Fleet opens as a native view (no iframe
    seam), themes light/dark, owner sees crew/home-van + delete, manager doesn't; add/edit/delete van
    writes to the same Supabase rows.
  - ✅ **Settings** (code-complete, pending device sign-off) — same recipe, plus **ID-collision
    handling**: setup.html shares generic ids with the shell (`#backBtn`, `#panel`, `#saved`, `#f_name`…),
    so the ported IIFE routes **every** lookup through a container-scoped `gid()`/`root.querySelectorAll`
    (root = `#view-settings`) — it can never grab the shell's elements. All of setup's CSS scoped under
    `#view-settings`; its bare `input`/`label`/`.panel`/`.btn` rules no longer leak globally; step-button
    row renamed `.nav`→`.stepnav`. Nav button `data-embed="setup.html"` → `data-go="settings"`. The two
    shell hooks that pointed at setup.html now open the native view: the **⚙ Setup** link and
    **`maybeRedirectToSetup()`** (first-run) both `#sideSettings.click()` instead of navigating away;
    the wizard's **Finish / Finish-later** call `goHome()` (returns to the visible hero) instead of
    `location.href`. All 6 inline scripts in index.html pass `node vm` syntax check.
    🚩 **Pending real-device verify:** Settings opens in-app (left rail + steps), saves each step to the
    same cloud config, manager-gated (staff sees "Managers only"), logo upload + hours copy work.
  - ✅ **Programmers** (code-complete, pending device sign-off) — large self-contained reference tool
    (710 lines, mostly the device + per-platform coverage seed). Same recipe; key wrinkles handled: its
    script runs **top-level init** (ensureSeed/populate/event-wiring) and grabs DOM at load, so its
    static markup sits in `#view-programmers` (in the DOM before the script) and the init resolves; it
    **redefines `readLS`/`writeLS`/`esc`/`uid`**, so the whole thing is IIFE-scoped; `gid()`/`root`
    scope every lookup and its `querySelectorAll('.panel')` so it can't toggle other views' panels. CSS
    scoped under `#view-programmers` (its `--amber`/`--red` now inherit the shell's shades). Seed data +
    the Autel Ford/Toyota tool-restriction logic copied verbatim. `window.renderProgrammers` refreshes
    the Lookup on open. Local-first data (`tks_prog_*`) unchanged. All 7 inline scripts pass node syntax check.
    🚩 **Pending real-device verify:** Lookup (VIN + make/year), My-tools checkboxes, Coverage table,
    add/edit modal, CSV import/export — all in-app, themed, with `editReference` gating intact.
  - ✅ **Lishi & Keys** (seamless module-mount, pending device sign-off) — stays its own file
    (`lishi.html`, 121 KB), mounted in the shell's borderless full-area iframe. Added the embed-detection
    snippet (`window.self!==window.top` → `html.bt-embedded`) that hides its own "‹ Apps" back-link +
    bottom nav so there's no page-within-a-page seam; theme already syncs into the iframe. Nav button
    unchanged (`data-embed="lishi.html"`). Syntax-checked.
  - ✅ **Receipts** (seamless module-mount, pending device sign-off) — `bittings.html?receipts=1` in the
    shell iframe. It **already** had the embed-detection (hides its bottom appnav + "‹ Apps" link when
    `window.self!==window.top`), so it was effectively already a seamless mount — no risky 638 KB rewrite.
    Read-only history/NASTF/D1 viewer + the invoice viewer all unchanged. Nav button unchanged.
  - ✅ **Scheduler** (interim seamless mount) — added the same embed snippet to `scheduler.html` so it
    reads as one app now. **This is interim:** 3.3 replaces it with a **native** in-app calendar.

### Phone note
On phones the shell opens embedded tools as their own full page (`location.href`) rather than an iframe
(an iframe in a narrow column is cramped) — so on phone Lishi/Receipts/Scheduler keep their own nav (correct;
`window.top===self` there). Desktop is the seamless-mount surface. The inlined screens (Fleet/Settings/
Programmers) are native on both.

**Tooling note:** Git **and Node.js (24.18)** are now installed on this PC (both were missing). Node is
needed for the next `npx wrangler` website deploy and is used here to syntax-check the inline scripts.
- **3.3 Native scheduler → REBUILT as a field-service DISPATCH tool** ✅ (code-complete,
  rendering-verified, pending owner device sign-off). The first pass was a view-only calendar; the
  owner needed a true dispatch tool, so it was scrapped and rebuilt to a locked spec.
  - **Views:** **Board** (per-tech lanes — the heart; column per staff member + an Unassigned lane,
    job cards for the cursor day) + **Day / Week / Month** calendar. Toggle in the toolbar.
  - **Job cards** show customer, time, job type (+subtype), vehicle, status pill, address, 📍 Navigate
    (one-tap maps from the address), and an async **"⚠ parts not on van"** flag (per-location inventory
    via `TKS.InvOps.locations` vs the assigned tech's `home_van_id`).
  - **Status** = the field-service flow **Scheduled → En route → On site → In progress → Completed →
    Cancelled**, each a distinct color from the palette. Status changes route through
    `TKS.Jobs.setStatus` (server role-enforced: tech own-job only, front-desk blocked, manager/owner
    any) with a local mirror; UI mirrors, server is authority.
  - **Assign / reassign** a tech from the real roster (`TKS.Fleet.staff()`, fallback to Settings
    employees) → `TKS.Jobs.assign(job,userId,'lead')` (manager+).
  - **Drag-and-drop** (manager+ only): drag a card between **board lanes** → reassign; drag a chip to
    another **calendar day** → reschedule. Both call the same button-action functions.
  - **Reschedule + Cancel** both go through the **required reason capture** (modal with the unused-parts/
    manager-signoff warning; note required for non-owners) → `TKS.Jobs.cancel(job,reason,detail)` /
    reschedule keeps server status `scheduled` + local `Rescheduled` flag, mirroring the old scheduler.
  - **Create / edit form:** job type, customer (+ **pull from existing customers**), phone, service,
    date/time, address, **VIN decode** (`TKS.decodeVin` → year/make/model) + ignition for auto,
    technician, status; Delete; Cancel-job.
  - **Backend untouched** — all through `TKS.Bookings` / `TKS.Jobs` / `TKS.Fleet` / `TKS.InvOps` /
    `TKS.decodeVin`. Old `scheduler.html` (guided intake) still present as the fallback until cutover.
  - **Verified via headless Chromium** (gate bypassed, seeded roster + jobs): Board renders 3 lanes +
    4 cards with correct color-coded status pills/Navigate/vehicle; calendar Month/Week/Day render; the
    full job form opens (12 fields, VIN decode, tech select). 8/8 inline scripts pass syntax. No console errors.
  🚩 **Pending owner device sign-off (can't test here):** drag-and-drop interactions on a real
  pointer/touch device; the cloud round-trips on a signed-in session (status via `TKS.Jobs.setStatus`,
  reassign via `TKS.Jobs.assign`, cancel via `TKS.Jobs.cancel`, the van-stock flag); role gating
  (tech sees own-job status only, front-desk can't change status, only manager+ can drag/reassign).
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
**The unification build is functionally complete** (code-complete, rendering-verified, pending the
owner device sweep): Fleet, Settings, Programmers **inlined as native views**; Lishi + Receipts
**seamless module-mounts**; and the **native Month/Week/Day scheduler** (3.3) replaces the
Google-Calendar link. The proven Supabase backend was **never touched**; everything committed + pushed.
A headless-Chromium harness now exists (`scratchpad/probe*.js`) and was used to verify dark-mode
readability + the scheduler rendering.
**Remaining: 3.4 full self-verify + 3.5 cutover** — the owner's one device sweep (iPhone Safari +
Android Chrome, owner + staff), then point the run/deploy at `bittings-unified/` keeping
`bittings-app/` as the fallback until confirmed. Batched checklist = every "pending device verify"
note above.
