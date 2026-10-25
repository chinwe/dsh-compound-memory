# dsh-compound-memory

[![npm version](https://img.shields.io/npm/v/dsh-compound-memory.svg)](https://www.npmjs.com/package/dsh-compound-memory)

English | [中文](#中文)

DeepSeek Harness bundle that launches the existing [compound-memory](https://pypi.org/project/compound-memory/) MCP server (`uvx --from compound-memory compound-memory-server`), mounts the bundled `skills/compound-memory` skill, and injects a short once-per-session usage reminder. It does not reimplement memory, it does not add a sixth MCP tool, and the server still has no LLM ([ADR-0001](https://github.com/chinwe/compound-memory)). This wrapper adds none. There are no install, lifecycle, or `postinstall` scripts.

`package.json` declares `dsh.bundle.patch` = `./cordis.patch.yml`. That file inserts three rows: the in-box [`@deepseek-ai/dsh-mcp-client`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) row (`mcp-compound-memory`), this package's own plugin (`compound-memory-rules` → `dsh-compound-memory` → `index.js`), and an in-box [`@deepseek-ai/dsh-skill-filesystem`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md) row (`compound-memory-skill`) whose only root is this package's `skills/`. Do not install that client yourself: DSH 0.2 already ships it, and a separately installed 0.1 client will not match ([discussion #8202](https://github.com/deepseek-ai/deepseek-harness/discussions/8202)). This package declares no `@deepseek-ai/*` dependencies. The rules module does not import `@deepseek-ai/cordis` or the MCP client: Cordis calls `apply(ctx)`, and the [publish guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish) says to pin a peer only when the plugin must share that package's instance. `engines.dsh` is `>=0.2.0-rc.1 <0.3.0-0` so current 0.2 prereleases match and 0.3 prereleases do not ([publish guide](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish), [market index](https://www.dsh-remote.com/notes/implemented/feature/2026-10-02-plugin-market-index-format)).

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

Package version 0.1.7, published on npm as [`dsh-compound-memory`](https://www.npmjs.com/package/dsh-compound-memory):

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

Git install does not need `allowBuilds`: the package has no `prepare` script. Restart `dsh`. `dsh --profile web --dump-config` should show a `# == dsh-compound-memory` layer and the `mcp-compound-memory`, `compound-memory-rules`, and `compound-memory-skill` rows.

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

## Usage reminder

`compound-memory-rules` listens on `agent/pre-step` with `{ prepend: true }`. On the first eligible `enter` of a live agent (the decision is `enter` and the step signal is not aborted) it appends one user-role message. Later steps of that agent do not append it again. A new agent object whose session log already contains the reminder (resume, or this process restarted) does not get a second copy. The listener does not read the memory store and does not call a model (ADR-0001).

The message text is `RULES` in [`index.js`](index.js) (356 characters, under the 400-character Claude SessionStart budget). It states:

- `COMPOUND_MEMORY_AGENT_ID` defaults to `agent-dsh` (overridable); pass that same id as `source` and `agent`
- `memory_search` before non-trivial work; `memory_feedback` after an adopted hit compounds the store
- in a repo, prefer project-scoped memories
- five MCP tools only, named `mcp__compound-memory__memory_*`; this package does not reimplement them

The source is `{ kind: 'plugin:dsh-compound-memory', form: 'instructions' }`, and the message has a fresh `id`. Session format v4 rejects the retired `{ kind: 'plugin', plugin }` wrapper and fails the whole turn ([discussion #8432](https://github.com/deepseek-ai/deepseek-harness/discussions/8432)). `plugin:dsh-compound-memory` is the producer-owned kind the v3→v4 rewriter would derive for this package. A static `systemPrompt.section` was not required: pre-step accepts the message, and injecting once keeps it out of every later step.

### Disable the reminder

Stop only the reminder. In the profile patch (`~/.dsh/profiles/web/cordis.patch.yml`) or the home patch (`$DSH_HOME/cordis.patch.yml`), add:

```yaml
- id: compound-memory-rules
  disabled: true
```

A later layer addresses the row by id. `disabled: true` stops that loader entry. `mcp-compound-memory` is a different id and still launches `uvx`. `compound-memory-skill` is a different id and still mounts the bundled skill. `dsh plugin --profile web remove dsh-compound-memory` removes all three rows.

### Verify

`dsh --profile web --dump-config` shows `mcp-compound-memory`, `compound-memory-rules`, and `compound-memory-skill` under `# == dsh-compound-memory`.

Start a new session and send one message. The transcript should contain one user-role reminder whose `source.kind` is `plugin:dsh-compound-memory` and whose text starts with `compound-memory:`. A later step in that same session should not add another copy. `node --test` in this repository checks the listener without booting DSH.

## Skill

Usage for the five tools is [`skills/compound-memory/SKILL.md`](skills/compound-memory/SKILL.md). The injected reminder is the short hard rules. The skill is the long-form source. On a non-trivial task, call `memory_search` first. After a hit is actually used, call `memory_feedback` with `agent` set to `agent-dsh` (or whatever `COMPOUND_MEMORY_AGENT_ID` is). Write only stable facts.

`compound-memory-skill` mounts that directory. The row names the in-box `@deepseek-ai/dsh-skill-filesystem` provider, with `providerName: compound-memory` and `includeDefaultRoots: false`, so this provider does not scan project or user skill roots. `bundledSkillDir` is a `!!js` expression: join `skills` onto the directory of `createRequire(baseUrl).resolve('dsh-compound-memory/package.json')`. `baseUrl` is the DSH profile, so the path is the installed package and not the process cwd. `exports` includes `./package.json` because a map that only names `"."` makes that resolve throw `ERR_PACKAGE_PATH_NOT_EXPORTED`. `exports["."]` is still `./index.js`.

After install or upgrade, restart `dsh`. `/compound-memory` loads the bundled skill. A manual copy or symlink is no longer required. One already on a skill root can stay. The registry keeps a single `compound-memory` name: within one layer the lower rank wins, and project or user roots (ranks 100–500) outrank this bundled root (rank 600) ([skills subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)). The reminder does not load the skill, and the skill does not replace the reminder.

## 中文

这是 DeepSeek Harness 的 bundle，用 `uvx --from compound-memory compound-memory-server` 拉起 PyPI 上已有的 [compound-memory](https://pypi.org/project/compound-memory/) MCP server，挂载随包的 `skills/compound-memory` 技能，并在每个会话第一次进入模型步骤时注入一段短的使用提醒。不在 JS 里重写记忆，不增加第 6 个 MCP tool。server 内没有 LLM（[ADR-0001](https://github.com/chinwe/compound-memory)），这个 wrapper 也不加。没有 install、lifecycle 或 `postinstall` 脚本。

根上的 `package.json` 声明 `dsh.bundle.patch` = `./cordis.patch.yml`，插入三行：宿主自带的 [`@deepseek-ai/dsh-mcp-client`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md)（`mcp-compound-memory`），本包自己的插件（`compound-memory-rules` → `dsh-compound-memory` → `index.js`），以及宿主自带的 [`@deepseek-ai/dsh-skill-filesystem`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md)（`compound-memory-skill`），它的唯一根是本包的 `skills/`。不要单独安装这个 client：DSH 0.2 已经带了匹配版本，另装 0.1 会对不上（[讨论 #8202](https://github.com/deepseek-ai/deepseek-harness/discussions/8202)）。因此本包不声明任何 `@deepseek-ai/*` 依赖。规则模块不 import `@deepseek-ai/cordis`，也不 import MCP client：Cordis 调用 `apply(ctx)`；[发布指南](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish) 只要求在必须和宿主共享同一实例时才 pin peer。`engines.dsh` 为 `>=0.2.0-rc.1 <0.3.0-0`，当前 0.2 预发布能匹配，0.3 预发布不能（[发布指南](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish)、[市场索引格式](https://www.dsh-remote.com/notes/implemented/feature/2026-10-02-plugin-market-index-format)）。

DSH 里的工具名是 `mcp__compound-memory__memory_search`、`memory_get`、`memory_write`、`memory_link`、`memory_feedback`（前缀相同）。`memory_search` 的返回体含 `hits` 数组。

## 安装

需要 [`dsh`](https://deepseek-harness.github.io/deepseek-harness/en/guide/) CLI，以及启动 `dsh` 的那个进程的 `PATH` 上有 `uv` / `uvx`。第一次 `uvx` 要从 PyPI 拉 `compound-memory`，需要网络。Python 由 `uv` 自己准备，不要求系统里先装 Python。

包版本 0.1.7，npm 包名为 [`dsh-compound-memory`](https://www.npmjs.com/package/dsh-compound-memory)：

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

Git 安装不需要 `allowBuilds`：没有 `prepare` 脚本。装完重启 `dsh`。`dsh --profile web --dump-config` 应出现 `# == dsh-compound-memory` 层，以及 `mcp-compound-memory`、`compound-memory-rules`、`compound-memory-skill` 三行。

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

## 使用提醒

`compound-memory-rules` 以 `{ prepend: true }` 听 `agent/pre-step`。某个 agent 第一次合格的 `enter`（决定是 `enter`，且该步的 signal 未 abort）追加一条 user 消息。这个 agent 之后的步骤不再追加。新的 agent 对象如果会话日志里已经有这条提醒（resume，或进程重启后），不会再追加第二条。监听器不读记忆库，也不调用模型（ADR-0001）。

正文是 [`index.js`](index.js) 里的 `RULES`（356 字符，短于 Claude SessionStart 的 400 字符上限）。内容是：`COMPOUND_MEMORY_AGENT_ID` 默认 `agent-dsh`（可覆盖），`source` 和 `agent` 传同一个 id；非琐碎工作前 `memory_search`；采纳命中后 `memory_feedback` 才让记忆库复利；在仓库里优先写项目作用域记忆；只有五个 MCP 工具，DSH 里的名字是 `mcp__compound-memory__memory_*`；本包不重写它们。

source 是 `{ kind: 'plugin:dsh-compound-memory', form: 'instructions' }`，并带新的 `id`。会话格式 v4 拒绝旧的 `{ kind: 'plugin', plugin }`，整轮会失败（[讨论 #8432](https://github.com/deepseek-ai/deepseek-harness/discussions/8432)）。`plugin:dsh-compound-memory` 是 v3→v4 重写器会给这个包推导出的产方 kind。不需要改成静态 `systemPrompt.section`：pre-step 能写入这条消息，每会话一次也不会在后续步骤里重复。

### 只关闭提醒

MCP server 继续跑，只停提醒。在 profile 的 patch（`~/.dsh/profiles/web/cordis.patch.yml`）或家目录 patch（`$DSH_HOME/cordis.patch.yml`）里加：

```yaml
- id: compound-memory-rules
  disabled: true
```

后一层按 id 定位这一行。`disabled: true` 停掉这个 loader 条目。`mcp-compound-memory` 是另一个 id，仍会拉起 `uvx`。`compound-memory-skill` 也是另一个 id，仍会挂载随包技能。`dsh plugin --profile web remove dsh-compound-memory` 会三行一起去掉。

### 核对

`dsh --profile web --dump-config` 在 `# == dsh-compound-memory` 下应看到 `mcp-compound-memory`、`compound-memory-rules` 和 `compound-memory-skill`。

开一个新会话发一条消息。记录里应有一条 user 提醒，`source.kind` 为 `plugin:dsh-compound-memory`，正文以 `compound-memory:` 开头。同一会话的后续步骤不应再追加一条。本仓库的 `node --test` 不启动 DSH，只检查这个监听器。

## Skill

五个工具怎么用见 [`skills/compound-memory/SKILL.md`](skills/compound-memory/SKILL.md)。注入的是短硬规则；skill 是完整用法。非琐碎任务先 `memory_search`。实际采纳命中后，用 `agent` `agent-dsh`（或当前的 `COMPOUND_MEMORY_AGENT_ID`）调 `memory_feedback`。只写稳定事实。

`compound-memory-skill` 挂载这个目录。这一行是宿主自带的 `@deepseek-ai/dsh-skill-filesystem`，`providerName` 为 `compound-memory`，`includeDefaultRoots: false`，因此这个 provider 不扫描项目或用户技能根。`bundledSkillDir` 是一段 `!!js`：对 `createRequire(baseUrl).resolve('dsh-compound-memory/package.json')` 所在目录再拼上 `skills`。`baseUrl` 是 DSH profile，所以路径指向已安装的包，而不是启动进程时的 cwd。`exports` 增加了 `./package.json`；如果映射里只有 `"."`，这次 resolve 会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`。`exports["."]` 仍是 `./index.js`。

安装或升级后重启 `dsh`，`/compound-memory` 就会加载随包技能。不再需要手动复制或软链。已经放在某个技能根上的副本可以留着。注册表里同名 `compound-memory` 只保留一份：同一层里 rank 更小的胜出，项目或用户根（rank 100–500）高于这个随包根（rank 600）（[skills 子系统](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/skills.md)）。提醒不会加载技能，技能也不代替提醒。
