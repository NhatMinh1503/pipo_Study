// Builds the shop thumbnails in public/shop/ from the finished garden art, so the shop
// always shows the same pictures as the garden. Run again after changing garden art.
//   npm run shop:thumbs
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp, { type OverlayOptions } from "sharp";

interface Point {
  x: number;
  y: number;
}
interface Asset {
  width: number;
  height: number;
  anchor: Point;
  attach?: Point;
}

const root = process.cwd();
const { assets } = JSON.parse(readFileSync(join(root, "lib/garden/assets.json"), "utf8")) as {
  assets: Record<string, Asset>;
};
const GARDEN = join(root, "public/garden");
const OUT = join(root, "public/shop");
/** Thumbnails are shown at 64 px; 160 px covers 2× screens with room to spare. */
const SIZE = 160;
/** Matches FAR_LEG_OFFSET / FAR_LEG_TINT in the garden renderer. */
const FAR_LEG_OFFSET = { front: { x: -6, y: -2 }, back: { x: 7, y: -2 } };
const FAR_LEG_BRIGHTNESS = 0.62;

/** Shop item → the garden image that represents it. */
const SINGLE: Record<string, string> = {
  "seed-maple": "tree-maple-mature",
  "seed-sakura": "tree-sakura-mature-bloom",
  "deco-pond": "deco-pond",
  "deco-lantern": "deco-lantern",
  "deco-bench": "deco-bench",
  "deco-torii": "deco-torii",
  "deco-bridge": "deco-bridge",
};

const file = (id: string) => join(GARDEN, `${id}@2x.png`);

async function fit(input: Buffer | string, name: string): Promise<void> {
  const trimmed = await sharp(input).trim().toBuffer();
  await sharp(trimmed)
    .resize(SIZE - 8, SIZE - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(OUT, `${name}.png`));
}

function info(id: string): Asset {
  const asset = assets[id];
  if (!asset) throw new Error(`Unknown garden asset: ${id}`);
  return asset;
}

/** The cat put together the way the renderer does it, standing on four legs. */
async function cat(): Promise<Buffer> {
  const body = info("cat-body");
  // Canvas in @2x px, with a margin so legs and tail below/behind the body fit
  const margin = 24;
  const width = Math.ceil((body.width + margin * 2) * 2);
  const height = Math.ceil((body.anchor.y + margin * 2) * 2);
  const origin = { x: margin * 2, y: margin * 2 };
  const place = async (id: string, extra: Point = { x: 0, y: 0 }, dim = false) => {
    const part = info(id);
    const at = part.attach ?? { x: 0, y: 0 };
    let image = sharp(file(id));
    if (dim) image = image.modulate({ brightness: FAR_LEG_BRIGHTNESS });
    return {
      input: await image.toBuffer(),
      left: Math.round(origin.x + (at.x + extra.x - part.anchor.x) * 2),
      top: Math.round(origin.y + (at.y + extra.y - part.anchor.y) * 2),
    } satisfies OverlayOptions;
  };
  const layers: OverlayOptions[] = [
    await place("cat-leg-back", FAR_LEG_OFFSET.back, true),
    await place("cat-leg-front", FAR_LEG_OFFSET.front, true),
    await place("cat-tail"),
    await place("cat-leg-back"),
    await place("cat-leg-front"),
    { input: file("cat-body"), left: origin.x, top: origin.y },
  ];
  return sharp({
    create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(layers)
    .png()
    .toBuffer();
}

mkdirSync(OUT, { recursive: true });
for (const [item, asset] of Object.entries(SINGLE)) await fit(file(asset), item);
await fit(await cat(), "deco-cat");
console.log(`shop thumbnails: ${Object.keys(SINGLE).length + 1} files in public/shop/`);
