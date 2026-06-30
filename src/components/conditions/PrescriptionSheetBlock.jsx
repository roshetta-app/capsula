import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDrugs } from '../../hooks/useDrugs'
import { FileText, ExternalLink, ScanSearch } from 'lucide-react'
import NoteCallout from '../ui/NoteCallout'
import FreeTextPostBlock from './FreeTextPostBlock'
import { toDrugOptions } from '../../constants/prescriptionRowSchema'

// Fixed width of the left metadata rail (Rx labels + 'or' connectors).
// Sized for 13px Semibold labels at flush-left alignment — wide enough for
// two-digit 'Rx12' without wrapping, tight enough that the rail doesn't
// read as a gap between the label and the drug name.
const RX_RAIL_WIDTH = 28
const RX_RAIL_GAP = 8

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
 *   - Terminal marker: a small, low-opacity zigzag after the last row —
 *     decorative only, no label/text (VISUAL-WEIGHT PASS, supersedes the
 *     earlier dashed-line + "end of sheet" text treatment).
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

      {/* ── Terminal marker — quiet zigzag, decorative only, no text ───────────────
          Replaces the previous dashed-line + "end of sheet" label treatment.
          Low-opacity accent stroke keeps it visually distinct from the solid
          hairlines between prescription items without drawing attention to itself.
      ────────────────────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginTop: 'var(--space-3)',
        marginBottom: 'var(--space-1)',
      }}>
        <svg width="40" height="8" viewBox="0 0 40 8" fill="none" aria-hidden="true">
          <polyline
            points="0,4 5,1 10,7 15,1 20,7 25,1 30,7 35,1 40,4"
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.3"
            fill="none"
          />
        </svg>
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
        margin: '16px 0',
        overflow: 'hidden',
      }}
    >
      <div
        dir="auto"
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: 'var(--color-text-primary)',
          textTransform: 'none',
          background: 'color-mix(in srgb, var(--color-section-bg) 55%, var(--color-accent) 12%)',
          padding: 'var(--space-3) var(--space-4)',
          unicodeBidi: 'plaintext',
        }}
      >
        {label}
      </div>
      <div style={{ padding: 'var(--space-3) var(--space-4) var(--space-3)' }}>
        {children}
      </div>
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
            <React.Fragment key={uIdx}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: RX_RAIL_GAP, marginTop: uIdx > 0 ? 6 : 0 }}>
                {/* Prefix column — fixed width so all drug names align.
                    Text is left-aligned within the column (justifyContent:
                    'flex-start') so 'Rx1' and 'or' share the same flush-left
                    starting edge — the leftover space before the drug name
                    naturally varies with label length ('or' leaves more
                    room than 'Rx1'), which is the intended visual rhythm. */}
                <div style={{ width: RX_RAIL_WIDTH, flexShrink: 0, display: 'flex', justifyContent: 'flex-start', alignItems: 'baseline' }}>
                  {/* Rail unification pass: 'Rx{n}' and 'or' are both plain
                      positional annotations, not design elements — same
                      body font, same quiet tertiary color, same weight, so
                      neither competes visually with the drug name. */}
                  {uIdx === 0 ? (
                    <span style={{ lineHeight: 1 }}>
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: 'var(--color-text-tertiary)',
                      }}>Rx</span>
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: 'color-mix(in srgb, var(--color-accent) 40%, var(--color-text-tertiary) 60%)',
                      }}>{index}</span>
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11, fontWeight: 500,
                      color: 'color-mix(in srgb, var(--color-warning) 90%, black 10%)',
                      lineHeight: 1,
                    }}>or</span>
                  )}
                </div>
                <div
                  style={{
                    flex: 1, minWidth: 0,
                    cursor: memberLinkEnabled && member.formulation?.slug ? 'pointer' : 'default',
                  }}
                  onClick={memberLinkEnabled && member.formulation?.slug
                    ? () => navigate(`/drugs/${member.formulation.slug}`)
                    : undefined}
                >
                  <DrugMainLine
                    name={memberName}
                    concentration={data.concentration}
                    form={data.form}
                    linkEnabled={memberLinkEnabled}
                  />
                  {showOwnNote && <RowNote note={data.note} />}
                </div>
              </div>

              {/* Dose and note render once after the last member of each
                  cluster — outside the prefix layout so they span full width.
                  Left-padded by the rail width + gap so they line up under
                  the drug name column rather than flush with the Rx/or rail. */}
              {isLastMemberOfCluster && (
                <div style={{ paddingInlineStart: RX_RAIL_WIDTH + RX_RAIL_GAP }}>
                  {cluster.dose && <DoseLine text={cluster.dose} />}
                  {cluster.note && <RowNote note={cluster.note} />}
                </div>
              )}
            </React.Fragment>
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
 * Linked names: small external-link icon after the name signals "opens
 * another screen" without implying selection state. The whole drug row
 * (not just the name) is now tappable — handled one level up in
 * UnifiedDrugRow — so this component just renders the icon as a visual cue.
 * Concentration: plain lighter text right after name, no dot prefix.
 * Form: pill/badge styling (distinct visual weight from concentration).
 * Search icon: right-side icon that opens Google Images for the drug in Egypt.
 *
 * Typography scale (batch 2 fine-grained fixes):
 *   name: 17→15px, concentration: 13→12px, form pill: 11→10px
 *   Inner row alignItems: baseline→center (fixes form pill vertical centering)
 *
 * VISUAL-WEIGHT PASS: inner row gap dropped 8 -> 5, tightening the spacing
 * between the drug name, concentration, and form so they read as one
 * cohesive line rather than three loosely-spaced chips.
 */
