/**
 * Every tunable game number on the TypeScript side, in one place. Approved values live in
 * design/game/registry.md; change both together (lib/game/config.test.ts pins them).
 *
 * Values the database owns (level curve, daily cap, battle timeouts) are mirrored here for
 * display and client timers only; the SQL functions stay the source of truth for rewards.
 */
export const GAME = {
  translation: {
    /** XP for a sentence passed on the first try, by verdict. */
    points: { exact: 10, acceptable: 7 },
    /** XP lost for every incorrect attempt before the pass. */
    retryPenalty: 2,
    /** A passed sentence never earns less than this. */
    minPoints: 2,
    /** Lessons shorter than this get no completion bonus and no coins. */
    minLessonSentences: 3,
    lessonBonusXp: 5,
    perfectBonusCoins: 3,
    /** Mirrors the SQL cap on XP from the learner's own (manual) lessons per local day. */
    manualLessonDailyXpCap: 300,
  },
  review: {
    /** XP for reviewing a due card that was reviewed before (once per card per day). */
    xp: 1,
    /** XP for clearing the due queue, once per local day. */
    clearBonusXp: 5,
    /** Rewarded reviews needed today before the queue-clear bonus can be earned. */
    clearMinReviews: 5,
  },
  goals: {
    /** Mirrors SQL today_goals: sentences unlocked today for the translate goal. */
    translateSentences: 3,
    /** Review goal = min(this, cards due at the first look of the day; new cards count). */
    maxReviews: 5,
    focusSessions: 1,
    /** Coins once per local day when every goal that applies is done. */
    bonusCoins: 5,
  },
  streak: {
    /** Mirrors SQL buy_streak_freeze: price in Coins and how many can be held. */
    freezePrice: 50,
    maxFreezes: 2,
    /** Mirrors SQL streak_milestone_coins (then 100 coins every 100 days). */
    milestones: [
      { days: 3, coins: 5 },
      { days: 7, coins: 10 },
      { days: 14, coins: 20 },
      { days: 30, coins: 40 },
      { days: 60, coins: 60 },
      { days: 100, coins: 100 },
    ],
  },
  ai: {
    /** Mirrors SQL rate_limit_hit: AI calls per learner per minute (the daily cap is AI_DAILY_LIMIT). */
    perMinute: 30,
  },
  level: {
    /** Mirrors SQL level_for_xp: xp_to_next(L) = base + step × (L − 1). */
    base: 50,
    step: 40,
    cap: 50,
    /** XP per "Sao bền bỉ" star after the level cap. */
    starXp: 2000,
  },
  pomodoro: {
    /** The learner sets each session's length (Forest style): min–max in steps. */
    focusMinMinutes: 10,
    focusMaxMinutes: 120,
    focusStepMinutes: 5,
    /** Quick picks shown next to the slider; 25 is the default. */
    focusPresets: [15, 25, 45, 60],
    defaultFocusMinutes: 25,
    breakMinutes: 5,
  },
  garden: {
    /** Tree stage by sessions tended (sprout from 1). Mirrors SQL tend_garden. */
    saplingAtSessions: 2,
    matureAtSessions: 4,
    /** Species anyone can plant; the others need a seed item (seed-<species>). */
    freeSpecies: ["pine", "bamboo"],
    /** Mirrors the garden layout and SQL next_garden_plot. */
    plotsPerGarden: 26,
    decorSlots: 5,
  },
  battle: {
    /** Speed bonus shrinks by one point every this many seconds. */
    fastAnswerSeconds: 20,
    maxSpeedBonus: 5,
    /** Mirrors the battle presence migration (heartbeat cadence, forfeit timeout). */
    heartbeatSeconds: 15,
    opponentTimeoutSeconds: 90,
  },
} as const;
