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
 *   - Open/close: backdrop fades in/out; the photo fades and scales up
 *     from ~94% rather than just appearing.
 *   - Chrome show/hide: a plain opacity fade on each band.
 *   - Swipe left/right (at 1x zoom) navigates; swipe down (at 1x)
 *     dismisses. Both are handled by the same draggable element —
 *     dragSnapToOrigin springs the photo back to centre on a drag that
 *     doesn't clear either threshold, so no manual reset code is needed.
 *     A photo that does clear a threshold simply unmounts (new index /
 *     onClose), which is what discards its drag offset.
 *   - Backdrop stays a fixed, solid opacity throughout — it does not
 *     fade lighter during the swipe-down drag. The photo's own downward
 *     movement under the finger is the dismiss feedback.
 *
 * Zoom/pan (react-zoom-pan-pinch):
 *   Replaces the previous hand-rolled pinch/pan/double-tap finger-
 *   tracking math entirely — same category of fix as the Embla swap in
 *   ImageCarousel.jsx (a maintained library owns the actual gesture
 *   physics instead of custom touch-event math). Swipe-navigate and
 *   swipe-down-dismiss are disabled while zoomed past 1x, so panning a
 *   zoomed photo doesn't fight with them.
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

import { useState, useEffect, useCallback } from 'react'
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

  const canDrag = status === 'ready' && !displayFailed && zoomScale <= 1

  function handleDragEnd(_event, info) {
    const { offset } = info
    if (Math.abs(offset.y) > Math.abs(offset.x) && offset.y > 100) {
      requestClose()
      return
    }
    if (Math.abs(offset.x) > Math.abs(offset.y) && Math.abs(offset.x) > 60) {
      if (offset.x < 0 && activeIndex < images.length - 1) onGo(activeIndex + 1)
      if (offset.x > 0 && activeIndex > 0) onGo(activeIndex - 1)
    }
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.2 }}
      onAnimationComplete={() => { if (isClosing) onClose() }}
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active.url}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: isClosing ? 0 : 1, scale: isClosing ? 0.94 : 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            drag={canDrag}
            dragElastic={0.15}
            dragSnapToOrigin
            onDragEnd={handleDragEnd}
            onTap={() => setChromeVisible((v) => !v)}
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
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex - 1) }}
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
            onClick={(e) => { e.stopPropagation(); onGo(activeIndex + 1) }}
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
