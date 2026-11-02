import type { LearningLanguage, ProficiencyLevel } from "@/lib/schemas/common";

interface Passage {
  levels: readonly ProficiencyLevel[];
  sentences: readonly string[];
}

// Hand-written, five sentences each: a battle needs text both players get instantly and identically
const PASSAGES: Record<LearningLanguage, readonly Passage[]> = {
  ja: [
    {
      levels: ["N5", "N4"],
      sentences: [
        "毎朝七時に起きます。",
        "朝ごはんはパンとコーヒーです。",
        "電車で学校へ行きます。",
        "昼休みに友だちと話します。",
        "夜は日本語を勉強します。",
      ],
    },
    {
      levels: ["N5", "N4"],
      sentences: [
        "週末は天気がよかったです。",
        "家族と公園へ行きました。",
        "妹はアイスクリームを食べました。",
        "父は写真をたくさん撮りました。",
        "とても楽しい一日でした。",
      ],
    },
    {
      levels: ["N3"],
      sentences: [
        "最近、駅の近くに新しいカフェができた。",
        "店内は静かで、勉強するのにちょうどいい。",
        "コーヒーの値段は少し高いが、味はとてもいい。",
        "週に二回ぐらいそこで本を読んでいる。",
        "これからも通い続けたいと思う。",
      ],
    },
    {
      levels: ["N2", "N1"],
      sentences: [
        "在宅勤務が広がるにつれて、働き方に対する考え方も変わってきた。",
        "通勤時間がなくなった分、家族と過ごす時間が増えたという声は多い。",
        "一方で、同僚との雑談が減り、孤独を感じる人も少なくない。",
        "企業は生産性だけでなく、社員の心の健康にも目を向ける必要がある。",
        "柔軟な制度づくりが今後の課題だと言えるだろう。",
      ],
    },
  ],
  en: [
    {
      levels: ["A1", "A2"],
      sentences: [
        "My name is Lan and I live in Hanoi.",
        "I work at a small bookshop.",
        "Every morning I drink green tea.",
        "On Sundays I visit my grandmother.",
        "She makes the best noodle soup.",
      ],
    },
    {
      levels: ["B1", "B2"],
      sentences: [
        "Last summer I decided to learn how to cook.",
        "At first, I burned almost everything I made.",
        "Then a friend showed me a few simple recipes.",
        "Now I can prepare dinner for my whole family.",
        "Cooking has become my favourite way to relax.",
      ],
    },
    {
      levels: ["C1", "C2"],
      sentences: [
        "Cities around the world are rethinking how streets should be used.",
        "Some have closed central roads to cars entirely.",
        "Critics argued that local shops would lose customers.",
        "In many cases, however, foot traffic actually increased.",
        "The debate now centres on how to share space fairly.",
      ],
    },
  ],
};

/**
 * A passage for the learner's language and level. `pick` is injectable so tests are deterministic;
 * the result is copied because Postgres receives it as a fresh array.
 */
export function pickPassage(
  language: LearningLanguage,
  level: ProficiencyLevel,
  pick: (count: number) => number = (count) => Math.floor(Math.random() * count),
): string[] {
  const all = PASSAGES[language];
  const matching = all.filter((passage) => passage.levels.includes(level));
  const pool = matching.length > 0 ? matching : all;
  const passage = pool[pick(pool.length)] ?? pool[0];
  return passage ? [...passage.sentences] : [];
}
