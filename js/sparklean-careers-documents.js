(function () {
  var API =
    location.hostname === "127.0.0.1" || location.hostname === "localhost"
      ? "http://127.0.0.1:8787"
      : "https://api.sparklean.co";

  function resume() {
    return new URLSearchParams(location.search).get("resume") || sessionStorage.getItem("sk_hiring_resume") || "";
  }
  function headers() {
    return { "content-type": "application/json", "x-hiring-resume": resume() };
  }
  async function req(path, opts) {
    var res = await fetch(API + path, Object.assign({ credentials: "include", headers: headers() }, opts || {}));
    var data = await res.json().catch(function () {
      return {};
    });
    if (!res.ok) throw Object.assign(new Error(data.error || "failed"), { body: data, status: res.status });
    return data;
  }

  function qualityMessage(code) {
    if (code === "blur") return "That image looks too blurry. Retake in better light.";
    if (code === "glare") return "That image has too much glare. Retake without flash bouncing off the card.";
    if (code === "cropped_or_tiny") return "The document edges look cropped. Fill the frame and retake.";
    if (code === "too_small") return "The file is too small. Use the phone camera, not a screenshot thumbnail.";
    return "Please retake that photo.";
  }

  async function uploadFile(purpose, file, statusEl) {
    var signed = await req("/api/hiring/applications/me/documents/upload-url", {
      method: "POST",
      body: JSON.stringify({ purpose: purpose }),
    });
    var put = await fetch(signed.url, { method: "PUT", body: file });
    if (!put.ok) throw new Error("upload_failed");
    try {
      await req("/api/hiring/applications/me/documents/complete", {
        method: "POST",
        body: JSON.stringify({ purpose: purpose, key: signed.key }),
      });
      statusEl.textContent = "Accepted.";
    } catch (err) {
      statusEl.textContent = qualityMessage(err.body && err.body.code);
      throw err;
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var lists = await fetch(API + "/api/hiring/i9-lists").then(function (r) {
      return r.json();
    });
    function options(sel, items) {
      sel.innerHTML = items
        .map(function (d) {
          return '<option value="' + d.code + '">' + d.label + "</option>";
        })
        .join("");
    }
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
      var inputs = document.querySelectorAll("#form-scans input[type=file]");
      try {
        for (var i = 0; i < inputs.length; i++) {
          var input = inputs[i];
          if (!input.files[0]) continue;
          var status = input.parentElement.querySelector(".scan-status");
          await uploadFile(input.getAttribute("data-purpose"), input.files[0], status);
        }
        document.getElementById("docs-done").hidden = false;
      } catch (e) {
        err.hidden = false;
        err.textContent = (e.body && e.body.code && qualityMessage(e.body.code)) || "Upload could not be completed. Retake and try again.";
      }
    });
  });
})();
