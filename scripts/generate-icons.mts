// Renders the PWA icons and favicon from public/icons/icon-source.png (square, ≥ 512px).
// Run after replacing the source image:
//   npm run icons
import { join } from "node:path";

import sharp from "sharp";

const dir = join(process.cwd(), "public/icons");
const source = join(dir, "icon-source.png");
// The cream of the artwork's own border; also the padding colour of the maskable icon
const CREAM = { r: 252, g: 246, b: 234 };
// Anything darker than this, reachable from a corner, lies outside the rounded artwork
const OUTSIDE_LUMA = 235;

/**
 * The source artwork is a rounded square on black corners. Launchers apply their own
 * rounding, so the corners are flood-filled with cream to make a full-bleed square.
 */
async function fullBleedSource(): Promise<Buffer> {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [0, width - 1, (height - 1) * width, height * width - 1];

  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined || visited[index] === 1) continue;
    visited[index] = 1;
    const offset = index * 3;
    const luma =
      0.299 * (data[offset] ?? 0) +
      0.587 * (data[offset + 1] ?? 0) +
      0.114 * (data[offset + 2] ?? 0);
    if (luma >= OUTSIDE_LUMA) continue;

    data[offset] = CREAM.r;
    data[offset + 1] = CREAM.g;
    data[offset + 2] = CREAM.b;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) stack.push(index - 1);
    if (x < width - 1) stack.push(index + 1);
    if (y > 0) stack.push(index - width);
    if (y < height - 1) stack.push(index + width);
  }

  return sharp(data, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

const artwork = await fullBleedSource();

const outputs = [
  { file: join(dir, "icon-192.png"), size: 192 },
  { file: join(dir, "icon-512.png"), size: 512 },
  { file: join(dir, "apple-touch-icon.png"), size: 180 },
  // Next.js serves app/icon.png as the browser-tab favicon
  { file: join(process.cwd(), "app/icon.png"), size: 64 },
];

for (const { file, size } of outputs) {
  await sharp(artwork).resize(size, size).png().toFile(file);
}

// Maskable: launchers crop to a circle or squircle, so keep the artwork inside the 80% safe zone
await sharp(artwork)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: CREAM })
  .png()
  .toFile(join(dir, "maskable-512.png"));

console.log("icons written to public/icons and app/icon.png");
