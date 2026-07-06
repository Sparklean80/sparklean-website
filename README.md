# Sparklean Cleaning — website

Marketing site for [Sparklean Cleaning](https://www.sparklean.co/) (Southwest Florida luxury residential & commercial cleaning).

**Hosted on Netlify.** Static HTML + `netlify.toml` redirects.

## For Cursor / developers

→ **[docs/SPARKLEAN_REFERENCE.md](docs/SPARKLEAN_REFERENCE.md)** — full project bible (URLs, blogs, SEO, brand, patterns)

→ **[AGENTS.md](AGENTS.md)** — short agent instructions

## Local commands

```bash
npm run sitemap   # regenerate sitemap.xml from netlify.toml
node _crawl-verify.js   # live link check against sparklean.co
```

## Deploy

Push to `main` → Netlify builds (`npm run build`) and publishes.
