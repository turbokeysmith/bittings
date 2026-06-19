# Claude Code prompt — Build the Manager Dashboard (Studio look)

Paste everything below the line into Claude Code, running in the
`C:\Users\sakar\Desktop\bittings\turbokeysmith-main` repo (staff app now under bittings-app/).

---

## Task
Add a **Manager Dashboard** to the staff app — a single at-a-glance screen with KPI cards, a
"Jobs this week" bar chart, and a "Jobs by type" breakdown. I have an approved design for it
(light "Studio" look). Build it to match the spec below and **wire every number to real data
through the existing `window.TKS` data layer — do not hardcode the sample figures.**

This is **read-only** (it only reads data; it writes nothing) and **manager-only**.

## Read these first (don't reinvent what exists)
- `app/STRUCTURE_NOTES.md` — the data layer + what's already built.
- `index.html` — the staff-app home. It already has **`openReports()` / `renderReports()` /
  `drawRepChart()`** (the "Transaction History" view, `view-reports`) that aggregates
  `payment_transactions` into **Total Jobs / Sales / Cost / Profit** over a period, with
  **Chart.js v4 already loaded**. **Reuse that aggregation and that Chart.js instance pattern**
  (single chart instance, `.destroy()` before each redraw) for this dashboard. Model the new
  view on `view-reports`: a new tile + a `view-dashboard` entry in the `views` array, back-target
  = Home, gated by `ownerHard()` / `.owner-only` exactly like Closeout & Transaction History.
- `app/store.js` (`window.TKS`) — the API you'll read from: `TKS.Bookings`
  (`active()/archived()/forCustomer()`, each booking has `date`, `status`, `serviceCategory`),
  `TKS.Customers`, `TKS.ServiceCats` (`active()`, `label(key,lang)` — the shop's real service
  categories), `TKS.Config`, `TKS.auth` (`isOwner()`), and the payments/reports helpers
  (`TKPay.dayTransactions`, `payment_transactions`).

## Metric definitions — compute these from real data
Use the **same definitions the existing Reports view already uses** so the numbers reconcile.
Period for the KPI row = **current calendar month** unless noted.

| Card | Value | How to compute | Sub-line (delta) |
|------|-------|----------------|------------------|
| **Revenue** | this month's sales | Same as Reports **"Sales"** = `base_cents − tax_cents` of completed `payment_transactions` in the month (excludes pass-through tax **and** surcharge). | `▲/▼ N% vs <prev month>` — compute the **same** metric for the previous month and show the real change. |
| **Jobs** | # jobs this month | Same as Reports **"Jobs"** (count of completed transactions this month). | `N / day` = jobs ÷ days **elapsed** so far this month. |
| **Repeat customers** | % | share of customers (with ≥1 job this month) who have **≥2 lifetime jobs** (`TKS.Bookings.forCustomer` / transactions grouped by customer). | `▲/▼ N pts` vs last month **only if** you can compute it from real data — otherwise **omit the delta line** (see honesty rule). |
| **Avg ticket** | $ | this month's Sales ÷ this month's Jobs. | `▲/▼ $N` vs last month's avg ticket. |

- **"Jobs this week"** (bar chart): count of completed jobs per day **Mon–Sun of the current
  week**. Highlight the **current day's** bar (or the peak day if today has none).
- **"Jobs by type"** (horizontal bars): distribution of this month's jobs across the shop's
  **real `TKS.ServiceCats.active()`** categories, as % of total. Assign the accent colors in
  order (see palette). Use the category's `label()` for the row name. Collapse the long tail into
  "Other" if there are more than ~5 categories.

### ⚠️ Honesty rule (matches `CLAUDE.md`)
The sample design shows deltas like "▲ 12% vs May." **Only show a delta when you can compute it
from real prior-period data.** If there's no prior-period data yet (new install), **hide that
delta line** rather than inventing a number. Same for any metric with zero data — show `—` or
`$0`, never a fabricated trend.

## Visual spec (the approved "Studio" look)
Render the dashboard as a **self-contained light surface** (its own wrapper, the tokens below),
even though the surrounding staff app is dark — this is the look that was approved. Keep the
app's existing chrome; only this view is light.

