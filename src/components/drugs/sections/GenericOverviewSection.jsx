/**
 * src/components/drugs/sections/GenericOverviewSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.1
 * (plan decisions 4.5, 4.7–4.9 — see STEPS_DRUG_DETAIL.md §1.1, plan §10 Section 8)
 *
 * 2026-10-04 (Families wording): the screen-reader label of the Class row says
 * 'drug families' instead of 'subclasses'. Nothing changes on screen.
 *
 * Renders the Active Ingredients / Generic Overview group for a drug:
 *   - top row: "Active ingredient" / "Active ingredients" label (plural only
 *     for combos, 2+ ingredients) + the "See Available Brands" link on the
 *     right, opens BrandsBottomSheet, disappears entirely when there are no
 *     siblings — same behavior as before, just restyled as a top-right link
 *     instead of a full-width button (2026-07-25, mockup reconciliation)
 *   - fixed decorative icon + generic/combo name (4.9)
 *   - for combo generics (2+ active ingredients), the name line comma-joins
 *     the ingredients array, each capitalized via toTitleCase, truncating to
 *     3 with an expand/collapse chevron past that (4.7) — plain (non-combo)
 *     generics just show their single name, unchanged
 *   - Mechanism of Action text directly below the name, no section-header
 *     label (2026-07-25, mockup reconciliation — dropped the "MECHANISM OF
 *     ACTION" label this file previously reused from ClinicalOverview.jsx)
 *   - two placeholder "Class"/"Subclass" pill tags, below the MOA text —
 *     static labels, not reading any real DB field yet; the real `subclass`
 *     column is a separate, deferred migration (4.8, tracked plan §11.5)
 *
 * 2026-07-25 (mockup reconciliation, session 19): the Available Brands
 * trigger's visual style now matches the original mockup image exactly —
 * a small top-right link, not the old full-width bordered button. Its
 * open/close/disappear behavior is unchanged. "See Available Brands" isn't
 * styled in an accent color yet — the codebase's accent token name hasn't
 * been confirmed (globals.css not yet read); swap in once known.
 *
 * Corrected 2026-07-25, session 20: dropped the trailing Divider() —
 * page-wide correction (surfaced while building UsesSection.jsx, 1.2):
 * no divider lines between any section on this page going forward, per
 * the real mockup, which has no visible rules between blocks anywhere.
 * Supersedes the divider carried over from the old 4-bundle design.
 *
 * Props:
 *   drug          — flat drug object from DrugContext
 *   siblings      — array of sibling flat drug objects sharing the same
 *                   generic, same shape BrandsList.jsx already receives
 *   onSelectBrand — (item) => void — passed through to BrandsBottomSheet,
 *                   called after the sheet closes
 *
 * Phase 6 (re-scoped, 2026-09-03, plan §4.9): the Mechanism of Action
 * sub-block's empty state changed from an inline NotYetAdded fallback to
 * rendering nothing at all — matches every other section's hide-when-empty
 * rule. The rest of this section (name, ingredients, tags) is unaffected.
 *
 * 2026-09-18 (this session): fixed a capitalization gap on the plain
 * (non-combo) path — it rendered `genericName` straight from the DB with
 * no formatting, so any generic stored lowercase showed lowercase. The
 * combo path already ran each ingredient through toTitleCase (see
 * `ingredients.map(toTitleCase)` below); the plain path just never got
 * the same treatment. Now wrapped in toTitleCase() too, matching the
 * combo path.
 *
 * 2026-09-18 (this session, follow-up): name-row icon switched from Atom
 * to FlaskConical (per feedback, after reviewing a few options) and sized
 * down 22px → 18px, matching SourcesSection.jsx's own decorative-icon
 * size for a similar role.
 *
 * 2026-09-18 (this session, third follow-up): single-ingredient path now
 * renders via IngredientChip too (see sectionPrimitives.jsx), matching
 * the combo path's chip treatment instead of plain bold text — per
 * feedback, to make both paths look consistent. FlaskConical sized down
 * again, 18px → 16px.
 *
 * 2026-09-18 (this session, fourth follow-up): FlaskConical moved from
 * the name row to the top row, right before the "Active ingredient(s)"
 * label — per feedback. Same icon/size, different position only.
 *
 * 2026-09-18 (this session, fifth follow-up): FlaskConical sized down
 * again, 16px → 14px, now matching the 13px label text next to it more
 * closely.
 *
 * 2026-09-18 (this session, sixth follow-up): truncation threshold
 * (InlineTruncatedList's `max` prop) raised 3 → 5 — combo drugs with up
 * to 5 ingredients now show them all with no "Show more" toggle at all;
 * truncation only kicks in past 5.
 *
 * 2026-09-18 (this session, seventh follow-up): FlaskConical sized down
 * once more, 14px → 12px — per feedback, was still reading larger than
 * the 13px label's own visual weight next to it.
 *
 * 2026-09-18 (this session, eighth follow-up): the "See Available Brands"
 * trigger button's label renamed to "Other Brands", matching
 * BrandsList.jsx's own section-header rename in the sheet it opens (same
 * session, separate file) — button and sheet now say the same thing.
 *
 * 2026-09-19 (this session, ninth follow-up): trigger button's label
 * renamed again, "Other Brands" → "Similar Brands", per feedback. This
 * now diverges from BrandsList.jsx's own in-sheet section header, which
 * still reads "Other Brands" (see that file) — flagged, not changed,
 * since it wasn't part of this request.
 *
 * 2026-09-19 (this session, tenth follow-up): the Mechanism of Action
 * toggle now looks and sits like the ingredient list's toggle — both use
 * the shared ShowMoreToggle from sectionPrimitives.jsx (left-aligned under
 * the content, small muted label, one chevron that rotates). The MOA reveal
 * also animates now (its box grows/shrinks in height instead of jumping).
 * Wording is unchanged ('See more' / 'See less'). UsesSection.jsx was not
 * touched and may still use the old centered full-width toggle — flagged.
 *
 * 2026-09-19 (this session, eleventh follow-up — Generic Overview
 * refinement): full redesign per feedback, four changes:
 *  1. The ingredient list and MOA text no longer share one toggle look.
 *     Ingredients now use ChipToggle (a "+N more" / "Show less" chip,
 *     tinted blue, sitting inline as the last chip in the wrapped row —
 *     see InlineTruncatedList in sectionPrimitives.jsx). MOA now uses
 *     TextToggle (plain bold blue "More"/"Less" text, no chevron, directly
 *     under the paragraph) so it reads as subordinate to the content
 *     instead of a separate navigation row.
 *  2. MOA truncation switched from a 30-word cutoff to a real ~3-line
 *     visual clamp (CSS -webkit-line-clamp), so the cutoff always matches
 *     what's visually shown regardless of word length. Whether the toggle
 *     renders at all is now decided by measuring the clamped paragraph's
 *     scrollHeight vs. clientHeight after render, not a word count.
 *  3. Section restructured into three explicit blocks — Active Ingredients,
 *     Mechanism of Action, Classification — each its own <div> with
 *     consistent var(--space-4) spacing between them, giving the three
 *     groups distinct visual identity instead of a single flowing block.
 *     A small "Classification" label was added above the card to match
 *     the "Active ingredient(s)" label's treatment.
 *  4. The Class/Subclass placeholder pills are now a single bordered
 *     ClassificationCard (sectionPrimitives.jsx) instead of two floating
 *     pill tags — same placeholder values, purely visual, no data change
 *     (subclass still isn't real data yet, plan §11.5).
 * Blue tokens used throughout (var(--color-accent) / var(--color-accent-
 * light)) come from globals.css and are already dark-mode aware — no
 * hardcoded colors needed.
 *
 * 2026-09-19 (this session, twelfth follow-up): reverted point 4 above —
 * back to the original two floating Class/Subclass pills, per feedback.
 * ClassificationCard is left defined in sectionPrimitives.jsx (unused by
 * this file now) rather than removed, since removing it wasn't asked for.
 *
 * 2026-09-19 (this session, thirteenth follow-up): two MOA changes per
 * feedback:
 *  1. The MOA text itself is now tappable — a single tap expands it, a
 *     second tap collapses it — same handler as the "More"/"Less"
 *     TextToggle below the text, which still works as its own separate
 *     tap target too.
 *  2. The collapse motion is smoother: clamping used to re-apply to the
 *     text the instant the toggle was clicked, so the text itself snapped
 *     to 3 lines before the box had shrunk to match. A new `moaClamped`
 *     state now decouples the two — closing keeps the text fully laid out
 *     (unclamped) while the box animates its height down around it, and
 *     the clamp only re-applies once that animation finishes. Opening is
 *     unaffected (it already unclamped immediately, which was already
 *     smooth).
 *
 * 2026-09-19 (this session, fourteenth follow-up): "Similar Brands" now has
 * tap feedback matching SharedDrugCard.jsx's existing pressed-state pattern
 * (muted background tint + scale(0.99) on press, same shared motion
 * tokens), instead of no visual feedback at all on tap. Padding/negative-
 * margin added so the tint has room without shifting the button's visual
 * position in the row.
 *
 * 2026-09-23: MOA's reveal used its own bespoke animation (a box whose
 * `height` grows/shrinks via a frozen-then-retargeted inline style, timed
 * with a setTimeout to re-clamp the text after) — a different mechanism
 * from every truncating list elsewhere in the app (Uses/Side Effects/
 * Contraindications), which fade the revealed content in/out via opacity
 * (two-frame `requestAnimationFrame`, 0.2s ease), gated by a `showX`/
 * `xVisible` state pair. MOA has continuous text rather than discrete
 * items, so there's nothing to individually fade in the same shape — the
 * closest equivalent, and what's now built, is a cross-fade of the whole
 * paragraph: on toggle, fade out, swap the clamp state once the fade
 * finishes, then fade the (now expanded or re-clamped) text back in — same
 * `--space`-independent 0.2s ease opacity transition and two-frame RAF
 * used everywhere else. `moaBoxRef`/`moaClosedHeightRef`/the height
 * `useLayoutEffect` are gone with the box-height approach; the clamped-vs-
 * expanded `hasMore` measurement (decision 2, 2026-09-19) is unchanged —
 * still measured off the rendered clamp, not a word count. TextToggle's
 * own look (plain bold blue "More"/"Less", no chevron) is unchanged; this
 * only touches how the reveal itself animates.
 *
 * 2026-09-23 (follow-up): the fade-in on expand wasn't actually smooth —
 * the full text popped in at full opacity instead of fading. Cause: the
 * clamp styles (`display: '-webkit-box'`, etc.) were only applied while
 * collapsed, spread in conditionally — so expanding also toggled
 * `display` itself (`-webkit-box` → the paragraph's default `block`) at
 * the exact moment the opacity fade-in should have started, which reset
 * the in-flight CSS transition in testing. Fixed by keeping
 * `display`/`WebkitBoxOrient`/`overflow` constant in both states and only
 * changing `WebkitLineClamp`'s value (the line count, or `'unset'` when
 * expanded) — now only `opacity` ever changes when toggling, so the
 * transition isn't interrupted.
 *
 * 2026-09-23 (follow-up 2): still flashed after the fix above. Real cause:
 * the double-`requestAnimationFrame` used to delay the fade-in a frame
 * wasn't actually guaranteeing the browser had painted the just-flipped
 * clamp state first — removing the line-clamp is a real reflow, and on a
 * loaded frame that reflow can still be pending when the second rAF
 * fires, so the browser collapses the opacity-0 "before" frame and the
 * opacity-1 "after" frame into one paint, skipping the transition
 * entirely. Replaced the second rAF with a forced synchronous reflow
 * (`moaTextRef.current.offsetHeight`, read then discarded) inside the
 * first rAF, immediately before setting the opacity back to 1 — the read
 * forces the browser to finish computing the new layout right then,
 * before the opacity change, so there's now a real "before" frame for it
 * to fade from. Same fix applies to the collapse direction.
 *
 * 2026-09-27 (class/subclass wiring): the Class/Subclass pills below are no
 * longer static placeholders — they now read the real `class`/`subclass`
 * fields off the drug object (queries.js added `subclass` to the select and
 * mapper this same session; `class` was already wired). Both columns are
 * still being populated (drug_group_categorization project, in progress),
 * so each pill only renders when its own field has a value, and the whole
 * block hides when neither does — same hide-when-empty convention as the
 * Mechanism of Action block above. Visual layout (floating pills, pillStyle)
 * is unchanged.
 *
 * 2026-10-03 (you are here card): the open drug is now passed to the brands
 * sheet (currentDrug) so the Similar list can show it highlighted.
 *
 * 2026-10-02 (Related drugs, Alternatives lookup):
 *  - New 'alternatives' prop (brands in the same class and subclass, built
 *    in DrugDetailScreen.jsx). The top-right button is renamed 'Similar
 *    Brands' -> 'Related drugs' and now shows when either list has brands.
 *  - The two floating Class/Subclass pills are replaced by one bordered
 *    card with two stacked rows (class on top, subclass below, no captions),
 *    so long names wrap instead of being cut off. The subclass row is
 *    tappable only when there are Alternatives: it opens the brands sheet
 *    on its Alternatives tab. Otherwise it renders as a plain row like the
 *    class row. The class row is a plain label for now.
 *  - Sheet now opens on a chosen tab ('similar' or 'alternatives') via
 *    BrandsBottomSheet's new initialTab prop.
 *
 * 2026-10-03 (Related drugs pill, class sheet, card look):
 *  - 'Related drugs' is now a filled blue pill (same top-right spot), so it
 *    is the first thing the eye lands on in this section. It has no count:
 *    a count tag was tried the same day and removed.
 *  - The Class row is now tappable and opens the new ClassBottomSheet.jsx
 *    (every subclass in the class, then the drugs in the one picked). It is
 *    only tappable when the new 'classDrugs' prop has drugs in it. The
 *    Subclass row still opens the Alternatives tab, as before.
 *  - The two-row card now has its own tinted background (the plain accent
 *    tint; a stronger blue was tried the same day and put back because it
 *    was too loud) so it stands out from the page. Both rows share
 *    one text colour, and a blue arrow on whichever row can be tapped. Each
 *    row is the new CardRow below.
 *  - Tree look: the Subclass row hangs under the Class row, indented with an
 *    elbow line (like a folder tree), in a lighter, smaller type, while the
 *    Class row is bolder. The line between the two rows is gone, since the
 *    elbow does that job. With no class, the subclass row stands alone: no
 *    indent, no elbow.
 *  - The Mechanism of Action 'More' / 'Less' toggle is lighter (weight 500
 *    instead of 700) so it no longer competes with the card.
 *
 * 2026-10-03 (tree spacing): class and subclass rows sit closer together
 * (row padding 10 -> 8, no gap between rows); the line geometry follows.
 *
 * 2026-10-03 (ingredient hierarchy): the ingredient chip is now the focus of
 * the card, and the two things next to it step back:
 *  - Chip size follows the ingredient count: 1 = large, 2 = medium, 3 or more
 *    = the old compact size (so a long combo never takes over the card).
 *  - 'Related drugs' is a small soft blue-tinted pill instead of solid blue.
 *  - Class/Subclass tree: grey backing removed, arrows grey (blue is kept for
 *    'Related drugs' and 'More'), class name medium weight instead of bold,
 *    and a thin divider line above the tree. Pressed rows still tint blue.
 *
 * 2026-10-03 (tree redesign): the old elbow looked fragmented — a short stub
 * that started mid-row and didn't touch the Class row. Now:
 *  - The card border, tint and clipping are gone; the rows sit directly on
 *    the page.
 *  - With both a class and a subclass: a small dot before the class name and
 *    ONE continuous line from it, down and curving into the subclass name.
 *    The line is drawn as two halves (one in each row) at the same spot, so
 *    it stays joined even when a long name wraps to two lines.
 *  - A row you can tap has a soft grey backing and a blue arrow; one you
 *    can't is plain text, no backing, no arrow.
 *  - Class only or subclass only: single bold row, flush left, no dot, no line.
 *  - Subclass row is smaller and lighter; class row stays bold.
 *
 * 2026-10-04 (tree icons): each row now starts with a small icon: the
 * stacked-layers icon in the class colour (--color-class) for the class, the
 * molecule icon in the app blue for the subclass (the same two icons the
 * search cards and the class sheet use). The dot is gone; the connecting line
 * now starts right under the class icon, runs down and curves into the
 * subclass icon, and is the same blue as the subclass icon. The subclass stays
 * indented, smaller and lighter. Tapping, arrows and what opens are unchanged.
 *
 * 2026-10-04 (Search mode pop-up): CardRow is now exported, so the Drugs
 * screen's Search mode pop-up (SearchModeInfoSheet.jsx) draws the same
 * Class/Subclass tree. Nothing about how it looks or works here changed.
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { FlaskConical, ChevronRight, Layers } from 'lucide-react'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import ClassBottomSheet, { MoleculeIcon } from './ClassBottomSheet.jsx'
import { InlineTruncatedList, IngredientChip, TextToggle } from './sectionPrimitives.jsx'
import { toTitleCase } from '../../../utils/drugTitleFormat.js'

// One row of the Class/Subclass tree. A button with a quiet grey arrow when
// onClick is given, otherwise plain text with no arrow (2026-10-03 hierarchy
// pass: no backing and no blue, so the ingredient name stays the focus).
// 2026-10-04 (icons on the line): each row starts with a small icon: the
// stacked-layers icon in the class colour for the Class row, the molecule icon
// in the app blue for the Subclass row (the same two icons the search cards and
// the class sheet use). The connecting line now starts right under the class
// icon (no dot), runs straight down and curves into the subclass icon, and is
// the same blue as the subclass icon. 'hasChild' marks a Class row with a
// Subclass under it (it draws the straight part); 'child' is the Subclass row
// under a Class row (indented, smaller and lighter, it draws the curve). The
// two parts sit at the same spot, so they join into one unbroken line even when
// a long name wraps to two lines. A row with no partner (class only, or
// subclass only) has no line and no indent. 'kind' ('class' | 'subclass') picks
// the icon; leave it off for no icon. Pressed feedback is a slightly deeper
// tint plus a tiny shrink.
const ROW_GAP    = 0      // space between the two rows (the line bridges it)
const LINE_COLOR = 'var(--color-accent)'
const LINE_X     = 12     // middle of the class icon: where the vertical line sits
const MID        = 18     // middle of a row's first text line (8 padding + 10)
const CLASS_ICON = 16
const SUB_ICON   = 14
const CHILD_PAD  = 24     // left space of the Subclass row (where its icon starts)
const LINE_GAP   = 3      // air between the line and the icon it touches

const ROW_ICONS = {
  class:    { Icon: Layers,       color: 'var(--color-class)'  },
  subclass: { Icon: MoleculeIcon, color: 'var(--color-accent)' },
}

export function CardRow({ label, onClick, ariaLabel, child = false, hasChild = false, kind = null }) {
  const [pressed, setPressed] = useState(false)
  const iconDef  = kind ? ROW_ICONS[kind] : null
  const iconSize = child ? SUB_ICON : CLASS_ICON
  const base = {
    position:       'relative',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    gap:            12,
    width:          '100%',
    boxSizing:      'border-box',
    minHeight:      36,
    padding:        child ? `8px 4px 8px ${CHILD_PAD}px` : '8px 4px',
    border:         'none',
    borderRadius:   10,
    fontFamily:     'var(--font-body)',
    fontSize:       child ? 13 : 14,
    fontWeight:     500,
    lineHeight:     '20px',
    textAlign:      'left',
    color:          child ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
    backgroundColor: 'transparent',
  }
  // Class row (when a subclass sits under it): the straight part of the line,
  // from just under the class icon down past the row's bottom edge to meet the
  // Subclass row's curve.
  const stem = hasChild ? (
    <span
      aria-hidden="true"
      style={{
        position:   'absolute',
        left:       LINE_X - 0.75,
        top:        MID + CLASS_ICON / 2 + LINE_GAP,
        bottom:     -ROW_GAP,
        width:      0,
        borderLeft: `1.5px solid ${LINE_COLOR}`,
      }}
    />
  ) : null
  // Subclass row (under a Class row): the line comes down from the row's top
  // edge to the middle of the first text line, then curves right to the icon.
  const elbow = child ? (
    <span
      aria-hidden="true"
      style={{
        position:     'absolute',
        left:         LINE_X - 0.75,
        top:          0,
        width:        CHILD_PAD - LINE_GAP - (LINE_X - 0.75),
        height:       MID,
        boxSizing:    'border-box',
        borderLeft:   `1.5px solid ${LINE_COLOR}`,
        borderBottom: `1.5px solid ${LINE_COLOR}`,
        borderBottomLeftRadius: 8,
      }}
    />
  ) : null
  // Icon + name together. The icon is lined up with the first line of the name,
  // so a long name that wraps keeps the icon at the top.
  const content = (
    <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      {iconDef && (
        <span
          aria-hidden="true"
          style={{
            display:    'flex',
            flexShrink: 0,
            marginTop:  (20 - iconSize) / 2,
            color:      iconDef.color,
          }}
        >
          <iconDef.Icon size={iconSize} strokeWidth={1.9} color={iconDef.color} />
        </span>
      )}
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  )
  if (!onClick) return <div style={base}>{stem}{elbow}{content}</div>
  return (
    <button
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onPointerCancel={() => setPressed(false)}
      aria-label={ariaLabel}
      style={{
        ...base,
        cursor:          'pointer',
        WebkitTapHighlightColor: 'transparent',
        backgroundColor: pressed ? 'var(--color-accent-light)' : 'transparent',
        transform:       pressed ? 'scale(0.99)' : 'scale(1)',
        transition:      'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
      }}
    >
      {stem}{elbow}
      {content}
      <ChevronRight size={child ? 14 : 16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
    </button>
  )
}

// Mechanism of Action visual clamp (Generic Overview refinement, decision 2
// above) — ~3 lines at this block's font-size/line-height, replacing the old
// 30-word cutoff so the truncation always matches what's actually shown.
const MOA_CLAMP_LINES = 3

export default function GenericOverviewSection({ drug, siblings = [], alternatives = [], classDrugs = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)
  // Which tab the brands sheet opens on: 'similar' or 'alternatives'.
  const [sheetTab, setSheetTab] = useState('similar')
  // Whether the class sheet (subclass list, then drugs) is open.
  const [classOpen, setClassOpen] = useState(false)
  // moaOpen: expanded (true) or clamped-to-3-lines (false) — this directly
  // drives which style the paragraph renders with. moaVisible: the
  // cross-fade opacity, same showX/xVisible shape used by every other
  // truncating list on this page.
  const [moaOpen,    setMoaOpen]    = useState(false)
  const [moaVisible, setMoaVisible] = useState(true)
  const [moaHasMore, setMoaHasMore] = useState(false)
  // Tap feedback for the "Related drugs" pill — pressed/pointer-event
  // pattern like SharedDrugCard.jsx (slight shrink, 2026-10-03: plus a faint
  // fade, since the pill is filled and a muted tint would not show).
  const [similarBrandsPressed, setSimilarBrandsPressed] = useState(false)

  const moaTextRef  = useRef(null)
  const moaTimerRef = useRef(null)
  const moaRafRef   = useRef(null)

  useEffect(() => () => {
    clearTimeout(moaTimerRef.current)
    cancelAnimationFrame(moaRafRef.current)
  }, [])

  // Measured once per drug, while the text is in its natural closed
  // (clamped) state: whether it actually overflows that clamp at all —
  // this, not a word count, decides whether the toggle renders.
  useLayoutEffect(() => {
    const text = moaTextRef.current
    if (!text) return
    setMoaHasMore(text.scrollHeight > text.clientHeight + 1)
  }, [drug?.mechanismOfAction])

  function handleMoaToggle() {
    clearTimeout(moaTimerRef.current)
    cancelAnimationFrame(moaRafRef.current)
    // Fade the current (clamped or expanded) text out, swap the clamp
    // state once that finishes, then fade the new state back in — the
    // same cross-fade shape as the extra-items reveal in Uses/Side
    // Effects/Contraindications, just applied to one paragraph instead of
    // a list of rows.
    setMoaVisible(false)
    moaTimerRef.current = setTimeout(() => {
      setMoaOpen(o => !o)
      moaRafRef.current = requestAnimationFrame(() => {
        // Force the browser to actually compute/paint the just-flipped
        // clamp state (a real reflow — the line count just changed)
        // before starting the opacity transition. Without this read, the
        // reflow and the opacity flip can land in the same paint, and the
        // browser skips straight to the end state instead of animating
        // between them — seen as a flash/pop rather than a fade.
        if (moaTextRef.current) void moaTextRef.current.offsetHeight
        setMoaVisible(true)
      })
    }, 200)
  }

  const {
    genericName,
    ingredients,
    mechanismOfAction,
    class: drugClass,
    subclass,
  } = drug

  // Combo generics (2+ active ingredients) — ingredients is now populated
  // for single-ingredient generics too (a 1-element array), so the combo
  // check needs more than one element, not just a non-empty array (CMS
  // Library Identity section, step 5).
  const isCombo = Array.isArray(ingredients) && ingredients.length > 1

  // Sheet entry points. The top-right button opens on Similar when there
  // are same-generic brands, otherwise on Alternatives (the sheet itself
  // also falls back, this just keeps the intent explicit). The subclass
  // row always opens on Alternatives.
  const hasAlternatives = alternatives.length > 0
  function openRelated() {
    setSheetTab(siblings.length > 0 ? 'similar' : 'alternatives')
    setBrandsOpen(true)
  }
  function openAlternatives() {
    setSheetTab('alternatives')
    setBrandsOpen(true)
  }
  // The class row opens the class sheet whenever the class has any drugs
  // with a subclass filled in.
  const hasClassList = classDrugs.length > 0

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>

      {/* ── Block 1: Active Ingredients ─────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-4)' }}>

        {/* Top row: flask icon + "Active ingredient(s)" label + Available
            Brands link (label moved from DosingSection.jsx, 4.5; restyled
            to match mockup). 2026-09-18 (this session): FlaskConical moved
            here from the name row below, per feedback — now sits right
            before the label instead of next to the chip(s). */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   'var(--space-2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <FlaskConical size={12} color="var(--color-text-secondary)" />
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Active ingredient{isCombo ? 's' : ''}
            </span>
          </div>

          {(siblings.length > 0 || hasAlternatives) && (
            <button
              onClick={openRelated}
              onPointerDown={() => setSimilarBrandsPressed(true)}
              onPointerUp={() => setSimilarBrandsPressed(false)}
              onPointerLeave={() => setSimilarBrandsPressed(false)}
              onPointerCancel={() => setSimilarBrandsPressed(false)}
              style={{
                display:         'flex',
                alignItems:      'center',
                gap:             2,
                border:          'none',
                cursor:          'pointer',
                padding:         '4px 6px 4px 10px',
                borderRadius:    'var(--radius-full)',
                fontFamily:      'var(--font-body)',
                fontSize:        12,
                fontWeight:      600,
                color:           'var(--color-accent)',
                backgroundColor: 'var(--color-accent-light)',
                WebkitTapHighlightColor: 'transparent',
                opacity:         similarBrandsPressed ? 0.9 : 1,
                transform:       similarBrandsPressed ? 'scale(0.97)' : 'scale(1)',
                transition:      'opacity var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
              }}
            >
              Related drugs
              <ChevronRight size={13} />
            </button>
          )}
        </div>

        {/* Ingredient chip(s) — combo path truncates past 5 with the
            inline ChipToggle ("+N more" / "Show less"); single-ingredient
            path renders one chip, no toggle needed. */}
        {isCombo
          ? <InlineTruncatedList
              items={ingredients.map(toTitleCase)}
              max={5}
              size={ingredients.length === 2 ? 'md' : 'sm'}
            />
          : <IngredientChip size="lg">{toTitleCase(genericName)}</IngredientChip>
        }
      </div>

      {/* ── Block 2: Mechanism of Action ────────────────────────────────── */}
      {/* Directly under the ingredients block, no label — clamped to ~3
          lines visually; TextToggle (plain bold blue text, no chevron)
          appears only when the text actually overflows that clamp. Reveal
          is a cross-fade (opacity, 0.2s ease) — same animation style as
          the extra-items reveal in Uses/Side Effects/Contraindications. */}
      {mechanismOfAction && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <p
            ref={moaTextRef}
            onClick={moaHasMore ? handleMoaToggle : undefined}
            style={{
              fontSize:        14,
              color:           'var(--color-text-primary)',
              lineHeight:      1.6,
              margin:          0,
              cursor:          moaHasMore ? 'pointer' : 'default',
              opacity:         moaVisible ? 1 : 0,
              transition:      'opacity 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
              // display/WebkitBoxOrient/overflow stay constant across the
              // toggle — only WebkitLineClamp's value changes. Switching
              // `display` itself (as the previous version did, adding it
              // only while clamped) reset the in-flight opacity
              // transition in some WebKit builds, so the expanded text
              // popped straight to full opacity instead of fading in —
              // this keeps the box model identical in both states so only
              // opacity is ever what's animating.
              display:         '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: moaOpen ? 'unset' : MOA_CLAMP_LINES,
              overflow:        'hidden',
            }}
          >
            {mechanismOfAction}
          </p>
          {moaHasMore && (
            <TextToggle
              open={moaOpen}
              onClick={handleMoaToggle}
              weight={500}
            />
          )}
        </div>
      )}

      {/* -- Class/Subclass tree (4.8) — wired to real data 2026-09-27; two
            stacked rows (2026-10-02). 2026-10-03 (tree redesign): no card
            border or tint any more — the rows sit straight on the page,
            joined by one continuous line. Each row only renders when
            its own field has a value, and the whole card hides when neither
            does (same hide-when-empty convention as the Mechanism of Action
            block above). The class row opens the class sheet when the class
            has drugs with a subclass; the subclass row opens the
            Alternatives tab when this drug has Alternatives. A row that
            cannot be opened is a plain row with no arrow. -- */}
      {(drugClass || subclass) && (
        <div style={{
          display:       'flex',
          flexDirection: 'column',
          gap:           ROW_GAP,
          marginTop:     'var(--space-2)',
          paddingTop:    'var(--space-2)',
          borderTop:     '0.5px solid var(--color-border)',
          marginBottom:  'var(--space-3)',
        }}>
          {drugClass && (
            <CardRow
              label={drugClass}
              onClick={hasClassList ? () => setClassOpen(true) : undefined}
              ariaLabel={`Show drug families in ${drugClass}`}
              hasChild={!!subclass}
              kind="class"
            />
          )}
          {subclass && (
            <CardRow
              label={subclass}
              onClick={hasAlternatives ? openAlternatives : undefined}
              ariaLabel={`Show alternatives in ${subclass}`}
              child={!!drugClass}
              kind="subclass"
            />
          )}
        </div>
      )}

      <BrandsBottomSheet
        isOpen={brandsOpen}
        onClose={() => setBrandsOpen(false)}
        siblings={siblings}
        currentDrug={drug}
        alternatives={alternatives}
        initialTab={sheetTab}
        onSelectBrand={onSelectBrand}
      />

      {drugClass && (
        <ClassBottomSheet
          isOpen={classOpen}
          onClose={() => setClassOpen(false)}
          classLabel={drugClass}
          classDrugs={classDrugs}
          currentDrug={drug}
          onSelectBrand={onSelectBrand}
        />
      )}

    </div>
  )
}

