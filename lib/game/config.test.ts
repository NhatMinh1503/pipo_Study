import { describe, expect, it } from "vitest";

import { BREAK_MINUTES, FOCUS_OPTIONS } from "@/lib/pomodoro/timer";
import { REVIEW_XP } from "@/lib/review/reward";
import { POINTS } from "@/lib/scoring";

import { GAME } from "./config";

// Every value here is approved in design/game/registry.md. Changing one is a design
// decision: update the registry and this test together.
describe("GAME config matches design/game/registry.md", () => {
  it("translation scoring", () => {
    expect(GAME.translation).toEqual({
      points: { exact: 10, acceptable: 7 },
      retryPenalty: 2,
      minPoints: 2,
      minLessonSentences: 3,
      lessonBonusXp: 5,
      perfectBonusCoins: 3,
      manualLessonDailyXpCap: 300,
    });
  });

  it("reviews", () => {
    expect(GAME.review).toEqual({ xp: 1, clearBonusXp: 5, clearMinReviews: 5 });
  });

  it("level curve", () => {
    expect(GAME.level).toEqual({ base: 50, step: 40, cap: 50, starXp: 2000 });
  });

  it("pomodoro", () => {
    expect(GAME.pomodoro).toEqual({ focusOptions: [25, 50], breakMinutes: 5 });
  });

  it("garden", () => {
    expect(GAME.garden).toEqual({
      saplingAtSessions: 2,
      matureAtSessions: 4,
      freeSpecies: ["pine", "bamboo"],
      plotsPerGarden: 31,
      decorSlots: 5,
    });
  });

  it("battle", () => {
    expect(GAME.battle).toEqual({
      fastAnswerSeconds: 20,
      maxSpeedBonus: 5,
      heartbeatSeconds: 15,
      opponentTimeoutSeconds: 90,
    });
  });
});

describe("existing modules read their numbers from GAME", () => {
  it("keeps the public constants they already exported", () => {
    expect(POINTS).toBe(GAME.translation.points);
    expect(REVIEW_XP).toBe(GAME.review.xp);
    expect(FOCUS_OPTIONS).toBe(GAME.pomodoro.focusOptions);
    expect(BREAK_MINUTES).toBe(GAME.pomodoro.breakMinutes);
  });
});
