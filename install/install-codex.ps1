#!/usr/bin/env pwsh
# Installs the canonical Codex skill and legacy /hyperframes_zev_v2 prompt shim.
# Re-run any time to update; pass -Force to overwrite without prompting.
[CmdletBinding()]
param(
  [switch]$Force,
  [string]$CodexHome
)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$installer = Join-Path $PSScriptRoot 'install.ps1'
& $installer -Target codex -Force:$Force -SourcePath $repo -CodexHome $CodexHome
