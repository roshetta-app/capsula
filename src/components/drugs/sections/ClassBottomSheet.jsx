/**
 * src/components/drugs/sections/ClassBottomSheet.jsx
 *
 * 2026-10-03 (molecule icon): the icon on the subclass cards is now a real
 * molecule icon (Material Design Icons 'molecule', copied as published, see
 * MoleculeIcon below) instead of the atom.
 *
 * 2026-10-03 (atom icon): the icon on the subclass cards is now an atom (a
 * chemical makeup) instead of the chemistry flask. The flask stays where it
 * is used for the generic filter in BrandsList.jsx.
 *
 * 2026-10-03 (Other families): families that hold only one drug are folded
 * into one 'Other families' card at the bottom of the list (grid icon, count
 * = all the drugs inside), but only when there are at least two of them and
 * at least one bigger family remains. Tapping it opens the drugs page in
 * BrandsList's groupBySubclass mode (small grey family name above each card).
 * The heading still counts the real families and all drugs. Back, filters
 * (remembered under their own key) and tapping a drug work as for any family.
 *
 * 2026-10-03 (count tag): the drug count on each subclass card is now the
 * small rounded-square tag (CountTag, the one the Related drugs sheet uses),
 * a little smaller, placed right before the chevron instead of under the
 * name. It shows the number only; the heading says how many drugs in total.
 *
 * 2026-10-03 (chemical icon back): the subclass cards have an icon tile again,
 * now a chemistry flask (a drug class is a chemical family) instead of the
 * stacked layers. Tile 34, icon and name in one row (icon centred on the
 * name), the count badge under the name lined up with the name text, the
 * chevron on the right.
 *
 * 2026-10-03 (Back bar): the subclass name beside the Back button on the
 * drugs page is gone (the drugs list already shows it as its title). The bar
 * keeps only the Back button and the thin line under it.
 *
 * 2026-10-03 (cards without icon): the subclass cards no longer have the
 * stacked-layers icon tile. The name is a little larger (15) and uses the
 * full width of the card, with the count badge under it, lined up with the
 * name, and the chevron on the right. Padding is 16 on the sides.
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
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react'
import BrandsList, { CountTag } from '../BrandsList.jsx'
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

// The 'molecule' icon from Material Design Icons (Apache 2.0), path copied
// as published in @mdi/js (mdiMolecule), not redrawn. The icon set the app
// already uses (lucide) has no molecule icon. Takes the same props the row
// passes to its icon (size, color); strokeWidth is ignored because this one
// is a filled shape.
const MOLECULE_PATH = 'M7.27,10L9,7H14.42L15.58,5L15.5,4.5A1.5,1.5 0 0,1 17,3A1.5,1.5 0 0,1 18.5,4.5C18.5,5.21 18,5.81 17.33,5.96L16.37,7.63L17.73,10L18.59,8.5L18.5,8A1.5,1.5 0 0,1 20,6.5A1.5,1.5 0 0,1 21.5,8C21.5,8.71 21,9.3 20.35,9.46L18.89,12L20.62,15C21.39,15.07 22,15.71 22,16.5A1.5,1.5 0 0,1 20.5,18A1.5,1.5 0 0,1 19,16.5V16.24L17.73,14L16.37,16.37L17.33,18.04C18,18.19 18.5,18.79 18.5,19.5A1.5,1.5 0 0,1 17,21A1.5,1.5 0 0,1 15.5,19.5L15.58,19L14.42,17H10.58L9.42,19L9.5,19.5A1.5,1.5 0 0,1 8,21A1.5,1.5 0 0,1 6.5,19.5C6.5,18.79 7,18.19 7.67,18.04L8.63,16.37L4.38,9C3.61,8.93 3,8.29 3,7.5A1.5,1.5 0 0,1 4.5,6A1.5,1.5 0 0,1 6,7.5C6,7.59 6,7.68 6,7.76L7.27,10M10.15,9L8.42,12L10.15,15H14.85L16.58,12L14.85,9H10.15Z'

function MoleculeIcon({ size = 24, color = 'currentColor' }) {
  // This icon sits a little smaller in its box than the lucide ones, so it
  // is drawn 2px larger to look the same size next to them.
  const px = size + 2
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ fill: color, flexShrink: 0 }}
    >
      <path d={MOLECULE_PATH} />
    </svg>
  )
}

// Key and label of the 'Other families' card that collects the families with
// only one drug each.
const OTHERS_KEY   = '__other_families__'
const OTHERS_LABEL = 'Other families'

// Builds the cards of the subclass list. Families with a single drug are
// collected into one 'Other families' card, put last, but only when there are
// at least two of them and at least one bigger family stays in the list (with
// fewer, the card would save nothing). Pure function, no hooks, so it can be
// checked on its own.
function buildListGroups(groups) {
  const singles = groups.filter(g => g.items.length === 1)
  const bigger  = groups.filter(g => g.items.length !== 1)
  if (singles.length < 2 || bigger.length === 0) return groups
  return [
    ...bigger,
    { name: OTHERS_KEY, items: singles.flatMap(g => g.items), isOthers: true },
  ]
}

// Size of the icon tile and the gap after it.
const ICON_TILE = 34
const ICON_GAP  = 12

function SubclassRow({ name, count, Icon = MoleculeIcon, onClick }) {
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
        padding:         '14px 16px',
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
      {/* Icon and name share one row, so the icon is centred on the name
          (all its lines). */}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: ICON_GAP }}>
        <span
          aria-hidden="true"
          style={{
            width:           ICON_TILE,
            height:          ICON_TILE,
            borderRadius:    10,
            backgroundColor: 'var(--color-accent-light)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Icon size={17} strokeWidth={1.9} color="var(--color-accent)" />
        </span>
        <span style={{
          flex:       1,
          minWidth:   0,
          fontSize:   15,
          fontWeight: 500,
          lineHeight: 1.3,
          color:      'var(--color-text-primary)',
        }}>
          {name}
        </span>
      </span>
      {/* Drug count: the same small rounded-square tag used in the Related
          drugs sheet, a little smaller, just before the chevron. */}
      <CountTag
        style={{ minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11 }}
      >
        <span aria-label={`${count} ${count === 1 ? 'drug' : 'drugs'}`}>{count}</span>
      </CountTag>
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

  // Real families (the heading counts these) and the cards shown in the list
  // (single-drug families may be folded into one 'Other families' card).
  const groups = useMemo(() => groupBySubclass(classDrugs), [classDrugs])
  const listGroups = useMemo(() => buildListGroups(groups), [groups])
  const pickedGroup = picked ? listGroups.find(g => g.name === picked) : null
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
                groupBySubclass={!!pickedGroup.isOthers}
                familyName={pickedGroup.isOthers ? OTHERS_LABEL : titleCaseWords(pickedGroup.name)}
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
              {listGroups.map(g => (
                <SubclassRow
                  key={g.name}
                  name={g.isOthers ? OTHERS_LABEL : titleCaseWords(g.name)}
                  count={g.items.length}
                  Icon={g.isOthers ? LayoutGrid : MoleculeIcon}
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
