import { useNavigate } from 'react-router-dom'

/**
 * DrugRow — drug prescription item.
 * Renders one or more brand alternatives separated by "or" dividers.
 * Tapping the brand name navigates to /drugs/:slug/:formulationId.
 *
 * Props:
 *   alternatives  DrugAlternative[]
 *
 * DrugAlternative shape (from ConditionFull):
 *   { id, brandId, brandName, brandNameAr, formulationId, genericName,
 *     concentration, form, category, doseInstruction }
 */
export default function DrugRow({ alternatives }) {
  const navigate = useNavigate()

  if (!alternatives?.length) return null

  return (
    <div style={{ padding: 'var(--space-1) 0' }}>
      {alternatives.map((alt, i) => (
        <div key={alt.id}>
          {/* Alternative card */}
          <div style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-2) var(--space-3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--space-3)',
          }}>
            {/* Left: brand name + concentration + form */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => {
                  if (alt.formulationId && alt.brandName) {
                    // Navigate to drug detail — slug derived from genericName, formulation id
                    // We use formulationId as the formId param (matches DrugLibrary route pattern)
                    navigate(`/drugs/${slugify(alt.genericName)}/${alt.formulationId}`)
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: alt.formulationId ? 'pointer' : 'default',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <div style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: alt.formulationId ? 'var(--color-accent)' : 'var(--color-text-primary)',
                  lineHeight: 1.3,
                  marginBottom: 2,
                }}>
                  {alt.brandName}
                </div>
              </button>

              {(alt.concentration || alt.form) && (
                <div style={{
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 1.3,
                }}>
                  {[alt.concentration, alt.form].filter(Boolean).join(' · ')}
                </div>
              )}
            </div>

            {/* Right: dose instruction */}
            {alt.doseInstruction && (
              <div
                dir="auto"
                style={{
                  fontSize: 13,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                  flexShrink: 0,
                  maxWidth: '52%',
                  lineHeight: 1.4,
                }}
              >
                {alt.doseInstruction}
              </div>
            )}
          </div>

          {/* "or" divider between alternatives */}
          {i < alternatives.length - 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              margin: 'var(--space-1) var(--space-3)',
            }}>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                color: 'var(--color-text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                or
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Simple slug helper — matches how generics.slug is stored in the DB
function slugify(str) {
  if (!str) return ''
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}
