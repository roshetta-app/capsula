/**
 * src/components/drugs/brands/BrandsList.jsx
 *
 * 2026-10-08 (refactor, phase 1): moved from drugs/ to drugs/brands/. No code change.
 *
 * 2026-10-06 (bigger family title): the heading above the filters ('Other <name>
 * drugs', family name in bold) is 18px instead of 15px, on the class sheet's family
 * page and on both Related drugs tabs, so they stay the same size when swiping.
 *
 * 2026-10-06 (titleIcon): new optional prop titleIcon (default null). A small icon
 * drawn before the title; the class sheet passes the same icon the family card has.
 *
 * 2026-10-05 (belowHeading): new optional prop belowHeading (default null). A
 * piece of screen drawn right under the title and above the filter buttons.
 * The class sheet uses it to show a family's keywords under the family title.
 * With the prop off (every other screen) nothing changes.
 *
 * 2026-10-05 (Other generics): the Filter by generic pop-up folds the generics
 * that have only one brand into one 'Other generics' row, which unfolds inside
 * the pop-up (FilterModal.jsx) so each of them can still be picked on its own.
 * The rule (at least 4 such generics and at least one bigger generic) lives in
 * brandsFilterLogic.js. Picks are still kept one generic at a time, so the
 * pill text, remembered filters, Clear filter and the list work as before.
 *
 * 2026-10-05 (hideHeading): new optional prop hideHeading (default false).
 * With it on, the title above the filters (the name with the Google search
 * icon) is not drawn. Used by the class sheet for a class with no families,
 * so the class name is not repeated under the sheet heading. With the prop
 * off (every other screen) nothing changes.
 *
 * 2026-10-04 (search mode and sort on the Drugs screen): the Drugs screen now
 * uses this file's pop-up (FilterModal), pill button (PillButton) and Sort
 * button (SortButton) for its own Search Mode and Sort By controls, so those
 * three are exported. Two small additions, both off by default so the brand
 * list, brand sheet and class sheet look and behave exactly as before:
 * FilterModal gets an 'onPage' option (the pop-up is then drawn over the whole
 * screen, above the bottom bar, locks the page scroll, and Back closes just the
 * pop-up, the same way ConfirmSheet works on a page instead of inside a
 * sheet), and PillButton gets a 'fit' option (shrinks to its text instead of
 * stretching).
 *
 * 2026-10-04 (long lists): the plain drug list (not the 'Other families' page)
 * no longer draws every row at once. It draws the first 30 and adds 30 more
 * each time the person scrolls near the end (GradualList below). Opening a
 * subclass or a class with thousands of brands (for example 'All drugs in this
 * class' for Antibiotics) used to build thousands of cards in one go, which
 * made the app freeze and lag. Lists of 30 or fewer look and behave exactly as
 * before. Changing the sort or a filter starts the list again from the top 30.
 * Order, counts, filters, the 'you are here' card and the card look are
 * unchanged.
 *
 * 2026-10-03 (Other families): new optional prop groupBySubclass (default
 * false), used by the class sheet for its 'Other families' page, which holds
 * the drugs of several families that have only one drug each. With it on:
 * the title is just the bold familyName (no 'drugs', no Google search icon);
 * each family is one soft rounded card (same tint and corners as the class
 * sheet's family cards) with the family name on top, a hairline under it, and
 * the family's drug card(s) inside, so the name and its drug read as one
 * block; the order is family A to Z, then drug name (the Sort option reads
 * 'Family (A-Z)'; 'Cheapest first' still sorts by price); and the filter
 * pop-ups do not show the '<Subclass> drugs' badge, because there is no
 * single subclass. Filters, counts and tapping work as before. With the prop
 * off (every other screen) nothing changes.
 *
 * 2026-10-04 (calmer family cards): on the Other families page the family
 * cards breathe more. More space between the cards (16, was 12), more air
 * above and below the family name (16 above, 12 below), the name a touch
 * larger (13) with looser lines so a two-line name is easier to read, a
 * fainter line under it, and a little space under the drug row. The drug row
 * itself and its side spacing are untouched (the image-search strip depends
 * on that spacing), so nothing else in the app changes.
 *
 * 2026-10-03 (sort icons): the two options in the Sort By pop-up now have an
 * icon in front of the text (A to Z arrow for Name, a low-to-high number arrow for Cheapest first).
 * Done with an optional 'icon' on an option, passed to ToggleChip; only the
 * sort options set one, so the Generic and Form pop-ups look the same as
 * before.
 *
 * 2026-10-03 (pop-up header, no hint line): the 'You can pick multiple ...'
 * line is gone from the Generic and Form pop-ups (the subtitle prop is removed
 * from FilterModal, nothing used it any more). The subclass badge text is a bit
 * bigger (14, was 12).
 *
 * 2026-10-03 (pop-up header, follow-up): the subclass badge and the hint line
 * now start at the left edge, under the icon tile (no indent), and the badge
 * is a rounded square (corner 8) instead of a full pill.
 *
 * 2026-10-03 (pop-up header): the top of the filter pop-ups is refined. The
 * icon sits in a small blue-tinted tile (same as the class sheet cards) beside
 * the title (weight 600), the subclass name is a soft badge ('<Subclass>
 * drugs', name in bold), the hint line is lighter and lined up under the title
 * text, and a hairline separates the header from the options. Applies to every
 * pop-up that uses this header (Generic, Form, ...), since they share it.
 *
 * 2026-10-03 (image search stopped working): the subclass title search now
 * opens through openInAppBrowser (src/utils/openInAppBrowser.js), same fix as
 * the image-search icon in SharedDrugCard.jsx.
 *
 * 2026-10-03 (class sheet title): new optional prop hideOther (default false).
 * With it on, the heading drops the word 'Other' and reads '<name> drugs'. The
 * class sheet (ClassSheet.jsx) turns it on for the drugs of a subclass,
 * because there the open drug is not being left out of the list. Everywhere
 * else the heading still reads 'Other <name> drugs'.
 *
 * 2026-10-03 (pop-up scroll bar crash): ScrollMenu (the scroll bar in the filter
 * pop-ups) made a new object on every measure, so with a long list it kept
 * re-rendering itself forever. That was silent until a Back press hit the open
 * pop-up, which crashed with React error #185. It now keeps the same value
 * when nothing visibly changed.
 *
 * 2026-10-03 (Back closes the pop-up): the phone's Back button now closes an
 * open filter pop-up on its own and leaves the sheet open (useBackLayer in
 * FilterModal). Closing it with Done or by tapping outside is unchanged.
 *
 * 2026-10-03 (subclass in the generic pop-up): the 'Filter by generic' pop-up
 * now shows '<Subclass> drugs' (name in bold) right under its title, using
 * familyName, so it is clear which subclass the listed generics belong to.
 * Shown in every case, including when there is only one generic.
 *
 * 2026-10-03 (Similar generic in the generic filter, Similar title): on
 * Alternatives, the 'Filter by generic' pop-up now also lists the generic of
 * the open drug (the one the Similar tab is about) as the last row of the
 * list. It looks like the other rows but faded with a dashed outline (same
 * inactive look as a locked option), has no tick, and a small grey 'Similar'
 * tag on the right where the number would be. It cannot be tapped and is not
 * counted as a pick (pill text and Clear filter ignore it). Shown only when a
 * Similar tab exists. New prop similarGenericName (see below). The Similar
 * tab's 'Other <n> drugs' title now also starts every ingredient with a
 * capital letter.
 *
 * 2026-10-03 (generic icon): the generic filter (its pill button and its
 * pop-up title) now uses the flask icon from the 'Active ingredient' row of
 * GenericOverviewSection.jsx, instead of the pill icon.
 *
 * 2026-10-03 (pop-up icons, ingredient capitals): the 'Filter by generic'
 * pop-up now shows the pill icon in its title and the 'Form / Route' pop-up
 * shows the filter icon, the same icons as their two pill buttons. In the
 * generic list (and the single-generic pill) every ingredient now starts with
 * a capital letter, e.g. 'Brompheniramine + Paracetamol', not just the first.
 *
 * 2026-10-03 (title size and form subtitle): the 'Other <name> drugs' title on
 * both tabs is a little smaller (16px down to 15px). The 'Form / Route' pop-up
 * now has the subtitle 'You can pick multiple forms', same look as the one in
 * the 'Filter by generic' pop-up.
 *
 * 2026-10-03 (single generic): on Alternatives with only one generic, the
 * generic pill is no longer greyed out and dead. It opens the Filter by generic
 * pop-up, which shows that one generic in full (the name wraps instead of being
 * cut off), ticked and greyed out so it cannot be changed. That pop-up has no
 * subtitle and no Clear filter button, only Done. The Form pill is unchanged.
 *
 * 2026-10-03 (you are here card): the Similar list now also shows the drug page
 * that is open, as one more card in the list, tinted with the accent colour so
 * it stands out. It sits at its own place in the current sort order and follows
 * the Form filter like every other card: it is hidden while the filter does
 * not match it. It is not counted in 'N drugs' (that line, like the tab count,
 * counts the other drugs), is not tappable, and its divider line is dropped so
 * the tint reads as one block. Alternatives is unchanged. New prop currentDrug
 * (see Props below).
 *
 * 2026-10-03 (brand list polish): (1) On Alternatives the whole 'Other <subclass>
 * drugs' title is now one tappable button that opens the Google search, not
 * just the icon; the icon is smaller, sits right after the subclass name and is
 * lined up with the top of the title text. (2) Brand counts are drawn as small
 * rounded-square tags (CountTag, also used by the sheet's tab bar): in the
 * generic and form pop-ups and on the Similar / Alternatives tabs. (3) The
 * 'Filter by generic' pop-up has the subtitle 'You can pick multiple
 * generics'. (4) The 'Sort By' pop-up shows the sort icon in its title and
 * lists its two options in two rows.
 *
 * 2026-10-03 (title icon on its own line): the app's base styles (Tailwind) make
 * every svg icon a block by default, which pushed the search icon onto its own
 * line and split the title. The icon is now set to inline-block so it stays in
 * the same line as the sentence, right after the subclass name.
 *
 * 2026-10-03 (subclass Google search): the Alternatives title now has a blue
 * search icon right after the subclass name. Tapping it opens a Google search
 * for that subclass, the same way SharedDrugCard.jsx's image-search icon opens
 * its search: Browser.open() from @capacitor/browser (in-app browser on the
 * phone, new tab on the web). Plain web search, not Images. The Similar title
 * shows the generic name rather than a subclass, so it has no icon.
 *
 * 2026-10-03 (pop-ups in the sheet's own layer): SimilarAlternativesSheet now swipes
 * between its two lists, and anything drawn inside a sliding list gets
 * trapped inside that one list. So the sheet passes popupLayer (an empty
 * full-sheet layer) and the filter pop-ups are drawn into it, which keeps the
 * dim covering the tabs and drag handle too. Without popupLayer the pop-up is
 * drawn in place, as before.
 *
 * 2026-10-03 (generic pop-up order and quieter buttons): the Filter by
 * generic pop-up lists generics with the most brands first (same-count ones
 * A-Z). The pop-up's Clear filter and Done buttons are smaller and sit at the
 * right: Clear filter is plain red text, Done is a soft accent tint, so
 * neither competes with the filter options above them.
 *
 * 2026-10-03 (no 'All' chips): the 'All Forms' / 'All Generics' chips in the
 * pop-up headers were removed; the Clear filter button does that job.
 *
 * 2026-10-03 (pill contrast): inactive filter pills use the muted surface
 * tint instead of the sheet's own colour so they stand out from the sheet.
 *
 * 2026-10-03 (follow-up): count line reads 'N drugs'; the Form pop-up shows
 * no numbers (zero-result forms are still dimmed), the Generic pop-up keeps
 * them; Similar always shows the Form pill, greyed out with the single form's
 * name when there is only one; Generic and Form pills split 60/40 so
 * 'Filter by generic' fits.
 *
 * 2026-10-03 (filter controls redesign): Sort is no longer a pill. The two
 * filter pills (Generic, Form) sit alone in one row; Sort is a quiet text
 * control on the result-count line under them, which also shows 'Clear
 * filters' while anything is picked. The Generic and Form filters no longer
 * follow each other: a pick in one never changes the other (rules and their
 * tests live in brandsFilterLogic.js). Each pop-up option shows how many
 * brands it gives with the other filter applied; options giving none are
 * dimmed and cannot be added (a picked option can always be removed).
 * Alternatives always shows both pills (a pill with only one choice is greyed
 * out and shows that choice, so the row never changes shape). Similar shows
 * only the Form pill (greyed out when there is a single form).
 * If removing a pick leaves picks with nothing in common, the list shows
 * 'No brands match' with a Clear filters button.
 *
 * 2026-10-03 (titles and generic filter): both tabs share one larger heading,
 * 'Other <name> drugs' (generic name on Similar, subclass on Alternatives).
 * The Medicine filter is now 'Filter by generic' / 'N generics selected' /
 * 'All Generics', with a shorter pop-up list. The Sort pop-up has no round
 * tick marks (pick one of two).
 *
 * 2026-10-03 (remembered filters): Sort / Form / Medicine picks are reported
 * up through onSave and restored from the saved prop, so the sheet closing
 * (or switching tabs) no longer wipes them.
 *
 * Phase 2G — Drug Detail Screen
 * Step 3.11 (2026-07-16) — rebuilt per ADR-034: siblings now span the whole
 * generic across every form, not just the exact item's own formulation.
 * Alphabetical by default, filterable by form, sortable by relative cost.
 *
 * Props:
 *   siblings — array of other flat drug (item) objects sharing the same
 *              generic as the item currently being viewed. The current item
 *              itself should NOT be included — it's already shown above in
 *              the header. Confirmed full FlatDrug shape (not a trimmed
 *              projection) via DrugDetailScreen.jsx: `drugs.filter(d =>
 *              d.genericId === drug.genericId && d.id !== drug.id)`, same
 *              array `drugs` (the full drug list) comes from.
 *   currentDrug — the flat drug object of the page that is open (Similar mode
 *              only, ignored on Alternatives). Drawn as a tinted card inside
 *              the list. Optional; with none, the list is exactly the siblings.
 *   groupBySubclass — optional boolean, default false. True switches to the
 *              'Other families' page (see the 2026-10-03 note at the top).
 *   hideHeading — optional boolean, default false. True leaves out the title
 *              above the filters (the name with the search icon). The class
 *              sheet uses it for a class with no families, whose sheet heading
 *              already shows the class name. Filters and the pop-up badge
 *              (familyName) are unchanged.
 *   titleIcon — optional node, default null. Drawn before the title (the class
 *              sheet puts the family's own icon here). Nothing changes when empty.
 *   belowHeading — optional node, default null. Drawn under the title and
 *              above the filters (the class sheet puts a family's keywords
 *              here). Not drawn on its own space when empty.
 *   hideOther — optional boolean, default false. True drops the word 'Other'
 *              from the heading ('<name> drugs' instead of 'Other <name> drugs').
 *   similarGenericName — Alternatives only: name of the generic the Similar
 *              tab is about. Listed in the generic pop-up as a greyed-out row.
 *              Leave empty when there is no Similar tab.
 *   onTap    — (item) => void — no longer called (see 2026-09-19 note
 *              below); kept in the prop list so this file's own public API
 *              doesn't change for whatever screen still passes it in.
 *
 * 2026-09-18 (this session): per feedback —
 *  - Section header: "Available Brands (Egypt)" → "Other Brands".
 *  - Rows now render via SharedDrugCard.jsx (the same row component
 *    Drugs/Favourites screens use) instead of this file's own bordered-box
 *    markup, so a sibling brand looks identical to how it'd look on those
 *    screens. SharedDrugCard needs `categories` and `isDark`, which this
 *    file didn't have — both are self-contained hooks (confirmed:
 *    useCategories.js does its own Supabase fetch + cache, not seeded by a
 *    parent; useIsDark follows SourcesSection.jsx's own established
 *    direct-call precedent), so both are called directly here rather than
 *    threading two new props down through SimilarAlternativesSheet.jsx and
 *    GenericOverviewSection.jsx. Price (SharedDrugCard has no dedicated
 *    price slot) now rides in its `trailing` slot instead. Sort-by-name
 *    switched from the old row's `item.name` (SharedDrugCard's own header
 *    comment explains this was the old, no-longer-used pre-composed name
 *    field DrugCard.jsx used to double-render) to `item.tradenameClean`,
 *    matching what SharedDrugCard itself actually displays.
 *
 * 2026-09-18 (this session, follow-up): price dropped from the row
 * entirely (was in SharedDrugCard's `trailing` slot) — not shown anymore,
 * per feedback.
 *
 * 2026-09-18 (this session, second follow-up): form-filter chips + the
 * name/price SortToggle segmented control replaced with two native-select
 * dropdown pills (DropdownPill below) — see its own comment for why a
 * plain styled <select> was chosen over a custom popover. Sort's price
 * option relabeled "Lowest cost first" since price itself is hidden now
 * (an unlabeled "Price" sort option would have been sorting by something
 * the person can no longer see).
 *
 * 2026-09-18 (this session, third follow-up): section header restyled —
 * 10px/700/uppercase/tertiary-color "eyebrow" label → 15px/700/normal-
 * case/primary-color, reading as a real title instead of a small caps
 * label. Per feedback.
 *
 * 2026-09-18 (this session, fourth follow-up): DropdownPill rebuilt as a
 * real in-app popover (button + absolutely-positioned option list, click-
 * outside-to-close via a document listener) instead of a styled native
 * <select> — per feedback, the native option opened the browser/OS's own
 * picker UI, which reads as out-of-place against the rest of the app.
 * Each pill also gets a leading icon now: ListFilter for Form, ArrowUpDown
 * for Sort — both standard lucide-react icons already used for this exact
 * meaning elsewhere in the wild, no new icon language invented.
 *
 * 2026-09-19 (this session): per feedback — a sibling row is no longer
 * tappable (`disableTap`) and no longer shows the chevron (`showChevron={false}`),
 * both new optional props on SharedDrugCard that default to the old
 * behavior everywhere else. `onTap` is still accepted as a prop here so
 * this file's own API doesn't change, but it's no longer passed down to
 * the row. The row's `trailing` slot shows RowStarButton.jsx (the same
 * heart button ConditionCard/Favourites rows already use) when the
 * sibling is one of the user's favourite drugs; hidden entirely otherwise,
 * per RowStarButton's own existing show/hide rule.
 *
 * 2026-09-19 (this session, follow-up): three more changes per feedback —
 *  - Sort option relabeled "Lowest cost first" → "Cheapest first".
 *  - Form filter now groups forms the same way the Drugs screen's own
 *    filter sheet does (e.g. "Tab / Cap.", "Syrup/Susp.") instead of
 *    listing every raw form value as its own option. Reuses
 *    DrugFilterPanel.jsx's exported `FORM_OPTIONS` directly — same
 *    grouping data, not a second copy that could drift out of sync — via
 *    `resolveFormGroup` below, which maps a sibling's raw `form` value to
 *    the group it belongs to. The filter pill itself only appears when
 *    siblings span more than one distinct *group* (was: more than one
 *    distinct raw form) — a single drug, or several drugs that all land
 *    in the same group (e.g. all tablets/capsules), still hides the pill,
 *    same "nothing to filter" rule as before.
 *  - Heart icon is now display-only here: RowStarButton's new `readOnly`
 *    prop (see that file) is passed instead of `onPress`, so tapping the
 *    heart in this list no longer removes a drug from favourites —
 *    un-favouriting from this screen isn't offered, only the status is
 *    shown. `toggleDrug` is no longer read from FavouritesContext here.
 *
 * 2026-09-19 (this session, second follow-up): section header renamed
 * "Other Brands" → "Similar Brands", per feedback — now matches
 * GenericOverviewSection.jsx's trigger button, which was renamed to the
 * same text in a separate file/session (see that file's own changelog).
 *
 * 2026-09-19 (this session, third follow-up): rows now pass
 * `showImageSearch` to SharedDrugCard, turning on its new image-search
 * icon (see that file's own changelog) for this list only — Drugs and
 * Favourites screens, which also render SharedDrugCard, are unaffected
 * since they don't pass this prop.
 *
 * 2026-10-02 (Related drugs, Alternatives lookup): this list now serves two
 * tabs of the brands sheet. New props:
 *  - mode: 'similar' (default, same as before) or 'alternatives'.
 *  - familyName: the subclass name shown in the Alternatives heading.
 *  (The old showTitle prop and 'Similar Brands' header were removed on
 *  2026-10-03; both tabs now use the 'Other <name> drugs' heading.)
 * Alternatives mode adds a short note ('options for a professional to
 * consider, not direct substitutes') and a third dropdown pill, a
 * medicine filter, that narrows a big subclass to one generic. That pill
 * only appears when the list spans more than one generic. The form filter
 * and the cheapest-first sort work the same on both tabs. Rows stay
 * display-only (not tappable) in both modes for now.
 * (Superseded 2026-10-02, tappable Alternatives: see the note below.)
 *
 * 2026-10-02 (dropdown clipping fix): the three dropdown menus used to be
 * floating popovers inside the sheet's scroll area, so with only 1-2 rows
 * in the list they were cut off and ran past the screen edge. They now
 * open as a normal block right under the pill row (full width, own
 * scroll for long lists), so they always fit inside the sheet. Only one
 * menu is open at a time; picking an option or tapping the same pill
 * again closes it.
 *
 * 2026-10-07 (tappable Similar): rows on the Similar tab now open that drug's
 * page when tapped (onTap, with a chevron), same as Alternatives. The
 * highlighted card of the page that is already open stays inert, without a
 * chevron. The Similar-tab line in the 2026-10-02 note below is superseded.
 *
 * 2026-10-02 (tappable Alternatives): rows on the Alternatives tab now open
 * that drug's page when tapped (onTap, with a chevron) — those are different
 * medicines worth looking at. Rows on the Similar tab stay inert, as before.
 * onTap is only called from Alternatives rows.
 *
 * 2026-10-02 (filter redesign): the three dropdowns are now laid out as two
 * rows — Sort and Form split 50/50 on the first row, and (Alternatives
 * only) the Medicine filter full width under them. Each menu opens right
 * under its own row in the same look as the Drugs filter panel: pill chips
 * with the round tick indicator, an 'All ...' chip beside the section label,
 * and a red 'Clear filter' button. Form and Medicine are multi-select (pick
 * any number; none picked = everything); Sort is pick-one and closes on
 * choice. Form and Sort menus use 2 columns; the Medicine menu is one
 * column because the combo names are long. The app hides every native
 * scrollbar (globals.css), so long menus draw their own thin scroll
 * indicator (ScrollMenu below). Medicine names show in sentence case.
 * The Alternatives note is now just 'Other [subclass] drugs'.
 *
 * 2026-10-02 (filters open in a pop-up): the inline menus were the same
 * colour as the sheet and hard to tell apart from it, so each pill now opens
 * a small centered pop-up box (FilterModal below), styled like the app's
 * InfoSheet/ConfirmSheet dialogs (dimmed backdrop, rounded surface card).
 * It is drawn INSIDE the brands sheet (covering the sheet, centered in it)
 * rather than portaled to the page: the sheet library blocks touches and
 * scrolling for anything outside it, which would break the pop-up. It has no
 * back-button handling of its own, so Back closes the whole sheet, same as
 * with no pop-up. Pill states: plain outline when nothing is chosen, tinted
 * accent pill (with the choice or a count) when a filter is applied; Sort
 * counts as applied once it is not the default A-Z.
 *
 * [REPLACED 2026-10-03, see the filter-controls note near the top] 2026-10-02
 * (Form and Medicine filters now depend on each other, so a pick
 * never leads to an empty list): the Form pop-up only offers forms that
 * exist among the currently chosen medicines (all medicines when none is
 * chosen), and the Medicine pop-up only offers medicines that have a brand
 * in the chosen forms (plus any already chosen). Changing the medicines
 * keeps the forms still available for them and drops the rest; it does not
 * clear every form, and forms that are new to the added medicine simply
 * appear as options without being ticked. The Form button greys out when
 * there is only one form to choose from. A short 'no brands match' note
 * covers the rare leftover empty case.
 *
 * 2026-10-04 (shared pop-up moved out): FilterModal (the small centered
 * pop-up) and the pieces only it used (ScrollMenu, ClearFilterButton,
 * ToggleChip), plus CountTag, moved unchanged to src/components/ui/
 * (FilterModal.jsx, CountTag.jsx), since the Drugs screen and the Brands list
 * both use them and they do not belong to the drug page. This file imports
 * FilterModal from there; PillButton and SortButton stay here. Every note
 * above that mentions the pop-up describes the same code, now in
 * FilterModal.jsx.
 */

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, ListFilter, ArrowUpDown, FlaskConical, Search, ArrowDownAZ, ArrowDown01 } from 'lucide-react'
import { openInAppBrowser } from '../../../utils/openInAppBrowser'
import SharedDrugCard from '../../SharedDrugCard.jsx'
import RowStarButton from '../../ui/RowStarButton.jsx'
import { FORM_OPTIONS } from '../DrugFilterPanel.jsx'
import { applyFilters, countByForm, countByGeneric, sortItems, sortGenericOptions, otherGenericIds } from './brandsFilterLogic.js'
import { useCategories } from '../../../hooks/useCategories'
import { FilterModal } from '../../ui/FilterModal.jsx'
import { useIsDark } from '../../../utils/specialtyIcon'
import { useFavouritesContext } from '../../../context/FavouritesContext'
import PaywallGateSheet from '../../ui/PaywallGateSheet.jsx'
import { useIsPro } from '../../../hooks/useIsPro'

