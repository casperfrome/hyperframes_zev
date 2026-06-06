#!/usr/bin/env bash
# Installs the canonical Codex skill and a legacy /hyperframes_zev_v2 prompt shim.
# Re-run any time to update. Pass --force to overwrite without prompting.
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
src_skill="$repo/skills/hyperframes-zev"
dst_skills="${CODEX_HOME:-$HOME/.codex}/skills"
dst_skill="$dst_skills/hyperframes-zev"

src_prompt="$repo/codex/prompts/hyperframes_zev_v2.md"
dst_prompts="${CODEX_HOME:-$HOME/.codex}/prompts"
dst_prompt="$dst_prompts/hyperframes_zev_v2.md"

[[ -d "$src_skill" ]] || { echo "source skill not found: $src_skill" >&2; exit 1; }
[[ -f "$src_prompt" ]] || { echo "legacy prompt not found: $src_prompt" >&2; exit 1; }
mkdir -p "$dst_skills" "$dst_prompts"

if [[ (-d "$dst_skill" || -f "$dst_prompt") && $force -eq 0 ]]; then
  read -r -p "HyperFrames Zev Codex files already exist - overwrite? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi

rm -rf "$dst_skill"
cp -R "$src_skill" "$dst_skill"
cp "$src_prompt" "$dst_prompt"

echo "Installed Codex skill -> $dst_skill"
echo "Installed legacy prompt -> $dst_prompt"
echo "Use:  \$hyperframes-zev"
echo "Legacy command still works:  /hyperframes_zev_v2"
if [[ -n "${HF_ZEV_HOME:-}" ]]; then
  echo "Note: HF_ZEV_HOME is deprecated for new installs and was left unchanged."
fi
if [[ -z "${HF_WORKBENCH:-}" ]]; then
  echo
  echo "Reminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  echo "  export HF_WORKBENCH=/path/to/hyperframes_test"
fi
