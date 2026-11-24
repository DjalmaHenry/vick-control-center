import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import '../common/stage.css'
import './control.css'
import { STATUS_META, WIDGET_META } from '../../shared/defaults'
import type { AppState, BackgroundKind, DisplayOption, OfficeStatus, WidgetSlot, WidgetType } from '../../shared/types'
import { api } from '../common/api'
import { Dashboard } from '../common/Dashboard'
import { Stage } from '../common/Stage'
import { useAppState } from '../common/hooks'

type Page = 'home' | 'bg' | 'link' | 'screen'

const I = {
  home: <path d="M3 11l9-8 9 8M5 10v10h14V10" />,
  bg: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l5-5 5 5 3-3 5 5" /></>,
  link: <><path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" /></>,
  screen: <><rect x="2" y="7" width="20" height="10" rx="2" /><path d="M8 21h8" /></>
}

function Rail({ page, set }: { page: Page; set: (p: Page) => void }) {
  const items: [Page, string][] = [['home', 'Painel'], ['bg', 'Fundo'], ['link', 'Integrações'], ['screen', 'Telinha']]
  return (
    <nav class="rail">
      {items.map(([k, t]) => (
        <button class={page === k ? 'on' : ''} title={t} aria-label={t} onClick={() => set(k)}>
          <svg viewBox="0 0 24 24">{I[k]}</svg>
        </button>
      ))}
    </nav>
  )
}

/* ---------------- Painel ---------------- */

const KEYS: Record<OfficeStatus, string> = { available: '1', busy: '2', dnd: '3', away: '4' }

function StatusRow({ s }: { s: AppState }) {
  return (
    <div class="status-row">
      {(Object.keys(STATUS_META) as OfficeStatus[]).map((k) => (
        <button class={s.status === k ? 'on' : ''} style={{ '--c': STATUS_META[k].color }} onClick={() => api.setStatus(k)}>
          <i />
          {STATUS_META[k].label}
          <kbd>Ctrl+Alt+{KEYS[k]}</kbd>
        </button>
      ))}
    </div>
  )
}

function LayoutEditor({ s }: { s: AppState }) {
  const layout = s.config.layout
  const total = layout.reduce((a, w) => a + w.span, 0)
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const save = (l: WidgetSlot[]) => api.setLayout(l)

  const resize = (id: string, d: number) => save(layout.map((w) => (w.id === id ? { ...w, span: w.span + d } : w)))
  const remove = (id: string) => save(layout.filter((w) => w.id !== id))
  const drop = (to: string) => {
    if (!drag || drag === to) return
    const from = layout.findIndex((w) => w.id === drag)
    const dest = layout.findIndex((w) => w.id === to)
    const next = [...layout]
    next.splice(dest, 0, next.splice(from, 1)[0])
    save(next)
  }
  const add = (type: WidgetType) => save([...layout, { id: `w-${type}-${Date.now().toString(36)}`, type, span: Math.min(WIDGET_META[type].minSpan, 12 - total) }])
  const addable = (Object.keys(WIDGET_META) as WidgetType[]).filter((t) => !layout.some((w) => w.type === t))

  return (
    <section class="sec">
      <h2>
        Widgets <span class="cap">{total}/12</span>
      </h2>
      <div class="strip">
        {layout.map((w) => {
          const m = WIDGET_META[w.type]
          return (
            <div
              key={w.id}
              class={`chip-w ${drag === w.id ? 'drag' : ''} ${over === w.id ? 'over' : ''}`}
              style={{ flexGrow: w.span, flexBasis: 0 }}
              draggable
              onDragStart={() => setDrag(w.id)}
              onDragEnd={() => (setDrag(null), setOver(null))}
              onDragOver={(e) => (e.preventDefault(), setOver(w.id))}
              onDrop={() => (drop(w.id), setOver(null))}
            >
              <button class="mini x" title="Remover" aria-label="Remover" onClick={() => remove(w.id)}>×</button>
              <b>{m.label}</b>
              <div class="ctl">
                <button class="mini" aria-label="Estreitar" disabled={w.span <= m.minSpan} onClick={() => resize(w.id, -1)}>−</button>
                <span>{w.span}</span>
                <button class="mini" aria-label="Alargar" disabled={w.span >= m.maxSpan || total >= 12} onClick={() => resize(w.id, 1)}>+</button>
              </div>
            </div>
          )
        })}
        {total < 12 && <div style={{ flexGrow: 12 - total, flexBasis: 0 }} />}
      </div>
      <div class="add-row">
        {addable.map((t) => (
          <button class="add" disabled={total + WIDGET_META[t].minSpan > 12} onClick={() => add(t)}>
            + {WIDGET_META[t].label}
          </button>
        ))}
      </div>
    </section>
  )
}

