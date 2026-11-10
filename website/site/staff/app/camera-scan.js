/* ============================================================================
   app/camera-scan.js — scan a QR unit label (or a 1-D SKU barcode) with the phone's camera.
   8r (owner, 2026-11-08): techs scan keys OUT when selling and back IN when a customer declines.

   window.TKS_CAM = {
     available()            → true when the page can open a camera (secure context + getUserMedia)
     scan(opts)             → Promise<string code>  opens a full-screen themed scanner; resolves with the
                              first code read, rejects with Error('cancelled') when closed.
                              opts: { title, hint, formats:['qr_code','code_128',…], once:true }
     close()
   }
   Decoding: the browser's BarcodeDetector when present (Chrome/Android, Edge, Samsung — QR + Code-128),
   otherwise jsQR (app/vendor/jsqr-1.4.0.js, QR only — iPhone Safari lands here). Either way the raw text
   of the code is returned; callers decide what it is (unit id "u_…", SKU, VIN).
   Needs https or localhost (camera APIs are blocked on plain http from another host).
   ========================================================================== */
(function () {
  'use strict';
  var ov = null, video = null, stream = null, rafId = 0, detector = null, closing = false, resolver = null, rejecter = null, busy = false;

  function secure() { return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function available() { return secure(); }

  function css() {
    if (document.getElementById('tksCamCss')) return;
    var st = document.createElement('style'); st.id = 'tksCamCss';
    st.textContent =
      '.tkscam-ov{position:fixed;inset:0;z-index:100500;background:#000;display:flex;flex-direction:column;color:#fff;font-family:inherit}' +
      '.tkscam-top{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:max(10px,env(safe-area-inset-top)) 14px 10px;background:rgba(0,0,0,.6)}' +
      '.tkscam-top b{font-size:16px}.tkscam-x{background:rgba(255,255,255,.14);border:none;color:#fff;border-radius:10px;min-width:44px;min-height:44px;font-size:22px;cursor:pointer}' +
      '.tkscam-view{position:relative;flex:1;overflow:hidden;background:#000}.tkscam-view video{width:100%;height:100%;object-fit:cover}' +
      '.tkscam-frame{position:absolute;left:50%;top:50%;width:min(70vw,320px);height:min(70vw,320px);transform:translate(-50%,-50%);border:3px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:0 0 0 2000px rgba(0,0,0,.35)}' +
      '.tkscam-hint{padding:12px 16px max(14px,env(safe-area-inset-bottom));font-size:14px;text-align:center;background:rgba(0,0,0,.6);line-height:1.4}' +
      '.tkscam-hint small{display:block;color:#bbb;margin-top:4px}' +
      '.tkscam-manual{display:flex;gap:8px;margin-top:10px}.tkscam-manual input{flex:1;min-height:44px;border-radius:10px;border:1px solid #555;background:#111;color:#fff;font-size:16px;padding:0 12px}' +
      '.tkscam-manual button{min-height:44px;border-radius:10px;border:none;background:#c8323c;color:#fff;font-weight:700;padding:0 14px}';
    document.head.appendChild(st);
  }

  function stop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    if (stream) { try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} stream = null; }
    if (ov) { try { ov.remove(); } catch (e) {} ov = null; video = null; }
    busy = false;
  }
  function close() { if (closing) return; closing = true; var r = rejecter; stop(); resolver = rejecter = null; closing = false; if (r) r(new Error('cancelled')); }
  function finish(code) { var r = resolver; stop(); resolver = rejecter = null; if (navigator.vibrate) { try { navigator.vibrate(60); } catch (e) {} } if (r) r(code); }

  function scan(opts) {
    opts = opts || {};
    if (busy) return Promise.reject(new Error('A scan is already open.'));
    if (!secure()) return Promise.reject(new Error('The camera only works over https (or on this PC at localhost). Use the Scan-a-key box to type the code instead.'));
    busy = true; css();
    return new Promise(function (resolve, reject) {
      resolver = resolve; rejecter = reject;
      ov = document.createElement('div'); ov.className = 'tkscam-ov';
      ov.innerHTML = '<div class="tkscam-top"><b>' + esc(opts.title || '📷 Scan a key') + '</b><button type="button" class="tkscam-x" aria-label="Close">×</button></div>' +
        '<div class="tkscam-view"><video playsinline muted autoplay></video><div class="tkscam-frame"></div></div>' +
        '<div class="tkscam-hint">' + esc(opts.hint || 'Point the camera at the label\'s QR code.') + '<small id="tkscamStatus">Starting camera…</small>' +
        '<div class="tkscam-manual"><input id="tkscamManual" placeholder="…or type the code" autocomplete="off" autocapitalize="characters"><button type="button" id="tkscamGo">Use</button></div></div>';
      document.body.appendChild(ov);
      video = ov.querySelector('video');
      ov.querySelector('.tkscam-x').onclick = close;
      var man = ov.querySelector('#tkscamManual'), go = ov.querySelector('#tkscamGo');
      go.onclick = function () { var v = (man.value || '').trim(); if (v) finish(v); };
      man.addEventListener('keydown', function (e) { if (e.key === 'Enter') go.onclick(); });
      var status = ov.querySelector('#tkscamStatus');
      var formats = opts.formats || ['qr_code', 'code_128', 'code_39', 'ean_13'];
      navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
        .then(function (s) {
          if (!ov) { try { s.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} return; }
          stream = s; video.srcObject = s;
          return video.play().catch(function () {});
        })
        .then(function () {
          if (!ov) return;
          if ('BarcodeDetector' in window) {
            try { detector = new window.BarcodeDetector({ formats: formats }); } catch (e) { detector = null; }
          }
          status.textContent = detector ? 'Looking for a code…' : (window.jsQR ? 'Looking for a QR code…' : 'No decoder available — type the code below.');
          loop();
        })
        .catch(function (e) {
          status.textContent = 'Camera unavailable: ' + ((e && e.message) || e) + ' — type the code below.';
        });
    });
  }

  var canvas = null, ctx = null;
  function loop() {
    if (!ov || !video) return;
    rafId = requestAnimationFrame(loop);
    if (video.readyState < 2) return;
    if (detector) {
      if (loop._pending) return; loop._pending = true;
      detector.detect(video).then(function (codes) {
        loop._pending = false;
        if (codes && codes.length && codes[0].rawValue) finish(String(codes[0].rawValue).trim());
      }).catch(function () { loop._pending = false; });
      return;
    }
    if (!window.jsQR) return;
    // jsQR fallback: sample a centre square at reduced size every frame
    if (!canvas) { canvas = document.createElement('canvas'); ctx = canvas.getContext('2d', { willReadFrequently: true }); }
    var vw = video.videoWidth, vh = video.videoHeight; if (!vw || !vh) return;
    var side = Math.min(vw, vh) * 0.75, sx = (vw - side) / 2, sy = (vh - side) / 2, size = 400;
    canvas.width = size; canvas.height = size;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    var img = ctx.getImageData(0, 0, size, size);
    var res = window.jsQR(img.data, size, size, { inversionAttempts: 'dontInvert' });
    if (res && res.data) finish(String(res.data).trim());
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

  window.TKS_CAM = { available: available, scan: scan, close: close };
})();
