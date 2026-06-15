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
 *     clear visual separator above them (dashed divider + dim label) so the
 *     user understands they are not part of the active prescription sheet.
 *   - PersonalNotes section spacing tightened to match overall screen rhythm.
 *   - Medical disclaimer margin reduced to match.
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
          is selected. A separator makes clear they are not part of the sheet.
      ──────────────────────────────────────────────────────────────────────── */}
      {rxNotes.length > 0 && (
        <>
          {/* Dashed separator with label */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            margin: 'var(--space-3) 0 var(--space-2)',
          }}>
            <div style={{
              flex: 1,
              borderTop: '1px dashed var(--color-border)',
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--color-text-tertiary)',
              whiteSpace: 'nowrap',
            }}>
              General notes
            </span>
            <div style={{
              flex: 1,
              borderTop: '1px dashed var(--color-border)',
            }} />
          </div>

          {rxNotes.map(b => (
            <NoteCallout key={b.id} text={b.data?.text} flavor={b.data?.flavor} />
          ))}
        </>
      )}

      {/* Personal Notes */}
      {conditionId && <PersonalNotes conditionId={conditionId} />}

      {/* Medical Disclaimer */}
      <div style={{
        marginTop: 'var(--space-4)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <ShieldCheck size={12} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: 11,
          color: 'var(--color-text-tertiary)',
          fontWeight: 400,
        }}>
          Verify doses before prescribing. Individual patient factors apply.
        </span>
      </div>
    </div>
  )
}
