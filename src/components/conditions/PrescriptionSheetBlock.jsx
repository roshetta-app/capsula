import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import NoteCallout from '../ui/NoteCallout'
import FreeTextPostBlock from './FreeTextPostBlock'
import { alternativeSharesParentDose, doseWhoLabel } from '../../constants/prescriptionRowSchema'

/**
 * PrescriptionSheetBlock — renders ONE prescription_sheet's rows[] (Phase 3).
 *
 * Row types (in `sheet.rows[]`, array order = display order):
 *   drug              — unified row, post-redesign (masterplan §2.1, §2.2, §2.2a).
 *                        { brand_name, brand_id, generic_name, generic_id, name_ar,
 *                          formulation_id, concentration, form, dose,
 *                          note, drug_link_enabled, source_flag,
 *                          alternatives: [...] }
 *   section_header    — { label } — visual group boundary (masterplan §2.4).
 *                        Not a numbered/drug row itself; everything below it
 *                        belongs to it until the next section_header or EOF.
 *   drug_library       — LEGACY, pre-redesign shape. Kept rendering unchanged
 *                         so existing production rows that haven't been
 *                         re-saved via the new CMS editor don't regress
 *                         (masterplan §3.5 — no visual regression requirement).
 *   drug_freetext       — LEGACY, pre-redesign shape. Same reasoning as above.
 *   note               — { text, flavor? } — rendered via NoteCallout in flat inline row style
 *   free_text          — { markdown }       — rendered via FreeTextPostBlock (markdown prose)
 *
 * Section grouping:
 *   Rows are still a flat array (no nested JSON structure — masterplan §2.4).
 *   This component groups them visually at render time only: every row
 *   (of any type) belongs to the nearest preceding section_header row,
 *   until the next section_header or the end of the list. Rows before the
 *   first section_header render ungrouped, exactly as before this redesign.
 *
 * Numbering (masterplan §2.4a):
 *   The numbered badge counts rows, not individual drugs. A unified 'drug'
 *   row with N nested alternatives is still one row -> one number. Numbering
 *   runs continuously across the whole sheet, not reset per section.
 *
 * Design notes carried over from the pre-Phase-3 version:
 *   - NumberBadge: outlined square badge, optically aligned to cap-height.
 *   - Dose: color-text-primary at reduced opacity, subordinate to drug name.
 *   - Drug-level notes: inline callout style with a small dot prefix.
 *   - Terminal divider: dashed rule + "end of sheet" label after the last row.
 *
 * Props:
 *   sheet  { label, rows: [...] }  — block.data of a prescription_sheet block
 */
export default function PrescriptionSheetBlock({ sheet }) {
  const navigate = useNavigate()
  const { drugs } = useDrugs()

  const rows = sheet?.rows ?? []
  if (!rows.length) return null

  // ── Build visual segments: groups of rows under an optional section label ──
  // section_header rows themselves are not rendered as list items; they just
  // open a new segment. Rows before the first section_header form a segment
  // with label = null (rendered ungrouped, unchanged from pre-redesign look).
  const segments = []
  let current = { label: null, items: [] }
  for (const row of rows) {
    if (row.row_type === 'section_header') {
      if (current.items.length) segments.push(current)
      current = { label: row.label ?? '', items: [] }
    } else {
      current.items.push(row)
    }
  }
  if (current.items.length) segments.push(current)

  // ── Continuous numbering across the whole sheet (not reset per section) ──
  let drugIndex = 0
  function nextIndex() {
    drugIndex += 1
    return drugIndex
  }

  return (
    <div>
      {segments.map((segment, segIdx) => (
        <div key={segIdx}>
          {segment.label !== null && <SectionHeader label={segment.label} />}
          {segment.items.map((row, i) => {
            const isLast =
              segIdx === segments.length - 1 && i === segment.items.length - 1

            switch (row.row_type) {
              case 'drug': {
                const index = nextIndex()
                const formulation = row.formulation_id
                  ? drugs.find(d => d.id === row.formulation_id)
                  : null
                return (
                  <UnifiedDrugRow
                    key={row.id ?? i}
                    index={index}
                    row={row}
                    formulation={formulation}
                    drugs={drugs}
                    navigate={navigate}
                    isLast={isLast}
                  />
                )
              }

              case 'drug_library': {
                const index = nextIndex()
                const formulation = drugs.find(d => d.id === row.formulation_id)
                return (
                  <LegacyDrugLibraryRow
                    key={i}
                    index={index}
                    row={row}
                    formulation={formulation}
                    navigate={navigate}
                    isLast={isLast}
                  />
                )
              }

              case 'drug_freetext': {
                const index = nextIndex()
                return (
                  <LegacyDrugFreetextRow
                    key={i}
                    index={index}
                    row={row}
                    isLast={isLast}
                  />
                )
              }

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
                    <FreeTextPostBlock
                      block={{ id: i, blockType: 'free_text_post', data: { markdown: row.markdown ?? '' } }}
                    />
                  </div>
                )

              default:
                if (process.env.NODE_ENV !== 'production') {
                  console.warn(`[PrescriptionSheetBlock] Unrecognized row_type: "${row.row_type}"`)
                }
                return null
            }
          })}
        </div>
      ))}

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

// ─── SectionHeader ────────────────────────────────────────────────────────────

/**
 * SectionHeader — visual group boundary (masterplan §2.4).
 * Confirmed direction from mockup review (v1.1): must read as a clear group
 * boundary, not a plain uppercase label — tint background + divider, more
 * emphasis than body text.
 */
function SectionHeader({ label }) {
  if (!label) return null
  return (
    <div
      dir="auto"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '14px 0 6px',
        padding: '6px 10px',
        backgroundColor: 'var(--color-accent-light)',
        borderRadius: 'var(--radius-md, 8px)',
        borderLeft: '3px solid var(--color-accent)',
        unicodeBidi: 'plaintext',
      }}
    >
      <span style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.03em',
        color: 'var(--color-accent)',
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  )
}

