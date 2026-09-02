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
 *   free viewing — a single re-tap brings them back. This is decided by
 *   the same touch handler that reads swipes (see below), not
 *   framer-motion's own onTap gesture — using both at once was the
 *   cause of a 2026-09-02 bug where swipes randomly got misread as taps
 *   and flickered the chrome, once the drag-follow (which used to
 *   "claim" real movement before onTap could) was removed.
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
 * Chrome layering pass (2026-09-02, second pass same day):
 *   Counter and prev/next arrow buttons removed entirely — the dots
 *   already show position, swipe already handles navigation. The photo
 *   is now the true fullscreen base layer (solid opaque black
 *   background, no translucency) rather than being squeezed into a
 *   middle flex section between two tinted bands. The close button and
 *   the caption+dots block are now separate, absolutely-positioned
 *   overlays that float over the photo instead of consuming layout
 *   space. Caption and dots are independent of each other: the caption
 *   keeps a fixed-height slot regardless of whether the current photo
 *   has one, so the dots never shift position between photos, and both
 *   sit on one shared black gradient (transparent -> solid) for
 *   legibility against any photo.
 *
 * Back-gesture guard (2026-09-02, third pass same day):
 *   Nothing anywhere in this app previously trapped the back button/
 *   gesture for a modal-style overlay, so with no listener registered,
 *   "back" fell straight through to whatever navigated the page
 *   underneath — closing the Lightbox was never actually possible via
 *   back, it just left the current screen entirely. Two separate
 *   mechanisms now cover the two build targets: on native Android, a
 *   Capacitor `backButton` listener is registered for as long as the
 *   Lightbox is mounted and simply closes it instead of falling
 *   through. On the website/PWA (no Capacitor bridge to hook into),
 *   opening the Lightbox pushes a placeholder browser-history entry;
 *   popping it (back gesture/button) closes the Lightbox the same way,
 *   and closing normally instead (X, swipe-down) removes that
 *   placeholder itself so it doesn't leave a dead history entry behind.
 *
 * Caption/photo sync fix (2026-09-02, fourth + fifth pass same day):
 *   The caption text was previously a plain, un-animated node — when
 *   the active photo changed, it just snapped to the new value in place,
 *   completely disconnected from the photo's own slide/settle animation.
 *   That mismatch is what showed up as a flicker: the text swapped
 *   instantly while the photo was still mid-slide.
 *   First attempt: an AnimatePresence with mode="popLayout" that mirrored
 *   the photo's directional slide. Both parts of that were wrong for a
 *   caption living in a plain flex column (not the photo's own
 *   absolutely-positioned stage): the directional slide read as the
 *   text flying across the screen, and popLayout — which yanks the
 *   outgoing element out of document flow the instant it starts exiting
 *   — made the bottom band's height (and so the caption's own position,
 *   since the band grows/shrinks upward from a bottom anchor) jump
 *   around for the duration of the crossfade, which read as the caption
 *   flying up and down instead.
 *   Fixed version: no slide, no popLayout. The caption now renders
 *   inside an always-present CSS grid wrapper (`hasAnyCaption`, same
 *   pattern as ImageCarousel.jsx) with every caption sharing one grid
 *   cell (`gridArea: '1 / 1'`), so the outgoing and incoming caption
 *   overlap directly on top of each other for the whole crossfade
 *   instead of one leaving flow before the other arrives. The wrapper's
 *   size is simply "as tall as the taller of the two," so nothing above
 *   or below it (namely the dots) ever moves. Both captions just fade
 *   opacity in place, timed to the photo's own transition duration so
 *   they settle together.
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
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { X } from 'lucide-react'
import { useCachedImage } from '../../hooks/useCachedImage'
import ImageLoadError from './ImageLoadError'

// Close button — the one remaining top control now that the counter is
// gone (dots already show position, swipe already handles navigation).
// Floats directly over the photo instead of sitting in a tinted band.
const CLOSE_BUTTON_WRAP_STYLE = {
  position: 'absolute',
  top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
  right: 14,
  zIndex: 2,
}

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

