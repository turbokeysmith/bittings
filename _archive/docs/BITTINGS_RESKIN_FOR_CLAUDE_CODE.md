# Bittings reskin — complete build file for Claude Code

> **One file, everything.** This contains the full instructions, the entire design-system
> stylesheet, the theme-toggle script, and the logo SVGs. Save the code blocks into the repo at
> the paths given, then follow the instructions. The only non-text assets (PNG favicons) are
> generated from the SVG — see step at the end.
>
> Run inside: `C:\\Users\\sakar\\Desktop\\bittings\\turbokeysmith-main` (staff app now under bittings-app/)

---

## Task
**Reskin the staff app to match the Bittings UI in `demo.html`. This is a VISUAL reskin only.**
Do **not** change behavior, data, field order, validation, routing, or copy. Do **not** add,
remove, rename, reorder, merge, or hide any tab/tile/page/flow. Same app, new paint.

**Hard rule — NASTF compliance is untouchable.** The NASTF D1 flow in `bittings.html` (the three
D1 types — Customer, Auction/Fleet, Contracting; the per-type photo checklists; required fields
that cannot be skipped; the Customer-Copy hiding audit data; the Contracting delete-photos
reminder) must keep working **exactly** as it does today. Restyle its containers/buttons/inputs
with the new classes; never touch its logic, the required-field gating, or what each D1 type
collects. If a change risks altering NASTF behavior, don't make it.

## What ships in this package
- **`bittings-ui.css`** — the whole design system as plain CSS classes (no React, no build). Two
  themes in one file: **Studio (light) is the default**; `<html data-bt-theme="dark">` switches
  to **Tactical (dark/field)**. Tokens + components: `.bt-card` (+ `--spine-amber/blue/violet/red/green`,
  `--flush`), `.bt-btn` (`--primary` = accent, `--brand` = red, `--secondary` = white, `--ghost`;
  `--lg/--sm/--full`), `.bt-pill` (`.is-ok/.is-warn/.is-no/.is-info`, `--solid`), `.bt-input` /
  `.bt-field` / `.bt-select`, `.bt-stat` (KPI), `.bt-bar`, the shell (`.bt-app`, `.bt-sidebar`,
  `.bt-nav__item`, `.bt-user`, `.bt-main`, `.bt-pagewrap`, `.bt-pagehead`), the responsive
  `.bt-bottomnav`, `.bt-tile`/`.bt-tiles`, `.eyebrow`, `.mono`, `.bt-themetoggle`.
- **`bittings-ui.js`** — wires `.bt-themetoggle` buttons, persists the choice (`localStorage` key
  `bt_theme`), exposes `window.BittingsTheme.{get,set,toggle}`. Plus the no-flash `<head>` snippet
  (in its comment) to paste so a remembered dark theme applies before first paint.
- **`demo.html`** — the reference. Open it, flip the theme, resize to phone width. It shows the
  exact target: the **"Start a job" hero at the very top** (see below), the sidebar with the real
  nav, the NASTF card, KPI cards, line items, inputs, and the mobile bottom-nav.

## "Start a job" — a dedicated tab, step 1 = job type, then the one-page hero
Add **"Start a job"** as the **first item in the sidebar/bottom-nav**, directly under the brand,
above Customers. Clicking it **first asks the job type — Automotive / Residential / Commercial**
(three large choice cards, see `demo.html`). Wire these to the shop's existing service categories
(`TKS.ServiceCats` / the `jobType` auto/res/com values) — do not hardcode a new list.
- **Automotive** → the one-page VIN hero: the VIN / year-make-model search, then the decoded
  result — **keyway + Lishi tool, in-van inventory check, transponder, ignition pickable,
  programmer options** — beside a **Next step** card (Start all-keys-lost job / Add key to invoice).
  Reproduce the `demo.html` "Job lookup" block with `.bt-card`, `.bt-stat`, `.bt-pill`, `.bt-field`,
  wired to the **existing** `TKS.decodeVin` + Lishi/inventory flow (currently in `lishi.html`).
- **Residential / Commercial** → no VIN; show the service picker for that category (the shop's real
  `servicesFor(key)` catalog) and continue into the existing work-order/receipt flow.
Don't fabricate data — use what the decode + stores already return; show "—" when empty. **Leave the
existing "Lishi & Keys" tab in place** — "Start a job" is a new front door to the same flows, not a
replacement, and must not alter their behavior.

## Brand hierarchy in the sidebar
**Bittings is the SaaS product (the logo + name); Turbo Keysmith is the locksmith company using
it — keep them visually SEPARATE, not stacked like a tagline.** The header is the Bittings mark +
"Bittings" wordmark only. The company name sits **below it as its own divided subheading** (its own
boxed/bordered block with a small label, e.g. "Locksmith" / "Workspace", then the name) — see the
`.bt-workspace` block in `demo.html`. Pull the company name from the existing config
(`TKS.Config.identity().name`) rather than hardcoding, so other shops show their own name. Order:
Bittings brand → company subheading → "Start a job" tab → the rest of the nav.

## How to apply it (every page)
The app is vanilla HTML/JS across `index.html`, `bittings.html`, `scheduler.html`, `lishi.html`,
`programmers.html`, `setup.html`. For each:
1. Copy `bittings-ui.css`, `bittings-ui.js`, and `assets/` into the app (e.g. `app/ui/`), and into
   `public/` the favicons + `site.webmanifest` bits.
