# Work note — Google Ads paid-intake funnel correction

**Date:** 2026-08-10  
**Branch:** `review/google-ads-paid-intake-funnel`  
**Base SHA:** `a27ae9b3136f2056398ca607a55aef9ed1cdb7c7`  
**Tip SHA:** `90e781094ea29c716335084244e8d2029e752a63`  
**Repo:** `Sparklean80/sparklean-website`  
**Mode:** Review branch only — no merge / deploy in this workstream.

## Production proof already established (ChatGPT)

- Guided intake submitted successfully; Tony received email for “Tony Giuliano - Funnel Test.”
- Step UI defect: “Step 5 of 5” / “Send request” then expands to ~14 steps (abandonment risk).
- Google Ads still “Awaiting conversions” — **do not claim attributed conversion proof.**
- `/customer-portal` Get a Quote does not open intake (scripts/CSS missing).

## Scope (bounded)

1. Paid-intake mode via `?quote=1`, `gclid`, or recognized paid UTMs  
2. Auto-open guided intake on paid landings  
3. Paid mode = name, phone, email, city/ZIP, service → submit  
4. No mandatory property-detail questions in paid mode  
5. Never show “Step 5 of 5” / “Send request” when more mandatory steps remain  
6. Keep Ads conversion gated on Brevo/`leadId` success  
7. Wire intake into `/customer-portal`  
8. Explicit `data-sparklean-intake` on quote CTAs  
9. Keep Netlify contact form for organic; paid traffic → intake  
10. Desktop/mobile funnel tests  

## Out of scope

No redesign, new quote page, CRM, GTM, Consent Mode, homepage rewrite, Ads budget, or deploy.
