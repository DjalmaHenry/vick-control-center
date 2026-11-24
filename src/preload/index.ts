import { contextBridge, ipcRenderer } from 'electron'
import type { AppEvent, AppState, VickApi } from '../shared/types'

const api: VickApi = {
  isElectron: true,
  getState: () => ipcRenderer.invoke('state:get'),
  onState: (cb) => {
    const h = (_: unknown, s: AppState) => cb(s)
    ipcRenderer.on('state', h)
    return () => ipcRenderer.removeListener('state', h)
  },
  onEvent: (cb) => {
    const h = (_: unknown, e: AppEvent) => cb(e)
    ipcRenderer.on('event', h)
    return () => ipcRenderer.removeListener('event', h)
  },
  setConfig: (p) => ipcRenderer.invoke('config:set', p),
  setLayout: (l) => ipcRenderer.invoke('config:set', { layout: l }),
  setStatus: (s) => ipcRenderer.invoke('status:set', s),
  pickBackground: () => ipcRenderer.invoke('bg:pick'),
  testEvent: (k) => ipcRenderer.invoke('test:event', k),
  claudeHooks: (a) => ipcRenderer.invoke('claude:hooks', a),
  zohoTest: () => ipcRenderer.invoke('zoho:test'),
  listDisplays: () => ipcRenderer.invoke('displays:list'),
  mediaUrl: (f) => `vick-media://m/${encodeURIComponent(f)}`
}

contextBridge.exposeInMainWorld('vick', api)
