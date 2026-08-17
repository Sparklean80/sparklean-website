import fs from "fs";
import path from "path";

const h = fs.readFileSync("index.html", "utf8");
const m = h.match(/application\/ld\+json">\s*([\s\S]*?)<\/script>/);
if (!m) throw new Error("schema missing");
const schema = JSON.parse(m[1]);
console.log("schema JSON OK");
console.log("graph types:", schema["@graph"].map((x) => [].concat(x["@type"]).join("+")).join(", "));

const cities = ["naples", "bonita-springs", "estero", "fort-myers", "cape-coral"];
for (const c of cities) {
  const needle = `/house-cleaning-${c}`;
  const count = h.split(needle).length - 1;
  if (count < 2) throw new Error(`weak city link coverage for ${c}: ${count}`);
  console.log(`OK ${needle} count=${count}`);
}

const afterDir = "evidence/homepage-rebuild-2026-08-17/after";
const beforeDir = "evidence/homepage-rebuild-2026-08-17/before";
for (const dir of [beforeDir, afterDir]) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  console.log(dir, files.map((f) => `${f}:${fs.statSync(path.join(dir, f)).size}`).join(" "));
}

const claimFlags = [];
if (/proprietary/i.test(h)) claimFlags.push("proprietary still present");
if (/eco-friendly/i.test(h)) claimFlags.push("eco-friendly still present");
if (/clinically proven|non-toxic|medical-grade|patented/i.test(h)) claimFlags.push("strong product claim still present");
if (/affordable|cheap|budget|low-cost/i.test(h)) claimFlags.push("price-led language still present");
if (/same exact cleaners|no strangers/i.test(h)) claimFlags.push("same-team absolute claim");
console.log("claim flags:", claimFlags.length ? claimFlags.join("; ") : "none");

const inventory = {
  title: (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1],
  meta: (h.match(/meta name="description" content="([^"]*)"/) || [])[1],
  canonical: (h.match(/rel="canonical" href="([^"]*)"/) || [])[1],
  h1: (h.match(/<h1[\s\S]*?<\/h1>/) || [])[0].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
  primaryCtas: [
    "Request Your Personalized Quote",
    "Build My Personalized Quote",
    "Request a Quote",
  ].filter((t) => h.includes(t)),
  cityUrls: cities.map((c) => `/house-cleaning-${c}`),
  serviceUrls: [
    "/residential-cleaning",
    "/commercial-cleaning",
    "/post-construction-cleaning",
    "/vacation-rental-cleaning",
    "/specialized-cleaning",
  ],
  quoteHandoff:
    "Compact form stores sessionStorage sparklean_home_quote_hint then opens SparkleanQuoteIntake.open() — no lead submit, no PII in URL",
  sharedComponentsTouched: "none (index.html + homepage-only scripts under scripts/)",
  filesChangedProduct: ["index.html"],
  filesEvidence: [
    "evidence/homepage-rebuild-2026-08-17/",
    "scripts/rebuild-homepage.mjs",
    "scripts/verify-homepage-rebuild.mjs",
  ],
};

fs.writeFileSync(
  "evidence/homepage-rebuild-2026-08-17/VERIFICATION.json",
  JSON.stringify(inventory, null, 2)
);
console.log("wrote VERIFICATION.json");
