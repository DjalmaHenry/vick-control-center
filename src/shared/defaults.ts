import type { ClaudeState, Config, CrmState } from './types'

export const HOOK_PORT = 47800
export const STAGE_W = 1920
export const STAGE_H = 480

export const defaultConfig: Config = {
  layout: [
    { id: 'w-clock', type: 'clock', span: 2 },
    { id: 'w-status', type: 'status', span: 2 },
    { id: 'w-claude', type: 'claude', span: 3 },
    { id: 'w-kpi', type: 'crm-kpi', span: 2 },
    { id: 'w-chart', type: 'crm-chart', span: 3 }
  ],
  background: { kind: 'aurora', dim: 0.35 },
  mascot: { enabled: true },
  zoho: { enabled: false, demo: true, dc: 'com', clientId: '', clientSecret: '', refreshToken: '', pollSec: 60 },
  display: { target: 'auto', rotation: 'auto' },
  autostart: false
}

export const emptyClaude: ClaudeState = {
  connected: false,
  phase: 'idle',
  task: '',
  model: '',
  ctxPct: 0,
  cost: 0,
  tokensIn: 0,
  tokensOut: 0,
  project: '',
  awaiting: null,
  updatedAt: 0
}

export const emptyCrm: CrmState = {
  connected: false,
  demo: false,
  error: null,
  updatedAt: 0,
  kpis: { leadsToday: 0, openDeals: 0, wonMonth: 0, revenueMonth: 0 },
  series: [],
  feed: []
}

export const WIDGET_META: Record<string, { label: string; minSpan: number; maxSpan: number }> = {
  clock: { label: 'Relógio', minSpan: 2, maxSpan: 4 },
  status: { label: 'Status', minSpan: 2, maxSpan: 4 },
  claude: { label: 'Claude', minSpan: 3, maxSpan: 6 },
  'crm-kpi': { label: 'Números', minSpan: 2, maxSpan: 4 },
  'crm-chart': { label: 'Gráfico', minSpan: 3, maxSpan: 6 },
  'crm-feed': { label: 'Atividade', minSpan: 3, maxSpan: 6 }
}

export const STATUS_META: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponível', color: '#4DF0A0' },
  busy: { label: 'Ocupado', color: '#FFB02E' },
  dnd: { label: 'Não perturbe', color: '#FF4D5E' },
  away: { label: 'Ausente', color: '#7C8FA0' }
}
