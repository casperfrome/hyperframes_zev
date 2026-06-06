---
description: Script-first pipeline for a narrated + captioned HyperFrames video in the local Video Workbench. Drafts a script and gets approval BEFORE any TTS or render.
---

# HyperFrames Workbench Video Pipeline — v2 (script-first)  ·  Codex edition

> **Bundled files location.** Your reference docs and helper scripts ship with this prompt but live in
> the cloned repo, NOT in `~/.codex/prompts/`. They are under the directory in the **`HF_ZEV_HOME`**
> environment variable — it points at the repo's `codex/` folder, so:
> - reference docs → `$HF_ZEV_HOME/references/` (`authoring.md`, `env-gotchas.md`, `runtime-rules.md`, `reference-composition.html`)
> - helper scripts → `$HF_ZEV_HOME/scripts/` (`tts.mjs`, `captions.mjs`, `assemble.mjs`, `check.mjs`)
>
> If `HF_ZEV_HOME` is unset, run `install/install-codex` once (it sets it), or `setx HF_ZEV_HOME <repo>\codex`.
> Read paths below as relative to `$HF_ZEV_HOME` whenever they start with `references/` or `scripts/`.

This produces a finished narrated + captioned video in the local HyperFrames Video Workbench. The
workbench root is read from `HF_WORKBENCH` (the author's default is `D:\AllPythonProjects\hyperframes_test_260529`
— **set `HF_WORKBENCH` to your own workbench repo** so the paths below resolve to your machine). Phase 3
preflight resolves and verifies it, and self-heals a missing `workspace/` or skeleton. The one thing this
pipeline insists on: **it writes a script and waits for approval before any TTS or render** — a 30s review
up front beats redoing minutes of render and a paid TTS call on the wrong framing.

Three aids keep the proven core but remove its sharp edges: `scripts/assemble.mjs` makes Phase 3 timing
copy-paste from `captions.json` (no hand-placed times); `scripts/check.mjs` also verifies the markup's
timing matches `captions.json`/the audio and warns when a video still wears the reference's default look;
and `references/authoring.md` supplies theme palettes, landscape deltas, and topic-fit blocks so videos
stop looking identical.

