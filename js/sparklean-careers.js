(function () {
  var hiring = globalThis.SparkleanHiring;

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function duties(job) {
    var lines = String(job.essential_functions || "")
      .split(/\r?\n/)
      .map(function (line) {
        return line.replace(/^[\s•\-]+/, "").trim();
      })
      .filter(Boolean);
    if (!lines.length) return "";
    return (
      '<ul class="careers-duties">' +
      lines
        .map(function (line) {
          return "<li>" + esc(line) + "</li>";
        })
        .join("") +
      "</ul>"
    );
  }
  function overtimeLine(job) {
    if (job.overtime_not_guaranteed && !job.full_time) return "No guaranteed overtime";
    return hiring.formatPay(job.overtime_rate_cents) + " after 40 hours";
  }
  function scheduleLine(job) {
    var days = hiring.formatDays(job.required_days);
    var time = hiring.formatTime(job.earliest_report_local);
    if (job.full_time) return "Full-time · " + days + " · Must consistently report by " + time;
    return "Part-time · " + days + " availability · Shifts may begin at " + time;
  }
  function card(job) {
    var role = job.full_time ? "full-time" : "part-time";
    var href =
      "/careers/apply?job=" +
      encodeURIComponent(job.id) +
      "&role=" +
      encodeURIComponent(role);
    return (
      '<article class="careers-card">' +
      '<p class="careers-kicker">Open role</p>' +
      "<h2>" +
      esc(job.title) +
      "</h2>" +
      '<dl class="careers-dl">' +
      "<div><dt>Starting pay</dt><dd>" +
      hiring.formatPay(job.base_rate_cents) +
      "</dd></div>" +
      "<div><dt>Overtime</dt><dd>" +
      overtimeLine(job) +
      "</dd></div>" +
      "<div><dt>Schedule</dt><dd>" +
      scheduleLine(job) +
      "</dd></div>" +
      "<div><dt>Reporting location</dt><dd>" +
      esc(job.reporting_location_label || "Southwest Florida") +
      "</dd></div>" +
      "<div><dt>Driving</dt><dd>" +
      (job.driving_required
        ? "Valid Florida driver’s license and reliable transportation"
        : "This opening does not require driving.") +
      "</dd></div>" +
      "</dl>" +
      duties(job) +
      '<div class="careers-actions"><a class="btn-gold" href="' +
      href +
      '">Begin application</a></div>' +
      "</article>"
    );
  }

  function setJobPosting(jobs) {
    var existing = document.getElementById("careers-jobposting");
    if (existing) existing.remove();
    if (!jobs.length) return;
    function node(job) {
      var graph = {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.essential_functions || "Supervised residential cleaning with Sparklean Cleaning in Southwest Florida.",
        identifier: { "@type": "PropertyValue", name: "Sparklean Cleaning", value: job.id },
        hiringOrganization: {
          "@type": "Organization",
          name: "Sparklean Cleaning",
          sameAs: "https://www.sparklean.co/",
          url: "https://www.sparklean.co/",
        },
        jobLocation: {
          "@type": "Place",
          address: {
            "@type": "PostalAddress",
            addressRegion: "FL",
            addressCountry: "US",
            addressLocality: job.reporting_location_label || "Southwest Florida",
          },
        },
        employmentType: job.full_time ? "FULL_TIME" : "PART_TIME",
        baseSalary: {
          "@type": "MonetaryAmount",
          currency: "USD",
          value: { "@type": "QuantitativeValue", value: Number(job.base_rate_cents) / 100, unitText: "HOUR" },
        },
        directApply: true,
        url: "https://www.sparklean.co/careers/apply?job=" + encodeURIComponent(job.id),
      };
      var posted = job.posted_at || job.created_at || job.date_posted;
      if (posted) graph.datePosted = String(posted).slice(0, 10);
      return graph;
    }
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "careers-jobposting";
    script.textContent = JSON.stringify(jobs.length === 1 ? node(jobs[0]) : { "@context": "https://schema.org", "@graph": jobs.map(node) });
    document.head.appendChild(script);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var root = document.getElementById("opening-card");
    var empty = document.getElementById("careers-empty");
    var err = document.getElementById("careers-error");
    if (!root || !hiring) return;
    if (empty) empty.hidden = true;
    root.hidden = false;
    try {
      var data = await hiring.req("/api/hiring/openings");
      var openings = Array.isArray(data.openings) ? data.openings : [];
      if (!openings.length) return;
      root.innerHTML = openings.map(card).join("");
      setJobPosting(openings);
    } catch (e) {
      if (err) {
        err.hidden = false;
        err.textContent = "Live application start is temporarily unavailable. The openings below are still current.";
      }
    }
  });
})();
