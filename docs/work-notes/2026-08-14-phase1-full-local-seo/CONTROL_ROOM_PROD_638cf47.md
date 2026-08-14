# Control Room — production deploy of `638cf47`

**Date:** 2026-08-14  
**Product SHA (exact):** `638cf4767d578bda1b2d7f1335707bf76b153b37`  
**Final production deploy ID:** `6a7f6393e3a2322af323600d`  
**Production URL:** https://www.sparklean.co  
**Unique deploy URL:** https://6a7f6393e3a2322af323600d--sparklean-website.netlify.app  
**Tested page:** `/house-cleaning-naples`  
**Lead UUID:** `b0d8f433-f113-4347-8216-baba9e110432`  
**No Google Ads console changes.**

## Deploy identity

| Check | Result |
|-------|--------|
| Worktree HEAD at deploy | `638cf4767d578bda1b2d7f1335707bf76b153b37` |
| Netlify `commit_ref` | `null` (CLI deploy from detached worktree) |
| Deploy title embeds exact SHA | Yes |
| Apex ↔ unique deploy titles/lengths | Match (page verification) |
| Product source changed during deploy | **No** |

### Packaging note (same SHA, no product edits)

First CLI prod attempt `6a7f62008af4ec4a666153c6` shipped functions **without** `@netlify/blobs` because the detached worktree had no `node_modules` → `quote-submit` 502 `ERR_MODULE_NOT_FOUND`.  

Redeployed **identical product SHA** after `npm ci` in the worktree so esbuild could bundle `@netlify/blobs`. Final live deploy: **`6a7f6393e3a2322af323600d`**.

## SEO / page verification (production)

All returned **200**: five city pages, `/residential-cleaning`, `/vacation-rental-cleaning`.  

| Check | Result |
|-------|--------|
| Unique title / single H1 / self-canonical | Pass |
| `#paid-match` on cities + residential | Pass |
| `#cost-factors` on cities + residential + vacation | Pass |
| `tel:2398883588` + ads/attribution/intake scripts | Pass |
| Sitemap includes cities + residential + vacation | Pass |
| Brand UI (black/gold, paid-match + quote CTA copy) | Pass on Naples proof |

Details: `prod-page-verification.json`

## Bounded production lead (ONE successful)

| Requirement | Result |
|-------------|--------|
| Durable lead created | **PASS** `b0d8f433-f113-4347-8216-baba9e110432` |
| Brevo path accepted (`quote-submit` 200 + ok) | **PASS** |
| Exactly one logical Google conversion | **PASS** (fan-out 3 network URLs / 1 `transaction_id`) |
| Conversion ID | **PASS** `17027441328` (`AW-17027441328`) |
| Conversion label | **PASS** `HnWnCJPRt9kcELDFqLc_` |
| `transaction_id` = lead UUID | **PASS** |
| Attribution `gclid` preserved | **PASS** `CR-PROD-638cf47-city` |
| Durable status `BROWSER_SENT` | **PASS** |
| Refresh completion → no second conversion | **PASS** |

Evidence JSON: `prod-proof/2026-08-14T18-51-46-643Z-sanitized-evidence.json`

### Lead attempts (minimum)

| Attempt | Outcome |
|---------|---------|
| 2× city intake against broken `6a7f6200` functions | **502** — no durable lead |
| 1× city intake against `6a7f6393` | **Success** — only durable lead created |

## Stop

**STOP for Ads final-URL updates (Tony / Ads console separately).**  
No further production leads. No Ads changes from Cursor.
