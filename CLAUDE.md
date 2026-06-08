# Assistant instructions — Turbo Keysmith repo

## ⚠️ Keep the handoff docs current — do this automatically
After **any major change** to this project, you MUST update **both** of these files in the
**same commit as the work** so they always reflect the current state. The owner uploads them to
a separate planning assistant, so they must never go stale:

1. **`PROJECT_HANDOFF.md`** (repo root) — the single-file, **plain-language** overview of the
   whole project (public website + staff app + cloud). This is the file the owner uploads. Keep
   it self-contained and non-technical (the owner is not a developer).
2. **`app/STRUCTURE_NOTES.md`** — the deeper technical notes on the staff app + cloud wiring.

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
- When you finish a batch of work, end by confirming both files were updated (or say why not).
- Keep `PROJECT_HANDOFF.md` plain-language; put technical depth in `app/STRUCTURE_NOTES.md`.
