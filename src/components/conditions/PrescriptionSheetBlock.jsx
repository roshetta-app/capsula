import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import NoteCallout from '../ui/NoteCallout'

/**
 * PrescriptionSheetBlock — renders ONE prescription_sheet's rows[] (Section 3.3).
 *
 * Row types (in `sheet.rows[]`, array order = display order):
 *   drug_library  — { formulation_id, dose_override?, note_en?, note_ar?, drug_link_enabled }
 *                    looked up against useDrugs() formulation list (id = formulation UUID)
 *   drug_freetext — { drug_name, dose_text }
 *   note          — { text, flavor? } — rendered via NoteCallout in flat inline row style
 *
 * Label/sub-tab logic for multiple sheets lives in 2.8 (parent component).
 * Empty `rows: []` renders nothing (per 3.3).
 *
 * Props:
 *   sheet  { label, rows: [...] }  — block.data of a prescription_sheet block
 */
export default function PrescriptionSheetBlock({ sheet }) {
  const navigate = useNavigate()
  const { drugs } = useDrugs()

  const rows = sheet?.rows ?? []
  if (!rows.length) return null

  let drugIndex = 0

  return (
    <div>
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1

        switch (row.row_type) {
          case 'drug_library': {
            drugIndex += 1
            const formulation = drugs.find(d => d.id === row.formulation_id)
            return (
              <DrugLibraryRow
                key={i}
                index={drugIndex}
                row={row}
                formulation={formulation}
                navigate={navigate}
                isLast={isLast}
              />
            )
          }

          case 'drug_freetext':
            drugIndex += 1
            return (
              <DrugFreetextRow
                key={i}
                index={drugIndex}
                row={row}
                isLast={isLast}
              />
            )

          case 'note':
            return (
              <NoteCallout
                key={i}
                text={row.text}
                flavor={row.flavor}
                isLast={isLast}
              />
            )

          default:
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[PrescriptionSheetBlock] Unrecognized row_type: "${row.row_type}"`)
            }
            return null
        }
      })}
    </div>
  )
}

// ─── DrugLibraryRow ───────────────────────────────────────────────────────────

function DrugLibraryRow({ index, row, formulation, navigate, isLast }) {
  if (!formulation) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[PrescriptionSheetBlock] No formulation found for formulation_id: "${row.formulation_id}"`)
    }
    return null
  }

  const dose = row.dose_override || formulation.doses?.[0]?.instruction || formulation.defaultDoseOverride
  const brands = formulation.brands ?? []
  const linkEnabled = row.drug_link_enabled !== false && Boolean(formulation.slug)

  const primary = brands[0]
  const rest = brands.slice(1)

  return (
    <div style={{ ...rowWrap, borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {primary ? (
          <>
            {/* Brand name + generic inline */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
              {linkEnabled && formulation.slug ? (
                <button
                  onClick={() => navigate(`/drugs/${formulation.slug}`)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--color-accent)',
                    lineHeight: 1.3,
                  }}
                >
                  {primary.name}
                </button>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                  {primary.name}
                </span>
              )}
              {formulation.genericName && (
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  ({formulation.genericName})
                </span>
              )}
            </div>

            {/* Dose line */}
            {dose && (
              <div dir="auto" style={{
                fontSize: 13, fontWeight: 400,
                color: 'var(--color-text-secondary)',
                marginTop: 3, lineHeight: 1.5,
                unicodeBidi: 'plaintext',
              }}>
                {dose}
              </div>
            )}

            {/* Concentration + form */}
            {(formulation.concentration || formulation.form) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 3, flexWrap: 'wrap' }}>
                {formulation.concentration && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{formulation.concentration}</span>
                )}
                {formulation.form && (
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-tertiary)',
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 7px',
                  }}>
                    {formulation.form}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          /* No brands — show generic name + dose inline */
          <>
            <div dir="auto" style={{
              fontSize: 14, fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3, unicodeBidi: 'plaintext',
            }}>
              {formulation.genericName}
            </div>
            {dose && (
              <div dir="auto" style={{
                fontSize: 13, fontWeight: 400,
                color: 'var(--color-text-secondary)',
                marginTop: 3, lineHeight: 1.5,
                unicodeBidi: 'plaintext',
              }}>
                {dose}
              </div>
            )}
          </>
        )}

        {/* English / Arabic notes */}
        {(row.note_en || row.note_ar) && (
          <div style={{ marginTop: 'var(--space-1)' }}>
            {row.note_en && (
              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-tertiary)', lineHeight: 1.5 }}>
                {row.note_en}
              </div>
            )}
            {row.note_ar && (
              <div dir="rtl" style={{
                fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-tertiary)',
                lineHeight: 1.5, marginTop: row.note_en ? 2 : 0,
              }}>
                {row.note_ar}
              </div>
            )}
          </div>
        )}

        {/* Alternative brands */}
        {rest.map(brand => (
          <div key={brand.id}>
            <OrDivider />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
              {linkEnabled && formulation.slug ? (
                <button
                  onClick={() => navigate(`/drugs/${formulation.slug}`)}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14, fontWeight: 600,
                    color: 'var(--color-accent)', lineHeight: 1.3,
                  }}
                >
                  {brand.name}
                </button>
              ) : (
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                  {brand.name}
                </span>
              )}
              {brand.nameAr && (
                <span dir="rtl" style={{ fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
                  {brand.nameAr}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Breadcrumb: Category › Generic */}
        {formulation.category && (
          <div style={{
            marginTop: 'var(--space-2)',
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'var(--color-text-tertiary)',
          }}>
            <span style={{ fontWeight: 500 }}>{formulation.category}</span>
            {formulation.genericName && (
              <>
                <span style={{ opacity: 0.5 }}>›</span>
                {linkEnabled ? (
                  <button
                    onClick={() => navigate(`/drugs/${formulation.slug}`)}
                    style={{
                      background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', fontSize: 11,
                      color: 'var(--color-accent)',
                      fontFamily: 'var(--font-body)',
                      textDecoration: 'underline', textUnderlineOffset: 2,
                    }}
                  >
                    {formulation.genericName}
                  </button>
                ) : (
                  <span>{formulation.genericName}</span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DrugFreetextRow ──────────────────────────────────────────────────────────

function DrugFreetextRow({ index, row, isLast }) {
  return (
    <div style={{ ...rowWrap, borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div dir="auto" style={{
          fontSize: 14, fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 1.3, unicodeBidi: 'plaintext',
        }}>
          {row.drug_name}
        </div>
        {row.dose_text && (
          <div dir="auto" style={{
            fontSize: 13, fontWeight: 400,
            color: 'var(--color-text-secondary)',
            marginTop: 3, lineHeight: 1.5,
            unicodeBidi: 'plaintext',
          }}>
            {row.dose_text}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared sub-pieces ──────────────────────────────────────────────────────

function NumberBadge({ index }) {
  return (
    <div style={{
      width: 22, height: 22, borderRadius: '50%',
      backgroundColor: 'var(--color-accent)',
      color: '#fff',
      fontSize: 11, fontWeight: 600,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, marginTop: 2,
    }}>
      {index}
    </div>
  )
}

function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: '6px 0' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
      <span style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: 'var(--color-text-tertiary)',
      }}>
        or
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
    </div>
  )
}

const rowWrap = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-3)',
  padding: '12px 0',
}
