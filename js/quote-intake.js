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
        open({ sourceUrl: window.location.href });
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
      elStep.innerHTML =
        '<p class="sq-intake__done">Thank you. Your request has been received and a Sparklean team member will contact you shortly to discuss the best service approach for your property.</p>';
      elProg.textContent = "";
      root.querySelector("[data-intake-back]").style.display = "none";
      root.querySelector("[data-intake-next]").textContent = "Close";
      root.querySelector("[data-intake-next]").setAttribute("data-intake-done", "1");
      return;
    }
    var n = steps.length;
    elProg.textContent = stepIndex + 1 + " — " + n;
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

  function advance() {
    if (!validateCurrent()) {
      root.querySelector("[data-intake-error]").textContent = "Please complete this item before continuing.";
      return;
    }
    var q = currentQuestion();
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
    var payload = {
      answers: answers,
      sourceUrl: sourceUrl || window.location.href,
      submittedAt: new Date().toISOString(),
      serviceLabel: F.categoryLabel(answers.serviceCategory || ""),
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
            j = { error: t || "Invalid response" };
          }
          return { ok: r.ok, j: j };
        });
      })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j && res.j.error ? res.j.error : "Unable to send");
        stepIndex = steps.length;
        submitting = false;
        render();
      })
      .catch(function (err) {
        root.querySelector("[data-intake-error]").textContent =
          err.message || "We could not send this request. Please call (239) 888-3588.";
        nextBtn.disabled = false;
        nextBtn.textContent = "Send request";
        submitting = false;
      });
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
      '<p class="sq-intake__progress" data-intake-progress></p>' +
      '<div class="sq-intake__body" data-intake-step></div>' +
      '<p class="sq-intake__err" data-intake-error role="alert"></p>' +
      '<div class="sq-intake__actions">' +
      '<button type="button" class="sq-intake__btn sq-intake__btn--ghost" data-intake-back>Back</button>' +
      '<button type="button" class="sq-intake__btn sq-intake__btn--primary" data-intake-next>Continue</button>' +
      "</div></div>";
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

  function open(opts) {
    if (!ensureFlows()) return;
    sourceUrl = (opts && opts.sourceUrl) || window.location.href;
    if (!root) buildShell();
    answers = {};
    stepIndex = 0;
    steps = F.flows.universal.slice();
    submitting = false;
    root.querySelector("[data-intake-next]").disabled = false;
    root.removeAttribute("hidden");
    root.classList.add("is-open");
    document.body.classList.add("sq-intake-open");
    document.addEventListener("keydown", onKey);
    applySkipsForward();
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