// ─── UnifiedDrugRow (Phase 3 — new unified row + nested alternatives) ─────────

/**
 * UnifiedDrugRow — renders a single `row_type: 'drug'` row per masterplan §2.2.
 *
 * Display rule (§2.2):
 *   Main line: {brand_name} {concentration} {form} if a brand is present,
 *   otherwise {generic_name} {concentration} {form}.
 *   Secondary line (small, italic): generic name underneath, only when a
 *   brand is present. The Arabic name (name_ar), when present, is shown
 *   directly under the English name for every member.
 *
 * Alternatives — formulation clusters (§2.2a, REVISED 2026-06-20):
 *   Every alternative that shares its formulation_id with the parent drug
 *   row is folded into the parent's cluster — they share one breadcrumb,
 *   one dose line, and one note; only the name (+ Arabic name) repeats per
 *   member. Alternatives with a different (but shared among themselves)
 *   formulation_id form their own cluster, each with its own breadcrumb/
 *   dose/note. Alternatives with no formulation_id (free text) are always
 *   their own standalone cluster. Clusters are separated visually by an
 *   "or" divider; members within a cluster are separated by the same
 *   divider, just without a second breadcrumb/dose/note block. One number
 *   badge for the whole row regardless of how many clusters it expands to
 *   (§2.4a) — alternatives never get their own NumberBadge.
 */
function buildFormulationClusters(row, drugs, mainFormulation) {
  const alts = row.alternatives ?? []
  const mainFormulationId = row.formulation_id ?? null

  const mainCluster = {
    formulationId: mainFormulationId,
    dose: row.dose,
    doseWho: row.dose_who ?? null,
    note: row.note,
    formulation: mainFormulationId ? (mainFormulation ?? null) : null,
    members: [{ isMain: true, data: row }],
  }

  const otherClusters = new Map()
  const standalone = []

  for (const alt of alts) {
    if (alternativeSharesParentDose(row, alt)) {
      mainCluster.members.push({ isMain: false, data: alt })
      continue
    }
    if (alt.formulation_id) {
      if (!otherClusters.has(alt.formulation_id)) {
        otherClusters.set(alt.formulation_id, {
          formulationId: alt.formulation_id,
          dose: alt.dose,
          doseWho: alt.dose_who ?? null,
          note: alt.note,
          formulation: (drugs ?? []).find(d => d.id === alt.formulation_id) ?? null,
          members: [],
        })
      }
      otherClusters.get(alt.formulation_id).members.push({ isMain: false, data: alt })
    } else {
      standalone.push({
        formulationId: null,
        dose: alt.dose,
        doseWho: alt.dose_who ?? null,
        note: alt.note,
        formulation: null,
        members: [{ isMain: false, data: alt }],
      })
    }
  }

  return [mainCluster, ...otherClusters.values(), ...standalone]
}