**Palette (hex, self-contained — no external dependency):**
```
Page surface       #f6f7f9      Card surface     #ffffff
Sunken (tracks)    #eef0f3      Card border      #e3e6ea
Text primary       #14171b      Text secondary   #5a616c     Text tertiary  #9aa1ac
Card shadow        0 1px 2px rgba(20,23,27,.04), 0 8px 24px rgba(20,23,27,.06)
Accent (red) grad  linear-gradient(180deg,#c92c3d,#b82334)   ← highlighted bar / primary button
Metric colors      Revenue #22994a (green) · Repeat #4aa3ff (blue) · Jobs & Avg #14171b (ink)
Type-bar colors    Automotive #ffb000 · Residential #4aa3ff · Commercial #9b6bd6 (then cycle)
```
Fonts: use the app's existing font stack. To match the mockup exactly you *may* load **Archivo**
(headings/labels) + **JetBrains Mono** (the big numbers) from Google Fonts — optional, not required.

**Layout** (max content width ~1100px, page padding ~32px, all cards radius 14px):
1. **Header row:** small uppercase eyebrow = current month + year (e.g. "JUNE 2026"); H1
   **"Manager dashboard"** (~34px, weight 800, letter-spacing −0.02em); right-aligned **Export**
   secondary button (outline) that downloads the current numbers as CSV.
2. **KPI row:** 4 equal cards, gap 16px, padding 18px, white, 1px `#e3e6ea` border + the card
   shadow. Each = uppercase eyebrow label (≈9.5px, letter-spacing, secondary) · big number
   (≈28px, weight 900, **monospace**, metric color) · sub-line (≈12px, secondary = the delta).
3. **Two-column grid** `1.5fr / 1fr`, gap 20px:
   - **Left — "JOBS THIS WEEK":** 7 vertical bars, area height ~180px. Bars = `#eef0f3`; the
     highlighted day = the red accent gradient. Value label above each bar (mono 11px), Mon–Sun
     label below (mono 11px tertiary). (You can draw with Chart.js to match the Reports view, or
     as flexbox divs — either is fine; keep it crisp.)
   - **Right — "JOBS BY TYPE":** one row per category = name + % on a line, then a track
     (`#eef0f3`, height 11px, radius 999) with a colored fill to the % width.
   Section titles use the uppercase eyebrow style (letter-spacing ~.14em, weight 800, secondary).

## Repo conventions you MUST follow (from `CLAUDE.md` + `STRUCTURE_NOTES.md`)
1. **Manager-gating:** new **"📊 Dashboard"** Home tile + `view-dashboard`, gated with
   `ownerHard()` / `.owner-only` / `syncOwnerTiles()` — visible to a signed-in manager (or an
   un-signed-in device), hidden for signed-in staff. Mirror how Closeout / Transaction History do it.
2. **Terminology:** user-visible text says **"manager,"** not "owner" (code identifiers like
   `isOwner`/`.owner-only` stay as-is). So the title is **"Manager dashboard."**
3. **Reuse Chart.js v4** already loaded in `index.html`; single chart instance, `.destroy()`
   before redraw (copy the `repChart` pattern). Degrade gracefully if `window.Chart` is absent.
4. **No schema/data changes, no writes** — this view only reads existing data. Don't touch
   localStorage/cloud keys.
5. **Mobile is mandatory before "done"** (standing rule): on a small phone, one-handed — the
   KPI cards reflow 4→2→1, the two-column grid stacks, the chart fits with no horizontal
   overflow, tap targets ≥44px, any inputs 16px, nothing hover-only, and **manager-gating still
   holds**. You can't run real devices — so **say so** and give me **numbered test steps for
   iPhone Safari AND Android Chrome × manager AND signed-in staff**. Status is at most
   "code-complete, pending mobile sign-off" until I confirm.
6. **Update the handoff docs in the same commit:** `PROJECT_HANDOFF.md` (plain-language — bump
   "Last updated", add a dated Changelog bullet) **and** `app/STRUCTURE_NOTES.md` (technical
   note on the new view + exactly which metric maps to which data source).

## Acceptance check
- Every figure traces to real `TKS` data; with an empty/new install the screen shows zeros/`—`
  and **no** fabricated deltas — it doesn't crash or show the sample numbers.
- The Reports view's Sales/Jobs for the current month **equal** the dashboard's Revenue/Jobs.
- A signed-in staff member cannot see the Dashboard tile or reach `view-dashboard`.
- Both handoff docs updated in the same commit; numbered iPhone + Android × manager + staff test
  steps included in your summary.

---
*Design reference: the approved dashboard is the "Owner dashboard" screen in the Bittings design
system's Studio (light back-office) kit — KPI cards over a "Jobs this week" bar chart and a "Jobs
by type" breakdown. The palette + layout above reproduce it; you don't need the design files.*
