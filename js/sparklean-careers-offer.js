(function () {
  var LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  var API = "http://127.0.0.1:8787";

  function review() {
    return !LOCAL;
  }

  function tokenFromPath() {
    if (location.hash && location.hash.length > 1) return decodeURIComponent(location.hash.slice(1));
    var q = new URLSearchParams(location.search).get("token");
    if (q) return q;
    var parts = location.pathname.replace(/\/+$/, "").split("/");
    var last = parts[parts.length - 1] || "";
    if (!last || last === "offer" || last.indexOf("careers-offer") === 0) return "";
    return decodeURIComponent(last);
  }

  function setText(sel, value) {
    document.querySelectorAll(sel).forEach(function (n) {
      n.textContent = value;
    });
  }

  function paintReviewOffer() {
    var j = SparkleanHiringReview.job;
    var fmt = SparkleanHiringReview;
    setText("[data-job-title]", j.title);
    setText("[data-job-pay]", fmt.formatPay(j.base_rate_cents));
    setText("[data-job-ot]", fmt.formatPay(j.overtime_rate_cents));
    setText("[data-job-time]", fmt.formatTime(j.earliest_report_local));
    setText("[data-job-days]", fmt.formatDays(j.required_days));
    setText("[data-job-status]", j.full_time ? "Full-time" : "Part-time");
    setText("[data-job-location]", j.reporting_location_label);
    setText(
      "[data-job-driving]",
      j.driving_required
        ? "This position requires driving a company vehicle and a valid Florida driver’s license."
        : "This opening does not require driving a company vehicle."
    );
    var date = document.getElementById("offer-date");
    if (date) {
      date.textContent = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var form = document.getElementById("form-offer");
    var letter = document.getElementById("offer-letter");
    if (review()) {
      if (!window.SparkleanHiringReview) {
        err.hidden = false;
        err.textContent = "This page could not load.";
        form.hidden = true;
        return;
      }
      paintReviewOffer();
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        location.href = "/careers/documents";
      });
      return;
    }
    var token = tokenFromPath();
    try {
      var res = await fetch(API + "/api/hiring/offers/" + encodeURIComponent(token), { credentials: "include" });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || "not_found");
      if (letter) letter.querySelector(".offer-letter-body-fallback").textContent = data.body_text || "";
      if (data.accepted) {
        form.hidden = true;
        document.getElementById("offer-accepted").hidden = false;
      }
    } catch (e) {
      err.hidden = false;
      err.textContent = "This offer link is not valid.";
      form.hidden = true;
      if (letter) letter.hidden = true;
    }
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      err.hidden = true;
      try {
        var res = await fetch(API + "/api/hiring/offers/" + encodeURIComponent(token) + "/accept", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signature: document.getElementById("offer_signature").value }),
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error || "unable");
        var resume = sessionStorage.getItem("sk_hiring_resume") || "";
        location.href = "/pages/careers-documents.html" + (resume ? "?resume=" + encodeURIComponent(resume) : "");
      } catch (e2) {
        err.hidden = false;
        err.textContent = e2.message;
      }
    });
  });
})();
