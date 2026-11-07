# Game Registry — pipo_Study

Single source of truth for cross-system currencies, constants and formulas.
Agents read this before defining any value and propose changes instead of
contradicting it. Only values the user (Minh) has approved go in the tables;
proposals stay in the system's own design doc until approved.

Last updated: 2026-11-05 (xp-levels spec approved; hotfix values recorded)

"Defined in" shows where the value lives **today**. `→ lib/game/config.ts` marks values
that task T1 of `xp-levels.md` moves into the single config module. _(planned)_ means the
value is approved but not implemented yet.

## Currencies

| Name  | Spendable | Shown where                     | Computed where | Notes                                                                                                                 |
| ----- | --------- | ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| XP    | No        | Dashboard, profile, leaderboard | server         | From unlocked sentences, lesson bonus, rewarded reviews, queue-clear bonus. **No XP from Pomodoro.** See xp-levels.md |
| Coins | Yes       | Dashboard, shop                 | server         | From finished lessons (≥ 3 sentences) and Pomodoro. Spent in the shop                                                 |
| Level | No        | Dashboard, profile              | server (SQL)   | Derived from total XP, never stored as its own source of truth. Lv1–50, then ★                                        |

## Constants

| Name                         | Value   | Range     | Category | Defined in (file)                                                    | Source doc     | Revised    |
| ---------------------------- | ------- | --------- | -------- | -------------------------------------------------------------------- | -------------- | ---------- |
| points_exact                 | 10      | 8–12      | feel     | `lib/scoring.ts` → lib/game/config.ts                                | xp-levels §4.1 | 2026-11-05 |
| points_acceptable            | 7       | 5–9       | feel     | `lib/scoring.ts` → lib/game/config.ts                                | xp-levels §4.1 | 2026-11-05 |
| retry_penalty                | 2       | 1–3       | feel     | `lib/scoring.ts` → lib/game/config.ts                                | xp-levels §4.1 | 2026-11-05 |
| min_points                   | 2       | 1–3       | feel     | `lib/scoring.ts` → lib/game/config.ts                                | xp-levels §4.1 | 2026-11-05 |
| min_lesson_sentences         | 3       | 3–5       | gate     | _(planned)_ lib/game/config.ts + SQL                                 | xp-levels §4.2 | 2026-11-05 |
| lesson_bonus_xp              | 5       | 0–10      | feel     | _(planned)_ lib/game/config.ts                                       | xp-levels §4.2 | 2026-11-05 |
| perfect_bonus_coins          | 3       | 0–5       | feel     | `lib/scoring.ts` → lib/game/config.ts                                | xp-levels §4.2 | 2026-11-05 |
| review_xp                    | 1       | 1–2       | feel     | `lib/review/reward.ts` → lib/game/config.ts                          | xp-levels §3.3 | 2026-11-05 |
| review_clear_bonus_xp        | 5       | 0–10      | feel     | _(planned)_ lib/game/config.ts                                       | xp-levels §3.4 | 2026-11-05 |
| review_clear_min_reviews     | 5       | 3–10      | gate     | _(planned)_ lib/game/config.ts + SQL                                 | xp-levels §3.4 | 2026-11-05 |
| manual_lesson_daily_xp_cap   | 300     | 200–500   | gate     | _(planned)_ SQL, mirrored in lib/game/config.ts                      | xp-levels §3.6 | 2026-11-05 |
| level_base                   | 50      | 40–80     | curve    | _(planned)_ SQL `level_for_xp`                                       | xp-levels §4.3 | 2026-11-05 |
| level_step                   | 40      | 30–60     | curve    | _(planned)_ SQL `level_for_xp`                                       | xp-levels §4.3 | 2026-11-05 |
| level_cap                    | 50      | fixed     | curve    | _(planned)_ SQL `level_for_xp`                                       | xp-levels §4.3 | 2026-11-05 |
| star_xp                      | 2000    | 1500–3000 | curve    | _(planned)_ SQL `stars_for_xp`                                       | xp-levels §4.4 | 2026-11-05 |
| pomodoro_xp                  | 0       | fixed     | gate     | _(planned)_ `complete_pomodoro` (today: XP = minutes)                | xp-levels §3.7 | 2026-11-05 |
| pomodoro_focus_minutes       | 25 / 50 | —         | gate     | `lib/pomodoro/timer.ts` (`FOCUS_OPTIONS`)                            | PRD F          | 2026-11-05 |
| pomodoro_break_minutes       | 5       | —         | gate     | `lib/pomodoro/timer.ts` (`BREAK_MINUTES`)                            | PRD F          | 2026-11-05 |
| battle_heartbeat_seconds     | 15      | 10–30     | gate     | `lib/battle/presence.ts`                                             | audit §17 (c)  | 2026-11-05 |
| battle_opponent_timeout_s    | 90      | 60–180    | gate     | migration `…_battle_presence_timeout.sql` + `lib/battle/presence.ts` | audit §17 (c)  | 2026-11-05 |
| battle_waiting_room_idle_s   | 45      | 30–90     | gate     | migration `…_battle_presence_timeout.sql`                            | audit §17 (c)  | 2026-11-05 |
| battle_abandon_after_minutes | 15      | 10–30     | gate     | migration `…_battle_presence_timeout.sql`                            | audit §17 (c)  | 2026-11-05 |

