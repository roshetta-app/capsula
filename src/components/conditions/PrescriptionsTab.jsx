import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PrescriptionSheetBlock from './PrescriptionSheetBlock'
import PrescriptionPills from './PrescriptionPills'
import NoteCallout from '../ui/NoteCallout'
import PersonalNotes from './PersonalNotes'
import BlockRenderer from './BlockRenderer'
import { getRxBlocks } from '../../utils/blockFilters'

/**
 * PrescriptionsTab — Rx tab container (Phase 2.8 + Phase 2 CMS refactor).
 *
 * Phase 2 changes:
 *   - image_gallery and free_text_post blocks with context 'rx' now render
 *     in the Rx tab via BlockRenderer (rxExtras), positioned below the active
 *     prescription sheet and above Rx-level notes.
 *   - getRxBlocks() already returns these block types after the blockFilters.js
 *     update; this component just splits them out and renders them.
 *
 * Design:
 *   - rx-context note_callout blocks that sit OUTSIDE the sheet have a clear
 *     visual separator above them (dashed divider) so the user understands
 *     they are not part of the active prescription sheet.
 *   - "General notes" label removed from divider — the dashed line alone provides
 *     sufficient structural separation without the redundant text label.
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
  const rxNotes  = rxBlocks.filter(b => b.blockType === 'note_callout')
  // Phase 2: image galleries and free-text posts assigned to Rx context
  const rxExtras = rxBlocks.filter(b =>
    b.blockType === 'image_gallery' || b.blockType === 'free_text_post'
  )

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

      {/* ── Rx extra blocks (image galleries, text posts) ────────────────────
          Rendered below the active sheet and above Rx-level notes.
          These are image_gallery or free_text_post blocks whose data.context
          is 'rx'. Ordered by orderIndex (from getRxBlocks sort).
      ──────────────────────────────────────────────────────────────────────── */}
      {rxExtras.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {rxExtras.map(block => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      )}

      {/* ── Rx-context note_callout blocks ──────────────────────────────────
          These exist outside the sheet and persist regardless of which sheet
          is selected. A dashed separator makes clear they are not part of the sheet.
          The "General notes" label has been removed — the line alone is sufficient.
      ──────────────────────────────────────────────────────────────────────── */}
      {rxNotes.length > 0 && (
        <>
          {/* Dashed separator — no label */}
          <div style={{
            margin: 'var(--space-3) 0 var(--space-2)',
            borderTop: '1px dashed var(--color-border)',
          }} />

          {rxNotes.map(b => (
            <NoteCallout key={b.id} text={b.data?.text} flavor={b.data?.flavor} />
          ))}
        </>
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
