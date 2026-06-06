// Deterministic caption/scene timing generator.
// whisper-cpp is unavailable in this env, so instead of word-level ASR we distribute
// narration phrases across the known audio duration proportional to character weight.
// One narration sentence per line in narration.txt -> one scene. Each scene's sentence
// is split into short caption groups on Chinese punctuation.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// Locate assets/narration.txt: prefer the project dir (scripts/ sibling), fall
// back to the current working directory. Clear error rather than a cryptic ENOENT.
function findNarration() {
  for (const base of [projectDir, process.cwd()]) {
    const candidate = resolve(base, "assets/narration.txt");
    if (existsSync(candidate)) return candidate;
  }
  console.error(
    "captions.mjs: could not find assets/narration.txt (looked in\n" +
      `  ${resolve(projectDir, "assets/narration.txt")}\n` +
      `  ${resolve(process.cwd(), "assets/narration.txt")})\n` +
      "Run this from the project dir (workspace/<slug>) with assets/narration.txt present."
  );
  process.exit(1);
}
const narrationPath = findNarration();

// Resolve the audio duration. Priority: explicit numeric arg > ffprobe on
// assets/narration.wav > hard error. Never silently default — wrong timing for
// the whole video is worse than a clear failure.
function probeWavDuration() {
  const wav = resolve(dirname(narrationPath), "narration.wav");
  if (!existsSync(wav)) return null;
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", wav],
      { encoding: "utf8" }
    ).trim();
    const n = Number(out);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null; // ffprobe missing or failed
  }
}

function resolveTotal() {
  const arg = process.argv[2];
  if (arg !== undefined) {
    const n = Number(arg);
    if (!Number.isFinite(n) || n <= 0) {
      console.error(`captions.mjs: invalid duration "${arg}" — pass seconds, e.g. node scripts/captions.mjs 28.4`);
      process.exit(1);
    }
    return n;
  }
  const probed = probeWavDuration();
  if (probed !== null) {
    console.error(`captions.mjs: using measured audio duration ${probed}s from narration.wav`);
    return probed;
  }
  console.error(
    "captions.mjs: no duration given and could not measure assets/narration.wav.\n" +
      "Pass the audio duration in seconds, e.g.  node scripts/captions.mjs 28.4\n" +
      "(measure it with: ffprobe -v error -show_entries format=duration -of " +
      "default=noprint_wrappers=1:nokey=1 assets/narration.wav)"
  );
  process.exit(1);
}

const TOTAL = resolveTotal();
const LEAD = 0.12; // tiny silence before first word
const TAIL = 0.25; // trailing silence

const raw = readFileSync(narrationPath, "utf8");
const sentences = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

// weight of a string ~ spoken time: CJK char = 1, latin run = ~0.6, punctuation pause adds a bit
function weight(str) {
  let w = 0;
  for (const ch of str) {
    if (/[一-鿿]/.test(ch)) w += 1;
    else if (/[A-Za-z0-9]/.test(ch)) w += 0.5;
    else if (/[，。、：；]/.test(ch)) w += 0.6; // pause
  }
  return w;
}

// split a sentence into readable caption groups on punctuation, merging very short bits
function toGroups(sentence) {
  const parts = sentence.split(/(?<=[，。、：；])/).map((s) => s.trim()).filter(Boolean);
  const groups = [];
  let buf = "";
  const visLen = (s) => (s.match(/[一-鿿]/g) || []).length + (s.match(/[A-Za-z]+/g) || []).length;
  for (const p of parts) {
    const candidate = buf + p;
    if (buf && visLen(candidate) > 13) {
      groups.push(buf);
      buf = p;
    } else {
      buf = candidate;
    }
  }
  if (buf) groups.push(buf);
  // strip trailing punctuation for display cleanliness
  return groups.map((g) => g.replace(/[，、：；]$/, ""));
}

const sceneData = sentences.map((s) => ({ text: s, groups: toGroups(s), w: weight(s) }));
const totalW = sceneData.reduce((a, s) => a + s.w, 0);
const span = TOTAL - LEAD - TAIL;

let cursor = LEAD;
const scenes = [];
const captions = [];
sceneData.forEach((sd, si) => {
  const sceneStart = cursor;
  const sceneDur = (sd.w / totalW) * span;
  const sceneEnd = sceneStart + sceneDur;
  scenes.push({ index: si, start: round(sceneStart), duration: round(sceneDur) });
  // distribute caption groups within the scene by their weight
  const gw = sd.groups.map((g) => weight(g));
  const gwTotal = gw.reduce((a, b) => a + b, 0) || 1;
  let gCursor = sceneStart;
  sd.groups.forEach((g, gi) => {
    const d = (gw[gi] / gwTotal) * sceneDur;
    captions.push({ text: g, start: round(gCursor), end: round(gCursor + d), scene: si });
    gCursor += d;
  });
  cursor = sceneEnd;
});

function round(n) {
  return Math.round(n * 100) / 100;
}

const out = { totalDuration: TOTAL, scenes, captions };
writeFileSync(resolve(dirname(narrationPath), "captions.json"), JSON.stringify(out, null, 2), "utf8");
console.log(JSON.stringify(out, null, 2));
