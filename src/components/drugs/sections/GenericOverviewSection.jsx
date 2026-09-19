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
 */

import { useState } from 'react'
import { FlaskConical, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import { InlineTruncatedList, IngredientChip } from './sectionPrimitives.jsx'
import { toTitleCase } from '../../../utils/drugTitleFormat.js'

const pillStyle = {
  fontSize:        11,
  fontWeight:      600,
  backgroundColor: '#F3F4F6',
  color:           '#6B7280',
  padding:         '2px 10px',
  borderRadius:    'var(--radius-full)',
}

// Mechanism of Action app-side truncation (decision 5) — 30 words, same
// "See more"/"See less" toggle pattern UsesSection.jsx already uses.
const MOA_TRUNCATE_AT = 30

export default function GenericOverviewSection({ drug, siblings = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)
  const [moaOpen,    setMoaOpen]    = useState(false)

  const {
    genericName,
    ingredients,
    mechanismOfAction,
  } = drug

  const moaWords   = mechanismOfAction ? mechanismOfAction.trim().split(/\s+/).filter(Boolean) : []
  const moaHasMore = moaWords.length > MOA_TRUNCATE_AT
  const moaText     = moaOpen || !moaHasMore
    ? mechanismOfAction
    : moaWords.slice(0, MOA_TRUNCATE_AT).join(' ') + '…'

  // Combo generics (2+ active ingredients) — ingredients is now populated
  // for single-ingredient generics too (a 1-element array), so the combo
  // check needs more than one element, not just a non-empty array (CMS
  // Library Identity section, step 5).
  const isCombo = Array.isArray(ingredients) && ingredients.length > 1

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>

      {/* -- Top row: flask icon + "Active ingredient(s)" label + Available
            Brands link (label moved from DosingSection.jsx, 4.5; restyled
            to match mockup). 2026-09-18 (this session): FlaskConical moved
            here from the name row below, per feedback — now sits right
            before the label instead of next to the chip(s). -- */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FlaskConical size={12} color="var(--color-text-secondary)" />
          <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Active ingredient{isCombo ? 's' : ''}
          </span>
        </div>

        {siblings.length > 0 && (
          <button
            onClick={() => setBrandsOpen(true)}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        2,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              fontFamily: 'var(--font-body)',
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-text-primary)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            Similar Brands
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* -- Name row: generic/combo name, chip-styled either way (see
          2026-09-18 notes above) -- */}
      <div style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}>
        <div>
          {isCombo
            ? <InlineTruncatedList items={ingredients.map(toTitleCase)} max={5} />
            : <IngredientChip>{toTitleCase(genericName)}</IngredientChip>
          }
        </div>
      </div>

      {/* -- Mechanism of Action — directly under the name, no label.
            App-side truncation at 30 words (decision 5) — button omitted
            entirely (not just inert) when already under the limit, same
            convention UsesSection.jsx uses. -- */}
      {mechanismOfAction && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <p style={{
            fontSize:   14,
            color:      'var(--color-text-primary)',
            lineHeight: 1.6,
            margin:     0,
          }}>
            {moaText}
          </p>
          {moaHasMore && (
            <button
              onClick={() => setMoaOpen(o => !o)}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            4,
                width:          '100%',
                marginTop:      'var(--space-2)',
                background:     'none',
                border:         'none',
                cursor:         'pointer',
                padding:        0,
                fontFamily:     'var(--font-body)',
                fontSize:       13,
                fontWeight:     600,
                color:          'var(--color-text-secondary)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {moaOpen ? 'See less' : 'See more'}
              {moaOpen
                ? <ChevronUp size={14} />
                : <ChevronDown size={14} />
              }
            </button>
          )}
        </div>
      )}

      {/* -- Placeholder Class/Subclass tags (4.8) — static labels, not
            real data yet; subclass column deferred, plan §11.5 -- */}
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