function Home({ s }: { s: AppState }) {
  return (
    <div class="page">
      <Preview s={s} />
      <StatusRow s={s} />
      <LayoutEditor s={s} />
    </div>
  )
}

function Preview({ s }: { s: AppState }) {
  const live = s.displayInfo.mode === 'telinha'
  return (
    <div class="preview">
      <span class={`tag ${live ? 'live' : ''}`}>
        <i />
        {live ? 'Na telinha' : 'Sem telinha'}
      </span>
      <Stage>
        <Dashboard s={s} />
      </Stage>
    </div>
  )
}

/* ---------------- Fundo ---------------- */

const BGS: [BackgroundKind, string, string][] = [
  ['aurora', 'Aurora', 'linear-gradient(110deg,#0c3a40,#3a2c7a 55%,#6b4a10)'],
  ['grid', 'Grade', 'linear-gradient(#06080c 40%,#0f4d52)'],
  ['rain', 'Chuva', 'repeating-linear-gradient(90deg,#06080c 0 14px,#0d3a3e 14px 16px)'],
  ['stars', 'Estrelas', 'radial-gradient(circle at 20% 40%,#9fe 0 1px,transparent 2px) 0 0/60px 40px,#06080c'],
  ['waves', 'Ondas', 'linear-gradient(#06080c 50%,#123a44)'],
  ['none', 'Liso', '#06080c']
]

function Background({ s }: { s: AppState }) {
  const bg = s.config.background
  return (
    <div class="page">
      <Preview s={s} />
      <section class="sec">
        <div class="bg-grid">
          {BGS.map(([k, t, css]) => (
            <button class={`bg-card ${bg.kind === k ? 'on' : ''}`} onClick={() => api.setConfig({ background: { kind: k } })}>
              <i class="sw" style={{ background: css }} />
              <span>{t}</span>
            </button>
          ))}
          <button class={`bg-card ${bg.kind === 'file' ? 'on' : ''}`} onClick={() => api.pickBackground()}>
            <i class="sw" style={{ background: '#0e131a' }} />
            <span>Vídeo / imagem…</span>
          </button>
        </div>
      </section>
      <section class="sec">
        <h2>Escurecer</h2>
        <input class="slider" type="range" min="0" max="0.9" step="0.05" value={bg.dim} onInput={(e) => api.setConfig({ background: { dim: +(e.target as HTMLInputElement).value } })} />
      </section>
    </div>
  )
}

/* ---------------- Integrações ---------------- */

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return <button class={`toggle ${on ? 'on' : ''}`} role="switch" aria-checked={on} onClick={() => set(!on)} />
}

function ClaudeRow({ s }: { s: AppState }) {
  const [info, setInfo] = useState<{ installed: boolean; statusLine: string; error?: string } | null>(null)
  const refresh = () => api.claudeHooks('status').then(setInfo)
  useEffect(() => void refresh(), [])
  const act = (a: 'install' | 'uninstall') => api.claudeHooks(a).then(setInfo)
  return (
    <div class="row">
      <i class={`dot ${s.claude.connected ? 'ok' : ''}`} />
      <div class="grow">
        <b>Claude Code</b>
        <small class={info?.error ? 'err-t' : ''}>
          {info?.error ?? (s.claude.connected ? 'Sessão ativa' : info?.installed ? 'Instalado · aguardando sessão' : 'Hooks não instalados')}
          {info?.installed && info.statusLine === 'other' && ' · statusLine própria mantida'}
        </small>
      </div>
      <button class="btn" onClick={() => api.testEvent('claude-approval')}>Testar</button>
      {info?.installed ? <button class="btn" onClick={() => act('uninstall')}>Remover</button> : <button class="btn primary" onClick={() => act('install')}>Instalar</button>}
    </div>
  )
}

