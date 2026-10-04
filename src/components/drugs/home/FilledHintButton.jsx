/**
 * src/components/drugs/home/FilledHintButton.jsx
 * 2026-10-04 (Drugs home split into small files): moved unchanged out of
 * DrugsScreen.jsx so the Search area, the Browse area and the screen's result
 * states can all use the same button.
 */

import { useState } from 'react'

// Phase 5 (§4.3/§5d, CORRECTED 2026-08-29 after on-device testing): shared
// filled/bordered treatment for this screen's "next action" hints. Uses
// var(--color-accent) — the app's existing single action color, already
// used for every other actionable text/link on this screen — rather than
// red, since red is this app's destructive/error color elsewhere and
// clearing a filter isn't destructive. "Search all drugs instead" and
// ClearFiltersButton both build on this.

export default function FilledHintButton({ onClick, children, style }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        border: '1.5px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent)',
        color: '#fff',
        fontSize: 13, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        lineHeight: 1,
        flexShrink: 0,
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        ...style,
      }}
    >
      {children}
    </button>
  )
}
