# 1v1 Battle — pipo_Study

Status: **Approved** (2026-11-17). Implements the decisions in audit §11.

## Matchmaking

- Still by language only (level matching waits for more learners, audit §11).
- Passage rotation: `findBattle` skips passages from the learner's last 10 battles while
  another passage for the level is left. Bank: 8 JA passages (N5–N1), 8 EN passages (A1–C2).

## Ghost mode (async)

- In the waiting room: **Race a recorded run**. `start_ghost_battle` turns the room into a race
  against another learner's finished run on the same language (same level first, unplayed
  passages first). The ghost's author is not a player and never sees the race.
- The recorded answers replay at their own pace (`ghost_timeline` offsets, `ghostProgress`).
- Result when the racer finishes: higher score wins; a loss records the ghost's author as winner
  so history reads "lost". Leaving a ghost race abandons it.

## Scoring

- Unchanged per answer (exact 10 / acceptable 7 + speed bonus up to 5).
- **Equal scores are a draw** (speed is already in the points; no second tie-break).
- Pasting is blocked in the battle answer box (anti machine-translation, audit §15b).
- Pasting the source sentence is rejected server-side (copy guard).

## Rewards

- Every player who answers every sentence: **+3 Coins**, winner **+2 more**.
- At most **5 rewarded battles per local day** per learner (anti-farming between two accounts).
- No XP (XP stays tied to lessons and reviews).
