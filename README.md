# jorgespiropulo.com

Static artist portfolio site.

## Build

After editing gallery source data or `site.config.json`:

```bash
npm run build:all
```

- `npm run build` — regenerates HTML pages, `works/*.html`, `sitemap.xml`, and `robots.txt` from `data/artworks.json`
- `npm run build:stories` — regenerates `js/painting-stories.js` and `data/painting-stories.json`

To re-import artworks from legacy gallery HTML (files containing `container_js`), restore those files from git and run `npm run build`.

## Configuration

Edit `site.config.json`:

- `ga4MeasurementId` — optional Google Analytics 4 ID (leave empty to disable)
- `social` — footer links
- `contactEmail` — contact form recipient

## SEO

The build generates:

- Per-page `<title>`, meta description, canonical URL, Open Graph, and Twitter cards
- Schema.org JSON-LD (`WebSite`, `Person`, `VisualArtwork`, `CollectionPage`, breadcrumbs)
- `sitemap.xml` with priorities and `lastmod`
- `robots.txt` (excludes legacy redirect pages)

After deploy, submit `https://www.jorgespiropulo.com/sitemap.xml` in [Google Search Console](https://search.google.com/search-console). Add your GA4 ID in `site.config.json` when ready.

## Structure

- `partials/` — shared header, footer, head templates
- `scripts/build-site.mjs` — site generator
- `data/artworks.json` — artwork catalog (generated on first import)
- `works/` — per-artwork detail pages
