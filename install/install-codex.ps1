#!/usr/bin/env pwsh
# Installs the Codex slash command: copies codex/prompts/hyperframes_zev_v2.md -> ~/.codex/prompts/
# and sets HF_ZEV_HOME (so the prompt can locate its bundled references/ and scripts/).
# Re-run any time to update; pass -Force to overwrite without prompting.
[CmdletBinding()]
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$repo     = Split-Path -Parent $PSScriptRoot
$codexDir = Join-Path $repo 'codex'
$src      = Join-Path $codexDir 'prompts\hyperframes_zev_v2.md'
$dstDir   = if ($env:CODEX_HOME) { Join-Path $env:CODEX_HOME 'prompts' } else { Join-Path $HOME '.codex\prompts' }
$dst      = Join-Path $dstDir 'hyperframes_zev_v2.md'

if (-not (Test-Path $src)) { throw "source prompt not found: $src" }
New-Item -ItemType Directory -Force $dstDir | Out-Null

if ((Test-Path $dst) -and -not $Force) {
  $ans = Read-Host "Prompt already exists at $dst — overwrite? [y/N]"
  if ($ans -notmatch '^(y|Y)') { Write-Host 'Aborted.'; exit 1 }
}
Copy-Item $src $dst -Force

# Persist HF_ZEV_HOME for future sessions, and set it for the current one.
& setx HF_ZEV_HOME "$codexDir" | Out-Null
$env:HF_ZEV_HOME = $codexDir

Write-Host "Installed Codex prompt -> $dst"
Write-Host "Set HF_ZEV_HOME -> $codexDir  (persisted via setx; restart shells to pick it up)"
Write-Host "Invoke it in Codex with:  /hyperframes_zev_v2"
if (-not $env:HF_WORKBENCH) {
  Write-Host "`nReminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  Write-Host '  setx HF_WORKBENCH "D:\path\to\hyperframes_test"'
}
