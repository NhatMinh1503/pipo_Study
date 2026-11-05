# Game Registry — pipo_Study

Single source of truth for cross-system currencies, constants and formulas.
Agents read this before defining any value and propose changes instead of
contradicting it. Only values the user (Minh) has approved go in the tables;
proposals stay in the system's own design doc until approved.

Last updated: 2026-11-05 (skeleton — no values approved yet)

## Currencies

| Name  | Spendable | Shown where            | Computed where | Notes                                               |
| ----- | --------- | ---------------------- | -------------- | --------------------------------------------------- |
| XP    | No        | Dashboard, leaderboard | server         | PRD: from finished passages, by attempts & accuracy |
| Coins | Yes       | Dashboard, shop        | server         | PRD: from passages, Pomodoro, streak                |

## Constants

| Name                   | Value   | Range | Category (feel/curve/gate) | Defined in (file) | Source doc | Revised |
| ---------------------- | ------- | ----- | -------------------------- | ----------------- | ---------- | ------- |
| pomodoro_focus_minutes | 25 / 50 | —     | gate                       | _find in code_    | PRD F      | —       |
| pomodoro_break_minutes | 5       | —     | gate                       | _find in code_    | PRD F      | —       |

## Formulas

| Name               | Expression         | Output range | Source doc | Revised |
| ------------------ | ------------------ | ------------ | ---------- | ------- |
| _e.g. sentence_xp_ | _not yet designed_ |              |            |         |

## Faucets & sinks (summary)

| Source / Sink | Currency | Rate / Price | Daily cap | Source doc |
| ------------- | -------- | ------------ | --------- | ---------- |

## Systems and their docs

| System                 | Doc                         | Status      |
| ---------------------- | --------------------------- | ----------- |
| XP & levels            | design/game/xp-levels.md    | not specced |
| Coins & shop           | design/game/shop.md         | not specced |
| Streak & daily goals   | design/game/streak-goals.md | not specced |
| Pomodoro garden        | design/game/garden.md       | not specced |
| Skill tree             | design/game/skill-tree.md   | not specced |
| Leaderboards / leagues | design/game/leagues.md      | not specced |
| 1v1 translation battle | design/game/battle.md       | not specced |
