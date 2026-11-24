import { createServer } from 'node:http'
import { homedir } from 'node:os'
import { join, basename } from 'node:path'
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { HOOK_PORT } from '../shared/defaults'
import type { ClaudeState } from '../shared/types'
import { store, uid } from './store'

interface Session {
  id: string
  task: string
  model: string
  ctxPct: number
  cost: number
  tokensIn: number
  tokensOut: number
  project: string
  phase: ClaudeState['phase']
  awaiting: ClaudeState['awaiting']
  updatedAt: number
}

const sessions = new Map<string, Session>()
let staleTimer: NodeJS.Timeout | null = null

function session(id: string): Session {
  let s = sessions.get(id)
  if (!s) {
    s = { id, task: '', model: '', ctxPct: 0, cost: 0, tokensIn: 0, tokensOut: 0, project: '', phase: 'idle', awaiting: null, updatedAt: Date.now() }
    sessions.set(id, s)
  }
  return s
}

function publish() {
  const all = [...sessions.values()]
  if (!all.length) {
    store.patch({ claude: { ...store.state.claude, connected: false, phase: 'idle', awaiting: null } })
    return
  }
  const pick = all.find((s) => s.awaiting) ?? all.sort((a, b) => b.updatedAt - a.updatedAt)[0]
  store.patch({
    claude: {
      connected: true,
      phase: pick.awaiting ? 'awaiting' : pick.phase,
      task: pick.task,
      model: pick.model,
      ctxPct: pick.ctxPct,
      cost: pick.cost,
      tokensIn: pick.tokensIn,
      tokensOut: pick.tokensOut,
      project: pick.project,
      awaiting: pick.awaiting,
      updatedAt: pick.updatedAt
    }
  })
}

const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : 0)
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

function onHook(p: any) {
  const id = String(p.session_id ?? 'default')
  const ev = String(p.hook_event_name ?? '')
  const s = session(id)
  s.updatedAt = Date.now()
  if (p.cwd) s.project = basename(String(p.cwd))

  switch (ev) {
    case 'UserPromptSubmit':
      s.phase = 'working'
      s.awaiting = null
      s.task = clip(String(p.prompt ?? '').replace(/\s+/g, ' ').trim(), 140)
      break
    case 'PermissionRequest':
    case 'Notification': {
      const msg = String(p.message ?? '')
      const isPerm = ev === 'PermissionRequest' || /permission|approv|aprov/i.test(msg)
      if (!isPerm) break
      const tool = String(p.tool_name ?? msg.match(/use (\w+)/i)?.[1] ?? 'ação')
      if (!s.awaiting) {
        store.emit({ type: 'alert', id: uid(), kind: 'claude-approval', title: 'Claude pede aprovação', body: tool, ms: 4500 })
      }
      s.awaiting = { tool, message: clip(msg || `Permissão para ${tool}`, 120), at: Date.now() }
      break
    }
    case 'PostToolUse':
    case 'PreToolUse':
      s.awaiting = null
      s.phase = 'working'
      break
    case 'Stop': {
      const wasWorking = s.phase === 'working'
      s.phase = 'idle'
      s.awaiting = null
      if (wasWorking) store.emit({ type: 'say', id: uid(), text: 'Claude terminou', mood: 'happy', ms: 5000 })
      break
    }
    case 'SessionEnd':
      sessions.delete(id)
      break
  }
  publish()
}

function onStatusLine(p: any): string {
  const id = String(p.session_id ?? 'default')
  const s = session(id)
  s.updatedAt = Date.now()
  s.model = String(p.model?.display_name ?? p.model?.id ?? s.model)
  s.cost = num(p.cost?.total_cost_usd) || s.cost
  const cw = p.context_window
  if (cw) {
    s.tokensIn = num(cw.total_input_tokens) || s.tokensIn
    s.tokensOut = num(cw.total_output_tokens) || s.tokensOut
    const pct = num(cw.used_percentage)
    if (pct) s.ctxPct = Math.min(100, pct)
    else if (num(cw.context_window_size) && cw.current_usage) {
      const u = cw.current_usage
      s.ctxPct = Math.min(100, ((num(u.input_tokens) + num(u.cache_read_input_tokens) + num(u.cache_creation_input_tokens)) / cw.context_window_size) * 100)
    }
  }
  const dir = p.workspace?.current_dir ?? p.cwd
  if (dir) s.project = basename(String(dir))
  publish()
  return `${s.model || 'Claude'} · ${Math.round(s.ctxPct)}%`
}

