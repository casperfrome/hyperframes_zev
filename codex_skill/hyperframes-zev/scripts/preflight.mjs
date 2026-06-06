// HyperFrames Zev preflight.
// Checks the local workbench before synthesis and self-heals only the safe parts:
// a missing workspace/ directory. It does not fabricate a missing workbench,
// secret, toolchain, or skeleton project.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { sep, join } from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const DEFAULT_WORKBENCH = "D:\\AllPythonProjects\\hyperframes_test_260529";
const HYPERFRAMES_VERSION = "0.6.56";

function hasCommand(name) {
  const checker = process.platform === "win32" ? "where" : "command";
  const args = process.platform === "win32" ? [name] : ["-v", name];
  return spawnSync(checker, args, { stdio: "ignore", shell: process.platform !== "win32" }).status === 0;
}

function walkForCli(dir, depth = 0) {
  if (!dir || depth > 8 || !existsSync(dir)) return null;
  let entries = [];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isFile() && entry === "cli.js" && full.includes(`${sep}hyperframes${sep}dist${sep}`)) {
      return full;
    }
    if (s.isDirectory()) {
      const hit = walkForCli(full, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

function findHyperframesCli() {
  const roots =
    process.platform === "win32"
      ? [process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "npm-cache", "_npx")]
      : [join(homedir(), ".npm", "_npx")];
  for (const root of roots) {
    const hit = walkForCli(root);
    if (hit) return hit;
  }
  return null;
}

const wb = process.env.HF_WORKBENCH || DEFAULT_WORKBENCH;
const misses = [];

if (!existsSync(wb)) {
  misses.push(`workbench repo not found: ${wb} (clone it or set HF_WORKBENCH)`);
}

const envFile = join(wb, ".env");
if (!existsSync(envFile)) {
  misses.push(`.env missing at ${envFile}; create it with DASHSCOPE_API_KEY=sk-...`);
} else {
  const envText = readFileSync(envFile, "utf8");
  if (!/^\s*DASHSCOPE_API_KEY\s*=\s*\S/m.test(envText)) {
    misses.push(`DASHSCOPE_API_KEY not set in ${envFile}`);
  }
}

for (const exe of ["node", "ffmpeg", "ffprobe"]) {
  if (!hasCommand(exe)) misses.push(`${exe} not on PATH`);
}

if (misses.length) {
  console.error("PREFLIGHT FAILED:");
  for (const miss of misses) console.error(`- ${miss}`);
  process.exit(1);
}

const workspace = join(wb, "workspace");
if (!existsSync(workspace)) {
  mkdirSync(workspace, { recursive: true });
  console.log(`bootstrapped: created ${workspace}`);
}

const skeleton = readdirSync(workspace, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ name: entry.name, path: join(workspace, entry.name) }))
  .find((entry) => existsSync(join(entry.path, "hyperframes.json")));
const hf = findHyperframesCli();

const result = {
  workbench: wb,
  workspace,
  hyperframesCli: hf,
  hyperframesCommand: hf ? `node "${hf}"` : `npx --yes hyperframes@${HYPERFRAMES_VERSION}`,
  skeletonName: skeleton ? skeleton.name : null,
  skeletonPath: skeleton ? skeleton.path : null,
  bootstrap: !skeleton,
};

console.log("Preflight OK.");
console.log(JSON.stringify(result, null, 2));
