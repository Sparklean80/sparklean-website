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

## Exact DNS records to authorize (do not apply until Tony approves)

Copy **exact** DKIM CNAME targets from Brevo → **Senders, Domains & Dedicated IPs → Domains → sparklean.co → Authenticate**. Do not invent the CNAME targets.

### 1) Keep a **single** SPF TXT at apex (edit existing — never add a second SPF)

**Current:**
```text
Type: TXT
Host: @ (sparklean.co)
Value: v=spf1 include:_spf.google.com ~all
```

**Recommended edit (optional hygiene; still keep ONE record):**
```text
Type: TXT
Host: @ (sparklean.co)
Value: v=spf1 include:_spf.google.com include:spf.brevo.com ~all
```

Note: On Brevo shared IP, SPF include does **not** by itself produce DMARC alignment for `@sparklean.co` From; DKIM is required. The include is still useful for clarity and some receivers.

### 2) Brevo domain verification TXT (if Brevo shows one)

```text
Type: TXT
Host: @ (or host Brevo shows)
Value: brevo-code:<<<<<<<<copy-from-Brevo-dashboard>>>>>>>>
```

### 3) Brevo DKIM (required)

```text
Type: CNAME
Host: brevo1._domainkey
Value: <<<<<<<<exact target from Brevo dashboard — typically *.dkim.brevo.com>>>>>>>>

Type: CNAME
Host: brevo2._domainkey
Value: <<<<<<<<exact target from Brevo dashboard>>>>>>>>
```

If Brevo’s UI still shows legacy `mail._domainkey` / `mail2._domainkey`, use **exactly** what the dashboard shows for this account.

### 4) DMARC (required for Gmail sender requirements / alignment reporting)

```text
Type: TXT
Host: _dmarc
Value: v=DMARC1; p=none; rua=mailto:info@sparklean.co; fo=1
```

Start at `p=none`. Tighten to `quarantine`/`reject` only after aggregate reports show Brevo DKIM aligned.

## Proof status

| Proof | Status |
|-------|--------|
| Normal Brevo send with From Sparklean + Reply-To customer | **Code ready** (after product deploy) |
| SPF / DKIM / DMARC pass without Gmail impersonation warning | **BLOCKED** until authorized DNS records are live and Brevo marks `sparklean.co` authenticated |

**Next after DNS authorized:** send one contact/intake lead email → open in Gmail → confirm no “couldn’t verify” banner → optionally check headers (`dkim=pass`, `dmarc=pass` aligned to `sparklean.co`). Re-check Brevo Domains UI shows Authenticated.

## Explicitly not done

- DNS mutation  
- Ads settings  
- SEO (starts after this report)  
