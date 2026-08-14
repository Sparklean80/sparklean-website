/**
 * Sparklean Google Ads helpers (conversion only — base gtag loads from <head>).
 * Click-id capture lives in sparklean-attribution.js (works when this file is blocked).
 * Browser leave = BROWSER_SENT only when durable conversion-report confirms.
 * Ads Consent Mode: denied → never fire Google conversion; granted/unresolved → may fire.
 */
(function () {
  var SEND_TO = "AW-17027441328/HnWnCJPRt9kcELDFqLc_";
  var STORAGE_KEY = "sparklean_ads_conv_lead_ids";
  var CONTACT_PENDING_KEY = "sparklean_contact_form_pending";

  function attr() {
    return window.SparkleanAttribution || null;
  }

  /**
   * @returns {"denied"|"granted"|"unresolved"}
   */
  function getAdsConsent() {
    try {
      if (window.__sparkleanAdsConsent === "denied" || window.__sparkleanAdsConsent === "granted") {
        return window.__sparkleanAdsConsent;
      }
    } catch (e0) {
      /* ignore */
    }
    var state = "unresolved";
    try {
      var dl = window.dataLayer || [];
      for (var i = 0; i < dl.length; i++) {
        var item = dl[i];
        if (!item) continue;
        // Arguments object from gtag('consent', …) or plain array
        var cmd = item[0] || item.event;
        var action = item[1];
        var params = item[2] || item;
        if (cmd === "consent" && params && typeof params === "object") {
          var ad = params.ad_storage;
          if (ad === "denied") state = "denied";
          else if (ad === "granted") state = "granted";
        }
        if (item.event === "consent" && item.ad_storage) {
          if (item.ad_storage === "denied") state = "denied";
          else if (item.ad_storage === "granted") state = "granted";
        }
        void action;
      }
    } catch (e1) {
      /* ignore */
    }
    return state;
  }

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

  function getStoredAdClickIds() {
    var a = attr();
    if (a && typeof a.getStoredAdClickIds === "function") return a.getStoredAdClickIds();
    return {};
  }

  function makeContactTransactionId() {
    return "contact-" + String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function markContactFormSubmitPending() {
    try {
      var id = makeContactTransactionId();
      sessionStorage.setItem(CONTACT_PENDING_KEY, id);
      return id;
    } catch (e4) {
      return "";
    }
  }

  function tryFireConversion(leadId) {
    if (!leadId || typeof leadId !== "string") return false;
    var id = leadId.trim();
    if (!id) return false;
    if (alreadyFired(id)) return true;
    if (getAdsConsent() === "denied") return false;
    if (typeof gtag !== "function") return false;
    rememberFired(id);
    gtag("event", "conversion", {
      send_to: SEND_TO,
      transaction_id: id,
    });
    return true;
  }

  function trackQuoteRequestCompleted(leadId) {
    if (!leadId || typeof leadId !== "string") return false;
    var id = leadId.trim();
    if (!id) return false;
    if (alreadyFired(id)) return false;
    if (getAdsConsent() === "denied") return false;
    if (tryFireConversion(id)) return true;
    var tries = 0;
    var timer = setInterval(function () {
      tries += 1;
      if (tryFireConversion(id) || tries >= 40) clearInterval(timer);
    }, 50);
    return true;
  }

  function waitForBrowserConversion(leadId) {
    return new Promise(function (resolve) {
      if (!leadId || typeof leadId !== "string" || !leadId.trim()) {
        resolve({ sent: false, failureReason: "missing_lead_id" });
        return;
      }
      var id = leadId.trim();
      if (getAdsConsent() === "denied") {
        resolve({ sent: false, failureReason: "ads_consent_denied" });
        return;
      }
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
        if (getAdsConsent() === "denied") {
          clearInterval(timer);
          resolve({ sent: false, failureReason: "ads_consent_denied" });
          return;
        }
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

  function reportConversionOutcome(opts) {
    var a = attr();
    if (a && typeof a.reportConversionOutcome === "function") {
      return a.reportConversionOutcome(opts);
    }
    // Fallback when attribution.js was not loaded (must not leave Google-fired leads unreported).
    opts = opts || {};
    if (!opts.leadId || !opts.reportToken || !opts.status) {
      return Promise.resolve({ ok: false, error: "missing_fields" });
    }
    return fetch("/.netlify/functions/conversion-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        leadId: opts.leadId,
        reportToken: opts.reportToken,
        status: opts.status,
        failureReason: opts.failureReason || undefined,
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
          return { ok: r.ok && j && j.ok === true, status: r.status, j: j };
        });
      })
      .catch(function () {
        return { ok: false, error: "network" };
      });
  }

  /**
   * Fire gtag then durable-report. Inspects report response —
   * never claims BROWSER_SENT success if conversion-report fails.
   * Consent denied → no Google fire; durable OFFLINE_QUEUED when possible.
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
        }).then(function (rep) {
          if (rep && rep.ok) {
            return { browserSent: true, trackingStatus: "BROWSER_SENT", reportOk: true, delayed: false };
          }
          return {
            browserSent: false,
            trackingStatus: "UNRESOLVED",
            reportOk: false,
            delayed: true,
            failureReason: "durable_report_failed_after_browser_send",
          };
        });
      }
      var status = opts.queueOnFailure === false ? "FAILED" : "OFFLINE_QUEUED";
      var consentDenied = result.failureReason === "ads_consent_denied";
      return reportConversionOutcome({
        leadId: leadId,
        reportToken: reportToken,
        status: status,
        failureReason: result.failureReason || "ads_helper_unavailable",
      }).then(function (rep) {
        if (rep && rep.ok) {
          return {
            browserSent: false,
            trackingStatus: status,
            reportOk: true,
            // Consent denial is an intentional terminal offline queue — not a "delayed" failure.
            delayed: !consentDenied,
            failureReason: result.failureReason,
          };
        }
        return {
          browserSent: false,
          trackingStatus: "UNRESOLVED",
          reportOk: false,
          delayed: true,
          failureReason: "durable_report_failed",
        };
      });
    });
  }

  function showTrackingDelayedMessage(el) {
    var a = attr();
    if (a && typeof a.showTrackingDelayedMessage === "function") {
      a.showTrackingDelayedMessage(el);
      return;
    }
    if (!el) return;
    var note = document.createElement("p");
    note.className = "sparklean-tracking-delayed";
    note.setAttribute("role", "status");
    note.textContent =
      (a && a.TRACKING_DELAYED_MSG) ||
      "Your request was received. Conversion tracking was delayed on this device — our team has been notified. Your lead is preserved.";
    el.appendChild(note);
  }

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
      /* ignore */
    }
    return trackQuoteRequestCompleted(id) ? id : "";
  }

  window.SparkleanAds = {
    SEND_TO: SEND_TO,
    TRACKING_DELAYED_MSG: (attr() && attr().TRACKING_DELAYED_MSG) || "",
    getAdsConsent: getAdsConsent,
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
      getAdsConsent: getAdsConsent,
    },
  };
})();
