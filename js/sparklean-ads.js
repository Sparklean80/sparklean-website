/**
 * Sparklean Google Ads helpers (conversion only — base gtag loads from <head>).
 * Fires "AI Quote Request Completed" (AW-17027441328/HnWnCJPRt9kcELDFqLc_) once per
 * unique transaction_id — used for guided intake (server leadId) and Netlify contact
 * form success (client pending id, only after a real submit → ?sent=1).
 */
(function () {
  var SEND_TO = "AW-17027441328/HnWnCJPRt9kcELDFqLc_";
  var STORAGE_KEY = "sparklean_ads_conv_lead_ids";
  var CONTACT_PENDING_KEY = "sparklean_contact_form_pending";
  var ATTR_KEYS = ["gclid", "gbraid", "wbraid"];

  function readFired() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function alreadyFired(leadId) {
    return readFired().indexOf(leadId) !== -1;
  }

  function rememberFired(leadId) {
    try {
      var arr = readFired();
      if (arr.indexOf(leadId) === -1) {
        arr.push(leadId);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      }
    } catch (e) {
      /* private mode */
    }
  }

  function persistAdClickIds() {
    try {
      var p = new URLSearchParams(window.location.search);
      for (var i = 0; i < ATTR_KEYS.length; i++) {
        var k = ATTR_KEYS[i];
        var v = p.get(k);
        if (v) sessionStorage.setItem("sparklean_" + k, String(v).slice(0, 200));
      }
    } catch (e2) {
      /* ignore */
    }
  }

  function getStoredAdClickIds() {
    var o = {};
    try {
      for (var i = 0; i < ATTR_KEYS.length; i++) {
        var k = ATTR_KEYS[i];
        var v = sessionStorage.getItem("sparklean_" + k);
        if (v) o[k] = v;
      }
    } catch (e3) {
      /* ignore */
    }
    return o;
  }

  function makeContactTransactionId() {
    return (
      "contact-" +
      String(Date.now()) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /**
   * Mark that a Netlify contact submit is in flight. Conversion on ?sent=1 only
   * proceeds when this pending id is present (blocks direct-URL / refresh abuse).
   */
  function markContactFormSubmitPending() {
    try {
      var id = makeContactTransactionId();
      sessionStorage.setItem(CONTACT_PENDING_KEY, id);
      return id;
    } catch (e4) {
      return "";
    }
  }

  /**
   * @param {string} leadId server-issued id from quote-submit, or contact-* pending id
   * @returns {boolean} true if conversion was sent or successfully queued
   */
  function trackQuoteRequestCompleted(leadId) {
    if (!leadId || typeof leadId !== "string") return false;
    var id = leadId.trim();
    if (!id) return false;
    if (alreadyFired(id)) return false;

    function fire() {
      if (alreadyFired(id)) return true;
      if (typeof gtag !== "function") return false;
      rememberFired(id);
      gtag("event", "conversion", {
        send_to: SEND_TO,
        transaction_id: id,
      });
      return true;
    }

    if (fire()) return true;

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (fire() || tries >= 40) clearInterval(timer);
    }, 50);
    return true;
  }

  /**
   * Consume pending contact submit and fire Ads conversion once.
   * @returns {string} transaction_id if fired / queued, else ""
   */
  function trackContactFormAccepted() {
    var id = "";
    try {
      id = sessionStorage.getItem(CONTACT_PENDING_KEY) || "";
    } catch (e5) {
      id = "";
    }
    if (!id) return "";
    try {
      sessionStorage.removeItem(CONTACT_PENDING_KEY);
    } catch (e6) {
      /* still fire once even if pending clear fails */
    }
    return trackQuoteRequestCompleted(id) ? id : "";
  }

  persistAdClickIds();

  window.SparkleanAds = {
    SEND_TO: SEND_TO,
    trackQuoteRequestCompleted: trackQuoteRequestCompleted,
    markContactFormSubmitPending: markContactFormSubmitPending,
    trackContactFormAccepted: trackContactFormAccepted,
    alreadyFired: alreadyFired,
    getStoredAdClickIds: getStoredAdClickIds,
    _test: {
      readFired: readFired,
      rememberFired: rememberFired,
      STORAGE_KEY: STORAGE_KEY,
      CONTACT_PENDING_KEY: CONTACT_PENDING_KEY,
      makeContactTransactionId: makeContactTransactionId,
    },
  };
})();
