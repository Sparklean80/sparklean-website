/**
 * Ensure Why Sparklean + Partners appear in desktop/mobile nav sitewide.
 * Run: node scripts/patch-nav-trust-links.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function patchNavLinksUl(ulInner) {
  let inner = ulInner;
  const hasWhy = /href="\/why-sparklean"/.test(inner);
  const hasPartners = /href="\/partners"/.test(inner);

  if (!hasWhy) {
    if (/<li><a href="\/about"[^>]*>About Us<\/a><\/li>/.test(inner)) {
      inner = inner.replace(
        /<li><a href="\/about"[^>]*>About Us<\/a><\/li>/,
        '<li><a href="/why-sparklean">Why Sparklean</a></li>\n    <li><a href="/about">About Us</a></li>'
      );
    } else if (/<li>\s*<a href="\/about"[^>]*>About Us<\/a>\s*<\/li>/.test(inner)) {
      inner = inner.replace(
        /<li>\s*<a href="\/about"[^>]*>About Us<\/a>\s*<\/li>/,
        '<li>\n<a href="/why-sparklean">Why Sparklean</a>\n</li>\n<li>\n<a href="/about">About Us</a>\n</li>'
      );
    }
  }

  if (!hasPartners) {
    if (/<li><a href="\/about"[^>]*>About Us<\/a><\/li>/.test(inner)) {
      inner = inner.replace(
        /<li><a href="\/about"[^>]*>About Us<\/a><\/li>/,
        '<li><a href="/about">About Us</a></li>\n    <li><a href="/partners">Partners</a></li>'
      );
    } else if (/<li>\s*<a href="\/about"[^>]*>About Us<\/a>\s*<\/li>/.test(inner)) {
      inner = inner.replace(
        /<li>\s*<a href="\/about"[^>]*>About Us<\/a>\s*<\/li>/,
        '<li>\n<a href="/about">About Us</a>\n</li>\n<li>\n<a href="/partners">Partners</a>\n</li>'
      );
    }
  }

  // Restore active class on About when we stripped it via compact replace
  if (ulInner.includes('href="/about" class="active"') && !inner.includes('href="/about" class="active"')) {
    inner = inner.replace('<a href="/about">About Us</a>', '<a href="/about" class="active">About Us</a>');
  }

  return inner;
}

function patchDesktop(html) {
  return html.replace(
    /(<ul class="nav-links">)([\s\S]*?)(<\/ul>)/i,
    (_, open, inner, close) => open + patchNavLinksUl(inner) + close
  );
}

function patchMobile(html) {
  return html.replace(
    /(<div class="nav-mobile-menu"[^>]*>)([\s\S]*?)(<\/div>)/i,
    (full, open, menu, close) => {
      let next = menu;
      const insert = [];
      if (!next.includes('href="/why-sparklean"')) insert.push('<a href="/why-sparklean">Why Sparklean</a>');
      if (!next.includes('href="/partners"')) insert.push('<a href="/partners">Partners</a>');
      if (!next.includes('href="/refer"')) insert.push('<a href="/refer">Refer Someone</a>');
      if (!insert.length) return full;
      const block = insert.join("\n");
      if (next.includes('<a href="/about">About Us</a>')) {
        next = next.replace('<a href="/about">About Us</a>', `${block}\n<a href="/about">About Us</a>`);
      } else if (next.includes('<a href="/blog">Blog</a>')) {
        next = next.replace('<a href="/blog">Blog</a>', `${block}\n<a href="/blog">Blog</a>`);
      } else {
        next = `${next.trimEnd()}\n${block}\n`;
      }
      return open + next + close;
    }
  );
}

const files = walk(root);
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  let after = patchDesktop(before);
  after = patchMobile(after);
  if (after !== before) {
    fs.writeFileSync(file, after);
    changed += 1;
    console.log("patched", path.relative(root, file));
  }
}
console.log(`\nUpdated ${changed} file(s).`);
