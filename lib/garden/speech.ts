import type { TreeSpecies } from "./growth";

/** What the garden knows about the learner right now (all from real data). */
export interface GardenFacts {
  treeCount: number;
  growing: { species: TreeSpecies; sessionsLeft: number } | null;
  sakuraCount: number;
  studiedToday: boolean;
}

export type LineKey = "firstTree" | "growing" | "bloom" | "bloomHint" | "treeCount";

export interface Line {
  /** i18n key under garden.pipo. */
  key: LineKey;
  values?: Record<string, string | number>;
}

/**
 * Picks what Pipo says (garden-scene spec §3.7): the most relevant fact first, never the
 * same line twice in a row when another one fits. Always encouraging, never scolding.
 */
export function pickLine(facts: GardenFacts, lastKey: LineKey | null): Line {
  const candidates: Line[] = [];
  if (facts.treeCount === 0) candidates.push({ key: "firstTree" });
  if (facts.growing) {
    candidates.push({
      key: "growing",
      values: { species: facts.growing.species, count: facts.growing.sessionsLeft },
    });
  }
  if (facts.sakuraCount > 0) candidates.push({ key: facts.studiedToday ? "bloom" : "bloomHint" });
  if (facts.treeCount > 0)
    candidates.push({ key: "treeCount", values: { count: facts.treeCount } });

  const fallback: Line = candidates[0] ?? { key: "firstTree" };
  return candidates.find((line) => line.key !== lastKey) ?? fallback;
}
