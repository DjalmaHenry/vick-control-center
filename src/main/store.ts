import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { defaultConfig, emptyClaude, emptyCrm } from '../shared/defaults'
import type { AppEvent, AppState, Config, DeepPartial, OfficeStatus } from '../shared/types'

const configPath = () => join(app.getPath('userData'), 'config.json')
export const mediaDir = () => {
  const d = join(app.getPath('userData'), 'media')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function merge<T>(base: T, patch: DeepPartial<T>): T {
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null) return patch as T
  const out: any = { ...base }
  for (const k of Object.keys(patch as object)) {
    const v = (patch as any)[k]
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge((base as any)[k] ?? {}, v) : v
  }
  return out
}

function loadConfig(): Config {
  try {
    return merge(defaultConfig, JSON.parse(readFileSync(configPath(), 'utf8')))
  } catch {
    return structuredClone(defaultConfig)
  }
}

type Listener = () => void

class Store {
  state: AppState
  private listeners = new Set<Listener>()
  private saveTimer: NodeJS.Timeout | null = null
  private sendTimer: NodeJS.Timeout | null = null

  constructor() {
    this.state = {
      config: structuredClone(defaultConfig),
      status: 'available',
      statusSince: Date.now(),
      claude: { ...emptyClaude },
      crm: { ...emptyCrm },
      displayInfo: { mode: 'preview', label: 'Prévia' }
    }
  }

  init() {
    this.state.config = loadConfig()
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  patch(p: Partial<AppState>) {
    this.state = { ...this.state, ...p }
    this.changed()
  }

  setConfig(p: DeepPartial<Config>) {
    this.state = { ...this.state, config: merge(this.state.config, p) }
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      try {
        writeFileSync(configPath(), JSON.stringify(this.state.config, null, 2))
      } catch (e) {
        console.error('config save failed', e)
      }
    }, 300)
    this.changed()
  }

  setStatus(s: OfficeStatus) {
    if (s === this.state.status) return
    this.patch({ status: s, statusSince: Date.now() })
  }

  emit(e: AppEvent) {
    for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('event', e)
  }

  private changed() {
    this.listeners.forEach((l) => l())
    if (this.sendTimer) return
    this.sendTimer = setTimeout(() => {
      this.sendTimer = null
      for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send('state', this.state)
    }, 16)
  }
}

export const store = new Store()

let n = 0
export const uid = () => `${Date.now().toString(36)}${(n++).toString(36)}`
