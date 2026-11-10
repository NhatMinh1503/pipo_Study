/**
 * Feel values of the garden scene (garden-scene spec §10). Rules that affect rewards or
 * data (tree stages, plots, free species) live in lib/game/config.ts instead.
 */
export const SCENE = {
  /** Pipo's walking speed along the path, logical px per second. */
  pipoSpeed: 28,
  /** Chance to stop at a viewing spot next to a mature tree. */
  lookChance: 0.35,
  lookSeconds: { min: 2, max: 4 },
  /** Chance to sit when passing a placed bench. */
  sitChance: 0.5,
  sitSeconds: { min: 4, max: 7 },
  /** Chance to say something when stopping. */
  speakChance: 0.5,
  reactSeconds: 1.2,
  blinkSeconds: { min: 2.5, max: 5 },
  blinkDuration: 0.12,
  /** The slime hops along the path the other way from Pipo. */
  slimeSpeed: 16,
  slimeHopsPerSecond: 1.6,
  slimeHopHeight: 7,
  /** Pipo has no legs: it bounces along like the slime, a little quicker and lower. */
  pipoHopsPerSecond: 2.4,
  pipoHopHeight: 6,
  maxPetals: 20,
  clouds: 3,
  koi: 2,
  /** Spoken lines are also read by screen readers; never more often than this. */
  speechAnnounceSeconds: 10,
} as const;
