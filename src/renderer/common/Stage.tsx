import type { ComponentChildren } from 'preact'
import { useEffect, useRef, useState } from 'preact/hooks'
import { STAGE_H, STAGE_W } from '../../shared/defaults'

/**
 * Palco fixo de 1920×480. Todo o design vive nessas coordenadas e o palco é
 * escalado (e girado, se a tela estiver em pé) para caber no container.
 */
export function Stage({ children, rotation = 0 }: { children: ComponentChildren; rotation?: 0 | 90 | 270 }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = box.current!
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const vw = rotation ? STAGE_H : STAGE_W
  const vh = rotation ? STAGE_W : STAGE_H
  const s = size.w && size.h ? Math.min(size.w / vw, size.h / vh) : 0
  const tf = rotation === 90 ? `translate(${STAGE_H * s}px,0) rotate(90deg) scale(${s})` : rotation === 270 ? `translate(0,${STAGE_W * s}px) rotate(-90deg) scale(${s})` : `scale(${s})`

  return (
    <div ref={box} class="stage-box">
      <div class="stage-frame" style={{ width: `${vw * s}px`, height: `${vh * s}px` }}>
        <div class="stage" style={{ transform: tf }}>
          {children}
        </div>
      </div>
    </div>
  )
}

/** rotação efetiva: em pé → gira para deitar */
export function effectiveRotation(pref: 'auto' | 0 | 90 | 270, w: number, h: number): 0 | 90 | 270 {
  if (pref !== 'auto') return pref
  return h > w ? 90 : 0
}
