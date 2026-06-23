(function () {
  var bookEl = document.getElementById("sh-book");
  var PageFlipCtor = window.St && window.St.PageFlip;
  if (!bookEl || !PageFlipCtor) return;

  var pages = bookEl.querySelectorAll(".sh-page");
  if (!pages.length) return;

  var hint = document.querySelector(".sh-flip-hint");
  var loading = document.getElementById("sh-loading");

  var pageFlip = new PageFlipCtor(bookEl, {
    width: 550,
    height: 780,
    size: "stretch",
    minWidth: 280,
    maxWidth: 920,
    minHeight: 380,
    maxHeight: 1400,
    showCover: false,
    maxShadowOpacity: 0.55,
    mobileScrollSupport: false,
    drawShadow: true,
    flippingTime: 900,
    usePortrait: true,
    startPage: 0,
    autoSize: true,
  });

  pageFlip.on("init", function () {
    if (loading) loading.style.display = "none";
    updateHint(pageFlip.getCurrentPageIndex() + 1, pages.length);
  });

  pageFlip.on("flip", function (e) {
    updateHint(e.data + 1, pages.length);
  });

  pageFlip.loadFromHtml(pages);

  window.addEventListener("resize", function () {
    pageFlip.update();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown") {
      pageFlip.flipNext("bottom");
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      pageFlip.flipPrev("bottom");
    }
  });

  function updateHint(current, total) {
    if (!hint) return;
    hint.textContent =
      "Drag corner or tap edge to turn · Page " + current + " of " + total;
  }
})();
