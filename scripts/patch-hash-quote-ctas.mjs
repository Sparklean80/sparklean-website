import fs from "fs";

const Q = "/contact?quote=1#quote-intake";
const files = [
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/specialized-cleaning.html",
];

for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  let n = 0;
  s = s.replace(/href="#quote"/g, () => {
    n += 1;
    return `href="${Q}" data-sparklean-intake`;
  });
  // Avoid double attributes if already patched oddly
  s = s.replace(/data-sparklean-intake data-sparklean-intake/g, "data-sparklean-intake");
  s = s.replace(/href="\/contact" class="btn-gold"/g, () => {
    n += 1;
    return `href="${Q}" class="btn-gold" data-sparklean-intake`;
  });
  s = s.replace(/class="founder-soft-cta" href="\/contact"/g, () => {
    n += 1;
    return `class="founder-soft-cta" href="${Q}" data-sparklean-intake`;
  });
  fs.writeFileSync(f, s);
  console.log(f, n);
}
