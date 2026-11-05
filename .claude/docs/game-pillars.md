# pipo_Study — Game Design Pillars & Shared Rules

Every game-design agent and skill in this repo reads this file first. It is the
"creative director" of the project: when two ideas conflict, the pillar order
below decides.

## Product in one line

pipo_Study teaches Japanese (N5–N1) and English (A1–C2) through active,
sentence-by-sentence contextual translation with AI feedback, SRS flashcards,
and gamification (XP, Coins, streaks, Pomodoro garden, shop, skill tree,
leaderboards, 1v1 translation battles, community feed).

Source of truth for features: `PRD.md` at the repo root. Read the relevant
section before designing.

## Pillars (in priority order)

1. **Learning first.** A game mechanic is only good if it makes the learner
   translate more, recall better, or come back tomorrow to study. A mechanic
   that raises engagement numbers without raising learning is a defect.
2. **Effort and accuracy are what get rewarded — never raw activity.** Reward
   correct translations, first-try accuracy, real reviews, finished focus
   sessions. Never reward clicks, retries, logins alone, or easy repetition.
3. **Competence you can feel.** Feedback must be immediate and readable: the
   learner always knows what they earned, why, and what to do next (Flow,
   SDT‑Competence).
4. **Kind competition.** Social and competitive features (leaderboards,
   battles, community) must motivate beginners as well as experts. No mechanic
   may humiliate or permanently exclude a low performer.
5. **Respect the learner's time and wallet.** No dark patterns, no predatory
   FOMO, no streak anxiety traps, no pay-to-win. See "Ethics" below.

## Learning-game risks to check on every design

- **Overjustification effect**: extrinsic rewards can crowd out intrinsic
  motivation. Make rewards _informational_ ("you nailed the particle に") rather
  than purely _controlling_ ("do 10 more for coins").
- **Farming / degenerate strategies**: spamming "Easy" on flashcards, creating
  tiny 1-sentence lessons for XP, pasting machine translations, retrying until
  correct, Pomodoro timers left running in a background tab.
- **SRS integrity**: rewards must never push learners to rate cards
  dishonestly. Reward _completing_ due reviews, not the rating chosen.
- **Streak anxiety**: losing a long streak is a major churn trigger. Provide
  forgiveness (freeze, repair) and use the learner's own timezone.
- **Leaderboard demotivation**: a global all-time board demotivates most users.
  Prefer weekly resets, leagues/cohorts of similar level, personal-best views.
- **AI judgment fairness**: AI grading is non-deterministic. Any reward or
  battle outcome that depends on AI must state how ties, AI errors and
  latency are handled, and be appealable or forgiving.
- **Client trust**: XP, Coins, streaks and battle results are computed and
  stored **server-side**. The client only displays them.

## Shared technical rules

- Check the real stack before assuming: read `package.json` and the folder
  structure. (Observed in production: Next.js on Vercel, shadcn/ui, Tailwind.)
- Every tunable number (XP per sentence, coin prices, streak rules, timer
  lengths, battle scoring weights) lives in one config module or table — never
  hardcoded in components. Record where it lives in `design/game/registry.md`.
- Game design documents live in `design/game/`. One file per system.
- The cross-system registry of currencies, constants and formulas is
  `design/game/registry.md`. Read it before defining any value; never
  contradict it silently — propose a registry change instead.

## Collaboration protocol (all agents)

- Ask clarifying questions before proposing. Then present 2–4 options with
  pros/cons and a recommendation. The user (Minh) decides.
- Draft in conversation; ask "May I write this to `<path>`?" before writing any
  file. Never edit application code — these agents produce designs and
  reviews; implementation happens in the main session.
- If data needed for a judgment does not exist, say **NOT ASSESSED — NO DATA**
  and name what is missing. Never invent numbers and present them as facts;
  label proposed values as proposals.
- Reply to the user in Vietnamese unless asked otherwise. Keep technical terms
  (XP, SRS, faucet/sink) in English where clearer.

## Ethics (non-negotiable)

- No real-money loot boxes or randomized paid rewards. Any randomness shows odds.
- No energy/stamina walls that limit studying.
- No pay-to-win in leaderboards or battles. Paid items, if ever added, are
  cosmetic or convenience only.
- No manipulative countdowns or "you'll lose everything" messaging.
- Content may be used by minors: no gambling-like mechanics.

## Attribution

Adapted from the MIT-licensed "Claude Code Game Studios" template by Donchitos
(https://github.com/Donchitos/Claude-Code-Game-Studios). See
`CCGS-LICENSE.txt` in this folder.
