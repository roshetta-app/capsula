/**
 * src/components/drugs/classes/ClassFamilyList.jsx
 *
 * 2026-10-08 (refactor, phase 2): the scrolling list of the class sheet (the
 * class words, the 'All drugs in this class' row, and one card per drug
 * family), moved here from ClassSheet.jsx. Same look. No behaviour change.
 *
 * Props:
 *   listRef      ref of the scroll box (the sheet remembers its scroll position)
 *   wordsBlock   the class keywords block to draw at the top, or null
 *   totalDrugs   number of drugs in the class
 *   listGroups   the cards to show (families, maybe with an 'Other families' card)
 *   onPick       called with a group name (or the all-drugs key) when a card is tapped
 */
import { LayoutGrid, List } from 'lucide-react'
import ClassCard from './ClassCard.jsx'
import { MoleculeIcon } from './ClassIcons.jsx'
import { ALL_KEY } from './classKeys.js'
import { ALL_LABEL, OTHERS_LABEL } from './classGrouping.js'
import { titleCaseWords } from '../../../utils/classSearch'

export default function ClassFamilyList({ listRef, wordsBlock, totalDrugs, listGroups, onPick }) {
  return (
    <div ref={listRef} style={{
      flex:          1,
      minHeight:     0,
      overflowY:     'auto',
      display:       'flex',
      flexDirection: 'column',
      gap:           'var(--space-2)',
      padding:       'var(--space-3) var(--space-4) var(--space-6)',
    }}>
      {wordsBlock}
      {totalDrugs > 0 && (
        <ClassCard
          key={ALL_KEY}
          name={ALL_LABEL}
          count={totalDrugs}
          Icon={List}
          featured
          onClick={() => onPick(ALL_KEY)}
        />
      )}
      {/* Thin line under the 'All drugs' row, only when subclass
          cards follow it. */}
      {totalDrugs > 0 && listGroups.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            flexShrink:      0,
            height:          0.5,
            margin:          'var(--space-2) var(--space-1)',
            backgroundColor: 'var(--color-border)',
          }}
        />
      )}
      {/* Small title over the subclass cards, so it is clear they
          are the families of the class. */}
      {totalDrugs > 0 && listGroups.length > 0 && (
        <p style={{
          flexShrink:    0,
          margin:        '0 var(--space-1)',
          fontSize:      14.5,
          fontWeight:    600,
          color:         'var(--color-text-primary)',
        }}>
          Drug families
        </p>
      )}
      {listGroups.map(g => (
        <ClassCard
          key={g.name}
          name={g.isOthers ? OTHERS_LABEL : titleCaseWords(g.name)}
          count={g.items.length}
          Icon={g.isOthers ? LayoutGrid : MoleculeIcon}
          onClick={() => onPick(g.name)}
        />
      ))}
    </div>
  )
}
