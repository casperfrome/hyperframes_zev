# Authoring guide — timing idiom, themes, orientation, topic-fit blocks

This is the craft layer on top of [reference-composition.html](reference-composition.html)
(the proven known-good structure/CSS) and [runtime-rules.md](runtime-rules.md) (the two
black-screen Non-Negotiables). Read those first; this file removes the two remaining pain
points: **manual timing bookkeeping** and **every video looking the same**.

---

## 1. Single-source timing — never hand-place absolute times

The reference works, but it hardcodes every tween at a literal absolute time (`10.76`,
`11.11`, …) and a 25-entry `CAPS` array, all hand-copied from `captions.json`. A retime or a
wording edit then means editing dozens of scattered numbers — the #1 source of silent timing
drift and caption desync. Don't do that. Instead:

### Step A — generate the timing tables
After `captions.mjs` has written `assets/captions.json`, run (from the project dir):

```
node scripts/assemble.mjs
```

It prints three paste-ready blocks:
- **PASTE 1** — the `data-start/-duration/-track-index` attributes for every `#sN` scene plus
  the root/`#captions`/`#progress`/`#narration` elements. Paste these onto the markup.
- **PASTE 2** — `var TOTAL`, `var S = [...]` (scene starts), `var SDUR = [...]` (durations).
- **PASTE 3** — the full `var CAPS = [...]` literal.

These reproduce, byte-for-byte, what you would otherwise compute by hand — so the timing is
correct by construction.

### Step B — write every tween RELATIVE to the `S` table
Place each scene's entrance animations at `S[i] + localOffset`, not at a literal. Compare:

```js
// ❌ old: literal absolute times — a retime means editing every line
tl.fromTo('#s1 .heading',  { opacity:0, y:-34 }, { opacity:1, y:0, duration:0.7 }, 10.76);
tl.fromTo('#s1 .big-node', { opacity:0, scale:0.6 }, { opacity:1, scale:1, duration:0.8 }, 11.11);

// ✅ new: relative to the single-source table — retime = edit S[] only
tl.fromTo('#s1 .heading',  { opacity:0, y:-34 }, { opacity:1, y:0, duration:0.7 }, S[1] + 0.25);
tl.fromTo('#s1 .big-node', { opacity:0, scale:0.6 }, { opacity:1, scale:1, duration:0.8 }, S[1] + 0.60);
```

Captions and the progress bar stay data-driven too:

```js
CAPS.forEach(function (c, i) {
  var el = document.getElementById('cap-' + i);
  var outAt = Math.max(c.s + 0.3, c.e - 0.2);
  tl.fromTo(el, { opacity:0, y:26 }, { opacity:1, y:0, duration:0.28, overwrite:'auto' }, c.s);
  tl.to(el,    { opacity:0, y:-14, duration:0.2, overwrite:'auto' }, outAt);
  tl.set(el,   { opacity:0, visibility:'hidden' }, c.e);
});
tl.fromTo('#progress-bar', { scaleX:0 }, { scaleX:1, duration: TOTAL, ease:'none' }, 0);
```

All of this is still **one root timeline at absolute times** — identical to the runtime
contract in runtime-rules.md. `S[i] + offset` IS an absolute time; you've just stopped
typing the arithmetic by hand. `scripts/check.mjs` now verifies the pasted scene attributes
match `captions.json` (and the measured `narration.wav`), so a desync fails before render.

---

## 2. Themes — stop shipping the same dark-tech look

The reference is one palette (teal/amber on near-black). Pick a palette that fits the topic
by swapping the `#composition-root` variables + base `background`. Every block in the
reference reads from these variables, so a swap restyles the whole video. Keep `body`'s base
color in sync with the root background, and re-run `lint` (it fails contrast < 4.5:1).

```css
/* A — Dark tech (default; what the reference ships) */
#composition-root {
  --accent:#2ec4e6; --accent2:#ffac3e; --text:#f2f3f7; --text-dim:#9aa0b4;
  --card:rgba(255,255,255,0.045); --card-bd:rgba(255,255,255,0.08);
  background:
    radial-gradient(1100px 900px at 50% 18%, rgba(0,180,216,0.10), transparent 60%),
    radial-gradient(900px 800px at 50% 92%, rgba(255,159,28,0.07), transparent 60%), #07080f;
}

/* B — Warm editorial (story, lifestyle, food, brand) */
#composition-root {
  --accent:#e8a04a; --accent2:#d96b4f; --text:#f6efe6; --text-dim:#b8a896;
  --card:rgba(255,255,255,0.05); --card-bd:rgba(255,255,255,0.09);
  background:
    radial-gradient(1100px 900px at 50% 15%, rgba(232,160,74,0.12), transparent 60%), #161210;
}

/* C — Clean light (corporate, education, how-to). Light bg → see caption note below. */
#composition-root {
  --accent:#2563eb; --accent2:#db2777; --text:#141821; --text-dim:#586073;
  --card:rgba(15,23,42,0.04); --card-bd:rgba(15,23,42,0.10);
  background:
    radial-gradient(1100px 900px at 50% 12%, rgba(37,99,235,0.08), transparent 60%), #f6f8fc;
}

/* D — Vibrant gradient (product launch, hype, social) */
#composition-root {
  --accent:#a78bfa; --accent2:#f472b6; --text:#f4f1ff; --text-dim:#b3a9d6;
  --card:rgba(255,255,255,0.06); --card-bd:rgba(255,255,255,0.12);
  background:
    radial-gradient(1200px 1000px at 30% 10%, rgba(124,58,237,0.30), transparent 60%),
    radial-gradient(1000px 900px at 80% 90%, rgba(236,72,153,0.22), transparent 60%), #120b1f;
}
```

