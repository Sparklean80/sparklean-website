(function () {
  var hiring = globalThis.SparkleanHiring;

  function setText(sel, value) {
    document.querySelectorAll(sel).forEach(function (n) {
      n.textContent = value;
    });
  }
  function hideOffer() {
    var letter = document.getElementById("offer-letter");
    var form = document.getElementById("form-offer");
    if (letter) letter.hidden = true;
    if (form) form.hidden = true;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var form = document.getElementById("form-offer");
    var letter = document.getElementById("offer-letter");
    var accepted = document.getElementById("offer-accepted");
    var token = hiring ? hiring.tokenFromPath("offer") : "";
    if (!token) {
      hideOffer();
      err.hidden = false;
      err.textContent = "This offer link is not valid.";
      return;
    }
    try {
      var data = await hiring.req("/api/hiring/offers/" + encodeURIComponent(token));
      if (data.job) hiring.fillJob(data.job);
      if (letter && data.body_text) {
        var fallback = letter.querySelector(".offer-letter-body-fallback");
        if (fallback) fallback.textContent = data.body_text;
      }
      var date = document.getElementById("offer-date");
      if (date) {
        date.textContent = new Intl.DateTimeFormat("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }).format(new Date());
      }
      if (data.accepted) {
        form.hidden = true;
        accepted.hidden = false;
      }
    } catch (e) {
      hideOffer();
      err.hidden = false;
      err.textContent = "This offer link is not valid.";
      return;
    }
    form.addEventListener("submit", async function (ev) {
      ev.preventDefault();
      err.hidden = true;
      try {
        var out = await hiring.req("/api/hiring/offers/" + encodeURIComponent(token) + "/accept", {
          method: "POST",
          body: JSON.stringify({ signature: document.getElementById("offer_signature").value }),
        });
        if (out.onboarding_url && String(out.onboarding_url).indexOf("https://api.sparklean.co/") === 0) {
          location.href = out.onboarding_url;
          return;
        }
        var resume = hiring.token() || token;
        location.href = "/careers/documents/" + encodeURIComponent(resume);
      } catch (e2) {
        err.hidden = false;
        err.textContent = e2.message === "already_accepted" ? "This offer has already been accepted." : e2.message;
      }
    });
  });
})();
