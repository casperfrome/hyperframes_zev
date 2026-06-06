#!/usr/bin/env pwsh
# Installs the Claude Code skill: copies claude-code/hyperframes_zev_v2 -> ~/.claude/skills/
# Re-run any time to update; pass -Force to overwrite without prompting.
[CmdletBinding()]
param([switch]$Force)
$ErrorActionPreference = 'Stop'

$repo   = Split-Path -Parent $PSScriptRoot
$src    = Join-Path $repo 'claude-code\hyperframes_zev_v2'
$dstDir = Join-Path $HOME '.claude\skills'
$dst    = Join-Path $dstDir 'hyperframes_zev_v2'

if (-not (Test-Path $src)) { throw "source skill not found: $src" }
New-Item -ItemType Directory -Force $dstDir | Out-Null

if ((Test-Path $dst) -and -not $Force) {
  $ans = Read-Host "Skill already exists at $dst — overwrite? [y/N]"
  if ($ans -notmatch '^(y|Y)') { Write-Host 'Aborted.'; exit 1 }
}
if (Test-Path $dst) { Remove-Item -Recurse -Force $dst }
Copy-Item $src $dst -Recurse -Force

Write-Host "Installed Claude Code skill -> $dst"
Write-Host "Invoke it in Claude Code with:  /hyperframes_zev_v2"
if (-not $env:HF_WORKBENCH) {
  Write-Host "`nReminder: set HF_WORKBENCH to your workbench repo, e.g.:"
  Write-Host '  setx HF_WORKBENCH "D:\path\to\hyperframes_test"'
}
