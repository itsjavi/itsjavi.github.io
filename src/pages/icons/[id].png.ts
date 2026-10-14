import type { APIContext } from "astro";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { type CatalogItem, getCatalog } from "../../lib/catalog";

// 256 px PNG icons with tiles baked in, for the GitHub README and anything else outside the site.
// They must read on both white and near-black backgrounds (GitHub's light and dark themes).
const SIZE = 256;
const RADIUS = Math.round(SIZE * 0.225);

export async function getStaticPaths() {
  const catalog = await getCatalog();
  return [
    ...catalog
      .filter((p) => p.data.icon)
      .map((item) => ({ params: { id: item.id }, props: { item } })),
    {
      params: { id: "libraries" },
      props: { libraries: catalog.filter((p) => p.data.shelf === "libs" && !p.data.icon) },
    },
  ];
}

interface Props {
  item?: CatalogItem;
  libraries?: CatalogItem[];
}

function luminance(hex: string) {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * A rounded tile from a color or a `linear-gradient(…)` with two hex stops (the site uses the same value as a CSS
 * background), with an edge that keeps it visible on backgrounds close to its color.
 */
function tile(fill: string, inner = "") {
  const [top, bottom = top] = fill.match(/#[0-9a-f]{3,8}/gi) ?? ["#ffffff"];
  // Dark tiles get a faint light ring; light tiles a visible border so they don't vanish on white.
  const dark = luminance(top) < 0.5;
  const width = dark ? 2 : 4;
  const ring = dark
    ? `stroke="#ffffff" stroke-opacity="0.2" stroke-width="${width}"`
    : `stroke="#0f172a" stroke-opacity="0.16" stroke-width="${width}"`;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1">` +
      `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>` +
      `<rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="url(#g)"/>${inner}` +
      `<rect x="${width / 2}" y="${width / 2}" width="${SIZE - width}" height="${SIZE - width}" rx="${RADIUS - width / 2}" fill="none" ${ring}/>` +
      `</svg>`,
  );
}

async function projectIcon(item: CatalogItem) {
  const { icon, iconTile, iconPixelated } = item.data;
  const source = await readFile(`src/assets/icons/${icon}`);
  if (!iconTile) return sharp(source, { density: 300 }).resize(SIZE, SIZE).png().toBuffer();
  const inner = Math.round(SIZE * (iconPixelated ? 0.68 : 0.64));
  const glyph = await sharp(source, { density: 300 })
    .resize(inner, inner, {
      kernel: iconPixelated ? "nearest" : "lanczos3",
      fit: "contain",
      background: "#0000",
    })
    .png()
    .toBuffer();
  return sharp(tile(iconTile))
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toBuffer();
}

/** A sky tile (the site's accent) with a 3×3 grid of package boxes, each with its library's color. */
function librariesIcon(libraries: CatalogItem[]) {
  const cell = 52;
  const gap = 12;
  const start = (SIZE - (cell * 3 + gap * 2)) / 2;
  const boxes = Array.from({ length: 9 }, (_, i) => {
    const x = start + (i % 3) * (cell + gap);
    const y = start + Math.floor(i / 3) * (cell + gap);
    const hue = libraries[i]?.data.hue;
    const label =
      hue === undefined
        ? ""
        : `<rect x="${x + 14}" y="${y + 14}" width="${cell - 28}" height="${cell - 28}" rx="6" fill="hsl(${hue} 72% 56%)"/>`;
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="13" fill="#ffffff" fill-opacity="0.94"/>${label}`;
  }).join("");
  return sharp(tile("linear-gradient(160deg, #7dd3fc, #0369a1)", boxes)).png().toBuffer();
}

export async function GET({ props }: APIContext<Props>) {
  const png = props.item
    ? await projectIcon(props.item)
    : await librariesIcon(props.libraries ?? []);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
