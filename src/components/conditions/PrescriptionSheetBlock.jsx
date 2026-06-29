import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import Icon from '../ui/Icon'
import NoteCallout from '../ui/NoteCallout'
import FreeTextPostBlock from './FreeTextPostBlock'
import { toDrugOptions } from '../../constants/prescriptionRowSchema'

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
 *                        (no per-row flavor; always defaults to NoteCallout's 'info')
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
 *   - Dose: bold, dose-teal color, distinct from the drug name.
 *   - Drug-level notes: plain de-emphasized text, no card chrome.
 *   - Row divider: bold hairline rendered ONLY between two consecutive
 *     `drug` rows (PHASE 9). A drug row followed by a note/free_text row,
 *     or a lone drug row with no following sibling, never draws this line
 *     — it would otherwise sit on top of an unrelated element below it.
 *   - Terminal divider: dashed rule + 'end of sheet' label after the last row.
 *   - Drug name: uniform text-primary color for all entries; linked names get
 *     a dotted underline to signal tappability (not accent-blue color).
 *   - Concentration: plain lighter text directly after name (no dot separator).
 *   - Form: pill badge (distinct from concentration).
 *   - All alternatives show their own concentration + form (not first-only).
 *   - OrMarker: italic + muted color, left-aligned with drug name column.
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
  //
  //    `nextRow` (the next sibling within the same segment/section, or
  //    undefined if this is the last item) drives whether a drug row draws
  //    its bottom divider — PHASE 9: the divider must only ever sit between
  //    two drug rows, never on top of a note/free_text row, and never on a
  //    lone drug row with no sibling beneath it.
  function renderRowItem(row, key, nextRow) {
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
            showDivider={nextRow?.row_type === 'drug'}
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
          const nextRow = segment.items[i + 1]
          return renderRowItem(row, i, nextRow)
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
          Uses a dashed pattern + subtle label to clearly mark 'end of sheet' and
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
          borderTop: '1px dashed var(--color-border)',
        }} />
        <span style={{
          fontSize: 8,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          opacity: 0.4,
          flexShrink: 0,
        }}>
          end of sheet
        </span>
        <div style={{
          flex: 1,
          height: 0,
          borderTop: '1px dashed var(--color-border)',
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
 * Supersedes the prior 'lightest-weight grouping, no background tint'
 * decision — that reversal is explicit and intentional per the redesign
 * plan; do not revert toward it.
 */
function SectionHeader({ label, children }) {
  if (!label) return null
  return (
    <div
      style={{
        background: 'var(--color-section-bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-4) var(--space-4) var(--space-3)',
        margin: '16px 0',
      }}
    >
      <div
        dir="auto"
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.07em',
          color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase',
          marginBottom: 8,
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
 *
 * Alternatives:
 *   Every boundary between alternatives renders a single OrMarker ('or',
 *   italic + muted, left-aligned with the drug name column, not the badge).
 *   Every alternative member shows its own concentration + form (not first-only).
 *
 *   buildFormulationClusters now delegates to toDrugOptions() (the same
 *   function the admin editor uses to build its groups[] state) instead of
 *   re-deriving clusters from formulation_id alone. PHASE 2.9 (2026-06-25):
 *   this means a row's clusters now match whatever an admin explicitly
 *   grouped via the move-to-group action (persisted group_id, Phase 2.8),
 *   falling back to the original formulation_id-matching default only for
 *   legacy rows that predate Phase 2.8. Single source of truth — grouping
 *   logic is no longer duplicated between the CMS and the app render.
 *
 *   One NumberBadge per row regardless of how many alternatives it has
 *   (§2.4a) — unchanged.
 *
 *   A search icon sits to the right of each drug unit's name line, opening
 *   a Google Images search for the drug in Egypt.
 */
function buildFormulationClusters(row, drugs, mainFormulation) {
  const groups = toDrugOptions(row)

  // Per-member formulation lookup (PHASE 2.9): link-gating and fallback
  // naming used to be special-cased to 'only the main member' via isMain.
  // Every option now looks up its own formulation_id independently, so
  // alternatives get exactly the same link/fallback-name treatment as the
  // main drug whenever they're linked to a formulation themselves.
  const findFormulation = (formulationId) => {
    if (!formulationId) return null
    if (formulationId === row.formulation_id) return mainFormulation ?? null
    return (drugs ?? []).find(d => d.id === formulationId) ?? null
  }

  return groups.map(group => ({
    dose: group.dose,
    doseWho: group.dose_who ?? null,
    note: group.note,
    members: group.options.map(opt => ({
      data: opt,
      formulation: findFormulation(opt.formulation_id),
    })),
  }))
}

function UnifiedDrugRow({ index, row, formulation, drugs, navigate, showDivider }) {
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
    <div style={{ ...rowWrap, borderBottom: showDivider ? '1.5px solid var(--color-border)' : 'none' }}>
      <NumberBadge index={index} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {units.map((unit, uIdx) => {
          const { member, cluster, isLastMemberOfCluster } = unit
          const data = member.data
          const memberHasOwnName = !!(data.brand_name?.trim() || data.generic_name?.trim())
          // PHASE 2.9: fallback name and link-gating are now per-member,
          // using that member's own formulation lookup — previously these
          // were gated behind `member.isMain`, so an alternative linked to
          // its own formulation never got a fallback name or a working
          // link at all.
          const fallbackName = !memberHasOwnName ? (member.formulation?.genericName ?? null) : null
          const memberName = data.brand_name?.trim() || data.generic_name || fallbackName
          const memberLinkEnabled = Boolean(data.drug_link_enabled) && Boolean(member.formulation?.slug)
          // A member's own per-drug note (Decision 5 two-slot model) is
          // only shown as its own line when it differs from the cluster's
          // shared group note — for a single-member cluster falling back
          // to alt.note for both, they're the same value and the group
          // note below already covers it; rendering both would duplicate
          // the same text.
          const showOwnNote = data.note && data.note !== cluster.note

          return (
            <div key={uIdx}>
              {/* One OrMarker before every unit except the very first */}
              {uIdx > 0 && <OrMarker />}

              <DrugMainLine
                name={memberName}
                concentration={data.concentration}
                form={data.form}
                linkEnabled={memberLinkEnabled}
                slug={member.formulation?.slug ?? null}
                navigate={navigate}
              />

              {showOwnNote && <RowNote note={data.note} />}

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
 * Concentration: plain lighter text right after name, no dot prefix.
 * Form: pill/badge styling (distinct visual weight from concentration).
 * Search icon: right-side icon that opens Google Images for the drug in Egypt.
 *
 * Typography scale (batch 2 fine-grained fixes):
 *   name: 17→15px, concentration: 13→12px, form pill: 11→10px
 *   Inner row alignItems: baseline→center (fixes form pill vertical centering)
 */
function DrugMainLine({ name, concentration, form, linkEnabled, slug, navigate }) {
  if (!name) return null

  const handleSearchClick = (e) => {
    e.stopPropagation()
    const query = [name, concentration, form, 'Egypt'].filter(Boolean).join(' ')
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Name line: name + concentration (plain text) + form (badge) + search icon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          {linkEnabled && slug ? (
            <button
              onClick={() => navigate(`/drugs/${slug}`)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'var(--font-body)',
                fontSize: 16, fontWeight: 700,
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
              fontSize: 16, fontWeight: 700,
              color: 'var(--color-text-primary)',
              lineHeight: 1.3,
            }}>
              {name}
            </span>
          )}

          {/* Concentration — plain lighter text, no dot prefix */}
          {concentration && (
            <span style={{
              fontSize: 12, fontWeight: 400,
              color: 'var(--color-text-secondary)',
              lineHeight: 1.3,
            }}>
              {concentration}
            </span>
          )}

          {/* Form — pill badge.
              Visual-weight pass: removed the filled accent-light background —
              a filled chip competed with the drug name and NumberBadge for the
              same 'accent = important' visual slot. Accent text color kept so
              the form is still legible as a distinct tag, just no longer filled. */}
          {form && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: 'var(--color-accent)',
              background: 'var(--color-accent-light)',
              borderRadius: 20,
              padding: '1px 8px',
              lineHeight: 1.5,
              letterSpacing: '0.01em',
              flexShrink: 0,
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
    </>
  )
}

/**
 * DoseLine — no adult/child tag.
 * PHASE 9 (2026-06-22): color changed from plain text-primary (black) to
 * --color-dose, and size dropped from 15px to 14px. Previously the dose
 * line was nearly indistinguishable from the drug name at a glance
 * (15px/600 black vs. 17px/700 black) — the color/size shift now makes it
 * scannable as 'this is the dose' on its own.
 * --color-dose was initially set to a teal (reused from .dir-card-dose)
 * but that read as a status/success color, out of place in a plain
 * drug-row context. Replaced with a cool slate/ink tone — distinct in
 * shade from text-primary without carrying any semantic (success/warning)
 * connotation.
 * Batch 2 fine-grained fixes: marginTop 4→8px, added paddingLeft 4px indent,
 * size 14→13px, weight 700→600 — visually lighter/offset from drug name.
 */
function DoseLine({ text }) {
  return (
    <div dir="auto" style={{ marginTop: 12, paddingLeft: 6, unicodeBidi: 'plaintext' }}>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-dose)',
        lineHeight: 1.5,
      }}>
        {text}
      </span>
    </div>
  )
}

/**
 * RowNote — plain inline note with language-aware icon placement.
 *
 * PHASE 9 (2026-06-22) — hierarchy fix: removed the bordered/tinted card
 * treatment (background, border, padding-as-chrome). A boxed note with an
 * icon was visually competing with — and often beating — the dose line for
 * attention, which inverted the intended reading order (name > dose >
 * alternatives > note). The note is now plain text in the same 'supporting
 * detail' tier below the drug name: smaller,
 * lighter weight, secondary color, no card. The icon is kept (small, muted)
 * since it's still useful as an at-a-glance 'this has a note' marker, but
 * it no longer sits inside its own boxed UI element.
 *
 * Direction is resolved explicitly (rather than left to the browser's
 * dir="auto" heuristic) so the icon's flex order reliably flips for
 * Arabic-leading text:
 *   Arabic text  -> row direction rtl -> icon renders on the RIGHT
 *   English text -> row direction ltr -> icon renders on the LEFT
 *
 * Text: var(--color-text-secondary), 13px/500, italic — deliberately
 * subordinate to both the drug name (15px/700) and the dose line
 * (13px/600, --color-dose), so it reads as an aside, not primary content.
 * Does not use NoteCallout (which has a fixed LTR icon position and the
 * heavier boxed-card treatment appropriate for standalone note rows, not
 * per-drug annotations).
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
        gap: 5,
        marginTop: 8,
      }}
    >
      <span style={{
        flexShrink: 0,
        marginTop: 2,
        // text-secondary (was text-tertiary) — icon was undershooting the
        // note text's own color weight, reading fainter than the label
        // it's marking.
        color: 'var(--color-text-secondary)',
        display: 'flex',
        alignItems: 'center',
      }}>
        <Icon name="Info" size={12} color="currentColor" />
      </span>
      <span
        dir="auto"
        style={{
          fontSize: 13,
          fontWeight: 500,
          fontStyle: 'italic',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.5,
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
 * Visual-weight pass: dropped the solid border + filled accent background.
 * A badge this prominent competed with the drug name for the dominant-element
 * slot in the row. Now a transparent-fill outline at 70% opacity — reads as a
 * quiet positional reference, not an interactive/call-to-action element.
 */
function NumberBadge({ index }) {
  return (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: 8,
      border: '1px solid var(--color-accent)',
      backgroundColor: 'var(--color-accent-light)',
      color: 'var(--color-accent)',
      fontSize: 11,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      marginTop: 1,
      opacity: 0.85,
    }}>
      {index}
    </div>
  )
}

/**
 * OrMarker — sits in the content column, left-aligned with drug names
 * above and below it (not under the NumberBadge column).
 *
 * Batch 2 fix: removed the outer padding wrapper that caused the marker
 * to render as a block-level element pushing into its own vertical space
 * misaligned from the drug names. Now renders inline in the content flow
 * so 'or' aligns left with the name text, not with the badge.
 *
 * Shape: equal width/height (fixed 22px), single 'or' character, so the
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
        width: 28,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 9,
        fontWeight: 700,
        fontStyle: 'italic',
        color: 'var(--color-warning)',
        background: 'var(--color-warning-light)',
        borderRadius: 12,
        flexShrink: 0,
        lineHeight: 1,
        letterSpacing: '0.02em',
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
  padding: '14px 0',
}
