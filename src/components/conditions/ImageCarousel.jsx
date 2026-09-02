/**
 * ImageCarousel — swipeable image carousel (Phase 4.2).
 *
 * Layout (bordered-card redesign, 2026-09-02):
 *   - Optional bold title renders above the card when `title` is a
 *     non-empty string. Belongs to the whole gallery, not to any one
 *     photo — it doesn't change as you swipe between images.
 *   - Everything else — photo, dots, caption — sits inside one bordered,
 *     rounded card (var(--color-border) / var(--radius-md), same
 *     convention already used by ImageGalleryEditor.jsx's image rows in
 *     the CMS). This replaces the previous full-bleed layout, which
 *     broke out of the panel's lateral padding via negative margins.
 *   - 4:3 aspect ratio via `aspect-ratio` on the photo area.
 *   - object-fit: cover, object-position: center
 *   - The card's own border-radius + overflow: hidden clips the photo's
 *     top corners; the photo itself carries no radius of its own.
 *   - Order: title (outside card) → image → dots → caption (last two
 *     inside the card, in a padded footer below the photo)
 *   - Caption slot always reserves its own height (fixed height, fixed
 *     margin-top) whether or not a caption is present, so the card
 *     doesn't grow or shrink as you swipe between a captioned and an
 *     uncaptioned photo.
 *   - Caption row is a flex row with a leading caption/comment icon.
 *     dir="auto" on the row lets the browser resolve RTL/LTR from the
 *     caption text; flex's default row order then visually flips with
 *     it, so the icon sits left of LTR captions and right of RTL
 *     captions with no manual direction branching.
 *
 * Interaction:
 *   - Swipe threshold: 50px
 *   - Tap (< 8px movement on BOTH axes) → opens Lightbox. Requiring both dx
 *     and dy to stay small (not just dx) prevents a vertical page-scroll
 *     gesture over the image — which can have a small horizontal delta —
 *     from being misread as a tap and accidentally opening the lightbox.
 *   - e.stopPropagation() on touchstart blocks parent tab-switcher
 *
 * Offline caching (Image System Refinement Plan, Part A):
 *   - The current photo is loaded via useCachedImage, which checks the
 *     on-device photo store first, falls back to the network, and
 *     quietly saves a copy for next time (cache-on-view).
 *   - 'ready'   → photo renders as before.
 *   - 'error'   → ImageLoadError placeholder with a working Retry
 *     button, replacing the browser's default broken-image icon. The
 *     placeholder's own touch handlers stop propagation so tapping
 *     Retry doesn't also register as a stationary tap on the outer
 *     container (which would open the lightbox on top of the error
 *     state).
 *   - 'loading' → nothing rendered yet; the container's
 *     backgroundColor (var(--color-bg)) shows in the meantime.
 *
 * Zoom-hint (Image System Refinement Plan, Part C, Step 2):
 *   - A small magnifying-glass badge in the top-right corner of the
 *     photo, shown whenever a photo is actually displayed ('ready').
 *     Purely a discoverability cue — tap-to-zoom already worked before
 *     this, nothing about the interaction itself changed, there was
 *     just no visual sign it existed on a touchscreen (the old
 *     cursor: zoom-in hint has no equivalent for touch). Purely
 *     decorative, so it's marked aria-hidden and sits behind
 *     pointer-events: none — the existing tap/swipe handlers on the
 *     container still own all touch interaction.
 *
 * Props:
 *   images  { id, url, caption }[]
 *   title   string (optional) — bold heading rendered above the card;
 *           omitted entirely when empty/absent (e.g. galleries saved
 *           before this field existed)
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { MessageSquare, ZoomIn } from 'lucide-react'
import Lightbox from '../ui/Lightbox'
import ImageLoadError from '../ui/ImageLoadError'
import { useCachedImage } from '../../hooks/useCachedImage'

export default function ImageCarousel({ images = [], title = '' }) {
  const [index,        setIndex]    = useState(0)
  const [lightboxOpen, setLightbox] = useState(false)
  const touchStartX = useRef(null)
  const touchStartY = useRef(null)

  const goTo   = useCallback((i) => setIndex(Math.max(0, Math.min(images.length - 1, i))), [images.length])
  const openAt = useCallback((i) => { setIndex(i); setLightbox(true) }, [])

  // Hooks must run unconditionally — the `images.length` guard below
  // happens after this, so `current` may be undefined on an empty
  // array; useCachedImage(undefined) safely resolves to 'error' and
  // renders nothing in that case.
  const current = images[index]
  const { src, status, retry } = useCachedImage(current?.url)

  // 2026-09-02 fix: useCachedImage now falls back to the photo's plain
  // address (status 'ready') when it can't fetch()/cache a copy — that
  // covers CORS-blocked external photos, which still display fine via a
  // normal <img>. This local flag catches the rarer case where the
  // address is genuinely dead and even that fails, via the <img>'s own
  // onError below. Reset whenever the photo changes so a stale failure
  // from a previous image doesn't linger.
  const [displayFailed, setDisplayFailed] = useState(false)
  useEffect(() => { setDisplayFailed(false) }, [current?.url])

  const handleRetry = useCallback(() => { setDisplayFailed(false); retry() }, [retry])

  if (!images.length) return null

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
        {/* Gallery title — belongs to the whole carousel, not any one
            photo, so it lives outside the bordered card and never
            changes as you swipe. */}
        {title && (
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-2)',
          }}>
            {title}
          </div>
        )}

        {/* Bordered card — photo, dots, and caption all live inside this
            one border. overflow: hidden clips the photo's top corners to
            match the card's radius; the photo itself carries no radius. */}
        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
        }}>
          {/* 4:3 photo area */}
          <div
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              overflow: 'hidden',
              cursor: 'zoom-in',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            {status === 'ready' && src && !displayFailed && (
              <img
                src={src}
                alt={current.caption || ''}
                onError={() => setDisplayFailed(true)}
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
            )}

            {status === 'ready' && src && !displayFailed && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <ZoomIn size={14} color="#fff" />
              </div>
            )}

            {(status === 'error' || displayFailed) && (
              <div
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ position: 'absolute', inset: 0, cursor: 'default' }}
              >
                <ImageLoadError onRetry={handleRetry} />
              </div>
            )}
          </div>

          {/* Footer — dots + caption, inside the card, below the photo */}
          <div style={{ padding: '10px var(--space-4) var(--space-3)' }}>
            {images.length > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
                marginBottom: 8,
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
                caption) so the card never resizes between captioned/
                uncaptioned images. dir="auto" lets the browser resolve
                RTL/LTR from the caption text; as a flex row, item order
                then visually follows that resolved direction, so the
                leading icon ends up on the correct side without any
                manual direction logic. Text span keeps the single-line
                ellipsis truncation from before. */}
            <div
              dir="auto"
              style={{
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
                  <MessageSquare size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
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
