# hyperframes-zev

HyperFrames Zev is a manual-install skill for producing, debugging, validating, and rendering HyperFrames videos in the local Video Workbench.

## Download The Right Folder

Codex users:

1. Download `codex_skill/hyperframes-zev/`.
2. Copy the whole folder to `~/.codex/skills/hyperframes-zev/`.
3. Use it in Codex with:

```text
$hyperframes-zev
```

Claude Code users:

1. Download `cc_skill/hyperframes-zev/`.
2. Copy the whole folder to `~/.claude/skills/hyperframes-zev/`.
3. Use it in Claude Code with:

```text
/hyperframes-zev
```

## What Is Included

Each skill folder contains the files needed to run the skill:

- `SKILL.md`
- `scripts/*.mjs`
- `references/*.md`
- `references/reference-composition.html`

The Codex package also includes `agents/openai.yaml` for Codex UI metadata. The Claude Code package does not need that file.

## Environment

Set `HF_WORKBENCH` to your HyperFrames Video Workbench repo. If it is not set, the skill defaults to:

```text
D:\AllPythonProjects\hyperframes_test_260529
```

The workbench should contain:

```text
workspace/
server/
web/
.env
test_videos/
```

For narrated videos, put `DASHSCOPE_API_KEY` in the workbench `.env`.

The helper scripts require Node.js, `ffmpeg`, and `ffprobe` on `PATH`.

## Development Validation

When editing this repository, validate both packages:

```powershell
$env:PYTHONUTF8='1'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'codex_skill\hyperframes-zev'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'cc_skill\hyperframes-zev'

node --check codex_skill\hyperframes-zev\scripts\tts.mjs
node --check codex_skill\hyperframes-zev\scripts\captions.mjs
node --check codex_skill\hyperframes-zev\scripts\assemble.mjs
node --check codex_skill\hyperframes-zev\scripts\check.mjs
node --check codex_skill\hyperframes-zev\scripts\preflight.mjs
node --check cc_skill\hyperframes-zev\scripts\tts.mjs
node --check cc_skill\hyperframes-zev\scripts\captions.mjs
node --check cc_skill\hyperframes-zev\scripts\assemble.mjs
node --check cc_skill\hyperframes-zev\scripts\check.mjs
node --check cc_skill\hyperframes-zev\scripts\preflight.mjs
```

## License

MIT. See [LICENSE](LICENSE).
