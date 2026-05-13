/**
 * Sparklean — sitewide mobile sticky call bar (injected once; styles in sparklean-mobile-first.css).
 * Desktop: bar removed from DOM. Tablet/mobile: bar shown, body gets padding via .sparklean-mcta--active.
 */
(function () {
  var MQ = "(max-width: 1024px)";
  var media = window.matchMedia(MQ);
  var bar = null;
  var resizeTimer = null;

  function buildBar() {
    var el = document.createElement("div");
    el.id = "sparklean-mcta";
    el.className = "sparklean-mcta";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Call Sparklean Cleaning");
    el.innerHTML =
      '<div class="sparklean-mcta__inner">' +
        '<a class="sparklean-mcta__call" href="tel:2398883588">' +
          '<span class="sparklean-mcta__call-icon" aria-hidden="true">📞</span>' +
          '<span class="sparklean-mcta__call-text">' +
            '<span class="sparklean-mcta__call-kicker">Call now</span>' +
            '<span class="sparklean-mcta__call-num">(239) 888-3588</span>' +
          "</span>" +
        "</a>" +
        '<a class="sparklean-mcta__quote" href="/contact">Get quote</a>' +
      "</div>";
    return el;
  }

  function sync() {
    var want = media.matches;
    if (!want) {
      if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
      bar = null;
      document.body.classList.remove("sparklean-mcta--active");
      return;
    }
    if (document.getElementById("sparklean-mcta")) {
      document.body.classList.add("sparklean-mcta--active");
      return;
    }
    bar = buildBar();
    document.body.appendChild(bar);
    document.body.classList.add("sparklean-mcta--active");
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sync, 100);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sync);
  } else {
    sync();
  }

  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", sync);
  } else if (typeof media.addListener === "function") {
    media.addListener(sync);
  }

  window.addEventListener("resize", onResize, { passive: true });
})();
