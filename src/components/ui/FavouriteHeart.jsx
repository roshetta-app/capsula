/**
 * src/components/ui/FavouriteHeart.jsx
 *
 * One favourite heart for the drug page and the condition page, so both feel
 * the same. Tap to favourite: the heart squashes, springs past full size and
 * settles, a soft ring opens around it and six small hearts-dots fly outward
 * and fade. Tap to un-favourite: a short, quiet shrink and return, with no
 * burst. A light buzz on phones that support it.
 *
 * The animation only plays after a real tap that actually changes the state
 * (if favouriting is refused, e.g. the free limit sheet opens, nothing plays).
 * Keyframes live in globals.css (cap-heart-*), and are switched off by the
 * phone's reduce-motion setting.
 *
 * Props:
 *   active      boolean   — currently favourited
 *   onToggle    () => void
 *   size        number    — heart size in px (default 24)
 *   idleColor   string    — outline colour when not favourited
 *   style       object    — extra button styles (margins for the tap area)
 */
import { useEffect, useRef, useState } from 'react'
import { Heart } from 'lucide-react'
import { usePressed } from '../../hooks/usePressed'

const SPARKS = [0, 60, 120, 180, 240, 300]

export default function FavouriteHeart({
  active,
  onToggle,
  size = 24,
  idleColor = 'var(--color-favourite)',
  style,
}) {
  const [anim, setAnim] = useState({ type: null, n: 0 })
  const clickedRef = useRef(false)
  const clickTimer = useRef(null)
  const prevActive = useRef(active)
  const { pressed, handlers } = usePressed()

  useEffect(() => () => clearTimeout(clickTimer.current), [])

  useEffect(() => {
    if (prevActive.current !== active && clickedRef.current) {
      setAnim(a => ({ type: active ? 'pop' : 'unpop', n: a.n + 1 }))
      if (active && typeof navigator.vibrate === 'function') navigator.vibrate(12)
    }
    prevActive.current = active
  }, [active])

  function handleClick() {
    clickedRef.current = true
    clearTimeout(clickTimer.current)
    clickTimer.current = setTimeout(() => { clickedRef.current = false }, 700)
    onToggle()
  }

  const heartAnimation =
    anim.type === 'pop'   ? 'cap-heart-pop 0.5s cubic-bezier(0.34, 1.4, 0.5, 1)' :
    anim.type === 'unpop' ? 'cap-heart-unpop 0.25s ease-out' : 'none'

  return (
    <button
      type="button"
      onClick={handleClick}
      {...handlers}
      aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
      aria-pressed={active}
      style={{
        position: 'relative',
        flexShrink: 0,
        padding: 8,
        margin: -6,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: active ? 'var(--color-favourite)' : idleColor,
        transition: 'color 0.18s ease, transform var(--motion-fast) var(--ease-settle)',
        transform: pressed ? 'scale(0.88)' : 'scale(1)',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
        ...style,
      }}
    >
      <span style={{ position: 'relative', display: 'flex', width: size, height: size }}>
        {anim.type === 'pop' && (
          <span key={`fx-${anim.n}`} aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '2px solid var(--color-favourite)',
              animation: 'cap-heart-ring 0.5s ease-out forwards',
            }} />
            {SPARKS.map(a => (
              <span key={a} style={{
                position: 'absolute',
                left: '50%', top: '50%',
                width: Math.max(3, size * 0.16), height: Math.max(3, size * 0.16),
                margin: `${-Math.max(3, size * 0.16) / 2}px 0 0 ${-Math.max(3, size * 0.16) / 2}px`,
                borderRadius: '50%',
                background: 'var(--color-favourite)',
                '--a': `${a}deg`,
                '--d': `${size}px`,
                animation: 'cap-heart-spark 0.5s ease-out forwards',
              }} />
            ))}
          </span>
        )}
        <Heart
          key={`h-${anim.n}`}
          size={size}
          strokeWidth={2}
          fill={active ? 'currentColor' : 'none'}
          style={{ animation: heartAnimation, transition: 'fill 0.18s ease' }}
          aria-hidden="true"
        />
      </span>
    </button>
  )
}
