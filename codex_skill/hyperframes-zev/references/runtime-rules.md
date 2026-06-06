# HyperFrames runtime contract — why renders go black, and how to avoid it

These rules were reverse-engineered from the installed runtime bundle
(`node_modules/hyperframes/dist/hyperframe-runtime.js`, v0.6.57) after the workbench's own
LLM-generated compositions (`workspace/ai-agent`, `ai-agent-2..4`) all rendered to a **fully black
video**. There are two independent bugs; a composition must avoid BOTH.

The frustrating part: `npx hyperframes lint`, `validate`, and `inspect` ALL PASS on the black
version. `inspect` seeks the timeline and measures elements, but when everything is hidden it finds
nothing to flag and reports "0 layout issues" — vacuously. So a clean audit is NOT evidence the video
has visible content. Always extract and eyeball a real frame (SKILL.md step 7).

---

## Bug 1 — `.clip { display:none }` hides everything forever

### What the runtime actually does
For every timed child it computes the active window from `data-start`/`data-duration` and sets:

```js
element.style.visibility = isActive ? "visible" : "hidden";
```

That is the ONLY visibility mechanism. The runtime never sets `style.display`, and it never adds an
`.active` class. (The stock examples and the workbench template assume a `.clip.active{display:flex}`
class toggle that this runtime version does not perform.)

### Why black
An inline `style.visibility="visible"` cannot override a stylesheet rule `.clip{display:none}` —
`display:none` removes the element from layout entirely regardless of `visibility`. So every clip
stays gone. Only the non-clip composition-root background renders → black (with maybe a faint
gradient).

### WRONG
```css
.clip { display: none; }
.clip.active { display: flex; }   /* runtime never adds .active → dead rule */
.scene { /* relies on .clip.active for display */ }
```

### RIGHT
```css
/* Runtime toggles style.visibility only. Never set display:none on .clip. */
.scene {
  position: absolute; inset: 0;     /* scenes stack; runtime hides inactive ones */
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
}
```
Scenes all stack at `inset:0`; the runtime makes exactly the active one `visibility:visible` and the
rest `visibility:hidden`. Higher `data-track-index` sits on top (z-order) for always-on layers like
captions/progress.

---

## Bug 2 — per-scene `data-composition-id` + per-scene timelines never play

### What the runtime actually does
It selects a SINGLE timeline to drive (it picks the longest registered timeline — "composite by root
children") and seeks THAT timeline to the **global composition currentTime** each frame:

```js
capturedTimeline.totalTime(globalTime);   // one timeline, global time
```

It does NOT iterate `window.__timelines` and play each per-clip timeline at a local offset. So if you
register `window.__timelines["s0"]`, `["s1"]`, … one per scene, only ONE of them (whichever is
longest, often the captions/progress 60s timeline) ever advances. Every other scene's tweens stay at
their `fromTo` start state — `opacity:0` — so content is invisible. The tell-tale symptom: a scene is
visible only WHILE its entrance tween happens to be mid-flight under the one captured timeline, then
vanishes once "settled".

### RIGHT — one root timeline, absolute times
- Put exactly ONE `data-composition-id` on the composition root (e.g. `data-composition-id="my-video"`).
- Scenes/captions/progress get only `id` + `class="clip"` + `data-start`/`-duration`/`-track-index`
  (these still drive visibility). **No `data-composition-id` on scenes.**
- Build ONE `gsap.timeline({paused:true})`, add every tween at its ABSOLUTE time
  (`sceneStart + localOffset`), register it under the root id, and `progress(0)` it.

```js
window.__timelines = window.__timelines || {};
var tl = gsap.timeline({ paused: true });

// scene at start=10.51s: place its entrance at 10.51 + offset
tl.fromTo('#s1 .heading', { opacity:0, y:-34 }, { opacity:1, y:0, duration:0.7, ease:'power3.out' }, 10.76);
tl.fromTo('#s1 .big-node', { opacity:0, scale:0.6 }, { opacity:1, scale:1, duration:0.8, ease:'back.out(1.6)' }, 11.11);
// …all scenes, captions, progress bar — every tween at its absolute time…

window.__timelines['my-video'] = tl;   // key MUST equal the root data-composition-id
tl.progress(0);
```

Because the captured timeline IS this one and it's seeked to global time, every tween fires at the
right moment. Inactive scenes are hidden by the runtime (Bug-1 mechanism), so it doesn't matter that
their elements are at `opacity:1` outside their window.

### Audio / captions / progress
- Audio is a separate `<audio>` element with `data-start/-duration/-track-index` and `src` — it does
  NOT need `class="clip"`.
- Captions: build the group DOM in JS, then add their fade-in/out + a hard
  `tl.set(el,{opacity:0,visibility:'hidden'}, group.end)` kill INTO the same root timeline at absolute
  times. One group visible at a time.
- A progress bar is just `tl.fromTo('#progress-bar',{scaleX:0},{scaleX:1,duration:TOTAL,ease:'none'},0)`
  on the same timeline — and it conveniently makes the root timeline the longest, so the runtime
  reliably captures it.

---

## Quick self-check before rendering
The three structural invariants below are asserted automatically by
`node scripts/check.mjs index.html` (run it in Phase 3 step 6 — it exits non-zero on any failure). The
manual PowerShell one-liners are kept here for reference / debugging when the script flags something:

(PowerShell)
- Exactly ONE `data-composition-id` in the file (on the root):
  `(Select-String -Path index.html -Pattern 'data-composition-id').Count` → 1.
- No `display:none` targeting `.clip`:
  `Select-String -Path index.html -Pattern 'display\s*:\s*none'` → no hit on a `.clip` rule.
- One `gsap.timeline(` registered, keyed to the root id:
  `Select-String -Path index.html -Pattern 'gsap\.timeline'`.
- Then do the visual frame check — it's the only reliable black-screen detector.
