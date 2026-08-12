/**
 * Sparklean — guided concierge intake (single overlay, sitewide).
 * Deterministic steps only; no client-side model, no freeform chat.
 * Depends on: /js/serviceFlows.js (window.SparkleanQuoteFlows)
 *
 * Paid mode (?quote=1 | gclid | paid UTMs | stored click ids): minimum viable
 * lead only (name, phone, email, location, service) — no property expansion.
 *
 * Triggers:
 * - ?quote=1 → may open intake immediately (explicit).
 * - gclid / gbraid / wbraid / paid UTM → soft concierge prompt after 10s OR
 *   35% scroll (never auto-open full-screen). Hero/nav/sticky still open now.
 * - Organic → click-triggered only.
 */
(function () {
  /** First-party click-id capture (works even if sparklean-ads.js is blocked). */
  (function persistClickIds() {
    try {
      if (window.SparkleanAttribution && typeof window.SparkleanAttribution.persistAdClickIds === "function") {
        window.SparkleanAttribution.persistAdClickIds();
        return;
      }
      var keys = ["gclid", "gbraid", "wbraid"];
      var p = new URLSearchParams(window.location.search);
      for (var i = 0; i < keys.length; i++) {
        var v = p.get(keys[i]);
        if (v) sessionStorage.setItem("sparklean_" + keys[i], String(v).slice(0, 200));
      }
    } catch (ePersist) {
      /* ignore */
    }
  })();

  var F = null;
  var root = null;
  var steps = [];
  var stepIndex = 0;
  var answers = {};
  var sourceUrl = "";
  var submitting = false;
  /** When set (e.g. "innerCircle"), skips generic "which service" branching and uses a dedicated flow. */
  var intakePreset = null;
  /** Paid Ads / quote=1 short path — submit after contact + service. */
  var paidMode = false;
  var leadDelivered = false;
  var trackingDelayed = false;
  var INTAKE_CHROME_DEFAULT = {
    eyebrow: "Service request",
    title: "A few brief questions",
    intro:
      "One question at a time. Pricing is not reviewed here; a Sparklean team member will reach out to you directly.",
  };
  var INTAKE_CHROME_PAID = {
    eyebrow: "Quick quote request",
    title: "Five brief questions",
    intro:
      "Share your contact details and the service you need. A Sparklean team member will follow up shortly — no pricing calculator on this page.",
  };
  var INTAKE_CHROME_INNER_CIRCLE = {
    eyebrow: "Inner Circle",
    title: "Membership consideration",
    intro:
      "A brief private intake so our team can review fit, continuity, and availability—this is not the public quote calculator.",
  };
  var INTAKE_CHROME_REFERRAL = {
    eyebrow: "Referral",
    title: "Introduce someone to Sparklean",
    intro:
      "A short introduction form. Referral details are used only for follow-up—they are not published or sent to advertising analytics.",
  };
  var INTAKE_CHROME_RECURRING = {
    eyebrow: "Recurring residential care",
    title: "Start with a personalized first visit",
    intro:
      "Tell us about the home and preferred cadence. Most clients continue weekly, biweekly, or monthly with supervised recurring care.",
  };
  var INTAKE_FAILURE_MSG =
    "We're having trouble submitting your request right now. Please call Sparklean directly at (239) 888-3588.";
  var referralTypePrefill = "";
  var PAID_UTM_MEDIUMS = /^(cpc|ppc|paid|paidsearch|display|cpm|cpa|ads|ad)$/i;
  var PROMPT_DELAY_MS = 10000;
  var PROMPT_SCROLL_RATIO = 0.35;
  var softPromptEl = null;
  var softPromptTimer = null;
  var softPromptBound = false;
  var softPromptShown = false;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readQuery() {
    try {
      return new URLSearchParams(window.location.search || "");
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function hasStoredAdClickIds() {
    try {
      if (window.SparkleanAttribution && typeof window.SparkleanAttribution.getStoredAdClickIds === "function") {
        var s = window.SparkleanAttribution.getStoredAdClickIds() || {};
        return !!(s.gclid || s.gbraid || s.wbraid);
      }
      if (window.SparkleanAds && typeof window.SparkleanAds.getStoredAdClickIds === "function") {
        var sAds = window.SparkleanAds.getStoredAdClickIds() || {};
        return !!(sAds.gclid || sAds.gbraid || sAds.wbraid);
      }
    } catch (e0) {
      /* ignore */
    }
    return false;
  }

  function parseSearch(search) {
    try {
      return search != null ? new URLSearchParams(search) : readQuery();
    } catch (e1) {
      return new URLSearchParams();
    }
  }

  /** Explicit instruction — may open intake immediately. */
  function isForcedQuoteQuery(search) {
    return parseSearch(search).get("quote") === "1";
  }

  /** Paid click / campaign params that keep paid mode but must not auto-open. */
  function isSoftPaidLandingQuery(search) {
    var p = parseSearch(search);
    if (p.get("gclid") || p.get("gbraid") || p.get("wbraid")) return true;
    var medium = String(p.get("utm_medium") || "").trim();
    if (medium && PAID_UTM_MEDIUMS.test(medium)) return true;
    var source = String(p.get("utm_source") || "").trim().toLowerCase();
    // Explicit ad-network sources only (not bare utm_source=google + organic).
    if (source === "googleads" || source === "adwords") return true;
    return false;
  }

  /** True when URL carries any paid / forced-quote signal (mode, not trigger). */
  function isPaidLandingQuery(search) {
    return isForcedQuoteQuery(search) || isSoftPaidLandingQuery(search);
  }

  /** Short paid flow for Ads visitors (URL paid params or stored click ids). */
  function shouldUsePaidMode(opts) {
    if (opts && opts.paid === true) return true;
    if (opts && opts.paid === false) return false;
    if (isPaidLandingQuery()) return true;
    return hasStoredAdClickIds();
  }

  function softPromptStorageKey() {
    return "sparklean_paid_soft_prompt:" + window.location.pathname + window.location.search;
  }

  function forceOpenStorageKey() {
    return "sparklean_paid_force_open:" + window.location.pathname + window.location.search;
  }

  function getSoftPromptState() {
    try {
      return sessionStorage.getItem(softPromptStorageKey()) || "";
    } catch (e2) {
      return softPromptShown ? "shown" : "";
    }
  }

  function setSoftPromptState(state) {
    try {
      sessionStorage.setItem(softPromptStorageKey(), state);
    } catch (e3) {
      /* ignore */
    }
    if (state === "shown" || state === "dismissed" || state === "opened") {
      softPromptShown = true;
    }
  }

  function softPromptBlocked() {
    var s = getSoftPromptState();
    return s === "dismissed" || s === "opened" || s === "shown";
  }

  function shouldInterceptAnchor(a) {
    if (!a || a.tagName !== "A") return false;
    if (a.hasAttribute("data-sparklean-intake")) return true;
    if ((a.getAttribute("data-sparklean-intake-preset") || "").trim()) return true;
    if (a.hasAttribute("data-sparklean-intake-skip")) return false;
    if (a.classList.contains("sparklean-no-intake")) return false;
    var href = (a.getAttribute("href") || "").trim();
    var txt = (a.textContent || "").trim();
    var tLower = txt.toLowerCase();
    if (href === "#quote") {
      if (/view all services/i.test(txt)) return false;
      return true;
    }
    if (href !== "/contact") return false;
    if (tLower === "contact") return false;
    if (/contact estimating|estimating team|message estimating|contact scheduling|reach us directly/i.test(txt))
      return false;
    if (a.classList.contains("nav-btn")) return true;
    if (a.classList.contains("btn-gold")) return true;
    if (a.classList.contains("btn-outline") && /quote|estimate/i.test(tLower)) return true;
    if (a.classList.contains("founder-soft-cta")) return true;
    if (
      /quote|estimate|personalized|schedule|set up|join|construction|commercial quote|discuss add-ons|window cleaning quote/i.test(
        tLower
      )
    )
      return true;
    if (tLower === "get a quote" || tLower === "get quote") return true;
    return false;
  }

  function bindGlobalClicks() {
    document.addEventListener(
      "click",
      function (e) {
        var a = e.target.closest("a");
        if (!shouldInterceptAnchor(a)) return;
        e.preventDefault();
        var pr = (a.getAttribute("data-sparklean-intake-preset") || "").trim();
        var rType = (a.getAttribute("data-sparklean-referral-type") || "").trim();
        open({
          sourceUrl: window.location.href,
          preset: pr || null,
          referralType: rType || null,
        });
      },
      true
    );
  }

  function ensureFlows() {
    F = window.SparkleanQuoteFlows;
    if (!F || !F.flows || !F.flows.universal) {
      console.warn("SparkleanQuoteFlows missing — load serviceFlows.js first.");
      return false;
    }
    return true;
  }

  function currentQuestion() {
    return steps[stepIndex] || null;
  }

  function applySkipsForward() {
    var guard = 0;
    while (currentQuestion() && currentQuestion().skipIf && currentQuestion().skipIf(answers)) {
      stepIndex++;
      if (++guard > 200) break;
    }
  }

  /** Count remaining steps that will actually be shown (skipIf-aware). */
  function visibleStepCountFrom(startIdx, ans) {
    var a = Object.assign({}, ans || answers);
    var count = 0;
    for (var i = startIdx; i < steps.length; i++) {
      var q = steps[i];
      if (!q) continue;
      if (q.skipIf && q.skipIf(a)) continue;
      count++;
    }
    return count;
  }

  function totalVisibleSteps() {
    return visibleStepCountFrom(0, answers);
  }

  function visibleStepNumber() {
    var n = 0;
    for (var i = 0; i <= stepIndex && i < steps.length; i++) {
      var q = steps[i];
      if (!q) continue;
      if (q.skipIf && q.skipIf(answers)) continue;
      n++;
    }
    return Math.max(1, n);
  }

  /** Organic universal flow expands after serviceCategory — never claim final step before then. */
  function willExpandAfterServiceCategory() {
    if (paidMode) return false;
    if (intakePreset === "referral" || intakePreset === "innerCircle") return false;
    if (intakePreset === "recurringResidential") return false;
    var q = currentQuestion();
    return !!(q && q.id === "serviceCategory");
  }

  function isFinalMandatoryStep() {
    if (willExpandAfterServiceCategory()) return false;
    if (paidMode) {
      var q = currentQuestion();
      return !!(q && q.id === "serviceCategory");
    }
    return visibleStepCountFrom(stepIndex + 1, answers) === 0;
  }

  function render() {
    if (!root) return;
    var q = currentQuestion();
    var elStep = root.querySelector("[data-intake-step]");
    var elProg = root.querySelector("[data-intake-progress]");
    var elErr = root.querySelector("[data-intake-error]");
    elErr.textContent = "";
    if (!q || stepIndex >= steps.length) {
      var doneText =
        intakePreset === "innerCircle"
          ? "Thank you. A member of our private-client team will contact you soon to discuss membership fit, cadence, and availability."
          : intakePreset === "referral"
            ? "Thank you. Your introduction has been received. A Sparklean team member will follow up with the referred contact and keep you informed as appropriate."
            : "Thank you. Your request has been received and a Sparklean team member will contact you shortly to discuss the best service approach for your property.";
      elStep.innerHTML =
        '<p class="sq-intake__done">' +
        esc(doneText) +
        "</p>" +
        (trackingDelayed
          ? '<p class="sq-intake__done sparklean-tracking-delayed" role="status">' +
            esc(
              (window.SparkleanAttribution && window.SparkleanAttribution.TRACKING_DELAYED_MSG) ||
                (window.SparkleanAds && window.SparkleanAds.TRACKING_DELAYED_MSG) ||
                "Your request was received. Conversion tracking was delayed on this device — our team has been notified. Your lead is preserved."
            ) +
            "</p>"
          : "") +
        '<p class="sq-intake__done-call">' +
        '<a class="sq-intake__done-call-link" href="tel:+12398883588" data-sparklean-event="phone_click">' +
        "Call Sparklean · (239) 888-3588</a></p>";
      var doneBar = root.querySelector("[data-intake-progress-bar]");
      if (doneBar) doneBar.style.width = "100%";
      elProg.textContent = "Complete";
      root.querySelector("[data-intake-back]").style.display = "none";
      root.querySelector("[data-intake-next]").textContent = "Close";
      root.querySelector("[data-intake-next]").setAttribute("data-intake-done", "1");
      return;
    }

    var nextBtn = root.querySelector("[data-intake-next]");
    var finalStep = isFinalMandatoryStep();
    var bar = root.querySelector("[data-intake-progress-bar]");

    if (willExpandAfterServiceCategory()) {
      // Honest progress: more questions follow after service selection.
      elProg.textContent = "Step " + visibleStepNumber();
      if (bar) bar.style.width = Math.min(90, Math.round((visibleStepNumber() / 6) * 100)) + "%";
      nextBtn.textContent = "Continue";
    } else {
      var total = totalVisibleSteps();
      var cur = visibleStepNumber();
      var pct = total ? Math.round((cur / total) * 100) : 0;
      if (bar) bar.style.width = pct + "%";
      elProg.textContent = "Step " + cur + " of " + total;
      nextBtn.textContent = finalStep ? "Send request" : "Continue";
    }
    nextBtn.removeAttribute("data-intake-done");

    var html = "";
    html += '<h2 class="sq-intake__q" id="sq-intake-qh">' + esc(q.label) + "</h2>";
    if (q.assist) html += '<p class="sq-intake__assist">' + esc(q.assist) + "</p>";

    if (q.type === "select" && q.options) {
      html += '<div class="sq-intake__opts" role="group" aria-labelledby="sq-intake-qh">';
      for (var i = 0; i < q.options.length; i++) {
        var o = q.options[i];
        var sel = answers[q.id] === o.value ? " is-selected" : "";
        html +=
          '<button type="button" class="sq-intake__opt' +
          sel +
          '" data-value="' +
          esc(o.value) +
          '">' +
          esc(o.label) +
          "</button>";
      }
      html += "</div>";
    } else if (q.type === "textarea") {
      html +=
        '<textarea class="sq-intake__input sq-intake__textarea" rows="4" maxlength="' +
        (q.maxLength || 2000) +
        '" data-field="' +
        esc(q.id) +
        '" placeholder="' +
        esc(q.placeholder || "") +
        '">' +
        esc(answers[q.id] || "") +
        "</textarea>";
    } else {
      html +=
        '<input class="sq-intake__input" type="' +
        esc(q.type) +
        '" maxlength="' +
        (q.maxLength || 200) +
        '" data-field="' +
        esc(q.id) +
        '" placeholder="' +
        esc(q.placeholder || "") +
        '" value="' +
        esc(answers[q.id] || "") +
        '"/>';
    }
    elStep.innerHTML = html;
    root.querySelector("[data-intake-back]").style.display = stepIndex > 0 ? "" : "none";

    if (q.type === "select") {
      elStep.querySelectorAll(".sq-intake__opt").forEach(function (btn) {
        btn.addEventListener("click", function () {
          elStep.querySelectorAll(".sq-intake__opt").forEach(function (b) {
            b.classList.remove("is-selected");
          });
          btn.classList.add("is-selected");
          answers[q.id] = btn.getAttribute("data-value");
        });
      });
    }
  }

  function validateCurrent() {
    var q = currentQuestion();
    if (!q) return true;
    if (q.type === "select") {
      if (q.required && (answers[q.id] == null || answers[q.id] === "")) return false;
      return true;
    }
    var inp = root.querySelector("[data-field]");
    if (!inp) return true;
    var v = inp.value.trim();
    if (q.required && !v) return false;
    if (q.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return false;
    if (q.type === "tel" && v && v.replace(/\D/g, "").length < 10) return false;
    answers[q.id] = v;
    return true;
  }

  function referralContactOk() {
    var hasReferrer =
      (answers.phone && String(answers.phone).replace(/\D/g, "").length >= 10) ||
      (answers.email && /@/.test(String(answers.email)));
    var hasReferred =
      (answers.referredPhone && String(answers.referredPhone).replace(/\D/g, "").length >= 10) ||
      (answers.referredEmail && /@/.test(String(answers.referredEmail)));
    return { hasReferrer: !!hasReferrer, hasReferred: !!hasReferred };
  }

  function advance() {
    if (!validateCurrent()) {
      root.querySelector("[data-intake-error]").textContent = "Please complete this item before continuing.";
      return;
    }
    var q = currentQuestion();
    if (intakePreset === "referral") {
      if (q && q.id === "email") {
        var rc = referralContactOk();
        if (!rc.hasReferrer) {
          root.querySelector("[data-intake-error]").textContent =
            "Please provide your phone or email so we can confirm the introduction.";
          return;
        }
      }
      if (q && q.id === "referredEmail") {
        var rr = referralContactOk();
        if (!rr.hasReferred) {
          root.querySelector("[data-intake-error]").textContent =
            "Please provide their phone or email so we can follow up.";
          return;
        }
      }
      if (q && q.id === "referralPermission" && answers.referralPermission === "no") {
        root.querySelector("[data-intake-error]").textContent =
          "Permission is required before Sparklean can contact the person you are introducing.";
        return;
      }
      if (q && q.id === "referralConsent" && answers.referralConsent !== "agree") {
        root.querySelector("[data-intake-error]").textContent =
          "Consent is required to submit a referral.";
        return;
      }
    }

    // Paid mode: submit immediately after service selection — no property-detail branch.
    if (paidMode && q && q.id === "serviceCategory") {
      submitLead();
      return;
    }

    if (q && q.id === "serviceCategory" && !paidMode) {
      var keep = ["fullName", "phone", "email", "location", "serviceCategory"];
      var na = {};
      for (var ki = 0; ki < keep.length; ki++) {
        var kk = keep[ki];
        if (Object.prototype.hasOwnProperty.call(answers, kk)) na[kk] = answers[kk];
      }
      answers = na;
      steps = F.flows.universal.concat(F.flows[answers.serviceCategory] || []);
    }

    if (isFinalMandatoryStep()) {
      submitLead();
      return;
    }

    // After expanding organic branch, leave serviceCategory and continue.
    if (q && q.id === "serviceCategory" && !paidMode) {
      stepIndex++;
      applySkipsForward();
      render();
      return;
    }

    stepIndex++;
    applySkipsForward();
    render();
  }

  function goBack() {
    if (stepIndex <= 0) return;
    stepIndex--;
    if (paidMode) {
      steps = F.flows.universal.slice();
      render();
      return;
    }
    if (intakePreset === "innerCircle") {
      if (stepIndex < 4) {
        steps = F.flows.universal.slice(0, 4).concat(F.flows.innerCircleMembership);
      }
      render();
      return;
    }
    if (intakePreset === "referral") {
      steps = F.flows.referralIntro.slice();
      render();
      return;
    }
    if (intakePreset === "recurringResidential") {
      steps = F.flows.universal.slice(0, 4).concat(F.flows.residential);
      render();
      return;
    }
    if (stepIndex < F.flows.universal.length) {
      steps = F.flows.universal.slice();
    }
    render();
  }

  function close() {
    if (root) {
      root.setAttribute("hidden", "");
      root.classList.remove("is-open");
    }
    intakePreset = null;
    paidMode = false;
    applyIntakeChrome(null);
    document.body.classList.remove("sq-intake-open");
    document.removeEventListener("keydown", onKey);
  }

  function onKey(e) {
    if (e.key === "Escape") close();
  }

  function submitLead() {
    if (submitting) return;
    submitting = true;
    var nextBtn = root.querySelector("[data-intake-next]");
    nextBtn.disabled = true;
    nextBtn.textContent = "Sending…";
    var intakeEntry = "";
    try {
      intakeEntry = sessionStorage.getItem("sparklean_intake_entry") || "";
    } catch (e0) {
      intakeEntry = "";
    }
    var submitAnswers = Object.assign({}, answers);
    if (intakePreset === "referral") {
      submitAnswers.serviceCategory = "referral";
      submitAnswers.leadSource = "referral";
      submitAnswers.location = submitAnswers.location || "Southwest Florida (referral)";
    }
    if (paidMode) {
      submitAnswers.leadSource = submitAnswers.leadSource || "paid_intake";
      submitAnswers.intakeMode = "paid_minimum";
    }
    var payload = {
      answers: submitAnswers,
      sourceUrl: sourceUrl || window.location.href,
      landingPage: sourceUrl || window.location.href,
      intakeEntryUrl: intakeEntry || sourceUrl || window.location.href,
      submitPageUrl: window.location.href,
      referrer: document.referrer || "",
      campaign: campaignFromLocation(),
      deviceType: deviceTypeGuess(),
      userAgent: (navigator.userAgent || "").slice(0, 400),
      submittedAt: new Date().toISOString(),
      intakePreset: paidMode ? "paidMinimum" : intakePreset || null,
      serviceLabel: F.categoryLabel(submitAnswers.serviceCategory || ""),
    };
    fetch("/.netlify/functions/quote-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
      .then(function (res) {
        if (!res.ok) {
          throw new Error("INTAKE_FAIL");
        }
        var leadId = res.j && res.j.leadId ? String(res.j.leadId) : "";
        var reportToken = res.j && res.j.reportToken ? String(res.j.reportToken) : "";
        leadDelivered = true;
        trackingDelayed = false;

        function finishSuccessUi() {
          if (window.SparkleanEvents && typeof window.SparkleanEvents.track === "function") {
            if (intakePreset === "referral") {
              window.SparkleanEvents.track("referral_submitted", {
                referral_type: String(submitAnswers.referralType || "").slice(0, 40),
                intake_preset: "referral",
              });
            } else if (paidMode) {
              window.SparkleanEvents.track("paid_quote_submitted", {
                intake_preset: "paidMinimum",
                service_category: String(submitAnswers.serviceCategory || "").slice(0, 40),
              });
            } else if (
              intakePreset === "recurringResidential" ||
              submitAnswers.frequency === "weekly" ||
              submitAnswers.frequency === "biweekly" ||
              submitAnswers.frequency === "monthly"
            ) {
              window.SparkleanEvents.track("recurring_quote_submitted", {
                intake_preset: intakePreset || "standard",
                cadence: String(submitAnswers.frequency || "").slice(0, 40),
                service_category: String(submitAnswers.serviceCategory || "").slice(0, 40),
              });
            }
          }
          stepIndex = steps.length;
          submitting = false;
          render();
        }

        function reportDirect(opts) {
          if (window.SparkleanAttribution && typeof window.SparkleanAttribution.reportConversionOutcome === "function") {
            return window.SparkleanAttribution.reportConversionOutcome(opts);
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

        if (leadId && reportToken && window.SparkleanAds && typeof window.SparkleanAds.fireAndReportConversion === "function") {
          return window.SparkleanAds.fireAndReportConversion({ leadId: leadId, reportToken: reportToken }).then(function (outcome) {
            if (outcome && (outcome.delayed || !outcome.browserSent || !outcome.reportOk)) trackingDelayed = true;
            finishSuccessUi();
          });
        }
        if (leadId && reportToken) {
          return reportDirect({
            leadId: leadId,
            reportToken: reportToken,
            status: "OFFLINE_QUEUED",
            failureReason: "sparklean_ads_unavailable",
          }).then(function (rep) {
            trackingDelayed = true;
            if (!rep || !rep.ok) trackingDelayed = true;
            finishSuccessUi();
          });
        }
        trackingDelayed = true;
        finishSuccessUi();
      })
      .catch(function () {
        root.querySelector("[data-intake-error]").textContent = INTAKE_FAILURE_MSG;
        nextBtn.disabled = false;
        nextBtn.textContent = "Send request";
        submitting = false;
      });
  }

  function applyIntakeChrome(preset) {
    if (!root) return;
    var pack = INTAKE_CHROME_DEFAULT;
    if (paidMode) pack = INTAKE_CHROME_PAID;
    else if (preset === "innerCircle") pack = INTAKE_CHROME_INNER_CIRCLE;
    else if (preset === "referral") pack = INTAKE_CHROME_REFERRAL;
    else if (preset === "recurringResidential") pack = INTAKE_CHROME_RECURRING;
    var ey = root.querySelector(".sq-intake__eyebrow");
    var ti = root.querySelector("#sq-intake-title");
    var intro = root.querySelector(".sq-intake__intro");
    if (ey) ey.textContent = pack.eyebrow;
    if (ti) ti.textContent = pack.title;
    if (intro) intro.textContent = pack.intro;
  }

  function buildShell() {
    root = document.createElement("div");
    root.id = "sparklean-quote-intake";
    root.className = "sq-intake";
    root.setAttribute("hidden", "");
    root.innerHTML =
      '<div class="sq-intake__backdrop" data-intake-close tabindex="-1"></div>' +
      '<div class="sq-intake__dialog" role="dialog" aria-modal="true" aria-labelledby="sq-intake-title">' +
      '<div class="sq-intake__head">' +
      '<div><p class="sq-intake__eyebrow">Service request</p>' +
      '<h1 id="sq-intake-title" class="sq-intake__title">A few brief questions</h1></div>' +
      '<button type="button" class="sq-intake__x" data-intake-close aria-label="Close">×</button></div>' +
      '<p class="sq-intake__intro">One question at a time. Pricing is not reviewed here; a Sparklean team member will reach out to you directly.</p>' +
      '<div class="sq-intake__progress-track" aria-hidden="true"><span class="sq-intake__progress-fill" data-intake-progress-bar></span></div>' +
      '<p class="sq-intake__progress" data-intake-progress></p>' +
      '<div class="sq-intake__body" data-intake-step></div>' +
      '<p class="sq-intake__err" data-intake-error role="alert"></p>' +
      '<div class="sq-intake__foot">' +
      '<a class="sq-intake__callstrip" href="tel:+12398883588">Call Sparklean · (239) 888-3588</a>' +
      '<div class="sq-intake__actions">' +
      '<button type="button" class="sq-intake__btn sq-intake__btn--ghost" data-intake-back>Back</button>' +
      '<button type="button" class="sq-intake__btn sq-intake__btn--primary" data-intake-next>Continue</button>' +
      "</div></div></div>";
    document.body.appendChild(root);
    root.querySelectorAll("[data-intake-close]").forEach(function (el) {
      el.addEventListener("click", close);
    });
    root.querySelector("[data-intake-back]").addEventListener("click", goBack);
    root.querySelector("[data-intake-next]").addEventListener("click", function () {
      if (this.getAttribute("data-intake-done")) {
        close();
        submitting = false;
        return;
      }
      advance();
    });
  }

  function campaignFromLocation() {
    try {
      var p = new URLSearchParams(window.location.search);
      var o = {};
      var keys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "gclid",
        "gbraid",
        "wbraid",
        "quote",
      ];
      for (var i = 0; i < keys.length; i++) {
        var v = p.get(keys[i]);
        if (v) o[keys[i]] = v.slice(0, 200);
      }
      if (window.SparkleanAttribution && typeof window.SparkleanAttribution.getStoredAdClickIds === "function") {
        var storedA = window.SparkleanAttribution.getStoredAdClickIds() || {};
        ["gclid", "gbraid", "wbraid"].forEach(function (k) {
          if (!o[k] && storedA[k]) o[k] = String(storedA[k]).slice(0, 200);
        });
      } else if (window.SparkleanAds && typeof window.SparkleanAds.getStoredAdClickIds === "function") {
        var stored = window.SparkleanAds.getStoredAdClickIds() || {};
        ["gclid", "gbraid", "wbraid"].forEach(function (k) {
          if (!o[k] && stored[k]) o[k] = String(stored[k]).slice(0, 200);
        });
      }
      if (paidMode) o.intake_mode = "paid_minimum";
      return Object.keys(o).length ? o : null;
    } catch (e1) {
      return null;
    }
  }

  function deviceTypeGuess() {
    var ua = navigator.userAgent || "";
    if (/iPad|Tablet/i.test(ua)) return "tablet";
    if (/Mobi|Android.+Mobile/i.test(ua)) return "mobile";
    return "desktop";
  }

  function open(opts) {
    if (!ensureFlows()) return;
    markSoftPromptOpened();
    sourceUrl = (opts && opts.sourceUrl) || window.location.href;
    var preset = (opts && opts.preset && String(opts.preset).trim()) || "";
    var fromAttr = "";
    try {
      if (opts && opts.referralType) fromAttr = String(opts.referralType).trim();
    } catch (eR) {
      fromAttr = "";
    }
    referralTypePrefill = fromAttr;
    if (preset === "innerCircle") intakePreset = "innerCircle";
    else if (preset === "referral") intakePreset = "referral";
    else if (preset === "recurringResidential") intakePreset = "recurringResidential";
    else intakePreset = null;

    // Referral / Inner Circle keep their dedicated flows even on paid landings.
    paidMode =
      shouldUsePaidMode(opts) && intakePreset !== "referral" && intakePreset !== "innerCircle";
    leadDelivered = false;
    trackingDelayed = false;

    try {
      if (!sessionStorage.getItem("sparklean_intake_entry")) {
        sessionStorage.setItem("sparklean_intake_entry", sourceUrl || window.location.href);
      }
    } catch (e2) {
      /* ignore private mode */
    }
    if (!root) buildShell();
    applyIntakeChrome(intakePreset);
    if (intakePreset === "innerCircle") {
      answers = { serviceCategory: "innerCircle" };
      steps = F.flows.universal.slice(0, 4).concat(F.flows.innerCircleMembership);
    } else if (intakePreset === "referral") {
      answers = {
        serviceCategory: "referral",
        leadSource: "referral",
        location: "Southwest Florida (referral)",
      };
      if (referralTypePrefill) answers.referralType = referralTypePrefill;
      steps = F.flows.referralIntro.slice();
    } else if (paidMode) {
      // Minimum viable lead only — never concatenate property-detail flows.
      answers = {};
      if (intakePreset === "recurringResidential") {
        answers.serviceCategory = "residential";
        steps = F.flows.universal.slice();
      } else {
        steps = F.flows.universal.slice();
      }
      intakePreset = null;
    } else if (intakePreset === "recurringResidential") {
      answers = { serviceCategory: "residential" };
      steps = F.flows.universal.slice(0, 4).concat(F.flows.residential);
    } else {
      answers = {};
      steps = F.flows.universal.slice();
    }
    stepIndex = 0;
    submitting = false;
    root.querySelector("[data-intake-next]").disabled = false;
    root.removeAttribute("hidden");
    root.classList.add("is-open");
    document.body.classList.add("sq-intake-open");
    document.addEventListener("keydown", onKey);
    applySkipsForward();
    if (window.SparkleanEvents && typeof window.SparkleanEvents.track === "function") {
      if (intakePreset === "referral") {
        var refParams = { intake_preset: "referral" };
        if (referralTypePrefill) refParams.referral_type = referralTypePrefill;
        window.SparkleanEvents.track("referral_started", refParams);
      } else if (paidMode) {
        window.SparkleanEvents.track("paid_quote_started", { intake_preset: "paidMinimum" });
      } else if (intakePreset === "recurringResidential") {
        window.SparkleanEvents.track("recurring_quote_started", {
          intake_preset: "recurringResidential",
          service_category: "residential",
        });
      }
    }
    render();
    requestAnimationFrame(function () {
      var inp = root.querySelector(".sq-intake__input");
      if (inp) inp.focus();
    });
  }

  function paidLandingPreset() {
    var path = (window.location.pathname || "").toLowerCase();
    if (
      path.indexOf("residential") !== -1 ||
      path.indexOf("house-cleaning") !== -1 ||
      path === "/" ||
      path === "/index.html"
    ) {
      return "recurringResidential";
    }
    return null;
  }

  function openPaidIntake(sourceTag) {
    open({
      sourceUrl: window.location.href + (sourceTag || ""),
      paid: true,
      preset: paidLandingPreset(),
    });
  }

  function ensureSoftPromptEl() {
    if (softPromptEl) return softPromptEl;
    softPromptEl = document.createElement("aside");
    softPromptEl.className = "sq-paid-prompt";
    softPromptEl.setAttribute("hidden", "");
    softPromptEl.setAttribute("role", "dialog");
    softPromptEl.setAttribute("aria-label", "Personalized cleaning plan");
    softPromptEl.innerHTML =
      '<div class="sq-paid-prompt__inner">' +
      '<p class="sq-paid-prompt__copy">Ready for a personalized cleaning plan?</p>' +
      '<div class="sq-paid-prompt__actions">' +
      '<button type="button" class="sq-paid-prompt__cta" data-paid-prompt-open>Get a quote</button>' +
      '<button type="button" class="sq-paid-prompt__dismiss" data-paid-prompt-dismiss aria-label="Dismiss">×</button>' +
      "</div></div>";
    document.body.appendChild(softPromptEl);
    softPromptEl.addEventListener("click", function (e) {
      if (e.target.closest("[data-paid-prompt-dismiss]")) {
        e.preventDefault();
        dismissSoftPrompt();
        return;
      }
      if (e.target.closest("[data-paid-prompt-open]")) {
        e.preventDefault();
        openPaidIntake("#paid-soft-prompt");
      }
    });
    return softPromptEl;
  }

  function hideSoftPromptDom() {
    if (!softPromptEl) return;
    softPromptEl.setAttribute("hidden", "");
    softPromptEl.classList.remove("is-visible");
  }

  function dismissSoftPrompt() {
    setSoftPromptState("dismissed");
    hideSoftPromptDom();
    clearSoftPromptListeners();
  }

  function markSoftPromptOpened() {
    if (!isSoftPaidLandingQuery() && !isForcedQuoteQuery()) return;
    var s = getSoftPromptState();
    if (s !== "dismissed") setSoftPromptState("opened");
    hideSoftPromptDom();
    clearSoftPromptListeners();
  }

  function clearSoftPromptListeners() {
    if (softPromptTimer) {
      clearTimeout(softPromptTimer);
      softPromptTimer = null;
    }
    if (softPromptBound) {
      window.removeEventListener("scroll", onSoftPromptScroll);
      softPromptBound = false;
    }
  }

  function onSoftPromptScroll() {
    try {
      var doc = document.documentElement;
      var body = document.body;
      var scrollTop = window.pageYOffset || doc.scrollTop || body.scrollTop || 0;
      var scrollHeight = Math.max(doc.scrollHeight, body.scrollHeight || 0);
      var clientHeight = window.innerHeight || doc.clientHeight || 0;
      var maxScroll = Math.max(1, scrollHeight - clientHeight);
      if (scrollTop / maxScroll >= PROMPT_SCROLL_RATIO) {
        showSoftPrompt();
      }
    } catch (e4) {
      /* ignore */
    }
  }

  function showSoftPrompt() {
    if (!isSoftPaidLandingQuery()) return;
    if (softPromptBlocked()) return;
    if (root && root.classList.contains("is-open")) return;
    ensureSoftPromptEl();
    setSoftPromptState("shown");
    softPromptEl.removeAttribute("hidden");
    softPromptEl.classList.add("is-visible");
    clearSoftPromptListeners();
    if (window.SparkleanEvents && typeof window.SparkleanEvents.track === "function") {
      window.SparkleanEvents.track("paid_quote_prompt_shown", { intake_preset: "paidMinimum" });
    }
  }

  function schedulePaidSoftPrompt() {
    if (!isSoftPaidLandingQuery()) return;
    if (isForcedQuoteQuery()) return;
    if (softPromptBlocked()) return;
    if (softPromptBound || softPromptTimer) return;
    softPromptBound = true;
    window.addEventListener("scroll", onSoftPromptScroll, { passive: true });
    softPromptTimer = setTimeout(function () {
      softPromptTimer = null;
      showSoftPrompt();
    }, PROMPT_DELAY_MS);
  }

  function resetSoftPromptForTest() {
    clearSoftPromptListeners();
    softPromptShown = false;
    hideSoftPromptDom();
    try {
      sessionStorage.removeItem(softPromptStorageKey());
    } catch (e6) {
      /* ignore */
    }
  }

  function maybeForceOpenQuote() {
    if (!isForcedQuoteQuery()) return;
    try {
      if (sessionStorage.getItem(forceOpenStorageKey()) === "1") return;
      sessionStorage.setItem(forceOpenStorageKey(), "1");
    } catch (e5) {
      /* continue even if storage blocked */
    }
    openPaidIntake("?quote=1");
  }

  window.SparkleanQuoteIntake = {
    open: open,
    close: close,
    _test: {
      isPaidLandingQuery: isPaidLandingQuery,
      isForcedQuoteQuery: isForcedQuoteQuery,
      isSoftPaidLandingQuery: isSoftPaidLandingQuery,
      shouldUsePaidMode: shouldUsePaidMode,
      showSoftPrompt: showSoftPrompt,
      dismissSoftPrompt: dismissSoftPrompt,
      schedulePaidSoftPrompt: schedulePaidSoftPrompt,
      resetSoftPromptForTest: resetSoftPromptForTest,
      getSoftPromptState: getSoftPromptState,
      getSoftPromptEl: function () {
        return softPromptEl;
      },
      setPromptDelayMs: function (ms) {
        PROMPT_DELAY_MS = Number(ms) || 0;
      },
      getPromptDelayMs: function () {
        return PROMPT_DELAY_MS;
      },
      getPromptScrollRatio: function () {
        return PROMPT_SCROLL_RATIO;
      },
      willExpandAfterServiceCategory: function () {
        return willExpandAfterServiceCategory();
      },
      isFinalMandatoryStep: function () {
        return isFinalMandatoryStep();
      },
      getState: function () {
        return {
          paidMode: paidMode,
          intakePreset: intakePreset,
          stepIndex: stepIndex,
          stepsLen: steps.length,
          leadDelivered: leadDelivered,
          currentId: currentQuestion() && currentQuestion().id,
          progressText: root && root.querySelector("[data-intake-progress]")
            ? root.querySelector("[data-intake-progress]").textContent
            : "",
          nextText: root && root.querySelector("[data-intake-next]")
            ? root.querySelector("[data-intake-next]").textContent
            : "",
          doneHtml: root && root.querySelector("[data-intake-step]")
            ? root.querySelector("[data-intake-step]").innerHTML
            : "",
        };
      },
      setPaidModeForTest: function (v) {
        paidMode = !!v;
      },
      setStepsForTest: function (s, idx, ans) {
        steps = s || [];
        stepIndex = idx || 0;
        answers = ans || {};
      },
    },
  };

  function boot() {
    bindGlobalClicks();
    document.addEventListener("click", function (e) {
      if (e.target.closest(".sparklean-mcta__quote")) {
        e.preventDefault();
        open({ sourceUrl: window.location.href + "#sticky-quote" });
      }
    });
    var tryPaidLanding = function () {
      if (!ensureFlows()) return;
      // Explicit ?quote=1 may open immediately; paid click IDs never auto-open.
      maybeForceOpenQuote();
      schedulePaidSoftPrompt();
    };
    if (document.readyState === "complete") {
      setTimeout(tryPaidLanding, 0);
    } else {
      window.addEventListener("load", function () {
        setTimeout(tryPaidLanding, 0);
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