2. In `<head>`: add the **no-flash snippet** (from `bittings-ui.js`'s comment) BEFORE the stylesheet,
   then `<link rel="stylesheet" href="…/bittings-ui.css">`, the new favicons, and
   `<meta name="theme-color" content="#f6f7f9">`. Add `class="bt"` to `<body>`.
3. **Shell:** wrap the page in `.bt-app` + `.bt-sidebar` (desktop) / `.bt-bottomnav` (phone, auto
   below 720px). The sidebar/nav must list **every** existing destination, in the current order,
   using the real labels and the existing click handlers (`data-go` / `data-open` / `openLinks` —
   wire `.bt-nav__item` to the same actions). Keep `owner-only` / `owner-soft` gating exactly
   (`syncOwnerTiles()` etc.) — managers see manager items, staff don't, on desktop AND phone.
4. **Content:** swap presentational markup to the component classes — tiles → `.bt-tile`, panels →
   `.bt-card`, buttons → `.bt-btn--*`, status chips → `.bt-pill`, inputs → `.bt-input`, page titles
   → `.bt-pagehead`. Keep all ids, `data-*`, and JS hooks the code relies on; only change classes/
   wrappers/inline styles. Do not rewrite the JS.
5. **Logo:** sidebar brand + login + receipt header use `assets/mark.svg` (or `logo.png`); favicon
   uses `assets/favicon.svg`. Drop the old `/vite.svg` favicon.
6. Put the **theme toggle** (`.bt-themetoggle`, light/dark) in the sidebar footer (and a compact
   spot on phone) and include `bittings-ui.js` before `</body>`.

## Repo conventions (from `CLAUDE.md`)
- **Terminology:** user-visible "owner" → **"manager"** (the demo's user chip says "Manager").
  Code identifiers (`isOwner`, `.owner-only`, …) stay as-is.
- **Mobile is mandatory before "done":** verify on a small phone, one-handed — sidebar collapses to
  the bottom-nav, nothing overflows, tap targets ≥44px, inputs are 16px (the CSS already enforces
  this), no hover-only behavior, and gating still holds. You can't run real devices — say so and
  give **numbered test steps for iPhone Safari AND Android Chrome × manager AND signed-in staff.**
- **Update the handoff docs in the same commit:** `PROJECT_HANDOFF.md` (plain-language — bump "Last
  updated", add a dated Changelog bullet: "UI reskin to Bittings design system, behavior unchanged")
  and `app/STRUCTURE_NOTES.md` (note the new `bittings-ui.css/js`, the theme mechanism, and that the
  reskin is presentational only).

## Acceptance check
- Every existing tab/tile/page/flow still present, same order, same actions; nothing hidden or
  renamed. NASTF D1 behavior (types, required fields, checklists, Customer-Copy hiding) byte-for-byte
  unchanged — only its styling differs.
- Theme toggle flips Studio↔Tactical on every page and persists; no flash of the wrong theme on load.
- "Start a job" is a dedicated first tab; clicking it asks Automotive/Residential/Commercial first,
  then Automotive → VIN hero (real decode/inventory data) and Res/Com → the real service catalog;
  the Lishi tab stays intact.
- Sidebar shows Bittings (the SaaS) as the brand and the shop's company name as a separate,
  divided subheading beneath it.
- Desktop shows the sidebar; phone shows the bottom-nav; manager-gating holds on both.
- Both handoff docs updated in the same commit; numbered iPhone + Android × manager + staff steps
  included in your summary.

---
*Reference: `demo.html` in this package is the exact target look, already applied to the real nav
(Customers · Receipts & NASTF · Scheduler · Payments · Inventory · Lishi · Programmers · Dashboard ·
Closeout · Reports). Match it.*


---

# FILE 1 — `app/ui/bittings-ui.css`
Save this verbatim.

```css
/* ==========================================================================
   Bittings UI — drop-in reskin stylesheet (framework-agnostic)
   --------------------------------------------------------------------------
   One file, two themes. Default = Studio (light). Add data-bt-theme="dark"
   to <html> for Tactical (dark/field). A toggle flips that attribute
   (see bittings-ui.js). Everything below is plain CSS classes — no React,
   no build step — so it drops straight into the existing vanilla app.

   Apply by adding classes to existing markup; do NOT change app logic.
   ========================================================================== */
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

/* ---- constant brand + neutral ramps + scale ---------------------------- */
:root {
  --brand-red:#b82334; --brand-red-deep:#8f1f27; --brand-red-soft:#e0636f;
  --brand-amber:#ffb000; --brand-amber-deep:#a9760f; --brand-amber-soft:#ffce6b;
  --signal-green:#22994a; --signal-green-soft:#5fd389;
  --signal-blue:#4aa3ff; --signal-blue-soft:#8ec5ff; --signal-violet:#9b6bd6;

  --font-sans:'Archivo',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
  --font-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace;
  --fs-display:34px; --fs-h1:26px; --fs-h2:21px; --fs-h3:17px;
  --fs-body:15px; --fs-body-sm:13.5px; --fs-caption:12.5px; --fs-micro:11px;
  --ls-tight:-0.02em; --ls-eyebrow:0.14em;
  --w-bold:700; --w-extra:800; --w-black:900;

  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px; --radius-pill:999px;
  --tap-min:44px; --ease-out:cubic-bezier(.2,.7,.3,1); --dur-base:.22s;

  --tint-amber:rgba(255,176,0,.14); --tint-red:rgba(184,35,52,.10);
  --tint-green:rgba(34,153,74,.12); --tint-blue:rgba(74,163,255,.12); --tint-violet:rgba(155,107,214,.12);
}

/* ======================================================================
   THEME — Studio (light) is the default semantic layer.
   ====================================================================== */
:root {
  --surface-app:#f6f7f9;
  --surface-app-grad:linear-gradient(180deg,#f8f9fb,#f1f3f6);
  --surface-sunken:#eef0f3; --surface-card:#ffffff; --surface-card-2:#fbfcfd; --surface-raised:#ffffff;
  --border-subtle:#e3e6ea; --border-strong:#cdd2d9;
  --text-primary:#14171b; --text-secondary:#5a616c; --text-tertiary:#9aa1ac;
  --text-on-accent:#ffffff; --text-on-brand:#ffffff;
  --accent:var(--brand-red); --accent-ink:#ffffff;
  --accent-grad:linear-gradient(180deg,#c92c3d,#b82334);
  --brand:var(--brand-red); --brand-grad:linear-gradient(180deg,#c92c3d,#b82334);
  --focus-ring:var(--brand-red);
  --shadow-card:0 1px 2px rgba(20,23,27,.04),0 8px 24px rgba(20,23,27,.06);
  --shadow-pop:0 18px 50px rgba(20,23,27,.16);
}

/* ======================================================================
   THEME — Tactical (dark / field). Toggle: <html data-bt-theme="dark">
   ====================================================================== */
[data-bt-theme="dark"] {
  --surface-app:#14171b;
  --surface-app-grad:radial-gradient(1100px 520px at 50% -10%,#23272f 0%,rgba(35,39,47,0) 60%),linear-gradient(180deg,#14171b,#1b1f25);
  --surface-sunken:#11141a; --surface-card:#1f232a; --surface-card-2:#1b1f25; --surface-raised:#252a32;
  --border-subtle:#2c313a; --border-strong:#3a414c;
  --text-primary:#f4f5f7; --text-secondary:#9aa1ac; --text-tertiary:#5a616c;
  --text-on-accent:#1a1300; --text-on-brand:#ffffff;
  --accent:var(--brand-amber); --accent-ink:#1a1300;
  --accent-grad:linear-gradient(180deg,#ffc23d,#ffb000);
  --brand:var(--brand-red); --brand-grad:linear-gradient(180deg,var(--brand-red),var(--brand-red-deep));
  --focus-ring:var(--brand-amber);
  --shadow-card:0 1px 0 rgba(255,255,255,.02) inset,0 8px 24px rgba(0,0,0,.35);
  --shadow-pop:0 18px 50px rgba(0,0,0,.55);
  --tint-amber:rgba(255,176,0,.16); --tint-red:rgba(184,35,52,.18);
  --tint-green:rgba(34,153,74,.18); --tint-blue:rgba(74,163,255,.16); --tint-violet:rgba(155,107,214,.16);
}

/* ======================================================================
   Base
   ====================================================================== */
.bt *, .bt *::before, .bt *::after { box-sizing:border-box; }
.bt {
  font-family:var(--font-sans); font-size:var(--fs-body); line-height:1.5;
  color:var(--text-primary); background:var(--surface-app);
  -webkit-font-smoothing:antialiased; -webkit-tap-highlight-color:transparent;
}
.bt h1,.bt h2,.bt h3,.bt h4 { font-weight:var(--w-extra); line-height:1.3; letter-spacing:var(--ls-tight); margin:0; }
.bt a { color:var(--accent); text-decoration:none; }
.mono { font-family:var(--font-mono); font-variant-numeric:tabular-nums; letter-spacing:0; }
.eyebrow { font-size:var(--fs-micro); font-weight:var(--w-extra); letter-spacing:var(--ls-eyebrow); text-transform:uppercase; color:var(--text-secondary); }
.bt :focus-visible { outline:3px solid var(--focus-ring); outline-offset:2px; border-radius:var(--radius-sm); }
.bt ::selection { background:var(--tint-amber); }

/* ======================================================================
   App shell — desktop sidebar / phone bottom-nav (auto-switch at 720px)
   ====================================================================== */
.bt-app { display:flex; min-height:100vh; background:var(--surface-app); }
.bt-sidebar {
  width:244px; flex:0 0 auto; background:var(--surface-card);
  border-right:1px solid var(--border-subtle); display:flex; flex-direction:column;
  position:sticky; top:0; height:100vh;
}
.bt-sidebar__brand { display:flex; align-items:center; gap:11px; padding:22px 22px 16px; }
.bt-sidebar__brand img { width:34px; height:34px; border-radius:9px; }
.bt-sidebar__name { font-weight:var(--w-black); font-size:18px; letter-spacing:var(--ls-tight); }
/* company / workspace — a SEPARATE subheading, divided from the Bittings (app) brand */
.bt-workspace { margin:0 16px 14px; padding:12px 14px; border-radius:var(--radius-md); background:var(--surface-sunken); border:1px solid var(--border-subtle); }
.bt-workspace__label { font-size:8px; font-weight:var(--w-extra); letter-spacing:var(--ls-eyebrow); text-transform:uppercase; color:var(--text-tertiary); }
.bt-workspace__name { font-size:13.5px; font-weight:var(--w-bold); color:var(--text-primary); margin-top:2px; }
.bt-nav { flex:1; display:flex; flex-direction:column; gap:3px; padding:0 12px; overflow-y:auto; }
.bt-nav__item {
  -webkit-appearance:none; appearance:none;
  display:flex; align-items:center; gap:12px; padding:11px 14px; border-radius:var(--radius-md);
  border:none; cursor:pointer; text-align:left; background:transparent;
  color:var(--text-secondary); font-family:var(--font-sans); font-size:14px; font-weight:600;
  min-height:var(--tap-min);
}
.bt-nav__item .bt-nav__ic { font-size:17px; filter:grayscale(.4); }
.bt-nav__item:hover { background:var(--surface-sunken); }
.bt-nav__item.is-active { background:var(--tint-red); color:var(--brand-red); font-weight:var(--w-extra); }
.bt-nav__item.is-active .bt-nav__ic { filter:none; }
.bt-user { margin:12px; padding:12px 14px; border-radius:var(--radius-md); background:var(--surface-sunken); display:flex; align-items:center; gap:10px; }
.bt-user__avatar { width:32px; height:32px; border-radius:50%; background:var(--brand-red); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:var(--w-black); font-size:13px; flex:0 0 auto; }
.bt-main { flex:1; min-width:0; }
.bt-pagewrap { max-width:1080px; margin:0 auto; padding:34px 40px 60px; }
.bt-pagehead { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; margin-bottom:22px; }
.bt-pagehead h1 { font-size:var(--fs-h1); font-weight:var(--w-black); letter-spacing:var(--ls-tight); margin-top:4px; }
.bt-pagehead__actions { display:flex; gap:10px; }

/* bottom nav is hidden on desktop */
.bt-bottomnav { display:none; }

@media (max-width:720px) {
  .bt-app { flex-direction:column; }
  .bt-sidebar { display:none; }
  .bt-main { padding-bottom:76px; }            /* room for the fixed bottom nav */
  .bt-pagewrap { padding:18px 16px 28px; }
  .bt-bottomnav {
    display:flex; position:fixed; left:0; right:0; bottom:0; z-index:80;
    border-top:1px solid var(--border-subtle); background:var(--surface-card-2);
    padding:8px 6px calc(8px + env(safe-area-inset-bottom));
  }
  .bt-bottomnav__item {
    -webkit-appearance:none; appearance:none;
    flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:6px 2px;
    background:transparent; border:none; cursor:pointer; min-height:var(--tap-min);
    font-family:var(--font-sans); font-size:10px; font-weight:var(--w-extra); color:var(--text-tertiary);
    text-decoration:none;
  }
  .bt-bottomnav__item .bt-nav__ic { font-size:19px; filter:grayscale(.5) opacity(.7); }
  .bt-bottomnav__item.is-active { color:var(--accent); }
  .bt-bottomnav__item.is-active .bt-nav__ic { filter:none; }
}

/* ======================================================================
   Tile home (restyle the existing tile grid)
   ====================================================================== */
.bt-tiles { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
.bt-tile {
  -webkit-appearance:none; appearance:none;
  display:flex; flex-direction:column; gap:6px; padding:20px; text-align:left; cursor:pointer;
  background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-xl);
  box-shadow:var(--shadow-card); color:var(--text-primary); position:relative; overflow:hidden;
  transition:transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.bt-tile:hover { transform:translateY(-2px); box-shadow:var(--shadow-pop); }
.bt-tile::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background:var(--brand-grad); }
.bt-tile .ic { font-size:26px; }
.bt-tile h2 { font-size:var(--fs-h3); color:var(--text-primary); }
.bt-tile p { font-size:var(--fs-body-sm); color:var(--text-secondary); margin:0; line-height:1.45; }

/* ======================================================================
   Card
   ====================================================================== */
.bt-card { background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); box-shadow:var(--shadow-card); padding:20px; }
.bt-card--flush { padding:0; overflow:hidden; }
.bt-card--spine-amber  { border-left:3px solid var(--brand-amber); }
.bt-card--spine-blue   { border-left:3px solid var(--signal-blue); }
.bt-card--spine-violet { border-left:3px solid var(--signal-violet); }
.bt-card--spine-red    { border-left:3px solid var(--brand-red); }
.bt-card--spine-green  { border-left:3px solid var(--signal-green); }

/* KPI stat */
.bt-stat__label { font-size:9.5px; font-weight:var(--w-extra); letter-spacing:var(--ls-eyebrow); text-transform:uppercase; color:var(--text-secondary); }
.bt-stat__value { font-family:var(--font-mono); font-size:28px; font-weight:var(--w-black); color:var(--text-primary); margin-top:5px; letter-spacing:-.01em; }
.bt-stat__sub   { font-size:12px; color:var(--text-secondary); margin-top:3px; font-weight:600; }
.bt-stat--green .bt-stat__value { color:var(--signal-green); }
.bt-stat--blue  .bt-stat__value { color:var(--signal-blue); }

/* horizontal % bar */
.bt-bar { height:11px; border-radius:var(--radius-pill); background:var(--surface-sunken); overflow:hidden; }
.bt-bar__fill { height:100%; border-radius:var(--radius-pill); background:var(--accent); }

/* job-type chooser (Automotive / Residential / Commercial) */
.bt-jobtype {
  -webkit-appearance:none; appearance:none; flex:1; min-width:150px; cursor:pointer; text-align:left;
  display:flex; flex-direction:column; gap:4px; padding:18px;
  background:var(--surface-card); border:1px solid var(--border-subtle); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-card); color:var(--text-primary); font-family:var(--font-sans);
  transition:border-color var(--dur-base),transform var(--dur-base);
}
.bt-jobtype:hover { transform:translateY(-2px); }
.bt-jobtype > .bt-jobtype__title { font-size:var(--fs-h3); font-weight:var(--w-extra); letter-spacing:var(--ls-tight); }
.bt-jobtype__sub { font-size:var(--fs-caption); color:var(--text-secondary); }
.bt-jobtype.is-active { border-color:var(--brand-red); box-shadow:0 0 0 2px var(--brand-red) inset, var(--shadow-card); }

/* ======================================================================
   Buttons
   ====================================================================== */
.bt-btn {
  -webkit-appearance:none; appearance:none;   /* clear native control backplate so our bg applies */
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  font-family:var(--font-sans); font-weight:var(--w-extra); font-size:14px; line-height:1;
  padding:11px 16px; border-radius:var(--radius-md); border:1px solid transparent; cursor:pointer;
  min-height:var(--tap-min); transition:filter var(--dur-base),background var(--dur-base),transform var(--dur-base); white-space:nowrap;
}
.bt-btn:active { transform:scale(.97); }
.bt-btn--primary   { background:var(--accent-grad); color:var(--accent-ink); }
.bt-btn--brand     { background:var(--brand-grad); color:var(--text-on-brand); }
.bt-btn--secondary { background:#ffffff; color:#14171b; border-color:rgba(20,23,27,.14); }
[data-bt-theme="dark"] .bt-btn--secondary { box-shadow:0 1px 2px rgba(0,0,0,.4); }
.bt-btn--ghost     { background:transparent; color:var(--text-secondary); }
.bt-btn--primary:hover,.bt-btn--brand:hover { filter:brightness(1.05); }
.bt-btn--lg { padding:14px 20px; font-size:15px; }
.bt-btn--sm { padding:8px 12px; font-size:12.5px; min-height:0; }
.bt-btn--full { display:flex; width:100%; }

/* ======================================================================
   Status pills
   ====================================================================== */
.bt-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:var(--radius-pill); font-size:11px; font-weight:var(--w-extra); letter-spacing:.01em; border:1px solid transparent; }
.bt-pill.is-ok   { background:var(--tint-green);  color:var(--signal-green);  border-color:rgba(34,153,74,.35); }
.bt-pill.is-warn { background:var(--tint-amber);  color:var(--brand-amber-deep); border-color:rgba(255,176,0,.4); }
.bt-pill.is-no   { background:var(--tint-red);    color:var(--brand-red);     border-color:rgba(184,35,52,.4); }
.bt-pill.is-info { background:var(--tint-blue);   color:var(--signal-blue);   border-color:rgba(74,163,255,.4); }
.bt-pill--solid.is-ok   { background:var(--signal-green); color:#fff; border-color:transparent; }
.bt-pill--solid.is-warn { background:var(--brand-amber); color:#1a1300; border-color:transparent; }
.bt-pill--solid.is-no   { background:var(--brand-red); color:#fff; border-color:transparent; }
.bt-pill--solid.is-info { background:var(--signal-blue); color:#fff; border-color:transparent; }

/* ======================================================================
   Inputs
   ====================================================================== */
.bt-field { position:relative; display:flex; align-items:center; }
.bt-field .bt-field__icon { position:absolute; left:13px; pointer-events:none; color:var(--text-tertiary); font-size:16px; }
.bt-input {
  width:100%; font-family:var(--font-sans); font-size:16px; /* 16px = no iOS zoom */
  color:var(--text-primary); background:var(--surface-card);
  border:1px solid var(--border-subtle); border-radius:var(--radius-md); padding:12px 14px; min-height:var(--tap-min);
}
.bt-field--icon .bt-input { padding-left:38px; }
.bt-input::placeholder { color:var(--text-tertiary); }
.bt-input:focus { outline:none; border-color:var(--focus-ring); box-shadow:0 0 0 3px color-mix(in srgb,var(--focus-ring) 22%,transparent); }
.bt-input--mono { font-family:var(--font-mono); letter-spacing:.02em; }
.bt-select { appearance:none; background-image:none; cursor:pointer; }

/* ======================================================================
   Theme toggle control (place in sidebar footer or top bar)
   ====================================================================== */
.bt-themetoggle { display:inline-flex; background:var(--surface-sunken); border:1px solid var(--border-subtle); border-radius:var(--radius-pill); padding:3px; gap:2px; }
.bt-themetoggle button { -webkit-appearance:none; appearance:none; border:none; cursor:pointer; border-radius:var(--radius-pill); padding:6px 12px; font-family:var(--font-sans); font-size:12px; font-weight:var(--w-extra); background:transparent; color:var(--text-tertiary); min-height:0; }
.bt-themetoggle button.is-active { background:var(--surface-card); color:var(--text-primary); box-shadow:var(--shadow-card); }

@media (prefers-reduced-motion:reduce){ .bt *,.bt *::before,.bt *::after{ animation-duration:.001ms!important; transition-duration:.001ms!important; } }

```

---

# FILE 2 — `app/ui/bittings-ui.js`
Save this verbatim. Load with `<script src="app/ui/bittings-ui.js"></script>` before `</body>`.

```js
/* ==========================================================================
   bittings-ui.js — theme toggle + persistence for the Bittings reskin.
   Studio (light) is the default; Tactical (dark) is opt-in and remembered.
   No dependencies. Safe to load with a normal <script src> before </body>.
   ========================================================================== */
(function () {
  var KEY = 'bt_theme'; // 'light' | 'dark'

  function current() {
    try { return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; }
  }
  function apply(theme) {
    if (theme === 'dark') document.documentElement.setAttribute('data-bt-theme', 'dark');
    else document.documentElement.removeAttribute('data-bt-theme');
    // reflect on any toggle controls
    document.querySelectorAll('.bt-themetoggle [data-bt-set]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-bt-set') === theme);
    });
    // keep the browser chrome colour in sync
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14171b' : '#f6f7f9');
  }
  function set(theme) {
    try { localStorage.setItem(KEY, theme); } catch (e) {}
    apply(theme);
  }

  // expose
  window.BittingsTheme = { get: current, set: set, toggle: function () { set(current() === 'dark' ? 'light' : 'dark'); } };

  // wire any .bt-themetoggle buttons + apply saved theme once the DOM is ready
  function init() {
    document.querySelectorAll('.bt-themetoggle [data-bt-set]').forEach(function (b) {
      b.addEventListener('click', function () { set(b.getAttribute('data-bt-set')); });
    });
    apply(current());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/*
  No-flash snippet — paste this in <head> of every page, BEFORE the stylesheet,
  so a remembered dark theme is applied before first paint:

  <script>try{if(localStorage.getItem('bt_theme')==='dark')document.documentElement.setAttribute('data-bt-theme','dark');}catch(e){}</script>

  Toggle markup (drop in the sidebar footer or top bar):

  <div class="bt-themetoggle">
    <button data-bt-set="light">☀ Light</button>
    <button data-bt-set="dark">🌙 Dark</button>
  </div>
*/

```

---

# FILE 3 — `app/ui/assets/mark.svg` (the Bittings app mark — red)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Bittings">
  <defs>
    <mask id="bittings-keyhole">
      <rect width="120" height="120" fill="#fff"></rect>
      <circle cx="60" cy="42" r="17" fill="#000"></circle>
      <polygon points="52,50 66,50 66,62 73,62 73,74 63,74 63,86 70,86 70,97 52,97" fill="#000"></polygon>
    </mask>
  </defs>
  <rect x="6" y="6" width="108" height="108" rx="30" fill="#b82334" mask="url(#bittings-keyhole)"></rect>
</svg>```

# FILE 4 — `app/ui/assets/mark-mono.svg` (single-color, inherits currentColor)
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Bittings">
  
  <defs>
    <mask id="bittings-keyhole-mono">
      <rect width="120" height="120" fill="#fff"></rect>
      <circle cx="60" cy="42" r="17" fill="#000"></circle>
      <polygon points="52,50 66,50 66,62 73,62 73,74 63,74 63,86 70,86 70,97 52,97" fill="#000"></polygon>
    </mask>
  </defs>
  <rect x="6" y="6" width="108" height="108" rx="30" fill="currentColor" mask="url(#bittings-keyhole-mono)"></rect>
</svg>```

# FILE 5 — `public/favicon.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="32" height="32" role="img" aria-label="Bittings">
  <defs>
    <mask id="bittings-favicon">
      <rect width="120" height="120" fill="#fff"></rect>
      <circle cx="60" cy="42" r="17" fill="#000"></circle>
      <polygon points="52,50 66,50 66,62 73,62 73,74 63,74 63,86 70,86 70,97 52,97" fill="#000"></polygon>
    </mask>
  </defs>
  <rect x="6" y="6" width="108" height="108" rx="30" fill="#b82334" mask="url(#bittings-favicon)"></rect>
</svg>```

---

# Generate the PNG favicons (one-time)
The raster icons are just the mark exported at fixed sizes. From the repo root, with any SVG→PNG
tool (e.g. `rsvg-convert`, `sharp`, or an online export), produce from `public/favicon.svg`:
`favicon-16.png` (16), `favicon-32.png` (32), `apple-touch-icon.png` (180, red mark on a #14171b
tile), `icon-192.png` / `icon-512.png` (mark centered on a #14171b tile, ~68% size for maskable
safe-zone), and `logo.png` (512, transparent — the in-app emblem). Then in each page `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="#f6f7f9">
```

---

# REFERENCE — the target look (`demo.html`)
This is the goal, already applying the classes above to the real nav (Start a job · Customers ·
Receipts & NASTF · Scheduler · Payments · Inventory · Lishi & Keys · Programmers · Dashboard ·
Closeout · Reports), with the Automotive/Residential/Commercial step and both themes. Open it in a
browser to see the target; match it. (Reference only — do not ship this file as-is; apply its
patterns to the real pages.)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bittings reskin — reference</title>
<!-- no-flash: apply remembered theme before paint -->
<script>try{if(localStorage.getItem('bt_theme')==='dark')document.documentElement.setAttribute('data-bt-theme','dark');}catch(e){}</script>
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
<meta name="theme-color" content="#f6f7f9">
<link rel="stylesheet" href="bittings-ui.css">
<style>
  html,body{margin:0;}
  /* demo-only helper rows */
  .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center;}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
  @media(max-width:720px){.grid4{grid-template-columns:1fr 1fr;}}
</style>
</head>
<body class="bt">
<div class="bt-app">

  <!-- ===== SIDEBAR (desktop) — every real destination, in order ===== -->
  <aside class="bt-sidebar">
    <div class="bt-sidebar__brand">
      <img src="assets/mark.svg" alt="">
      <div class="bt-sidebar__name">Bittings</div>
    </div>
    <div class="bt-workspace">
      <div class="bt-workspace__label">Locksmith</div>
      <div class="bt-workspace__name">Turbo Keysmith</div>
    </div>
    <nav class="bt-nav">
      <button class="bt-nav__item is-active"><span class="bt-nav__ic">🔑</span>Start a job</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">👤</span>Customers</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">🧾</span>Receipts &amp; NASTF</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">📅</span>Scheduler</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">💳</span>Payments</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">📦</span>Inventory</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">📇</span>Lishi &amp; Keys</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">🛠</span>Programmers</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">📊</span>Dashboard</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">🧮</span>Closeout</button>
      <button class="bt-nav__item"><span class="bt-nav__ic">📈</span>Reports</button>
    </nav>
    <div style="padding:0 16px 10px"><div class="bt-themetoggle">
      <button data-bt-set="light">☀ Light</button>
      <button data-bt-set="dark">🌙 Dark</button>
    </div></div>
    <div class="bt-user">
      <div class="bt-user__avatar">S</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:800">Samer K.</div>
        <div class="eyebrow" style="font-size:8.5px;color:var(--brand-amber-deep)">Manager</div>
      </div>
      <span style="color:var(--text-tertiary)">⌄</span>
    </div>
  </aside>

  <!-- ===== MAIN — a restyled "Receipts / NASTF" page (illustration) ===== -->
  <main class="bt-main">
    <div class="bt-pagewrap">

      <!-- ====== START A JOB — step 1: what kind of job? ====== -->
      <div class="bt-pagehead">
        <div>
          <div class="eyebrow">Start a job</div>
          <h1>What kind of job?</h1>
        </div>
      </div>
      <div class="row" id="jobtype" style="margin-bottom:24px">
        <button class="bt-jobtype is-active" data-jt="auto"><span style="font-size:26px">🚗</span><span class="bt-jobtype__title">Automotive</span><span class="bt-jobtype__sub">VIN → keyway, tool &amp; programming</span></button>
        <button class="bt-jobtype" data-jt="res"><span style="font-size:26px">🏠</span><span class="bt-jobtype__title">Residential</span><span class="bt-jobtype__sub">Rekey · lockout · install</span></button>
        <button class="bt-jobtype" data-jt="com"><span style="font-size:26px">🏢</span><span class="bt-jobtype__title">Commercial</span><span class="bt-jobtype__sub">Master key · access control</span></button>
      </div>

      <!-- ====== Automotive flow: the one-page VIN hero ====== -->
      <div id="autoFlow">
      <div class="bt-pagehead">
        <div>
          <div class="eyebrow">Automotive · Lishi &amp; programming</div>
          <h1>Job lookup</h1>
        </div>
        <div class="bt-pagehead__actions">
          <button class="bt-btn bt-btn--secondary">Browse vehicles</button>
        </div>
      </div>

      <div class="bt-card" style="margin-bottom:18px">
        <div class="eyebrow" style="margin-bottom:12px">Enter a VIN, or year / make / model</div>
        <div class="row">
          <div class="bt-field bt-field--icon" style="flex:2;min-width:240px">
            <span class="bt-field__icon">🔎</span>
            <input class="bt-input bt-input--mono" value="1FTFW1E50MFA12345" aria-label="VIN" maxlength="17">
          </div>
          <select class="bt-input bt-select" style="flex:0 0 auto;width:auto"><option>2021</option></select>
          <select class="bt-input bt-select" style="flex:0 0 auto;width:auto"><option>Ford</option></select>
          <select class="bt-input bt-select" style="flex:0 0 auto;width:auto"><option>F-150</option></select>
          <button class="bt-btn bt-btn--primary bt-btn--lg">Look up</button>
        </div>
      </div>

      <!-- result + side rail: everything visible at once -->
      <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:20px;align-items:start;margin-bottom:26px">
        <div class="bt-card bt-card--spine-amber">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div>
              <div class="eyebrow">Job lookup result</div>
              <div style="font-size:var(--fs-display);font-weight:900;letter-spacing:var(--ls-tight);margin-top:2px">2021 Ford F-150</div>
              <div class="mono" style="font-size:12.5px;color:var(--text-secondary)">1FTFW1E50MFA12345</div>
            </div>
            <span class="bt-pill is-ok">✓ Confirmed</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px">
            <div>
              <div class="eyebrow" style="margin-bottom:4px">Keyway — Lishi tool</div>
              <div style="font-weight:800;color:var(--brand-red)">HU101 <span class="mono" style="color:var(--text-secondary);font-weight:600;font-size:12.5px">· HU101(10) V.3</span></div>
            </div>
            <div>
              <div class="eyebrow" style="margin-bottom:4px">Inventory check</div>
              <span class="bt-pill is-ok">12 blanks · 4 fobs in van</span>
            </div>
            <div>
              <div class="eyebrow" style="margin-bottom:4px">Transponder</div>
              <div class="mono" style="font-size:13px;font-weight:600">Ford 128-bit (PATS)</div>
            </div>
            <div>
              <div class="eyebrow" style="margin-bottom:4px">Ignition pickable</div>
              <span class="bt-pill is-ok">Yes</span>
            </div>
          </div>
          <div class="bt-card--flush" style="margin-top:16px;border-top:1px solid var(--border-subtle);padding-top:14px">
            <div class="eyebrow" style="margin-bottom:8px">Programmers</div>
            <div class="row" style="gap:8px">
              <span class="bt-pill is-info">AutoProPad G2 · AKL</span>
              <span class="bt-pill is-info">Autel IM608 · NASTF</span>
              <span class="bt-pill is-warn">Lonsdor K518 · add-key</span>
            </div>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="bt-card">
            <div class="eyebrow" style="margin-bottom:10px">Next step</div>
            <button class="bt-btn bt-btn--brand bt-btn--full bt-btn--lg" style="margin-bottom:9px">Start all-keys-lost job</button>
            <button class="bt-btn bt-btn--secondary bt-btn--full">Add key to invoice</button>
          </div>
          <div class="bt-card">
            <div class="eyebrow" style="margin-bottom:12px">In your van</div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-size:13.5px;font-weight:600">HU101 blank</span><span class="bt-pill is-ok">12</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border-subtle)"><span style="font-size:13.5px;font-weight:600">Ford 4-btn fob</span><span class="bt-pill is-ok">4</span></div>
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0"><span style="font-size:13.5px;font-weight:600">4D-63 chip</span><span class="bt-pill is-ok">23</span></div>
          </div>
        </div>
      </div>

      </div><!-- /#autoFlow -->

      <!-- ====== Residential / Commercial flow (shown when chosen) ====== -->
      <div id="otherFlow" style="display:none">
        <div class="bt-pagehead"><div><div class="eyebrow" id="otherEyebrow">Residential</div><h1>Job details</h1></div></div>
        <div class="bt-card" style="margin-bottom:24px">
          <div class="eyebrow" style="margin-bottom:12px">Describe the job</div>
          <div class="row">
            <select class="bt-input bt-select" id="otherService" style="flex:1;min-width:220px"></select>
            <button class="bt-btn bt-btn--primary bt-btn--lg">Continue</button>
          </div>
          <div style="font-size:var(--fs-body-sm);color:var(--text-secondary);margin-top:12px;line-height:1.5">No VIN needed for this job type — pick the service and continue to the work order. In the app this pulls the shop's real service catalog for the chosen category.</div>
        </div>
      </div>

      <!-- ====== existing receipt / NASTF content continues below ====== -->
      <div class="bt-pagehead">
        <div>
          <div class="eyebrow">Receipt · invoice · estimate</div>
          <h1>Receipt #1042</h1>
        </div>
        <div class="bt-pagehead__actions">
          <button class="bt-btn bt-btn--secondary">My Copy</button>
          <button class="bt-btn bt-btn--secondary">Customer Copy</button>
        </div>
      </div>

      <!-- NASTF compliance card (styling only — real D1 logic stays as-is) -->
      <div class="bt-card bt-card--spine-red" style="margin-bottom:20px">
        <div class="row" style="justify-content:space-between">
          <div class="eyebrow">NASTF compliance</div>
          <span class="bt-pill is-no">D1 required</span>
        </div>
        <div style="font-size:var(--fs-body-sm);color:var(--text-secondary);margin:8px 0 14px;line-height:1.5">
          The right D1 fields appear automatically for each type. Required fields can't be skipped, and the
          Customer Copy hides audit data — exactly as your flow does today. This is the same screen, reskinned.
        </div>
        <div class="row">
          <span class="bt-pill is-info">Customer D1</span>
          <span class="bt-pill is-info">Auction / Fleet D1</span>
          <span class="bt-pill is-info">Contracting D1</span>
        </div>
      </div>

      <!-- KPI row to show the dashboard styling -->
      <div class="grid4" style="margin-bottom:20px">
        <div class="bt-card bt-stat bt-stat--green"><div class="bt-stat__label">Revenue</div><div class="bt-stat__value">$18,420</div><div class="bt-stat__sub">▲ 12% vs May</div></div>
        <div class="bt-card bt-stat"><div class="bt-stat__label">Jobs</div><div class="bt-stat__value">94</div><div class="bt-stat__sub">6.3 / day</div></div>
        <div class="bt-card bt-stat bt-stat--blue"><div class="bt-stat__label">Repeat customers</div><div class="bt-stat__value">38%</div><div class="bt-stat__sub">▲ 4 pts</div></div>
        <div class="bt-card bt-stat"><div class="bt-stat__label">Avg ticket</div><div class="bt-stat__value">$196</div><div class="bt-stat__sub">▲ $8</div></div>
      </div>

      <!-- line items + payment, to show cards/inputs/buttons -->
      <div class="bt-card bt-card--flush" style="margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border-subtle)">
          <span class="eyebrow">Line items</span><span class="mono" style="font-size:12px;color:var(--text-secondary)">Jun 15, 2026</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border-subtle)">
          <span style="flex:1;font-weight:600">Transponder key — cut</span><span class="mono" style="color:var(--text-tertiary)">×1</span><span class="mono" style="font-weight:700">$85.00</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;padding:14px 22px;border-bottom:1px solid var(--border-subtle)">
          <span style="flex:1;font-weight:600">Key programming (OBD)</span><span class="mono" style="color:var(--text-tertiary)">×1</span><span class="mono" style="font-weight:700">$75.00</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:baseline;padding:18px 22px">
          <span style="font-weight:900;font-size:18px">Total due</span>
          <span class="mono" style="font-weight:900;font-size:28px;color:var(--accent)">$184.00</span>
        </div>
      </div>

      <div class="row">
        <div class="bt-field bt-field--icon" style="flex:1;min-width:220px">
          <span class="bt-field__icon">🔎</span>
          <input class="bt-input bt-input--mono" value="1FTFW1E50MFA12345" aria-label="VIN">
        </div>
        <button class="bt-btn bt-btn--primary bt-btn--lg">💳 Take payment</button>
        <button class="bt-btn bt-btn--brand bt-btn--lg">Start all-keys-lost job</button>
      </div>
    </div>
  </main>
</div>

<!-- ===== BOTTOM NAV (phone) — primary destinations + More ===== -->
<nav class="bt-bottomnav">
  <a class="bt-bottomnav__item is-active"><span class="bt-nav__ic">🔑</span>Start job</a>
  <a class="bt-bottomnav__item"><span class="bt-nav__ic">🧾</span>Receipts</a>
  <a class="bt-bottomnav__item"><span class="bt-nav__ic">👤</span>Customers</a>
  <a class="bt-bottomnav__item"><span class="bt-nav__ic">📦</span>Stock</a>
  <a class="bt-bottomnav__item"><span class="bt-nav__ic">⋯</span>More</a>
</nav>

<script src="bittings-ui.js"></script>
<script>
  // demo only — Start-a-job step 1: pick Automotive / Residential / Commercial
  (function(){
    var SERVICES = {
      res: ['Rekey locks','Lockout / unlock','Lock install or repair','Smart lock setup','Other (describe)'],
      com: ['Master key system','Access control','Panic / exit device','Commercial rekey','Other (describe)']
    };
    var auto = document.getElementById('autoFlow');
    var other = document.getElementById('otherFlow');
    var eyebrow = document.getElementById('otherEyebrow');
    var sel = document.getElementById('otherService');
    function fill(jt){
      var list = SERVICES[jt] || [];
      sel.innerHTML = list.map(function(s){ return '<option>'+s+'</option>'; }).join('');
      eyebrow.textContent = jt === 'com' ? 'Commercial' : 'Residential';
    }
    document.querySelectorAll('#jobtype .bt-jobtype').forEach(function(btn){
      btn.addEventListener('click', function(){
        document.querySelectorAll('#jobtype .bt-jobtype').forEach(function(b){ b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var jt = btn.getAttribute('data-jt');
        if (jt === 'auto'){ auto.style.display=''; other.style.display='none'; }
        else { auto.style.display='none'; other.style.display=''; fill(jt); }
        window.scrollTo({ top:0, behavior:'smooth' });
      });
    });
  })();
</script>
</body>
</html>

```
