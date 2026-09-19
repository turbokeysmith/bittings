# Turbo Keysmith

This repo (`turbokeysmith-main/`) holds **two products**, split into two top-level folders, in **one git history**:

- **`website/`** — the public marketing website, **live at https://turbokeysmith.com** (hand-maintained static
  HTML in `website/site/`, served by **Cloudflare Pages**). Includes the blog at `/blog/` ("Notes from the Key
  Man"), the FAQ, 25 metro city pages, and a Spanish `/es/` mirror.
- **`bittings-app/`** — the **Bittings staff app** (still in active development): `index.html`, `bittings.html`,
  `scheduler.html`, `lishi.html`, `programmers.html`, `setup.html`, `cloud-test.html`, plus `app/` (the data
  layer, UI kit, Lishi/programmer seeds) and `supabase/` (cloud sync + Stripe payment edge functions).

Shared project docs live at the repo root — start with **`PROJECT_HANDOFF.md`** (plain-language overview of the
whole project) and **`turbo_master_task_list.md`** (status of every track).

## Deploying the public site
The site is **hand-maintained static HTML** — there is **no build step and no generator** (the old page generator
is retired/archived to `_archive/_build-generator-RETIRED/`; do **not** run it). To publish:

```
node website/_tools/deploy-site.mjs
```

That runs a **Google Analytics check first** (every page must carry GA4 tag `G-8LY4YD2YFG` in its `<head>`) and
refuses to deploy if any page is missing it; then it runs `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`. Use
`node website/_tools/deploy-site.mjs preview` for a preview deploy. Check by hand any time with `node website/_tools/ga-tag.mjs`;
add the tag to new pages with `node website/_tools/ga-tag.mjs --fix` (snippet source: `website/_tools/ga-snippet.html`).
Always use `--branch=main` for production. After editing `website/site/assets/styles.css`, bump the `?v=N` version
on the CSS link site-wide so returning visitors get the new styles (cache-busting).

> Internal planning and business-strategy docs are kept in a private workspace, not in this repo.
