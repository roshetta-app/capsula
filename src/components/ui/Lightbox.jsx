/**
 * Lightbox — full-screen portal image viewer.
 *
 * Rebuild (Image System Refinement Plan, Part C — chrome/motion/gesture
 * pass, 2026-09-02). Replaces the earlier "chrome softening" pass (pill
 * counter + translucent circles scattered over the photo) with a proper
 * rebuild addressing three separate complaints about that earlier pass:
 * the controls read as disconnected floating pieces, open/close had no
 * animation, and the hand-rolled pinch/pan math felt janky.
 *
 * Chrome (Direction A — unified bands):
 *   Controls are grouped into two connected translucent bands (top:
 *   counter + close; bottom: prev/next + caption + dots) instead of
 *   floating separately over the photo — the same "group related things
 *   into one container" logic already used in ImageCarousel.jsx's
 *   bordered-card redesign. Close and nav buttons now share identical
 *   sizing/treatment (previously the close button was visibly smaller
 *   than the nav arrows for no real reason).
 *   Tapping the photo toggles both bands' visibility, for distraction-
 *   free viewing — a single re-tap brings them back.
 *
 * Motion (framer-motion):
 *   - Open/close: backdrop fades in/out; the very first photo shown
 *     fades and scales up from ~94% rather than just appearing.
 *   - Chrome show/hide: a plain opacity fade on each band.
 *   - Swipe left/right (at 1x zoom) navigates; swipe down (at 1x)
 *     dismisses. The photo does NOT visually follow the finger during
 *     the swipe itself (changed 2026-09-02) — it stays put until the
 *     finger lifts, and only then, if the swipe cleared the distance
 *     threshold, does the transition play: a directional slide, like a
 *     carousel (changed 2026-09-02, on request) — the new photo slides
 *     in from the side you swiped toward while the old one slides out
 *     the opposite way, at the same time. This only replaces the
 *     open/close fade-and-scale for the very first photo shown; every
 *     later index change (swipe or the prev/next arrows) always uses
 *     the slide instead.
 *   - Backdrop stays a fixed, solid opacity throughout.
 *
 * Zoom/pan (react-zoom-pan-pinch):
 *   Replaces the previous hand-rolled pinch/pan/double-tap finger-
 *   tracking math entirely — same category of fix as the Embla swap in
 *   ImageCarousel.jsx (a maintained library owns the actual gesture
 *   physics instead of custom touch-event math). Swipe-navigate and
 *   swipe-down-dismiss are disabled while zoomed past 1x, so panning a
 *   zoomed photo doesn't fight with them.
 *
 * Portal event leak (fixed 2026-09-02):
 *   This component teleports its DOM into document.body via
 *   createPortal, but React still delivers touch events along the
 *   *component* tree, not the DOM tree — so a swipe inside the lightbox
 *   was still reaching touch handlers on whatever screen actually
 *   rendered <Lightbox />, one of which reads horizontal swipes as a
 *   request to switch tabs. Stopping propagation on the outermost
 *   portaled element (below) keeps every touch that starts inside the
 *   lightbox from bubbling out to that ancestor, without touching how
 *   framer-motion or react-zoom-pan-pinch read gestures on the elements
 *   *inside* this component — they see the event first, before it ever
 *   reaches this boundary.
 *
 * Offline caching (Image System Refinement Plan, Part A) — unchanged:
 *   The active photo loads via useCachedImage (device-first → network →
 *   cache-on-view). 'error' shows the ImageLoadError placeholder with a
 *   working Retry button.
 *
 * Props:
 *   images       { id, url, caption }[]
 *   activeIndex  number
 *   onClose      () => void
 *   onGo         (index: number) => void
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCachedImage } from '../../hooks/useCachedImage'
import ImageLoadError from './ImageLoadError'

const BAND_STYLE = {
  position: 'relative',
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 14px',
  backgroundColor: 'rgba(255,255,255,0.10)',
}

// Close and nav buttons now share one style — previously the close
// button (28px/15px icon) was visibly smaller than the nav arrows
// (32px/17px icon) for no real reason.
const CONTROL_BUTTON_STYLE = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: 'rgba(255,255,255,0.12)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'rgba(255,255,255,0.85)',
  WebkitTapHighlightColor: 'transparent',
  outline: 'none',
  flexShrink: 0,
}

const CONTROL_PLACEHOLDER_STYLE = { width: 32, height: 32, flexShrink: 0 }

// Swallows a touch event at the portal boundary — see "Portal event
// leak" note above. Applied to touchstart/touchmove/touchend on the
// outermost portaled element only; it never runs on the elements that
// actually need to see the gesture (the draggable photo, the zoom/pan
// wrapper), since those sit further down the tree and get the event
// first, before it bubbles out to here.
function stopTouchLeak(e) { e.stopPropagation() }

export default function Lightbox({ images, activeIndex, onClose, onGo }) {
  const [chromeVisible, setChromeVisible] = useState(true)
  const [displayFailed, setDisplayFailed] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  // The parent renders this component with a plain `{open && <Lightbox />}`
  // — there's no AnimatePresence wrapping that conditional, so a normal
  // framer-motion `exit` animation would never get the chance to play; the
  // component would just vanish the instant `onClose` unmounts it. Instead,
  // closing is staged locally: fade out first, then call the real `onClose`
  // once that fade finishes.
  const [isClosing, setIsClosing] = useState(false)
  const requestClose = useCallback(() => setIsClosing(true), [])
  const swipeStart = useRef(null)
  // dirRef: which way the last swipe/nav-tap moved (1 = to the next
  // photo, -1 = to the previous one). isFirstPhotoRef: true only for
  // the very first photo shown when the viewer opens — that one keeps
  // the fade+scale open animation instead of sliding in, since there's
  // no "previous" photo for it to slide in relative to. Flips to false
  // once, right after the first paint, and never flips back.
  const dirRef = useRef(1)
  const isFirstPhotoRef = useRef(true)
  useEffect(() => { isFirstPhotoRef.current = false }, [])

  const active = images[activeIndex]
  const { src, status, retry } = useCachedImage(active?.url)

  const handleRetry = useCallback(() => { setDisplayFailed(false); retry() }, [retry])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Reset failure/zoom state when the photo itself changes — otherwise a
  // failed load or a leftover zoom level from the previous photo would
  // bleed into the next one.
  useEffect(() => { setDisplayFailed(false) }, [active?.url])
  useEffect(() => { setZoomScale(1) }, [active?.url])

  if (!active) return null

  // Swipe is only meaningful at 1x — once zoomed in, a single-finger
  // drag belongs to react-zoom-pan-pinch's own panning instead.
  const canSwipe = status === 'ready' && !displayFailed && zoomScale <= 1

  // Records which way we're moving before telling the parent to change
  // the index — the slide variants below read dirRef at animation time,
  // including for the photo that's already on its way out.
  function goTo(newIndex) {
    dirRef.current = newIndex > activeIndex ? 1 : -1
    onGo(newIndex)
  }

  function handlePhotoTouchStart(e) {
    if (!canSwipe) return
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handlePhotoTouchEnd(e) {
    if (!canSwipe || !swipeStart.current) return
    const dx = e.changedTouches[0].clientX - swipeStart.current.x
    const dy = e.changedTouches[0].clientY - swipeStart.current.y
    swipeStart.current = null

    if (Math.abs(dy) > Math.abs(dx) && dy > 100) {
      requestClose()
      return
    }
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx < 0 && activeIndex < images.length - 1) goTo(activeIndex + 1)
      if (dx > 0 && activeIndex > 0) goTo(activeIndex - 1)
    }
  }

  // enter/exit read {isFirstPhoto, dir} via the `custom` prop rather
  // than closing over component state directly — framer-motion freezes
  // a departing element's own props at the moment it's removed, so
  // without this it would slide out using whatever direction was true
  // the last time IT was the entering photo, not the direction of the
  // swipe that's currently pushing it out. AnimatePresence's `custom`
  // prop is the one channel that still reaches an already-exiting
  // element.
  const slideVariants = {
    enter: ({ isFirstPhoto, dir }) => isFirstPhoto
      ? { opacity: 0, scale: 0.94, x: 0 }
      : { opacity: 1, scale: 1, x: dir > 0 ? '100%' : '-100%' },
    exit: ({ isFirstPhoto, dir }) => isFirstPhoto
      ? { opacity: 0, scale: 0.96, x: 0 }
      : { opacity: 1, scale: 1, x: dir > 0 ? '-100%' : '100%' },
  }
  const slideCustom = { isFirstPhoto: isFirstPhotoRef.current, dir: dirRef.current }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={() => { if (isClosing) onClose() }}
      onTouchStart={stopTouchLeak}
      onTouchMove={stopTouchLeak}
      onTouchEnd={stopTouchLeak}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.94)',
        display: 'flex', flexDirection: 'column',
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      {/* Top band — counter + close */}
      <motion.div
        animate={{ opacity: chromeVisible ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          ...BAND_STYLE,
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        {images.length > 1 ? (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
            {activeIndex + 1} / {images.length}
          </span>
        ) : <span />}
        <button
          onClick={(e) => { e.stopPropagation(); requestClose() }}
          aria-label="Close"
          style={CONTROL_BUTTON_STYLE}
        >
          <X size={17} strokeWidth={2.5} />
        </button>
      </motion.div>

      {/* Image area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence initial={false} custom={slideCustom}>
          <motion.div
            key={active.url}
            custom={slideCustom}
            variants={slideVariants}
            initial="enter"
            animate={{ opacity: isClosing ? 0 : 1, scale: isClosing ? 0.94 : 1, x: 0 }}
            exit="exit"
            transition={isFirstPhotoRef.current
              ? { duration: 0.22, ease: 'easeOut' }
              : { duration: 0.28, ease: 'easeOut' }}
            onTap={() => setChromeVisible((v) => !v)}
            onTouchStart={handlePhotoTouchStart}
            onTouchEnd={handlePhotoTouchEnd}
            style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'none',
            }}
          >
            {status === 'ready' && src && !displayFailed && (
              <TransformWrapper
                initialScale={1}
                minScale={1}
                maxScale={4}
                doubleClick={{ mode: 'toggle', step: 1.5 }}
                // Panning is only meaningful once actually zoomed in — left
                // enabled at 1x, it still captures part of a single-finger
                // drag, which corrupts the swipe/dismiss gesture below into
                // misreading a sideways swipe as a downward one. Pinch
                // itself stays active regardless (separate from panning),
                // so zooming in still works from any scale.
                panning={{ disabled: zoomScale <= 1, velocityDisabled: true }}
                onTransformed={(_ref, state) => setZoomScale(state.scale)}
              >
                <TransformComponent
                  wrapperStyle={{ width: '100%', height: '100%' }}
                  contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <img
                    src={src}
                    alt={active.caption || ''}
                    draggable={false}
                    onError={() => setDisplayFailed(true)}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                  />
                </TransformComponent>
              </TransformWrapper>
            )}

            {(status === 'error' || displayFailed) && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ImageLoadError onRetry={handleRetry} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom band — prev / caption + dots / next */}
      <motion.div
        animate={{ opacity: chromeVisible ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          ...BAND_STYLE,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        {images.length > 1 && activeIndex > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); goTo(activeIndex - 1) }}
            aria-label="Previous image"
            style={CONTROL_BUTTON_STYLE}
          >
            <ChevronLeft size={17} strokeWidth={2} />
          </button>
        ) : <span style={CONTROL_PLACEHOLDER_STYLE} />}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          {active.caption && (
            <p dir="auto" style={{
              margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: 13,
              lineHeight: 1.5, textAlign: 'center', padding: '0 8px',
            }}>
              {active.caption}
            </p>
          )}
          {images.length > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {images.map((_, i) => (
                <div key={i} style={{
                  width: i === activeIndex ? 8 : 5,
                  height: i === activeIndex ? 8 : 5,
                  borderRadius: '50%',
                  backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.35)',
                  transition: 'all 0.2s ease', flexShrink: 0,
                }} />
              ))}
            </div>
          )}
        </div>

        {images.length > 1 && activeIndex < images.length - 1 ? (
          <button
            onClick={(e) => { e.stopPropagation(); goTo(activeIndex + 1) }}
            aria-label="Next image"
            style={CONTROL_BUTTON_STYLE}
          >
            <ChevronRight size={17} strokeWidth={2} />
          </button>
        ) : <span style={CONTROL_PLACEHOLDER_STYLE} />}
      </motion.div>
    </motion.div>,
    document.body
  )
}