// Maps a sibling's raw `form` value (e.g. 'capsule', 'eye drops') to the
// grouped filter option it belongs to (e.g. the 'Tab / Cap.' group) —
// same grouping DrugFilterPanel.jsx's Form/Route section already uses,
// via its exported FORM_OPTIONS. A value with no match resolves to null
// and is simply left out of the filter rather than guessed into a group.
function resolveFormGroup(rawForm) {
  if (!rawForm) return null
  return FORM_OPTIONS.find(opt => opt.value !== 'all' && opt.matches.includes(rawForm)) || null
}

// 'brompheniramine + paracetamol' -> 'Brompheniramine + Paracetamol'
// Generic names list their ingredients separated by ' + '; each one gets its
// own capital letter (the rest of the name stays lower case).
function ingredientCase(text) {
  const t = (text ?? '').trim().toLowerCase()
  return t.replace(/(^|\+\s*)(\S)/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// 'beta blockers + diuretics' -> 'Beta Blockers + Diuretics'. Only the first
// letter of each word is touched, so names already in capitals ('ACE') stay.
// Used for the family labels on the 'Other families' page.
function familyCase(text) {
  return (text ?? '').replace(/(^|[\s+/(-])([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
}

// Pill text for the generic filter: a prompt when nothing is picked, else a count.
function genericLabel(selected) {
  if (selected.length === 0) return 'Filter by generic'
  return `${selected.length} ${selected.length === 1 ? 'generic' : 'generics'} selected`
}

// Pill text for a multi-select filter: nothing picked, one picked, or a count.
function multiLabel(selected, options, allLabel, plural) {
  if (selected.length === 0) return allLabel
  if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? allLabel
  return `${selected.length} ${plural}`
}

// Tells the screen around the list how many drugs show now and how many there
// are in all (see onFilteredCount), without putting a hook after the list's
// early return. Renders nothing; clears itself when the list goes away.
function CountReporter({ onCount, shown, total, active }) {
  useEffect(() => { onCount({ shown, total, active }) }, [onCount, shown, total, active])
  useEffect(() => () => onCount(null), [onCount])
  return null
}

export default function BrandsList({ siblings = [], currentDrug = null, onTap, mode = 'similar', familyName, similarGenericName = null, similarCount, onFilteredCount, hideOther = false, hideHeading = false, belowHeading = null, titleIcon = null, groupBySubclass = false, saved = null, onSave, popupLayer = null, proGateForm = false }) {
  const isAlternatives = mode === 'alternatives'
  // Start from the picks the sheet remembered for this drug (if any), so
  // closing and reopening the sheet keeps the filters.
  // proGateForm: the Form pill is Pro-only here (class sheets). Free users see
  // it with a small Pro tag and a tap opens the paywall sheet.
  const isPro = useIsPro()
  const formLocked = proGateForm && !isPro
  const [showProGate, setShowProGate] = useState(false)
  const [formSel,    setFormSel]    = useState(proGateForm && !isPro ? [] : (saved?.formSel ?? []))     // picked form groups; [] = all
  const [genericSel, setGenericSel] = useState(saved?.genericSel ?? [])     // picked genericIds; [] = all
  const [sortMode,   setSortMode]   = useState(saved?.sortMode   ?? 'name') // 'name' | 'price'
  const [openMenu,   setOpenMenu]   = useState(null)   // 'form' | 'generic' | 'sort' | null
  const { categories } = useCategories()
  const isDark = useIsDark()
  const { isDrugFavourited } = useFavouritesContext()

  // Hand every change to the sheet so it can remember the picks while the
  // person stays on this drug's page.
  useEffect(() => {
    onSave?.({ formSel, genericSel, sortMode })
  }, [formSel, genericSel, sortMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // No real siblings — section disappears entirely.
  if (siblings.length === 0) return null

  const groupOf = s => resolveFormGroup(s.form)?.value ?? null

  // Whole-list facts: which forms and generics exist at all (decides which
  // pills show, so they don't appear and disappear while picking).
  const formGroupsInList = FORM_OPTIONS.filter(opt =>
    opt.value !== 'all' && siblings.some(s => groupOf(s) === opt.value)
  )
  const nameById = new Map(siblings.map(s => [s.genericId, s.genericName]))

  // The two filters never change each other. Each option only shows how many
  // brands it would give with the OTHER filter's picks applied.
  const activeGenerics = isAlternatives ? genericSel : []
  const formCounts     = countByForm(siblings, activeGenerics, groupOf)
  const genericCounts  = countByGeneric(siblings, formSel, groupOf)

  const formOptions = formGroupsInList.map(g => ({
    value: g.value, label: g.label, count: formCounts.get(g.value) ?? 0,
  }))
  const allGenericOptions = [...nameById.entries()]
    .map(([value, label]) => ({ value, label: ingredientCase(label), count: genericCounts.get(value) ?? 0 }))
  // Generics with a single brand are folded into one 'Other generics' row
  // when there are enough of them (see otherGenericIds). Alternatives only,
  // the only place the generic pop-up has more than one generic.
  const otherIds = isAlternatives ? otherGenericIds(siblings) : new Set()
  const genericOptions = sortGenericOptions(allGenericOptions.filter(o => !otherIds.has(o.value)))
  const otherOptions   = sortGenericOptions(allGenericOptions.filter(o => otherIds.has(o.value)))

  const sortOptions = [
    { value: 'name',  label: groupBySubclass ? 'Family (A–Z)' : 'Name (A–Z)', icon: ArrowDownAZ },
    { value: 'price', label: 'Cheapest first', icon: ArrowDown01 },
  ]

  const filtered = applyFilters(siblings, { genericSel: activeGenerics, formSel }, groupOf)
  // Other families page: by name means family A to Z, then drug name.
  const sorted   = groupBySubclass && sortMode === 'name'
    ? [...filtered].sort((a, b) =>
        (a.subclass ?? '').localeCompare(b.subclass ?? '') ||
        (a.tradenameClean ?? '').localeCompare(b.tradenameClean ?? ''))
    : sortItems(filtered, sortMode)
  // Similar only: the open drug joins the list as a 'you are here' card at its
  // place in the current sort order, but only while it passes the same filters
  // as the other cards. Counts and the empty message keep working on the other
  // drugs only (sorted), so nothing about them shifts.
  const showCurrent = !!currentDrug && !isAlternatives
    && !sorted.some(s => s.id === currentDrug.id)
    && applyFilters([currentDrug], { genericSel: activeGenerics, formSel }, groupOf).length > 0
  const rows = showCurrent ? sortItems([...sorted, currentDrug], sortMode) : sorted
  const filtersActive = formSel.length > 0 || activeGenerics.length > 0

  // Other families page: the rows split into one section per family (rows of
  // the same family are next to each other, whatever the sort).
  const familySections = []
  if (groupBySubclass) {
    for (const item of rows) {
      const last = familySections[familySections.length - 1]
      if (last && last.name === item.subclass) last.items.push(item)
      else familySections.push({ name: item.subclass, items: [item] })
    }
  }

  // One drug card. isLast drops its divider line.
  function renderCard(item, isLast) {
    // 2026-10-07: Similar rows now open that drug's page too, like Alternatives
    // rows. Only the highlighted card of the page already open stays inert
    // (tapping it would just reopen the same page).
    const isCurrent = !isAlternatives && !!currentDrug && item.id === currentDrug.id
    return (
      <SharedDrugCard
        key={item.id}
        drug={item}
        categories={categories}
        isDark={isDark}
        isLast={isLast}
        onTap={onTap}
        disableTap={isCurrent}
        showChevron={!isCurrent}
        showImageSearch
        trailing={
          <RowStarButton
            isFavourited={isDrugFavourited(item.id)}
            readOnly
          />
        }
      />
    )
  }

  function toggleIn(list, setList, value) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value])
  }
  function clearFilters() {
    setFormSel([])
    setGenericSel([])
  }

  // Name shown in the heading above the filters.
  const headingName = isAlternatives ? familyName : ingredientCase(siblings[0]?.genericName)
  const headingStyle = {
    fontSize:   18,
    lineHeight: 1.4,
    color:      'var(--color-text-secondary)',
    margin:     '0 0 var(--space-3)',
  }
  const iconNode = titleIcon ? (
    <span aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-4px', marginRight: 8, lineHeight: 0 }}>
      {titleIcon}
    </span>
  ) : null
  const nameNode = <strong style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{headingName}</strong>

  // Opens the Google search for the subclass (Alternatives title, whole title
  // is the button): same opening method as SharedDrugCard.jsx's image-search
  // icon, but a plain web search.
  function searchSubclass() {
    openInAppBrowser(`https://www.google.com/search?q=${encodeURIComponent(headingName)}`)
  }

  // The two filter pills. Alternatives: both always (greyed out when there is
  // only one choice, showing that choice). Similar: Form only, and only when
  // there is more than one form.
  // With a single generic there is nothing to choose: the pill still opens its
  // pop-up (so the full name can be read), where that generic is shown ticked
  // and greyed out (lockAll) with only a Done button.
  const onlyGeneric = nameById.size === 1
  // Alternatives only: the generic the Similar tab is about, shown in the
  // generic pop-up as an inert row. Skipped when it is already one of the
  // options (same name) so it can never appear twice.
  const similarRowLabel = isAlternatives && similarGenericName
    ? ingredientCase(similarGenericName)
    : ''
  const similarRow = similarRowLabel && !allGenericOptions.some(o => o.label === similarRowLabel)
    ? { label: similarRowLabel, count: similarCount }
    : undefined
  const genericControl = isAlternatives && nameById.size > 0 && {
    key: 'generic', icon: FlaskConical, flex: 3,
    pillLabel: onlyGeneric
      ? ingredientCase([...nameById.values()][0])
      : genericLabel(genericSel),
    active: genericSel.length > 0,
    menu: { title: 'Filter by generic', titleIcon: FlaskConical,
            scopeName: groupBySubclass ? undefined : familyName,
            columns: 1, wrap: true, listMaxHeight: 'min(240px, 32svh)',
            options: genericOptions,
            selected: onlyGeneric ? [...nameById.keys()] : genericSel,
            lockAll: onlyGeneric,
            inertRow: similarRow,
            otherGroup: otherOptions.length > 0
              ? { label: 'Other generics', allLabel: 'All other generics', options: otherOptions }
              : undefined,
            onPickGroup: (values, on) => setGenericSel(prev => on
              ? [...new Set([...prev, ...values])]
              : prev.filter(v => !values.includes(v))),
            onPick: v => toggleIn(genericSel, setGenericSel, v),
            onClear: onlyGeneric ? undefined : () => setGenericSel([]) },
  }
  const showFormPill = formGroupsInList.length > 0
  const formGated = formLocked && formOptions.length > 1
  const formControl = showFormPill && {
    key: 'form', icon: ListFilter, flex: isAlternatives ? 2 : 1,
    pillLabel: formOptions.length === 1
      ? formOptions[0].label
      : multiLabel(formSel, formOptions, 'All Forms', 'Forms'),
    active: formSel.length > 0,
    disabled: formOptions.length <= 1,
    // Pro-only: the pill looks and opens like any other. Inside the pop-up
    // the title carries the Pro tag and any form tapped opens the paywall
    // (same as the Drugs search filter sheet). A pill with a single form is
    // already inert (nothing to choose), so it is never gated.
    menu: { title: 'Form / Route', titleIcon: ListFilter, columns: 2, showCounts: false, options: formOptions, selected: formSel,
            proTag: formGated,
            onPick: formGated
              ? () => { setOpenMenu(null); setShowProGate(true) }
              : v => toggleIn(formSel, setFormSel, v),
            onClear: () => setFormSel([]) },
  }
  // Sort is not a filter: it lives on the count line, never in the pill row.
  const sortMenu = {
    key: 'sort',
    menu: { title: 'Sort By', titleIcon: ArrowUpDown, columns: 1, single: true, options: sortOptions, selected: [sortMode],
            onPick: v => { setSortMode(v); setOpenMenu(null) } },
  }
  const pills = [genericControl, formControl].filter(Boolean)
  const activeControl = [...pills, sortMenu].find(c => c.key === openMenu) || null

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Heading for both tabs: 'Other <name> drugs'. Similar uses the viewed
          drug's generic name, Alternatives uses the subclass name. Name in bold.
          On Alternatives the whole title is a button that opens the Google
          search; its small icon follows the subclass name. */}
      {headingName && !hideHeading && (groupBySubclass
        ? (
          <p style={headingStyle}>{iconNode}{nameNode}</p>
        )
        : isAlternatives
        ? (
          <button
            onClick={searchSubclass}
            aria-label={`Search Google for ${headingName}`}
            style={{
              ...headingStyle,
              display:    'block',
              maxWidth:   '100%',
              padding:    0,
              border:     'none',
              background: 'none',
              textAlign:  'left',
              fontFamily: 'var(--font-body)',
              cursor:     'pointer',
              WebkitTapHighlightColor: 'transparent',
              outline:    'none',
            }}
          >
            {iconNode}{hideOther ? null : 'Other '}{nameNode}
            <Search
              size={11}
              strokeWidth={2.2}
              color="var(--color-accent)"
              aria-hidden="true"
              style={{ display: 'inline-block', marginLeft: 3, verticalAlign: 'top' }}
            />
            {' '}drugs
          </button>
        )
        : (
          <p style={headingStyle}>
            {iconNode}{hideOther ? null : 'Other '}{nameNode} drugs
          </p>
        )
      )}

      {belowHeading}
      {onFilteredCount && (
        <CountReporter
          onCount={onFilteredCount}
          shown={sorted.length}
          total={siblings.length}
          active={filtersActive}
        />
      )}

      {/* Filter pills — the only buttons in this row. Tapping one opens its
          pop-up (FilterModal, rendered at the end of this component). */}
      {pills.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {pills.map(c => (
            <PillButton
              key={c.key}
              icon={c.icon}
              label={c.pillLabel}
              active={c.active}
              disabled={c.disabled}
              flex={c.flex}
              onPress={() => setOpenMenu(c.key)}
            />
          ))}
        </div>
      )}

      {/* Count line: how many brands are showing (plus Clear filters while
          anything is picked) on the left, Sort as a quiet text control on the right. */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            'var(--space-2)',
        marginTop:      pills.length > 0 ? 'var(--space-3)' : 0,
        fontSize:       13,
        color:          'var(--color-text-secondary)',
      }}>
        <div style={{ minWidth: 0 }}>
          {/* With a filter on: 'shown/all' (5/20 drugs), so the full size of the
              list stays visible while it is narrowed. */}
          {filtersActive ? `${sorted.length}/${siblings.length}` : sorted.length}
          {' '}{(filtersActive ? siblings.length : sorted.length) === 1 ? 'drug' : 'drugs'}
          {filtersActive && (
            <>
              {' · '}
              <button
                onClick={clearFilters}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
                  color: '#DC2626', WebkitTapHighlightColor: 'transparent', outline: 'none',
                }}
              >
                Clear filters
              </button>
            </>
          )}
        </div>
        <SortButton
          label={sortOptions.find(o => o.value === sortMode)?.label}
          onPress={() => setOpenMenu('sort')}
        />
      </div>

      <div style={{ height: 'var(--space-2)' }} />

      {sorted.length === 0 && (
        <div style={{
          padding:   'var(--space-6) 0',
          textAlign: 'center',
          fontSize:  13,
          color:     'var(--color-text-secondary)',
        }}>
          No brands match these filters.
        </div>
      )}

      {groupBySubclass ? (
        // Other families page: each family is one soft card, the family name
        // on top with a hairline under it, then its drug card(s).
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {familySections.map(sec => (
            <div
              key={sec.name}
              style={{
                backgroundColor: 'var(--color-surface-muted)',
                borderRadius:    16,
                padding:         '0 var(--space-3) var(--space-1)',
              }}
            >
              <p style={{
                margin:       0,
                padding:      'var(--space-4) 0 var(--space-3)',
                fontSize:     13,
                fontWeight:   600,
                lineHeight:   1.45,
                color:        'var(--color-text-primary)',
                borderBottom: '0.5px solid var(--color-border-subtle)',
              }}>
                {familyCase(sec.name)}
              </p>
              {sec.items.map((item, k) => renderCard(item, k === sec.items.length - 1))}
            </div>
          ))}
        </div>
      ) : (
      <div>
        {/* Long lists are drawn in batches (see GradualList). The key starts
            the list again from the top whenever the sort or a filter changes. */}
        <GradualList
          key={`${sortMode}|${formSel.join(',')}|${activeGenerics.join(',')}`}
          rows={rows}
          renderRow={(item, i) => {
            const isCurrent = showCurrent && item.id === currentDrug.id
            const card = renderCard(item, i === rows.length - 1 || isCurrent)
            // The open drug: same card, wrapped in an accent tint that reaches a
            // little past the list's edges so it reads as a highlighted band.
            return isCurrent ? (
              <div
                key={item.id}
                aria-current="true"
                style={{
                  backgroundColor: 'var(--color-accent-light)',
                  borderRadius:    'var(--radius-md)',
                  margin:          '0 calc(-1 * var(--space-3))',
                  padding:         '0 var(--space-3)',
                }}
              >
                {card}
              </div>
            ) : card
          }}
        />
      </div>
      )}

      <div style={{
        height:          1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop:       'var(--space-5)',
      }} />

      {activeControl && (popupLayer
        ? createPortal(
            <FilterModal {...activeControl.menu} onClose={() => setOpenMenu(null)} />,
            popupLayer
          )
        : <FilterModal {...activeControl.menu} onClose={() => setOpenMenu(null)} />
      )}

      <PaywallGateSheet
        isOpen={showProGate}
        onClose={() => setShowProGate(false)}
        icon={ListFilter}
        headline="Filter by Form"
        message="Find the exact form you need, like tablets, syrups, or injections."
        dismissLabel="Not now"
      />
    </div>
  )
}

