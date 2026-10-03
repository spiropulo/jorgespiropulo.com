#!/usr/bin/env node
/**
 * Builds HTML pages from partials, transforms gallery listings, and generates work/*.html.
 * Run: node scripts/build-site.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const partialsDir = path.join(root, "partials");
const worksDir = path.join(root, "works");

const config = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));

const paintingStoriesPath = path.join(root, "data", "painting-stories.json");
let paintingStories = {};
if (fs.existsSync(paintingStoriesPath)) {
  paintingStories = JSON.parse(fs.readFileSync(paintingStoriesPath, "utf8"));
}

function renderPaintingStoryHtml(art) {
  const paras = paintingStories[art.primary];
  if (!paras || !paras.length) return "";
  const ps = paras.map((p) => `            <p>${escapeHtml(p)}</p>`).join("\n");
  return `
        <section class="painting-story" aria-labelledby="painting-story-heading">
            <h2 id="painting-story-heading" class="painting-story__title">About this piece</h2>
            <div class="painting-story__body">
${ps}
            </div>
            <p class="painting-story__signature">— Jorge Spiropulo</p>
        </section>`;
}

function workMetaDescription(art) {
  const paras = paintingStories[art.primary];
  if (paras && paras[0]) {
    const t = paras[0].replace(/\s+/g, " ").trim();
    return t.length > 158 ? t.slice(0, 155) + "…" : t;
  }
  return `${art.title} by Jorge Spiropulo. ${art.meta || "Oil painting."}${art.price && !art.sold ? ` ${art.price}.` : ""}`;
}

const GALLERY_FILES = [
  "turn.html",
  "trees_paper.html",
  "trees_canvas.html",
  "express.html",
  "cubes.html",
];

function readPartial(name) {
  return fs.readFileSync(path.join(partialsDir, name), "utf8");
}

function fill(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : ""));
}

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "artwork";
}

function decodeParam(s) {
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch {
    return s;
  }
}

function parseItemHref(href) {
  const q = href.includes("?") ? href.split("?")[1] : href;
  const sources = [];
  let name = "";
  for (const part of q.split("&").filter(Boolean)) {
    const [key, ...rest] = part.split("=");
    const val = decodeParam(rest.join("="));
    if (key && key.startsWith("src")) sources.push(val);
    if (key === "name1") name = val.replace(/_/g, " ");
  }
  return { sources, name };
}

function humanizeFilename(imgPath) {
  const base = path.basename(imgPath, path.extname(imgPath)).replace(/_\d+$/, "");
  return base
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripHtml(s) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseArtworkBlock(blockHtml) {
  const hrefMatch = blockHtml.match(/href="([^"]+)"/);
  const imgMatch = blockHtml.match(/<img[^>]+src="([^"]+)"/i);
  if (!hrefMatch || !imgMatch) return null;

  const href = hrefMatch[1];
  const thumb = imgMatch[1];
  const text = stripHtml(blockHtml);

  const titleMatch = text.match(/Title:\s*(.+?)(?=Medium:|Dimensions|Price|\$|SOLD|$)/i);
  const mediumMatch = text.match(/Medium:\s*(.+?)(?=Dimensions|Price|\$|SOLD|$)/i);
  const dimMatch = text.match(/Dimensions?\s*:?\s*(.+?)(?=Frame|Price|\$|SOLD|$)/i);
  const priceMatch = text.match(/(?:Price\s*:?\s*)?(\$[\d,.]+)/i);
  const sold = /<b>\s*SOLD\s*<\/b>/i.test(blockHtml) || /\bSOLD\b/i.test(text);

  const { sources, name } = parseItemHref(href);
  const primary = sources[0] || thumb;
  const title = (titleMatch ? titleMatch[1].trim() : "") || name.trim() || humanizeFilename(primary);

  let price = priceMatch ? priceMatch[1] : "";
  if (sold) price = "";

  const metaParts = [];
  if (mediumMatch) metaParts.push(mediumMatch[1].trim().replace(/\.$/, ""));
  if (dimMatch) metaParts.push(dimMatch[1].trim().replace(/\.$/, ""));

  return {
    href,
    thumb,
    sources: sources.length ? sources : [thumb],
    title,
    medium: mediumMatch ? mediumMatch[1].trim() : "",
    dimensions: dimMatch ? dimMatch[1].trim() : "",
    meta: metaParts.join(" · "),
    price,
    sold,
    primary,
  };
}

function makeSlug(artwork, used) {
  const fromName = artwork.title ? slugify(artwork.title) : "";
  const fromFile = slugify(path.basename(artwork.primary, path.extname(artwork.primary)).replace(/_\d+$/, ""));
  let base = fromName || fromFile;
  const prefix = slugify(path.dirname(artwork.primary).replace(/^img\//, ""));
  let slug = prefix ? `${prefix}-${base}` : base;
  if (used.has(slug)) {
    let n = 2;
    while (used.has(`${slug}-${n}`)) n++;
    slug = `${slug}-${n}`;
  }
  used.add(slug);
  return slug;
}

function extractGalleryBody(html) {
  const mainMatch = html.match(/<div id="main-content"[^>]*>([\s\S]*?)<\/div>\s*<footer/i);
  if (!mainMatch) return null;
  return mainMatch[1];
}

function extractNonCardContent(body) {
  const parts = body.split(/<div class="col-sm-6 col-md-4 container_js">/);
  const header = parts[0];
  return header.replace(/<br\s*\/?>\s*$/i, "").trim();
}

function parseArtworkCard(blockHtml) {
  const hrefMatch = blockHtml.match(/href="works\/([^"]+)"/);
  const imgMatch = blockHtml.match(/<img[^>]+src="([^"]+)"/i);
  const titleMatch = blockHtml.match(/artwork-card__title">([^<]+)</);
  const metaMatch = blockHtml.match(/artwork-card__meta">([^<]+)</);
  const sold = /artwork-card__badge--sold/.test(blockHtml) || /artwork-card__price--sold/.test(blockHtml);
  const priceMatch = blockHtml.match(/artwork-card__price">([^<]+)</);
  if (!hrefMatch || !imgMatch) return null;
  const slug = hrefMatch[1].replace(/\.html$/, "");
  const meta = metaMatch ? metaMatch[1].trim() : "";
  const metaParts = meta.split(" · ");
  return {
    slug,
    thumb: imgMatch[1],
    sources: [imgMatch[1]],
    title: titleMatch ? titleMatch[1].trim() : humanizeFilename(imgMatch[1]),
    medium: metaParts[0] || "",
    dimensions: metaParts[1] || "",
    meta,
    price: sold ? "" : priceMatch && !/sold/i.test(priceMatch[1]) ? priceMatch[1].trim() : "",
    sold,
    primary: imgMatch[1],
  };
}

function parseGalleryFile(filename) {
  const html = fs.readFileSync(path.join(root, filename), "utf8");
  const body = extractGalleryBody(html);
  if (!body) return { filename, header: "", artworks: [] };

  const header = extractNonCardContent(body);
  const artworks = [];

  if (body.includes("artwork-card")) {
    const cards = body.split(/<article class="artwork-card">/).slice(1);
    for (const chunk of cards) {
      const art = parseArtworkCard('<article class="artwork-card">' + chunk);
      if (art) artworks.push(art);
    }
    return { filename, header, artworks };
  }

  const blocks = body.split(/<div class="col-sm-6 col-md-4 container_js">/).slice(1);
  for (const chunk of blocks) {
    const blockHtml =
      '<div class="col-sm-6 col-md-4 container_js">' +
      chunk.split(/<\/div>\s*(?=<div class="col-sm-6|$)/)[0];
    const art = parseArtworkBlock(blockHtml);
    if (art) artworks.push(art);
  }
  return { filename, header, artworks };
}

const ARTWORKS_DATA = path.join(root, "data", "artworks.json");

function loadArtworksDb() {
  if (fs.existsSync(ARTWORKS_DATA)) {
    return JSON.parse(fs.readFileSync(ARTWORKS_DATA, "utf8"));
  }
  return null;
}

function saveArtworksDb(db) {
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
  fs.writeFileSync(ARTWORKS_DATA, JSON.stringify(db, null, 2), "utf8");
}

function importLegacyGalleries() {
  const usedSlugs = new Set();
  const artworks = {};
  const galleries = {};
  for (const file of GALLERY_FILES) {
    const parsed = parseGalleryFile(file);
    const slugs = [];
    for (const art of parsed.artworks) {
      const slug = makeSlug(art, usedSlugs);
      art.slug = slug;
      artworks[slug] = art;
      slugs.push(slug);
    }
    galleries[file] = { header: parsed.header, slugs };
  }
  return { artworks, galleries };
}

function renderArtworkCard(art, root) {
  const workHref = `${root}works/${art.slug}.html`;
  const alt = `${art.title} — painting by Jorge Spiropulo`;
  const badge = art.sold
    ? '<span class="artwork-card__badge artwork-card__badge--sold">Sold</span>'
    : "";
  const priceLine = art.sold
    ? '<p class="artwork-card__price artwork-card__price--sold">Sold</p>'
    : art.price
      ? `<p class="artwork-card__price">${escapeHtml(art.price)}</p>`
      : "";
  const meta = art.meta ? `<p class="artwork-card__meta">${escapeHtml(art.meta)}</p>` : "";

  return `                <article class="artwork-card">
                    <a class="artwork-card__link" href="${workHref}">
                        <div class="artwork-card__media">
                            <img src="${root}${escapeHtml(art.thumb)}" alt="${escapeHtml(alt)}" width="400" height="400" loading="lazy">
                            ${badge}
                        </div>
                        <div class="artwork-card__body">
                            <h2 class="artwork-card__title">${escapeHtml(art.title)}</h2>
                            ${meta}
                            ${priceLine}
                        </div>
                    </a>
                </article>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function analyticsSnippet() {
  const id = (config.ga4MeasurementId || "").trim();
  if (!id) return "";
  return `    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', '${id}');
    </script>
`;
}

function socialLinksHtml(root) {
  return (config.social || [])
    .map((s) => {
      const ext = s.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `                <a class="site-social__link" href="${s.href}"${ext}>${escapeHtml(s.label)}</a>`;
    })
    .join("\n");
}

function jsonLdScripts(objects) {
  const list = Array.isArray(objects) ? objects : objects ? [objects] : [];
  return list
    .map((o) => `    <script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join("\n");
}

function collectionForArt(art) {
  const dir = art.primary.split("/")[1] || "";
  const map = {
    trees: { name: "Trees", url: `${config.siteUrl}/trees.html` },
    expressionism: { name: "Expressionism", url: `${config.siteUrl}/express.html` },
    cubes: { name: "Cubes", url: `${config.siteUrl}/cubes.html` },
    turn_heads: { name: "Turn", url: `${config.siteUrl}/turn.html` },
  };
  return map[dir] || { name: "Collections", url: `${config.siteUrl}/index.html` };
}

function assemblePage({
  title,
  description,
  canonical,
  ogImage,
  ogImageAlt = "",
  ogType = "website",
  robotsMeta = "index, follow",
  jsonLd = null,
  root,
  bodyHtml,
  wrapGallery,
  extraScripts = "",
}) {
  const ogImageAltMeta = ogImageAlt
    ? `    <meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}">`
    : "";
  const ogImageAltTwitter = ogImageAlt
    ? `    <meta name="twitter:image:alt" content="${escapeHtml(ogImageAlt)}">`
    : "";
  const head = fill(readPartial("head.html"), {
    analytics: analyticsSnippet(),
    title: escapeHtml(title),
    description: escapeHtml(description),
    canonical: escapeHtml(canonical),
    ogImage: escapeHtml(ogImage || config.defaultOgImage),
    ogType: escapeHtml(ogType),
    locale: config.locale || "en_US",
    robotsMeta,
    ogImageAltMeta,
    ogImageAltTwitter,
    siteName: escapeHtml(config.siteName),
    root,
    cssGalleryGrid: `${root}css/gallery-grid.css`,
    jsonLd: jsonLdScripts(jsonLd),
  });
  const header = fill(readPartial("header.html"), { root });
  const footer = fill(readPartial("footer.html"), {
    root,
    siteUrl: config.siteUrl,
    contactEmail: config.contactEmail,
    socialLinks: socialLinksHtml(root),
  });
  const scripts = fill(readPartial("scripts.html"), { root, extraScripts });

  const galleryOpen = wrapGallery ? `\n<div class="container gallery-container site-gallery">` : "";
  const galleryClose = wrapGallery ? `\n</div>` : "";

  return `${head}${galleryOpen}
${header}
${bodyHtml}
${footer}${galleryClose}
</div>
${scripts}
</body>
</html>
`;
}

function renderWorkPage(art, root) {
  const canonical = `${config.siteUrl}/works/${art.slug}.html`;
  const ogImage = `${config.siteUrl}/${art.primary}`;
  const desc = workMetaDescription(art);

  const imgs = art.sources
    .map((src, i) => {
      const alt =
        art.sources.length > 1
          ? `Painting: ${art.title}. View ${i + 1}.`
          : `Painting: ${art.title}.`;
      const loading = i === 0 ? "eager" : "lazy";
      return `            <img src="${root}${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="${loading}">`;
    })
    .join("\n");

  const details = [];
  if (art.medium) details.push(`<dt>Medium</dt><dd>${escapeHtml(art.medium)}</dd>`);
  if (art.dimensions) details.push(`<dt>Dimensions</dt><dd>${escapeHtml(art.dimensions)}</dd>`);
  if (art.sold) details.push(`<dt>Availability</dt><dd>Sold</dd>`);
  else if (art.price) details.push(`<dt>Price</dt><dd>${escapeHtml(art.price)}</dd>`);

  const detailsHtml =
    details.length > 0
      ? `<dl class="item-detail__facts">${details.join("")}</dl>`
      : "";

  const storyHtml = renderPaintingStoryHtml(art);

  const body = `<main id="main-content" class="site-shell item-detail">
        <div class="page-title-row item-detail__header">
            <div class="item-detail__titles">
                <p class="item-page-label">Artwork</p>
                <h1 class="item-artwork-title">${escapeHtml(art.title)}</h1>
            </div>
            <button type="button" class="back-link btn btn-link p-0 border-0 align-baseline" id="back-button" style="font-size: inherit;" aria-label="Go back to previous page">← Back</button>
        </div>
        ${detailsHtml}
        <p class="text-muted item-detail__hint">Additional views appear below when available.</p>
        <div class="item-gallery" aria-live="polite">
${imgs}
        </div>
${storyHtml}
    </main>
    <script>
    document.getElementById('back-button').addEventListener('click', function () {
        if (window.history.length > 1) window.history.back();
        else window.location.href = '${root}index.html';
    });
    </script>`;

  const collection = collectionForArt(art);
  const visualArtwork = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    "@id": canonical,
    name: art.title,
    url: canonical,
    image: art.sources.map((s) => `${config.siteUrl}/${s}`),
    artMedium: art.medium || "Oil paint",
    creator: {
      "@type": "Person",
      name: "Jorge Spiropulo",
      url: config.siteUrl,
    },
  };
  if (art.dimensions) visualArtwork.size = art.dimensions;
  if (art.price && !art.sold) {
    visualArtwork.offers = {
      "@type": "Offer",
      price: art.price.replace(/[^0-9.]/g, ""),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: canonical,
    };
  }
  if (art.sold) {
    visualArtwork.offers = {
      "@type": "Offer",
      availability: "https://schema.org/SoldOut",
      url: canonical,
    };
  }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: config.siteUrl },
      { "@type": "ListItem", position: 2, name: collection.name, item: collection.url },
      { "@type": "ListItem", position: 3, name: art.title, item: canonical },
    ],
  };

  return assemblePage({
    title: `${art.title} — Jorge Spiropulo`,
    description: desc,
    canonical,
    ogImage,
    ogImageAlt: `Painting: ${art.title} by Jorge Spiropulo`,
    ogType: "article",
    root,
    bodyHtml: body,
    wrapGallery: false,
    jsonLd: [visualArtwork, breadcrumb],
  });
}

function renderGalleryPage({ filename, title, description, header, artworks, root }) {
  const canonical = `${config.siteUrl}/${filename}`;
  const ogImage =
    artworks[0]?.primary
      ? `${config.siteUrl}/${artworks[0].primary}`
      : config.defaultOgImage;
  const cards = artworks.map((a) => renderArtworkCard(a, root)).join("\n");

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${title} — Jorge Spiropulo`,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: config.siteName, url: config.siteUrl },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: artworks.length,
      itemListElement: artworks.slice(0, 50).map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${config.siteUrl}/works/${a.slug}.html`,
        name: a.title,
      })),
    },
  };

  const body = `<div id="main-content" class="site-gallery-main" tabindex="-1">
${header}
        <div class="artwork-grid" role="list">
${cards}
        </div>
    </div>`;

  return assemblePage({
    title: `${title} — Jorge Spiropulo`,
    description,
    canonical,
    ogImage,
    ogImageAlt: `${title} paintings by Jorge Spiropulo`,
    root,
    bodyHtml: body,
    wrapGallery: true,
    jsonLd: itemList,
  });
}

// --- Load or import artwork catalog ---
const hasLegacy = GALLERY_FILES.some((f) => {
  const html = fs.readFileSync(path.join(root, f), "utf8");
  return html.includes("container_js");
});

let db = loadArtworksDb();
if (!db || hasLegacy) {
  db = importLegacyGalleries();
  saveArtworksDb(db);
  console.log("Imported", Object.keys(db.artworks).length, "artworks into data/artworks.json");
}

const allArtworks = new Map(Object.entries(db.artworks));

fs.mkdirSync(worksDir, { recursive: true });
const worksIndex = {};
for (const art of allArtworks.values()) {
  const page = renderWorkPage(art, "../");
  fs.writeFileSync(path.join(worksDir, `${art.slug}.html`), page, "utf8");
  const target = `works/${art.slug}.html`;
  worksIndex[art.primary] = target;
  worksIndex[art.slug] = target;
  if (art.title) worksIndex[slugify(art.title)] = target;
}
fs.writeFileSync(path.join(root, "works-index.json"), JSON.stringify(worksIndex, null, 2), "utf8");
console.log("Wrote", allArtworks.size, "work pages in works/");

// --- Rewrite gallery pages ---
const galleryMeta = {
  "turn.html": {
    title: "Turn",
    description: "Turn series — large canvases and turn-of-perspective compositions by Jorge Spiropulo.",
    backHref: "index.html",
    backLabel: "Home",
  },
  "cubes.html": {
    title: "Cubes",
    description: "Cubes series — geometric structure and figures by Jorge Spiropulo.",
    backHref: "index.html",
    backLabel: "Home",
  },
  "express.html": {
    title: "Expressionism",
    description: "Expressionist figure paintings by Jorge Spiropulo — bold brushwork and narrative.",
    backHref: "index.html",
    backLabel: "Home",
  },
  "trees_canvas.html": {
    title: "Trees on canvas",
    description: "Tree paintings on canvas by Jorge Spiropulo.",
    backHref: "trees.html",
    backLabel: "Trees",
  },
  "trees_paper.html": {
    title: "Trees on paper",
    description: "Tree paintings on paper by Jorge Spiropulo.",
    backHref: "trees.html",
    backLabel: "Trees",
  },
};

for (const file of GALLERY_FILES) {
  const meta = galleryMeta[file];
  const g = db.galleries[file];
  if (!g) continue;

  let header = g.header || "";
  if (!header.includes("page-title-row")) {
    header = `        <div class="page-title-row">
            <h1>${meta.title}</h1>
            <a class="back-link" href="${meta.backHref}"><span aria-hidden="true">←</span> ${meta.backLabel}</a>
        </div>
        <hr>`;
  }

  const artworks = g.slugs.map((slug) => db.artworks[slug]).filter(Boolean);
  const page = renderGalleryPage({
    filename: file,
    title: meta.title,
    description: meta.description,
    header,
    artworks,
    root: "",
  });
  fs.writeFileSync(path.join(root, file), page, "utf8");
  console.log("Built", file, `(${artworks.length} works)`);
}

// --- Static pages ---
function homeBody() {
  return `<main id="main-content" class="site-main site-shell">
        <div class="hero" aria-labelledby="hero-heading">
            <div id="carouselFeatured" class="carousel slide hero-carousel" data-ride="carousel" data-interval="7000"
                 role="region" aria-roledescription="carousel" aria-label="Featured artwork">
                <ol class="carousel-indicators">
                    <li data-target="#carouselFeatured" data-slide-to="0" class="active"></li>
                    <li data-target="#carouselFeatured" data-slide-to="1"></li>
                    <li data-target="#carouselFeatured" data-slide-to="2"></li>
                    <li data-target="#carouselFeatured" data-slide-to="3"></li>
                </ol>
                <div class="carousel-inner">
                    <div class="carousel-item active">
                        <img src="img/trees/tree1.JPG" alt="Painting: tree in bold color on canvas." width="1600" height="900" loading="eager">
                    </div>
                    <div class="carousel-item">
                        <img src="img/expressionism/mother-daughter.jpg" alt="Expressionist portrait painting on canvas." width="1600" height="900" loading="lazy">
                    </div>
                    <div class="carousel-item">
                        <img src="img/trees/tree4.JPG" alt="Painting: stylized tree with layered brushwork." width="1600" height="900" loading="lazy">
                    </div>
                    <div class="carousel-item">
                        <img src="img/cubes/large.cube.canvas.turn.heads.boy.girl.boy.jpg" alt="Large cubist-inspired canvas with figures and geometric forms." width="1600" height="900" loading="lazy">
                    </div>
                </div>
                <a class="carousel-control-prev" href="#carouselFeatured" role="button" data-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="sr-only">Previous slide</span>
                </a>
                <a class="carousel-control-next" href="#carouselFeatured" role="button" data-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="sr-only">Next slide</span>
                </a>
                <div class="hero-overlay">
                    <h1 id="hero-heading" class="hero-title">Jorge Spiropulo</h1>
                    <p class="hero-tagline">Oils on canvas and paper — trees, figures, and color-forward expressionist work.</p>
                </div>
            </div>
        </div>

        <section class="collections-section" aria-labelledby="collections-heading">
            <h2 id="collections-heading" class="section-heading">Collections</h2>
            <div class="collection-grid">
                <a class="collection-card" href="trees.html">
                    <div class="collection-card-image">
                        <img src="img/trees/tree1.JPG" alt="" width="600" height="450" loading="lazy">
                    </div>
                    <div class="collection-card-body">
                        <h3 class="collection-card-title">Trees</h3>
                        <p class="collection-card-desc">Recent work on canvas and paper, inspired by nature.</p>
                    </div>
                </a>
                <a class="collection-card" href="turn.html">
                    <div class="collection-card-image">
                        <img src="img/turn_heads/woman.turn.head.cubes.brown.hair.jpg" alt="" width="600" height="450" loading="lazy">
                    </div>
                    <div class="collection-card-body">
                        <h3 class="collection-card-title">Turn</h3>
                        <p class="collection-card-desc">Large canvases and turn-of-perspective compositions.</p>
                    </div>
                </a>
                <a class="collection-card" href="cubes.html">
                    <div class="collection-card-image">
                        <img src="img/cubes/large.cube.canvas.turn.heads.boy.girl.boy.jpg" alt="" width="600" height="450" loading="lazy">
                    </div>
                    <div class="collection-card-body">
                        <h3 class="collection-card-title">Cubes</h3>
                        <p class="collection-card-desc">Geometric structure and figures in conversation.</p>
                    </div>
                </a>
                <a class="collection-card" href="express.html">
                    <div class="collection-card-image">
                        <img src="img/expressionism/nelly.jorge.carla.in.buenos.aires.jpg" alt="" width="600" height="450" loading="lazy">
                    </div>
                    <div class="collection-card-body">
                        <h3 class="collection-card-title">Expressionism</h3>
                        <p class="collection-card-desc">Bold brushwork and narrative figure painting.</p>
                    </div>
                </a>
            </div>
        </section>

        <section class="intro-strip" aria-label="About this site">
            <p>Explore available pieces, dimensions, and pricing in each collection. For purchases or studio visits, use the contact page.</p>
            <a class="text-link" href="about.html">Read about the artist</a>
        </section>
    </main>`;
}

const carouselScript = `<script>
    if (window.jQuery && jQuery.fn.carousel) {
        jQuery('.carousel').carousel();
    }
</script>`;

const homeJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: config.siteName,
    url: config.siteUrl,
    description: config.defaultDescription,
    inLanguage: "en-US",
    publisher: { "@type": "Person", name: "Jorge Spiropulo" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Jorge Spiropulo",
    url: config.siteUrl,
    jobTitle: "Painter",
    description: config.defaultDescription,
    homeLocation: {
      "@type": "Place",
      name: "Moraga, California",
    },
    sameAs: (config.social || [])
      .filter((s) => s.external && s.href.startsWith("http"))
      .map((s) => s.href),
  },
];

fs.writeFileSync(
  path.join(root, "index.html"),
  assemblePage({
    title: "Jorge Spiropulo — Painter",
    description: config.defaultDescription,
    canonical: `${config.siteUrl}/`,
    ogImage: config.defaultOgImage,
    ogImageAlt: "Tree painting in bold color by Jorge Spiropulo",
    root: "",
    bodyHtml: homeBody(),
    wrapGallery: false,
    extraScripts: carouselScript,
    jsonLd: homeJsonLd,
  }),
  "utf8"
);

const aboutBody = `<main id="main-content" class="site-shell prose-page">
        <h1>About</h1>

        <p>Jorge Spiropulo was born in Buenos Aires, Argentina. He drew from an early age, working from subjects on television
            and elsewhere. He began painting in earnest after moving to Los Angeles in the early 1990s, and exhibited at
            Gallery&nbsp;1, <i>Constellation</i>, and <i>The Pavement</i>. He later settled in the San Francisco Bay Area, where he
            continued to paint and to work in software development.</p>

        <p>He has shown in
            <a target="_blank" rel="noopener noreferrer" href="https://eastbayopenstudios.com/">East Bay Open Studios</a>
            and is a member of the
            <a href="https://laa4art.org/" target="_blank" rel="noopener noreferrer">Lamorinda Arts Alliance</a>.
            Following the birth of his children, he exhibited less and concentrated on private work, including portraits of his
            family and scenes from their life and travel. Recent work emphasizes landscape, particularly trees.</p>

        <h2>Artist statement</h2>
        <p>I work chiefly in oil on canvas; I also use watercolor and acrylic on paper. The paintings rely on substantial
            impasto and strong color. Earlier work focused on the figure, including large-scale and mural formats; current work
            is oriented toward landscape and tree forms.</p>

        <h2>Process</h2>
        <p>Work usually begins with informal drawing. I build supports and grounds, establish the image with thin
            application, then develop the surface through successive layers, mixing color as required. When one piece must dry,
            I continue on another. In the studio I typically work with music or with radio, podcasts, or other spoken audio
            in the background.</p>
    </main>`;

fs.writeFileSync(
  path.join(root, "about.html"),
  assemblePage({
    title: "About — Jorge Spiropulo",
    description:
      "Biography and artist statement for Jorge Spiropulo — Argentine-born painter based in Moraga, California. Oils on canvas and paper.",
    canonical: `${config.siteUrl}/about.html`,
    ogImage: `${config.siteUrl}/img/expressionism/mother-daughter.jpg`,
    ogImageAlt: "Mother and daughter portrait by Jorge Spiropulo",
    root: "",
    bodyHtml: aboutBody,
    wrapGallery: false,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      name: "About Jorge Spiropulo",
      url: `${config.siteUrl}/about.html`,
      mainEntity: {
        "@type": "Person",
        name: "Jorge Spiropulo",
        jobTitle: "Painter",
        url: config.siteUrl,
      },
    },
  }),
  "utf8"
);

const contactBody = `<main id="main-content" class="site-shell prose-page">
        <h1>Contact</h1>
        <p>For questions about a specific work, pricing, shipping, or studio visits, use the form below or email
            <a href="mailto:${config.contactEmail}">${config.contactEmail}</a>.
            When you choose <strong>Send message</strong>, your default email app opens with a pre-filled message.</p>
        <p class="text-muted">Please include the artwork title, your location (for shipping), and how you prefer to be reached. I aim to reply within a few business days.</p>

        <form id="contact-form" class="contact-form" action="#" method="post">
            <input type="text" id="contact-website" class="contact-form__honeypot" tabindex="-1" autocomplete="off" aria-hidden="true">

            <div class="contact-form__field">
                <label for="contact-name">Name</label>
                <input id="contact-name" name="name" type="text" required autocomplete="name" maxlength="200">
            </div>
            <div class="contact-form__field">
                <label for="contact-email">Your email</label>
                <input id="contact-email" name="email" type="email" required autocomplete="email" maxlength="254">
            </div>
            <div class="contact-form__field">
                <label for="contact-message">Message</label>
                <textarea id="contact-message" name="message" rows="7" required maxlength="8000"></textarea>
            </div>
            <button type="submit" class="contact-form__submit">Send message</button>
        </form>
    </main>
    <script>
(function () {
    var form = document.getElementById('contact-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var trap = document.getElementById('contact-website');
        if (trap && trap.value) return;
        var name = document.getElementById('contact-name').value.trim();
        var email = document.getElementById('contact-email').value.trim();
        var message = document.getElementById('contact-message').value.trim();
        var body = 'Name: ' + name + '\\r\\n\\r\\nReply to: ' + email + '\\r\\n\\r\\n' + message;
        var subject = 'Inquiry from jorgespiropulo.com';
        window.location.href = 'mailto:${config.contactEmail}?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
})();
</script>`;

fs.writeFileSync(
  path.join(root, "contact.html"),
  assemblePage({
    title: "Contact — Jorge Spiropulo",
    description: "Contact Jorge Spiropulo for inquiries about artwork, commissions, and studio visits.",
    canonical: `${config.siteUrl}/contact.html`,
    ogImage: `${config.siteUrl}/img/trees/tree1.JPG`,
    root: "",
    bodyHtml: contactBody,
    wrapGallery: false,
  }),
  "utf8"
);

const treesBody = `<div id="main-content" class="site-shell site-gallery-main" tabindex="-1">
        <div class="page-title-row">
            <h1>Trees</h1>
            <a class="back-link" href="index.html"><span aria-hidden="true">←</span> Home</a>
        </div>
        <hr>

        <div class="media-choice">
            <a href="trees_canvas.html">
                <img src="img/trees/tree1.JPG" alt="Thumbnail: tree painting on canvas." width="400" height="400" loading="lazy">
                On canvas
            </a>
            <a href="trees_paper.html">
                <img src="img/trees/tree19.JPG" alt="Thumbnail: tree painting on paper." width="400" height="400" loading="lazy">
                On paper
            </a>
        </div>
    </div>`;

fs.writeFileSync(
  path.join(root, "trees.html"),
  assemblePage({
    title: "Trees — Jorge Spiropulo",
    description: "Tree paintings by Jorge Spiropulo — oils on canvas and paper.",
    canonical: `${config.siteUrl}/trees.html`,
    ogImage: `${config.siteUrl}/img/trees/tree1.JPG`,
    root: "",
    bodyHtml: treesBody,
    wrapGallery: false,
  }),
  "utf8"
);

// item.html redirect (legacy URLs — not indexed)
const itemRedirect = assemblePage({
  title: "Artwork — Jorge Spiropulo",
  description: "Redirecting to artwork — Jorge Spiropulo.",
  canonical: `${config.siteUrl}/item.html`,
  ogImage: config.defaultOgImage,
  robotsMeta: "noindex, follow",
  root: "",
  bodyHtml: `<main id="main-content" class="site-shell prose-page">
        <p>Redirecting to artwork…</p>
        <p><a href="index.html">Return home</a></p>
    </main>
    <script src="js/legacy-item-redirect.js"></script>`,
  wrapGallery: false,
});

fs.writeFileSync(path.join(root, "item.html"), itemRedirect, "utf8");

// 404 page
fs.writeFileSync(
  path.join(root, "404.html"),
  assemblePage({
    title: "Page not found — Jorge Spiropulo",
    description: "The page you requested could not be found on jorgespiropulo.com.",
    canonical: `${config.siteUrl}/404.html`,
    ogImage: config.defaultOgImage,
    robotsMeta: "noindex, follow",
    root: "",
    bodyHtml: `<main id="main-content" class="site-shell prose-page">
        <h1>Page not found</h1>
        <p>Sorry, that page does not exist. Browse <a href="index.html">collections</a> or <a href="contact.html">get in touch</a>.</p>
    </main>`,
    wrapGallery: false,
  }),
  "utf8"
);

// sitemap
const lastmod = new Date().toISOString().slice(0, 10);
const sitemapEntries = [
  { loc: `${config.siteUrl}/`, priority: "1.0", changefreq: "weekly" },
  { loc: `${config.siteUrl}/about.html`, priority: "0.8", changefreq: "monthly" },
  { loc: `${config.siteUrl}/contact.html`, priority: "0.8", changefreq: "monthly" },
  { loc: `${config.siteUrl}/sanders`, priority: "0.8", changefreq: "weekly" },
  { loc: `${config.siteUrl}/trees.html`, priority: "0.9", changefreq: "weekly" },
  { loc: `${config.siteUrl}/trees_canvas.html`, priority: "0.85", changefreq: "weekly" },
  { loc: `${config.siteUrl}/trees_paper.html`, priority: "0.85", changefreq: "weekly" },
  { loc: `${config.siteUrl}/turn.html`, priority: "0.9", changefreq: "weekly" },
  { loc: `${config.siteUrl}/cubes.html`, priority: "0.9", changefreq: "weekly" },
  { loc: `${config.siteUrl}/express.html`, priority: "0.9", changefreq: "weekly" },
  ...[...allArtworks.keys()].map((s) => ({
    loc: `${config.siteUrl}/works/${s}.html`,
    priority: "0.7",
    changefreq: "monthly",
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(root, "sitemap.xml"), sitemap, "utf8");

fs.writeFileSync(
  path.join(root, "robots.txt"),
  `User-agent: *
Allow: /

Disallow: /item.html
Disallow: /city.html
Disallow: /canvas.html
Disallow: /paper.html

Sitemap: ${config.siteUrl}/sitemap.xml
`,
  "utf8"
);

// Legacy redirects
const legacyRedirect = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url=index.html">
    <link rel="canonical" href="${config.siteUrl}/index.html">
    <meta name="robots" content="noindex">
    <title>Redirect — Jorge Spiropulo</title>
</head>
<body>
    <p>This page has moved. <a href="index.html">Go to the home page</a>.</p>
</body>
</html>
`;
for (const f of ["city.html", "canvas.html", "paper.html"]) {
  fs.writeFileSync(path.join(root, f), legacyRedirect, "utf8");
}

console.log("Built index, about, contact, trees, 404, item redirect, sitemap.xml, robots.txt");
