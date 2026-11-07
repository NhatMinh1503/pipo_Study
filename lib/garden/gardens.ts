/**
 * The garden to show from the `khu` search param: a valid garden number, otherwise the
 * newest garden (where the next tree is planted).
 */
export function resolveGardenIndex(
  requested: string | string[] | undefined,
  gardenCount: number,
): number {
  const newest = Math.max(1, gardenCount);
  if (typeof requested !== "string" || !/^\d+$/.test(requested)) return newest;
  const index = Number(requested);
  return index >= 1 && index <= newest ? index : newest;
}
