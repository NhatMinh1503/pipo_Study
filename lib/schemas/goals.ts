import { z } from "zod";

const goalSchema = z.object({
  count: z.number().int().min(0),
  target: z.number().int().min(0),
  done: z.boolean(),
});

/** Result of the SQL function today_goals(): reached goals never un-tick during the day. */
export const todayGoalsSchema = z.object({
  date: z.string(),
  translate: goalSchema,
  review: goalSchema.extend({ applicable: z.boolean() }),
  focus: goalSchema,
  bonusCoins: z.number().int().min(0),
  rewarded: z.boolean(),
  justRewarded: z.boolean(),
});

export type TodayGoals = z.infer<typeof todayGoalsSchema>;

/** Goals that count today: the review goal drops out when nothing was due to review. */
export function applicableGoals(goals: TodayGoals): Array<{ done: boolean }> {
  return [goals.translate, ...(goals.review.applicable ? [goals.review] : []), goals.focus];
}
