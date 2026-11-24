import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import '../common/stage.css'
import { Dashboard } from '../common/Dashboard'
import { Stage, effectiveRotation } from '../common/Stage'
import { useAppState } from '../common/hooks'

function App() {
  const s = useAppState()
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight })
  useEffect(() => {
    const f = () => setVp({ w: innerWidth, h: innerHeight })
    addEventListener('resize', f)
    return () => removeEventListener('resize', f)
  }, [])
  if (!s) return null
  return (
    <Stage rotation={effectiveRotation(s.config.display.rotation, vp.w, vp.h)}>
      <Dashboard s={s} />
    </Stage>
  )
}

render(<App />, document.getElementById('app')!)
