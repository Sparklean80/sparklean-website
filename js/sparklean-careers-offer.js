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

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var pre = document.getElementById("offer-body");
    var form = document.getElementById("form-offer");
    if (review()) {
      if (!window.SparkleanHiringReview) {
        err.hidden = false;
        err.textContent = "Review demo failed to load.";
        form.hidden = true;
        return;
      }
      pre.textContent = SparkleanHiringReview.offerText;
      var fill = document.getElementById("fill-test-applicant");
      if (fill) {
        fill.hidden = false;
        fill.addEventListener("click", function () {
          SparkleanHiringReview.fillTestApplicant();
        });
      }
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
      pre.textContent = data.body_text;
      if (data.accepted) {
        form.hidden = true;
        document.getElementById("offer-accepted").hidden = false;
      }
    } catch (e) {
      err.hidden = false;
      err.textContent = "This offer link is not valid.";
      form.hidden = true;
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
        var local = location.hostname === "127.0.0.1" || location.hostname === "localhost";
        var docs = local ? "/pages/careers-documents.html" : "/careers/documents";
        location.href = docs + (resume ? "?resume=" + encodeURIComponent(resume) : "");
      } catch (e2) {
        err.hidden = false;
        err.textContent = e2.message;
      }
    });
  });
})();
