# Referral / recurring machine — merge & deploy runbook

**Engineering freeze:** `3baa24b` (Founder IR PASS — product/behavior tip).  
**Branch:** `feat/referral-recurring-machine` (docs-only commits such as this runbook may sit above `3baa24b`; do not add referral engineering or broaden scope).  
**Authorization:** Merge and production deploy only when separately approved. This runbook does not authorize either.

---

## Pre-merge checks (local)

```bash
git checkout feat/referral-recurring-machine
git merge-base --is-ancestor 3baa24b712a47bf8ff5c461ce51696232e2dcf3d HEAD && echo "engineering freeze present"
git log --oneline 3baa24b..HEAD   # docs-only only; no new product commits
npm run test:referral
npm run test:schema
npm run test:testimonials
npm run build
```

---

## Affected routes

| Clean URL | File | Change |
|-----------|------|--------|
| `/why-sparklean` | `pages/why-sparklean.html` | New trust checklist + recurring CTA |
| `/refer` | `pages/refer.html` | Referral intake entry |
| `/partners` | `pages/partners.html` | Partner category → `/refer?type=…` |
| `/` | `index.html` | Recurring-first CTAs + trust links |
| `/residential-cleaning` | `pages/residential-cleaning.html` | Recurring CTAs; fallback `#pane-recurring` |
| City residential pages | `pages/house-cleaning-*.html` | Recurring CTAs / trust links |

Rewrites: `netlify.toml` (`/why-sparklean`, `/refer`, `/partners` → pages). Sitemap includes the new URLs after build.

---

## Netlify function impact

| Item | Detail |
|------|--------|
| Function | `netlify/functions/quote-submit.mjs` (existing endpoint) |
| Referral path | Validates permission/consent; **fail-closed** `referralType` allowlist; **never** copies referrer ↔ referred fields |
| AI | Referrals **skip OpenAI**; local summary only |
| Email | Referral-specific Brevo HTML/text (two identity blocks) → `SPARKLEAN_LEAD_TO` |
| Non-referral | Unchanged luxury intake email path (OpenAI optional, non-blocking) |
| Env (unchanged) | `BREVO_API_KEY`, `SPARKLEAN_FROM_EMAIL`, `SPARKLEAN_LEAD_TO`; `OPENAI_API_KEY` optional and unused for referrals |

No new function name; no new env vars required for this merge.

---

## Merge steps (when authorized)

1. Open PR: `feat/referral-recurring-machine` → `main` (base tip `3baa24b` only).
2. Confirm CI / local gates above are green.
3. Merge (merge commit or squash — keep tip content identical to freeze).
4. Confirm Netlify production deploy from `main` succeeds.
5. Do **not** ship further commits on this feature without a new IR cycle.

---

## Rollback

**Fast (preferred):** Netlify → production site → **Publish previous deploy** (pre-merge deploy).

**Git:**

```bash
git checkout main
git revert <merge-commit-sha>   # or reset only if explicitly authorized and undeployed
git push origin main
```

After rollback, confirm `/why-sparklean`, `/refer`, `/partners` 404 or prior behavior, and that a standard `/contact` quote still emails via Brevo.

---

## Production smoke (post-deploy)

### 1) Referral intake

1. Open `https://www.sparklean.co/refer`.
2. Complete intake: distinct referrer phone **or** email; distinct referred phone **or** email; type from allowlist; permission = yes; consent = agree.
3. Expect success UI (no technical error).
4. Inbox (`SPARKLEAN_LEAD_TO`): subject like `Sparklean referral · {type} · …`; body has **Referrer** and **Referred party** sections with unmixed contacts; no OpenAI/AI-summary dependency.
5. Optional negative: omit consent → client/server rejection (no Brevo send).

### 2) Recurring residential intake

1. From home or `/why-sparklean`, use **Begin recurring residential care** (or `/contact` with recurring preset).
2. Complete a short residential recurring path (cadence weekly/biweekly/monthly).
3. Expect success UI + normal Sparklean inquiry email (non-referral layout).
4. Non-JS fallback: `/residential-cleaning#pane-recurring` lands on the recurring pane.

---

## Analytics verification (privacy-safe)

In browser DevTools → Console / `dataLayer` (and GA4 DebugView if used):

| Event | When | Allowed params only |
|-------|------|---------------------|
| `why_sparklean_view` | Visit `/why-sparklean` | none required |
| `referral_started` / `referral_submitted` | Open / complete referral intake | `referral_type` (allowlisted) |
| `partner_type_selected` | Partner card click | `referral_type` |
| `recurring_quote_started` / `recurring_quote_submitted` | Recurring preset | `intake_preset` / cadence-safe keys |
| `google_reviews_clicked` | Reviews CTA | none |

**Fail if** any event payload contains name, phone, email, notes, or address. Helper: `js/sparklean-events.js` (allowlisted keys only).

---

## Explicit non-claims

- Brevo + Netlify logs ≠ closed-loop referral CRM.
- No durable source / owner / status / contacted / booked / recurring conversion / partner attribution until a future owned system exists.
- Empty case-study manifest remains empty; do not invent proof.
