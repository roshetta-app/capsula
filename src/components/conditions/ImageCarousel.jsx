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
 * Interaction / continuity fix (2026-09-02, second pass):
 *   Earlier this session the swipe was rebuilt as three fixed "prev /
 *   current / next" photo slots whose ROLE shifted by one every swipe.
 *   That caused two real bugs, both root-caused and fixed here:
 *     1. Flicker on every swipe — each slot's cache tracking was keyed
 *        to its role, not to a specific photo, so the photo that had
 *        just become "current" briefly looked like a brand new,
 *        unloaded photo and re-resolved from scratch, causing a visible
 *        flash.
 *     2. Occasional permanent lockup — swiping past the first or last
 *        photo (edge of the gallery) could leave the settle animation
 *        waiting on a browser transition-end event that, in that one
 *        case, never fires, permanently freezing all further swipes
 *        AND taps (since both were gated on that wait completing).
 *   Fix: the three DOM slots now stay assigned to whichever photo index
 *   they've always tracked (index % 3), and only change photo when a
 *   photo genuinely leaves the nearby window — so the photo you just
 *   swiped onto never gets relabelled as "new." Settling is now driven
 *   by a plain timer instead of waiting on a transition event, so it is
 *   no longer possible for it to hang indefinitely.
 *
 * Tap-vs-swipe fix (2026-09-02, third pass):
 *   Root cause (confirmed from code, not a guess): the old logic treated
 *   "the finger never crossed the drag threshold" as the ONLY signal for
 *   "this was a tap" — but a vertical scroll gesture over the carousel
 *   also never crosses that threshold (it's explicitly left alone so the
 *   page can scroll), so on release it was indistinguishable from a tap
 *   and wrongly opened the lightbox. Separately, touchstart skipped
 *   resetting its tracking state whenever a touch began mid-settle,
 *   which could leave a stale drag/tap state from a previous gesture to
 *   be read by the *next* gesture's touchend — sometimes swallowing a
 *   real tap, sometimes firing the lightbox from what was actually a
 *   swipe.
 *   Fix: touch tracking now always resets on every touchstart (a
 *   separate `ignore` flag — not skipping the reset — is what disables
 *   a touch that starts during settle or on a single-photo gallery).
 *   The gesture is classified into exactly one of three outcomes –
 *   'undetermined' (never moved past the threshold — a genuine tap),
 *   'horizontal' (a committed carousel drag), or 'vertical' (a scroll,
 *   explicitly never a tap and never a drag) — so only a real stationary
 *   tap can open the lightbox.
 *   NOTE: this pass fixes tap/lightbox reliability only. The reported
 *   flashing-on-swipe and card-bottom-border jump are still open and are
 *   deliberately not touched here — see NEXT_SESSION notes.
 *
 * Offline caching (Image System Refinement Plan, Part A):
 *   - Each of the three tracked photos loads via useCachedImage
 *     (device-first → network → cache-on-view).
 *   - 'ready'   → photo renders.
 *   - 'error'   → ImageLoadError placeholder with a working Retry
 *     button, shown for the current photo only. Its own touch handlers
 *     stop propagation so a Retry tap isn't read as a drag or a
 *     stationary tap.
 *   - 'loading' → nothing rendered yet for that slot.
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
import Lightbox from '../ui/Lightbox'
import ImageLoadError from '../ui/ImageLoadError'
import { useCachedImage } from '../../hooks/useCachedImage'

// ─── TEMP DIAGNOSTIC LOGGING (2026-09-02) ───────────────────────────
// Added to capture real touch/settle behaviour on-device while
// tracking down the flashing, border-jump, and stuck-swipe bugs.
// Remove this whole block, and every dlog(...) call below, once we
// have what we need — none of it is meant to ship.
function dlog(...args) {
  // eslint-disable-next-line no-console
  console.log('[Carousel]', ...args)
}
// ──────────────────────────────────────────────────────────────────

// How long the "commit" / "snap back" glide takes once a finger lifts.
// Settling is cleared by a plain timer set to this plus a small buffer —
// not by waiting on a CSS transition-end event — so it can never hang.
const SETTLE_MS = 260
const SETTLE_TIMEOUT_MS = SETTLE_MS + 40

