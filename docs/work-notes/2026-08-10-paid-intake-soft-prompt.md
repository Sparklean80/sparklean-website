# Work note — Paid intake soft-prompt correction

**Date:** 2026-08-10  
**Branch:** `review/google-ads-paid-intake-funnel`  
**Base review tip:** `be700ea21a8b0485a94283e1dda8858e823ca383`  
**Mode:** Correction on same review branch — no merge / deploy.

## Independent review

CHANGES REQUESTED: do not immediately open full-screen intake for `gclid` / paid UTM. Luxury visitors must see offer + trust first.

## Correction scope

1. `?quote=1` → immediate open (explicit)  
2. Paid click IDs / paid UTM → soft non-blocking prompt after 10s OR 35% scroll  
3. Hero / nav / sticky still open paid five-field flow immediately  
4. Analytics: `paid_quote_prompt_shown`, `paid_quote_started`, `paid_quote_submitted`, `phone_click` (never Google lead conversions except submit+leadId)  
5. Confirmation adds Call Sparklean (no SLA promise)  
6. Tests updated for desktop + 390px mobile  
