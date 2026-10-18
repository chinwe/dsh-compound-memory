# Contributing

This repository is a DeepSeek Harness bundle. `cordis.patch.yml` launches the compound-memory stdio server and loads `index.js` (`compound-memory-rules`) for a once-per-session usage reminder. It has no install, lifecycle, or `postinstall` scripts. Do not add any. Do not add a `prepare` script. Do not add a sixth MCP tool, and do not add a dependency on `@deepseek-ai/dsh-mcp-client` or `@deepseek-ai/cordis`.

`node --test` checks the reminder listener, the 400-character budget, and that the MCP row is still the stdio `uvx` launch.

## Install from git

```bash
dsh plugin --profile web add github:chinwe/dsh-compound-memory
```

Git install does not need `allowBuilds`. There is no `prepare` script.

## Install from a local checkout

The plugin root is the repository root, not a subdirectory:

```bash
dsh plugin --profile web add /absolute/path/to/dsh-compound-memory
```

Restart `dsh`. `dsh --profile web --dump-config` should show a `# == dsh-compound-memory` layer, the `mcp-compound-memory` row, and the `compound-memory-rules` row.

Do not run `npm publish` from a pull request.

## 贡献

这是 DeepSeek Harness bundle。`cordis.patch.yml` 用 stdio 拉起 compound-memory，并加载 `index.js`（`compound-memory-rules`）做每会话一次的使用提醒。不要添加 install、lifecycle、`postinstall` 或 `prepare` 脚本，也不要新增第 6 个 MCP tool。不要依赖 `@deepseek-ai/dsh-mcp-client` 或 `@deepseek-ai/cordis`。

`node --test` 检查提醒监听器、400 字符上限，以及 MCP 行仍是 stdio 的 `uvx` 启动。

从 Git 安装：

```bash
dsh plugin --profile web add github:chinwe/dsh-compound-memory
```

没有 `prepare` 脚本，不需要 `allowBuilds`。

从本地检出安装（仓库根就是插件根，不要指子目录）：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-compound-memory
```

装完重启 `dsh`。`dsh --profile web --dump-config` 应出现 `# == dsh-compound-memory` 层、`mcp-compound-memory` 行和 `compound-memory-rules` 行。不要在 pull request 里执行 `npm publish`。
