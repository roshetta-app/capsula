// The soft entrance of the Home screen (2026-11-20): the heading, the featured card and the two rows
// fade in and rise 6 px one after another, 60 ms apart, the same glide the Topics screen uses.
// Played once per browser session and never with "reduce motion". When it has finished the style is
// dropped completely, so no leftover transform or opacity sits on a row (a transform would trap the
// sheets that open from inside the rows).

export const HOME_ENTRANCE_STAGGER_MS = 60
export const HOME_ENTRANCE_TOTAL_MS = 200 + 4 * HOME_ENTRANCE_STAGGER_MS + 100

// phase: 'off' (do nothing), 'hidden' (before the first frame), 'in' (gliding), 'done' (back to nothing)
export function homeEntranceStyle({ phase = 'off', stage = 0 } = {}) {
  if (phase === 'off' || phase === 'done') return {}
  const delay = `${Math.max(0, stage) * HOME_ENTRANCE_STAGGER_MS}ms`
  const shown = phase === 'in'
  return {
    opacity: shown ? 1 : 0,
    transform: shown ? 'translateY(0)' : 'translateY(6px)',
    transition: `opacity var(--motion-base) var(--ease-reveal) ${delay}, transform var(--motion-base) var(--ease-settle) ${delay}`,
  }
}
