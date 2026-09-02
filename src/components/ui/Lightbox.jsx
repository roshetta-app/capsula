/**
 * Lightbox — full-screen portal image viewer.
 *
 * Drag engine swap (2026-09-02, matches ImageCarousel.jsx's own Embla
 * swap): the swipe used to be hand-rolled touch-start/touch-end +
 * framer-motion slide — the photo didn't move until the finger lifted,
 * then played a directional slide. That was a deliberate earlier fix for
 * a bug where live drag-follow was getting misread as taps and
 * flickering the chrome. This rebuild replaces the swipe engine with
 * embla-carousel-react (the same library already driving
 * ImageCarousel.jsx) instead of re-solving that bug by hand: Embla owns
 * the drag physics directly (no React re-render per finger-move event),
 * which gets real finger-follow dragging and a rubber-band edge
 * bounce/snap at the first and last photo "for free," and sidesteps the
 * old tap-vs-swipe bug the same structural way it did for the carousel —
 * tap-vs-swipe is now a trivial ~8px pointer-move threshold rather than
 * custom gesture math.
 *
 * Chrome (unchanged — Direction A, unified bands):
 *   Controls are grouped into two connected translucent bands (top:
 *   close; bottom: caption + dots) instead of floating separately over
 *   the photo. Tapping the photo toggles both bands' visibility. This is
 *   decided by the pointer tap-slop check below (not framer-motion's own
 *   onTap gesture, and no longer by the touch handlers either — Embla
 *   owns horizontal drag on the same element, so tap detection is kept
 *   on its own listener family to avoid the two fighting).
 *
 * Motion (framer-motion, simplified by the Embla swap):
 *   Open/close: the backdrop fades in/out, and the whole photo area
 *   fades and scales up from ~94% once on mount. Because Embla now owns
 *   every photo-to-photo transition, this animation only ever needs to
 *   run once when the Lightbox first opens — it no longer has to
 *   distinguish "opening" from "swiping" on every index change the way
 *   the old per-photo AnimatePresence variants did.
 *   Swipe left/right (at 1x zoom) tracks the finger in real time via
 *   Embla and navigates; swipe down (at 1x) still dismisses, checked at
 *   release the same way as before.
 *
 * Per-slide loading (new, mirrors ImageCarousel.jsx's Slide/LOAD_WINDOW):
 *   Photos now sit in an Embla-driven horizontal track of all photos
 *   (same shape as the carousel) instead of only ever mounting the single
 *   active photo. Only the current photo and its immediate neighbours
 *   (±1) actually fetch/decode via useCachedImage, so swiping feels
 *   instant to the next/previous photo without a gallery of many photos
 *   fetching all of them up front.
 *
 * Zoom/pan (react-zoom-pan-pinch, unchanged library, re-wired per slide):
 *   Each slide gets its own TransformWrapper so pinch/double-tap zoom
 *   keeps working exactly as before, but only the current slide's zoom
 *   is "live" — panning is disabled on every other slide, and dragging
 *   to change photos is disabled through Embla's `watchDrag` option
 *   whenever the current slide is zoomed in past 1x (replaces the old
 *   `canSwipe` check, same idea, now wired through Embla). A slide's own
 *   zoom resets automatically the moment it stops being current, so
 *   swiping back to an earlier photo never finds it still zoomed in.
 *
 * Portal event leak (unchanged fix, still needed):
 *   This component teleports its DOM into document.body via
 *   createPortal, but React still delivers touch events along the
 *   *component* tree, not the DOM tree — so a swipe inside the lightbox
 *   could still reach touch handlers on whatever screen actually
 *   rendered <Lightbox />. Stopping propagation at the portal boundary
 *   and again on the Embla viewport (same two-layer guard as before)
 *   keeps every touch that starts inside the lightbox from bubbling out.
 *
 * Offline caching (Image System Refinement Plan, Part A) — unchanged
 *   strategy, now applied per slide instead of only to the active photo:
 *   useCachedImage (device-first → network → cache-on-view). 'error'
 *   shows the ImageLoadError placeholder with a working Retry button for
 *   the current photo only.
 *
 * Back-gesture guard, body-scroll lock — unchanged, since neither depends
 * on how photo-switching itself is implemented.
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
import useEmblaCarousel from 'embla-carousel-react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { X } from 'lucide-react'
import { useCachedImage } from '../../hooks/useCachedImage'
import ImageLoadError from './ImageLoadError'

// How many slides either side of the active photo stay loaded/cached —
// mirrors ImageCarousel.jsx's LOAD_WINDOW exactly, same reasoning (don't
// fetch a whole gallery up front, but the next/previous photo should
// already be decoded by the time a swipe reaches it).
const LOAD_WINDOW = 1

// A pointer that never moves more than this counts as a stationary tap
// (→ toggle chrome) rather than the start of a swipe. Embla owns swipe
// commit/threshold/settle entirely on its own — this only has to catch
// "finger never really moved," same as ImageCarousel.jsx's own tap check.
const TAP_SLOP_PX = 8

// Close button — the one remaining top control (dots already show
// position, swipe already handles navigation). Floats directly over the
// photo instead of sitting in a tinted band.
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
// against any photo, however light. Anchored via `bottom: 0` rather than
// a fixed height, so the whole box (gradient included) grows upward as
// the caption wraps to more lines — the dots, as the last child, always
// sit the same fixed distance above the screen's bottom edge regardless
// of how tall the caption above them gets.
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
// as it needs. Only rendered at all when the current photo actually has
// one; the gap above handles the caption/dots spacing instead of a
// margin, so no caption means no gap either.
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
// leak" note above.
function stopTouchLeak(e) { e.stopPropagation() }

// One slide in the Embla track — mirrors ImageCarousel.jsx's Slide, plus
// its own per-photo zoom/pan wrapper (the carousel doesn't need zoom;
// the lightbox does). Only the current slide reports zoom back up and
// keeps panning enabled; every other slide's zoom is reset the instant
// it stops being current, so swiping back to it later always starts flat.
function LightboxSlide({ img, index, selectedIndex, onCurrentInfo, onCurrentZoom, onCurrentFailed, currentDisplayFailed }) {
  const isCurrent = index === selectedIndex
  const shouldLoad = !!img && Math.abs(index - selectedIndex) <= LOAD_WINDOW
  const cached = useCachedImage(shouldLoad ? img?.url : undefined)
  const transformRef = useRef(null)
  // Own local copy of this slide's zoom — needed to gate its own
  // panning (see below); also forwarded up to the parent via
  // onCurrentZoom, but only while this is the current slide, since only
  // the current slide's zoom should affect Embla's own drag gating.
  const [localScale, setLocalScale] = useState(1)

  useEffect(() => {
    if (isCurrent) onCurrentInfo({ status: cached.status, retry: cached.retry })
  }, [isCurrent, cached.status, cached.retry, onCurrentInfo])

  // Reset zoom the moment this slide stops being current — otherwise
  // swiping away and back would find the photo still zoomed in from
  // last time.
  useEffect(() => {
    if (!isCurrent) {
      transformRef.current?.resetTransform(0)
      setLocalScale(1)
    }
  }, [isCurrent])

  if (!img) return <div style={{ flex: '0 0 100%', minWidth: 0 }} />

  const hidden = isCurrent && currentDisplayFailed

  return (
    <div style={{
      position: 'relative', flex: '0 0 100%', minWidth: 0, height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {!hidden && cached.status === 'ready' && cached.src && (
        <TransformWrapper
          ref={transformRef}
          initialScale={1}
          minScale={1}
          maxScale={4}
          doubleClick={{ mode: 'toggle', step: 0.6 }}
          // Panning only matters for this slide once it's actually
          // zoomed in — left enabled at 1x, it still captures part of a
          // single-finger drag, which would corrupt the Embla-driven
          // swipe and the swipe-down-dismiss gesture below (same
          // reasoning as the original canSwipe check, now split between
          // this per-slide guard and Embla's own watchDrag).
          panning={{ disabled: !isCurrent || localScale <= 1, velocityDisabled: true }}
          onTransformed={(_ref, state) => {
            setLocalScale(state.scale)
            if (isCurrent) onCurrentZoom(state.scale)
          }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src={cached.src}
              alt={img.caption || ''}
              draggable={false}
              onError={isCurrent ? onCurrentFailed : undefined}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
            />
          </TransformComponent>
        </TransformWrapper>
      )}
    </div>
  )
}

export default function Lightbox({ images, activeIndex, onClose, onGo }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    loop: false,
    startIndex: activeIndex,
    // Ref-backed rather than closing over zoomScale directly, since this
    // option is only read by Embla at drag-attempt time, not re-created
    // on every render — the ref always reflects the latest zoom.
    watchDrag: images.length > 1 ? () => zoomScaleRef.current <= 1 : false,
  })

  const [selectedIndex, setSelectedIndex] = useState(activeIndex)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [displayFailed, setDisplayFailed] = useState(false)
  const [zoomScale, setZoomScale] = useState(1)
  const [currentCache, setCurrentCache] = useState({ status: 'loading', retry: () => {} })
  const zoomScaleRef = useRef(1)
  useEffect(() => { zoomScaleRef.current = zoomScale }, [zoomScale])

  // The parent renders this component with a plain `{open && <Lightbox />}`
  // — there's no AnimatePresence wrapping that conditional, so a normal
  // framer-motion `exit` animation would never get the chance to play; the
  // component would just vanish the instant `onClose` unmounts it. Instead,
  // closing is staged locally: fade out first, then call the real `onClose`
  // once that fade finishes.
  const [isClosing, setIsClosing] = useState(false)
  const requestClose = useCallback(() => setIsClosing(true), [])

  // True once a browser back gesture/button has already popped the
  // placeholder history entry pushed below — tells that effect's cleanup
  // not to also call history.back() itself for a close that already
  // consumed it.
  const poppedViaBrowserBackRef = useRef(null)

  // Tap-to-toggle-chrome (pointer) and swipe-down-to-dismiss (touch)
  // tracking refs — declared up here, before the early `if (!active)
  // return null` below, since hooks can't follow a conditional return.
  const pointer = useRef({ x: 0, y: 0, moved: false })
  const touchStart = useRef(null)

  // Keep selectedIndex (and the parent, via onGo) in sync with Embla's
  // own notion of the active slide — same pattern as ImageCarousel.jsx.
  // 'select' fires the instant a swipe commits, which is also the moment
  // this now tells the parent (e.g. so the carousel underneath shows the
  // same photo if the Lightbox is closed mid-swipe).
  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap()
      setSelectedIndex(i)
      onGo(i)
    }
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onGo])

  // Same settle mechanism as ImageCarousel.jsx's own override, but tuned
  // slower here: the carousel's duration(2)/friction(0.36) settles a
  // ~230ms-long swipe over the width of its card, but the lightbox's
  // photo is the full screen — the same 230ms covering a much longer
  // distance reads as a noticeably higher-velocity, snappier settle even
  // though the timing is identical. Slowing the duration down brings the
  // felt speed back in line with the carousel's.
  useEffect(() => {
    if (!emblaApi) return
    const speedUpSettle = () => {
      emblaApi.internalEngine().scrollBody.useDuration(7).useFriction(0.4)
    }
    emblaApi.on('pointerUp', speedUpSettle)
    return () => emblaApi.off('pointerUp', speedUpSettle)
  }, [emblaApi])

  const active = images[selectedIndex]
  const hasAnyCaption = images.some((img) => img.caption)

  const handleCurrentInfo = useCallback((info) => setCurrentCache(info), [])
  const handleCurrentZoom = useCallback((scale) => setZoomScale(scale), [])
  const handleRetry = useCallback(() => { setDisplayFailed(false); currentCache.retry() }, [currentCache])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Android back button/gesture guard. With no listener registered here,
  // Capacitor's default behavior sends "back" straight to the WebView's
  // own browser history — which pops the actual route underneath instead
  // of just closing this overlay. Registering a listener here takes over
  // that behavior for as long as the Lightbox is mounted: back closes the
  // Lightbox instead. No-ops on the website build.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listenerPromise = CapacitorApp.addListener('backButton', () => {
      requestClose()
    })
    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [requestClose])

  // Browser back-gesture/button guard (website/PWA only). Pushing a
  // placeholder history entry gives the Lightbox its own spot in that
  // history, so back pops the placeholder (caught below and turned into
  // a close) instead of the real route entry underneath it.
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

  // Reset failure/zoom state when the active photo changes — otherwise a
  // failed load or a leftover zoom level from the previous photo would
  // bleed into the next one.
  useEffect(() => { setDisplayFailed(false) }, [active?.url])
  useEffect(() => { setZoomScale(1) }, [active?.url])

  if (!active) return null

  // Swipe-down-to-dismiss is only meaningful at 1x — once zoomed in, a
  // single-finger drag belongs to react-zoom-pan-pinch's own panning
  // instead. (Horizontal swipe is gated the same way, but through
  // Embla's own watchDrag option above, not here.)
  const canSwipe = currentCache.status === 'ready' && !displayFailed && zoomScale <= 1

  // Tap-to-toggle-chrome — pointer tracking alongside Embla's own drag
  // handling on the same element, same coexistence pattern as
  // ImageCarousel.jsx's own tap-to-open-lightbox check.
  function onPointerDown(e) {
    pointer.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  function onPointerMove(e) {
    const p = pointer.current
    if (Math.abs(e.clientX - p.x) > TAP_SLOP_PX || Math.abs(e.clientY - p.y) > TAP_SLOP_PX) {
      p.moved = true
    }
  }
  function onPointerUp() {
    if (!pointer.current.moved) setChromeVisible((v) => !v)
  }

  // Swipe-down-to-dismiss + portal-leak propagation stop. Horizontal
  // movement is left alone here — that's Embla's job on this same
  // element — this only ever acts on a mostly-vertical release past the
  // threshold.
  function onTouchStart(e) {
    e.stopPropagation()
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  function onTouchMove(e) { e.stopPropagation() }
  function onTouchEnd(e) {
    e.stopPropagation()
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    touchStart.current = null
    if (!canSwipe) return
    if (Math.abs(dy) > Math.abs(dx) && dy > 100) {
      requestClose()
    }
  }

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
          black background. Plays its fade/scale-in exactly once, on
          mount — Embla owns every subsequent photo change from here on,
          so this never needs to re-trigger on swipe. */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: isClosing ? 0 : 1, scale: isClosing ? 0.94 : 1 }}
        transition={isClosing ? { duration: 0.18, ease: 'easeIn' } : { duration: 0.22, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
      >
        <div
          ref={emblaRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', touchAction: 'none' }}
        >
          <div style={{
            display: 'flex', height: '100%',
            // Same compositing-layer isolation as ImageCarousel.jsx's own
            // track, for the same reason (keeps a moving element's
            // repaint from bleeding into anything static around it on
            // some Android WebView builds).
            willChange: 'transform',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}>
            {images.map((img, i) => (
              <LightboxSlide
                key={img.id ?? img.url ?? i}
                img={img}
                index={i}
                selectedIndex={selectedIndex}
                onCurrentInfo={handleCurrentInfo}
                onCurrentZoom={handleCurrentZoom}
                onCurrentFailed={() => setDisplayFailed(true)}
                currentDisplayFailed={displayFailed}
              />
            ))}
          </div>

          {(currentCache.status === 'error' || displayFailed) && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <ImageLoadError onRetry={handleRetry} />
            </div>
          )}
        </div>
      </motion.div>

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

      {/* Caption + dots — unchanged from before: independent of each
          other, both anchored to the bottom of the screen so a taller
          caption never moves the dots, both on one shared gradient. */}
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
            <AnimatePresence initial={false} mode="wait">
              {active.caption && (
                <motion.p
                  key={active.url}
                  dir="auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
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
            {/* Fixed 8x8 slot per dot regardless of active state — only
                the visible circle inside scales via `transform`, so the
                row's width (and everything anchored relative to it)
                never shifts when the active index changes. */}
            {images.map((_, i) => {
              const isActive = i === selectedIndex
              return (
                <div key={i} style={{ width: 8, height: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#fff' : 'rgba(255,255,255,0.35)',
                    transform: isActive ? 'scale(1)' : 'scale(0.625)',
                    transition: 'transform 0.2s ease, background-color 0.2s ease',
                  }} />
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </motion.div>,
    document.body
  )
}
