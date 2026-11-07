---
name: game-spec
description: "Write or update the design spec for one pipo_Study game system (XP & levels, Coins & shop, streak & daily goals, Pomodoro garden, skill tree, leaderboards, 1v1 battle, community rewards) before it is built. Use when the user wants to design, plan or spec a game feature."
argument-hint: "[system name, e.g. streak | garden | battle | shop | skill-tree]"
allowed-tools: Read, Glob, Grep, Write, Edit, Agent, AskUserQuestion
---

# Game Spec (pipo_Study)

Produces `design/game/<system>.md` — the source of truth an implementer can build
from. Reply in Vietnamese.

## Step 1 — Gather context

1. Read `.claude/docs/game-pillars.md` and `design/game/registry.md`.
2. Read the matching section of `PRD.md` (section F for gamification, G for
   leaderboards/battle/community).
3. Search the code for what already exists for this system (routes, components,
   DB tables, API handlers). Summarize: built / partly built / not built.
4. If `design/game/<system>.md` exists, this is an update: read it and ask what
   changed.

## Step 2 — Scope questions

Ask the user (AskUserQuestion, max 4 questions): the learning behavior this
system should increase, the target feeling, must-have vs later, and any
constraint (AI cost, realtime infra, solo-dev maintenance).

## Step 3 — Options

Delegate to the `game-designer` agent with the gathered context and the user's
answers; it returns 2–4 approaches with trade-offs. Present them and let the user
choose.

## Step 4 — Draft section by section

Ask "May I create `design/game/<system>.md` with the section skeleton?", then
fill each section, showing it and asking before each write:

1. **Overview**
2. **Learner fantasy & target feeling** (MDA aesthetic + learning behavior)
3. **Detailed rules**
4. **Formulas** — delegate to `systems-designer` (mandatory format: expression,
   variable table, output range, worked example)
5. **Economy impact** — delegate to `economy-designer` if the system earns or
   spends XP/Coins (faucet/sink rows, prices, anti-farming)
6. **Retention hooks** — delegate to `live-ops-designer` if it involves streaks,
   goals, leagues or events
7. **UX & accessibility** — delegate to `ux-designer` (states, feedback, mobile,
   IME) and `accessibility-specialist` (requirements)
8. **Edge cases & degenerate strategies**
9. **Dependencies** (SRS, AI grading, auth, DB, realtime)
10. **Tuning knobs** — value, range, category (feel / curve / gate), where it
    will live in config
11. **Acceptance criteria** — functional + experiential, each testable; include
    the metric that tells whether it works (tie to PRD KPIs)
12. **Implementation notes** — server-side computation, idempotency, data model
    sketch, test cases table. No code.

## Step 5 — Registry

List every new cross-system value or formula and ask:
"May I add these to `design/game/registry.md`?"

## Step 6 — Hand-off

Offer to break the spec into implementation tasks sized one feature per session,
ordered so each task is shippable. Do not write application code in this skill.
