/** The 16 colours of design/game/art-bible.md §3. Finished art uses only these. */
export const GARDEN_PALETTE = [
  "#FCF4EC",
  "#FCE46C",
  "#FCB41C",
  "#FC8C24",
  "#F48C9C",
  "#FC5C44",
  "#843C34",
  "#542414",
  "#84C4FC",
  "#C4E4FC",
  "#6CA4EC",
  "#4C74BC",
  "#CDE38A",
  "#8CC45C",
  "#4E8C46",
  "#BCB0A4",
] as const;

export type PaletteColor = (typeof GARDEN_PALETTE)[number];

const RGB = GARDEN_PALETTE.map((hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
});

/** Opaque enough to be part of the drawing (soft anti-aliased edges are ignored). */
const OPAQUE_ALPHA = 200;
/** Small differences from PNG encoding or colour profiles still count as the palette colour. */
const TOLERANCE = 12;

/**
 * Share (0–1) of opaque pixels whose colour is not one of the 16 palette colours.
 * `data` is raw pixel bytes (RGBA when channels = 4).
 */
export function offPaletteRatio(data: Uint8Array, channels: number): number {
  let opaque = 0;
  let off = 0;
  for (let index = 0; index + channels - 1 < data.length; index += channels) {
    const alpha = channels === 4 ? (data[index + 3] ?? 0) : 255;
    if (alpha < OPAQUE_ALPHA) continue;
    opaque += 1;
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    const near = RGB.some(
      ([pr, pg, pb]) =>
        Math.abs(r - pr) <= TOLERANCE &&
        Math.abs(g - pg) <= TOLERANCE &&
        Math.abs(b - pb) <= TOLERANCE,
    );
    if (!near) off += 1;
  }
  return opaque === 0 ? 0 : off / opaque;
}
