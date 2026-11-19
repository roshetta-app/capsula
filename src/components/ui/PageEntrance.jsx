// Wraps the screen inside the app layout and fades it in by the rules in utils/pageEntrance.js.
// It decides again whenever the path changes, WITHOUT remounting the screen (the children keep their
// state exactly as before). When the fade has finished its style is removed completely (no leftover
// opacity on the page).
import { useEffect, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { pageEntranceKind, pageFadeStyle, PAGE_FADE_MS, TAB_ROOTS } from '../../utils/pageEntrance'

const SEEN_PREFIX = 'capsula_page_entrance_'

function decide(pathname, navType) {
  let seenTab = false
  let reduceMotion = false
  try {
    if (TAB_ROOTS.includes(pathname)) {
      seenTab = sessionStorage.getItem(SEEN_PREFIX + pathname) === 'true'
      sessionStorage.setItem(SEEN_PREFIX + pathname, 'true')
    }
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch { /* storage or matchMedia unavailable: play nothing special */ }
  return pageEntranceKind({ pathname, navType, seenTab, reduceMotion }) === 'fade' ? 'hidden' : 'off'
}

export default function PageEntrance({ children }) {
  const { pathname } = useLocation()
  const navType = useNavigationType()
  const [state, setState] = useState(() => ({ path: pathname, phase: decide(pathname, navType) }))
  let { phase } = state
  if (state.path !== pathname) {
    phase = decide(pathname, navType)
    setState({ path: pathname, phase })
  }

  useEffect(() => {
    if (phase === 'hidden') {
      const raf = requestAnimationFrame(() => setState(s => (s.path === pathname ? { ...s, phase: 'in' } : s)))
      return () => cancelAnimationFrame(raf)
    }
    if (phase === 'in') {
      const t = setTimeout(() => setState(s => (s.path === pathname ? { ...s, phase: 'done' } : s)), PAGE_FADE_MS + 60)
      return () => clearTimeout(t)
    }
    return undefined
  }, [phase, pathname])

  return <div style={pageFadeStyle(phase)}>{children}</div>
}
