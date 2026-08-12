# Conversion boundary evidence — 2026-08-12 (lease / outbox correction)

**Review branch:** `review/lead-conversion-boundary`  
**Baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`  
**Control Room:** Final correction — claim lease recovery + material hash + durable Brevo outbox.  
**Status:** Stop for independent re-review — **no merge, deploy, Netlify preview claim, Ads changes, or production submissions.**

## Corrections landed

1. **Claim lease + orphan recovery** — Idempotency claim is leased (`LEASED`) with material hash before `createLead`. Crash after claim / before create leaves an orphan; identical retry (including after fresh module reload) reclaims the lease, creates exactly one lead, returns a **usable** `reportToken`. Never HTTP 200 with `pendingHydration` for a missing lead (`IDEMPOTENCY_IN_FLIGHT` → 503).
2. **Material binding** — Same idempotency key + different canonical material → `IDEMPOTENCY_MATERIAL_CONFLICT` (409).
3. **Durable notification outbox** — `outbox:{leadId}` states `PENDING` → `SENDING` (send lease) → `DELIVERED`. Crash before Brevo: restart sends once. Crash after Brevo before ack: lease expiry allows controlled recovery to `DELIVERED` without uncontrolled duplicates; subsequent delivers are no-ops.
4. **Handlers** — `contact-submit` / `quote-submit` pass material hash, enqueue outbox, deliver via `deliverOutbox`, mark claim `COMPLETE`.
5. **BlobsServer proofs** — `test:idempotency-lease` (fresh module restart) + existing `test:blob-concurrency`.

## Language

**BROWSER_SENT** only — no Google-confirmed attribution state.

## Local tests

| Suite | Result |
|-------|--------|
| test:funnel (incl. lease recovery) | green |
| test:idempotency-lease | 23/0 |
| test:blob-concurrency | 30/0 |

## Stop

No merge · no deploy · no preview-as-proof · no campaign changes · no production submissions until independent review and authorized genuine preview proof.
