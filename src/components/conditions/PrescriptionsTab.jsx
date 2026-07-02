import { useState } from 'react'
import { Shield } from 'lucide-react'
import PrescriptionSheetBlock from './PrescriptionSheetBlock'
import PrescriptionPills from './PrescriptionPills'
import PersonalNotes from './PersonalNotes'
import BlockRenderer from './BlockRenderer'
import { getRxBlocks } from '../../utils/blockFilters'

/**
 * PrescriptionsTab — Rx tab container (Phase 2.8 + Phase 2 CMS refactor).
 *
 * Phase 2 changes:
 *   - image_gallery and free_text_post blocks with context 'rx' now render
 *     in the Rx tab via BlockRenderer, positioned below the active sheet.
 *   - getRxBlocks() already returns these block types after the blockFilters.js
 *     update; this component just splits them out and renders them.
 *
 * Fix (rx-order):
 *   - Replaced separate rxExtras + rxNotes arrays with a single rxBelowSheet
 *     array. All non-sheet Rx blocks (notes, text posts, galleries) now render
 *     in true orderIndex order — exactly as arranged in the CMS.
 *   - Removed the hardcoded dashed separator that forced notes to always appear
 *     last; visual separation between blocks is now handled by each block's own
 *     component (NoteCallout already has sufficient top margin).
 *   - Removed NoteCallout import — BlockRenderer handles note_callout rendering.
 *
 * Design:
 *   - PersonalNotes section spacing tightened to match overall screen rhythm.
 *   - Medical disclaimer margin reduced to match.
 *   - Disclaimer split across two lines for better legibility.
 *
 * Personal Notes final polish pass:
 *   - Medical Disclaimer's marginTop increased from --space-4 to --space-8
 *     so Personal Notes reads as a complete, clearly separated standalone
 *     module rather than running straight into the disclaimer below it.
 *
 * Disclaimer redesign pass:
 *   - Rewritten as a calm, professional footnote instead of an alert —
 *     no card/background/border/shadow, neutral secondary text color
 *     throughout (icon + text), single flowing paragraph instead of two
 *     lines of differing hierarchy. Reads as a quiet footnote in a
 *     premium medical reference, not a warning banner.
 *
 * Disclaimer polish pass:
 *   - Copy tightened: "Clinical reference only." now carries Medium (500)
 *     weight as a lead-in, rest of the sentence stays Regular (400) —
 *     both in the same flowing <p>, no line break, no hierarchy split.
 *   - Icon swapped from ShieldCheck to plain Shield (outline only, no
 *     checkmark) per the "simple outline shield" spec.
 *   - Line-height tightened from 1.4 to 1.375 to reduce vertical space.
 *   - marginTop bumped --space-8 → --space-10 (32px → 40px, +8px) to
 *     better separate the disclaimer from Personal Notes above it.
 *   - paddingBottom bumped --space-6 → --space-8 (24px → 32px) so the
 *     footer has generous breathing room before the bottom nav/safe area.
 *
 * True page-footer pass:
 *   - Removed the heading row entirely ("Good Practice" title + BookOpen
 *     icon) — spec now explicitly forbids section headings, bold titles,
 *     and large icons for this element; it must read as a footnote, not
 *     a section.
 *   - Back to a single flowing sentence (title-less), Regular weight
 *     throughout, no inline spans for weight contrast.
 *   - Icon reverted BookOpen → Shield (simple outline), 20px → 18px,
 *     recolored: stays secondary/muted, now aligned with flex-start so
 *     it lines up with the first line of text rather than being centered
 *     against a title that no longer exists.
 *   - marginTop above the divider increased --space-10 → --space-12
 *     (40px → 48px) for a clearer break before this closing note.
 *   - paddingBottom reduced --space-12 → --space-6 (48px → 24px) — spec
 *     now asks for a compact footer, not a spacious one.
 *   - paddingTop between divider and text reduced --space-5 → --space-4
 *     (20px → 16px) to keep the footer visually tight/compact as a whole.
 *   - marginTop above the divider reduced --space-12 → --space-8 (48px →
 *     32px) — real-device review showed the gap from Personal Notes to
 *     the divider was too generous relative to the compact footer below it.
 *
 * Final quiet-footnote pass:
 *   - Divider removed entirely — spacing alone now separates the footer
 *     from Personal Notes, per updated spec ("remove the divider above
 *     the disclaimer entirely").
 *   - marginTop set to an exact 56px. No token in the --space-N scale
 *     lands on 56 (--space-12 is 48, next step up is --space-14 which
 *     doesn't exist), so a raw pixel value is used deliberately here
 *     rather than rounding to the nearest token.
 *   - paddingBottom set to --space-8 (32px), the low end of the
 *     requested 32-40dp range, keeping the footer's total footprint
 *     as light as the "intentionally low visual weight" goal asks for.
 *   - Added horizontal padding (--space-2, 8px each side) so the text
 *     block reads as a footer inset from the page edge rather than
 *     flush body content.
 *   - Icon: 18px → 16px, recolored secondary → tertiary (lowest-emphasis
 *     text color), strokeWidth explicitly set to 1.5 for a thinner line
 *     than the default 2, per "thin stroke" spec.
 *   - Text reverted to a two-weight single sentence: "Clinical reference
 *     only." at Medium (500), remainder at Regular (400) — same pattern
 *     used in an earlier pass, now paired with the lighter icon/spacing.
 *
 * Footer-metadata pass:
 *   - lineHeight switched from a unitless ratio (1.4) to an explicit
 *     19px, landing inside the requested 19-20sp absolute range rather
 *     than an approximate multiplier of the 13px font size.
 *   - Icon size 16px → 18px; strokeWidth override removed entirely so it
 *     falls back to the same default stroke lucide uses everywhere else
 *     in the app (was explicitly thinned to 1.5 in the previous pass —
 *     now spec asks it to match other outline icons, not be thinner).
 *   - Icon color switched from --color-text-tertiary to
 *     --color-text-secondary (matching the body text's own color token)
 *     with opacity: 0.55 layered on top, achieving "muted, ~50-60%
 *     opacity of body text" rather than a separate darker/lighter token.
 *   - Removed the --space-2 horizontal padding added in the previous
 *     pass — spec now wants padding "consistent with the rest of the
 *     screen" rather than an extra footer-specific inset.
 *   - marginTop increased 56px → 64px (+8px) to clearly separate from
 *     Personal Notes, per the new "+8-12dp above the current spacing"
 *     instruction.
 *
 * Final polish pass:
 *   - "Clinical reference only." weight bumped 500 (Medium) → 600
 *     (Semibold) per updated spec wording ("semibold" specifically,
 *     not just "bold"/"Medium" as in earlier passes).
 *   - Icon opacity reduced 0.55 → 0.47 (~15% lighter) per "lighten the
 *     icon slightly" — size (18px) and default stroke already sat
 *     inside the requested ranges, left unchanged.
 *   - Icon/text alignment switched flex-start → center, and the 1px
 *     top nudge removed, so the icon centers against the full text
 *     block rather than pinning to the first line only — spec now
 *     explicitly wants them to "read as one unit."
 *   - Gap tightened 12px → 10px (low end of the new 10-12dp range).
 *   - marginTop pulled back 64px → 56px (-8px, low end of the "8-12dp
 *     closer to Personal Notes" instruction).
 *   - paddingBottom reduced --space-8 → --space-6 (32px → 24px) to
 *     avoid excess empty space at the very end of the page.
 *   - Alignment reverted center → flex-start (1px top nudge restored):
 *     icon now lines up with the first line of text again, per direct
 *     follow-up feedback overriding the "read as one unit" centering.
 *
 * Size-down pass:
 *   - Whole disclaimer scaled down ~20% per direct follow-up request:
 *     fontSize 13px → 10px, lineHeight 19px → 15px, icon 18px → 14px.
 *     Weights, colors, opacity, gap, and spacing all left unchanged —
 *     this pass only touches physical size.
 *
 * Props:
 *   blocks       Block[]  — condition.blocks (Phase 2.1 shape)
 *   conditionId  string   — for PersonalNotes localStorage key
 */
