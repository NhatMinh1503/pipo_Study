#!/usr/bin/env bash
# Block git operations that would touch main or rewrite pushed history.
# Exit code 2 = block the tool call and show stderr to Claude.
set -euo pipefail

command=$(jq -r '.tool_input.command // empty')
[ -z "$command" ] && exit 0

# Only inspect commands that involve git
echo "$command" | grep -qE '(^|[;&|[:space:]])git[[:space:]]' || exit 0

block() {
  echo "Blocked by guard-git: $1. Merge vào main do Minh làm qua Pull Request." >&2
  exit 2
}

if echo "$command" | grep -qE 'git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$)|--force-with-lease)'; then
  block "force push is not allowed"
fi

if echo "$command" | grep -qE 'git[[:space:]]+push.*[[:space:]:](main|master)([[:space:]]|$)'; then
  block "pushing to main is not allowed"
fi

current_branch=$(git -C "$CLAUDE_PROJECT_DIR" branch --show-current 2>/dev/null || true)
if [ "$current_branch" = "main" ] || [ "$current_branch" = "master" ]; then
  if echo "$command" | grep -qE 'git[[:space:]]+(commit|push|merge|rebase|reset)'; then
    block "commit/push/merge/rebase/reset on $current_branch is not allowed — create a session branch first"
  fi
fi

exit 0
