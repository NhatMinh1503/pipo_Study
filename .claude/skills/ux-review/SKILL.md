---
name: ux-review
description: "Review a pipo_Study screen, flow, component or UX spec for usability, game-reward feedback and WCAG 2.2 AA accessibility. Use when the user asks to review UX, UI, a page, a component, or accessibility."
argument-hint: "[route e.g. /dashboard | component path | design/ux/<spec>.md | all]"
allowed-tools: Read, Glob, Grep, Write, Agent, AskUserQuestion
---

# UX Review (pipo_Study)

Read `.claude/docs/game-pillars.md` first. Reply in Vietnamese.

## Step 0 — What can be assessed

Identify the target from `$ARGUMENTS`:

- **Route** (e.g. `/lessons/[id]/translate`) → find its page file and the
  components it renders.
- **Component path** → read it and where it is used.
- **UX spec** in `design/ux/` → review the spec and, if built, the matching code.
- `all` → list the routes and ask which to start with.

Reviewing code shows structure, labels, semantics and states, but not real
rendering, contrast or timing. Mark checks that need the running app as
**NOT ASSESSED (needs live check)** unless the user provides screenshots or a
live session (e.g. via a browser tool). Never claim a pass you could not verify.

## Step 1 — Usability

- Purpose of the screen is clear within 5 seconds; primary action obvious.
- All states exist: empty, loading, success, error, AI-failure, offline.
- Feedback: instant acknowledgement; AI waits show progress (streamed text or a
  meaningful status), not just a disabled button.
- A way forward always exists after repeated failure (hint / reveal / skip).
- Navigation: current location visible; secondary features reachable.
- Mobile: bottom nav, no keyboard-only hints, touch targets ≥ 44px.
- IME: Enter during composition does not submit (`isComposing`).

## Step 2 — Game-layer feedback

- Rewards (XP, Coins, streak, goals, trees) appear at the moment earned and
  match the dashboard everywhere.
- No goal flips done → undone silently.
- Competitive screens encourage beginners.
- No dark patterns (fake urgency, confirm-shaming, guilt notifications).

## Step 3 — Accessibility (WCAG 2.2 AA)

Delegate a focused audit to the `accessibility-specialist` agent for the same
target, or apply its checklist directly for small targets: text size, contrast
(both themes), color-only meaning, keyboard and focus, `lang="ja"` and
furigana, `aria-live` for AI results, reduced motion, target size.

## Step 4 — Report

```
## UX Review: <target> — <date>
### Verdict: APPROVED | NEEDS REVISION | MAJOR REVISION | NOT ASSESSED
### What works
### Issues
| # | Issue | Where (file:line or screen area) | Severity | Category (usability / game feedback / a11y) | Recommendation |
### Not assessed (and what is needed)
### Top 3 fixes
```

Severity: S1 blocks the task, S2 major friction or WCAG failure, S3 minor,
S4 polish.

## Step 5 — Save

Ask: "May I save this to `design/ux/reviews/<target>-<date>.md`?"
Do not edit application code; offer to turn the top fixes into a task list.
