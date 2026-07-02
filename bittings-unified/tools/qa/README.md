# Bittings QA harness (Puppeteer)

Headless Chrome scripts that drive the staff app to audit it. Produced the findings in
`bittings-unified/docs/QA_AUDIT_2026-06-30.md`. **Read-only audits — they don't change the repo.**

## Prereqs (already set up on the shop PC)
- Puppeteer + Chrome-for-Testing installed at the repo root (`npm`/`node_modules`).
  If Chrome is missing: `npx puppeteer browsers install chrome` (from repo root).
- Scripts resolve `puppeteer` from the repo root via `NODE_PATH` (see commands below).

## Run
```bash
# 1) serve the app (from repo root)
cd bittings-unified && python -m http.server 8088 --bind 127.0.0.1   # leave running

# 2) run a script (from this folder), pointing NODE_PATH at the repo's node_modules
cd tools/qa
NODE_PATH="C:/Users/sakar/Desktop/turbokeysmith-main/node_modules" node sweep.js
```
Each script writes screenshots + JSON under an `audit/` folder next to itself (`__dirname`).

## How it works (key tricks)
- **Seed a populated shop offline:** load `START-DEMO.html` first — it writes the demo localStorage
  (a fake `sb-…-auth-token`, `tks_demo_mode=1`, `tks_demo_role`, customers/inventory/bookings/
  receipts/txns) and redirects to `index.html`. No login or internet needed.
- **Drive any of the 4 roles headless:** override `localStorage` then reload —
  `tks_demo_role` ∈ {owner, manager, technician, front_desk} and set the auth-token `user.email`
  to a matching staff email (owner = `samer@`, so non-owner roles need a different email or
  `isOwner()` overrides the role). See `roles.js`.
- **Navigate:** every screen is `[data-go="<view>"]` (payments, startjob, customers, receipts,
  schedule, inventory, fleet, lishi, programmers, dashboard, **history=Closeout**, reports,
  settings, commission).
- **Theme:** click the `☀ Light` / `🌙 Dark` buttons (or set `localStorage.bt_theme`).

## ⚠️ Big limitation
Demo mode writes to **localStorage**, not the cloud. Server-RPC write-paths (inventory move/
receive/adjust, POS payments, refund/void, scheduler status save, D1 file) **do not complete
offline** — they need a live signed-in session + Stripe test keys. For backend proof without the
app, run the multi-tenant/payment isolation test:
`node bittings-unified/supabase/phase5/isolation_test.js` (repoint its `DBDIR` + the hardcoded
`embedded-postgres` import path to this PC first; expect `24/24 PASS`).

## Scripts
- `sweep.js` — owner, both themes, all 14 screens: contrast scan + overflow + per-screen console + desktop/mobile screenshots.
- `roles.js` — all 4 roles: `can()` matrix vs expected `TKS_CAPS`, nav visibility, sidebar screenshots.
- `func.js` — functional actions (customers add/edit/delete, inventory qty/move, POS, VIN/Lishi/Programmers lookups) with localStorage verification.
- `finalprobe.js` — commission-as-technician, scheduler edit/status, reports contrast.
- `recon.js` / `recon2.js` — DOM/nav/selector discovery helpers.
