import { useState, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

/**
 * ImageGallery — horizontal thumbnail strip + fullscreen lightbox.
 *
 * Props:
 *   images  { id, url, caption }[]
 *
 * Lightbox features:
 *   - Single tap: toggle 1x / 2.5x zoom (centred on tap point)
 *   - Pinch:  two-finger scale, min 1x, max 4x
 *   - Swipe horizontal (only when scale === 1): prev / next image
 *   - Close: X button top-right
 *   - Caption: dir="auto" below image
 */
export default function ImageGallery({ images }) {
  const [lightbox, setLightbox] = useState({
    open: false,
    activeIndex: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
  })

  // ─── Touch tracking refs ──────────────────────────────────────────────────
  const touch = useRef({
    // For tap vs swipe disambiguation
    startX: 0,
    startY: 0,
    startTime: 0,
    // For pinch
    pinchStartDist: null,
    pinchStartScale: 1,
    // For panned position while pinching / dragging
    panStartX: 0,
    panStartY: 0,
    lastTranslateX: 0,
    lastTranslateY: 0,
  })

  const openLightbox = useCallback((index) => {
    setLightbox({ open: true, activeIndex: index, scale: 1, translateX: 0, translateY: 0 })
  }, [])

  const closeLightbox = useCallback(() => {
    setLightbox(lb => ({ ...lb, open: false, scale: 1, translateX: 0, translateY: 0 }))
  }, [])

  const goTo = useCallback((index) => {
    setLightbox(lb => ({
      ...lb,
      activeIndex: Math.max(0, Math.min(images.length - 1, index)),
      scale: 1,
      translateX: 0,
      translateY: 0,
    }))
  }, [images.length])

  // ─── Touch handlers ───────────────────────────────────────────────────────

  function getTouchDist(touches) {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function handleTouchStart(e) {
    const t = touch.current

    if (e.touches.length === 1) {
      t.startX      = e.touches[0].clientX
      t.startY      = e.touches[0].clientY
      t.startTime   = Date.now()
      t.panStartX   = e.touches[0].clientX
      t.panStartY   = e.touches[0].clientY
      t.lastTranslateX = lightbox.translateX
      t.lastTranslateY = lightbox.translateY
      t.pinchStartDist = null
    }

    if (e.touches.length === 2) {
      t.pinchStartDist  = getTouchDist(e.touches)
      t.pinchStartScale = lightbox.scale
      // mid-point of the two fingers for pan anchor
      t.panStartX  = (e.touches[0].clientX + e.touches[1].clientX) / 2
      t.panStartY  = (e.touches[0].clientY + e.touches[1].clientY) / 2
      t.lastTranslateX = lightbox.translateX
      t.lastTranslateY = lightbox.translateY
    }
  }

  function handleTouchMove(e) {
    e.preventDefault() // stop page scroll inside lightbox

    const t = touch.current

    if (e.touches.length === 2 && t.pinchStartDist !== null) {
      // ── Pinch zoom ──────────────────────────────────────────────────────
      const dist     = getTouchDist(e.touches)
      const newScale = Math.min(4, Math.max(1, t.pinchStartScale * (dist / t.pinchStartDist)))

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const dPanX = midX - t.panStartX
      const dPanY = midY - t.panStartY

      setLightbox(lb => ({
        ...lb,
        scale: newScale,
        translateX: t.lastTranslateX + dPanX,
        translateY: t.lastTranslateY + dPanY,
      }))
    } else if (e.touches.length === 1 && lightbox.scale > 1) {
      // ── Pan while zoomed ────────────────────────────────────────────────
      const dPanX = e.touches[0].clientX - t.panStartX
      const dPanY = e.touches[0].clientY - t.panStartY
      setLightbox(lb => ({
        ...lb,
        translateX: t.lastTranslateX + dPanX,
        translateY: t.lastTranslateY + dPanY,
      }))
    }
    // At scale===1 with one finger, we let the swipe resolve on touchend
  }

  function handleTouchEnd(e) {
    const t = touch.current

    if (e.touches.length > 0) return // still multi-touch

    const dx       = e.changedTouches[0].clientX - t.startX
    const dy       = e.changedTouches[0].clientY - t.startY
    const duration = Date.now() - t.startTime
    const dist     = Math.sqrt(dx * dx + dy * dy)

    // ── Tap detection: short duration + small movement ──────────────────
    if (duration < 300 && dist < 12) {
      setLightbox(lb => {
        if (lb.scale > 1) {
          // Zoom out
          return { ...lb, scale: 1, translateX: 0, translateY: 0 }
        } else {
          // Zoom in to 2.5x centred
          return { ...lb, scale: 2.5, translateX: 0, translateY: 0 }
        }
      })
      return
    }

    // ── Swipe (only at scale === 1) ─────────────────────────────────────
    if (lightbox.scale === 1 && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) goTo(lightbox.activeIndex + 1) // swipe left → next
      else        goTo(lightbox.activeIndex - 1) // swipe right → prev
    }

    t.pinchStartDist = null
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!images?.length) return null

  const active = images[lightbox.activeIndex]

  return (
    <>
      {/* ── Thumbnail strip ───────────────────────────────────────────── */}
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
            onClick={() => openLightbox(i)}
            aria-label={img.caption || `Image ${i + 1}`}
            style={{
              flexShrink: 0,
              width: 80,
              height: 80,
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
            onFocus={e  => { e.currentTarget.style.borderColor = 'var(--color-accent)' }}
            onBlur={e   => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
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

      {/* ── Lightbox ──────────────────────────────────────────────────── */}
      {lightbox.open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            touchAction: 'none', // we handle all touch ourselves
          }}
          // Tap on dark backdrop (not image) to close — but only at scale 1
          onClick={(e) => {
            if (e.target === e.currentTarget && lightbox.scale === 1) closeLightbox()
          }}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            aria-label="Close"
            style={{
              position: 'absolute',
              top: 'env(safe-area-inset-top, 16px)',
              right: 16,
              marginTop: 16,
              zIndex: 10,
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none',
            }}
          >
            <X size={20} strokeWidth={2} />
          </button>

          {/* Image counter */}
          {images.length > 1 && (
            <div style={{
              position: 'absolute',
              top: 'env(safe-area-inset-top, 16px)',
              left: 16,
              marginTop: 16,
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              fontFamily: 'var(--font-mono)',
            }}>
              {lightbox.activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Image container */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              width: '100%',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              touchAction: 'none',
            }}
          >
            <img
              src={active.url}
              alt={active.caption || ''}
              draggable={false}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                transform: `scale(${lightbox.scale}) translate(${lightbox.translateX / lightbox.scale}px, ${lightbox.translateY / lightbox.scale}px)`,
                transformOrigin: 'center center',
                transition: lightbox.scale === 1 ? 'transform 0.25s ease' : 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                display: 'block',
              }}
            />
          </div>

          {/* Caption */}
          {active.caption && (
            <div
              dir="auto"
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: 13,
                lineHeight: 1.5,
                textAlign: 'center',
                padding: '12px 24px',
                paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
                maxWidth: 500,
              }}
            >
              {active.caption}
            </div>
          )}

          {/* Prev / next arrows (shown at scale 1, more than 1 image) */}
          {images.length > 1 && lightbox.scale === 1 && (
            <>
              {lightbox.activeIndex > 0 && (
                <button
                  onClick={() => goTo(lightbox.activeIndex - 1)}
                  aria-label="Previous image"
                  style={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                  }}
                >
                  {/* ChevronLeft inline SVG */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
              )}
              {lightbox.activeIndex < images.length - 1 && (
                <button
                  onClick={() => goTo(lightbox.activeIndex + 1)}
                  aria-label="Next image"
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0,0,0,0.45)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    width: 40,
                    height: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    WebkitTapHighlightColor: 'transparent',
                    outline: 'none',
                  }}
                >
                  {/* ChevronRight inline SVG */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              )}
            </>
          )}

          {/* Dot indicators */}
          {images.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 'max(60px, calc(env(safe-area-inset-bottom) + 60px))',
              display: 'flex',
              gap: 6,
            }}>
              {images.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === lightbox.activeIndex ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i === lightbox.activeIndex
                      ? 'rgba(255,255,255,0.9)'
                      : 'rgba(255,255,255,0.35)',
                    transition: 'width 0.2s ease, background-color 0.2s ease',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  )
}
