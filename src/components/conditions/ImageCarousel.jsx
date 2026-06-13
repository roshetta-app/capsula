/**
 * ImageCarousel — horizontal swipeable image carousel.
 *
 * - Swipe left/right changes image. e.stopPropagation() on touchstart blocks
 *   the parent tab switcher from ever seeing carousel touches.
 * - Tap image → opens Lightbox (portal, full pinch/zoom/swipe/double-tap).
 * - Dot indicators + caption below.
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
    // stopPropagation prevents the parent tab-switcher from ever seeing this touch
    e.stopPropagation()
    touchStartX.current = e.touches[0].clientX
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    if (touchStartX.current === null) return
    const dx    = e.changedTouches[0].clientX - touchStartX.current
    const absDx = Math.abs(dx)
    touchStartX.current = null

    if (absDx > 40) {
      // Swipe — change image, do NOT open lightbox
      if (dx < 0 && index < images.length - 1) setIndex(i => i + 1)
      if (dx > 0 && index > 0)                 setIndex(i => i - 1)
    } else if (absDx < 8) {
      // Tap (barely moved) — open lightbox
      openAt(index)
    }
  }

  return (
    <>
      <div style={{ userSelect: 'none' }}>
        {/* Image — touch handlers here block tab swipe */}
        <div
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            cursor: 'zoom-in',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            height: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={current.url}
            alt={current.caption || ''}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              display: 'block',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Caption */}
        {current.caption && (
          <div style={{
            fontSize: 12, color: 'var(--color-text-tertiary)',
            textAlign: 'center', marginTop: 'var(--space-1)',
            lineHeight: 1.4, padding: '0 var(--space-2)',
          }}>
            {current.caption}
          </div>
        )}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 'var(--space-2)' }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Image ${i + 1}`}
                style={{
                  width: i === index ? 18 : 6, height: 6,
                  borderRadius: 3, border: 'none', padding: 0,
                  cursor: 'pointer',
                  backgroundColor: i === index ? 'var(--color-accent)' : 'var(--color-border)',
                  transition: 'width 0.2s ease, background-color 0.2s ease',
                  WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              />
            ))}
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
