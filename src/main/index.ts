import { app, dialog, globalShortcut, ipcMain, Menu, nativeImage, net, protocol, Tray } from 'electron'
import { basename, extname, join } from 'node:path'
import { copyFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { deflateSync } from 'node:zlib'
import { STATUS_META } from '../shared/defaults'
import type { OfficeStatus } from '../shared/types'
import { store, mediaDir, uid } from './store'
import { startHookServer, claudeHooks } from './claude'
import { startZoho, zohoTest } from './zoho'
import { listDisplays, openDashboard, setQuitting, showControl, watchDisplays } from './windows'

protocol.registerSchemesAsPrivileged([{ scheme: 'vick-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } }])

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => showControl())

/* ---- ícone de bandeja gerado em runtime (círculo na cor do status) ---- */
function crc32(buf: Buffer) {
  let c, crc = ~0
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}
function dotPng(hex: string, size = 32) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2)
      const a = Math.max(0, Math.min(1, size / 2 - 2 - d + 0.5))
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = Math.round(a * 255)
    }
  }
  const chunk = (t: string, d: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length)
    const td = Buffer.concat([Buffer.from(t), d])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

let tray: Tray | null = null
function refreshTray() {
  if (!tray) return
  const s = store.state.status
  tray.setImage(nativeImage.createFromBuffer(dotPng(STATUS_META[s].color)))
  tray.setToolTip(`Vick · ${STATUS_META[s].label}`)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Abrir central', click: showControl },
      { type: 'separator' },
      ...(Object.keys(STATUS_META) as OfficeStatus[]).map((k) => ({
        label: STATUS_META[k].label,
        type: 'radio' as const,
        checked: s === k,
        click: () => store.setStatus(k)
      })),
      { type: 'separator' },
      { label: 'Sair', click: () => { setQuitting(); app.quit() } }
    ])
  )
}

const STATUS_SAY: Record<OfficeStatus, { text: string; mood: 'happy' | 'focus' | 'dnd' | 'sleepy' | 'idle' }> = {
  available: { text: 'Disponível', mood: 'happy' },
  busy: { text: 'Ocupado — foco!', mood: 'focus' },
  dnd: { text: 'Não perturbe ligado', mood: 'dnd' },
  away: { text: 'Ausente', mood: 'sleepy' }
}

app.whenReady().then(() => {
  store.init()

  protocol.handle('vick-media', (req) => {
    const name = basename(decodeURIComponent(new URL(req.url).pathname))
    return net.fetch(pathToFileURL(join(mediaDir(), name)).toString(), { headers: req.headers })
  })

  ipcMain.handle('state:get', () => store.state)
  ipcMain.handle('config:set', (_, p) => store.setConfig(p))
  ipcMain.handle('status:set', (_, s: OfficeStatus) => store.setStatus(s))
  ipcMain.handle('displays:list', () => listDisplays())
  ipcMain.handle('claude:hooks', (_, a) => claudeHooks(a))
  ipcMain.handle('zoho:test', () => zohoTest())
  ipcMain.handle('bg:pick', async () => {
    const r = await dialog.showOpenDialog({
      title: 'Fundo animado',
      properties: ['openFile'],
      filters: [{ name: 'Vídeo ou imagem', extensions: ['mp4', 'webm', 'gif', 'png', 'jpg', 'jpeg', 'webp'] }]
    })
    if (r.canceled || !r.filePaths[0]) return
    const name = `bg-${Date.now()}${extname(r.filePaths[0]).toLowerCase()}`
    copyFileSync(r.filePaths[0], join(mediaDir(), name))
    store.setConfig({ background: { kind: 'file', file: name } })
  })
  ipcMain.handle('test:event', (_, kind: string) => {
    if (kind === 'crm-event') store.emit({ type: 'alert', id: uid(), kind, title: 'Novo agendamento', body: 'Rede Horizonte · amanhã 10h', ms: 6000 })
    if (kind === 'crm-won') store.emit({ type: 'alert', id: uid(), kind, title: 'Negócio fechado', body: 'Rede Horizonte · R$ 12.000', ms: 7000 })
    if (kind === 'claude-approval') store.emit({ type: 'alert', id: uid(), kind, title: 'Claude pede aprovação', body: 'Bash', ms: 4500 })
    if (kind === 'say') store.emit({ type: 'say', id: uid(), text: 'Oi! Estou de olho em tudo.', mood: 'happy', ms: 4500 })
  })

  tray = new Tray(nativeImage.createFromBuffer(dotPng('#4DF0A0')))
  tray.on('click', showControl)
  let lastStatus = store.state.status
  store.subscribe(() => {
    const s = store.state.status
    if (s !== lastStatus) {
      lastStatus = s
      refreshTray()
      const say = STATUS_SAY[s]
      store.emit({ type: 'say', id: uid(), text: say.text, mood: say.mood, ms: 3500 })
    }
  })
  refreshTray()

  const keys: [string, OfficeStatus][] = [
    ['CommandOrControl+Alt+1', 'available'],
    ['CommandOrControl+Alt+2', 'busy'],
    ['CommandOrControl+Alt+3', 'dnd'],
    ['CommandOrControl+Alt+4', 'away']
  ]
  for (const [acc, s] of keys) globalShortcut.register(acc, () => store.setStatus(s))

  // login automático (HKCU, sem admin)
  let auto = store.state.config.autostart
  app.setLoginItemSettings({ openAtLogin: auto })
  store.subscribe(() => {
    if (store.state.config.autostart !== auto) {
      auto = store.state.config.autostart
      app.setLoginItemSettings({ openAtLogin: auto })
    }
  })

  startHookServer()
  startZoho()
  openDashboard()
  watchDisplays()
  showControl()
})

app.on('window-all-closed', () => { /* continua na bandeja */ })
app.on('before-quit', () => setQuitting())
app.on('will-quit', () => globalShortcut.unregisterAll())
