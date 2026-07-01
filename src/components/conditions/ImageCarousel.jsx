/**
 * ImageCarousel — swipeable image carousel (Phase 4.2).
 *
 * Layout:
 *   - Respects the parent's own lateral padding — no negative margins /
 *     full-bleed break-out. The earlier full-bleed treatment caused the
 *     carousel to visually exceed the page's actual lateral margins
 *     (its hardcoded --space-4 offset didn't match the real parent
 *     padding), so it now just sits inside its container like every
 *     other block instead of independently computing an offset.
 *   - 4:3 aspect ratio via padding-top trick; image absolutely fills container
 *   - object-fit: cover, object-position: center
 *   - Rounded corners (var(--radius-lg)) matching the app's card radius
 *     convention — no border, no shadow
 *   - Order: image → dots → caption
 *   - Caption slot always reserves its own height (min-height, fixed
 *     margin-top) whether or not a caption is present, so content below
 *     the carousel doesn't shift up/down depending on caption presence.
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
        {/* 4:3 aspect-ratio image container */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '75%', // 4:3
            overflow: 'hidden',
            cursor: 'zoom-in',
            backgroundColor: 'var(--color-bg)',
            borderRadius: 'var(--radius-lg)',
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

        {/* Dot indicators */}
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
            captioned/uncaptioned images. Truncated to a single line with
            an ellipsis rather than just a min-height: a min-height alone
            only holds for one-line captions — anything that wraps to a
            second line still pushes content below it down. Truncating
            guarantees a fixed height regardless of caption length.
            dir="auto" + matching textAlign so RTL captions align right,
            same convention as every other text block in the app. */}
        <div
          dir="auto"
          style={{
            marginTop: 6,
            height: 19, // one line at fontSize 13 / lineHeight 1.5
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            fontWeight: 400,
            lineHeight: 1.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {current.caption || ''}
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
