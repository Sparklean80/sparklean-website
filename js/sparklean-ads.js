/**
 * Sparklean Google Ads helpers (conversion only — base gtag loads from <head>).
 * Fires "AI Quote Request Completed" once per server leadId.
 */
(function () {
  var SEND_TO = "AW-17027441328/HnWnCJPRt9kcELDFqLc_";
  var STORAGE_KEY = "sparklean_ads_conv_lead_ids";
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

  /**
   * @param {string} leadId server-issued id from quote-submit
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

  persistAdClickIds();

  window.SparkleanAds = {
    SEND_TO: SEND_TO,
    trackQuoteRequestCompleted: trackQuoteRequestCompleted,
    alreadyFired: alreadyFired,
    getStoredAdClickIds: getStoredAdClickIds,
    _test: {
      readFired: readFired,
      rememberFired: rememberFired,
      STORAGE_KEY: STORAGE_KEY,
    },
  };
})();
