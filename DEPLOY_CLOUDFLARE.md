# Deploy turbokeysmith.com to Cloudflare (Pages + full DNS) — runbook

**Goal:** host the public website on **Cloudflare Pages** and move the domain's **DNS to
Cloudflare** (best speed + free SSL + security), while keeping **GoDaddy only as the registrar**
and **not touching the live Google ranking until you verify a temporary URL first**.

**What gets deployed:** only the **`website/site/`** folder (the public marketing website). The **staff
app** (repo root `index.html`, `bittings.html`, `scheduler.html`, etc.) is **NOT** part of this —
it's a separate later step on its own subdomain (see §9). The Spanish **`/es/`** pages stay
**`noindex` / blocked** through all of this (unchanged).

> **The public site is hand-maintained static HTML in `website/site/`** — the source of truth. There is **no
> build step and no generator** (the old generator is retired/archived to `_archive/_build-generator-RETIRED/`;
> **do NOT run it**). Deploy with `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`.

> ⚠️ **Biggest risk = email.** Moving nameservers to Cloudflare moves **all** DNS, including the
> records that make your **GoDaddy email** work (MX + any `mail`/`webmail`/`autodiscover` records).
> Cloudflare auto-imports them, but you **must verify they came across** before flipping
> nameservers (Step 3). Skip that check and email can go down. This runbook makes you check.

---

## What I (Claude) have already done
- ✅ Confirmed the site is **self-contained and depth-correct** — every page's links/assets use
  correct relative paths, so it serves on Cloudflare Pages exactly as it does today.
- ✅ Added **`site/_headers`** — browser cache for `/assets/*` + safe security headers.
- ✅ Confirmed `robots.txt` blocks `/es/` and `/*.md`, and `sitemap.xml` uses the apex domain.
- 📝 Note: `site/turbo_city_seo_copy.md` is an internal planning doc that would ship in the upload.
  It's already `noindex` (robots blocks `.md`), but you can delete it from `site/` first if you
  want it off the server entirely. (Harmless either way.)

## What needs YOU (account/login things I can't do for you)
- Create the (free) **Cloudflare account**.
- Change the **nameservers at GoDaddy**.
- Click **Add custom domain** in Cloudflare Pages (the actual cutover).

> 💡 **Want me to do the deploy step for you?** If you create a **Cloudflare API token** (Pages
> edit permission) and paste it here, I can deploy `site/` from this machine with Wrangler and hand
> you the `*.pages.dev` URL — then you'd only do the account/DNS clicks. Otherwise the dashboard
> drag-and-drop in Step 4 is just as easy.

---

## Step 1 — Create Cloudflare + add your domain (DNS still safe)
1. Sign up at **dash.cloudflare.com** (free plan).
2. **Add a site** → type `turbokeysmith.com` → choose the **Free** plan.
3. Cloudflare **scans your current GoDaddy DNS** and lists what it found.

## Step 2 — VERIFY the imported records (do not skip)
On the DNS records screen, confirm these came across **exactly** as they are at GoDaddy now:
- The **website record**: an `A` record for `@` (and/or `www`) — at this point it should still point
  to your **current GoDaddy site IP**. Leave it as-is; we change it later in Step 6.
- **Email records** (critical): the **`MX`** records, plus any `TXT` (SPF, e.g. `v=spf1 …`), `DKIM`,
  `DMARC`, and any `mail` / `webmail` / `email` / `autodiscover` / `_domainconnect` entries.
- Anything else you recognize (e.g. verification TXT records).

If any are missing, **add them manually** to match GoDaddy before continuing. (Open GoDaddy → DNS in
another tab and compare line by line.) **Tip:** records that are just DNS (email, TXT) should be set
to **DNS only / "grey cloud"**, not proxied. The website record can be **proxied / "orange cloud"**.

## Step 3 — Switch nameservers at GoDaddy
1. Cloudflare shows you **two nameservers** (like `xxx.ns.cloudflare.com`).
2. In **GoDaddy** → your domain → **Nameservers** → **Change** → **Enter my own nameservers** →
   paste the two Cloudflare ones → save.
3. Cloudflare emails you when the domain is **Active** (usually minutes–few hours; up to 24h).

