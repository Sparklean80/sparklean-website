/**
 * Sparklean — guided concierge intake (single overlay, sitewide).
 * Deterministic steps only; no client-side model, no freeform chat.
 * Depends on: /js/serviceFlows.js (window.SparkleanQuoteFlows)
 */
(function () {
  var F = null;
  var root = null;
  var steps = [];
  var stepIndex = 0;
  var answers = {};
  var sourceUrl = "";
  var submitting = false;
  /** When set (e.g. "innerCircle"), skips generic "which service" branching and uses a dedicated flow. */
  var intakePreset = null;
  var INTAKE_CHROME_DEFAULT = {
    eyebrow: "Service request",
    title: "A few brief questions",
    intro:
      "One question at a time. Pricing is not reviewed here; a Sparklean team member will reach out to you directly.",
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

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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
    if (/contact estimating|estimating team|message estimating|contact scheduling|reach us directly/i.test(txt)) return false;
    if (a.classList.contains("nav-btn")) return true;
    if (a.classList.contains("btn-gold")) return true;
    if (a.classList.contains("btn-outline") && /quote|estimate/i.test(tLower)) return true;
    if (a.classList.contains("founder-soft-cta")) return true;
    if (/quote|estimate|personalized|schedule|set up|join|construction|commercial quote|discuss add-ons|window cleaning quote/i.test(tLower)) return true;
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
      elStep.innerHTML = '<p class="sq-intake__done">' + esc(doneText) + "</p>";
      var doneBar = root.querySelector("[data-intake-progress-bar]");
      if (doneBar) doneBar.style.width = "100%";
      elProg.textContent = "Complete";
      root.querySelector("[data-intake-back]").style.display = "none";
      root.querySelector("[data-intake-next]").textContent = "Close";
      root.querySelector("[data-intake-next]").setAttribute("data-intake-done", "1");
      return;
    }
    var n = steps.length;
    var pct = n ? Math.round(((stepIndex + 1) / n) * 100) : 0;
    var bar = root.querySelector("[data-intake-progress-bar]");
    if (bar) bar.style.width = pct + "%";
    elProg.textContent = "Step " + (stepIndex + 1) + " of " + n;
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
    var nextBtn = root.querySelector("[data-intake-next]");
    nextBtn.textContent = stepIndex >= steps.length - 1 ? "Send request" : "Continue";
    nextBtn.removeAttribute("data-intake-done");

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
    if (q && q.id === "serviceCategory") {
      var keep = ["fullName", "phone", "email", "location", "serviceCategory"];
      var na = {};
      for (var ki = 0; ki < keep.length; ki++) {
        var kk = keep[ki];
        if (Object.prototype.hasOwnProperty.call(answers, kk)) na[kk] = answers[kk];
      }
      answers = na;
      steps = F.flows.universal.concat(F.flows[answers.serviceCategory] || []);
    }
    if (stepIndex >= steps.length - 1) {
      submitLead();
      return;
    }
    stepIndex++;
    applySkipsForward();
    render();
  }

  function goBack() {
    if (stepIndex <= 0) return;
    stepIndex--;
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
      intakePreset: intakePreset || null,
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
        // Google Ads conversion: only after server confirms persistence + returns leadId.
        var leadId = res.j && res.j.leadId ? String(res.j.leadId) : "";
        if (
          leadId &&
          window.SparkleanAds &&
          typeof window.SparkleanAds.trackQuoteRequestCompleted === "function"
        ) {
          window.SparkleanAds.trackQuoteRequestCompleted(leadId);
        }
        if (window.SparkleanEvents && typeof window.SparkleanEvents.track === "function") {
          if (intakePreset === "referral") {
            window.SparkleanEvents.track("referral_submitted", {
              referral_type: String(submitAnswers.referralType || "").slice(0, 40),
              intake_preset: "referral",
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
    if (preset === "innerCircle") pack = INTAKE_CHROME_INNER_CIRCLE;
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
      ];
      for (var i = 0; i < keys.length; i++) {
        var v = p.get(keys[i]);
        if (v) o[keys[i]] = v.slice(0, 200);
      }
      // Preserve click ids across in-site navigation / intake open on other pages.
      if (window.SparkleanAds && typeof window.SparkleanAds.getStoredAdClickIds === "function") {
        var stored = window.SparkleanAds.getStoredAdClickIds() || {};
        ["gclid", "gbraid", "wbraid"].forEach(function (k) {
          if (!o[k] && stored[k]) o[k] = String(stored[k]).slice(0, 200);
        });
      }
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

  window.SparkleanQuoteIntake = { open: open, close: close };

  function boot() {
    bindGlobalClicks();
    document.addEventListener("click", function (e) {
      if (e.target.closest(".sparklean-mcta__quote")) {
        e.preventDefault();
        open({ sourceUrl: window.location.href + "#sticky-quote" });
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
