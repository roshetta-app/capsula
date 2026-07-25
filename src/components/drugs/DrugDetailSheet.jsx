import { forwardRef } from 'react'

/**
 * DrugDetailSheet — the white, rounded content panel for the drug detail
 * screen. Scrolls independently of the fixed colored header above it
 * (DrugHeader.jsx) — this is the flex: 1; overflow-y: auto half of the
 * measured-height/single-scroll-box mechanic; the root/height-measuring
 * half lives in DrugDetailScreen.jsx, wired up separately.
 *
 * Written fresh for this screen per plan decision 4.2 — same end mechanic
 * as ConditionDetailScreen.jsx's internal scroll box, not copied/adapted
 * from it.
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
        borderRadius: '18px 18px 0 0',
      }}
    >
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
