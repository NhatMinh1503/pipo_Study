// Writes simple placeholder images for every garden asset that does not exist yet:
// flat shapes in palette colours, at the exact @2x size, with a cross on the anchor.
// Finished art with the same file name is never overwritten.
//   npm run garden:placeholders
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import sharp from "sharp";

interface Asset {
  width: number;
  height: number;
  anchor: { x: number; y: number };
  kind: string;
}

const root = process.cwd();
const { assets } = JSON.parse(readFileSync(join(root, "lib/garden/assets.json"), "utf8")) as {
  assets: Record<string, Asset>;
};
const OUTLINE = "#542414";

/** Main fill colour by asset name (design/game/art-bible.md §3). */
function fillFor(id: string): string {
  const rules: [RegExp, string][] = [
    [/^pipo-body/, "#FCE46C"],
    [/^pipo-eyes/, OUTLINE],
    [/^pipo-wing/, "#FCB41C"],
    [/^tree-.*-bloom/, "#F48C9C"],
    [/^tree-pine/, "#4E8C46"],
    [/^tree-maple/, "#FC5C44"],
    [/^tree-(bamboo|sakura)/, "#8CC45C"],
    [/^tile-path/, "#BCB0A4"],
    [/^deco-pond/, "#6CA4EC"],
    [/^deco-lantern/, "#BCB0A4"],
    [/^deco-bench/, "#843C34"],
    [/^deco-(torii|bridge)/, "#FC5C44"],
    [/^koi-a/, "#FC5C44"],
    [/^koi-b/, "#FCB41C"],
    [/^slime/, "#F48C9C"],
    [/^cloud/, "#FCF4EC"],
    [/^petal/, "#F48C9C"],
    [/^ui-coin/, "#FCB41C"],
    [/^ui-streak/, "#FC8C24"],
    [/^ui-shield/, "#6CA4EC"],
    [/^ui-chest/, "#843C34"],
  ];
  return rules.find(([pattern]) => pattern.test(id))?.[1] ?? "#BCB0A4";
}

function shapeFor(id: string, asset: Asset, w: number, h: number): string {
  const fill = fillFor(id);
  const line = `stroke="${OUTLINE}" stroke-width="4"`;
  if (asset.kind === "shadow") {
    return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2 - 1}" ry="${h / 2 - 1}" fill="${OUTLINE}" fill-opacity="0.25"/>`;
  }
  if (asset.kind === "background") {
    return `<rect width="${w}" height="${h}" fill="${fill}"/><rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="#C4E4FC"/>`;
  }
  if (asset.kind === "tile") {
    const stones =
      id === "tile-path"
        ? `<rect width="${w}" height="${h}" fill="#8CC45C"/><rect x="12" y="16" width="${w - 24}" height="${h - 32}" rx="24" fill="#BCB0A4" ${line}/>`
        : `<rect width="${w}" height="${h}" fill="${fill}"/>${id.endsWith("-b") ? `<circle cx="40" cy="30" r="5" fill="#FCF4EC"/>` : ""}`;
    return stones;
  }
  if (id.startsWith("tree-")) {
    const trunkW = Math.max(6, w * 0.12);
    const ax = asset.anchor.x * 2;
    const ay = asset.anchor.y * 2;
    const canopyR = Math.min(w, h * 0.7) / 2 - 6;
    return `<rect x="${ax - trunkW / 2}" y="${ay - h * 0.45}" width="${trunkW}" height="${h * 0.45}" fill="#843C34" ${line}/>
      <circle cx="${w / 2}" cy="${canopyR + 6}" r="${canopyR}" fill="${fill}" ${line}/>`;
  }
  return `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="${Math.min(w, h) / 3}" fill="${fill}" ${line}/>`;
}

let written = 0;
for (const [id, asset] of Object.entries(assets)) {
  const file = join(root, "public/garden", `${id}@2x.png`);
  if (existsSync(file)) continue;
  const w = asset.width * 2;
  const h = asset.height * 2;
  const ax = asset.anchor.x * 2;
  const ay = asset.anchor.y * 2;
  // A small cross marks the anchor so placement is easy to check in the scene
  const marker =
    asset.kind === "tile" || asset.kind === "background"
      ? ""
      : `<path d="M${ax - 5} ${ay}H${ax + 5}M${ax} ${ay - 5}V${ay + 5}" stroke="${OUTLINE}" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" shape-rendering="crispEdges">${shapeFor(id, asset, w, h)}${marker}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
  written += 1;
}

console.log(
  `garden placeholders: ${written} written, ${Object.keys(assets).length - written} kept`,
);
