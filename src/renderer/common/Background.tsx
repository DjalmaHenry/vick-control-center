import { useEffect, useRef } from 'preact/hooks'
import { STAGE_H, STAGE_W } from '../../shared/defaults'
import type { BackgroundConfig } from '../../shared/types'
import { api } from './api'

type Painter = (c: CanvasRenderingContext2D, t: number, dt: number) => void

const W = STAGE_W
const H = STAGE_H

function aurora(): Painter {
  const blobs = [
    { c: '70,230,216', x: 0.2, y: 0.5, r: 520, sx: 0.00007, sy: 0.00011, p: 0 },
    { c: '139,123,255', x: 0.55, y: 0.3, r: 600, sx: 0.00009, sy: 0.00006, p: 2 },
    { c: '255,176,46', x: 0.85, y: 0.7, r: 420, sx: 0.00011, sy: 0.00009, p: 4 },
    { c: '77,240,160', x: 0.4, y: 0.9, r: 480, sx: 0.00008, sy: 0.00012, p: 1 }
  ]
  return (c, t) => {
    c.fillStyle = '#06080C'
    c.fillRect(0, 0, W, H)
    c.globalCompositeOperation = 'lighter'
    for (const b of blobs) {
      const x = W * (b.x + Math.sin(t * b.sx * 6 + b.p) * 0.28)
      const y = H * (b.y + Math.cos(t * b.sy * 6 + b.p) * 0.55)
      const g = c.createRadialGradient(x, y, 0, x, y, b.r)
      g.addColorStop(0, `rgba(${b.c},0.30)`)
      g.addColorStop(1, `rgba(${b.c},0)`)
      c.fillStyle = g
      c.fillRect(0, 0, W, H)
    }
    c.globalCompositeOperation = 'source-over'
  }
}

function grid(): Painter {
  return (c, t) => {
    c.fillStyle = '#06080C'
    c.fillRect(0, 0, W, H)
    const hor = H * 0.18
    const g = c.createLinearGradient(0, hor, 0, H)
    g.addColorStop(0, 'rgba(70,230,216,0)')
    g.addColorStop(1, 'rgba(70,230,216,0.22)')
    c.strokeStyle = g
    c.lineWidth = 1.2
    const speed = (t / 1000) * 0.5
    for (let i = 0; i < 14; i++) {
      const k = ((i + speed) % 14) / 14
      const y = hor + Math.pow(k, 2.2) * (H - hor)
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke()
    }
    for (let i = -24; i <= 24; i++) {
      c.beginPath(); c.moveTo(W / 2 + i * 12, hor); c.lineTo(W / 2 + i * 150, H); c.stroke()
    }
  }
}

function rain(): Painter {
  const cols = Math.floor(W / 28)
  const drops = Array.from({ length: cols }, () => ({ y: Math.random() * H, v: 40 + Math.random() * 110, len: 40 + Math.random() * 120 }))
  return (c, _t, dt) => {
    c.fillStyle = '#06080C'
    c.fillRect(0, 0, W, H)
    drops.forEach((d, i) => {
      d.y += d.v * dt
      if (d.y - d.len > H) { d.y = -10; d.v = 40 + Math.random() * 110 }
      const g = c.createLinearGradient(0, d.y - d.len, 0, d.y)
      g.addColorStop(0, 'rgba(70,230,216,0)')
      g.addColorStop(1, 'rgba(70,230,216,0.35)')
      c.fillStyle = g
      c.fillRect(i * 28 + 12, d.y - d.len, 2, d.len)
    })
  }
}

function stars(): Painter {
  const s = Array.from({ length: 220 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.2 + Math.random() * 0.8, p: Math.random() * 6 }))
  return (c, t, dt) => {
    c.fillStyle = '#06080C'
    c.fillRect(0, 0, W, H)
    for (const p of s) {
      p.x -= 14 * p.z * p.z * dt
      if (p.x < 0) { p.x = W; p.y = Math.random() * H }
      const tw = 0.6 + 0.4 * Math.sin(t / 700 + p.p)
      c.fillStyle = `rgba(200,240,255,${0.5 * p.z * tw})`
      c.fillRect(p.x, p.y, 1 + p.z * 1.4, 1 + p.z * 1.4)
    }
  }
}

function waves(): Painter {
  const cols = ['70,230,216', '139,123,255', '255,176,46']
  return (c, t) => {
    c.fillStyle = '#06080C'
    c.fillRect(0, 0, W, H)
    cols.forEach((col, k) => {
      c.beginPath()
      c.moveTo(0, H)
      for (let x = 0; x <= W; x += 24) {
        const y = H * (0.62 + k * 0.08) + Math.sin(x / (240 + k * 90) + t / (1600 - k * 280)) * (26 + k * 10)
        c.lineTo(x, y)
      }
      c.lineTo(W, H)
      c.closePath()
      c.fillStyle = `rgba(${col},0.10)`
      c.fill()
      c.strokeStyle = `rgba(${col},0.35)`
      c.stroke()
    })
  }
}

const makers: Record<string, () => Painter> = { aurora, grid, rain, stars, waves }

export function BackgroundCanvas({ kind }: { kind: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!.getContext('2d')!
    const paint = makers[kind]?.()
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000)
      last = t
      paint?.(c, t, dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [kind])
  return <canvas ref={ref} class="bg-layer" width={W} height={H} />
}

export function Background({ bg }: { bg: BackgroundConfig }) {
  let layer = null
  if (bg.kind === 'file' && bg.file) {
    const url = api.mediaUrl(bg.file)
    layer = /\.(mp4|webm)$/i.test(bg.file) ? <video class="bg-layer" src={url} autoPlay loop muted playsInline /> : <img class="bg-layer" src={url} alt="" />
  } else if (bg.kind !== 'none' && bg.kind !== 'file') {
    layer = <BackgroundCanvas kind={bg.kind} />
  }
  return (
    <div class="bg">
      {layer}
      <div class="bg-dim" style={{ opacity: bg.dim }} />
    </div>
  )
}
