/**
 * src/components/drugs/classes/ClassHeading.jsx
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
 *   familyCount  class only: number of real drug families (0 hides that part)
 *   drugCount    number of drugs (0 hides the heart; class line shows it)
 *   filtered     while a filter is on in the all-drugs list: { shown, total }, else null
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
  familyCount = 0,
  drugCount = 0,
  filtered = null,
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
      <p style={{
        margin:        0,
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color:         labelColor,
      }}>
        {isFamily ? 'Drug family' : 'Drug class'}
      </p>
      {onSearch ? (
        <button
          onClick={onSearch}
          aria-label={`Search Google for ${title}`}
          style={{
            ...nameStyle,
            display:    'inline-flex',
            alignItems: 'center',
            gap:        6,
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
          <span>{title}</span>
          <Search
            size={14}
            strokeWidth={2.2}
            color="var(--color-accent)"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          />
        </button>
      ) : (
        <p style={{ ...nameStyle, margin: '2px 0 0' }}>
          {title}
        </p>
      )}
      <p style={{
        margin:             '4px 0 0',
        fontSize:           13,
        fontVariantNumeric: 'tabular-nums',
        color:              'var(--color-text-secondary)',
      }}>
        {isFamily ? (
          parentName && <>in {parentName}</>
        ) : (
          <>
            {familyCount > 0 && (
              <>
                {familyCount} drug {familyCount === 1 ? 'family' : 'families'}
                {', '}
              </>
            )}
            {/* While a filter is on in the all-drugs list below: 'shown/all'. */}
            {filtered ? `${filtered.shown}/${filtered.total}` : drugCount}
            {' '}{(filtered ? filtered.total : drugCount) === 1 ? 'drug' : 'drugs'}
          </>
        )}
      </p>
    </div>
  )
}
