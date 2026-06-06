#!/usr/bin/env pwsh
# Installs the canonical Claude Code skill and legacy /hyperframes_zev_v2 alias.
# Re-run any time to update; pass -Force to overwrite without prompting.
[CmdletBinding()]
param(
  [switch]$Force,
  [string]$ClaudeHome
)
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent $PSScriptRoot
$installer = Join-Path $PSScriptRoot 'install.ps1'
& $installer -Target claude -Force:$Force -SourcePath $repo -ClaudeHome $ClaudeHome
