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

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Lightbox (portal) ────────────────────────────────────────────────────────
// Identical to ImageGallery's Lightbox — portal rendering escapes all stacking
// contexts so there is no black area or clip from parent overflow:hidden.

function Lightbox({ images, activeIndex, onClose, onGo }) {
  const [scale,      setScale]      = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  const touch = useRef({
    startX: 0, startY: 0, startTime: 0,
    lastTapTime: 0, lastTapX: 0, lastTapY: 0,
    panStartX: 0, panStartY: 0,
    lastTranslateX: 0, lastTranslateY: 0,
    pinchStartDist: null, pinchStartScale: 1,
    pinchMidX: 0, pinchMidY: 0,
    scaleAtStart: 1,
  })

  useEffect(() => {
    setScale(1); setTranslateX(0); setTranslateY(0)
  }, [activeIndex])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const active = images[activeIndex]

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function resetZoom() { setScale(1); setTranslateX(0); setTranslateY(0) }

  function handleTouchStart(e) {
    e.stopPropagation()
    const t = touch.current
    if (e.touches.length === 1) {
      const cx = e.touches[0].clientX
      const cy = e.touches[0].clientY
      t.startX = cx; t.startY = cy
      t.startTime = Date.now()
      t.panStartX = cx; t.panStartY = cy
      t.lastTranslateX = translateX
      t.lastTranslateY = translateY
      t.scaleAtStart = scale
      t.pinchStartDist = null
    }
    if (e.touches.length === 2) {
      t.pinchStartDist  = getTouchDist(e.touches)
      t.pinchStartScale = scale
      t.pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      t.pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      t.panStartX = t.pinchMidX; t.panStartY = t.pinchMidY
      t.lastTranslateX = translateX
      t.lastTranslateY = translateY
    }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    e.stopPropagation()
    const t = touch.current
    if (e.touches.length === 2 && t.pinchStartDist !== null) {
      const dist     = getTouchDist(e.touches)
      const newScale = Math.min(4, Math.max(1, t.pinchStartScale * (dist / t.pinchStartDist)))
      const midX     = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY     = (e.touches[0].clientY + e.touches[1].clientY) / 2
      setScale(newScale)
      setTranslateX(t.lastTranslateX + (midX - t.panStartX))
      setTranslateY(t.lastTranslateY + (midY - t.panStartY))
    } else if (e.touches.length === 1 && t.scaleAtStart > 1) {
      setTranslateX(t.lastTranslateX + (e.touches[0].clientX - t.panStartX))
      setTranslateY(t.lastTranslateY + (e.touches[0].clientY - t.panStartY))
    }
  }

  function handleTouchEnd(e) {
    e.stopPropagation()
    const t = touch.current
    if (e.touches.length > 0) return
    const endX  = e.changedTouches[0].clientX
    const endY  = e.changedTouches[0].clientY
    const dx    = endX - t.startX
    const dy    = endY - t.startY
    const dt    = Date.now() - t.startTime
    const moved = Math.sqrt(dx * dx + dy * dy)
    t.pinchStartDist = null

    if (dt < 300 && moved < 12) {
      const now = Date.now()
      const sinceLast = now - t.lastTapTime
      const tapDx = endX - t.lastTapX
      const tapDy = endY - t.lastTapY
      const doubleTap = sinceLast < 320 && Math.sqrt(tapDx * tapDx + tapDy * tapDy) < 40
      if (doubleTap) {
        t.lastTapTime = 0
        if (scale > 1) {
          resetZoom()
        } else {
          const rect = e.target.getBoundingClientRect()
          const ox = endX - rect.left - rect.width  / 2
          const oy = endY - rect.top  - rect.height / 2
          setScale(2.5)
          setTranslateX(-ox * 1.5)
          setTranslateY(-oy * 1.5)
        }
      } else {
        t.lastTapTime = now
        t.lastTapX = endX
        t.lastTapY = endY
      }
      return
    }

    if (t.scaleAtStart === 1 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      if (dx < 0) onGo(activeIndex + 1)
      else        onGo(activeIndex - 1)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column',
        touchAction: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && scale === 1) onClose() }}
    >
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}>
          {images.length > 1 ? `${activeIndex + 1} / ${images.length}` : ''}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          aria-label="Close"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
            pointerEvents: 'auto',
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* Image area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', touchAction: 'none', position: 'relative',
        }}
      >
        <img
          key={active.url}
          src={active.url}
          alt={active.caption || ''}
          draggable={false}
          style={{
            maxWidth: '100%', maxHeight: '100%',
            objectFit: 'contain', display: 'block',
            transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
            transformOrigin: 'center center',
            transition: scale === 1 ? 'transform 0.22s ease' : 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        {images.length > 1 && activeIndex > 0 && scale === 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex - 1) }}
            aria-label="Previous image"
            style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          ><ChevronLeft size={20} strokeWidth={2} /></button>
        )}
        {images.length > 1 && activeIndex < images.length - 1 && scale === 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex + 1) }}
            aria-label="Next image"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          ><ChevronRight size={20} strokeWidth={2} /></button>
        )}
      </div>

      {/* Caption + dots */}
      <div style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        paddingTop: 12,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
        minHeight: 56,
      }}>
        {active.caption && (
          <p dir="auto" style={{
            margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13,
            lineHeight: 1.5, textAlign: 'center', padding: '0 24px', maxWidth: 500,
          }}>
            {active.caption}
          </p>
        )}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {images.map((_, i) => (
              <div key={i} style={{
                width:  i === activeIndex ? 8 : 5,
                height: i === activeIndex ? 8 : 5,
                borderRadius: '50%',
                backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.2s ease', flexShrink: 0,
              }} />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ─── ImageCarousel ────────────────────────────────────────────────────────────

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
          }}
        >
          <img
            src={current.url}
            alt={current.caption || ''}
            style={{
              width: '100%',
              maxHeight: 280,
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
