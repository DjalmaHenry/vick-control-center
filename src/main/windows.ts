import { BrowserWindow, screen, shell, type Display } from 'electron'
import { join } from 'node:path'
import { store } from './store'
import type { DisplayOption } from '../shared/types'

let dashboard: BrowserWindow | null = null
let control: BrowserWindow | null = null
export let quitting = false
export const setQuitting = () => (quitting = true)

const isTelinhaSize = (w: number, h: number) => (w === 1920 && h === 480) || (w === 480 && h === 1920)
const isTelinha = (d: Display) => isTelinhaSize(d.size.width, d.size.height) || isTelinhaSize(Math.round(d.size.width * d.scaleFactor), Math.round(d.size.height * d.scaleFactor))

export function listDisplays(): DisplayOption[] {
  return screen.getAllDisplays().map((d) => ({
    id: d.id,
    label: d.label || `Tela ${d.id}`,
    size: `${d.size.width}×${d.size.height}`,
    isTelinha: isTelinha(d)
  }))
}

function pickDisplay(): Display | null {
  const t = store.state.config.display.target
  const all = screen.getAllDisplays()
  if (t === 'preview') return null
  if (typeof t === 'number') return all.find((d) => d.id === t) ?? null
  return all.find(isTelinha) ?? null
}

function load(win: BrowserWindow, page: 'dashboard' | 'control') {
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}/${page}/index.html`)
  else void win.loadFile(join(__dirname, `../renderer/${page}/index.html`))
}

const webPreferences = () => ({ preload: join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: true, backgroundThrottling: false })

export function openDashboard() {
  const d = pickDisplay()
  if (dashboard && !dashboard.isDestroyed()) dashboard.destroy()
  store.patch({ displayInfo: d ? { mode: 'telinha', label: `${d.size.width}×${d.size.height}` } : { mode: 'preview', label: 'Prévia' } })

  if (d) {
    dashboard = new BrowserWindow({
      ...d.bounds,
      frame: false,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      focusable: false,
      show: false,
      backgroundColor: '#06080C',
      webPreferences: webPreferences()
    })
    dashboard.setAlwaysOnTop(true, 'screen-saver')
    dashboard.setMenuBarVisibility(false)
    dashboard.once('ready-to-show', () => {
      dashboard?.setBounds(d.bounds)
      dashboard?.showInactive()
    })
  } else {
    dashboard = new BrowserWindow({
      width: 960,
      height: 240,
      useContentSize: true,
      title: 'Vick · prévia',
      autoHideMenuBar: true,
      backgroundColor: '#06080C',
      show: false,
      webPreferences: webPreferences()
    })
    dashboard.setAspectRatio(4)
    dashboard.once('ready-to-show', () => dashboard?.showInactive())
  }
  dashboard.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      dashboard?.hide()
    }
  })
  load(dashboard, 'dashboard')
}

export function showControl() {
  if (control && !control.isDestroyed()) {
    if (control.isMinimized()) control.restore()
    control.show()
    control.focus()
    return
  }
  control = new BrowserWindow({
    width: 1040,
    height: 700,
    minWidth: 900,
    minHeight: 620,
    title: 'Vick',
    backgroundColor: '#0A0D12',
    autoHideMenuBar: true,
    show: false,
    webPreferences: webPreferences()
  })
  control.once('ready-to-show', () => control?.show())
  control.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  control.on('close', (e) => {
    if (!quitting) {
      e.preventDefault()
      control?.hide()
    }
  })
  load(control, 'control')
}

export function watchDisplays() {
  const re = () => openDashboard()
  screen.on('display-added', re)
  screen.on('display-removed', re)
  let sig = JSON.stringify(store.state.config.display)
  store.subscribe(() => {
    const s = JSON.stringify(store.state.config.display)
    if (s !== sig) {
      sig = s
      openDashboard()
    }
  })
}
