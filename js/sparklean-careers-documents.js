(function () {
  var LOCAL = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  var API = "http://127.0.0.1:8787";

  function review() {
    return !LOCAL;
  }

  function resume() {
    return new URLSearchParams(location.search).get("resume") || sessionStorage.getItem("sk_hiring_resume") || "";
  }
  function headers() {
    return { "content-type": "application/json", "x-hiring-resume": resume() };
  }
  async function req(path, opts) {
    if (!LOCAL) throw new Error("Hiring API is not connected in founder review.");
    var res = await fetch(API + path, Object.assign({ credentials: "include", headers: headers() }, opts || {}));
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw Object.assign(new Error(data.error || "failed"), { body: data, status: res.status });
    return data;
  }

  function options(sel, items) {
    sel.innerHTML = items
      .map(function (d) {
        return '<option value="' + d.code + '">' + d.label + "</option>";
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var lists = review()
      ? SparkleanHiringReview.lists
      : await fetch(API + "/api/hiring/i9-lists").then(function (r) {
          return r.json();
        });
    options(document.getElementById("list_a"), lists.list_a);
    options(document.getElementById("list_b"), lists.list_b);
    options(document.getElementById("list_c"), lists.list_c);

    document.querySelectorAll("input[name=i9mode]").forEach(function (r) {
      r.addEventListener("change", function () {
        document.getElementById("wrap-a").hidden = r.value !== "list_a";
        document.getElementById("wrap-bc").hidden = r.value !== "list_b_c";
      });
    });

    document.getElementById("form-i9").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var mode = document.querySelector("input[name=i9mode]:checked").value;
      if (review()) {
        document.getElementById("form-scans").hidden = false;
        var uploadBtn = document.querySelector("#form-scans .btn-gold");
        if (uploadBtn) uploadBtn.hidden = true;
        document.getElementById("scan-inputs").innerHTML =
          "<p class=\"careers-lede\">Review demo: document uploads are disabled. Do not photograph or upload I-9, driver’s-license, or immigration documents.</p>";
        document.getElementById("docs-done").hidden = false;
        document.getElementById("docs-done").textContent =
          "FOUNDER REVIEW complete. No files were uploaded. No applicant record was created. The system does not decide that documents are genuine.";
        return;
      }
      var body =
        mode === "list_a"
          ? { mode: "list_a", list_a: document.getElementById("list_a").value }
          : {
              mode: "list_b_c",
              list_b: document.getElementById("list_b").value,
              list_c: document.getElementById("list_c").value,
            };
      try {
        var out = await req("/api/hiring/applications/me/i9-selection", { method: "POST", body: JSON.stringify(body) });
        document.getElementById("form-scans").hidden = false;
        var box = document.getElementById("scan-inputs");
        box.innerHTML = out.required
          .map(function (p) {
            return (
              '<label class="careers-file">' +
              p.replace(/_/g, " ") +
              ' <input type="file" accept="image/*" capture="environment" data-purpose="' +
              p +
              '" required><span class="scan-status"></span></label>'
            );
          })
          .join("");
      } catch (e) {
        err.hidden = false;
        err.textContent = e.message === "offer_required" ? "Accept the conditional offer before uploading documents." : e.message;
      }
    });

    document.getElementById("form-scans").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      if (review()) return;
      err.hidden = false;
      err.textContent = "Uploads are not enabled in this environment.";
    });
  });
})();
