# hyperframes_zev

> Script-first, black-screen-proof HyperFrames video pipeline — works from **Claude Code** and **Codex**.

Produces a finished narrated + captioned MP4 in a local [HyperFrames](https://www.npmjs.com/package/hyperframes) Video Workbench.  
It always drafts a script and waits for your approval **before** any TTS or render — a 30-second review up front beats re-rendering minutes of wrong content.

Then it synthesizes end-to-end: Chinese DashScope voiceover → character-weighted captions → GSAP one-root-timeline animation → mandatory not-black frame check → final MP4.

---

## Why it exists

The HyperFrames runtime (v0.6.x) renders a **fully black video** for two easy-to-hit composition mistakes — and `lint` / `validate` / `inspect` all *pass* on the black output.

This project encodes both fixes as hard rules, adds a `check.mjs` structural guard, copy-paste timing via `assemble.mjs`, and four ready-made palettes so every video doesn't look identical.

See [`references/runtime-rules.md`](claude-code/hyperframes_zev_v2/references/runtime-rules.md) for the full analysis.

---

## The two black-screen Non-Negotiables

| # | Rule | Why |
|---|------|-----|
| 1 | **Never set `display:none` on `.clip`** | The runtime only toggles `style.visibility`; `display:none` removes elements from layout forever → black |
| 2 | **One root `gsap.timeline`, absolute times, keyed to the root `data-composition-id`** | The runtime seeks exactly one (longest) timeline to global time — per-scene timelines never play |

A clean `lint`/`validate`/`inspect` is necessary but **not sufficient** — always eyeball a real rendered frame.

---

## Repo layout

```
claude-code/hyperframes_zev_v2/   Drop-in Claude Code skill  (SKILL.md + references/ + scripts/)
codex/                            Codex edition  (prompts/ slash command + identical references/ + scripts/)
install/                          One-shot installers for both agents
```

`claude-code/` and `codex/` each carry a **complete, self-contained** copy of `references/` and `scripts/` — the two copies are kept byte-identical.

---

## Install

### Claude Code

```powershell
# Windows
./install/install-claude.ps1
```
```bash
# macOS / Linux
bash ./install/install-claude.sh
```

Copies `claude-code/hyperframes_zev_v2/` into `~/.claude/skills/`. Then invoke in Claude Code:

```
/hyperframes_zev_v2
```

### Codex

```powershell
./install/install-codex.ps1
```
```bash
bash ./install/install-codex.sh
```

Copies `codex/prompts/hyperframes_zev_v2.md` into `~/.codex/prompts/` and sets **`HF_ZEV_HOME`** to this repo's `codex/` folder (so the prompt can find its bundled `references/` and `scripts/`). Then in Codex:

```
/hyperframes_zev_v2
```

---

## Environment variables

| Variable | Required | Default / note |
|----------|----------|----------------|
| `HF_WORKBENCH` | **yes** | Path to your HyperFrames Workbench repo (`workspace/`, `server/`, `web/`, `test_videos/`, `.env`). Author's default: `D:\AllPythonProjects\hyperframes_test_260529`. Other users: `setx HF_WORKBENCH <your path>` |
| `DASHSCOPE_API_KEY` | yes (narrated video) | DashScope key for `qwen3-tts-flash`. Put it in the **workbench repo's** `.env` — the scripts find it automatically |
| `HF_ZEV_HOME` | Codex only | Points to this repo's `codex/` folder so the prompt can reach `references/` and `scripts/`. Set automatically by `install-codex` |

HyperFrames CLI pinned to **`hyperframes@0.6.56`**. The four `.mjs` helpers need Node.js + `ffmpeg`/`ffprobe` on `PATH`. Python not required.

---

## Pipeline overview

| Phase | What happens |
|-------|-------------|
| **1 — Intake** | Detect vague/directed/fully-specified request; confirm orientation, length, voice |
| **2 — Script** | Draft narration + visual plan + palette; write `workspace/<slug>/script.md`; **wait for approval** |
| **3 — Synthesize** | Preflight → scaffold → TTS → captions (`captions.mjs`) → timing tables (`assemble.mjs`) → author `index.html` → structural check (`check.mjs`) → draft render + frame check → final render |

---

## Included scripts

| Script | What it does |
|--------|-------------|
| `tts.mjs` | DashScope sync TTS → `assets/narration.wav` |
| `captions.mjs` | Character-weight timing → `assets/captions.json` |
| `assemble.mjs` | Prints paste-ready scene attrs + `var S/SDUR/TOTAL/CAPS` from `captions.json` |
| `check.mjs` | Structural black-screen guard — asserts the two Non-Negotiables + timing consistency |

---

## License

MIT — see [LICENSE](LICENSE).
