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
      "Stand, walk, bend, reach, and clean bathrooms, kitchens, floors, and living areas for a full shift; lift up to 25 pounds; use Sparklean products and equipment; communicate with the assigned team and office; drive a company vehicle when the opening requires it.",
  };

  var offerText = [
    "FOUNDER REVIEW — TEST DATA ONLY.",
    "THIS IS NOT A REAL CONDITIONAL OFFER. It creates no employment relationship and is not sent by email.",
    "",
    "Sparklean Cleaning — Conditional offer of employment (review sample)",
    "",
    "Position: Residential Cleaner",
    "Starting pay: $18.00 per hour. This starting rate is nonnegotiable.",
    "Overtime: $27.00 per hour for compensable hours over 40 in Sparklean’s established workweek.",
    "Overtime may be required during scheduled busy weeks and is not guaranteed.",
    "Status: Full-time",
    "Earliest reporting time: 7:00 AM",
    "Required days: Monday through Friday",
    "Reporting location: Southwest Florida reporting location assigned by Sparklean",
    "Driving: This position requires driving a company vehicle and a valid Florida driver’s license.",
    "",
    "Employment is at-will.",
    "This sample is for founder review of the funnel only.",
    "Offer template version: 2026-08-27.1-review",
  ].join("\n");

  var lists = {
    list_a: [
      { code: "us_passport", label: "U.S. Passport or U.S. Passport Card" },
      { code: "permanent_resident_card", label: "Permanent Resident Card (Form I-551)" },
      { code: "ead_i766", label: "Employment Authorization Document (Form I-766)" },
    ],
    list_b: [{ code: "state_dl", label: "Driver’s license or ID card issued by a U.S. state or outlying possession" }],
    list_c: [{ code: "ssn_card", label: "Social Security account number card (unrestricted)" }],
  };

  function isReviewMode() {
    return location.hostname !== "127.0.0.1" && location.hostname !== "localhost";
  }

  function emailOk(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function gatesPass(answers) {
    if (!answers.full_legal_name || !answers.phone || !emailOk(answers.email) || !answers.city || !answers.zip) return false;
    if (!answers.at_least_18 || !answers.work_authorized || answers.requires_sponsorship) return false;
    if (!answers.accepts_starting_pay || !answers.understands_rate_nonnegotiable) return false;
    if (!answers.can_report_earliest_time || !answers.available_full_time || !answers.willing_over_40) return false;
    if (!answers.understands_ot_rate || !answers.understands_ot_not_guaranteed || !answers.can_work_required_days) return false;
    if (!answers.has_valid_fl_dl || !answers.reliable_transport) return false;
    if (!answers.can_perform_essential_duties || !answers.accepts_conduct_requirements || !answers.agrees_later_screening) {
      return false;
    }
    return true;
  }

  function fill(id, value) {
    var n = document.getElementById(id);
    if (n) n.value = value;
  }
  function check(id, on) {
    var n = document.getElementById(id);
    if (n) n.checked = !!on;
  }

  function fillTestApplicant() {
    fill("full_legal_name", "TEST APPLICANT — NOT A REAL APPLICATION");
    fill("phone", "2395550100");
    fill("email", "test.applicant.review@sparklean.invalid");
    fill("city", "TEST CITY");
    fill("zip", "34102");
    [
      "at_least_18",
      "work_authorized",
      "accepts_starting_pay",
      "understands_rate_nonnegotiable",
      "can_report_earliest_time",
      "available_full_time",
      "willing_over_40",
      "understands_ot_rate",
      "understands_ot_not_guaranteed",
      "can_work_required_days",
      "has_valid_fl_dl",
      "reliable_transport",
      "can_perform_essential_duties",
      "accepts_conduct_requirements",
      "agrees_later_screening",
    ].forEach(function (id) {
      check(id, true);
    });
    check("requires_sponsorship", false);
    fill("employer", "TEST EMPLOYER — NOT REAL");
    fill("role_title", "TEST ROLE");
    fill("started_on", "2024-01-01");
    fill("ended_on", "2026-01-01");
    fill("reason_for_leaving", "TEST DATA ONLY");
    check("cleaning_experience", true);
    check("residential_experience", true);
    fill("languages", "TEST");
    fill("ref1_name", "TEST REFERENCE ONE");
    fill("ref1_phone", "2395550101");
    fill("ref1_rel", "TEST");
    fill("ref2_name", "TEST REFERENCE TWO");
    fill("ref2_phone", "2395550102");
    fill("ref2_rel", "TEST");
    fill("earliest_start_date", "2026-09-08");
    fill("q_locked_room", "TEST ANSWER — I do not enter and I call the office.");
    fill("q_skip_request", "TEST ANSWER — I keep the work order and call the office.");
    fill("q_damage", "TEST ANSWER — I report it immediately and do not hide it.");
    fill("cert_signature", "TEST APPLICANT — NOT A REAL APPLICATION");
    fill("offer_signature", "TEST APPLICANT — NOT A REAL APPLICATION");
    check("truthful", true);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (isReviewMode()) return;
    document.querySelectorAll(".careers-review-banner").forEach(function (n) {
      n.hidden = true;
    });
  });

  function requiredSides(mode) {
    if (mode === "list_b_c") return ["i9_list_b_front", "i9_list_b_back", "i9_list_c_front", "dl_front", "dl_back"];
    return ["i9_list_a_front", "i9_list_a_back", "dl_front", "dl_back"];
  }

  global.SparkleanHiringReview = {
    isReviewMode: isReviewMode,
    job: job,
    notice: NOTICE,
    offerText: offerText,
    lists: lists,
    gatesPass: gatesPass,
    fillTestApplicant: fillTestApplicant,
    requiredSides: requiredSides,
  };
})(window);
