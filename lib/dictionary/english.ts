// Pure helpers for the offline English dictionary (ECDICT + WordNet). Used both by the
// import script (`npm run dict:import:en`) and by the lookup service, so no path aliases here:
// the script runs under plain Node with type stripping.

export const ENGLISH_INFLECTIONS = [
  "past",
  "pastParticiple",
  "presentParticiple",
  "thirdPerson",
  "plural",
  "comparative",
  "superlative",
] as const;
export type EnglishInflection = (typeof ENGLISH_INFLECTIONS)[number];

export const ENGLISH_POS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "preposition",
  "conjunction",
  "pronoun",
  "determiner",
  "interjection",
] as const;
export type EnglishPos = (typeof ENGLISH_POS)[number];

// ECDICT `exchange` codes: p:went/d:gone/i:going/3:goes/r:better/t:best/s:books
const EXCHANGE_CODES: Record<string, EnglishInflection> = {
  p: "past",
  d: "pastParticiple",
  i: "presentParticiple",
  "3": "thirdPerson",
  s: "plural",
  r: "comparative",
  t: "superlative",
};

/** A word must look like a single English word to be stored (no phrases, digits or symbols). */
export const ENGLISH_WORD_PATTERN = /^[a-z]+(?:['-][a-z]+)*$/;

/**
 * Turns ECDICT's ASCII-ish phonetics into standard IPA: `'bju:tiful` → `ˈbjuːtiful`.
 * ECDICT writes stress as `'`/`,`, length as `:` and schwa as the Cyrillic `ә`.
 */
export function normalizeIpa(raw: string): string | null {
  const ipa = raw
    .trim()
    .replaceAll("ә", "ə")
    .replaceAll("'", "ˈ")
    .replaceAll(",", "ˌ")
    .replaceAll(":", "ː");
  return ipa.length > 0 ? ipa : null;
}

export interface InflectedForm {
  form: string;
  kind: EnglishInflection;
}

export interface ParsedExchange {
  /** Forms of this word (`run` → ran, running, runs). */
  forms: InflectedForm[];
  /** Lemma when the word itself is an inflected form (`went` → go). */
  lemma: string | null;
  /** How this word relates to `lemma` (`went` → past). */
  lemmaKinds: EnglishInflection[];
}

/** Parses ECDICT's `exchange` column, e.g. `p:ran/i:running/3:runs` or `0:go/1:p`. */
export function parseExchange(exchange: string): ParsedExchange {
  const forms: InflectedForm[] = [];
  let lemma: string | null = null;
  let lemmaCodes = "";

  for (const part of exchange.split("/")) {
    const colon = part.indexOf(":");
    if (colon < 1) continue;
    const code = part.slice(0, colon);
    const value = part
      .slice(colon + 1)
      .trim()
      .toLowerCase();
    if (!value) continue;
    if (code === "0") lemma = value;
    else if (code === "1") lemmaCodes = value;
    else {
      const kind = EXCHANGE_CODES[code];
      if (kind && ENGLISH_WORD_PATTERN.test(value)) forms.push({ form: value, kind });
    }
  }

  const lemmaKinds = [...lemmaCodes].flatMap((code) => {
    const kind = EXCHANGE_CODES[code];
    return kind ? [kind] : [];
  });
  return { forms, lemma: lemma && ENGLISH_WORD_PATTERN.test(lemma) ? lemma : null, lemmaKinds };
}

export interface EnglishSense {
  pos: EnglishPos;
  gloss: string;
  example: string | null;
}

// Webster-style ECDICT definitions (used only when WordNet has nothing, e.g. "of", "and")
const LEGACY_POS: Record<string, EnglishPos> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  adj: "adjective",
  s: "adjective",
  r: "adverb",
  adv: "adverb",
  prep: "preposition",
  conj: "conjunction",
  pron: "pronoun",
  interj: "interjection",
};
const LEGACY_LINE = /^([a-z]+)\.?\s+(.+)$/;
const MAX_GLOSS_LENGTH = 200;

function shortenGloss(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_GLOSS_LENGTH) return clean;
  const cut = clean.slice(0, MAX_GLOSS_LENGTH);
  const lastBreak = Math.max(cut.lastIndexOf(";"), cut.lastIndexOf(","));
  return `${(lastBreak > 60 ? cut.slice(0, lastBreak) : cut).trim()}…`;
}

/**
 * Parses ECDICT's `definition` column (lines like `n. a written work`, with indented
 * continuation lines). Lines without a recognised part of speech are dropped.
 */
