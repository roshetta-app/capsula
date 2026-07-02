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
 * Disclaimer header/body split pass:
 *   - Restructured from a single inline sentence into a standalone
 *     section: an icon + "Clinical Reference" title row, with the
 *     verification copy as a separate paragraph beneath it.
 *   - Icon swapped from Shield to BookOpen — an editorial/reference mark
 *     rather than anything cautionary, paired with the title in
 *     --color-text-primary rather than the muted secondary tone.
 *   - Title: 15px / Medium (500) / primary text color, 12px gap from icon.
 *   - Body: unchanged copy, 13px / Regular (400) / secondary text color,
 *     1.375 line-height, 6px marginTop below the title.
 *   - marginTop pulled back --space-10 → --space-8 (40px → 32px) to sit
 *     inside the new 24-32px "previous section" spacing target.
 *   - paddingBottom left at --space-8 (32px) — already inside the
 *     requested 32-40px range, no change needed.
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

      {/* Reference footer — a quiet editorial section, not a warning banner.
          No card/background/border/shadow. Title row (icon + label) reads
          as a section header in primary text color; body copy sits below
          in secondary text color as its own paragraph. */}
      <div style={{
        marginTop: 'var(--space-8)',
        paddingBottom: 'var(--space-8)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <BookOpen size={18} color="var(--color-text-primary)" style={{ flexShrink: 0 }} />
          <span style={{
            fontSize: 15,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
          }}>
            Clinical Reference
          </span>
        </div>
        <p style={{
          margin: 0,
          marginTop: 6,
          fontSize: 13,
          fontWeight: 400,
          lineHeight: 1.375,
          color: 'var(--color-text-secondary)',
        }}>
          Verify doses, contraindications, patient-specific factors, and local guidelines before prescribing.
        </p>
      </div>
    </div>
  )
}
