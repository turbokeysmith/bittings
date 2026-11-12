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
      printLogo: false,     // off until verified on the real printer
      autoPrint: false,     // C-#14: print the customer receipt automatically on every sale
      copies: 1
    },
    labels: {
      enabled: false,
      mode: 'helper',       // 8z26: 'helper' (Bittings Print Helper) | 'browserprint' (Zebra Browser Print)
      deviceUid: '',        // chosen Zebra device uid (blank = OS default)
      shiftX: 40,           // 8z26: dots to move everything right (the ZD420 started printing left of the label edge)
      dpi: 203,
      widthIn: 2.0,         // 8z26c: the shop's ZD420 labels are 2.00 x 1.00 in
      heightIn: 1.0,
      darkness: 20,
      speed: 3
    }
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

      if (opt.logo && prefs.thermal.printLogo && (id.logo)) T.push({ t: 'logo' });

      // header
      line(id.name || 'RECEIPT', 'center', true, true);
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
      line(row('Receipt: ' + num, date, w));
      if (r.customer) line(row('Customer: ' + r.customer, '', w));
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
      if (t.tax != null) line(row('Tax' + (t.taxRate ? ' (' + t.taxRate + '%)' : ''), money(t.tax), w));
      if (t.surcharge) line(row('Card surcharge', money(t.surcharge), w));
      // 8z26d: the big TOTAL prints ~1.7x wider, so it gets its own narrower row (amount was cut off)
      line(row('TOTAL', money(t.total != null ? t.total : sub), Math.floor(w / 1.75)), 'left', true, true);
      if (r.payment) { T.push({ t: 'rule' }); line(row('Paid by', r.payment, w)); }
      if (r.status) line(row('Status', r.status, w));

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
    function helperLines(r) {
      var w = prefs.thermal.width || 48, out = [], drawer = false;
      tokens(r, { drawer: wantsDrawer(r), logo: false }).forEach(function (tk) {
        if (tk.t === 'text') out.push({ text: tk.align === 'left' ? tk.data : String(tk.data).trim(), align: tk.align, bold: tk.bold, big: tk.big });
        else if (tk.t === 'rule') out.push({ text: rule(w), align: 'left' });
        else if (tk.t === 'barcode') out.push({ text: '# ' + tk.data, align: 'center' });
        else if (tk.t === 'drawer') drawer = true;
      });
      return { lines: out, drawer: drawer };
    }
    function printReceipt(r) {
      if (!prefs.thermal.enabled) return Promise.reject(new Error('Thermal printing is disabled in Hardware settings.'));
      if ((prefs.thermal.mode || 'helper') === 'helper') { var job = helperLines(r);
        return helperCall('/receipt', { lines: job.lines, cols: prefs.thermal.width || 48, drawer: job.drawer && prefs.thermal.drawerKick, copies: Math.max(1, prefs.thermal.copies || 1) }); }
      if (!sdkReady()) return Promise.reject(new Error('Star Web SDK not loaded — add StarWebPrintBuilder.js + StarWebPrintTrader.js (see Hardware settings).'));
      var copies = Math.max(1, prefs.thermal.copies || 1);
      var chain = buildRequest(r, { drawer: wantsDrawer(r), logo: true }).then(function (req) { return send(req); });
      for (var i = 1; i < copies; i++) {
        chain = chain.then(function () { return buildRequest(r, { drawer: false, logo: true }); }).then(send);
      }
      return chain;
    }

    function openDrawer() { return helperCall('/drawer', {}); }   // 8z26
    return {
      printReceipt: printReceipt,
      openDrawer: openDrawer,
      previewText: previewText,
      sdkReady: sdkReady,
      _tokens: tokens
    };
  })();

  /* ========================================================================
     3) INVENTORY LABELS  (Zebra ZD421 / ZPL via Browser Print)
     ===================================================================== */
  var labels = (function () {

    function sdkReady() { return typeof window.BrowserPrint === 'object' && window.BrowserPrint; }

    // strip ZPL control chars from user data
    function z(s) { return String(s == null ? '' : s).replace(/[\^~]/g, ' '); }

    // parameterized label: Code-128 SKU barcode + human SKU + wrapped part name
    function buildZPL(part, opt) {
      // 8z29f: part label — QR top-left, name (3 lines) + price right, part number big across the bottom
      opt = opt || {}; part = part || {};
      var dpi = opt.dpi || prefs.labels.dpi || 203;
      var wIn = opt.widthIn || prefs.labels.widthIn || 2.0;
      var hIn = opt.heightIn || prefs.labels.heightIn || 1.0;
      var PW = Math.round(wIn * dpi), LL = Math.round(hIn * dpi);
      var m = Math.round(0.06 * dpi);
      var shift = Math.max(0, parseInt(prefs.labels.shiftX, 10) || 0);
      var fullW = PW - shift - 2 * m;
      var sku = z(part.sku || part.id || '');
      var name = z(part.name || '');
      var price = (part.sellPriceCents != null && part.sellPriceCents !== '') ? '$' + (Number(part.sellPriceCents) / 100).toFixed(2) : '';
      var skuFont = Math.round(Math.min(0.15, hIn * 0.15) * dpi);          // big, never shrunk — the whole bottom row is its
      var skuY = LL - m - skuFont;
      var nameFont = Math.round(Math.min(0.11, hIn * 0.10) * dpi);
      var priceFont = Math.round(Math.min(0.17, hIn * 0.16) * dpi);
      function header(){ return ['^XA', '^CI28', '^PW' + PW, '^LL' + LL, '^MD' + (prefs.labels.darkness != null ? prefs.labels.darkness : 20), '^PR' + (prefs.labels.speed || 3)]; }
      function right(qrSize, bottomY, nameLines){
        var tx = m + qrSize + Math.round(0.05 * dpi), tw = Math.max(60, PW - shift - tx - m);
        var nm = fitLines(name, tw, nameFont, nameLines);
        var priceY = Math.min(bottomY - priceFont, m + Math.round(nameFont * 1.15 * (fitLines.lastLines || nameLines)) + 4);   // 8z29g: right under the name
        return [ '^FO' + tx + ',' + m + '^A0N,' + nameFont + ',' + nameFont + '^FB' + tw + ',' + nameLines + ',0,L^FD' + nm + '^FS',
                 price ? ('^FO' + tx + ',' + priceY + '^A0N,' + priceFont + ',' + priceFont + '^FB' + tw + ',1,0,L^FD' + price + '^FS') : '' ];
      }
      var skuLine = '^FO' + m + ',' + skuY + '^A0N,' + skuFont + ',' + skuFont + '^FB' + fullW + ',1,0,L^FD' + sku + '^FS';
      var g = qrGFA(sku, m, m, skuY - 6 - m);
      var qrSize = g ? g.size : (skuY - 6 - m);
      return header().concat([ g ? g.zpl : ('^FO' + m + ',' + m + '^BQN,2,4^FDMA,' + sku + '^FS') ], right(qrSize, skuY - 4, 3), [ skuLine, '^XZ' ]).filter(Boolean).join('\n');
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

    function printPart(part) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      return sendZPL(buildZPL(part));
    }

    // ---- Per-UNIT label (serialized keys, phase 6 inventory_units) ----
    // Top: part name (1 line) + SKU · received date. Middle: Code-128 of the UNIT id
    // (u_ + 32 hex = 34 chars → narrow 1-dot modules so it fits a 2.25" label; the
    // scanner returns the id and the app opens that unit's story). Bottom: the id in text.
    function fmtDate(d) {
      try { var x = d ? new Date(d) : new Date(); if (isNaN(x.getTime())) return ''; return x.toISOString().slice(0, 10); } catch (e) { return ''; }
    }
    function buildUnitZPL(unit, part, opt) {
      // 8z29f: key label — QR (of the 7-char serial) top-left with "SN: XXXXXXX" small right under it,
      // name (2 lines) + price right, part number big across the bottom
      opt = opt || {}; unit = unit || {}; part = part || {};
      var dpi = opt.dpi || prefs.labels.dpi || 203;
      var wIn = opt.widthIn || prefs.labels.widthIn || 2.0;
      var hIn = opt.heightIn || prefs.labels.heightIn || 1.0;
      var PW = Math.round(wIn * dpi), LL = Math.round(hIn * dpi);
      var m = Math.round(0.06 * dpi);
      var shift = Math.max(0, parseInt(prefs.labels.shiftX, 10) || 0);
      var fullW = PW - shift - 2 * m;
      var sku = z(part.sku || part.id || '');
      var name = z(part.name || '');
      var price = (part.sellPriceCents != null && part.sellPriceCents !== '') ? '$' + (Number(part.sellPriceCents) / 100).toFixed(2) : '';
      var skuFont = Math.round(Math.min(0.15, hIn * 0.15) * dpi);          // big, never shrunk — the whole bottom row is its
      var skuY = LL - m - skuFont;
      var nameFont = Math.round(Math.min(0.11, hIn * 0.10) * dpi);
      var priceFont = Math.round(Math.min(0.17, hIn * 0.16) * dpi);
      function header(){ return ['^XA', '^CI28', '^PW' + PW, '^LL' + LL, '^MD' + (prefs.labels.darkness != null ? prefs.labels.darkness : 20), '^PR' + (prefs.labels.speed || 3)]; }
      function right(qrSize, bottomY, nameLines){
        var tx = m + qrSize + Math.round(0.05 * dpi), tw = Math.max(60, PW - shift - tx - m);
        var nm = fitLines(name, tw, nameFont, nameLines);
        var priceY = Math.min(bottomY - priceFont, m + Math.round(nameFont * 1.15 * (fitLines.lastLines || nameLines)) + 4);   // 8z29g: right under the name
        return [ '^FO' + tx + ',' + m + '^A0N,' + nameFont + ',' + nameFont + '^FB' + tw + ',' + nameLines + ',0,L^FD' + nm + '^FS',
                 price ? ('^FO' + tx + ',' + priceY + '^A0N,' + priceFont + ',' + priceFont + '^FB' + tw + ',1,0,L^FD' + price + '^FS') : '' ];
      }
      var skuLine = '^FO' + m + ',' + skuY + '^A0N,' + skuFont + ',' + skuFont + '^FB' + fullW + ',1,0,L^FD' + sku + '^FS';
      var code = z(unit.serial || unit.id || '');
      var snFont = Math.round(Math.min(0.09, hIn * 0.09) * dpi);
      var snY = skuY - 4 - snFont;
      var g = qrGFA(code, m, m, snY - 3 - m);
      var qrSize = g ? g.size : (snY - 3 - m);
      return header().concat([
        g ? g.zpl : ('^FO' + m + ',' + m + '^BQN,2,3^FDMA,' + code + '^FS'),
        '^FO' + m + ',' + snY + '^A0N,' + snFont + ',' + snFont + '^FB' + Math.max(qrSize, 120) + ',1,0,L^FD' + (unit.serial ? 'SN: ' + code : code) + '^FS'
      ], right(Math.max(qrSize, 120), skuY - 4, 2), [ skuLine, '^XZ' ]).filter(Boolean).join('\n');
    }
    function printUnit(unit, part) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      if (!unit || !unit.id) return Promise.reject(new Error('No unit id to print.'));
      return sendZPL(buildUnitZPL(unit, part));
    }
    // One label per unit, sent in order on one device connection; resolves with the count printed.
    function printUnits(units, part) {
      if (!prefs.labels.enabled) return Promise.reject(new Error('Label printing is disabled in Hardware settings.'));
      units = (units || []).filter(function (u) { return u && u.id; });
      if (!units.length) return Promise.reject(new Error('No units to print.'));
      if ((prefs.labels.mode || 'helper') === 'helper')   // 8z26: one job, all labels
        return helperCall('/zpl', { zpl: home(units.map(function (u) { return buildUnitZPL(u, part); }).join('\n')) }).then(function () { return units.length; });
      return device().then(function (d) {
        var i = 0;
        function next() {
          if (i >= units.length) return Promise.resolve(units.length);
          var zpl = home(buildUnitZPL(units[i++], part));
          return new Promise(function (resolve, reject) {
            d.send(zpl, function () { resolve(); }, function (err) { reject(new Error('Print error: ' + err)); });
          }).then(next);
        }
        return next();
      });
    }

    return { buildZPL: buildZPL, printPart: printPart, buildUnitZPL: buildUnitZPL, printUnit: printUnit, printUnits: printUnits, listDevices: listDevices, sendZPL: sendZPL, sdkReady: sdkReady };
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
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px"><input type="checkbox" id="hwThLogo"' + (th.printLogo ? ' checked' : '') + '> Print shop logo (verify on hardware first)</label>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:14px"><input type="checkbox" id="hwThAuto"' + (th.autoPrint ? ' checked' : '') + '> Auto-print the receipt on every sale (a printer problem never blocks the sale)</label>'
      + '<div>' + btn('Preview', 'hwThPrev') + btn('Test print', 'hwThTest', 'go') + '</div>'
      + '</div>'

      // LABELS
      + '<div style="border:1px solid var(--edge,#2a2f3a);border-radius:12px;padding:12px;margin-bottom:8px">'
      + '<b>3 · Zebra ZD421 labels</b> <span style="font-size:11px;color:' + (zebraOk ? '#7fd49b' : '#f2b43a') + '">' + (zebraOk ? '● Browser Print loaded' : '● Browser Print not loaded') + '</span>'
      + '<label style="display:flex;align-items:center;gap:8px;margin-top:8px;font-size:14px"><input type="checkbox" id="hwLbEn"' + (lb.enabled ? ' checked' : '') + '> Enable label printing</label>'
      + field('Send labels through', '<select id="hwLbMode" style="' + inputCss() + '"><option value="helper"' + ((lb.mode || 'helper') === 'helper' ? ' selected' : '') + '>Bittings Print Helper (this PC)</option><option value="browserprint"' + (lb.mode === 'browserprint' ? ' selected' : '') + '>Zebra Browser Print</option></select>')
      + field('Printer (Browser Print only)', '<select id="hwLbDev" style="' + inputCss() + '"><option value="">(OS default)</option></select>')
      + '<div style="display:flex;gap:8px">'
      + '<div style="flex:1">' + field('DPI', '<select id="hwLbDpi" style="' + inputCss() + '"><option value="203"' + (lb.dpi === 203 ? ' selected' : '') + '>203</option><option value="300"' + (lb.dpi === 300 ? ' selected' : '') + '>300</option></select>') + '</div>'
      + '<div style="flex:1">' + field('Width in', '<input id="hwLbW" type="number" step="0.05" value="' + lb.widthIn + '" style="' + inputCss() + '">') + '</div>'
      + '<div style="flex:1">' + field('Height in', '<input id="hwLbH" type="number" step="0.05" value="' + lb.heightIn + '" style="' + inputCss() + '">') + '</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px">'
      + '<div style="flex:1">' + field('Darkness (0-30)', '<input id="hwLbDark" type="number" min="0" max="30" value="' + lb.darkness + '" style="' + inputCss() + '">') + '</div>'
      + '<div style="flex:1">' + field('Left margin (dots)', '<input id="hwLbShift" type="number" min="0" max="200" value="' + (lb.shiftX != null ? lb.shiftX : 40) + '" style="' + inputCss() + '">') + '</div>'
      + '<div style="flex:1">' + field('Speed (ips)', '<input id="hwLbSpeed" type="number" min="2" max="6" value="' + lb.speed + '" style="' + inputCss() + '">') + '</div>'
      + '</div>'
      + '<div>' + btn('Refresh printers', 'hwLbScan') + btn('Preview ZPL', 'hwLbPrev') + btn('Test label', 'hwLbTest', 'go') + '</div>'
      + '</div>';

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
      prefs.thermal.printLogo = $('hwThLogo').checked;
      prefs.thermal.autoPrint = $('hwThAuto').checked;
      prefs.labels.enabled = $('hwLbEn').checked;
      prefs.labels.deviceUid = $('hwLbDev').value;
      prefs.labels.dpi = parseInt($('hwLbDpi').value, 10) || 203;
      prefs.labels.widthIn = parseFloat($('hwLbW').value) || 2.25;
      prefs.labels.heightIn = parseFloat($('hwLbH').value) || 1.25;
      prefs.labels.darkness = Math.max(0, Math.min(30, parseInt($('hwLbDark').value, 10) || 20));
      prefs.labels.speed = Math.max(2, Math.min(6, parseInt($('hwLbSpeed').value, 10) || 3));
      prefs.labels.shiftX = Math.max(0, Math.min(200, parseInt($('hwLbShift').value, 10) || 0));
      persist();
    }
    // persist on any change
    mo.card.addEventListener('change', save);

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

  window.TKS_HW = {
    prefs: function () { return prefs; },
    save: persist,
    scanner: scan,
    thermal: thermal,
    labels: labels,
    openSettings: openSettings,
    helperStatus: helperStatus
  };
})();
