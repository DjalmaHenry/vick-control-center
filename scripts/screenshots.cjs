const { app, BrowserWindow } = require('electron')
const { writeFileSync } = require('fs')
const { join } = require('path')
// Uso: npm run shots (gera docs/screenshots a partir de out/, com o estado simulado de api.ts)
const root = join(__dirname, '..')
const out = join(root, 'docs/screenshots')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let win
async function shot(page, w, h, name, setup, delay = 2200) {
  if (!win) { win = new BrowserWindow({ width: 1920, height: 480, show: false, useContentSize: true, webPreferences: { offscreen: true } }); win.webContents.setFrameRate(60) }
  win.setContentSize(w, h)
  await win.loadFile(join(root, `out/renderer/${page}/index.html`))
  await wait(900)
  if (setup) await win.webContents.executeJavaScript(setup)
  await wait(delay)
  const img = await win.webContents.capturePage()
  writeFileSync(join(out, name), img.toPNG())
  console.log('ok', name)
}

app.whenReady().then(async () => {
  const D = 'dashboard'
  await shot(D, 1920, 480, 'telinha-aurora.png', `__vick.setConfig({background:{kind:'aurora',dim:0.3}})`, 2500)
  await shot(D, 1920, 480, 'alerta-fechamento.png', `__vick.testEvent('crm-won')`, 1300)
  await shot(D, 1920, 480, 'alerta-agendamento.png', `__vick.testEvent('crm-event')`, 1500)
  await shot(D, 1920, 480, 'claude-aprovacao.png', `__vick.testEvent('claude-approval'); setTimeout(()=>document.querySelector('.alert')?.remove(), 10)`, 1600)
  await shot(D, 1920, 480, 'telinha-grade-dnd.png',
    `__vick.setStatus('dnd'); __vick.setConfig({background:{kind:'grid',dim:0.15}, layout:[{id:'a',type:'clock',span:2},{id:'b',type:'status',span:2},{id:'c',type:'crm-feed',span:4},{id:'d',type:'crm-chart',span:4}]})`, 2500)
  await shot(D, 1920, 480, 'telinha-ondas-mascote.png',
    `__vick.setStatus('available'); __vick.setConfig({background:{kind:'waves',dim:0.1}, layout:[{id:'a',type:'clock',span:3},{id:'c',type:'claude',span:5},{id:'k',type:'crm-kpi',span:4}]}); __vick.testEvent('say')`, 1500)
  await shot(D, 1920, 480, 'telinha-estrelas.png', `__vick.setStatus('busy'); __vick.setConfig({background:{kind:'stars',dim:0}})`, 2500)
  await shot('control', 1040, 700, 'central-painel.png', null, 2500)
  app.quit()
})
