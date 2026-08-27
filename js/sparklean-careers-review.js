/**
 * Production founder-review demo. Never calls api.sparklean.co.
 * Localhost still uses the Sparklean OS hiring API.
 */
(function (global) {
  var NOTICE =
    "Based on the answers provided, you do not currently meet one or more minimum requirements for this position. Sparklean applies the same job-related requirements to every applicant. If your eligibility or availability changes, you may submit a new application.";

  var job = {
    id: "review-demo",
    title: "Residential Cleaner",
    reporting_location_label: "Southwest Florida reporting location assigned by Sparklean",
    earliest_report_local: "07:00",
    required_days: ["mon", "tue", "wed", "thu", "fri"],
    full_time: true,
    driving_required: true,
    base_rate_cents: 1800,
    overtime_rate_cents: 2700,
    essential_functions:
      "Stand, walk, bend, reach, and clean bathrooms, kitchens, and living areas for a full shift; lift up to 25 pounds; use Sparklean products and equipment; communicate with the assigned team and office; and drive a company vehicle when the opening requires it.",
  };

  var lists = {
    list_a: [
      { code: "us_passport", label: "U.S. Passport or U.S. Passport Card" },
      { code: "permanent_resident_card", label: "Permanent Resident Card or Alien Registration Receipt Card (Form I-551)" },
      { code: "foreign_passport_i551", label: "Foreign passport with a temporary I-551 stamp or printed notation on a machine-readable immigrant visa" },
      { code: "ead_i766", label: "Employment Authorization Document that contains a photograph (Form I-766)" },
      {
        code: "foreign_passport_i94",
        label: "Foreign passport with Form I-94 or Form I-94A containing an endorsement of the nonimmigrant status and work authorization",
      },
      {
        code: "fsm_rmi_passport",
        label: "Passport from the Federated States of Micronesia or the Republic of the Marshall Islands with Form I-94 or Form I-94A",
      },
    ],
    list_b: [
      { code: "state_dl", label: "Driver’s license or ID card issued by a U.S. state or outlying possession, with a photograph or identifying information" },
      { code: "government_id", label: "ID card issued by a federal, state, or local government agency, with a photograph or identifying information" },
      { code: "school_id", label: "School ID card with a photograph" },
      { code: "voter_card", label: "Voter’s registration card" },
      { code: "us_military", label: "U.S. military card or draft record" },
      { code: "military_dependent", label: "Military dependent’s ID card" },
      { code: "merchant_mariner", label: "U.S. Coast Guard Merchant Mariner Card" },
      { code: "tribal_b", label: "Native American tribal document" },
      { code: "canadian_dl", label: "Driver’s license issued by a Canadian government authority" },
    ],
    list_c: [
      { code: "ssn_card", label: "U.S. Social Security card (unrestricted)" },
      { code: "dos_birth", label: "Certification of report of birth issued by the U.S. Department of State (Forms DS-1350, FS-545, or FS-240)" },
      { code: "birth_certificate", label: "Original or certified copy of a birth certificate issued by a U.S. state, county, municipal authority, or territory, bearing an official seal" },
      { code: "tribal_c", label: "Native American tribal document" },
      { code: "i197", label: "U.S. Citizen ID Card (Form I-197)" },
      { code: "i179", label: "Identification Card for Use of Resident Citizen in the United States (Form I-179)" },
      { code: "dhs_employment_auth", label: "Employment authorization document issued by the Department of Homeland Security (other than Form I-766)" },
    ],
  };

  var DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

  function isReviewMode() {
    return document.body.classList.contains("founder-demo");
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
    var h12 = h % 12 || 12;
    return h12 + ":" + m + " " + ap;
  }

  function formatDays(days) {
    var list = Array.isArray(days) ? days : [];
    var key = list.map(function (d) {
      return String(d).toLowerCase().slice(0, 3);
    });
    if (key.join(",") === "mon,tue,wed,thu,fri") return "Monday through Friday";
    return list
      .map(function (d) {
        var k = String(d).toLowerCase().slice(0, 3);
        return DAY_NAMES[k] || d;
      })
      .join(", ");
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function gatesPass(answers) {
    if (!answers.full_legal_name || !answers.phone || !emailOk(answers.email) || !answers.city || !answers.zip) return false;
    if (!answers.at_least_18 || !answers.work_authorized || answers.requires_sponsorship) return false;
    if (!answers.confirm_package) return false;
    if (!answers.has_valid_fl_dl || !answers.reliable_transport) return false;
    if (!answers.can_perform_essential_duties || !answers.accepts_conduct_requirements) return false;
    return true;
  }

  function fill(id, value) {
    var n = document.getElementById(id);
    if (!n) return;
    n.value = value;
    n.setAttribute("value", value);
    n.dispatchEvent(new Event("input", { bubbles: true }));
    n.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function check(id, on) {
    var n = document.getElementById(id);
    if (n) n.checked = !!on;
  }

  function fillTestApplicant() {
    fill("full_legal_name", "Jordan Hale");
    fill("phone", "2395550100");
    fill("email", "jordan.hale.review@sparklean.invalid");
    fill("city", "Naples");
    fill("zip", "34102");
    ["at_least_18", "work_authorized", "confirm_package", "has_valid_fl_dl", "reliable_transport", "can_perform_essential_duties", "accepts_conduct_requirements", "truthful"].forEach(
      function (id) {
        check(id, true);
      }
    );
    var no = document.querySelector('input[name="sponsorship"][value="no"]');
    if (no) no.checked = true;
    fill("employer", "Coastal Home Services");
    fill("role_title", "Housekeeper");
    fill("started_on", "2024-01-01");
    fill("ended_on", "2026-01-01");
    fill("reason_for_leaving", "Seeking a supervised full-time cleaning role");
    check("cleaning_experience", true);
    check("residential_experience", true);
    fill("languages", "English");
    fill("ref1_name", "Alex Rivera");
    fill("ref1_phone", "(239) 555-0101");
    fill("ref1_rel", "Former supervisor");
    fill("earliest_start_date", "2026-09-08");
    fill("q_locked_room", "I do not enter the room and I call the Sparklean office.");
    fill("q_skip_request", "I keep the work order and call the office.");
    fill("q_damage", "I report it immediately and do not hide it.");
    fill("cert_signature", "Jordan Hale");
    fill("offer_signature", "Jordan Hale");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var badge = document.querySelector(".careers-demo-badge");
    if (badge) badge.hidden = !isReviewMode();
  });

  global.SparkleanHiringReview = {
    isReviewMode: isReviewMode,
    job: job,
    notice: NOTICE,
    lists: lists,
    gatesPass: gatesPass,
    fillTestApplicant: fillTestApplicant,
    formatPay: formatPay,
    formatTime: formatTime,
    formatDays: formatDays,
    money: money,
  };
})(window);
