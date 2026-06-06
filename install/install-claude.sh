#!/usr/bin/env bash
# Installs the canonical Claude Code skill. A legacy alias folder is also copied
# so old manual /hyperframes_zev_v2 invocations continue to find the same files.
# Re-run any time to update. Pass --force to overwrite without prompting.
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src="$repo/skills/hyperframes-zev"
dst_dir="$HOME/.claude/skills"
dst="$dst_dir/hyperframes-zev"
legacy="$dst_dir/hyperframes_zev_v2"

[[ -d "$src" ]] || { echo "source skill not found: $src" >&2; exit 1; }
mkdir -p "$dst_dir"

if [[ (-d "$dst" || -d "$legacy") && $force -eq 0 ]]; then
  read -r -p "HyperFrames Zev Claude skill already exists - overwrite? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

rm -rf "$dst" "$legacy"
cp -R "$src" "$dst"
cp -R "$src" "$legacy"

echo "Installed Claude Code skill -> $dst"
echo "Installed legacy alias -> $legacy"
echo "Use:  /hyperframes-zev"
echo "Legacy alias remains available:  /hyperframes_zev_v2"
if [[ -z "${HF_WORKBENCH:-}" ]]; then
  echo
  echo "Reminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  echo "  export HF_WORKBENCH=/path/to/hyperframes_test"
fi
