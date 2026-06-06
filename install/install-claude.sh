#!/usr/bin/env bash
# Installs the Claude Code skill: copies claude-code/hyperframes_zev_v2 -> ~/.claude/skills/
# Re-run any time to update. Pass --force to overwrite without prompting.
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$repo/claude-code/hyperframes_zev_v2"
dst_dir="$HOME/.claude/skills"
dst="$dst_dir/hyperframes_zev_v2"

[[ -d "$src" ]] || { echo "source skill not found: $src" >&2; exit 1; }
mkdir -p "$dst_dir"

if [[ -d "$dst" && $force -eq 0 ]]; then
  read -r -p "Skill already exists at $dst — overwrite? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi
rm -rf "$dst"
cp -R "$src" "$dst"

echo "Installed Claude Code skill -> $dst"
echo "Invoke it in Claude Code with:  /hyperframes_zev_v2"
if [[ -z "${HF_WORKBENCH:-}" ]]; then
  echo
  echo "Reminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  echo "  export HF_WORKBENCH=/path/to/hyperframes_test   # add to your shell rc"
fi
