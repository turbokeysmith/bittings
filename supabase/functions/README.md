# Supabase Edge Functions — portal payments (single-shop, Stripe direct charges)

These are the deployed sources (version-controlled copies of what runs on the
`gcshuhlksjznksspbigl` project). Architecture + ops: `../PAYMENTS.md`. Schema: `../payments_setup.sql`.

## Functions & deploy settings
| Function | `verify_jwt` | Notes |
|---|---|---|
| `pay-create-intent` | **true** (staff session) | invoice id → authoritative base, manual-capture PI (base+2%), idempotent per `inv_<id>_attempt_<n>`; records `description`, plus `cost_cents` (Σ non-discount line `cost`) + `technician` read server-side from the receipt (for profit/commission) |
| `pay-record` | **true** | **cash / check** — no Stripe, **no surcharge**; reads the receipt's authoritative base and inserts a `completed` txn (with `cost_cents` + `technician`), idempotent per `inv_<id>_<method>` |
| `stripe-webhook` | **false** | signature-verified instead; **source of truth** (captures credit-only surcharge, marks paid) |
| `pay-status` | **true** | UI poll only |
| `pay-refund` | **true** | full/partial refund of a completed txn |
| `pay-terminal` | **true** | list readers/locations; test simulate-tap; cancel reader action |

## Secrets (Supabase → Edge Functions → Secrets)
- `STRIPE_SECRET_KEY` — `sk_test_…` now; swap to `sk_live_…` at cutover (same slot).
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` from the registered webhook endpoint.
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — auto-injected by Supabase.

> The functions run as **service_role**; `../payments_setup.sql` grants it the needed table DML
> (without that they get "permission denied").

## Deploy (Supabase CLI)
```bash
supabase functions deploy pay-create-intent --project-ref gcshuhlksjznksspbigl                 # verify_jwt default true
supabase functions deploy pay-record        --project-ref gcshuhlksjznksspbigl                 # cash/check
supabase functions deploy stripe-webhook    --project-ref gcshuhlksjznksspbigl --no-verify-jwt  # signature-verified
supabase functions deploy pay-status        --project-ref gcshuhlksjznksspbigl
supabase functions deploy pay-refund        --project-ref gcshuhlksjznksspbigl
supabase functions deploy pay-terminal      --project-ref gcshuhlksjznksspbigl
```
Runtime: `stripe-node@16` via `npm:` specifier + `Stripe.createFetchHttpClient()`; webhooks use the
async `constructEventAsync` (required in Deno). API version pinned `2024-06-20`.