> Commands below are PowerShell (the author's shell); on macOS/Linux the same `node`/`ffmpeg`/`ffprobe`
> invocations work — translate the PowerShell-only preflight/glob lines to your shell.

## Operating contract — read before doing anything

1. **The first-half deliverable is a *script*, not a video.** Codex has no plan-mode tool — that's fine.
   What matters is the gate in point 2, enforced regardless of tooling.
2. **The script is the plan — no synthesis before explicit approval.** Draft the script in Phase 1–2 and
   **present it in chat, then stop and wait.** Do **not** scaffold, generate audio, or render anything
   until the user explicitly approves ("可以"/"继续"/"approved"). (Claude Code has `EnterPlanMode`/`ExitPlanMode`
   for this; in Codex you simply show the script and pause for a reply.)
3. **Two Non-Negotiables prevent a black render** (full right/wrong code in
   `references/runtime-rules.md`): the composition must (a) never set `display:none` on `.clip`, and
   (b) use ONE root `gsap.timeline` with every tween at its absolute time under the root
   `data-composition-id`. `lint`/`validate`/`inspect` all PASS on a black render — a clean audit is never
   proof of visible content; you must eyeball a real frame.

---

## Phase 1 — Understand the request (flexible intake)

The user may frame the video in very different ways. Detect which and adapt — do not force a fixed
interview. The goal is to reach a shared understanding of *what the video says and shows* with the
fewest questions.

- **Vague topic** — e.g. "做个讲 X 的视频", "介绍一下向量数据库". Propose a concrete angle, a scene
  outline, a default length and orientation, and let the user react. Lead with a proposal, not a
  questionnaire.
- **Clear direction** — topic plus tone / audience / key points / length. Draft straight to a script;
  only confirm the few things genuinely missing.
- **Fully-specified content** — the user hands you the actual narration or scene text. Use it as-is;
  your job is to normalize it into scene form (one sentence per line = one scene) and design the
  visuals, not to rewrite their words. Confirm before changing any wording.

Resolve only the parameters that materially change the output, and only if the user hasn't already
implied them:

- **Orientation:** vertical `1080×1920` (default) or landscape `1920×1080`.
- **Target length:** seconds. Drives the script's character budget (below).
- **Audio:** narrated (default) or silent. If silent, skip TTS/captions in Phase 3 and pick scene
  durations directly; ensure the final MP4 has no audio stream.
- **Language / voice:** default Chinese with `qwen3-tts-flash` + `Cherry` (other valid voices: `Ethan`,
  `Serena`, `Chelsie`). Avoid `cosyvoice-*` on this endpoint — it errors here.

Ask these as a short, fast question batch so the user can answer quickly, but skip any the user already specified.

---

## Phase 2 — Write the script, then get approval (the gate)

Produce a concrete, reviewable script. Length budget for narrated video: Chinese qwen-tts speaks
~4.5 CJK chars/sec, so aim for `target_seconds × 4.5` characters total (~110 for 25s, ~135 for 30s,
~270 for 60s), and keep **one sentence per scene** so each scene is scene-sized. The final video length
locks to the *measured* audio duration in Phase 3, so getting the script length right here is how you
hit a target.

### Script format

Save the script to `workspace/<slug>/script.md` in the workbench repo (create the folder if needed —
this is the one file you may write before approval; it is content, not a render), and present the same
content in chat. Use this structure:

```
# <视频标题>   (slug: <kebab-or-pinyin-slug>)
方向: <vertical 1080×1920 | landscape 1920×1080> · 目标时长: <N>s · 配音: <Cherry | 无> · 场景数: <K>
风格: <palette A–D from authoring.md §2> · <2–3 visual motifs that fit THIS topic>

## 场景 1
旁白: <one sentence — becomes one line of narration.txt>
画面: <block> — <what's on screen>   (name the block: big-node / compare / flow / grid / cycle / sum-list / stat-callout / quote-card / photo-frame / a new one)

## 场景 2
旁白: ...
画面: ...
...
```

- The **旁白 (narration)** lines, concatenated one-per-line, become `assets/narration.txt` verbatim in
  Phase 3 — so write them as final spoken text.
- The **风格 (look)** line commits to a palette and a couple of motifs that fit the topic, so the user
  signs off on the *look*, not just the words — and Phase 3 never silently defaults to the dark-tech
  reference. Pick from `references/authoring.md` §2 (A dark-tech, B warm editorial, C clean light,
  D vibrant gradient).
- The **画面 (visual)** lines each name the block primitive they map to so Phase 3 authoring is
  mechanical — the reference's reusable blocks (title/hook, big-node, compare, flow, grid, cycle,
  sum-list) plus the non-AI primitives in `references/authoring.md` §4 (stat-callout, quote-card,
  photo-frame), or a new small block when none fit. Do not assume the AI-agent vocabulary.
- For a **silent** video, replace 旁白 with the intended on-screen text and set scene durations that sum
  to the target length.

### The approval gate

Present the script in chat and **stop**. Iterate on the user's edits — wording, scene count, length,
orientation, **and the 风格/look** — entirely within this phase. **Do not scaffold, run TTS, or render
until the user explicitly approves.**

---

## Phase 3 — Synthesize the video (only after approval)

This is the proven pipeline, now sourced from the approved script. Read `references/env-gotchas.md`
before touching TTS/CLI/paths.

