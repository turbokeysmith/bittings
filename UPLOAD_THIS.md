# Put your two apps online (one tile page that opens both)

You now have **one folder** with everything. Uploaded together to your
existing `bittings` repo, the tile page becomes the front door and both
apps share the same contact list automatically.

## The files (upload ALL of them, keep the names exactly)
- `index.html` ........ the NEW tile page (this is what opens first)
- `bittings.html` ..... your Bittings app (the blank/public one)
- `scheduler.html` .... your scheduler
- `bittings_logo.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` ... icons

> Do NOT upload your *personal* pre-filled bittings file here. The
> `bittings.html` in this folder is the blank public one on purpose —
> it has none of your license/address baked in.

## Upload steps (about 3 minutes)
1. Go to your `bittings` repo on github.com.
2. Click **Add file → Upload files**.
3. Drag in **all 7 files** above at once (not the .zip — GitHub won't
   unzip it). If GitHub asks to replace the old `index.html`, say yes —
   that's the swap from "Bittings at the root" to "tile page at the root."
4. Scroll down, click **Commit changes**.
5. Wait 1–2 minutes, then open `https://turbokeysmith.github.io/bittings/`
   — you should see the tile page.

## What the tile page does
- **Open Bittings** or **Open Scheduler** — big buttons, one tap each.
- **ON / OFF toggle** (top-right of each tile) — tap it to deactivate
  that app. Turned-off tiles grey out and can't be opened until you
  turn them back on. (This is just a front-door switch on your device;
  it doesn't delete anything.)
- After opening an app, your browser's **Back** button returns to the
  tile page.

## Test it (do this once)
1. Open the tile page → Open **Scheduler** → add a contact / booking.
2. Back to the tile page → Open **Bittings** → check the customer list.
   The name should be there. That confirms the shared contact list works.

---
### Notes for next session (things we left open on purpose)
- The tile page is the new root URL. Your **AKS demo script** points people
  to `…/bittings/` expecting Bittings directly — it now shows the tile page
  first. Say the word and I'll swap the names so Bittings stays at the root.
- Neither app's code was changed — byte-for-byte identical to what you
  uploaded. The only new file is `index.html` (the tile page).
- If you'd like a small "🏠 Home" button *inside* each app (instead of
  using the browser Back button), that's a tiny edit to the apps — I left
  it out since you said don't change anything else.
