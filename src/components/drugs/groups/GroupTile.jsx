/**
 * src/components/drugs/groups/GroupTile.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): one group as a tile, or the "New
 * group" tile. Same look as the category tiles (CategoryRow.jsx): soft muted
 * fill, no border, 16px corners, same press feedback.
 *
 * Props:
 *   group        { id, name, color, brandIds }  (not needed when isNew)
 *   isNew        true -> the "New group" tile
 *   showProBadge on the New group tile: free account at its limit
 *   waiting      true when this group has changes saved on the phone and not yet sent
 *   animate      true -> soft fade-in (a group just added or renamed)
 *   onOpen       tap handler
 *
 * The group's colour is one of ten fixed names (blue, teal, violet, amber,
 * rose, green, orange, pink, indigo, cyan), read through the app's colour tokens so light and dark both work.
 * An Arabic name is left-aligned like an English one (decision 2026-10-19).
 *
 * 2026-10-20 (Drug groups plan, step 11.5): flat look. A group is a tile filled with its
 * own soft colour, a big drug count at the top and the name under it, no border. The
 * New group tile is the same size with a dashed line and a plus. 'animate' gives a tile
 * that was just added or renamed a short soft fade-in (the class is defined in
 * GroupsSection.jsx).
 *
 * 2026-10-22 (UI refresh plan, step 8.2a): the tile is now a card in the sideways row on the
 * Drugs home. Surface fill with a thin border, a small tile in the group's colour with a
 * folder, then the name, the drug count and the first drug names, each on one line. The New
 * group card is the same size with a dashed line. 'drugNames' is the preview line. 'fill' (step
 * 8.2b, the See all screen) makes the card fill its grid column instead of the fixed width.
 *
 * 2026-10-22 (UI refresh, card refinement, approved by Lmar): softer card. No border; a soft wash
 * of the group's own colour; round icon at the top left, drug-count pill at the top right, name
 * (15) and the first two different drug names with '+ more' at the bottom. 'drugNames' is the
 * list of names; the card joins them itself (they used to run together with no separator).
 *
 * 2026-10-22 (UI refresh, step 8.9, approved drawing): folder-shaped card. A small tab at the top
 * left (rounded top-left corner, slanted right edge) and a body with a square top-left corner and
 * 20 corners elsewhere, in the same wash colour so they read as one piece. Inside the body, top to
 * bottom: the name (16 bold, two lines), the first three different drug names on one flowing line
 * (13, two lines at most), then the drug count as plain text in the group's colour (12 semibold)
 * with the waiting mark or the PRO pill at the bottom right. No round icon, no pill, no '+N'.
 */

import { useState } from 'react'
import { Plus, CloudUpload } from 'lucide-react'
import { resolveToken } from '../../../utils/specialtyTokens'
import { useIsDark } from '../../../utils/specialtyIcon'

export function drugCountLabel(n) {
  return n === 1 ? '1 drug' : `${n} drugs`
}

export function ProPill() {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3,
      padding: '2px 7px', borderRadius: 'var(--radius-pill)',
      backgroundColor: 'var(--color-accent-light)', color: 'var(--color-accent)',
      fontFamily: 'var(--font-body)', flexShrink: 0,
    }}>
      PRO
    </span>
  )
}

// The small mark on a group that has changes not yet sent (step 17.6a).
export function WaitingMark({ size = 14, color = 'var(--color-text-secondary)' }) {
  return (
    <span role="img" aria-label="Waiting to save" title="Waiting to save" style={{ display: 'flex', flexShrink: 0 }}>
      <CloudUpload size={size} color={color} aria-hidden="true" />
    </span>
  )
}

export const CARD_WIDTH = 156

const SOFT_TEXT = 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)'

// Folder measurements (step 8.9): the tab sits on top of the body, a 1px overlap hides any seam.
const TAB_WIDTH = 66
const TAB_HEIGHT = 14
const BODY_MIN_HEIGHT = 114
const BODY_RADIUS = '0 20px 20px 20px'

