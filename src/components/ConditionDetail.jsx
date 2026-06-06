import { ArrowLeft, AlertTriangle } from 'lucide-react'

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 'var(--space-5)' }}>
    <div style={{
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--color-text-tertiary)',
      marginBottom: 'var(--space-3)',
    }}>
      {title}
    </div>
    {children}
    <div style={{ height: 1, backgroundColor: 'var(--color-border-subtle)', marginTop: 'var(--space-5)' }} />
  </div>
)

const BulletList = ({ items, color }) => (
  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
    {items.map((item, i) => (
      <li key={i} style={{
        fontSize: 14,
        color: color || 'var(--color-text-primary)',
        marginBottom: 'var(--space-2)',
        paddingLeft: 'var(--space-4)',
        position: 'relative',
        lineHeight: 1.5,
      }}>
        <span style={{
          position: 'absolute', left: 0,
          color: color || 'var(--color-accent)',
          fontWeight: 700,
        }}>·</span>
        {item}
      </li>
    ))}
  </ul>
)

function PrescriptionBlock({ prescription }) {
  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
      marginBottom: 'var(--space-3)',
    }}>
      {prescription.label && (
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: 'var(--color-accent)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)',
        }}>
          {prescription.label}
        </div>
      )}

      {(prescription.items ?? []).map((item, i) => (
        <div key={i} style={{ marginBottom: i < prescription.items.length - 1 ? 'var(--space-3)' : 0 }}>
          {/* Free-text item */}
          {item.type === 'text' && (
            <div style={{
              fontSize: 14,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}>
              {item.content}
            </div>
          )}

          {/* Drug item — with alternatives */}
          {item.type === 'drug' && (
            <div>
              {item.content && (
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'var(--color-text-tertiary)',
                  marginBottom: 'var(--space-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}>
                  {item.content}
                </div>
              )}
              {(item.alternatives ?? []).map((alt, j) => (
                <div key={j} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: 'var(--space-2) var(--space-3)',
                  backgroundColor: 'var(--color-surface)',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: j < item.alternatives.length - 1 ? 'var(--space-1)' : 0,
                  border: '1px solid var(--color-border)',
                  gap: 'var(--space-3)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: 'var(--color-text-primary)',
                      marginBottom: 2,
                    }}>
                      {alt.brandName || alt.brandId}
                    </div>
                    {(alt.concentration || alt.form) && (
                      <div style={{
                        fontSize: 12,
                        color: 'var(--color-text-tertiary)',
                      }}>
                        {[alt.concentration, alt.form].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  {alt.doseInstruction && (
                    <div style={{
                      fontSize: 13,
                      color: 'var(--color-text-secondary)',
                      fontFamily: 'var(--font-mono)',
                      textAlign: 'right',
                      flexShrink: 0,
                      maxWidth: '50%',
                      lineHeight: 1.4,
                    }}>
                      {alt.doseInstruction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConditionDetail({ condition, onBack }) {
  const AGE_COLORS = {
    adult:    { bg: '#DBEAFE', color: '#1E40AF' },
    child:    { bg: '#D1FAE5', color: '#065F46' },
    both:     { bg: '#EDE9FE', color: '#5B21B6' },
    neonatal: { bg: '#FEF3C7', color: '#92400E' },
  }
  const age = AGE_COLORS[condition.ageGroup] || { bg: '#F3F4F6', color: '#374151' }

  return (
    <div style={{
      backgroundColor: 'var(--color-bg)',
      minHeight: '100vh',
      paddingBottom: 'var(--space-12)',
    }}>
      {/* Back */}
      <button
        onClick={onBack}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', fontSize: 14,
          fontFamily: 'var(--font-body)', fontWeight: 500,
          padding: 'var(--space-5) 0 var(--space-4)',
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Header card */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        marginBottom: 'var(--space-4)',
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 'var(--space-3)',
          gap: 'var(--space-3)',
        }}>
          <h1 style={{
            fontSize: 20, fontWeight: 700,
            color: 'var(--color-text-primary)',
            margin: 0, lineHeight: 1.2, flex: 1,
          }}>
            {condition.name}
          </h1>
          {condition.ageGroup && (
            <span style={{
              fontSize: 11, fontWeight: 500,
              backgroundColor: age.bg, color: age.color,
              padding: '3px 10px',
              borderRadius: 'var(--radius-full)',
              flexShrink: 0,
            }}>
              {condition.ageGroup.charAt(0).toUpperCase() + condition.ageGroup.slice(1)}
            </span>
          )}
        </div>

        {condition.specialtyName && (
          <div style={{
            fontSize: 12, color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {condition.specialtyName}
          </div>
        )}

        {condition.clinicalPicture && (
          <div style={{
            fontSize: 14, color: 'var(--color-text-secondary)',
            lineHeight: 1.6, marginTop: 'var(--space-3)',
          }}>
            {condition.clinicalPicture}
          </div>
        )}
      </div>

      {/* Detail sections */}
      <div style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        boxShadow: 'var(--shadow-card)',
      }}>

        {condition.historyQuestions?.length > 0 && (
          <Section title="History Questions">
            <BulletList items={condition.historyQuestions} />
          </Section>
        )}

        {condition.examination?.length > 0 && (
          <Section title="Examination">
            <BulletList items={condition.examination} />
          </Section>
        )}

        {condition.investigations?.length > 0 && (
          <Section title="Investigations">
            <BulletList items={condition.investigations} />
          </Section>
        )}

        {condition.prescriptions?.length > 0 && (
          <Section title="Prescriptions">
            {condition.prescriptions.map((rx, i) => (
              <PrescriptionBlock key={i} prescription={rx} />
            ))}
          </Section>
        )}

        {condition.patientInstructions && (
          <Section title="Patient Instructions">
            <div style={{
              fontSize: 14,
              color: 'var(--color-text-primary)',
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}>
              {condition.patientInstructions}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
