/* ============================================================================
   8z18 — Part photos.
   • TKS_PHOTO.url(path)            public URL of a stored photo (Supabase Storage bucket part-images)
   • TKS_PHOTO.thumb(path, size)    <img> HTML for list rows (lazy, white tile)
   • TKS_PHOTO.view(path)           full-screen viewer (tap to close)
   • TKS_PHOTO.pick(itemId, onDone) camera / library → crop box (drag corners, move, rotate) →
                                    640px square on white, WebP (JPEG where the browser can't encode WebP)
                                    → upload to <shop>/<item>-<time>.<ext> → inv_update_info {image}
   Owner / manager / technician may add or change a photo (server: storage policies + inv_update_info).
   ============================================================================ */
(function () {
  var BUCKET = 'part-images';
  function base() { try { return (window.TKS_CLOUD && TKS_CLOUD.url) || ''; } catch (e) { return ''; } }
  function url(p) { if (!p) return ''; if (/^https?:/i.test(p)) return p; return base() + '/storage/v1/object/public/' + BUCKET + '/' + p.split('/').map(encodeURIComponent).join('/'); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function thumb(p, size) {
    size = size || 52;
    var box = 'width:' + size + 'px;height:' + size + 'px;flex:0 0 ' + size + 'px;border-radius:10px;background:#fff;border:1px solid rgba(128,128,128,.25);overflow:hidden;display:flex;align-items:center;justify-content:center';
    if (!p) return '<span class="pthumb none" style="' + box + ';font-size:' + Math.round(size * 0.42) + 'px;opacity:.35" aria-hidden="true">🔑</span>';
    return '<span class="pthumb" style="' + box + '"><img src="' + esc(url(p)) + '" alt="" loading="lazy" decoding="async" style="width:100%;height:100%;object-fit:contain"></span>';
  }
  function view(p) {
    if (!p) return;
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,16,.92);display:flex;align-items:center;justify-content:center;padding:16px;cursor:zoom-out';
    ov.innerHTML = '<img src="' + esc(url(p)) + '" alt="Part photo" style="max-width:100%;max-height:100%;border-radius:14px;background:#fff">' +
      '<button type="button" aria-label="Close" style="position:absolute;top:calc(12px + env(safe-area-inset-top));right:12px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;font-size:20px">✕</button>';
    ov.onclick = function () { ov.remove(); };
    document.body.appendChild(ov);
  }

  // ---------- crop box ----------
  function cropper(file) {
    return new Promise(function (resolve) {
      var fr = new FileReader();
      fr.onload = function () {
        var img = new Image();
        img.onload = function () { open(img); };
        img.onerror = function () { resolve(null); alert('That file could not be opened as a picture.'); };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);

      function open(srcImg) {
        var rot = 0;                                   // 0 / 90 / 180 / 270
        var src = srcImg;                              // current (possibly rotated) canvas/image
        var ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:#101318;display:flex;flex-direction:column;color:#fff;touch-action:none';
        ov.innerHTML =
          '<div style="padding:calc(10px + env(safe-area-inset-top)) 14px 8px;font:600 15px system-ui">Drag the corners so only the key is inside the box</div>' +
          '<div id="cpStage" style="flex:1;position:relative;overflow:hidden;margin:0 10px"><canvas id="cpCan" style="position:absolute;left:0;top:0"></canvas>' +
            '<div id="cpBox" style="position:absolute;border:2px solid #fff;box-shadow:0 0 0 9999px rgba(0,0,0,.55);cursor:move;touch-action:none">' +
              ['nw', 'ne', 'sw', 'se'].map(function (h) {
                var pos = { nw: 'left:-14px;top:-14px', ne: 'right:-14px;top:-14px', sw: 'left:-14px;bottom:-14px', se: 'right:-14px;bottom:-14px' }[h];
                return '<span data-h="' + h + '" style="position:absolute;' + pos + ';width:28px;height:28px;border-radius:50%;background:#fff;border:3px solid #c8323c;touch-action:none"></span>';
              }).join('') + '</div></div>' +
          '<div style="display:flex;gap:8px;padding:10px 12px calc(12px + env(safe-area-inset-bottom))">' +
            '<button type="button" id="cpCancel" style="flex:1;min-height:48px;border-radius:12px;border:1px solid #444;background:transparent;color:#fff;font-size:16px">Cancel</button>' +
            '<button type="button" id="cpRot" style="flex:0 0 56px;min-height:48px;border-radius:12px;border:1px solid #444;background:transparent;color:#fff;font-size:20px" aria-label="Rotate">↻</button>' +
            '<button type="button" id="cpOk" style="flex:1.4;min-height:48px;border-radius:12px;border:0;background:linear-gradient(180deg,#c8323c,#8f1f27);color:#fff;font-weight:800;font-size:16px">Use photo</button></div>';
        document.body.appendChild(ov);
        var stage = ov.querySelector('#cpStage'), can = ov.querySelector('#cpCan'), box = ov.querySelector('#cpBox');
        var sc = 1, ox = 0, oy = 0, R = { x: 0, y: 0, w: 0, h: 0 };   // R in IMAGE pixels
        function iw() { return src.naturalWidth || src.width; } function ih() { return src.naturalHeight || src.height; }
        function layout(resetBox) {
          var W = stage.clientWidth, H = stage.clientHeight;
          sc = Math.min(W / iw(), H / ih()); var dw = iw() * sc, dh = ih() * sc; ox = (W - dw) / 2; oy = (H - dh) / 2;
          can.width = Math.round(dw); can.height = Math.round(dh); can.style.left = ox + 'px'; can.style.top = oy + 'px';
          can.getContext('2d').drawImage(src, 0, 0, can.width, can.height);
          if (resetBox) { var m = 0.06; R = { x: iw() * m, y: ih() * m, w: iw() * (1 - 2 * m), h: ih() * (1 - 2 * m) }; }
          paint();
        }
        function paint() { box.style.left = (ox + R.x * sc) + 'px'; box.style.top = (oy + R.y * sc) + 'px'; box.style.width = (R.w * sc) + 'px'; box.style.height = (R.h * sc) + 'px'; }
        var drag = null;
        function down(e) {
          var h = e.target.dataset && e.target.dataset.h; e.preventDefault();
          drag = { h: h || 'move', sx: e.clientX, sy: e.clientY, r: { x: R.x, y: R.y, w: R.w, h: R.h } };
          try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
        }
        function move(e) {
          if (!drag) return; var dx = (e.clientX - drag.sx) / sc, dy = (e.clientY - drag.sy) / sc, r = drag.r, min = Math.min(iw(), ih()) * 0.08;
          var x = r.x, y = r.y, w = r.w, h = r.h;
          if (drag.h === 'move') { x = Math.max(0, Math.min(iw() - w, r.x + dx)); y = Math.max(0, Math.min(ih() - h, r.y + dy)); }
          else {
            if (drag.h.indexOf('w') >= 0) { x = Math.max(0, Math.min(r.x + r.w - min, r.x + dx)); w = r.x + r.w - x; }
            if (drag.h.indexOf('e') >= 0) { w = Math.max(min, Math.min(iw() - r.x, r.w + dx)); }
            if (drag.h.indexOf('n') >= 0) { y = Math.max(0, Math.min(r.y + r.h - min, r.y + dy)); h = r.y + r.h - y; }
            if (drag.h.indexOf('s') >= 0) { h = Math.max(min, Math.min(ih() - r.y, r.h + dy)); }
          }
          R = { x: x, y: y, w: w, h: h }; paint();
        }
        function up() { drag = null; }
        box.addEventListener('pointerdown', down); window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
        function close(v) { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('resize', onRs); ov.remove(); resolve(v); }
        function onRs() { layout(false); } window.addEventListener('resize', onRs);
        ov.querySelector('#cpCancel').onclick = function () { close(null); };
        ov.querySelector('#cpRot').onclick = function () {
          var c = document.createElement('canvas'); c.width = ih(); c.height = iw(); var x = c.getContext('2d');
          x.translate(c.width / 2, c.height / 2); x.rotate(Math.PI / 2); x.drawImage(src, -iw() / 2, -ih() / 2); src = c; rot = (rot + 90) % 360; layout(true); };
        ov.querySelector('#cpOk').onclick = function () {
          var S = 640, o = document.createElement('canvas'); o.width = S; o.height = S; var x = o.getContext('2d');
          x.fillStyle = '#fff'; x.fillRect(0, 0, S, S); x.imageSmoothingQuality = 'high';
          var side = Math.max(R.w, R.h) * 1.06, cx = R.x + R.w / 2, cy = R.y + R.h / 2, k = S / side;
          // draw only the cropped area, centred on the white square
          x.drawImage(src, R.x, R.y, R.w, R.h, (S - R.w * k) / 2, (S - R.h * k) / 2, R.w * k, R.h * k);
          o.toBlob(function (b) {
            if (b && b.type === 'image/webp') return close(b);
            o.toBlob(function (j) { close(j); }, 'image/jpeg', 0.85);   // Safari can't encode WebP → JPEG
          }, 'image/webp', 0.82);
        };
        requestAnimationFrame(function () { layout(true); });
      }
    });
  }

  function sb() { try { return window.TKS && TKS._sb && TKS._sb(); } catch (e) { return null; } }
  function pick(itemId, onDone, onStatus) {
    var say = onStatus || function () {};
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(inp);
    inp.onchange = async function () {
      var f = inp.files && inp.files[0]; inp.remove(); if (!f) return;
      var blob = await cropper(f); if (!blob) return;
      var s = sb(); if (!s) { say('Sign in to the cloud to save photos.', true); return; }
      say('Uploading photo…');
      var shop = null; try { shop = (await s.rpc('current_shop')).data; } catch (e) {}
      if (!shop) { say('Could not find your shop. Try again.', true); return; }
      var ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
      var safeId = String(itemId).replace(/[^A-Za-z0-9._-]/g, '_');
      var path = shop + '/' + safeId + '-' + Date.now() + '.' + ext;
      var up = await s.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: true });
      if (up.error) { say('Upload failed: ' + up.error.message, true); return; }
      var old = null; try { var cur = TKS.Inventory.get(itemId); old = cur && cur.image; } catch (e) {}
      var r = await s.rpc('inv_update_info', { p_item: itemId, p_patch: { image: path } });
      if (r.error) { say('Could not save the photo: ' + r.error.message, true); try { await s.storage.from(BUCKET).remove([path]); } catch (e) {} return; }
      try { TKS.Inventory.applyServerPatch(itemId, { image: path }); } catch (e) {}
      if (old && old !== path && old.indexOf(shop + '/') === 0) { try { await s.storage.from(BUCKET).remove([old]); } catch (e) {} }
      say('✓ Photo saved');
      if (onDone) onDone(path);
    };
    inp.click();
  }
  async function remove(itemId, onDone, onStatus) {
    var say = onStatus || function () {}; var s = sb(); if (!s) return;
    var old = null; try { var cur = TKS.Inventory.get(itemId); old = cur && cur.image; } catch (e) {}
    var r = await s.rpc('inv_update_info', { p_item: itemId, p_patch: { image: '' } });
    if (r.error) { say('Could not remove: ' + r.error.message, true); return; }
    try { TKS.Inventory.applyServerPatch(itemId, { image: '' }); } catch (e) {}
    if (old) { try { await s.storage.from(BUCKET).remove([old]); } catch (e) {} }
    say('Photo removed'); if (onDone) onDone('');
  }
  window.TKS_PHOTO = { url: url, thumb: thumb, view: view, pick: pick, remove: remove, _cropper: cropper };
})();
