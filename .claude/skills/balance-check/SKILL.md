---
name: balance-check
description: "Audit pipo_Study's game balance — XP curve, Coins faucets/sinks and shop prices, streak and daily-goal rules, battle scoring, farming exploits. Use when the user asks to check balance, rewards, economy or progression."
argument-hint: "[xp | coins | streak | goals | battle | garden | all | path-to-file]"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion
---

# Balance Check (pipo_Study)

Read `.claude/docs/game-pillars.md` first. Reply in Vietnamese.

## Step 0 — Insufficient input check (do this before any report)

List the inputs you need and mark each `FOUND` or `ABSENT`:

- Design targets: `design/game/registry.md`, `design/game/<system>.md`
- Actual values in code: the config module(s) holding XP/Coins/streak/battle
  numbers (search with Grep for e.g. `xp`, `coins`, `streak`, `reward`,
  `price`), DB seed or migration files for shop items
- Optional real data the user supplies (balances, completion rates)

If a section's inputs are ABSENT, that section is **NOT ASSESSED — NO DATA**:
name what is missing and which agent or skill produces it (`/game-spec`,
`economy-designer`). If everything is absent, stop with that verdict.
**NOT ASSESSED is a valid, useful result. Never fill a report with guesses.**
A value with no stated target is listed as "no stated range — not judged",
not as in-range.

## Step 1 — Domain

From `$ARGUMENTS`: `xp`, `coins`, `streak`, `goals`, `battle`, `garden`, `all`,
or a file path (infer the domain from its content). No argument → ask which.

## Step 2 — Read targets, then actual values

Registry first, then the system doc, then the code. Note every file read.
Record where each value is defined (file:line). Flag values hardcoded in
components instead of a config module.

## Step 3 — Analysis

For every value: compare with its target. Then run domain checks:

**XP / progression**

- Can retries earn as much as or more than a first-try correct answer?
- Does a tiny passage (1 short sentence) earn disproportionate XP?
- Is XP awarded per sentence or only on passage completion, and does the UI
  match? (Known issue from the 2026-11-03 review: XP stayed 0 after a correct
  sentence while progress was 1/3 — verify.)
- Level curve: dead zones (long stretches with no milestone) or spikes; time to
  each milestone for a light, PRD-target and heavy learner.

**Coins / economy**

- Faucet/sink table with daily rates; projected balance at 1 week, 1 month,
  3 months.
- Sinks that run out (finite catalog) → inflation.
- Items never worth buying, or affordable too late to matter.
- Every faucet's cheapest farming route and whether it is capped or
  server-side idempotent.

**Streak / daily goals**

- What counts as a study day; timezone; freeze/repair.
- Goals that auto-complete when not applicable and later revert. (Known issue:
  "Ôn hết thẻ đến hạn" was ticked with zero cards, then unticked after a word
  was saved — verify.)

**Flashcards / SRS**

- Any reward depends on the rating chosen (Easy/Good/Hard)? That is a
  critical issue — it pushes dishonest ratings.

**Battle**

- Accuracy vs speed weighting; whether pasting a machine translation wins;
  tie, timeout and disconnect handling; level matchmaking.

**Garden / Pomodoro**

- Can a background-tab timer earn rewards? Interrupted sessions?

## Step 4 — Report

```
## Balance Check: <domain> — <date>
### Inputs
| Input | Status | Path |
### Verdict: NOT ASSESSED | HEALTHY | CONCERNS | CRITICAL
### Outliers
| Value | Defined at | Target | Actual | Issue |
### Degenerate strategies (farming)
| Strategy | Effort | Payoff | Mitigation |
### Progression / economy projection
<table for light / target / heavy learner>
### Values that need attention
### Recommendations (prioritized, each tied to a pillar)
```

## Step 5 — Save

Ask: "May I save this report to `design/game/balance/<domain>-<date>.md`?"
Never change code or config values yourself — list the proposed changes for the
user to approve and implement.