export default function PrescriptionsTab({ blocks, conditionId }) {
  const [activeIndex, setActiveIndex] = useState(0)

  const rxBlocks = getRxBlocks(blocks)
  const sheets   = rxBlocks.filter(b => b.blockType === 'prescription_sheet')

  // All non-sheet Rx blocks rendered below the active sheet in true orderIndex
  // order. getRxBlocks() already sorts by orderIndex, so filtering preserves it.
  const rxBelowSheet = rxBlocks.filter(b => b.blockType !== 'prescription_sheet')

  const active = sheets[Math.min(activeIndex, sheets.length - 1)]

  return (
    <div style={{ padding: 0 }}>
      {sheets.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-tertiary)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            No prescription available for this condition.
          </div>
        </div>
      ) : (
        <>
          {/* Sub-tab pills — only shown when 2+ sheets (Section 2.6) */}
          {sheets.length > 1 && (
            <PrescriptionPills
              prescriptions={sheets.map(b => ({ id: b.id, label: b.data?.label }))}
              activeIndex={activeIndex}
              onSelect={setActiveIndex}
            />
          )}

          {/* Active sheet */}
          <PrescriptionSheetBlock sheet={active?.data} />
        </>
      )}

      {/* ── All Rx blocks below the sheet (notes, text posts, galleries) ──────
          Rendered in true orderIndex order — exactly as arranged in the CMS.
          BlockRenderer handles all block types including note_callout.
      ─────────────────────────────────────────────────────────────────────── */}
      {rxBelowSheet.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {rxBelowSheet.map(block => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      )}

      {/* Personal Notes */}
      {conditionId && <PersonalNotes conditionId={conditionId} />}

      {/* Quiet editorial footnote — no divider, no card, no heading.
          Spacing alone (56dp above) separates it from Personal Notes;
          opacity-muted icon is vertically centered against the text
          block so the two read as a single low-emphasis unit. */}
      <div style={{
        marginTop: 56,
        paddingBottom: 'var(--space-6)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <Shield size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: 1, opacity: 0.47 }} />
          <p style={{
            margin: 0,
            fontSize: 10,
            lineHeight: '15px',
            textAlign: 'left',
            color: 'var(--color-text-secondary)',
          }}>
            <span style={{ fontWeight: 600 }}>Clinical reference only.</span>
            <span style={{ fontWeight: 400 }}> Verify doses, contraindications, patient-specific factors, and local guidelines before prescribing.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
