import type { CrmFeedItem, CrmState } from '../shared/types'
import { emptyCrm } from '../shared/defaults'
import { store, uid } from './store'

const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

let timer: NodeJS.Timeout | null = null
let token: { value: string; exp: number } | null = null
const seen = new Set<string>()
let firstRun = true

function last7(): { key: string; label: string }[] {
  const out = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    out.push({ key: d.toISOString().slice(0, 10), label: DAYS[d.getDay()] })
  }
  return out
}
const dayKey = (iso: string) => {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

/* ---------------- modo demonstração ---------------- */

let demo: CrmState | null = null
function demoTick(announce: boolean) {
  if (!demo) {
    demo = {
      connected: true,
      demo: true,
      error: null,
      updatedAt: Date.now(),
      kpis: { leadsToday: 7, openDeals: 23, wonMonth: 9, revenueMonth: 184_500 },
      series: last7().map((d) => ({ label: d.label, leads: 4 + Math.round(Math.random() * 10), won: Math.round(Math.random() * 4) })),
      feed: [
        { id: uid(), kind: 'lead', text: 'Lead novo · Clínica Aurora', at: Date.now() - 600_000 },
        { id: uid(), kind: 'event', text: 'Reunião · Grupo Delta, 15h', at: Date.now() - 1_800_000 },
        { id: uid(), kind: 'won', text: 'Fechado · Mercantil Sul', at: Date.now() - 3_600_000 }
      ]
    }
  }
  if (announce) {
    const r = Math.random()
    const s = demo.series[demo.series.length - 1]
    if (r < 0.5) {
      s.leads++
      demo.kpis.leadsToday++
      push({ id: uid(), kind: 'lead', text: 'Lead novo · Studio Norte', at: Date.now() })
    } else if (r < 0.8) {
      push({ id: uid(), kind: 'event', text: 'Reunião · Rede Horizonte', at: Date.now() })
      store.emit({ type: 'alert', id: uid(), kind: 'crm-event', title: 'Novo agendamento', body: 'Rede Horizonte', ms: 6000 })
    } else {
      s.won++
      demo.kpis.wonMonth++
      demo.kpis.revenueMonth += 12_000
      push({ id: uid(), kind: 'won', text: 'Fechado · Rede Horizonte', at: Date.now() })
      store.emit({ type: 'alert', id: uid(), kind: 'crm-won', title: 'Negócio fechado', body: `Rede Horizonte · ${brl(12_000)}`, ms: 7000 })
    }
  }
  demo.updatedAt = Date.now()
  store.patch({ crm: { ...demo, series: demo.series.map((x) => ({ ...x })) } })
}
function push(item: CrmFeedItem) {
  demo!.feed = [item, ...demo!.feed].slice(0, 12)
}

/* ---------------- Zoho CRM real ---------------- */

async function accessToken(): Promise<string> {
  const z = store.state.config.zoho
  if (token && token.exp > Date.now() + 30_000) return token.value
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: z.clientId,
    client_secret: z.clientSecret,
    refresh_token: z.refreshToken
  })
  const r = await fetch(`https://accounts.zoho.${z.dc}/oauth/v2/token`, { method: 'POST', body })
  const j: any = await r.json()
  if (!j.access_token) throw new Error(j.error ?? 'token recusado')
  token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 }
  return token.value
}

async function api(path: string, params: Record<string, string>): Promise<any[]> {
  const z = store.state.config.zoho
  const t = await accessToken()
  const q = new URLSearchParams(params)
  const r = await fetch(`https://www.zohoapis.${z.dc}/crm/v6/${path}?${q}`, { headers: { Authorization: `Zoho-oauthtoken ${t}` } })
  if (r.status === 204) return []
  const j: any = await r.json()
  if (!r.ok) throw new Error(j.message ?? j.code ?? `HTTP ${r.status}`)
  return j.data ?? []
}

