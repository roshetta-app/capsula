/**
 * ImageGallery — thumbnail strip + portal lightbox.
 *
 * The lightbox is rendered via ReactDOM.createPortal into document.body so it
 * escapes every ancestor stacking context (sticky headers, transforms, etc.)
 * and genuinely sits at z-index 9999 over the whole screen.
 *
 * Touch interactions:
 *   Single tap   — no-op (lets double-tap register)
 *   Double tap   — toggle 1x ↔ 2.5x zoom, centred on tap point
 *   Pinch        — free scale 1x–4x with midpoint pan
 *   Drag (>1x)   — pan the zoomed image
 *   Swipe (1x)   — prev / next image
 *   Tap backdrop — close (only at 1x)
 *
 * Props:
 *   images  { id, url, caption }[]
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Lightbox (portal) ───────────────────────────────────────────────────────

function Lightbox({ images, activeIndex, onClose, onGo }) {
  const [scale,      setScale]      = useState(1)
  const [translateX, setTranslateX] = useState(0)
  const [translateY, setTranslateY] = useState(0)

  const touch = useRef({
    // single-finger tracking
    startX: 0, startY: 0, startTime: 0,
    lastTapTime: 0, lastTapX: 0, lastTapY: 0,
    // pan anchor
    panStartX: 0, panStartY: 0,
    lastTranslateX: 0, lastTranslateY: 0,
    // pinch
    pinchStartDist: null, pinchStartScale: 1,
    pinchMidX: 0, pinchMidY: 0,
    // state snapshot at touch start
    scaleAtStart: 1,
  })

  // Reset zoom when image changes
  useEffect(() => {
    setScale(1)
    setTranslateX(0)
    setTranslateY(0)
  }, [activeIndex])

  // Lock body scroll while open
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
      // pan while zoomed
      setTranslateX(t.lastTranslateX + (e.touches[0].clientX - t.panStartX))
      setTranslateY(t.lastTranslateY + (e.touches[0].clientY - t.panStartY))
    }
    // at scale 1 single finger → let it resolve on touchend for swipe / double-tap
  }

  function handleTouchEnd(e) {
    e.stopPropagation()
    const t = touch.current

    if (e.touches.length > 0) return // still touching

    const endX    = e.changedTouches[0].clientX
    const endY    = e.changedTouches[0].clientY
    const dx      = endX - t.startX
    const dy      = endY - t.startY
    const dt      = Date.now() - t.startTime
    const moved   = Math.sqrt(dx * dx + dy * dy)

    t.pinchStartDist = null

    // ── Tap (short, small movement) ────────────────────────────────────────
    if (dt < 300 && moved < 12) {
      const now = Date.now()
      const sinceLast = now - t.lastTapTime
      const tapDx = endX - t.lastTapX
      const tapDy = endY - t.lastTapY
      const doubleTap = sinceLast < 320 && Math.sqrt(tapDx * tapDx + tapDy * tapDy) < 40

      if (doubleTap) {
        // Double tap — toggle zoom
        t.lastTapTime = 0 // reset so next tap starts fresh
        if (scale > 1) {
          resetZoom()
        } else {
          // Zoom 2.5x centred on the tap point
          const rect = e.target.getBoundingClientRect()
          const ox = endX - rect.left - rect.width  / 2
          const oy = endY - rect.top  - rect.height / 2
          setScale(2.5)
          setTranslateX(-ox * 1.5)
          setTranslateY(-oy * 1.5)
        }
      } else {
        // First tap — record for double-tap detection, do nothing else
        t.lastTapTime = now
        t.lastTapX = endX
        t.lastTapY = endY
      }
      return
    }

    // ── Swipe (only at scale 1) ────────────────────────────────────────────
    if (t.scaleAtStart === 1 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 48) {
      if (dx < 0) onGo(activeIndex + 1)
      else        onGo(activeIndex - 1)
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      // Tap dark backdrop to close (only at 1x zoom)
      onClick={(e) => { if (e.target === e.currentTarget && scale === 1) onClose() }}
    >

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }}>
        {/* Counter */}
        <span style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: 13,
          fontFamily: 'var(--font-mono)',
          pointerEvents: 'none',
        }}>
          {images.length > 1 ? `${activeIndex + 1} / ${images.length}` : ''}
        </span>

        {/* Close button */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          aria-label="Close"
          style={{
            width: 36, height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(0,0,0,0.55)',
            border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#fff',
            WebkitTapHighlightColor: 'transparent',
            outline: 'none',
            pointerEvents: 'auto',
          }}
        >
          <X size={18} strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Image area ──────────────────────────────────────────────────── */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          touchAction: 'none',
          position: 'relative',
        }}
      >
        <img
          key={active.url}
          src={active.url}
          alt={active.caption || ''}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            display: 'block',
            transform: `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`,
            transformOrigin: 'center center',
            transition: scale === 1 ? 'transform 0.22s ease' : 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none', // touch handled by parent div
          }}
        />

        {/* Prev arrow */}
        {images.length > 1 && activeIndex > 0 && scale === 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex - 1) }}
            aria-label="Previous image"
            style={{
              position: 'absolute', left: 8, top: '50%',
              transform: 'translateY(-50%)',
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

        {/* Next arrow */}
        {images.length > 1 && activeIndex < images.length - 1 && scale === 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex + 1) }}
            aria-label="Next image"
            style={{
              position: 'absolute', right: 8, top: '50%',
              transform: 'translateY(-50%)',
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

      {/* ── Caption + dot indicators ────────────────────────────────────── */}
      <div style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        paddingTop: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
        minHeight: 56,
      }}>
        {/* Caption */}
        {active.caption ? (
          <p
            dir="auto"
            style={{
              margin: 0,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 13,
              lineHeight: 1.5,
              textAlign: 'center',
              padding: '0 24px',
              maxWidth: 500,
            }}
          >
            {active.caption}
          </p>
        ) : null}

        {/* Dot indicators */}
        {images.length > 1 && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {images.map((_, i) => (
              <div
                key={i}
                style={{
                  width:  i === activeIndex ? 8 : 5,
                  height: i === activeIndex ? 8 : 5,
                  borderRadius: '50%',
                  backgroundColor: i === activeIndex
                    ? '#fff'
                    : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

    </div>,
    document.body
  )
}

// ─── Thumbnail strip ─────────────────────────────────────────────────────────

export default function ImageGallery({ images }) {
  const [open,        setOpen]        = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const openAt = useCallback((i) => { setActiveIndex(i); setOpen(true)  }, [])
  const close   = useCallback(()  => setOpen(false), [])
  const goTo    = useCallback((i) => {
    setActiveIndex(Math.max(0, Math.min((images?.length ?? 1) - 1, i)))
  }, [images?.length])

  if (!images?.length) return null

  return (
    <>
      {/* Thumbnail strip */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: 2,
      }}>
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => openAt(i)}
            aria-label={img.caption || `Image ${i + 1}`}
            style={{
              flexShrink: 0,
              width: 80, height: 80,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1.5px solid var(--color-border)',
              padding: 0,
              cursor: 'pointer',
              background: 'var(--color-bg)',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          >
            <img
              src={img.url}
              alt={img.caption || `Image ${i + 1}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Portal lightbox — renders directly in document.body */}
      {open && (
        <Lightbox
          images={images}
          activeIndex={activeIndex}
          onClose={close}
          onGo={goTo}
        />
      )}
    </>
  )
}
