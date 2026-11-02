#!/usr/bin/env bash
# Record a checkpoint before context compaction so progress survives.
set -euo pipefail

progress="$CLAUDE_PROJECT_DIR/.claude/progress.md"
trigger=$(jq -r '.trigger // "unknown"')

{
  echo ""
  echo "- $(date '+%Y-%m-%d %H:%M') · compact ($trigger)"
  if git -C "$CLAUDE_PROJECT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$CLAUDE_PROJECT_DIR" status --short | head -n 15 | sed 's/^/    /'
  fi
} >> "$progress"
