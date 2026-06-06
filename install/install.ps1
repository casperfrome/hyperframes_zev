#!/usr/bin/env pwsh
# Universal Windows installer for the HyperFrames Zev skill.
# By default this downloads the GitHub archive, so users do not need Git.
[CmdletBinding()]
param(
  [ValidateSet('codex', 'claude', 'all')]
  [string]$Target = 'all',

  [switch]$Force,

  [string]$Repo = 'casperfrome/hyperframes_zev',

  [string]$Ref = 'master',

  [string]$SourcePath,

  [string]$CodexHome,

  [string]$ClaudeHome
)
$ErrorActionPreference = 'Stop'

function Resolve-SourceRoot {
  param(
    [string]$SourcePath,
    [string]$Repo,
    [string]$Ref
  )

  if ($SourcePath) {
    $resolved = Resolve-Path -LiteralPath $SourcePath
    return $resolved.Path
  }

  $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("hyperframes-zev-install-" + [System.Guid]::NewGuid().ToString('N'))
  $archivePath = Join-Path $tempRoot 'source.zip'
  $extractPath = Join-Path $tempRoot 'source'
  New-Item -ItemType Directory -Force $tempRoot, $extractPath | Out-Null
  $script:InstallTempRoot = $tempRoot

  $archiveUrl = "https://github.com/$Repo/archive/$Ref.zip"
  Write-Host "Downloading $archiveUrl"
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
  }
  catch {
    Write-Verbose 'Could not adjust TLS protocol settings; continuing with current defaults.'
  }
  Invoke-WebRequest -Uri $archiveUrl -OutFile $archivePath -UseBasicParsing
  Expand-Archive -LiteralPath $archivePath -DestinationPath $extractPath -Force

  $candidates = Get-ChildItem -LiteralPath $extractPath -Directory -Recurse |
    Where-Object { Test-Path (Join-Path $_.FullName 'skills\hyperframes-zev\SKILL.md') }

  if (-not $candidates) {
    throw "downloaded archive does not contain skills\hyperframes-zev\SKILL.md"
  }

  return $candidates[0].FullName
}

function Confirm-Overwrite {
  param(
    [string]$Name,
    [string[]]$Paths,
    [switch]$Force
  )

  if ($Force) { return }

  $existing = $Paths | Where-Object { Test-Path -LiteralPath $_ }
  if (-not $existing) { return }

  Write-Host "$Name files already exist:"
  foreach ($path in $existing) {
    Write-Host "  $path"
  }

  $answer = Read-Host 'Overwrite? [y/N]'
  if ($answer -notmatch '^(y|Y)$') {
    throw 'Aborted.'
  }
}

function Copy-DirectoryFresh {
  param(
    [string]$Source,
    [string]$Destination
  )

  if (Test-Path -LiteralPath $Destination) {
    Remove-Item -LiteralPath $Destination -Recurse -Force
  }

  $parent = Split-Path -Parent $Destination
  New-Item -ItemType Directory -Force $parent | Out-Null
  Copy-Item -LiteralPath $Source -Destination $Destination -Recurse -Force
}

function Install-CodexSkill {
  param(
    [string]$SourceRoot,
    [string]$CodexHome,
    [switch]$Force
  )

  $srcSkill = Join-Path $SourceRoot 'skills\hyperframes-zev'
  $srcPrompt = Join-Path $SourceRoot 'codex\prompts\hyperframes_zev_v2.md'
  if (-not (Test-Path -LiteralPath $srcSkill)) { throw "source skill not found: $srcSkill" }
  if (-not (Test-Path -LiteralPath $srcPrompt)) { throw "legacy prompt not found: $srcPrompt" }

  $installHome = if ($CodexHome) { $CodexHome } elseif ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
  $dstSkills = Join-Path $installHome 'skills'
  $dstSkill = Join-Path $dstSkills 'hyperframes-zev'
  $dstPrompts = Join-Path $installHome 'prompts'
  $dstPrompt = Join-Path $dstPrompts 'hyperframes_zev_v2.md'

  Confirm-Overwrite -Name 'HyperFrames Zev Codex' -Paths @($dstSkill, $dstPrompt) -Force:$Force
  Copy-DirectoryFresh -Source $srcSkill -Destination $dstSkill
  New-Item -ItemType Directory -Force $dstPrompts | Out-Null
  Copy-Item -LiteralPath $srcPrompt -Destination $dstPrompt -Force

  Write-Host "Installed Codex skill -> $dstSkill"
  Write-Host "Installed legacy prompt -> $dstPrompt"
  Write-Host 'Use in Codex:  $hyperframes-zev'
  Write-Host 'Legacy Codex command:  /hyperframes_zev_v2'
}

function Install-ClaudeSkill {
  param(
    [string]$SourceRoot,
    [string]$ClaudeHome,
    [switch]$Force
  )

  $srcSkill = Join-Path $SourceRoot 'skills\hyperframes-zev'
  if (-not (Test-Path -LiteralPath $srcSkill)) { throw "source skill not found: $srcSkill" }

  $installHome = if ($ClaudeHome) { $ClaudeHome } else { Join-Path $HOME '.claude' }
  $dstSkills = Join-Path $installHome 'skills'
  $dstSkill = Join-Path $dstSkills 'hyperframes-zev'
  $legacy = Join-Path $dstSkills 'hyperframes_zev_v2'

  Confirm-Overwrite -Name 'HyperFrames Zev Claude Code' -Paths @($dstSkill, $legacy) -Force:$Force
  Copy-DirectoryFresh -Source $srcSkill -Destination $dstSkill
  Copy-DirectoryFresh -Source $srcSkill -Destination $legacy

  Write-Host "Installed Claude Code skill -> $dstSkill"
  Write-Host "Installed legacy alias -> $legacy"
  Write-Host 'Use in Claude Code:  /hyperframes-zev'
  Write-Host 'Legacy Claude Code alias:  /hyperframes_zev_v2'
}

$script:InstallTempRoot = $null
try {
  $sourceRoot = Resolve-SourceRoot -SourcePath $SourcePath -Repo $Repo -Ref $Ref

  if ($Target -in @('codex', 'all')) {
    Install-CodexSkill -SourceRoot $sourceRoot -CodexHome $CodexHome -Force:$Force
  }

  if ($Target -in @('claude', 'all')) {
    Install-ClaudeSkill -SourceRoot $sourceRoot -ClaudeHome $ClaudeHome -Force:$Force
  }

  if ($env:HF_ZEV_HOME) {
    Write-Host 'Note: HF_ZEV_HOME is deprecated for new installs and was left unchanged.'
  }
  if (-not $env:HF_WORKBENCH) {
    Write-Host ''
    Write-Host 'Reminder: set HF_WORKBENCH to your workbench repo, e.g.:'
    Write-Host '  setx HF_WORKBENCH "D:\path\to\hyperframes_test"'
  }
}
finally {
  if ($script:InstallTempRoot -and (Test-Path -LiteralPath $script:InstallTempRoot)) {
    Remove-Item -LiteralPath $script:InstallTempRoot -Recurse -Force
  }
}
