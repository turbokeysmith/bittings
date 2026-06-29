# Assistant instructions — Turbo Keysmith repo

## 🗂️ Repo structure & how the site is maintained (read this first)
- Repo folder: **`turbokeysmith-main/`**. Two product folders: **`website/`** (the public site) and
  **`bittings-unified/`** (the staff app — the active source tree). App-specific docs are in
  **`bittings-unified/docs/`**, dev/data/pitch tooling in **`bittings-unified/tools/`**. Shared whole-project
  docs live at the repo root; **`_archive/`** holds retired material (incl. the stale earlier `bittings-app/`
  copy) — never edit anything under `_archive/`.
- **The public site is hand-maintained static HTML in `website/site/`** — the single source of truth. Edit those
  files directly. **There is NO build step and NO generator.** The old page generator is **RETIRED and is not in
  this repo** (archived locally, never committed); it was out of sync with the live site — **do NOT run any generator.**
- Deploy the public site with: `npx wrangler pages deploy website/site --project-name=turbokeysmith --branch=main`
  (run from `turbokeysmith-main/`; always `--branch=main` for production).

## ⚠️ Keep the handoff docs current — do this automatically
After **any major change** to this project, you MUST update **both** of these files in the
**same commit as the work** so they always reflect the current state. The owner uploads them to
a separate planning assistant, so they must never go stale:

1. **`PROJECT_HANDOFF.md`** (repo root) — the single-file, **plain-language** overview of the
   whole project (public website + staff app + cloud). This is the file the owner uploads. Keep
   it self-contained and non-technical (the owner is not a developer).
2. **`bittings-unified/app/STRUCTURE_NOTES.md`** — the deeper technical notes on the staff app + cloud wiring.

### What counts as a "major change" (update the docs)
- New or removed feature/page/tile/screen
- Anything about how/where data is stored (localStorage ↔ cloud, schema, new tables)
- A stub getting wired up, or a new stub/placeholder added
- A change to the open decisions or what's pending
- Branch/deploy changes

### Skip the docs for
- Typos, copy tweaks, pure styling nudges, comment-only edits.

### Rules
- Update the docs **with** the change, not "later."
- In `PROJECT_HANDOFF.md`: bump the **"Last updated"** line (get the real date/time, e.g.
  `date "+%Y-%m-%d %H:%M %Z"`) and add a dated bullet under the **Changelog** (section 11,
  newest first; group entries under the date heading).
- When you finish a batch of work, end by confirming both files were updated (or say why not).
- Keep `PROJECT_HANDOFF.md` plain-language; put technical depth in `bittings-unified/app/STRUCTURE_NOTES.md`.

## 📱 Mobile verification is mandatory before anything is "done"
**Standing rule — applies to EVERY feature, change, or build, with no exceptions.** Before you mark
anything done, it must be verified to work on **BOTH iPhone (Safari) and Android (Chrome)**, for
**an owner AND a signed-in staff member**. The whole staff app + receipt builder are used on phones
in the field — desktop-only "works" is not acceptable.

"Works on mobile" means, on a small phone, one-handed:
- It **fits and scrolls**; nothing overflows horizontally or gets cut off.
- **Tap targets are usable** one-handed — nothing too small or cramped to tap reliably.
- **Forms, dropdowns/selects, and inputs work by touch** — no keyboard, mouse, or hover required.
- **Nothing depends on hover** or a mouse (tooltips/`title=` are fine as extras, never as the only way).
- **Owner-gating still holds on mobile** — an owner sees owner-only tools; a signed-in staff member is
  blocked exactly as on desktop.

**Honesty requirement:** if you cannot actually run a platform in your environment (you usually can't
run real iPhone Safari / Android Chrome), **say so plainly** and give the owner **exact, numbered test
steps** for **both platforms × both roles**. **Never mark something done on assumption.** Until a real
device (or the owner) confirms it, the status is at most **"code-complete, pending mobile sign-off"** —
reflect that wording in the handoff/task list, not "done."
