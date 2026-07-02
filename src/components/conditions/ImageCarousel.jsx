/**
 * ImageCarousel — swipeable image carousel (Phase 4.2).
 *
 * Layout:
 *   - Image itself is full-bleed: breaks out of the parent's lateral
 *     padding (var(--space-6), the panel padding set in
 *     ConditionDetailScreen.jsx) via negative inline margins + matching
 *     width increase, so it runs edge-to-edge on the screen. Dots and
 *     caption stay inside the normal content width, unaffected.
 *   - 4:3 aspect ratio via `aspect-ratio` (not the old padding-top %
 *     trick — percentage padding resolves against the *containing
 *     block's* width, which stays narrower than this element once it's
 *     broken out with negative margins, so the padding-top hack would
 *     flatten the image; aspect-ratio is self-referential and immune
 *     to that).
 *   - object-fit: cover, object-position: center
 *   - No border-radius — full-bleed edges are flush with the screen,
 *     rounding would look wrong there.
 *   - Order: image → dots → caption
 *   - Caption slot always reserves its own height (fixed height, fixed
 *     margin-top) whether or not a caption is present, so content below
 *     the carousel doesn't shift up/down depending on caption presence.
 *   - Caption row is a flex row with a leading image icon. dir="auto"
 *     on the row lets the browser resolve RTL/LTR from the caption
 *     text; flex's default row order then visually flips with it, so
 *     the icon sits left of LTR captions and right of RTL captions
 *     with no manual direction branching.
 *
 * Interaction:
 *   - Swipe threshold: 50px
 *   - Tap (< 8px movement on BOTH axes) → opens Lightbox. Requiring both dx
 *     and dy to stay small (not just dx) prevents a vertical page-scroll
 *     gesture over the image — which can have a small horizontal delta —
 *     from being misread as a tap and accidentally opening the lightbox.
 *   - e.stopPropagation() on touchstart blocks parent tab-switcher
 *
 * Props:
 *   images  { id, url, caption }[]
 */
import { useState, useRef, useCallback } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import Lightbox from '../ui/Lightbox'

export default function ImageCarousel({ images = [] }) {
  const [index,        setIndex]    = useState(0)
  const [lightboxOpen, setLightbox] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const goTo   = useCallback((i) => setIndex(Math.max(0, Math.min(images.length - 1, i))), [images.length])
  const openAt = useCallback((i) => { setIndex(i); setLightbox(true) }, [])

  if (!images.length) return null

  const current = images[index]

  function onTouchStart(e) {
    e.stopPropagation()
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    if (touchStartX.current === null) return
    const dx    = e.changedTouches[0].clientX - touchStartX.current
    const dy    = e.changedTouches[0].clientY - touchStartY.current
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    touchStartX.current = null
    touchStartY.current = null

    if (absDx >= 50) {
      // Swipe — change image
      if (dx < 0 && index < images.length - 1) setIndex(i => i + 1)
      if (dx > 0 && index > 0)                 setIndex(i => i - 1)
    } else if (absDx < 8 && absDy < 8) {
      // True stationary tap (minimal movement on both axes) — open lightbox
      openAt(index)
    }
  }

  return (
    <>
      <div
        style={{
          userSelect: 'none',
          marginBottom: 'var(--space-3)',
        }}
      >
        {/* Full-bleed 4:3 image container — breaks out of the panel's
            lateral padding (var(--space-6)) on both sides. */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'relative',
            width: 'calc(100% + var(--space-6) * 2)',
            marginInline: 'calc(var(--space-6) * -1)',
            aspectRatio: '4 / 3',
            overflow: 'hidden',
            cursor: 'zoom-in',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <img
            src={current.url}
            alt={current.caption || ''}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Dot indicators — stay within the normal content width */}
        {images.length > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            marginTop: 10,
          }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Image ${i + 1}`}
                style={{
                  width:  i === index ? 8 : 6,
                  height: i === index ? 8 : 6,
                  borderRadius: '50%',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  backgroundColor: i === index
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                  transition: 'width 0.2s ease, height 0.2s ease, background-color 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        )}

        {/* Caption slot — always rendered (empty when this image has no
            caption) so the space below the carousel never shifts between
            captioned/uncaptioned images. dir="auto" lets the browser
            resolve RTL/LTR from the caption text; as a flex row, item
            order then visually follows that resolved direction, so the
            leading icon ends up on the correct side without any manual
            direction logic. Text span keeps the single-line ellipsis
            truncation from before. */}
        <div
          dir="auto"
          style={{
            marginTop: 6,
            height: 19, // one line at fontSize 13 / lineHeight 1.5
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            fontWeight: 400,
            lineHeight: 1.5,
          }}
        >
          {current.caption && (
            <>
              <ImageIcon size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {current.caption}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Lightbox portal */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          activeIndex={index}
          onClose={() => setLightbox(false)}
          onGo={goTo}
        />
      )}
    </>
  )
}
