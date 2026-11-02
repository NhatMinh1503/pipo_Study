import { describe, expect, it } from "vitest";

import { dueCards, scheduleReview, type CardState } from "./schedule";

const NOW = new Date("2026-11-02T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const fresh: CardState = { intervalDays: 0, ease: 2.5, repetitions: 0, lapses: 0 };
const withInterval = (intervalDays: number, ease = 2.5): CardState => ({
  intervalDays,
  ease,
  repetitions: 3,
  lapses: 0,
});

describe("scheduleReview — ladder 1 → 3 → 7 → 14 → 30", () => {
  it("climbs one step per 'good'", () => {
    let card: CardState = fresh;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      card = scheduleReview(card, "good", NOW);
      intervals.push(card.intervalDays);
    }
    expect(intervals).toEqual([1, 3, 7, 14, 30]);
  });

  it("'easy' skips a step and raises ease", () => {
    expect(scheduleReview(fresh, "easy", NOW)).toMatchObject({ intervalDays: 3, ease: 2.65 });
    expect(scheduleReview(withInterval(3), "easy", NOW)).toMatchObject({ intervalDays: 14 });
    // Cannot skip past the end of the ladder
    expect(scheduleReview(withInterval(14), "easy", NOW)).toMatchObject({ intervalDays: 30 });
  });

  it("'hard' repeats the current step and lowers ease", () => {
    expect(scheduleReview(withInterval(7), "hard", NOW)).toMatchObject({
      intervalDays: 7,
      ease: 2.35,
    });
    // A new card starts at the first step
    expect(scheduleReview(fresh, "hard", NOW)).toMatchObject({ intervalDays: 1 });
  });

  it("'again' resets the card, counts a lapse and brings it back in 10 minutes", () => {
    const result = scheduleReview(withInterval(14), "again", NOW);
    expect(result).toMatchObject({ intervalDays: 0, repetitions: 0, lapses: 1, ease: 2.3 });
    expect(result.dueDate.getTime() - NOW.getTime()).toBe(10 * 60 * 1000);
  });

  it("sets the due date interval days from now", () => {
    const result = scheduleReview(withInterval(3), "good", NOW);
    expect(result.dueDate.getTime() - NOW.getTime()).toBe(7 * DAY);
    expect(result.repetitions).toBe(4);
  });
});

describe("scheduleReview — mature cards (past 30 days)", () => {
  it("grows by the ease factor on 'good'", () => {
    expect(scheduleReview(withInterval(30, 2.5), "good", NOW).intervalDays).toBe(75);
  });

  it("grows slowly on 'hard' and faster on 'easy'", () => {
    expect(scheduleReview(withInterval(30, 2.5), "hard", NOW).intervalDays).toBe(36);
    expect(scheduleReview(withInterval(30, 2.5), "easy", NOW).intervalDays).toBe(98);
  });

  it("never schedules beyond 365 days", () => {
    expect(scheduleReview(withInterval(300, 3), "easy", NOW).intervalDays).toBe(365);
  });

  it("always moves forward even with the minimum ease", () => {
    expect(scheduleReview(withInterval(30, 1.3), "hard", NOW).intervalDays).toBeGreaterThan(30);
  });
});

describe("ease bounds", () => {
  it("never drops below 1.3", () => {
    expect(scheduleReview(withInterval(3, 1.35), "again", NOW).ease).toBe(1.3);
  });

  it("never rises above 5", () => {
    expect(scheduleReview(withInterval(3, 4.95), "easy", NOW).ease).toBe(5);
  });
});

describe("dueCards", () => {
  it("keeps cards due now or earlier, oldest first", () => {
    const cards = [
      { id: "future", dueDate: new Date(NOW.getTime() + 1000) },
      { id: "late", dueDate: "2026-11-01T00:00:00.000Z" },
      { id: "now", dueDate: NOW },
    ];
    expect(dueCards(cards, NOW).map((card) => card.id)).toEqual(["late", "now"]);
  });
});
