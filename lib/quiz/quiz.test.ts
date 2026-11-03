import { describe, expect, it } from "vitest";

import type { VocabItem } from "@/lib/vocab/types";

import {
  buildChoiceQuestions,
  buildFillQuestions,
  buildMatchPairs,
  CHOICES_PER_QUESTION,
  shuffle,
} from "./build-questions";
import { isCorrectAnswer, normalizeAnswer } from "./normalize";

// Deterministic pseudo-random sequence
function seeded(seed = 42) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

let nextId = 0;
const word = (
  term: string,
  meaning: string,
  partOfSpeech = "noun",
  contextSentence: string | null = null,
): VocabItem => ({
  id: String((nextId += 1)),
  language: "ja",
  term,
  reading: null,
  partOfSpeech,
  meaning,
  contextSentence,
  contextTranslation: null,
  createdAt: "",
  dueDate: null,
});

const nouns = [
  word("駅", "nhà ga"),
  word("猫", "con mèo"),
  word("犬", "con chó"),
  word("本", "quyển sách"),
];
const verbs = [
  word("食べる", "ăn", "verb"),
  word("行く", "đi", "verb"),
  word("見る", "nhìn", "verb"),
];

describe("shuffle", () => {
  it("keeps every element and does not mutate the input", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input, seeded());
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("buildChoiceQuestions", () => {
  it("gives 4 distinct choices including the right answer", () => {
    const questions = buildChoiceQuestions([...nouns, ...verbs], 5, seeded());
    expect(questions).toHaveLength(5);
    for (const question of questions) {
      expect(question.choices).toHaveLength(CHOICES_PER_QUESTION);
      expect(new Set(question.choices).size).toBe(CHOICES_PER_QUESTION);
      expect(question.choices).toContain(question.answer);
    }
  });

  it("prefers distractors with the same part of speech", () => {
    const [question] = buildChoiceQuestions(
      [verbs[0] as VocabItem, ...verbs.slice(1), ...nouns],
      1,
      () => 0,
    );
    if (!question) throw new Error("no question");
    const pos = question.item.partOfSpeech;
    const samePosMeanings = [...nouns, ...verbs]
      .filter((w) => w.partOfSpeech === pos)
      .map((w) => w.meaning);
    const sameCount = question.choices.filter((choice) => samePosMeanings.includes(choice)).length;
    // 3 nouns or 3 verbs exist besides the target, so all distractors share its POS
    expect(sameCount).toBeGreaterThanOrEqual(3);
  });

  it("needs at least 4 words with meanings", () => {
    expect(buildChoiceQuestions([...nouns.slice(0, 3), word("空", "")], 5)).toEqual([]);
  });
});

describe("buildFillQuestions and buildMatchPairs", () => {
  it("only uses words that have an example sentence", () => {
    const withSentence = word("駅", "nhà ga", "noun", "駅に行く。");
    expect(buildFillQuestions([withSentence, ...nouns], 10)).toEqual([withSentence]);
  });

  it("pairs each word with its meaning exactly once", () => {
    const { left, right } = buildMatchPairs(nouns, 3, seeded());
    expect(left).toHaveLength(3);
    expect([...right].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...left].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
});

describe("isCorrectAnswer", () => {
  it.each([
    ["駅", "駅", "えき", true],
    ["えき", "駅", "えき", true],
    ["エキ", "駅", "えき", true],
    [" Station! ", "station", null, true],
    ["ＳＴＡＴＩＯＮ", "station", null, true],
    ["駅前", "駅", "えき", false],
    ["", "駅", "えき", false],
  ] as const)("%j vs %s/%s → %s", (input, term, reading, expected) => {
    expect(isCorrectAnswer(input, term, reading)).toBe(expected);
  });

  it("normalizes width, case and punctuation", () => {
    expect(normalizeAnswer("Ｈｅｌｌｏ、 World。")).toBe("helloworld");
  });
});
