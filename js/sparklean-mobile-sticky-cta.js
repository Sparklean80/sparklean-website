/**
 * Sparklean — sitewide mobile sticky call bar (injected once; styles in sparklean-mobile-first.css).
 * Desktop: bar removed from DOM. Tablet/mobile: bar shown, body gets padding via .sparklean-mcta--active.
 */
(function () {
  var MQ = "(max-width: 1024px)";
  var media = window.matchMedia(MQ);
  var bar = null;
  var resizeTimer = null;

  function quoteButtonLabel() {
    try {
      var custom = (document.body.getAttribute("data-sparklean-mcta-quote") || "").trim();
      if (custom) return custom.slice(0, 40);
    } catch (e0) {
      /* ignore */
    }
    return "Get quote";
  }

  function buildBar() {
    var el = document.createElement("div");
    el.id = "sparklean-mcta";
    el.className = "sparklean-mcta";
    el.setAttribute("role", "region");
    el.setAttribute("aria-label", "Call Sparklean Cleaning");
    var quoteLabel = quoteButtonLabel()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
    el.innerHTML =
      '<div class="sparklean-mcta__inner">' +
        '<a class="sparklean-mcta__call" href="tel:2398883588" aria-label="Call Sparklean at (239) 888-3588">' +
          '<svg class="sparklean-mcta__call-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.2z"/></svg>' +
          '<span class="sparklean-mcta__call-label">Call</span>' +
        "</a>" +
        '<button type="button" class="sparklean-mcta__quote">' + quoteLabel + "</button>" +
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
