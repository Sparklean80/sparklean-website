import fs from "fs";
const h = fs.readFileSync("index.html", "utf8");
const checks = [
  ["title", h.includes("Full-Service Cleaning Company Naples FL | Sparklean")],
  ["h1", h.includes("Full-Service Cleaning Company")],
  ["h1 naples", h.includes("Naples, Florida")],
  ["no marquee section", !h.includes('class="marquee"')],
  ["vacation card", h.includes('href="/vacation-rental-cleaning"')],
  ["city naples", h.includes("/house-cleaning-naples")],
  ["hero fetchpriority", h.includes('fetchpriority="high"')],
  ["southwest florida origin", h.includes("Southwest Florida")],
  ["no abbreviated swfl or marco", !/SW Florida|SW FL|Marco Island/i.test(h)],
  ["cape coral", h.includes("Cape Coral")],
  ["day porter visible", h.includes("Day Porter")],
  ["seven-stage prepare", h.includes("Prepare")],
  ["visual standard headline", h.includes("Don’t Just Tell Employees the Standard") || h.includes("Don't Just Tell Employees the Standard")],
  ["core benefit in hero", h.includes("prepare the people, manage the work, document the results")],
  ["day porter intake", h.includes('data-sparklean-event-type="day_porter"') && h.includes("Discuss Day Porter Coverage") && h.includes("/contact?quote=1#quote-intake")],
  ["hospitality intake", h.includes('data-sparklean-event-type="hospitality_program"') && h.includes("/contact?quote=1#quote-intake")],
  ["five city links", ["/house-cleaning-naples", "/house-cleaning-bonita-springs", "/house-cleaning-estero", "/house-cleaning-fort-myers", "/house-cleaning-cape-coral"].every((u) => h.includes(u))],
  ["residential conversion", h.includes('href="/residential-cleaning"') && h.includes("Request a Cleaning Quote")],
];
let fail = 0;
for (const [n, ok] of checks) {
  console.log(ok ? "OK" : "FAIL", n);
  if (!ok) fail++;
}
const h1 = (h.match(/<h1[\s\S]*?<\/h1>/) || [""])[0].replace(/\s+/g, " ").slice(0, 220);
console.log("H1:", h1);
console.log("fail count", fail);
process.exit(fail ? 1 : 0);
