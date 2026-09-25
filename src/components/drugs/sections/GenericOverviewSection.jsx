/**
 * src/components/drugs/sections/GenericOverviewSection.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.1
 * (plan decisions 4.5, 4.7–4.9 — see STEPS_DRUG_DETAIL.md §1.1, plan §10 Section 8)
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
 */

import { useState, useRef, useLayoutEffect, useEffect } from 'react'
import { FlaskConical, ChevronRight } from 'lucide-react'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import { InlineTruncatedList, IngredientChip, TextToggle } from './sectionPrimitives.jsx'
import { toTitleCase } from '../../../utils/drugTitleFormat.js'

const pillStyle = {
  fontSize:        11,
  fontWeight:      600,
  backgroundColor: '#F3F4F6',
  color:           '#6B7280',
  padding:         '2px 10px',
  borderRadius:    'var(--radius-full)',
}

// Mechanism of Action visual clamp (Generic Overview refinement, decision 2
// above) — ~3 lines at this block's font-size/line-height, replacing the old
// 30-word cutoff so the truncation always matches what's actually shown.
const MOA_CLAMP_LINES = 3

export default function GenericOverviewSection({ drug, siblings = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)
  // moaOpen: expanded (true) or clamped-to-3-lines (false) — this directly
  // drives which style the paragraph renders with. moaVisible: the
  // cross-fade opacity, same showX/xVisible shape used by every other
  // truncating list on this page.
  const [moaOpen,    setMoaOpen]    = useState(false)
  const [moaVisible, setMoaVisible] = useState(true)
  const [moaHasMore, setMoaHasMore] = useState(false)
  // Tap feedback for the "Similar Brands" button — same pressed/pointer-
  // event pattern SharedDrugCard.jsx uses (muted background tint + a
  // subtle scale(0.99), same shared motion tokens), matched here so this
  // button feels consistent with the rest of the app's tappable rows.
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
        moaRafRef.current = requestAnimationFrame(() => setMoaVisible(true))
      })
    }, 200)
  }

  const {
    genericName,
    ingredients,
    mechanismOfAction,
  } = drug

  // Combo generics (2+ active ingredients) — ingredients is now populated
  // for single-ingredient generics too (a 1-element array), so the combo
  // check needs more than one element, not just a non-empty array (CMS
  // Library Identity section, step 5).
  const isCombo = Array.isArray(ingredients) && ingredients.length > 1

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
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Active ingredient{isCombo ? 's' : ''}
            </span>
          </div>

          {siblings.length > 0 && (
            <button
              onClick={() => setBrandsOpen(true)}
              onPointerDown={() => setSimilarBrandsPressed(true)}
              onPointerUp={() => setSimilarBrandsPressed(false)}
              onPointerLeave={() => setSimilarBrandsPressed(false)}
              onPointerCancel={() => setSimilarBrandsPressed(false)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          2,
                background:   'none',
                border:       'none',
                cursor:       'pointer',
                padding:      '4px 6px',
                margin:       '-4px -6px',
                borderRadius: 'var(--radius-sm)',
                fontFamily:   'var(--font-body)',
                fontSize:     13,
                fontWeight:   600,
                color:        'var(--color-text-primary)',
                WebkitTapHighlightColor: 'transparent',
                backgroundColor: similarBrandsPressed ? 'var(--color-surface-muted)' : 'transparent',
                transform:       similarBrandsPressed ? 'scale(0.99)' : 'scale(1)',
                transition:      'background-color var(--motion-fast) var(--ease-settle), transform var(--motion-fast) var(--ease-settle)',
              }}
            >
              Similar Brands
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Ingredient chip(s) — combo path truncates past 5 with the
            inline ChipToggle ("+N more" / "Show less"); single-ingredient
            path renders one chip, no toggle needed. */}
        {isCombo
          ? <InlineTruncatedList items={ingredients.map(toTitleCase)} max={5} />
          : <IngredientChip>{toTitleCase(genericName)}</IngredientChip>
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
              fontSize:   14,
              color:      'var(--color-text-primary)',
              lineHeight: 1.6,
              margin:     0,
              cursor:     moaHasMore ? 'pointer' : 'default',
              opacity:    moaVisible ? 1 : 0,
              transition: 'opacity 0.2s ease',
              WebkitTapHighlightColor: 'transparent',
              ...(!moaOpen ? {
                display:         '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: MOA_CLAMP_LINES,
                overflow:        'hidden',
              } : {}),
            }}
          >
            {mechanismOfAction}
          </p>
          {moaHasMore && (
            <TextToggle
              open={moaOpen}
              onClick={handleMoaToggle}
            />
          )}
        </div>
      )}

      {/* -- Placeholder Class/Subclass tags (4.8) — reverted back to the
            original floating pills per feedback (the compact card version
            didn't land). Static labels, not real data yet; subclass column
            deferred, plan §11.5. -- */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <span style={pillStyle}>Class</span>
        <span style={pillStyle}>Subclass</span>
      </div>

      <BrandsBottomSheet
        isOpen={brandsOpen}
        onClose={() => setBrandsOpen(false)}
        siblings={siblings}
        onSelectBrand={onSelectBrand}
      />

    </div>
  )
}
