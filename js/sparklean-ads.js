/**
 * Sparklean Google Ads helpers (conversion only — base gtag loads from <head>).
 * Fires "AI Quote Request Completed" (AW-17027441328/HnWnCJPRt9kcELDFqLc_) once per
 * unique transaction_id after server lead accept. Browser leave = BROWSER_SENT only
 * (never "Google confirmed"). Helper missing → OFFLINE_QUEUED via conversion-report.
 */
(function () {
  var SEND_TO = "AW-17027441328/HnWnCJPRt9kcELDFqLc_";
  var STORAGE_KEY = "sparklean_ads_conv_lead_ids";
  var CONTACT_PENDING_KEY = "sparklean_contact_form_pending";
  var ATTR_KEYS = ["gclid", "gbraid", "wbraid"];
  var TRACKING_DELAYED_MSG =
    "Your request was received. Conversion tracking was delayed on this device — our team has been notified. Your lead is preserved.";

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

  /** @deprecated Prefer server leadId from contact-submit; kept for legacy ?sent=1 bookmark UX. */
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
   * Attempt to fire conversion immediately if gtag is ready.
   * @returns {boolean} true if gtag conversion event was invoked
   */
  function tryFireConversion(leadId) {
    if (!leadId || typeof leadId !== "string") return false;
    var id = leadId.trim();
    if (!id) return false;
    if (alreadyFired(id)) return true;
    if (typeof gtag !== "function") return false;
    rememberFired(id);
    gtag("event", "conversion", {
      send_to: SEND_TO,
      transaction_id: id,
    });
    return true;
  }

  /**
   * @param {string} leadId server-issued id
   * @returns {boolean} true if conversion was sent or successfully queued for retry window
   * Legacy sync API: returns true when fire starts; use fireAndReportConversion for truthful outcomes.
   */
  function trackQuoteRequestCompleted(leadId) {
    if (!leadId || typeof leadId !== "string") return false;
    var id = leadId.trim();
    if (!id) return false;
    if (alreadyFired(id)) return false;

    if (tryFireConversion(id)) return true;

    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (tryFireConversion(id) || tries >= 40) clearInterval(timer);
    }, 50);
    return true;
  }

  /**
   * Wait up to ~2s for gtag; resolve { sent: boolean, failureReason?: string }.
   * Does not claim Google confirmation — only that the browser invoked gtag.
   */
  function waitForBrowserConversion(leadId) {
    return new Promise(function (resolve) {
      if (!leadId || typeof leadId !== "string" || !leadId.trim()) {
        resolve({ sent: false, failureReason: "missing_lead_id" });
        return;
      }
      var id = leadId.trim();
      if (alreadyFired(id)) {
        resolve({ sent: true, already: true });
        return;
      }
      if (tryFireConversion(id)) {
        resolve({ sent: true });
        return;
      }
      var tries = 0;
      var timer = setInterval(function () {
        tries += 1;
        if (tryFireConversion(id)) {
          clearInterval(timer);
          resolve({ sent: true });
          return;
        }
        if (tries >= 40) {
          clearInterval(timer);
          resolve({
            sent: false,
            failureReason: typeof gtag !== "function" ? "gtag_unavailable" : "conversion_fire_failed",
          });
        }
      }, 50);
    });
  }

  /**
   * POST outcome to conversion-report (auth via reportToken on Blob).
   */
  function reportConversionOutcome(opts) {
    opts = opts || {};
    var leadId = opts.leadId;
    var reportToken = opts.reportToken;
    var status = opts.status;
    var failureReason = opts.failureReason;
    if (!leadId || !reportToken || !status) {
      return Promise.resolve({ ok: false, error: "missing_fields" });
    }
    return fetch("/.netlify/functions/conversion-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: leadId,
        reportToken: reportToken,
        status: status,
        failureReason: failureReason || undefined,
      }),
    })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = {};
          try {
            j = t ? JSON.parse(t) : {};
          } catch (e) {
            j = {};
          }
          return { ok: r.ok, status: r.status, j: j };
        });
      })
      .catch(function () {
        return { ok: false, error: "network" };
      });
  }

  /**
   * Fire conversion then report BROWSER_SENT, or OFFLINE_QUEUED / FAILED if helper blocked.
   * @returns {Promise<{ browserSent: boolean, trackingStatus: string }>}
   */
  function fireAndReportConversion(opts) {
    opts = opts || {};
    var leadId = opts.leadId;
    var reportToken = opts.reportToken;
    return waitForBrowserConversion(leadId).then(function (result) {
      if (result.sent) {
        return reportConversionOutcome({
          leadId: leadId,
          reportToken: reportToken,
          status: "BROWSER_SENT",
        }).then(function () {
          return { browserSent: true, trackingStatus: "BROWSER_SENT" };
        });
      }
      var status = opts.queueOnFailure === false ? "FAILED" : "OFFLINE_QUEUED";
      return reportConversionOutcome({
        leadId: leadId,
        reportToken: reportToken,
        status: status,
        failureReason: result.failureReason || "ads_helper_unavailable",
      }).then(function () {
        return { browserSent: false, trackingStatus: status, failureReason: result.failureReason };
      });
    });
  }

  function showTrackingDelayedMessage(el) {
    if (!el) return;
    var note = document.createElement("p");
    note.className = "sparklean-tracking-delayed";
    note.setAttribute("role", "status");
    note.textContent = TRACKING_DELAYED_MSG;
    el.appendChild(note);
  }

  /**
   * @deprecated Prefer contact-submit + fireAndReportConversion.
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
    TRACKING_DELAYED_MSG: TRACKING_DELAYED_MSG,
    trackQuoteRequestCompleted: trackQuoteRequestCompleted,
    waitForBrowserConversion: waitForBrowserConversion,
    reportConversionOutcome: reportConversionOutcome,
    fireAndReportConversion: fireAndReportConversion,
    showTrackingDelayedMessage: showTrackingDelayedMessage,
    markContactFormSubmitPending: markContactFormSubmitPending,
    trackContactFormAccepted: trackContactFormAccepted,
    alreadyFired: alreadyFired,
    getStoredAdClickIds: getStoredAdClickIds,
    _test: {
      readFired: readFired,
      rememberFired: rememberFired,
      tryFireConversion: tryFireConversion,
      STORAGE_KEY: STORAGE_KEY,
      CONTACT_PENDING_KEY: CONTACT_PENDING_KEY,
      makeContactTransactionId: makeContactTransactionId,
    },
  };
})();
