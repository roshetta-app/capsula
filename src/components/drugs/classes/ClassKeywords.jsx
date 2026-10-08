/**
 * src/components/drugs/classes/ClassKeywords.jsx
 *
 * 2026-10-08 (refactor, phase 2): the 'Keywords' title and chips of the class
 * sheet, moved here from ClassSheet.jsx (it was the function buildWordsBlock).
 * Same look. Whether the chips are open lives in the sheet (open / onToggle),
 * because the sheet folds them again on every page change.
 *
 * Props:
 *   words         the keyword texts, already sorted
 *   open          true shows every word, false only the first few and a '+N' chip
 *   onToggle      called when the '+N' / 'Show less' chip is tapped
 *   marginBottom  space left under the block
 *   showTitle     false leaves out the small 'Keywords' title
 */
import { visibleCount } from './KeywordChips.jsx'
import { capFirst } from './classGrouping.js'

export default function ClassKeywords({ words, open, onToggle, marginBottom, showTitle = true, tone = 'accent' }) {
  const isClass = tone === 'class'
  const chipColor = isClass ? 'var(--color-class)' : 'var(--color-accent)'
  const chipTint  = isClass ? 'var(--color-class-light)' : 'var(--color-accent-light)'
  if (words.length === 0) return null
  const limit  = visibleCount(words)
  const shown  = open ? words : words.slice(0, limit)
  const hidden = words.length - limit
  return (
    <div style={{
      flexShrink:    0,
      display:       'flex',
      flexDirection: 'column',
      gap:           'var(--space-2)',
      marginBottom,
    }}>
      {showTitle && (
        <p style={{
          flexShrink:  0,
          margin:      '0 var(--space-1)',
          fontSize:    14.5,
          fontWeight:  600,
          color:       'var(--color-text-primary)',
        }}>
          Keywords
        </p>
      )}
      <div style={{
        flexShrink: 0,
        display:    'flex',
        flexWrap:   'wrap',
        gap:        6,
        margin:     0,
      }}>
        {shown.map(w => (
          <span key={w} style={{
            padding:         '3px 9px',
            borderRadius:    999,
            fontSize:        12,
            lineHeight:      1.3,
            color:           chipColor,
            backgroundColor: chipTint,
          }}>
            {capFirst(w)}
          </span>
        ))}
        {hidden > 0 && (
          <button
            onClick={() => onToggle()}
            aria-label={open ? 'Show fewer words' : `Show ${hidden} more words`}
            aria-expanded={open}
            style={{
              padding:         '3px 9px',
              border:          'none',
              borderRadius:    999,
              fontFamily:      'var(--font-body)',
              fontSize:        12,
              lineHeight:      1.3,
              color:           'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface-muted)',
              cursor:          'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:         'none',
            }}
          >
            {open ? 'Show less' : `+${hidden}`}
          </button>
        )}
      </div>
    </div>
  )
}