Also set `body { background: <same base color as the root>; }`.

**Light-theme caption note (palette C):** the caption pill is white text on a dark translucent
panel (`.cap-group span { background: rgba(7,8,15,0.62); color:#fff; }`). On a light background
that still reads fine — keep it. The `.title-main` gradient (`#2ec4e6→#6ad7ef`) is also light;
on a light bg swap it to your accents, e.g. `linear-gradient(135deg, var(--accent), var(--accent2))`.

---

## 3. Default orientation — vertical unless requested otherwise

Use vertical `1080×1920` when the user does not specify an aspect ratio, orientation, or custom
dimensions. The reference composition already uses this portrait frame. Change dimensions only when
the user explicitly asks for landscape or a custom size.

## 4. Landscape (1920×1080) — deltas from the vertical reference

The reference is vertical 1080×1920. For landscape, change only these; the blocks and the
one-root-timeline logic are unchanged:

```css
#composition-root { width:1920px; height:1080px; --safe-x:120px; }
.scene  { padding:90px var(--safe-x) 180px; }   /* less vertical padding, content fits wider */
.caption-layer { left:160px; right:160px; bottom:90px; height:120px; }  /* lower & wider */
.cap-group span { font-size:38px; }              /* slightly smaller caption text */
```

And the markup root: `data-width="1920" data-height="1080"`. Rows that stack vertically in
portrait (e.g. `.mem-row`, `.tool-grid`) have room to sit side-by-side — prefer horizontal
arrangements so the wide frame isn't empty. Keep heroes/headings centered.

---

## 5. Design blocks for THIS topic — don't default to the AI-agent vocabulary

The reference's blocks (`big-node` LLM brain, `react-row`, `flow-chip`, `plan-tree`,
`mem-card`, `tool-grid`, `cycle`, `sum-list`) were built for one explainer about AI agents.
They are **CSS primitives to reuse, not a fixed script to refill.** Map each 画面 line from the
approved script to the primitive that fits its *meaning*:

- a single key concept / definition → `big-node` (circular hero) or `title-main`
- two things contrasted → `react-row` / two `mem-card`s
- a sequence / pipeline → `flow-row` of `flow-chip`s with `flow-arrow`s
- a breakdown into parts → `plan-subs` or a `tool-grid`
- a repeating process → `cycle`
- a recap → `sum-list`
- a list of features/steps → `tool-grid` (icon + title + sub per item)

If a topic needs something none of these express (a quote, a stat callout, a photo, a
timeline, a comparison table), build a new small block with the same `--card`/`--card-bd`/
`--radius`/`--accent` variables so it inherits the chosen theme. Vary icons, headings, and
counts per scene — a cooking or travel video should look nothing like the AI explainer even
though it reuses the same primitives and timing machinery.

### Ready-made non-AI primitives

Three theme-aware blocks for the topics the reference doesn't cover. They read the same
`--accent`/`--card`/`--card-bd`/`--radius`/`--text`/`--text-dim` variables, so the active
palette restyles them automatically. Drop the HTML in a scene, add the CSS once, and animate
them on the root timeline like any other block (`tl.fromTo('#sN .stat-num', …, S[N]+off)`).

```html
<!-- A) stat-callout — one big number + label (results, growth, "3×", "10k+") -->
<div class="stat-callout">
  <div class="stat-num">87<span class="stat-unit">%</span></div>
  <div class="stat-label">用户留存率</div>
</div>

<!-- B) quote-card — a pull quote with attribution -->
<div class="quote-card">
  <div class="quote-mark">“</div>
  <p class="quote-text">把复杂的事情做简单，是真本事。</p>
  <div class="quote-by">— 某位主理人</div>
</div>

<!-- C) photo-frame — a captioned image placeholder (point src at assets/…) -->
<figure class="photo-frame">
  <img class="photo-img" src="assets/shot.jpg" alt="" />
  <figcaption class="photo-cap">现磨豆子，90℃ 注水</figcaption>
</figure>
```

```css
/* A — stat-callout */
.stat-callout { display:flex; flex-direction:column; align-items:center; gap:14px; }
.stat-num { font-size:180px; font-weight:800; line-height:1; color:var(--accent);
  letter-spacing:-2px; }
.stat-unit { font-size:72px; font-weight:700; color:var(--accent2); margin-left:6px; }
.stat-label { font-size:34px; color:var(--text-dim); letter-spacing:2px; }

/* B — quote-card */
.quote-card { max-width:860px; padding:56px 64px; border-radius:var(--radius);
  background:var(--card); border:1px solid var(--card-bd); text-align:left; }
.quote-mark { font-size:96px; line-height:0.6; color:var(--accent); opacity:0.5; }
.quote-text { font-size:48px; font-weight:600; color:var(--text); line-height:1.4;
  margin-top:8px; }
.quote-by { font-size:30px; color:var(--text-dim); margin-top:28px; }

/* C — photo-frame */
.photo-frame { width:760px; border-radius:var(--radius); overflow:hidden;
  background:var(--card); border:1px solid var(--card-bd); }
.photo-img { display:block; width:100%; height:520px; object-fit:cover; }
.photo-cap { font-size:30px; color:var(--text-dim); padding:24px 32px; text-align:left; }
```

Vary which you use per scene; mixing a stat, a quote, and a photo across a 30s video reads as
a different production from the all-`big-node` AI explainer even on the same timing machinery.
