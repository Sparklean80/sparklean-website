/**
 * Sparklean — structured intake flows (guided; not freeform chat).
 * OpenAI is only used server-side for a short summary; branching is deterministic here.
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
      label: "Who may we address this request to?",
      assist: "Your first and last name, as you would like our team to use it.",
      placeholder: "Full name",
      required: true,
      maxLength: 120,
    },
    {
      id: "phone",
      type: "tel",
      label: "Best number to reach you",
      assist: "A direct line is ideal — our coordinators respond quickly during business hours.",
      placeholder: "(239) 555-0100",
      required: true,
      maxLength: 32,
    },
    {
      id: "email",
      type: "email",
      label: "Email for confirmations",
      assist: "We will send a brief confirmation and any follow-up details here.",
      placeholder: "you@example.com",
      required: true,
      maxLength: 160,
    },
    {
      id: "location",
      type: "text",
      label: "City or ZIP code",
      assist: "Southwest Florida — approximate location helps us assign the right crew.",
      placeholder: "Naples, FL or 34102",
      required: true,
      maxLength: 120,
    },
    {
      id: "serviceCategory",
      type: "select",
      label: "Which type of service are you considering?",
      assist: "We will tailor the next questions to your property and priorities.",
      required: true,
      options: [
        { value: "residential", label: "Residential cleaning" },
        { value: "condoHighRise", label: "Condo / high-rise" },
        { value: "luxuryEstate", label: "Luxury estate" },
        { value: "moveInOut", label: "Move-in / move-out" },
        { value: "airbnbRental", label: "Airbnb / short-term rental" },
        { value: "commercialOffice", label: "Commercial office" },
        { value: "facilityJanitorial", label: "Facility / janitorial" },
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
      facilityJanitorial: "Facility / janitorial",
      postConstruction: "Post-construction",
      windowCleaning: "Window cleaning",
      specializedAddons: "Specialized add-ons",
    };
    return map[key] || key;
  }

  window.SparkleanQuoteFlows = {
    flows: flows,
    buildSteps: buildSteps,
    categoryLabel: categoryLabel,
  };
})();
