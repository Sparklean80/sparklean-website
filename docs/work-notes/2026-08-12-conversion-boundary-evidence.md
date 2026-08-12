# Conversion boundary evidence — 2026-08-12 (lease-fence / reconciliation)

**Review branch:** `review/lead-conversion-boundary`  
**Baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`  
**Product SHA (this correction):** `b18a49f726f596c9b8e6b5e9b5f362807480ddb7`  
**Control Room:** Additional correction on `ff0562b` — real claim leases, outbox fencing, no false durable success.  
**Status:** Stop for independent re-review — **no merge, deploy, preview, production submissions, or Google Ads changes.**

## Corrections landed

1. **Real claim-lease ownership** — Missing lead cannot be reclaimed while lease is active (`IDEMPOTENCY_IN_FLIGHT`). Reclaim only after verified expiry via `onlyIfMatch` on the exact prior ETag. Controllable clock proofs: deny before expiry; succeed after.
2. **Outbox fencing** — `SENDING` → `DELIVERED` / `FAILED` / `RECONCILIATION_REQUIRED` requires exact `sendLeaseOwner`, `sendFence`, and unexpired send lease. Stale sender success/failure cannot mutate a newer lease.
3. **No false durable success** — Brevo accept without durable `DELIVERED` → `RECONCILIATION_REQUIRED`; HTTP `ok: false` + `DELIVERY_RECONCILIATION_REQUIRED`; claim not marked complete; ops alert (no PII/secrets/tokens).
4. **Full quote material hash** — Recursive normalize of all customer answers (bedrooms, bathrooms, frequency, notes, consents, etc.). Attribution keys excluded and documented (`MATERIAL_EXCLUDED_ATTR_KEYS`). Any answer mutation → `IDEMPOTENCY_MATERIAL_CONFLICT`.
5. **Outbox payload bind** — Existing outbox with different `payloadHash` → `OUTBOX_PAYLOAD_CONFLICT` (never silent reuse).
6. **Honest Brevo semantics** — `BREVO_DELIVERY_SEMANTICS`: at-least-once-ambiguous; `exactlyOnce: false`. After-send-before-ack may duplicate; reconciliation required.

## BlobsServer proofs (`test:idempotency-lease` 33/0)

- Active lease cannot be reclaimed  
- Expired orphan reclaimed; twelve concurrent post-expiry reclaimers → one lead  
- Stale sender cannot mark DELIVERED or FAILED  
- Brevo success + failed ack → RECONCILIATION_REQUIRED; reconcile idempotent  
- Quote field mutations conflict; outbox payload mismatch rejected  
- Contact vs quote material distinct; forged/cross/expired + monotonic suites remain green via `test:funnel`

## Stop

No merge · no deploy · no Netlify preview · no production lead submissions · no Google Ads changes.
