// Plays the Home entrance once per browser session (see utils/homeEntrance.js). Returns
// `entrance(stage)`: the style for the block at that stage (0 heading, 1 featured card, 2 roshettas,
// 3 groups). It is an empty object on a repeat visit in the same session, with "reduce motion", and
// once the glide has finished.
import { useEffect, useState } from 'react'
import { homeEntranceStyle, HOME_ENTRANCE_TOTAL_MS } from '../utils/homeEntrance'

const SESSION_KEY = 'capsula_home_entrance_played'

export function useHomeEntrance() {
  const [phase, setPhase] = useState(() => {
    try {
      const already = sessionStorage.getItem(SESSION_KEY) === 'true'
      sessionStorage.setItem(SESSION_KEY, 'true')
      if (already) return 'off'
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : 'hidden'
    } catch {
      return 'off'
    }
  })

  useEffect(() => {
    if (phase !== 'hidden') return undefined
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase('in')))
    return () => cancelAnimationFrame(raf)
  }, [phase])

  useEffect(() => {
    if (phase !== 'in') return undefined
    const t = setTimeout(() => setPhase('done'), HOME_ENTRANCE_TOTAL_MS)
    return () => clearTimeout(t)
  }, [phase])

  return stage => homeEntranceStyle({ phase, stage })
}