// Long-list helper: draws the first FIRST_BATCH rows and adds NEXT_BATCH more
// whenever an invisible marker under the last drawn row comes within
// LOOK_AHEAD of the visible area, so rows are ready before the person gets
// there. 'renderRow(item, indexInFullList)' is the same row drawing the list
// used before, so the last real row still drops its divider line. The caller
// gives this a new key whenever the sort or filters change, which starts it
// again from the first batch.
const FIRST_BATCH = 30
const NEXT_BATCH  = 30
const LOOK_AHEAD  = '1200px'

// The nearest ancestor that scrolls (the sheet's list area), or null.
function findScrollParent(el) {
  let node = el?.parentElement
  while (node && node !== document.body) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

function GradualList({ rows, renderRow }) {
  const [count, setCount] = useState(FIRST_BATCH)
  const markerRef = useRef(null)
  const shown = Math.min(count, rows.length)
  const hasMore = shown < rows.length

  // Watches the marker; each time more rows are drawn (shown changes) the
  // watch restarts, so a marker that is still near the visible area keeps
  // pulling in batches until it is far enough away.
  useEffect(() => {
    if (!hasMore) return undefined
    const marker = markerRef.current
    if (!marker || typeof IntersectionObserver === 'undefined') {
      // No way to watch (very old browser): draw everything, as before.
      setCount(rows.length)
      return undefined
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) setCount(c => c + NEXT_BATCH)
      },
      { root: findScrollParent(marker), rootMargin: `0px 0px ${LOOK_AHEAD} 0px` }
    )
    observer.observe(marker)
    return () => observer.disconnect()
  }, [hasMore, shown, rows.length])

  return (
    <>
      {rows.slice(0, shown).map((item, i) => renderRow(item, i))}
      {hasMore && <div ref={markerRef} aria-hidden="true" style={{ height: 1 }} />}
    </>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// Sort control: plain text with a small icon and chevron, no outline or fill,
// so it never reads as a filter. Same look whatever is chosen.
export function SortButton({ label, onPress }) {
  return (
    <button
      onClick={onPress}
      aria-haspopup="dialog"
      style={{
        display:                 'flex',
        alignItems:              'center',
        gap:                     4,
        flexShrink:              0,
        background:              'none',
        border:                  'none',
        padding:                 '6px 0 6px 8px',
        fontSize:                13,
        fontWeight:              500,
        color:                   'var(--color-text-secondary)',
        fontFamily:              'var(--font-body)',
        cursor:                  'pointer',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <ArrowUpDown size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
      <span>{label}</span>
      <ChevronDown size={13} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// The filter buttons. Inactive: plain outline. Active (a filter is
// applied): tinted accent pill with accent text and icon.
export function PillButton({ icon: Icon, label, active, disabled = false, flex = 1, fit = false, onPress }) {
  const [pressed, setPressed] = useState(false)
  const fg = active ? 'var(--color-accent)' : 'var(--color-text-primary)'
  return (
    <button
      onClick={disabled ? undefined : onPress}
      disabled={disabled}
      aria-haspopup="dialog"
      onPointerDown={() => !disabled && setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      style={{
        flex:                    fit ? '0 0 auto' : flex,
        minWidth:                0,
        display:                 'flex',
        alignItems:              'center',
        gap:                     6,
        backgroundColor:         active ? 'var(--color-accent-light)' : 'var(--color-surface-muted)',
        border:                  `1.5px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius:            'var(--radius-full)',
        padding:                 '8px 12px',
        fontSize:                13,
        fontWeight:              active ? 600 : 500,
        color:                   fg,
        fontFamily:              'var(--font-body)',
        cursor:                  disabled ? 'default' : 'pointer',
        opacity:                 disabled ? 0.5 : 1,
        transform:               pressed ? 'scale(0.97)' : 'scale(1)',
        transition:              'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.15s ease',
        WebkitTapHighlightColor: 'transparent',
        outline:                 'none',
      }}
    >
      <Icon size={14} color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'} style={{ flexShrink: 0 }} />
      <span style={{
        flex: fit ? '0 1 auto' : 1, minWidth: 0, textAlign: 'left',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <ChevronDown
        size={14}
        color={active ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
        style={{ flexShrink: 0 }}
      />
    </button>
  )
}