export function startHookServer() {
  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(200).end('vick')
      return
    }
    let body = ''
    req.on('data', (c) => {
      body += c
      if (body.length > 2_000_000) req.destroy()
    })
    req.on('end', () => {
      let json: any = {}
      try {
        json = JSON.parse(body || '{}')
      } catch {
        /* ignora */
      }
      let out = 'ok'
      try {
        if (req.url?.startsWith('/statusline')) out = onStatusLine(json)
        else onHook(json)
      } catch (e) {
        console.error('hook error', e)
      }
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end(out)
    })
  })
  server.on('error', (e) => console.error('hook server', e))
  server.listen(HOOK_PORT, '127.0.0.1')

  // sessões sem sinal por 20 min saem do painel
  staleTimer = setInterval(() => {
    const now = Date.now()
    let dirty = false
    for (const [id, s] of sessions) {
      if (now - s.updatedAt > 20 * 60_000) {
        sessions.delete(id)
        dirty = true
      }
    }
    if (dirty) publish()
  }, 60_000)
  return () => {
    server.close()
    if (staleTimer) clearInterval(staleTimer)
  }
}

/* ---------- instalação dos hooks em ~/.claude/settings.json ---------- */

const settingsPath = () => join(homedir(), '.claude', 'settings.json')
const CURL = `curl -s -m 2 -X POST -H "Content-Type: application/json" --data-binary @- http://127.0.0.1:${HOOK_PORT}`
const HOOK_CMD = `${CURL}/hook || exit 0`
const STATUS_CMD = `${CURL}/statusline`
const EVENTS = ['UserPromptSubmit', 'PermissionRequest', 'Notification', 'PostToolUse', 'Stop', 'SessionEnd']
const ours = (c: unknown) => typeof c === 'string' && c.includes(`127.0.0.1:${HOOK_PORT}`)

function readSettings(): any {
  if (!existsSync(settingsPath())) return {}
  return JSON.parse(readFileSync(settingsPath(), 'utf8'))
}

function inspect(cfg: any) {
  const installed = EVENTS.every((e) => (cfg.hooks?.[e] ?? []).some((g: any) => (g.hooks ?? []).some((h: any) => ours(h.command))))
  const sl = cfg.statusLine
  const statusLine: 'ours' | 'other' | 'none' = !sl ? 'none' : ours(sl.command) ? 'ours' : 'other'
  return { installed, statusLine }
}

function strip(cfg: any) {
  for (const e of Object.keys(cfg.hooks ?? {})) {
    cfg.hooks[e] = (cfg.hooks[e] as any[])
      .map((g) => ({ ...g, hooks: (g.hooks ?? []).filter((h: any) => !ours(h.command)) }))
      .filter((g) => g.hooks.length)
    if (!cfg.hooks[e].length) delete cfg.hooks[e]
  }
  if (cfg.statusLine && ours(cfg.statusLine.command)) delete cfg.statusLine
}

export function claudeHooks(action: 'status' | 'install' | 'uninstall') {
  try {
    const cfg = readSettings()
    if (action === 'status') return inspect(cfg)
    const path = settingsPath()
    mkdirSync(join(homedir(), '.claude'), { recursive: true })
    if (existsSync(path)) copyFileSync(path, path + '.vick-backup')
    strip(cfg)
    if (action === 'install') {
      cfg.hooks ??= {}
      for (const e of EVENTS) (cfg.hooks[e] ??= []).push({ hooks: [{ type: 'command', command: HOOK_CMD }] })
      if (!cfg.statusLine) cfg.statusLine = { type: 'command', command: STATUS_CMD }
    }
    writeFileSync(path, JSON.stringify(cfg, null, 2))
    return inspect(cfg)
  } catch (e: any) {
    return { installed: false, statusLine: 'none' as const, error: String(e?.message ?? e) }
  }
}