function DrugMainLine({ name, concentration, form, linkEnabled }) {
  if (!name) return null

  const handleSearchClick = (e) => {
    e.stopPropagation()
    const query = [name, concentration, form, 'Egypt'].filter(Boolean).join(' ')
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      {/* Name line: name + conc + form + link icon + search icon — equal spacing */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 17, fontWeight: 600,
            color: 'var(--color-text-primary)',
            lineHeight: 1.3,
          }}>
            {name}
          </span>

          {/* Concentration — raised from secondary to near-primary contrast;
              this was reading as near-invisible at the old --color-text-secondary
              weight, despite being clinically load-bearing information. */}
          {concentration && (
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: 'color-mix(in srgb, var(--color-text-primary) 70%, var(--color-text-secondary) 30%)',
              lineHeight: 1.3,
            }}>
              {concentration}
            </span>
          )}

          {/* Form — same contrast tier as concentration, kept bolder + a
              subtle pill so it still reads as its own distinct chip. */}
          {form && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: 'color-mix(in srgb, var(--color-text-primary) 70%, var(--color-text-secondary) 30%)',
              lineHeight: 1.3,
              letterSpacing: '0.01em',
              flexShrink: 0,
            }}>
              {form}
            </span>
          )}

          {/* Link icon — moved to the end of the whole formula (name +
              concentration + form), not flush against the name, so it reads
              as "this entire entry opens a detail page" rather than being
              visually tied to the name alone. */}
          {linkEnabled && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ExternalLink size={11} strokeWidth={1.5} color="var(--color-accent)" style={{ opacity: 0.55 }} />
            </span>
          )}
        </div>

        {/* Image-search icon — opens Google Images for this drug in Egypt. */}
        <button
          onClick={handleSearchClick}
          aria-label={`Search images for ${name}`}
          style={{
            background: 'none', border: 'none', padding: '0px 0 4px 0',
            cursor: 'pointer', flexShrink: 0,
            color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center',
            lineHeight: 1,
          }}
        >
          <ScanSearch size={16} strokeWidth={1.8} color="currentColor" />
        </button>
      </div>
    </>
  )
}

/**
 * DoseLine — no adult/child tag.
 * VISUAL HIERARCHY PASS (2026-06-30): dropped from 15px/600 to 14px/500.
 * At 15px/600 in near-black --color-dose it was pulling visual weight
 * comparable to the 18px/700 drug name, collapsing the intended hierarchy
 * (name > dose > strength/form > Rx label). Weight does the "this matters"
 * signaling here, not boldness — 500 is enough to read as distinct from
 * plain body text while staying clearly subordinate to the name above it.
 * --color-dose itself (cool slate/ink, distinct from text-primary, no
 * success/warning connotation) is unchanged from Phase 9.
 */
const ARABIC_RE_DOSE = /[\u0600-\u06FF\u0750-\u077F]/

function DoseLine({ text }) {
  const isArabic = ARABIC_RE_DOSE.test(text?.trim().charAt(0)) || ARABIC_RE_DOSE.test(text ?? '')
  return (
    <div dir="auto" style={{ marginTop: 8, paddingInlineStart: 6, textAlign: isArabic ? 'right' : 'left', unicodeBidi: 'plaintext' }}>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--color-dose)',
        lineHeight: 1.55,
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
 * Direction: the icon and box position are fixed flush-left regardless of
 * language, so the note always lines up directly under the drug name above
 * it. The text itself still gets dir="auto" so Arabic characters/punctuation
 * shape and order correctly — only the box's position is locked.
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

  // Box position stays fixed flush-left (outer dir="ltr") so it always lines
  // up under the drug name regardless of language. Only the internal packing
  // order flips for Arabic — icon moves to the right edge of this same box,
  // text aligns right within it — so each language still feels native
  // without the whole note jumping to the far right of the screen.
  const isArabic = ARABIC_RE.test(note.trim().charAt(0)) || ARABIC_RE.test(note)

  return (
    <div
      dir="ltr"
      style={{
        display: 'flex',
        flexDirection: isArabic ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginTop: 6,
      }}
    >
      <span style={{
        flexShrink: 0,
        marginTop: 3,
        color: 'var(--color-text-secondary)',
        opacity: 0.75,
        display: 'flex',
        alignItems: 'center',
      }}>
        <FileText size={13} color="currentColor" />
      </span>
      <span
        dir="auto"
        style={{
          fontSize: 12,
          fontWeight: 500,
          fontStyle: 'normal',
          color: 'color-mix(in srgb, var(--color-text-secondary) 80%, var(--color-text-primary) 20%)',
          lineHeight: 1.5,
          textAlign: isArabic ? 'right' : 'left',
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
      flexShrink: 0,
      marginTop: 2,
      minWidth: 22,
      textAlign: 'left',
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--color-text-secondary)',
        lineHeight: 1,
      }}>
        {index}.
      </span>
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
// OrMarker is now inline — rendered as a prefix inside DrugMainLine via prop

const rowWrap = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: '13px 0',
}