0. **Preflight — fail fast on the unrecoverable, bootstrap the recoverable (run BEFORE scaffolding).**
   Resolves the workbench root (`$env:HF_WORKBENCH` else default) and checks everything up front. It
   **hard-fails** only on what this can't fix — missing workbench repo, missing
   `node`/`ffmpeg`/`ffprobe`, or missing `.env`/`DASHSCOPE_API_KEY`. Recoverable cases (no `workspace/`
   dir, no skeleton project) are **self-healed**: it creates `workspace/` and sets `$bootstrap=$true` so
   step 1 scaffolds via `init`. Fix any hard-fail before continuing.

   ```powershell
   $WB = if ($env:HF_WORKBENCH) { $env:HF_WORKBENCH } else { 'D:\AllPythonProjects\hyperframes_test_260529' }
   $miss = @()
   if (-not (Test-Path $WB))                  { $miss += "workbench repo not found: $WB (clone it or set `$env:HF_WORKBENCH) — this is the runtime app and cannot be fabricated" }
   $envFile = Join-Path $WB '.env'
   if (-not (Test-Path $envFile))              { $miss += ".env missing at $envFile — create it with a line: DASHSCOPE_API_KEY=sk-..." }
   elseif (-not (Select-String -Path $envFile -Pattern '^\s*DASHSCOPE_API_KEY\s*=\s*\S' -Quiet)) {
                                                 $miss += "DASHSCOPE_API_KEY not set in $envFile — add: DASHSCOPE_API_KEY=sk-..." }
   foreach ($exe in 'node','ffmpeg','ffprobe') {
     if (-not (Get-Command $exe -ErrorAction SilentlyContinue)) { $miss += "$exe not on PATH" }
   }
   $HF = Get-ChildItem "$env:LOCALAPPDATA\npm-cache\_npx" -Recurse -Filter cli.js -ErrorAction SilentlyContinue |
     Where-Object { $_.FullName -like "*node_modules\hyperframes\dist\cli.js" } |
     Select-Object -First 1 -ExpandProperty FullName
   if (-not $HF) { Write-Host "note: cached hyperframes cli.js not found — commands fall back to: npx --yes hyperframes@0.6.56 <cmd>" }
   if ($miss) { Write-Host "PREFLIGHT FAILED:`n - $($miss -join "`n - ")"; throw "Resolve the above before synthesizing." }
   # ── recoverable: self-heal workspace/ and the skeleton ──
   if (-not (Test-Path "$WB\workspace")) { New-Item -ItemType Directory -Force "$WB\workspace" | Out-Null; Write-Host "bootstrapped: created $WB\workspace" }
   $skeleton = Get-ChildItem "$WB\workspace" -Directory -ErrorAction SilentlyContinue |
     Where-Object { Test-Path (Join-Path $_.FullName 'hyperframes.json') } | Select-Object -First 1
   $bootstrap = (-not $skeleton)
   Write-Host "Preflight OK. WB=$WB  HF=$(if($HF){$HF}else{'npx-fallback'})  skeleton=$(if($skeleton){$skeleton.Name}else{'none → will init'})"
   ```

   (`$HF` is the cached CLI — npm registry can be flaky with `ECONNRESET`/`EIDLETIMEOUT`. When the
   cache is empty, run every `node $HF <cmd>` as `npx --yes hyperframes@0.6.56 <cmd>` instead.)

1. **Scaffold** `workspace/<slug>/` with `assets/`, `scripts/`, `renders/`.
   - If preflight found a `$skeleton` (`$bootstrap` is `$false`): copy its `hyperframes.json` and
     `package.json` (scripts pin `hyperframes@0.6.56`).
   - If `$bootstrap` is `$true` (no skeleton existed): create the project config with the CLI instead —
     `node $HF init <slug>` from `$WB\workspace` (fall back to `npx --yes hyperframes@0.6.56 init <slug>`),
     which writes a valid `hyperframes.json`/`package.json`. Don't hand-author those files.
   - Either way: write `meta.json` as `{"id":"<slug>","name":"<slug>"}`, and copy the four helper scripts
     from **`$HF_ZEV_HOME/scripts/`** — `tts.mjs`, `captions.mjs`, `assemble.mjs`, `check.mjs` — into the
     project's `scripts/`.

2. **Narration.** Write the approved 旁白 lines to `assets/narration.txt`, **one sentence per line**
   (each line = one scene). (Silent video: skip steps 2–4; pick scene durations to sum to the target
   and ensure no audio stream in the final MP4.)

3. **Voiceover.** `node scripts/tts.mjs assets/narration.txt assets/narration.wav`, then measure the
   real duration — the composition's total `data-duration` must equal this:
   ```powershell
   ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 assets/narration.wav
   ```
   If the download errors with `terminated`, re-run once. If measured duration is off by >15% from the
   target, edit `narration.txt` and regenerate — do not time-stretch the audio. DashScope here is
   **sync-only**; `tts.mjs` already calls the sync endpoint correctly (never send `X-DashScope-Async`).

4. **Caption + scene timing (no whisper).** `node scripts/captions.mjs <audioDurationSeconds>` writes
   `assets/captions.json` with `scenes` (start/duration per line) and `captions` (short groups split on
   Chinese punctuation, char-weight timed). The duration arg is **required for correctness** but optional
   to type: if you omit it, `captions.mjs` auto-measures `assets/narration.wav` via `ffprobe`; it
   **errors out** (no silent default) if it can neither parse the arg nor measure the wav. Pass the arg
   explicitly when you want timing locked to a specific number. Whisper/espeak may be unavailable, so
   timing is proportional (±0.2–0.5s) — fine for explainer captions.

   Then turn those numbers into paste-ready blocks instead of transcribing them by hand:
   ```powershell
   node scripts/assemble.mjs    # prints scene timing attrs + var S/SDUR/TOTAL + var CAPS, all from captions.json
   ```
   Paste its output into the markup and `<script>` in step 5. This is the single source of timing —
   never hand-copy individual times (that drift is the #1 cause of caption desync). See
   `references/authoring.md` §1.

5. **Author `index.html`** from `references/reference-composition.html`
   (known-good structure/CSS: vertical 1080×1920, Chinese `@font-face local()` stack, one root timeline,
   synced captions, progress bar, separate `<audio>`) — and apply the craft layer in
   `references/authoring.md`:
   - **Timing (§1):** paste the `assemble.mjs` output, and write every tween at `S[i] + offset` (relative
     to the scene table), never a literal absolute time. Captions/progress stay driven by `CAPS`/`TOTAL`.
   - **Theme (§2) — required:** swap the `#composition-root` variables to the approved 风格 palette; do NOT
     ship the reference default accents (`#2ec4e6`/`#ffac3e`). Replace ALL placeholder "AI Agent" copy with
     the topic's text and neutral eyebrows/headings. Keep `body`'s base color in sync; re-lint contrast.
   - **Orientation (§3):** landscape → apply the `1920×1080` deltas (caption layer to bottom 80–120px,
     wider safe-x, prefer side-by-side rows).
   - **Blocks (§4) — required:** build each scene from the primitive named in the script, and include ≥1
     block that isn't a verbatim reference block (use the stat-callout/quote-card/photo-frame primitives,
     or a new small block reusing the theme variables). Don't refill the AI-agent blocks.

   Honor both Non-Negotiables and the HyperFrames house style: entrance animation per element,
   transitions between scenes, no exit tweens except the last scene, deterministic only (no `repeat:-1`),
   synchronous timeline. Set root `data-duration` to the measured audio duration; keep `<audio>` a
   separate timed media element (it does not need `class="clip"`).

6. **Validate** (from the project dir). The structural guard asserts the two Non-Negotiables and — when
   `assets/captions.json` is present — that the markup's timing matches it and the measured `narration.wav`
   (scenes contiguous, captions fit; SKIPs timing for silent videos). It also prints advisory **WARN**s if
   the theme is still the reference default or "AI Agent" copy remains — address those for variety. Then
   the stock audits:
   ```powershell
   node scripts/check.mjs index.html   # all PASS/SKIP (no FAIL) before continuing; WARN is advisory
   node $HF lint; node $HF validate; node $HF inspect
   ```
   Fix all `check.mjs` FAILs first (they predict a black render or desynced captions), then lint/contrast
   (<4.5:1)/overflow/missing-asset/timing errors. Passing is necessary but NOT sufficient — step 7's
   visual frame check is still mandatory.

7. **Verify NOT black, then render — mandatory** (audits pass on black output):
   ```powershell
   node $HF render --quality draft --output .diag/draft.mp4
   ffmpeg -y -v error -ss <midTime> -i .diag/draft.mp4 -frames:v 1 .diag/check.png
   ```
   Open `.diag/check.png` — it must show real scene content (heading, cards, diagram, captions), not a
   dark background or glow alone. A dark frame means you violated a Non-Negotiable; fix per
   `references/runtime-rules.md`. Don't judge by downscaled brightness — a dark theme averages near 0
   even when full of content.

   For narrated video, also confirm audio is actually AUDIBLE (a present stream is not proof of sound):
   ```powershell
   ffmpeg -hide_banner -i renders/<file>.mp4 -af volumedetect -f null - 2>&1 | Select-String "mean_volume|max_volume"
   ```
   Real speech lands ≈ −25 to −30 dB `mean_volume`. Near −90 dB means silent (wrong `src`,
   `data-volume="0"`, or failed download) — fix and re-render.

8. **Final render + deliver:**
   ```powershell
   node $HF render --quality high --output renders/<slug>-<duration>s.mp4
   ```
   Copy the MP4 into the repo-root `test_videos/` folder, then remove `.diag/`.

## Delivery checklist

- [ ] Script (incl. 风格/look) was approved by the user before any synthesis ran.
- [ ] Look fits the topic: palette swapped from the reference default, all placeholder "AI Agent" copy
      replaced, ≥1 non-reference block — `check.mjs` shows no WARN.
- [ ] MP4 in `test_videos/`, aspect ratio matches the request, duration within ±15% of target.
- [ ] A mid-scene frame shows real content — not black.
- [ ] Narrated: `volumedetect mean_volume` ≈ −25 to −30 dB; captions synced and readable.
- [ ] Silent: no audio stream present.
- [ ] `check.mjs` all PASS/SKIP (structural + timing-vs-`captions.json`) after the final edit.
- [ ] Timing pasted from `assemble.mjs`; tweens written relative to `S[]` (no hand-placed literals).
- [ ] `lint` 0 errors; `validate`/`inspect` clean after the final edit.
