import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import Icon from '../ui/Icon'
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
 * Design notes:
 *   - NumberBadge: outlined square badge, optically aligned to cap-height.
 *   - Dose: full-strength color, no adult/child tag.
 *   - Drug-level notes: inline card with language-aware icon placement.
 *   - Terminal divider: dashed rule + "end of sheet" label after the last row.
 *   - OrMarker: tinted circle pill sitting in the content column (not under
 *     the number badge), aligned flush-left with drug names.
 *
 * Props:
 *   sheet  { label, rows: [...] }  — block.data of a prescription_sheet block
 */
export default function PrescriptionSheetBlock({ sheet }) {
  const navigate = useNavigate()
  const { drugs } = useDrugs()

  const rows = sheet?.rows ?? []
  if (!rows.length) return null

  // ── Continuous numbering across the whole sheet ──────────────────────
  let drugIndex = 0
  function nextIndex() {
    drugIndex += 1
    return drugIndex
  }

  // ── Per-row renderer ─────────────────────────────────────────────────
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
      {segments.map((segment, segIdx) => {
        const renderItems = () => segment.items.map((row, i) => {
          const isLast =
            segIdx === segments.length - 1 && i === segment.items.length - 1
          return renderRowItem(row, i, isLast)
        })
        return (
          <div key={segIdx}>
            {segment.label !== null
              ? <SectionHeader label={segment.label}>{renderItems()}</SectionHeader>
              : renderItems()}
          </div>
        )
      })}

      {/* ── Terminal divider ─────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 'var(--space-3)',
        marginBottom: 'var(--space-1)',
      }}>
        <div style={{ flex: 1, height: 0, borderTop: '1.5px dashed var(--color-border)' }} />
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
        <div style={{ flex: 1, height: 0, borderTop: '1.5px dashed var(--color-border)' }} />
      </div>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ label, children }) {
  if (!label) return null
  return (
    <div style={{
      background: 'var(--color-section-bg)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-3) var(--space-4) var(--space-2)',
      margin: '14px 0',
    }}>
      <div
        dir="auto"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          marginBottom: 4,
          unicodeBidi: 'plaintext',
        }}
      >
        {label}
      </div>
      {children}
    </div>
  )
}

// ─── UnifiedDrugRow ───────────────────────────────────────────────────────────

/**
 * UnifiedDrugRow — renders a single `row_type: 'drug'` row.
 *
 * Layout: NumberBadge | content-column
 * OrMarker sits INSIDE the content column (not using negative margin to
 * undercut the badge). This keeps "or" aligned with drug names, not centered
 * under the number badge.
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

  const units = []
  for (const cluster of clusters) {
    for (let mIdx = 0; mIdx < cluster.members.length; mIdx++) {
      units.push({
        member: cluster.members[mIdx],
        cluster,
        isLastMemberOfCluster: mIdx === cluster.members.length - 1,
        showConcentrationForm: mIdx === 0,
      })
    }
  }

  return (
    <div style={{ ...rowWrap, borderBottom: isLast ? 'none' : '0.5px solid var(--color-border-subtle)' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {units.map((unit, uIdx) => {
          const { member, cluster, isLastMemberOfCluster, showConcentrationForm } = unit
          const data = member.data
          const memberHasOwnName = !!(data.brand_name?.trim() || data.generic_name?.trim())
          const fallbackName = !memberHasOwnName ? (member.isMain ? cluster.formulation?.genericName : null) : null
          const memberName = data.brand_name?.trim() || data.generic_name || fallbackName

          return (
            <div key={uIdx}>
              {/* OrMarker sits INSIDE the content column — aligned with drug names */}
              {uIdx > 0 && <OrMarker />}

              <DrugMainLine
                name={memberName}
                nameAr={data.name_ar}
                concentration={showConcentrationForm ? data.concentration : null}
                form={showConcentrationForm ? data.form : null}
                linkEnabled={member.isMain && linkEnabled}
                slug={member.isMain ? formulation?.slug : null}
                navigate={navigate}
              />

              {isLastMemberOfCluster && (
                <>
                  {cluster.dose && <DoseLine text={cluster.dose} />}
                  {cluster.note && <RowNote note={cluster.note} />}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DrugMainLine ─────────────────────────────────────────────────────────────

function DrugMainLine({ name, nameAr, concentration, form, linkEnabled, slug, navigate }) {
  if (!name) return null

  const suffix = [concentration, form].filter(Boolean).join(' · ')

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
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
        {suffix && (
          <span style={{
            fontSize: 12, fontWeight: 400,
            color: 'var(--color-text-secondary)',
            lineHeight: 1.3,
          }}>
            · {suffix}
          </span>
        )}
      </div>

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
    </>
  )
}

// ─── DoseLine ─────────────────────────────────────────────────────────────────

/**
 * DoseLine — no adult/child tag (who prop removed from call site and ignored).
 * Font: 15px / 600 — slightly larger and bolder than before (was 14px / 700
 * but visually lighter due to the tag stealing emphasis).
 */
function DoseLine({ text }) {
  return (
    <div dir="auto" style={{
      marginTop: 4,
      unicodeBidi: 'plaintext',
    }}>
      <span style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

// ─── RowNote ──────────────────────────────────────────────────────────────────

/**
 * RowNote — inline note card that follows the text direction of its content.
 *
 * Uses `dir="auto"` so the browser detects language direction from the first
 * strong character. The info icon is placed with flexbox in row direction:
 *   - LTR text  → icon on the LEFT  (natural flex order)
 *   - RTL text  → icon on the RIGHT (flex row is mirrored by dir="rtl")
 *
 * Text: black (text-primary), 14px — more readable than the previous muted styling.
 * Does NOT go through NoteCallout (which has a fixed LTR icon position).
 */
function RowNote({ note }) {
  if (!note) return null

  return (
    <div
      dir="auto"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 7,
        marginTop: 6,
        padding: '7px 10px',
        borderRadius: 'var(--radius-sm, 6px)',
        background: 'var(--color-surface-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Icon floats to the correct side via dir="auto" mirroring flex-row */}
      <span style={{
        flexShrink: 0,
        marginTop: 1,
        color: 'var(--color-text-tertiary)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Icon name="Info" size={14} color="currentColor" />
      </span>
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--color-text-primary)',
        lineHeight: 1.55,
        unicodeBidi: 'plaintext',
      }}>
        {note}
      </span>
    </div>
  )
}

// ─── NumberBadge ──────────────────────────────────────────────────────────────

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

// ─── OrMarker ─────────────────────────────────────────────────────────────────

/**
 * OrMarker — tinted circle pill, sits in the content column aligned with
 * drug names. No negative margin hack — it's a natural block in the flex
 * content column so it lines up flush-left with the drug name above it.
 */
function OrMarker() {
  return (
    <div style={{
      padding: '4px 0',
    }}>
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 600,
        fontStyle: 'italic',
        color: 'var(--color-text-tertiary)',
        background: 'var(--color-surface-muted)',
        border: '1px solid var(--color-border)',
        borderRadius: 999,
        padding: '1px 8px',
        lineHeight: 1.6,
        letterSpacing: '0.02em',
      }}>
        or
      </span>
    </div>
  )
}

// BracketConnector deleted — Phase 4 redesign. Do not restore.

const rowWrap = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--space-3)',
  padding: '11px 0',
}
