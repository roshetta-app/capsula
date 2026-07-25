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
 * the shared page root all use the exact same surface tone now, which
 * removes the rounded-corner color mismatch this file's header used to
 * have — but also means nothing separated the header from the sheet
 * anymore. Added a soft shadow along this sheet's top edge so it still
 * reads as a distinct panel sitting above the header, reusing the same
 * shadow value ConditionDetailScreen's own header already uses
 * (`0 2px 6px rgba(0,0,0,0.05)`), just flipped to a negative vertical
 * offset so it projects upward from this element's top edge instead of
 * downward from a header's bottom edge.
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
