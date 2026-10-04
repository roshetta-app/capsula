/**
 * src/components/drugs/sections/ClassBottomSheet.jsx
 *
 * 2026-10-04 (molecule icon from a library): the molecule icon on the subclass
 * cards (here and in the Drugs screen search results, which import it from this
 * file) is now the thin 'molecule-light' icon from the Lets Icons set, loaded from
 * the packages @iconify-icons/lets-icons and @iconify/react (offline build, no
 * network calls), instead of a hand-copied Fluent path. Lets Icons is licensed
 * CC BY 4.0, which requires credit: 'Lets Icons by Leonid Tsvetkov, CC BY 4.0,
 * https://creativecommons.org/licenses/by/4.0/'. Name and props of MoleculeIcon
 * are unchanged, so no other file needs to change.
 *
 * 2026-10-04 (count tag colour, open at top): two small fixes.
 *  - The number on the 'All drugs in this class' row now gets the blue look: a
 *    solid blue tag with white text, matching the solid blue icon tile on the
 *    same row. (The soft blue tag would vanish on the soft blue card.) The
 *    subclass cards keep their grey tag.
 *  - Opening the 'All drugs' row or any subclass card always starts at the top
 *    of its list. Before, the scrolling area was reused between the subclass
 *    list and the drugs list, so a list scrolled down made the drugs open part
 *    way down. Each view now gets its own scrolling area.
 *
 * 2026-10-04 (Drug families title): a small grey title 'Drug families' now sits
 * under the line, above the subclass cards. It is only drawn when subclass
 * cards follow, same as the line.
 *
 * 2026-10-04 (All drugs row look): the 'All drugs in this class' row is now
 * drawn differently from the subclass cards: a soft blue card, a solid blue
 * icon tile with a white icon, and a bold blue name. A thin line with some air
 * sits under it, before the subclass cards. A class with no subclasses shows
 * only that row, so no line is drawn then. Tapping and counts are unchanged.
 *
 * 2026-10-04 (Class search mode): three changes.
 *  - A first row 'All drugs in this class' now sits above the subclass cards. It
 *    opens every brand in the class (brands with a class but no subclass
 *    included) as one plain list, and its number is the same one the class card
 *    in the Drugs search shows. The heading's drug total is now every brand in
 *    the class too. A class with no subclasses shows only that row.
 *  - New optional prop 'directSubclass': the sheet opens straight on the drugs
 *    of that one subclass (used by the subclass cards in Class search). The
 *    Back button and the phone's Back button then close the sheet, since there
 *    is no subclass list to go back to. The subclass is looked up among the
 *    real subclasses, so a one-drug subclass folded into 'Other families' still
 *    opens.
 *  - The capitalisation helper now lives in utils/classSearch.js so the search
 *    cards and this sheet write names the same way. No visible change.
 *  - The molecule icon is now exported so the subclass cards in Class search
 *    draw the same icon. No visible change.
 * The order of the subclass cards (biggest first) and the 'Other families'
 * folding are unchanged: they still work on the brands that have a subclass.
 *
 * 2026-10-04 (Class search mode, screen wiring): 'directSubclass' can also be
 * the 'All drugs in this class' row (ALL_KEY, now exported), which the Drugs
 * screen uses for a class that has no subclasses, so a class card with
 * nothing to choose from opens straight on its drugs. The sheet also starts on
 * the asked-for view from its very first draw (the starting view is read when
 * the sheet is created, not only after it opens), so a subclass card never
 * flashes the subclass list for a moment first. The Drugs screen creates a
 * fresh sheet for every opening.
 *
 * 2026-10-03 (taller sheet): the sheet height went from 80svh to 86svh, same as
 * the related drugs sheet (BrandsBottomSheet.jsx).
 *
 * 2026-10-03 (molecule icon): the icon on the subclass cards is now a real
 * molecule icon (Fluent System Icons 'molecule', outline, copied as
 * published, see MoleculeIcon below) instead of the atom. A first try with the
 * Material Design molecule was dropped (look).
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
 * 2026-10-04 (scroll kept): going back from a family's drug list to the subclass
 * list used to start the list at the top, because the list is drawn fresh each
 * time. The list's scroll position is now saved when a family is opened and put
 * back on return.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   classLabel    string: the class name shown in the heading
 *   classDrugs    array: every brand in the class (with or without a subclass)
 *   currentDrug   flat drug object of the open page
 *   onSelectBrand (item) => void: called after this sheet closes
 *   directSubclass string|null: open straight on this subclass's drugs
 */

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import BrandsList from '../BrandsList.jsx'
import CountTag from '../../ui/CountTag.jsx'
import SheetShell from '../../ui/SheetShell'
import { useBackLayer } from '../../../hooks/useBackClose'
import { titleCaseWords } from '../../../utils/classSearch'
// Lets Icons (CC BY 4.0, credit in the note at the top of this file).
import { Icon as IconifyIcon } from '@iconify/react/dist/offline'
import moleculeLight from '@iconify-icons/lets-icons/molecule-light'

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