## Formulas

| Name             | Expression                                                                           | Output range  | Source doc     | Revised    |
| ---------------- | ------------------------------------------------------------------------------------ | ------------- | -------------- | ---------- |
| sentence_xp      | `max(min_points, points[v] − retry_penalty × k)`; 0 if never passed                  | 0 or [2, 10]  | xp-levels §4.1 | 2026-11-05 |
| lesson_bonus_xp  | `n ≥ min_lesson_sentences ? lesson_bonus_xp : 0`                                     | {0, 5}        | xp-levels §4.2 | 2026-11-05 |
| lesson_coins     | `n ≥ min_lesson_sentences ? floor(P / 10) + (perfect ? perfect_bonus_coins : 0) : 0` | [0, n + 3]    | xp-levels §4.2 | 2026-11-05 |
| xp_to_next(L)    | `level_base + level_step × (L − 1)`, 1 ≤ L < 50                                      | [50, 1970]    | xp-levels §4.3 | 2026-11-05 |
| xp_to_reach(L)   | `20L² − 10L − 10`                                                                    | Lv50 = 49 490 | xp-levels §4.3 | 2026-11-05 |
| level(xp)        | `min(level_cap, max L with xp_to_reach(L) ≤ xp)`                                     | [1, 50]       | xp-levels §4.3 | 2026-11-05 |
| stars(xp)        | `xp ≥ 49 490 ? floor((xp − 49 490) / star_xp) : 0`                                   | [0, ∞)        | xp-levels §4.4 | 2026-11-05 |
| effective_streak | `streak_current` if `last_active_date ≥ today_local − 1`, else 0                     | [0, ∞)        | audit §17 (b)  | 2026-11-05 |
| pomodoro_coins   | `max(1, minutes / 5)`                                                                | 5 or 10       | S21 (existing) | 2026-11-05 |

**Study activity** (what keeps a streak, xp-levels §3.5, reused by streak-goals): an unlocked
sentence (even at 0 XP because of the daily cap) or a rewarded review of a due card. Not:
the first review of a new card, bonuses, Pomodoro, shop, battle, community.

## Faucets & sinks (summary)

| Source / Sink                       | Currency | Rate / Price               | Daily cap                                                       | Source doc           |
| ----------------------------------- | -------- | -------------------------- | --------------------------------------------------------------- | -------------------- |
| Unlocked sentence                   | XP       | 2–10 per sentence          | 300 combined for `manual` lessons; none for `ai` / `news`       | xp-levels §3.1, §3.6 |
| Lesson completion (≥ 3 sentences)   | XP       | 5                          | counts toward the 300 cap if `manual`                           | xp-levels §3.2       |
| Lesson completion (≥ 3 sentences)   | Coins    | floor(P/10) + 3 if perfect | 0 for a `manual` lesson whose completion bonus was capped (Q-A) | xp-levels §3.2       |
| Rewarded review (due, seen before)  | XP       | 1 per card                 | once per card per local day                                     | xp-levels §3.3       |
| Review queue cleared (≥ 5 rewarded) | XP       | 5                          | once per local day                                              | xp-levels §3.4       |
| Pomodoro session                    | Coins    | 1 per 5 minutes            | none                                                            | S21                  |
| Pomodoro session                    | XP       | 0                          | —                                                               | xp-levels §3.7       |
| Shop: themes                        | Coins    | 60 each                    | —                                                               | S23 (DB)             |
| Shop: decorations                   | Coins    | 25–40                      | —                                                               | S23 (DB)             |
| Shop: topic packs                   | Coins    | 80 each                    | —                                                               | S23 (DB)             |

## Systems and their docs

| System                 | Doc                         | Status                             |
| ---------------------- | --------------------------- | ---------------------------------- |
| Game audit             | design/game/audit.md        | approved                           |
| XP & levels            | design/game/xp-levels.md    | **approved spec, not built**       |
| Coins & shop           | design/game/shop.md         | not specced                        |
| Streak & daily goals   | design/game/streak-goals.md | not specced (reuse xp-levels §3.5) |
| Pomodoro garden        | design/game/garden.md       | not specced                        |
| Skill tree             | design/game/skill-tree.md   | not specced                        |
| Leaderboards / leagues | design/game/leagues.md      | not specced                        |
| 1v1 translation battle | design/game/battle.md       | not specced                        |
