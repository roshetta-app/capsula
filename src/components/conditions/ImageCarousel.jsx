/**
 * ImageCarousel — full-bleed swipeable image carousel (Phase 4.2).
 *
 * Layout:
 *   - Full-bleed: negative horizontal margins break out of panel padding
 *   - 4:3 aspect ratio via padding-top trick; image absolutely fills container
 *   - object-fit: cover, object-position: center
 *   - No border, no radius, no shadow
 *   - Order: image → dots → caption
 *
 * Interaction:
 *   - Swipe threshold: 50px
 *   - Tap (< 8px movement) → opens Lightbox
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

  const goTo   = useCallback((i) => setIndex(Math.max(0, Math.min(images.length - 1, i))), [images.length])
  const openAt = useCallback((i) => { setIndex(i); setLightbox(true) }, [])

  if (!images.length) return null

  const current = images[index]

  function onTouchStart(e) {
    e.stopPropagation()
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    if (touchStartX.current === null) return
    const dx    = e.changedTouches[0].clientX - touchStartX.current
    const absDx = Math.abs(dx)
    touchStartX.current = null

    if (absDx >= 50) {
      // Swipe — change image
      if (dx < 0 && index < images.length - 1) setIndex(i => i + 1)
      if (dx > 0 && index > 0)                 setIndex(i => i - 1)
    } else if (absDx < 8) {
      // Tap — open lightbox
      openAt(index)
    }
  }

  return (
    <>
      <div
        style={{
          marginLeft:  'calc(-1 * var(--space-4))',
          marginRight: 'calc(-1 * var(--space-4))',
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

        {/* Caption — below dots, re-applies side padding */}
        {current.caption && (
          <div style={{
            padding: '0 var(--space-4)',
            marginTop: 6,
            fontSize: 13,
            color: 'var(--color-text-secondary)',
            fontWeight: 400,
            lineHeight: 1.5,
            textAlign: 'left',
          }}>
            {current.caption}
          </div>
        )}
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
