/**
 * src/components/drugs/classes/ClassHeading.jsx
 *
 * 2026-10-08 (no counts, badges): the 'x families, y drugs' line is gone. The
 * 'Drug class' / 'Drug family' labels are replaced by a small Class / Family
 * badge in front of the name. The search icon (family) sits small and raised
 * right after the last word of the name.
 *
 * 2026-10-08 (shared header): this is now the one fixed heading for BOTH the
 * class sheet and a family page, so they look alike. A small label in the
 * kind's colour (violet 'Drug class', blue 'Drug family'), the name, and a grey
 * line under it. The heart always sits in the same top-right spot. A family
 * page also gets an optional Back arrow (same row as the heart) and an
 * optional small search icon after the name, which opens the Google search for
 * the family name (it used to be the title line above the drug filters).
 * Props renamed: classLabel is now title.
 *
 * 2026-10-08 (refactor, phase 2): the fixed heading of the class sheet (small
 * 'Drug class' label, class name, family and drug count, heart), moved here
 * from ClassSheet.jsx. Same look. No behaviour change.
 *
 * Props:
 *   kind         'class' (default) or 'family'
 *   title        the name as shown
 *   parentName   family only: the class the family belongs to ('in <class>')
 *   drugCount    number of drugs (0 hides the heart; no count is shown)
 *   favourited   whether it is saved
 *   onToggleFavourite  called when the heart is tapped
 *   onBack       when set, a Back arrow is drawn in the top row
 *   onSearch     when set, the name is a button with a small search icon
 */
import { ChevronLeft, Search } from 'lucide-react'
import ClassHeartButton from './ClassHeartButton.jsx'

export default function ClassHeading({
  kind = 'class',
  title,
  parentName = null,
  drugCount = 0,
  favourited,
  onToggleFavourite,
  onBack = null,
  onSearch = null,
}) {
  const isFamily  = kind === 'family'
  const labelColor = isFamily ? 'var(--color-accent)' : 'var(--color-class)'

  const nameStyle = {
    fontSize:   20,
    fontWeight: 500,
    lineHeight: 1.3,
    color:      'var(--color-text-primary)',
  }

  return (
    <div style={{
      position:     'relative',
      flexShrink:   0,
      padding:      'var(--space-2) 56px var(--space-3) var(--space-4)',
      borderBottom: '0.5px solid var(--color-border)',
    }}>
      {/* The heart: same corner on every heading. */}
      {drugCount > 0 && (
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <ClassHeartButton
            label={isFamily ? 'family' : 'class'}
            active={favourited}
            onPress={onToggleFavourite}
          />
        </div>
      )}
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        2,
            height:     40,
            padding:    0,
            border:     'none',
            background: 'none',
            cursor:     'pointer',
            fontFamily: 'var(--font-body)',
            fontSize:   14,
            fontWeight: 600,
            color:      'var(--color-accent)',
            WebkitTapHighlightColor: 'transparent',
            outline:    'none',
          }}
        >
          <ChevronLeft size={18} />
          Back
        </button>
      )}
      {(() => {
        // The name with its badge in front. The last word and the small raised
        // search icon are kept together so the icon never lands on its own line.
        const words    = String(title ?? '').split(' ')
        const lastWord = words.pop()
        const head     = words.length ? words.join(' ') + ' ' : ''
        const badge = (
          <span style={{
            display:       'inline-block',
            marginRight:   8,
            padding:       '1px 7px',
            borderRadius:  999,
            border:        `0.5px solid ${labelColor}`,
            color:         labelColor,
            fontSize:      10.5,
            fontWeight:    600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            lineHeight:    1.5,
            verticalAlign: 'middle',
            position:      'relative',
            top:           -1,
          }}>
            {isFamily ? 'Family' : 'Class'}
          </span>
        )
        const nameText = (
          <>
            {head}
            <span style={{ whiteSpace: 'nowrap' }}>
              {lastWord}
              {onSearch && (
                <Search
                  size={12}
                  strokeWidth={2.4}
                  color="var(--color-accent)"
                  aria-hidden="true"
                  style={{
                    marginLeft:    2,
                    verticalAlign: 'top',
                    position:      'relative',
                    top:           2,
                  }}
                />
              )}
            </span>
          </>
        )
        return onSearch ? (
          <button
            onClick={onSearch}
            aria-label={`Search Google for ${title}`}
            style={{
              ...nameStyle,
              display:    'block',
              maxWidth:   '100%',
              margin:     '2px 0 0',
              padding:    0,
              border:     'none',
              background: 'none',
              textAlign:  'left',
              fontFamily: 'var(--font-body)',
              cursor:     'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:    'none',
            }}
          >
            {badge}{nameText}
          </button>
        ) : (
          <p style={{ ...nameStyle, margin: '2px 0 0' }}>
            {badge}{nameText}
          </p>
        )
      })()}
      {isFamily && parentName && (
        <p style={{
          margin:   '4px 0 0',
          fontSize: 13,
          color:    'var(--color-text-secondary)',
        }}>
          in {parentName}
        </p>
      )}
    </div>
  )
}
