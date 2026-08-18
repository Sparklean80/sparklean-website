/**
 * Sitewide header — rewards top bar, dropdowns, scroll state.
 */
(function () {
  function init() {
    var header = document.getElementById("site-header");
    if (!header) return;

    document.body.classList.add("site-header-v2");

    var topbar = header.querySelector(".rewards-topbar");
    var dropdowns = header.querySelectorAll(".nav-dd");
    var scrollTicking = false;
    var root = document.documentElement;

    function syncHeaderHeight() {
      var h = header.offsetHeight || 0;
      if (h > 0) {
        root.style.setProperty("--header-total", h + "px");
        /* Keep legacy page paddings (calc(var(--nav-h)+…)) aligned with measured chrome. */
        root.style.setProperty("--nav-h", h + "px");
        document.body.style.setProperty("--nav-h", h + "px");
        document.body.style.setProperty("--header-total", h + "px");
      }
    }

    function closeRewards() {
      header.classList.remove("rewards-open");
      if (topbar) topbar.setAttribute("aria-expanded", "false");
    }

    function openRewards() {
      closeDropdowns();
      header.classList.add("rewards-open");
      if (topbar) topbar.setAttribute("aria-expanded", "true");
    }

    function toggleRewards(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (header.classList.contains("rewards-open")) closeRewards();
      else openRewards();
    }

    function closeDropdowns() {
      dropdowns.forEach(function (dd) {
        dd.classList.remove("is-open");
        var t = dd.querySelector(".nav-dd-toggle");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }

    if (topbar) {
      topbar.addEventListener("click", function (e) {
        toggleRewards(e);
      });
    }

    dropdowns.forEach(function (dd) {
      var toggle = dd.querySelector(".nav-dd-toggle");
      var menu = dd.querySelector(".nav-dd-menu");
      if (!toggle || !menu) return;

      function openMenu() {
        closeDropdowns();
        closeRewards();
        dd.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
      }

      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (dd.classList.contains("is-open")) {
          closeDropdowns();
        } else {
          openMenu();
        }
      });

      toggle.addEventListener("keydown", function (e) {
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!dd.classList.contains("is-open")) openMenu();
          var first = menu.querySelector("a");
          if (first) first.focus();
        }
      });

      var links = menu.querySelectorAll("a");
      links.forEach(function (link, idx) {
        link.addEventListener("keydown", function (e) {
          if (e.key === "Escape") {
            e.preventDefault();
            closeDropdowns();
            toggle.focus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            var next = links[idx + 1] || links[0];
            next.focus();
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (idx === 0) {
              toggle.focus();
            } else {
              links[idx - 1].focus();
            }
          }
        });
      });
    });

    document.addEventListener("click", function (e) {
      if (!header.contains(e.target)) {
        closeRewards();
        closeDropdowns();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeRewards();
        closeDropdowns();
      }
    });

    var hb = document.getElementById("hamburger");
    var mm = document.getElementById("mobileMenu");
    if (hb && mm) {
      hb.addEventListener("click", function () {
        var open = mm.classList.contains("open");
        hb.setAttribute("aria-expanded", open ? "true" : "false");
        if (open) {
          closeRewards();
          closeDropdowns();
        }
        /* Blog articles use [hidden]; keep in sync with .open */
        if (mm.hasAttribute("hidden")) {
          if (open) mm.removeAttribute("hidden");
        }
        syncHeaderHeight();
      });
    }

    function onScroll() {
      if (scrollTicking) return;
      scrollTicking = true;
      window.requestAnimationFrame(function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (y > 24) header.classList.add("is-scrolled");
        else header.classList.remove("is-scrolled");
        syncHeaderHeight();
        scrollTicking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", syncHeaderHeight);
    onScroll();
    syncHeaderHeight();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
