/**
 * src/components/drugs/sections/ClassBottomSheet.jsx
 *
 * 2026-10-03 (refined look): the subclass list has a real heading (the class
 * name, larger) with a small grey line under it, '<n> drug groups' ('1 drug
 * group' for one). The old sentence title is gone. Option rows lost their box
 * and border: they sit flat on the sheet with a thin line between them, a
 * slightly larger name, the count tag and a grey arrow, and a soft tint when
 * pressed. Order is unchanged (biggest group first).
 *
 * 2026-10-03 (class sheet): the bottom sheet opened by tapping the Class row
 * in the Generic Overview card (GenericOverviewSection.jsx).
 *
 * Two views inside one sheet:
 *   1. Subclass list: every subclass that exists in the open drug's class,
 *      each with how many drugs it holds, biggest group first (A to Z only
 *      between groups of the same size). Every word of a subclass name
 *      starts with a capital letter. The title reads 'Subclass <class> drug
 *      groups'. Tapping one opens view 2.
 *   2. Drugs in that subclass: the same list as the Alternatives tab of the
 *      related drugs sheet (BrandsList.jsx in its Alternatives style: same
 *      title, filters, sort and tappable cards), with one difference: the
 *      open drug's own generic is treated like any other generic. Its brands
 *      are in the list, and it is not greyed out in the generic filter. A
 *      Back button at the top returns to the subclass list.
 *
 * Tapping a drug closes the sheet and hands the drug to onSelectBrand, which
 * opens that drug's page with the same back-button rule as the Alternatives
 * tab. Tapping the drug that is already open just closes the sheet.
 *
 * The phone's Back button closes the whole sheet (same as every other sheet);
 * only the arrow inside the sheet goes back one view. The sheet always opens
 * on the subclass list. Picks made in the filters of a subclass are kept
 * while the person stays on the same drug page, per subclass, same as the
 * related drugs sheet.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   classLabel    string: the class name shown in the heading
 *   classDrugs    array: every brand in the class that has a subclass
 *   currentDrug   flat drug object of the open page
 *   onSelectBrand (item) => void: called after this sheet closes
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BrandsList, { CountTag } from '../BrandsList.jsx'
import SheetShell from '../../ui/SheetShell'

// Makes every word start with a capital letter, including the words after a
// plus sign, slash, bracket or hyphen. Only the first letter of each word is
// touched, so names that are already capitalised ('ACE', 'SGLT2') stay as
// they are. Pure function, no hooks, so it can be checked on its own.
function titleCaseWords(text) {
  return (text ?? '').replace(/(^|[\s+/(-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// Groups drugs by subclass name, biggest group first; groups of the same size
// go A to Z. Drugs without a subclass are skipped. Pure function, no hooks,
// so it can be checked on its own.
function groupBySubclass(drugs) {
  const map = new Map()
  for (const d of drugs) {
    if (!d.subclass) continue
    if (!map.has(d.subclass)) map.set(d.subclass, [])
    map.get(d.subclass).push(d)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name))
}

function SubclassRow({ name, count, onClick, isLast }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        display:         'flex',
        alignItems:      'center',
        gap:             12,
        width:           '100%',
        boxSizing:       'border-box',
        minHeight:       48,
        padding:         '10px 4px',
        border:          'none',
        borderBottom:    isLast ? 'none' : '0.5px solid var(--color-border)',
        borderRadius:    pressed ? 10 : 0,
        backgroundColor: pressed ? 'var(--color-accent-light)' : 'transparent',
        transition:      'background-color var(--motion-fast) var(--ease-settle)',
        fontFamily:      'var(--font-body)',
        fontSize:        15,
        fontWeight:      500,
        lineHeight:      1.4,
        textAlign:       'left',
        color:           'var(--color-text-primary)',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>{name}</span>
      <CountTag tone="neutral">{count}</CountTag>
      <ChevronRight size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

export default function ClassBottomSheet({
  isOpen,
  onClose,
  classLabel,
  classDrugs = [],
  currentDrug = null,
  onSelectBrand,
}) {
  // The subclass whose drugs are showing, or null for the subclass list.
  const [picked, setPicked] = useState(null)
  // Remembered filter picks, one entry per subclass (a ref: only read when a
  // list is built, no re-render needed).
  const savedFilters = useRef({})
  // Where the filter pop-ups are drawn (the full-sheet layer at the end).
  const [popupLayer, setPopupLayer] = useState(null)

  // Each time the sheet opens, start on the subclass list.
  useEffect(() => {
    if (isOpen) setPicked(null)
  }, [isOpen])

  const groups = useMemo(() => groupBySubclass(classDrugs), [classDrugs])
  const pickedGroup = picked ? groups.find(g => g.name === picked) : null

  function handleTap(item) {
    onClose()
    // The drug that is already open: nothing to navigate to.
    if (currentDrug && item.id === currentDrug.id) return
    onSelectBrand?.(item)
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Drug class" maxHeight="80svh">
      {/* Same fixed-height frame as the related drugs sheet, so the sheet
          does not grow or shrink between the two views. 40px is the drag
          handle's own space in SheetShell. */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        height:        'calc(80svh - 40px - env(safe-area-inset-bottom, 0px))',
        minHeight:     0,
      }}>
        {pickedGroup ? (
          <>
            <div style={{ padding: '0 var(--space-4)' }}>
              <button
                onClick={() => setPicked(null)}
                aria-label="Back"
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        2,
                  height:     44,
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
            </div>
            <div style={{
              flex:      1,
              minHeight: 0,
              overflowY: 'auto',
              padding:   'var(--space-2) var(--space-4) var(--space-6)',
            }}>
              <BrandsList
                key={pickedGroup.name}
                siblings={pickedGroup.items}
                onTap={handleTap}
                mode="alternatives"
                familyName={titleCaseWords(pickedGroup.name)}
                saved={savedFilters.current[pickedGroup.name] ?? null}
                onSave={p => { savedFilters.current[pickedGroup.name] = p }}
                popupLayer={popupLayer}
              />
            </div>
          </>
        ) : (
          <div style={{
            flex:      1,
            minHeight: 0,
            overflowY: 'auto',
            padding:   'var(--space-2) var(--space-4) var(--space-6)',
          }}>
            <p style={{
              margin:     0,
              fontSize:   20,
              fontWeight: 500,
              lineHeight: 1.3,
              color:      'var(--color-text-primary)',
            }}>
              {classLabel}
            </p>
            <p style={{
              margin:   '2px 0 var(--space-3)',
              fontSize: 13,
              color:    'var(--color-text-secondary)',
            }}>
              {groups.length} drug {groups.length === 1 ? 'group' : 'groups'}
            </p>
            <div style={{ borderTop: '0.5px solid var(--color-border)' }}>
              {groups.map((g, i) => (
                <SubclassRow
                  key={g.name}
                  name={titleCaseWords(g.name)}
                  count={g.items.length}
                  onClick={() => setPicked(g.name)}
                  isLast={i === groups.length - 1}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Pop-up layer: covers the whole sheet and lets touches through until
          a filter pop-up is drawn into it. */}
      <div
        ref={setPopupLayer}
        style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
      />
    </SheetShell>
  )
}