/**
 * ImageCarousel — horizontal swipeable image carousel.
 *
 * Industry-standard approach:
 *  - CSS transform translateX for smooth hardware-accelerated sliding
 *  - Directional swipe locking: once a horizontal intent is detected the
 *    touch event is consumed so the Rx/Clinical tab switcher never sees it
 *  - Fullscreen via ReactDOM.createPortal (escapes all stacking contexts →
 *    no black area, no clip from parent overflow:hidden)
 *  - Fullscreen reuses the Lightbox from ImageGallery (same proven code)
 *
 * Props:
 *   images  { id, url, caption }[]
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Lightbox (portal) ───────────────────────────────────────────────────────
// Identical to ImageGallery's Lightbox so fullscreen behaviour is consistent.

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

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1); setTranslateX(0); setTranslateY(0)
  }, [activeIndex])

  // Lock body scroll while lightbox is open
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

  function resetZoom() {
    setScale(1); setTranslateX(0); setTranslateY(0)
  }

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
        paddingTop: 'env(safe-area-inset-top, 0px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        <span style={{
          color: 'rgba(255,255,255,0.8)', fontSize: 13,
          fontFamily: 'var(--font-mono)', pointerEvents: 'none',
        }}>
          {images.length > 1 ? `${activeIndex + 1} / ${images.length}` : ''}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          {/* Save */}
          <a
            href={active.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{
              color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              backgroundColor: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Save
          </a>

          {/* Close */}
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
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
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
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        )}

        {images.length > 1 && activeIndex < images.length - 1 && scale === 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex + 1) }}
            aria-label="Next image"
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
            }}
          >
            <ChevronRight size={20} strokeWidth={2} />
          </button>
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
  const [index,      setIndex]      = useState(0)
  const [lightboxOpen, setLightbox] = useState(false)

  // Touch state for the inline carousel strip
  const swipe = useRef({
    startX: 0, startY: 0,
    locked: null,          // 'h' | 'v' | null — direction lock
    dragging: false,
    dragX: 0,              // live drag offset (px)
  })
  const [dragOffset, setDragOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const goTo = useCallback((i) => {
    const clamped = Math.max(0, Math.min(images.length - 1, i))
    setIndex(clamped)
  }, [images.length])

  const openAt = useCallback((i) => {
    setIndex(i)
    setLightbox(true)
  }, [])

  if (!images.length) return null

  const current = images[index]

  // ── Inline carousel touch handlers ─────────────────────────────────────────

  function onTouchStart(e) {
    const s = swipe.current
    s.startX  = e.touches[0].clientX
    s.startY  = e.touches[0].clientY
    s.locked  = null
    s.dragging = false
    s.dragX   = 0
    setDragOffset(0)
  }

  function onTouchMove(e) {
    const s  = swipe.current
    const dx = e.touches[0].clientX - s.startX
    const dy = e.touches[0].clientY - s.startY

    // Direction lock — decide on first 6 px of movement
    if (s.locked === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      s.locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    }

    if (s.locked === 'v') return // let page scroll through

    // Horizontal — consume event so tab-switcher can't intercept
    e.preventDefault()
    e.stopPropagation()

    s.dragging = true
    s.dragX    = dx

    // Rubber-band at edges
    const atLeft  = index === 0
    const atRight = index === images.length - 1
    let offset = dx
    if ((atLeft && dx > 0) || (atRight && dx < 0)) {
      offset = dx / 3  // rubber-band resistance
    }
    setDragOffset(offset)
  }

  function onTouchEnd(e) {
    const s = swipe.current
    if (!s.dragging) {
      // Was a tap — open lightbox
      if (s.locked === null || (Math.abs(s.dragX) < 8)) {
        openAt(index)
      }
      setDragOffset(0)
      return
    }

    setIsAnimating(true)
    const threshold = 50  // px needed to commit a slide

    if (s.dragX < -threshold && index < images.length - 1) {
      setIndex(i => i + 1)
    } else if (s.dragX > threshold && index > 0) {
      setIndex(i => i - 1)
    }

    setDragOffset(0)
    setTimeout(() => setIsAnimating(false), 300)
    s.dragging = false
    s.dragX    = 0
  }

  return (
    <>
      {/* ── Carousel strip ── */}
      <div style={{ userSelect: 'none', touchAction: 'pan-y' }}>

        {/* Slide container */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            cursor: 'zoom-in',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            position: 'relative',
          }}
        >
          {/* Sliding track */}
          <div style={{
            display: 'flex',
            transform: `translateX(calc(${-index * 100}% + ${dragOffset}px))`,
            transition: isAnimating || dragOffset === 0
              ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
              : 'none',
            willChange: 'transform',
          }}>
            {images.map((img, i) => (
              <div key={img.id} style={{ flexShrink: 0, width: '100%' }}>
                <img
                  src={img.url}
                  alt={img.caption || `Image ${i + 1}`}
                  draggable={false}
                  style={{
                    width: '100%',
                    maxHeight: 280,
                    objectFit: 'contain',
                    display: 'block',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Prev arrow (desktop / large tap) */}
          {index > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(index - 1) }}
              aria-label="Previous"
              style={{
                position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <ChevronLeft size={16} strokeWidth={2.5} />
            </button>
          )}

          {/* Next arrow */}
          {index < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goTo(index + 1) }}
              aria-label="Next"
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                width: 32, height: 32, borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.45)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          )}

          {/* Zoom hint badge */}
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            backgroundColor: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 6, padding: '3px 7px',
            display: 'flex', alignItems: 'center', gap: 4,
            pointerEvents: 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>
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
          <div style={{
            display: 'flex', justifyContent: 'center',
            gap: 6, marginTop: 'var(--space-2)',
          }}>
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

      {/* Fullscreen lightbox — portal, escapes all stacking contexts */}
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
