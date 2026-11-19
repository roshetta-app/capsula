/**
 * src/components/home/HomeTagline.jsx
 * 2026-11-16 (Phase J step 11.1): the rotating line under the welcome heading on Home. The three lines
 * come from src/utils/homeTaglines.js. They crossfade every few seconds. All three sit in one grid
 * cell, so the height is that of the tallest line and a long line wraps (large text) instead of being
 * cut. Only the showing line is read out by a screen reader. With "reduce motion" on, the first line
 * stays and nothing rotates. The timer stops while the app is in the background.
 */

import { useEffect, useState } from 'react'
import { HOME_TAGLINES, nextTaglineIndex, TAGLINE_VISIBLE_MS, TAGLINE_FADE_MS } from '../../utils/homeTaglines'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function HomeTagline() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      setIndex(i => nextTaglineIndex(i))
    }, TAGLINE_VISIBLE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ display: 'grid' }}>
      {HOME_TAGLINES.map((text, i) => (
        <p
          key={text}
          aria-hidden={i === index ? undefined : 'true'}
          style={{
            gridArea: '1 / 1', margin: 0, overflowWrap: 'anywhere',
            fontSize: 15, fontWeight: 500, lineHeight: 1.4, letterSpacing: '-0.1px',
            color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)',
            opacity: i === index ? 1 : 0, transition: `opacity ${TAGLINE_FADE_MS}ms ease`,
          }}
        >
          {text}
        </p>
      ))}
    </div>
  )
}
