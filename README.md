# Turbo Keysmith

This repo (`turbokeysmith-main/`) holds **two products**, split into two top-level folders, in **one git history**:

- **`website/`** — the public marketing website, **live at https://turbokeysmith.com** (hand-maintained static
  HTML in `website/site/`, served by **Cloudflare Pages**). Includes the blog at `/blog/` ("Notes from the Key
  Man"), the FAQ, 25 metro city pages, and a Spanish `/es/` mirror.
- **`bittings-unified/`** — the **Bittings staff app** (the active source tree; still in active development):
  `index.html`, `bittings.html`, `scheduler.html`, `lishi.html`, `programmers.html`, `setup.html`,
  `cloud-test.html`, plus `app/` (the data layer, UI kit, Lishi/programmer seeds, hardware module) and
  `supabase/` (cloud sync + Stripe payment edge functions). App-specific docs live in **`bittings-unified/docs/`**
  and one-off dev/data/pitch tooling in **`bittings-unified/tools/`**.

`_archive/` holds retired material kept for reference only — the **stale earlier app copy** (`_archive/bittings-app/`,
superseded by `bittings-unified/`) and snapshots. Don't edit anything under `_archive/`.

Shared, whole-project docs live at the repo root — start with **`PROJECT_HANDOFF.md`** (plain-language overview of
the whole project) and **`turbo_master_task_list.md`** (status of every track). Website-specific docs
(`DEPLOY_CLOUDFLARE.md`, `SITE_PAGES_AUDIT.md`) live in **`website/`**.

## Deploying the public site
The site is **hand-maintained static HTML** — there is **no build step and no generator** (the old page generator
is retired and is **not in this repo** — there is nothing to run). To publish:

```
npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main
```

Always use `--branch=main` for production. After editing `website/site/assets/styles.css`, bump the `?v=N` version
on the CSS link site-wide so returning visitors get the new styles (cache-busting).

> Internal planning and business-strategy docs are kept in a private workspace, not in this repo.
