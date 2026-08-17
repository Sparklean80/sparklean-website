import fs from "fs";
const h = fs.readFileSync("index.html", "utf8");
const checks = [
  ["title", h.includes("Luxury Cleaning Services in Naples &amp; Southwest Florida | Sparklean")],
  ["h1", h.includes("Luxury Cleaning Services in <em>Naples</em>")],
  ["no marquee section", !h.includes('class="marquee"')],
  ["home quote", h.includes("home-quote-entry")],
  ["vacation card", h.includes('href="/vacation-rental-cleaning"')],
  ["addons link", h.includes("specialized add-ons")],
  ["city naples", h.includes("/house-cleaning-naples")],
  ["nav CTA", h.includes(">Request a Quote<")],
  ["hint script", h.includes("sparklean_home_quote_hint")],
  ["no proprietary", !h.toLowerCase().includes("proprietary")],
  ["faq one cleaning", h.includes("without committing to recurring")],
  ["hero fetchpriority", h.includes('fetchpriority="high"')],
  ["footer soft naples", h.includes('<li><a href="/house-cleaning-naples">Naples</a></li>')],
  ["no Registered LLC strip", !h.includes("Registered Florida LLC")],
  ["trust Direct Employees", h.includes("Direct Employees")],
  ["schema CleaningService", h.includes('"CleaningService"')],
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
