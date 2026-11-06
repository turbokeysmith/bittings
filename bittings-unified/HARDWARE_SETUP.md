# Shop Hardware Setup & Test — Bittings web app

Three peripherals wired into the staff web app via `app/hardware.js` (loaded in `index.html`).
Device settings are **per-workstation** (saved in this browser's localStorage), opened from
**Inventory → 🖨️ Hardware**. Everything has a **hardware-free preview** so you can see the
output format before anything is plugged in.

> Where the code lives: `bittings-unified/` (the active source). The stale `bittings-deploy/`
> copy is NOT updated. Serve/run `bittings-unified/index.html`.

> **Recommended:** run the app from `http://localhost` on the same PC as the printers. Both
> printer SDKs talk to local services, and a plain-HTTP/localhost page avoids the HTTPS
> "mixed content / local network" blocking that otherwise trips up browser→local-printer calls.

---

## 1) Barcode scanner — scan-to-ticket (no driver, no SDK)

**How it works:** a USB scanner in **keyboard (HID) mode** "types" the barcode then sends Enter.
`app/hardware.js` watches for that fast burst and, when the **Register (Payments)** screen is
open, looks the code up in inventory **by SKU** and adds the part to the ticket (same pricing as
the manual "📦 Part" picker — priced parts add directly; unpriced parts prompt for a price). When
the **Inventory** screen is open instead, the scan fills the search box.

**Setup**
1. Put the scanner in **USB-HID / keyboard-wedge** mode (factory default for most; if not, scan the
   "USB HID Keyboard" config barcode from its manual).
2. Set the **suffix to Enter / CR** (also usually default).
3. In the app: **Inventory → 🖨️ Hardware → Barcode scanner → Enable** (on by default).

**Test (no register needed)**
- Open **🖨️ Hardware**, click into the **Test** field, and scan any barcode — it should echo
  "✓ scanned: …".
- Then open the **Register**, make sure a part in Inventory has that barcode as its **SKU**, and
  scan — the part should drop onto the ticket.
- Tuning: if fast human typing ever registers as a scan, lower nothing — the burst detector keys on
  speed; real keyboards never burst. Minimum length is 3 chars.

---

## 2) Star TSP100 + cash drawer — thermal customer receipt (WebPRNT)

### ⚠️ Important hardware reality (verified against Star docs)
**No TSP100 has a built-in WebPRNT web server** — not the USB model, not the TSP100III LAN, not the
TSP100IV. You **cannot** POST directly to `http://<printer-ip>/StarWebPRNT/SendMessage` (that only
works on Star's WebPRNT-*native* models like the TSP650II/mC-Print). For a TSP100 you run a **Star
WebPRNT host service** on the POS PC, and the app POSTs to that **local** endpoint. Also: TSP100
speaks **StarPRNT, not ESC/POS** — the app builds StarPRNT markup via Star's JS SDK; the
**cash-drawer kick** rides on the same print job.

### What to download (put JS files in `bittings-unified/app/vendor/`)
- **Star Web SDK** — `StarWebPrintBuilder.js` + `StarWebPrintTrader.js`
  → https://github.com/star-micronics/starwebprnt-sdk
- **futurePRNT** (TSP100/143 driver + config utility, configures the drawer too)
  → Star Micronics support → TSP100 futurePRNT software
- **A WebPRNT host endpoint on the POS machine** — the **Star WebPRNT Browser** app (or Star's
  WebPRNT host service) that exposes `http://localhost:8001/StarWebPRNT/SendMessage` and relays to
  the USB/LAN printer. (If you later buy a WebPRNT-native printer, you skip the host service and point
  the endpoint at the printer's IP instead.)

### Enable in the app
1. Drop the two Star JS files in `app/vendor/`, then **uncomment** these lines in `index.html`
   (just below `<script src="app/hardware.js">`):
   ```html
   <script src="app/vendor/StarWebPrintBuilder.js"></script>
   <script src="app/vendor/StarWebPrintTrader.js"></script>
   ```
2. **Inventory → 🖨️ Hardware → Star TSP100 →** Enable, set **WebPRNT endpoint** (default
   `http://localhost:8001/StarWebPRNT/SendMessage`), choose **48 columns** (80mm) or 32 (58mm),
   keep **Kick cash drawer on print** on. Leave **Print shop logo OFF** until you confirm the text
   receipt prints, then turn it on and re-test.

### Test
- **No hardware:** click **Preview** — you'll see the exact 48-col receipt layout (header from your
  shop identity, line items, totals, payment, footer, a scannable receipt-number barcode).
- **With hardware:** **Test print** sends a sample receipt and kicks the drawer. Then from the
  **Register**, build a ticket and tap **🖨️ Receipt**.
- If you get a WebPRNT/mixed-content error: serve the app from `http://localhost`, and confirm the
  Star host service is running and its port matches your endpoint.

### Cash drawer
The drawer plugs into the **printer's** RJ11/RJ12 port. The kick (`channel 1, 200/200ms pulse`) is
appended to the same job, so it opens when the receipt prints. (You can also enable drawer-open in
futurePRNT as a backup.)

---

## 3) Zebra ZD421 — inventory barcode/SKU labels (ZPL)

**How it works:** a browser can't reach USB or raw TCP, so Zebra's **Browser Print** helper app runs
locally and the page sends **raw ZPL** through it. The app builds a label = **Code-128 barcode of the
SKU + human-readable SKU + wrapped part name**, sized from the label dimensions you set.

### What to download (put JS files in `bittings-unified/app/vendor/`)
- **Zebra Browser Print** app (local helper, exposes `https://localhost:9101`)
  → https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html
- **BrowserPrint SDK** JS (bundled with the download): `BrowserPrint-3.x.min.js` +
  `BrowserPrint-Zebra-1.x.min.js`
- **ZD421 driver / Zebra Setup Utilities** (USB) → Zebra support.

### Enable in the app
1. Drop the two BrowserPrint JS files in `app/vendor/`, then **uncomment** in `index.html`
   (match the real version numbers in your download):
   ```html
   <script src="app/vendor/BrowserPrint-3.1.250.min.js"></script>
   <script src="app/vendor/BrowserPrint-Zebra-1.1.250.min.js"></script>
   ```
2. **Inventory → 🖨️ Hardware → Zebra ZD421 →** Enable. Click **Refresh printers**, pick the ZD421
   (or leave "OS default"). Set **DPI** (203 for most ZD421; **confirm on a config label** — 300 dpi
   units need DPI=300), **label size** (default 2.25×1.25 in), **darkness** (~20), **speed** (3 ips).

### Test
- **No hardware:** **Preview ZPL** shows the generated ZPL — paste it into
  https://labelary.com/viewer.html (set 8 dpmm / 203 dpi, 2.25×1.25) to see the rendered label.
- **With hardware:** load labels, run **SmartCal** (hold FEED until it flashes ~twice) so the printer
  learns the gap, set the right **media type** (Direct Thermal vs Thermal Transfer) in the driver,
  then click **Test label**. Once it prints, a **🏷️** button appears on every Inventory row — tap it
  to print that part's label.
- If barcodes scan poorly, raise **darkness** a few points and/or drop **speed**; re-calibrate after
  changing label stock.

---

## Quick reference — where things are
- Module: `app/hardware.js` → `window.TKS_HW` (`.scanner`, `.thermal`, `.labels`, `.openSettings()`).
- Settings UI: **Inventory → 🖨️ Hardware**. Register: **🖨️ Receipt**. Inventory rows: **🏷️**.
- Vendor SDKs: `app/vendor/` (not committed; you download them). Script tags are pre-written
  (commented) in `index.html`.
- Previews work with **no hardware and no SDKs** — use them to sign off on the layouts first.
