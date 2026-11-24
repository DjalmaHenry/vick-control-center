import { defaultConfig, emptyClaude, emptyCrm } from '../../shared/defaults'
import type { AppEvent, AppState, VickApi } from '../../shared/types'

/** Fora do Electron (ex.: navegador para testes) usa um estado simulado. */
function mockApi(): VickApi {
  let state: AppState = {
    config: structuredClone(defaultConfig),
    status: 'busy',
    statusSince: Date.now() - 1_500_000,
    claude: { ...emptyClaude, connected: true, phase: 'working', task: 'Refatorar o módulo de autenticação e atualizar os testes', model: 'Opus', ctxPct: 42, cost: 1.84, tokensIn: 184_000, tokensOut: 21_400, project: 'api-gateway', updatedAt: Date.now() },
    crm: {
      ...emptyCrm,
      connected: true,
      demo: true,
      kpis: { leadsToday: 7, openDeals: 23, wonMonth: 9, revenueMonth: 184_500 },
      series: ['qui', 'sex', 'sáb', 'dom', 'seg', 'ter', 'qua'].map((l, i) => ({ label: l, leads: [6, 9, 2, 1, 8, 11, 7][i], won: [1, 2, 0, 0, 2, 3, 1][i] })),
      feed: [
        { id: '1', kind: 'lead', text: 'Lead novo · Clínica Aurora', at: Date.now() - 600_000 },
        { id: '2', kind: 'event', text: 'Reunião · Grupo Delta, 15h', at: Date.now() - 1_800_000 },
        { id: '3', kind: 'won', text: 'Fechado · Mercantil Sul', at: Date.now() - 3_600_000 }
      ]
    },
    displayInfo: { mode: 'preview', label: 'Prévia' }
  }
  const sl = new Set<(s: AppState) => void>()
  const el = new Set<(e: AppEvent) => void>()
  const set = (p: Partial<AppState>) => {
    state = { ...state, ...p }
    sl.forEach((f) => f(state))
  }
  const ev = (e: AppEvent) => el.forEach((f) => f(e))
  const id = () => Math.random().toString(36).slice(2)
  const merge = (a: any, b: any): any => (b && typeof b === 'object' && !Array.isArray(b) ? Object.fromEntries([...new Set([...Object.keys(a ?? {}), ...Object.keys(b)])].map((k) => [k, k in b ? merge(a?.[k], b[k]) : a[k]])) : b)
  return {
    isElectron: false,
    getState: async () => state,
    onState: (cb) => (sl.add(cb), () => sl.delete(cb)),
    onEvent: (cb) => (el.add(cb), () => el.delete(cb)),
    setConfig: async (p) => set({ config: merge(state.config, p) }),
    setLayout: async (layout) => set({ config: { ...state.config, layout } }),
    setStatus: async (s) => set({ status: s, statusSince: Date.now() }),
    pickBackground: async () => {},
    testEvent: async (k) => {
      if (k === 'crm-event') ev({ type: 'alert', id: id(), kind: 'crm-event', title: 'Novo agendamento', body: 'Rede Horizonte · amanhã 10h', ms: 6000 })
      if (k === 'crm-won') ev({ type: 'alert', id: id(), kind: 'crm-won', title: 'Negócio fechado', body: 'Rede Horizonte · R$ 12.000', ms: 7000 })
      if (k === 'claude-approval') {
        ev({ type: 'alert', id: id(), kind: 'claude-approval', title: 'Claude pede aprovação', body: 'Bash', ms: 4500 })
        set({ claude: { ...state.claude, phase: 'awaiting', awaiting: { tool: 'Bash', message: 'npm run build', at: Date.now() } } })
        setTimeout(() => set({ claude: { ...state.claude, phase: 'working', awaiting: null } }), 9000)
      }
      if (k === 'say') ev({ type: 'say', id: id(), text: 'Oi! Estou de olho em tudo.', mood: 'happy', ms: 4500 })
    },
    claudeHooks: async () => ({ installed: false, statusLine: 'none' }),
    zohoTest: async () => ({ ok: false, message: 'Disponível só no app' }),
    listDisplays: async () => [{ id: 1, label: 'Principal', size: '1728×1117', isTelinha: false }],
    mediaUrl: (f) => f
  }
}

export const api: VickApi = (window as any).vick ?? mockApi()
if (!(window as any).vick) (window as any).__vick = api
