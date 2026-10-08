/**
 * src/components/drugs/classes/ClassHeading.jsx
 *
 * 2026-10-08 (icon tile): the Class / Family badge is gone. The same icon tile
 * as the class and family cards (Layers violet, molecule blue) sits at the left
 * of the title, which sits beside it.
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
import { ChevronLeft, Search, Layers } from 'lucide-react'
import { ClassIconTile } from './ClassCard.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
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
  const words    = String(title ?? '').split(' ')
  const lastWord = words.pop()
  const head     = words.length ? words.join(' ') + ' ' : ''

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
        {/* The same icon tile as the class / family cards: stacked layers
            (violet) for a class, molecule (blue) for a family. */}
        <ClassIconTile Icon={isFamily ? MoleculeIcon : Layers} tone={isFamily ? 'accent' : 'class'} />
        <div style={{ minWidth: 0, flex: 1 }}>
          {onSearch ? (
            <button
              onClick={onSearch}
              aria-label={`Search Google for ${title}`}
              style={{
                ...nameStyle,
                display:    'block',
                maxWidth:   '100%',
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
              {head}
              <span style={{ whiteSpace: 'nowrap' }}>
                {lastWord}
                <Search
                  size={11}
                  strokeWidth={2.2}
                  color="var(--color-accent)"
                  aria-hidden="true"
                  style={{ display: 'inline-block', marginLeft: 3, verticalAlign: 'top' }}
                />
              </span>
            </button>
          ) : (
            <p style={{ ...nameStyle, margin: 0 }}>{title}</p>
          )}
          {isFamily && parentName && (
            <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
              in {parentName}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
