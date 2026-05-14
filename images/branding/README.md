# Branding — logo asset

The live site currently loads the **transparent** mark from Webflow CDN (same file as before), so the logo always renders even if this folder has no PNG committed.

**Optional self-hosted file:** add `Sparklean_Logo_Transparent.png` here and switch HTML / `quote-submit.mjs` / generators to:

`/images/branding/Sparklean_Logo_Transparent.png`  
(or `https://www.sparklean.co/images/branding/Sparklean_Logo_Transparent.png`)

Netlify paths are **case-sensitive**; the filename must match exactly.
