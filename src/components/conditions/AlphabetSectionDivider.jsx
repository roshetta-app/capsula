/**
 * src/components/conditions/AlphabetSectionDivider.jsx
 *
 * Single-letter alphabetical section header.
 * Renders between condition groups in the list.
 * Does NOT render when search is active or when a specialty filter is active
 * — the calling screen conditionally omits it.
 *
 * Props:
 *   letter  string  — 'A', 'B', ..., 'Z', or '#' for non-alpha
 */
export default function AlphabetSectionDivider({ letter }) {
  return (
    <div
      aria-label={`Section ${letter}`}
      style={{
        fontSize:        11,
        fontWeight:      500,
        color:           'var(--color-text-tertiary)',
        textTransform:   'uppercase',
        letterSpacing:   '0.06em',
        padding:         '8px 0 4px',
        backgroundColor: 'var(--color-bg)',
        // No border, no background change — matches the mockup exactly
      }}
    >
      {letter}
    </div>
  )
}
