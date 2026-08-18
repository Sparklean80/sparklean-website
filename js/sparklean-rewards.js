/**
 * Sparklean Rewards — header badge + mobile sticky bar (homepage).
 */
(function () {
  var SHINE_KEY = "sparklean_rewards_shine_v1";

  function init() {
    var root = document.querySelector(".nav-rewards");
    var btn = root && root.querySelector(".nav-rewards-btn");
    var panel = root && root.querySelector(".nav-rewards-panel");
    var bar = document.querySelector(".nav-rewards-bar");
    var sheet = document.querySelector(".nav-rewards-sheet");

    function closeDesktop() {
      if (!root || !btn) return;
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    function closeMobile() {
      if (!bar || !sheet) return;
      sheet.classList.remove("is-open");
      bar.setAttribute("aria-expanded", "false");
    }

    function closeAll() {
      closeDesktop();
      closeMobile();
    }

    if (btn && root && panel) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeMobile();
        if (root.classList.contains("is-open")) closeDesktop();
        else {
          root.classList.add("is-open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    }

    if (bar && sheet) {
      bar.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeDesktop();
        if (sheet.classList.contains("is-open")) closeMobile();
        else {
          sheet.classList.add("is-open");
          bar.setAttribute("aria-expanded", "true");
        }
      });
    }

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (root && root.contains(t)) return;
      if (bar && bar.contains(t)) return;
      if (sheet && sheet.contains(t)) return;
      closeAll();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeAll();
    });

    // One restrained medallion highlight on first page view this session
    try {
      if (!sessionStorage.getItem(SHINE_KEY)) {
        document.body.classList.add("sparklean-rewards-shine");
        sessionStorage.setItem(SHINE_KEY, "1");
        window.setTimeout(function () {
          document.body.classList.remove("sparklean-rewards-shine");
        }, 1800);
      }
    } catch (err) {
      /* ignore */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
