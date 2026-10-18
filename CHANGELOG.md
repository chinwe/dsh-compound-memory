# Changelog

## 0.1.0 - 2026-10-18

Config-only DeepSeek Harness bundle published to npm as `dsh-compound-memory@0.1.0`. No install, lifecycle, or `postinstall` scripts. No extra MCP tool.

- `cordis.patch.yml` inserts one in-box `@deepseek-ai/dsh-mcp-client` row and starts `uvx --from compound-memory compound-memory-server` over stdio.
- `engines.dsh` is `>=0.2.0-rc.1 <0.3.0-0`.
- When unset or blank, `COMPOUND_MEMORY_AGENT_ID` defaults to `agent-dsh` and `COMPOUND_MEMORY_ROOT` defaults to `$HOME/.agents/memory`.
- Usage notes ship in `skills/compound-memory/SKILL.md`. Copy or symlink that directory onto a skill root such as `~/.dsh/skills/compound-memory`. DSH does not load the file from inside the package.
- MIT license.
