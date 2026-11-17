# Skill Tree — pipo_Study

Status: **Approved** (2026-11-17). Implements PRD F "Skill Tree theo chủ đề & cấp độ, mở khoá
dần" (audit §9). The old milestone badges stay on the same page as **Achievements**.

## Shape

- 6 topics × every level of the learning language (JA: N5→N1, EN: A1→C2).
  Topics: daily life, food, travel, school, work, technology (`lib/skills/topics.ts`).
- A node is `<topic>:<level>`. **Learn** on a node makes the server generate an AI lesson on
  that topic at that level (`startSkillNode`) and tag it (`lessons.skill_node`, server only).

## Unlock rule

- Placement: nodes up to the learner's own level are open from the start.
- Above it, a node opens when the node below in the same topic is passed.
- **Pass** = a finished lesson on the node with accuracy ≥ 60 %
  (accuracy = sentence points / (10 × sentences), `skill_tree_progress()`).
- The server re-checks the rule before generating a lesson, so a locked node cannot be forced.

## Rewards

None beyond normal lesson XP / Coins (pillar P2: the path itself is the motivation; no double
pay). AI lessons are outside the manual-lesson daily XP cap as before.

## Achievements fix

Review count now comes from the ledger (`review_count()` = rewarded reviews), so pressing
Again never lowers it.
