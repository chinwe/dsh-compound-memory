import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { RULES, SOURCE_KIND, apply, name } from '../index.js'

function host() {
  const listeners = []
  return {
    listeners,
    on(event, fn, options) {
      listeners.push({ event, fn, options })
      return () => {}
    },
  }
}

function enter(messages = [{ role: 'user', content: [{ type: 'text', text: 'hello' }] }]) {
  return { kind: 'enter', messages, assembly: { kept: true } }
}

test('rules stay within the Claude hook budget and name the DSH facts', () => {
  assert.equal(RULES.length, 356)
  assert.match(RULES, /COMPOUND_MEMORY_AGENT_ID defaults to agent-dsh/)
  assert.match(RULES, /source and agent/)
  assert.match(RULES, /memory_search before non-trivial work/)
  assert.match(RULES, /memory_feedback after an adopted hit compounds the store/)
  assert.match(RULES, /prefer project-scoped memories/)
  assert.match(RULES, /Five MCP tools only/)
  assert.match(RULES, /mcp__compound-memory__memory_\*/)
  assert.match(RULES, /does not reimplement them/)
  assert.equal(name, 'compound-memory-rules')
  assert.equal(SOURCE_KIND, 'plugin:dsh-compound-memory')
})

test('apply prepends one agent/pre-step listener', () => {
  const ctx = host()
  apply(ctx)
  assert.equal(ctx.listeners.length, 1)
  assert.equal(ctx.listeners[0].event, 'agent/pre-step')
  assert.deepEqual(ctx.listeners[0].options, { prepend: true })
})

test('the first eligible enter injects once and later steps do not', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = { id: 'session-1', session: { events: [] } }
  let scans = 0
  agent.session.events = {
    *[Symbol.iterator]() {
      scans += 1
    },
  }

  const first = await listener({ agent, signal: new AbortController().signal }, async () => enter())
  assert.equal(first.kind, 'enter')
  assert.equal(first.assembly.kept, true)
  assert.equal(first.messages.length, 2)
  assert.deepEqual(first.messages[0], enter().messages[0])
  const injected = first.messages[1]
  assert.equal(injected.role, 'user')
  assert.equal(typeof injected.id, 'string')
  assert.ok(injected.id.length > 0)
  assert.deepEqual(injected.content, [{ type: 'text', text: RULES }])
  assert.deepEqual(injected.source, { kind: SOURCE_KIND, form: 'instructions' })
  assert.equal(scans, 1)

  const second = await listener(
    { agent, signal: new AbortController().signal },
    async () => enter([{ role: 'user', content: [{ type: 'text', text: 'next' }] }]),
  )
  assert.equal(second.messages.length, 1)
  assert.equal(second.messages[0].content[0].text, 'next')
  assert.equal(scans, 1)
})

test('a rejected or aborted step does not consume the one injection', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = { id: 'session-2', session: { events: [] } }

  const rejected = await listener({ agent, signal: undefined }, async () => ({ kind: 'reject' }))
  assert.deepEqual(rejected, { kind: 'reject' })

  const controller = new AbortController()
  controller.abort()
  const aborted = await listener({ agent, signal: controller.signal }, async () => enter())
  assert.equal(aborted.messages.length, 1)

  const entered = await listener({ agent, signal: new AbortController().signal }, async () => enter())
  assert.equal(entered.messages.length, 2)
  assert.equal(entered.messages[1].source.kind, SOURCE_KIND)
})

test('a resumed session that already has the reminder is not injected again', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = {
    id: 'session-3',
    session: {
      events: [
        { type: 'user/message', data: { role: 'user', source: { kind: 'user' }, content: [] } },
        {
          type: 'user/message',
          data: {
            role: 'user',
            content: [{ type: 'text', text: RULES }],
            source: { kind: SOURCE_KIND, form: 'instructions' },
          },
        },
      ],
    },
  }

  const decision = await listener({ agent, signal: undefined }, async () => enter())
  assert.equal(decision.messages.length, 1)

  const again = await listener({ agent, signal: undefined }, async () => enter())
  assert.equal(again.messages.length, 1)
})

test('a retired plugin source in the log still counts as already injected', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = {
    session: {
      events: [{
        type: 'user/message',
        data: { source: { kind: 'plugin', plugin: 'dsh-compound-memory' } },
      }],
    },
  }
  const decision = await listener({ agent }, async () => enter())
  assert.equal(decision.messages.length, 1)
})

test('another plugin source does not suppress the reminder', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = {
    session: {
      events: [{
        type: 'user/message',
        data: { source: { kind: 'plugin', plugin: 'someone-else' } },
      }],
    },
  }
  const decision = await listener({ agent }, async () => enter())
  assert.equal(decision.messages.length, 2)
  assert.equal(decision.messages[1].source.kind, SOURCE_KIND)
})

test('an unreadable session log does not fail the turn', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const agent = {}
  Object.defineProperty(agent, 'session', {
    get() {
      throw new Error('session unavailable')
    },
  })
  const decision = await listener({ agent }, async () => enter())
  assert.equal(decision.kind, 'enter')
  assert.equal(decision.messages.length, 2)
})

