---
name: hyperframes-zev
description: Use when producing, debugging, validating, or rendering HyperFrames videos inside the local Video Workbench repo, especially narrated Chinese DashScope TTS videos, synced captions, vertical or horizontal MP4 delivery to a confirmed output path, or black, blank, silent, desynced, or missing-scene HyperFrames renders.
---

# HyperFrames Zev

Use this as the workbench-specific layer on top of the stock `hyperframes`, `hyperframes-cli`, and `hyperframes-media` skills. It captures local runtime rules, DashScope TTS behavior, deterministic caption timing, and the known-good composition template.

## Operating Contract

- Resolve the workbench from `HF_WORKBENCH`; if it is unset, use `D:\AllPythonProjects\hyperframes_test_260529`.
- If the user does not explicitly provide a final MP4 output path, ask where to save it before scaffolding or rendering. Do not assume `test_videos/`.
- If the user does not specify orientation, aspect ratio, or dimensions, default to vertical `1080x1920`.
- Before drafting informational video copy, proactively verify factual claims with current sources/search. This is mandatory for news, companies, products, laws, medicine, finance, statistics, and other time-sensitive claims.
- For any new video, draft the script first and wait for explicit approval before scaffolding, TTS, captions, or rendering.
- When the script contains factual claims, include a brief source note or source list with the draft.
- Treat one narration line as one scene. For Chinese `qwen3-tts-flash`, budget about `target_seconds * 4.5` CJK characters.
- For fully supplied narration, preserve wording unless the user explicitly approves edits.
- Use `references/reference-composition.html` as the starting point. Do not copy workbench-generated `ai-agent*` projects.

## Required References

- Read `references/runtime-rules.md` before authoring or repairing `index.html`.
- Read `references/env-gotchas.md` before TTS, CLI lookup, transcription, or path work.
- Read `references/authoring.md` when choosing timing tables, orientation, palette, or visual blocks.

## Non-Negotiables

- Never set `display:none` on `.clip`; this runtime toggles only `style.visibility`.
- Use exactly one root `data-composition-id` and one root `gsap.timeline({ paused: true })`.
- Put every tween on the root timeline at absolute global time, usually `S[i] + localOffset`.
- Do not put `data-composition-id` on scenes, captions, progress, or audio.
- Never trust `lint`, `validate`, or `inspect` alone; black renders can pass all three.

## Synthesis Workflow

1. Lock requirements before scaffolding: confirm final output path, aspect ratio/dimensions, duration, narration mode, and whether the script is user-supplied or agent-authored. Ask for the output path if absent; use vertical `1080x1920` if ratio is absent.
2. If authoring factual or informational script copy, search current sources first, then draft the script with brief source notes and wait for explicit approval before scaffolding, TTS, captions, or rendering.
3. Run `node <this-skill>/scripts/preflight.mjs`. Fix hard failures before continuing. Use the printed `hyperframesCommand`, `skeletonPath`, and `bootstrap` values for later steps.
4. Create `workspace/<slug>/` with `assets/`, `scripts/`, and `renders/`.
5. If preflight reports a skeleton, copy its `hyperframes.json` and `package.json`; if `bootstrap` is true, run `<hyperframesCommand> init <slug>` from the workbench `workspace/` directory. Do not hand-author those config files.
6. Write `meta.json` as `{"id":"<slug>","name":"<slug>"}` and copy this skill's scripts into the project `scripts/` directory.
7. Write approved narration to `assets/narration.txt`, one sentence per line. For silent videos, skip TTS/captions and choose scene durations directly.
8. For narrated videos, run `node scripts/tts.mjs assets/narration.txt assets/narration.wav`, measure with `ffprobe`, and regenerate narration if duration misses target by more than 15 percent. Do not time-stretch speech.
9. Run `node scripts/captions.mjs <audioDurationSeconds>` and then `node scripts/assemble.mjs`. Paste the generated timing attributes, `TOTAL`, `S`, `SDUR`, and `CAPS` into `index.html`.
10. Build `index.html` from `references/reference-composition.html`, apply the approved palette/orientation/blocks from `references/authoring.md`, and keep all tweens relative to `S[]`.
11. Run `node scripts/check.mjs index.html`, then `<hyperframesCommand> lint`, `<hyperframesCommand> validate`, and `<hyperframesCommand> inspect`. Fix all `check.mjs` failures and all stock audit errors before rendering.
12. Draft render, extract a mid-scene frame, and inspect it visually. The frame must show real foreground content, not a blank/dark background.
13. For narrated videos, verify audible speech with `ffmpeg ... -af volumedetect`; a present audio stream is not enough.
14. Render high quality, copy the MP4 to the confirmed final output path, and remove `.diag/`. Use `test_videos/` only if the user explicitly chose it.

## Delivery Checklist

- Script and look were approved before synthesis.
- MP4 exists at the confirmed final output path.
- Aspect ratio and duration match the request, unless the user accepted a deviation.
- If the user did not specify a ratio, the video is vertical `1080x1920`.
- Factual scripts include current-source verification notes.
- Draft frame check shows foreground scene content.
- Narrated videos have audible voice and readable captions.
- Silent videos have no unintended audio stream.
- `check.mjs`, `lint`, `validate`, and `inspect` are clean after the final edit.
