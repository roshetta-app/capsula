import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
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

      {/* Medical Disclaimer — two sentences on two lines */}
      <div style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
      }}>
        <ShieldCheck size={12} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          fontWeight: 400,
          lineHeight: 1.6,
        }}>
          <div>Verify doses before prescribing.</div>
          <div>Individual patient factors apply.</div>
        </div>
      </div>
    </div>
  )
}
