# hyperframes-zev

HyperFrames Zev 是一个手动安装的 Skill，用来在本地 HyperFrames Video Workbench 里生成、调试、校验和渲染视频。

## 下载哪个文件夹

Codex 用户：

1. 下载 `codex_skill/hyperframes-zev/`。
2. 把整个文件夹复制到 `~/.codex/skills/hyperframes-zev/`。
3. 在 Codex 里这样使用：

```text
$hyperframes-zev
```

Claude Code 用户：

1. 下载 `cc_skill/hyperframes-zev/`。
2. 把整个文件夹复制到 `~/.claude/skills/hyperframes-zev/`。
3. 在 Claude Code 里这样使用：

```text
/hyperframes-zev
```

## 文件夹里有什么

每个 skill 文件夹都包含运行所需文件：

- `SKILL.md`
- `scripts/*.mjs`
- `references/*.md`
- `references/reference-composition.html`

Codex 版本额外包含 `agents/openai.yaml`，用于 Codex 的界面元数据。Claude Code 版本不需要这个文件。

## 环境要求

建议设置 `HF_WORKBENCH`，指向你的 HyperFrames Video Workbench 仓库。未设置时，skill 默认使用：

```text
D:\AllPythonProjects\hyperframes_test_260529
```

Workbench 仓库需要包含：

```text
workspace/
server/
web/
.env
test_videos/
```

如果要生成带旁白的视频，把 `DASHSCOPE_API_KEY` 写到 workbench 的 `.env`。

内置脚本需要 Node.js，并要求 `ffmpeg`、`ffprobe` 在 `PATH` 中。

## 开发校验

修改本仓库后，校验两个发布包：

```powershell
$env:PYTHONUTF8='1'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'codex_skill\hyperframes-zev'
& 'D:\PythonVenv\Scripts\python.exe' 'C:\Users\zevro\.codex\skills\.system\skill-creator\scripts\quick_validate.py' 'cc_skill\hyperframes-zev'

node --check codex_skill\hyperframes-zev\scripts\tts.mjs
node --check codex_skill\hyperframes-zev\scripts\captions.mjs
node --check codex_skill\hyperframes-zev\scripts\assemble.mjs
node --check codex_skill\hyperframes-zev\scripts\check.mjs
node --check codex_skill\hyperframes-zev\scripts\preflight.mjs
node --check cc_skill\hyperframes-zev\scripts\tts.mjs
node --check cc_skill\hyperframes-zev\scripts\captions.mjs
node --check cc_skill\hyperframes-zev\scripts\assemble.mjs
node --check cc_skill\hyperframes-zev\scripts\check.mjs
node --check cc_skill\hyperframes-zev\scripts\preflight.mjs
```

## 许可证

MIT。见 [LICENSE](LICENSE)。
