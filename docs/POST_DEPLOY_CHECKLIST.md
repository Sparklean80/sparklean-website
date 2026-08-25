# Post-deploy checklist (#10) — run after merging `seo-audit-cleanup-20260824` to production

Do **not** request bulk GSC indexing. Focus on validation and field vitals.

## 1. Confirm production deploy
- [ ] Live `https://www.sparklean.co/` shows the branch tip commit (check Netlify deploy log)
- [ ] `/privacy`, `/terms`, `/accessibility` return **200** (not 404)
- [ ] Footer legal links work on homepage + contact
- [ ] Contact attribution smoke:
  `https://www.sparklean.co/contact?interest=inner-circle&preset=innerCircle&utm_source=audit&utm_campaign=review#quote-intake`
  Confirm hidden fields `interest`, `landingPage`, `utmSource`, `utmCampaign` have values before submit

## 2. Rich Results / structured data
- [ ] [Google Rich Results Test](https://search.google.com/test/rich-results) on:
  - `/`
  - `/residential-cleaning`
  - `/house-cleaning-naples`
  - `/blog/naples-house-cleaning-when-to-hire-a-pro`
  - `/contact`
- [ ] Confirm Organization / LocalBusiness / BlogPosting parse without critical errors

## 3. Search Console
- [ ] Coverage / Page indexing: no unexpected soft-404s on legal or city pages
- [ ] Enhancements: review FAQ / Breadcrumb / Product-related reports if present
- [ ] Core Web Vitals (field): wait for new deploy data; targets LCP ≤ 2.5s, INP < 200ms, CLS < 0.1
- [ ] Do **not** request indexing for legacy residential redirect URLs (Cape Coral / Fort Myers / Naples residential)

## 4. PageSpeed (lab, optional spot-check)
- [ ] PSI mobile on `/`, `/residential-cleaning`, `/contact`
- [ ] Note LCP element and CLS; compare to previous baselines only after cache warms

## 5. Conversion smoke
- [ ] Guided quote open from residential (`preset=recurringResidential`)
- [ ] Vacation rental (`preset=airbnbRental`)
- [ ] Inner Circle (`interest` + `preset=innerCircle`)
- [ ] Simple contact submit success path
- [ ] Confirm analytics events fire (no PII): `quote_started`, `contact_form_submitted`, phone/email clicks
