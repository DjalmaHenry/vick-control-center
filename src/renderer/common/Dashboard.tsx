import type { AppState } from '../../shared/types'
import { AlertLayer } from './AlertLayer'
import { Background } from './Background'
import { Mascot } from './Mascot'
import { Widget } from './widgets'

export function Dashboard({ s }: { s: AppState }) {
  const total = s.config.layout.reduce((a, w) => a + w.span, 0)
  return (
    <div class={`dash ${s.claude.phase === 'awaiting' ? 'is-awaiting' : ''} ${s.config.mascot.enabled ? 'with-mascot' : ''}`}>
      <Background bg={s.config.background} />
      <main class="grid" style={{ '--cols': Math.max(12, total) }}>
        {s.config.layout.map((w) => (
          <div class="slot" key={w.id} style={{ gridColumn: `span ${w.span}` }}>
            <Widget slot={w} s={s} />
          </div>
        ))}
      </main>
      {s.config.mascot.enabled && <Mascot s={s} />}
      <div class="edge-glow" />
      <AlertLayer />
    </div>
  )
}
