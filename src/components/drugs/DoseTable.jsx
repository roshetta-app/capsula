/**
 * src/components/drugs/DoseTable.jsx
 * Phase 2G — Drug Detail Screen
 *
 * Props:
 *   defaultDoseOverride — string | null — override note shown below table
 *   textbookDoses       — array of textbook dose rows — the only dose table shown
 *   textbookDoseNotes   — string | null
 */

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

function DoseRowLine({ row, i, id }) {
  return (
    <tr
      id={id}
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
  defaultDoseOverride,
  textbookDoses = [],
  textbookDoseNotes,
}) {
  const hasTextbook = textbookDoses.length > 0

  if (!hasTextbook) return null

  /* Quick-jump nav (ADR-032): one entry per distinct who/group label, in the
   * order it first appears — links to that row's id, table stays continuous
   * and always visible, nothing is hidden or collapsed. */
  const jumpGroups = []
  const seenLabels = new Set()
  textbookDoses.forEach((row, i) => {
    const label = formatWho(row.who ?? row.group)
    if (label && !seenLabels.has(label)) {
      seenLabels.add(label)
      jumpGroups.push({ label, id: `dose-row-${i}` })
    }
  })

  const scrollToRow = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

      {/* Quick-jump nav — only useful when there's more than one group */}
      {jumpGroups.length > 1 && (
        <div style={{
          display:      'flex',
          gap:          'var(--space-2)',
          overflowX:    'auto',
          marginBottom: 'var(--space-3)',
        }}>
          {jumpGroups.map(group => (
            <button
              key={group.id}
              onClick={() => scrollToRow(group.id)}
              style={{
                flexShrink:   0,
                background:   'transparent',
                border:       '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding:      '4px 10px',
                fontSize:     12,
                fontWeight:   600,
                color:        'var(--color-text-secondary)',
                fontFamily:   'var(--font-body)',
                cursor:       'pointer',
                whiteSpace:   'nowrap',
              }}
            >
              {group.label}
            </button>
          ))}
        </div>
      )}

      {/* Textbook dose table — always visible, continuous */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {textbookDoses.map((row, i) => (
            <DoseRowLine key={i} row={row} i={i} id={`dose-row-${i}`} />
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

      {/* Textbook dose notes */}
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

      <div style={{
        height:          1,
        backgroundColor: 'var(--color-border-subtle)',
        marginTop:       'var(--space-5)',
      }} />
    </div>
  )
}
