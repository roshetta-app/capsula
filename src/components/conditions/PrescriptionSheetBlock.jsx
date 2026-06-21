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
 *   section           — PHASE 4 (2026-06-21). Self-contained container row,
 *                        { label, drugs: DrugRow[] }. Renders its own
 *                        SectionHeader followed immediately by its nested
 *                        drugs[], via the same per-row renderer used for the
 *                        sheet's top-level rows (renderRowItem below) —
 *                        recursive, not duplicated.
 *   note               — { text_en?, text_ar? } — both languages combined into one
 *                        string and rendered via NoteCallout in flat inline row style
 *                        (no per-row flavor; always defaults to NoteCallout's "info")
 *   free_text          — { content }        — rendered via FreeTextPostBlock (markdown prose)
 *
 * PHASE 7 (2026-06-21): removed support for the legacy `section_header`,
 * `drug_library`, and `drug_freetext` row types. No persisted data of these
 * shapes exists anywhere in the database as of this phase (confirmed via
 * audit before removal); `section` (Phase 4) is now the only section
 * mechanism, and `drug` (Phase 1) is now the only drug row shape.
 *
 * Section grouping:
 *   The sheet's rows are still a flat top-level array; `section` rows are
 *   self-contained, carrying their own members in a nested drugs[] array
 *   instead of inferring membership from array position. Rendered via the
 *   SectionHeader component (see its own docstring below).
 *
 * Numbering (masterplan §2.4a):
 *   The numbered badge counts rows, not individual drugs. A unified 'drug'
 *   row with N nested alternatives is still one row -> one number. Numbering
 *   runs continuously across the whole sheet, including across section
 *   boundaries and into/out of a section's nested drugs[], never reset.
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

  // ── Continuous numbering across the whole sheet (not reset per section,
  //    and shared across both the top-level walk and any section's nested
  //    drugs[] walk below) ──────────────────────────────────────────────
  let drugIndex = 0
  function nextIndex() {
    drugIndex += 1
    return drugIndex
  }

  // ── Per-row renderer, reused for both the sheet's top-level rows and a
  //    section row's nested drugs[] (PHASE 4 — recursive, not duplicated) ──
  function renderRowItem(row, key, isLast) {
    switch (row.row_type) {
      case 'drug': {
        const index = nextIndex()
        const formulation = row.formulation_id
          ? drugs.find(d => d.id === row.formulation_id)
          : null
        return (
          <UnifiedDrugRow
            key={row.id ?? key}
            index={index}
            row={row}
            formulation={formulation}
            drugs={drugs}
            navigate={navigate}
            isLast={isLast}
          />
        )
      }

      case 'note': {
        // Row schema (NOTE_ROW_TEMPLATE) stores bilingual text as text_en /
        // text_ar and carries no flavor field. Combined into one string so
        // NoteCallout's existing per-paragraph dir="auto" handling renders
        // each language in its own correctly-directioned paragraph.
        const noteText = [row.text_en, row.text_ar].filter(Boolean).join('\n\n')
        return (
          <NoteCallout
            key={row.id ?? key}
            text={noteText}
            isLast={isLast}
          />
        )
      }

      case 'free_text':
        return (
          <div key={row.id ?? key} style={{ padding: '6px 0' }}>
            <FreeTextPostBlock
              block={{ id: row.id ?? key, blockType: 'free_text_post', data: { markdown: row.content ?? '' } }}
            />
          </div>
        )

      default:
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[PrescriptionSheetBlock] Unrecognized row_type: "${row.row_type}"`)
        }
        return null
    }
  }

  // ── Build visual segments ────────────────────────────────────────────
  // `section` rows (Phase 4) are self-contained: { label, drugs: [] }.
  // Rendered immediately as their own segment; do not absorb any
  // following top-level rows.
  const segments = []
  let current = { label: null, items: [] }
  for (const row of rows) {
    if (row.row_type === 'section') {
      if (current.items.length) segments.push(current)
      segments.push({ label: row.label ?? '', items: row.drugs ?? [] })
      current = { label: null, items: [] }
    } else {
      current.items.push(row)
    }
  }
  if (current.items.length) segments.push(current)

  return (
    <div>
      {segments.map((segment, segIdx) => (
        <div key={segIdx}>
          {segment.label !== null && <SectionHeader label={segment.label} />}
          {segment.items.map((row, i) => {
            const isLast =
              segIdx === segments.length - 1 && i === segment.items.length - 1
            return renderRowItem(row, i, isLast)
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
 * PHASE 5 (2026-06-21) — corrected from the earlier tinted-background sketch:
 * renders as the lightest-weight grouping on the page (top divider, centered
 * uppercase label, bottom divider, no background tint) since the formulation
 * bracket carries the real "same drug" meaning and a section is just an
 * organizational label over otherwise-unrelated drugs.
 */
function SectionHeader({ label }) {
  if (!label) return null
  return (
    <div
      dir="auto"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        margin: '14px 0 6px',
        unicodeBidi: 'plaintext',
      }}
    >
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-border-subtle)' }} />
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
 *   "or" divider (OrDivider); members within the SAME cluster are
 *   separated by a BracketConnector — PHASE 5 (2026-06-21) — since members
 *   within a cluster share one formulation (e.g. Ventolin/Asmalin) and the
 *   bracket is the stronger "pick one, they're the same medicine" signal,
 *   distinct from the lighter "or" used between genuinely different
 *   formulations. One number badge for the whole row regardless of how
 *   many clusters it expands to (§2.4a) — alternatives never get their own
 *   NumberBadge.
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
                    {mIdx > 0 && <BracketConnector />}
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

/**
 * BracketConnector — PHASE 5 (2026-06-21). Connects members within the same
 * formulation cluster (e.g. Ventolin / Asmalin) — interchangeable brands of
 * the literal same drug. Deliberately heavier than OrDivider (accent color,
 * bracket shape, no "or" text) since this is the strongest visual signal on
 * the page: "pick one, they're the same medicine." Different-formulation
 * clusters keep the plain OrDivider, unchanged.
 */
function BracketConnector() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      margin: '4px 0 4px 2px',
    }}>
      <div style={{
        width: 14,
        height: 10,
        borderLeft: '1.5px solid var(--color-accent)',
        borderTop: '1.5px solid var(--color-accent)',
        borderBottom: '1.5px solid var(--color-accent)',
        borderRadius: '4px 0 0 4px',
      }} />
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--color-accent)',
      }}>
        same medicine
      </span>
    </div>
  )
}

const rowWrap = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-3)',
  padding: '11px 0',
}

