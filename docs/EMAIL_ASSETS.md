# Sparklean marketing email asset library

**Stable public base:** `https://www.sparklean.co/email-assets/`

These filenames are permanent. Do not rename files in `email-assets/` once deployed — ChatGPT / email HTML will hard-code these URLs.

| Purpose | Filename | Public URL | Notes |
| ------- | -------- | ---------- | ----- |
| Team hero | `team-hero.jpg` | https://www.sparklean.co/email-assets/team-hero.jpg | Sparklean crew + gear, kitchen |
| Branded products | `branded-products.jpg` | https://www.sparklean.co/email-assets/branded-products.jpg | Sparklean-labeled spray bottles |
| Residential kitchen | `residential-kitchen.jpg` | https://www.sparklean.co/email-assets/residential-kitchen.jpg | Luxury kitchen, oven detail |
| Luxury home | `luxury-home.jpg` | https://www.sparklean.co/email-assets/luxury-home.jpg | Freestanding tub bathroom |
| Office cleaning | `office-cleaning.jpg` | https://www.sparklean.co/email-assets/office-cleaning.jpg | Team in conference / office doorway |
| Vacation rental | `vacation-rental.jpg` | https://www.sparklean.co/email-assets/vacation-rental.jpg | Hospitality finishing touch (kitchen) |
| Window cleaning | `window-cleaning.jpg` | https://www.sparklean.co/email-assets/window-cleaning.jpg | Interior window + SWFL palms |
| Pressure washing | `pressure-washing.jpg` | https://www.sparklean.co/email-assets/pressure-washing.jpg | **Stand-in** (ladder / glass exterior work) — replace when true pressure-wash photo exists |
| Construction cleaning | `construction-cleaning.jpg` | https://www.sparklean.co/email-assets/construction-cleaning.jpg | Post-construction / site documentation |
| Medical office | `medical-office.jpg` | https://www.sparklean.co/email-assets/medical-office.jpg | **Stand-in** (sanitary / high-touch hygiene) — replace with clinic/medical suite photo when available |
| School cleaning | `school-cleaning.jpg` | https://www.sparklean.co/email-assets/school-cleaning.jpg | **Stand-in** (bright commercial hallway mop) — replace with school/campus photo when available |
| Team working 01 | `team-working-01.jpg` | https://www.sparklean.co/email-assets/team-working-01.jpg | Countertop clean, branded hat |
| Team working 02 | `team-working-02.jpg` | https://www.sparklean.co/email-assets/team-working-02.jpg | Luxury home team briefing |
| Brand logo (gold on black) | `brand-logo.jpg` | https://www.sparklean.co/email-assets/brand-logo.jpg | Logo lockup for headers / footers |

## Specs

- Progressive JPEG
- Target width ~1200px (portrait assets may be taller)
- Target size under ~250KB when practical
- Served from Netlify publish root: `/email-assets/*`

## How ChatGPT / agents should use this

When generating Sparklean HTML emails, pull images **only** from this table. Example:

```html
<img src="https://www.sparklean.co/email-assets/team-hero.jpg" width="600" alt="Sparklean cleaning team" style="display:block;width:100%;max-width:600px;height:auto;" />
```

Prefer Sparklean-original rows over stand-ins. Do not invent placeholder CDN URLs.

## Adding new assets

1. Drop a high-res source into Desktop `Photos Work` (or repo staging).
2. Optimize to progressive JPG ~1200px wide, under ~250KB.
3. Save as a **new** kebab-case filename under `email-assets/` (never overwrite an existing public name unless intentionally replacing the same subject).
4. Add a row to this table.
5. Deploy. Wait for Netlify before using the URL in sends.

## Source mapping (internal)

| Public file | Source in Photos Work |
| ----------- | --------------------- |
| team-hero.jpg | IMG_1459.jpeg |
| branded-products.jpg | 1000062509.JPG |
| residential-kitchen.jpg | 1000062973.jpeg |
| luxury-home.jpg | IMG_1948.jpg |
| office-cleaning.jpg | 1000052028.JPG |
| vacation-rental.jpg | 1000062967.jpeg |
| window-cleaning.jpg | 1000051456.JPG |
| pressure-washing.jpg | 1000051457.jpeg (stand-in) |
| construction-cleaning.jpg | IMG_1449.JPG |
| medical-office.jpg | 1000062974.jpeg (stand-in) |
| school-cleaning.jpg | IMG_1461.jpeg (stand-in) |
| team-working-01.jpg | IMG_1462.jpeg |
| team-working-02.jpg | 1000062961 (1).jpeg |
| brand-logo.jpg | sparkle.jpg |
