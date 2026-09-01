/**
 * ImageLoadError.jsx — Image System Refinement Plan, Part A.
 *
 * Placeholder shown when a gallery photo genuinely can't be displayed
 * (offline with nothing saved on-device, or a real fetch failure).
 * Replaces the browser's default broken-image icon. Driven by
 * useCachedImage's 'error' status; used by both ImageCarousel.jsx (main
 * photo) and Lightbox.jsx (full-screen view).
 *
 * Every color here is a CSS variable token (var(--color-...)), the same
 * convention used across the rest of the image components — those tokens
 * already resolve differently under light/dark mode, so no separate
 * light/dark branching is needed in this file itself.
 *
 * Props:
 *   onRetry  () => void  — re-attempts the load (pass useCachedImage's retry)
 *   compact  boolean     — smaller icon/text for tighter spaces (e.g. a
 *                          thumbnail strip); defaults to the full-size
 *                          layout used in the main carousel/lightbox
 */
import { ImageOff, RotateCcw } from 'lucide-react'

export default function ImageLoadError({ onRetry, compact = false }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? 6 : 10,
        backgroundColor: 'var(--color-bg)',
        color: 'var(--color-text-secondary)',
        padding: 'var(--space-3)',
      }}
    >
      <ImageOff
        size={compact ? 20 : 32}
        strokeWidth={1.75}
        color="var(--color-text-tertiary)"
      />
      <span style={{
        fontSize: compact ? 11 : 13,
        fontFamily: 'var(--font-body)',
        textAlign: 'center',
      }}>
        Couldn't load this image
      </span>
      <button
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: compact ? 11 : 13,
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          color: 'var(--color-accent)',
          background: 'none',
          border: 'none',
          padding: '4px 8px',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <RotateCcw size={compact ? 12 : 14} strokeWidth={2} />
        Retry
      </button>
    </div>
  )
}
