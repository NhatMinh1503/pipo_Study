#!/usr/bin/env bash
# Inject current project progress into context at session start.
set -euo pipefail

progress="$CLAUDE_PROJECT_DIR/.claude/progress.md"

echo "## pipo_Study — context"
echo "Spec: PRD.md · Tasks: SESSIONS.md (MVP = S01–S13 + S21)"

if [ -f "$progress" ]; then
  echo ""
  echo "### Recent progress (.claude/progress.md)"
  tail -n 30 "$progress"
else
  echo "No progress yet — start from S01."
fi

if git -C "$CLAUDE_PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo ""
  echo "### Uncommitted changes"
  git -C "$CLAUDE_PROJECT_DIR" status --short | head -n 20
fi
