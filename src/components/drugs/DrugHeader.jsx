/**
 * src/components/drugs/DrugHeader.jsx
 * Phase 2G — Drug Detail Screen
 *
 * 2026-07-20 (drug_library_ui_ux, plan §7 step 2b, decisions 4.22–4.24):
 * full shell rebuild. Was a non-sticky bordered/shadowed card sitting in
 * the normal page flow; now `position: sticky`, rounded-bottom, soft
 * shadow, no hard border. Row 1's layout (Back + category group on the
 * left, Share + Favourite on the right) is copied directly from
 * ConditionDetailScreen.jsx's own DetailHeader so the two peer detail
 * pages' headers stay visually consistent — minus the tab strip, since
 * this page has none (per 4.23, this header also skips
 * ConditionDetailScreen's measured-height/internal-scroll-box machinery
 * entirely, since there are no tabs here for it to protect). Category
 * display switched from the old static config/categories.js lookup +
 * hardcoded hex map over to the live useCategories()/color-token system
 * DrugsScreen.jsx's CategoryRow already uses, matching decision 4.30's
 * precedent. Favourite icon switched from the old star to the heart
 * icon/color token DetailHeader uses, for the same consistency reason.
 * Row 2 (brand name + strength + form) scrolls horizontally instead of
 * wrapping/truncating for long names or combo generics (4.22) — depends
 * on step 0a's tradenameClean/strengthValue/strengthUnit/strengthBasis
 * fields, and needs its own `touchAction: 'pan-x'` since the sticky
 * header around it is `touchAction: 'none'` (to stop an accidental
 * page-drag/pull-to-refresh starting on empty header space, same as
 * DetailHeader) — without resetting it locally, that would also block
 * sideways swiping on this one scrollable row. Row 3 is the generic-name
 * line, content unchanged. Manufacturer/price/pack-size meta line removed
 * entirely, per user instruction. Share ships as a visual stub only — no
 * real share-image concept exists yet for a single drug (4.24).
 *
 * CORRECTED 2026-07-20 (still same session, before this step was marked
 * done): staying inside Layout's normal flow was assumed to still read as
 * a full-width header — it doesn't. Layout.jsx wraps all page content in
 * a <main> that's centered and capped at 680px, so the sticky header
 * above was only ever stretching to that same 680px column, not the true
 * screen edge (confirmed via screenshot — read as a floating rounded
 * card, not a header). Fixed with a standard "break out of container"
 * treatment: the outer <header> now cancels Layout's <main> width/margin
 * via the `100vw` + `calc(50% - 50vw)` margin trick, so it spans the full
 * viewport regardless of where it sits in the page; the original
 * maxWidth: 680, centered inner <div> is kept unchanged so the header's
 * actual content still lines up with the rest of the page's column.
 * Layout.jsx itself is untouched — lower churn than removing Layout from
 * DrugDetailScreen.jsx, and doesn't change how any other page works.
 *
 * CORRECTED 2026-07-20: row 2's brand name + strength + form suffix was
 * built from guessed logic (raw strengthValue/strengthUnit/strengthBasis
 * concatenation) instead of SharedDrugCard.jsx's real, several-times-
 * corrected formatting (pack size, fill volume, form-modifier
 * abbreviations, injection route detail, dash-only-when-needed spacing).
 * That logic is now shared via utils/drugTitleFormat.js (extracted from
 * SharedDrugCard.jsx this same step) so both call sites stay identical
 * instead of drifting apart on the next correction. Brand name is now
 * title-cased the same way SharedDrugCard displays it, for consistency.
 *
 * Props:
 *   drug          — flat drug object from DrugContext
 *   isFavourited  — boolean
 *   onBack        — () => void
 *   onToggleFav   — () => void
 */

import { ArrowLeft, Share2, Heart } from 'lucide-react'
import { useCategories }            from '../../hooks/useCategories'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { resolveToken, FALLBACK_TOKEN } from '../../utils/specialtyTokens'
import { toTitleCase, getDrugTitleSuffix } from '../../utils/drugTitleFormat'

