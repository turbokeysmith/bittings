/* ============================================================================
   app/niimbot.js — Bluetooth label printing on NIIMBOT printers (8z102, owner 2026-11-13: "add Bluetooth printing
   capability for the Niimbot. Not everyone has a shop to print a label off of like we do … we have a B1").

   How it works
   - The label is the SAME label the Zebra prints: TKS_HW.labels.layoutFor() gives the layout, this file draws it on a
     canvas at the printer's 203 dpi and hands the picture to the printer.
   - Talking to the printer is done by NiimBlueLib 0.49.1 (MIT, MultiMote — app/vendor/niimbluelib-0.49.1.min.js, licence
     file next to it). It is NOT made or endorsed by NIIMBOT. It is loaded only when somebody actually prints.
   - Needs "Web Bluetooth": Chrome / Edge on Android, Windows, Mac. iPhone and iPad browsers do not have it — there the
     label can be saved or shared as a picture (print it from the NIIMBOT app), or the page opened in the Bluefy browser.
   - First target: the B1 (384-dot head = 48 mm, 50 × 30 mm labels). The printer tells us its model when it connects; the
     model picked in Settings is only the fall-back.
   Docs: docs/research/niimbot-bluetooth-2026-11-13.md
   Exposes window.TKS_NIIM.
   ========================================================================= */
