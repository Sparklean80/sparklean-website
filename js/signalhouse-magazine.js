(function () {
  var bookEl = document.getElementById("sh-book");
  var PageFlipCtor = window.St && window.St.PageFlip;
  if (!bookEl || !PageFlipCtor) return;

  var pages = bookEl.querySelectorAll(".sh-page");
  if (!pages.length) return;

  var total = pages.length;
  var loading = document.getElementById("sh-loading");
  var chromePages = document.getElementById("sh-chrome-pages");
  var barPages = document.getElementById("sh-bar-pages");
  var hintEl = document.getElementById("sh-hint");
  var badge = document.getElementById("sh-flip-badge");
  var gutter = document.querySelector(".sh-magazine-gutter");
  var sidePrev = document.getElementById("sh-side-prev");
  var sideNext = document.getElementById("sh-side-next");
  var barPrev = document.getElementById("sh-bar-prev");
  var barNext = document.getElementById("sh-bar-next");
  var soundBtn = document.getElementById("sh-sound-btn");
  var fsBtn = document.getElementById("sh-fullscreen-btn");
  var shell = document.querySelector(".sh-flip-shell");

  var soundOn = localStorage.getItem("sh-sound") !== "off";
  var audioCtx = null;
  var pageFlip = null;
  var lastFlipAt = 0;
  var wasMobile = null;

  function isMobile() {
    return window.matchMedia("(max-width: 720px)").matches;
  }

  function bookSettings() {
    var mobile = isMobile();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (mobile) {
      var pad = 28;
      var maxW = Math.max(260, vw - pad);
      var maxH = Math.max(360, vh - 200);
      return {
        width: Math.min(maxW, 400),
        height: Math.min(maxH, Math.round(maxW * 1.42)),
        size: "stretch",
        minWidth: Math.max(240, vw - pad),
        maxWidth: maxW,
        minHeight: 320,
        maxHeight: maxH,
        showCover: true,
        maxShadowOpacity: 0.65,
        mobileScrollSupport: false,
        drawShadow: true,
        flippingTime: 900,
        usePortrait: true,
        startPage: 0,
        autoSize: true,
        swipeDistance: 16,
        useMouseEvents: true,
      };
    }

    return {
      width: 420,
      height: 600,
      size: "stretch",
      minWidth: 560,
      maxWidth: 1280,
      minHeight: 440,
      maxHeight: 820,
      showCover: true,
      maxShadowOpacity: 0.72,
      mobileScrollSupport: false,
      drawShadow: true,
      flippingTime: 1100,
      usePortrait: false,
      startPage: 0,
      autoSize: true,
      swipeDistance: 20,
    };
  }

  function dismissLoading() {
    if (loading) loading.hidden = true;
  }

  function bindFlip(btn, fn) {
    if (!btn) return;
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      fn();
    });
  }

  function wireControls() {
    bindFlip(sidePrev, flipPrev);
    bindFlip(sideNext, flipNext);
    bindFlip(barPrev, flipPrev);
    bindFlip(barNext, flipNext);
  }

  function attachEvents() {
    pageFlip.on("init", function () {
      dismissLoading();
      syncUI(pageFlip.getCurrentPageIndex());
      updateGutter();
    });

    pageFlip.on("flip", function (e) {
      syncUI(e.data);
      hideBadge();
    });

    pageFlip.on("changeState", function (e) {
      if (e.data === "flipping") {
        playPageSound();
      }
    });

    pageFlip.on("changeOrientation", function () {
      updateGutter();
      syncUI(pageFlip.getCurrentPageIndex());
    });
  }

  function createFlipbook() {
    pageFlip = new PageFlipCtor(bookEl, bookSettings());
    attachEvents();

    try {
      pageFlip.loadFromHTML(pages);
    } catch (err) {
      dismissLoading();
      if (hintEl) hintEl.textContent = "Could not load flipbook. Refresh the page.";
      return;
    }

    setTimeout(function () {
      dismissLoading();
      if (pageFlip) {
        pageFlip.update();
        syncUI(pageFlip.getCurrentPageIndex());
      }
    }, 2500);
  }

  createFlipbook();
  wireControls();

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var mobile = isMobile();
      if (wasMobile === null) wasMobile = mobile;

      if (mobile !== wasMobile) {
        wasMobile = mobile;
        var idx = pageFlip.getCurrentPageIndex();
        pageFlip.destroy();
        createFlipbook();
        setTimeout(function () {
          if (pageFlip && idx > 0) {
            pageFlip.turnToPage(idx);
            syncUI(idx);
          }
        }, 100);
      } else {
        pageFlip.update();
        updateGutter();
      }
    }, 180);
  });

  wasMobile = isMobile();

  function flipNext() {
    unlockAudio();
    pageFlip.flipNext("bottom");
  }

  function flipPrev() {
    unlockAudio();
    pageFlip.flipPrev("bottom");
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      flipNext();
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      flipPrev();
    }
  });

  if (soundBtn) {
    soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      localStorage.setItem("sh-sound", soundOn ? "on" : "off");
      soundBtn.setAttribute("aria-pressed", soundOn ? "true" : "false");
      updateHint(pageFlip.getCurrentPageIndex());
      if (soundOn) {
        unlockAudio();
        playPageSound();
      }
    });
  }

  if (fsBtn && shell) {
    fsBtn.addEventListener("click", function () {
      var el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        var req = shell.requestFullscreen || shell.webkitRequestFullscreen;
        if (req) req.call(shell).catch(function () {});
      } else {
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit) exit.call(document);
      }
    });
  }

  bookEl.addEventListener("click", unlockAudio, { once: true });
  bookEl.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

  function unlockAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  }

  function playPageSound() {
    if (!soundOn) return;
    var now = Date.now();
    if (now - lastFlipAt < 180) return;
    lastFlipAt = now;

    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") return;

      var sr = audioCtx.sampleRate;
      var dur = 0.22;
      var len = Math.floor(sr * dur);
      var buf = audioCtx.createBuffer(1, len, sr);
      var ch = buf.getChannelData(0);

      for (var i = 0; i < len; i++) {
        var t = i / len;
        var env = Math.pow(1 - t, 1.8);
        ch[i] = (Math.random() * 2 - 1) * env * 0.55;
      }

      var src = audioCtx.createBufferSource();
      src.buffer = buf;

      var bp = audioCtx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 0.7;

      var hp = audioCtx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 400;

      var gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.28, audioCtx.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);

      src.connect(bp);
      bp.connect(hp);
      hp.connect(gain);
      gain.connect(audioCtx.destination);
      src.start();
    } catch (err) {
      /* silent */
    }
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function pageLabel(index) {
    if (index === 0) {
      return "Cover · Page 1 of " + total;
    }

    var landscape = pageFlip.getOrientation() === "landscape" && !isMobile();
    var human = index + 1;

    if (landscape && index < total - 1) {
      var end = Math.min(index + 2, total);
      if (end > human) {
        return "Pages " + human + " \u2013 " + end + " of " + total;
      }
    }

    return "Page " + human + " of " + total;
  }

  function syncUI(index) {
    var label = pageLabel(index);
    if (chromePages) chromePages.textContent = label;
    if (barPages) {
      barPages.textContent = pad(index + 1) + " / " + pad(total);
    }

    var atStart = index <= 0;
    var atEnd = index >= total - 1;

    [sidePrev, barPrev].forEach(function (btn) {
      if (btn) btn.disabled = atStart;
    });
    [sideNext, barNext].forEach(function (btn) {
      if (btn) btn.disabled = atEnd;
    });

    updateHint(index);
    updateGutter();
  }

  function updateHint(index) {
    if (!hintEl) return;
    var soundTxt = soundOn ? "Sound on" : "Sound off";
    if (index >= total - 1) {
      hintEl.textContent = "End of edition · Private link · " + soundTxt;
      return;
    }
    if (isMobile()) {
      hintEl.textContent = "Swipe the page or use the arrows below · " + soundTxt;
    } else {
      hintEl.textContent = "Drag a corner or tap the page edge to turn · " + soundTxt;
    }
  }

  function updateGutter() {
    if (!gutter) return;
    var spread =
      pageFlip.getOrientation() === "landscape" &&
      !isMobile() &&
      pageFlip.getCurrentPageIndex() > 0 &&
      pageFlip.getCurrentPageIndex() < total - 1;
    gutter.classList.toggle("is-spread", spread);
  }

  function hideBadge() {
    if (badge) badge.classList.add("is-hidden");
  }

  setTimeout(hideBadge, 6000);
})();
