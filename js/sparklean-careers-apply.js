(function () {
  var LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  var API = "http://127.0.0.1:8787";
  var TOKEN_KEY = "sk_hiring_resume";
  var STEPS = ["step-gate", "step-app", "step-scenarios", "step-review"];

  function review() {
    return !LOCAL;
  }
  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }
  function setToken(v) {
    sessionStorage.setItem(TOKEN_KEY, v);
  }
  function headers() {
    var h = { "content-type": "application/json" };
    if (token()) h["x-hiring-resume"] = token();
    return h;
  }
  async function req(path, opts) {
    if (!LOCAL) throw new Error("Hiring API is not connected in founder review.");
    var res = await fetch(API + path, Object.assign({ credentials: "include", headers: headers() }, opts || {}));
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) {
      var err = new Error(data.notice || data.error || "request_failed");
      err.body = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }
  function el(id) {
    return document.getElementById(id);
  }
  function fmt() {
    return globalThis.SparkleanHiringReview || {};
  }
  function formatPay(cents) {
    return fmt().formatPay ? fmt().formatPay(cents) : "$" + (cents / 100).toFixed(2) + " per hour";
  }
  function formatTime(local) {
    return fmt().formatTime ? fmt().formatTime(local) : local;
  }
  function formatDays(days) {
    return fmt().formatDays ? fmt().formatDays(days) : (days || []).join(", ");
  }
  function show(id) {
    document.querySelectorAll("[data-careers-step]").forEach(function (n) {
      n.classList.add("careers-hidden");
    });
    var node = el(id);
    if (node) node.classList.remove("careers-hidden");
    var progress = document.querySelector(".careers-progress");
    if (progress) progress.hidden = id === "step-rejected";
    var idx = STEPS.indexOf(id);
    document.querySelectorAll(".careers-progress li").forEach(function (item, i) {
      item.classList.toggle("is-current", i === idx);
      item.classList.toggle("is-complete", idx > i);
    });
    var fill = el("fill-demo-answers");
    if (fill) fill.hidden = !(review() && id === "step-gate");
    var err = el("careers-error");
    if (err && id === "step-rejected") err.hidden = true;
  }
  function val(id) {
    var n = el(id);
    return n ? n.value.trim() : "";
  }
  function checked(id) {
    var n = el(id);
    return !!(n && n.checked);
  }
  function radio(name) {
    var n = document.querySelector('input[name="' + name + '"]:checked');
    return n ? n.value : "";
  }
  function fail(err) {
    if (err.body && err.body.notice) {
      show("step-rejected");
      return;
    }
    var box = el("careers-error");
    if (!box) return;
    box.hidden = false;
    box.textContent = err.message || "Unable to continue.";
  }

  var job = null;
  var applicationId = "";

  function fillJob(j) {
    job = j;
    document.querySelectorAll("[data-job-title]").forEach(function (n) {
      n.textContent = j.title;
    });
    document.querySelectorAll("[data-job-pay]").forEach(function (n) {
      n.textContent = formatPay(j.base_rate_cents);
    });
    document.querySelectorAll("[data-job-ot]").forEach(function (n) {
      n.textContent = formatPay(j.overtime_rate_cents);
    });
    document.querySelectorAll("[data-job-time]").forEach(function (n) {
      n.textContent = formatTime(j.earliest_report_local);
    });
    document.querySelectorAll("[data-job-days]").forEach(function (n) {
      n.textContent = formatDays(j.required_days);
    });
    document.querySelectorAll("[data-job-status]").forEach(function (n) {
      n.textContent = j.full_time ? "Full-time" : "Part-time";
    });
    document.querySelectorAll("[data-job-location]").forEach(function (n) {
      n.textContent = j.reporting_location_label || "Assigned by Sparklean";
    });
    document.querySelectorAll("[data-job-driving]").forEach(function (n) {
      n.textContent = j.driving_required
        ? "This position requires driving a company vehicle and a valid Florida driver’s license."
        : "This opening does not require driving a company vehicle.";
    });
    document.querySelectorAll("[data-job-functions]").forEach(function (n) {
      n.textContent = j.essential_functions;
    });
    var dl = el("dl-wrap");
    if (dl) dl.hidden = !j.driving_required;
  }

  async function boot() {
    try {
      if (review()) {
        if (!globalThis.SparkleanHiringReview) {
          fail({ message: "This page could not load." });
          return;
        }
        fillJob(SparkleanHiringReview.job);
        applicationId = "review-demo";
        show("step-gate");
        return;
      }
      var data = await req("/api/hiring/openings");
      if (!data.openings || !data.openings[0]) {
        el("careers-error").hidden = false;
        el("careers-error").textContent = "No published openings right now.";
        return;
      }
      fillJob(data.openings[0]);
      if (!token()) {
        var started = await req("/api/hiring/applications", {
          method: "POST",
          body: JSON.stringify({ job_id: data.openings[0].id }),
        });
        setToken(started.resume_token);
      }
      applicationId = "me";
      show("step-gate");
    } catch (err) {
      fail(err);
    }
  }

  function gateBody() {
    var pack = checked("confirm_package");
    return {
      full_legal_name: val("full_legal_name"),
      phone: val("phone"),
      email: val("email"),
      city: val("city"),
      zip: val("zip"),
      at_least_18: checked("at_least_18"),
      work_authorized: checked("work_authorized"),
      requires_sponsorship: radio("sponsorship") === "yes",
      confirm_package: pack,
      accepts_starting_pay: pack,
      understands_rate_nonnegotiable: pack,
      can_report_earliest_time: pack,
      available_full_time: pack,
      willing_over_40: pack,
      understands_ot_rate: pack,
      understands_ot_not_guaranteed: pack,
      can_work_required_days: pack,
      has_valid_fl_dl: job && job.driving_required ? checked("has_valid_fl_dl") : null,
      reliable_transport: checked("reliable_transport"),
      can_perform_essential_duties: checked("can_perform_essential_duties"),
      accepts_conduct_requirements: checked("accepts_conduct_requirements"),
    };
  }

  async function submitGate(e) {
    e.preventDefault();
    el("careers-error").hidden = true;
    try {
      if (!radio("sponsorship")) {
        fail({ message: "Please answer the sponsorship question." });
        return;
      }
      if (review()) {
        if (!SparkleanHiringReview.gatesPass(gateBody())) {
          fail({ body: { notice: SparkleanHiringReview.notice } });
          return;
        }
        show("step-app");
        return;
      }
      await req("/api/hiring/applications/" + applicationId + "/gate", {
        method: "PATCH",
        body: JSON.stringify(Object.assign({ agrees_later_screening: true }, gateBody())),
      });
      show("step-app");
    } catch (err) {
      fail(err);
    }
  }

  function appBody() {
    var refs = [{ name: val("ref1_name"), phone: val("ref1_phone"), relationship: val("ref1_rel") }];
    return {
      employment_history: [
        {
          employer: val("employer"),
          role_title: val("role_title"),
          started_on: val("started_on"),
          ended_on: val("ended_on") || null,
          reason_for_leaving: val("reason_for_leaving"),
        },
      ],
      cleaning_experience: checked("cleaning_experience"),
      residential_experience: checked("residential_experience"),
      commercial_experience: checked("commercial_experience"),
      post_construction_experience: checked("post_construction_experience"),
      team_lead_experience: checked("team_lead_experience"),
      languages: val("languages"),
      references: refs,
      earliest_start_date: val("earliest_start_date"),
      scenario_answers: {
        locked_room: val("q_locked_room"),
        skip_request: val("q_skip_request"),
        damage: val("q_damage"),
      },
    };
  }

  async function submitApp(e) {
    e.preventDefault();
    show("step-scenarios");
  }

  async function submitScenarios(e) {
    e.preventDefault();
    show("step-review");
  }

  async function submitReview(e) {
    e.preventDefault();
    try {
      if (review()) {
        location.href = "/careers/offer/review-demo";
        return;
      }
      await req("/api/hiring/applications/" + applicationId + "/application", {
        method: "PATCH",
        body: JSON.stringify(appBody()),
      });
      var out = await req("/api/hiring/applications/" + applicationId + "/certify", {
        method: "POST",
        body: JSON.stringify({ signature: val("cert_signature"), truthful: checked("truthful") }),
      });
      location.href = "/pages/careers-offer.html#" + encodeURIComponent(out.offer_token);
    } catch (err) {
      fail(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var g = el("form-gate");
    var a = el("form-app");
    var s = el("form-scenarios");
    var r = el("form-review");
    if (g) g.addEventListener("submit", submitGate);
    if (a) a.addEventListener("submit", submitApp);
    if (s) s.addEventListener("submit", submitScenarios);
    if (r) r.addEventListener("submit", submitReview);
    document.querySelectorAll("[data-back]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(btn.getAttribute("data-back"));
      });
    });
    var fill = el("fill-demo-answers");
    if (fill && review()) {
      fill.addEventListener("click", function () {
        SparkleanHiringReview.fillTestApplicant();
      });
    }
    boot();
  });
})();
