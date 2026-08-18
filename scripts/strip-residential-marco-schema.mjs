import fs from "fs";
const p = "pages/residential-cleaning.html";
let h = fs.readFileSync(p, "utf8");
const chunk =
  ',{"@type":"City","name":"Marco Island","containedInPlace":{"@type":"State","name":"Florida"}}';
const before = (h.match(/Marco Island/g) || []).length;
h = h.split(chunk).join("");
const m = h.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
if (!m) throw new Error("no json-ld");
JSON.parse(m[1]);
fs.writeFileSync(p, h);
console.log("Marco before", before, "after", (h.match(/Marco Island/g) || []).length, "JSON OK");