export default function DrugHeader({ drug, isFavourited, onBack, onToggleFav }) {
  const isDark = useIsDark()
  const { categories } = useCategories()

  const category  = categories.find(c => c.slug === drug.category)
  const iconType  = category?.icon_type || 'lucide'
  const iconValue = iconType === 'custom' ? (category?.icon_url || '') : (category?.icon_name || 'Pill')
  const colors    = resolveToken(category?.color_token || FALLBACK_TOKEN, isDark)

  // Brand name + strength + form suffix — same shared logic SharedDrugCard
  // uses for its title line (see utils/drugTitleFormat.js).
  const titleSuffix = getDrugTitleSuffix(drug)

  return (
    <header style={{
      position:        'sticky',
      top:             0,
      zIndex:          50,
      // Breaks out of Layout's centered, 680px-capped <main> so the header
      // spans the true viewport width — see CORRECTED note above. The
      // maxWidth: 680 inner wrapper below re-centers the actual content.
      width:           '100vw',
      marginLeft:      'calc(50% - 50vw)',
      marginRight:     'calc(50% - 50vw)',
      backgroundColor: 'var(--color-surface)',
      borderRadius:    '0 0 18px 18px',
      boxShadow:       '0 2px 6px rgba(0,0,0,0.05)',
      // Header has no scroll content of its own outside row 2 — without
      // this, a touch starting on empty header space has nothing local to
      // consume it and the browser treats it as a page drag (including
      // triggering pull-to-reload). Same fix as DetailHeader's own.
      touchAction:     'none',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '12px var(--space-6) var(--space-4)' }}>

        {/* Row 1: Back + category group (left), Share + Favourite (right) */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
            <button
              onClick={onBack}
              aria-label="Back"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-accent)', fontSize: 14, fontWeight: 500,
                fontFamily: 'var(--font-body)', padding: '4px 0',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
                flexShrink: 0,
              }}
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Back
            </button>

            {category && (
              <>
                {/* Dot divider — same muted treatment as DetailHeader's
                    Back/specialty separator. */}
                <span
                  aria-hidden="true"
                  style={{
                    width: 3, height: 3, borderRadius: '50%',
                    backgroundColor: 'var(--color-text-tertiary)',
                    opacity: 0.6, flexShrink: 0,
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, opacity: 0.75 }}>
                  <SpecialtyIcon iconType={iconType} iconValue={iconValue} size={11} color={colors.fg} />
                  <span style={{
                    fontSize: 12, fontWeight: 400, letterSpacing: '0.03em',
                    color: 'var(--color-text-secondary)', lineHeight: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {category.name_en}
                  </span>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            {/* Share — visual stub only, per 4.24. No real share-image
                concept exists yet for a single drug; wiring real behavior
                is deferred to a separate future task. */}
            <button
              aria-label="Share"
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: 'var(--color-text-tertiary)',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <Share2 size={20} strokeWidth={2} />
            </button>

            <button
              onClick={onToggleFav}
              aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                color: isFavourited ? 'var(--color-favourite)' : 'var(--color-text-tertiary)',
                transition: 'color 0.15s ease',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <Heart size={20} strokeWidth={2} fill={isFavourited ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Row 2: brand name + strength + form — horizontal scroll for
            long names/combo generics, never wraps/truncates/shrinks
            (4.22). touchAction reset to pan-x so sideways swiping here
            still works despite the header's own touchAction: 'none'. */}
        <div style={{
          display:                 'flex',
          alignItems:              'baseline',
          gap:                     6,
          overflowX:               'auto',
          whiteSpace:              'nowrap',
          scrollbarWidth:          'none',
          msOverflowStyle:         'none',
          WebkitOverflowScrolling: 'touch',
          touchAction:             'pan-x',
          marginBottom:            2,
        }}>
          <span style={{
            fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)',
            lineHeight: 1.2,
          }}>
            {toTitleCase(drug.tradenameClean)}
          </span>
          {titleSuffix && (
            <span style={{
              fontSize: 14, fontWeight: 500, color: 'var(--color-text-secondary)',
            }}>
              {titleSuffix}
            </span>
          )}
        </div>

        {/* Row 3: generic name */}
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--color-accent)',
        }}>
          {drug.genericName}
        </div>

      </div>
    </header>
  )
}
