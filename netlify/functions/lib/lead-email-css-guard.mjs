/**
 * Guards inline CSS in lead email HTML against corruption and unreadable output.
 */

const MALFORMED_PATTERNS = [
  { re: /rgba\s*\(\s*,\s*,\s*,/gi, label: "rgba(,,,.)" },
  { re: /rgba\s*\(\s*undefined/gi, label: "rgba(undefined" },
  { re: /rgba\s*\(\s*null/gi, label: "rgba(null" },
  { re: /color\s*:\s*undefined/gi, label: "color:undefined" },
  { re: /color\s*:\s*null/gi, label: "color:null" },
  { re: /background\s*:\s*undefined/gi, label: "background:undefined" },
  { re: /background\s*:\s*null/gi, label: "background:null" },
  { re: /#\$\{/g, label: "unresolved placeholder" },
  { re: /color\s*:\s*;\s*/gi, label: "empty color" },
  { re: /rgba\s*\(\s*\)/gi, label: "empty rgba()" },
];

/** @param {string} cssFragment */
function rgbaComponents(cssFragment) {
  const out = [];
  const re = /rgba\s*\(\s*([^)]+)\)/gi;
  let m;
  while ((m = re.exec(cssFragment))) {
    const parts = m[1].split(",").map((p) => p.trim());
    if (parts.length < 4) {
      out.push({ raw: m[0], issue: "missing rgba components" });
      continue;
    }
    for (const p of parts.slice(0, 3)) {
      if (p === "" || p === "undefined" || p === "null" || Number.isNaN(Number(p))) {
        out.push({ raw: m[0], issue: `invalid rgba component: ${p}` });
      }
    }
  }
  return out;
}

/**
 * @param {string} html
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
export function validateLeadEmailCss(html) {
  const errors = [];
  const src = String(html ?? "");

  for (const { re, label } of MALFORMED_PATTERNS) {
    re.lastIndex = 0;
    if (re.test(src)) errors.push(`malformed CSS: ${label}`);
  }

  for (const bad of rgbaComponents(src)) {
    errors.push(`malformed CSS: ${bad.issue} in ${bad.raw}`);
  }

  if (/\bundefined\b/.test(src) && /style\s*=/.test(src)) {
    errors.push("malformed CSS: undefined in styled markup");
  }
  if (/\bnull\b/.test(src) && /style\s*=/.test(src)) {
    errors.push("malformed CSS: null in styled markup");
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

function hexToRgb(hex) {
  const h = String(hex).replace("#", "").trim();
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.length === 6
        ? h
        : null;
  if (!full) return null;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relLuminance({ r, g, b }) {
  const s = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

/** @param {string} fgHex @param {string} bgHex */
export function contrastRatio(fgHex, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return 0;
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {ReadonlyArray<{ fg: string, bg: string, label: string, min?: number }>} pairs
 * @param {number} [minRatio=4.5]
 */
export function validateLeadEmailContrast(pairs, minRatio = 4.5) {
  const errors = [];
  for (const pair of pairs) {
    const ratio = contrastRatio(pair.fg, pair.bg);
    const min = pair.min ?? minRatio;
    if (ratio < min) {
      errors.push(
        `contrast fail (${pair.label}): ${pair.fg} on ${pair.bg} = ${ratio.toFixed(2)}:1 (need ${min}:1)`,
      );
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true };
}
