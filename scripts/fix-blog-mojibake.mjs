/**
 * Decode UTF-8-as-Latin-1 mojibake in blog HTML (visible â€” / Â· / Â© / â†’).
 * Also collapse duplicated five-city lists from the territory scrub.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const blogDir = path.join(root, "pages/blog");

const FIVE = "Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral";

function decodeMojibake(s) {
  const pairs = [
    ["â€¦", "…"],
    ["â€”", "—"],
    ["â€“", "–"],
    ["â€™", "’"],
    ["â€˜", "‘"],
    ["â€œ", "“"],
    ["â€", "”"],
    ["â†’", "→"],
    ["â†'", "→"],
    ["Â†’", "→"],
    ["Â†'", "→"],
    ["Â·", "·"],
    ["Â©", "©"],
    ["Â®", "®"],
    ["Â ", "\u00a0"],
  ];
  let out = s;
  for (const [bad, good] of pairs) out = out.split(bad).join(good);
  return out;
}

function collapseCityDupes(s) {
  return s
    .replace(
      /Naples, Bonita Springs, Estero, Fort Myers, Cape Coral, and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral/g,
      FIVE
    )
    .replace(
      /Naples, Fort Myers, and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral/g,
      FIVE
    )
    .replace(
      /Naples and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral/g,
      FIVE
    )
    .replace(
      /, Fort Myers, and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral/g,
      ", Fort Myers, and Cape Coral"
    )
    .replace(
      / for ([A-Za-z ]+) and Naples, Bonita Springs, Estero, Fort Myers, and Cape Coral/g,
      " for $1"
    );
}

let n = 0;
for (const name of fs.readdirSync(blogDir).filter((f) => f.endsWith(".html"))) {
  const abs = path.join(blogDir, name);
  const before = fs.readFileSync(abs, "utf8");
  const after = collapseCityDupes(decodeMojibake(before));
  if (after !== before) {
    fs.writeFileSync(abs, after);
    n += 1;
    console.log("fixed", name);
  }
}
console.log("updated", n, "blog files");
