# Environment gotchas — HyperFrames Video Workbench

Each of these cost a failed run to discover on the author's machine (Windows + PowerShell). Apply them
up front; paths marked below are machine-specific — replace them with your own.

## 1. DashScope TTS must be called SYNCHRONOUSLY
The repo's `.env` has a working `DASHSCOPE_API_KEY` and correct TTS config
(`DASHSCOPE_TTS_MODEL=qwen3-tts-flash`, `DASHSCOPE_TTS_VOICE=Cherry`, `wav`). But this key returns

```
AccessDenied: current user api does not support asynchronous calls
```

if you send the `X-DashScope-Async: enable` header (which the server-side `aliyun.ts` uses). For
standalone/CLI generation, call `…/api/v1/services/aigc/multimodal-generation/generation`
**synchronously** — the response carries `output.audio.url` directly; download it.

`scripts/tts.mjs` already does this correctly. Usage:
```
node scripts/tts.mjs assets/narration.txt assets/narration.wav
```
It reads the repo-root `.env`, posts the text, and streams the resulting wav to the output path. If
the download ends with `terminated` (occasional OSS hiccup), just re-run once.

Only the `qwen-tts` family works on that endpoint — `cosyvoice-*` models (and CosyVoice voices like
`longanyang`) return `url error`. Stick with `qwen3-tts-flash` + `Cherry`/`Ethan`/`Serena`/`Chelsie`.

## 2. No whisper-cpp, no espeak-ng → no word-level captions
- `npx hyperframes transcribe …` fails (whisper-cpp not installed) — no word-level ASR.
- Kokoro Mandarin TTS (`npx hyperframes tts` with `z*` voices) can't phonemize (espeak-ng missing).

So you cannot get real per-word timestamps. Instead derive timing deterministically with
`scripts/captions.mjs`:
```
node scripts/captions.mjs <audioDurationSeconds>   # default 60.32
```
It reads `assets/narration.txt` (one sentence per line = one scene), distributes scenes across the
measured audio duration by character weight (CJK=1, latin≈0.5, punctuation adds a pause), splits each
sentence into short caption groups on Chinese punctuation, and writes `assets/captions.json`
(`{ totalDuration, scenes:[{index,start,duration}], captions:[{text,start,end,scene}] }`). Feed those
numbers into the composition's scene `data-start/-duration` and the caption `CAPS` array.

Timing is approximate (proportional, not acoustically aligned), so a caption may lead/lag the
voiceover by ~0.2–0.5s. Good enough for most explainer videos. If true word-sync is required, the user
must install whisper-cpp first (`npx hyperframes transcribe narration.wav --model small --language zh`).

## 3. npm registry is flaky → use the cached CLI
`npx --yes hyperframes@x.y.z …` frequently fails with `ECONNRESET` / `EIDLETIMEOUT`. A working copy is
cached. Resolve it once and reuse (PowerShell):
```powershell
$HF = Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_npx" -Recurse -Filter cli.js |
  Where-Object { $_.FullName -like "*node_modules\hyperframes\dist\cli.js" } |
  Select-Object -First 1 -ExpandProperty FullName
node $HF lint
node $HF validate
node $HF inspect
node $HF render --quality high --output renders/out.mp4
```
Fall back to `npx --yes hyperframes@0.6.56 <cmd>` only if the cache is empty. (The `$env:LOCALAPPDATA`
path is the Windows npx cache; on macOS/Linux the cache is `~/.npm/_npx`, but the simplest portable route
there is to just use the `npx --yes hyperframes@0.6.56 <cmd>` fallback directly.)

## 4. Where things live
- Repo root holds `workspace/` (per-video projects), `server/`, `web/`, `test_videos/` (a common
  local delivery folder), and `.env`.
- Each video project is `workspace/<slug>/` with `index.html`, `assets/`, `scripts/`, `renders/`,
  `hyperframes.json`, `package.json`, `meta.json`.
- Final MP4s must be copied to the user-confirmed output path. Ask for that path if the request does
  not already specify one; use `test_videos/` only when the user explicitly chooses it.
- Python (for any helper tooling) — author's path is `D:\PythonVenv\Scripts\python.exe`; set this to
  your own Python if you need it (none of the four `.mjs` scripts require Python).

## 5. The workbench's generated templates are broken
Every composition produced by the workbench's two-stage LLM pipeline (and the existing
`workspace/ai-agent*` projects) renders BLACK because of the two runtime-rules bugs. Do not copy their
structure. Use `references/reference-composition.html` as the known-good template instead.