// Up to this many lines, then '…'.
function clampLines(n) {
  return { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: n, overflow: 'hidden', overflowWrap: 'anywhere' }
}

export default function GroupTile({ group, isNew = false, showProBadge = false, waiting = false, animate = false, drugNames = '', fill = false, onOpen }) {
  const [pressed, setPressed] = useState(false)
  const isDark = useIsDark()
  const colors = resolveToken(isNew ? 'slate' : group?.color, isDark)
  const name = isNew ? 'New group' : (group?.name ?? '')
  const count = group?.brandIds?.length ?? 0

  // Preview line: the first three different names, joined with commas. The count is on the card.
  const names = Array.isArray(drugNames) ? drugNames : (drugNames ? [drugNames] : [])
  const shownNames = [...new Set(names)].slice(0, 3)
  const moreCount = Math.max(0, count - shownNames.length)   // step 8.13: '+N' for the drugs not named
  const preview = shownNames.join(', ') + (shownNames.length > 0 && moreCount > 0 ? ` +${moreCount}` : '')

  // Tab and body share one opaque colour, so the folder has no seam and no border.
  const wash = isNew
    ? 'color-mix(in srgb, var(--color-text-primary) 5%, var(--color-bg))'
    : `color-mix(in srgb, ${colors.fg} 12%, var(--color-surface))`
  const countColor = `color-mix(in srgb, ${colors.fg} 72%, var(--color-text-primary))`

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className={animate ? 'group-soft-in' : undefined}
      aria-label={isNew ? 'New group' : `${name}, ${drugCountLabel(count)}`}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.() } }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        flex: fill ? '1 1 auto' : `0 0 ${CARD_WIDTH}px`, width: fill ? '100%' : CARD_WIDTH, minWidth: 0, scrollSnapAlign: 'start',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
        outline: 'none',
        WebkitTapHighlightColor: 'transparent',
        opacity: pressed ? 0.8 : 1,
        transform: pressed ? 'scale(0.985)' : 'scale(1)',
        transition: 'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        boxSizing: 'border-box',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: TAB_WIDTH, height: TAB_HEIGHT + 1, marginBottom: -1, flexShrink: 0, alignSelf: 'flex-start',
          backgroundColor: wash,
          borderTopLeftRadius: 12,
          clipPath: 'polygon(0 0, 74% 0, 100% 100%, 0 100%)',
        }}
      />

      <div style={{
        flex: '1 1 auto', minWidth: 0, minHeight: BODY_MIN_HEIGHT, boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 10,
        backgroundColor: wash, borderRadius: BODY_RADIUS, padding: 14,
      }}>
        <div style={{ minWidth: 0 }}>
          <div dir="ltr" style={{
            ...clampLines(2), textAlign: 'left',
            fontSize: 16, fontWeight: 700, lineHeight: 1.25, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
          }}>
            {name}
          </div>
          {isNew ? (
            <div style={{ ...clampLines(2), marginTop: 4, fontSize: 13, lineHeight: 1.3, fontFamily: 'var(--font-body)', color: SOFT_TEXT }}>Start a list</div>
          ) : preview ? (
            <div style={{ ...clampLines(2), marginTop: 4, fontSize: 12, lineHeight: 1.35, fontFamily: 'var(--font-body)', color: SOFT_TEXT }}>{preview}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)', minWidth: 0 }}>
          {isNew
            ? <Plus size={18} strokeWidth={2} color={SOFT_TEXT} aria-hidden="true" />
            : (
              <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2, fontFamily: 'var(--font-body)', color: countColor, minWidth: 0 }}>
                {count === 0 ? 'No drugs yet' : drugCountLabel(count)}
              </span>
            )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {!isNew && waiting && <WaitingMark />}
            {isNew && showProBadge && <ProPill />}
          </div>
        </div>
      </div>
    </div>
  )
}
