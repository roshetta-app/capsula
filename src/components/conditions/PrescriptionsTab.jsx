import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import PrescriptionSheetBlock from './PrescriptionSheetBlock'
import PrescriptionPills from './PrescriptionPills'
import NoteCallout from '../ui/NoteCallout'
import PersonalNotes from './PersonalNotes'
import { getRxBlocks } from '../../utils/blockFilters'

/**
 * PrescriptionsTab — Rx tab container (Phase 2.8).
 *
 * Design changes:
 *   - rx-context note_callout blocks that sit OUTSIDE the sheet now have a
 *     clear visual separator above them (dashed divider) so the user understands
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
  const sheets = rxBlocks.filter(b => b.blockType === 'prescription_sheet')
  const rxNotes = rxBlocks.filter(b => b.blockType === 'note_callout')

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
