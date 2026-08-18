/**
 * Sparklean Rewards — header chip toggle (homepage v1).
 */
(function () {
  function init() {
    var root = document.querySelector(".nav-rewards");
    if (!root) return;
    var btn = root.querySelector(".nav-rewards-btn");
    var panel = root.querySelector(".nav-rewards-panel");
    if (!btn || !panel) return;

    function close() {
      root.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
    }

    function open() {
      root.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }

    function toggle(e) {
      e.preventDefault();
      e.stopPropagation();
      if (root.classList.contains("is-open")) close();
      else open();
    }

    btn.addEventListener("click", toggle);

    document.addEventListener("click", function (e) {
      if (!root.contains(e.target)) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