async function realPoll() {
  const days = last7()
  const since = days[0].key
  const [leads, deals, events] = await Promise.all([
    api('Leads', { fields: 'Company,Last_Name,Created_Time', sort_by: 'Created_Time', sort_order: 'desc', per_page: '200' }),
    api('Deals', { fields: 'Deal_Name,Stage,Amount,Modified_Time,Closing_Date,Created_Time', sort_by: 'Modified_Time', sort_order: 'desc', per_page: '200' }),
    api('Events', { fields: 'Event_Title,Start_DateTime,Created_Time', sort_by: 'Created_Time', sort_order: 'desc', per_page: '50' })
  ])

  const today = days[6].key
  const monthKey = today.slice(0, 7)
  const won = deals.filter((d) => /closed won|ganh|fechad/i.test(String(d.Stage)))
  const feed: CrmFeedItem[] = []
  const stamp = (id: string, kind: CrmFeedItem['kind'], text: string, at: string, title: string, body: string) => {
    feed.push({ id, kind, text, at: Date.parse(at) })
    if (!firstRun && !seen.has(id) && Date.now() - Date.parse(at) < 6 * 3_600_000) {
      if (kind === 'event') store.emit({ type: 'alert', id: uid(), kind: 'crm-event', title, body, ms: 6000 })
      if (kind === 'won') store.emit({ type: 'alert', id: uid(), kind: 'crm-won', title, body, ms: 7000 })
      if (kind === 'lead') store.emit({ type: 'say', id: uid(), text: `Lead novo: ${body}`, mood: 'happy', ms: 5000 })
    }
    seen.add(id)
  }
  leads.slice(0, 15).forEach((l) => stamp(`L${l.id}`, 'lead', `Lead novo · ${l.Company || l.Last_Name}`, l.Created_Time, '', String(l.Company || l.Last_Name)))
  events.slice(0, 10).forEach((e) => stamp(`E${e.id}`, 'event', `Agendamento · ${e.Event_Title}`, e.Created_Time, 'Novo agendamento', String(e.Event_Title)))
  won.slice(0, 10).forEach((d) =>
    stamp(`W${d.id}`, 'won', `Fechado · ${d.Deal_Name}`, d.Modified_Time, 'Negócio fechado', `${d.Deal_Name}${d.Amount ? ' · ' + brl(Number(d.Amount)) : ''}`)
  )
  feed.sort((a, b) => b.at - a.at)

  const state: CrmState = {
    connected: true,
    demo: false,
    error: null,
    updatedAt: Date.now(),
    kpis: {
      leadsToday: leads.filter((l) => dayKey(l.Created_Time) === today).length,
      openDeals: deals.filter((d) => !/closed/i.test(String(d.Stage))).length,
      wonMonth: won.filter((d) => dayKey(d.Modified_Time).startsWith(monthKey)).length,
      revenueMonth: won.filter((d) => dayKey(d.Modified_Time).startsWith(monthKey)).reduce((a, d) => a + Number(d.Amount || 0), 0)
    },
    series: days.map((d) => ({
      label: d.label,
      leads: leads.filter((l) => dayKey(l.Created_Time) === d.key && d.key >= since).length,
      won: won.filter((x) => dayKey(x.Modified_Time) === d.key).length
    })),
    feed: feed.slice(0, 12)
  }
  firstRun = false
  store.patch({ crm: state })
}

export async function zohoTest(): Promise<{ ok: boolean; message: string }> {
  try {
    token = null
    await accessToken()
    const r = await api('Leads', { fields: 'Last_Name', per_page: '1' })
    return { ok: true, message: `Conectado (${r.length} lead lido)` }
  } catch (e: any) {
    return { ok: false, message: String(e?.message ?? e) }
  }
}

/* ---------------- ciclo ---------------- */

async function tick() {
  const z = store.state.config.zoho
  if (!z.enabled) {
    store.patch({ crm: { ...emptyCrm } })
    return
  }
  if (z.demo) return demoTick(demoStarted)
  try {
    await realPoll()
  } catch (e: any) {
    store.patch({ crm: { ...store.state.crm, connected: false, error: String(e?.message ?? e) } })
  }
}

let demoStarted = false
export function startZoho() {
  const restart = () => {
    if (timer) clearInterval(timer)
    demoStarted = false
    demo = null
    firstRun = true
    seen.clear()
    token = null
    const z = store.state.config.zoho
    void tick().then(() => (demoStarted = true))
    timer = setInterval(() => void tick(), (z.demo ? 45 : Math.max(20, z.pollSec)) * 1000)
  }
  let sig = ''
  const check = () => {
    const z = store.state.config.zoho
    const s = JSON.stringify([z.enabled, z.demo, z.dc, z.clientId, z.clientSecret, z.refreshToken, z.pollSec])
    if (s !== sig) {
      sig = s
      restart()
    }
  }
  check()
  store.subscribe(check)
}
