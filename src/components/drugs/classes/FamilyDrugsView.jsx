/**
 * src/components/drugs/classes/FamilyDrugsView.jsx
 *
 * 2026-10-08 (refactor, phase 2): the drugs page of the class sheet (one
 * family, 'Other families', or all drugs of the class), moved here from
 * ClassSheet.jsx. It draws, from top to bottom: the class heading (only when
 * the sheet opened straight on all drugs), the Back / family-name bar with the
 * family heart, and the scrolling drug list. Same look. No behaviour change.
 *
 * Props:
 *   pickedGroup       { name, items, isOthers?, isAll? } the page to show
 *   heading           the class heading element, or null
 *   showBar           whether the Back / family-name bar is drawn
 *   directSubclass    set when the sheet opened straight on one page (no Back arrow)
 *   familyKey         name of the real family shown, or null
 *   onBack            Back arrow: return to the family list
 *   favourited        whether this family is saved
 *   onToggleFavourite called when the family heart is tapped
 *   wordsBlock        class keywords drawn above the list (all-drugs page), or null
 *   familyBlock       family keywords drawn under the family title, or null
 *   hideHeading       true on the all-drugs page (the class heading is above)
 *   onFilteredCount   reports 'shown / total' while a filter is on (all-drugs page)
 *   classLabel        class name as shown
 *   onTap             called with a brand when one is tapped
 *   saved, onSave     the remembered filter picks of this page
 *   popupLayer        where the filter pop-ups are drawn
 */
import { ChevronLeft, LayoutGrid, List } from 'lucide-react'
import BrandsList from '../brands/BrandsList.jsx'
import ClassHeartButton from './ClassHeartButton.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { OTHERS_LABEL } from './classGrouping.js'
import { titleCaseWords } from '../../../utils/classSearch'

export default function FamilyDrugsView({
  pickedGroup,
  heading,
  showBar,
  directSubclass,
  familyKey,
  onBack,
  favourited,
  onToggleFavourite,
  wordsBlock,
  familyBlock,
  hideHeading,
  onFilteredCount,
  classLabel,
  onTap,
  saved,
  onSave,
  popupLayer,
}) {
  return (
    <>
      {heading}
      {/* No Back row when the sheet was opened straight on a drug list
          (all drugs, or one named family): there is no list behind it to
          go back to, so it would only close the sheet. */}
      {showBar && <div style={{
        flexShrink:     0,
        padding:        '0 var(--space-2) 0 var(--space-4)',
        borderBottom:   '0.5px solid var(--color-border)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            'var(--space-2)',
      }}>
        {directSubclass ? (
          <span style={{
            minWidth: 0, fontSize: 15, fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            {titleCaseWords(familyKey)}
          </span>
        ) : <button
          onClick={onBack}
          aria-label="Back"
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        2,
            flexShrink: 0,
            height:     48,
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
        </button>}
        {familyKey && (
          <ClassHeartButton
            label="family"
            active={favourited}
            onPress={onToggleFavourite}
          />
        )}
      </div>}
      <div key={`drugs-${pickedGroup.name}`} style={{
        flex:      1,
        minHeight: 0,
        overflowY: 'auto',
        padding:   'var(--space-4) var(--space-4) var(--space-6)',
      }}>
        {wordsBlock}
        <BrandsList
          hideHeading={hideHeading}
          onFilteredCount={onFilteredCount}
          belowHeading={familyBlock}
          titleIcon={
            pickedGroup.isOthers ? <LayoutGrid size={17} strokeWidth={1.9} color="var(--color-accent)" />
              : pickedGroup.isAll ? <List size={17} strokeWidth={1.9} color="var(--color-accent)" />
              : <MoleculeIcon size={17} color="var(--color-accent)" />
          }
          key={pickedGroup.name}
          siblings={pickedGroup.items}
          onTap={onTap}
          mode="alternatives"
          proGateForm
          hideOther
          groupBySubclass={!!pickedGroup.isOthers}
          familyName={
            pickedGroup.isOthers ? OTHERS_LABEL
              : pickedGroup.isAll ? titleCaseWords(classLabel)
              : titleCaseWords(pickedGroup.name)
          }
          saved={saved}
          onSave={onSave}
          popupLayer={popupLayer}
        />
      </div>
    </>
  )
}
