/**
 * src/components/drugs/classes/FamilyDrugsView.jsx
 *
 * 2026-10-08 (refactor, phase 2): the drugs page of the class sheet (one
 * family, 'Other families', or all drugs of the class), moved here from
 * ClassSheet.jsx. It draws, from top to bottom: a heading (the class heading
 * on the all-drugs page of a class opened straight on it, or the family heading
 * on a real family's page), the plain Back bar (only on the 'All drugs' and
 * 'Other families' pages reached from the list), and the scrolling drug list.
 *
 * 2026-10-08 (shared header): the family name bar and its heart are gone; a real
 * family's page now gets the family heading from ClassSheet (with its own Back
 * arrow and heart). Props directSubclass, familyKey, favourited and
 * onToggleFavourite were removed because nothing here uses them any more.
 *
 * Props:
 *   pickedGroup       { name, items, isOthers?, isAll? } the page to show
 *   heading           the heading element to draw on top, or null
 *   showBar           whether the plain Back bar is drawn
 *   onBack            Back arrow of that bar: return to the family list
 *   wordsBlock        class keywords drawn above the list (all-drugs page), or null
 *   familyBlock       family keywords drawn under the family title, or null
 *   hideHeading       true on the all-drugs page (the class heading is above)
 *   classLabel        class name as shown
 *   onTap             called with a brand when one is tapped
 *   saved, onSave     the remembered filter picks of this page
 *   popupLayer        where the filter pop-ups are drawn
 */
import { ChevronLeft, LayoutGrid, List } from 'lucide-react'
import BrandsList from '../brands/BrandsList.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { OTHERS_LABEL } from './classGrouping.js'
import { titleCaseWords } from '../../../utils/classSearch'

export default function FamilyDrugsView({
  pickedGroup,
  heading,
  showBar,
  onBack,
  wordsBlock,
  familyBlock,
  hideHeading,
  classLabel,
  onTap,
  saved,
  onSave,
  popupLayer,
}) {
  return (
    <>
      {heading}
      {/* Plain Back row, only for the 'All drugs' and 'Other families' pages
          reached from the family list. */}
      {showBar && <div style={{
        flexShrink:   0,
        padding:      '0 var(--space-2) 0 var(--space-4)',
        borderBottom: '0.5px solid var(--color-border)',
        display:      'flex',
        alignItems:   'center',
      }}>
        <button
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
        </button>
      </div>}
      <div key={`drugs-${pickedGroup.name}`} style={{
        flex:      1,
        minHeight: 0,
        overflowY: 'auto',
        padding:   'var(--space-3) var(--space-4) var(--space-6)',
      }}>
        {wordsBlock}
        <BrandsList
          hideHeading={hideHeading}
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
