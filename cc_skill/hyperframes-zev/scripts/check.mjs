// Structural black-screen guard for a HyperFrames composition.
// Asserts the three invariants from references/runtime-rules.md that, if violated,
// make the runtime render a FULLY BLACK video even though lint/validate/inspect pass.
// This does NOT replace the mandatory visual frame check — it only catches the two
// known structural bugs early and mechanically. Usage:
//   node scripts/check.mjs index.html
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const target = process.argv[2] || "index.html";
const path = resolve(process.cwd(), target);
if (!existsSync(path)) {
  console.error(`check.mjs: file not found: ${path}`);
  process.exit(1);
}
const html = readFileSync(path, "utf8");
const htmlDir = dirname(path);

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok, detail });
}
// A skipped check is informational only — it never fails the run. Used for the
// timing checks when assets/captions.json is absent (e.g. silent videos).
function skip(name, detail) {
  results.push({ name, skip: true, detail });
}
// A warning is advisory only — it prints WARN but never sets the exit code.
// Used to nudge against shipping the unmodified reference look (see "visual
// sameness" — references/authoring.md §2/§4).
function warn(name, ok, detail) {
  results.push({ name, ok, detail, advisory: true });
}

// ── Invariant 1: exactly ONE data-composition-id (on the root). ──
const compIds = html.match(/data-composition-id\s*=\s*["']([^"']+)["']/g) || [];
check(
  "exactly one data-composition-id",
  compIds.length === 1,
  compIds.length === 0
    ? "found 0 — the root <div> needs data-composition-id"
    : compIds.length > 1
      ? `found ${compIds.length}: ${compIds.join(", ")} — scenes must NOT carry their own composition-id`
      : compIds[0]
);
const rootId = compIds.length === 1 ? compIds[0].match(/["']([^"']+)["']/)[1] : null;

// ── Invariant 2: no display:none on a .clip rule. ──
// The runtime toggles style.visibility only; display:none on .clip hides every clip forever.
// Scan CSS rules (inside <style> blocks) whose selector mentions .clip for display:none.
const clipDisplayNone = [];
const styleCss = (html.match(/<style[^>]*>([\s\S]*?)<\/style>/gi) || [])
  .map((block) => block.replace(/<\/?style[^>]*>/gi, ""))
  .join("\n");
const ruleRe = /([^{}]+)\{([^}]*)\}/g;
let m;
while ((m = ruleRe.exec(styleCss)) !== null) {
  const selector = m[1];
  const body = m[2];
  if (/\.clip\b/.test(selector) && /display\s*:\s*none/i.test(body)) {
    clipDisplayNone.push(selector.trim().replace(/\s+/g, " "));
  }
}
check(
  "no display:none on .clip",
  clipDisplayNone.length === 0,
  clipDisplayNone.length === 0
    ? "ok"
    : `display:none found on: ${clipDisplayNone.join(" | ")} — use visibility/stacking instead`
);

