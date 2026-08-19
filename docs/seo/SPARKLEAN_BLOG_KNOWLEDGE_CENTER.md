# Sparklean Knowledge Center (blog strategy)

**Positioning:** Sales assets for choosing, managing, and verifying professional cleaning—not a weekly tip quota.

**Hub:** `/blog` (`pages/blog.html`) — wording reframed 2026-08-05; UI/layout unchanged.

## Rules

| Do | Don’t |
|----|--------|
| Answer a real decision/problem in the title | City-swap the same article five times |
| Lead with a direct answer | DIY “10 kitchen tips” traffic |
| Use Sparklean operational knowledge | Invent stats, testimonials, or safety claims |
| Link one primary service page + relevant city page | Compete with city pages for “cleaning service in [city]” |
| CTA = recurring care (residential) or partner/referral (B2B) | End every piece with generic “Get a Quote” only |
| Valid BlogPosting + canonical org entity | Unsupported “licensed / non-toxic / no subcontractors—ever” |

**Verified facts only:** registered Florida business · bonded · insured (GL) · Workers’ Comp · professionally managed/supervised · 24-hour happiness guarantee.

City pages own local service keywords. Blog owns decisions.

## Four clusters (publish fewer, better)

### Recurring-home decisions
1. Weekly vs. Biweekly vs. Monthly Cleaning: What Actually Works for Your Home?
2. What to Expect During Your First Professionally Managed Cleaning Visit
3. Why Recurring Cleaning Becomes More Consistent After the First Visit
4. How to Maintain a Home While You’re Away
5. Seasonal Arrival Cleaning for Homes You Don’t Live in Year-Round

### Trust and accountability
6. Before Hiring a Cleaning Company: Seven Questions Every Homeowner Should Ask
7. Why Workers’ Compensation and Insurance Matter Inside Your Home
8. Employees, Subcontractors and Marketplace Cleaners: What Homeowners Should Understand
9. What “Professionally Supervised Cleaning” Actually Means
10. What Happens When Something Is Missed During a Cleaning Visit?

### High-intent service problems
11. Deep Cleaning vs. Recurring Cleaning: Which One Do You Need?
12. Move-In Cleaning Checklist
13. What Builders Commonly Miss Before a Final Construction Clean
14. Why Construction Dust Returns After a Property Looks Clean
15. How Much Does Recurring House Cleaning Cost? *(honest ranges only if founder-approved; no Southwest Florida / Marco Island framing)*

### Referral-partner knowledge
16. A Realtor’s Pre-Listing Cleaning Checklist
17. What Home-Watch Companies Should Expect From a Cleaning Partner
18. Final-Clean Standards Before a Builder Hands Over the Keys
19. How Property Managers Can Evaluate a Cleaning Vendor
20. Preparing a Seasonal Home Before the Owner Returns

**Status:** Roadmap — do not auto-generate. Existing 12 posts remain live with claim scrub + recurring CTAs; replace/retire city-template duplicates only when a stronger cluster article ships.

## Tooling

```bash
node scripts/scrub-blog-claims.mjs   # claim/CTA wording pass on pages/blog/*.html
```