✅ **At this point nothing visible has changed** — the site still loads from GoDaddy's IP (records
preserved) and email still works. You've only moved *who answers DNS*. This is the safe checkpoint.

## Step 4 — Deploy the website to Cloudflare Pages (temporary URL)
**Dashboard route (easiest):**
1. Cloudflare dash → **Workers & Pages** → **Create** → **Pages** → **Upload assets** (direct
   upload, no GitHub needed).
2. Project name: `turbokeysmith` → **drag in the contents of the `website/site/` folder** (the files
   *inside* `site/`, so `index.html` is at the top level of the upload — not the `site` folder
   itself).
3. Deploy → you get a temp URL like **`turbokeysmith.pages.dev`**.

**OR Wrangler route (I can run this if you give me an API token):**
`npx wrangler pages deploy website/site --project-name=turbokeysmith`

## Step 5 — VERIFY on the temp URL (before any cutover)
Open `https://turbokeysmith.pages.dev` and check:
- [ ] Homepage loads **with styling** (CSS/logo present) and the phone number/links work.
- [ ] A **city page** and a **sub-page** (e.g. `/warr-acres/` and `/warr-acres/automotive/`) load styled.
- [ ] `/contact/` form renders.
- [ ] `/sitemap.xml` and `/robots.txt` load; robots still shows `Disallow: /es/`.
- [ ] `/es/` pages still show the **DRAFT banner** and are `noindex` (view-source: `noindex`).
- [ ] Looks right on your **phone** (this is the live customer view).

## Step 6 — Cutover: point the real domain at Pages
1. In the **Pages project** → **Custom domains** → **Set up a domain** → `turbokeysmith.com`.
   Because DNS is already on Cloudflare, it wires the record for you. **This is the switch.**
2. Add `www.turbokeysmith.com` too (as a second custom domain).
3. Wait for the domain to show **Active** + the SSL cert to issue (minutes).
4. **Verify `https://turbokeysmith.com`** loads the new site (repeat the Step 5 checklist on the
   real domain). Check `http://` redirects to `https://`.

✅ **Reversible:** if anything looks wrong, remove the custom domain / restore the old `A` record in
Cloudflare DNS and you're back to the GoDaddy site within minutes.

## Step 7 — Turn on the "best speed / all that" toggles
In the Cloudflare dashboard for the domain:
- **SSL/TLS** → set to **Full (strict)**.
- **SSL/TLS → Edge Certificates** → **Always Use HTTPS: ON**; **HTTP/3 (QUIC): ON**;
  **0-RTT: ON**; **Brotli: ON** (Speed → Optimization on older UIs).
- **Speed → Optimization** → **Early Hints: ON**; **Tiered Cache / Smart Tiered Caching: ON**.
- **HSTS** (do this *after* Step 6 verifies HTTPS works): SSL/TLS → Edge Certificates → **Enable
  HSTS** (start with max-age 6 months; add subdomains/preload later once the staff-app subdomain is
  also live on HTTPS).
- **www → apex redirect:** Rules → **Redirect Rules** → redirect `www.turbokeysmith.com/*` to
  `https://turbokeysmith.com/$1` (301). (Keeps one canonical address; matches the `canonical` tags.)

## Step 8 — Post-launch
- In **Google Search Console**, confirm the property still verifies and **resubmit `sitemap.xml`**.
- Spot-check a few pages over the next day. Done.

## Step 9 — Staff app (separate, later)
The staff app is also static and can go on **`app.turbokeysmith.com`** as a **second Pages project**
(deploy the repo root, or a copy without `site/`). Before doing that:
- Keep it **`noindex`** (it's private).
- Add `https://app.turbokeysmith.com` to **Supabase → Auth → URL Configuration** (redirect URLs) so
  staff sign-in works from the new address.
- Add it as an allowed **origin/CORS** for the Stripe payment **edge functions**.
- Re-test payments end-to-end (still TEST mode) from the new address.
This is its own mini-runbook — do it only after the public site is live and stable.

---

### Quick mental model
GoDaddy = *where the domain is registered* (and your email mailbox lives). Cloudflare = *DNS + CDN +
hosting*. You're moving the second job to Cloudflare and leaving the first at GoDaddy. Email keeps
working **as long as Step 2's MX/TXT records are correct** on Cloudflare.
