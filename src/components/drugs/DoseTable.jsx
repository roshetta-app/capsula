/**
 * src/components/drugs/DoseTable.jsx
 * Phase 2G — Drug Detail Screen
 *
 * Props:
 *   doses               — array of dose rows (doses_structured) from formulation
 *   defaultDoseOverride — string | null — override note shown below table
 *   textbookDoses       — array of textbook dose rows
 *   textbookDoseNotes   — string | null
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

/** Map raw 'who' values to readable display labels */
const WHO_LABELS = {
  adult:              'Adult',
  child:              'Child',
  'child-6-12':       'Child 6–12y',
  'child-6-12y':      'Child 6–12y',
  'child-2-6':        'Child 2–6y',
  'child-2-6y':       'Child 2–6y',
  'child-under-2':    'Child <2y',
  infant:             'Infant',
  neonate:            'Neonate',
  elderly:            'Elderly',
  renal:              'Renal',
  hepatic:            'Hepatic',
}

function formatWho(who) {
  if (!who) return ''
  return WHO_LABELS[who.toLowerCase().replace(/\s+/g, '-')] ?? who
}

function DoseRowLine({ row, i }) {
  return (
    <tr
      key={i}
      style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
    >
      <td style={{
        padding:       'var(--space-2) var(--space-3) var(--space-2) 0',
        fontSize:      13,
        fontWeight:    600,
        color:         'var(--color-text-secondary)',
        whiteSpace:    'nowrap',
        verticalAlign: 'top',
        width:         90,
      }}>
        {formatWho(row.who ?? row.group)}
      </td>
      <td style={{
        padding:       'var(--space-2) 0',
        fontSize:      14,
        color:         'var(--color-text-primary)',
        fontFamily:    'var(--font-mono)',
        lineHeight:    1.5,
        verticalAlign: 'top',
      }}>
        {row.instruction}
        {row.max_dose && (
          <div style={{ marginTop: 4 }}>
            <span style={{
              display:         'inline-block',
              fontSize:        11,
              fontWeight:      600,
              color:           '#B91C1C',
              backgroundColor: '#FEE2E2',
              borderRadius:    'var(--radius-sm)',
              padding:         '2px 6px',
            }}>
              max {row.max_dose}
            </span>
          </div>
        )}
      </td>
    </tr>
  )
}

export default function DoseTable({
  doses = [],
  defaultDoseOverride,
  textbookDoses = [],
  textbookDoseNotes,
}) {
  const [refOpen, setRefOpen] = useState(false)

  const hasPractical  = doses.length > 0
  const hasTextbook   = textbookDoses.length > 0
  const hasAnything   = hasPractical || hasTextbook

  if (!hasAnything) return null

  const primaryDoses = hasPractical ? doses : textbookDoses

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      {/* Section header */}
      <div style={{
        fontSize:       10,
        fontWeight:     700,
        letterSpacing:  '0.1em',
        textTransform:  'uppercase',
        color:          'var(--color-text-tertiary)',
        marginBottom:   'var(--space-3)',
      }}>
        Dose
      </div>

      {/* Practical dose table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {primaryDoses.map((row, i) => (
            <DoseRowLine key={i} row={row} i={i} />
          ))}
        </tbody>
      </table>

      {/* Default dose override note */}
      {defaultDoseOverride && (
        <div style={{
          fontSize:   13,
          fontStyle:  'italic',
          color:      'var(--color-text-tertiary)',
          marginTop:  'var(--space-3)',
          lineHeight: 1.5,
        }}>
          {defaultDoseOverride}
        </div>
      )}

      {/* Reference dose collapsible — only show if we have practical doses AND textbook doses */}
      {hasPractical && hasTextbook && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button
            onClick={() => setRefOpen(o => !o)}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            'var(--space-1)',
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              color:          'var(--color-accent)',
              fontSize:       13,
              fontWeight:     500,
              fontFamily:     'var(--font-body)',
              padding:        0,
            }}
          >
            {refOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Reference Dose
          </button>

          {refOpen && (
            <div style={{ marginTop: 'var(--space-3)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {textbookDoses.map((row, i) => (
                    <DoseRowLine key={i} row={row} i={i} />
                  ))}
                </tbody>
              </table>
              {textbookDoseNotes && (
                <div style={{
                  fontSize:   13,
                  fontStyle:  'italic',
                  color:      'var(--color-text-tertiary)',
                  marginTop:  'var(--space-2)',
                  lineHeight: 1.5,
                }}>
                  {textbookDoseNotes}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{
        height:          1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop:       'var(--space-5)',
      }} />
    </div>
  )
}
