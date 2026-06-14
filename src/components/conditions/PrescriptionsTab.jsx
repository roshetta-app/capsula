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
 * Calls getRxBlocks() (2.2) to get prescription_sheet blocks + any
 * rx-context note_callout blocks, sorted by orderIndex.
 *
 *  - 0 prescription_sheet blocks → empty state (2.10): "No prescription
 *    available for this condition." Any rx-context notes and Personal
 *    Notes still render below, independent of the empty message.
 *  - 1 prescription_sheet block → rendered directly via PrescriptionSheetBlock,
 *    no label/sub-tabs shown (per Section 2.6).
 *  - 2+ prescription_sheet blocks → PrescriptionPills sub-tabs (labeled by
 *    data.label), first selected by default; selected sheet rendered via
 *    PrescriptionSheetBlock (per Section 2.6).
 *
 * rx-context note_callout blocks (data.context === 'rx') render via
 * NoteCallout below the sheet(s), in orderIndex order.
 *
 * PersonalNotes and the medical disclaimer are preserved (Step 3.1 / 3.2).
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

      {/* Rx-context note_callout blocks */}
      {rxNotes.map(b => (
        <NoteCallout key={b.id} text={b.data?.text} flavor={b.data?.flavor} />
      ))}

      {/* Personal Notes */}
      {conditionId && <PersonalNotes conditionId={conditionId} />}

      {/* Medical Disclaimer — Step 3.2 */}
      <div style={{
        marginTop: 'var(--space-6)',
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
