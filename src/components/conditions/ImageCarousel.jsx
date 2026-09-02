/**
 * ImageCarousel — swipeable image carousel (Phase 4.2).
 *
 * Layout (bordered-card redesign, 2026-09-02; refined same day):
 *   - Optional bold title renders above the card when `title` is a
 *     non-empty string. Belongs to the whole gallery, not to any one
 *     photo — it doesn't change as you swipe.
 *   - Everything else — photo, dots, caption — sits inside one bordered,
 *     rounded card (var(--color-border) / var(--radius-md)).
 *   - 4:3 aspect ratio on the photo area, fixed regardless of a given
 *     photo's own proportions.
 *   - Photo display: uncropped. Each photo renders in full via
 *     object-fit: contain, centred inside the 4:3 area; any leftover
 *     space is filled with a softly blurred, darkened copy of the same
 *     photo (object-fit: cover). Full detail is still only reachable via
 *     pinch/double-tap zoom in the lightbox, same as before.
 *   - Caption row only renders — and only reserves its fixed height —
 *     when at least one photo in the gallery actually has a caption.
 *
 * Drag engine swap (2026-09-02, fourth pass — library, not another
 * hand-rolled rewrite):
 *   Three earlier passes patched the hand-rolled touch/settle logic
 *   (three-slot photo tracking, a manual drag-phase state machine, a
 *   plain-timer settle) and fixed real bugs each time — flicker on
 *   swipe, an occasional permanent lockup, and tap-vs-swipe
 *   misclassification. What none of those passes could fix is the root
 *   cause: every finger-move event was being pushed through React state
 *   (`dragPx`) and re-rendered, which is what produced the residual
 *   flashing and the card's bottom-border jump.
 *   Fix: the drag itself is now owned by embla-carousel-react. Embla is
 *   headless (ships no visual styling), so the bordered-card look,
 *   blurred-fill photo display, dots, and caption below are unchanged —
 *   only the underlying drag engine changed. Embla moves the slide track
 *   directly, without a React re-render per finger-move event, which is
 *   what removes the flash and the border jump. Tap-vs-swipe is now a
 *   trivial ~8px pointer-move threshold (Embla already owns and commits
 *   the actual swipe physics, so this only has to catch a stationary
 *   tap), and vertical page-scroll is left alone via `touchAction:
 *   'pan-y'` on the viewport rather than any custom axis-lock code.
 *   The temporary diagnostic logging added while chasing these bugs is
 *   removed — it was scoped to the old touch state machine, which no
 *   longer exists.
 *
 * Offline caching (Image System Refinement Plan, Part A):
 *   - Each rendered slide loads via useCachedImage (device-first →
 *     network → cache-on-view), same as before. To avoid fetching every
 *     photo in a gallery up front, only the active slide and its
 *     immediate neighbours (±1, see LOAD_WINDOW) actually request a
 *     photo — everything else waits until it comes within that window.
 *   - 'ready'   → photo renders.
 *   - 'error'   → ImageLoadError placeholder with a working Retry
 *     button, shown for the current photo only. Its own pointer handlers
 *     stop propagation so a Retry tap isn't read as a stationary tap on
 *     the carousel itself.
 *   - 'loading' → nothing rendered yet for that slide.
 *
 * Zoom-hint (Image System Refinement Plan, Part C, Step 2):
 *   - Unchanged — small magnifying-glass badge, top-right of the photo,
 *     shown whenever the current photo is 'ready'.
 *
 * Props:
 *   images  { id, url, caption }[]
 *   title   string (optional) — bold heading rendered above the card;
 *           omitted entirely when empty/absent
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { MessageSquare, ZoomIn } from 'lucide-react'
import useEmblaCarousel from 'embla-carousel-react'
import Lightbox from '../ui/Lightbox'
import ImageLoadError from '../ui/ImageLoadError'
import { useCachedImage } from '../../hooks/useCachedImage'

const BLUR_IMG_STYLE = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'cover', objectPosition: 'center',
  filter: 'blur(28px) brightness(0.65)',
  transform: 'scale(1.15)',
  pointerEvents: 'none',
}
const MAIN_IMG_STYLE = {
  position: 'absolute', inset: 0, width: '100%', height: '100%',
  objectFit: 'contain', objectPosition: 'center',
  pointerEvents: 'none',
}

// How many slides either side of the active photo stay loaded/cached.
// Mirrors the old three-slot window's intent (don't fetch a whole
// gallery up front) — but it's now purely a data-loading concern, since
// Embla (not this component) owns the actual sliding/rendering track.
const LOAD_WINDOW = 1

// A pointer that never moves more than this counts as a stationary tap
// (→ opens the lightbox) rather than the start of a swipe. Embla owns
// swipe commit/threshold/settle entirely on its own — this only has to
// catch "finger never really moved."
const TAP_SLOP_PX = 8

function Slide({ img, index, selectedIndex, onCurrentInfo, onCurrentFailed, currentDisplayFailed }) {
  const isCurrent = index === selectedIndex
  const shouldLoad = !!img && Math.abs(index - selectedIndex) <= LOAD_WINDOW
  const cached = useCachedImage(shouldLoad ? img?.url : undefined)

  // Report this slide's load status/retry up to the parent only while
  // it's the current slide — the zoom-hint badge and the error overlay
  // both key off "what's the current photo doing," not any other slide.
  useEffect(() => {
    if (isCurrent) onCurrentInfo({ status: cached.status, retry: cached.retry })
  }, [isCurrent, cached.status, cached.retry, onCurrentInfo])

  if (!img) return <div style={{ flex: '0 0 100%', minWidth: 0 }} />

  const hidden = isCurrent && currentDisplayFailed

  return (
    <div style={{ position: 'relative', flex: '0 0 100%', minWidth: 0 }}>
      {!hidden && cached.status === 'ready' && cached.src && (
        <>
          <img
            src={cached.src}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={BLUR_IMG_STYLE}
          />
          <img
            src={cached.src}
            alt={img.caption || ''}
            draggable={false}
            onError={isCurrent ? onCurrentFailed : undefined}
            style={MAIN_IMG_STYLE}
          />
        </>
      )}
    </div>
  )
}

export default function ImageCarousel({ images = [], title = '' }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    watchDrag: images.length > 1,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [displayFailed, setDisplayFailed] = useState(false)
  const [currentCache, setCurrentCache] = useState({ status: 'loading', retry: () => {} })

  const tap = useRef({ x: 0, y: 0, moved: false })

  // Keep selectedIndex in sync with Embla's own notion of the active
  // slide. 'select' fires the instant a swipe commits (same moment the
  // old code updated its dot indicator), not after the settle animation
  // finishes, so dots/caption switch exactly when they used to.
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi])

  // Instant jump (no slide animation) — matches the old dot-tap /
  // lightbox-sync behaviour, which never animated, only touch-drag did.
  const goTo = useCallback((i) => {
    if (!emblaApi) return
    emblaApi.scrollTo(Math.max(0, Math.min(images.length - 1, i)), true)
  }, [emblaApi, images.length])

  const openAt = useCallback((i) => {
    goTo(i)
    setLightboxOpen(true)
  }, [goTo])

  const active = images[selectedIndex]
  useEffect(() => { setDisplayFailed(false) }, [active?.url])

  const handleCurrentInfo = useCallback((info) => setCurrentCache(info), [])
  const handleRetry = useCallback(() => {
    setDisplayFailed(false)
    currentCache.retry()
  }, [currentCache])

  const hasAnyCaption = images.some(img => img.caption)

  if (!images.length) return null

  function onPointerDown(e) {
    tap.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  function onPointerMove(e) {
    const t = tap.current
    if (Math.abs(e.clientX - t.x) > TAP_SLOP_PX || Math.abs(e.clientY - t.y) > TAP_SLOP_PX) {
      t.moved = true
    }
  }
  function onPointerUp() {
    if (!tap.current.moved) openAt(selectedIndex)
  }

  // Embla drives the drag via pointer events, which don't stop the raw
  // touchstart/touchmove/touchend events from also bubbling up to
  // whatever's listening for a horizontal swipe higher in the tree (e.g.
  // the Rx/Clinical tab switcher). The old hand-rolled touch handlers
  // stopped that propagation as a side effect; these three do the same
  // job on their own, with no drag logic attached. Doesn't affect
  // vertical scrolling — that's handled by the `touchAction: 'pan-y'`
  // CSS below, not by JS event propagation.
  function onTouchStart(e) { e.stopPropagation() }
  function onTouchMove(e) { e.stopPropagation() }
  function onTouchEnd(e) { e.stopPropagation() }

  return (
    <>
      <div style={{ userSelect: 'none', marginBottom: 'var(--space-3)' }}>
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

        <div style={{
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--color-surface)',
        }}>
          {/* 4:3 photo area — Embla viewport */}
          <div
            ref={emblaRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              overflow: 'hidden',
              cursor: 'zoom-in',
              backgroundColor: 'var(--color-bg)',
              // Lets the browser handle vertical page scroll natively;
              // Embla owns horizontal drag via JS. Replaces the old
              // manual horizontal/vertical phase-detection entirely.
              touchAction: 'pan-y',
            }}
          >
            <div style={{ display: 'flex', height: '100%' }}>
              {images.map((img, i) => (
                <Slide
                  key={img.id ?? i}
                  img={img}
                  index={i}
                  selectedIndex={selectedIndex}
                  onCurrentInfo={handleCurrentInfo}
                  onCurrentFailed={() => setDisplayFailed(true)}
                  currentDisplayFailed={displayFailed}
                />
              ))}
            </div>

            {currentCache.status === 'ready' && !displayFailed && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 26, height: 26, borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}
              >
                <ZoomIn size={14} color="#fff" />
              </div>
            )}

            {(currentCache.status === 'error' || displayFailed) && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                style={{ position: 'absolute', inset: 0, cursor: 'default' }}
              >
                <ImageLoadError onRetry={handleRetry} />
              </div>
            )}
          </div>

          {/* Footer — dots and/or caption; only rendered when there's
              something to show. */}
          {(images.length > 1 || hasAnyCaption) && (
            <div style={{ padding: '10px var(--space-4) var(--space-3)' }}>
              {images.length > 1 && (
                <div style={{
                  display: 'flex', justifyContent: 'center', gap: 6,
                  marginBottom: hasAnyCaption ? 8 : 0,
                }}>
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      aria-label={`Image ${i + 1}`}
                      style={{
                        width:  i === selectedIndex ? 8 : 6,
                        height: i === selectedIndex ? 8 : 6,
                        borderRadius: '50%',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        backgroundColor: i === selectedIndex
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

              {hasAnyCaption && (
                <div
                  dir="auto"
                  style={{
                    height: 19,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 13,
                    color: 'var(--color-text-secondary)',
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {active?.caption && (
                    <>
                      <MessageSquare size={13} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}>
                        {active.caption}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={images}
          activeIndex={selectedIndex}
          onClose={() => setLightboxOpen(false)}
          onGo={goTo}
        />
      )}
    </>
  )
}