(function () {
  'use strict';
  var LIB = 'app/vendor/niimbluelib-0.49.1.min.js';
  var DPMM = 8;   // 203 dpi ≈ 8 dots per mm

  // Printers with a 48 mm head. (Narrow 12–15 mm printers — D11, D110 — need their own small layout: not yet.)
  var MODELS = [
    { id: 'B1',  label: 'B1',  task: 'B1',     head: 384, dir: 'top', tested: false },
    { id: 'B21', label: 'B21', task: 'B21_V1', head: 384, dir: 'left', tested: false }
  ];
  var SIZES = [
    { id: '50x30', label: '50 × 30 mm', hint: 'The usual B1 roll', w: 50, h: 30 },
    { id: '50x50', label: '50 × 50 mm', hint: 'Square — more room', w: 50, h: 50 },
    { id: '50x80', label: '50 × 80 mm', hint: 'Tall — the most detail', w: 50, h: 80 },
    { id: '40x30', label: '40 × 30 mm', hint: '', w: 40, h: 30 },
    { id: '40x20', label: '40 × 20 mm', hint: 'Drawer fronts', w: 40, h: 20 },
    { id: '30x20', label: '30 × 20 mm', hint: 'Small', w: 30, h: 20 }
  ];
  function model(id) { return MODELS.filter(function (m) { return m.id === id; })[0] || MODELS[0]; }
  function size(id) { return SIZES.filter(function (s) { return s.id === id; })[0] || SIZES[0]; }
  function prefs() { try { var p = window.TKS_HW && TKS_HW.prefs(); return (p && p.niimbot) || {}; } catch (e) { return {}; } }

  function supported() { try { return !!(navigator.bluetooth && navigator.bluetooth.requestDevice); } catch (e) { return false; } }
  function isApple() { try { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); } catch (e) { return false; } }
  function whyNot() {
    if (supported()) return '';
    if (isApple()) return 'iPhones and iPads cannot print over Bluetooth from a web page. Save the label as a picture and print it from the NIIMBOT app — or open Bittings in the free "Bluefy" browser.';
    return 'This browser cannot print over Bluetooth. Use Chrome on an Android phone or a Windows PC — or save the label as a picture.';
  }

  var _lib = null;
  function loadLib() {
    if (window.niimbluelib) return Promise.resolve(window.niimbluelib);
    if (_lib) return _lib;
    _lib = new Promise(function (resolve, reject) {
      var s = document.createElement('script'); s.src = LIB;
      s.onload = function () { window.niimbluelib ? resolve(window.niimbluelib) : reject(new Error('The printer code did not load.')); };
      s.onerror = function () { _lib = null; reject(new Error('The printer code did not load — check the connection and try again.')); };
      document.head.appendChild(s);
    });
    return _lib;
  }

  // ---- drawing: label layout (printer dots) → canvas -----------------------------------------------------------
  var SANS = "'Arial Narrow','Roboto Condensed','Helvetica Neue',Arial,sans-serif";
  function layout(part, unit, sizeId, extra) {
    var sz = size(sizeId || prefs().size), m = model(prefs().model);
    var wDots = Math.min(Math.round(sz.w * DPMM), m.head), hDots = Math.round(sz.h * DPMM);
    var opt = { dpi: 203, widthIn: wDots / 203, heightIn: hDots / 203, shiftX: 0 };
    if (extra) Object.keys(extra).forEach(function (k) { opt[k] = extra[k]; });
    var L = TKS_HW.labels.layoutFor(part, unit || null, 'custom', opt);
    L.PW = wDots; L.LL = hDots; L.mm = { w: sz.w, h: sz.h };
    return L;
  }
  function draw(L, scale) {
    scale = scale || 1;
    var c = document.createElement('canvas'); c.width = Math.round(L.PW * scale); c.height = Math.round(L.LL * scale);
    var x = c.getContext('2d'); x.scale(scale, scale);
    x.fillStyle = '#fff'; x.fillRect(0, 0, L.PW, L.LL); x.fillStyle = '#000'; x.textBaseline = 'alphabetic';
    var sh = L.shift || 0;
    (L.els || []).forEach(function (e) {
      if (e.t === 'qr') {
        var done = false;
        if (typeof window.qrcode === 'function') {
          try { var q = window.qrcode(0, 'M'); q.addData(String(e.data)); q.make();
            var n = q.getModuleCount(), mag = Math.max(1, Math.floor(e.size / (n + 2))), off = Math.floor((e.size - mag * n) / 2);
            for (var yy = 0; yy < n; yy++) for (var xx = 0; xx < n; xx++) if (q.isDark(yy, xx)) x.fillRect(sh + e.x + off + xx * mag, e.y + off + yy * mag, mag, mag);
            done = true; } catch (er) {}
        }
        if (!done) { x.strokeRect(sh + e.x + 1, e.y + 1, e.size - 2, e.size - 2); }
      } else if (e.t === 'line') {
        x.fillRect(sh + e.x, e.y, e.w, 3);
      } else if (e.t === 'text') {
        var px = Math.round(e.font * 0.95);
        x.font = (e.bold ? '700 ' : '600 ') + px + 'px ' + SANS;
        (e.rows || [e.text || '']).forEach(function (row, i) {
          if (!row) return;
          var w = x.measureText(row).width, sx = w > e.w ? e.w / w : 1;
          var ax = e.align === 'C' ? e.x + (e.w - w * sx) / 2 : (e.align === 'R' ? e.x + e.w - w * sx : e.x);
          x.save(); x.translate(sh + ax, Math.round(e.y + e.font * 0.82 + i * e.font)); x.scale(sx, 1); x.fillText(row, 0, 0); x.restore();
        });
      }
    });
    return c;
  }
  function canvasFor(part, unit, sizeId) { return draw(layout(part, unit, sizeId), 1); }
  // an on-screen sample (sharper than the printer picture)
  function sampleCanvas(part, unit, sizeId) { var L = layout(part, unit, sizeId), c = draw(L, 2); c.style.cssText = 'display:block;width:100%;max-width:' + Math.round(L.mm.w * 4.2) + 'px;height:auto;border:1px solid #8a93a0;border-radius:8px;background:#fff'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Label sample ' + L.mm.w + ' by ' + L.mm.h + ' mm'); return c; }

  // ---- the printer ------------------------------------------------------------------------------------------------
  var client = null, info = null, listeners = [];
  function emit() { listeners.forEach(function (f) { try { f(status()); } catch (e) {} }); }
  function onChange(f) { listeners.push(f); }
  function status() { return { connected: !!(client && info), name: info ? info.name : '', model: info ? info.model : '', task: info ? info.task : '' }; }

  // MUST be called from a tap (the browser shows its "pick a device" box)
  function connect() {
    if (!supported()) return Promise.reject(new Error(whyNot()));
    return loadLib().then(function (lib) {
      if (client) { try { client.disconnect(); } catch (e) {} client = null; info = null; }
      var c = lib.instantiateClient('bluetooth');
      c.on('disconnect', function () { if (client === c) { client = null; info = null; emit(); } });
      return c.connect().then(function (res) {
        client = c;
        var meta = null, task = ''; try { meta = c.getModelMetadata && c.getModelMetadata(); } catch (e) {} try { task = c.getPrintTaskType && c.getPrintTaskType(); } catch (e) {}
        var name = ''; try { name = (res && res.deviceName) || (c.getPrinterInfo && (c.getPrinterInfo().modelId || '')) || ''; } catch (e) {}
        info = { name: String(name || (meta && meta.model) || 'NIIMBOT'), model: (meta && meta.model) || '', task: task || '', head: (meta && meta.printheadPixels) || 0, dir: (meta && meta.printDirection) || '' };
        emit(); return status();
      });
    }).catch(function (e) {
      var m = String((e && e.message) || e);
      if (/cancel|chooser|NotFoundError/i.test(m)) throw new Error('No printer was picked. Turn the printer on, hold it near the phone and try again.');
      if (/SecurityError|permission/i.test(m)) throw new Error('Bluetooth is blocked for this site. Allow Bluetooth for Bittings in the browser settings.');
      throw new Error('Could not connect to the printer: ' + m);
    });
  }
  function disconnect() { try { if (client) client.disconnect(); } catch (e) {} client = null; info = null; emit(); }

  /* Print one picture N times. jobs = [{ canvas, copies }] — each job is one label design (unit labels = one job each). */
  function printJobs(jobs, opt) {
    opt = opt || {};
    if (!client || !info) return Promise.reject(new Error('The printer is not connected.'));
    var lib = window.niimbluelib, p = prefs(), m = model(p.model);
    var task = info.task || m.task, dir = info.dir || m.dir, head = info.head || m.head;
    var density = Math.max(1, Math.min(5, parseInt(opt.density != null ? opt.density : p.density, 10) || 3));
    jobs = (jobs || []).filter(function (j) { return j && j.canvas; });
    if (!jobs.length) return Promise.reject(new Error('Nothing to print.'));
    var tooWide = jobs.some(function (j) { return (dir === 'left' ? j.canvas.height : j.canvas.width) > head; });
    if (tooWide) return Promise.reject(new Error('That label is wider than this printer can print (' + Math.round(head / DPMM) + ' mm). Pick a smaller label size.'));
    var total = 0, chain = Promise.resolve();
    jobs.forEach(function (j) {
      var n = Math.max(1, Math.min(200, parseInt(j.copies, 10) || 1));
      chain = chain.then(function () {
        var encoded = lib.ImageEncoder.encodeCanvas(j.canvas, lib.PageColorType.SingleColor, dir);
        var t = client.protocol.newPrintTask(task, { totalPages: n, statusPollIntervalMs: 100, statusTimeoutMs: 8000, pageColor: lib.PageColorType.SingleColor, density: density, labelType: lib.LabelType.WithGaps });
        return t.printInit().then(function () { return t.printPage(encoded, n); }).then(function () { return t.waitForPageFinished(); }).then(function () { return t.waitForFinished(); })
          .then(function () { total += n; return t.printEnd(); }, function (err) { return Promise.resolve(t.printEnd()).catch(function () {}).then(function () { throw err; }); });
      });
    });
    return chain.then(function () { return total; }).catch(function (e) {
      var msg = String((e && e.message) || e);
      if (/timeout/i.test(msg)) throw new Error('The printer stopped answering. Check there are labels loaded and the lid is closed, then try again.');
      throw new Error('The printer reported a problem: ' + msg);
    });
  }
  function printPart(part, copies, sizeId) { return printJobs([{ canvas: canvasFor(part, null, sizeId), copies: copies }]); }
  function printUnits(units, part, sizeId) { return printJobs((units || []).map(function (u) { return { canvas: canvasFor(part, u, sizeId), copies: 1 }; })); }

  // ---- no Bluetooth (iPhone): the label as a picture ------------------------------------------------------------
  function pngBlob(part, unit, sizeId) { var c = canvasFor(part, unit, sizeId); return new Promise(function (res) { c.toBlob(function (b) { res(b); }, 'image/png'); }); }
  function savePicture(part, unit, sizeId) {
    var nameSafe = String((part && (part.sku || part.name)) || 'label').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'label';
    return pngBlob(part, unit, sizeId).then(function (blob) {
      var file = null; try { file = new File([blob], 'label-' + nameSafe + '.png', { type: 'image/png' }); } catch (e) {}
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share)
        return navigator.share({ files: [file], title: 'Label' }).then(function () { return 'shared'; }, function (e) { if (e && e.name === 'AbortError') return 'cancelled'; throw e; });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'label-' + nameSafe + '.png'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); return 'saved';
    });
  }

  window.TKS_NIIM = { MODELS: MODELS, SIZES: SIZES, model: model, size: size, supported: supported, whyNot: whyNot, isApple: isApple, loadLib: loadLib,
    layout: layout, draw: draw, canvasFor: canvasFor, sampleCanvas: sampleCanvas,
    connect: connect, disconnect: disconnect, status: status, onChange: onChange,
    printJobs: printJobs, printPart: printPart, printUnits: printUnits, savePicture: savePicture, pngBlob: pngBlob };
})();
