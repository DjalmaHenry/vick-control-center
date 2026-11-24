import type { AppState, WidgetSlot } from '../../../shared/types'
import { STATUS_META } from '../../../shared/defaults'
import { useCountUp, useNow } from '../hooks'

interface P {
  s: AppState
  span: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.', ',')} mil` : String(Math.round(n)))

function Panel({ title, accent, class: cls = '', children }: { title: string; accent?: string; class?: string; children: any }) {
  return (
    <section class={`panel ${cls}`} style={accent ? { '--accent': accent } : undefined}>
      <header class="panel-title">{title}</header>
      {children}
    </section>
  )
}

function Clock() {
  const now = new Date(useNow(250))
  const date = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })
  const sec = now.getSeconds() + now.getMilliseconds() / 1000
  return (
    <Panel title="Agora" class="clock">
      <div class="clock-time">
        {pad(now.getHours())}
        <span class="colon">:</span>
        {pad(now.getMinutes())}
      </div>
      <div class="clock-date">{date}</div>
      <div class="clock-sec">
        <i style={{ width: `${(sec / 60) * 100}%` }} />
      </div>
    </Panel>
  )
}

function Status({ s }: P) {
  const m = STATUS_META[s.status]
  const since = Math.max(0, Math.floor((useNow(15000) - s.statusSince) / 60000))
  const dur = since < 1 ? 'agora' : since < 60 ? `há ${since} min` : `há ${Math.floor(since / 60)} h ${pad(since % 60)}`
  return (
    <Panel title="Escritório" accent={m.color} class={`status st-${s.status}`}>
      <div class="orb-wrap">
        <div class="orb">
          <i class="ring r1" />
          <i class="ring r2" />
          <i class="ring r3" />
          <i class="core" />
        </div>
      </div>
      <div class="status-label">{m.label}</div>
      <div class="status-since">{dur}</div>
    </Panel>
  )
}

function Claude({ s, span }: P) {
  const c = s.claude
  const awaiting = c.phase === 'awaiting'
  const phaseLabel = !c.connected ? 'Sem sessão' : awaiting ? 'Aguardando você' : c.phase === 'working' ? 'Trabalhando' : 'Ocioso'
  const ctx = useCountUp(c.ctxPct)
  const cost = useCountUp(c.cost)
  const ctxColor = ctx > 85 ? 'var(--red)' : ctx > 65 ? 'var(--amber)' : 'var(--cyan)'
  return (
    <Panel title="Claude Code" accent={awaiting ? 'var(--amber)' : undefined} class={`claude ph-${c.phase} ${c.connected ? '' : 'off'}`}>
      <div class="claude-phase">
        <i class="dot" />
        {phaseLabel}
        {c.project && <span class="claude-proj">{c.project}</span>}
      </div>
      {awaiting ? (
        <div class="claude-ask">
          <b>{c.awaiting?.tool}</b>
          <span>{c.awaiting?.message}</span>
        </div>
      ) : (
        <div class="claude-task">{c.task || (c.connected ? 'Pronto para a próxima tarefa' : 'Abra o Claude Code para conectar')}</div>
      )}
      <div class="claude-metrics">
        <div class="m ctx">
          <div class="m-v">
            {Math.round(ctx)}
            <small>%</small>
          </div>
          <div class="bar">
            <i style={{ width: `${ctx}%`, background: ctxColor }} />
          </div>
          <div class="m-l">contexto</div>
        </div>
        <div class="m">
          <div class="m-v">
            <small>US$</small> {cost.toFixed(2)}
          </div>
          <div class="m-l">sessão</div>
        </div>
        {span >= 4 && (
          <div class="m">
            <div class="m-v">{compact(c.tokensIn + c.tokensOut)}</div>
            <div class="m-l">tokens</div>
          </div>
        )}
      </div>
      {c.model && <div class="claude-model">{c.model}</div>}
    </Panel>
  )
}

function Kpi({ s }: P) {
  const k = s.crm.kpis
  const a = useCountUp(k.leadsToday)
  const b = useCountUp(k.openDeals)
  const c = useCountUp(k.wonMonth)
  const d = useCountUp(k.revenueMonth)
  return (
    <Panel title="Vendas" class="kpi">
      <div class="kpi-grid">
        <div>
          <b>{Math.round(a)}</b>
          <span>leads hoje</span>
        </div>
        <div>
          <b>{Math.round(b)}</b>
          <span>em aberto</span>
        </div>
        <div>
          <b>{Math.round(c)}</b>
          <span>ganhos no mês</span>
        </div>
        <div class="money">
          <b>{brl(d)}</b>
          <span>receita do mês</span>
        </div>
      </div>
    </Panel>
  )
}

function Chart({ s }: P) {
  const data = s.crm.series
  const W = 520
  const H = 270
  const max = Math.max(4, ...data.map((d) => d.leads), ...data.map((d) => d.won * 2))
  const bw = data.length ? W / data.length : W
  const pts = data.map((d, i) => [i * bw + bw / 2, H - (d.won / max) * H * 0.9 - 4] as const)
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ')
  return (
    <Panel title="Leads e ganhos · 7 dias" class="chart">
      <svg viewBox={`0 0 ${W} ${H + 30}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="barg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--cyan)" stop-opacity="0.9" />
            <stop offset="1" stop-color="var(--cyan)" stop-opacity="0.08" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line x1="0" x2={W} y1={H * g} y2={H * g} class="gridline" />
        ))}
        {data.map((d, i) => {
          const h = Math.max(2, (d.leads / max) * H * 0.9)
          return (
            <g key={d.label + i}>
              <rect class="bar-r" x={i * bw + bw * 0.22} width={bw * 0.56} y={H - h} height={h} fill="url(#barg)" style={{ animationDelay: `${i * 60}ms` }} />
              <text x={i * bw + bw / 2} y={H + 22} class="axis">
                {d.label}
              </text>
            </g>
          )
        })}
        <path d={line} class="line" pathLength={1} />
        {pts.map(([x, y], i) => (
          <circle cx={x} cy={y} r="5" class="pt" key={i} />
        ))}
      </svg>
      <div class="legend">
        <i class="lg-b" />
        leads
        <i class="lg-l" />
        ganhos
      </div>
    </Panel>
  )
}

function Feed({ s }: P) {
  const items = s.crm.feed.slice(0, 6)
  const now = useNow(30000)
  const ago = (t: number) => {
    const m = Math.max(0, Math.floor((now - t) / 60000))
    return m < 1 ? 'agora' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h`
  }
  return (
    <Panel title="Atividade" class="feed">
      <ul>
        {items.map((f) => (
          <li key={f.id} class={`k-${f.kind}`}>
            <i />
            <span>{f.text}</span>
            <time>{ago(f.at)}</time>
          </li>
        ))}
        {!items.length && <li class="empty">Sem atividade ainda</li>}
      </ul>
    </Panel>
  )
}

export function Widget({ slot, s }: { slot: WidgetSlot; s: AppState }) {
  const p = { s, span: slot.span }
  switch (slot.type) {
    case 'clock': return <Clock />
    case 'status': return <Status {...p} />
    case 'claude': return <Claude {...p} />
    case 'crm-kpi': return <Kpi {...p} />
    case 'crm-chart': return <Chart {...p} />
    case 'crm-feed': return <Feed {...p} />
  }
}
