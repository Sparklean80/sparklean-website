(function () {
  var hiring = globalThis.SparkleanHiring;

  function options(sel, items) {
    sel.innerHTML = (items || [])
      .map(function (d) {
        return '<option value="' + d.code + '">' + d.label + "</option>";
      })
      .join("");
  }
  function setMode(mode) {
    document.getElementById("wrap-a").hidden = mode !== "list_a";
    document.getElementById("wrap-bc").hidden = mode !== "list_b_c";
    document.querySelectorAll(".docs-mode").forEach(function (btn) {
      btn.classList.toggle("is-selected", btn.getAttribute("data-i9-mode") === mode);
    });
    var radio = document.querySelector('input[name="i9mode"][value="' + mode + '"]');
    if (radio) radio.checked = true;
  }
  function showStorageUnavailable() {
    var box = document.getElementById("docs-storage");
    if (box) box.hidden = false;
    var capture = document.getElementById("docs-capture");
    if (capture) capture.hidden = true;
  }
  function showCapture(resume) {
    var box = document.getElementById("docs-capture");
    var link = document.getElementById("docs-onboarding");
    if (link) link.href = hiring.onboardingUrl(resume);
    if (box) box.hidden = false;
    var storage = document.getElementById("docs-storage");
    if (storage) storage.hidden = true;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var err = document.getElementById("careers-error");
    var form = document.getElementById("form-i9");
    var resume = hiring ? hiring.tokenFromPath("documents") || hiring.token() : "";
    if (resume) hiring.setToken(resume);
    if (!resume) {
      form.hidden = true;
      err.hidden = false;
      err.textContent = "This document link is not valid.";
      return;
    }

    try {
      var lists = await hiring.req("/api/hiring/i9-lists");
      options(document.getElementById("list_a"), lists.list_a);
      options(document.getElementById("list_b"), lists.list_b);
      options(document.getElementById("list_c"), lists.list_c);
      var status = await hiring.req("/api/hiring/documents/status", { resume: resume });
      if (status.i9_selection) {
        setMode(status.i9_selection.mode);
        if (status.i9_selection.mode === "list_a") {
          document.getElementById("list_a").value = status.i9_selection.list_a;
        } else {
          document.getElementById("list_b").value = status.i9_selection.list_b;
          document.getElementById("list_c").value = status.i9_selection.list_c;
        }
        document.getElementById("docs-done").hidden = false;
        try {
          await hiring.req("/api/hiring/documents/capture-session", {
            method: "POST",
            resume: resume,
            body: JSON.stringify({ lane: "i9" }),
          });
          showCapture(resume);
        } catch (storageErr) {
          if (hiring.isStorageError(storageErr)) showStorageUnavailable();
          else showCapture(resume);
        }
      } else {
        setMode("list_a");
      }
    } catch (e) {
      form.hidden = true;
      err.hidden = false;
      err.textContent =
        e.status === 401 || e.status === 404 || e.message === "not_found"
          ? "This document link is not valid."
          : e.message === "offer_required"
            ? "Accept the conditional offer before choosing documents."
            : e.message;
      return;
    }

    document.querySelectorAll(".docs-mode").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-i9-mode"));
      });
    });

    form.addEventListener("submit", async function (ev) {
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
        await hiring.req("/api/hiring/applications/me/i9-selection", {
          method: "POST",
          resume: resume,
          body: JSON.stringify(body),
        });
        document.getElementById("docs-done").hidden = false;
        try {
          await hiring.req("/api/hiring/documents/capture-session", {
            method: "POST",
            resume: resume,
            body: JSON.stringify({ lane: "i9" }),
          });
          showCapture(resume);
        } catch (storageErr) {
          if (hiring.isStorageError(storageErr)) showStorageUnavailable();
          else throw storageErr;
        }
      } catch (e2) {
        if (hiring.isStorageError(e2)) {
          document.getElementById("docs-done").hidden = false;
          showStorageUnavailable();
          return;
        }
        err.hidden = false;
        err.textContent = e2.message === "offer_required" ? "Accept the conditional offer before choosing documents." : e2.message;
      }
    });
  });
})();
