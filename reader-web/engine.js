/*
 * PageTurn reader engine - runs INSIDE the WebView.
 *
 *   React Native  --postMessage/injectJavaScript--->  PageTurn.receive(msg)
 *   PageTurn      --window.ReactNativeWebView.postMessage--->  React Native
 *
 * PDF bytes never cross the bridge in one go: PDF.js asks for byte ranges
 * ("readRange") and React Native answers with base64 chunks ("range").
 */
(function () {
  'use strict';

  var SRC = window.__PAGETURN_SRC || {};
  var CHUNK = 256 * 1024;          // bytes per range request
  var MAX_PIXELS = 4.5e6;          // per rendered page bitmap (memory cap)
  var KEEP_BEHIND = 3, KEEP_AHEAD = 4;

  var pdfjs = null;
  var S = {
    pdf: null,
    flip: null,
    numPages: 0,
    current: 0,
    flipState: 'read',
    transport: null,
    reqId: 0,
    pending: new Map(),
    pageEls: [],
    imgEls: [],
    status: [],     // undefined | 'rendering' | 'done' | 'error'
    urls: [],
    gen: 0,
    pumping: false,
    lastRect: null,
    appearance: null,
  };

  // ------------------------- bridge -------------------------
  function post(msg) {
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    } catch (e) { /* ignore */ }
  }
  function log(level, message) { post({ type: 'log', level: level, message: String(message) }); }

  window.addEventListener('error', function (e) {
    log('error', (e && e.message) || 'Unknown error');
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    log('warn', 'Unhandled rejection: ' + ((r && r.message) || r));
  });

  window.__PT_STATE = S; // handy when debugging in chrome://inspect

  window.PageTurn = {
    receive: function (msg) {
      try {
        switch (msg && msg.type) {
          case 'open': openBook(msg); break;
          case 'range': onRange(msg); break;
          case 'rangeError': onRangeError(msg); break;
          case 'goto': exitZoom(true); goTo(msg.page); break;
          case 'next': exitZoom(true); if (S.flip && S.flipState === 'read') S.flip.flipNext('bottom'); break;
          case 'prev': exitZoom(true); if (S.flip && S.flipState === 'read') S.flip.flipPrev('bottom'); break;
          case 'appearance': applyAppearance(msg.appearance); break;
        }
      } catch (e) {
        log('error', 'receive(' + (msg && msg.type) + '): ' + e.message);
      }
    },
  };

  // ------------------------- helpers -------------------------
  function base64ToBytes(b64) {
    if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(b64);
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function blobUrl(code, type) { return URL.createObjectURL(new Blob([code], { type: type || 'text/javascript' })); }
  function loadClassicScript(code) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = blobUrl(code);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load page-flip')); };
      document.head.appendChild(s);
    });
  }

  /** PDF.js asks this for wasm decoders (JBIG2 / JPEG 2000 / ICC). Served from the embedded copies. */
  function EmbeddedDataFactory() {}
  EmbeddedDataFactory.prototype.fetch = function (req) {
    var b64 = SRC.wasm && SRC.wasm[req.filename];
    if (b64) return Promise.resolve(base64ToBytes(b64));
    return Promise.reject(new Error('Not bundled offline: ' + req.kind + ' ' + req.filename));
  };

  // ------------------------- boot -------------------------
  async function boot() {
    try {
      pdfjs = await import(blobUrl(SRC.pdfjs));
      pdfjs.GlobalWorkerOptions.workerSrc = blobUrl(SRC.worker);
      await loadClassicScript(SRC.pageflip);
      // Free the big source strings; the blobs hold what's needed now.
      SRC.pdfjs = SRC.worker = SRC.pageflip = null;
      post({ type: 'ready', pdfjsVersion: pdfjs.version });
    } catch (e) {
      post({ type: 'error', fatal: true, message: 'Reader failed to start: ' + e.message });
    }
  }

  // ------------------------- loading -------------------------
  async function openBook(msg) {
    if (msg.appearance) applyAppearance(msg.appearance);
    if (!pdfjs) throw new Error('engine not ready');

    var size = msg.size;
    var transport = new pdfjs.PDFDataRangeTransport(size, null);
    transport.requestDataRange = function (begin, end) {
      var id = ++S.reqId;
      S.pending.set(id, begin);
      post({ type: 'readRange', id: id, begin: begin, end: Math.min(end, size) });
    };
    S.transport = transport;

    var task = pdfjs.getDocument({
      range: transport,
      rangeChunkSize: CHUNK,
      disableAutoFetch: true,
      disableStream: true,
      isEvalSupported: false,
      enableXfa: false,
      useSystemFonts: true,
      useWorkerFetch: false,
      BinaryDataFactory: EmbeddedDataFactory,
      verbosity: 0,
    });
    task.onPassword = function () {
      post({ type: 'error', fatal: true, code: 'password', message: 'This PDF is password-protected. Password-protected PDFs are not supported yet.' });
      task.destroy();
    };

    try {
      S.pdf = await task.promise;
    } catch (e) {
      if (e && e.name === 'PasswordException') return;
      post({ type: 'error', fatal: true, message: 'Could not open this PDF: ' + ((e && e.message) || e) });
      return;
    }

    S.numPages = S.pdf.numPages;
    var start = clamp((msg.startPage || 1) - 1, 0, S.numPages - 1);
    var ratio = await sampleRatio();
    buildBook(ratio, start);
    post({ type: 'loaded', totalPages: S.numPages, page: start + 1 });
  }

  function onRange(msg) {
    if (!S.pending.has(msg.id) || !S.transport) return;
    var begin = S.pending.get(msg.id);
    S.pending.delete(msg.id);
    S.transport.onDataRange(begin, base64ToBytes(msg.data));
  }
  function onRangeError(msg) {
    S.pending.delete(msg.id);
    post({ type: 'error', fatal: true, message: 'Could not read the book file: ' + msg.message });
  }

  /** Most common width/height ratio among the first few pages (covers are often odd sizes). */
  async function sampleRatio() {
    var counts = {}, best = null, bestN = 0;
    var n = Math.min(S.numPages, 5);
    for (var i = 1; i <= n; i++) {
      var p = await S.pdf.getPage(i);
      var v = p.getViewport({ scale: 1 });
      var r = Math.round((v.width / v.height) * 100) / 100;
      counts[r] = (counts[r] || 0) + 1;
      if (counts[r] > bestN) { bestN = counts[r]; best = r; }
    }
    return best || 0.707;
  }

  // ------------------------- book / page-flip -------------------------
  function buildBook(ratio, startIndex) {
    var bookEl = document.getElementById('book');
    bookEl.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var i = 0; i < S.numPages; i++) {
      var page = document.createElement('div');
      page.className = 'page';
      page.setAttribute('data-density', 'soft');
      var ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = String(i + 1);
      var img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.onload = onImgLoad;
      page.appendChild(ph);
      page.appendChild(img);
      frag.appendChild(page);
      S.pageEls.push(page);
      S.imgEls.push(img);
    }
    bookEl.appendChild(frag);

    var stageWidth = document.getElementById('stage').clientWidth || window.innerWidth;
    S.flip = new St.PageFlip(bookEl, {
      width: 1000,
      height: Math.round(1000 / ratio),
      size: 'stretch',
      // minWidth > half the screen forces single-page (portrait) mode, like a phone reader.
      minWidth: Math.ceil(stageWidth),
      maxWidth: 5000,
      minHeight: 100,
      maxHeight: 8000,
      autoSize: false,
      usePortrait: true,
      showCover: false,
      drawShadow: true,
      maxShadowOpacity: 0.55,
      flippingTime: 700,
      mobileScrollSupport: false,
      swipeDistance: 30,
      showPageCorners: false,
      disableFlipByClick: false, // must stay false: it also blocks swipes and flipNext()/flipPrev()
      clickEventForward: false,
      useMouseEvents: true,
      startPage: startIndex,
    });
    watchForPageBacks(bookEl);
    S.flip.loadFromHTML(S.pageEls);
    patchPageFlip(S.flip); // flipController exists only after loading
    S.flip.on('flip', function (e) { onPageShown(e.data); });
    S.flip.on('changeState', function (e) { S.flipState = e.data; });

    S.current = startIndex;
    S.lastRect = rectKey();
    window.addEventListener('resize', onResize);
    pump();
  }

  function onImgLoad(e) {
    e.target.classList.add('ready');
    if (e.target.parentNode) e.target.parentNode.classList.add('loaded');
  }

  /**
   * Two small behaviour tweaks to page-flip 2.0.7 (pinned version):
   *  1. A press without movement never turns the page (our tap zones handle taps).
   *  2. Releasing a slow drag completes the turn once the corner passes the middle
   *     of the page (stock behaviour needs a drag all the way across).
   */
  function patchPageFlip(pf) {
    try {
      pf.userStop = function (pos, isSwipe) {
        if (!this.isUserTouch) return;
        this.isUserTouch = false;
        if (!isSwipe && this.isUserMove) this.flipController.stopMove();
      };
      var fc = pf.flipController;
      fc.stopMove = function () {
        if (this.calc === null) return;
        var pos = this.calc.getPosition();
        var r = this.getBoundsRect();
        var y = this.calc.getCorner() === 'bottom' ? r.height : 0;
        if (pos.x <= r.pageWidth * 0.5) this.animateFlippingTo(pos, { x: -r.pageWidth, y: y }, true);
        else this.animateFlippingTo(pos, { x: r.pageWidth, y: y }, false);
      };
    } catch (e) {
      log('warn', 'page-flip patch failed: ' + e.message);
    }
  }

  /**
   * While a page curls, page-flip shows a *clone* of it as the paper's back side.
   * Mark clones so CSS can render them as faint, mirrored show-through like real paper.
   */
  function watchForPageBacks(bookEl) {
    var originals = new WeakSet(S.pageEls);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        r.addedNodes.forEach(function (n) {
          if (n.nodeType === 1 && n.classList.contains('page') && !originals.has(n)) n.classList.add('back');
        });
      });
    }).observe(bookEl, { childList: true, subtree: true });
  }

  function onPageShown(index) {
    if (index === S.current) return;
    S.current = index;
    post({ type: 'page', page: index + 1 });
    pump();
  }

  function goTo(pageNumber) {
    if (!S.flip) return;
    var index = clamp((pageNumber | 0) - 1, 0, S.numPages - 1);
    S.flip.turnToPage(index);
    // turnToPage does not always emit 'flip'
    var shown = S.flip.getCurrentPageIndex();
    onPageShown(typeof shown === 'number' ? shown : index);
  }

  // ------------------------- rendering -------------------------
  function rect() { return S.flip.getRender().getRect(); }
  function rectKey() { var r = rect(); return Math.round(r.pageWidth) + 'x' + Math.round(r.height); }

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!S.flip) return;
      exitZoom(true);
      var key = rectKey();
      if (key === S.lastRect) return;
      S.lastRect = key;
      S.gen++;                 // stale renders are discarded
      S.status = [];           // re-render at the new size (old images stay visible meanwhile)
      pump();
    }, 250);
  }

  function wanted() {
    var c = S.current, out = [];
    [0, 1, -1, 2, 3, -2, 4, -3].forEach(function (d) {
      var i = c + d;
      if (i >= 0 && i < S.numPages) out.push(i);
    });
    return out;
  }

  async function pump() {
    if (S.pumping || !S.pdf) return;
    S.pumping = true;
    try {
      for (;;) {
        var next = wanted().find(function (i) { return !S.status[i]; });
        if (next === undefined) break;
        await renderPage(next);
      }
    } finally {
      S.pumping = false;
    }
    evict();
  }

  async function renderPage(i) {
    var gen = S.gen;
    S.status[i] = 'rendering';
    try {
      var r = rect();
      var page = await S.pdf.getPage(i + 1);
      var base = page.getViewport({ scale: 1 });
      var fit = Math.min(r.pageWidth / base.width, r.height / base.height);
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var scale = fit * dpr;
      var px = base.width * base.height * scale * scale;
      if (px > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / px);
      var vp = page.getViewport({ scale: scale });

      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      await page.render({ canvas: canvas, viewport: vp, background: '#ffffff' }).promise;
      var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/jpeg', 0.92); });
      canvas.width = canvas.height = 0;
      page.cleanup();

      if (gen !== S.gen) { S.status[i] = undefined; return; }
      if (!blob) throw new Error('toBlob failed');

      var url = URL.createObjectURL(blob);
      var old = S.urls[i];
      S.urls[i] = url;
      S.imgEls[i].src = url;
      if (old) setTimeout(function () { URL.revokeObjectURL(old); }, 1000);
      S.pageEls[i].classList.remove('error');
      S.status[i] = 'done';
    } catch (e) {
      if (gen !== S.gen) { S.status[i] = undefined; return; }
      S.status[i] = 'error';
      S.pageEls[i].classList.add('error');
      S.pageEls[i].querySelector('.ph').textContent = 'Page ' + (i + 1) + ' could not be displayed';
      log('warn', 'render page ' + (i + 1) + ': ' + e.message);
    }
  }

  /** Free bitmaps far from the current page. */
  function evict() {
    var lo = S.current - KEEP_BEHIND, hi = S.current + KEEP_AHEAD;
    for (var i = 0; i < S.numPages; i++) {
      if ((i < lo || i > hi) && S.urls[i]) {
        URL.revokeObjectURL(S.urls[i]);
        S.urls[i] = undefined;
        S.status[i] = undefined;
        S.imgEls[i].classList.remove('ready');
        S.pageEls[i].classList.remove('loaded');
        S.imgEls[i].removeAttribute('src');
      }
    }
  }

  // ------------------------- appearance -------------------------
  function applyAppearance(a) {
    if (!a) return;
    S.appearance = a;
    var st = document.documentElement.style;
    st.setProperty('--bg', a.background);
    st.setProperty('--paper', a.paper);
    st.setProperty('--ink', a.text);
    st.setProperty('--page-filter', a.pageFilter || 'none');
    st.setProperty('--page-blend', a.pageBlend || 'normal');
    st.setProperty('--crease', a.crease || 'rgba(0,0,0,0.12)');
    var f = [];
    if (a.brightness != null && a.brightness !== 1) f.push('brightness(' + a.brightness + ')');
    if (a.contrast != null && a.contrast !== 1) f.push('contrast(' + a.contrast + ')');
    st.setProperty('--book-filter', f.length ? f.join(' ') : 'none');
  }

  // ------------------------- pinch to zoom -------------------------
  // Two fingers on the page open a zoom layer showing the current page. While it is open,
  // ALL touches go to the zoom layer (page-flip never sees them): pinch to zoom, drag to pan,
  // tap to show/hide controls, double-tap or pinch back to 100% to return to page turning.
  // When a gesture ends, the page is re-rendered sharply at the new zoom level.
  var MAX_ZOOM = 6;
  var MAX_ZOOM_PIXELS = 10e6;
  var Z = {
    active: false, exiting: false, page: 0,
    s: 1, x: 0, y: 0, L: 0, T: 0, W: 0, H: 0,
    gesture: null, lastTap: 0, tapTimer: null,
    hiUrl: null, hiScale: 0, hiGen: 0, hiTimer: null,
    el: null, inner: null, img: null,
  };

  function setupZoom() {
    Z.el = document.createElement('div');
    Z.el.id = 'zoom';
    Z.inner = document.createElement('div');
    Z.inner.className = 'zpage';
    Z.img = document.createElement('img');
    Z.img.alt = '';
    Z.inner.appendChild(Z.img);
    Z.el.appendChild(Z.inner);
    document.body.appendChild(Z.el);
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function (t) {
      window.addEventListener(t, onZoomTouch, { capture: true, passive: false });
    });
  }

  function onZoomTouch(e) {
    if (!Z.active) {
      var canStart = e.type === 'touchstart' && e.touches.length === 2 &&
        S.flip && S.flipState === 'read' && S.urls[S.current];
      if (!canStart) return; // normal page-turn handling
      if (!enterZoom()) return;
    }
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (Z.exiting) return;

    var p = points(e);
    if (e.type === 'touchmove') moveGesture(p);
    else if (p.length > 0) beginGesture(p); // a finger went down or up: re-anchor
    else endGesture();
  }

  function enterZoom() {
    var r = S.pageEls[S.current].getBoundingClientRect();
    if (!r.width || !r.height) return false;
    // Cancel whatever page-flip and the tap detector started with the first finger.
    try { S.flip.isUserTouch = false; S.flip.ui.touchPoint = null; } catch (err) { /* ignore */ }
    touch = null;

    Z.page = S.current;
    Z.L = r.left; Z.T = r.top; Z.W = r.width; Z.H = r.height;
    Z.s = 1; Z.x = r.left; Z.y = r.top;
    Z.hiScale = 0;
    Z.gesture = null;
    Z.inner.style.width = r.width + 'px';
    Z.inner.style.height = r.height + 'px';
    Z.inner.style.transition = 'none';
    Z.img.src = S.urls[S.current];
    applyZoom();
    Z.el.style.display = 'block';
    Z.active = true;
    return true;
  }

  function exitZoom(immediate) {
    if (!Z.active || (Z.exiting && !immediate)) return;
    Z.exiting = true;
    Z.hiGen++;
    clearTimeout(Z.hiTimer);
    clearTimeout(Z.tapTimer);
    function done() {
      Z.el.style.display = 'none';
      Z.active = false;
      Z.exiting = false;
      Z.gesture = null;
      Z.img.removeAttribute('src');
      if (Z.hiUrl) { URL.revokeObjectURL(Z.hiUrl); Z.hiUrl = null; }
    }
    Z.s = 1; Z.x = Z.L; Z.y = Z.T;
    if (immediate) { done(); return; }
    Z.inner.style.transition = 'transform 0.2s ease-out';
    applyZoom();
    setTimeout(done, 210);
  }

  function points(e) {
    var out = [];
    for (var i = 0; i < e.touches.length; i++) out.push({ x: e.touches[i].clientX, y: e.touches[i].clientY });
    return out;
  }
  function mid(a, b) { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function beginGesture(p) {
    var prev = Z.gesture;
    var g = {
      s0: Z.s, x0: Z.x, y0: Z.y,
      startTime: prev ? prev.startTime : Date.now(),
      startPt: prev ? prev.startPt : p[0],
      maxTouches: Math.max(prev ? prev.maxTouches : 0, p.length),
      moved: prev ? prev.moved : false,
    };
    if (p.length >= 2) {
      g.m0 = mid(p[0], p[1]);
      g.d0 = dist(p[0], p[1]) || 1;
      g.c = { x: (g.m0.x - Z.x) / Z.s, y: (g.m0.y - Z.y) / Z.s }; // page point under the fingers
    } else {
      g.p0 = p[0];
    }
    Z.gesture = g;
    Z.inner.style.transition = 'none';
  }

  function moveGesture(p) {
    var g = Z.gesture;
    if (!g || !p.length) return;
    if (p.length >= 2 && g.m0) {
      var m = mid(p[0], p[1]);
      var s = clamp(g.s0 * dist(p[0], p[1]) / g.d0, 0.7, MAX_ZOOM);
      Z.s = s;
      Z.x = m.x - s * g.c.x;
      Z.y = m.y - s * g.c.y;
      g.moved = true;
    } else if (g.p0) {
      Z.x = g.x0 + (p[0].x - g.p0.x);
      Z.y = g.y0 + (p[0].y - g.p0.y);
      if (Math.hypot(p[0].x - g.startPt.x, p[0].y - g.startPt.y) > 10) g.moved = true;
    }
    constrain(false);
    applyZoom();
  }

  function endGesture() {
    var g = Z.gesture;
    Z.gesture = null;
    var isTap = g && !g.moved && g.maxTouches === 1 && Date.now() - g.startTime < 300;
    if (isTap) {
      var now = Date.now();
      if (now - Z.lastTap < 320) {         // double-tap: back to normal reading
        clearTimeout(Z.tapTimer);
        Z.lastTap = 0;
        exitZoom(false);
      } else {                              // single tap: show/hide controls
        Z.lastTap = now;
        Z.tapTimer = setTimeout(function () { post({ type: 'toggleControls' }); }, 320);
      }
      return;
    }
    if (Z.s < 1.05) { exitZoom(false); return; }
    constrain(true);
    Z.inner.style.transition = 'transform 0.18s ease-out';
    applyZoom();
    clearTimeout(Z.hiTimer);
    Z.hiTimer = setTimeout(renderZoomSharp, 220);
  }

  /** Keep the page covering the screen (or centred when smaller than it). */
  function constrain(hard) {
    if (!hard && Z.s < 1) return; // allow a little shrink while pinching in
    var vw = window.innerWidth, vh = window.innerHeight;
    var w = Z.W * Z.s, h = Z.H * Z.s;
    Z.x = w <= vw ? (vw - w) / 2 : clamp(Z.x, vw - w, 0);
    Z.y = h <= vh ? (vh - h) / 2 : clamp(Z.y, vh - h, 0);
  }

  function applyZoom() {
    Z.inner.style.transform = 'translate3d(' + Z.x + 'px,' + Z.y + 'px,0) scale(' + Z.s + ')';
  }

  async function renderZoomSharp() {
    if (!Z.active || Z.s <= Z.hiScale * 1.1) return;
    var gen = ++Z.hiGen, s = Z.s, idx = Z.page;
    try {
      var page = await S.pdf.getPage(idx + 1);
      var base = page.getViewport({ scale: 1 });
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var scale = Math.min(Z.W / base.width, Z.H / base.height) * dpr * s;
      var px = base.width * base.height * scale * scale;
      if (px > MAX_ZOOM_PIXELS) scale *= Math.sqrt(MAX_ZOOM_PIXELS / px);
      var vp = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(vp.width));
      canvas.height = Math.max(1, Math.floor(vp.height));
      await page.render({ canvas: canvas, viewport: vp, background: '#ffffff' }).promise;
      var blob = await new Promise(function (res) { canvas.toBlob(res, 'image/jpeg', 0.92); });
      canvas.width = canvas.height = 0;
      if (gen !== Z.hiGen || !Z.active || !blob) return;
      var url = URL.createObjectURL(blob);
      var old = Z.hiUrl;
      Z.hiUrl = url;
      Z.hiScale = s;
      Z.img.src = url;
      if (old) setTimeout(function () { URL.revokeObjectURL(old); }, 500);
    } catch (err) {
      log('warn', 'zoom render: ' + err.message);
    }
  }

  // ------------------------- taps -------------------------
  // Quick taps: left 28% = previous, right 28% = next, middle = toggle reader controls.
  // Swipes and corner drags are handled by page-flip itself (with the curl animation).
  var touch = null;
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { touch = null; return; }
    var t = e.touches[0];
    touch = { x: t.clientX, y: t.clientY, time: Date.now() };
  }, { passive: true, capture: true });

  window.addEventListener('touchend', function (e) {
    if (!touch) return;
    var start = touch;
    touch = null;
    var t = e.changedTouches[0];
    var moved = Math.hypot(t.clientX - start.x, t.clientY - start.y);
    if (moved > 12 || Date.now() - start.time > 400) return;
    // Let page-flip process the same touchend first (it may have started a corner flip).
    setTimeout(function () { handleTap(start.x); }, 0);
  }, { passive: true });

  function handleTap(x) {
    if (!S.flip) { post({ type: 'toggleControls' }); return; }
    if (S.flipState !== 'read') return;
    var w = window.innerWidth;
    if (x < w * 0.28) {
      if (S.current > 0) S.flip.flipPrev('bottom');
    } else if (x > w * 0.72) {
      if (S.current < S.numPages - 1) S.flip.flipNext('bottom');
    } else {
      post({ type: 'toggleControls' });
    }
  }

  setupZoom();
  boot();
})();
