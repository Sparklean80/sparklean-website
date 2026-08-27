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

  function setMode(mode) {
    document.getElementById("wrap-a").hidden = mode !== "list_a";
    document.getElementById("wrap-bc").hidden = mode !== "list_b_c";
    document.querySelectorAll(".docs-mode").forEach(function (btn) {
      btn.classList.toggle("is-selected", btn.getAttribute("data-i9-mode") === mode);
    });
    var radio = document.querySelector('input[name="i9mode"][value="' + mode + '"]');
    if (radio) radio.checked = true;
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
    setMode("list_a");

    document.querySelectorAll(".docs-mode").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setMode(btn.getAttribute("data-i9-mode"));
      });
    });

    document.getElementById("form-i9").addEventListener("submit", async function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var mode = document.querySelector("input[name=i9mode]:checked").value;
      if (review()) {
        document.getElementById("docs-done").hidden = false;
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
        await req("/api/hiring/applications/me/i9-selection", { method: "POST", body: JSON.stringify(body) });
        document.getElementById("docs-done").hidden = false;
      } catch (e) {
        err.hidden = false;
        err.textContent = e.message === "offer_required" ? "Accept the conditional offer before choosing documents." : e.message;
      }
    });
  });
})();