function UnifiedDrugRow({ index, row, formulation, drugs, navigate, isLast }) {
  const linkEnabled = row.drug_link_enabled !== false && Boolean(formulation?.slug)
  const clusters = buildFormulationClusters(row, drugs, formulation)

  return (
    <div style={{ ...rowWrap, borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {clusters.map((cluster, cIdx) => {
          const isMainCluster = cIdx === 0
          return (
            <div key={cIdx}>
              {cIdx > 0 && <OrDivider />}

              {cluster.members.map((member, mIdx) => {
                const data = member.data
                const memberHasBrand = !!data.brand_name?.trim()
                // Safety net: a row can end up linked (formulation_id set,
                // resolves to a real published formulation) but missing its
                // own brand_name/generic_name — e.g. saved before the picker
                // wrote both fields together. Without this, the row would
                // render with no name at all. Falls back to the linked
                // formulation's own generic name so the row never goes blank.
                const memberHasOwnName = !!(data.brand_name?.trim() || data.generic_name?.trim())
                const fallbackName = !memberHasOwnName ? (member.isMain ? cluster.formulation?.genericName : null) : null
                const memberName = memberHasBrand ? data.brand_name : (data.generic_name || fallbackName)
                const memberGeneric = memberHasBrand ? data.generic_name : null
                return (
                  <div key={mIdx}>
                    {mIdx > 0 && <OrDivider />}
                    <DrugMainLine
                      name={memberName}
                      nameAr={data.name_ar}
                      concentration={mIdx === 0 ? data.concentration : null}
                      form={mIdx === 0 ? data.form : null}
                      generic={memberGeneric}
                      linkEnabled={member.isMain && linkEnabled}
                      slug={member.isMain ? formulation?.slug : null}
                      navigate={navigate}
                    />
                  </div>
                )
              })}

              {cluster.dose && <DoseLine text={cluster.dose} who={cluster.doseWho} />}
              <RowNote note={cluster.note} />

              {/* Breadcrumb: Category › Generic — once per cluster, only when
                  linked to a real formulation. Non-main clusters show the
                  breadcrumb as display-only text (no tap-to-navigate), since
                  their names themselves remain plain text. */}
              {cluster.formulation?.category && (
                <Breadcrumb
                  category={cluster.formulation.category}
                  genericName={cluster.formulation.genericName}
                  linkEnabled={isMainCluster && linkEnabled}
                  slug={cluster.formulation.slug}
                  navigate={navigate}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Shared display pieces (used by both the unified row and its alternatives) ─

function DrugMainLine({ name, nameAr, concentration, form, generic, linkEnabled, slug, navigate }) {
  if (!name) return null
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
        {linkEnabled && slug ? (
          <button
            onClick={() => navigate(`/drugs/${slug}`)}
            style={{
              background: 'none', border: 'none', padding: 0,
              cursor: 'pointer', textAlign: 'left',
              fontFamily: 'var(--font-body)',
              fontSize: 15, fontWeight: 600,
              color: 'var(--color-accent)',
              lineHeight: 1.3,
            }}
          >
            {name}
          </button>
        ) : (
          <span dir="auto" style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3, unicodeBidi: 'plaintext',
          }}>
            {name}
          </span>
        )}
        {/* Secondary generic line — small, italic, only shown when a brand is present (§2.2) */}
        {generic && (
          <span style={{
            fontSize: 12.5, fontStyle: 'italic', fontWeight: 400,
            color: 'var(--color-text-secondary)',
          }}>
            {generic}
          </span>
        )}
      </div>

      {/* Arabic name — shown directly under the English name (§2.1, 2026-06-20) */}
      {nameAr && (
        <div dir="rtl" style={{
          fontSize: 12.5,
          color: 'var(--color-text-secondary)',
          marginTop: 1,
          unicodeBidi: 'plaintext',
        }}>
          {nameAr}
        </div>
      )}

      {(concentration || form) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', marginTop: 3, flexWrap: 'wrap' }}>
          {concentration && (
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{concentration}</span>
          )}
          {form && (
            <span style={{
              fontSize: 11, fontWeight: 500,
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-tertiary)',
              borderRadius: 'var(--radius-full)',
              padding: '1px 7px',
            }}>
              {form}
            </span>
          )}
        </div>
      )}
    </>
  )
}

function DoseLine({ text, who }) {
  const whoLabel = doseWhoLabel(who)
  return (
    <div dir="auto" style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 6,
      marginTop: 3,
      flexWrap: 'wrap',
    }}>
      {whoLabel && (
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          flexShrink: 0,
        }}>
          {whoLabel}
        </span>
      )}
      <span style={{
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        opacity: 0.72,
        lineHeight: 1.5,
        unicodeBidi: 'plaintext',
      }}>
        {text}
      </span>
    </div>
  )
}

/**
 * DrugNotes — LEGACY two-field (note_en/note_ar) rendering. Kept unchanged
 * for `drug_library` / `drug_freetext` legacy rows so they don't regress
 * visually (masterplan §3.5). New unified `drug` rows use RowNote below.
 */
function DrugNotes({ noteEn, noteAr }) {
  if (!noteEn && !noteAr) return null
  return (
    <div style={{ marginTop: 5 }}>
      {noteEn && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 5,
          fontSize: 12.5,
          fontStyle: 'normal',
          fontWeight: 400,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
        }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
          <span>{noteEn}</span>
        </div>
      )}
      {noteAr && (
        <div dir="rtl" style={{
          display: 'flex', alignItems: 'flex-start', gap: 5,
          fontSize: 12.5,
          fontStyle: 'normal',
          fontWeight: 400,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
          marginTop: noteEn ? 2 : 0,
        }}>
          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
          <span>{noteAr}</span>
        </div>
      )}
    </div>
  )
}

