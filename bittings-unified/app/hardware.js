/* ============================================================================
   TKS Hardware — shop-floor peripherals for the staff web app (real-world rig).
   Three independent pieces, one module (window.TKS_HW):

     1) scanner  — USB barcode scanner in KEYBOARD-WEDGE mode. Global keydown
                   burst-detector → emits a `tks-scan` CustomEvent + calls
                   TKS_HW.scanner.handler(code). No driver, no SDK. index.html
                   listens and adds the matching inventory part to the ticket.

     2) thermal  — Star TSP100 + cash drawer. Builds a COMPACT 80mm receipt
                   (StarPRNT markup via the StarWebPRNT JS SDK) and POSTs it to a
                   configurable Star WebPRNT endpoint, kicking the drawer on the
                   SAME job. This is a SEPARATE output from the PDF invoice — same
                   receipt data, two layouts. NOTE: no TSP100 has a built-in
                   WebPRNT server; the endpoint is a Star WebPRNT host service on
                   the POS machine (default http://localhost:8001/...), or a
                   WebPRNT-native printer IP. Requires the Star Web SDK scripts.

     3) labels   — Zebra ZD421 (ZPL) for inventory part labels. Builds a Code-128
                   SKU barcode + part-name label (printPart) or a per-UNIT label whose
                   barcode is the serialized unit id (printUnit / printUnits — scanning
                   it opens that key's story) and sends raw ZPL via the Zebra
                   BrowserPrint SDK to the locally-attached printer. Requires
                   Browser Print app + the BrowserPrint SDK scripts.

   Device settings are PER-WORKSTATION → persisted in localStorage (NOT the cloud
   shop_config, which is shared across machines). Both printers degrade gracefully
   when their vendor SDK isn't loaded yet, and both expose a hardware-free preview.

   Vendor SDKs (downloaded by the shop owner — see the Hardware settings panel):
     Star : StarWebPrintBuilder.js + StarWebPrintTrader.js
            (github.com/star-micronics/starwebprnt-sdk)
     Zebra: BrowserPrint-3.x.min.js + BrowserPrint-Zebra-1.x.min.js
            (zebra.com → Browser Print)
   ============================================================================ */