// Bottom overlay — floats over the fullscreen photo rather than
// compressing it. Holds the caption directly above the dots, both
// covered by one black gradient (transparent -> solid) for legibility
// against any photo, however light. Anchored via `bottom: 0` rather
// than a fixed height, so the whole box (gradient included) grows
// upward as the caption wraps to more lines — the dots, as the last
// child, always sit the same fixed distance above the screen's bottom
// edge regardless of how tall the caption above them gets.
const BOTTOM_OVERLAY_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 2,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 10,
  paddingTop: 44,
  paddingLeft: 20,
  paddingRight: 20,
  paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
  background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,0.68) 38%, rgba(0,0,0,0.42) 58%, rgba(0,0,0,0.18) 78%, rgba(0,0,0,0) 100%)',
}

// No truncation — the caption shows in full, wrapping to as many lines
// as it needs. Only rendered at all when the current photo actually
// has one (see JSX below); the gap above handles the caption/dots
// spacing instead of a margin, so no caption means no gap either.
const CAPTION_STYLE = {
  margin: 0,
  color: '#fff',
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.35,
  textAlign: 'center',
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
  maxWidth: '100%',
}

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
  // True once a browser back gesture/button has already popped the
  // placeholder history entry pushed below — tells that effect's
  // cleanup not to also call history.back() itself for a close that
  // already consumed it.
  const poppedViaBrowserBackRef = useRef(false)

  const active = images[activeIndex]
  const { src, status, retry } = useCachedImage(active?.url)
  // Whether ANY photo in this gallery has a caption at all — mirrors
  // ImageCarousel.jsx's own hasAnyCaption. Used to decide whether the
  // caption's grid wrapper renders at all: keeping that wrapper mounted
  // for the lifetime of the gallery (rather than only when the current
  // photo happens to have a caption) is what lets AnimatePresence below
  // play an outgoing caption's fade even on the photo where it's
  // disappearing, without the wrapper itself popping in and out.
  const hasAnyCaption = images.some((img) => img.caption)

  const handleRetry = useCallback(() => { setDisplayFailed(false); retry() }, [retry])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Android back button/gesture guard. With no listener registered here,
  // Capacitor's default behavior sends "back" straight to the WebView's
  // own browser history — which pops the actual route underneath (e.g.
  // back to the previous screen) instead of just closing this overlay,
  // since the Lightbox never occupies its own spot in that history.
  // Registering a listener here takes over that behavior entirely for as
  // long as the Lightbox is mounted (which is only ever while it's
  // open — the parent renders it conditionally): back closes the
  // Lightbox instead. Removed on unmount, so normal back behavior for
  // the underlying page resumes immediately once closed. No-ops on the
  // website build via the same Capacitor.isNativePlatform() guard
  // already used in App.jsx for the status bar — the website/PWA's own
  // browser back-gesture is covered separately, by the next effect below.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      requestClose()
    })
    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [requestClose])

  // Browser back-gesture/button guard (website/PWA only — the effect
  // above already covers the native Android app via Capacitor). A plain
  // browser has no equivalent of Capacitor's backButton event; back is
  // just "pop the browser's history," which would otherwise navigate
  // the underlying route away exactly like the native case did before
  // its own fix. Pushing a placeholder entry here gives the Lightbox its
  // own spot in that history, so back pops the placeholder (caught
  // below and turned into a close) instead of the real route entry
  // underneath it.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return
    window.history.pushState({ capsulaLightbox: true }, '')
    function handlePopState() {
      poppedViaBrowserBackRef.current = true
      requestClose()
    }
    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      // Closed via a UI control (X, swipe-down) rather than the browser
      // back gesture — the placeholder entry pushed above is still
      // sitting there unconsumed. Remove it so the back stack doesn't
      // end up with a dead entry someone would have to press back
      // through twice.
      if (!poppedViaBrowserBackRef.current) {
        window.history.back()
      }
    }
  }, [requestClose])

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
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function handlePhotoTouchEnd(e) {
    if (!swipeStart.current) return
    const dx = e.changedTouches[0].clientX - swipeStart.current.x
    const dy = e.changedTouches[0].clientY - swipeStart.current.y
    swipeStart.current = null

    // A touch that barely moved is a tap, not a swipe — toggle the
    // chrome. Checked first and unconditionally (even while zoomed),
    // since tapping to show/hide the controls has always worked
    // regardless of zoom level.
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) {
      setChromeVisible((v) => !v)
      return
    }

    // Anything past that is real movement — while zoomed in, that
    // movement belongs to react-zoom-pan-pinch's own panning, not us.
    if (!canSwipe) return

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

  // Caption's own transition — a plain crossfade, timed to the photo's
  // own transition duration so the two finish together. No slide, no
  // direction: the earlier attempt reused the photo's slide distance for
  // the caption too, but with the caption sitting in a plain flex column
  // (not the photo's absolutely-positioned stage), popping the outgoing
  // caption out of flow mid-fade made the box's height (and so the
  // caption's own position, since the box grows/shrinks upward from a
  // bottom anchor) jump around — read as the caption "flying" up and
  // down rather than just fading. Fixed below by overlapping the
  // outgoing and incoming caption in the same CSS grid cell instead of
  // letting one leave the document flow before the other arrives, so the
  // wrapper's size is simply "however tall the taller of the two is" for
  // the entire crossfade, with no reflow at any point.
  const captionTransition = { duration: 0.22, ease: 'easeInOut' }
  const photoTransition = isFirstPhotoRef.current
    ? { duration: 0.22, ease: 'easeOut' }
    : { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }

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
        backgroundColor: '#000',
        touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) requestClose() }}
    >
      {/* Image area — fullscreen base layer, true edge-to-edge, solid
          black background with no other layout siblings taking up
          space around it. Top/bottom controls float over this as
          separate absolutely-positioned overlays below. */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <AnimatePresence initial={false} custom={slideCustom}>
          <motion.div
            key={active.url}
            custom={slideCustom}
            variants={slideVariants}
            initial="enter"
            animate={{ opacity: isClosing ? 0 : 1, scale: isClosing ? 0.94 : 1, x: 0 }}
            exit="exit"
            transition={photoTransition}
            onTouchStart={handlePhotoTouchStart}
            onTouchEnd={handlePhotoTouchEnd}
            style={{
              position: 'absolute', inset: 0,
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

      {/* Close — the one remaining top control, floating over the photo */}
      <motion.div
        animate={{ opacity: chromeVisible ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          ...CLOSE_BUTTON_WRAP_STYLE,
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); requestClose() }}
          aria-label="Close"
          style={CONTROL_BUTTON_STYLE}
        >
          <X size={17} strokeWidth={2.5} />
        </button>
      </motion.div>

      {/* Caption + dots — independent of each other: the caption shows
          in full with no truncation and is only rendered when the
          current photo has one; the dots still sit at one fixed
          position on every photo regardless, because this whole box is
          anchored to the screen's bottom edge (bottom: 0) rather than
          given a fixed height — a taller caption grows the box upward,
          not downward, so the dots as the last child never move. Both
          float over the photo on a shared bottom gradient that grows
          with the box instead of a flat tinted band.

          The caption itself sits in its own always-present grid wrapper
          (rendered whenever any photo in the gallery has a caption) so
          AnimatePresence can crossfade the outgoing/incoming caption
          overlapping in the same grid cell — see the "Caption/photo
          sync fix" note in the file header for why. */}
      <motion.div
        animate={{ opacity: chromeVisible ? 1 : 0 }}
        transition={{ duration: 0.18 }}
        style={{
          ...BOTTOM_OVERLAY_STYLE,
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        {hasAnyCaption && (
          <div style={{ display: 'grid', width: '100%' }}>
            <AnimatePresence initial={false}>
              {active.caption && (
                <motion.p
                  key={active.url}
                  dir="auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={captionTransition}
                  style={{ ...CAPTION_STYLE, gridArea: '1 / 1' }}
                >
                  {active.caption}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
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
      </motion.div>
    </motion.div>,
    document.body
  )
}
