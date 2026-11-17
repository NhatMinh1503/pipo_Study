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
        "私の部屋は小さいです。",
        "窓から山が見えます。",
        "机の上に本が三冊あります。",
        "夜はベッドで音楽を聞きます。",
        "この部屋が大好きです。",
      ],
    },
    {
      levels: ["N5", "N4"],
      sentences: [
        "駅の近くに新しい店ができました。",
        "店の人はとても親切でした。",
        "私は赤いかばんを買いました。",
        "値段はあまり高くなかったです。",
        "また行きたいと思います。",
      ],
    },
    {
      levels: ["N3"],
      sentences: [
        "最近、料理を始めました。",
        "最初は卵焼きもうまく作れませんでした。",
        "動画を見ながら何回も練習しました。",
        "今では友だちにお弁当を作ることもあります。",
        "おいしいと言われると、とてもうれしいです。",
      ],
    },
    {
      levels: ["N3"],
      sentences: [
        "来月、大阪へ引っ越すことになりました。",
        "新しい会社は駅から歩いて五分です。",
        "部屋を探すのに思ったより時間がかかりました。",
        "荷物が多いので、少しずつ準備しています。",
        "新しい生活が楽しみです。",
      ],
    },
    {
      levels: ["N2", "N1"],
      sentences: [
        "在宅勤務が広まり、働き方は大きく変わった。",
        "通勤時間がなくなった分、家族と過ごす時間が増えたという人も多い。",
        "一方で、仕事と生活の区別がつきにくいという声もある。",
        "そのため、勤務時間をはっきり決める会社が増えている。",
        "柔軟さと規律のバランスが今後の課題だろう。",
      ],
    },
    {
      levels: ["N2", "N1"],
      sentences: [
        "地方の小さな町では、人口の減少が深刻な問題となっている。",
        "若者の多くは進学や就職をきっかけに都市へ出ていく。",
        "その結果、商店街の店が次々と閉まってしまった。",
        "最近は空き家を活用して移住者を呼び込む取り組みも見られる。",
        "町の魅力をどう伝えるかが、成功の鍵を握っている。",
      ],
    },
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
        "My sister has a small dog.",
        "His name is Max.",
        "He likes to play in the garden.",
        "Every evening we walk him to the park.",
        "He is very happy there.",
      ],
    },
    {
      levels: ["A1", "A2"],
      sentences: [
        "I went to the market on Saturday.",
        "I bought apples, bread and cheese.",
        "The weather was cold but sunny.",
        "I met an old friend near the station.",
        "We had coffee together.",
      ],
    },
    {
      levels: ["B1", "B2"],
      sentences: [
        "Last year I decided to learn to play the guitar.",
        "At first my fingers hurt after only ten minutes.",
        "I practised a little every day instead of a lot once a week.",
        "After three months I could play my first full song.",
        "Small steps turned out to be the secret.",
      ],
    },
    {
      levels: ["B1", "B2"],
      sentences: [
        "More and more people are choosing to cycle to work.",
        "It saves money and keeps them fit at the same time.",
        "However, many cities still lack safe bike lanes.",
        "Some companies now offer showers for staff who cycle.",
        "Small changes like these can make a big difference.",
      ],
    },
    {
      levels: ["C1", "C2"],
      sentences: [
        "Few inventions have reshaped daily life as quietly as the shipping container.",
        "Before it became standard, loading a ship could take several days.",
        "Goods were carried piece by piece, and theft was common.",
        "Standard boxes allowed cranes, trucks and trains to work together seamlessly.",
        "The resulting fall in costs made global trade what it is today.",
      ],
    },
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
 * A passage for the learner's language and level, avoiding ones they played recently (`exclude`
 * holds the first sentence of each) while another is available. `pick` is injectable so tests
 * are deterministic; the result is copied because Postgres receives it as a fresh array.
 */
export function pickPassage(
  language: LearningLanguage,
  level: ProficiencyLevel,
  exclude: readonly string[] = [],
  pick: (count: number) => number = (count) => Math.floor(Math.random() * count),
): string[] {
  const all = PASSAGES[language];
  const matching = all.filter((passage) => passage.levels.includes(level));
  const levelPool = matching.length > 0 ? matching : all;
  const fresh = levelPool.filter((passage) => !exclude.includes(passage.sentences[0] ?? ""));
  const pool = fresh.length > 0 ? fresh : levelPool;
  const passage = pool[pick(pool.length)] ?? pool[0];
  return passage ? [...passage.sentences] : [];
}
