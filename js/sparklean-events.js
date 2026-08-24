/**
 * Privacy-safe marketing events (gtag / dataLayer only).
 * Never send names, phones, emails, notes, addresses, or free-text PII.
 */
(function () {
  var ALLOWED = {
    why_sparklean_view: true,
    referral_started: true,
    referral_submitted: true,
    partner_type_selected: true,
    recurring_quote_started: true,
    recurring_quote_submitted: true,
    paid_quote_prompt_shown: true,
    paid_quote_started: true,
    paid_quote_submitted: true,
    quote_started: true,
    quote_submitted: true,
    contact_form_submitted: true,
    phone_click: true,
    email_click: true,
    client_login_click: true,
    membership_interest: true,
    commercial_quote_started: true,
    construction_quote_started: true,
    google_reviews_click: true,
    // Legacy aliases — remapped once in track()
    google_reviews_clicked: true,
  };

  var ALIASES = {
    google_reviews_clicked: "google_reviews_click",
  };

  var ALLOWED_PARAM_KEYS = {
    referral_type: true,
    intake_preset: true,
    service_category: true,
    cadence: true,
    page_path: true,
    city: true,
    cta_location: true,
    form_type: true,
    referral_category: true,
  };

  var ALLOWED_REFERRAL_TYPES = {
    homeowner: true,
    realtor: true,
    builder: true,
    property_manager: true,
    home_watch: true,
    commercial: true,
    interior_designer: true,
  };

  var recent = Object.create(null);

  function sanitizeParams(params) {
    if (!params || typeof params !== "object") return undefined;
    var out = {};
    Object.keys(params).forEach(function (k) {
      if (!ALLOWED_PARAM_KEYS[k]) return;
      var v = params[k];
      if (v == null) return;
      var s = String(v).slice(0, 80);
      if (k === "referral_type" && !ALLOWED_REFERRAL_TYPES[s]) return;
      if (k === "page_path") {
        if (!/^\/[a-zA-Z0-9\/_\-]*$/.test(s)) return;
        out[k] = s;
        return;
      }
      if (!/^[a-zA-Z0-9_\-\/]+$/.test(s)) return;
      out[k] = s;
    });
    return Object.keys(out).length ? out : undefined;
  }

  function dedupeKey(eventName, clean) {
    return eventName + ":" + JSON.stringify(clean || {});
  }

  function track(eventName, params) {
    if (!ALLOWED[eventName]) return false;
    if (ALIASES[eventName]) eventName = ALIASES[eventName];
    if (!ALLOWED[eventName]) return false;
    var clean = sanitizeParams(params);
    if (!clean) {
      clean = { page_path: (location.pathname || "/").slice(0, 80) };
      if (!/^\/[a-zA-Z0-9\/_\-]*$/.test(clean.page_path)) delete clean.page_path;
      if (!Object.keys(clean).length) clean = undefined;
    } else if (!clean.page_path) {
      var path = (location.pathname || "/").slice(0, 80);
      if (/^\/[a-zA-Z0-9\/_\-]*$/.test(path)) clean.page_path = path;
    }
    var key = dedupeKey(eventName, clean);
    var now = Date.now();
    if (recent[key] && now - recent[key] < 2000) return false;
    recent[key] = now;
    try {
      window.dataLayer = window.dataLayer || [];
      var row = { event: eventName };
      if (clean) {
        Object.keys(clean).forEach(function (k) {
          row[k] = clean[k];
        });
      }
      window.dataLayer.push(row);
    } catch (e0) {
      /* ignore */
    }
    try {
      if (typeof gtag === "function") {
        if (clean) gtag("event", eventName, clean);
        else gtag("event", eventName);
      }
    } catch (e1) {
      /* ignore */
    }
    return true;
  }

  function bindDelegates() {
    document.addEventListener(
      "click",
      function (e) {
        var el = e.target.closest("[data-sparklean-event]");
        if (el) {
          var name = (el.getAttribute("data-sparklean-event") || "").trim();
          var type = (el.getAttribute("data-sparklean-event-type") || "").trim();
          var cta = (el.getAttribute("data-sparklean-event-cta") || "").trim();
          var params = {};
          if (type) params.referral_type = type;
          if (cta) params.cta_location = cta;
          track(name, params);
        }
        var reviews = e.target.closest(
          "a.rev-google-proof, a.hero-google-proof, .rev-google-cta a, a[href*='google.com/maps'][href*='Sparklean']"
        );
        if (reviews && !reviews.hasAttribute("data-sparklean-event")) {
          track("google_reviews_click", { cta_location: "link" });
        }
        var tel = e.target.closest('a[href^="tel:"]');
        if (tel && !tel.hasAttribute("data-sparklean-event")) {
          track("phone_click", { cta_location: "link" });
        }
        var mail = e.target.closest('a[href^="mailto:"]');
        if (mail && !mail.hasAttribute("data-sparklean-event")) {
          track("email_click", { cta_location: "link" });
        }
        var login = e.target.closest('a[href="/customer-portal"], a[href*="/customer-portal"]');
        if (login && !login.hasAttribute("data-sparklean-event")) {
          track("client_login_click", { cta_location: "link" });
        }
      },
      true
    );
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindDelegates);
  else bindDelegates();

  window.SparkleanEvents = {
    track: track,
    ALLOWED: ALLOWED,
    _test: {
      sanitizeParams: sanitizeParams,
      dedupeKey: dedupeKey,
      resetDedupe: function () {
        recent = Object.create(null);
      },
    },
  };
})();
