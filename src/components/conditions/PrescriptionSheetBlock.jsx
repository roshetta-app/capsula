import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import Icon from '../ui/Icon'
import NoteCallout from '../ui/NoteCallout'
import FreeTextPostBlock from './FreeTextPostBlock'
import { alternativeSharesParentDose } from '../../constants/prescriptionRowSchema'

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
 *   - Dose: bold, full-strength color.
 *   - Drug-level notes: tinted NoteCallout card.
 *   - Terminal divider: dashed rule + "end of sheet" label after the last row.
 *   - Drug name: uniform text-primary color for all entries; linked names get
 *     a dotted underline to signal tappability (not accent-blue color).
 *   - Concentration: plain lighter text directly after name (no dot separator).
 *   - Form: pill badge (distinct from concentration).
 *   - Arabic name: text-align left (dir="rtl" kept for correct letter shaping).
 *   - All alternatives show their own concentration + form (not first-only).
 *   - OrMarker: italic + muted color, left-aligned in badge column.
 *   - Search icon: per drug unit, opens Google Images for the drug in Egypt.
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
 * PHASE 5 (2026-06-21, prescription redesign plan) — renders as one
 * full-width tinted card: the label sits as a heading-style line at the
 * top, and the section's drug rows render directly beneath it inside the
 * same card (see call site in the default export, where this component
 * now wraps its segment's items as children rather than rendering as a
 * sibling before them). Uses --color-section-bg, chosen to be visually
 * distinct from the Phase 1 note card's tint so a group of drugs never
 * reads as the same kind of box as a single annotation.
 * Supersedes the prior "lightest-weight grouping, no background tint"
 * decision — that reversal is explicit and intentional per the redesign
 * plan; do not revert toward it.
 */
function SectionHeader({ label, children }) {
  if (!label) return null
  return (
    <div
      style={{
        background: 'var(--color-section-bg)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-3) var(--space-4) var(--space-2)',
        margin: '14px 0',
      }}
    >
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

// ─── UnifiedDrugRow (Phase 3 — new unified row + nested alternatives) ─────────

/**
 * UnifiedDrugRow — renders a single `row_type: 'drug'` row per masterplan §2.2.
 *
 * Display rule:
 *   Main line: name [concentration badge-form] — name in text-primary for all
 *   entries; linked names get dotted underline (not accent-blue color).
 *   Concentration sits as plain lighter text right after the name.
 *   Form renders as a pill badge (not plain text).
 *   The Arabic name (name_ar), when present, is shown directly under the
 *   English line for every member, forced text-align: left.
 *
 * Alternatives:
 *   Every boundary between alternatives renders a single OrMarker ("or",
 *   italic + muted, left-aligned in badge column). Every alternative member
 *   shows its own concentration + form (not first-only).
 *
 *   buildFormulationClusters still groups same-formulation alternatives
 *   together so they share one dose line and one note (rendered once after
 *   the last member of the cluster).
 *
 *   One NumberBadge per row regardless of how many alternatives it has
 *   (§2.4a) — unchanged.
 *
 *   A search icon sits to the right of each drug unit's name line, opening
 *   a Google Images search for the drug in Egypt.
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

  // Flatten clusters into a sequence of renderable units so that every
  // boundary — within a cluster (same-formulation members) or between
  // clusters (different formulations) — gets exactly one OrMarker.
  // Each unit carries: the member's display data, and which cluster it
  // belongs to (for dose/note rendering after the last member of each
  // cluster).
  // NOTE: showConcentrationForm is removed — every member now shows its
  // own concentration + form, not just the first member of each cluster.
  const units = []
  for (const cluster of clusters) {
    for (let mIdx = 0; mIdx < cluster.members.length; mIdx++) {
      units.push({
        member: cluster.members[mIdx],
        cluster,
        isLastMemberOfCluster: mIdx === cluster.members.length - 1,
      })
    }
  }

  return (
    <div style={{ ...rowWrap, borderBottom: isLast ? 'none' : '1.5px solid var(--color-border)' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {units.map((unit, uIdx) => {
          const { member, cluster, isLastMemberOfCluster } = unit
          const data = member.data
          const memberHasOwnName = !!(data.brand_name?.trim() || data.generic_name?.trim())
          const fallbackName = !memberHasOwnName ? (member.isMain ? cluster.formulation?.genericName : null) : null
          const memberName = data.brand_name?.trim() || data.generic_name || fallbackName

          return (
            <div key={uIdx}>
              {/* One OrMarker before every unit except the very first */}
              {uIdx > 0 && <OrMarker />}

              <DrugMainLine
                name={memberName}
                nameAr={data.name_ar}
                concentration={data.concentration}
                form={data.form}
                linkEnabled={member.isMain && linkEnabled}
                slug={member.isMain ? formulation?.slug : null}
                navigate={navigate}
              />

              {/* Dose and note render once after the last member of each
                  cluster — shared by all members in that cluster */}
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

// ─── Shared display pieces (used by both the unified row and its alternatives) ─

/**
 * DrugMainLine — visual refinement phase.
 *
 * Name color: uniform `text-primary` for all entries (linked or not).
 * Linked names: dotted underline to signal tappability (not accent-blue).
 * Concentration: plain lighter text right after name, no dot separator.
 * Form: pill/badge styling (distinct visual weight from concentration).
 * Arabic name: text-align left (dir="rtl" kept for correct Arabic letter shaping).
 * Search icon: right-side icon that opens Google Images for the drug in Egypt.
 */
function DrugMainLine({ name, nameAr, concentration, form, linkEnabled, slug, navigate }) {
  if (!name) return null

  const handleSearchClick = (e) => {
    e.stopPropagation()
    const query = [name, concentration, form, 'Egypt'].filter(Boolean).join(' ')
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Name line: name + concentration (plain text) + form (badge) + search icon */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {linkEnabled && slug ? (
            <button
              onClick={() => navigate(`/drugs/${slug}`)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)',
                fontSize: 17, fontWeight: 700,
                color: 'var(--color-text-primary)',
                lineHeight: 1.3,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textDecorationColor: 'var(--color-text-tertiary)',
                textUnderlineOffset: 3,
              }}
            >
              {name}
            </button>
          ) : (
            <span style={{
              fontSize: 17, fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3,
            }}>
              {name}
            </span>
          )}

          {/* Concentration — plain lighter text, no dot prefix */}
          {concentration && (
            <span style={{
              fontSize: 13, fontWeight: 400,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.3,
            }}>
              {concentration}
            </span>
          )}

          {/* Form — pill badge */}
          {form && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--color-accent)',
              background: 'var(--color-accent-light)',
              borderRadius: 20,
              padding: '1px 8px',
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              flexShrink: 0,
              alignSelf: 'center',
            }}>
              {form}
            </span>
          )}
        </div>

        {/* Search icon — Google Images for this drug in Egypt */}
        <button
          onClick={handleSearchClick}
          aria-label={`Search images for ${name}`}
          style={{
            background: 'none', border: 'none', padding: '2px 0 2px 8px',
            cursor: 'pointer', flexShrink: 0,
            color: 'var(--color-text-tertiary)',
            display: 'flex', alignItems: 'center',
            lineHeight: 1,
          }}
        >
          <Icon name="Search" size={15} color="currentColor" />
        </button>
      </div>

      {/* Arabic name — own line directly below, dir="rtl" for correct shaping,
          text-align forced left per design spec */}
      {nameAr && (
        <div
          dir="rtl"
          style={{
            fontSize: 12.5,
            color: 'var(--color-text-secondary)',
            marginTop: 2,
            unicodeBidi: 'plaintext',
            textAlign: 'left',
          }}
        >
          {nameAr}
        </div>
      )}
    </>
  )
}

