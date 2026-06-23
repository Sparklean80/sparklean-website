(function () {
  var bookEl = document.getElementById("sh-book");
  var PageFlipCtor = window.St && window.St.PageFlip;
  if (!bookEl || !PageFlipCtor) return;

  var pages = bookEl.querySelectorAll(".sh-page");
  if (!pages.length) return;

  var loading = document.getElementById("sh-loading");
  var peelHint = document.getElementById("sh-peel-hint");
  var prevBtn = document.getElementById("sh-prev");
  var nextBtn = document.getElementById("sh-next");
  var counterEl = document.getElementById("sh-page-num");
  var hintEl = document.querySelector(".sh-flip-hint");

  var pageFlip = new PageFlipCtor(bookEl, {
    width: 550,
    height: 780,
    size: "stretch",
    minWidth: 260,
    maxWidth: 820,
    minHeight: 360,
    maxHeight: 1300,
    showCover: true,
    maxShadowOpacity: 0.65,
    mobileScrollSupport: false,
    drawShadow: true,
    flippingTime: 1000,
    usePortrait: true,
    startPage: 0,
    autoSize: true,
    swipeDistance: 24,
  });

  var total = pages.length;

  pageFlip.on("init", function () {
    if (loading) loading.hidden = true;
    syncUI(pageFlip.getCurrentPageIndex());
  });

  pageFlip.on("flip", function (e) {
    syncUI(e.data);
  });

  pageFlip.loadFromHtml(pages);

  window.addEventListener("resize", function () {
    pageFlip.update();
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      pageFlip.flipPrev("bottom");
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      pageFlip.flipNext("bottom");
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      pageFlip.flipNext("bottom");
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      pageFlip.flipPrev("bottom");
    }
  });

  function syncUI(index) {
    var current = index + 1;
    var pad = function (n) {
      return n < 10 ? "0" + n : "" + n;
    };

    if (counterEl) {
      counterEl.innerHTML =
        pad(current) + " <em>/</em> " + pad(total);
    }

    if (prevBtn) prevBtn.disabled = index <= 0;
    if (nextBtn) nextBtn.disabled = index >= total - 1;

    if (peelHint) {
      peelHint.classList.toggle("is-hidden", index >= total - 1);
    }

    if (hintEl) {
      hintEl.textContent =
        index >= total - 1
          ? "End of edition · Private client link"
          : "Drag the corner, tap the edge, or use arrows to turn";
    }
  }
})();
