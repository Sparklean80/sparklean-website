# Conversion boundary evidence — 2026-08-12 (CONVERSION_BOUNDARY_CORRECTION)

**Review branch:** `review/lead-conversion-boundary`  
**Baseline pin:** `76633d0507be579694f19e8b531c77045e3f4ce5`  
**Control Room:** `CONVERSION_BOUNDARY_CORRECTION_REQUIRED` addressed on this branch.  
**Status:** Stop for independent re-review — **no merge, deploy, Netlify preview claim, Ads changes, or production submissions.**

## Corrections landed

1. **Genuine conditional Blob writes** — `writeCas` / `writeLeadCas` use opaque ETag from `getWithMetadata()` (production) with `onlyIfNew` (create) and `onlyIfMatch` (update). **No** unconditional `setJSON` fallback after a failed conditional write. BlobsServer test helper `wrapBlobStoreWithEtagCache` only attaches a cached WriteResult ETag when the read body fingerprint matches the last successful write (BlobsServer omits etag on getWithMetadata).
2. **Atomic idempotency before lead / Brevo** — `claimIdempotency` (`onlyIfNew` + confirm + `onlyIfMatch` seal) runs inside `createLeadAtomically` before `createLead`. Contact and quote handlers call this first; losers hydrate the winner leadId and skip Brevo. Concurrent identical submissions → one lead, one idempotency record, one Brevo send.
3. **Monotonic tracking-state matrix** — `TRACKING_TRANSITIONS` / `canTransitionTrackingStatus`. `BROWSER_SENT` and `OFFLINE_IMPORTED` cannot regress to `FAILED`, `PENDING`, or `OFFLINE_QUEUED`. Illegal reports are ignored (attempt logged).
4. **Append-only race proof** — Distinct `attemptId`s; concurrent `appendAttempt` keeps both; version advances twice; stale ETag writers get `CasConflictError` and must retry with a fresh ETag. `mutateLeadCas` verifies durability after write (BlobsServer can spuriously report dual `onlyIfMatch` success).
5. **Simultaneous contact + quote** — Same idempotency key against real BlobsServer: one leadId, one Brevo call, one idem mapping, one `idempotentReplay` loser.

## Language

Evidence may say **BROWSER_SENT** only. There is **no Google-confirmed attribution** state.

## Local test funnel (this correction)

| Suite | Pass | Fail | Skip |
|-------|------|------|------|
| test:ads | (funnel green) | 0 | 0 |
| test:paid-intake | (funnel green) | 0 | 0 |
| test:leads-store | 28 | 0 | 0 |
| test:conversion-adversarial | 24 | 0 | 0 |
| test:blob-concurrency | 30 | 0 | 0 |

`npm run test:funnel` — all green against memory + **real BlobsServer** (blob-concurrency).

## Stop

No merge · no deploy · no Netlify preview as production proof · no campaign changes · no production submissions until independent re-review and an authorized genuine preview proof.
