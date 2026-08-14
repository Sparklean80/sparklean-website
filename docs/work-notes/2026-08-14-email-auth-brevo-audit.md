# Email authentication audit — Brevo / sparklean.co

**Date:** 2026-08-14  
**Product code SHA (Reply-To correction):** 10144cb671207c29c5e882ccb23969baf61dd427  
**DNS:** audited only — **not modified** (awaiting Tony authorization)

## Control Room context

Priority 1 conversion repair closed at product `028854f` / deploy `6a7f4eaa1972b89cadcfb3a4`. Bounded email-auth correction required before SEO because Gmail warns Sparklean/Brevo messages cannot be verified.

## Code (this change)

| Rule | Status |
|------|--------|
| From = authenticated Sparklean (`SPARKLEAN_FROM_EMAIL` / `info@sparklean.co`) | **Kept** |
| Customer address = Reply-To only (never From) | **Restored** in `contact-submit` + `quote-submit` |
| No JSON attachment | Unchanged |
| No Brevo credential changes | Unchanged |
| No forced Brevo failure in production | Unchanged |

## Live DNS audit (Google DNS + nslookup)

| Check | Result |
|-------|--------|
| Apex SPF TXT | **Present (single):** `v=spf1 include:_spf.google.com ~all` |
| Second SPF TXT | **None** (good — do not add a second) |
| Brevo in SPF | **Missing** (`include:spf.brevo.com` not present) |
| DKIM `brevo1._domainkey` / `brevo2._domainkey` | **NXDOMAIN** |
| DKIM `mail._domainkey` / `mail2._domainkey` | **NXDOMAIN** |
| DMARC `_dmarc.sparklean.co` | **Missing** (NXDOMAIN) |
| MX | Google Workspace (`aspmx.l.google.com` + alts) |

**Root cause of Gmail “cannot verify” / impersonation warning:** Brevo is sending with From `@sparklean.co` but the domain has **no Brevo DKIM selectors** and **no DMARC**. SPF only authorizes Google Workspace, not Brevo’s return-path alignment path. On Brevo shared IPs, **aligned DKIM** is what makes DMARC pass for Sparklean From addresses.

## DNS applied 2026-08-14 (Control Room correction)

**Do not modify SPF. Do not add `include:spf.brevo.com`.** Brevo docs: SPF not required for standard shared-IP domain auth.

Exact Brevo records + apply/auth proof:  
`docs/work-notes/2026-08-14-brevo-domain-auth/2026-08-14-brevo-domain-auth-evidence.md`

| Record | Applied |
|--------|---------|
| SPF | **Unchanged:** `v=spf1 include:_spf.google.com ~all` |
| Verification TXT | `brevo-code:38d801b5503e3eb1ece3a7870a4ab513` |
| DKIM | `brevo1._domainkey` → `b1.sparklean-co.dkim.brevo.com` |
| DKIM | `brevo2._domainkey` → `b2.sparklean-co.dkim.brevo.com` |
| DMARC | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Brevo: **authenticated = true** / **verified = true**.

## Proof status

| Proof | Status |
|-------|--------|
| Normal Brevo send with From Sparklean + Reply-To customer | **PASS** |
| Brevo Domains authenticated | **PASS** |
| Gmail headers DKIM/DMARC + no impersonation warning | **PASS** (closed 2026-08-14) |

**Gmail production-header confirmation:** `dkim=pass` (`header.i=@sparklean.co`, selector `brevo2`); `dmarc=pass` aligned to `header.from=sparklean.co`; `spf=pass` on Brevo envelope-sender; prior “couldn’t verify” warning absent. Apex SPF remains Google-only (unchanged).

## Explicitly not done in this audit file

- Ads settings  
- SEO (continues after this closeout in separate product/evidence commits)  

