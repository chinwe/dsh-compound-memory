# dsh-compound-memory

English | [中文](#中文)

DeepSeek Harness bundle that launches the existing [compound-memory](https://pypi.org/project/compound-memory/) MCP server (`uvx --from compound-memory compound-memory-server`). It does not reimplement memory, it does not add a sixth MCP tool, and the server still has no LLM ([ADR-0001](https://github.com/chinwe/compound-memory)). This wrapper adds none. There are no install, lifecycle, or `postinstall` scripts.

`package.json` declares `dsh.bundle.patch` = `./cordis.patch.yml`. That file inserts one in-box [`@deepseek-ai/dsh-mcp-client`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) row. Do not install that client yourself: DSH 0.2 already ships it, and a separately installed 0.1 client will not match ([discussion #8202](https://github.com/deepseek-ai/deepseek-harness/discussions/8202)). This package declares no `@deepseek-ai/*` peer dependencies for the same reason. `engines.dsh` is `>=0.2.0-rc.1 <0.3.0-0` so current 0.2 prereleases match and 0.3 prereleases do not ([publish guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish), [market index](https://www.dsh-remote.com/notes/implemented/feature/2026-10-02-plugin-market-index-format)).

| MCP tool | Name inside DSH |
|---|---|
| `memory_search` | `mcp__compound-memory__memory_search` |
| `memory_get` | `mcp__compound-memory__memory_get` |
| `memory_write` | `mcp__compound-memory__memory_write` |
| `memory_link` | `mcp__compound-memory__memory_link` |
| `memory_feedback` | `mcp__compound-memory__memory_feedback` |

`memory_search` returns an object whose `hits` field is an array.

## Install

Requires the [`dsh`](https://deepseek-harness.github.io/deepseek-harness/en/guide/) CLI and `uv` / `uvx` on the `PATH` of the process that starts `dsh`. The first `uvx` run needs network access to fetch `compound-memory` from PyPI. `uv` supplies the tool's Python; a system Python is not required.

npm 0.1.0 is already on the registry:

```bash
dsh plugin --profile web add dsh-compound-memory
```

From GitHub:

```bash
dsh plugin --profile web add github:chinwe/dsh-compound-memory
```

From a checkout of this repository (the plugin root, not a subdirectory):

```bash
dsh plugin --profile web add /absolute/path/to/dsh-compound-memory
```

Git install does not need `allowBuilds`: the package has no `prepare` script. Restart `dsh`. `dsh --profile web --dump-config` should show a `# == dsh-compound-memory` layer and the `mcp-compound-memory` row.

If the store does not exist yet:

```bash
uvx --from compound-memory compound-memory init
```

## Environment

Set these on the process that launches `dsh`. The patch reads them with `!!js` when config loads. Unset or blank uses the default. Nothing here is a secret. The stdio child starts from a scrubbed parent environment; configured `env` is merged on top.

| Variable | Default when unset or blank |
|---|---|
| `COMPOUND_MEMORY_AGENT_ID` | `agent-dsh` |
| `COMPOUND_MEMORY_ROOT` | `$HOME/.agents/memory` (optional; the Python server expands a leading `$HOME` or `~`) |

`agent-dsh` is this host's stable id. Set `COMPOUND_MEMORY_AGENT_ID` before starting `dsh` when this process should be a different host. A later patch layer replaces the whole `config`. To point `command` at an absolute `uvx`, restate the row in `~/.dsh/profiles/web/cordis.patch.yml` (same fields: `serverName`, `transport`, `command`, `args`, `env`, `failOnStartupError`).

## Skill

Usage for the five tools is [`skills/compound-memory/SKILL.md`](skills/compound-memory/SKILL.md). On a non-trivial task, call `memory_search` first. After a hit is actually used, call `memory_feedback` with `agent` set to `agent-dsh` (or whatever `COMPOUND_MEMORY_AGENT_ID` is). Write only stable facts.

DSH does not load that file from inside the npm package. The filesystem provider only sees direct children of a skill root (`<root>/<name>/SKILL.md`), not a nested `skills/` tree ([skills subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)). Copy or symlink the directory onto one of those roots, for example `~/.dsh/skills/compound-memory`.

## 中文

这是 DeepSeek Harness 的配置层 bundle，用 `uvx --from compound-memory compound-memory-server` 拉起 PyPI 上已有的 [compound-memory](https://pypi.org/project/compound-memory/) MCP server。不在 JS 里重写记忆，不增加第 6 个 MCP tool。server 内没有 LLM（[ADR-0001](https://github.com/chinwe/compound-memory)），这个 wrapper 也不加。没有 install、lifecycle 或 `postinstall` 脚本。

根上的 `package.json` 声明 `dsh.bundle.patch` = `./cordis.patch.yml`，只插入宿主自带的 [`@deepseek-ai/dsh-mcp-client`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) 一行。不要单独安装这个 client：DSH 0.2 已经带了匹配版本，另装 0.1 会对不上（[讨论 #8202](https://github.com/deepseek-ai/deepseek-harness/discussions/8202)）。因此本包不声明 `@deepseek-ai/*` peer。`engines.dsh` 为 `>=0.2.0-rc.1 <0.3.0-0`，当前 0.2 预发布能匹配，0.3 预发布不能（[发布指南](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)、[市场索引格式](https://www.dsh-remote.com/notes/implemented/feature/2026-10-02-plugin-market-index-format)）。

DSH 里的工具名是 `mcp__compound-memory__memory_search`、`memory_get`、`memory_write`、`memory_link`、`memory_feedback`（前缀相同）。`memory_search` 的返回体含 `hits` 数组。

## 安装

需要 [`dsh`](https://deepseek-harness.github.io/deepseek-harness/en/guide/) CLI，以及启动 `dsh` 的那个进程的 `PATH` 上有 `uv` / `uvx`。第一次 `uvx` 要从 PyPI 拉 `compound-memory`，需要网络。Python 由 `uv` 自己准备，不要求系统里先装 Python。

npm 上已有 0.1.0：

```bash
dsh plugin --profile web add dsh-compound-memory
```

从 GitHub 安装：

```bash
dsh plugin --profile web add github:chinwe/dsh-compound-memory
```

用本仓库检出（插件根就是仓库根，不要指子目录）：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-compound-memory
```

Git 安装不需要 `allowBuilds`：没有 `prepare` 脚本。装完重启 `dsh`。`dsh --profile web --dump-config` 应出现 `# == dsh-compound-memory` 层和 `mcp-compound-memory` 行。

记忆库还不存在时先初始化：

```bash
uvx --from compound-memory compound-memory init
```

## 环境变量

写在启动 `dsh` 的环境里。patch 在加载配置时用 `!!js` 读取；未设置或空白才用默认值。这里没有密钥。stdio 子进程从清洗过的父环境启动，配置里的 `env` 再叠上去。

| 变量 | 未设置或空白时的默认值 |
|---|---|
| `COMPOUND_MEMORY_AGENT_ID` | `agent-dsh` |
| `COMPOUND_MEMORY_ROOT` | `$HOME/.agents/memory`（可选；Python server 会展开开头的 `$HOME` 或 `~`） |

`agent-dsh` 是这个宿主的稳定 id。这个进程要当成别的宿主时，启动 `dsh` 之前设置 `COMPOUND_MEMORY_AGENT_ID`。后一层 patch 会整行替换 `config`。要把 `command` 改成 `uvx` 的绝对路径，就在 `~/.dsh/profiles/web/cordis.patch.yml` 里按 id 重写整行（字段仍是 `serverName`、`transport`、`command`、`args`、`env`、`failOnStartupError`）。

## Skill

五个工具怎么用见 [`skills/compound-memory/SKILL.md`](skills/compound-memory/SKILL.md)。非琐碎任务先 `memory_search`。实际采纳命中后，用 `agent` `agent-dsh`（或当前的 `COMPOUND_MEMORY_AGENT_ID`）调 `memory_feedback`。只写稳定事实。

DSH 不会因为文件在 npm 包里就加载它。文件系统 provider 只看 skill 根的直接子项（`<根>/<name>/SKILL.md`），不递归扫包内的 `skills/`（[skills 子系统](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)）。把该目录复制或软链到其中一个根，例如 `~/.dsh/skills/compound-memory`。
