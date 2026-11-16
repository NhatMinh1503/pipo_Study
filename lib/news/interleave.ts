/**
 * Merges per-source lists by taking one item from each in turn (first source first), so a
 * feed that publishes many items a day cannot push the other sources off the page. Each
 * list keeps its own order; duplicate URLs are dropped.
 */
export function interleaveBySource<T extends { url: string }>(
  lists: ReadonlyArray<readonly T[]>,
): T[] {
  const merged: T[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let index = 0; index < longest; index++) {
    for (const list of lists) {
      const item = list[index];
      if (!item || seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push(item);
    }
  }
  return merged;
}