function ZohoBlock({ s }: { s: AppState }) {
  const z = s.config.zoho
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null)
  const set = (p: Partial<typeof z>) => api.setConfig({ zoho: p })
  const field = (k: 'clientId' | 'clientSecret' | 'refreshToken', label: string, wide = false, pw = false) => (
    <label class={wide ? 'wide' : ''}>
      {label}
      <input {...({ type: pw ? 'password' : 'text' } as object)} value={z[k]} onChange={(e) => set({ [k]: (e.target as HTMLInputElement).value })} spellcheck={false} />
    </label>
  )
  return (
    <>
      <div class="row">
        <i class={`dot ${s.crm.connected ? 'ok' : s.crm.error ? 'err' : ''}`} />
        <div class="grow">
          <b>Zoho CRM</b>
          <small class={s.crm.error ? 'err-t' : ''}>{s.crm.error ?? (s.crm.connected ? (s.crm.demo ? 'Dados de demonstração' : 'Conectado') : 'Desligado')}</small>
        </div>
        <button class="btn" onClick={() => api.testEvent('crm-event')}>Agendamento</button>
        <button class="btn" onClick={() => api.testEvent('crm-won')}>Fechamento</button>
        <Toggle on={z.enabled} set={(v) => set({ enabled: v })} />
      </div>
      {z.enabled && (
        <div class="fields">
          <label class="wide" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <Toggle on={z.demo} set={(v) => set({ demo: v })} />
            Usar dados de demonstração
          </label>
          {!z.demo && (
            <>
              <label>
                Região
                <select value={z.dc} onChange={(e) => set({ dc: (e.target as HTMLSelectElement).value as typeof z.dc })}>
                  {['com', 'eu', 'in', 'com.au', 'jp', 'ca', 'sa'].map((d) => <option value={d}>zoho.{d}</option>)}
                </select>
              </label>
              <label>
                Atualizar a cada (s)
                <input type="number" min={20} value={z.pollSec} onChange={(e) => set({ pollSec: +(e.target as HTMLInputElement).value })} />
              </label>
              {field('clientId', 'Client ID', true)}
              {field('clientSecret', 'Client Secret', false, true)}
              {field('refreshToken', 'Refresh token', false, true)}
              <div class="actions">
                <button class="btn" onClick={() => api.zohoTest().then(setMsg)}>Testar conexão</button>
                {msg && <span class={msg.ok ? '' : 'err-t'}>{msg.message}</span>}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

function Links({ s }: { s: AppState }) {
  return (
    <div class="page">
      <ClaudeRow s={s} />
      <ZohoBlock s={s} />
      <div class="row">
        <i class="dot ok" />
        <div class="grow">
          <b>Mascote</b>
        </div>
        <button class="btn" onClick={() => api.testEvent('say')}>Testar</button>
        <Toggle on={s.config.mascot.enabled} set={(v) => api.setConfig({ mascot: { enabled: v } })} />
      </div>
    </div>
  )
}

/* ---------------- Telinha ---------------- */

function Screen({ s }: { s: AppState }) {
  const [displays, setDisplays] = useState<DisplayOption[]>([])
  useEffect(() => void api.listDisplays().then(setDisplays), [])
  const d = s.config.display
  const target = String(d.target)
  return (
    <div class="page">
      <Preview s={s} />
      <div class="fields">
        <label>
          Tela
          <select
            value={target}
            onChange={(e) => {
              const v = (e.target as HTMLSelectElement).value
              api.setConfig({ display: { target: v === 'auto' || v === 'preview' ? v : Number(v) } })
            }}
          >
            <option value="auto">Automática (1920×480)</option>
            <option value="preview">Janela de prévia</option>
            {displays.map((x) => (
              <option value={x.id}>{x.label} · {x.size}</option>
            ))}
          </select>
        </label>
        <label>
          Rotação
          <select value={String(d.rotation)} onChange={(e) => { const v = (e.target as HTMLSelectElement).value; api.setConfig({ display: { rotation: v === 'auto' ? 'auto' : (Number(v) as 0 | 90 | 270) } }) }}>
            <option value="auto">Automática</option>
            <option value="0">0°</option>
            <option value="90">90°</option>
            <option value="270">270°</option>
          </select>
        </label>
      </div>
      <div class="row">
        <div class="grow"><b>Iniciar com o Windows</b></div>
        <Toggle on={s.config.autostart} set={(v) => api.setConfig({ autostart: v })} />
      </div>
    </div>
  )
}

function App() {
  const s = useAppState()
  const [page, setPage] = useState<Page>('home')
  if (!s) return null
  return (
    <div class="app">
      <Rail page={page} set={setPage} />
      {page === 'home' && <Home s={s} />}
      {page === 'bg' && <Background s={s} />}
      {page === 'link' && <Links s={s} />}
      {page === 'screen' && <Screen s={s} />}
    </div>
  )
}

render(<App />, document.getElementById('app')!)