// A drag has to cross this fraction of the card's width before it
// counts as a committed swipe rather than a snap-back. Floored at 40px
// so narrow cards still need a deliberate drag, not a stray touch.
const COMMIT_RATIO = 0.2
const COMMIT_MIN_PX = 40

// Which of the three fixed DOM slots a given photo index belongs to.
// Three consecutive indices (index-1, index, index+1) always land on
// three different slots, so a photo keeps the same slot — and the same
// useCachedImage instance behind it — for as long as it stays within
// one step of the current photo, however many swipes that takes.
function slotFor(i) {
  return ((i % 3) + 3) % 3
}

// One slide's photo: shown in full (object-fit: contain) over a
// blurred, darkened copy of itself filling the rest of the 4:3 area.
// Renders nothing until its cached copy is ready.
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
  // phase: 'idle' | 'undetermined' | 'horizontal' | 'vertical'
  //   'idle'        — no touch in progress.
  //   'undetermined'— finger down, hasn't moved past the threshold yet.
  //                   If touchend fires while still here, it's a tap.
  //   'horizontal'  — committed carousel drag.
  //   'vertical'    — committed page scroll; never a tap, never a drag.
  // ignore: true for a touch that started during settle or on a
  //   single-photo gallery — decided once, at touchstart, so a change in
  //   `settling` partway through the same touch can't retroactively
  //   change how it's read.
  const touch = useRef({ startX: 0, startY: 0, phase: 'idle', containerWidth: 0, ignore: false })
  const settleTimer = useRef(null)

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  // TEMP DIAGNOSTIC LOGGING — see block near the top of this file.
  useEffect(() => { dlog('index ->', index) }, [index])
  useEffect(() => { dlog('settling ->', settling) }, [settling])

  const goTo   = useCallback((i) => setIndex(Math.max(0, Math.min(images.length - 1, i))), [images.length])
  const openAt = useCallback((i) => { setIndex(i); setLightbox(true) }, [])

  // The dot indicator should switch the instant a swipe is committed —
  // the same moment the photo starts sliding — not 300ms later when the
  // settle timer actually flips `index`. That timer has a deliberate
  // 40ms safety buffer past the end of the photo's own 260ms slide (so
  // it can never hang waiting on a transition event), which otherwise
  // left the dot visibly lagging behind an already-finished photo slide.
  const displayIndex = settling === 'next' ? index + 1 : settling === 'prev' ? index - 1 : index

  // Each slot is permanently wired to useCachedImage — same three call
  // sites every render, only the url fed into each one changes, and
  // only when the photo it's tracking actually leaves the ±1 window.
  const roleForSlot = useCallback((s) => {
    if (s === slotFor(index - 1)) return 'prev'
    if (s === slotFor(index))     return 'current'
    return 'next'
  }, [index])

  const imageForRole = (role) => {
    const i = role === 'prev' ? index - 1 : role === 'current' ? index : index + 1
    return (i >= 0 && i < images.length) ? images[i] : undefined
  }

  const role0 = roleForSlot(0)
  const role1 = roleForSlot(1)
  const role2 = roleForSlot(2)
  const img0 = imageForRole(role0)
  const img1 = imageForRole(role1)
  const img2 = imageForRole(role2)

  const cached0 = useCachedImage(img0?.url)
  const cached1 = useCachedImage(img1?.url)
  const cached2 = useCachedImage(img2?.url)

  const slots = [
    { role: role0, img: img0, cached: cached0 },
    { role: role1, img: img1, cached: cached1 },
    { role: role2, img: img2, cached: cached2 },
  ]
  const currentSlot = slots.find(s => s.role === 'current')
  const current = images[index]

  // 2026-09-02 fix: useCachedImage falls back to the photo's plain
  // address when it can't fetch()/cache a copy, which still displays
  // fine via a normal <img>. This local flag catches the rarer case
  // where the address is genuinely dead and even that fails.
  const [displayFailed, setDisplayFailed] = useState(false)
  useEffect(() => { setDisplayFailed(false) }, [current?.url])
  const handleRetry = useCallback(() => {
    setDisplayFailed(false)
    currentSlot?.cached.retry()
  }, [currentSlot])

  const hasAnyCaption = images.some(img => img.caption)

  if (!images.length) return null

  function onTouchStart(e) {
    e.stopPropagation()
    const t = touch.current
    t.startX = e.touches[0].clientX
    t.startY = e.touches[0].clientY
    t.phase = 'undetermined'
    t.containerWidth = areaRef.current ? areaRef.current.getBoundingClientRect().width : 0
    // Decided once, here — not re-checked later against a `settling`
    // value that could itself change while this same finger is still down.
    t.ignore = images.length <= 1 || !!settling
    dlog('touchstart', { index, settling, ignore: t.ignore, startX: t.startX, startY: t.startY })
  }

  function onTouchMove(e) {
    const t = touch.current
    if (t.ignore) return
    const dx = e.touches[0].clientX - t.startX
    const dy = e.touches[0].clientY - t.startY

    if (t.phase === 'undetermined') {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      t.phase = Math.abs(dy) > Math.abs(dx) ? 'vertical' : 'horizontal'
      dlog('touchmove phase ->', t.phase, { dx, dy })
      if (t.phase === 'vertical') return // page scroll wins — leave it alone, and never treat this as a tap
    }

    if (t.phase !== 'horizontal') return

    e.stopPropagation()
    e.preventDefault()

    let next = dx
    if (index === 0 && next > 0) next = 0
    if (index === images.length - 1 && next < 0) next = 0
    setDragPx(next)
  }

  function onTouchEnd(e) {
    e.stopPropagation()
    const t = touch.current
    dlog('touchend', { phase: t.phase, ignore: t.ignore, dragPx })

    if (t.ignore) { t.phase = 'idle'; return }

    if (t.phase !== 'horizontal') {
      // 'undetermined' = finger never moved past the threshold = a real
      // stationary tap. 'vertical' = a scroll, and must never open the
      // lightbox no matter how the gesture ends.
      if (t.phase === 'undetermined') { dlog('outcome: tap -> openAt', index); openAt(index) }
      else { dlog('outcome: vertical scroll, ignored') }
      t.phase = 'idle'
      return
    }

    const threshold = Math.max(COMMIT_MIN_PX, t.containerWidth * COMMIT_RATIO)
    let direction = 'back'
    if (dragPx <= -threshold && index < images.length - 1) direction = 'next'
    else if (dragPx >= threshold && index > 0)             direction = 'prev'
    dlog('outcome: swipe ->', direction, { threshold, dragPx })

    t.phase = 'idle'
    setSettling(direction)
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      dlog('settle timer fired ->', direction)
      if (direction === 'next') setIndex(i => Math.min(images.length - 1, i + 1))
      if (direction === 'prev') setIndex(i => Math.max(0, i - 1))
      setSettling(null)
      setDragPx(0)
      settleTimer.current = null
    }, SETTLE_TIMEOUT_MS)
  }

  // Per-slot horizontal position: -100% (prev), 0% (current), +100%
  // (next), then shifted by one whole slot while settling so the target
  // role ends up centred, plus the live drag offset while dragging.
  const roleBase = { prev: -100, current: 0, next: 100 }
  const settleShift = settling === 'next' ? -100 : settling === 'prev' ? 100 : 0
  const dragTerm = settling ? 0 : dragPx

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
            {slots.map((slot, s) => {
              const percent = roleBase[slot.role] + settleShift
              return (
                <div
                  key={s}
                  style={{
                    position: 'absolute', inset: 0,
                    transform: `translateX(calc(${percent}% + ${dragTerm}px))`,
                    transition: settling ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)` : 'none',
                  }}
                >
                  {slot.role === 'current' && displayFailed ? null : (
                    <SlidePhoto
                      cached={slot.cached}
                      caption={slot.img?.caption}
                      onFailed={slot.role === 'current' ? () => setDisplayFailed(true) : undefined}
                    />
                  )}
                </div>
              )
            })}

            {currentSlot?.cached.status === 'ready' && currentSlot.cached.src && !displayFailed && (
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

            {(currentSlot?.cached.status === 'error' || displayFailed) && (
              <div
                onTouchStart={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
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
                        width:  i === displayIndex ? 8 : 6,
                        height: i === displayIndex ? 8 : 6,
                        borderRadius: '50%',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        backgroundColor: i === displayIndex
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
