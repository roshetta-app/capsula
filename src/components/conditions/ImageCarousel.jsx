import { useState, useRef } from 'react'

/**
 * ImageCarousel — horizontal swipeable image carousel.
 *
 * Phase 2E spec:
 *  - One image at a time, dot indicators below
 *  - Tap image → fullscreen overlay
 *  - Fullscreen: X close, caption, download button (opens URL in new tab)
 *  - touch-action: pinch-zoom in fullscreen for native pinch zoom on mobile
 *
 * Props:
 *   images  { id, url, caption }[]
 */
export default function ImageCarousel({ images = [] }) {
  const [index, setIndex]       = useState(0)
  const [fullscreen, setFull]   = useState(false)
  const touchStartX             = useRef(null)

  if (!images.length) return null

  const current = images[index]

  // ── swipe handlers ──────────────────────────────────────────────────────────
  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(dx) > 40) {
      if (dx < 0 && index < images.length - 1) setIndex(i => i + 1)
      if (dx > 0 && index > 0)                 setIndex(i => i - 1)
    }
    touchStartX.current = null
  }

  return (
    <>
      {/* ── Carousel ── */}
      <div style={{ userSelect: 'none' }}>
        {/* Image area — data-carousel marks this zone for the tab swipe guard */}
        <div
          data-carousel
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          onClick={() => setFull(true)}
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
          <div style={{
            display: 'flex', justifyContent: 'center',
            gap: 6, marginTop: 'var(--space-2)',
          }}>
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Image ${i + 1}`}
                style={{
                  width: i === index ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  backgroundColor: i === index ? 'var(--color-accent)' : 'var(--color-border)',
                  transition: 'width 0.2s ease, background-color 0.2s ease',
                  WebkitTapHighlightColor: 'transparent',
                  outline: 'none',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Fullscreen overlay ── */}
      {fullscreen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            backgroundColor: 'rgba(0,0,0,0.92)',
            display: 'flex', flexDirection: 'column',
          }}
          onClick={() => setFull(false)}
        >
          {/* Top bar */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              display: 'flex', justifyContent: 'flex-end',
              padding: '12px 16px',
              flexShrink: 0,
            }}
          >
            {/* Download — opens in new tab */}
            <a
              href={current.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#fff', opacity: 0.8, marginRight: 16,
                textDecoration: 'none', fontSize: 13, fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 4,
              }}
              onClick={e => e.stopPropagation()}
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
              onClick={() => setFull(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#fff', padding: 4, lineHeight: 1,
                WebkitTapHighlightColor: 'transparent',
              }}
              aria-label="Close"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Image — pinch-zoom via CSS touch-action */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
              touchAction: 'pinch-zoom',
              padding: '0 8px',
            }}
          >
            <img
              src={current.url}
              alt={current.caption || ''}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 4,
              }}
            />
          </div>

          {/* Caption */}
          {current.caption && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                padding: '12px 24px 20px',
                fontSize: 13, color: 'rgba(255,255,255,0.75)',
                textAlign: 'center', lineHeight: 1.5, flexShrink: 0,
              }}
            >
              {current.caption}
            </div>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                display: 'flex', justifyContent: 'center',
                gap: 6, paddingBottom: 24, flexShrink: 0,
              }}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  style={{
                    width: i === index ? 18 : 6, height: 6,
                    borderRadius: 3, border: 'none', padding: 0, cursor: 'pointer',
                    backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.35)',
                    transition: 'width 0.2s ease',
                    WebkitTapHighlightColor: 'transparent', outline: 'none',
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
