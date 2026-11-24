import { useEffect, useRef, useState } from 'preact/hooks'
import type { AppEvent } from '../../shared/types'
import { api } from './api'

type Alert = Extract<AppEvent, { type: 'alert' }>

function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current!.getContext('2d')!
    const cols = ['#4DF0A0', '#46E6D8', '#FFB02E', '#8B7BFF', '#fff']
    const ps = Array.from({ length: 140 }, () => ({
      x: 960 + (Math.random() - 0.5) * 300,
      y: 240,
      vx: (Math.random() - 0.5) * 1400,
      vy: -300 - Math.random() * 700,
      r: 4 + Math.random() * 6,
      c: cols[Math.floor(Math.random() * cols.length)],
      a: Math.random() * 6
    }))
    let raf = 0
    let last = performance.now()
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      c.clearRect(0, 0, 1920, 480)
      for (const p of ps) {
        p.vy += 1500 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vx *= 0.995
        p.a += dt * 8
        c.save()
        c.translate(p.x, p.y)
        c.rotate(p.a)
        c.fillStyle = p.c
        c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r)
        c.restore()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={ref} width={1920} height={480} class="confetti" />
}

export function AlertLayer() {
  const [cur, setCur] = useState<Alert | null>(null)
  const queue = useRef<Alert[]>([])
  const busy = useRef(false)

  const run = () => {
    const a = queue.current.shift()
    if (!a) {
      busy.current = false
      setCur(null)
      return
    }
    busy.current = true
    setCur(a)
    setTimeout(run, a.ms)
  }

  useEffect(
    () =>
      api.onEvent((e) => {
        if (e.type !== 'alert') return
        queue.current.push(e)
        if (!busy.current) run()
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  if (!cur) return null
  return (
    <div class={`alert k-${cur.kind}`} key={cur.id} style={{ '--ms': `${cur.ms}ms` }}>
      <i class="burst b1" />
      <i class="burst b2" />
      <i class="burst b3" />
      <div class="alert-band">
        <div class="alert-title">{cur.title}</div>
        {cur.body && <div class="alert-body">{cur.body}</div>}
      </div>
      {cur.kind === 'crm-won' && <Confetti />}
    </div>
  )
}
