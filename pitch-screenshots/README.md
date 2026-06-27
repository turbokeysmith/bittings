# Bittings — Staff App Screens (Investor Pitch)

Desktop screenshots of the Bittings locksmith operating system, captured with
illustrative demo data ("Turbo Keysmith," an active OKC shop: 12 customers, 22
stock items, 44 jobs/month, ~$10.9k revenue). All data shown is sample data.

The app is a localStorage-first PWA that syncs to Supabase (Postgres + RLS) when a
staff member signs in, and keeps working offline in the field. Payments run on
Stripe Connect (1% platform fee; 2% surcharge on credit only). Built multi-tenant-ready.

| # | Screen | What it does |
|---|--------|--------------|
| 01 | **Sign in** | Cloud auth (Supabase). Email/password, or "Use offline" for local-only field use. Gates the app; role (owner / manager / technician / front-desk) resolves from the staff table and drives every permission. |
| 02 | **Start a Job** | Chat-style job intake for techs. VIN decode or Year/Make/Model → surfaces keyway, Lishi pick, transponder system, programmer coverage, Ilco code series, and dealer-software-required flags in one place. |
| 03 | **Register (POS)** | Ticket-based cash register. Vehicle/VIN capture, NASTF D1 security-job picker, Part/Service/Custom/Discount lines pulled from inventory + the service catalog, Cash/Check/Card, automatic stock decrement, drawer-aware. |
| 04 | **Customers** | CRM for individuals + businesses (incl. NASTF contracting accounts). Search, per-customer job history, and live A/R ("OWES $") from unpaid invoices. |
| 05 | **Inventory** | Parts & stock: qty on hand, low-stock reorder flags, cost/sell price, supplier, van-vs-shop location. Decremented automatically by the register. |
| 06 | **Dashboard** (owner) | KPI dashboard: revenue, jobs, avg ticket, repeat-customer %, A/R, tax collected (month, with prior-month deltas), jobs-this-week chart, jobs-by-type mix, CSV export. Reconciles to the transaction ledger. |
| 07 | **Closeout** (owner) | End-of-day cash drawer / deposit slip. Counts cash + check receipts against the drawer float, with per-staff and per-day totals. |
| 08 | **Reports** (owner) | Transaction-history analytics: sales / cost / profit / jobs by day, week, or month, broken down per technician and per payment method. |
| 09 | **Commission** | Per-technician commission ledger. Configurable engine (flat / % / tiers, daily minimum, parts-exclude, earned-when). Techs see their own earnings; managers see all plus sign-off holds. |
| 10 | **Receipts** | Read-only archive of receipts / invoices / estimates. Search by number, customer, vehicle, or VIN; in-app PDF viewer; reprint; NASTF D1-filed tracking. Charging happens only in the register — never here — so there's one money path per device. |
| 11 | **Document Builder** | Guided receipt / invoice / estimate builder. Step-by-step entry, signature capture, warranty + NASTF D1 stamp, branded PDF output. |
| 12 | **Scheduler** | Job calendar. Day grid, customer/vehicle/service capture, status pipeline (Scheduled → In Progress → Completed), technician assignment, photo proof. Feeds the dashboard job charts. |
| 13 | **Lishi & Keys** | Vehicle key reference: searchable make/model/year → Lishi 2-in-1 pick, keyway, keycode location, and the Ilco 2025 code series + HPC card for 1,600+ vehicles. |
| 14 | **Programmers** | Key-programmer coverage matrix: per-make add-key / all-keys-lost / remote capability across the shop's tools (Autel, Xhorse, SmartPro, AutoProPad, Lonsdor…), VIN lookup, and real-world tool-removal flags. |
| 15 | **Settings** | Shop setup: business identity/branding, tax, payments (Stripe, NASTF D1 window), staff & roles/PINs, commission rules, service catalog, integrations, backup/restore. Cloud-synced, multi-tenant-ready. |
| 16 | **Fleet** | Van/vehicle management: per-van status, odometer, plate/VIN, home-van assignment; links inventory to each van's stock. |

*Reports and Commission are powered by the cloud transaction ledger; the rest run
fully local/offline. Captured at 1440×900, desktop.*
