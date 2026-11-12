/* ============================================================================
   app/receipt-docs.js — photos / scans that belong to ONE receipt (8z88, owner 2026-11-12).
   ----------------------------------------------------------------------------
   window.TKS_RDOCS. NASTF D1 paperwork: the driver's licence, proof of ownership (one per D1 vehicle), and optionally
   the plate, the odometer or anything else. Every file is filed against a receipt id (table public.receipt_docs,
   private bucket receipt-docs) — never loose.
     panel(box, receipt, opts)  the "D1 photos" box: what is on file, what is missing, add buttons, and a QR code that
                                opens THIS receipt's photo page on a phone (bittings.html?docs=<receipt id>).
     On a phone the add button opens the camera; on a computer it opens the file chooser ("upload from this computer").
   ========================================================================== */
(function () {
  'use strict';
  var BUCKET = 'receipt-docs';
  var KINDS = { license: "Driver's license", ownership: 'Proof of ownership', plate: 'License plate', odometer: 'Odometer', other: 'Other' };
  function sb() { try { return (window.TKS && TKS._sb && TKS._sb()) || null; } catch (e) { return null; } }
  function live() { try { return !!(sb() && TKS.auth && TKS.auth.isSignedIn() && !(TKS.isDemo && TKS.isDemo())); } catch (e) { return false; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function touch() { try { return window.matchMedia('(pointer:coarse)').matches; } catch (e) { return false; } }

  // the vehicles on a receipt, first one included (a Register sale keeps its vehicle as an object)
  function vehicles(r) {
    var v0 = (r && typeof r.vehicle === 'object' && r.vehicle) ? r.vehicle : {};
    var first = [r.vehYear || v0.year, r.vehMake || v0.make, r.vehModel || v0.model].filter(Boolean).join(' ') || (typeof r.vehicle === 'string' ? r.vehicle : '') || 'the vehicle';
    var out = [{ idx: 0, label: first, d1: !!(r && r.nastf && r.nastf.type) }];
    (Array.isArray(r && r.moreVehicles) ? r.moreVehicles : []).forEach(function (v, i) {
      out.push({ idx: i + 1, label: [v.year, v.make, v.model].filter(Boolean).join(' ') || v.text || ('Vehicle ' + (i + 2)), d1: v.d1 === true });
    });
    return out;
  }
  // what a D1 receipt has to have: one licence, and proof of ownership for each D1 vehicle
  function needed(r) {
    var out = [{ kind: 'license', idx: 0, label: KINDS.license }];
    vehicles(r).forEach(function (v) { if (v.d1) out.push({ kind: 'ownership', idx: v.idx, label: KINDS.ownership + (vehicles(r).length > 1 ? (' — ' + v.label) : '') }); });
    return out;
  }
  function list(receiptId) {
    if (!live() || !receiptId) return Promise.resolve([]);
    return sb().from('receipt_docs').select('id,receipt_id,kind,veh_idx,path,created_at,removed_at').eq('receipt_id', String(receiptId)).order('created_at').then(function (r) {
      return (r && !r.error && Array.isArray(r.data)) ? r.data.filter(function (d) { return !d.removed_at && String(d.receipt_id) === String(receiptId); }) : [];
    }, function () { return []; });
  }
  function shrink(file) {
    return new Promise(function (res) {
      if (!file || !/^image\//.test(file.type)) return res(file || null);
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { try {
        var k = Math.min(1, 1800 / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { URL.revokeObjectURL(url); res(b || file); }, 'image/jpeg', 0.84);
      } catch (e) { URL.revokeObjectURL(url); res(file); } };
      img.onerror = function () { URL.revokeObjectURL(url); res(file); };
      img.src = url;
    });
  }
  function add(receiptId, kind, vehIdx, file) {
    var s = sb(); if (!live()) return Promise.resolve({ ok: false, error: 'Sign in with a connection to add photos.' });
    if (!file) return Promise.resolve({ ok: false, error: 'No file.' });
    if (file.size > 25 * 1024 * 1024) return Promise.resolve({ ok: false, error: 'That file is too big.' });
    return shrink(file).then(function (blob) {
      return s.rpc('current_shop').then(function (r) {
        var shop = r && r.data; if (!shop) return { ok: false, error: 'Could not find your shop.' };
        var ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        var safe = String(receiptId).replace(/[^A-Za-z0-9._-]/g, '_');
        var path = shop + '/' + safe + '/' + Date.now() + '-' + kind + '.' + ext;
        return s.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: false }).then(function (up) {
          if (up.error) return { ok: false, error: up.error.message };
          var who = null; try { who = TKS.auth.user().id; } catch (e) {}
          return s.from('receipt_docs').insert({ receipt_id: String(receiptId), kind: kind, veh_idx: vehIdx || 0, path: path, created_by: who }).then(function (q) {
            return q.error ? { ok: false, error: q.error.message } : { ok: true, path: path };
          });
        });
      });
    }).catch(function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
  }
  function view(d) {
    var s = sb(); if (!s || !d || !d.path) return;
    var w = null; try { w = window.open('about:blank', '_blank'); } catch (e) {}
    s.storage.from(BUCKET).createSignedUrl(d.path, 300).then(function (r) {
      var u = r && r.data && r.data.signedUrl; if (!u) { if (w) w.close(); return; }
      if (w) w.location = u; else location.href = u;
    }, function () { if (w) w.close(); });
  }
  /* 8z92 (owner, 2026-11-12: "where will we be able to get those from? I will need to upload that to NASTF").
     Download saves the file to this computer / phone under a name that says what it is —
     <receipt number>_<what>_<n>.jpg — ready to attach on the NASTF site. */
  function fileName(r, d, n) { var ext = (/\.([a-z0-9]+)$/i.exec(d.path) || [0, 'jpg'])[1];
    var what = { license: 'drivers-license', ownership: 'proof-of-ownership', plate: 'plate', odometer: 'odometer', other: 'other' }[d.kind] || d.kind;
    return String((r && (r.number || r.id)) || 'receipt').replace(/[^A-Za-z0-9._-]/g, '_') + '_' + what + ((d.veh_idx || 0) > 0 ? ('_vehicle' + (d.veh_idx + 1)) : '') + '_' + n + '.' + ext; }
  function download(r, d, n) {
    var s = sb(); if (!s || !d || !d.path) return Promise.resolve(false);
    var name = fileName(r, d, n || 1);
    return s.storage.from(BUCKET).createSignedUrl(d.path, 300, { download: name }).then(function (q) {
      var u = q && q.data && q.data.signedUrl; if (!u) return false;
      var a = document.createElement('a'); a.href = u; a.download = name; a.rel = 'noopener'; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1500); return true;
    }, function () { return false; });
  }
  /* 8z93 (owner, 2026-11-12: "set up a NASTF folder … it downloads the PDF and images to that folder and adds each
     customer to their own file, so I can just drag the whole file over to NASTF. Have it put the customer's last name
     and last 6 of the VIN as the file name").
     On the shop computer (Chrome / Edge) the owner picks his NASTF folder once; after that one tap writes
       <NASTF folder>/<Lastname>_<last 6 of VIN>/  receipt PDF + driver's licence + proof of ownership (+ anything else)
     One folder per D1 vehicle. Where the browser cannot write into a folder (phones, Safari, Firefox) the same set
     comes down as one zip with that name. */
  function lastName(r) { var n = String((r && (r.voName || r.customer)) || '').replace(/\b(llc|l\.l\.c\.|inc|inc\.|corp|corp\.|co|co\.|ltd|ltd\.)\s*$/i, '').trim();
    var w = n.split(/\s+/).filter(Boolean).pop() || 'Customer'; w = w.replace(/[^A-Za-z0-9'-]/g, '');
    return w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : 'Customer'; }
  function vinOf(r, idx) { if (!idx) { var v0 = (r && typeof r.vehicle === 'object' && r.vehicle) ? r.vehicle : {}; return String((r && r.vin) || v0.vin || ''); }
    var m = (r && Array.isArray(r.moreVehicles)) ? r.moreVehicles[idx - 1] : null; return String((m && m.vin) || ''); }
  function folderName(r, idx) { var vin = vinOf(r, idx).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    var tail = vin.length >= 6 ? vin.slice(-6) : (vin || String((r && (r.number || r.id)) || '').replace(/[^A-Za-z0-9-]/g, '') + (idx ? ('-V' + (idx + 1)) : ''));
    return lastName(r) + '_' + tail; }
  // every file that belongs in each vehicle's folder: [{folder, name, get() → Promise<Blob>}]
  function nastfSet(r, docs, pdf) {
    var out = [], vs = vehicles(r).filter(function (v) { return v.d1; }); if (!vs.length) vs = [vehicles(r)[0]];
    vs.forEach(function (v) { var folder = folderName(r, v.idx), n = {};
      if (pdf) out.push({ folder: folder, name: folder + '_receipt.pdf', get: function () { return Promise.resolve(pdf(r)).then(function (o) { return o && o.blob; }); } });
      docs.filter(function (d) { return d.kind === 'license' || d.kind === 'other' || (d.veh_idx || 0) === v.idx; }).forEach(function (d) {
        n[d.kind] = (n[d.kind] || 0) + 1; var ext = (/\.([a-z0-9]+)$/i.exec(d.path) || [0, 'jpg'])[1];
        var what = { license: 'drivers-license', ownership: 'proof-of-ownership', plate: 'plate', odometer: 'odometer', other: 'other' }[d.kind] || d.kind;
        out.push({ folder: folder, name: folder + '_' + what + '_' + n[d.kind] + '.' + ext, get: function () {
          return sb().storage.from(BUCKET).createSignedUrl(d.path, 300).then(function (q) { var u = q && q.data && q.data.signedUrl; if (!u) throw new Error('could not open ' + what); return fetch(u).then(function (x) { if (!x.ok) throw new Error('could not download ' + what); return x.blob(); }); }); } }); }); });
    return out;
  }
  // the chosen folder is remembered on this computer (IndexedDB can hold a folder handle; localStorage cannot)
  function idb(mode, fn) { return new Promise(function (res) { try { var o = indexedDB.open('tks_fs', 1);
    o.onupgradeneeded = function () { o.result.createObjectStore('h'); };
    o.onsuccess = function () { try { var tx = o.result.transaction('h', mode), st = tx.objectStore('h'), q = fn(st); tx.oncomplete = function () { res(q && q.result); }; tx.onerror = function () { res(null); }; } catch (e) { res(null); } };
    o.onerror = function () { res(null); }; } catch (e) { res(null); } }); }
  function canFolder() { return typeof window.showDirectoryPicker === 'function'; }
  function nastfDir(pickNew) {
    return (pickNew ? Promise.resolve(null) : idb('readonly', function (s) { return s.get('nastf'); })).then(function (h) {
      if (h && h.queryPermission) return h.queryPermission({ mode: 'readwrite' }).then(function (p) { return p === 'granted' ? h : h.requestPermission({ mode: 'readwrite' }).then(function (p2) { return p2 === 'granted' ? h : null; }); }, function () { return null; });
      return null;
    }).then(function (h) { if (h) return h;
      return window.showDirectoryPicker({ id: 'bittings-nastf', mode: 'readwrite', startIn: 'documents' }).then(function (nh) { return idb('readwrite', function (s) { return s.put(nh, 'nastf'); }).then(function () { return nh; }); });
    });
  }
  function saveToFolder(r, docs, pdf, pickNew) {
    var set = nastfSet(r, docs, pdf);
    return nastfDir(pickNew).then(function (dir) { var folders = {}, n = 0;
      return set.reduce(function (p, f) { return p.then(function () { return f.get(); }).then(function (blob) { if (!blob) return;
        return dir.getDirectoryHandle(f.folder, { create: true }).then(function (sub) { folders[f.folder] = 1; return sub.getFileHandle(f.name, { create: true }); })
          .then(function (fh) { return fh.createWritable(); }).then(function (w) { return Promise.resolve(w.write(blob)).then(function () { return w.close(); }); }).then(function () { n++; }); }); }, Promise.resolve())
        .then(function () { return { ok: true, files: n, folders: Object.keys(folders), where: dir.name }; });
    }).catch(function (e) { return { ok: false, error: (e && e.name === 'AbortError') ? '' : ((e && e.message) || String(e)) }; });
  }
  // fallback: one zip (stored, not compressed) whose inside is the same folder(s)
  var CRC = (function () { var t = [], c, n, k; for (n = 0; n < 256; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zipBlob(files) { var enc = new TextEncoder(), parts = [], central = [], off = 0;
    files.forEach(function (f) { var name = enc.encode(f.path), crc = crc32(f.data), h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint32(14, crc, true); h.setUint32(18, f.data.length, true); h.setUint32(22, f.data.length, true); h.setUint16(26, name.length, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      var c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, f.data.length, true); c.setUint32(24, f.data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name); off += 30 + name.length + f.data.length; });
    var csize = central.reduce(function (a, x) { return a + x.length; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/zip' }); }
  function saveAsZip(r, docs, pdf) {
    var set = nastfSet(r, docs, pdf), files = [];
    return set.reduce(function (p, f) { return p.then(function () { return f.get(); }).then(function (blob) { if (!blob) return; return blob.arrayBuffer().then(function (ab) { files.push({ path: f.folder + '/' + f.name, data: new Uint8Array(ab) }); }); }); }, Promise.resolve())
      .then(function () { if (!files.length) return { ok: false, error: 'Nothing to save yet.' };
        var name = folderName(r, (vehicles(r).filter(function (v) { return v.d1; })[0] || { idx: 0 }).idx) + '.zip', a = document.createElement('a'), u = URL.createObjectURL(zipBlob(files));
        a.href = u; a.download = name; a.style.display = 'none'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 2000);
        return { ok: true, files: files.length, zip: name }; })
      .catch(function (e) { return { ok: false, error: (e && e.message) || String(e) }; });
  }
  function pageUrl(r) { try { return new URL('bittings.html?docs=' + encodeURIComponent(r.id), location.href).href; } catch (e) { return ''; } }
  function qrSvg(text) {
    try { if (typeof window.qrcode !== 'function' || !text) return ''; var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag(4, 8); } catch (e) { return ''; }
  }
  function css() {
    if (document.getElementById('rdCss')) return;
    var st = document.createElement('style'); st.id = 'rdCss';
    st.textContent =
      '.rd-box{background:#fff;color:#16181d;border:1px solid #c9ced8;border-radius:14px;padding:12px 14px;margin:12px 0;font:14.5px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:left}' +
      '.rd-box *{box-sizing:border-box}.rd-h{font-weight:800;font-size:16px;color:#16181d}.rd-sub{font-size:12.5px;color:#5a6070;margin-top:2px}' +
      '.rd-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:9px 0;border-top:1px solid #e3e6ea}.rd-row:first-of-type{border-top:0}' +
      '.rd-n{flex:1 1 170px;min-width:0;font-weight:700;color:#16181d}.rd-ok{color:#136c3a;font-weight:700}.rd-miss{color:#b3261e;font-weight:700}' +
      '.rd-btn{min-height:44px;border-radius:11px;border:1px solid #c9ced8;background:#f3f4f6;color:#16181d;font:inherit;font-weight:700;padding:8px 12px;cursor:pointer}' +
      '.rd-btn.go{background:#b3261e;border-color:#b3261e;color:#fff}.rd-btn[disabled]{opacity:.55}' +
      '.rd-files{flex:1 1 100%;display:flex;gap:6px;flex-wrap:wrap}.rd-file{border:1px solid #c9ced8;border-radius:9px;background:#f6f7f9;color:#16181d;padding:6px 9px;font-size:12.5px;cursor:pointer;min-height:36px}' +
      '.rd-qr{display:flex;gap:12px;align-items:center;flex-wrap:wrap;border-top:1px solid #e3e6ea;margin-top:6px;padding-top:10px}.rd-qr svg{width:132px;height:132px;background:#fff}' +
      '.rd-msg{font-size:13px;min-height:16px;margin-top:6px;color:#454b58}';
    document.head.appendChild(st);
  }
  function pick(camera, cb) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*,application/pdf'; if (camera) inp.setAttribute('capture', 'environment');
    inp.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(inp);
    inp.onchange = function () { var f = inp.files && inp.files[0]; inp.remove(); cb(f || null); }; inp.click();
  }

  // opts: { qr: true|false (default: true on a computer), title }
  function panel(box, r, opts) {
    if (!box || !r || !r.id) return; css(); opts = opts || {};
    var isTouch = touch(), showQr = (opts.qr != null) ? !!opts.qr : !isTouch;
    function paint(docs, msg) {
      var need = needed(r), vs = vehicles(r);
      var have = function (kind, idx) { return docs.filter(function (d) { return d.kind === kind && (kind === 'license' || (d.veh_idx || 0) === idx); }); };
      var row = function (kind, idx, label, required) { var f = have(kind, idx);
        return '<div class="rd-row"><div class="rd-n">' + esc(label) + '<div class="' + (f.length ? 'rd-ok' : (required ? 'rd-miss' : 'rd-sub')) + '">' + (f.length ? ('✓ ' + f.length + ' on file') : (required ? 'Missing' : 'Optional')) + '</div></div>' +
          (isTouch ? ('<button type="button" class="rd-btn go" data-add="' + kind + '" data-idx="' + idx + '" data-cam="1">📷 Take photo</button><button type="button" class="rd-btn" data-add="' + kind + '" data-idx="' + idx + '">Choose…</button>')
                   : ('<button type="button" class="rd-btn go" data-add="' + kind + '" data-idx="' + idx + '">⬆ Upload from this computer</button>')) +
          (f.length ? ('<div class="rd-files">' + f.map(function (d, i) { return '<button type="button" class="rd-file" data-dl="' + esc(d.id) + '" data-n="' + (i + 1) + '" title="Save this file to this device">⬇ Download ' + (i + 1) + '</button><button type="button" class="rd-file" data-view="' + esc(d.id) + '">View ' + (i + 1) + ' · ' + esc(new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</button>'; }).join('') + '</div>') : '') + '</div>'; };
      var missing = need.filter(function (n) { return !have(n.kind, n.idx).length; }).length;
      var h = '<div class="rd-box"><div class="rd-h">📎 ' + esc(opts.title || 'D1 photos') + ' — ' + esc(r.number || r.id) + (r.customer ? (' · ' + esc(r.customer)) : '') + '</div>' +
        '<div class="rd-sub">' + (missing ? ('<span class="rd-miss">' + missing + ' still missing.</span> ') : '<span class="rd-ok">Everything needed is on file.</span> ') + 'Photos go straight onto this receipt. They are private to your shop.</div>';
      need.forEach(function (n) { h += row(n.kind, n.idx, n.label, true); });
      h += row('other', 0, 'Anything else (optional)', false);   // the tag # and the miles are typed on the D1 form — not photographed (owner, 2026-11-12)
      if (showQr) { var url = pageUrl(r), svg = qrSvg(url);
        h += '<div class="rd-qr">' + (svg || '') + '<div style="flex:1 1 200px;min-width:0"><b>Add them from a phone</b><div class="rd-sub">Open the camera on a phone that is signed in to Bittings and point it at this code. It opens this receipt — ' + esc(r.number || '') + ' — ready for the photos.</div>' +
          (svg ? '' : ('<div class="rd-sub" style="overflow-wrap:anywhere">' + esc(url) + '</div>')) + '<button type="button" class="rd-btn" data-refresh style="margin-top:8px">↻ Check for new photos</button></div></div>'; }
      if (docs.length || opts.pdf) { var fname = folderName(r, (vehicles(r).filter(function (v) { return v.d1; })[0] || { idx: 0 }).idx);
        h += '<div class="rd-row"><div class="rd-n">For NASTF<div class="rd-sub">' + (canFolder()
            ? ('Puts the receipt PDF and the photos in your NASTF folder, in a folder of their own named <b>' + esc(fname) + '</b> (last name + last 6 of the VIN) — drag that folder to NASTF.')
            : ('Downloads one zip named <b>' + esc(fname) + '</b> (last name + last 6 of the VIN) with the receipt PDF and the photos inside.')) + '</div></div>' +
          (canFolder() ? ('<button type="button" class="rd-btn go" data-nastf>📁 Save to my NASTF folder</button><button type="button" class="rd-btn" data-nastfpick title="Pick a different folder">Change folder</button>')
                       : '<button type="button" class="rd-btn go" data-nastfzip>⬇ Download ' + esc(fname) + '.zip</button>') +
          (docs.length ? ('<button type="button" class="rd-btn" data-dlall>⬇ Loose files (' + docs.length + ')</button>') : '') + '</div>'; }
      h += '<div class="rd-msg">' + esc(msg || '') + '</div></div>';
      box.innerHTML = h;
      box.querySelectorAll('[data-add]').forEach(function (b) { b.onclick = function () { pick(!!b.dataset.cam, function (f) { if (!f) return;
        box.querySelector('.rd-msg').textContent = 'Uploading…'; box.querySelectorAll('[data-add]').forEach(function (x) { x.disabled = true; });
        add(r.id, b.dataset.add, parseInt(b.dataset.idx, 10) || 0, f).then(function (res) { load(res.ok ? '✓ Saved to ' + (r.number || 'the receipt') + '.' : ('Not saved: ' + res.error)); }); }); }; });
      box.querySelectorAll('[data-view]').forEach(function (b) { b.onclick = function () { view(docs.filter(function (d) { return d.id === b.dataset.view; })[0]); }; });
      var rf = box.querySelector('[data-refresh]'); if (rf) rf.onclick = function () { load('Checked.'); };
      box.querySelectorAll('[data-dl]').forEach(function (b) { b.onclick = function () { download(r, docs.filter(function (d) { return d.id === b.dataset.dl; })[0], parseInt(b.dataset.n, 10) || 1); }; });
      var say = function (t) { var m = box.querySelector('.rd-msg'); if (m) m.textContent = t; };
      var doNastf = function (pickNew) { say('Saving…'); saveToFolder(r, docs, opts.pdf, pickNew).then(function (res) {
        say(res.ok ? ('✓ ' + res.files + ' file' + (res.files === 1 ? '' : 's') + ' saved in ' + res.where + ' → ' + res.folders.join(', ') + '. Drag that folder to NASTF.') : (res.error ? ('Not saved: ' + res.error) : 'No folder was chosen.')); }); };
      var nb = box.querySelector('[data-nastf]'); if (nb) nb.onclick = function () { doNastf(false); };
      var np = box.querySelector('[data-nastfpick]'); if (np) np.onclick = function () { doNastf(true); };
      var nz = box.querySelector('[data-nastfzip]'); if (nz) nz.onclick = function () { say('Building the zip…'); saveAsZip(r, docs, opts.pdf).then(function (res) { say(res.ok ? ('✓ ' + res.zip + ' downloaded (' + res.files + ' files).') : ('Not saved: ' + res.error)); }); };
      var da = box.querySelector('[data-dlall]'); if (da) da.onclick = function () { var seen = {}, i = 0; da.disabled = true;
        (function next() { if (i >= docs.length) { da.disabled = false; box.querySelector('.rd-msg').textContent = '✓ ' + docs.length + ' file' + (docs.length === 1 ? '' : 's') + ' sent to your Downloads.'; return; }
          var d = docs[i++], k = d.kind + ':' + (d.veh_idx || 0); seen[k] = (seen[k] || 0) + 1; download(r, d, seen[k]).then(function () { setTimeout(next, 700); }); })(); };
      if (typeof opts.onChange === 'function') { try { opts.onChange({ missing: missing, docs: docs }); } catch (e) {} }
    }
    function load(msg) { list(r.id).then(function (docs) { if (box.isConnected) paint(docs, msg); }); }
    if (!live()) { box.innerHTML = '<div class="rd-box"><div class="rd-h">📎 D1 photos</div><div class="rd-sub">Sign in with a connection to add or see the photos for this receipt.</div></div>'; return; }
    paint([], 'Loading…'); load('');
  }
  /* 8z90 (owner: "I need to be able to select color, enter miles and tag #. Don't let it close without those. No tag or
     no miles can be selected, but it has to be selected."). One set of controls used by the document builder (first
     vehicle and every extra D1 vehicle) and by the Register. Stored as plain text: plate = the tag or "No tag",
     odometer = the miles or "No miles", colour = the colour. */
  var COLORS = ['Black', 'White', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Tan / Beige', 'Gold', 'Orange', 'Yellow', 'Purple', 'Maroon', 'Other'];
  function d1FieldsHTML(cls) { cls = cls || '';
    var chk = 'display:flex;align-items:center;gap:8px;margin:6px 0 0;font-weight:600;min-height:36px';
    return '<div class="rd1">' +
      '<label class="' + (cls ? 'qi-l' : '') + '">Vehicle color <span class="req">*</span></label><select class="' + cls + ' rd1-color"><option value="">Pick the color…</option>' + COLORS.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<label class="' + (cls ? 'qi-l' : '') + '">Miles (odometer) <span class="req">*</span></label><input class="' + cls + ' rd1-miles" inputmode="numeric" placeholder="e.g. 84210" autocomplete="off">' +
      '<label style="' + chk + '"><input type="checkbox" class="rd1-nomiles" style="width:22px;height:22px;flex:0 0 22px"> No miles — could not read the odometer</label>' +
      '<label class="' + (cls ? 'qi-l' : '') + '">Tag # (license plate) <span class="req">*</span></label><input class="' + cls + ' rd1-tag" placeholder="e.g. ABC1234" autocomplete="off" autocapitalize="characters">' +
      '<label style="' + chk + '"><input type="checkbox" class="rd1-notag" style="width:22px;height:22px;flex:0 0 22px"> No tag on the vehicle</label></div>';
  }
  function d1Bind(root, onChange) { if (!root) return;
    var m = root.querySelector('.rd1-miles'), nm = root.querySelector('.rd1-nomiles'), t = root.querySelector('.rd1-tag'), nt = root.querySelector('.rd1-notag');
    var sync = function () { m.disabled = nm.checked; if (nm.checked) m.value = ''; t.disabled = nt.checked; if (nt.checked) t.value = ''; if (onChange) onChange(); };
    nm.onchange = sync; nt.onchange = sync; sync();
    [m, t, root.querySelector('.rd1-color')].forEach(function (e) { e.addEventListener('input', function () { if (onChange) onChange(); }); e.addEventListener('change', function () { if (onChange) onChange(); }); });
  }
  function d1Read(root) { if (!root) return { color: '', odometer: '', plate: '' };
    var m = root.querySelector('.rd1-miles'), nm = root.querySelector('.rd1-nomiles'), t = root.querySelector('.rd1-tag'), nt = root.querySelector('.rd1-notag');
    return { color: (root.querySelector('.rd1-color').value || '').trim(), odometer: nm.checked ? 'No miles' : (m.value || '').trim(), plate: nt.checked ? 'No tag' : (t.value || '').trim().toUpperCase() };
  }
  function d1Set(root, v) { if (!root) return; v = v || {};
    var sel = root.querySelector('.rd1-color'), c = String(v.color || '');
    if (c && COLORS.indexOf(c) < 0) { var o = document.createElement('option'); o.textContent = c; sel.appendChild(o); }
    sel.value = c;
    var od = String(v.odometer == null ? '' : v.odometer), pl = String(v.plate || '');
    root.querySelector('.rd1-nomiles').checked = /^(no miles|n\/?a)$/i.test(od); root.querySelector('.rd1-miles').value = /^(no miles|n\/?a)$/i.test(od) ? '' : od;
    root.querySelector('.rd1-notag').checked = /^(no tag|n\/?a)$/i.test(pl); root.querySelector('.rd1-tag').value = /^(no tag|n\/?a)$/i.test(pl) ? '' : pl;
    d1Bind(root);
  }
  // what is still unanswered, in plain words ('' when complete)
  function d1Missing(v, who) { v = v || {}; who = who ? (who + ': ') : '';
    if (!v.color) return who + 'pick the vehicle color.';
    if (!v.odometer) return who + 'type the miles, or tick “No miles”.';
    if (!v.plate) return who + 'type the tag #, or tick “No tag”.';
    return ''; }
  window.TKS_RDOCS = { folderName: folderName, lastName: lastName, nastfSet: nastfSet, saveToFolder: saveToFolder, saveAsZip: saveAsZip, zipBlob: zipBlob, download: download, fileName: fileName, COLORS: COLORS, d1FieldsHTML: d1FieldsHTML, d1Bind: d1Bind, d1Read: d1Read, d1Set: d1Set, d1Missing: d1Missing, KINDS: KINDS, vehicles: vehicles, needed: needed, list: list, add: add, view: view, panel: panel, pageUrl: pageUrl };
})();
