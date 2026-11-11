// Builds the shop thumbnails in public/shop/ from the finished garden art, so the shop
// always shows the same pictures as the garden. Run again after changing garden art.
//   npm run shop:thumbs
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

const root = process.cwd();
const GARDEN = join(root, "public/garden");
const OUT = join(root, "public/shop");
/** Thumbnails are shown at 64 px; 160 px covers 2× screens with room to spare. */
const SIZE = 160;

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
// Pet thumbnails (deco-slime, pet-slime-*) are cut from the painted pet sheet at full size,
// because the garden sprites are too small to enlarge; they are not rebuilt here.

const file = (id: string) => join(GARDEN, `${id}@2x.png`);

async function fit(input: Buffer | string, name: string): Promise<void> {
  const trimmed = await sharp(input).trim().toBuffer();
  await sharp(trimmed)
    .resize(SIZE - 8, SIZE - 8, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(join(OUT, `${name}.png`));
}

mkdirSync(OUT, { recursive: true });
for (const [item, asset] of Object.entries(SINGLE)) await fit(file(asset), item);
console.log(`shop thumbnails: ${Object.keys(SINGLE).length} files in public/shop/`);
