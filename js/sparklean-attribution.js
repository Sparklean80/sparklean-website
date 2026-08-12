/**
 * First-party attribution + conversion-report client (independent of sparklean-ads.js / gtag).
 * Preserves gclid/gbraid/wbraid even when Google tags or SparkleanAds are blocked.
 */
(function () {
  var ATTR_KEYS = ["gclid", "gbraid", "wbraid"];
  var TRACKING_DELAYED_MSG =
    "Your request was received. Conversion tracking was delayed on this device — our team has been notified. Your lead is preserved.";

  function persistAdClickIds() {
    try {
      var p = new URLSearchParams(window.location.search);
      for (var i = 0; i < ATTR_KEYS.length; i++) {
        var k = ATTR_KEYS[i];
        var v = p.get(k);
        if (v) sessionStorage.setItem("sparklean_" + k, String(v).slice(0, 200));
      }
    } catch (e) {
      /* private mode */
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
    } catch (e2) {
      /* ignore */
    }
    return o;
  }

  function showTrackingDelayedMessage(el) {
    if (!el) return;
    if (el.querySelector && el.querySelector(".sparklean-tracking-delayed")) return;
    var note = document.createElement("p");
    note.className = "sparklean-tracking-delayed";
    note.setAttribute("role", "status");
    note.textContent = TRACKING_DELAYED_MSG;
    el.appendChild(note);
  }

  /**
   * Direct POST to conversion-report — does not require SparkleanAds / gtag.
   * @returns {Promise<{ ok: boolean, status?: number, j?: object, error?: string }>}
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
      credentials: "same-origin",
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
          return { ok: r.ok && j && j.ok === true, status: r.status, j: j };
        });
      })
      .catch(function () {
        return { ok: false, error: "network" };
      });
  }

  /**
   * When Ads helper is missing: queue offline via conversion-report directly.
   * @returns {Promise<{ browserSent: boolean, trackingStatus: string, reportOk: boolean, delayed: boolean }>}
   */
  function reportOfflineWhenAdsBlocked(opts) {
    opts = opts || {};
    return reportConversionOutcome({
      leadId: opts.leadId,
      reportToken: opts.reportToken,
      status: "OFFLINE_QUEUED",
      failureReason: opts.failureReason || "sparklean_ads_unavailable",
    }).then(function (rep) {
      return {
        browserSent: false,
        trackingStatus: rep.ok ? "OFFLINE_QUEUED" : "UNRESOLVED",
        reportOk: Boolean(rep.ok),
        delayed: true,
        failureReason: rep.ok ? opts.failureReason || "sparklean_ads_unavailable" : "report_failed",
      };
    });
  }

  persistAdClickIds();

  window.SparkleanAttribution = {
    ATTR_KEYS: ATTR_KEYS,
    TRACKING_DELAYED_MSG: TRACKING_DELAYED_MSG,
    persistAdClickIds: persistAdClickIds,
    getStoredAdClickIds: getStoredAdClickIds,
    showTrackingDelayedMessage: showTrackingDelayedMessage,
    reportConversionOutcome: reportConversionOutcome,
    reportOfflineWhenAdsBlocked: reportOfflineWhenAdsBlocked,
  };
})();