test('each live agent is reminded once', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const first = await listener(
    { agent: { id: 'a', session: { events: [] } } },
    async () => enter(),
  )
  const second = await listener(
    { agent: { id: 'b', session: { events: [] } } },
    async () => enter(),
  )
  assert.equal(first.messages.length, 2)
  assert.equal(second.messages.length, 2)
  assert.notEqual(first.messages[1].id, second.messages[1].id)
})

test('a reminder already in this step is not duplicated', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const prior = {
    id: 'already',
    role: 'user',
    content: [{ type: 'text', text: RULES }],
    source: { kind: SOURCE_KIND, form: 'instructions' },
  }
  const decision = await listener(
    { agent: { session: { events: [] } } },
    async () => enter([prior]),
  )
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0], prior)
})

test('missing messages still produce one reminder', async () => {
  const ctx = host()
  apply(ctx)
  const listener = ctx.listeners[0].fn
  const decision = await listener({ agent: { session: { events: [] } } }, async () => ({ kind: 'enter' }))
  assert.equal(decision.messages.length, 1)
  assert.equal(decision.messages[0].content[0].text, RULES)
})

test('package manifest stays free of DeepSeek runtime dependencies', () => {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.version, '0.1.4')
  assert.equal(manifest.type, 'module')
  assert.equal(manifest.main, './index.js')
  assert.equal(manifest.exports['.'], './index.js')
  assert.equal(manifest.exports['./package.json'], './package.json')
  assert.ok(manifest.files.includes('index.js'))
  assert.ok(manifest.files.includes('cordis.patch.yml'))
  assert.ok(manifest.files.includes('skills'))
  assert.equal(manifest.dependencies, undefined)
  assert.equal(manifest.peerDependencies, undefined)
  assert.equal(manifest.optionalDependencies, undefined)
  assert.equal(manifest.scripts?.postinstall, undefined)
  assert.equal(manifest.scripts?.prepare, undefined)
  assert.equal(manifest.scripts?.install, undefined)
  assert.equal(manifest.engines.dsh, '>=0.2.0-rc.1 <0.3.0-0')
})

test('the patch keeps the MCP stdio row and adds the rules plugin', () => {
  const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(patch, /id: mcp-compound-memory/)
  assert.match(patch, /name: '@deepseek-ai\/dsh-mcp-client'/)
  assert.match(patch, /serverName: compound-memory/)
  assert.match(patch, /transport: stdio/)
  assert.match(patch, /command: uvx/)
  assert.match(patch, /- '--from'/)
  assert.match(patch, /- compound-memory/)
  assert.match(patch, /- compound-memory-server/)
  assert.match(patch, /COMPOUND_MEMORY_AGENT_ID: !!js "process\.env\.COMPOUND_MEMORY_AGENT_ID \|\| 'agent-dsh'"/)
  assert.match(patch, /failOnStartupError: true/)
  assert.match(patch, /id: compound-memory-rules/)
  assert.match(patch, /name: dsh-compound-memory/)
  assert.match(patch, /id: compound-memory-skill/)
  assert.match(patch, /name: '@deepseek-ai\/dsh-skill-filesystem'/)
  assert.match(patch, /providerName: compound-memory/)
  assert.match(patch, /includeDefaultRoots: false/)
  assert.match(patch, /createRequire\(baseUrl\)\.resolve\('dsh-compound-memory\/package\.json'\)/)
  assert.match(patch, /bundledSkillDir: !!js process\.getBuiltinModule\('node:path'\)\.join\(process\.getBuiltinModule\('node:path'\)\.dirname\(process\.getBuiltinModule\('node:module'\)\.createRequire\(baseUrl\)\.resolve\('dsh-compound-memory\/package\.json'\)\), 'skills'\)/)
  assert.doesNotMatch(patch, /postinstall/)
  assert.doesNotMatch(patch, /bundledSkillDir:.*process\.cwd/)
})

test('bundledSkillDir resolves the installed package skills directory', () => {
  const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  const expr = patch.match(/bundledSkillDir:\s*!!js\s*(.+)$/m)?.[1]
  assert.equal(
    expr,
    "process.getBuiltinModule('node:path').join(process.getBuiltinModule('node:path').dirname(process.getBuiltinModule('node:module').createRequire(baseUrl).resolve('dsh-compound-memory/package.json')), 'skills')",
  )
  if (process.platform === 'win32') return

  const root = fileURLToPath(new URL('..', import.meta.url))
  const profile = mkdtempSync(join(tmpdir(), 'dsh-compound-memory-'))
  try {
    mkdirSync(join(profile, 'node_modules'))
    symlinkSync(root, join(profile, 'node_modules', 'dsh-compound-memory'), 'dir')
    const dir = new Function('baseUrl', `return ${expr}`)(`${profile}/`)
    assert.equal(realpathSync(dir), realpathSync(join(root, 'skills')))
    assert.equal(existsSync(join(dir, 'compound-memory', 'SKILL.md')), true)
  } finally {
    rmSync(profile, { recursive: true, force: true })
  }
})