// The molecule icon (thin outline) from the Lets Icons set, through the
// offline Iconify component. Takes the same props the row passes to its icon
// (size, color); strokeWidth is ignored, the line weight is part of the icon.
export function MoleculeIcon({ size = 24, color = 'currentColor' }) {
  return <IconifyIcon icon={moleculeLight} width={size} height={size} color={color} />
}

// Key and label of the 'Other families' card that collects the families with
// only one drug each.
const OTHERS_KEY   = '__other_families__'
const OTHERS_LABEL = 'Other families'

// Key and label of the first row, which opens every brand in the class.
// Exported so the Drugs screen can open the sheet straight on it.
export const ALL_KEY = '__all_class_drugs__'
const ALL_LABEL = 'All drugs in this class'

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

function SubclassRow({ name, count, Icon = MoleculeIcon, onClick, featured = false }) {
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
        backgroundColor: featured ? 'var(--color-accent-light)' : 'var(--color-surface-muted)',
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
            backgroundColor: featured ? 'var(--color-accent)' : 'var(--color-accent-light)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Icon size={17} strokeWidth={1.9} color={featured ? '#fff' : 'var(--color-accent)'} />
        </span>
        <span style={{
          flex:       1,
          minWidth:   0,
          fontSize:   15,
          fontWeight: featured ? 600 : 500,
          lineHeight: 1.3,
          color:      featured ? 'var(--color-accent)' : 'var(--color-text-primary)',
        }}>
          {name}
        </span>
      </span>
      {/* Drug count: the same small rounded-square tag used in the Related
          drugs sheet, a little smaller, just before the chevron. */}
      <CountTag
        style={{
          minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6, fontSize: 11,
          ...(featured ? { backgroundColor: 'var(--color-accent)', color: '#fff' } : null),
        }}
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
  directSubclass = null,
}) {
  // The subclass whose drugs are showing, or null for the subclass list.
  const [picked, setPicked] = useState(directSubclass ?? null)
  // Remembered filter picks, one entry per subclass (a ref: only read when a
  // list is built, no re-render needed).
  const savedFilters = useRef({})
  // The subclass list's scroll box, and how far it was scrolled when a family
  // was opened, so going back lands where the person left off, not at the top.
  const listRef         = useRef(null)
  const savedListScroll = useRef(0)
  // Where the filter pop-ups are drawn (the full-sheet layer at the end).
  const [popupLayer, setPopupLayer] = useState(null)

  // Phone/browser Back on the drugs page goes back to the subclass list (the
  // sheet stays open). On the list it closes the sheet as usual. This adds no
  // history step of its own (see useBackLayer in useBackClose.js).
  // When the sheet was opened straight on one subclass (directSubclass) there
  // is no list to go back to, so Back just closes the sheet as usual.
  useBackLayer(isOpen && picked !== null && !directSubclass, () => setPicked(null))

  // Each time the sheet opens, start on the subclass list (or, when a
  // subclass was asked for, straight on its drugs).
  useEffect(() => {
    if (isOpen) {
      savedListScroll.current = 0
      setPicked(directSubclass ?? null)
    }
  }, [isOpen, directSubclass])

  // Coming back to the subclass list (Back arrow, phone Back): the list is
  // drawn fresh each time, so put it back where it was before the family was
  // opened. Runs before the screen paints, so there is no visible jump.
  useLayoutEffect(() => {
    if (picked === null && listRef.current) {
      listRef.current.scrollTop = savedListScroll.current
    }
  }, [picked])

  // Real families (the heading counts these) and the cards shown in the list
  // (single-drug families may be folded into one 'Other families' card).
  const groups = useMemo(() => groupBySubclass(classDrugs), [classDrugs])
  const listGroups = useMemo(() => buildListGroups(groups), [groups])
  // The picked card: the 'All drugs' row, a card of the list, or (for a
  // subclass asked for by name) a real subclass even when the list folded it
  // into 'Other families'.
  const pickedGroup = !picked
    ? null
    : picked === ALL_KEY
      ? { name: ALL_KEY, items: classDrugs, isAll: true }
      : (listGroups.find(g => g.name === picked) ?? groups.find(g => g.name === picked) ?? null)
  // Every brand in the class, with or without a subclass.
  const totalDrugs = classDrugs.length

  // Opening a family from the list: remember the list's scroll first.
  function pickFamily(name) {
    savedListScroll.current = listRef.current?.scrollTop ?? 0
    setPicked(name)
  }

  function handleTap(item) {
    onClose()
    // The drug that is already open: nothing to navigate to.
    if (currentDrug && item.id === currentDrug.id) return
    onSelectBrand?.(item)
  }

  return (
    <SheetShell isOpen={isOpen} onClose={onClose} ariaLabel="Drug class" maxHeight="86svh">
      {/* Same fixed-height frame as the related drugs sheet, so the sheet
          does not grow or shrink between the two views. 40px is the drag
          handle's own space in SheetShell. */}
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        height:        'calc(86svh - 40px - env(safe-area-inset-bottom, 0px))',
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
                onClick={() => (directSubclass ? onClose() : setPicked(null))}
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
            <div key={`drugs-${pickedGroup.name}`} style={{
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
                familyName={
                  pickedGroup.isOthers ? OTHERS_LABEL
                    : pickedGroup.isAll ? titleCaseWords(classLabel)
                    : titleCaseWords(pickedGroup.name)
                }
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
                {groups.length > 0 && (
                  <>
                    {groups.length} drug {groups.length === 1 ? 'family' : 'families'}
                    {', '}
                  </>
                )}
                {totalDrugs} {totalDrugs === 1 ? 'drug' : 'drugs'}
              </p>
            </div>
            <div key="class-list" ref={listRef} style={{
              flex:          1,
              minHeight:     0,
              overflowY:     'auto',
              display:       'flex',
              flexDirection: 'column',
              gap:           'var(--space-2)',
              padding:       'var(--space-3) var(--space-4) var(--space-6)',
            }}>
              {totalDrugs > 0 && (
                <SubclassRow
                  key={ALL_KEY}
                  name={ALL_LABEL}
                  count={totalDrugs}
                  Icon={List}
                  featured
                  onClick={() => pickFamily(ALL_KEY)}
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
                  fontSize:      11,
                  fontWeight:    600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color:         'var(--color-text-secondary)',
                }}>
                  Drug families
                </p>
              )}
              {listGroups.map(g => (
                <SubclassRow
                  key={g.name}
                  name={g.isOthers ? OTHERS_LABEL : titleCaseWords(g.name)}
                  count={g.items.length}
                  Icon={g.isOthers ? LayoutGrid : MoleculeIcon}
                  onClick={() => pickFamily(g.name)}
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