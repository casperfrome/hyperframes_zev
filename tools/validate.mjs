import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const expected = [
  "skills/hyperframes-zev/SKILL.md",
  "skills/hyperframes-zev/agents/openai.yaml",
  "skills/hyperframes-zev/scripts/tts.mjs",
  "skills/hyperframes-zev/scripts/captions.mjs",
  "skills/hyperframes-zev/scripts/assemble.mjs",
  "skills/hyperframes-zev/scripts/check.mjs",
  "skills/hyperframes-zev/scripts/preflight.mjs",
  "skills/hyperframes-zev/references/runtime-rules.md",
  "skills/hyperframes-zev/references/env-gotchas.md",
  "skills/hyperframes-zev/references/authoring.md",
  "skills/hyperframes-zev/references/reference-composition.html",
  "codex/prompts/hyperframes_zev_v2.md",
  "install/install.ps1",
  "install/install-codex.ps1",
  "install/install-codex.sh",
  "install/install-claude.ps1",
  "install/install-claude.sh",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

for (const rel of expected) {
  if (!existsSync(join(root, rel))) fail(`missing expected file: ${rel}`);
}

if (existsSync(join(root, "skills/hyperframes-zev/SKILL.md"))) {
  const skill = read("skills/hyperframes-zev/SKILL.md");
  if (!/^---\s*\nname: hyperframes-zev\n/m.test(skill)) {
    fail("SKILL.md frontmatter must declare name: hyperframes-zev");
  }
  if (!/^description: Use when /m.test(skill)) {
    fail('SKILL.md description must start with "Use when"');
  }
  if (/disable-model-invocation/.test(skill)) {
    fail("SKILL.md must not contain invalid disable-model-invocation frontmatter");
  }
  if (!/scripts\/preflight\.mjs/.test(skill)) {
    fail("SKILL.md must route long preflight detail to scripts/preflight.mjs");
  }
}

if (existsSync(join(root, "codex/prompts/hyperframes_zev_v2.md"))) {
  const prompt = read("codex/prompts/hyperframes_zev_v2.md");
  if (!/\$hyperframes-zev/.test(prompt)) {
    fail("legacy Codex prompt must point users to $hyperframes-zev");
  }
  if (/HF_ZEV_HOME/.test(prompt)) {
    fail("legacy Codex prompt must not require HF_ZEV_HOME");
  }
}

if (existsSync(join(root, "README.md"))) {
  const readme = read("README.md");
  for (const target of ["codex", "claude", "all"]) {
    const command = `install/install.ps1'))) -Target ${target} -Force`;
    if (!readme.includes(command)) {
      fail(`README.md must document the remote Windows one-line installer for target: ${target}`);
    }
  }
}

const staleDirs = [
  "claude-code/hyperframes_zev_v2/references",
  "claude-code/hyperframes_zev_v2/scripts",
  "codex/references",
  "codex/scripts",
];
for (const rel of staleDirs) {
  if (existsSync(join(root, rel)) && walk(join(root, rel)).length > 0) {
    fail(`stale duplicate resource files exist under: ${rel}`);
  }
}

for (const rel of [
  "install/install.ps1",
  "install/install-codex.ps1",
  "install/install-claude.ps1",
]) {
  if (!existsSync(join(root, rel))) continue;
  const body = read(rel);
  if (!/skills[\\/]+hyperframes-zev/.test(body) && !/install\.ps1/.test(body)) {
    fail(`${rel} must install from skills/hyperframes-zev or delegate to install/install.ps1`);
  }
}

for (const rel of [
  "install/install-codex.sh",
  "install/install-claude.sh",
]) {
  if (!existsSync(join(root, rel))) continue;
  const body = read(rel);
  if (!/skills[\\/]+hyperframes-zev/.test(body)) {
    fail(`${rel} must install from skills/hyperframes-zev`);
  }
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const invalidSkillNames = walk(join(root, "skills"))
  .filter((file) => file.endsWith("SKILL.md"))
  .filter((file) => !/^[a-z0-9-]+$/.test(file.split(/[\\/]/).at(-2)));
for (const file of invalidSkillNames) {
  fail(`invalid skill directory name: ${relative(root, file)}`);
}

if (failures.length) {
  console.error("Repo validation failed:");
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}

console.log("Repo validation passed.");
