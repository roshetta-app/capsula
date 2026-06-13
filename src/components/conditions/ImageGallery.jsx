/**
 * ImageGallery — thumbnail strip + portal lightbox.
 *
 * The lightbox is rendered via the shared Lightbox component (src/components/ui/Lightbox.jsx),
 * extracted in Phase 2.13 cleanup from the previously duplicated private Lightbox
 * functions in this file and ImageCarousel.jsx.
 *
 * Props:
 *   images  { id, url, caption }[]
 */

import { useState, useCallback } from 'react'
import Lightbox from '../ui/Lightbox'

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

      {/* Portal lightbox */}
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
