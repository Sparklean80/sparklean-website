(function () {
  var hiring = globalThis.SparkleanHiring;

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }
  function card(job) {
    var pay = hiring.formatPay(job.base_rate_cents);
    var ot = hiring.formatPay(job.overtime_rate_cents);
    var days = hiring.formatDays(job.required_days);
    var time = hiring.formatTime(job.earliest_report_local);
    var status = job.full_time ? "Full-time" : "Part-time";
    var href = "/careers/apply?job=" + encodeURIComponent(job.id);
    return (
      '<article class="careers-card">' +
      '<p class="careers-kicker">Open role</p>' +
      "<h2>" +
      esc(job.title) +
      "</h2>" +
      '<p class="careers-card-note">A supervised Sparklean cleaning role. Pay, schedule, and driving requirements are set by the published opening.</p>' +
      '<dl class="careers-dl">' +
      "<div><dt>Starting pay</dt><dd>" +
      pay +
      "</dd></div>" +
      "<div><dt>Overtime</dt><dd>" +
      ot +
      " when hours exceed 40</dd></div>" +
      "<div><dt>Schedule</dt><dd>" +
      status +
      " · " +
      days +
      " · report by " +
      time +
      "</dd></div>" +
      "<div><dt>Reporting location</dt><dd>" +
      esc(job.reporting_location_label || "Assigned by Sparklean") +
      "</dd></div>" +
      "<div><dt>Driving</dt><dd>" +
      (job.driving_required
        ? "Valid Florida driver’s license required"
        : "This opening does not require driving a company vehicle.") +
      "</dd></div>" +
      "</dl>" +
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
    try {
      var data = await hiring.req("/api/hiring/openings");
      var openings = Array.isArray(data.openings) ? data.openings : [];
      root.innerHTML = "";
      if (!openings.length) {
        root.hidden = true;
        if (empty) empty.hidden = false;
        return;
      }
      root.hidden = false;
      if (empty) empty.hidden = true;
      root.innerHTML = openings.map(card).join("");
      setJobPosting(openings);
    } catch (e) {
      root.innerHTML = "";
      root.hidden = true;
      if (err) {
        err.hidden = false;
        err.textContent = "Current openings could not be loaded. Please try again shortly.";
      }
    }
  });
})();
