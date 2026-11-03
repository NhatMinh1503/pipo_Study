import "server-only";

import type { LearningLanguage } from "@/lib/schemas/common";
import type { Token } from "@/lib/nlp/token";
import { tokenizeEnglish } from "@/lib/nlp/tokenize-english";

import { tokenizeJapanese } from "./tokenize-japanese";

/** Tokenizes a sentence for the click-to-look-up dictionary. */
export async function tokenizeSentence(text: string, language: LearningLanguage): Promise<Token[]> {
  return language === "ja" ? tokenizeJapanese(text) : tokenizeEnglish(text);
}
