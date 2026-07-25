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
 * Renders whatever section children are passed to it; doesn't know or
 * care what those sections are (that's Phase 1's job).
 */
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
      {/* Sticky buffer strip — see the dated note above. Purely decorative,
          so it's aria-hidden and never intercepts scroll/tap. */}
      <div
        aria-hidden="true"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          height: 'var(--space-5)',
          marginBottom: 'calc(var(--space-5) * -1)',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '24px 24px 0 0',
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
