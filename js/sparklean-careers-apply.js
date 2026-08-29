(function () {
  var hiring = globalThis.SparkleanHiring;
  var PROGRESS = ["step-jobs", "step-gate", "step-app", "step-review"];
  var job = null;
  var applicationId = "";

  function el(id) {
    return document.getElementById(id);
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
  function setText(id, value) {
    var n = el(id);
    if (n) n.textContent = value || "—";
  }
  function show(id) {
    document.querySelectorAll("[data-careers-step]").forEach(function (n) {
      n.classList.add("careers-hidden");
    });
    var node = el(id);
    if (node) node.classList.remove("careers-hidden");
    var progress = document.querySelector(".careers-progress");
    if (progress) progress.hidden = id === "step-rejected" || id === "step-empty" || id === "step-done";
    var visual = id === "step-scenarios" ? "step-app" : id;
    var idx = PROGRESS.indexOf(visual);
    document.querySelectorAll(".careers-progress li").forEach(function (item, i) {
      item.classList.toggle("is-current", i === idx);
      item.classList.toggle("is-complete", idx > i);
    });
    if (id === "step-review") paintReview();
    var err = el("careers-error");
    if (err && (id === "step-rejected" || id === "step-empty" || id === "step-done")) err.hidden = true;
  }
  function fail(err) {
    if (err && err.body && err.body.notice) {
      show("step-rejected");
      return;
    }
    var box = el("careers-error");
    if (!box) return;
    box.hidden = false;
    box.textContent = (err && err.message) || "Unable to continue.";
  }
  function paintReview() {
    setText("review-name", val("full_legal_name"));
    setText("review-contact", [val("phone"), val("email")].filter(Boolean).join(" · "));
    setText("review-location", [val("city"), val("zip")].filter(Boolean).join(", "));
    setText("review-employer", [val("role_title"), val("employer")].filter(Boolean).join(" at "));
    var start = val("earliest_start_date");
    if (start && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
      start = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(
        new Date(start + "T12:00:00")
      );
    }
    setText("review-start", start);
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
      agrees_later_screening: checked("agrees_later_screening"),
    };
  }
  function appBody() {
    var refs = [{ name: val("ref1_name"), phone: val("ref1_phone"), relationship: val("ref1_rel") }];
    if (val("ref2_name") && val("ref2_phone") && val("ref2_rel")) {
      refs.push({ name: val("ref2_name"), phone: val("ref2_phone"), relationship: val("ref2_rel") });
    }
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
  function jobIdFromQuery() {
    return new URLSearchParams(location.search).get("job") || "";
  }
  function paintJobs(openings) {
    var list = el("apply-job-list");
    if (!list) return;
    list.innerHTML = openings
      .map(function (row) {
        return (
          '<article class="careers-card">' +
          "<h3>" +
          row.title.replace(/[&<>"']/g, "") +
          "</h3>" +
          '<p class="careers-card-note">' +
          hiring.formatPay(row.base_rate_cents) +
          " · " +
          (row.full_time ? "Full-time" : "Part-time") +
          "</p>" +
          '<div class="careers-actions"><button class="btn-gold" type="button" data-select-job="' +
          row.id +
          '">Apply for this position</button></div>' +
          "</article>"
        );
      })
      .join("");
    list.querySelectorAll("[data-select-job]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var chosen = openings.filter(function (row) {
          return row.id === btn.getAttribute("data-select-job");
        })[0];
        if (chosen) startJob(chosen);
      });
    });
  }
  async function startJob(selected) {
    job = selected;
    hiring.fillJob(job);
    var dl = el("dl-wrap");
    if (dl) dl.hidden = !job.driving_required;
    if (hiring.token() && hiring.storedJobId() && hiring.storedJobId() !== job.id) {
      hiring.clearSession();
    }
    if (!hiring.token()) {
      var started = await hiring.req("/api/hiring/applications", {
        method: "POST",
        body: JSON.stringify({ job_id: job.id }),
      });
      hiring.setToken(started.resume_token);
      hiring.setApplication(started.application_id, job.id);
      applicationId = started.application_id;
    } else {
      applicationId = hiring.applicationId() || "me";
    }
    if (history.replaceState) {
      history.replaceState({}, "", "/careers/apply?job=" + encodeURIComponent(job.id));
    }
    show("step-gate");
  }
  async function boot() {
    try {
      if (!hiring) throw new Error("This page could not load.");
      var data = await hiring.req("/api/hiring/openings");
      var openings = Array.isArray(data.openings) ? data.openings : [];
      var wanted = jobIdFromQuery();
      var selected = wanted
        ? openings.filter(function (row) {
            return row.id === wanted;
          })[0]
        : openings.length === 1
          ? openings[0]
          : null;
      if (!openings.length) {
        show("step-empty");
        return;
      }
      if (!selected) {
        paintJobs(openings);
        show("step-jobs");
        return;
      }
      await startJob(selected);
    } catch (err) {
      fail(err);
    }
  }
  async function submitGate(e) {
    e.preventDefault();
    el("careers-error").hidden = true;
    try {
      if (!radio("sponsorship")) {
        fail({ message: "Please answer the sponsorship question." });
        return;
      }
      await hiring.req("/api/hiring/applications/" + applicationId + "/gate", {
        method: "PATCH",
        body: JSON.stringify(Object.assign({ agrees_later_screening: checked("agrees_later_screening") }, gateBody())),
      });
      show("step-app");
    } catch (err) {
      fail(err);
    }
  }
  function submitApp(e) {
    e.preventDefault();
    show("step-scenarios");
  }
  function submitScenarios(e) {
    e.preventDefault();
    show("step-review");
  }
  async function submitReview(e) {
    e.preventDefault();
    el("careers-error").hidden = true;
    try {
      await hiring.req("/api/hiring/applications/" + applicationId + "/application", {
        method: "PATCH",
        body: JSON.stringify(appBody()),
      });
      var out = await hiring.req("/api/hiring/applications/" + applicationId + "/certify", {
        method: "POST",
        body: JSON.stringify({ signature: val("cert_signature"), truthful: checked("truthful") }),
      });
      setText("confirm-reference", hiring.applicationId() || applicationId);
      var offer = el("confirm-offer");
      if (offer && out.offer_token) {
        offer.hidden = false;
        offer.setAttribute("href", "/careers/offer/" + encodeURIComponent(out.offer_token));
      }
      show("step-done");
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
    boot();
  });
})();