export function parseLegacyDefinition(definition: string, limit = 3): EnglishSense[] {
  const lines: string[] = [];
  for (const line of definition.replaceAll("\\n", "\n").split("\n")) {
    if (/^\s/.test(line) && lines.length > 0) lines[lines.length - 1] += ` ${line.trim()}`;
    else if (line.trim()) lines.push(line.trim());
  }

  const senses: EnglishSense[] = [];
  for (const line of lines) {
    const match = LEGACY_LINE.exec(line);
    const pos = match?.[1] ? LEGACY_POS[match[1]] : undefined;
    if (!match?.[2] || !pos || /^(i\.|t\.)?\s*see\b/i.test(match[2])) continue;
    // Webster entries run on with "; as, …" usage notes; the first clause is the definition
    const [firstClause = match[2]] = match[2].split(/;\s*(?:--|as,)/);
    senses.push({ pos, gloss: shortenGloss(firstClause), example: null });
    if (senses.length >= limit) break;
  }
  return senses;
}

// ---------------------------------------------------------------------------
// WordNet 3.1 database files (index.sense, data.<pos>)
// ---------------------------------------------------------------------------

const WORDNET_POS: Record<string, EnglishPos> = {
  "1": "noun",
  "2": "verb",
  "3": "adjective",
  "4": "adverb",
  "5": "adjective", // adjective satellite
};
const WORDNET_FILE_POS: Record<string, EnglishPos> = {
  n: "noun",
  v: "verb",
  a: "adjective",
  s: "adjective",
  r: "adverb",
};

export interface WordnetSenseKey {
  lemma: string;
  pos: EnglishPos;
  /** Synset offset; with `pos` it identifies the gloss in data.<pos>. */
  offset: string;
  senseNumber: number;
  /** How often this sense was tagged in the Brown corpus — WordNet's frequency signal. */
  tagCount: number;
}

/** Parses an index.sense line: `run%2:38:00:: 02095311 1 81`. */
export function parseSenseIndexLine(line: string): WordnetSenseKey | null {
  const [key, offset, senseNumber, tagCount] = line.trim().split(" ");
  if (!key || !offset || !senseNumber || tagCount === undefined) return null;
  const [lemma, lexSense] = key.split("%");
  const pos = lexSense ? WORDNET_POS[lexSense.charAt(0)] : undefined;
  if (!lemma || !pos) return null;
  return {
    lemma: lemma.toLowerCase(),
    pos,
    offset,
    senseNumber: Number(senseNumber),
    tagCount: Number(tagCount),
  };
}

export interface WordnetGloss {
  offset: string;
  pos: EnglishPos;
  /** Synset members as written ("He", "helium"), so symbols and names can be told apart. */
  words: string[];
  gloss: string;
  example: string | null;
}

/**
 * Parses a data.<pos> line. The gloss follows ` | ` and holds the definition, then
 * optional quoted examples: `move fast by using one's feet; "Don't run--you'll fall"`.
 */
export function parseDataLine(line: string): WordnetGloss | null {
  if (line.startsWith(" ")) return null; // license header
  const bar = line.indexOf(" | ");
  const fields = line.slice(0, bar).split(" ");
  const [offset, , ssType, wordCountHex] = fields;
  const pos = ssType ? WORDNET_FILE_POS[ssType] : undefined;
  if (bar < 0 || !offset || !pos) return null;
  const wordCount = Number.parseInt(wordCountHex ?? "0", 16);
  // Members follow as `word lex_id` pairs; adjectives may carry a marker like `light(a)`
  const words = Array.from({ length: wordCount }, (_, index) =>
    (fields[4 + index * 2] ?? "").replace(/\([a-z]+\)$/, ""),
  ).filter(Boolean);

  const text = line.slice(bar + 3).trim();
  const quote = text.indexOf('"');
  const definition = (quote >= 0 ? text.slice(0, quote) : text).replace(/[;\s]+$/, "");
  const example = quote >= 0 ? (/"([^"]+)"/.exec(text.slice(quote))?.[1] ?? null) : null;
  if (!definition) return null;
  return {
    offset,
    pos,
    words,
    gloss: shortenGloss(definition),
    example: example?.trim() || null,
  };
}

/**
 * True when the synset uses `lemma` as an ordinary lowercase word, so "he" does not pick up
 * helium (He) and "can" keeps the container but "may" drops the month (May).
 */
export function isLowercaseMember(gloss: WordnetGloss, lemma: string): boolean {
  return gloss.words.some((word) => word.replaceAll("_", " ") === lemma);
}

