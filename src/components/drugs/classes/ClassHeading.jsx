/**
 * src/components/drugs/classes/ClassHeading.jsx
 *
 * 2026-10-08 (compact): the icon tile is smaller (26) and sits inside the name's
 * text, and the name is 17px, so a long name wraps under the icon and the heading
 * stays short.
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
    fontSize:   17,
    fontWeight: 500,
    lineHeight: 1.3,
    color:      'var(--color-text-primary)',
  }

  return (
    <div style={{
      position:     'relative',
      flexShrink:   0,
      // 56 on the right keeps the name clear of the heart, but only when the
      // heart sits beside the name. With a Back arrow the heart is up in the
      // Back row, so the name gets the full width.
      // No Back arrow: the heart is beside the name, so the top is 18, which puts the
      // heart's own top edge level with the top of the name's icon tile.
      padding:      `${onBack ? 'var(--space-2)' : '18px'} ${onBack ? 'var(--space-4)' : '56px'} var(--space-2) var(--space-4)`,
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
      {/* The small icon tile sits inside the name's text, so a long name
          wraps under it instead of making the heading tall and narrow. */}
      {/* Title row: at least as tall as the heart's row, name centred in it,
          so the heart (always the same corner spot) lines up with the name.
          With a Back arrow above, the heart lines up with the Back row. */}
      <div style={{ display: 'flex', alignItems: 'center', minHeight: 0 }}>
      {(() => {
        const tile = (
          <span style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 8, position: 'relative', top: -1 }}>
            <ClassIconTile size={26} Icon={isFamily ? MoleculeIcon : Layers} tone={isFamily ? 'accent' : 'class'} />
          </span>
        )
        return onSearch ? (
          <button
            onClick={onSearch}
            aria-label={`Search Google for ${title}`}
            style={{
              ...nameStyle,
              display:    'block',
              maxWidth:   '100%',
              margin:     0,
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
            {tile}{head}
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
          <p style={{ ...nameStyle, margin: 0 }}>{tile}{title}</p>
        )
      })()}
      </div>
      {isFamily && parentName && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          in {parentName}
        </p>
      )}
    </div>
  )
}
