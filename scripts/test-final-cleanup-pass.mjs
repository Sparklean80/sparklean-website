/**
 * Final SEO-audit cleanup regressions (branch seo-audit-cleanup-20260824).
 */
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { fileURLToPath } from "url";
import vm from "vm";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function assert(cond, msg) {
  if (cond) console.log("OK  ", msg);
  else {
    console.error("FAIL", msg);
    failed += 1;
  }
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function extractLd(html) {
  const blocks = [];
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      blocks.push({ __parseError: true });
    }
  }
  return blocks;
}

function walk(o, fn) {
  if (!o || typeof o !== "object") return;
  if (Array.isArray(o)) return o.forEach((v) => walk(v, fn));
  fn(o);
  Object.values(o).forEach((v) => walk(v, fn));
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function formatVisible(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// --- About meta length ---
const about = read("pages/about.html");
const aboutDesc = (about.match(/name=["']description["'][^>]*content=["']([^"']+)/i) ||
  [])[1];
assert(aboutDesc && aboutDesc.length >= 120 && aboutDesc.length <= 155, `about meta length ${aboutDesc && aboutDesc.length}`);
assert(aboutDesc.includes("Tony Giuliano") && aboutDesc.includes("Roxana Tellez"), "about meta names founders");

// --- Blog visible author/dates match schema ---
const blogDir = path.join(root, "pages", "blog");
const articles = fs.readdirSync(blogDir).filter((f) => f.endsWith(".html"));
assert(articles.length === 12, `12 blog articles (found ${articles.length})`);

for (const f of articles) {
  const html = read(path.join("pages", "blog", f));
  let pub;
  let mod;
  walk(extractLd(html), (o) => {
    if (o["@type"] === "BlogPosting" || (Array.isArray(o["@type"]) && o["@type"].includes("BlogPosting"))) {
      pub = o.datePublished;
      mod = o.dateModified;
    }
  });
  assert(!!pub, `${f} has datePublished`);
  assert(html.includes('class="article-meta"'), `${f} has article-meta`);
  assert(html.includes('href="/about">Sparklean Cleaning</a>'), `${f} links author to /about`);
  assert(
    html.includes(`datetime="${pub}"`) && html.includes(`Published ${formatVisible(pub)}`),
    `${f} visible published matches schema`
  );
  if (mod && mod !== pub) {
    assert(
      html.includes(`datetime="${mod}"`) && html.includes(`Updated ${formatVisible(mod)}`),
      `${f} visible updated matches schema`
    );
  } else {
    assert(!html.includes("Updated "), `${f} omits Updated when unchanged`);
  }
}

// --- Inner Circle + contact interest ---
const inner = read("pages/inner-circle.html");
assert(
  inner.includes("/contact?interest=inner-circle") &&
    inner.includes("preset=innerCircle"),
  "inner circle CTAs preserve membership interest"
);
assert(inner.includes("After you submit your request"), "inner circle states next step");

const contact = read("pages/contact.html");
assert(contact.includes("Start Guided Quote"), "contact primary guided CTA label");
assert(contact.includes("Send a Quick Message"), "contact secondary simple CTA label");
assert(!/when available/i.test(contact), "contact no longer says intake may be unavailable");
assert(contact.includes("cp-interest-banner"), "contact has Inner Circle interest banner");
assert(
  contact.includes('value="Sparklean Inner Circle / recurring membership"') ||
    contact.includes("Sparklean Inner Circle / recurring membership"),
  "contact prefills Inner Circle service copy"
);
assert(contact.includes("Service Cities"), "contact keeps one 5-city trust item");
assert(!/Five service cities/i.test(contact), "contact removes duplicate five-cities trust item");
assert(contact.includes("Satisfaction Window"), "contact uses satisfaction window wording");
assert(contact.includes('type="email"'), "contact email type=email");
assert(contact.includes('type="tel"'), "contact phone type=tel");
assert(contact.includes('name="consentContact"') && contact.includes("required"), "contact consent required");
assert(
  /id="cf-consent-optional"[\s\S]*?type="checkbox"/.test(contact) &&
    !/id="cf-consent-optional"[^>]*checked/.test(contact),
  "marketing consent unchecked by default"
);
assert(contact.includes('href="/privacy"') && contact.includes('href="/terms"'), "contact legal links");

// --- Partners alt + referral params ---
const partners = read("pages/partners.html");
assert(partners.includes('alt="Sparklean team reviewing a local home"'), "partners alt capitalization fixed");
assert(partners.includes("/refer?type=realtor"), "partners realtor type preserved");
assert(partners.includes("/refer?type=builder"), "partners builder type preserved");

const refer = read("pages/refer.html");
assert(refer.includes("data-sparklean-intake-preset=\"referral\""), "refer opens referral intake");
assert(refer.includes("type=") || refer.includes("referralType") || read("js/quote-intake.js").includes("referralType"), "referral type wiring exists");

// --- Analytics events + single-fire dedupe ---
const eventsSrc = read("js/sparklean-events.js");
for (const ev of [
  "quote_started",
  "quote_submitted",
  "contact_form_submitted",
  "phone_click",
  "email_click",
  "client_login_click",
  "membership_interest",
  "referral_started",
  "referral_submitted",
  "commercial_quote_started",
  "construction_quote_started",
  "google_reviews_click",
]) {
  assert(eventsSrc.includes(ev), `events allow ${ev}`);
}

const sandbox = {
  window: { dataLayer: [], location: { pathname: "/contact" } },
  document: {
    readyState: "complete",
    addEventListener() {},
  },
  location: { pathname: "/contact" },
  console,
};
sandbox.window.dataLayer = [];
sandbox.gtag = function () {
  sandbox.window.__gtag = (sandbox.window.__gtag || []).concat([Array.from(arguments)]);
};
vm.runInNewContext(eventsSrc, sandbox);
const SE = sandbox.window.SparkleanEvents;
assert(!!SE, "SparkleanEvents exported");
SE._test.resetDedupe();
const first = SE.track("phone_click", { cta_location: "link" });
const second = SE.track("phone_click", { cta_location: "link" });
assert(first === true && second === false, "duplicate conversion event suppressed within window");
assert(
  sandbox.window.dataLayer.filter((r) => r.event === "phone_click").length === 1,
  "dataLayer receives one phone_click"
);

const intake = read("js/quote-intake.js");
assert(intake.includes("commercial_quote_started"), "intake fires commercial_quote_started");
assert(intake.includes("construction_quote_started"), "intake fires construction_quote_started");
assert(intake.includes("membership_interest"), "intake can fire membership_interest");

// --- Post-construction stages ---
const pc = read("pages/post-construction-cleaning.html");
assert(pc.includes("Rough Clean") && pc.includes("Final Clean") && pc.includes("Punch-List"), "post-construction stages present");
assert(pc.includes("Exterior glass is included only when"), "post-construction scope caveats present");

if (failed) {
  console.error(`\n${failed} failure(s)`);
  process.exit(1);
}
console.log("\nAll final-cleanup checks passed.");
