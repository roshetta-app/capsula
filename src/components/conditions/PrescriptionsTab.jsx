import { useState } from 'react'
import { BookOpen } from 'lucide-react'
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
 * Editorial footer pass:
 *   - Added a thin top divider (--color-border-subtle) to visually close
 *     off the page before the footer, instead of relying on spacing alone.
 *   - Title copy changed "Clinical Reference" → "Good Practice"; heading
 *     now 16px / Semibold (600) to read as a proper section close rather
 *     than a small label.
 *   - Icon kept as BookOpen (book, not shield, per updated preference),
 *     bumped 18px → 20px, recolored from primary → secondary (muted gray)
 *     so it reads as quiet/editorial rather than a bolded UI affordance.
 *   - Icon-title gap tightened 12px → 10px (within the new 8-12px spec).
 *   - Body: 13px → 14px, line-height 1.375 → 1.45, copy unchanged.
 *   - marginTop above the divider bumped --space-8 → --space-10 (32px →
 *     40px) for a clearer break from the previous section.
 *   - paddingBottom bumped --space-8 → --space-12 (32px → 48px) for a
 *     calmer, more conclusive page ending.
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

      {/* Editorial footer — a quiet page-close, not a warning banner or card.
          Thin top divider signals "end of content"; icon and title are
          deliberately muted/secondary-weighted rather than bold UI elements,
          so the section reads as informational, not interactive. */}
      <div style={{
        marginTop: 'var(--space-10)',
        borderTop: '1px solid var(--color-border-subtle)',
        paddingTop: 'var(--space-5)',
        paddingBottom: 'var(--space-12)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <BookOpen size={20} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            Good Practice
          </span>
        </div>
        <p style={{
          margin: 0,
          marginTop: 6,
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.45,
          color: 'var(--color-text-secondary)',
        }}>
          Verify doses, contraindications, patient-specific factors, and local guidelines before prescribing.
        </p>
      </div>
    </div>
  )
}
