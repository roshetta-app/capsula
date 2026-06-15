import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import NoteCallout from '../ui/NoteCallout'
import FreeTextPostBlock from './FreeTextPostBlock'

/**
 * PrescriptionSheetBlock — renders ONE prescription_sheet's rows[] (Section 3.3).
 *
 * Row types (in `sheet.rows[]`, array order = display order):
 *   drug_library  — { formulation_id, dose_override?, note_en?, note_ar?, drug_link_enabled }
 *                    looked up against useDrugs() formulation list (id = formulation UUID)
 *   drug_freetext — { drug_name, dose_text }
 *   note          — { text, flavor? } — rendered via NoteCallout in flat inline row style
 *   free_text     — { markdown }       — rendered via FreeTextPostBlock (markdown prose)
 *
 * Design changes:
 *   - NumberBadge: replaced filled blue circle with a clean outlined square badge.
 *     The badge top is aligned with the first text line via alignItems: 'flex-start'
 *     and a small marginTop offset to optically sit on the cap-height of the drug name.
 *   - Dose: boosted to color-text-primary at reduced opacity so it reads clearly but
 *     stays visually subordinate to the drug name (fontWeight 500, color secondary+).
 *   - Drug-level notes (note_en / note_ar): no longer italic/grey/small — now
 *     rendered as a mild inline callout with a small dot prefix at full secondary color.
 *   - Terminal divider: a visually distinct dashed full-width rule with a small "end"
 *     label appears after the last prescription row to clearly separate the sheet
 *     content from what follows (personal notes, disclaimer).  The between-item
 *     dividers remain as thin solid hairlines so the two kinds never look the same.
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

          case 'free_text':
            return (
              <div key={i} style={{ padding: '6px 0' }}>
                <FreeTextPostBlock block={{ id: i, blockType: 'free_text_post', data: { markdown: row.markdown ?? '' } }} />
              </div>
            )

          default:
            if (process.env.NODE_ENV !== 'production') {
              console.warn(`[PrescriptionSheetBlock] Unrecognized row_type: "${row.row_type}"`)
            }
            return null
        }
      })}

      {/* ── Terminal divider ─────────────────────────────────────────────────────
          Visually distinct from the thin solid hairlines between prescription items.
          Uses a dashed pattern + subtle label to clearly mark "end of sheet" and
          separate the content from personal notes / disclaimer below.
      ────────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 'var(--space-3)',
        marginBottom: 'var(--space-1)',
      }}>
        <div style={{
          flex: 1,
          height: 0,
          borderTop: '1.5px dashed var(--color-border)',
        }} />
        <span style={{
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          opacity: 0.6,
          flexShrink: 0,
        }}>
          end of sheet
        </span>
        <div style={{
          flex: 1,
          height: 0,
          borderTop: '1.5px dashed var(--color-border)',
        }} />
      </div>
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
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--color-accent)',
                    lineHeight: 1.3,
                  }}
                >
                  {primary.name}
                </button>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
                  {primary.name}
                </span>
              )}
              {formulation.genericName && (
                <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-secondary)' }}>
                  ({formulation.genericName})
                </span>
              )}
            </div>

            {/* Dose line — boosted contrast */}
            {dose && (
              <div dir="auto" style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                opacity: 0.72,
                marginTop: 3,
                lineHeight: 1.5,
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
              fontSize: 15, fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3, unicodeBidi: 'plaintext',
            }}>
              {formulation.genericName}
            </div>
            {dose && (
              <div dir="auto" style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                opacity: 0.72,
                marginTop: 3,
                lineHeight: 1.5,
                unicodeBidi: 'plaintext',
              }}>
                {dose}
              </div>
            )}
          </>
        )}

        {/* Drug-level notes — no longer italic/tertiary; use a readable inline style */}
        {(row.note_en || row.note_ar) && (
          <div style={{ marginTop: 5 }}>
            {row.note_en && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 5,
                fontSize: 12.5,
                fontStyle: 'normal',
                fontWeight: 400,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
                <span>{row.note_en}</span>
              </div>
            )}
            {row.note_ar && (
              <div dir="rtl" style={{
                display: 'flex', alignItems: 'flex-start', gap: 5,
                fontSize: 12.5,
                fontStyle: 'normal',
                fontWeight: 400,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                marginTop: row.note_en ? 2 : 0,
              }}>
                <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
                <span>{row.note_ar}</span>
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
                    fontSize: 15, fontWeight: 600,
                    color: 'var(--color-accent)', lineHeight: 1.3,
                  }}
                >
                  {brand.name}
                </button>
              ) : (
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
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
          fontSize: 15, fontWeight: 600,
          color: 'var(--color-text-primary)',
          lineHeight: 1.3, unicodeBidi: 'plaintext',
        }}>
          {row.drug_name}
        </div>
        {row.dose_text && (
          <div dir="auto" style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-text-primary)',
            opacity: 0.72,
            marginTop: 3,
            lineHeight: 1.5,
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

/**
 * NumberBadge — clean outlined square with rounded corners.
 *
 * Replaces the filled blue circle which felt heavy and didn't align well.
 * Uses a border + accent color on the number itself — lighter, more typographic.
 * marginTop: 1 keeps the badge optically aligned with the cap-height of the drug name.
 */
function NumberBadge({ index }) {
  return (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: 6,
      border: '1.5px solid var(--color-accent)',
      backgroundColor: 'var(--color-accent-light)',
      color: 'var(--color-accent)',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
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
  padding: '11px 0',
        }
            
