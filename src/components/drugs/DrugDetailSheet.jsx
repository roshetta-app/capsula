import { forwardRef } from 'react'

/**
 * DrugDetailSheet — the white, rounded content panel for the drug detail
 * screen. Scrolls independently of the fixed header above it
 * (DrugHeader.jsx) — this is the flex: 1; overflow-y: auto half of the
 * measured-height/single-scroll-box mechanic; the root/height-measuring
 * half lives in DrugDetailScreen.jsx, wired up separately.
 *
 * Written fresh for this screen per plan decision 4.2 — same end mechanic
 * as ConditionDetailScreen.jsx's internal scroll box, not copied/adapted
 * from it.
 *
 * 2026-07-25 (header/root color fix, session 12): header, this sheet, and
 * the shared page root briefly all used the exact same surface tone, which
 * removed a rounded-corner color mismatch — but also meant nothing
 * separated the header from the sheet, relying only on a shadow that
 * barely showed in dark mode. Superseded in session 14: header and root
 * went back to the app's plain page tone, while this sheet keeps its own
 * separate surface tone — see DrugHeader.jsx's and DrugDetailScreen.jsx's
 * own session 14 notes. This sheet's own styling didn't need to change;
 * it already used the surface tone and already had this top shadow.
 *
 * 2026-07-25 (session 13): top corner roundedness increased 18px → 24px.
 * Also added a sticky buffer strip — a plain rectangle, same background as
 * the sheet, pinned to the top of this scroll box with `position: sticky`.
 * It sits above the scrolling content (`zIndex: 1`) and is pulled up over
 * that content by a negative margin equal to its own height, so it takes
 * no extra layout space of its own; content now disappears underneath it
 * as it scrolls up, instead of running flush against the rounded top edge.
 * `pointerEvents: 'none'` so it never blocks scroll/tap. New pattern for
 * this app — not copied from ConditionDetailScreen or elsewhere.
 *
 * 2026-07-25 (session 16): tried a `mask-image` on this whole element to
 * fade the top — same technique DrugHeader.jsx uses for its horizontal
 * edge-fades. Wrong scope: masking the whole element faded the sheet's own
 * border-radius/shadow/corner along with the content, which wasn't the
 * intent. Reverted same session — see next note.
 *
 * 2026-07-25 (session 16, corrected): back to a separate small strip
 * element (as in session 13), but now *that strip itself* uses a true
 * `mask-image` fade instead of a solid-to-transparent background-color
 * gradient. The strip is still a plain `--color-surface` rectangle, pinned
 * to the top of the scroll box and pulled up over the content by a
 * negative margin so it adds no extra space — same mechanic as session 13
 * — but its own opacity now fades smoothly via mask-image (single linear
 * ramp, no early solid plateau) rather than a 3-stop color gradient that
 * held solid too long and then cut off too fast. The sheet itself
 * (background/border-radius/shadow) is untouched and fully solid again.
 *
 * 2026-07-25 (session 18): the fade previously started from the strip's
 * very first pixel, so text could still peek through faintly right at the
 * sheet's own top edge. Mask now holds fully opaque for the strip's first
 * half (a real cap — nothing shows through there at all), then fades
 * smoothly to transparent across the second half.
 *
 * Renders whatever section children are passed to it; doesn't know or
 * care what those sections are (that's Phase 1's job).
 */
const STRIP_HEIGHT = 40 // px — height of the fading buffer strip

const DrugDetailSheet = forwardRef(function DrugDetailSheet({ children }, ref) {
  return (
    <div
      ref={ref}
      style={{
        flex: 1,
        minHeight: 0, // lets this flex child actually shrink and scroll instead of pushing its parent taller
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -2px 6px rgba(0,0,0,0.05)',
      }}
    >
      {/* Sticky fade strip — see the dated note above. Purely decorative,
          so it's aria-hidden and never intercepts scroll/tap. Its own
          opacity fades via mask-image (a true fade), not its color. */}
      <div
        aria-hidden="true"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          height: `${STRIP_HEIGHT}px`,
          marginBottom: `-${STRIP_HEIGHT}px`,
          backgroundColor: 'var(--color-surface)',
          // Fully opaque for the first half (a real cap — nothing shows
          // through at all right at the sheet's own top edge), then a
          // smooth, continuous fade to transparent for the second half.
          // The earlier version faded from the very first pixel, so text
          // could still peek through faintly right at the top.
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          maskImage:       'linear-gradient(to bottom, black 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          padding: 'var(--space-5) var(--space-6)',
        }}
      >
        {children}
      </div>
    </div>
  )
})

export default DrugDetailSheet
