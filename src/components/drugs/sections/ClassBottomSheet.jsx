/**
 * src/components/drugs/sections/ClassBottomSheet.jsx
 *
 * 2026-10-03 (class sheet): the bottom sheet opened by tapping the Class row
 * in the Generic Overview card (GenericOverviewSection.jsx).
 *
 * Two views inside one sheet:
 *   1. Subclass list: every subclass that exists in the open drug's class,
 *      each with how many drugs it holds. Tapping one opens view 2.
 *   2. Drugs in that subclass: the same list as the Alternatives tab of the
 *      related drugs sheet (BrandsList.jsx in its Alternatives style: same
 *      title, filters, sort and tappable cards), with one difference: the
 *      open drug's own generic is treated like any other generic. Its brands
 *      are in the list, and it is not greyed out in the generic filter. A
 *      back arrow at the top returns to the subclass list.
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

// Groups drugs by subclass name, sorted A to Z. Drugs without a subclass are
// skipped. Pure function, no hooks, so it can be checked on its own.
function groupBySubclass(drugs) {
  const map = new Map()
  for (const d of drugs) {
    if (!d.subclass) continue
    if (!map.has(d.subclass)) map.set(d.subclass, [])
    map.get(d.subclass).push(d)
  }
  return [...map.entries()]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

const headingStyle = {
  fontSize:   15,
  lineHeight: 1.4,
  color:      'var(--color-text-secondary)',
  margin:     '0 0 var(--space-3)',
}

function SubclassRow({ name, count, onClick }) {
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
        minHeight:       52,
        padding:         '12px 14px',
        border:          '1px solid var(--color-border)',
        borderRadius:    12,
        backgroundColor: pressed ? 'var(--color-surface-muted)' : 'var(--color-surface)',
        transform:       pressed ? 'scale(0.99)' : 'scale(1)',
        transition:      'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily:      'var(--font-body)',
        fontSize:        14,
        fontWeight:      600,
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
      <ChevronRight size={16} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
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
                aria-label="Back to subclasses"
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
                Subclasses
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
                familyName={pickedGroup.name}
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
            <p style={headingStyle}>
              Subclasses of{' '}
              <strong style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{classLabel}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {groups.map(g => (
                <SubclassRow
                  key={g.name}
                  name={g.name}
                  count={g.items.length}
                  onClick={() => setPicked(g.name)}
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