// ── Invariant 3: one gsap.timeline registered under the root composition-id. ──
const timelineCount = (html.match(/gsap\.timeline\s*\(/g) || []).length;
const keyedToRoot =
  rootId !== null &&
  new RegExp(`__timelines\\s*\\[\\s*["']${rootId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']\\s*\\]`).test(html);
check(
  "single root timeline keyed to composition-id",
  timelineCount === 1 && keyedToRoot,
  timelineCount !== 1
    ? `found ${timelineCount} gsap.timeline( calls — there must be exactly ONE root timeline`
    : keyedToRoot
      ? `keyed to "${rootId}"`
      : `timeline is not registered under window.__timelines["${rootId}"] (root id)`
);

// ── Timing checks: HTML timing must match assets/captions.json / the audio. ──
// These run ONLY when captions.json is found, and SKIP otherwise (silent videos,
// caption-less drafts) so they never penalize a valid no-caption composition.
const TOL = 0.1; // seconds, for in-file timing comparisons
const AUDIO_TOL = 0.35; // seconds, ffprobe vs declared duration

function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`));
  return m ? m[1] : null;
}

const capJsonPath = [resolve(htmlDir, "assets/captions.json"), resolve(process.cwd(), "assets/captions.json")].find(
  (p) => existsSync(p)
);

if (!capJsonPath) {
  skip("timing vs captions.json", "no assets/captions.json found — timing checks skipped (ok for silent videos)");
} else {
  let cap = null;
  try {
    cap = JSON.parse(readFileSync(capJsonPath, "utf8"));
  } catch (e) {
    check("captions.json parses", false, `${capJsonPath}: ${e.message}`);
  }
  if (cap) {
    const total = Number(cap.totalDuration);
    const capScenes = Array.isArray(cap.scenes) ? cap.scenes : [];

    // root data-duration ≈ totalDuration
    const rootTag = (html.match(/<[^>]*data-composition-id[^>]*>/) || [])[0] || "";
    const rootDur = Number(attr(rootTag, "data-duration"));
    check(
      "root data-duration matches captions.json totalDuration",
      Number.isFinite(rootDur) && Number.isFinite(total) && Math.abs(rootDur - total) <= TOL,
      `root=${Number.isFinite(rootDur) ? rootDur : "?"}  totalDuration=${total}`
    );

    // root data-duration ≈ measured narration.wav (when present)
    const wav = [resolve(htmlDir, "assets/narration.wav"), resolve(process.cwd(), "assets/narration.wav")].find((p) =>
      existsSync(p)
    );
    if (wav) {
      let measured = null;
      try {
        const o = execFileSync(
          "ffprobe",
          ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wav],
          { encoding: "utf8" }
        ).trim();
        const v = Number(o);
        if (Number.isFinite(v) && v > 0) measured = v;
      } catch {
        /* ffprobe missing/failed — skip the audio comparison */
      }
      if (measured === null) {
        skip("root data-duration matches narration.wav", "ffprobe unavailable — audio duration check skipped");
      } else {
        check(
          "root data-duration matches narration.wav",
          Number.isFinite(rootDur) && Math.abs(rootDur - measured) <= AUDIO_TOL,
          `root=${rootDur}  wav=${measured.toFixed(2)} (tol ${AUDIO_TOL}s)`
        );
      }
    }

    // each scene clip (class includes "scene", has data-start), in document order,
    // matches captions.json scenes[i].start/duration
    const sceneTags = html.match(/<[^>]*class\s*=\s*["'][^"']*\bscene\b[^"']*["'][^>]*>/g) || [];
    const sceneTimed = sceneTags.filter((t) => /data-start/.test(t));
    if (sceneTimed.length !== capScenes.length) {
      check(
        "scene count matches captions.json",
        false,
        `${sceneTimed.length} timed .scene element(s) in HTML vs ${capScenes.length} in captions.json`
      );
    } else {
      const bad = [];
      sceneTimed.forEach((tag, i) => {
        const st = Number(attr(tag, "data-start"));
        const du = Number(attr(tag, "data-duration"));
        if (Math.abs(st - capScenes[i].start) > TOL || Math.abs(du - capScenes[i].duration) > TOL) {
          bad.push(`#${i}: html(${st}/${du}) vs json(${capScenes[i].start}/${capScenes[i].duration})`);
        }
      });
      check(
        "scene data-start/duration match captions.json",
        bad.length === 0,
        bad.length === 0 ? `all ${sceneTimed.length} scenes within ${TOL}s` : bad.join(" | ")
      );

      // scenes contiguous: each start ≈ previous end
      const gaps = [];
      for (let i = 1; i < sceneTimed.length; i++) {
        const prevEnd = Number(attr(sceneTimed[i - 1], "data-start")) + Number(attr(sceneTimed[i - 1], "data-duration"));
        const start = Number(attr(sceneTimed[i], "data-start"));
        if (Math.abs(start - prevEnd) > TOL) gaps.push(`#${i} start=${start} after prevEnd=${prevEnd.toFixed(2)}`);
      }
      check(
        "scenes are contiguous (no gap/overlap)",
        gaps.length === 0,
        gaps.length === 0 ? "ok" : gaps.join(" | ")
      );
    }

    // best-effort: last CAPS end ≤ totalDuration
    const capsBlock = (html.match(/var\s+CAPS\s*=\s*\[([\s\S]*?)\]\s*;/) || [])[1];
    if (capsBlock) {
      const ends = [...capsBlock.matchAll(/\be\s*:\s*([\d.]+)/g)].map((m) => Number(m[1]));
      if (ends.length) {
        const lastEnd = Math.max(...ends);
        check(
          "last caption ends within composition duration",
          lastEnd <= total + TOL,
          `lastCaptionEnd=${lastEnd}  totalDuration=${total}`
        );
      }
    }
  }
}

// ── Advisory: don't ship the unmodified reference look (visual sameness). ──
// These never fail the run; they nudge toward a topic-fit theme + content.
const usesDefaultAccent1 = /--accent\s*:\s*#2ec4e6/i.test(html);
const usesDefaultAccent2 = /--accent2\s*:\s*#ffac3e/i.test(html);
warn(
  "theme differs from the reference default",
  !(usesDefaultAccent1 && usesDefaultAccent2),
  usesDefaultAccent1 && usesDefaultAccent2
    ? "still using the reference default accents (#2ec4e6 / #ffac3e) — pick a palette that fits the topic (authoring.md §2)"
    : "ok"
);
const titleText = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "") + " " + html;
const hasAiPlaceholder = /\bAI[\s-]?Agent\b/i.test(titleText);
warn(
  "no leftover 'AI Agent' placeholder copy",
  !hasAiPlaceholder,
  hasAiPlaceholder
    ? "found 'AI Agent' text — the reference content is placeholder; replace ALL copy for this topic"
    : "ok"
);

let allOk = true;
for (const r of results) {
  const tag = r.skip ? "SKIP" : r.advisory ? (r.ok ? "PASS" : "WARN") : r.ok ? "PASS" : "FAIL";
  console.log(`${tag}  ${r.name}  —  ${r.detail}`);
  if (!r.skip && !r.advisory && !r.ok) allOk = false;
}
if (!allOk) {
  console.error(
    "\ncheck.mjs: structural black-screen risk. Fix per references/runtime-rules.md.\n" +
      "(A clean result is necessary, not sufficient — still eyeball a real rendered frame.)"
  );
  process.exit(1);
}
console.log("\nAll structural checks passed. Still verify a real frame is not black (SKILL.md step 7).");
