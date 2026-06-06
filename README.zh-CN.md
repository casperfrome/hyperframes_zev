# hyperframes-zev

面向 Claude Code 和 Codex 的 HyperFrames 视频工作流 Skill。核心目标是：先写脚本、先确认，再合成和渲染，尽量避免黑屏、静音、字幕不同步等常见问题。

规范 Skill 位于 `skills/hyperframes-zev/`。所有安装脚本都从这份唯一来源复制，避免 Claude Code 和 Codex 两边的脚本、参考资料出现漂移。旧的 Codex 斜杠命令 `/hyperframes_zev_v2` 仍保留为兼容入口，会引导使用新的 `$hyperframes-zev`。

## 它能做什么

这个 Skill 用来在本地 HyperFrames Video Workbench 中生成带旁白或字幕的 MP4。流程是先起草脚本并等待确认，然后再进入合成链路：

`DashScope TTS -> 确定性字幕时间轴 -> 组装时间参数 -> 单根 GSAP 时间线合成 -> 结构检查 -> 草稿帧检查 -> 最终渲染`

它还内置了两个 HyperFrames 运行时黑屏防护规则。有些错误即使 `lint`、`validate`、`inspect` 全部通过，最终视频仍可能是全黑，这个 Skill 会额外检查这些风险。

## 仓库结构

```text
skills/hyperframes-zev/       规范 Skill、脚本、参考资料和 agent 元数据
codex/prompts/                旧版 /hyperframes_zev_v2 兼容提示
install/                      Codex 和 Claude Code 安装脚本
tools/validate.mjs            仓库契约校验
```

旧的 `claude-code/`、`codex/scripts`、`codex/references` 副本不再维护。

## 安装

### Windows 一行命令安装

安装到 Codex：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target codex -Force"
```

安装到 Claude Code：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target claude -Force"
```

同时安装到 Codex 和 Claude Code：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -Command "& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/casperfrome/hyperframes_zev/master/install/install.ps1'))) -Target all -Force"
```

远程安装器会直接下载 GitHub 压缩包，因此 Windows 用户不需要先安装 Git，也不需要手动 clone 仓库。默认来源是 `casperfrome/hyperframes_zev` 的 `master` 分支；维护者可以用 `-Repo owner/name` 和 `-Ref branch-or-tag` 覆盖来源。

### 本地安装

如果已经 clone 了仓库，也可以从本地安装。

#### Codex

```powershell
./install/install-codex.ps1 -Force
```

```bash
bash ./install/install-codex.sh --force
```

安装内容：

- `~/.codex/skills/hyperframes-zev`
- `~/.codex/prompts/hyperframes_zev_v2.md` 旧版兼容提示

使用方式：

```text
$hyperframes-zev
```

旧版兼容命令：

```text
/hyperframes_zev_v2
```

#### Claude Code

```powershell
./install/install-claude.ps1 -Force
```

```bash
bash ./install/install-claude.sh --force
```

安装内容：

- `~/.claude/skills/hyperframes-zev`
- `~/.claude/skills/hyperframes_zev_v2` 旧版兼容别名

使用方式：

```text
/hyperframes-zev
```

旧版兼容命令：

```text
/hyperframes_zev_v2
```

## 环境变量

| 变量 | 是否需要 | 说明 |
| --- | --- | --- |
| `HF_WORKBENCH` | 推荐 | HyperFrames workbench 仓库路径，需要包含 `workspace/`、`server/`、`web/`、`.env` 和 `test_videos/`。未设置时默认使用 `D:\AllPythonProjects\hyperframes_test_260529`。 |
| `DASHSCOPE_API_KEY` | 旁白视频必需 | DashScope TTS 所需 API Key。建议写在 workbench 仓库的 `.env` 中。 |
| `HF_ZEV_HOME` | 已废弃 | 新安装不再需要。安装器不会覆盖已有值。 |

内置脚本需要 Node.js，并要求 `ffmpeg`、`ffprobe` 在 `PATH` 中。本仓库只在校验 Skill 时使用 Python；请使用 `D:\PythonVenv\Scripts\python.exe`。

## 校验

```powershell
node tools/validate.mjs
$env:PYTHONUTF8='1'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'skills\hyperframes-zev'
node --check skills\hyperframes-zev\scripts\tts.mjs
node --check skills\hyperframes-zev\scripts\captions.mjs
node --check skills\hyperframes-zev\scripts\assemble.mjs
node --check skills\hyperframes-zev\scripts\check.mjs
node --check skills\hyperframes-zev\scripts\preflight.mjs
```

## 内置辅助脚本

| 脚本 | 作用 |
| --- | --- |
| `preflight.mjs` | 检查 workbench、`.env`、`node`、`ffmpeg`、`ffprobe`、缓存的 HyperFrames CLI 和骨架项目是否可用。 |
| `tts.mjs` | 调用 DashScope 同步 TTS，并写入 `assets/narration.wav`。 |
| `captions.mjs` | 根据旁白文本和音频时长生成确定性的场景与字幕时间轴。 |
| `assemble.mjs` | 根据 `captions.json` 输出可直接粘贴的时间属性和 JS 时间表。 |
| `check.mjs` | 检查黑屏防护结构规则和时间轴一致性。 |

## 许可证

MIT。见 [LICENSE](LICENSE)。
