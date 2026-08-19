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
  ["no banned geo", !/Southwest Florida|SW Florida|SW FL|Marco Island/i.test(h)],
  ["cape coral", h.includes("Cape Coral")],
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
