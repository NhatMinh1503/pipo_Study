#!/usr/bin/env bash
# Format the file Claude just edited. Never commits.
set -euo pipefail

file_path=$(jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0
[ -f "$file_path" ] || exit 0

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md) ;;
  *) exit 0 ;;
esac

prettier="$CLAUDE_PROJECT_DIR/node_modules/.bin/prettier"
# Skip silently until Prettier is installed (S01)
[ -x "$prettier" ] || exit 0

"$prettier" --write --log-level warn "$file_path" || true