/**
 * DoseLine — no adult/child tag. Font 15px/600 — slightly larger and bolder
 * than before to improve legibility.
 * Size hierarchy: Arabic name (12.5px) < dose (15px) < main name (17px).
 */
function DoseLine({ text }) {
  return (
    <div dir="auto" style={{ marginTop: 4, unicodeBidi: 'plaintext' }}>
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

/**
 * RowNote — inline note card with language-aware icon placement.
 *
 * Direction is resolved explicitly (rather than left to the browser's
 * dir="auto" heuristic) so the icon's flex order reliably flips for
 * Arabic-leading text:
 *   Arabic text  → row direction rtl → icon renders on the RIGHT
 *   English text → row direction ltr → icon renders on the LEFT
 *
 * Text: var(--color-text-primary) (black), 15px/600 — bolder and a touch
 * larger than before for legibility (previously 14px/500).
 * Does not use NoteCallout (which has a fixed LTR icon position).
 */
const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/

function RowNote({ note }) {
  if (!note) return null

  const isArabic = ARABIC_RE.test(note.trim().charAt(0)) || ARABIC_RE.test(note)
  const direction = isArabic ? 'rtl' : 'ltr'

  return (
    <div
      dir={direction}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 7,
        marginTop: 6,
        padding: '7px 10px',
        borderRadius: 'var(--radius-sm, 6px)',
        background: 'var(--color-surface-muted)',
        border: '1px solid var(--color-border)',
      }}
    >
      <span style={{
        flexShrink: 0,
        marginTop: 2,
        color: 'var(--color-text-tertiary)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Icon name="Info" size={13} color="currentColor" />
      </span>
      <span
        dir="auto"
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          lineHeight: 1.55,
          unicodeBidi: 'plaintext',
        }}
      >
        {note}
      </span>
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

/**
 * OrMarker — perfect circle, sitting in the content column, aligned
 * flush-left with the drug names above and below it. No negative margin —
 * it is a natural block element in the flex content column.
 *
 * Shape: equal width/height (fixed 22px), single "or" character, so the
 * badge always renders as a true circle (not a pill).
 * Color: warm/neutral amber tint (--color-warning-light bg, --color-warning
 * text) — distinct from both plain grey and the blue accent used elsewhere
 * in the sheet (NumberBadge, form pill), so it reads as its own kind of
 * marker rather than a muted variant of either.
 */
function OrMarker() {
  return (
    <div style={{ padding: '3px 0' }}>
      <span style={{
        display: 'inline-flex',
        width: 22,
        height: 22,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        fontStyle: 'italic',
        color: 'var(--color-warning)',
        background: 'var(--color-warning-light)',
        borderRadius: '50%',
        flexShrink: 0,
        lineHeight: 1,
      }}>
        or
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
