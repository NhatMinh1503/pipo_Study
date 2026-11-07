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
  level: {
    /** Mirrors SQL level_for_xp: xp_to_next(L) = base + step × (L − 1). */
    base: 50,
    step: 40,
    cap: 50,
    /** XP per "Sao bền bỉ" star after the level cap. */
    starXp: 2000,
  },
  pomodoro: {
    focusOptions: [25, 50],
    breakMinutes: 5,
  },
  garden: {
    /** Tree stage by sessions tended (sprout from 1). Mirrors SQL tend_garden. */
    saplingAtSessions: 2,
    matureAtSessions: 4,
    /** Species anyone can plant; the others need a seed item (seed-<species>). */
    freeSpecies: ["pine", "bamboo"],
    /** Mirrors the garden layout and SQL next_garden_plot. */
    plotsPerGarden: 31,
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
