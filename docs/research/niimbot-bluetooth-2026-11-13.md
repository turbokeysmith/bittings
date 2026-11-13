# Printing to NIIMBOT Bluetooth label printers from a browser PWA

Research date: 2026-11-13. Web research only. Every claim has a source URL. "Not confirmed" means no source found. Where sources disagree, both are shown.
Data pulled from GitHub/npm/jsDelivr APIs is as of 2026-11-13.

## 1. Browser and platform support

### 1.1 Web Bluetooth (BLE)

| Platform / browser | Status | Source |
|---|---|---|
| Chrome, Windows | Supported. Chrome desktop 56-160 per caniuse. Implementation-status doc says it needs Windows 10 1703 (scanning notes say 1706; the doc is inconsistent). Chrome docs say Windows 10 with Chrome 70. | https://caniuse.com/web-bluetooth ; https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md ; https://developer.chrome.com/docs/capabilities/bluetooth |
| Edge, Windows | Supported from version 79. | https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md ; https://caniuse.com/web-bluetooth |
| Chrome, Android | Supported (Android 6.0+). Also Edge, Opera, Samsung Internet. Bluetooth and Location must be on or the chooser opens empty. Open in Chrome itself; an in-app WebView may not expose Web Bluetooth. | https://developer.chrome.com/docs/capabilities/bluetooth ; https://github.com/iscarelli/niimbot-web-bluetooth (README "Requirements") |
| Chrome, macOS | Supported (OS X Yosemite or later; some Macs without BLE may not work). | https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md |
| Safari, macOS | Not supported, "no plan to support it in the near future". | https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md ; https://caniuse.com/web-bluetooth |
| Safari, iOS/iPadOS | Not supported. caniuse notes a third-party Safari extension (iOSWebBLE) can add `navigator.bluetooth`. | https://caniuse.com/web-bluetooth |
| Chrome/Edge on iPhone | Not supported. "no implementation planned in the Chromium codebase" for iOS. The iscarelli README says every iOS browser is WebKit, so Chrome/Edge for iPhone do not have it either (the README's reasoning, not independently verified). | https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md ; https://github.com/iscarelli/niimbot-web-bluetooth |
| Firefox (any platform) | Not supported. | https://caniuse.com/web-bluetooth |
| Chrome on Linux | "partially implemented and not supported"; needs flag. | https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md |

Requirements:
- Secure context (HTTPS) only. MDN: "The Web Bluetooth API can only be used in a secure context." https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API . localhost counts as secure (stated in the iscarelli README).
- User gesture: `requestDevice()` needs transient activation (MDN, same page). Chrome docs say it must be triggered by a gesture such as `pointerup`, `click`, `touchend`. https://developer.chrome.com/docs/capabilities/bluetooth
- Permission: the user must grant explicit permission in a browser chooser each time for a new device. Previously granted devices can be re-fetched with `getDevices()` (MDN). Whether `getDevices()` works without a flag in current Chrome is not confirmed by the sources read.
- Permissions Policy `bluetooth` defaults to `self`; matters only if embedded in an iframe (MDN).
- Not available in Web Workers (MDN).
- With name or manufacturer filters or `acceptAllDevices`, any service you need must be listed in `optionalServices`, otherwise you get an error later (Chrome docs).
- MDN flags the API as "Limited availability" and "Experimental".
- Behaviour of Web Bluetooth inside an installed PWA window (as opposed to a browser tab): not confirmed. NiimBlue's wiki mentions that confirmation dialogs do not work when NiimBlue is installed as a PWA (https://github.com/MultiMote/niimblue/wiki), which is a different problem.

### 1.2 Web Serial (USB cable, or Bluetooth Classic serial)

| Platform | Status | Source |
|---|---|---|
| Chrome/Edge desktop (Windows, macOS, Linux, ChromeOS) | Supported from Chrome 89. | https://developer.chrome.com/docs/capabilities/serial ; https://caniuse.com/web-serial |
| Firefox desktop | caniuse lists support from 151. Not independently verified. | https://caniuse.com/web-serial |
| Chrome Android | **Sources disagree.** caniuse lists Chrome for Android 157 as supported. Chrome's article says only that USB serial on Android is "possible using the WebUSB API" via a polyfill. | https://caniuse.com/web-serial vs https://developer.chrome.com/docs/capabilities/serial |
| Safari macOS / iOS | Not supported. | https://caniuse.com/web-serial |

- Secure context required; `requestPort()` needs a user gesture (MDN: https://developer.mozilla.org/en-US/docs/Web/API/Serial/requestPort).
- NiimBlueLib's serial client opens the port with `baudRate: 115200` (source: https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/client/serial_impl.ts). The wiki says the USB serial packet format matches Bluetooth; packets may arrive fragmented (https://printers.niim.blue/interfacing/connecting/).
- Which models have a USB port: the library issue thread has users printing over USB for B3S, B21 Pro, D11_H (https://github.com/MultiMote/niimbluelib/issues/1). A list of USB-capable models: not confirmed.
- Bluetooth Classic via Web Serial: MDN documents `bluetoothServiceClassId` filters and says Bluetooth ports with custom service class IDs are excluded unless listed in `allowedBluetoothServiceClassIds`. Per-browser support is not stated in the fetched text. The wiki notes that the D110 has two Bluetooth addresses (BLE and Classic) (https://printers.niim.blue/interfacing/connecting/). No source found showing a NIIMBOT printed to over Web Serial via Classic Bluetooth in a browser: **not confirmed**.

### 1.3 iPhone/iPad routes

| Route | Status | Source |
|---|---|---|
| Bluefy browser (PNN Soft) | Free app, "Web BLE Browser". Requires iOS 12.0+. Sites must be HTTPS. Version 3.9.3 (early 2026 per the page, year not displayed), 4.8/5 from 1.3K ratings. Earlier versions had BLE connectivity fixes (3.8.5, 11/2023). | https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055 |
| Bluefy + NIIMBOT | One independent report: iPhone + Bluefy + B1 Pro printed single, 5-label and 3-label batches correctly on 2026-08-11 using the iscarelli driver. Requires paced (not unacked-burst) writes; fast writes dropped rows and reported success. B1 and M2-H on iOS not tried. | https://github.com/iscarelli/niimbot-web-bluetooth (README "iOS coverage") |
| iOSWebBLE / WebBLE (Safari extension or app) | Exist per caniuse and the implementation-status doc. Not tested with NIIMBOT in any source read. | https://caniuse.com/web-bluetooth ; https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md |
| NiimBlue iOS | Listed on the NiimBlue wiki as an "experimental" standalone app linked to PR #62; no details. The NiimBlue README names a third-party extension "beacio" for Safari. | https://github.com/MultiMote/niimblue/wiki ; https://github.com/MultiMote/niimblue |
| Official NIIMBOT app (iOS), v6.7.0 | Store text says it supports "picture" recognition among intelligent input modes and design materials. **Whether it can import a photo from the library or receive an image through the iOS Share sheet: not confirmed.** A D11 manual snippet says the app lets you "Insert simple images onto your labels" but gives no steps. Support contact mentioned in the store reviews is service@niimbot.com. | https://apps.apple.com/us/app/niimbot/id1359104615 ; search results for D11 manuals via https://manuals.plus |

## 2. Open-source implementations

| Project | Repo | Language | Licence | Status (2026-11-13) | Models | Browser? |
|---|---|---|---|---|---|---|
| **NiimBlueLib** (`@mmote/niimbluelib`) | https://github.com/MultiMote/niimbluelib | TypeScript | MIT, "Copyright (c) 2024 MultiMote" (standard MIT text, verified at https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.49.1/LICENSE) | Active. Latest v0.49.1 (2026-11-05); last push 2026-11-08; releases 0.48.0 (10-30), 0.49.0 (11-01). Not archived. 146 stars. 3 open issues. | Library has metadata for about 80 models (list in `printer_models.ts`). Tested-models thread: https://github.com/MultiMote/niimbluelib/issues/1 | Yes: Web Bluetooth client, Web Serial client, Capacitor BLE client, virtual client |
| **NiimBlue** (web app) | https://github.com/MultiMote/niimblue (live at niim.blue) | TypeScript | MIT | Active. Last push 2026-11-13. 833 stars. | No published model list; tested list is in the lib issue | Yes: full label designer, works as a PWA |
| **niimbot-web-bluetooth** | https://github.com/iscarelli/niimbot-web-bluetooth | JavaScript, zero dependencies, no build | MIT, "Copyright (c) 2026 iscarelli" | Active, young: created 2026-06-03; v2.6.0 on npm (2026-09-11); last push 2026-11-02. 44 stars. | Validated on hardware: B1, B1 Pro, B2 Pro, M2-H, D11_H, D110, N1. D110_M identified but not printed. B21, B21 Pro, D11, B21S "likely compatible but untested". **D101, B3S, B18 not listed.** | Yes: Web Bluetooth only (no Web Serial) |
| **niimprint** (original) | https://github.com/kjy00302/niimprint | Python | MIT | Unmaintained ("Please use fork instead"); last push 2023-12-15. | Tested on D11 | No |
| **niimprint** (fork) | https://github.com/AndBondStyle/niimprint | Python | MIT | Last push 2026-03-15. 477 stars. | D11, B21, B1 via Bluetooth or USB (repo description) | No |
| NiimPrintX | https://github.com/labbots/NiimPrintX | Python | GPL-3.0 | Last push 2026-05-17 | D11, B21, B1, D110, B18 (repo description) | No |
| printrow | https://github.com/slastra/printrow | Svelte/TypeScript | MIT | Last push 2026-11-03; 5 stars | KNAON Y50P and NIIMBOT B1 | Yes (Web Bluetooth) |
| niimbotjs, niimblue-node, others | listed at https://printers.niim.blue/other/third-party-software/ | TS/JS | "Not declared" for niimbotjs and niimblue-node per the wiki table | Not checked | Node, not browser | No |

The wiki's third-party list (https://printers.niim.blue/other/third-party-software/) is the community index.

NiimBlueLib README warns: "This project is intended for informational and educational purposes only. The project is not affiliated with or endorsed by the original software or hardware vendor." https://github.com/MultiMote/niimbluelib

### Prebuilt single-file browser bundle

**Yes, for NiimBlueLib.** The README documents CDN use:
`<script src="https://unpkg.com/@mmote/niimbluelib@VERSION/dist/umd/niimbluelib.min.js"></script>`, global namespace `niimbluelib` (e.g. `new niimbluelib.NiimbotBluetoothClient()`). Source: https://github.com/MultiMote/niimbluelib

Verified on jsDelivr for the exact version: https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.49.1/dist/umd/niimbluelib.min.js returns HTTP 200, 127,031 bytes (unminified `niimbluelib.js` is 272,337 bytes). File list from https://data.jsdelivr.com/v1/packages/npm/@mmote/niimbluelib@0.49.1?structure=flat . The UMD file bundles its dependencies: I saw `@capacitor/core` and `crc-32` code inside it (https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.49.1/dist/umd/niimbluelib.js). Note that bundled Capacitor code sets `window.Capacitor` on load (line `initCapacitorGlobal(...)` in that file); a side effect to be aware of. Whether that interferes with a normal PWA: not confirmed.

Package metadata: https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.49.1/package.json (dependencies: `@capacitor-community/bluetooth-le`, `@capacitor/core`, `async-mutex`, `crc-32`, `eventemitter3`). Version cadence is high (0.46.0 to 0.49.1, three releases in a week in late Oct/early Nov 2026), so pin an exact version.

Docs: https://libdocs.niim.blue . Live example: https://libdocs.niim.blue/example . Example code: https://github.com/MultiMote/niimbluelib/blob/main/example/main.js

**Single-file alternative:** niimbot-web-bluetooth is a single file `src/niimbot.js`, 89,783 bytes in v2.6.0, no dependencies, exposes `window.Niimbot` (https://cdn.jsdelivr.net/npm/niimbot-web-bluetooth@2.6.0/src/niimbot.js returns 200; README at https://github.com/iscarelli/niimbot-web-bluetooth). Usage per README: `Niimbot.printImage(url, { model, size, copies })` from a click handler. It is not minified (no `.min.js` seen in the file list).

## 3. The protocol

Primary source: the community wiki by the NiimBlueLib author. Pages: https://printers.niim.blue/interfacing/proto/ , https://printers.niim.blue/interfacing/print-tasks/ , https://printers.niim.blue/interfacing/connecting/ . Where the wiki text was ambiguous I checked NiimBlueLib source on GitHub raw (`src/print_tasks/*.ts`, `src/utils/image_encoder.ts`, `src/client/bluetooth_impl.ts`). The wiki itself notes its own inconsistencies (see 3.5).

### 3.1 BLE

- Service `e7810a71-73ae-499d-8c15-faa9aef0c3f2`, characteristic `bef8d6c9-9c21-4c9e-b632-bd58c1009f9f`. "Most NIIMBOT printers use this pair." Source: https://printers.niim.blue/interfacing/connecting/
- Generic discovery: look for a service whose UUID is longer than 4 hex chars, with a characteristic having NOTIFY and WRITE_NO_RESPONSE. Subscribe to notifications for replies, write without response to send. Same page.
- Web Bluetooth cannot enumerate unknown services: "you must set service UUID in filter before devices searching" (same page). NiimBlueLib requests the device with `namePrefix` filters (first letters of all known model names) plus a `services` filter with the UUID above (`bluetooth_impl.ts`, https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/client/bluetooth_impl.ts).
- **Exception found:** B21_C2B (model id 771, HW 39.01 / FW 39.06) exposes its data channel under service `0000e0ff-3c17-d293-8e48-14fe2e4da212`, characteristic `0000ffe1-0000-1000-8000-00805f9b34fb` (write, writeWithoutResponse, notify), and does **not** have the e7810a71 service. NiimBlue fails with "No Services found" until that UUID is added to `optionalServices`. The reporter says it then prints correctly. Source: https://github.com/MultiMote/niimblue/issues/178 (open, 2026-11-07, single user report).
- Writes: NiimBlueLib uses `writeValueWithoutResponse` with a configurable delay between packets (`packetIntervalMs`) and retries GATT connect (comment: `NetworkError: GATT Server is disconnected` "Trying again usually works"). Source: `bluetooth_impl.ts`, link above. iOS/Bluefy and macOS drop unacknowledged bursts, so pacing is needed (https://github.com/iscarelli/niimbot-web-bluetooth README). That README also suggests a CoreBluetooth cap of about 182 bytes per unacked write; marked there as a untested concern ("commonly caps ... near 182 bytes").
- The printer needs a regular heartbeat: NiimBlueLib sends `Heartbeat (0xDC)` every 2000 ms by default (https://printers.niim.blue/interfacing/proto/). A user in the tested-models thread reports "no heartbeat no second print, once heartbeat is on it works" (https://github.com/MultiMote/niimbluelib/issues/1).

### 3.2 Packet framing

From https://printers.niim.blue/interfacing/proto/:

```
55 55 | CMD | LEN | DATA... | CS | AA AA
```
- CS = XOR of every byte from CMD through the last data byte.
- Only `Connect` (0xC1) has an extra prefix byte `0x03` before the header. A real captured example: `03 55 55 c1 01 01 c1 aa aa`, reply `55 55 c2 01 01 c2 aa aa` (https://github.com/MultiMote/niimblue/issues/178).
- Simple request (LEN=1, DATA=01): `55 55 CMD 01 01 CMD AA AA`.
- Image-gray packet (0x8D) uses a 16-bit big-endian length. Firmware uploads use a CRC32 variant. Neither needed for plain printing.

### 3.3 Commands (hex request IDs, from the wiki)

| ID | Name | Reply |
|---|---|---|
| 0x01 | PrintStart | 0x02 |
| 0x03 | PageStart | none listed |
| 0x13 | SetPageSize | 0x14 |
| 0x15 | PrintQuantity | 0x16 |
| 0x20 | PrintClear (named in the print-tasks page; its ID is listed there as `PrintClear (0x20)`) | not stated |
| 0x21 | SetDensity | 0x31 |
| 0x23 | SetLabelType | 0x33 |
| 0x83 / 0x84 / 0x85 | PrintBitmapRowIndexed / PrintEmptyRow / PrintBitmapRow (one-way, no reply) | none |
| 0xA3 | PrintStatus | 0xB3 |
| 0xC3 | PrinterFree | 0xC4 |
| 0xDC | Heartbeat | 0xDE/DF/DD/D9 |
| 0xE3 | PageEnd | 0xE4 |
| 0xF3 | PrintEnd | 0xF4 |

Payload formats (wiki):
- SetDensity: `55 55 21 01 VV CS AA AA`. SetLabelType: `55 55 23 01 VV CS AA AA`. Valid ranges are per model (see section 4; the wiki print-task page gives no ranges).
- PrintStart variants: 1-byte (D110, D11 old, B21 v1): `55 55 01 01 01 01 AA AA`. 7-byte (B1 and newer): `55 55 01 07 PH PL 00 00 00 00 CC CS AA AA` (PH PL = total pages u16 big-endian, CC = page colour, 0 = single). 9-byte (D110M v4, B21 Pro) adds speed (0 = quality, 1 = fast) and a flag of unknown purpose.
- SetPageSize: 4-byte `55 55 13 04 RR RR CC CC CS AA AA` (rows, columns), 6-byte adds copies (u16), longer forms add cut height/type etc. "Column count must not exceed the printhead pixel width."
- PrintQuantity: `55 55 15 02 QH QL CS AA AA`.
- PrintEmptyRow: `55 55 84 03 RR RR NN CS AA AA` (row number u16, repeat count).
- PrintBitmapRow: `55 55 85 LL RR RR C1 C2 C3 NN DD... CS AA AA`: row number u16, three black-pixel-count bytes, repeat count, then cols/8 data bytes. The wiki says all three count bytes at 0 "usually work" (not guaranteed for all models).
- PrintBitmapRowIndexed (0x83): for rows with 6 or fewer black pixels; list of u16 pixel indices. Optional optimisation; 0x85 works for all rows.
- PrintStatus reply 0xB3: page index (u16), print progress 0-100, feed progress 0-100, optional error code.
- PrintEnd reply 0xF4: `01` finished, `00` still printing.
- During printing the printer sends `PrinterCheckLine` (0x86 / reply id 0xD3) every 200 rows.

### 3.4 Print sequences per task variant

Source: https://printers.niim.blue/interfacing/print-tasks/ and NiimBlueLib source (D110 task: https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/print_tasks/D110PrintTask.ts).

| Task | Used by (per wiki) | Sequence |
|---|---|---|
| D11_V1 | "old D11 models" | SetDensity, SetLabelType, PrintStart(1b); per page: PrintClear, PageStart, SetPageSize(rows), PrintQuantity, rows, PageEnd; poll page-index until = total pages; PrintEnd |
| **D110** | "203 DPI D110, D11" | SetDensity, SetLabelType, PrintStart(1b); per page: PrintClear, PageStart, SetPageSize(rows, cols), PrintQuantity(n), image rows, PageEnd; poll PrintStatus until pageIndex = total pages; PrintEnd |
| B21_V1 / B21_L2B | models not named on the wiki | PrintStart(1b); per page: PageStart, SetPageSize(rows, cols), rows, PrinterCheckLine every 200 lines, PageEnd; poll PrintEnd until 0xF4 = 1. No quantity field. L2B variant polls PageStart/PageEnd replies. |
| **B1** | "most printers released in 2024" | SetDensity, SetLabelType, PrintStart(7b: totalPages, pageColor); per page: PageStart, SetPageSize(rows, cols, **copies**), rows, PageEnd; poll PrintStatus; PrintEnd |
| H1S | not stated beyond name | like B1 plus cut height/type in SetPageSize |
| **D110M_V4** | "most printers released in 2025" | SetLabelType **before** SetDensity; optional TubeTypeAndWidth (0x0F) and HalfCut (0x5C); PrintStart(9b); per page: PrintStatus (one-way), SetPageSize(13-byte form incl. 32-byte serial), rows, PageEnd; poll PrintStatus; PrintEnd; Heartbeat (one-way) |

Note: the wiki's sequences list "SetDensity, SetLabelType" as common steps; the D110 source file sends them in `printInit` before PrintStart.

Quirk: on B21_PRO over Bluetooth the printer "drops the first packet after PrintStart" and after PrintEnd, so the next packet is sent without waiting for a reply (print-tasks page).

How a task is chosen: NiimBlue offers a manual choice in the print dialog with a "Lock" button and says "if printing fails, try different print task versions" (https://github.com/MultiMote/niimblue). The library has a per-model default in its model table (`printer_models.ts`), but whether the library auto-selects the task for a given model: partly confirmed only (issue reports show users picking tasks by hand, e.g. D101 works only with the D110 task, B3S only with B1 task, B21_PRO works with B1 not B21_V1: https://github.com/MultiMote/niimbluelib/issues/1). niimbot-web-bluetooth says it chooses its two task variants "automatically per connected printer" (its README).

### 3.5 Image encoding

From NiimBlueLib `src/utils/image_encoder.ts` (https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/utils/image_encoder.ts):
- Pixels are 1 bit; a non-white pixel (anything other than 0xFFFFFF in the canvas) is a black dot; set bits mean black.
- Bit order inside each byte is **most significant bit first** (`1 << (7 - colBit)`).
- Row width is padded up to a multiple of 8 pixels.
- Rows are streamed top to bottom, one packet per row (rows that are fully white are sent as PrintEmptyRow, with identical adjacent rows merged by the repeat counter).
- **Print direction**: D-series and B18 models have `printDirection: "left"`, i.e. the image is rotated 90 degrees clockwise: the printhead is across the short side of the label and the label feeds along its long side. For `"left"` models, rows = image width, columns = image height. B-series and most others are `"top"`: rows = image height, columns = image width, no rotation. (The direction per model is in `printer_models.ts`, the table below.)
- SetPageSize columns must not exceed the printhead pixel width; extra columns are silently dropped (iscarelli README, section on `w_px`).
- Optional modes exist: two-colour (red/black), 16-level grey (see wiki proto page). Not needed for plain labels.

Wiki inconsistencies noted: for PrintBitmapRow the example places the pixel count in `C1` while commentary says `C3`; for SetPageSize 45-byte form the listed length looks wrong (https://printers.niim.blue/interfacing/proto/). The wiki also says "The page does not describe" PageEnd/PageStart in detail, so they are minimal commands in practice: `55 55 E3 01 01 E3 AA AA` pattern per the simple-request rule (inferred from the simple-request rule on the same page; not individually stated).

### 3.6 Quantity / copies

- D11/D110 tasks: `PrintQuantity (0x15)`, u16, sent per page.
- B1, H1S, D110M_V4 tasks: copies are a u16 inside SetPageSize (0x13).
- B21_V1 / B21_L2B: no quantity field on the wiki page.
- Source: https://printers.niim.blue/interfacing/print-tasks/
- Real-world caveat: iscarelli README says some models ACK `copies=N` and a multi-page job "exactly like the others and then print only the first" so the driver loops per page on those models (flag `pagesPerJob` in its `MODEL_IDS`). It also measured a D110 at 18 s for 3 copies of a 264-row image, including a roughly 3.2 s upload. (https://github.com/iscarelli/niimbot-web-bluetooth README)

### 3.7 Effort estimate (from the above)

A minimal implementation for one family (e.g. D110: about 10 packet types, XOR checksum, MSB-first rows, status polling, heartbeat) is a few hundred lines of JS, as the single-file driver (89 KB, including multi-model registry, RFID, batches and docs) and the NiimBlueLib task files show. The risk is not the code size but the per-model differences (print task, rotation, printhead width, BLE service UUID, RFID need) which are only known from hardware testing by others.

## 4. Models

Source for dpi, printhead pixels, print direction, density range: NiimBlueLib `src/printer_models.ts` (https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/printer_models.ts), which is generated from the wiki table https://printers.niim.blue/hardware/models/ . The wiki marks some printhead sizes "(verified)": D110, B1 only among the ones I read. mm values = pixels / (dpi / 25.4); the wiki shows 12mm/96px (D11, D110), 24mm/192px (D101), 48mm/384px (B1, B21), 72mm/576px (B3S).

| Model | Model id | dpi | Printhead px | Printhead mm (wiki) | Direction | Density range | Label types |
|---|---|---|---|---|---|---|---|
| D11 | 512 | 203 | 96 | 12 | left | 1-3 | 1,5 |
| D110 | 2304, 2305 | 203 | 96 (verified) | 12 | left | 1-3 | 1,5 |
| D110_M | 2320 | 203 | 96 | 12 | left | 1-5 | not read |
| D101 | 2560 | 203 | 192 | 24 | left | 1-3 | 1,5 |
| D11_H | 528 | 300 | 142 (library); a hardware test found 144 px usable | n/a | left | 1-5 | not read |
| B1 | 4096 | 203 | 384 (verified) | 48 | top | 1-5 | 1,2,5 |
| B1 Pro | 4097 | 300 | 567 | n/a | top | 1-5 | not read |
| B21 | 768 | 203 | 384 | 48 | top | 1-5 | 1,2,3,5 |
| B21_PRO | 785 | 300 | 591 | n/a | top | 1-5 | not read |
| B18 | 3584 | 203 | 96 | 12 | left | 1-3 | 1,5,10,11,3 (thermal transfer) |
| B3S | 256, 260, 262 | 203 | 576 | 72 | top | 1-5 | 1,2,3,5 |

Conflict: D11_H printhead width: 142 px in `printer_models.ts` vs 144 px found by testing in https://github.com/iscarelli/niimbot-web-bluetooth README (which also says 177 px that "15 mm implies" does not print). Not resolved.

Conflict: N1 dpi: sold as 300 dpi; the iscarelli README measured 203 (same README).

Printhead widths in mm are not the same as the max label width; labels are usually a little wider than the head.

### Label sizes and max label width (retail sources)

| Model | Max label width | Source | Notes |
|---|---|---|---|
| D110 / D11 | 15 mm (Lazada guide: "Up to 15 mm"); effective print width 12 mm (retailers) | https://office.lazada.sg/niimbot-b1-vs-b21-vs-d110-which-label-maker-fits-your-needs-20260803/ ; web search results citing retailers (e.g. https://www.galaxus.it/en/s1/product/niimbot-d110-203-dpi-label-printer-25201495) | Common roll: 12x40 mm (3-pack on eBay about $15.99 per the search summary; the exact listing page was not opened) |
| B1 | 50 mm | same Lazada guide | Common roll: 50x30 mm (3-pack about $17.99 on eBay per the search summary; listing not opened). Printhead is 48 mm. |
| B21 | 50 mm (Lazada guide); a retailer (Alza) lists the **B21 Pro** at 53 mm | Lazada guide above; https://m.alza.at/EN/printers/niimbot/18842929-v39799.htm?page=2 | Sources differ on B21 vs B21 Pro; the sources are different models |
| D101 | max print width 25 mm and paper width 27 mm (Galaxus) vs effective 24 mm (JB Hi-Fi); a TakeSpec page says 48 mm which conflicts and looks unreliable | https://www.galaxus.de/en/s1/product/niimbot-d101-203-dpi-label-printer-40294288 ; https://www.jbhifi.com.au/products/niimbot-d101-smart-thermal-label-printer ; https://takespec.com/printer/niimbot-d101 | Wiki printhead is 24 mm |
| B3S, B18 | not confirmed from a retail spec sheet. Wiki printhead: B3S 72 mm, B18 12 mm | https://printers.niim.blue/hardware/models/ | |

The wiki's own D110, D101 and B1 hardware pages do not list label widths (https://printers.niim.blue/hardware/niimbot-d110/ , .../niimbot-d101/ , .../niimbot-b1/).

### Prices

- **Amazon prices: not confirmed.** Amazon pages were not retrievable in this research. Search results only gave non-Amazon prices: D101 J.B. Hi-Fi AUD 65, Wasserman EUR 43.63, Desertcart NZ NZD 131 (https://www.jbhifi.com.au/products/niimbot-d101-smart-thermal-label-printer ; https://www.wasserman.eu/en/p/label-printer-niimbot-d101-1395789 ; https://www.desertcart.nz/products/461005992-d101-label-maker-handheld-thermal-label-printer-with-tape-easy.md ), "may be stale". The Lazada guide lists no prices. B&H sells the D110M but the page returned HTTP 403 so the price was not read (https://www.bhphotovideo.com/c/product/1937605-REG/niimbot_1aa60013401_d110m_1_2_portable_smart.html).

### RFID

- Every label roll has an RFID tag identifying label type and remaining print count; the tag also stores the label dimensions, which the printer uses internally for gap calibration but does not send to the app (the app gets dimensions from NIIMBOT's server using the barcode/serial). Source: https://printers.niim.blue/other/label-types/
- Tag format per wiki: NTAG213 with a 4-byte password; data encrypted with TEA-ECB; holds used count, UUID, serial, barcode, width/height, paper type/name, density, print limit, gap; "not 100% accurate". Source: https://printers.niim.blue/other/rfig-tags/ (the URL is spelled "rfig" on the wiki.)
- Whether printers refuse unrecognised labels: the wiki RFID page "doesn't address" third-party labels. Reports from users:
  - Older models such as D110 ignore the tag completely; newer models such as B1 "degraded print quality (density) when tag was not present"; the newest "looks like" not printing at all without a tag (maintainer comment). M2 (2024): "a valid RFID tag must be near/inside the printer" or a timeout occurs. Source: https://github.com/MultiMote/niimbluelib/issues/1
  - B1 wiki page says you can carefully remove the tag from a roll and attach it to the printer case to test any label paper; the print counter still increments; first calibration after power-up uses the tag's paper height so different-height paper may misalign the first print (https://printers.niim.blue/hardware/niimbot-b1/).
  - The official NIIMBOT app iOS reviews: one reviewer says the printer rejected same-size labels from other brands and that labels use RFID (https://apps.apple.com/us/app/niimbot/id1359104615). The same thread shows "app complains about non genuine labels" while NiimBlue prints regardless (issues/1 above).
- Region lock is described as "not a hardware restriction"; the official app checks the printer serial against NIIMBOT's server; "has no effect on printing via third-party applications like niim.blue" (https://printers.niim.blue/other/region-lock/).

## 5. Known problems and risks

| Topic | Finding | Source |
|---|---|---|
| Firmware changes that break third-party printing | **Not confirmed** as a documented event. No issue found saying a vendor firmware update broke the protocol. Related facts: the official firmware is not public (wiki collects files at fw.niim.blue); one user chose not to update ("bigger chance they get something locked down in a new version"); a D11_H user downgraded from FW 4.28 to 4.23 using the header editor "because it doesn't accept lower versions". New models change the protocol every year (new print-task variants in 2024 and 2025). | https://printers.niim.blue/firmware/ ; https://github.com/MultiMote/niimbluelib/issues/1 ; https://printers.niim.blue/interfacing/print-tasks/ |
| New hardware with different BLE UUID | B21_C2B uses a different service UUID. | https://github.com/MultiMote/niimblue/issues/178 |
| Model/task mismatch | Wrong print task gives scrolling blanks, endless printing, timeouts or "DataError". Examples: D101 needs D110 task; B3S USB with D110 profile prints but never stops; B21_L2B DataError on every print with both B21_V1 and B1 tasks (closed issue). | https://github.com/MultiMote/niimbluelib/issues/1 ; https://github.com/MultiMote/niimblue/issues/144 |
| Last line missing | "Failing to print last line" open issue (opened 2026-09-12). | https://github.com/MultiMote/niimbluelib/issues |
| RFID counter desync | Cloud counter desynchronises from physical RFID counter on B1 Pro after using NiimBlue (closed). Cosmetic for a shop that does not use the official app. | https://github.com/MultiMote/niimblue/issues/170 |
| Connection reliability | Library retries GATT connect ("Trying again usually works"). Known NiimBlue bug: "packets sometimes stop sending after a print cancel or error". iOS/macOS drop unacknowledged write bursts. Bluefy had connectivity fixes in v3.8.5. | https://raw.githubusercontent.com/MultiMote/niimbluelib/main/src/client/bluetooth_impl.ts ; https://github.com/MultiMote/niimblue/wiki ; https://github.com/iscarelli/niimbot-web-bluetooth ; https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055 |
| Printing from a web page specifically | HTTPS, user gesture for each device chooser, Android location + Bluetooth must be on, in-app WebViews may lack Web Bluetooth. Chooser appears each session unless the page keeps and re-uses an authorised device; NiimBlueLib supports `authorizedDevice` option (source above) but whether Chrome restores devices silently after reload is not confirmed. | sources in section 1 |
| Legal / licence | NiimBlueLib, NiimBlue, niimbot-web-bluetooth, niimprint are all MIT (include the licence notice if you vendor them). NiimPrintX, vooki, Thermalith, niimbot-printer are GPL-3.0 per the wiki; not usable in a proprietary bundle without GPL obligations. Libraries state they are unofficial and "not affiliated with or endorsed by" the vendor. Protocol is reverse engineered. No source read discusses legal status of using it, so **legal risk (e.g. NIIMBOT terms of service, interoperability law) is not confirmed either way**. Wiki licence for niimblue-node and niimbotjs: "Not declared". | https://github.com/MultiMote/niimbluelib ; https://printers.niim.blue/other/third-party-software/ |
| Bricking risk | Only if flashing firmware, not for printing. | https://printers.niim.blue/firmware/flashing-firmware/ |

## 6. Recommendation

1. Vendoring NiimBlueLib's UMD file is the lowest-effort route that covers the most models: one pinned file (`@mmote/niimbluelib@0.49.1`, 127 KB), MIT, actively maintained, both Web Bluetooth and Web Serial, all 7+ print tasks. Copy `https://cdn.jsdelivr.net/npm/@mmote/niimbluelib@0.49.1/dist/umd/niimbluelib.min.js` and `LICENSE` into the repo and load it from your own origin (the PWA then works offline and cannot change under you). Pin the version; its release cadence is fast and the API may change (version is 0.x). Keep the Capacitor side effect in mind (it defines `window.Capacitor`).
2. If the shop uses only a known model family and wants the smallest surface, the minimal protocol (section 3) is feasible. `niimbot-web-bluetooth` is the existing zero-dependency single-file implementation (MIT, 89 KB), but it is newer (June 2026), has one maintainer, and its validated list lacks D101, B3S and B18. For D101/B3S/B18 only NiimBlueLib issue threads give evidence (D101 via D110 task; B3S via B1 task).
3. Whichever you pick, ship a per-model profile (print task, density, label type, printhead px, rotation) and a hardware test on the actual printers before relying on it; the sources say mismatches fail in confusing ways.
4. Pre-render the label to a canvas at the printer's dpi and printhead width; send 1-bit.
5. Fallbacks for devices without Web Bluetooth:
   - iPhone/iPad: Bluefy (free) opening the same HTTPS page. One report of success on a B1 Pro; B1/M2-H on iOS untested, other models not confirmed.
   - Any device: download the label as a PNG and open it in the official NIIMBOT app. Whether the app can import a gallery picture or take a share-sheet image: **not confirmed**; test on the actual app before promising this.
   - Desktop with USB: NiimBlueLib's Web Serial client (Chrome/Edge), only for printers that have a USB port.
   - Browser print dialog to a normal printer, or NiimBlue (niim.blue) as a separate designer tool for staff.
6. Do not assume label compatibility: buy genuine NIIMBOT label rolls for B-series and M-series printers (RFID needs per section 4), and test third-party rolls per model.

## Source list (principal)

- https://github.com/MultiMote/niimbluelib , https://github.com/MultiMote/niimblue , https://libdocs.niim.blue
- https://printers.niim.blue/ (wiki: proto, print-tasks, connecting, models, label-types, rfig-tags, region-lock, third-party-software, firmware)
- https://github.com/iscarelli/niimbot-web-bluetooth
- https://data.jsdelivr.com/v1/packages/npm/@mmote/niimbluelib@0.49.1?structure=flat
- https://caniuse.com/web-bluetooth , https://caniuse.com/web-serial
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API , https://developer.mozilla.org/en-US/docs/Web/API/Serial/requestPort
- https://developer.chrome.com/docs/capabilities/bluetooth , https://developer.chrome.com/docs/capabilities/serial
- https://github.com/WebBluetoothCG/web-bluetooth/blob/main/implementation-status.md
- https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055 , https://apps.apple.com/us/app/niimbot/id1359104615
