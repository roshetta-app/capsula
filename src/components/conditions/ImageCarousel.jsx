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
 *     photo (object-fit: cover) rather than empty background colour.
 *     This replaces the earlier crop-to-fill approach — these are
 *     clinical reference photos, so nothing an editor uploads should
 *     ever get cropped off in-page. Full detail is still only reachable
 *     via pinch/double-tap zoom in the lightbox, same as before.
 *   - Caption row only renders — and only reserves its fixed height —
 *     when at least one photo in the gallery actually has a caption.
 *     A gallery where nothing has a caption (including any single-photo
 *     gallery with no caption) now shows no reserved space at all.
 *     When some photos have captions and others don't, the row still
 *     stays reserved at a fixed height across every photo in that
 *     gallery, so the card doesn't resize while swiping between them.
 *   - Caption row is a flex row with a leading caption/comment icon.
 *     dir="auto" on the row lets the browser resolve RTL/LTR from the
 *     caption text.
 *
 * Interaction (refined 2026-09-02):
 *   - The photo now tracks your finger while dragging — a real sliding
 *     motion, not an instant swap once a threshold is crossed. Three
 *     photos (previous / current / next) sit side by side in a strip;
 *     dragging moves the strip by the same distance as the finger, and
 *     lifting either finishes the slide onto the neighbouring photo
 *     (past ~20% of the card's width) or glides back to the current one.
 *     This also removes the old hard-cut flicker when the current photo
 *     changes, since the neighbouring photo is already on-screen and
 *     already loaded before the slide finishes, rather than a same-
 *     element image swap.
 *   - Tap (< 8px movement on both axes, no drag started) → opens
 *     Lightbox.
 *   - A vertical finger movement bigger than the horizontal one is left
 *     alone (lets the page's own vertical scroll win), same as before.
 *   - e.stopPropagation() on touch start blocks the parent tab-switcher.
 *
 * Offline caching (Image System Refinement Plan, Part A):
 *   - The previous, current, and next photo are each loaded via
 *     useCachedImage (device-first → network → cache-on-view), so the
 *     neighbouring photos revealed by a drag are already resolved from
 *     the on-device store the same way the current one is.
 *   - 'ready'   → photo renders as before.
 *   - 'error'   → ImageLoadError placeholder with a working Retry
 *     button, shown for the current photo only. The placeholder's own
 *     touch handlers stop propagation so tapping Retry doesn't also
 *     register as a drag or a stationary tap.
 *   - 'loading' → nothing rendered yet for that slide.
 *
 * Zoom-hint (Image System Refinement Plan, Part C, Step 2):
 *   - Unchanged — small magnifying-glass badge, top-right of the photo,
 *     shown whenever the current photo is 'ready'. Purely decorative
 *     (aria-hidden, pointer-events: none).
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

// How long the "commit" / "snap back" glide takes once a finger lifts.
const SETTLE_MS = 280
// A drag has to cross this fraction of the card's width before it
// counts as a committed swipe rather than a snap-back. Floored at 40px
// so narrow cards still need a deliberate drag, not a stray touch.
const COMMIT_RATIO = 0.2
const COMMIT_MIN_PX = 40

// One slide's photo: the real photo shown in full (object-fit: contain)
// over a blurred, darkened copy of itself filling the rest of the 4:3
// area, so nothing is ever cropped off but there's no dead background
// space either. Renders nothing (leaves the slide blank) until its
// cached copy is ready — used for the previous/next slides that may
// still be resolving while a drag reveals them.
function SlidePhoto({ cached, caption, onFailed }) {
  const { src, status } = cached
  if (status !== 'ready' || !src) return null
  return (
    <>
      <img
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center',
          filter: 'blur(28px) brightness(0.65)',
          transform: 'scale(1.15)',
          pointerEvents: 'none',
        }}
      />
      <img
        src={src}
        alt={caption || ''}
        draggable={false}
        onError={onFailed}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'contain', objectPosition: 'center',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}

export default function ImageCarousel({ images = [], title = '' }) {
  const [index,        setIndex]    = useState(0)
  const [lightboxOpen, setLightbox] = useState(false)
  const [dragPx,       setDragPx]   = useState(0)
  const [settling,     setSettling] = useState(null) // null | 'next' | 'prev' | 'back'

  const areaRef = useRef(null)
  const touch = useRef({ startX: 0, startY: 0, dragging: false, containerWidth: 0 })

  const goTo   = useCallback((i) => setIndex(Math.max(0, Math.min(images.length - 1, i))), [images.length])
  const openAt = useCallback((i) => { setIndex(i); setLightbox(true) }, [])

  // Hooks must run unconditionally — the `images.length` guard below
  // happens after this, so any of these may be undefined on a short or
  // empty array; useCachedImage(undefined) safely resolves to 'error'
  // and SlidePhoto renders nothing in that case.
  const prevImg = images[index - 1]
  const current = images[index]
  const nextImg = images[index + 1]

  const prevCached = useCachedImage(prevImg?.url)
  const currCached = useCachedImage(current?.url)
  const nextCached = useCachedImage(nextImg?.url)

  // 2026-09-02 fix: useCachedImage falls back to the photo's plain
  // address when it can't fetch()/cache a copy (e.g. CORS-blocked
  // external photos), which still displays fine via a normal <img>.
  // This local flag catches the rarer case where the address is
  // genuinely dead and even that fails, via the <img>'s own onError.
  const [displayFailed, setDisplayFailed] = useState(false)
  useEffect(() => { setDisplayFailed(false) }, [current?.url])
  const handleRetry = useCallback(() => { setDisplayFailed(false); currCached.retry() }, [currCached])

  const hasAnyCaption = images.some(img => img.caption)

  if (!images.length) return null

  function onTouchStart(e) {
    e.stopPropagation()
    if (images.length <= 1 || settling) return
    const t = touch.current
    t.startX = e.touches[0].clientX
    t.startY = e.touches[0].clientY
    t.dragging = false
    t.containerWidth = areaRef.current ? areaRef.current.getBoundingClientRect().width : 0
  }

  function onTouchMove(e) {
    if (images.length <= 1 || settling) return
    const t = touch.current
    const dx = e.touches[0].clientX - t.startX
    const dy = e.touches[0].clientY - t.startY

    if (!t.dragging) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) return // vertical scroll wins — leave it alone
      t.dragging = true
    }

    e.stopPropagation()
    e.preventDefault()

    let next = dx
    if (index === 0 && next > 0) next = 0
    if (index === images.length - 1 && next < 0) next = 0
    setDragPx(next)
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    if (images.length <= 1 || settling) return
    const t = touch.current

    if (!t.dragging) {
      // Stationary tap — open lightbox
      openAt(index)
      return
    }

    const threshold = Math.max(COMMIT_MIN_PX, t.containerWidth * COMMIT_RATIO)
    if (dragPx <= -threshold && index < images.length - 1) {
      setSettling('next')
    } else if (dragPx >= threshold && index > 0) {
      setSettling('prev')
    } else {
      setSettling('back')
    }
  }

  function handleTransitionEnd() {
    if (!settling) return
    if (settling === 'next') setIndex(i => i + 1)
    if (settling === 'prev') setIndex(i => i - 1)
    setSettling(null)
    setDragPx(0)
  }

  // Track position: three slides (previous | current | next), each a
  // third of the strip's own width, strip itself 3x the card's width.
  // -33.3334% centres the "current" slide in the visible card — that's
  // the resting position and where a cancelled drag glides back to.
  // Committing all the way to a neighbour animates to -66.6667% (next)
  // or 0% (previous); once that finishes, the index updates and the
  // strip snaps back to -33.3334% with no transition, which is
  // imperceptible since the new current slide is now the one sitting
  // in the centre.
  let percent = -33.3334
  if (settling === 'next') percent = -66.6667
  if (settling === 'prev') percent = 0

  return (
    <>
      <div style={{ userSelect: 'none', marginBottom: 'var(--space-3)' }}>
        {/* Gallery title — outside the card, doesn't change as you swipe */}
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
          {/* 4:3 photo area */}
          <div
            ref={areaRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              position: 'relative',
              aspectRatio: '4 / 3',
              overflow: 'hidden',
              cursor: 'zoom-in',
              backgroundColor: 'var(--color-bg)',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', width: '300%',
              transform: `translateX(calc(${percent}% + ${settling ? 0 : dragPx}px))`,
              transition: settling ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
            }}
              onTransitionEnd={handleTransitionEnd}
            >
              <div style={{ position: 'relative', flex: '0 0 33.3334%', height: '100%' }}>
                <SlidePhoto cached={prevCached} caption={prevImg?.caption} />
              </div>
              <div style={{ position: 'relative', flex: '0 0 33.3334%', height: '100%' }}>
                {!displayFailed && (
                  <SlidePhoto
                    cached={currCached}
                    caption={current?.caption}
                    onFailed={() => setDisplayFailed(true)}
                  />
                )}
              </div>
              <div style={{ position: 'relative', flex: '0 0 33.3334%', height: '100%' }}>
                <SlidePhoto cached={nextCached} caption={nextImg?.caption} />
              </div>
            </div>

            {currCached.status === 'ready' && currCached.src && !displayFailed && (
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

            {(currCached.status === 'error' || displayFailed) && (
              <div
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                style={{ position: 'absolute', inset: 0, cursor: 'default' }}
              >
                <ImageLoadError onRetry={handleRetry} />
              </div>
            )}
          </div>

          {/* Footer — dots and/or caption; only rendered at all when
              there's something to show, so a single uncaptioned photo
              (or a gallery where nothing has a caption) leaves no dead
              space below the card at all. */}
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

              {/* Caption slot — reserves a fixed height only while this
                  gallery actually has at least one caption somewhere in
                  it, so the card never resizes between a captioned and
                  an uncaptioned photo within the same gallery. */}
              {hasAnyCaption && (
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
              )}
            </div>
          )}
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
