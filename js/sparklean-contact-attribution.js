/**
 * Contact-page attribution capture.
 * Sets hidden lead fields from the landing URL and persists them so
 * guided-intake URL cleanup cannot drop campaign / membership context.
 */
(function () {
  var STORAGE_KEY = "sparklean_contact_attribution_v1";

  function qsAll(search) {
    try {
      return new URLSearchParams(search || "");
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function readFromLocation() {
    var sp = qsAll(window.location.search);
    return {
      interest: String(sp.get("interest") || "").trim().toLowerCase(),
      landingPage: (window.location.pathname || "/") + (window.location.search || ""),
      utmSource: String(sp.get("utm_source") || "").trim(),
      utmMedium: String(sp.get("utm_medium") || "").trim(),
      utmCampaign: String(sp.get("utm_campaign") || "").trim(),
    };
  }

  function loadStored() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return o && typeof o === "object" ? o : null;
    } catch (e) {
      return null;
    }
  }

  function saveStored(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* private mode */
    }
  }

  function mergeAttribution() {
    var fromUrl = readFromLocation();
    var stored = loadStored() || {};
    var out = {
      interest: fromUrl.interest || stored.interest || "",
      landingPage: "",
      utmSource: fromUrl.utmSource || stored.utmSource || "",
      utmMedium: fromUrl.utmMedium || stored.utmMedium || "",
      utmCampaign: fromUrl.utmCampaign || stored.utmCampaign || "",
    };
    // Prefer the richest landing snapshot (with query) once captured.
    if (fromUrl.landingPage && fromUrl.landingPage.indexOf("?") !== -1) {
      out.landingPage = fromUrl.landingPage;
    } else if (stored.landingPage && String(stored.landingPage).indexOf("?") !== -1) {
      out.landingPage = stored.landingPage;
    } else {
      out.landingPage = fromUrl.landingPage || stored.landingPage || (window.location.pathname || "/");
    }
    return out;
  }

  function setField(id, value) {
    var el = document.getElementById(id);
    if (!el) return false;
    var v = value == null ? "" : String(value);
    el.value = v;
    try {
      el.setAttribute("value", v);
    } catch (e) {
      /* ignore */
    }
    return true;
  }

  function applyInterestUi(interest) {
    var banner = document.getElementById("cp-interest-banner");
    var serviceField = document.getElementById("cf-service");
    if (interest === "inner-circle") {
      if (banner) banner.hidden = false;
      if (serviceField && !String(serviceField.value || "").trim()) {
        serviceField.value = "Sparklean Inner Circle / recurring membership";
        try {
          serviceField.setAttribute("value", serviceField.value);
        } catch (e2) {
          /* ignore */
        }
      }
    }
  }

  function applyToForm() {
    var data = mergeAttribution();
    saveStored(data);
    setField("cf-interest", data.interest);
    setField("cf-landing", data.landingPage);
    setField("cf-utm-source", data.utmSource);
    setField("cf-utm-medium", data.utmMedium);
    setField("cf-utm-campaign", data.utmCampaign);
    applyInterestUi(data.interest);
    return data;
  }

  function snapshotFields() {
    function val(id) {
      var el = document.getElementById(id);
      return el ? String(el.value || "") : "";
    }
    return {
      interest: val("cf-interest"),
      landingPage: val("cf-landing"),
      utmSource: val("cf-utm-source"),
      utmMedium: val("cf-utm-medium"),
      utmCampaign: val("cf-utm-campaign"),
    };
  }

  function boot() {
    // Capture as early as the form exists.
    applyToForm();
    var fm = document.getElementById("sparklean-contact-form");
    if (fm && !fm.getAttribute("data-sparklean-attr-bound")) {
      fm.setAttribute("data-sparklean-attr-bound", "1");
      fm.addEventListener(
        "submit",
        function () {
          applyToForm();
        },
        true
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  window.addEventListener("pageshow", function () {
    applyToForm();
  });

  window.SparkleanContactAttribution = {
    applyToForm: applyToForm,
    snapshotFields: snapshotFields,
    mergeAttribution: mergeAttribution,
    STORAGE_KEY: STORAGE_KEY,
  };
})();
