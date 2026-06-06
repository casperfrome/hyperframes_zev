#!/usr/bin/env bash
# Installs the Codex slash command: copies codex/prompts/hyperframes_zev_v2.md -> ~/.codex/prompts/
# and sets HF_ZEV_HOME (so the prompt can locate its bundled references/ and scripts/).
# Re-run any time to update. Pass --force to overwrite without prompting.
set -euo pipefail

force=0
[[ "${1:-}" == "--force" ]] && force=1

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
codex_dir="$repo/codex"
src="$codex_dir/prompts/hyperframes_zev_v2.md"
dst_dir="${CODEX_HOME:-$HOME/.codex}/prompts"
dst="$dst_dir/hyperframes_zev_v2.md"

[[ -f "$src" ]] || { echo "source prompt not found: $src" >&2; exit 1; }
mkdir -p "$dst_dir"

if [[ -f "$dst" && $force -eq 0 ]]; then
  read -r -p "Prompt already exists at $dst — overwrite? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }
fi
cp "$src" "$dst"

# Persist HF_ZEV_HOME to the user's shell rc (idempotent), and export for this session.
rc="${HOME}/.bashrc"; [[ -n "${ZSH_VERSION:-}" || "${SHELL:-}" == *zsh ]] && rc="${HOME}/.zshrc"
line="export HF_ZEV_HOME=\"$codex_dir\""
if ! grep -qsF "export HF_ZEV_HOME=" "$rc" 2>/dev/null; then
  printf '\n# hyperframes_zev (Codex prompt) bundled files\n%s\n' "$line" >> "$rc"
  echo "Appended HF_ZEV_HOME to $rc"
else
  echo "HF_ZEV_HOME already present in $rc — leaving it; update manually if the path changed."
fi
export HF_ZEV_HOME="$codex_dir"

echo "Installed Codex prompt -> $dst"
echo "Set HF_ZEV_HOME -> $codex_dir  (restart shells / 'source $rc' to pick it up)"
echo "Invoke it in Codex with:  /hyperframes_zev_v2"
if [[ -z "${HF_WORKBENCH:-}" ]]; then
  echo
  echo "Reminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  echo "  export HF_WORKBENCH=/path/to/hyperframes_test   # add to your shell rc"
fi
