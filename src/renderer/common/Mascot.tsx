import { useEffect, useRef, useState } from 'preact/hooks'
import type { AppEvent, AppState, MascotMood } from '../../shared/types'
import { api } from './api'

interface Say {
  id: string
  text: string
  mood: MascotMood
  ms: number
}

/** Vick: mascote próprio, desenhado em SVG. Humor muda olhos, boca e animação. */
function Vick({ mood }: { mood: MascotMood }) {
  return (
    <svg class={`vick m-${mood}`} viewBox="0 0 120 120" aria-hidden="true">
      <ellipse class="shadow" cx="60" cy="112" rx="30" ry="5" />
      <g class="body">
        <rect class="antenna" x="57" y="6" width="6" height="14" rx="3" />
        <circle class="bulb" cx="60" cy="6" r="6" />
        <rect class="ear" x="8" y="52" width="12" height="26" rx="6" />
        <rect class="ear" x="100" y="52" width="12" height="26" rx="6" />
        <rect class="hull" x="16" y="20" width="88" height="76" rx="26" />
        <rect class="face" x="26" y="32" width="68" height="46" rx="16" />
        <g class="eyes">
          <rect class="eye" x="40" y="46" width="12" height="16" rx="6" />
          <rect class="eye" x="68" y="46" width="12" height="16" rx="6" />
        </g>
        <path class="mouth" d="M52 68 Q60 74 68 68" />
        <rect class="foot" x="34" y="94" width="18" height="10" rx="5" />
        <rect class="foot" x="68" y="94" width="18" height="10" rx="5" />
      </g>
      {mood === 'sleepy' && (
        <g class="zzz">
          <text x="88" y="24">z</text>
          <text x="98" y="12">z</text>
        </g>
      )}
      {mood === 'alert' && <text class="bang" x="60" y="-2">!</text>}
      {mood === 'dnd' && (
        <g class="noentry">
          <circle cx="98" cy="22" r="13" />
          <rect x="91" y="20" width="14" height="4" rx="2" />
        </g>
      )}
    </svg>
  )
}

export function Mascot({ s }: { s: AppState }) {
  const [say, setSay] = useState<Say | null>(null)
  const timer = useRef<number>(0)
  const queue = useRef<Say[]>([])

  const next = () => {
    const n = queue.current.shift()
    if (!n) return setSay(null)
    setSay(n)
    timer.current = window.setTimeout(next, n.ms)
  }

  useEffect(
    () =>
      api.onEvent((e: AppEvent) => {
        if (e.type !== 'say') return
        queue.current.push({ id: e.id, text: e.text, mood: e.mood, ms: e.ms })
        if (!timer.current || !say) {
          clearTimeout(timer.current)
          next()
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // o status do usuário define o humor enquanto durar; só a aprovação do Claude o interrompe
  const base: MascotMood =
    s.claude.phase === 'awaiting' ? 'alert' : s.status === 'busy' ? 'focus' : s.status === 'dnd' ? 'dnd' : s.status === 'away' ? 'sleepy' : s.claude.phase === 'working' ? 'work' : 'idle'
  const mood = say?.mood ?? base

  return (
    <div class="mascot">
      {say && (
        <div class="bubble" key={say.id}>
          {say.text}
        </div>
      )}
      <Vick mood={mood} />
    </div>
  )
}
