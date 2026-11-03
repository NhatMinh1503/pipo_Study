import type { LearningLanguage } from "@/lib/schemas/common";

export type DiffKind = "equal" | "missing" | "extra";

export interface DiffSegment {
  kind: DiffKind;
  text: string;
}

export interface DiffResult {
  segments: DiffSegment[];
  /** Share of the expected units typed correctly, 0–100. */
  score: number;
}

const PUNCTUATION = /[\s\p{P}\p{S}]/u;

/**
 * Units compared in dictation: characters for Japanese (no spaces between words),
 * lowercase words for English. Punctuation and spacing never cost points.
 */
function units(text: string, language: LearningLanguage): string[] {
  const normalized = text.normalize("NFKC");
  if (language === "ja") return Array.from(normalized).filter((char) => !PUNCTUATION.test(char));
  return normalized
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, ""))
    .filter(Boolean);
}

/**
 * Longest-common-subsequence diff between the sentence and what the learner typed.
 * `missing` = in the sentence but not typed; `extra` = typed but not in the sentence.
 */
export function diffDictation(
  expected: string,
  actual: string,
  language: LearningLanguage,
): DiffResult {
  const a = units(expected, language);
  const b = units(actual, language);

  // lcs[i][j] = LCS length of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const row = lcs[i] as number[];
      row[j] =
        a[i] === b[j]
          ? (lcs[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(lcs[i + 1]?.[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const segments: DiffSegment[] = [];
  const push = (kind: DiffKind, unit: string) => {
    const separator = language === "en" ? " " : "";
    const last = segments.at(-1);
    if (last?.kind === kind) last.text += separator + unit;
    else segments.push({ kind, text: unit });
  };

  let i = 0;
  let j = 0;
  let matched = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      push("equal", a[i] as string);
      matched += 1;
      i += 1;
      j += 1;
    } else if (
      j < b.length &&
      (i >= a.length || (lcs[i]?.[j + 1] ?? 0) >= (lcs[i + 1]?.[j] ?? 0))
    ) {
      push("extra", b[j] as string);
      j += 1;
    } else {
      push("missing", a[i] as string);
      i += 1;
    }
  }

  // Extra units also cost points, so typing everything twice cannot reach 100%
  const denominator = Math.max(a.length, b.length);
  return { segments, score: denominator === 0 ? 100 : Math.round((matched / denominator) * 100) };
}
