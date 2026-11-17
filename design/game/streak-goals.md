# Streak & Daily Goals — pipo_Study

Status: **Approved** (2026-11-17, Minh asked to finish every open game item; values below are
the ones shipped). Fixes audit §5 (streak) and §6 (bug #2: daily goal ticks and un-ticks itself).
Leaderboard part of audit §10 is in the same change (calendar periods, own rank, personal bests).

## 1. Daily goals

| Goal      | Done when (learner's local day)                                     | Target          |
| --------- | ------------------------------------------------------------------- | --------------- |
| Translate | sentences unlocked today (`reward_claims.kind = 'sentence'`)        | 3               |
| Review    | rewarded reviews today (`transactions.reason = 'flashcard_review'`) | `review_target` |
| Focus     | completed Pomodoro sessions today                                   | 1               |

- `review_target = min(5, cards seen before and due)` is **fixed at the first look of the day**
  (`daily_goal_days`). New cards (never reviewed) do not count, so saving words never moves it.
- `review_target = 0` → the review goal does not apply today (shown as "nothing due"), it is
  never ticked for free, and the day has 2 goals instead of 3.
- A goal once reached stores `*_done_at` and never un-ticks.
- Every applicable goal done → **+5 Coins once per local day** (`daily_goals:<date>`).
- Everything runs in SQL `today_goals()` (security definer); the client only displays it.

## 2. Streak

- Study activity is unchanged (xp-levels §3.5).
- **Freeze:** 50 Coins, hold at most 2 (`buy_streak_freeze`). When the learner studies after
  missing `k` days and holds `≥ k` freezes, `k` freezes are spent and the streak continues.
  `effective_streak` keeps showing the streak while missed days ≤ freezes held. Not enough
  freezes → the streak restarts at 1 and the freezes are kept.
- **Milestones (Coins, once per streak run):** 3 → 5, 7 → 10, 14 → 20, 30 → 40, 60 → 60,
  then 100 every 100 days. Key `streak_milestone:<days>:<first day of the run>`.

## 3. Leaderboards

- Week = calendar week from Monday 00:00, month = calendar month, both in the viewer's time
  zone (`leaderboard_period_start`). Streak board = effective streak (freezes included).
- `my_leaderboard_rank` gives the viewer's rank also outside the top 50.
- Personal bests: best calendar week of XP, best week of focus minutes, longest streak.
- Leagues by level stay for later (audit §10: too few learners).

## 4. Ethics check

- Freezes and the forgiving review goal reduce streak anxiety (P5). The goal bonus is small
  and informational; no goal rewards the rating chosen on a card (SRS integrity).
