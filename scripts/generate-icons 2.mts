// Renders the PWA icons from public/icons/icon.svg. Run after editing the SVG:
//   node --experimental-strip-types scripts/generate-icons.mts
import { join } from "node:path";

import sharp from "sharp";

const dir = join(process.cwd(), "public/icons");
const source = join(dir, "icon.svg");

const outputs = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of outputs) {
  await sharp(source).resize(size, size).png().toFile(join(dir, file));
}

// Maskable: launchers crop to a circle or squircle, so keep the mark inside the 80% safe zone
await sharp(source)
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#ede6d6" })
  .png()
  .toFile(join(dir, "maskable-512.png"));

console.log("icons written to public/icons");
