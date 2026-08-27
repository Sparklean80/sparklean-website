(function () {
  var API =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "http://127.0.0.1:8787"
      : "https://api.sparklean.co";
  var TOKEN_KEY = "sk_hiring_resume";

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
  function show(id) {
    document.querySelectorAll("[data-careers-step]").forEach(function (n) {
      n.classList.add("careers-hidden");
    });
    var node = el(id);
    if (node) node.classList.remove("careers-hidden");
  }
  function val(id) {
    var n = el(id);
    return n ? n.value.trim() : "";
  }
  function checked(id) {
    var n = el(id);
    return !!(n && n.checked);
  }
  function money(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  function fail(err) {
    var box = el("careers-error");
    if (!box) return;
    box.hidden = false;
    box.textContent = (err.body && err.body.notice) || err.message || "Unable to continue.";
    if (err.body && err.body.notice) show("step-rejected");
  }

  var job = null;
  var applicationId = "";

  function fillJob(j) {
    job = j;
    document.querySelectorAll("[data-job-title]").forEach(function (n) {
      n.textContent = j.title;
    });
    document.querySelectorAll("[data-job-pay]").forEach(function (n) {
      n.textContent = money(j.base_rate_cents);
    });
    document.querySelectorAll("[data-job-ot]").forEach(function (n) {
      n.textContent = money(j.overtime_rate_cents);
    });
    document.querySelectorAll("[data-job-time]").forEach(function (n) {
      n.textContent = j.earliest_report_local;
    });
    document.querySelectorAll("[data-job-days]").forEach(function (n) {
      n.textContent = (j.required_days || []).join(", ");
    });
    document.querySelectorAll("[data-job-functions]").forEach(function (n) {
      n.textContent = j.essential_functions;
    });
    el("dl-wrap").hidden = !j.driving_required;
  }

  async function boot() {
    try {
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
    return {
      full_legal_name: val("full_legal_name"),
      phone: val("phone"),
      email: val("email"),
      city: val("city"),
      zip: val("zip"),
      at_least_18: checked("at_least_18"),
      work_authorized: checked("work_authorized"),
      requires_sponsorship: checked("requires_sponsorship"),
      accepts_starting_pay: checked("accepts_starting_pay"),
      understands_rate_nonnegotiable: checked("understands_rate_nonnegotiable"),
      can_report_earliest_time: checked("can_report_earliest_time"),
      available_full_time: checked("available_full_time"),
      willing_over_40: checked("willing_over_40"),
      understands_ot_rate: checked("understands_ot_rate"),
      understands_ot_not_guaranteed: checked("understands_ot_not_guaranteed"),
      can_work_required_days: checked("can_work_required_days"),
      has_valid_fl_dl: job && job.driving_required ? checked("has_valid_fl_dl") : null,
      reliable_transport: checked("reliable_transport"),
      can_perform_essential_duties: checked("can_perform_essential_duties"),
      accepts_conduct_requirements: checked("accepts_conduct_requirements"),
      agrees_later_screening: checked("agrees_later_screening"),
    };
  }

  async function submitGate(e) {
    e.preventDefault();
    el("careers-error").hidden = true;
    try {
      await req("/api/hiring/applications/" + applicationId + "/gate", {
        method: "PATCH",
        body: JSON.stringify(gateBody()),
      });
      show("step-app");
    } catch (err) {
      fail(err);
    }
  }

  function appBody() {
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
      references: [
        { name: val("ref1_name"), phone: val("ref1_phone"), relationship: val("ref1_rel") },
        { name: val("ref2_name"), phone: val("ref2_phone"), relationship: val("ref2_rel") },
      ],
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
    try {
      await req("/api/hiring/applications/" + applicationId + "/application", {
        method: "PATCH",
        body: JSON.stringify(appBody()),
      });
      show("step-cert");
    } catch (err) {
      fail(err);
    }
  }

  async function submitCert(e) {
    e.preventDefault();
    try {
      var out = await req("/api/hiring/applications/" + applicationId + "/certify", {
        method: "POST",
        body: JSON.stringify({ signature: val("cert_signature"), truthful: checked("truthful") }),
      });
      var local =
        location.hostname === "127.0.0.1" || location.hostname === "localhost";
      location.href = local
        ? "/pages/careers-offer.html#" + encodeURIComponent(out.offer_token)
        : "/careers/offer/" + encodeURIComponent(out.offer_token);
    } catch (err) {
      fail(err);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var g = el("form-gate");
    var a = el("form-app");
    var c = el("form-cert");
    if (g) g.addEventListener("submit", submitGate);
    if (a) a.addEventListener("submit", submitApp);
    if (c) c.addEventListener("submit", submitCert);
    boot();
  });
})();
