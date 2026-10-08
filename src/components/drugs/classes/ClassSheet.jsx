/**
 * src/components/drugs/classes/ClassSheet.jsx
 *
 * 2026-10-08 (refactor, phase 2): the sheet is split into smaller files, no
 * behaviour change. The pure helpers are in classGrouping.js, the heading in
 * ClassHeading.jsx, the keyword chips in ClassKeywords.jsx, the family cards
 * in ClassCard.jsx (was SubclassRow here), the family list in ClassFamilyList.jsx
 * and the drugs page in FamilyDrugsView.jsx. This file keeps the state (which
 * page is open, scroll memory, remembered filters, keyword fold) and picks the
 * page to show.
 *
 * 2026-10-08 (refactor, phase 1): renamed from ClassBottomSheet and moved
 *   from sections/ to drugs/classes/. MoleculeIcon is now in ClassIcons.jsx and
 *   ALL_KEY in classKeys.js. No behaviour change.
 *
 * 2026-10-08 (shared header): a real family's page now has the same heading as
 * the class sheet (label, name, 'in <class>', heart in the same corner, Back
 * arrow when a list is behind it). The old thin Back bar and the repeated family
 * title above the filters are gone on those pages; the Google search icon moved
 * into the heading. 'All drugs' and 'Other families' pages keep the Back bar.
 *
 * 2026-10-08 (favourite classes and families): a heart in the class heading saves
 * the whole class; a heart in the bar above a family's drugs saves that family.
 * When the sheet is opened straight on a family (from Favourites) that bar shows
 * the family name instead of Back. Saved items show in the Favourites screen.
 *
 * 2026-10-06 (icon before the family title): the title on a family's page has the
 * same icon as its card on the list, at 17px (molecule; grid for 'Other families', list for
 * 'All drugs in this class').
 *
 * 2026-10-06 (keywords fit two lines): the class and family keyword chips no
 * longer stop at 6 words. They show as many as fit in about two lines, counted
 * by letters (long words take more room), then the '+N' chip. Shared with
 * KeywordChips (visibleCount).
 *
 * 2026-10-06 (no keywords on the family cards): the grey keyword line under
 * the family name on the family cards of the class sheet is removed. The class
 * words at the top of the sheet and the chips on a family's own drugs page are
 * unchanged.
 *
 * 2026-10-05 (family keywords on the family page): when a family's drugs page
 * is open (from the family list, or straight from a family card in Class
 * search), the words that point at that family are shown right under the
 * family title, above the filter buttons, as the same chips as the class sheet
 * (first 6, '+N' chip to show all, 'Show less' to fold) but without the small
 * 'Keywords' title (the class sheet keeps its title). Display only. A family with no words looks as before, and the
 * 'Other families' page and the 'All drugs' page show none. The chips block
 * is now one shared helper used for the class words and the family words.
 * The chips fold again whenever the page changes (list to family and back).
 * The title slot is a new optional prop of BrandsList (belowHeading).
 *
 * 2026-10-05 (quieter All drugs row): the icon and the count on the 'All drugs
 * in this class' row no longer sit on their own tinted badge (blue on the
 * blue card looked heavy). Both now sit straight on the card: the blue icon in
 * the same 34 space as the family cards' icons (so the names line up), and the
 * count as a plain blue number, and the chevron is blue too. The family cards keep their grey tag and
 * tinted icon tile.
 *
 * 2026-10-05 (class keywords on the sheet): the common words (keywords, the
 * ones Class search uses, like 'vomiting') are now shown on the subclass list.
 * Display only, nothing happens when a word is tapped.
 *  - Words that point at the whole class are small chips at the top of the
 *    content, under a small 'Keywords' title, the same place for every
 *    class: above the 'All drugs' row of the family list, or above the drugs of
 *    a class with no families. The space above and below the block is equal
 *    (12 on the list, 16 on the drugs page). Up to 6 are shown, then a '+N' chip for the rest. Tapping '+N' shows them all
 *    and a 'Show less' chip folds them back. Opening the sheet starts folded.
 *    The fixed heading is unchanged.
 *  - Words that point at one family are one quiet grey line under the family's
 *    name on its card, cut with '...' when too long.
 *  - A class with no families (it opens straight on its drugs from the Browse
 *    cards and Class search) now has the same look as a class with families:
 *    the same heading (class name and '<n> drugs', no '0 drug families'),
 *    no Back bar (the phone's Back button still closes the sheet), and no
 *    repeated class name with the search icon above the drugs (BrandsList's
 *    hideHeading). Classes with families, and a family's own drugs page,
 *    are unchanged.
 *  - The 'Other families' card and the 'All drugs in this class' row show no
 *    words. A class or family with no words looks exactly as before.
 *  - The words come from the app's shared data (useDrugContext, classKeywords),
 *    so no screen that opens this sheet had to change. Names are matched
 *    exactly as stored, like the class sheet's own grouping.
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
 * the related drugs sheet (SimilarAlternativesSheet.jsx).
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
 * 2026-10-04 (quieter blue): on the 'All drugs' row, the icon badge and the
 * count badge are no longer solid bright blue with white inside. Both are now
 * a soft, see-through tint of the app blue with the blue icon / number on it,
 * so they sit calmly on the row. The drug family rows are unchanged.
 *
 * 2026-10-04 (families title): the 'Drug families' title over the family cards
 * is bigger (14.5), black (main text colour) and no longer all capitals: it
 * reads 'Drug families' with a capital D only.
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
import SheetShell from '../../ui/SheetShell'
import { useBackLayer } from '../../../hooks/useBackClose'
import { useDrugContext } from '../../../context/DrugContext'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import ClassHeading from './ClassHeading.jsx'
import ClassKeywords from './ClassKeywords.jsx'
import ClassFamilyList from './ClassFamilyList.jsx'
import FamilyDrugsView from './FamilyDrugsView.jsx'
import { groupBySubclass, buildListGroups, splitKeywords } from './classGrouping.js'
import { ALL_KEY } from './classKeys.js'
import { titleCaseWords } from '../../../utils/classSearch'
import { openInAppBrowser } from '../../../utils/openInAppBrowser'

export default function ClassSheet({
  isOpen,
  onClose,
  classLabel,
  classDrugs = [],
  currentDrug = null,
  onSelectBrand,
  directSubclass: directSubclassProp = null,
}) {
  // A class with no families (no drug in it has a subclass) has no list to
  // choose from, so it opens straight on all its drugs, whichever screen
  // opened the sheet (2026-10-07). A subclass asked for by name still wins.
  const hasNoFamilies = classDrugs.length > 0 && !classDrugs.some(d => d.subclass)
  const directSubclass = directSubclassProp ?? (hasNoFamilies ? ALL_KEY : null)
  // The subclass whose drugs are showing, or null for the subclass list.
  const [picked, setPicked] = useState(directSubclass ?? null)
  // Remembered filter picks, one entry per subclass (a ref: only read when a
  // list is built, no re-render needed).
  const savedFilters = useRef({})
  // The subclass list's scroll box, and how far it was scrolled when a family
  // was opened, so going back lands where the person left off, not at the top.
  const listRef         = useRef(null)
  const savedListScroll = useRef(0)
  // Whether every class word is shown, or only the first few and a '+N' chip.
  const [wordsOpen, setWordsOpen] = useState(false)
  // Where the filter pop-ups are drawn (the full-sheet layer at the end).
  const [popupLayer, setPopupLayer] = useState(null)

  // The chips start folded on every page: opening a family, or coming back to
  // the list, folds them again.
  useEffect(() => {
    setWordsOpen(false)
  }, [picked])

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
      setWordsOpen(false)
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
  // The class name as stored (the keywords point at it by this exact name).
  const className = classDrugs[0]?.class ?? classLabel
  // Hearts: save the whole class, or the family whose drugs page is open.
  const { isClassFavourited, toggleClass } = useFavouritesContext()
  const { classKeywords } = useDrugContext()
  const { classWords, familyWords } = useMemo(
    () => splitKeywords(classKeywords, className),
    [classKeywords, className]
  )
  // The words of the family whose drugs page is open: only a real family (not
  // the 'Other families' page, not the 'All drugs' page).
  const pickedFamilyWords = pickedGroup && !pickedGroup.isOthers && !pickedGroup.isAll
    ? (familyWords.get(pickedGroup.name) ?? [])
    : []

  // The real family whose drugs page is open (not 'Other families', not 'All drugs').
  const familyKey = pickedGroup && !pickedGroup.isOthers && !pickedGroup.isAll ? pickedGroup.name : null

  // Opening a family from the list: remember the list's scroll first.
  function pickFamily(name) {
    savedListScroll.current = listRef.current?.scrollTop ?? 0
    setPicked(name)
  }

  // Fixed heading: the same for every class, with or without families. It stays
  // put while the list scrolls under it.
  const straightToAll = directSubclass === ALL_KEY
  const heading = (
    <ClassHeading
      title={classLabel}
      drugCount={totalDrugs}
      favourited={isClassFavourited(className, '')}
      onToggleFavourite={() => toggleClass(className, '')}
    />
  )

  // The heading of a real family's page: same look as the class heading. A Back
  // arrow only when the list is behind it (not when opened straight on the
  // family). The name is a button that opens the Google search for it.
  const familyHeading = familyKey ? (
    <ClassHeading
      kind="family"
      title={titleCaseWords(familyKey)}
      parentName={classLabel}
      drugCount={pickedGroup.items.length}
      favourited={isClassFavourited(className, familyKey)}
      onToggleFavourite={() => toggleClass(className, familyKey)}
      onBack={directSubclass ? null : () => setPicked(null)}
      onSearch={() => openInAppBrowser(
        `https://www.google.com/search?q=${encodeURIComponent(titleCaseWords(familyKey))}`
      )}
    />
  ) : null

  // The 'Keywords' title and chips (display only), or null when the class
  // has none. Drawn at the top of the content for every class: above the 'All
  // drugs' row of the family list, or above the drugs of a class with no
  // families.
  // A class with no families, opened straight on its drugs: no Back bar, no
  // repeated class name above the drugs, the same heading as every class.

  // The class words block. The list above it has 12 of space over the first
  // thing in it and 8 between rows, so 4 more under the block makes the space
  // above and below equal (12). On the drugs page (16 above) it is 16 below.
  const wordsBlock = totalDrugs > 0 && classWords.length > 0
    ? <ClassKeywords
        words={classWords}
        open={wordsOpen}
        onToggle={() => setWordsOpen(o => !o)}
        marginBottom={straightToAll ? 'var(--space-4)' : 'var(--space-1)'}
      />
    : null

  // The family words block, drawn under the family title on the drugs page of
  // a family, as chips alone (no 'Keywords' title). 12 under it matches the 12
  // the title leaves above it.
  const familyBlock = pickedFamilyWords.length > 0
    ? <ClassKeywords
        words={pickedFamilyWords}
        open={wordsOpen}
        onToggle={() => setWordsOpen(o => !o)}
        marginBottom="var(--space-3)"
        showTitle={false}
      />
    : null

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
          <FamilyDrugsView
            pickedGroup={pickedGroup}
            heading={straightToAll ? heading : familyHeading}
            showBar={!straightToAll && !familyKey && !directSubclass}
            onBack={() => setPicked(null)}
            wordsBlock={straightToAll ? wordsBlock : null}
            familyBlock={familyBlock}
            hideHeading={straightToAll || !!familyKey}
            classLabel={classLabel}
            onTap={handleTap}
            saved={savedFilters.current[pickedGroup.name] ?? null}
            onSave={p => { savedFilters.current[pickedGroup.name] = p }}
            popupLayer={popupLayer}
          />
        ) : (
          <>
            {heading}
            <ClassFamilyList
              key="class-list"
              listRef={listRef}
              wordsBlock={wordsBlock}
              totalDrugs={totalDrugs}
              listGroups={listGroups}
              onPick={pickFamily}
            />
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

