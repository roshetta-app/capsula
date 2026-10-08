/**
 * src/components/drugs/classes/ClassHeading.jsx
 *
 * 2026-10-08 (refactor, phase 2): the fixed heading of the class sheet (small
 * 'Drug class' label, class name, family and drug count, heart), moved here
 * from ClassSheet.jsx. Same look. No behaviour change.
 *
 * Props:
 *   classLabel   the class name as shown
 *   familyCount  number of real drug families (0 hides that part)
 *   drugCount    number of drugs in the class (0 hides the heart)
 *   filtered     while a filter is on in the all-drugs list: { shown, total }, else null
 *   favourited   whether the class is saved
 *   onToggleFavourite  called when the heart is tapped
 */
import ClassHeartButton from './ClassHeartButton.jsx'

export default function ClassHeading({ classLabel, familyCount, drugCount, filtered, favourited, onToggleFavourite }) {
  return (
    <div style={{
      position:     'relative',
      flexShrink:   0,
      padding:      'var(--space-2) 56px var(--space-3) var(--space-4)',
      borderBottom: '0.5px solid var(--color-border)',
    }}>
      {drugCount > 0 && (
        <div style={{ position: 'absolute', top: 6, right: 6 }}>
          <ClassHeartButton
            label="class"
            active={favourited}
            onPress={onToggleFavourite}
          />
        </div>
      )}
      <p style={{
        margin:        0,
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color:         'var(--color-accent)',
      }}>
        Drug class
      </p>
      <p style={{
        margin:     '2px 0 0',
        fontSize:   20,
        fontWeight: 500,
        lineHeight: 1.3,
        color:      'var(--color-text-primary)',
      }}>
        {classLabel}
      </p>
      <p style={{
        margin:             '4px 0 0',
        fontSize:           13,
        fontVariantNumeric: 'tabular-nums',
        color:              'var(--color-text-secondary)',
      }}>
        {familyCount > 0 && (
          <>
            {familyCount} drug {familyCount === 1 ? 'family' : 'families'}
            {', '}
          </>
        )}
        {/* While a filter is on in the all-drugs list below: 'shown/all'. */}
        {filtered ? `${filtered.shown}/${filtered.total}` : drugCount}
        {' '}{(filtered ? filtered.total : drugCount) === 1 ? 'drug' : 'drugs'}
      </p>
    </div>
  )
}
