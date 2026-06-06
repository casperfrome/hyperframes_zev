// Standalone DashScope qwen-tts helper for the local workbench.
// Uses the synchronous multimodal-generation call because this machine's key rejects
// X-DashScope-Async. If DashScope still returns a task id, the helper can poll it.
// Reads DASHSCOPE_* from the repo-root .env. Usage:
//   node scripts/tts.mjs assets/narration.txt assets/narration.wav
import { readFileSync, createWriteStream, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(__dirname, "..");

// Find the .env by walking up from the script dir to the first ancestor that has
// one. Works whether this script runs in place (skill folder) or copied into a
// project (workspace/<slug>/scripts/) — instead of assuming a fixed depth.
function findEnvFile() {
  let dir = __dirname;
  while (true) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null; // reached filesystem root
    dir = parent;
  }
}

function loadEnv(file) {
  const env = {};
  if (!file || !existsSync(file)) return env;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

function findTaskId(value) {
  if (!value || typeof value !== "object") return null;
  if (typeof value.task_id === "string") return value.task_id;
  for (const nested of Object.values(value)) {
    const found = findTaskId(nested);
    if (found) return found;
  }
  return null;
}

function findAudioUrl(value) {
  if (!value || typeof value !== "object") return null;
  const direct = value.url ?? value.audio_url;
  if (typeof direct === "string") return direct;
  if (value.audio && typeof value.audio === "object" && typeof value.audio.url === "string") {
    return value.audio.url;
  }
  for (const nested of Object.values(value)) {
    const found = findAudioUrl(nested);
    if (found) return found;
  }
  return null;
}

async function pollTask(apiKey, taskId) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const res = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const json = await res.json();
    const status = JSON.stringify(json).match(/"task_status"\s*:\s*"([^"]+)"/)?.[1];
    console.log(`DashScope TTS task ${taskId}: ${status ?? "polling"}`);
    if (findAudioUrl(json)) return json;
    if (status === "FAILED" || status === "UNKNOWN") {
      throw new Error(`DashScope TTS task failed: ${JSON.stringify(json)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`DashScope TTS task ${taskId} timed out.`);
}

async function main() {
  const [, , inArg = "assets/narration.txt", outArg = "assets/narration.wav"] = process.argv;
  const envFile = findEnvFile();
  const env = loadEnv(envFile);
  const apiKey = env.DASHSCOPE_API_KEY;
  const model = env.DASHSCOPE_TTS_MODEL || "qwen3-tts-flash";
  const voice = env.DASHSCOPE_TTS_VOICE || "Cherry";
  const format = env.DASHSCOPE_TTS_FORMAT || "wav";
  const sampleRate = Number(env.DASHSCOPE_TTS_SAMPLE_RATE || 24000);
  if (!apiKey) {
    throw new Error(
      envFile
        ? `DASHSCOPE_API_KEY is missing in ${envFile}`
        : "No .env found in any parent dir of this script — cannot read DASHSCOPE_API_KEY"
    );
  }

  // narration.txt is one sentence per line. Join lines into a single utterance,
  // but keep a sentence boundary so TTS pauses naturally: if a line doesn't already
  // end with sentence/clause punctuation, append a full-width period.
  const text = readFileSync(resolve(projectDir, inArg), "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (/[。！？，、：；.!?,]$/.test(s) ? s : s + "。"))
    .join("")
    .trim();
  console.log(`Synthesizing ${text.length} chars with ${model}/${voice}...`);

  const res = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: { text, voice },
        parameters: { format, sample_rate: sampleRate }
      })
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(`DashScope TTS failed: ${JSON.stringify(json)}`);
  console.log("Response:", JSON.stringify(json).slice(0, 600));

  const final = findAudioUrl(json)
    ? json
    : findTaskId(json)
      ? await pollTask(apiKey, findTaskId(json))
      : json;
  const url = findAudioUrl(final);
  if (!url) throw new Error(`No audio URL in response: ${JSON.stringify(final)}`);

  const audioRes = await fetch(url);
  if (!audioRes.ok || !audioRes.body) throw new Error(`Failed to download audio from ${url}`);
  const outPath = resolve(projectDir, outArg);
  mkdirSync(dirname(outPath), { recursive: true });
  await pipeline(audioRes.body, createWriteStream(outPath));
  console.log(`Saved audio to ${outPath}`);
}

main().catch((err) => {
  console.error(String(err && err.message ? err.message : err));
  process.exit(1);
});
