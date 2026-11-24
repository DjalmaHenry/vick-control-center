export type OfficeStatus = 'available' | 'busy' | 'dnd' | 'away'

export type WidgetType = 'clock' | 'status' | 'claude' | 'crm-kpi' | 'crm-chart' | 'crm-feed'

export interface WidgetSlot {
  id: string
  type: WidgetType
  /** colunas de 12 */
  span: number
}

export type BackgroundKind = 'none' | 'aurora' | 'grid' | 'rain' | 'stars' | 'waves' | 'file'

export interface BackgroundConfig {
  kind: BackgroundKind
  /** nome do arquivo em userData/media (kind = file) */
  file?: string
  /** 0..0.9 escurecimento por cima do fundo */
  dim: number
}

export interface ZohoConfig {
  enabled: boolean
  /** dados fictícios para testar layout sem credenciais */
  demo: boolean
  dc: 'com' | 'eu' | 'in' | 'com.au' | 'jp' | 'ca' | 'sa'
  clientId: string
  clientSecret: string
  refreshToken: string
  pollSec: number
}

export interface DisplayConfig {
  /** 'auto' procura 1920x480; 'preview' força janela de prévia; ou id numérico do display */
  target: 'auto' | 'preview' | number
  rotation: 'auto' | 0 | 90 | 270
}

export interface Config {
  layout: WidgetSlot[]
  background: BackgroundConfig
  mascot: { enabled: boolean }
  zoho: ZohoConfig
  display: DisplayConfig
  autostart: boolean
}

export interface ClaudeState {
  connected: boolean
  phase: 'idle' | 'working' | 'awaiting'
  task: string
  model: string
  ctxPct: number
  cost: number
  tokensIn: number
  tokensOut: number
  project: string
  awaiting: { tool: string; message: string; at: number } | null
  updatedAt: number
}

export interface CrmFeedItem {
  id: string
  kind: 'lead' | 'event' | 'won'
  text: string
  at: number
}

export interface CrmState {
  connected: boolean
  demo: boolean
  error: string | null
  updatedAt: number
  kpis: { leadsToday: number; openDeals: number; wonMonth: number; revenueMonth: number }
  series: { label: string; leads: number; won: number }[]
  feed: CrmFeedItem[]
}

export interface AppState {
  config: Config
  status: OfficeStatus
  statusSince: number
  claude: ClaudeState
  crm: CrmState
  displayInfo: { mode: 'telinha' | 'preview'; label: string }
}

export type MascotMood = 'idle' | 'happy' | 'alert' | 'sleepy' | 'work' | 'focus' | 'dnd'

export type AppEvent =
  | { type: 'alert'; id: string; kind: 'crm-event' | 'crm-won' | 'claude-approval' | 'info'; title: string; body?: string; ms: number }
  | { type: 'say'; id: string; text: string; mood: MascotMood; ms: number }

export interface DisplayOption {
  id: number
  label: string
  size: string
  isTelinha: boolean
}

export interface VickApi {
  getState(): Promise<AppState>
  onState(cb: (s: AppState) => void): () => void
  onEvent(cb: (e: AppEvent) => void): () => void
  setConfig(patch: DeepPartial<Config>): Promise<void>
  setLayout(layout: WidgetSlot[]): Promise<void>
  setStatus(s: OfficeStatus): Promise<void>
  pickBackground(): Promise<void>
  testEvent(kind: 'crm-event' | 'crm-won' | 'claude-approval' | 'say'): Promise<void>
  claudeHooks(action: 'status' | 'install' | 'uninstall'): Promise<{ installed: boolean; statusLine: 'ours' | 'other' | 'none'; error?: string }>
  zohoTest(): Promise<{ ok: boolean; message: string }>
  listDisplays(): Promise<DisplayOption[]>
  mediaUrl(file: string): string
  isElectron: boolean
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? (T[K] extends any[] ? T[K] : DeepPartial<T[K]>) : T[K] }
