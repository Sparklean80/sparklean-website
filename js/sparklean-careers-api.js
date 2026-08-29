/**
 * Public Sparklean hiring client. Talks only to the live Sparklean OS API.
 * Identity files are captured on api.sparklean.co, never on this origin.
 */
(function (global) {
  var API = "https://api.sparklean.co";
  var TOKEN_KEY = "sk_hiring_resume";
  var APP_ID_KEY = "sk_hiring_app";
  var JOB_ID_KEY = "sk_hiring_job";
  var DAY_NAMES = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };
  var REJECTION_NOTICE =
    "Based on the answers provided, you do not currently meet one or more minimum requirements for this position. Sparklean applies the same job-related requirements to every applicant. If your eligibility or availability changes, you may submit a new application.";

  function token() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }
  function setToken(value) {
    if (value) sessionStorage.setItem(TOKEN_KEY, value);
  }
  function applicationId() {
    return sessionStorage.getItem(APP_ID_KEY) || "";
  }
  function setApplication(id, jobId) {
    if (id) sessionStorage.setItem(APP_ID_KEY, id);
    if (jobId) sessionStorage.setItem(JOB_ID_KEY, jobId);
  }
  function storedJobId() {
    return sessionStorage.getItem(JOB_ID_KEY) || "";
  }
  function clearSession() {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(APP_ID_KEY);
    sessionStorage.removeItem(JOB_ID_KEY);
  }
  function headers(extra) {
    var h = { "content-type": "application/json" };
    var resume = extra && extra.resume != null ? extra.resume : token();
    if (resume) h["x-hiring-resume"] = resume;
    return h;
  }
  async function req(path, opts) {
    var options = opts || {};
    var res = await fetch(API + path, {
      method: options.method || "GET",
      credentials: "include",
      headers: headers({ resume: options.resume }),
      body: options.body,
    });
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
  function tokenFromPath(kind) {
    var parts = location.pathname.replace(/\/+$/, "").split("/");
    var idx = parts.indexOf(kind);
    if (idx >= 0 && parts[idx + 1] && parts[idx + 1].indexOf("careers-") !== 0) {
      return decodeURIComponent(parts[idx + 1]);
    }
    var q = new URLSearchParams(location.search);
    return q.get("token") || q.get("resume") || "";
  }
  function money(cents) {
    return "$" + (Number(cents) / 100).toFixed(2);
  }
  function formatPay(cents) {
    return money(cents) + " per hour";
  }
  function formatTime(local) {
    var parts = String(local || "").split(":");
    var h = parseInt(parts[0], 10);
    if (isNaN(h)) return String(local || "");
    var m = parts[1] ? String(parts[1]).padStart(2, "0") : "00";
    var ap = h >= 12 ? "PM" : "AM";
    return (h % 12 || 12) + ":" + m + " " + ap;
  }
  function formatDays(days) {
    var list = Array.isArray(days) ? days : [];
    var key = list.map(function (d) {
      return String(d).toLowerCase().slice(0, 3);
    });
    if (key.join(",") === "mon,tue,wed,thu,fri") return "Monday through Friday";
    return list
      .map(function (d) {
        return DAY_NAMES[String(d).toLowerCase().slice(0, 3)] || d;
      })
      .join(", ");
  }
  function fillJob(job) {
    if (!job) return;
    document.querySelectorAll("[data-job-title]").forEach(function (n) {
      n.textContent = job.title;
    });
    document.querySelectorAll("[data-job-pay]").forEach(function (n) {
      n.textContent = formatPay(job.base_rate_cents);
    });
    document.querySelectorAll("[data-job-ot]").forEach(function (n) {
      n.textContent = formatPay(job.overtime_rate_cents);
    });
    document.querySelectorAll("[data-job-time]").forEach(function (n) {
      n.textContent = formatTime(job.earliest_report_local);
    });
    document.querySelectorAll("[data-job-days]").forEach(function (n) {
      n.textContent = formatDays(job.required_days);
    });
    document.querySelectorAll("[data-job-status]").forEach(function (n) {
      n.textContent = job.full_time ? "Full-time" : "Part-time";
    });
    document.querySelectorAll("[data-job-location]").forEach(function (n) {
      n.textContent = job.reporting_location_label || "Assigned by Sparklean";
    });
    document.querySelectorAll("[data-job-driving]").forEach(function (n) {
      n.textContent = job.driving_required
        ? "This position requires driving a company vehicle and a valid Florida driver’s license."
        : "This opening does not require driving a company vehicle.";
    });
    document.querySelectorAll("[data-job-functions]").forEach(function (n) {
      n.textContent = job.essential_functions || "";
    });
  }
  function onboardingUrl(resume) {
    return API + "/hiring/onboarding/" + encodeURIComponent(resume);
  }
  function isStorageError(err) {
    return err && (err.status === 503 || (err.body && err.body.error === "storage_not_configured"));
  }

  global.SparkleanHiring = {
    API: API,
    TOKEN_KEY: TOKEN_KEY,
    APP_ID_KEY: APP_ID_KEY,
    JOB_ID_KEY: JOB_ID_KEY,
    REJECTION_NOTICE: REJECTION_NOTICE,
    token: token,
    setToken: setToken,
    applicationId: applicationId,
    setApplication: setApplication,
    storedJobId: storedJobId,
    clearSession: clearSession,
    req: req,
    tokenFromPath: tokenFromPath,
    formatPay: formatPay,
    formatTime: formatTime,
    formatDays: formatDays,
    fillJob: fillJob,
    onboardingUrl: onboardingUrl,
    isStorageError: isStorageError,
  };
})(window);
