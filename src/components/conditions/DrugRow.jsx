import { useNavigate } from 'react-router-dom'

/**
 * DrugRow — renders one prescription drug slot.
 *
 * Phase 2D spec:
 *  - Number badge on left
 *  - Primary brand (first alt): bold brand name (tappable if showGenericLink),
 *    concentration + form tag pill, Arabic brand name below,
 *    dose instruction (bold, dir=auto for Arabic detection)
 *  - Drug note: italic muted below dose if drugNote set
 *  - Alternatives: same DrugRow sub-component with "or" separator
 *  - Breadcrumb: Category › Generic — at bottom of slot (small, muted)
 *  - Search icon: opens Google Image search in new tab
 *
 * Props:
 *   index            number          — slot number (1-based)
 *   alternatives     DrugAlternative[]
 *   doseOverride     string | null
 *   drugNote         string | null
 *   drugNoteAr       string | null
 *   showGenericLink  boolean
 */
export default function DrugRow({
  index,
  alternatives = [],
  doseOverride,
  drugNote,
  drugNoteAr,
  showGenericLink = true,
}) {
  const navigate = useNavigate()

  if (!alternatives.length) return null

  const primary = alternatives[0]
  const rest    = alternatives.slice(1)

  return (
    <div style={{ marginBottom: 'var(--space-3)' }}>
      {/* Slot header row — number badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>

        {/* Number badge */}
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          backgroundColor: 'var(--color-accent)',
          color: '#fff',
          fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 2,
        }}>
          {index}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Primary alternative */}
          <AltRow
            alt={primary}
            doseOverride={doseOverride}
            showGenericLink={showGenericLink}
            navigate={navigate}
          />

          {/* Drug-specific note */}
          {(drugNote || drugNoteAr) && (
            <div style={{ marginTop: 'var(--space-1)' }}>
              {drugNote && (
                <div style={{
                  fontSize: 12, fontStyle: 'italic',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 1.5,
                }}>
                  {drugNote}
                </div>
              )}
              {drugNoteAr && (
                <div dir="rtl" style={{
                  fontSize: 12, fontStyle: 'italic',
                  color: 'var(--color-text-tertiary)',
                  lineHeight: 1.5,
                  marginTop: drugNote ? 2 : 0,
                }}>
                  {drugNoteAr}
                </div>
              )}
            </div>
          )}

          {/* Alternative options */}
          {rest.map((alt) => (
            <div key={alt.id}>
              {/* "or" divider */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: 'var(--space-2)',
                margin: '6px 0',
              }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
                }}>
                  or
                </span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
              </div>
              <AltRow
                alt={alt}
                doseOverride={null}        /* override only applies to primary slot */
                showGenericLink={showGenericLink}
                navigate={navigate}
              />
            </div>
          ))}

          {/* Breadcrumb: Category › Generic */}
          {primary.category && (
            <div style={{
              marginTop: 'var(--space-2)',
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--color-text-tertiary)',
            }}>
              <span style={{ fontWeight: 500 }}>{primary.category}</span>
              {primary.genericName && (
                <>
                  <span style={{ opacity: 0.5 }}>›</span>
                  {showGenericLink && primary.formulationSlug ? (
                    <button
                      onClick={() => navigate(`/drugs/${primary.formulationSlug}`)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', fontSize: 11,
                        color: 'var(--color-accent)',
                        fontFamily: 'var(--font-body)',
                        textDecoration: 'underline', textUnderlineOffset: 2,
                      }}
                    >
                      {primary.genericName}
                    </button>
                  ) : (
                    <span>{primary.genericName}</span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── AltRow — single brand line ───────────────────────────────────────────────

function AltRow({ alt, doseOverride, showGenericLink, navigate }) {
  const dose = doseOverride || alt.doseInstruction

  function openImageSearch() {
    const q = encodeURIComponent(`${alt.brandName} egypt`)
    window.open(`https://www.google.com/search?tbm=isch&q=${q}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-2) var(--space-3)',
    }}>
      {/* Top row: brand name + form tag + search icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', justifyContent: 'space-between' }}>

        {/* Left: name + concentration + form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Brand name */}
          {showGenericLink && alt.formulationSlug ? (
            <button
              onClick={() => navigate(`/drugs/${alt.formulationSlug}`)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: 'var(--color-accent)',
                lineHeight: 1.3,
              }}>
                {alt.brandName}
              </span>
            </button>
          ) : (
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              {alt.brandName}
            </div>
          )}

          {/* Concentration + form tag pill */}
          {(alt.concentration || alt.form) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 3, flexWrap: 'wrap' }}>
              {alt.concentration && (
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {alt.concentration}
                </span>
              )}
              {alt.form && (
                <span style={{
                  fontSize: 11, fontWeight: 500,
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-tertiary)',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 7px',
                }}>
                  {alt.form}
                </span>
              )}
            </div>
          )}

          {/* Arabic brand name */}
          {alt.brandNameAr && (
            <div dir="rtl" style={{
              fontSize: 12, color: 'var(--color-text-tertiary)',
              marginTop: 2, lineHeight: 1.4,
            }}>
              {alt.brandNameAr}
            </div>
          )}
        </div>

        {/* Right: dose + image search icon */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-1)', flexShrink: 0, maxWidth: '50%' }}>
          {/* Google Image search icon */}
          <button
            onClick={openImageSearch}
            title="Search brand image"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 2,
              color: 'var(--color-text-tertiary)', lineHeight: 1,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* Magnifier SVG */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Dose instruction — full width below */}
      {dose ? (
        <div
          dir="auto"
          style={{
            marginTop: 'var(--space-2)',
            fontSize: 13, fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-body)',
          }}
        >
          {dose}
        </div>
      ) : (
        <div style={{
          marginTop: 'var(--space-2)',
          fontSize: 12, fontStyle: 'italic',
          color: 'var(--color-text-tertiary)',
        }}>
          Dose not specified
        </div>
      )}
    </div>
  )
}
