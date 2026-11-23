/**
 * src/components/ui/StarButton.jsx
 * 2026-11-23 (Track H, step H7), as drawn:
 *   StarButton     the round Star button with the count, left of Save a copy in the bottom bar. The count shows
 *                  only when someone has starred (an empty star alone otherwise). Starred is amber and filled.
 *   StarCount      read-only star and number (the owner's own bar, and the cards on a public profile).
 *   StarNotice     one line when a star was refused (offline, daily limit, link gone).
 * The words and the rules live in utils/itemStars.js; the state in hooks/useItemStar.js.
 */

import { Star } from 'lucide-react'
import { STAR_WORDS, starCountText } from '../../utils/itemStars'

const TEXT = { fontFamily: 'var(--font-body)' }

export function StarButton({ star }) {
  if (!star.visible) return null
  const count = starCountText(star.stars)
  const on = star.starred
  return (
    <button
      type="button"
      onClick={star.toggle}
      aria-pressed={on}
      aria-label={count ? `${on ? STAR_WORDS.unstarLabel : STAR_WORDS.starLabel}. ${count}` : (on ? STAR_WORDS.unstarLabel : STAR_WORDS.starLabel)}
      style={{
        flexShrink: 0, minWidth: 48, minHeight: 48, padding: count ? '0 14px' : 0, boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 999,
        border: `1px solid ${on ? 'var(--color-warning)' : 'var(--color-border)'}`,
        backgroundColor: on ? 'var(--color-warning-light)' : 'var(--color-surface)',
        color: on ? 'var(--color-warning)' : 'var(--color-text-secondary)',
        cursor: 'pointer', opacity: star.busy ? 0.7 : 1,
        WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
      }}
    >
      <Star size={20} strokeWidth={1.8} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
      {count && <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}>{count}</span>}
    </button>
  )
}

export function StarCount({ stars, size = 14 }) {
  const count = starCountText(stars)
  if (!count) return null
  return (
    <span aria-label={`${count} stars`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...TEXT }}>
      <Star size={size} strokeWidth={1.8} aria-hidden="true" />
      <span>{count}</span>
    </span>
  )
}

export function StarNotice({ notice }) {
  if (!notice) return null
  return (
    <p role="alert" style={{ margin: '0 0 var(--space-2)', fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }}>
      {notice}
    </p>
  )
}
