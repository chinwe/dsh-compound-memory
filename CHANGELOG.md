# Changelog

## 0.1.6 - 2026-10-25

Aligns with compound-memory 0.5.11 on PyPI (write-lock, confidence, and full uuid id fixes on the Python side). Main has no functional commits since 0.1.5, so this is a version alignment bump for marketplace refresh. The bundled skill is unchanged. The bundle still launches unpinned `compound-memory` via `uvx --from compound-memory compound-memory-server`. No new MCP tool, no install, lifecycle, or `postinstall` scripts, and no server LLM (ADR-0001).

- `index.js` and `cordis.patch.yml` are unchanged. The MCP row is still stdio `uvx` with `--from` `compound-memory`, not pinned to `==0.5.11`.
- README install lines now say package version 0.1.6.

## 0.1.5 - 2026-10-22

Aligns with compound-memory 0.5.10 on PyPI (CLI `maintain`: dream → optional decay → health-snapshot). The bundled skill is refreshed from upstream tag `v0.5.10` (`skills/compound-memory/SKILL.md`). The bundle still launches unpinned `compound-memory` via `uvx --from compound-memory compound-memory-server`. No new MCP tool, no install, lifecycle, or `postinstall` scripts, and no server LLM (ADR-0001).

- `index.js` and `cordis.patch.yml` are unchanged. The MCP row is still stdio `uvx` with `--from` `compound-memory`, not pinned to `==0.5.10`.
- README install lines now say package version 0.1.5.

## 0.1.4 - 2026-10-19

Mount the bundled skill so `/compound-memory` is discovered after install or upgrade and a restart. No manual copy or symlink. No new MCP tool, no install, lifecycle, or `postinstall` scripts, and no server LLM (ADR-0001). The once-per-session reminder is unchanged.

- `cordis.patch.yml` still inserts `mcp-compound-memory` and `compound-memory-rules`. It also inserts `compound-memory-skill` (`@deepseek-ai/dsh-skill-filesystem`, `providerName: compound-memory`, `includeDefaultRoots: false`). `bundledSkillDir` joins `skills` onto the directory of `createRequire(baseUrl).resolve('dsh-compound-memory/package.json')`.
- `exports` now includes `./package.json`. An `exports` map that only names `"."` makes that resolve throw `ERR_PACKAGE_PATH_NOT_EXPORTED`. `exports["."]` is still `./index.js`. `skills/` stays in `files`.
- A symlink left on a project or user skill root can stay. The registry keeps one `compound-memory` name; those roots outrank the bundled root.

## 0.1.3 - 2026-10-18

Aligns with compound-memory 0.5.9 on PyPI (`dream --propose`, same-host success cap, health-snapshot/trend). The bundle still launches unpinned `compound-memory` via `uvx --from compound-memory compound-memory-server`. No new MCP tool, no install, lifecycle, or `postinstall` scripts, and no server LLM (ADR-0001).

- `index.js` and `cordis.patch.yml` are unchanged. The MCP row is still stdio `uvx` with `--from` `compound-memory`, not pinned to `==0.5.9`.
- README install lines now say package version 0.1.3.

## 0.1.2 - 2026-10-18

Host-side usage reminder, same job as the Claude Code SessionStart hook in chinwe/compound-memory#92. Still no server LLM (ADR-0001), no sixth MCP tool, and no install, lifecycle, or `postinstall` scripts.

- `index.js` is a Cordis plugin (`compound-memory-rules`). On `agent/pre-step` it appends one short English reminder on the first eligible `enter` of a live agent, then not again. A session log that already has the reminder is left alone.
- The message source kind is `plugin:dsh-compound-memory`. Session format v4 rejects the retired `kind: 'plugin'` wrapper and fails the turn.
- `cordis.patch.yml` still inserts `mcp-compound-memory` (`@deepseek-ai/dsh-mcp-client`, stdio, `uvx --from compound-memory compound-memory-server`). It also inserts `compound-memory-rules` (`dsh-compound-memory`).
- Disable only the reminder with a later patch row `- id: compound-memory-rules` / `disabled: true`. Copying the skill onto a skill root is still optional.
- No `@deepseek-ai/*` dependency. The plugin uses the `ctx` Cordis passes in and does not import the MCP client.

## 0.1.1 - 2026-10-18

README sync only.

## 0.1.0 - 2026-10-18

Config-only DeepSeek Harness bundle published to npm as `dsh-compound-memory@0.1.0`. No install, lifecycle, or `postinstall` scripts. No extra MCP tool.

- `cordis.patch.yml` inserts one in-box `@deepseek-ai/dsh-mcp-client` row and starts `uvx --from compound-memory compound-memory-server` over stdio.
- `engines.dsh` is `>=0.2.0-rc.1 <0.3.0-0`.
- When unset or blank, `COMPOUND_MEMORY_AGENT_ID` defaults to `agent-dsh` and `COMPOUND_MEMORY_ROOT` defaults to `$HOME/.agents/memory`.
- Usage notes ship in `skills/compound-memory/SKILL.md`. Copy or symlink that directory onto a skill root such as `~/.dsh/skills/compound-memory`. DSH does not load the file from inside the package.
- MIT license.
