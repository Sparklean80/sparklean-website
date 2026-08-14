/**
 * Add Vacation Rental footer/service link on money pages that list Post-Construction
 * but not yet Vacation Rental.
 */
import fs from "fs";

const files = [
  "index.html",
  "pages/residential-cleaning.html",
  "pages/commercial-cleaning.html",
  "pages/post-construction-cleaning.html",
  "pages/specialized-cleaning.html",
  "pages/contact.html",
  "pages/about.html",
  "pages/house-cleaning-naples.html",
  "pages/house-cleaning-bonita-springs.html",
  "pages/house-cleaning-estero.html",
  "pages/house-cleaning-fort-myers.html",
  "pages/house-cleaning-cape-coral.html",
];

const link = `<a href="/vacation-rental-cleaning">Vacation Rental Cleaning</a>`;
const needleAfter = `<a href="/post-construction-cleaning">Post-Construction</a>`;
const needleAfter2 = `<a href="/post-construction-cleaning">Post-Construction Cleaning</a>`;

let n = 0;
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let t = fs.readFileSync(f, "utf8");
  if (t.includes('href="/vacation-rental-cleaning"')) continue;
  if (t.includes(needleAfter)) {
    t = t.split(needleAfter).join(`${needleAfter}\n        ${link}`);
    fs.writeFileSync(f, t);
    n++;
    console.log("updated", f);
  } else if (t.includes(needleAfter2)) {
    t = t.split(needleAfter2).join(`${needleAfter2}\n        ${link}`);
    fs.writeFileSync(f, t);
    n++;
    console.log("updated2", f);
  } else {
    console.log("skip", f);
  }
}
console.log("done", n);
