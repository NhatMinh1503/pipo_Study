import type { LearningLanguage } from "@/lib/schemas/common";

import type { VocabItem } from "./types";

export interface VocabFilter {
  query: string;
  language: LearningLanguage | "all";
}

const normalize = (text: string) => text.normalize("NFKC").toLowerCase().trim();

/** Matches the query against term, reading and meaning (case/width-insensitive). */
export function filterVocab(
  items: readonly VocabItem[],
  { query, language }: VocabFilter,
): VocabItem[] {
  const needle = normalize(query);
  return items.filter((item) => {
    if (language !== "all" && item.language !== language) return false;
    if (!needle) return true;
    return [item.term, item.reading ?? "", item.meaning].some((field) =>
      normalize(field).includes(needle),
    );
  });
}
