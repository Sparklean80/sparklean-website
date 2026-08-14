# Brevo domain authentication — sparklean.co

**Date:** 2026-08-14  
**Control Room:** bounded Brevo domain auth (SPF preserved; no `include:spf.brevo.com`)

## Exact records from Brevo → Domains → Authenticate sparklean.co

Obtained via authenticated Brevo API (`GET /v3/senders/domains/sparklean.co`) using a short-lived production probe (removed after use). **Not assumed.**

### 1) Brevo verification TXT

| Field | Exact value |
|-------|-------------|
| Type | `TXT` |
| Host | `@` (`sparklean.co`) |
| Value | `brevo-code:38d801b5503e3eb1ece3a7870a4ab513` |

### 2) DKIM CNAME records

| Field | Exact value |
|-------|-------------|
| Type | `CNAME` |
| Host | `brevo1._domainkey` |
| Value | `b1.sparklean-co.dkim.brevo.com` |

| Field | Exact value |
|-------|-------------|
| Type | `CNAME` |
| Host | `brevo2._domainkey` |
| Value | `b2.sparklean-co.dkim.brevo.com` |

### 3) DMARC TXT (Brevo starting policy)

| Field | Exact value |
|-------|-------------|
| Type | `TXT` |
| Host | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

### SPF (preserved — not modified)

| Field | Exact value |
|-------|-------------|
| Type | `TXT` |
| Host | `@` (`sparklean.co`) |
| Value | `v=spf1 include:_spf.google.com ~all` |

Brevo official docs: SPF/MX are **not** required for standard shared-IP domain authentication (only for dedicated IP). No `include:spf.brevo.com` added.

## Before → after

- Before JSON: `docs/work-notes/2026-08-14-brevo-domain-auth/*-dns-before.json`
- After JSON: `docs/work-notes/2026-08-14-brevo-domain-auth/*-dns-after.json`
- Netlify zone: `6a0c6abcc2af1a43fa9fc125`
- Created record IDs: `6a7f57d5…` (brevo-code), `6a7f57db…` (dkim1), `6a7f57e3…` (dkim2), `6a7f57e6…` (dmarc)
- **SPF unchanged:** confirmed after apply (`spfUnchanged: true`)

## Public DNS proof (Google DNS, post-apply)

```text
sparklean.co TXT:
  "v=spf1 include:_spf.google.com ~all"
  "brevo-code:38d801b5503e3eb1ece3a7870a4ab513"

_dmarc.sparklean.co TXT:
  "v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com"

brevo1._domainkey.sparklean.co CNAME → b1.sparklean-co.dkim.brevo.com.
brevo2._domainkey.sparklean.co CNAME → b2.sparklean-co.dkim.brevo.com.
```

## Brevo authenticate result

```text
PUT /v3/senders/domains/sparklean.co/authenticate → 200
message: Domain has been authenticated successfully.
verified: true
authenticated: true
All dns_records.*.status: true (brevo_code, dkim1, dkim2, dmarc)
```

## Probe hygiene

- Temporary function `brevo-dns-probe` deployed then **removed**
- Env `BREVO_DNS_PROBE_TOKEN` **unset**
- Redeploy live: `6a7f5842151f1e31fa8cd1d3`
- Probe URL now **404**

## Gmail header proof

| Check | Status |
|-------|--------|
| Proof lead submitted | **Yes** — leadId `c4edb887-bf77-4394-83d2-e30ad144e907` at `2026-08-14T18:03:26.647Z` → `info@sparklean.co` |
| DKIM = PASS aligned `sparklean.co` | **PASS** — `dkim=pass` · `header.i=@sparklean.co` · selector `brevo2` |
| DMARC = PASS | **PASS** — `dmarc=pass` aligned to `header.from=sparklean.co` |
| SPF recorded without breaking Workspace | **PASS** — `spf=pass` on Brevo envelope-sender domain; apex SPF still **only** `v=spf1 include:_spf.google.com ~all` (unchanged) |
| No Gmail impersonation warning | **PASS** — prior “couldn’t verify” warning absent |

**Status: CLOSED** (Control Room / Tony production-header confirmation 2026-08-14).

**Standing rule:** Preserve Sparklean’s existing single Google Workspace SPF record unchanged. Do not add `include:spf.brevo.com`.
