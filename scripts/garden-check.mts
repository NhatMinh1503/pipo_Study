// Checks every garden image against the manifest and the art bible:
// file exists, exact @2x size, transparent background (sprites), share of off-palette colours.
//   npm run garden:check
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

import { offPaletteRatio } from "../lib/garden/palette.ts";

interface Asset {
  width: number;
  height: number;
  kind: string;
}

/** Above this share of off-palette pixels the image was not reduced to the palette. */
const MAX_OFF_PALETTE = 0.05;

const root = process.cwd();
const { assets } = JSON.parse(readFileSync(join(root, "lib/garden/assets.json"), "utf8")) as {
  assets: Record<string, Asset>;
};

const problems: string[] = [];
for (const [id, asset] of Object.entries(assets)) {
  const name = `${id}@2x.png`;
  const file = join(root, "public/garden", name);
  if (!existsSync(file)) {
    problems.push(`${name}: missing (run npm run garden:placeholders)`);
    continue;
  }
  const image = sharp(file);
  const meta = await image.metadata();
  if (meta.width !== asset.width * 2 || meta.height !== asset.height * 2) {
    problems.push(
      `${name}: ${meta.width}×${meta.height}, expected ${asset.width * 2}×${asset.height * 2}`,
    );
  }
  const fills = asset.kind === "tile" || asset.kind === "background";
  if (!fills && !meta.hasAlpha) problems.push(`${name}: no transparency`);
  if (asset.kind === "shadow") continue;
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const ratio = offPaletteRatio(new Uint8Array(data), info.channels);
  if (ratio > MAX_OFF_PALETTE) {
    problems.push(
      `${name}: ${(ratio * 100).toFixed(1)}% of pixels are outside the 16-colour palette`,
    );
  }
}

if (problems.length > 0) {
  console.error(problems.map((problem) => `✗ ${problem}`).join("\n"));
  process.exit(1);
}
console.log(`garden assets: ${Object.keys(assets).length} files OK`);