/**
 * RowNote — single bidi note field for unified `drug` rows (and their
 * formulation clusters), post note_en/note_ar merge (2026-06-20). Uses
 * dir="auto" so English or Arabic content displays in its natural
 * direction without needing two separate fields/blocks.
 */
function RowNote({ note }) {
  if (!note) return null
  return (
    <div style={{
      marginTop: 5,
      display: 'flex', alignItems: 'flex-start', gap: 5,
    }}>
      <span style={{ color: 'var(--color-text-tertiary)', fontSize: 10, marginTop: 3, flexShrink: 0 }}>●</span>
      <span dir="auto" style={{
        fontSize: 12.5,
        fontWeight: 400,
        color: 'var(--color-text-secondary)',
        lineHeight: 1.5,
        unicodeBidi: 'plaintext',
      }}>
        {note}
      </span>
    </div>
  )
}

function Breadcrumb({ category, genericName, linkEnabled, slug, navigate }) {
  return (
    <div style={{
      marginTop: 'var(--space-2)',
      display: 'flex', alignItems: 'center', gap: 4,
      fontSize: 11, color: 'var(--color-text-tertiary)',
    }}>
      <span style={{ fontWeight: 500 }}>{category}</span>
      {genericName && (
        <>
          <span style={{ opacity: 0.5 }}>›</span>
          {linkEnabled ? (
            <button
              onClick={() => navigate(`/drugs/${slug}`)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', fontSize: 11,
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-body)',
                textDecoration: 'underline', textUnderlineOffset: 2,
              }}
            >
              {genericName}
            </button>
          ) : (
            <span>{genericName}</span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Legacy rows (pre-redesign shape, kept rendering unchanged) ───────────────

function LegacyDrugLibraryRow({ index, row, formulation, navigate, isLast }) {
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

            {dose && <DoseLine text={dose} />}

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
          <>
            <div dir="auto" style={{
              fontSize: 15, fontWeight: 600,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3, unicodeBidi: 'plaintext',
            }}>
              {formulation.genericName}
            </div>
            {dose && <DoseLine text={dose} />}
          </>
        )}

        <DrugNotes noteEn={row.note_en} noteAr={row.note_ar} />

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

        {formulation.category && (
          <Breadcrumb
            category={formulation.category}
            genericName={formulation.genericName}
            linkEnabled={linkEnabled}
            slug={formulation.slug}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  )
}

function LegacyDrugFreetextRow({ index, row, isLast }) {
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
        {row.dose_text && <DoseLine text={row.dose_text} />}
      </div>
    </div>
  )
}

// ─── Shared sub-pieces ──────────────────────────────────────────────────────

/**
 * NumberBadge — clean outlined square with rounded corners.
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

