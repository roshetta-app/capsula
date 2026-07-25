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
 */

import { useState } from 'react'
import { Atom, ChevronRight } from 'lucide-react'
import BrandsBottomSheet from './BrandsBottomSheet.jsx'
import { NotYetAdded, InlineTruncatedList } from './sectionPrimitives.jsx'
import { toTitleCase } from '../../../utils/drugTitleFormat.js'

const pillStyle = {
  fontSize:        11,
  fontWeight:      600,
  backgroundColor: '#F3F4F6',
  color:           '#6B7280',
  padding:         '2px 10px',
  borderRadius:    'var(--radius-full)',
}

export default function GenericOverviewSection({ drug, siblings = [], onSelectBrand }) {
  const [brandsOpen, setBrandsOpen] = useState(false)

  const {
    genericName,
    ingredients,
    mechanismOfAction,
  } = drug

  // Combo generics (2+ active ingredients) — ingredients is populated only
  // for combos, null otherwise (4.7).
  const isCombo = Array.isArray(ingredients) && ingredients.length > 0

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>

      {/* -- Top row: "Active ingredient(s)" label + Available Brands link
            (moved from DosingSection.jsx, 4.5; restyled to match mockup) -- */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Active ingredient{isCombo ? 's' : ''}
        </span>

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
            See Available Brands
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* -- Name row: fixed decorative icon (4.9) + generic/combo name -- */}
      <div style={{
        display:      'flex',
        alignItems:   'flex-start',
        gap:          'var(--space-3)',
        marginBottom: 'var(--space-3)',
      }}>
        <Atom size={22} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.4 }}>
          {isCombo
            ? <InlineTruncatedList items={ingredients.map(toTitleCase)} max={3} />
            : genericName
          }
        </div>
      </div>

      {/* -- Mechanism of Action — directly under the name, no label -- */}
      <div style={{ marginBottom: 'var(--space-3)' }}>
        {mechanismOfAction
          ? (
            <p style={{
              fontSize:   14,
              color:      'var(--color-text-primary)',
              lineHeight: 1.6,
              margin:     0,
            }}>
              {mechanismOfAction}
            </p>
          )
          : <NotYetAdded />
        }
      </div>

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
