// Single-source timing assembler for a HyperFrames composition.
// Reads assets/captions.json (produced by captions.mjs) and prints a paste-ready
// block so Phase 3 timing is COPY-PASTE, not hand-math:
//   1. the per-scene element timing attributes + root/captions/progress/audio attrs,
//   2. a `var S = [...]` scene-start table and `var SDUR = [...]` durations,
//   3. a `var CAPS = [...]` literal built from the caption groups.
// Tween times are then written relative to S (e.g. S[1] + 0.25) instead of literals,
// so a retime is a one-line edit to S — not 50 scattered edits.
//
// Usage (from the project dir, after captions.mjs has written assets/captions.json):
//   node scripts/assemble.mjs
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// Locate assets/captions.json: prefer the project dir (scripts/ sibling), fall back
// to the current working directory. Clear error rather than a cryptic ENOENT —
// same no-silent-default contract as captions.mjs.
function findCaptions() {
  for (const base of [projectDir, process.cwd()]) {
    const candidate = resolve(base, "assets/captions.json");
    if (existsSync(candidate)) return candidate;
  }
  console.error(
    "assemble.mjs: could not find assets/captions.json (looked in\n" +
      `  ${resolve(projectDir, "assets/captions.json")}\n` +
      `  ${resolve(process.cwd(), "assets/captions.json")})\n` +
      "Run captions.mjs first, from the project dir (workspace/<slug>)."
  );
  process.exit(1);
}

const capPath = findCaptions();
let data;
try {
  data = JSON.parse(readFileSync(capPath, "utf8"));
} catch (err) {
  console.error(`assemble.mjs: failed to parse ${capPath}: ${err.message}`);
  process.exit(1);
}

const total = Number(data.totalDuration);
const scenes = Array.isArray(data.scenes) ? data.scenes : [];
const captions = Array.isArray(data.captions) ? data.captions : [];
if (!Number.isFinite(total) || total <= 0 || scenes.length === 0) {
  console.error("assemble.mjs: captions.json missing a valid totalDuration or scenes[].");
  process.exit(1);
}

const n = scenes.length;
// Track-index layout mirrors the reference composition: scenes 0..n-1, then the
// always-on layers stack on top (higher index = higher z-order).
const CAPTIONS_TI = n;
const PROGRESS_TI = n + 1;
const AUDIO_TI = n + 2;

const f = (x) => Number(x).toFixed(2);
const out = [];

out.push("// ════════════════════════════════════════════════════════════");
out.push("// PASTE 1 — root + clip timing attributes (into the HTML markup)");
out.push("// ════════════════════════════════════════════════════════════");
out.push(`<!-- root: -->                 data-duration="${f(total)}"`);
scenes.forEach((s) => {
  out.push(
    `<!-- #s${s.index} -->   class="clip scene" data-start="${f(s.start)}" data-duration="${f(
      s.duration
    )}" data-track-index="${s.index}"`
  );
});
out.push(
  `<!-- #captions --> class="clip" data-start="0" data-duration="${f(total)}" data-track-index="${CAPTIONS_TI}"`
);
out.push(
  `<!-- #progress --> class="clip" data-start="0" data-duration="${f(total)}" data-track-index="${PROGRESS_TI}"`
);
out.push(
  `<!-- #narration --> data-start="0" data-duration="${f(
    total
  )}" data-track-index="${AUDIO_TI}" src="assets/narration.wav" data-volume="1"`
);
out.push("");

out.push("// ════════════════════════════════════════════════════════════");
out.push("// PASTE 2 — timing tables (into the <script>, before building tl)");
out.push("// Write every tween time relative to these, e.g. S[1] + 0.25");
out.push("// ════════════════════════════════════════════════════════════");
out.push(`var TOTAL = ${f(total)};`);
out.push(`var S    = [${scenes.map((s) => f(s.start)).join(", ")}];   // scene start times`);
out.push(`var SDUR = [${scenes.map((s) => f(s.duration)).join(", ")}];   // scene durations`);
out.push("");

out.push("// ════════════════════════════════════════════════════════════");
out.push("// PASTE 3 — caption groups (deterministic timing from captions.json)");
out.push("// ════════════════════════════════════════════════════════════");
out.push("var CAPS = [");
captions.forEach((c, i) => {
  const text = String(c.text).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const comma = i === captions.length - 1 ? "" : ",";
  out.push(`    { t: "${text}", s: ${f(c.start)}, e: ${f(c.end)} }${comma}`);
});
out.push("];");
out.push("");
out.push(
  `// reminder: progress bar tween + #progress/#captions/#narration data-duration all use TOTAL (${f(
    total
  )}).`
);
out.push(
  "// reminder: tl.fromTo('#progress-bar',{scaleX:0},{scaleX:1,duration:TOTAL,ease:'none'},0) keeps the root timeline longest."
);

console.log(out.join("\n"));
