import "server-only";

import path from "node:path";

import kuromoji, { type IpadicFeatures, type Tokenizer } from "kuromoji";

import { toHiragana } from "@/lib/nlp/kana";
import type { PartOfSpeech, Token } from "@/lib/nlp/token";

// Building the tokenizer loads ~19MB of dictionary files, so it is built once per process.
// Kept on globalThis because instrumentation and route bundles get separate module instances.
const globalForTokenizer = globalThis as typeof globalThis & {
  pipoTokenizer?: Promise<Tokenizer<IpadicFeatures>>;
};

function getTokenizer() {
  globalForTokenizer.pipoTokenizer ??= new Promise((resolve, reject) => {
    kuromoji
      .builder({ dicPath: path.join(process.cwd(), "node_modules/kuromoji/dict") })
      .build((error, tokenizer) => (error ? reject(error) : resolve(tokenizer)));
  });
  return globalForTokenizer.pipoTokenizer;
}

/** Starts loading the dictionary in the background so the first lookup is fast. */
export function warmUpTokenizer() {
  void getTokenizer().catch(() => {
    // A failed warm-up is retried on first real use
    globalForTokenizer.pipoTokenizer = undefined;
  });
}

/** Maps IPADIC part-of-speech tags to our simplified categories. */
function mapPartOfSpeech(features: IpadicFeatures): PartOfSpeech {
  switch (features.pos) {
    case "名詞":
      if (features.pos_detail_1 === "形容動詞語幹") return "na-adjective";
      if (features.pos_detail_1 === "代名詞") return "pronoun";
      return "noun";
    case "動詞":
      return "verb";
    case "形容詞":
      return "i-adjective";
    case "副詞":
      return "adverb";
    case "助詞":
      return "particle";
    case "助動詞":
      return "auxiliary";
    case "接続詞":
      return "conjunction";
    case "感動詞":
      return "interjection";
    case "連体詞":
      return "prenoun";
    case "記号":
      return "symbol";
    default:
      return "other";
  }
}

/** Splits a Japanese sentence into tokens with dictionary form, hiragana reading and POS. */
export async function tokenizeJapanese(text: string): Promise<Token[]> {
  const tokenizer = await getTokenizer();

  return tokenizer.tokenize(text).map((features) => {
    const pos = mapPartOfSpeech(features);
    const base =
      features.basic_form && features.basic_form !== "*"
        ? features.basic_form
        : features.surface_form;
    return {
      surface: features.surface_form,
      base,
      // Unknown words have no reading ("*"); fall back to the surface form
      reading: toHiragana(
        features.reading && features.reading !== "*" ? features.reading : features.surface_form,
      ),
      pos,
      isWord: pos !== "symbol" && features.surface_form.trim() !== "",
    };
  });
}
