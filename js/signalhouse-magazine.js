(function () {
  var bookEl = document.getElementById("sh-book");
  var PageFlipCtor = window.St && window.St.PageFlip;
  if (!bookEl || !PageFlipCtor) return;

  var pages = bookEl.querySelectorAll(".sh-page");
  if (!pages.length) return;

  var total = pages.length;
  var loading = document.getElementById("sh-loading");
  var chromePages = document.getElementById("sh-chrome-pages");
  var hintEl = document.getElementById("sh-hint");
  var badge = document.getElementById("sh-flip-badge");
  var gutter = document.querySelector(".sh-magazine-gutter");
  var sidePrev = document.getElementById("sh-side-prev");
  var sideNext = document.getElementById("sh-side-next");
  var soundBtn = document.getElementById("sh-sound-btn");
  var fsBtn = document.getElementById("sh-fullscreen-btn");
  var shell = document.querySelector(".sh-flip-shell");

  var soundOn = localStorage.getItem("sh-sound") !== "off";
  var audioCtx = null;
  var pageFlip = null;
  var lastFlipAt = 0;

  function isMobile() {
    return window.innerWidth < 768;
  }

  function bookSettings() {
    var mobile = isMobile();
    return {
      width: mobile ? 360 : 420,
      height: mobile ? 520 : 600,
      size: "stretch",
      minWidth: mobile ? 280 : 560,
      maxWidth: mobile ? 480 : 1280,
      minHeight: mobile ? 380 : 440,
      maxHeight: mobile ? 820 : 820,
      showCover: true,
      maxShadowOpacity: 0.72,
      mobileScrollSupport: false,
      drawShadow: true,
      flippingTime: 1100,
      usePortrait: mobile,
      startPage: 0,
      autoSize: true,
      swipeDistance: 20,
    };
  }

  pageFlip = new PageFlipCtor(bookEl, bookSettings());

  pageFlip.on("init", function () {
    if (loading) loading.hidden = true;
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
  });

  pageFlip.loadFromHtml(pages);

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      pageFlip.update();
      updateGutter();
    }, 120);
  });

  function flipNext() {
    unlockAudio();
    pageFlip.flipNext("bottom");
  }

  function flipPrev() {
    unlockAudio();
    pageFlip.flipPrev("bottom");
  }

  bindFlip(sideNext, flipNext);
  bindFlip(sidePrev, flipPrev);

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
      if (!document.fullscreenElement) {
        shell.requestFullscreen().catch(function () {});
      } else {
        document.exitFullscreen();
      }
    });
  }

  bookEl.addEventListener("click", unlockAudio, { once: true });
  bookEl.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

  function bindFlip(btn, fn) {
    if (!btn) return;
    btn.addEventListener("click", fn);
  }

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
    if (chromePages) chromePages.textContent = pageLabel(index);

    if (sidePrev) sidePrev.disabled = index <= 0;
    if (sideNext) sideNext.disabled = index >= total - 1;

    updateHint(index);
    updateGutter();
  }

  function updateHint(index) {
    if (!hintEl) return;
    var soundTxt = soundOn ? "Sound on" : "Sound off";
    if (index >= total - 1) {
      hintEl.textContent = "End of edition · Private client link · " + soundTxt;
    } else {
      hintEl.textContent =
        "Drag a corner or tap the page edge to turn · " + soundTxt;
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

  setTimeout(hideBadge, 8000);
})();
