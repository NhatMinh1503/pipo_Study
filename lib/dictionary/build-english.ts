import {
  ENGLISH_WORD_PATTERN,
  isLowercaseMember,
  normalizeIpa,
  parseCmudictLine,
  parseDataLine,
  parseExchange,
  parseLegacyDefinition,
  parseSenseIndexLine,
  selectWordnetSenses,
  type EnglishInflection,
  type EnglishSense,
  type WordnetGloss,
  type WordnetSenseKey,
} from "./english.ts";
import { FUNCTION_WORD_SENSES } from "./function-words.ts";

/** ECDICT columns used by the import (see https://github.com/skywind3000/ECDICT). */
export interface EcdictRow {
  word: string;
  phonetic: string;
  definition: string;
  collins: string;
  oxford: string;
  bnc: string;
  frq: string;
  exchange: string;
}

export interface EnglishEntryRow {
  word: string;
  ipa: string | null;
  senses: EnglishSense[];
  rank: number | null;
  oxford: boolean;
}

export interface EnglishFormRow {
  form: string;
  lemma: string;
  kind: EnglishInflection;
  ipa: string | null;
}

export interface BuildOptions {
  /** Words ranked beyond this (COCA, then BNC) are left out unless Oxford/Collins list them. */
  maxRank?: number;
}

const positive = (value: string) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : null;
};

/**
 * Builds dictionary rows from ECDICT (headwords, IPA, frequency, inflections) and WordNet
 * (definitions in frequency order). Words WordNet does not cover — mostly function words —
 * fall back to ECDICT's own definition text.
 */
export function buildEnglishDictionary(
  input: {
    ecdict: Iterable<EcdictRow>;
    senseIndexLines: Iterable<string>;
    dataLines: Iterable<string>;
    /** CMUdict lines; its US pronunciations win over ECDICT's older phonetics. */
    cmudictLines?: Iterable<string>;
  },
  { maxRank = 50_000 }: BuildOptions = {},
): { entries: EnglishEntryRow[]; forms: EnglishFormRow[] } {
  const keysByLemma = new Map<string, WordnetSenseKey[]>();
  for (const line of input.senseIndexLines) {
    const key = parseSenseIndexLine(line);
    if (!key || !ENGLISH_WORD_PATTERN.test(key.lemma)) continue;
    keysByLemma.set(key.lemma, [...(keysByLemma.get(key.lemma) ?? []), key]);
  }
  const glosses = new Map<string, WordnetGloss>();
  for (const line of input.dataLines) {
    const gloss = parseDataLine(line);
    if (gloss) glosses.set(`${gloss.pos}:${gloss.offset}`, gloss);
  }

  const pronunciations = new Map<string, string>();
  for (const line of input.cmudictLines ?? []) {
    const parsed = parseCmudictLine(line);
    if (parsed && !pronunciations.has(parsed.word)) pronunciations.set(parsed.word, parsed.ipa);
  }

  const entries = new Map<string, EnglishEntryRow>();
  const lemmaLinks: Array<{ form: string; lemma: string; kinds: EnglishInflection[] }> = [];
  const formLinks: Array<Omit<EnglishFormRow, "ipa">> = [];

  for (const row of input.ecdict) {
    const word = row.word.trim();
    if (!ENGLISH_WORD_PATTERN.test(word)) continue;
    const exchange = parseExchange(row.exchange);
    if (exchange.lemma && exchange.lemma !== word) {
      lemmaLinks.push({ form: word, lemma: exchange.lemma, kinds: exchange.lemmaKinds });
    }

    const rank = positive(row.frq) ?? positive(row.bnc);
    const oxford = row.oxford.trim() === "1";
    const listed = oxford || (positive(row.collins) ?? 0) > 0;
    if (!listed && (rank === null || rank > maxRank)) continue;

    const wordnet = selectWordnetSenses(keysByLemma.get(word) ?? [], (key) => {
      const gloss = glosses.get(`${key.pos}:${key.offset}`);
      return gloss && isLowercaseMember(gloss, word) ? gloss : undefined;
    });
    const senses =
      FUNCTION_WORD_SENSES.get(word) ??
      (wordnet.length > 0 ? wordnet : parseLegacyDefinition(row.definition));
    const ipa = pronunciations.get(word) ?? normalizeIpa(row.phonetic);
    if (senses.length === 0 && !ipa) continue;

    entries.set(word, { word, ipa, senses, rank, oxford });
    for (const { form, kind } of exchange.forms) {
      if (form !== word) formLinks.push({ form, lemma: word, kind });
    }
  }

  // ECDICT spells some of these with a capital ("I"), so add any curated word it missed
  for (const [word, senses] of FUNCTION_WORD_SENSES) {
    if (!entries.has(word)) {
      entries.set(word, {
        word,
        ipa: pronunciations.get(word) ?? null,
        senses,
        rank: null,
        oxford: true,
      });
    }
  }

  for (const link of lemmaLinks) {
    for (const kind of link.kinds) formLinks.push({ form: link.form, lemma: link.lemma, kind });
  }

  const forms = new Map<string, EnglishFormRow>();
  for (const row of formLinks) {
    if (!entries.has(row.lemma)) continue;
    forms.set(`${row.form}|${row.lemma}|${row.kind}`, {
      ...row,
      ipa: pronunciations.get(row.form) ?? null,
    });
  }
  return { entries: [...entries.values()], forms: [...forms.values()] };
}
