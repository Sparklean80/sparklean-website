/**
 * Scrub unsupported blog claims + point residential CTAs to recurring care.
 * Wording only — no layout/CSS changes.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../pages/blog");

const whenToHire = new Set([
  "naples-house-cleaning-when-to-hire-a-pro.html",
  "bonita-springs-house-cleaning-when-to-hire-a-pro.html",
  "estero-house-cleaning-when-to-hire-a-pro.html",
  "fort-myers-house-cleaning-when-to-hire-a-pro.html",
  "cape-coral-house-cleaning-when-to-hire-a-pro.html",
]);

const replacements = [
  [
    /a dependable routine, a healthier home, and your weekends back/g,
    "a dependable routine, a consistently well-kept home, and your weekends back",
  ],
  [
    /supervised teams, luxury-grade products, and a 24-hour happiness guarantee/g,
    "professionally supervised teams, bonding and insurance coverage, and a 24-hour happiness guarantee",
  ],
  [
    /predictable visits and predictable results/g,
    "predictable visits under professionally supervised care",
  ],
  [
    /consistency â€” the same team lead, the same finish, whether you are in for the season or home year-round\./g,
    "consistency under professionally supervised crews—whether you are in for the season or home year-round.",
  ],
  [
    /consistency — the same team lead, the same finish, whether you are in for the season or home year-round\./g,
    "consistency under professionally supervised crews—whether you are in for the season or home year-round.",
  ],
  [
    /Allergies or pets mean you want floors, upholstery zones, and dust handled on a schedule\./g,
    "Busy homes with pets mean you want floors, upholstery zones, and dust handled on a schedule.",
  ],
  [
    /National franchises rotate crews and miss keys\. Sparklean is Southwest Floridaâ€“based, bonded, insured, and Workers' Comp covered — with a 24-hour happiness guarantee\. You get a named contact, not a call center\./g,
    "Sparklean is a registered Florida business—bonded, insured (general liability), and Workers' Comp covered—with professionally supervised crews and a 24-hour happiness guarantee. You work with a named local contact.",
  ],
  [
    /National franchises rotate crews and miss keys\. Sparklean is Southwest Florida–based, bonded, insured, and Workers' Comp covered — with a 24-hour happiness guarantee\. You get a named contact, not a call center\./g,
    "Sparklean is a registered Florida business—bonded, insured (general liability), and Workers' Comp covered—with professionally supervised crews and a 24-hour happiness guarantee. You work with a named local contact.",
  ],
  [
    /National franchises often sell a brand, not a relationship\. A Southwest Floridaâ€“based team understands/g,
    "A professionally managed local team understands",
  ],
  [
    /National franchises often sell a brand, not a relationship\. A Southwest Florida–based team understands/g,
    "A professionally managed local team understands",
  ],
  [
    /Franchise dashboards do not mop floors\. Sparklean Cleaning is rooted in Naples, Bonita Springs, Fort Myers, Estero, and Cape Coral â€” which matters when/g,
    "Sparklean is a registered Florida business rooted in Naples, Bonita Springs, Fort Myers, Estero, and Cape Coral—which matters when",
  ],
  [
    /Franchise dashboards do not mop floors\. Sparklean Cleaning is rooted in Naples, Bonita Springs, Fort Myers, Estero, and Cape Coral — which matters when/g,
    "Sparklean is a registered Florida business rooted in Naples, Bonita Springs, Fort Myers, Estero, and Cape Coral—which matters when",
  ],
  [
    /Ready for a cleaner home this week\? Sparklean Cleaning is ready when you are\./g,
    "Ready for recurring residential care? Start with a personalized first visit, then weekly, biweekly, or monthly managed service.",
  ],
  [
    /Ready for a cleaner home in ([^?]+)\? Sparklean is ready when you are\./g,
    "Ready for recurring residential care in $1? Start with a personalized first visit, then weekly, biweekly, or monthly managed service.",
  ],
  [
    /<a href="\/contact">Refer a friend or advisor<\/a>/g,
    '<a href="/refer">Refer a friend or advisor</a>',
  ],
];

function patchArticleCtaRow(html, residential) {
  return html.replace(
    /(<div class="article-cta-row">[\s\S]*?)(<a href="\/contact" class="btn-outline"[^>]*>)([^<]*)(<\/a>)/,
    (_, pre, _a, _label, close) => {
      if (residential) {
        return `${pre}<a href="/contact" class="btn-outline" data-sparklean-intake-preset="recurringResidential">Begin recurring care${close}`;
      }
      return `${pre}<a href="/contact" class="btn-outline">Request a walkthrough${close}`;
    }
  );
}

function patchNewsletterOutline(html, residential) {
  if (!residential) return html;
  return html.replace(
    /(<section class="newsletter"[\s\S]*?)<a href="\/contact" class="btn-outline"[^>]*>[^<]*<\/a>/,
    '$1<a href="/contact" class="btn-outline" data-sparklean-intake-preset="recurringResidential">Begin recurring care</a>'
  );
}

let changed = 0;
for (const name of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
  const file = path.join(dir, name);
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const residential = whenToHire.has(name);

  for (const [re, to] of replacements) html = html.replace(re, to);
  html = patchArticleCtaRow(html, residential);
  html = patchNewsletterOutline(html, residential);

  if (html !== before) {
    fs.writeFileSync(file, html);
    changed += 1;
    console.log("updated", name);
  }
}
console.log(`\nUpdated ${changed} article(s).`);
