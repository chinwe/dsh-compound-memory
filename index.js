/**
 * Once-per-session usage reminder for compound-memory on DeepSeek Harness.
 *
 * Cordis loads this module by package name (`dsh-compound-memory`) and calls
 * `apply`. This file does not import `@deepseek-ai/cordis` or
 * `@deepseek-ai/dsh-mcp-client`. The host passes `ctx`. A peer pin is only
 * for a package whose instance the plugin must share, and a dependency on
 * the MCP client would risk installing the mismatched 0.1 client. The stdio
 * server is still the `mcp-compound-memory` row in `cordis.patch.yml`.
 *
 * Session format v4 rejects `source.kind === 'plugin'` and fails the turn
 * (deepseek-ai/deepseek-harness#8432). `SOURCE_KIND` is the producer-owned
 * form the v3→v4 rewriter's `producerKind()` fallback would write.
 *
 * @module dsh-compound-memory
 */

import { randomUUID } from 'node:crypto'

/** Cordis plugin name. The patch row id is the same string. */
export const name = 'compound-memory-rules'

/**
 * Producer-owned source kind for the injected reminder.
 * DSH 0.2 session format v4 admits this and refuses the retired
 * `{ kind: 'plugin', plugin }` wrapper.
 */
export const SOURCE_KIND = 'plugin:dsh-compound-memory'

/**
 * Hard rules only. Same job as the Claude Code SessionStart hook
 * (chinwe/compound-memory#92): factual, no store read, no model call.
 * Keep this at or under 400 characters.
 */
export const RULES = 'compound-memory: COMPOUND_MEMORY_AGENT_ID defaults to agent-dsh (overridable); pass that same id as source and agent. memory_search before non-trivial work; memory_feedback after an adopted hit compounds the store. In a repo, prefer project-scoped memories. Five MCP tools only, named mcp__compound-memory__memory_*; this package does not reimplement them.'

if (RULES.length > 400) {
  throw new Error(`dsh-compound-memory rules are ${RULES.length} characters; the limit is 400`)
}

function isObject(value) {
  return value !== null && (typeof value === 'object' || typeof value === 'function')
}

function isRulesMessage(message) {
  const source = message?.source
  if (!isObject(source)) return false
  if (source.kind === SOURCE_KIND) return true
  // A log rewritten from the retired v3 wrapper still counts as injected.
  return source.kind === 'plugin' && source.plugin === 'dsh-compound-memory'
}

function listEvents(agent) {
  const events = agent?.session?.events
  if (Array.isArray(events)) return events
  if (isObject(events) && typeof events[Symbol.iterator] === 'function') return [...events]
  return []
}

function hasPriorInjection(agent, messages) {
  try {
    if (Array.isArray(messages)) {
      for (let index = messages.length - 1; index >= 0; index -= 1) {
        if (isRulesMessage(messages[index])) return true
      }
    }
    const events = listEvents(agent)
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index]
      if (event?.type === 'user/message' && isRulesMessage(event.data)) return true
    }
    return false
  } catch {
    return false
  }
}

function rulesMessage() {
  return {
    id: randomUUID(),
    role: 'user',
    content: [{ type: 'text', text: RULES }],
    source: { kind: SOURCE_KIND, form: 'instructions' },
  }
}

/**
 * Register one prepended `agent/pre-step` listener.
 * The first eligible `enter` of a live agent gets the reminder. Later steps
 * do not. A new agent object for a session that already has the reminder in
 * its log (resume, process restart) does not get a second copy.
 * @param {{ on: Function }} ctx host context; only `ctx.on` is used
 */
export function apply(ctx) {
  const seenAgents = new WeakSet()
  let anonymousSeen = false

  const remembered = (agent) => {
    if (!isObject(agent)) return anonymousSeen
    return seenAgents.has(agent)
  }

  const remember = (agent) => {
    if (!isObject(agent)) {
      anonymousSeen = true
      return
    }
    seenAgents.add(agent)
  }

  ctx.on('agent/pre-step', async ({ agent, signal }, next) => {
    const decision = await next()
    if (decision?.kind !== 'enter' || signal?.aborted) return decision
    if (remembered(agent) || hasPriorInjection(agent, decision.messages)) {
      remember(agent)
      return decision
    }
    remember(agent)
    const messages = Array.isArray(decision.messages) ? decision.messages : []
    return {
      ...decision,
      messages: [...messages, rulesMessage()],
    }
  }, { prepend: true })
}
