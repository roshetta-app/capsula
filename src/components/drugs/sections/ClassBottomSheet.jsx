/**
 * src/components/drugs/sections/ClassBottomSheet.jsx
 *
 * 2026-10-03 (design refinement): the heading now has a small 'Drug class'
 * label above the class name, and the grey line under it also gives the total
 * number of drugs ('4 drug families, 38 drugs'). On the drugs page the Back
 * button now sits in a fixed top bar with the subclass name beside it and a
 * thin line under it, the same as the heading on the list, so the two pages
 * feel like one sheet. Cards got a slightly taller tap area and a little more
 * air above the count badge. Order, tapping and the drugs page contents are
 * unchanged.
 *
 * 2026-10-03 (icon, smaller text, icon on the name): the card icon is now a
 * stacked-layers icon (a family of drugs) instead of a pill. Name text is 14
 * (was 15) and the count badge 10.5 (was 11). The icon tile (32) sits in a row
 * with the name only, centred on the name however many lines it has, and the
 * count badge sits below, lined up under the name text.
 *
 * 2026-10-03 (card refinement): the blue circle with an arrow on the right is
 * now a plain soft grey chevron, so the pill icon tile is the only blue thing
 * on the card and the eye goes name first. Corners are a little rounder (16),
 * padding is an even 14 all round, the name has a tighter line gap for the
 * long multi-line names, the count badge has a bit more air above it and its
 * numbers are the same width (so a column of counts lines up).
 *
 * 2026-10-03 (drug families): the grey line under the class name now reads
 * '<n> drug families' ('1 drug family' for one) instead of 'drug groups'.
 *
 * 2026-10-03 (drugs page title): the title above the drugs of a subclass no
 * longer starts with 'Other'. It reads '<subclass> drugs' (BrandsList hideOther).
 *
 * 2026-10-03 (icons and count badge): each subclass card now starts with a
 * small rounded tile holding a pill icon, and the number of drugs sits under
 * the name as a subtle badge (a soft pill, same blue family as the arrow
 * circle but fainter) instead of plain grey text. Order, tapping and the
 * drugs page are unchanged.
 *
 * 2026-10-03 (refined look): the subclass list has a real heading (the class
 * name, larger) with a small grey line under it, '<n> drug groups' ('1 drug
 * group' for one). The old sentence title is gone. The heading is fixed at
 * the top of the sheet with a thin line under it; only the groups scroll.
 * Each group is a soft rounded card (no border) with the name, the number of
 * drugs in words under it ('12 drugs', '1 drug') and a small blue circle with
 * an arrow on the right. Order is unchanged (biggest group first). Cards
 * never shrink (flexShrink 0): in the scrolling column they were squeezed
 * down to their minimum height, which cut into the padding when a name
 * wrapped or the list was long. Padding is an even 14 (16 on the left).
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
 * 2026-10-03 (Back button): on the drugs page the phone's Back button now
 * goes back to the subclass list instead of closing the sheet (useBackLayer).
 * On the list it closes the sheet like every other sheet. Swiping down or
 * tapping outside still closes the whole sheet from either page.
 *
 * (Older note, now only true for the subclass list:) The phone's Back button
 * closes the whole sheet (same as every other sheet);
 * the arrow inside the sheet also goes back one view. The sheet always opens
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
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import BrandsList from '../BrandsList.jsx'
import SheetShell from '../../ui/SheetShell'
import { useBackLayer } from '../../../hooks/useBackClose'

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

// Size of the icon tile and the gap after it. The count badge is indented by
// the same amount so it lines up under the name.
const ICON_TILE = 32
const ICON_GAP  = 10

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
        gap:             10,
        width:           '100%',
        boxSizing:       'border-box',
        flexShrink:      0,
        minHeight:       56,
        padding:         '14px 14px',
        border:          'none',
        borderRadius:    16,
        backgroundColor: 'var(--color-surface-muted)',
        opacity:         pressed ? 0.8 : 1,
        transform:       pressed ? 'scale(0.985)' : 'scale(1)',
        transition:      'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
        fontFamily:      'var(--font-body)',
        textAlign:       'left',
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:         'none',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        {/* Icon and name share one row, so the icon is centred on the name
            (all its lines) and not on the count badge underneath. */}
        <span style={{ display: 'flex', alignItems: 'center', gap: ICON_GAP }}>
          <span
            aria-hidden="true"
            style={{
              width:           ICON_TILE,
              height:          ICON_TILE,
              borderRadius:    9,
              backgroundColor: 'var(--color-accent-light)',
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}
          >
            <Layers size={16} color="var(--color-accent)" />
          </span>
          <span style={{
            flex:       1,
            minWidth:   0,
            fontSize:   14,
            fontWeight: 500,
            lineHeight: 1.3,
            color:      'var(--color-text-primary)',
          }}>
            {name}
          </span>
        </span>
        {/* Count badge: lines up under the name text, not under the icon. */}
        <span style={{
          display:            'inline-block',
          marginTop:          7,
          marginLeft:         ICON_TILE + ICON_GAP,
          padding:            '2px 8px',
          borderRadius:       999,
          backgroundColor:    'var(--color-surface)',
          border:             '0.5px solid var(--color-border)',
          fontSize:           10.5,
          fontWeight:         500,
          lineHeight:         1.5,
          fontVariantNumeric: 'tabular-nums',
          color:              'var(--color-text-secondary)',
        }}>
          {count} {count === 1 ? 'drug' : 'drugs'}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        size={16}
        strokeWidth={2}
        color="var(--color-text-tertiary)"
        style={{ flexShrink: 0 }}
      />
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

  // Phone/browser Back on the drugs page goes back to the subclass list (the
  // sheet stays open). On the list it closes the sheet as usual. This adds no
  // history step of its own (see useBackLayer in useBackClose.js).
  useBackLayer(isOpen && picked !== null, () => setPicked(null))

  // Each time the sheet opens, start on the subclass list.
  useEffect(() => {
    if (isOpen) setPicked(null)
  }, [isOpen])

  const groups = useMemo(() => groupBySubclass(classDrugs), [classDrugs])
  const pickedGroup = picked ? groups.find(g => g.name === picked) : null
  const totalDrugs = groups.reduce((sum, g) => sum + g.items.length, 0)

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
            <div style={{
              flexShrink:   0,
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-3)',
              padding:      '0 var(--space-4)',
              borderBottom: '0.5px solid var(--color-border)',
            }}>
              <button
                onClick={() => setPicked(null)}
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
              <span style={{
                flex:         1,
                minWidth:     0,
                textAlign:    'right',
                fontSize:     12.5,
                color:        'var(--color-text-secondary)',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap',
              }}>
                {titleCaseWords(pickedGroup.name)}
              </span>
            </div>
            <div style={{
              flex:      1,
              minHeight: 0,
              overflowY: 'auto',
              padding:   'var(--space-4) var(--space-4) var(--space-6)',
            }}>
              <BrandsList
                key={pickedGroup.name}
                siblings={pickedGroup.items}
                onTap={handleTap}
                mode="alternatives"
                hideOther
                familyName={titleCaseWords(pickedGroup.name)}
                saved={savedFilters.current[pickedGroup.name] ?? null}
                onSave={p => { savedFilters.current[pickedGroup.name] = p }}
                popupLayer={popupLayer}
              />
            </div>
          </>
        ) : (
          <>
            {/* Fixed heading: stays put while the groups scroll under it. */}
            <div style={{
              flexShrink:   0,
              padding:      'var(--space-2) var(--space-4) var(--space-3)',
              borderBottom: '0.5px solid var(--color-border)',
            }}>
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
                {groups.length} drug {groups.length === 1 ? 'family' : 'families'}
                {', '}
                {totalDrugs} {totalDrugs === 1 ? 'drug' : 'drugs'}
              </p>
            </div>
            <div style={{
              flex:          1,
              minHeight:     0,
              overflowY:     'auto',
              display:       'flex',
              flexDirection: 'column',
              gap:           'var(--space-2)',
              padding:       'var(--space-3) var(--space-4) var(--space-6)',
            }}>
              {groups.map(g => (
                <SubclassRow
                  key={g.name}
                  name={titleCaseWords(g.name)}
                  count={g.items.length}
                  onClick={() => setPicked(g.name)}
                />
              ))}
            </div>
          </>
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