(function () {
  'use strict';

  // ---- per-workstation settings ------------------------------------------
  var LS = 'tks_hw_prefs';
  var DEFAULTS = {
    helper: { url: 'http://127.0.0.1:8765' },   // 8z26: Bittings Print Helper on this PC (receipts + labels + drawer)
    scanner: { enabled: true, minLen: 3, burstMs: 40, endKey: 'Enter' },
    thermal: {
      enabled: false,
      mode: 'helper',       // 8z26: 'helper' (Bittings Print Helper) | 'webprnt' (Star WebPRNT endpoint)
      endpoint: 'http://localhost:8001/StarWebPRNT/SendMessage',
      width: 48,            // columns (Font A: 80mm≈48, 58mm≈32)
      drawerKick: true,
      printLogo: false,     // off until verified on the real printer (Star WebPRNT mode only)
      logo: true,           // 8z81: shop logo at the top of the receipt (Bittings Print Helper mode)
      autoPrint: false,     // C-#14: print the customer receipt automatically on every sale
      copies: 1
    },
    labels: {
      enabled: false,
      mode: 'helper',       // 8z26: 'helper' (Bittings Print Helper) | 'browserprint' (Zebra Browser Print)
      deviceUid: '',        // chosen Zebra device uid (blank = OS default)
      shiftX: 40,           // 8z26: dots to move everything right (the ZD420 started printing left of the label edge)
      dpi: 203,
      widthIn: 2.0,         // 8z26c: the shop's ZD420 labels are 2.00 x 1.00 in (kept in step with `size`)
      heightIn: 1.0,
      size: '',             // default label size id (small|medium|wide|large|xl|xxl|custom) — worked out from widthIn/heightIn when blank
      sizesOn: [],          // sizes the shop has rolls for
      customW: 2.5,         // only used when size is 'custom'
      customH: 1.5,
      darkness: 20,
      speed: 3
    },
    // 8z102: a NIIMBOT Bluetooth label printer used from THIS device (app/niimbot.js)
    niimbot: { enabled: false, model: 'B1', size: '50x30', density: 3 }
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function deepMerge(base, over) {
    var out = clone(base);
    Object.keys(over || {}).forEach(function (k) {
      if (over[k] && typeof over[k] === 'object' && !Array.isArray(over[k])) {
        out[k] = deepMerge(base[k] || {}, over[k]);
      } else { out[k] = over[k]; }
    });
    return out;
  }
  var prefs = DEFAULTS;
  try { prefs = deepMerge(DEFAULTS, JSON.parse(localStorage.getItem(LS) || '{}')); } catch (e) {}
  function persist() { try { localStorage.setItem(LS, JSON.stringify(prefs)); } catch (e) {} }

  // ---- label sizes (the owner picks what rolls the shop has) --------------
  var LABEL_SIZES = [
    { id: 'small',  label: 'Small — 2 × 1 in',        hint: 'Van drawers, small bags', wIn: 2.0,  hIn: 1.0 },
    { id: 'medium', label: 'Medium — 2¼ × 1¼ in', hint: 'Small bags, shelf bins', wIn: 2.25, hIn: 1.25 },
    { id: 'wide',   label: 'Wide — 3 × 1 in',         hint: 'Drawer fronts, bin edges', wIn: 3.0,  hIn: 1.0 },
    { id: 'large',  label: 'Large — 3 × 2 in',        hint: 'Key bags', wIn: 3.0,  hIn: 2.0 },
    { id: 'xl',     label: 'Extra large — 4 × 2 in',  hint: 'Big bags and boxes', wIn: 4.0,  hIn: 2.0 },
    { id: 'xxl',    label: '4 × 3 in',                     hint: 'Boxes and totes', wIn: 4.0,  hIn: 3.0 },
    { id: 'custom', label: 'Custom size',                       hint: 'Type your own width and height', wIn: 0, hIn: 0 }
  ];
  function sizeSpec(id) {
    var L = prefs.labels, s = null;
    for (var i = 0; i < LABEL_SIZES.length; i++) if (LABEL_SIZES[i].id === id) s = LABEL_SIZES[i];
    if (!s) s = LABEL_SIZES[0];
    if (s.id === 'custom') return { id: 'custom', label: s.label, hint: s.hint, wIn: parseFloat(L.customW) || 2.5, hIn: parseFloat(L.customH) || 1.5 };
    return s;
  }
  function validSize(id) { return LABEL_SIZES.some(function (s) { return s.id === id; }); }
  // keep widthIn/heightIn (older code) in step with the chosen default size
  function syncLabelDims() { var sp = sizeSpec(prefs.labels.size); prefs.labels.widthIn = sp.wIn; prefs.labels.heightIn = sp.hIn; }
  function normLabelPrefs() {
    var L = prefs.labels;
    if (!validSize(L.size)) {
      var w = parseFloat(L.widthIn) || 2.0, h = parseFloat(L.heightIn) || 1.0, found = '';
      LABEL_SIZES.forEach(function (s) { if (s.id !== 'custom' && Math.abs(s.wIn - w) < 0.01 && Math.abs(s.hIn - h) < 0.01) found = s.id; });
      L.size = found || 'custom';
      if (L.size === 'custom') { L.customW = w; L.customH = h; }
    }
    L.sizesOn = (Array.isArray(L.sizesOn) ? L.sizesOn : []).filter(validSize);
    if (L.sizesOn.indexOf(L.size) < 0) L.sizesOn.push(L.size);
    L.sizesOn = LABEL_SIZES.map(function (s) { return s.id; }).filter(function (id) { return L.sizesOn.indexOf(id) >= 0; });
    syncLabelDims();
  }
  normLabelPrefs();

  // ---- 8z26: Bittings Print Helper client ---------------------------------
  function helperUrl() { return ((prefs.helper && prefs.helper.url) || DEFAULTS.helper.url).replace(/\/+$/, ''); }
  function helperCall(pathName, payload) {
    var opt = payload === undefined ? { method: 'GET' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
    return fetch(helperUrl() + pathName, opt).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
      if (!r.ok || (j && j.error)) throw new Error((j && j.error) || ('Print helper error ' + r.status)); return j; }); },
      function () { throw new Error('Can\'t reach the Bittings Print Helper on this computer. Use the counter PC (the one with the printers), or restart it.'); });
  }
  function helperStatus() { return helperCall('/status'); }

  // 8z28: QR as a ZPL graphic (^GFA) we draw ourselves — exact size and position on every printer.
  // Uses qrcode-generator (app/vendor/qrcode-generator-1.4.4.js, MIT). Falls back to the printer's ^BQ if it isn't loaded.
  function qrGFA(text, x, y, maxDots) {
    if (typeof window.qrcode !== 'function') return null;
    var q = window.qrcode(0, 'M'); q.addData(String(text)); q.make();
    var n = q.getModuleCount(), quiet = 1, total = n + quiet * 2;
    var mag = Math.max(2, Math.floor(maxDots / total)), size = total * mag;
    var rowBytes = Math.ceil(size / 8), hex = '';
    for (var py = 0; py < size; py++) {
      var my = Math.floor(py / mag) - quiet, bits = '';
      for (var px = 0; px < rowBytes * 8; px++) {
        var mx = Math.floor(px / mag) - quiet;
        bits += (px < size && mx >= 0 && my >= 0 && mx < n && my < n && q.isDark(my, mx)) ? '1' : '0';
      }
      for (var b = 0; b < bits.length; b += 8) hex += ('0' + parseInt(bits.substr(b, 8), 2).toString(16).toUpperCase()).slice(-2);
    }
    return { zpl: '^FO' + x + ',' + y + '^GFA,' + (rowBytes * size) + ',' + (rowBytes * size) + ',' + rowBytes + ',' + hex + '^FS', size: size };
  }

  // 8z29c: fit text into N lines of a ZPL ^FB block (font A0 ≈ 0.62 × height per character, conservative)
  function fitLines(text, widthDots, fontDots, lines) {
    var per = Math.max(4, Math.floor(widthDots / (fontDots * 0.62)));
    var words = String(text || '').split(/\s+/).filter(Boolean), out = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var wd = words[i].length > per ? words[i].slice(0, per) : words[i];
      if (!cur) cur = wd; else if ((cur + ' ' + wd).length <= per) cur += ' ' + wd; else { out.push(cur); cur = wd; }
      if (out.length === lines) { cur = ''; break; }
    }
    if (cur && out.length < lines) out.push(cur);
    var used = out.join(' ').split(/\s+/).filter(Boolean).length;
    if (used < words.length && out.length) { var last = out[out.length - 1]; while ((last + '...').length > per && last.indexOf(' ') > 0) last = last.replace(/\s+\S*$/, ''); out[out.length - 1] = ((last + '...').length > per ? last.slice(0, per - 3) : last) + '...'; }   // whole words   // 8z29d: plain dots (no "…" glyph in the Zebra font)
    fitLines.lastLines = out.length || 1;   // 8z29g: how many lines the name really uses (price goes right under it)
    return out.join(' ');
  }

  // 8z29d: biggest font (≤ max) that keeps one line of text inside widthDots
  function fitFont(text, widthDots, maxFont) { var n = String(text || '').length || 1; return Math.max(14, Math.min(maxFont, Math.floor(widthDots / (n * 0.6)))); }

  // ---- small helpers ------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + (Number(n || 0)).toFixed(2); }
  function identity() {
    try { return (window.TKS && TKS.Config && TKS.Config.identity()) || {}; }
    catch (e) { return {}; }
  }
  function toast(msg, ok) {
    var n = document.createElement('div');
    n.textContent = msg;
    n.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:100001;'
      + 'background:' + (ok === false ? '#7a232b' : '#1b3a26') + ';color:#fff;padding:11px 16px;'
      + 'border-radius:10px;font:600 13px -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.5)';
    document.body.appendChild(n);
    setTimeout(function () { n.remove(); }, 2600);
  }

  /* ========================================================================
     1) BARCODE SCANNER  (keyboard wedge)
     A HID scanner "types" the code very fast then sends Enter. We accumulate
     printable keys; if they arrive as a fast BURST (avg gap < burstMs) and end
     with the configured terminator, it's a scan — we emit it and swallow the
     Enter so it doesn't submit a form. Slow human typing never bursts, so normal
     input is untouched. Scans are ignored while the user is mid-typing in a
     password field, and the handler decides what to do with the code.
     ===================================================================== */
  var scan = (function () {
    var buf = '', firstT = 0, lastT = 0, listening = false;

    function now() { try { return performance.now(); } catch (e) { return +new Date(); } }

    function onKey(e) {
      if (!prefs.scanner.enabled) return;
      // OS key auto-repeat (holding a key) arrives faster than burstMs and used to be
      // classified as a scan when followed by Enter. Repeats never come from a scanner.
      if (e.repeat) { buf = ''; return; }
      var t = now();
      var p = prefs.scanner;

      // terminator → decide if the buffer was a scan
      if (e.key === p.endKey) {
        var len = buf.length;
        var span = lastT - firstT;
        var burst = len >= p.minLen && (len < 2 || (span / Math.max(1, len - 1)) <= p.burstMs);
        if (burst) {
          var code = buf;
          buf = '';
          e.preventDefault();        // don't let the Enter submit/trigger anything
          e.stopPropagation();
          // The wedge already "typed" the code into whatever field had focus (customer name,
          // search, PIN…). Pull it back out of that field — except the Hardware test box,
          // which is meant to show it — so a scan never corrupts a form value.
          try {
            var ae = document.activeElement;
            if (ae && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && ae.id !== 'hwScanTest' && typeof ae.value === 'string' && ae.value.length >= code.length && ae.value.slice(-code.length) === code) {
              ae.value = ae.value.slice(0, -code.length);
              ae.dispatchEvent(new Event('input', { bubbles: true }));
            }
          } catch (_) {}
          emit(code);
          return;
        }
        buf = '';                    // human Enter — let it through untouched
        return;
      }

      // ignore modifier/navigation keys; only single printable chars build a code
      if (e.key == null || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
        if (t - lastT > 300) buf = '';
        return;
      }
      if (t - lastT > 300 || buf === '') { buf = ''; firstT = t; }  // new burst
      buf += e.key;
      lastT = t;
    }

    function emit(code) {
      try { window.dispatchEvent(new CustomEvent('tks-scan', { detail: { code: code } })); } catch (e) {}
      if (typeof api.handler === 'function') { try { api.handler(code); } catch (e) {} }
    }

    function start() {
      if (listening) return;
      // capture phase so we see the keys before page inputs consume them
      document.addEventListener('keydown', onKey, true);
      listening = true;
    }
    function stop() { document.removeEventListener('keydown', onKey, true); listening = false; }

    var api = {
      handler: null,                 // optional: TKS_HW.scanner.handler = fn(code)
      start: start,
      stop: stop,
      feed: emit                     // simulate a scan (used by the settings "Test")
    };
    return api;
  })();

  /* ========================================================================
     2) THERMAL RECEIPT  (Star TSP100 / WebPRNT)
     Shared formatter builds an array of tokens; preview() renders them as
     monospace text (NO hardware needed), printReceipt() maps them to StarPRNT
     markup via the Star Web SDK and POSTs to the WebPRNT endpoint, then kicks
     the drawer on the same job.
     ===================================================================== */
  var thermal = (function () {

    function sdkReady() {
      return typeof window.StarWebPrintBuilder === 'function'
        && typeof window.StarWebPrintTrader === 'function';
    }

    // left text + right text padded to width (truncate left if needed)
    function row(left, right, w) {
      left = String(left == null ? '' : left);
      right = String(right == null ? '' : right);
      var room = w - right.length;
      if (room < 1) { return right.slice(0, w); }
      if (left.length > room - 1) left = left.slice(0, Math.max(0, room - 2)) + '…';
      var gap = w - left.length - right.length;
      if (gap < 1) gap = 1;
      return left + new Array(gap + 1).join(' ') + right;
    }
    function center(s, w) {
      s = String(s || '');
      if (s.length >= w) return s.slice(0, w);
      var pad = Math.floor((w - s.length) / 2);
      return new Array(pad + 1).join(' ') + s;
    }
    function rule(w, ch) { return new Array(w + 1).join(ch || '-'); }
    function wrap(s, w) {
      s = String(s || ''); var out = [], line = '';
      s.split(/\s+/).forEach(function (word) {
        if ((line + ' ' + word).trim().length > w) { if (line) out.push(line); line = word; }
        else { line = (line ? line + ' ' : '') + word; }
      });
      if (line) out.push(line);
      return out.length ? out : [''];
    }

    // receipt → tokens: {t:'text',data,align,bold,big} | {t:'rule'} | {t:'barcode',data}
    //                   | {t:'cut'} | {t:'drawer'} | {t:'logo'}
    function tokens(r, opt) {
      opt = opt || {};
      var w = opt.width || prefs.thermal.width || 48;
      var id = identity();
      var t = r.totals || {};
      var T = [];
      function line(data, align, bold, big) { T.push({ t: 'text', data: data, align: align || 'left', bold: !!bold, big: !!big }); }

      var logoOn = !!(opt.logo && prefs.thermal.printLogo && (id.logo));
      if (logoOn) T.push({ t: 'logo' });

      // header — 8z97: no shop name under the logo (the logo already shows it)
      if (!(logoOn || opt.logoPrinted)) line(id.name || 'RECEIPT', 'center', true, true);
      // 8z26d: street on line 1, "City, ST ZIP" on line 2 (split before the city)
      if (id.address) { var ap = String(id.address).split(/\s*,\s*/).filter(Boolean);
        var cityLine = ap.length >= 3 ? ap.slice(-2).join(', ') : (ap.length === 2 && /\d{5}/.test(ap[1]) ? ap[1] : '');
        var street = cityLine ? ap.slice(0, ap.length - (ap.length >= 3 ? 2 : 1)).join(', ') : String(id.address);
        wrap(street, w).forEach(function (l) { line(l, 'center'); }); if (cityLine) wrap(cityLine, w).forEach(function (l) { line(l, 'center'); }); }
      if (id.phone) line(id.phone, 'center');   // 8z26d: no e-mail on the printed receipt
      T.push({ t: 'rule' });

      // meta
      var num = r.number || r.id || '';
      var date = r.date || (new Date()).toISOString().slice(0, 10);
      // 8z80: documents from the Receipts screen print here too — say what it is, and carry the vehicle
      var docWord = r.docType === 'invoice' ? 'Invoice' : (r.docType === 'estimate' ? 'Estimate' : 'Receipt');
      if ((docWord + ': ' + num).length + String(date).length + 1 > w) { line(docWord + ': ' + num); line(String(date)); }
      else line(row(docWord + ': ' + num, date, w));
      if (r.customer) line(row('Customer: ' + r.customer, '', w));
      if (r.vehicleText) wrap('Vehicle: ' + r.vehicleText, w).forEach(function (l) { line(l); });
      if (r.vin) line('VIN: ' + r.vin);
      (r.moreVehicles || []).forEach(function (l, i) { wrap('Vehicle ' + (i + 2) + ': ' + l, w).forEach(function (x) { line(x); }); });   // 8z84
      if (r.serviceWhere === 'shop') line('Service: In shop'); else if (r.serviceWhere === 'mobile') line('Service: Mobile');
      if (r.technician) line(row('Served by: ' + r.technician, '', w));
      T.push({ t: 'rule' });

      // line items — desc wrapped, qty×unit shown, amount right-aligned
      (r.items || []).forEach(function (it) {
        if (it.isDiscount) return;  // discounts shown in totals block
        var amt = money(Number(it.amount || 0));
        var qty = Number(it.qty || 1);
        var name = it.desc || it.lineType || 'Item';
        var lines = wrap(name, w - amt.length - 1);
        lines.forEach(function (l, i) { line(row(l, i === 0 ? amt : '', w)); });
        if (qty > 1) {
          var unit = money(Number(it.amount || 0) / qty);
          line('   ' + qty + ' x ' + unit);
        }
      });
      T.push({ t: 'rule' });

      // totals
      var sub = (t.subtotal != null) ? t.subtotal : (t.grossSubtotal || 0);
      if (t.grossSubtotal != null) line(row('Subtotal', money(t.grossSubtotal), w));
      if (t.discount) line(row('Discount', '-' + money(t.discount), w));
      if (r.taxExempt) line(row('Tax', 'EXEMPT', w));   // 8z80
      else if (t.tax != null) line(row('Tax' + (t.taxRate ? ' (' + t.taxRate + '%)' : ''), money(t.tax), w));
      if (t.surcharge) line(row('Card surcharge', money(t.surcharge), w));
      // 8z26d: the big TOTAL prints ~1.7x wider, so it gets its own narrower row (amount was cut off)
      line(row('TOTAL', money(t.total != null ? t.total : sub), Math.floor(w / 1.75)), 'left', true, true);
      if (r.docType === 'estimate') { T.push({ t: 'rule' }); line('ESTIMATE - valid 30 days', 'center'); }
      else {
        if (r.payment) { T.push({ t: 'rule' }); line(row(r.docType === 'invoice' ? 'Payment' : 'Paid by', r.payment, w)); }
        if (r.status) line(row('Status', r.status, w));
      }
      // 8z80: the exemption the sale relied on, the warranty and the customer note
      if (r.taxExempt) { T.push({ t: 'rule' });
        wrap('Tax exempt: ' + (r.exemptLabel || r.taxExempt.kindLabel || '') + (r.taxExempt.holderName ? ' - ' + r.taxExempt.holderName : ''), w).forEach(function (l) { line(l); }); }
      if (r.warrantyText) { T.push({ t: 'rule' }); wrap(String(r.warrantyText), w).forEach(function (l) { line(l); }); }
      if (r.notes) { T.push({ t: 'rule' }); wrap('Note: ' + String(r.notes), w).forEach(function (l) { line(l); }); }

      // footer
      T.push({ t: 'rule' });
      // 8z26d: no "Insured & Bonded" footer on the printed receipt — just the thank-you
      line('Thank you!', 'center');

      // machine-readable receipt number for re-scanning/lookups
      if (num) { T.push({ t: 'text', data: ' ', align: 'left' }); T.push({ t: 'barcode', data: String(num) }); }

      T.push({ t: 'cut' });
      if (opt.drawer && prefs.thermal.drawerKick) T.push({ t: 'drawer' });
      return T;
    }

    // hardware-free preview: render tokens as monospace text
    function previewText(r, opt) {
      var w = (opt && opt.width) || prefs.thermal.width || 48;
      return tokens(r, opt).map(function (tk) {
        if (tk.t === 'rule') return rule(w);
        if (tk.t === 'cut') return rule(w, '=') + '\n      [ paper cut ]';
        if (tk.t === 'drawer') return '      [ cash drawer kick ]';
        if (tk.t === 'logo') return center('[ logo ]', w);
        if (tk.t === 'barcode') return center('|| ' + tk.data + ' ||', w);
        if (tk.t === 'text') {
          var s = tk.data;
          if (tk.align === 'center') s = center(s.trim(), w);
          else if (tk.align === 'right') s = row('', s.trim(), w);
          return s;
        }
        return '';
      }).join('\n');
    }

    // rasterize the configured logo to a 1-bit-friendly canvas for the printer
    function logoCanvas(maxDots) {
      return new Promise(function (resolve) {
        var src = identity().logo;
        if (!src) return resolve(null);
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, maxDots / img.width);
          var c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          resolve(c);
        };
        img.onerror = function () { resolve(null); };
        try { img.crossOrigin = 'anonymous'; } catch (e) {}
        img.src = src;
      });
    }

    // build StarPRNT markup string from tokens via the Star Web SDK
    function buildRequest(r, opt) {
      var b = new window.StarWebPrintBuilder();
      var dotsWide = (prefs.thermal.width >= 42) ? 576 : 384;  // 80mm vs 58mm printable
      var T = tokens(r, opt);
      var pending = Promise.resolve(null);
      if (opt && opt.logo && prefs.thermal.printLogo) pending = logoCanvas(Math.min(dotsWide, 384));

      return pending.then(function (logo) {
        var req = '';
        // reset is optional/SDK-version-dependent — guard so a missing method can't break the job
        if (typeof b.createInitializationElement === 'function') { try { req += b.createInitializationElement({ reset: true }); } catch (e) {} }
        T.forEach(function (tk) {
          if (tk.t === 'logo') {
            if (logo) { try { req += b.createBitImageElement({ context: logo.getContext('2d'), x: 0, y: 0, width: logo.width, height: logo.height }); } catch (e) {} }
            return;
          }
          if (tk.t === 'rule') { req += b.createTextElement({ data: new Array((prefs.thermal.width || 48) + 1).join('-') + '\n' }); return; }
          if (tk.t === 'text') {
            req += b.createAlignmentElement({ position: tk.align || 'left' });
            req += b.createTextElement({
              data: (tk.data || '') + '\n',
              emphasis: !!tk.bold,
              width: tk.big ? 2 : 1, height: tk.big ? 2 : 1
            });
            return;
          }
          if (tk.t === 'barcode') {
            req += b.createAlignmentElement({ position: 'center' });
            req += b.createBarcodeElement({ symbology: 'Code128', height: 40, hri: true, data: String(tk.data) });
            return;
          }
          if (tk.t === 'cut') { req += b.createCutPaperElement({ feed: true, type: 'partial' }); return; }
          if (tk.t === 'drawer') { req += b.createPeripheralElement({ channel: 1, on: 200, off: 200 }); return; }
        });
        return req;
      });
    }

    function send(request) {
      return new Promise(function (resolve, reject) {
        var trader = new window.StarWebPrintTrader({ url: prefs.thermal.endpoint });
        trader.onReceive = function (res) { resolve(res); };
        trader.onError = function (res) {
          reject(new Error('WebPRNT error ' + (res && res.status) + ' — check the printer endpoint ('
            + prefs.thermal.endpoint + '). Common cause: HTTPS page → HTTP printer (mixed content).'));
        };
        try { trader.sendMessage({ request: request }); }
        catch (e) { reject(e); }
      });
    }

    // 8z26: tokens → plain lines for the helper (it draws them through the Star driver)
    // 8z69: only a cash or check sale opens the drawer (it used to open on every print — card sales, reprints, previews)
    function wantsDrawer(r) { return /cash|check/i.test(String((r && r.payment) || '')); }
    function helperLines(r, logoPrinted) {
      var w = prefs.thermal.width || 48, out = [], drawer = false;
      tokens(r, { drawer: wantsDrawer(r), logo: false, logoPrinted: !!logoPrinted }).forEach(function (tk) {
        if (tk.t === 'text') out.push({ text: tk.align === 'left' ? tk.data : String(tk.data).trim(), align: tk.align, bold: tk.bold, big: tk.big });
        else if (tk.t === 'rule') out.push({ text: rule(w), align: 'left' });
        else if (tk.t === 'barcode') out.push({ text: '# ' + tk.data, align: 'center' });
        else if (tk.t === 'drawer') drawer = true;
      });
      return { lines: out, drawer: drawer };
    }
    /* 8z81 (owner: "how can I print my logo on the receipt?"): the shop logo from Settings, made printer-friendly —
       cropped to the artwork (logo files carry a lot of empty margin), every coloured or grey pixel turned solid black
       (a thermal printer has no grey), white background. A logo drawn light-on-dark is flipped. Returns base64 PNG, or ''. */
    var _logo = { src: null, data: '' };
    function logoForHelper() {
      return new Promise(function (resolve) {
        var src = identity().logo; if (!src) return resolve('');
        if (_logo.src === src) return resolve(_logo.data);
        var done = function (d) { _logo = { src: src, data: d || '' }; resolve(d || ''); };
        var img = new Image();
        img.onload = function () { try {
          var k = Math.min(1, 900 / img.width), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
          var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
          var d = x.getImageData(0, 0, c.width, c.height), p = d.data, n = c.width * c.height, dark = 0, i;
          for (i = 0; i < n; i++) { if (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2] < 225) dark++; }
          var flip = dark > n * 0.55, minX = c.width, minY = c.height, maxX = -1, maxY = -1;
          for (var yy = 0; yy < c.height; yy++) for (var xx = 0; xx < c.width; xx++) { i = (yy * c.width + xx) * 4;
            var isDark = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) < 225, ink = flip ? !isDark : isDark;
            p[i] = p[i + 1] = p[i + 2] = ink ? 0 : 255; p[i + 3] = 255;
            if (ink) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; } }
          if (maxX < 0) return done('');
          x.putImageData(d, 0, 0);
          var w = maxX - minX + 1, h = maxY - minY + 1, o = document.createElement('canvas'); o.width = Math.min(420, w); o.height = Math.max(1, Math.round(h * o.width / w));
          var ox = o.getContext('2d'); ox.fillStyle = '#fff'; ox.fillRect(0, 0, o.width, o.height); ox.drawImage(c, minX, minY, w, h, 0, 0, o.width, o.height);
          done(String(o.toDataURL('image/png')).split(',')[1] || '');
        } catch (e) { done(''); } };
        img.onerror = function () { done(''); };
        img.src = src;
      });
    }
    function printReceipt(r, opt) {
      opt = opt || {};
      if (!prefs.thermal.enabled && !opt.force) return Promise.reject(new Error('Thermal printing is disabled in Hardware settings.'));
      if ((prefs.thermal.mode || 'helper') === 'helper' || opt.force) {
        var send = function (logo) { var job = helperLines(r, !!logo); var body = { lines: job.lines, cols: prefs.thermal.width || 48, drawer: job.drawer && prefs.thermal.drawerKick && !opt.noDrawer, copies: Math.max(1, prefs.thermal.copies || 1) };
          if (logo) body.logo = logo; return helperCall('/receipt', body); };
        if (prefs.thermal.logo === false) return send('');
        return logoForHelper().then(send, function () { return send(''); }); }   // a logo problem never stops the receipt
      if (!sdkReady()) return Promise.reject(new Error('Star Web SDK not loaded — add StarWebPrintBuilder.js + StarWebPrintTrader.js (see Hardware settings).'));
      var copies = Math.max(1, prefs.thermal.copies || 1);
      var chain = buildRequest(r, { drawer: wantsDrawer(r), logo: true }).then(function (req) { return send(req); });
      for (var i = 1; i < copies; i++) {
        chain = chain.then(function () { return buildRequest(r, { drawer: false, logo: true }); }).then(send);
      }
      return chain;
    }

    function openDrawer() { return helperCall('/drawer', {}); }   // 8z26
    /* 8z98: print any slip (the closeout deposit slip) on the receipt printer through the Print Helper.
       lines = [{ text, align:'left'|'center'|'right', bold, big }] or {rule:true}. Never opens the drawer. */
    function printLines(lines, opt) { opt = opt || {}; var w = prefs.thermal.width || 48;
      var out = (lines || []).map(function (l) { return l && l.rule ? { text: rule(w), align: 'left' } : { text: String((l && l.text) || ''), align: (l && l.align) || 'left', bold: !!(l && l.bold), big: !!(l && l.big) }; });
      return helperCall('/receipt', { lines: out, cols: w, drawer: false, copies: Math.max(1, opt.copies || 1) }); }
    return {
      printReceipt: printReceipt,
      printLines: printLines,
      cols: function () { return prefs.thermal.width || 48; },
      openDrawer: openDrawer,
      previewText: previewText,
      sdkReady: sdkReady,
      _tokens: tokens,
      logoForHelper: logoForHelper
    };
  })();

  /* ========================================================================
     3) INVENTORY LABELS  (Zebra ZD421 / ZPL via Browser Print)
     ===================================================================== */
  var labels = (function () {

    function sdkReady() { return typeof window.BrowserPrint === 'object' && window.BrowserPrint; }

    // strip ZPL control chars from user data
    function z(s) { return String(s == null ? '' : s).replace(/[\^~]/g, ' '); }

    // ---- ONE layout engine: the same list of elements draws the ZPL and the on-screen sample ----
    function fmtDate(d) {
      try { var x = d ? new Date(d) : new Date(); if (isNaN(x.getTime())) return ''; return x.toISOString().slice(0, 10); } catch (e) { return ''; }
    }
    // size (dots) the QR will really come out at, for a given room
    function qrSizeFor(text, maxDots) {
      maxDots = Math.max(20, Math.round(maxDots));
      if (typeof window.qrcode !== 'function') return maxDots;
      try {
        var q = window.qrcode(0, 'M'); q.addData(String(text)); q.make();
        var total = q.getModuleCount() + 2, mag = Math.max(2, Math.floor(maxDots / total));
        return total * mag;
      } catch (e) { return maxDots; }
    }
    // the rows a text block really uses (same per-line estimate as fitLines, so ZPL and sample agree)
    function wrapRows(text, w, font, maxLines) {
      var s = fitLines(text, w, font, maxLines), per = Math.max(4, Math.floor(w / (font * 0.62)));
      var words = String(s).split(/\s+/).filter(Boolean), rows = [], cur = '';
      words.forEach(function (wd) {
        if (!cur) cur = wd; else if ((cur + ' ' + wd).length <= per) cur += ' ' + wd; else { rows.push(cur); cur = wd; }
      });
      if (cur) rows.push(cur);
      return rows.slice(0, maxLines);
    }
    function textEl(x, y, w, font, maxLines, text, align, extra) {
      var rows = (extra && extra.raw) ? [String(text)] : wrapRows(text, w, font, maxLines), el = { t: 'text', x: x, y: y, w: w, font: font, lines: maxLines, rows: rows, text: rows.join(' '), align: align || 'L' };
      if (extra) Object.keys(extra).forEach(function (k) { if (k !== 'raw') el[k] = extra[k]; });
      return el;
    }
    function gradeName(g) { g = String(g || '').trim(); if (/^oem/i.test(g)) return 'OEM'; if (/after/i.test(g)) return 'Aftermarket'; return g; }

    function layoutFor(part, unit, sizeId, opt) {
      opt = opt || {}; part = part || {}; unit = unit || null;
      var sp = sizeSpec(sizeId || prefs.labels.size);
      var dpi = opt.dpi || prefs.labels.dpi || 203;
      var wIn = opt.widthIn || sp.wIn, hIn = opt.heightIn || sp.hIn;
      var PW = Math.round(wIn * dpi), LL = Math.round(hIn * dpi);
      var m = Math.round(0.06 * dpi);
      var shift = (opt.shiftX != null) ? Math.max(0, parseInt(opt.shiftX, 10) || 0) : Math.max(0, parseInt(prefs.labels.shiftX, 10) || 0);   // 8z102: opt.shiftX (the Niimbot passes 0)
      var fullW = PW - shift - 2 * m;
      var tier = (hIn <= 1.1 && wIn <= 2.5) ? 1 : (hIn >= 1.75 ? 3 : 2);
      var sku = z(part.sku || part.id || ''), name = z(part.name || '');
      var price = (part.sellPriceCents != null && part.sellPriceCents !== '') ? '$' + (Number(part.sellPriceCents) / 100).toFixed(2) : '';
      var code = unit ? z(unit.serial || unit.id || '') : sku;
      var els = [];
      function skuEl(skuFont, skuY) {
        var f = fitFont(sku, fullW, skuFont), txt = sku.slice(0, Math.max(1, Math.floor(fullW / (f * 0.55))));
        return { t: 'text', x: m, y: skuY + (skuFont - f), w: fullW, font: f, lines: 1, rows: [txt], text: txt, align: 'L', bold: true };
      }

      if (tier < 3) {
        // tier 1 = today's 2x1 label; tier 2 adds one "Fits:" / "FCC" line under the price
        var skuFont = Math.round(Math.min(0.15, hIn * 0.15) * dpi), skuY = LL - m - skuFont;
        var nameFont = Math.round(Math.min(0.11, hIn * 0.10) * dpi), priceFont = Math.round(Math.min(0.17, hIn * 0.16) * dpi);
        var snFont = Math.round(Math.min(0.09, hIn * 0.09) * dpi), snY = skuY - 4 - snFont;
        var qrMax = Math.min(unit ? (snY - 3 - m) : (skuY - 6 - m), Math.round(0.36 * PW));   // 8z102
        var qr = qrSizeFor(code, qrMax), colW = unit ? Math.max(qr, 120) : qr;
        els.push({ t: 'qr', x: m, y: m, size: qr, data: code, mag: unit ? 3 : 4 });
        if (unit) els.push(textEl(m, snY, colW, snFont, 1, unit.serial ? 'SN: ' + code : code, 'L', { raw: 1 }));
        var tx = m + colW + Math.round(0.05 * dpi), tw = Math.max(60, PW - shift - tx - m), nameLines = unit ? 2 : 3;
        var nm = textEl(tx, m, tw, nameFont, nameLines, name, 'L');
        els.push(nm);
        var priceY = Math.min(skuY - 4 - priceFont, m + Math.round(nameFont * 1.15 * (nm.rows.length || 1)) + 4);
        if (price) els.push(textEl(tx, priceY, tw, priceFont, 1, price, 'L', { raw: 1 }));
        if (tier === 2) {
          var xt = part.fitment ? 'Fits: ' + z(part.fitment) : (part.fccId ? 'FCC ' + z(part.fccId) : '');
          var xf = Math.round(Math.min(0.09, hIn * 0.08) * dpi), xy = (price ? priceY + priceFont : m + Math.round(nameFont * 1.15 * (nm.rows.length || 1))) + 5;
          if (xt && xy + xf <= skuY - 4) { var xe = textEl(tx, xy, tw, xf, 2, xt, 'L'); if (xy + xe.rows.length * xf > skuY - 4) xe = textEl(tx, xy, tw, xf, 1, xt, 'L'); els.push(xe); }   // 8z102
        }
        els.push(skuEl(skuFont, skuY));
      } else {
        var sFont = Math.round(Math.min(0.2, hIn * 0.1) * dpi), sY = LL - m - sFont, ruleY = sY - 8;
        var small = Math.round(0.085 * dpi), lh = Math.round(small * 1.2), uf = Math.round(0.1 * dpi);
        var unitLines = unit ? 1 + (unit.acquired_at ? 1 : 0) : 0;
        var stack = LL >= PW * 0.95;   // 8z102: square or tall label — details go under the QR, full width
        var qrMax3 = Math.min(Math.round(0.45 * LL), Math.round(0.45 * PW), ruleY - 4 - m - (unit ? unitLines * (uf + 4) + 4 : 0));
        var qr3 = qrSizeFor(code, qrMax3), colW3 = (unit && !stack) ? Math.max(qr3, Math.round(1.0 * dpi)) : qr3, snW = stack ? fullW : colW3;
        els.push({ t: 'qr', x: m, y: m, size: qr3, data: code, mag: unit ? 3 : 4 });
        if (unit) {
          var uy = m + qr3 + 4;
          els.push(textEl(m, uy, snW, uf, 1, unit.serial ? 'SN: ' + code : code, 'L', { raw: 1 }));
          if (unit.acquired_at) els.push(textEl(m, uy + uf + 4, snW, small, 1, 'Received: ' + fmtDate(unit.acquired_at), 'L', { raw: 1 }));
        }
        var tx3 = m + colW3 + Math.round(0.05 * dpi), tw3 = Math.max(60, PW - shift - tx3 - m);
        var nFont = Math.round(Math.min(0.13, hIn * 0.065) * dpi), pFont = Math.round(Math.min(0.24, hIn * 0.12) * dpi);
        var nm3 = textEl(tx3, m, tw3, nFont, 3, name, 'L'); els.push(nm3);
        var y = m + Math.round(nFont * 1.15 * (nm3.rows.length || 1)) + 4;
        if (price) { els.push(textEl(tx3, y, tw3, pFont, 1, price, 'L', { raw: 1 })); y += pFont + 8; }
        var cat = String(part.category || '').split('/').pop().trim(), gr = gradeName(part.grade);
        var typeTxt = [cat, gr].filter(Boolean).join(' - ');
        var cands = [];   // in display order; "drop" = order they are given up when the label is full (1 first)
        if (part.fitment) cands.push({ key: 'fits', text: 'Fits: ' + z(part.fitment), n: 2, drop: 4 });
        if (part.fccId) cands.push({ key: 'fcc', text: 'FCC ID: ' + z(part.fccId), n: 1, drop: 3 });
        if (part.chip) cands.push({ key: 'chip', text: 'Chip: ' + z(part.chip), n: 1, drop: 2 });
        if (typeTxt) cands.push({ key: 'type', text: 'Type: ' + typeTxt, n: 1, drop: 1 });
        var limit = ruleY - 4, dx = stack ? m : tx3, dw = stack ? fullW : tw3;
        if (stack) y = Math.max(y, m + qr3 + (unit ? unitLines * (uf + 4) + 4 : 0) + 8);
        function rowsOf(c) { return wrapRows(c.text, dw, small, c.n).length; }
        function total() { return cands.reduce(function (s, c) { return s + rowsOf(c) * lh; }, 0); }
        while (cands.length && y + total() > limit) {
          var low = null; cands.forEach(function (c) { if (!low || c.drop < low.drop) low = c; });
          if (low.key === 'fits' && low.n === 2) { low.n = 1; low.drop = 5; } else cands.splice(cands.indexOf(low), 1);
        }
        cands.forEach(function (c) { var e = textEl(dx, y, dw, small, c.n, c.text, 'L'); els.push(e); y += e.rows.length * lh; });
        els.push({ t: 'line', x: m, y: ruleY, w: fullW });
        els.push(skuEl(sFont, sY));
      }
      return { wIn: wIn, hIn: hIn, dpi: dpi, PW: PW, LL: LL, shift: shift, tier: tier, els: els };
    }

    function toZPL(L, copies) {
      var n = Math.max(1, Math.min(200, parseInt(copies, 10) || 1));
      var out = ['^XA', '^CI28', '^PW' + L.PW, '^LL' + L.LL, '^MD' + (prefs.labels.darkness != null ? prefs.labels.darkness : 20), '^PR' + (prefs.labels.speed || 3)];
      L.els.forEach(function (e) {
        if (e.t === 'qr') { var g = qrGFA(e.data, e.x, e.y, e.size); out.push(g ? g.zpl : ('^FO' + e.x + ',' + e.y + '^BQN,2,' + (e.mag || 4) + '^FDMA,' + e.data + '^FS')); }
        else if (e.t === 'text') { if (e.text) out.push('^FO' + e.x + ',' + e.y + '^A0N,' + e.font + ',' + e.font + '^FB' + e.w + ',' + e.lines + ',0,' + (e.align || 'L') + '^FD' + e.text + '^FS'); }
        else if (e.t === 'line') out.push('^FO' + e.x + ',' + e.y + '^GB' + e.w + ',2,2^FS');
      });
      if (n > 1) out.push('^PQ' + n);
      out.push('^XZ');
      return out.join('\n');
    }

    var SANS = "'Arial Narrow','Roboto Condensed','Helvetica Neue',Arial,sans-serif";
    function toSVG(L) {
      var r = Math.round(0.06 * L.dpi), s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + L.PW + ' ' + L.LL + '" width="' + L.PW + '" height="' + L.LL
        + '" style="display:block;width:100%;height:auto" role="img" aria-label="Label sample ' + L.wIn + ' by ' + L.hIn + ' inches" data-tier="' + L.tier + '">'
        + '<rect x="2" y="2" width="' + (L.PW - 4) + '" height="' + (L.LL - 4) + '" rx="' + r + '" fill="#fff" stroke="#8a93a0" stroke-width="3"/>'
        + '<g transform="translate(' + (L.shift || 0) + ',0)" fill="#000" font-family="' + SANS + '">';
      L.els.forEach(function (e) {
        if (e.t === 'qr') {
          var done = false;
          if (typeof window.qrcode === 'function') {
            try {
              var q = window.qrcode(0, 'M'); q.addData(String(e.data)); q.make();
              var n = q.getModuleCount(), total = n + 2, mag = e.size / total, d = '';
              for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) if (q.isDark(yy, xx)) d += 'M' + (e.x + (xx + 1) * mag).toFixed(2) + ' ' + (e.y + (yy + 1) * mag).toFixed(2) + 'h' + mag.toFixed(2) + 'v' + mag.toFixed(2) + 'h-' + mag.toFixed(2) + 'z';
              s += '<path d="' + d + '" shape-rendering="crispEdges"/>'; done = true;
            } catch (er) {}
          }
          if (!done) s += '<rect x="' + e.x + '" y="' + e.y + '" width="' + e.size + '" height="' + e.size + '" fill="#c9ced6"/>';
        } else if (e.t === 'line') {
          s += '<rect x="' + e.x + '" y="' + e.y + '" width="' + e.w + '" height="3"/>';
        } else if (e.t === 'text') {
          var anchor = e.align === 'C' ? 'middle' : (e.align === 'R' ? 'end' : 'start'), ax = e.align === 'C' ? e.x + e.w / 2 : (e.align === 'R' ? e.x + e.w : e.x);
          (e.rows || []).forEach(function (row, i) {
            var tl = Math.max(4, Math.min(e.w, Math.round(row.length * 0.55 * e.font)));
            s += '<text x="' + Math.round(ax) + '" y="' + Math.round(e.y + e.font * 0.82 + i * e.font) + '" font-size="' + Math.round(e.font * 0.95) + '"'
              + (e.bold ? ' font-weight="700"' : '') + ' text-anchor="' + anchor + '" textLength="' + tl + '" lengthAdjust="spacingAndGlyphs">' + esc(row) + '</text>';
          });
        }
      });
      return s + '</g></svg>';
    }

    function defSize() { return prefs.labels.size; }
    function buildZPL(part, opt) {
      opt = opt || {};
      return toZPL(layoutFor(part, null, opt.size || defSize(), opt), opt.copies);
    }
    function buildUnitZPL(unit, part, opt) {
      opt = opt || {};
      return toZPL(layoutFor(part, unit || {}, opt.size || defSize(), opt), opt.copies);
    }

    function listDevices() {
      return new Promise(function (resolve, reject) {
        if (!sdkReady()) return reject(new Error('Browser Print not loaded.'));
        window.BrowserPrint.getLocalDevices(function (list) {
          var printers = Array.isArray(list) ? list : (list && list.printer) || [];
          resolve(printers);
        }, function (err) { reject(new Error(String(err))); }, 'printer');
      });
    }

    function device() {
      return new Promise(function (resolve, reject) {
        if (!sdkReady()) return reject(new Error('Browser Print not loaded — install Zebra Browser Print + the BrowserPrint SDK scripts (see Hardware settings).'));
        if (prefs.labels.deviceUid) {
          window.BrowserPrint.getLocalDevices(function (list) {
            var printers = Array.isArray(list) ? list : (list && list.printer) || [];
            var d = printers.filter(function (p) { return p.uid === prefs.labels.deviceUid; })[0];
            if (d) return resolve(d);
            window.BrowserPrint.getDefaultDevice('printer', resolve, function (e) { reject(new Error(String(e))); });
          }, function (e) { reject(new Error(String(e))); }, 'printer');
        } else {
          window.BrowserPrint.getDefaultDevice('printer', function (d) {
            if (!d) return reject(new Error('No default Zebra printer found in Browser Print.'));
            resolve(d);
          }, function (e) { reject(new Error(String(e))); });
        }
      });
    }

    // 8z26: label home — shift every label right by shiftX dots
    function home(zpl) { var x = Math.max(0, Math.min(200, parseInt(prefs.labels.shiftX, 10) || 0)); return x ? String(zpl).replace(/\^XA/g, '^XA^LH' + x + ',0') : zpl; }
    function sendZPL(zpl) {
      zpl = home(zpl);
      if ((prefs.labels.mode || 'helper') === 'helper') return helperCall('/zpl', { zpl: zpl });   // 8z26
      return device().then(function (d) {
        return new Promise(function (resolve, reject) {
          d.send(zpl, function () { resolve(d); }, function (err) { reject(new Error('Print error: ' + err)); });
        });
      });
    }

    function printPart(part, opt) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      return sendZPL(buildZPL(part, opt));
    }

    function printUnit(unit, part, opt) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      if (!unit || !unit.id) return Promise.reject(new Error('No unit id to print.'));
      return sendZPL(buildUnitZPL(unit, part, opt));
    }
    // One label per unit, sent in order on one device connection; resolves with the count printed.
    function printUnits(units, part, opt) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      units = (units || []).filter(function (u) { return u && u.id; });
      if (!units.length) return Promise.reject(new Error('No units to print.'));
      if ((prefs.labels.mode || 'helper') === 'helper')   // 8z26: one job, all labels
        return helperCall('/zpl', { zpl: home(units.map(function (u) { return buildUnitZPL(u, part, opt); }).join('\n')) }).then(function () { return units.length; });
      return device().then(function (d) {
        var i = 0;
        function next() {
          if (i >= units.length) return Promise.resolve(units.length);
          var zpl = home(buildUnitZPL(units[i++], part, opt));
          return new Promise(function (resolve, reject) {
            d.send(zpl, function () { resolve(); }, function (err) { reject(new Error('Print error: ' + err)); });
          }).then(next);
        }
        return next();
      });
    }

    // ---- "Print labels" dialog for one part: how many, which size, live sample ----
    var LAST_SIZE_KEY = 'tks_lbl_lastsize';
    function openPrintDialog(part, o) {
      o = o || {}; part = part || {};
      var L = prefs.labels, inStock = (o.inStock != null && isFinite(Number(o.inStock))) ? Math.max(0, Math.floor(Number(o.inStock))) : null;
      var ids = LABEL_SIZES.map(function (s) { return s.id; }).filter(function (id) { return (L.sizesOn || []).indexOf(id) >= 0; });
      if (!ids.length) ids = [L.size];
      var last = ''; try { last = localStorage.getItem(LAST_SIZE_KEY) || ''; } catch (e) {}
      var st = { count: 1, all: false, size: ids.indexOf(last) >= 0 ? last : (ids.indexOf(L.size) >= 0 ? L.size : ids[0]), mode: 'same', touched: false, units: [], busy: false };
      // 8z102: two kinds of label printer — the counter one (Zebra) and a Bluetooth NIIMBOT on this device
      var NB = window.TKS_NIIM || null, nbOn = !!(NB && prefs.niimbot && prefs.niimbot.enabled), zbOn = !!L.enabled;
      var lastPrn = ''; try { lastPrn = localStorage.getItem('tks_lbl_printer') || ''; } catch (e) {}
      st.printer = (nbOn && zbOn) ? (lastPrn === 'niimbot' ? 'niimbot' : 'zebra') : (nbOn ? 'niimbot' : 'zebra');
      function nb() { return st.printer === 'niimbot' && NB; }
      var CH = 'min-height:44px;min-width:44px;padding:8px 14px;border-radius:22px;border:2px solid var(--edge,#2a2f3a);background:transparent;color:var(--ink,#f4f5f7);font:700 15px -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer';
      var mo = modal('Print labels', '<div style="font-size:14px;margin:-4px 0 6px;font-weight:600">' + esc(part.name || 'Part') + '</div>'
        + '<div id="plPrnWrap" style="display:none"><div style="font-size:13px;color:var(--dim,#9aa3af);margin:10px 0 4px">Printer</div><div id="plPrn" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>'
        + '<div style="font-size:13px;color:var(--dim,#9aa3af);margin:10px 0 4px">How many?</div>'
        + '<div id="plChips" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center"></div>'
        + '<div style="margin-top:8px;display:flex;gap:8px;align-items:center;font-size:13px;color:var(--dim,#9aa3af)"><label for="plNum">Or type a number</label>'
        + '<input id="plNum" type="number" inputmode="numeric" min="1" max="200" value="1" style="width:90px;min-height:44px;box-sizing:border-box;background:var(--bg,#11141a);border:1px solid var(--edge,#2a2f3a);border-radius:9px;color:var(--ink,#f4f5f7);padding:6px 10px;font-size:16px"></div>'
        + '<div id="plSizeWrap"><div style="font-size:13px;color:var(--dim,#9aa3af);margin:14px 0 4px">Label size</div><div id="plSizes" style="display:flex;flex-wrap:wrap;gap:8px"></div></div>'
        + '<div id="plModeWrap" style="display:none;margin-top:14px"></div>'
        + '<div id="plNote" style="font-size:12px;color:var(--dim,#9aa3af);margin-top:8px;min-height:16px"></div>'
        + '<div style="font-size:13px;color:var(--dim,#9aa3af);margin:12px 0 4px">What it will look like</div>'
        + '<div id="plSample" style="margin:0 auto"></div>'
        + '<div id="plErr" role="alert" style="font-size:13px;color:#ff8a8a;margin-top:10px;min-height:0"></div>'
        + '<div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button type="button" id="plCancel" style="' + CH + ';flex:1">Cancel</button>'
        + '<button type="button" id="plGo" style="min-height:44px;flex:2;padding:8px 14px;border-radius:22px;border:none;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font:800 15px -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer"></button></div>');
      var $ = function (id) { return mo.card.querySelector('#' + id); };
      function chip(active) { return CH + (active ? ';background:#c8323c;border-color:#c8323c;color:#fff' : ''); }
      function ownList() { return st.units.slice(0, st.all ? st.units.length : Math.min(st.count, st.units.length)); }
      function copies() { return st.all ? (inStock || 1) : st.count; }
      function willPrint() { return (st.mode === 'own' && st.units.length) ? ownList().length : copies(); }
      function render() {
        var h = '';
        [1, 2, 3, 5, 10].forEach(function (n) { h += '<button type="button" data-n="' + n + '" style="' + chip(!st.all && st.count === n) + '" aria-pressed="' + (!st.all && st.count === n) + '">' + n + '</button>'; });
        if (inStock && inStock > 0) h += '<button type="button" data-all="1" style="' + chip(st.all) + '" aria-pressed="' + st.all + '">All in stock (' + inStock + ')</button>';
        $('plChips').innerHTML = h;
        $('plNum').value = st.all ? (inStock || 1) : st.count;
        $('plPrnWrap').style.display = (nbOn && zbOn) ? '' : 'none';
        if (nbOn && zbOn) $('plPrn').innerHTML = '<button type="button" data-prn="zebra" style="' + chip(st.printer === 'zebra') + '" aria-pressed="' + (st.printer === 'zebra') + '">Counter printer</button>'
          + '<button type="button" data-prn="niimbot" style="' + chip(st.printer === 'niimbot') + '" aria-pressed="' + (st.printer === 'niimbot') + '">Bluetooth (Niimbot)</button>';
        $('plSizeWrap').style.display = (!nb() && ids.length > 1) ? '' : 'none';
        $('plSizes').innerHTML = ids.map(function (id) { var sp = sizeSpec(id);
          return '<button type="button" data-sz="' + id + '" style="' + chip(st.size === id) + '" aria-pressed="' + (st.size === id) + '">' + esc(sp.label.replace(/ — /, ' ')) + '</button>'; }).join('');
        var mw = $('plModeWrap');
        if (st.units.length) {
          mw.style.display = '';
          var row = function (v, txt) { return '<label style="display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px;cursor:pointer"><input type="radio" name="plMode" value="' + v + '" style="width:22px;height:22px"' + (st.mode === v ? ' checked' : '') + '> ' + txt + '</label>'; };
          mw.innerHTML = row('own', 'Each key’s own label (with its serial number)') + row('same', 'Same label × ' + copies());
        } else mw.style.display = 'none';
        var note = '';
        if (st.mode === 'own' && st.units.length) {
          if (!st.all && st.count < st.units.length) note = 'Prints the first ' + st.count + ' keys (newest first).';
          else if (st.all && inStock && st.units.length < inStock) note = 'Only ' + st.units.length + ' of the ' + inStock + ' keys have their own serial number, so ' + st.units.length + ' labels will print.';
          else if (!st.all && st.count > st.units.length) note = 'Only ' + st.units.length + ' keys have their own serial number, so ' + st.units.length + ' labels will print.';
        }
        $('plNote').textContent = note;
        var unit = (st.mode === 'own' && st.units.length) ? st.units[0] : null;
        var sp = sizeSpec(st.size);
        var n = willPrint();
        if (nb()) {   // 8z102: the Niimbot prints the roll size chosen in Settings
          var nsz = NB.size(prefs.niimbot.size), stt = NB.status(), can = NB.supported();
          $('plSample').style.width = Math.min(nsz.w * 4.2, 460) + 'px'; $('plSample').style.maxWidth = '100%'; $('plSample').innerHTML = '';
          try { $('plSample').appendChild(NB.sampleCanvas(part, unit, nsz.id)); } catch (er) {}
          $('plNote').textContent = (note ? note + ' ' : '') + 'Niimbot label: ' + nsz.label + ' (change it in Settings → Printers & scanner).' + (can ? (stt.connected ? ' Connected to ' + stt.name + '.' : '') : ' ' + NB.whyNot());
          $('plGo').textContent = !can ? '🖼 Save the label as a picture' : (stt.connected ? '🖨 Print ' + n + ' label' + (n === 1 ? '' : 's') : '🔗 Connect the printer and print ' + n);
        } else {
        $('plSample').style.width = Math.min(sp.wIn * 90, 460) + 'px'; $('plSample').style.maxWidth = '100%';
        $('plSample').innerHTML = toSVG(layoutFor(part, unit, st.size));
        $('plGo').textContent = '🖨 Print ' + n + ' label' + (n === 1 ? '' : 's');
        }
        $('plGo').disabled = st.busy; $('plGo').style.opacity = st.busy ? '.6' : '1';
      }
      mo.card.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button'); if (!b || st.busy) return;
        if (b.hasAttribute('data-n')) { st.count = parseInt(b.getAttribute('data-n'), 10); st.all = false; if (!st.touched) st.mode = 'same'; render(); }
        else if (b.hasAttribute('data-all')) { st.all = true; if (!st.touched) st.mode = st.units.length ? 'own' : 'same'; render(); }
        else if (b.hasAttribute('data-sz')) { st.size = b.getAttribute('data-sz'); render(); }
        else if (b.hasAttribute('data-prn')) { st.printer = b.getAttribute('data-prn'); try { localStorage.setItem('tks_lbl_printer', st.printer); } catch (er) {} $('plErr').textContent = ''; render(); }
      });
      mo.card.addEventListener('change', function (e) {
        if (e.target.name === 'plMode') { st.mode = e.target.value; st.touched = true; render(); }
      });
      $('plNum').addEventListener('input', function () {
        var v = parseInt(this.value, 10); if (!(v >= 1)) return; st.count = Math.min(200, v); st.all = false; if (!st.touched) st.mode = 'same';
        var keep = this.value; render(); this.value = keep;
      });
      $('plCancel').onclick = mo.close;
      $('plGo').onclick = function () {
        if (st.busy) return; $('plErr').textContent = '';
        if (nb()) {   // 8z102: Bluetooth — connect on this tap if needed (the browser needs a tap to show its device list)
          var nN = willPrint(), nSize = prefs.niimbot.size, own = (st.mode === 'own' && st.units.length) ? ownList() : null;
          if (!NB.supported()) {   // iPhone / iPad: hand over the picture
            st.busy = true; render();
            NB.savePicture(part, own ? own[0] : null, nSize).then(function (how) { st.busy = false; render(); if (how !== 'cancelled') toast('Label picture ' + (how === 'shared' ? 'shared' : 'saved') + '. Print it from the NIIMBOT app.'); },
              function (err) { st.busy = false; render(); $('plErr').textContent = (err && err.message) || 'Could not make the picture.'; });
            return;
          }
          if (nN > 50 && !window.confirm('Print ' + nN + ' labels?')) return;
          st.busy = true; render();
          var first = NB.status().connected ? Promise.resolve() : NB.connect();
          first.then(function () { render(); return own ? NB.printUnits(own, part, nSize) : NB.printPart(part, copies(), nSize); })
            .then(function (done) { toast((done || nN) + ' label' + ((done || nN) === 1 ? '' : 's') + ' printed.'); mo.close(); })
            .catch(function (err) { st.busy = false; render(); $('plErr').textContent = (err && err.message) || 'The printer did not answer.'; });
          return;
        }
        if (!prefs.labels.enabled) { $('plErr').textContent = 'Turn on label printing in Settings → Printers & scanner.'; return; }
        var n = willPrint();
        if (n > 50 && !window.confirm('Print ' + n + ' labels?')) return;
        st.busy = true; render();
        try { localStorage.setItem(LAST_SIZE_KEY, st.size); } catch (e) {}
        var job = (st.mode === 'own' && st.units.length) ? printUnits(ownList(), part, { size: st.size }) : printPart(part, { size: st.size, copies: copies() });
        job.then(function () { toast(n + ' label' + (n === 1 ? '' : 's') + ' sent to the printer.'); mo.close(); })
          .catch(function (err) { st.busy = false; render(); $('plErr').textContent = (err && err.message) || 'The label printer did not answer. Check that it is on and has labels.'; });
      };
      render();
      if (typeof o.fetchUnits === 'function') {
        Promise.resolve().then(function () { return o.fetchUnits(); }).then(function (u) {
          u = (Array.isArray(u) ? u : []).filter(function (x) { return x && x.id; });
          if (!u.length || !document.body.contains(mo.card)) return;
          st.units = u; if (!st.touched) st.mode = st.all ? 'own' : 'same'; render();
        }).catch(function () {});
      }
      return mo;
    }

    return { buildZPL: buildZPL, printPart: printPart, buildUnitZPL: buildUnitZPL, printUnit: printUnit, printUnits: printUnits, listDevices: listDevices, sendZPL: sendZPL, sdkReady: sdkReady,
      SIZES: LABEL_SIZES, sizeSpec: sizeSpec, layoutFor: layoutFor, toSVG: toSVG, toZPL: toZPL, openPrintDialog: openPrintDialog };
  })();

  /* ========================================================================
     SETTINGS PANEL  (modal) — enable devices, set endpoints, test + preview
     ===================================================================== */
  function modal(title, bodyHTML, wide) {
    var back = document.createElement('div');
    back.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:100000;display:flex;align-items:center;justify-content:center;padding:14px';
    var card = document.createElement('div');
    card.style.cssText = 'background:var(--card,#1b1f27);color:var(--ink,#f4f5f7);width:100%;max-width:' + (wide ? '560px' : '460px')
      + ';border-radius:16px;padding:18px;max-height:92vh;overflow:auto;font-family:-apple-system,Segoe UI,Roboto,sans-serif';
    card.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
      + '<b style="font-size:17px">' + esc(title) + '</b>'
      + '<button type="button" data-x style="background:none;border:none;color:var(--dim,#9aa3af);font-size:24px;cursor:pointer;width:40px;height:40px">&times;</button></div>'
      + bodyHTML;
    back.appendChild(card);
    document.body.appendChild(back);
    function close() { back.remove(); }
    card.querySelector('[data-x]').onclick = close;
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    return { back: back, card: card, close: close };
  }
  function pre(text) {
    return '<pre style="background:var(--bg,#0c0f14);border:1px solid var(--edge,#2a2f3a);color:var(--ink,#f4f5f7);border-radius:10px;padding:12px;'
      + 'overflow:auto;font:12px/1.35 ui-monospace,Menlo,Consolas,monospace;white-space:pre;color:#cfe">'
      + esc(text) + '</pre>';
  }
  function sampleReceipt() {
    return {
      number: 'TKS-1042', date: (new Date()).toISOString().slice(0, 10),
      customer: 'Jane Doe', technician: (identity().name ? 'Staff' : 'Staff'),
      payment: 'Card', status: 'Paid in Full',
      items: [
        { desc: 'Ford HU101 high-security key blank', amount: 24.00, qty: 2, taxable: true },
        { desc: 'Cut & program smart key', amount: 180.00, qty: 1, taxable: false }
      ],
      totals: { grossSubtotal: 228.00, discount: 0, taxable: 48, tax: 4.14, taxRate: 8.625, surcharge: 4.64, subtotal: 228.00, total: 236.78 }
    };
  }
  function samplePart() { return { sku: 'HU101-F', name: 'Ford HU101 high-security key blank', id: 'inv_demo' }; }

  function field(label, html) {
    return '<label style="display:block;font-size:12px;color:var(--dim,#9aa3af);margin:10px 0 4px">' + esc(label) + '</label>' + html;
  }
  function inputCss() { return 'width:100%;box-sizing:border-box;background:var(--bg,#11141a);border:1px solid var(--edge,#2a2f3a);border-radius:9px;color:var(--ink,#f4f5f7);padding:9px;font-size:14px'; }
  function btn(label, id, kind) {
    // 8k: follows the app theme (was dark-only); the primary button stays red/white
    var bg = kind === 'go' ? 'linear-gradient(180deg,#c8323c,#8f1f27)' : 'var(--edge,#2a2f3a)';
    var fg = kind === 'go' ? '#fff' : 'var(--ink,#f4f5f7)';
    return '<button type="button" id="' + id + '" style="padding:9px 12px;border-radius:9px;border:none;background:' + bg + ';color:' + fg + ';font-weight:700;cursor:pointer;margin:4px 6px 0 0">' + esc(label) + '</button>';
  }

  // sample smart key shown on every size card (drawn with the same layout engine as the real label)
  function sampleKey() {
    return { id: 'inv_sample', name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150',
      fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', category: 'Keys/Smart Key', grade: 'OEM' };
  }
  function labelSizeCards(lb) {
    var chk = 'width:22px;height:22px;flex:none', row = 'display:flex;align-items:center;gap:8px;min-height:44px;font-size:14px;cursor:pointer';
    return labels.SIZES.map(function (sz) {
      var custom = sz.id === 'custom';
      return '<div data-szcard="' + sz.id + '" style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:10px;margin-top:10px">'
        + '<div style="font-weight:800;font-size:15px">' + esc(sz.label) + '</div>'
        + '<div style="font-size:12px;color:var(--dim,#9aa3af)">' + esc(sz.hint) + '</div>'
        + '<div style="display:flex;flex-wrap:wrap;gap:0 18px">'
        + '<label style="' + row + '"><input type="checkbox" data-szon="' + sz.id + '" style="' + chk + '"' + (lb.sizesOn.indexOf(sz.id) >= 0 ? ' checked' : '') + '> We have this size</label>'
        + '<label style="' + row + '"><input type="radio" name="hwLbSize" value="' + sz.id + '" style="' + chk + '"' + (lb.size === sz.id ? ' checked' : '') + '> Use by default</label></div>'
        + (custom ? '<div style="display:flex;gap:8px"><div style="flex:1">' + field('Width in', '<input id="hwLbW" type="number" step="0.05" min="0.75" max="8" value="' + (parseFloat(lb.customW) || 2.5) + '" style="' + inputCss() + ';min-height:44px">') + '</div>'
          + '<div style="flex:1">' + field('Height in', '<input id="hwLbH" type="number" step="0.05" min="0.5" max="8" value="' + (parseFloat(lb.customH) || 1.5) + '" style="' + inputCss() + ';min-height:44px">') + '</div></div>' : '')
        + '<div data-szsample="' + sz.id + '" style="margin-top:8px"></div></div>';
    }).join('');
  }

  function openSettings() {
    var s = prefs.scanner, th = prefs.thermal, lb = prefs.labels;
    var starOk = thermal.sdkReady(), zebraOk = labels.sdkReady();
    var body = ''
      + '<div style="font-size:12px;color:var(--dim,#9aa3af);margin-bottom:6px">Settings are saved on THIS device only (printers are per-workstation).</div>'
      // 8z26: the print helper
      + '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:12px">'
      + '<b>Bittings Print Helper</b> <span id="hwHelpSt" style="font-size:12px;color:#9aa3af">● checking…</span>'
      + '<div style="font-size:12px;color:var(--dim,#9aa3af);margin-top:4px">Runs on the counter PC and prints to its Star receipt printer, cash drawer and Zebra label printer. Use Bittings on that PC to print.</div>'
      + '<div>' + btn('Check again', 'hwHelpChk') + btn('Open cash drawer', 'hwDrawer') + '</div>'
      + '</div>'

      // SCANNER
      + '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:12px">'
      + '<b>1 · Barcode scanner</b>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px"><input type="checkbox" id="hwScanEn"' + (s.enabled ? ' checked' : '') + '> Enable scan-to-ticket (keyboard-wedge)</label>'
      + field('Test — focus here and scan, or type a code + Enter:', '<input id="hwScanTest" placeholder="(last scan shows below)" style="' + inputCss() + '">')
      + '<div id="hwScanOut" style="font-size:13px;color:#7fd49b;margin-top:6px;min-height:18px"></div>'
      + '<div style="font-size:11px;color:#7a8190;margin-top:4px">No driver needed — put the scanner in USB-HID (keyboard) mode, suffix = Enter.</div>'
      + '</div>'

      // THERMAL
      + '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:12px">'
      + '<b>2 · Star TSP100 receipt + drawer</b> <span style="font-size:11px;color:' + (starOk ? '#7fd49b' : '#f2b43a') + '">' + (starOk ? '● SDK loaded' : '● Star Web SDK not loaded') + '</span>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px"><input type="checkbox" id="hwThEn"' + (th.enabled ? ' checked' : '') + '> Enable thermal receipts</label>'
      + field('Send receipts through', '<select id="hwThMode" style="' + inputCss() + '"><option value="helper"' + ((th.mode || 'helper') === 'helper' ? ' selected' : '') + '>Bittings Print Helper (this PC)</option><option value="webprnt"' + (th.mode === 'webprnt' ? ' selected' : '') + '>Star WebPRNT endpoint</option></select>')
      + field('WebPRNT endpoint (only for WebPRNT)', '<input id="hwThUrl" value="' + esc(th.endpoint) + '" style="' + inputCss() + '">')
      + '<div style="display:flex;gap:8px">'
      + '<div style="flex:1">' + field('Columns', '<select id="hwThW" style="' + inputCss() + '"><option value="48"' + (th.width === 48 ? ' selected' : '') + '>48 (80mm)</option><option value="32"' + (th.width === 32 ? ' selected' : '') + '>32 (58mm)</option></select>') + '</div>'
      + '<div style="flex:1">' + field('Copies', '<input id="hwThCopies" type="number" min="1" max="3" value="' + (th.copies || 1) + '" style="' + inputCss() + '">') + '</div>'
      + '</div>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px"><input type="checkbox" id="hwThKick"' + (th.drawerKick ? ' checked' : '') + '> Kick cash drawer on print</label>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px"><input type="checkbox" id="hwThLogo"' + (th.logo !== false ? ' checked' : '') + '> Print the shop logo at the top of the receipt</label>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px"><input type="checkbox" id="hwThAuto"' + (th.autoPrint ? ' checked' : '') + '> Auto-print the receipt on every sale (a printer problem never blocks the sale)</label>'
      + '<div>' + btn('Preview', 'hwThPrev') + btn('Test print', 'hwThTest', 'go') + '</div>'
      + '</div>'

      // LABELS
      + '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:8px">'
      + '<b>3 · Zebra ZD421 labels</b> <span style="font-size:11px;color:' + (zebraOk ? '#7fd49b' : '#f2b43a') + '">' + (zebraOk ? '● Browser Print loaded' : '● Browser Print not loaded') + '</span>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px;min-height:44px"><input type="checkbox" id="hwLbEn" style="width:22px;height:22px"' + (lb.enabled ? ' checked' : '') + '> Enable label printing</label>'
      + '<div style="font-size:16px;font-weight:800;margin-top:10px">What size labels do you use?</div>'
      + '<div style="font-size:12px;color:var(--dim,#9aa3af);margin-top:2px">Tick every size you have rolls for. Bigger labels show more about the key. The pictures below are drawn to scale.</div>'
      + labelSizeCards(lb)
      + '<div style="font-size:12px;color:var(--dim,#9aa3af);margin-top:10px">The printer holds one roll at a time. When you change rolls, pick that size when you print — the printer re-measures the label by itself after you close the lid (or press Feed once).</div>'
      + field('Send labels through', '<select id="hwLbMode" style="' + inputCss() + '"><option value="helper"' + ((lb.mode || 'helper') === 'helper' ? ' selected' : '') + '>Bittings Print Helper (this PC)</option><option value="browserprint"' + (lb.mode === 'browserprint' ? ' selected' : '') + '>Zebra Browser Print</option></select>')
      + field('Printer (Browser Print only)', '<select id="hwLbDev" style="' + inputCss() + '"><option value="">(OS default)</option></select>')
      + '<div style="display:flex;gap:8px">'
      + '<div style="flex:1">' + field('DPI', '<select id="hwLbDpi" style="' + inputCss() + '"><option value="203"' + (lb.dpi === 203 ? ' selected' : '') + '>203</option><option value="300"' + (lb.dpi === 300 ? ' selected' : '') + '>300</option></select>') + '</div>'
      + '<div style="flex:1">' + field('Darkness (0-30)', '<input id="hwLbDark" type="number" min="0" max="30" value="' + lb.darkness + '" style="' + inputCss() + '">') + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px">'
      + '<div style="flex:1">' + field('Left margin (dots)', '<input id="hwLbShift" type="number" min="0" max="200" value="' + (lb.shiftX != null ? lb.shiftX : 40) + '" style="' + inputCss() + '">') + '</div>'
      + '<div style="flex:1">' + field('Speed (ips)', '<input id="hwLbSpeed" type="number" min="2" max="6" value="' + lb.speed + '" style="' + inputCss() + '">') + '</div>'
      + '</div>'
      + '<div>' + btn('Refresh printers', 'hwLbScan') + btn('Preview ZPL', 'hwLbPrev') + btn('Test label', 'hwLbTest', 'go') + '</div>'
      + '</div>'

      // 8z102: NIIMBOT over Bluetooth (this phone / tablet / PC talks to the printer directly — no counter PC needed)
      + (window.TKS_NIIM ? (function () { var NB = window.TKS_NIIM, nbp = prefs.niimbot || {}, why = NB.whyNot();
        return '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:8px">'
          + '<b>4 · Bluetooth label printer (Niimbot)</b> <span style="font-size:11px;color:' + (why ? '#f2b43a' : '#7fd49b') + '">' + (why ? '● not available on this device' : '● Bluetooth available') + '</span>'
          + '<div style="font-size:12.5px;color:var(--dim,#9aa3af);margin-top:4px;line-height:1.45">For a small Bluetooth label printer you keep in the van or at the bench. This device prints to it directly. Works in Chrome on Android and on a Windows PC.</div>'
          + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px;min-height:44px"><input type="checkbox" id="hwNbEn" style="width:22px;height:22px"' + (nbp.enabled ? ' checked' : '') + '> Use a Niimbot printer on this device</label>'
          + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
          + '<div style="flex:1;min-width:120px">' + field('Printer model', '<select id="hwNbModel" style="' + inputCss() + ';min-height:44px">' + NB.MODELS.map(function (m) { return '<option value="' + m.id + '"' + (nbp.model === m.id ? ' selected' : '') + '>' + esc(m.label) + '</option>'; }).join('') + '</select>') + '</div>'
          + '<div style="flex:2;min-width:160px">' + field('Label roll in the printer', '<select id="hwNbSize" style="' + inputCss() + ';min-height:44px">' + NB.SIZES.map(function (z) { return '<option value="' + z.id + '"' + (nbp.size === z.id ? ' selected' : '') + '>' + esc(z.label + (z.hint ? ' — ' + z.hint : '')) + '</option>'; }).join('') + '</select>') + '</div>'
          + '<div style="flex:1;min-width:100px">' + field('Darkness (1–5)', '<input id="hwNbDens" type="number" min="1" max="5" value="' + (nbp.density || 3) + '" style="' + inputCss() + ';min-height:44px">') + '</div>'
          + '</div>'
          + '<div style="font-size:13px;color:var(--dim,#9aa3af);margin:10px 0 4px">What it will look like</div><div id="hwNbSample"></div>'
          + (why ? '<div style="font-size:12.5px;color:#f2b43a;margin-top:8px;line-height:1.45">' + esc(why) + '</div>' : '')
          + '<div style="margin-top:8px"><button type="button" id="hwNbTest" style="min-height:46px;padding:10px 16px;border-radius:10px;border:none;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font:800 14px -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer">' + (why ? 'Save a test label as a picture' : 'Connect and print a test label') + '</button></div>'
          + '<div id="hwNbMsg" role="status" style="font-size:13px;margin-top:6px;min-height:18px"></div>'
          + '<div style="font-size:11.5px;color:var(--dim,#9aa3af);margin-top:6px;line-height:1.45">Use genuine NIIMBOT rolls (the printer reads a tag on the roll). The printing code is the open-source NiimBlueLib — it is not made by NIIMBOT. Other Niimbot models are not set up yet.</div>'
          + '</div>'; })() : '');

    var mo = modal('🖨️ Hardware', body, true);
    var $ = function (id) { return mo.card.querySelector('#' + id); };

    // live scan feedback inside the panel
    var prevHandler = scan.handler;
    scan.handler = function (code) { var o = $('hwScanOut'); if (o) o.textContent = '✓ scanned: ' + code; var t = $('hwScanTest'); if (t) t.value = code; };
    mo.back.addEventListener('click', function (e) { if (e.target === mo.back) scan.handler = prevHandler; });
    $('hwScanTest').addEventListener('keydown', function (e) { /* terminator handled globally */ });

    function save() {
      prefs.scanner.enabled = $('hwScanEn').checked;
      prefs.thermal.enabled = $('hwThEn').checked;
      prefs.thermal.mode = $('hwThMode').value || 'helper';
      prefs.labels.mode = $('hwLbMode').value || 'helper';
      prefs.thermal.endpoint = $('hwThUrl').value.trim() || DEFAULTS.thermal.endpoint;
      prefs.thermal.width = parseInt($('hwThW').value, 10) || 48;
      prefs.thermal.copies = Math.max(1, Math.min(3, parseInt($('hwThCopies').value, 10) || 1));
      prefs.thermal.drawerKick = $('hwThKick').checked;
      prefs.thermal.logo = $('hwThLogo').checked; prefs.thermal.printLogo = prefs.thermal.logo;
      prefs.thermal.autoPrint = $('hwThAuto').checked;
      prefs.labels.enabled = $('hwLbEn').checked;
      prefs.labels.deviceUid = $('hwLbDev').value;
      prefs.labels.dpi = parseInt($('hwLbDpi').value, 10) || 203;
      prefs.labels.customW = Math.max(0.75, Math.min(8, parseFloat($('hwLbW').value) || 2.5));
      prefs.labels.customH = Math.max(0.5, Math.min(8, parseFloat($('hwLbH').value) || 1.5));
      var on = [], dr = mo.card.querySelector('input[name="hwLbSize"]:checked');
      mo.card.querySelectorAll('[data-szon]').forEach(function (c) { if (c.checked) on.push(c.getAttribute('data-szon')); });
      prefs.labels.size = dr ? dr.value : prefs.labels.size;
      if (on.indexOf(prefs.labels.size) < 0) on.push(prefs.labels.size);
      prefs.labels.sizesOn = on; normLabelPrefs();
      mo.card.querySelectorAll('[data-szon]').forEach(function (c) { c.checked = prefs.labels.sizesOn.indexOf(c.getAttribute('data-szon')) >= 0; });
      prefs.labels.darkness = Math.max(0, Math.min(30, parseInt($('hwLbDark').value, 10) || 20));
      prefs.labels.speed = Math.max(2, Math.min(6, parseInt($('hwLbSpeed').value, 10) || 3));
      prefs.labels.shiftX = Math.max(0, Math.min(200, parseInt($('hwLbShift').value, 10) || 0));
      if ($('hwNbEn')) { prefs.niimbot = prefs.niimbot || {}; prefs.niimbot.enabled = $('hwNbEn').checked; prefs.niimbot.model = $('hwNbModel').value; prefs.niimbot.size = $('hwNbSize').value;
        prefs.niimbot.density = Math.max(1, Math.min(5, parseInt($('hwNbDens').value, 10) || 3)); }   // 8z102
      persist();
    }
    // persist on any change
    mo.card.addEventListener('change', function () { save(); samples(); nbSample(); });
    // 8z102: Niimbot sample + test
    function nbSample() { var h = $('hwNbSample'); if (!h || !window.TKS_NIIM) return; h.innerHTML = ''; try { h.appendChild(TKS_NIIM.sampleCanvas(sampleKey(), null, prefs.niimbot.size)); } catch (e) {} }
    function sampleKey() { return { name: 'Ford F-150 2015-2020 5-Button Smart Key', sku: 'FORD-R8134', sellPriceCents: 16500, fitment: '2015-2020 Ford F-150', fccId: 'M3N-A2C31243300', chip: 'Hitag Pro (ID49)', category: 'Keys/Smart Key', grade: 'OEM' }; }
    if ($('hwNbTest')) { nbSample(); $('hwNbTest').onclick = function () { var NB = window.TKS_NIIM, msg = $('hwNbMsg'), bt = $('hwNbTest'); save(); msg.style.color = '';
        if (!NB.supported()) { NB.savePicture(sampleKey(), null, prefs.niimbot.size).then(function (how) { msg.textContent = how === 'cancelled' ? '' : 'Test label picture ' + (how === 'shared' ? 'shared.' : 'saved.'); }, function (e) { msg.style.color = '#ff8a8a'; msg.textContent = (e && e.message) || String(e); }); return; }
        bt.disabled = true; msg.textContent = NB.status().connected ? 'Printing…' : 'Pick your printer in the box the browser shows…';
        (NB.status().connected ? Promise.resolve() : NB.connect()).then(function () { msg.textContent = 'Connected to ' + NB.status().name + '. Printing…'; return NB.printPart(sampleKey(), 1, prefs.niimbot.size); })
          .then(function () { msg.style.color = '#7fd49b'; msg.textContent = '✓ Test label printed on ' + NB.status().name + '.'; }, function (e) { msg.style.color = '#ff8a8a'; msg.textContent = (e && e.message) || String(e); })
          .then(function () { bt.disabled = false; }); }; }
    // the little pictures: drawn to scale (90 px per inch) with the same layout the printer gets
    function samples() {
      mo.card.querySelectorAll('[data-szsample]').forEach(function (d) {
        var sp = labels.sizeSpec(d.getAttribute('data-szsample'));
        d.innerHTML = '<div style="width:' + Math.round(sp.wIn * 90) + 'px;max-width:100%">' + labels.toSVG(labels.layoutFor(sampleKey(), null, sp.id)) + '</div>';
      });
    }
    samples();

    // 8z26: helper status + drawer
    function chk() { var st = $('hwHelpSt'); if (!st) return; st.textContent = '● checking…'; st.style.color = '#9aa3af';
      helperStatus().then(function (j) { st.textContent = '● connected — receipt: ' + (j.receiptPrinter || 'none') + ' · labels: ' + (j.labelPrinter || 'none'); st.style.color = '#7fd49b'; })
        .catch(function () { st.textContent = '● not found on this computer'; st.style.color = '#f2b43a'; }); }
    chk(); $('hwHelpChk').onclick = chk;
    $('hwDrawer').onclick = function () { thermal.openDrawer().then(function () { toast('Drawer opened.');
        try { if (window.TKS && TKS.Audit) TKS.Audit.log('drawer_open_manual', 'drawer', 'counter', { from: 'Hardware settings' }); } catch (e) {}   // 8z69
      }).catch(function (e) { toast(e.message, false); }); };

    // thermal preview / test
    $('hwThPrev').onclick = function () { save(); modal('Thermal preview (' + prefs.thermal.width + ' cols)', pre(thermal.previewText(sampleReceipt(), { width: prefs.thermal.width, drawer: true, logo: true }))); };
    $('hwThTest').onclick = function () {
      save();
      thermal.printReceipt(sampleReceipt()).then(function () { toast('Test receipt sent.'); })
        .catch(function (e) { toast(e.message, false); });
    };

    // labels: populate device list, preview, test
    function fillDevices() {
      if (!labels.sdkReady()) return;
      labels.listDevices().then(function (printers) {
        var sel = $('hwLbDev');
        sel.innerHTML = '<option value="">(OS default)</option>' + printers.map(function (p) {
          return '<option value="' + esc(p.uid) + '"' + (p.uid === prefs.labels.deviceUid ? ' selected' : '') + '>' + esc(p.name || p.uid) + '</option>';
        }).join('');
      }).catch(function () {});
    }
    fillDevices();
    $('hwLbScan').onclick = function () { fillDevices(); toast('Refreshed.'); };
    $('hwLbPrev').onclick = function () { save(); modal('ZPL preview — paste into labelary.com/viewer to render', pre(labels.buildZPL(samplePart()))); };
    $('hwLbTest').onclick = function () {
      save();
      labels.printPart(samplePart()).then(function () { toast('Test label sent.'); })
        .catch(function (e) { toast(e.message, false); });
    };
  }

  // ---- boot ---------------------------------------------------------------
  scan.start();

  /* 8z81: printDoc(copy, o) — copy = the receipt in thermal form; o = { btn, reprint, paidAt, fullPage(), ask(title, body) → Promise<bool>, alert(title, body) }.
     Sends straight to the helper on this computer. Nothing listening here → asks to open the full-page copy instead.
     The cash drawer opens only for a payment taken in the last 10 minutes, never on a reprint. */
  function printDoc(copy, o) {
    o = o || {}; var btn = o.btn || null, was = btn ? btn.textContent : '';
    var restore = function () { if (btn) { btn.textContent = was; btn.disabled = false; } };
    var noPrinter = function () { restore();
      var ask = o.ask || function (t, b) { return Promise.resolve(window.confirm(t + '\n\n' + b)); };
      ask('No receipt printer on this computer', 'The receipt printer is connected to the counter computer. Open a full-page copy to print on this computer\'s own printer instead?').then(function (ok) { if (ok && o.fullPage) o.fullPage(); }); };
    if (btn) { btn.disabled = true; btn.textContent = '🖨 Printing…'; }
    var fresh = !o.reprint && o.paidAt && (Date.now() - Number(o.paidAt) < 10 * 60000);
    return thermal.printReceipt(copy, { force: true, noDrawer: !fresh }).then(function () { if (btn) { btn.textContent = '✓ Sent to the printer'; setTimeout(restore, 2500); } return true; },
      function (e) { var m = String((e && e.message) || '');
        if (/reach the Bittings Print Helper/i.test(m)) { noPrinter(); return false; }
        restore(); (o.alert || function (t, b) { window.alert(t + '\n\n' + b); })('Did not print', (m || 'The printer did not answer.') + ' Check that the receipt printer is on and has paper.'); return false; });
  }

  window.TKS_HW = {
    printDoc: printDoc,
    prefs: function () { return prefs; },
    save: persist,
    scanner: scan,
    thermal: thermal,
    labels: labels,
    openSettings: openSettings,
    helperStatus: helperStatus
  };
})();
