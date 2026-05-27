#!/usr/bin/env node
/**
 * Generates js/painting-stories.js — unique SEO-oriented copy per artwork.
 * Run: node scripts/generate-painting-stories.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const db = JSON.parse(fs.readFileSync(path.join(root, "data", "artworks.json"), "utf8"));
const artworks = Object.values(db.artworks);

function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(arr, seed, salt = 0) {
  return arr[hash32(`${seed}|${salt}`) % arr.length];
}

function collectionMeta(primary) {
  const dir = primary.split("/")[1] || "";
  const map = {
    trees: {
      label: "Trees",
      style: "tree landscape painting",
      tags: ["landscape oil painting", "tree art on canvas", "nature painting Bay Area"],
    },
    expressionism: {
      label: "Expressionism",
      style: "expressionist figurative painting",
      tags: ["expressionist portrait", "bold figurative oil painting", "narrative figure painting"],
    },
    cubes: {
      label: "Cubes",
      style: "cubist-influenced figurative painting",
      tags: ["geometric figure painting", "cubist style oil on canvas", "modern figurative art"],
    },
    turn_heads: {
      label: "Turn",
      style: "Turn head portrait painting",
      tags: ["contemporary portrait oil painting", "figurative turn-perspective composition", "large format portrait canvas"],
    },
  };
  return (
    map[dir] || {
      label: "Fine art",
      style: "original oil painting",
      tags: ["contemporary oil painting", "original artwork for sale"],
    }
  );
}

function availabilityPhrase(art) {
  if (art.sold) {
    return "This piece has been sold; similar works may be available—contact the artist for current inventory.";
  }
  if (art.price) {
    return `Available for purchase at ${art.price} (shipping quoted separately).`;
  }
  return "Contact Jorge Spiropulo for availability and shipping.";
}

function mediumPhrase(art) {
  const m = (art.medium || "").toLowerCase();
  if (m.includes("paper")) return "oil and mixed media on paper";
  if (m.includes("canvas")) return "oil on canvas";
  return art.medium || "oil paint";
}

function humanizeFilename(base) {
  return base
    .replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/i, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function article(phrase) {
  return /^[aeiou]/i.test(phrase.trim()) ? "an" : "a";
}

function displayTitle(art) {
  const t = (art.title || "").trim();
  if (!t || /^pic$/i.test(t)) {
    return titleCase(humanizeFilename(path.basename(art.primary)));
  }
  return t;
}

function locationSeo(salt) {
  return pick(
    [
      "Jorge Spiropulo is a painter based in Moraga, California, in the San Francisco East Bay.",
      "Studio work by Bay Area artist Jorge Spiropulo, based in Moraga, CA.",
      "Original art from Jorge Spiropulo, an Argentine-born painter working in the San Francisco Bay Area.",
      "Moraga and Lamorinda-area studio practice, within easy reach of Oakland and San Francisco collectors.",
      "Northern California oil paintings by Jorge Spiropulo, with roots in Buenos Aires, Argentina.",
    ],
    "loc",
    salt
  );
}

function artistCred(salt) {
  return pick(
    [
      "Spiropulo has shown with East Bay Open Studios and the Lamorinda Arts Alliance.",
      "His work spans expressionist portraits, cubic figure compositions, and recent tree landscapes.",
      "Collectors search for his work under Jorge Spiropulo, Jorge Mario Spiropulo, and Bay Area figurative oil painting.",
      "Earlier exhibitions included Los Angeles galleries; current work focuses on private and regional sales.",
      "Paintings emphasize impasto, strong color, and figure/landscape subjects painted in oil.",
    ],
    "cred",
    salt
  );
}

function opener(art, col, salt) {
  const title = displayTitle(art);
  const avail = availabilityPhrase(art);
  const aStyle = `${article(col.style)} ${col.style}`;
  const templates = [
    `“${title}” is ${article(col.style)} original ${col.style} by Jorge Spiropulo — ${mediumPhrase(art)}. ${avail}`,
    `Jorge Spiropulo’s “${title}” belongs to the ${col.label} collection: ${aStyle} for collectors of contemporary California art. ${avail}`,
    `Search “${title} Jorge Spiropulo” to find this ${col.style} — ${mediumPhrase(art)} from the artist’s ${col.label} series. ${avail}`,
    `Original painting “${title}” (${col.label}) by Jorge Spiropulo, ${mediumPhrase(art)}, offered from the artist’s Bay Area studio. ${avail}`,
    `Art buyers looking for ${col.tags[0]} may discover “${title}” — ${aStyle} signed by Jorge Spiropulo. ${avail}`,
  ];
  return pick(templates, art.primary, salt);
}

function bodyParagraph(art, col, salt) {
  const dim = art.dimensions ? `Size: ${art.dimensions.replace(/\.$/, "")}. ` : "";
  const keyword = pick(col.tags, art.primary, salt);
  const technique = pick(
    [
      "Brushwork is direct and layered, with color used structurally rather than decoratively.",
      "The surface builds through successive oil layers, typical of Spiropulo’s studio process.",
      "Composition balances drawing and painterly mass—readable at a distance, detailed up close.",
      "Light and shadow are invented in the studio, not copied literally from photography.",
      "Figures and forms are simplified into bold planes while keeping emotional legibility.",
      "Impasto and saturated hue are hallmarks collectors associate with Jorge Spiropulo originals.",
    ],
    art.primary,
    salt + 1
  );
  const theme = pick(
    [
      `The ${col.label} series connects Argentine visual memory with California studio light.`,
      `Themes include family, street life, music, and landscape—subjects that recur across Spiropulo’s career.`,
      `This work fits searches for ${col.tags[1]} and ${col.tags[2]}.`,
      `Imagery draws on personal history in Buenos Aires and decades of painting in California.`,
      `Collectors of ${col.style} often pair this piece with other works from the same series.`,
      `Keywords: ${keyword}, ${col.tags[1]}, Jorge Spiropulo ${col.label.toLowerCase()}.`,
    ],
    art.primary,
    salt + 2
  );
  return `${dim}${technique} ${theme}`;
}

function closer(art, salt) {
  const inquiry = pick(
    [
      "Email the artist through jorgespiropulo.com for purchase inquiries, framing, or studio visits.",
      "Use the contact form at jorgespiropulo.com to ask about this painting, delivery, and payment.",
      "Inquiries about shipping, framing, and studio pickup in Moraga are welcome via the website contact page.",
      "For hi-res photos or dimensions confirmation, contact Jorge Spiropulo before buying.",
    ],
    art.primary,
    salt + 3
  );
  return `${locationSeo(salt + 4)} ${artistCred(salt + 5)} ${inquiry}`;
}

function storyForTree(art, salt) {
  const num = path.basename(art.primary).match(/tree(\d+)/i)?.[1] || "";
  const title = displayTitle(art);
  const treeHook = num
    ? pick(
        [
          `“${title}” studies canopy rhythm and trunk weight—landscape oil painting for collectors of arboreal subjects.`,
          `Landscape ${title} targets searches for tree painting, oil landscape, Moraga artist, and Bay Area nature art.`,
          `This tree canvas (${title}) pairs simplified foliage with strong vertical structure and impasto sky passages.`,
          `Buyers searching tree oil painting California or Jorge Spiropulo trees may land on ${title}.`,
        ],
        art.primary,
        salt + 6
      )
    : `“${title}” emphasizes branches, foliage mass, and seasonal color in oil.`;
  const col = collectionMeta(art.primary);
  return [opener(art, col, salt), `${treeHook} ${bodyParagraph(art, col, salt)}`, closer(art, salt)];
}

function generateStory(art) {
  const col = collectionMeta(art.primary);
  const salt = hash32(art.slug || art.primary);

  if (art.primary.includes("/trees/")) {
    return storyForTree(art, salt);
  }

  return [opener(art, col, salt), bodyParagraph(art, col, salt), closer(art, salt)];
}

const STORIES = {};

for (const art of artworks) {
  const paras = generateStory(art);
  STORIES[art.primary] = paras;
  for (const src of art.sources || []) {
    STORIES[src] = paras;
  }
}

const sortedKeys = Object.keys(STORIES).sort();

const lines = [
  "/** Auto-generated by scripts/generate-painting-stories.mjs — do not edit by hand. */",
  "(function (global) {",
  '  "use strict";',
  "  var STORIES = {",
];

for (const src of sortedKeys) {
  lines.push(`    ${JSON.stringify(src)}: ${JSON.stringify(STORIES[src])},`);
}

lines.push("  };");
lines.push("");
lines.push("  global.getPaintingStoryParagraphs = function (primarySrc) {");
lines.push("    if (!primarySrc) return null;");
lines.push("    return STORIES[primarySrc] || null;");
lines.push("  };");
lines.push('})(typeof window !== "undefined" ? window : globalThis);');
lines.push("");

fs.writeFileSync(path.join(root, "js", "painting-stories.js"), lines.join("\n"), "utf8");

const byPrimary = {};
for (const art of artworks) {
  byPrimary[art.primary] = STORIES[art.primary];
}
fs.mkdirSync(path.join(root, "data"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "painting-stories.json"),
  JSON.stringify(byPrimary, null, 2),
  "utf8"
);

console.log(
  "Wrote js/painting-stories.js + data/painting-stories.json —",
  artworks.length,
  "artworks,",
  sortedKeys.length,
  "image keys"
);
