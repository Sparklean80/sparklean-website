/**
 * Replace reviews sections with Google-rating card only (no unverified quotes).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PAGE_REVIEW_SUBS,
  buildGoogleReviewsSection,
} from "../data/sparklean-testimonials.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const [rel, sub] of Object.entries(PAGE_REVIEW_SUBS)) {
  const file = path.join(root, rel);
  let html = fs.readFileSync(file, "utf8");
  const start = html.indexOf('<section class="reviews"');
  if (start < 0) throw new Error(`No reviews section in ${rel}`);
  const end = html.indexOf("</section>", start);
  if (end < 0) throw new Error(`Unclosed reviews section in ${rel}`);
  const pretty = rel !== "index.html";
  const replacement = buildGoogleReviewsSection({ sub, pretty });
  html = html.slice(0, start) + replacement + html.slice(end + "</section>".length);
  fs.writeFileSync(file, html);
  console.log("synced", rel);
}
console.log("Testimonials sync complete.");
