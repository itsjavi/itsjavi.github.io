import type { APIContext } from "astro";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { type CatalogItem, getCatalog } from "../../lib/catalog";

// 256 px PNG icons with tiles baked in, for the GitHub README and anything else outside the site.
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

const tile = (fill: string, extra = "") =>
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="${RADIUS}" fill="${fill}"/>${extra}</svg>`,
  );

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

function librariesIcon(libraries: CatalogItem[]) {
  const cell = 60;
  const gap = 14;
  const start = (SIZE - (cell * 3 + gap * 2)) / 2;
  const squares = libraries
    .slice(0, 9)
    .map((lib, i) => {
      const x = start + (i % 3) * (cell + gap);
      const y = start + Math.floor(i / 3) * (cell + gap);
      const hue = lib.data.hue;
      return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="14" fill="hsl(${hue} 65% 88%)"/>`;
    })
    .join("");
  return sharp(tile("#e8ebf0", squares)).png().toBuffer();
}

export async function GET({ props }: APIContext<Props>) {
  const png = props.item
    ? await projectIcon(props.item)
    : await librariesIcon(props.libraries ?? []);
  return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png" } });
}
