"use client";

import type { Token } from "@/lib/nlp/token";
import type { LearningLanguage } from "@/lib/schemas/common";

import { WordPopup, type WordContext } from "./word-popup";

interface TokenizedSentenceProps {
  tokens: Token[];
  language: LearningLanguage;
  context: Omit<WordContext, "token">;
  className?: string;
}

/**
 * Renders a sentence where every word opens the dictionary popup.
 * Punctuation and spaces stay plain text, so the sentence reads exactly as written.
 */
export function TokenizedSentence({
  tokens,
  language,
  context,
  className,
}: TokenizedSentenceProps) {
  return (
    <p lang={language} className={className}>
      {tokens.map((token, index) =>
        token.isWord ? (
          <WordPopup key={index} context={{ ...context, token }} />
        ) : (
          <span key={index}>{token.surface}</span>
        ),
      )}
    </p>
  );
}
