/**
 * Sparklean — structured intake flows only (concierge-style; not chat, not CRM).
 * Branching is fixed here. Any model use is server-side, post-submit, and minimal.
 */
(function () {
  function opts() {
    var a = [];
    for (var i = 0; i < arguments.length; i += 2) a.push({ value: arguments[i], label: arguments[i + 1] });
    return a;
  }

  /** @type {Record<string, Array<any>>} */
  var flows = {};

  flows.universal = [
    {
      id: "fullName",
      type: "text",
      label: "How should we address you?",
      assist: "First and last name, as you would like it noted.",
      placeholder: "Full name",
      required: true,
      maxLength: 120,
    },
    {
      id: "phone",
      type: "tel",
      label: "Best number for a return call",
      assist: "Direct line preferred.",
      placeholder: "(239) 555-0100",
      required: true,
      maxLength: 32,
    },
    {
      id: "email",
      type: "email",
      label: "Email address",
      assist: "For confirmations and follow-up only.",
      placeholder: "you@example.com",
      required: true,
      maxLength: 160,
    },
    {
      id: "location",
      type: "text",
      label: "City or ZIP code",
      assist: "Approximate location is sufficient.",
      placeholder: "Naples, FL or 34102",
      required: true,
      maxLength: 120,
    },
    {
      id: "serviceCategory",
      type: "select",
      label: "Which service are you considering?",
      assist: "The next questions will follow from your selection.",
      required: true,
      options: [
        { value: "residential", label: "Residential cleaning" },
        { value: "condoHighRise", label: "Condo / high-rise" },
        { value: "luxuryEstate", label: "Luxury estate" },
        { value: "moveInOut", label: "Move-in / move-out" },
        { value: "airbnbRental", label: "Airbnb / short-term rental" },
        { value: "commercialOffice", label: "Commercial office" },
        { value: "medicalOffice", label: "Medical office" },
        { value: "facilityJanitorial", label: "Facility / janitorial" },
        { value: "retailHospitality", label: "Retail / hospitality" },
        { value: "hoaCommunity", label: "HOA / community common areas" },
        { value: "postConstruction", label: "Post-construction" },
        { value: "windowCleaning", label: "Window cleaning" },
        { value: "specializedAddons", label: "Specialized add-ons" },
      ],
    },
  ];

  flows.residential = [
    { id: "bedrooms", type: "select", label: "Bedrooms", assist: "Approximate count is fine.", required: true, options: opts("1", "1", "2", "2", "3", "3", "4", "4", "5+", "5 or more") },
    { id: "bathrooms", type: "select", label: "Bathrooms", assist: "Full baths, powder rooms — round to the nearest whole number.", required: true, options: opts("1", "1", "2", "2", "3", "3", "4", "4", "5+", "5 or more") },
    { id: "sqftBand", type: "select", label: "Approximate square footage", required: true, options: opts("lt2500", "Under 2,500", "2500-4000", "2,500 – 4,000", "4000-6000", "4,000 – 6,000", "6000plus", "6,000+") },
    { id: "pets", type: "select", label: "Pets in the home?", required: true, options: opts("none", "None", "dogs", "Dogs", "cats", "Cats", "other", "Other / multiple") },
    { id: "frequency", type: "select", label: "Preferred cadence", required: true, options: opts("weekly", "Weekly", "biweekly", "Every two weeks", "monthly", "Monthly", "oneTime", "One-time / as needed") },
    { id: "deepClean", type: "select", label: "Do you need a first-time or deep clean to start?", required: true, options: opts("yes", "Yes", "no", "No", "unsure", "Not sure yet") },
    { id: "occupied", type: "select", label: "Will the home be occupied during service?", required: true, options: opts("occupied", "Occupied", "vacant", "Vacant", "flexible", "Flexible") },
    { id: "notesResidential", type: "textarea", label: "Anything else we should know?", assist: "Access notes, priorities, sensitivities — optional.", required: false, maxLength: 1200, placeholder: "Optional details" },
  ];

  flows.condoHighRise = [
    { id: "floorNumber", type: "text", label: "Floor level", assist: "Helps us plan equipment and parking.", required: true, maxLength: 40, placeholder: "e.g., 12th floor" },
    { id: "elevator", type: "select", label: "Elevator access for equipment?", required: true, options: opts("yes", "Yes", "no", "No", "freight", "Freight elevator", "unsure", "Unsure") },
    { id: "hoaRules", type: "select", label: "HOA or building restrictions we should respect?", required: true, options: opts("none", "None known", "yes", "Yes — details below", "unsure", "Not sure") },
    { id: "balconyGlass", type: "select", label: "Balcony or exterior glass to include?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial") },
    { id: "condoOccupied", type: "select", label: "Occupied or vacant during service?", required: true, options: opts("occupied", "Occupied", "vacant", "Vacant", "flexible", "Flexible") },
    { id: "notesCondo", type: "textarea", label: "Building name or access notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.luxuryEstate = [
    { id: "estateSqft", type: "select", label: "Approximate total square footage", required: true, options: opts("4000-8000", "4,000 – 8,000", "8000-12000", "8,000 – 12,000", "12000plus", "12,000+", "preferNot", "Prefer to discuss") },
    { id: "staffOnSite", type: "select", label: "Household staff or vendors on site?", required: true, options: opts("none", "None", "sometimes", "Sometimes", "daily", "Daily", "unsure", "Unsure") },
    { id: "security", type: "select", label: "Security or gate protocols?", required: true, options: opts("none", "None", "gate", "Gate / guard", "alarm", "Alarm / codes", "other", "Other") },
    { id: "frequencyEstate", type: "select", label: "Preferred cadence", required: true, options: opts("weekly", "Weekly", "biweekly", "Every two weeks", "custom", "Custom program", "oneTime", "One-time") },
    { id: "notesEstate", type: "textarea", label: "Property or service priorities", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.moveInOut = [
    { id: "moveType", type: "select", label: "Move type", required: true, options: opts("moveIn", "Move-in", "moveOut", "Move-out", "both", "Both", "other", "Other") },
    { id: "moveDate", type: "text", label: "Target date or window", assist: "Approximate is fine.", required: true, maxLength: 120, placeholder: "e.g., June 12 or week of June 10" },
    { id: "emptyHome", type: "select", label: "Will the home be empty of furnishings?", required: true, options: opts("empty", "Empty", "partial", "Partially furnished", "furnished", "Furnished") },
    { id: "notesMove", type: "textarea", label: "Special instructions", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.airbnbRental = [
    { id: "turnsPerMonth", type: "select", label: "Typical turnovers per month", required: true, options: opts("1-2", "1 – 2", "3-6", "3 – 6", "7plus", "7+", "seasonal", "Seasonal only") },
    { id: "linensLaundry", type: "select", label: "Linens or laundry refresh needed?", required: true, options: opts("yes", "Yes", "no", "No", "sometimes", "Sometimes") },
    { id: "restock", type: "select", label: "Consumables restocking?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial / as needed") },
    { id: "notesAirbnb", type: "textarea", label: "Listing notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.medicalOffice = [
    {
      id: "medicalSqft",
      type: "select",
      label: "Approximate clinical / office square footage",
      required: true,
      options: opts("lt2500", "Under 2,500", "2500-6000", "2,500 – 6,000", "6000plus", "6,000+", "unsure", "Not sure"),
    },
    {
      id: "examRooms",
      type: "select",
      label: "Exam or treatment rooms to plan around",
      required: true,
      options: opts("0-3", "0 – 3", "4-8", "4 – 8", "9plus", "9+", "na", "N/A — admin only"),
    },
    {
      id: "afterHoursAccess",
      type: "select",
      label: "After-hours or weekend disinfecting access?",
      required: true,
      options: opts("yes", "Yes", "limited", "Limited windows", "no", "Business hours only", "unsure", "Not sure"),
    },
    {
      id: "disinfectCadence",
      type: "select",
      label: "Disinfection cadence needed",
      required: true,
      options: opts("daily", "Nightly / daily touch", "3x", "Several times weekly", "weekly", "Weekly", "custom", "Custom program"),
    },
    {
      id: "daysPerWeek",
      type: "select",
      label: "General cleaning days per week",
      required: true,
      options: opts("1", "1", "2", "2", "3", "3", "4", "4", "5", "5", "custom", "Custom"),
    },
    {
      id: "restrooms",
      type: "select",
      label: "Patient or public restrooms in scope?",
      required: true,
      options: opts("yes", "Yes", "no", "No", "limited", "Limited"),
    },
    {
      id: "notesMedical",
      type: "textarea",
      label: "Clinical or compliance notes",
      assist: "Optional.",
      required: false,
      maxLength: 1200,
      placeholder: "Optional",
    },
  ];

  flows.retailHospitality = [
    {
      id: "retailSqft",
      type: "select",
      label: "Approximate customer-facing square footage",
      required: true,
      options: opts("lt1500", "Under 1,500", "1500-5000", "1,500 – 5,000", "5000plus", "5,000+", "unsure", "Not sure"),
    },
    {
      id: "peakTraffic",
      type: "select",
      label: "Peak customer traffic",
      required: true,
      options: opts("low", "Low", "moderate", "Moderate", "high", "High", "seasonal", "Highly seasonal"),
    },
    {
      id: "storefrontGlass",
      type: "select",
      label: "Showcase or storefront glass included?",
      required: true,
      options: opts("yes", "Yes", "no", "No", "partial", "Partial"),
    },
    {
      id: "dayNight",
      type: "select",
      label: "Preferred service window",
      required: true,
      options: opts("beforeOpen", "Before opening", "afterClose", "After closing", "offPeak", "Off-peak daytime", "flex", "Flexible"),
    },
    {
      id: "notesRetail",
      type: "textarea",
      label: "Brand or merchandising sensitivities",
      assist: "Optional.",
      required: false,
      maxLength: 1200,
      placeholder: "Optional",
    },
  ];

  flows.hoaCommunity = [
    {
      id: "hoaCommonSqft",
      type: "select",
      label: "Approximate common-area square footage",
      required: true,
      options: opts("lt25000", "Under 25,000", "25000-80000", "25,000 – 80,000", "80000plus", "80,000+", "unsure", "Not sure"),
    },
    {
      id: "amenityTypes",
      type: "select",
      label: "Primary amenity mix",
      required: true,
      options: opts("pool", "Pool / fitness", "club", "Clubhouse", "gate", "Gated entries", "mixed", "Mixed / multiple", "other", "Other"),
    },
    {
      id: "gateAccessModel",
      type: "select",
      label: "Gate and vendor access model",
      required: true,
      options: opts("staffed", "Staffed gate", "code", "Code / call box", "open", "Open / unmanned", "mixed", "Varies"),
    },
    {
      id: "hoaMeetingCadence",
      type: "select",
      label: "Board walks or inspection cadence",
      required: true,
      options: opts("monthly", "Monthly", "quarterly", "Quarterly", "annual", "Annual / as needed", "unsure", "Not sure"),
    },
    {
      id: "notesHoa",
      type: "textarea",
      label: "Architectural or compliance notes",
      assist: "Optional.",
      required: false,
      maxLength: 1200,
      placeholder: "Optional",
    },
  ];

  flows.commercialOffice = [
    { id: "officeSize", type: "select", label: "Office size", required: true, options: opts("lt2500", "Under 2,500 sq ft", "2500-10000", "2,500 – 10,000", "10000plus", "10,000+", "unsure", "Not sure") },
    { id: "employees", type: "select", label: "Approximate headcount", required: true, options: opts("1-10", "1 – 10", "11-50", "11 – 50", "51-150", "51 – 150", "150plus", "150+", "unsure", "Not sure") },
    { id: "daysPerWeek", type: "select", label: "Service days per week", required: true, options: opts("1", "1", "2", "2", "3", "3", "4", "4", "5", "5", "custom", "Custom") },
    { id: "dayNight", type: "select", label: "Day cleaning, night cleaning, or flexible?", required: true, options: opts("day", "Day", "night", "Night", "flex", "Flexible") },
    { id: "restrooms", type: "select", label: "Public or shared restrooms to service?", required: true, options: opts("yes", "Yes", "no", "No", "limited", "Limited") },
    { id: "trashService", type: "select", label: "Central trash / recycling handling?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial") },
    { id: "multiSuite", type: "select", label: "Multi-suite or single tenant?", required: true, options: opts("single", "Single suite", "multi", "Multi-suite", "unsure", "Unsure") },
    { id: "notesCommercial", type: "textarea", label: "Operational notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.facilityJanitorial = [
    { id: "facilityType", type: "select", label: "Facility type", required: true, options: opts("medical", "Medical / clinic", "retail", "Retail", "industrial", "Industrial / warehouse", "education", "Education", "hospitality", "Hospitality", "other", "Other") },
    { id: "facilitySqft", type: "select", label: "Approximate square footage", required: true, options: opts("lt10000", "Under 10,000", "10000-50000", "10,000 – 50,000", "50000plus", "50,000+", "unsure", "Not sure") },
    { id: "floors", type: "select", label: "Number of floors", required: true, options: opts("1", "1", "2", "2", "3", "3", "4plus", "4+", "unsure", "Not sure") },
    { id: "trafficLevel", type: "select", label: "Daily traffic level", required: true, options: opts("low", "Low", "medium", "Medium", "high", "High", "veryHigh", "Very high") },
    { id: "currentProvider", type: "select", label: "Current cleaning provider?", required: true, options: opts("none", "None", "inHouse", "In-house", "vendor", "Outside vendor", "unsure", "Unsure") },
    { id: "dayPorter", type: "select", label: "Day porter or daytime touch-ups?", required: true, options: opts("yes", "Yes", "no", "No", "maybe", "Maybe") },
    { id: "consumables", type: "select", label: "Consumables stocking needed?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial") },
    { id: "notesFacility", type: "textarea", label: "Facility notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.postConstruction = [
    { id: "cleanPhase", type: "select", label: "Rough clean, final clean, or touch-up?", required: true, options: opts("rough", "Rough clean", "final", "Final clean", "touchup", "Touch-up", "unsure", "Not sure") },
    { id: "activeConstruction", type: "select", label: "Is construction still active on site?", required: true, options: opts("yes", "Yes", "no", "No", "windingDown", "Winding down") },
    { id: "builderOrOwner", type: "select", label: "Are you the builder or the homeowner?", required: true, options: opts("builder", "Builder / GC", "homeowner", "Homeowner", "propertyMgr", "Property manager", "other", "Other") },
    {
      id: "constructionPhase",
      type: "select",
      label: "Overall construction stage",
      required: true,
      options: opts(
        "roughIn",
        "Rough-in / active trades",
        "drywallFinish",
        "Drywall & finishes",
        "fixtures",
        "Fixtures / detail",
        "punch",
        "Punch list",
        "turnover",
        "Turnover / close-out"
      ),
    },
    {
      id: "punchListStatus",
      type: "select",
      label: "Punch-list status",
      required: true,
      options: opts("notStarted", "Not started", "open", "Open items", "mostlyDone", "Mostly complete", "complete", "Complete / accepted"),
    },
    { id: "timelinePc", type: "text", label: "Target completion or walk-through window", required: true, maxLength: 160, placeholder: "e.g., walk-through June 4–6" },
    { id: "dustLevel", type: "select", label: "Residual dust level", required: true, options: opts("light", "Light", "moderate", "Moderate", "heavy", "Heavy", "unsure", "Unsure") },
    { id: "stickersPaint", type: "select", label: "Window stickers, paint, or adhesive removal?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial") },
    { id: "pcSqft", type: "select", label: "Approximate square footage", required: true, options: opts("lt3000", "Under 3,000", "3000-6000", "3,000 – 6,000", "6000plus", "6,000+", "unsure", "Not sure") },
    { id: "notesPc", type: "textarea", label: "Site notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.windowCleaning = [
    { id: "intExt", type: "select", label: "Interior, exterior, or both?", required: true, options: opts("interior", "Interior", "exterior", "Exterior", "both", "Both", "unsure", "Not sure") },
    { id: "waterfront", type: "select", label: "Waterfront or hard-to-reach glass?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Some areas") },
    { id: "stories", type: "select", label: "Stories / levels with glass", required: true, options: opts("1", "1", "2", "2", "3", "3", "4plus", "4+", "unsure", "Not sure") },
    { id: "ladderAccess", type: "select", label: "Ladder or lift access acceptable where required?", required: true, options: opts("yes", "Yes", "no", "No", "discuss", "Prefer to discuss") },
    { id: "glassAmount", type: "select", label: "Approximate amount of glass", required: true, options: opts("small", "Limited", "moderate", "Moderate", "extensive", "Extensive", "unsure", "Not sure") },
    { id: "screensTracks", type: "select", label: "Screens and tracks included?", required: true, options: opts("yes", "Yes", "no", "No", "partial", "Partial") },
    { id: "notesWindows", type: "textarea", label: "Access or timing notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  flows.specializedAddons = [
    { id: "addonFocus", type: "select", label: "Primary add-on interest", required: true, options: opts("tile", "Tile & grout", "windows", "Windows / glass", "kitchen", "Kitchen detailing", "bedBath", "Bed & bath styling", "dishes", "Dishes / reset", "laundry", "Laundry / light organizing", "mixed", "Multiple / unsure") },
    { id: "pairedService", type: "select", label: "Paired with a recurring or deep home clean?", required: true, options: opts("yes", "Yes", "no", "No", "unsure", "Not sure yet") },
    { id: "notesAddons", type: "textarea", label: "Scope notes", assist: "Optional.", required: false, maxLength: 1200, placeholder: "Optional" },
  ];

  /** Private recurring membership — not the standard service quote branch */
  flows.innerCircleMembership = [
    {
      id: "innerCadence",
      type: "select",
      label: "Preferred recurring cadence",
      assist: "Approximate is fine; your team will confirm routing and capacity.",
      required: true,
      options: opts("weekly", "Weekly", "biweekly", "Every two weeks", "monthly", "Monthly", "custom", "Custom / to discuss", "unsure", "Not sure yet"),
    },
    {
      id: "innerHomeProfile",
      type: "select",
      label: "How would you describe the residence?",
      required: true,
      options: opts("singleFamily", "Single-family home", "condo", "Condo / high-rise", "estate", "Estate or large single-family", "other", "Other / prefer to discuss"),
    },
    {
      id: "innerSeasonalPattern",
      type: "select",
      label: "How is the home typically occupied?",
      required: true,
      options: opts("yearRound", "Year-round primary", "seasonal", "Seasonal (SW Florida)", "mixed", "Mixed / guests & travel", "preferDiscuss", "Prefer to discuss"),
    },
    {
      id: "innerSparkleanHistory",
      type: "select",
      label: "Have you worked with Sparklean before?",
      required: true,
      options: opts("notYet", "Not yet", "current", "Current recurring or occasional client", "past", "In the past", "preferNot", "Prefer not to say"),
    },
    {
      id: "notesInnerCircle",
      type: "textarea",
      label: "Anything we should understand about your household?",
      assist: "Access, sensitivities, priorities, timing windows — optional.",
      required: false,
      maxLength: 1200,
      placeholder: "Optional",
    },
  ];

  /** Build ordered steps: universal + branch */
  function buildSteps(serviceKey) {
    var u = flows.universal.slice();
    var branch = flows[serviceKey];
    if (!branch || !branch.length) return u;
    return u.concat(branch);
  }

  function categoryLabel(key) {
    var map = {
      residential: "Residential cleaning",
      condoHighRise: "Condo / high-rise",
      luxuryEstate: "Luxury estate",
      moveInOut: "Move-in / move-out",
      airbnbRental: "Airbnb / rental",
      commercialOffice: "Commercial office",
      medicalOffice: "Medical Office",
      facilityJanitorial: "Facility / janitorial",
      retailHospitality: "Retail / hospitality",
      hoaCommunity: "HOA / community",
      postConstruction: "Post-construction",
      windowCleaning: "Window cleaning",
      specializedAddons: "Specialized add-ons",
      innerCircle: "Inner Circle membership",
    };
    return map[key] || key;
  }

  window.SparkleanQuoteFlows = {
    flows: flows,
    buildSteps: buildSteps,
    categoryLabel: categoryLabel,
  };
})();
