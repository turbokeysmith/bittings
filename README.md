# Turbo Keysmith

The Turbo Keysmith web app — one tile home screen for a mobile locksmith
business: **Customers, Receipts (Bittings), Scheduler, Payments, Inventory**.

**Live site:** https://turbokeysmith.github.io/bittings/

## What's in this repo
This is the public website, served by GitHub Pages from the repo root.

- `index.html` — app home (tile screen + built-in Customers manager)
- `bittings.html` — Receipts / invoices / NASTF paperwork
- `scheduler.html` — booking & front-desk intake
- `cloud-test.html` — Supabase cloud-sync test page (proof-of-concept; not linked from the app)
- `supabase/customers_setup.sql` — cloud `customers` table + security rules (run once in Supabase)
- `*.png` — logo and app icons

Customers are shared across the apps on a device today; cloud sync and
employee logins are being added via Supabase.

> Internal planning, architecture, and business-strategy docs are kept in a
> private workspace, not in this public repo.
