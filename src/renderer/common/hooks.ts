import { useEffect, useState } from 'preact/hooks'
import type { AppState } from '../../shared/types'
import { api } from './api'

export function useAppState(): AppState | null {
  const [s, setS] = useState<AppState | null>(null)
  useEffect(() => {
    void api.getState().then(setS)
    return api.onState(setS)
  }, [])
  return s
}

export function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return n
}

/** anima um número até o novo valor */
export function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(target)
  useEffect(() => {
    const from = v
    const t0 = performance.now()
    let raf = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms)
      setV(from + (target - from) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return v
}
