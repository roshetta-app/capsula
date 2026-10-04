/**
 * src/components/drugs/home/DrugsSectionCard.jsx
 * 2026-10-04 (Drugs screen: Search and Browse as two equal areas): the one look
 * both areas share, so they read as equals. Soft white card (the same card
 * look as the Drugs header above it: surface colour, 16px corners, same soft
 * shadow), a title row with the title on the left and an optional control on
 * the right, then the area's content under it.
 *
 *   label     the area's name for screen readers ('Search', 'Browse')
 *   title     what is drawn at the left of the title row (the Search area's
 *             title with its info icon, or the Browse area's title with its
 *             Category / Class switch inside)
 *   trailing  optional control at the right end of the title row
 *   children  the area's content, under the title row
 *
 * The title text style is exported (SECTION_TITLE_STYLE) so the pieces of both
 * titles (the word 'Search', the words 'Browse by', and the switch words) match
 * exactly.
 */

export const SECTION_TITLE_STYLE = {
  fontSize:   16,
  fontWeight: 700,
  lineHeight: 1.2,
  color:      'var(--color-text-primary)',
  fontFamily: 'var(--font-body)',
}

export default function DrugsSectionCard({ label, title, trailing = null, children }) {
  return (
    <section
      aria-label={label}
      style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius:    16,
        padding:         '14px 14px',
        marginBottom:    'var(--space-4)',
        boxShadow:       '0 4px 16px rgba(0, 0, 0, 0.045)',
      }}
    >
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            'var(--space-2)',
        minHeight:      34,
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {title}
        </div>
        {trailing}
      </div>
      {children}
    </section>
  )
}
