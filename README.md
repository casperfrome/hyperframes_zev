# hyperframes-zev

Script-first, black-screen-proof HyperFrames video workflow for Claude Code and Codex.

The canonical skill lives at `skills/hyperframes-zev/`. Installers copy from that single source so the helper scripts and references cannot drift between agents. The old Codex slash command `/hyperframes_zev_v2` is kept only as a compatibility shim that points to `$hyperframes-zev`.

## What It Does

This skill produces narrated or captioned MP4s in a local HyperFrames Video Workbench. It drafts the script first, waits for approval, then runs the synthesis path:

`DashScope TTS -> deterministic captions -> assemble timing -> one-root GSAP composition -> structural checks -> draft frame check -> final render`

It also guards the two runtime mistakes that can produce fully black renders even when `lint`, `validate`, and `inspect` pass.

## Repo Layout

```text
skills/hyperframes-zev/       Canonical skill, scripts, references, and agent metadata
codex/prompts/                Legacy /hyperframes_zev_v2 shim
install/                      Codex and Claude Code installers
tools/validate.mjs            Repo contract validation
```

The old `claude-code/` and `codex/scripts` / `codex/references` copies are intentionally not maintained.

## Install

### Windows One-Line Install

Codex:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target codex -Force"
```

Claude Code:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target claude -Force"
```

Both Codex and Claude Code:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target all -Force"
```

The remote installer downloads the GitHub archive, so Windows users do not need Git or a local clone. It defaults to `casperfrome/hyperframes_zev` on `master`; installer maintainers can override that with `-Repo owner/name` and `-Ref branch-or-tag`.

### Local Install

#### Codex

```powershell
./install/install-codex.ps1 -Force
```

```bash
bash ./install/install-codex.sh --force
```

Installs:

- `~/.codex/skills/hyperframes-zev`
- `~/.codex/prompts/hyperframes_zev_v2.md` as a legacy shim

Use:

```text
$hyperframes-zev
```

Legacy:

```text
/hyperframes_zev_v2
```

#### Claude Code

```powershell
./install/install-claude.ps1 -Force
```

```bash
bash ./install/install-claude.sh --force
```

Installs `~/.claude/skills/hyperframes-zev` and a legacy alias folder.

## Environment

| Variable | Required | Notes |
| --- | --- | --- |
| `HF_WORKBENCH` | Recommended | Path to the HyperFrames workbench repo containing `workspace/`, `server/`, `web/`, `.env`, and `test_videos/`. Defaults to `D:\AllPythonProjects\hyperframes_test_260529` if unset. |
| `DASHSCOPE_API_KEY` | Required for narrated videos | Put it in the workbench repo `.env`. |
| `HF_ZEV_HOME` | Deprecated | No longer required for new installs. Installers leave an existing value unchanged. |

The bundled scripts require Node.js plus `ffmpeg` and `ffprobe` on `PATH`. Python is only used for skill validation in this repo; use `D:\PythonVenv\Scripts\python.exe`.

## Validate

```powershell
node tools/validate.mjs
$env:PYTHONUTF8='1'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'skills\hyperframes-zev'
node --check skills\hyperframes-zev\scripts\tts.mjs
node --check skills\hyperframes-zev\scripts\captions.mjs
node --check skills\hyperframes-zev\scripts\assemble.mjs
node --check skills\hyperframes-zev\scripts\check.mjs
node --check skills\hyperframes-zev\scripts\preflight.mjs
```

## Included Helpers

| Script | Purpose |
| --- | --- |
| `preflight.mjs` | Checks the workbench, `.env`, `node`, `ffmpeg`, `ffprobe`, cached HyperFrames CLI, and skeleton availability. |
| `tts.mjs` | Calls DashScope sync TTS and writes `assets/narration.wav`. |
| `captions.mjs` | Generates deterministic scene and caption timing from narration text and audio duration. |
| `assemble.mjs` | Prints paste-ready timing attributes and JS timing tables from `captions.json`. |
| `check.mjs` | Verifies structural black-screen guards and timing consistency. |

## License

MIT. See [LICENSE](LICENSE).
