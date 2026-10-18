# Contributing

This repository is a config-only DeepSeek Harness bundle. It has no install, lifecycle, or `postinstall` scripts. Do not add any. Do not add a sixth MCP tool.

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

Restart `dsh`. `dsh --profile web --dump-config` should show a `# == dsh-compound-memory` layer and the `mcp-compound-memory` row.

Do not run `npm publish` from a pull request.

## 贡献

这是配置层 bundle。不要添加 install、lifecycle 或 `postinstall` 脚本，也不要新增第 6 个 MCP tool。

从 Git 安装：

```bash
dsh plugin --profile web add github:chinwe/dsh-compound-memory
```

没有 `prepare` 脚本，不需要 `allowBuilds`。

从本地检出安装（仓库根就是插件根，不要指子目录）：

```bash
dsh plugin --profile web add /absolute/path/to/dsh-compound-memory
```

装完重启 `dsh`。不要在 pull request 里执行 `npm publish`。
