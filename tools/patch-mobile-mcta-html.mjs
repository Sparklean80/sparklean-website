import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tag = '<script src="/js/sparklean-mobile-sticky-cta.js" defer></script>\n';

function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory() && f.name !== ".git") walk(p);
    else if (f.isFile() && f.name.endsWith(".html")) {
      let s = fs.readFileSync(p, "utf8");
      if (s.includes("sparklean-mobile-sticky-cta.js")) {
        console.log("skip", p);
        continue;
      }
      const i = s.lastIndexOf("</body>");
      if (i < 0) {
        console.log("NO BODY", p);
        continue;
      }
      s = s.slice(0, i) + tag + s.slice(i);
      fs.writeFileSync(p, s);
      console.log("patched", p);
    }
  }
}

walk(root);