/** Converts one CMUdict pronunciation (ARPAbet) to IPA: `B Y UW1 T AH0 F AH0 L` → ˈbjuːtəfəl. */
export function arpabetToIpa(phones: string): string | null {
  const symbols: Array<{ ipa: string; vowel: boolean; stress: string }> = [];
  for (const phone of phones.trim().split(/\s+/)) {
    const match = /^([A-Z]+)([012])?$/.exec(phone);
    if (!match?.[1]) return null;
    const [, base, stress = ""] = match;
    const vowel = VOWELS[base];
    if (vowel) {
      // Stress changes the vowel quality of AH and ER (ʌ/ə, ɝː/ɚ)
      const ipa =
        base === "AH"
          ? stress === "0"
            ? "ə"
            : "ʌ"
          : base === "ER"
            ? stress === "0"
              ? "ɚ"
              : "ɝː"
            : vowel;
      symbols.push({ ipa, vowel: true, stress });
      continue;
    }
    const consonant = CONSONANTS[base];
    if (!consonant) return null;
    symbols.push({ ipa: consonant, vowel: false, stress: "" });
  }
  if (symbols.length === 0) return null;

  const marks = new Map<number, string>();
  const vowelCount = symbols.filter((symbol) => symbol.vowel).length;
  symbols.forEach((symbol, index) => {
    if (!symbol.vowel || (symbol.stress !== "1" && symbol.stress !== "2")) return;
    if (vowelCount === 1) return; // one-syllable words carry no stress mark
    // Put the mark before the longest legal onset among the preceding consonants
    let start = index;
    while (start > 0 && !symbols[start - 1]?.vowel) start--;
    let onsetStart = index;
    for (let candidate = start; candidate < index; candidate++) {
      const cluster = symbols
        .slice(candidate, index)
        .map((s) => s.ipa)
        .join("");
      if (LEGAL_ONSETS.has(cluster)) {
        onsetStart = candidate;
        break;
      }
    }
    marks.set(onsetStart, symbol.stress === "1" ? "ˈ" : "ˌ");
  });

  return symbols.map((symbol, index) => `${marks.get(index) ?? ""}${symbol.ipa}`).join("");
}

const VOWELS: Record<string, string> = {
  AA: "ɑː",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔː",
  AW: "aʊ",
  AY: "aɪ",
  EH: "e",
  ER: "ɝː",
  EY: "eɪ",
  IH: "ɪ",
  IY: "iː",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "uː",
};
const CONSONANTS: Record<string, string> = {
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "g",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "r",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};
const LEGAL_ONSETS = new Set([
  ..."b d f g h k l m n p r s t v w j z ð θ ʃ ʒ tʃ dʒ".split(" "),
  ..."pl pr bl br tr dr kl kr gl gr fl fr θr ʃr sp st sk sm sn sl sw sf tw dw kw gw θw".split(" "),
  ..."pj bj tj dj kj gj mj nj fj vj hj lj spl spr str skr skw spj stj skj".split(" "),
]);

/** Parses a CMUdict line; alternates like `read(2)` and comments are recognised. */
export function parseCmudictLine(line: string): { word: string; ipa: string } | null {
  const [entry = ""] = line.split("#");
  const [rawWord, ...phones] = entry.trim().split(" ");
  if (!rawWord || phones.length === 0 || rawWord.includes("(")) return null;
  const ipa = arpabetToIpa(phones.join(" "));
  return ipa ? { word: rawWord.toLowerCase(), ipa } : null;
}

/**
 * Picks the senses to show for one word: parts of speech ordered by how often they occur
 * (sum of tag counts, then number of senses — so "run" leads with the verb, "book" with the
 * noun), at most `perPos` senses each in WordNet order, at most `maxPos` parts of speech.
 */
export function selectWordnetSenses(
  keys: WordnetSenseKey[],
  glossOf: (key: WordnetSenseKey) => WordnetGloss | undefined,
  { perPos = 2, maxPos = 3 } = {},
): EnglishSense[] {
  const byPos = new Map<EnglishPos, WordnetSenseKey[]>();
  for (const key of keys) byPos.set(key.pos, [...(byPos.get(key.pos) ?? []), key]);

  const weight = (list: WordnetSenseKey[]) =>
    list.reduce((sum, key) => sum + key.tagCount, 0) * 1000 + list.length;
  const groups = [...byPos.entries()].sort(([, a], [, b]) => weight(b) - weight(a));

  const senses: EnglishSense[] = [];
  for (const [pos, list] of groups.slice(0, maxPos)) {
    const ordered = [...list].sort((a, b) => a.senseNumber - b.senseNumber);
    let taken = 0;
    for (const key of ordered) {
      const gloss = glossOf(key);
      if (!gloss) continue;
      senses.push({ pos, gloss: gloss.gloss, example: gloss.example });
      if (++taken >= perPos) break;
    }
  }
  return senses;
}

// ---------------------------------------------------------------------------
// Lookup ordering
// ---------------------------------------------------------------------------

export interface RankedEntry {
  word: string;
  /** Frequency rank: 1 = most common; null when unknown. */
  rank: number | null;
}

/**
 * Orders the entries found for a clicked word. The lemma comes first when it is more
 * common than the word's own entry ("running" → run, "saw" → see), otherwise the word
 * itself leads ("left" the adjective stays above "leave" only if it is more common).
 */
export function orderEnglishEntries<T extends RankedEntry>(term: string, entries: T[]): T[] {
  const rankOf = (entry: T) => entry.rank ?? Number.MAX_SAFE_INTEGER;
  return [...entries].sort((a, b) => {
    const diff = rankOf(a) - rankOf(b);
    if (diff !== 0) return diff;
    // Same (or unknown) frequency: the exact word wins
    return Number(b.word === term) - Number(a.word === term);
  });
}
