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
    google_reviews_clicked: true,
    paid_quote_prompt_shown: true,
    paid_quote_started: true,
    paid_quote_submitted: true,
    phone_click: true,
  };

  var ALLOWED_PARAM_KEYS = {
    referral_type: true,
    intake_preset: true,
    service_category: true,
    cadence: true,
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

  function sanitizeParams(params) {
    if (!params || typeof params !== "object") return undefined;
    var out = {};
    Object.keys(params).forEach(function (k) {
      if (!ALLOWED_PARAM_KEYS[k]) return;
      var v = params[k];
      if (v == null) return;
      var s = String(v).slice(0, 40);
      if (k === "referral_type" && !ALLOWED_REFERRAL_TYPES[s]) return;
      if (!/^[a-zA-Z0-9_\-]+$/.test(s)) return;
      out[k] = s;
    });
    return Object.keys(out).length ? out : undefined;
  }

  function track(eventName, params) {
    if (!ALLOWED[eventName]) return false;
    var clean = sanitizeParams(params);
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
          var params = {};
          if (type) params.referral_type = type;
          track(name, params);
        }
        var a = e.target.closest("a.rev-google-proof, a.hero-google-proof, .rev-google-cta a");
        if (a) track("google_reviews_clicked");
        // Analytics only — never a Google Ads lead conversion.
        var tel = e.target.closest('a[href^="tel:"]');
        if (tel && !tel.hasAttribute("data-sparklean-event")) {
          track("phone_click");
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
    _test: { sanitizeParams: sanitizeParams },
  };
})();
