import { z } from "zod";

import manifest from "./assets.json";

const pointSchema = z.object({ x: z.number().min(0), y: z.number().min(0) });

const assetSchema = z.object({
  /** Logical size; the file is twice as large (@2x). */
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  /** Point placed on the scene position (feet, trunk base, tile centre…). */
  anchor: pointSchema,
  kind: z.enum(["part", "shadow", "sprite", "tile", "background", "ui"]),
  /** Where a part is attached, relative to the top-left of its body image. */
  attach: pointSchema.optional(),
});

export type GardenAssetInfo = z.infer<typeof assetSchema>;

/**
 * Every garden image, with size and anchor in logical px (design/game/art-bible.md §6).
 * The same JSON drives the placeholder generator and `npm run garden:check`, so dropping a
 * finished PNG with the same name into public/garden/ replaces the placeholder.
 */
export const GARDEN_ASSETS: Record<string, GardenAssetInfo> = z
  .record(z.string(), assetSchema)
  .parse(manifest.assets);

export function gardenAsset(id: string): GardenAssetInfo {
  const asset = GARDEN_ASSETS[id];
  if (!asset) throw new Error(`Unknown garden asset: ${id}`);
  return asset;
}

/** Public URL of an asset; PixiJS reads the @2x suffix as resolution 2. */
export function assetUrl(id: string): string {
  return `/garden/${id}@2x.png`;
}
