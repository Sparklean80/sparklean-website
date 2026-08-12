/**
 * Shared abuse / auth helpers for lead functions.
 */

import { createHash, timingSafeEqual } from "crypto";

const ALLOWED_HOSTS = new Set([
  "www.sparklean.co",
  "sparklean.co",
  "localhost",
  "127.0.0.1",
]);

export function timingSafeEqualString(a, b) {
  const aa = Buffer.from(String(a || ""), "utf8");
  const bb = Buffer.from(String(b || ""), "utf8");
  if (aa.length !== bb.length) {
    // Compare equal-length dummy to keep timing flatter
    const pad = createHash("sha256").update(aa).digest();
    timingSafeEqual(pad, pad);
    return false;
  }
  return timingSafeEqual(aa, bb);
}

export function hashToken(token) {
  return createHash("sha256").update(String(token || ""), "utf8").digest("hex");
}

export function clientIp(request) {
  const xf = request.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0].trim();
  if (first) return first.slice(0, 80);
  return (request.headers.get("x-nf-client-connection-ip") || "unknown").slice(0, 80);
}

/** Same-site / first-party Origin or Referer when present; allow missing for non-browser clients in tests. */
export function assertSameSiteOrigin(request, { enforce = true } = {}) {
  if (process.env.SPARKLEAN_SKIP_ORIGIN_CHECK === "1") return { ok: true };
  const origin = request.headers.get("origin") || "";
  const referer = request.headers.get("referer") || "";
  if (!origin && !referer) {
    // Browser same-origin fetch usually sends Origin on POST; missing Origin on schedule/server is OK when not enforce browsers.
    return { ok: true, soft: true };
  }
  try {
    const raw = origin || referer;
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const ok =
      ALLOWED_HOSTS.has(host) ||
      host.endsWith(".netlify.app") ||
      host.endsWith(".netlify.com");
    if (!ok && enforce) return { ok: false, error: "Origin not allowed", status: 403 };
    return { ok: true };
  } catch {
    if (enforce) return { ok: false, error: "Invalid origin", status: 403 };
    return { ok: true };
  }
}

/** In-process + optional Blob-backed rate windows (bounded). */
const memBuckets = new Map();

export function rateLimitCheck(key, { windowMs = 60_000, max = 20 } = {}) {
  const now = Date.now();
  const k = String(key || "anon").slice(0, 200);
  let b = memBuckets.get(k);
  if (!b || now - b.start >= windowMs) {
    b = { start: now, count: 0 };
    memBuckets.set(k, b);
  }
  b.count += 1;
  // Bound map size
  if (memBuckets.size > 5000) {
    const first = memBuckets.keys().next().value;
    memBuckets.delete(first);
  }
  if (b.count > max) return { ok: false, error: "Too many requests", status: 429 };
  return { ok: true, remaining: max - b.count };
}

export function resetRateLimitForTests() {
  memBuckets.clear();
}

export function clipStr(v, n) {
  return typeof v === "string" ? v.trim().slice(0, n) : "";
}

export function parseIdempotencyKey(request, body) {
  const h = request.headers.get("idempotency-key") || request.headers.get("x-idempotency-key") || "";
  const b = body && typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  const raw = (h || b || "").trim().slice(0, 120);
  if (!raw) return null;
  if (!/^[A-Za-z0-9._:-]{8,120}$/.test(raw)) return null;
  return raw;
}
