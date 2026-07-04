/**
 * src/components/conditions/SwipeToRemoveRow.jsx
 *
 * Wraps a single row (a ConditionCard, on the Favourites screen's Conditions
 * tab) with a reveal-then-tap swipe-to-remove gesture — swiping left reveals
 * a fixed-width red "Remove" action behind the row; the row itself never
 * flies off-screen on its own. A second, deliberate tap on the revealed
 * action is what actually removes it. This is intentionally the *safer* of
 * the two interaction models discussed (vs. full swipe-through) — the swipe
 * itself is non-destructive, and removal always requires its own tap.
 *
 * Deliberately NOT built (out of scope for this pass, not an oversight):
 *   - Auto-closing other open rows when a new one opens. Each row tracks its
 *     own offset independently. With favourites lists typically short, this
 *     wasn't judged worth the extra state-lifting; revisit if it's noticed
 *     as annoying in practice.
 *
 * Interaction notes:
 *   - Axis-locks on first meaningful movement (>6px) so a mostly-vertical
 *     drag is left alone for the page's own scroll — mirrors the
 *     dx-vs-dy-dominance check FavouritesScreen's tab-swipe already uses,
 *     just evaluated continuously instead of once on touchend.
 *   - onClickCapture swallows the tap that would otherwise reach
 *     ConditionCard's own onClick (its whole row is a single tap target)
 *     whenever the row is open, or whenever the gesture that just ended was
 *     a real drag — this is what stops a swipe from also firing navigation
 *     via the browser's synthetic click-after-touch.
 *   - Every touch handler below calls e.stopPropagation() unconditionally
 *     (not just once axis-locked to 'x'). FavouritesScreen wraps its entire
 *     tab content in its own touchstart/touchend pair to handle tab-switch
 *     swipes, and since this row covers almost the full list, without this
 *     stop a swipe starting on a row would bubble up and fire both gesture
 *     systems at once — sometimes revealing Remove AND switching tabs from
 *     the same swipe. The row now always owns a gesture that starts on it;
 *     switching tabs by swipe still works from any empty space outside a
 *     row, and tapping the tab button always works regardless.
 */

import { useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

const ACTION_WIDTH  = 84 // px revealed behind the row when fully open
const OPEN_THRESHOLD = ACTION_WIDTH / 2 // drag past this distance snaps open on release
const AXIS_LOCK_SLOP = 6  // px of movement before we decide horizontal vs. vertical
const TAP_SLOP        = 8 // px — drags under this still count as a tap, not a swipe

export default function SwipeToRemoveRow({ children, onRemove }) {
  const [offset, setOffset]     = useState(0) // 0 = closed, -ACTION_WIDTH = fully open
  const [dragging, setDragging] = useState(false)

  const startX          = useRef(null)
  const startY          = useRef(null)
  const startOffset     = useRef(0)
  const axisLocked      = useRef(null)  // 'x' | 'y' | null, decided once per gesture
  const suppressClickRef = useRef(false)

  function handleTouchStart(e) {
    e.stopPropagation() // keep FavouritesScreen's tab-swipe handler from also seeing this gesture
    startX.current      = e.touches[0].clientX
    startY.current       = e.touches[0].clientY
    startOffset.current  = offset
    axisLocked.current   = null
    setDragging(true)
  }

  function handleTouchMove(e) {
    e.stopPropagation() // same reason as handleTouchStart
    if (startX.current === null) return
    const dx = e.touches[0].clientX - startX.current
    const dy = e.touches[0].clientY - startY.current

    if (axisLocked.current === null) {
      if (Math.abs(dx) < AXIS_LOCK_SLOP && Math.abs(dy) < AXIS_LOCK_SLOP) return
      axisLocked.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (axisLocked.current !== 'x') return // vertical drag — let the page scroll

    e.preventDefault() // we own this gesture now
    setOffset(Math.min(0, Math.max(-ACTION_WIDTH, startOffset.current + dx)))
  }

  function handleTouchEnd(e) {
    e.stopPropagation() // same reason as handleTouchStart
    if (startX.current === null) return

    if (axisLocked.current === 'x' && Math.abs(offset - startOffset.current) > TAP_SLOP) {
      suppressClickRef.current = true
    }

    setOffset(prev => (Math.abs(prev) > OPEN_THRESHOLD ? -ACTION_WIDTH : 0))

    startX.current    = null
    startY.current    = null
    axisLocked.current = null
    setDragging(false)
  }

  // Closes an open row instead of letting the tap reach the card underneath;
  // also absorbs the browser's synthetic click-after-touch following a real
  // drag, so a swipe can never also register as a navigation tap.
  function handleClickCapture(e) {
    if (offset !== 0 || suppressClickRef.current) {
      e.preventDefault()
      e.stopPropagation()
      suppressClickRef.current = false
      if (offset !== 0) setOffset(0)
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>

      {/* Behind layer — revealed remove action, fixed width, right-aligned */}
      <div
        aria-hidden={offset === 0}
        style={{
          position:        'absolute',
          top:             0,
          bottom:          0,
          right:           0,
          width:           ACTION_WIDTH,
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          backgroundColor: 'var(--color-danger)',
        }}
      >
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          aria-label="Remove from favourites"
          tabIndex={offset === 0 ? -1 : 0}
          style={{
            width:                   '100%',
            height:                  '100%',
            display:                 'flex',
            flexDirection:           'column',
            alignItems:              'center',
            justifyContent:          'center',
            gap:                     4,
            background:              'none',
            border:                  'none',
            color:                   '#fff',
            fontSize:                11,
            fontWeight:              600,
            fontFamily:              'var(--font-body)',
            cursor:                  'pointer',
            outline:                 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <Trash2 size={18} strokeWidth={2} />
          Remove
        </button>
      </div>

      {/* Foreground — the row itself, translated to reveal the action behind
          it. Opaque background so it fully hides the red layer while closed. */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleClickCapture}
        style={{
          position:        'relative',
          transform:       `translateX(${offset}px)`,
          transition:      dragging ? 'none' : 'transform 0.2s ease',
          backgroundColor: 'var(--color-bg)',
        }}
      >
        {children}
      </div>
    </div>
  )
}
