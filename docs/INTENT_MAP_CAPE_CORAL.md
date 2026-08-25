# Local search intent map — Cape Coral residential

Evidence (GSC): query cluster **cleaning service cape coral** showed split impressions between `/` (~609) and `/house-cleaning-cape-coral` (~570), avg position ~55.6, **0 clicks**. Homepage was competing for city residential intent.

## Before → After ownership

| Intent | Before (competing) | After (owner) |
|--------|--------------------|---------------|
| Brand / multi-service company (Naples FL HQ framing) | `/` | `/` (unchanged H1/title) |
| **Cape Coral residential / “cleaning service Cape Coral”** | `/` **and** `/house-cleaning-cape-coral` (split) | **`/house-cleaning-cape-coral` only** |
| Residential service type (recurring/deep/move) | `/residential-cleaning` (+ weak “Naples to Cape Coral” meta) | `/residential-cleaning` (SWFL hub; cities via cards) |
| Naples house cleaning | `/house-cleaning-naples` | `/house-cleaning-naples` |
| Bonita Springs house cleaning | `/house-cleaning-bonita-springs` | `/house-cleaning-bonita-springs` |
| Estero house cleaning | `/house-cleaning-estero` | `/house-cleaning-estero` |
| Fort Myers house cleaning | `/house-cleaning-fort-myers` | `/house-cleaning-fort-myers` |

## What changed (copy/meta only)

### Homepage `/`
- Meta/OG/Twitter: removed “cleaning … Naples to Cape Coral” range; use company/service framing without city+service pairing in the snippet.
- Areas H2/CTAs: no longer “Explore Cleaning Services in [City]”; hand off to each **house cleaning page**.
- Cape Coral card: descriptive anchor to canal homes / Cape Harbour / Tarpon Point.
- Hero: cities remain linked in a legitimate service-area sentence (no “Southwest Florida” — banned on homepage).
- `areaServed` schema: **unchanged** (Cape Coral stays).
- FAQ schema services answer: no longer packs all five cities into the services answer (cities FAQ still lists them).

### `/residential-cleaning`
- Meta/hero tag: residential hub that points to city pages (not “Naples to Cape Coral”).
- Cape Coral area card: stronger descriptive link; page remains the service-type hub.

### `/house-cleaning-cape-coral`
- Title/meta/OG + hero: clearer **Cape Coral cleaning service / house cleaning** ownership (existing communities only—no invented neighborhoods).

### Other city pages
- No body-copy ownership fight for Cape Coral (nav/footer/`areaServed` org schema only)—left as-is.

## Do not

- Remove city pages or change URLs
- Invent local facts/stats
- Deploy until Tony approves the new SHA
