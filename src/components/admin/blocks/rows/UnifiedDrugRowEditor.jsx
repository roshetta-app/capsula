/**
 * src/components/admin/blocks/rows/UnifiedDrugRowEditor.jsx
 *
 * Phase 1 — Unified prescription drug row editor.
 *
 * Replaces the two separate DrugFreetextRowEditor and DrugLibraryRowEditor
 * components with a single editor that handles both origins via the same
 * field set (masterplan §2.1). Origin (library-linked vs. free-text) is
 * expressed by whether brand_id / generic_id / formulation_id are populated,
 * not by a different row_type.
 *
 * Steps implemented here:
 *   1.1  All fields: brand name (plain text input), generic name (autocomplete),
 *        Arabic name (auto-filled on library pick, freely editable),
 *        concentration, form (dropdown), dose, note (single bidi field).
 *   1.2  Brand picking: two explicit picker buttons — "Pick a brand…" opens
 *        DrugPickerModal in brand mode; "Pick a formulation…" opens it in
 *        formulation mode. Free-text brand_name is a plain editable field
 *        (no brand autocomplete dropdown — replaced by the explicit pickers
 *        per Phase 1 spec).
 *   1.3  Generic-name autocomplete (§2.6): independent of brand matching;
 *        links generic_id when a match is found, null otherwise.
 *   1.4  dose_override removed. Single pre-fillable, freely editable dose field.
 *   1.5  Validation: block save if both brand_name and generic_name are empty.
 *        (Validation state is surfaced via a visible error inside the component;
 *        the parent PrescriptionSheetEditor should also gate its save.)
 *   1.5a "Not in library" always-visible tag on any row without real library IDs.
 *   1.6  Data shape matches prescriptionRowSchema.js DRUG_ROW_TEMPLATE exactly.
 *   1.8  "Add alternative" button opens DrugPickerModal (brand or formulation
 *        mode) or free-text entry; appends to row.alternatives array.
 *   1.9  Alternatives rendered nested under main drug (indented), each with
 *        its own remove control.
 *   1.10 Shared-vs-own dose/note: uses alternativeSharesParentDose() from
 *        schema file. When shared, both the dose and note inputs are
 *        hidden entirely (not just visually suppressed) so an admin can't
 *        fill in a value that's silently ignored at render time.
 *   1.11 Delete-with-promote flow: if a row has alternatives, the parent is
 *        notified via onDeleteRequest (not onDelete) so PrescriptionSheetEditor
 *        can show the promote dialog. This component exports the
 *        PromoteAlternativeDialog too, for use in PrescriptionSheetEditor.
 *   3.3  PHASE 3 (2026-06-20): "Same formulation, different brand" alternatives
 *        get a dedicated scoped entry point — DrugPickerModal mode="brand-scoped",
 *        pre-filtered to the parent/main row's formulation_id (only shown once
 *        that formulation_id exists). The resulting alternative's
 *        formulation_id/concentration/form/route/category are force-set from
 *        the parent row, not from the picked brand's own nested formulation —
 *        so it can never independently drift from the parent's identity, which
 *        is what makes alternativeSharesParentDose() reliably true for this
 *        path. The existing unscoped "Pick a brand…" / "Pick a formulation…"
 *        buttons remain, unchanged, for the "different drug, same purpose" case.
 *   6.1  PHASE 6 (2026-06-21): "Save to library" parity for alternatives.
 *        AlternativeRow now has the same promote button, category/route
 *        selects, and error display that the main row's free-text mode
 *        already had — gated the same way, on !isLinked. Reuses the exact
 *        generic→formulation→brand reuse-or-create logic from the main
 *        row's handlePromote (no new query functions), just reading from
 *        and patch()-ing this alternative's own fields instead of the
 *        parent row's. Promoting one alternative never touches the parent
 *        row or any other alternative on the same drug row.
 *
 *   PHASE 1 (2026-06-22) — Admin Condition Editor Redesign, Decision 1:
 *        1.1 The Brand Name / Generic Name / Concentration / Form fields,
 *            their read-only-once-linked display block, and the
 *            "Pick a brand…" / "Pick a formulation…" / "Pick brand (same
 *            formulation)…" trigger buttons are REMOVED from both the main
 *            row and AlternativeRow's identity entry. Replaced by a single
 *            DrugSearchField per drug line (Phase 0.2 component).
 *        1.2 Silent auto-fill of concentration/form/Arabic name/category on
 *            library selection is preserved unchanged — handleBrandPick (main)
 *            and AlternativeRow's own handleBrandPick are reused as-is for
 *            DrugSearchField's onLink, since DrugSearchField's mode="brand"
 *            onLink result is shaped identically to what DrugPickerModal
 *            mode="brand" already produced. Only the entry point changed,
 *            not the fill logic.
 *        1.3 Free-text manual entry path preserved: typing without selecting
 *            a search result leaves the row unlinked (brand_id / generic_id /
 *            formulation_id stay null). DrugSearchField's live editing state
 *            is the unlinked path — no separate mechanism needed.
 *        1.4 Drug-link toggle rendered as icon-only button (Decision 1's
 *            anti-label-clutter rule). Labeled button text ("Drug link: ON /
 *            OFF") and explanatory subtext ("Name taps navigate to Drug
 *            Detail screen") removed. Only the Link/Unlink icon remains,
 *            with an aria-label for accessibility.
 *        1.5 Visual hierarchy applied to drug name per Decision 5: 15px /
 *            600-weight / primary color / pill icon to the left. Implemented
 *            in DrugSearchField.jsx's linked read-only display.
 *        DrugPickerModal mode="formulation" and mode="brand-scoped" call
 *        sites tied to *identity* entry are removed along with their now-dead
 *        trigger buttons/state (handleFormulationPick / handleScopedBrandPick
 *        and their modals). The "Add alternative" buttons at the bottom of
 *        the main row (which add a brand-new alternative line) are a
 *        separate, Phase 2-scoped concern and are left untouched here.
 *        KNOWN GAP (flagged, not solved here): mode="brand" search cannot
 *        find a formulation that has zero brands yet (pure generic, no
 *        brand row). The old "Pick a formulation…" button could. No locked
 *        decision covers this; flagging for the project owner.
 *
 *   PHASE 2.2-A (2026-06-24) — introduced groups[] state model (Decision 5).
 *        toDrugOptions / fromDrugOptions imported; groups[] state initialized
 *        on mount from the incoming row. No rendering change in that step.
 *
 *   PHASE 2.2-B (2026-06-24) — flat groups[] render (Decision 5, structural
 *        replacement; no move icon, no note slots, no visual hierarchy yet).
 *        - AlternativeRow retired. Replaced by DrugOptionRow — a per-option
 *          sub-component carrying all per-drug state: promote flow, dose-age-
 *          group chooser, link/unlink, showManualFields / genericOnlyMode
 *          reveal, drug_link_enabled toggle.
 *        - Main component render loops over groups[]: each group renders its
 *          stacked DrugOptionRow entries, then one shared dose field below.
 *        - "Alternatives" label removed (Decision 5: no main/alt hierarchy).
 *        - Old per-option picker modals (altBrandPickerOpen, etc.) and all
 *          per-drug parent state (mainDoseChoice, pendingAlt, noteOpen,
 *          genericOnlyMode, promoteOn / promoteCategory / …) removed from
 *          parent — they now live locally inside each DrugOptionRow.
 *        - "Add option" buttons replace "add alternative" buttons; same
 *          formulation_id default-join logic decides which group a new drug
 *          joins (alternativeSharesParentDose-equivalent, applied directly).
 *        - fromDrugOptions() called on every groups[] mutation to emit the
 *          updated DRUG_ROW_TEMPLATE row back through onChange unchanged.
 *        - PromoteAlternativeDialog export unchanged.
 *
 *   PHASE 2.2-C (2026-06-24) — per-group note slot (Decision 5 two-slot model).
 *        GroupNoteSlot component added; updateGroupNote() mutation added.
 *        Group note renders below dose, collapsed by default, stays open.
 *
 *   UI PASS (2026-08-08): both GroupNoteSlot's "+ group note" and
 *        DrugOptionNoteSlot's "+ note" collapsed triggers restyled from
 *        bare unbordered text to the same dashed-pill button pattern
 *        AddDrugControls already uses ("Add a drug" / "More options"),
 *        with a small Plus icon — reads as an actual clickable control
 *        instead of floating gray text.
 *
 *   PHASE 2.2-D (2026-06-24) — visual hierarchy + divider + per-drug note slot.
 *        Decision 5 three-tier hierarchy (name > dose > note) applied:
 *        - Dose: 12px, regular weight, secondary color, 19px left indent.
 *        - Notes (both slots): 11px, italic, tertiary color; no FieldLabel.
 *        - Divider line between groups (locked choice — not a left-rail).
 *        - Per-drug note slot (DrugOptionNoteSlot) added to DrugOptionRow,
 *          rendered directly under the drug's search field. Collapsed behind
 *          "+ note" until clicked; stays open; travels with the drug option.
 *          option.note written via patch() and round-tripped through
 *          fromDrugOptions → AlternativeDrug.note unchanged.
 *
 *   PHASE 2.4 (2026-06-25) — move affordance (Decision 5, locked interaction).
 *        MoveMenu component added. Each DrugOptionRow receives a new 'onMove'
 *        prop: (action: 'new-group'|'above'|'below') => void. A GripVertical
 *        icon button on the header row opens an inline absolute-positioned
 *        menu with context-sensitive options:
 *        - "Move to new group" — only shown when current group has >1 option
 *          (splitting a sole option off into its own new group is a no-op).
 *        - "Move to group above" — only shown when groupIdx > 0.
 *        - "Move to group below" — only shown when groupIdx < groups.length-1.
 *        Menu dismisses on click-outside (useEffect + ref). Three new mutation
 *        helpers in the main component: moveToNewGroup, moveToGroupAbove,
 *        moveToGroupBelow — all routed through emitGroups(). The move icon
 *        is suppressed entirely when totalOptions === 1 (nothing to move).
 *        No drag-and-drop, no click-to-cycle — this exact interaction is the
 *        locked choice per Decision 5.
 *
 * Props:
 *   row        — DrugRow shape (see prescriptionRowSchema.js DRUG_ROW_TEMPLATE)
 *   onChange   — (nextRow: DrugRow) => void
 *
 * Data notes:
 *   - _formulationMeta is a transient UI-only field (name_en, concentration,
 *     form, route) mirrored from the library pick so the editor can display it.
 *     PrescriptionSheetEditor strips underscore-prefixed keys before persisting,
 *     just as it did for DrugLibraryRowEditor.
 *   - All autocomplete queries go directly to Supabase (same pattern as
 *     DrugPickerModal) — the useDrugs cache is app-facing, not CMS-facing.
 */

import { useState, useRef, useEffect } from 'react'
import { Link, Plus, X, Library, RotateCcw, Edit2, Check, ChevronDown, MoreHorizontal } from 'lucide-react'
import DrugPickerModal from '../../DrugPickerModal'
import DrugSearchField from '../../DrugSearchField'
import { DRUG_FORMS } from '../../../../config/forms'
import { DRUG_CATEGORIES } from '../../../../config/categories'
import {
  findGenericByName,
  findFormulationMatch,
  findBrandMatch,
  insertGeneric,
  insertFormulation,
  insertBrand,
  fetchGenericsPage,
  fetchFormulationsForGeneric,
  fetchFormulationWithGeneric,
  updateFormulation,
} from '../../../../lib/adminQueries'
import {
  DRUG_OPTION_TEMPLATE,
  SOURCE_FLAG_VALUE,
  doseWhoLabel,
  doseLineInstructionText,
  toDrugOptions,
  fromDrugOptions,
} from '../../../../constants/prescriptionRowSchema'

// ─── Strength helpers (2026-08-08) ──────────────────────────────────────────
// Duplicated from FormulationEditor.jsx rather than imported — that file
// doesn't export these, and this component's need is a single flat
// value/unit/basis triple rather than FormulationEditor's per-ingredient
// array, so a straight import wouldn't fit anyway. Same normalize/suppress
// rules, kept in sync by hand if FormulationEditor's ever change.

// Normalizes a basis string like "per_5ml" or "per 5 ml" into one clean
// form ("per_5ml") — same rule as FormulationEditor.jsx.
function normalizeBasis(raw) {
  const trimmed = (raw ?? '').trim()
  const stripped = trimmed.replace(/^per[_\s]+/i, '')
  const collapsed = stripped.replace(/\s+/g, '')
  return `per_${collapsed}`
}

// Bases with no useful suffix to show — same list as FormulationEditor.jsx.
const SUPPRESSED_BASES = ['percentage', 'per_unit']

// Builds the display-string Concentration value from one value/unit/basis
// triple, e.g. ('500', 'mg', '') -> '500mg'; ('120', 'mg', 'per_5ml') ->
// '120mg / 5ml'. Single-ingredient equivalent of FormulationEditor's
// buildConcentration(ingredients[]).
function buildStrengthConcentration(value, unit, basis) {
  const v = (value ?? '').toString().trim()
  const u = (unit ?? '').trim()
  const joined = `${v}${u}`.trim()
  const rawBasis = (basis ?? '').trim()
  if (!rawBasis) return joined
  if (SUPPRESSED_BASES.includes(rawBasis)) return joined
  const normalized = normalizeBasis(rawBasis)
  if (SUPPRESSED_BASES.includes(normalized)) return joined
  const readable = normalized.replace(/^per_/, '')
  return joined ? `${joined} / ${readable}` : `/ ${readable}`
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

function textInput(extraStyle = {}) {
  return {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px',
    border: '1.5px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    fontSize: 13, fontFamily: 'var(--font-body)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
    outline: 'none',
    ...extraStyle,
  }
}

function FieldLabel({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{hint}</span>
      )}
    </div>
  )
}

// ─── "Not in library" tag ──────────────────────────────────────────────────────

function NotInLibraryTag() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 7px',
      borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      textTransform: 'uppercase',
      background: '#f59e0b18',
      color: '#b45309',
      border: '1px solid #f59e0b40',
      flexShrink: 0,
      alignSelf: 'flex-start',
    }}>
      Not in library
    </span>
  )
}

// ─── Dose population chooser ────────────────────────────────────────────────────
// Rebuilt for the Practical Doses redesign (CMS_LIBRARY_PLAN.md decision 25,
// plan §7 Practical Doses step 2): a formulation's doses_structured is now
// { population, max_dose?, brackets: [{ id, bracket?, instruction, note? }] }[]
// (decision 7's addendum) rather than a flat list of one-dose-per-row. Picking
// a dose is a single-population pick, not a pick-one-sentence chooser — every
// bracket under the chosen population becomes its own line on the row (see
// buildDoseLinesFromPopulation below), not one flattened sentence.

function PopulationChooser({ populations, onChoose, onSkip }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-accent)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      backgroundColor: '#EFF6FF',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Which patient group is this dose for?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {populations.map((population, i) => {
          const bracketCount = Array.isArray(population.brackets) ? population.brackets.length : 0
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChoose(population)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '7px 10px', textAlign: 'left',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                {population.population?.trim() || 'Untitled'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {bracketCount === 1 ? '1 dose line' : `${bracketCount} dose lines`}
              </span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onSkip}
        style={{
          alignSelf: 'flex-start',
          background: 'none', border: 'none', padding: 0,
          fontSize: 11, color: 'var(--color-text-tertiary)',
          textDecoration: 'underline', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        Skip — leave dose blank
      </button>
    </div>
  )
}

// Turns one chosen population's brackets into independent dose lines, each
// carrying the permanent bracket id (decision 7's addendum) so the "save
// this edit back to the library" action and the bulk-refresh tool can
// trace a line back to the exact library note it came from. A bracket with
// no usable instruction is silently dropped, same as before.
//
// FIELD-SEPARATION ADDENDUM (2026-08-06): a bracket's title and instruction
// are now kept as two separate pieces ('bracket_title' / 'instruction')
// instead of being flattened into one 'text' sentence — this is what lets
// the CMS editor show/edit them as two real fields, and lets "save back to
// the library" write each piece into the right spot without guessing how
// to split combined text apart. The population's max_dose is pulled out to
// the group-level 'dose_max' (applied once by applyDoseToGroup, not per
// line) instead of being repeated inside every bracket's text. 'text' is
// left null on every newly-built line — it is only ever populated on
// legacy lines saved before this addendum, and doseLineInstructionText()
// is what every reader (this editor, the app renderer, the bulk-refresh
// tool) uses to fall back to it correctly.
//
// MAX-DOSE SAVE-TO-LIBRARY ADDENDUM (2026-08-06): 'dose_max_population_id'
// mirrors 'bracket_id' above exactly, but for the group's max dose instead
// of one line — it's what lets saveMaxDoseToLibrary() below trace a
// group's dose_max back to the exact population it came from, now that
// DoseRowList.jsx actually stamps a permanent id onto every population
// (see that file's ID BACKFILL FIX comment). null for any group whose
// dose_max was hand-typed rather than picked from a population.
function buildDoseLinesFromPopulation(population) {
  const brackets = Array.isArray(population?.brackets) ? population.brackets : []
  const dose_lines = brackets
    .filter(bracket => bracket?.instruction?.trim())
    .map(bracket => ({
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      bracket_id: bracket.id ?? null,
      bracket_title: bracket.bracket?.trim() || null,
      instruction: bracket.instruction.trim(),
      text: null,
    }))
  return {
    dose: null,
    dose_who: population?.population ?? null,
    dose_lines,
    dose_max: population?.max_dose?.trim() || null,
    dose_max_population_id: population?.id ?? null,
  }
}

function resolveDosePick(dosesStructured) {
  const populations = Array.isArray(dosesStructured) ? dosesStructured : []
  if (populations.length === 0) return { needsChoice: false, dose: null, dose_who: null, dose_lines: [], dose_max: null, dose_max_population_id: null }
  if (populations.length === 1) {
    return { needsChoice: false, ...buildDoseLinesFromPopulation(populations[0]) }
  }
  return { needsChoice: true, populations }
}

// ─── EditableDoseLine ────────────────────────────────────────────────────────
// FIELD-SEPARATION ADDENDUM (2026-08-06): one dose_lines row, shown as
// clean read-only text by default (title bold-ish, instruction plain,
// mirroring how it will look on the actual patient sheet), with an edit
// button that opens the title + instruction into two real inputs. This
// replaces the old always-editable single text box — reduces visual noise
// when nothing needs changing, while keeping editing exactly as available
// as before.
//
// A legacy line (saved before this addendum) has 'instruction' as null and
// its whole wording in 'text'. Opening such a line for the first time seeds
// the instruction box with that existing text (so nothing is lost) and
// leaves the title box blank — there is no safe way to guess where a title
// ends and the instruction begins inside old flattened text, so this asks
// the admin to fill the title back in if one applies, rather than guessing
// wrong. Once edited, the line is in the new shape going forward and
// 'text' is no longer read for it.
function EditableDoseLine({
  line, onUpdateField, onRemove,
  canSaveToLibrary, isConfirming, onRequestSave, onConfirmSave, onCancelConfirm,
  isSaving, isSaved, saveError,
  startInEdit = false, onEditConsumed,
}) {
  const [isEditing, setIsEditing] = useState(startInEdit)

  // NOISE-REDUCTION PASS (2026-08-08): the read-only row's action icons
  // (edit / save-to-library / remove) used to be permanently visible,
  // which is most of what made a dose section with several brackets read
  // as cluttered. Now they only render once this row is hovered — same
  // isHovered-driven inline-style approach already used elsewhere in this
  // file (see the plain onMouseEnter/onMouseLeave handlers a few
  // components down), just applied at the row level instead of a single
  // button. Editing/saving/error states are unaffected — those still show
  // regardless of hover, since they're active feedback, not idle chrome.
  const [isHovered, setIsHovered] = useState(false)

  // Mount-time-only read (same "runs once" pattern already used elsewhere
  // in this file, e.g. DrugOptionRow's startInManualMode) — startInEdit
  // only matters at the instant this specific bracket is first rendered;
  // it should never re-trigger on a later re-render.
  useEffect(() => {
    if (startInEdit) onEditConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function startEditing() {
    if (line.instruction == null) {
      // Legacy line — one-time split: move the existing flattened text into
      // the instruction box so it isn't lost, title starts blank.
      onUpdateField('instruction', line.text ?? '')
    }
    setIsEditing(true)
  }

  const displayInstruction = doseLineInstructionText(line)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <input
            type="text"
            value={line.bracket_title ?? ''}
            onChange={e => onUpdateField('bracket_title', e.target.value || null)}
            placeholder="Title, e.g. 5-7.9kg (3-6 months)"
            dir="auto"
            style={editLineInputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="text"
              value={line.instruction ?? ''}
              onChange={e => onUpdateField('instruction', e.target.value)}
              placeholder="Instruction"
              dir="auto"
              style={{ ...editLineInputStyle, flex: 1 }}
            />
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              title="Done editing"
              aria-label="Done editing this dose line"
              style={lineIconButtonStyle}
            >
              <Check size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            borderRadius: 'var(--radius-md)',
            backgroundColor: isHovered ? 'var(--color-bg)' : 'transparent',
          }}
        >
          <div
            dir="auto"
            style={{
              flex: 1,
              padding: '3px 8px',
              fontSize: 12, fontFamily: 'var(--font-body)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {line.bracket_title && (
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {line.bracket_title}{': '}
              </span>
            )}
            {displayInstruction}
          </div>
          {/* Action icons only render once hovered — isSaved still shows its
              accent color the moment the row is next hovered after a save,
              same feedback as before, just not competing for attention
              while the row is at rest. */}
          {isHovered && (
            <>
              <button
                type="button"
                onClick={startEditing}
                title="Edit this dose line"
                aria-label="Edit this dose line"
                style={lineIconButtonStyle}
              >
                <Edit2 size={12} />
              </button>
              {canSaveToLibrary && (
                <button
                  type="button"
                  onClick={onRequestSave}
                  disabled={isSaving}
                  title="Save this wording back to the drug library"
                  aria-label="Save this dose line back to the drug library"
                  style={{
                    ...lineIconButtonStyle,
                    color: isSaved ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    cursor: isSaving ? 'default' : 'pointer',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  <Library size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                title="Remove this line"
                aria-label="Remove this dose line"
                style={lineIconButtonStyle}
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      )}

      {isConfirming && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '6px 8px',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#EFF6FF',
        }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
            Save this wording to the drug library for everyone?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onConfirmSave}
              style={{
                background: 'var(--color-accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              style={{
                background: 'none', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isSaving && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Saving…</span>
      )}
      {isSaved && (
        <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>Saved to library</span>
      )}
      {saveError && (
        <span style={{ fontSize: 10, color: '#ef4444' }}>{saveError}</span>
      )}
    </div>
  )
}

const editLineInputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '3px 8px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: 12, fontWeight: 400,
  fontFamily: 'var(--font-body)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  outline: 'none',
}

const lineIconButtonStyle = {
  flexShrink: 0,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 22, height: 22,
  border: 'none', background: 'none', padding: 0,
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-tertiary)',
  cursor: 'pointer',
}

// ─── EditableMaxDose ────────────────────────────────────────────────────────
// FIELD-SEPARATION ADDENDUM (2026-08-06): the group's shared "max dose" note
// gets the same read-only-by-default + edit-toggle treatment as each
// EditableDoseLine above — clean text by default, pencil opens it into a
// real input, checkmark closes it back to read-only. Mirrors
// EditableDoseLine's edit/remove buttons exactly (same icons, same
// lineIconButtonStyle/editLineInputStyle).
//
// MAX-DOSE SAVE-TO-LIBRARY ADDENDUM (2026-08-06): also mirrors
// EditableDoseLine's "save this wording back to the drug library" button
// and confirm-first flow, now that DoseRowList.jsx stamps a permanent id
// on every population — see saveMaxDoseToLibrary at the call site for the
// matching logic (by population id rather than bracket id).
//
// Empty state: no value and not currently editing shows a "+ Max dose"
// trigger instead of an empty box, matching the existing "+ note" /
// "+ group note" convention used elsewhere in this same editor
// (see GroupNoteSlot below).
// DECLUTTER PASS 3 (Direction 1, 2026-08-08): accepts an optional
// trailingAction node (the restyled "Add bracket" inline link) rendered on
// the same line as the max-dose value/empty-state trigger, joined with a
// middle dot — e.g. "max 1200mg/day · + add bracket" — instead of "Add
// bracket" sitting in its own dashed-chrome block above this. Suppressed
// while editing or confirming a save, so that flow isn't crowded.
function EditableMaxDose({
  value, onChange, onRemove,
  canSaveToLibrary, isConfirming, onRequestSave, onConfirmSave, onCancelConfirm,
  isSaving, isSaved, saveError,
  trailingAction,
}) {
  const [isEditing, setIsEditing] = useState(false)
  // NOISE-REDUCTION PASS (2026-08-08): same hover-gated icons as
  // EditableDoseLine — see that component's comment for the reasoning.
  const [isHovered, setIsHovered] = useState(false)

  const trailingLinkStyle = {
    background: 'none', border: 'none', padding: 0,
    fontSize: 11, color: 'var(--color-text-tertiary)',
    textDecoration: 'underline', cursor: 'pointer',
    fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
  }

  if (!value && !isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          style={{ ...trailingLinkStyle, alignSelf: 'flex-start' }}
        >
          + Max dose
        </button>
        {trailingAction && (
          <>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>·</span>
            {trailingAction}
          </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Max dose, shown once under all lines"
            dir="auto"
            style={{ ...editLineInputStyle, flex: 1 }}
          />
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            title="Done editing"
            aria-label="Done editing max dose"
            style={lineIconButtonStyle}
          >
            <Check size={13} />
          </button>
        </div>
      ) : (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            borderRadius: 'var(--radius-md)',
            backgroundColor: isHovered ? 'var(--color-bg)' : 'transparent',
          }}
        >
          <div
            dir="auto"
            style={{
              flex: 1,
              padding: '3px 8px',
              fontSize: 12, fontFamily: 'var(--font-body)', fontStyle: 'italic',
              color: 'var(--color-text-secondary)',
            }}
          >
            {value}
          </div>
          {trailingAction && !isConfirming && (
            <>
              <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>·</span>
              {trailingAction}
            </>
          )}
          {isHovered && (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                title="Edit max dose"
                aria-label="Edit max dose"
                style={lineIconButtonStyle}
              >
                <Edit2 size={12} />
              </button>
              {canSaveToLibrary && (
                <button
                  type="button"
                  onClick={onRequestSave}
                  disabled={isSaving}
                  title="Save this wording back to the drug library"
                  aria-label="Save this max dose back to the drug library"
                  style={{
                    ...lineIconButtonStyle,
                    color: isSaved ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    cursor: isSaving ? 'default' : 'pointer',
                    opacity: isSaving ? 0.5 : 1,
                  }}
                >
                  <Library size={13} />
                </button>
              )}
              <button
                type="button"
                onClick={onRemove}
                title="Remove max dose"
                aria-label="Remove max dose"
                style={lineIconButtonStyle}
              >
                <X size={13} />
              </button>
            </>
          )}
        </div>
      )}

      {isConfirming && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 4,
          padding: '6px 8px',
          border: '1px solid var(--color-accent)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: '#EFF6FF',
        }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
            Save this max dose to the drug library for everyone?
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onConfirmSave}
              style={{
                background: 'var(--color-accent)', color: '#fff',
                border: 'none', borderRadius: 'var(--radius-md)',
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelConfirm}
              style={{
                background: 'none', color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                padding: '3px 10px', fontSize: 11, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isSaving && (
        <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Saving…</span>
      )}
      {isSaved && (
        <span style={{ fontSize: 10, color: 'var(--color-accent)' }}>Saved to library</span>
      )}
      {saveError && (
        <span style={{ fontSize: 10, color: '#ef4444' }}>{saveError}</span>
      )}
    </div>
  )
}

// ─── EditablePopulation ─────────────────────────────────────────────────────
// A group's "who this dose is for" (dose_who) gets the same read-only-badge
// + edit-toggle treatment as a dose line or max dose — a pill by default
// (reusing doseWhoLabel's lookup so known keys like 'adult' still show their
// friendly label), a pencil to rename it, and a "+ Population" trigger when
// empty. Previously this was a plain, permanently read-only badge, since
// dose_who was only ever set by a library pick — now that a dose can be
// built from scratch (see addBracket below), it needs to be typeable too.
function EditablePopulation({ value, onChange }) {
  const [isEditing, setIsEditing] = useState(false)
  // NOISE-REDUCTION PASS (2026-08-08): same hover-gated icon treatment as
  // EditableDoseLine/EditableMaxDose — the pencil only shows on hover.
  const [isHovered, setIsHovered] = useState(false)

  if (!value && !isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        style={{
          alignSelf: 'flex-start',
          marginLeft: 19,
          background: 'none', border: 'none', padding: 0,
          fontSize: 11, color: 'var(--color-text-tertiary)',
          textDecoration: 'underline', cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        + Population
      </button>
    )
  }

  return isEditing ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 19 }}>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Population, e.g. Adult"
        dir="auto"
        autoFocus
        style={{ ...editLineInputStyle, width: 200 }}
        onBlur={() => setIsEditing(false)}
        onKeyDown={e => { if (e.key === 'Enter') setIsEditing(false) }}
      />
    </div>
  ) : (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: 19 }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '1px 7px',
        borderRadius: 99,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
        color: 'var(--color-accent)',
        background: 'var(--color-accent-light)',
        fontFamily: 'var(--font-body)',
      }}>
        {doseWhoLabel(value)}
      </span>
      {isHovered && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          title="Edit population"
          aria-label="Edit population"
          style={{ ...lineIconButtonStyle, width: 18, height: 18 }}
        >
          <Edit2 size={11} />
        </button>
      )}
    </div>
  )
}

// ─── GroupNoteSlot ─────────────────────────────────────────────────────────────
// PHASE 2.2-C: per-group note slot, rendered below the dose field for each
// group. Holds its own 'noteOpen' state so groups open/close independently.
// PHASE 2.2-D: restyled to Decision 5 note-tier hierarchy — 11px, italic,
// tertiary color. No FieldLabel (labels are removed per Decision 4). Button
// label changed to "+ group note" to distinguish from the per-drug "+ note"
// slot (DrugOptionNoteSlot) which sits directly under each drug name.

function GroupNoteSlot({ note, onChange }) {
  const [noteOpen, setNoteOpen] = useState(!!note)

  // PHASE A BUG FIX (2026-06-26, defensive): re-sync open state whenever
  // note is non-empty, rather than relying solely on the mount-only
  // useState(!!note) initializer above. Applied here as a precaution —
  // see the identical, confirmed-triggering bug in DrugOptionNoteSlot
  // below for the full explanation of the remount/timing risk this
  // guards against.
  useEffect(() => {
    if (note) setNoteOpen(true)
  }, [note])

  if (noteOpen) {
    return (
      <input
        type="text"
        value={note ?? ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder="Group note (e.g. Take with food)"
        dir="auto"
        autoFocus={!note}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '4px 8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 11, fontStyle: 'italic',
          fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-tertiary)',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setNoteOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', padding: 0,
        fontSize: 11, fontStyle: 'italic', fontWeight: 600,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        alignSelf: 'flex-start',
      }}
    >
      <Plus size={10} /> group note
    </button>
  )
}

// ─── DrugOptionNoteSlot ────────────────────────────────────────────────────────
// PHASE 2.2-D: per-drug note slot (Decision 5 two-slot note model). Rendered
// directly under each drug name in DrugOptionRow. Same collapsed-by-default /
// stays-open behavior as GroupNoteSlot, but:
//   - Labelled "+ note" (shorter — position under the name makes it clear this
//     is the per-drug note, not the group note below the dose).
//   - Travels with the drug option when it is moved to a different group
//     (the note lives on 'option.note', not on the group record).
//
// Visual tier: 11px, italic, tertiary color — lowest visual priority, matching
// the note tier in Decision 5's name > dose > note hierarchy.
//
// Props:
//   note      — current per-drug note value (string|null)
//   onChange  — (value: string|null) => void

function DrugOptionNoteSlot({ note, onChange }) {
  const [open, setOpen] = useState(!!note)

  // PHASE A BUG FIX (2026-06-26): re-sync open state whenever note is
  // non-empty, instead of relying solely on the mount-only
  // useState(!!note) initializer above. That initializer only
  // evaluates once, on mount — if this component remounts (new
  // option.id/key, or the surrounding groups[] array gets rebuilt in a
  // way that changes this option's position/identity) before the
  // patched note value has fully flowed back into the option prop this
  // component receives, 'open' re-initializes to false on the remount,
  // and a non-empty note appears to vanish behind a re-collapsed
  // "+ note" button — even though the value is still present in state.
  // This matches the reported bug exactly: a per-drug note in a group
  // of 2+ "vanishes" after the row collapses, as if it never existed.
  // This keeps the existing "stays open once clicked, no auto-collapse
  // on blur" behavior (Decision 5) intact — it only ever forces OPEN
  // when there is real content to show, never forces closed.
  useEffect(() => {
    if (note) setOpen(true)
  }, [note])

  if (open) {
    return (
      <input
        type="text"
        value={note ?? ''}
        onChange={e => onChange(e.target.value || null)}
        placeholder="Drug note (e.g. Preferred for children)"
        dir="auto"
        autoFocus={!note}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '4px 8px',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: 11, fontStyle: 'italic',
          fontFamily: 'var(--font-body)',
          backgroundColor: 'var(--color-surface)',
          color: 'var(--color-text-tertiary)',
          outline: 'none',
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        background: 'none', border: 'none', padding: 0,
        fontSize: 11, fontStyle: 'italic', fontWeight: 600,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        alignSelf: 'flex-start',
      }}
    >
      <Plus size={10} /> note
    </button>
  )
}

// ─── AddDrugControls ─────────────────────────────────────────────────────────
// Unified Drug Row Editor Redesign, Phase 1 (2026-08-08). Two-action control
// used everywhere a drug identity can be attached: "Add a drug" (opens the
// brand-picker modal directly) and "More options" (a small dropdown with
// "Pick formulation" and "Add new drug"). Replaces the old row of 2-3
// separate dashed-border buttons with one consistent control.
//
// Props:
//   onPickBrand       — () => void — open the brand-picker modal
//   onPickFormulation — () => void — open the formulation-picker modal
//   onAddManual       — () => void — switch this option into manual/
//                        generic-only entry mode
//   disabled          — bool, optional

const addOptionButtonStyle = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '5px 10px',
  border: '1.5px dashed var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'transparent',
  color: 'var(--color-text-tertiary)',
  fontSize: 11, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'var(--font-body)',
}

const addDrugDropdownStyle = {
  position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
  background: 'var(--color-surface)',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  padding: 4, minWidth: 170,
  display: 'flex', flexDirection: 'column', gap: 2,
}

const addDrugDropdownItemStyle = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '7px 12px', background: 'none', border: 'none',
  fontSize: 12, fontFamily: 'var(--font-body)',
  color: 'var(--color-text-primary)', cursor: 'pointer',
  borderRadius: 'var(--radius-md)',
}

function AddDrugControls({ onPickBrand, onPickFormulation, onAddManual, disabled = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Dismiss on click-outside — same pattern as MoveMenu below.
  useEffect(() => {
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button
        type="button"
        onClick={onPickBrand}
        disabled={disabled}
        style={{ ...addOptionButtonStyle, flex: 1, justifyContent: 'center' }}
      >
        <Plus size={12} /> Add a drug
      </button>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen(v => !v)}
          disabled={disabled}
          style={addOptionButtonStyle}
        >
          More options <ChevronDown size={12} />
        </button>
        {menuOpen && (
          <div ref={menuRef} style={addDrugDropdownStyle}>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onPickFormulation() }}
              style={addDrugDropdownItemStyle}
            >
              Pick formulation
            </button>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); onAddManual() }}
              style={addDrugDropdownItemStyle}
            >
              Add new drug
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── OrDivider ─────────────────────────────────────────────────────────────────
// UI PASS (2026-08-08): shown between stacked drug options — within a group
// AND between groups. Clarified by the project owner: "groups" only exist to
// share one dose line across drugs that happen to use the same dose; every
// stacked drug option is an alternative to every other one regardless of
// which group it's filed under. So this divider replaces the old plain <hr>
// between groups too — there is no separate "between groups" visual at all,
// this is the only divider between drug option lines.
//
// DECLUTTER PASS 3 (Direction 1, 2026-08-08): downgraded from a filled
// solid-accent circle badge to a quiet, colorless treatment — lowercase "or"
// text between two thin lines. The badge was carrying no meaning beyond
// "these are alternatives," which the surrounding stacked layout already
// communicates; the color/weight was pure chrome.
function OrDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0' }}>
      <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-border)' }} />
      <span style={{
        fontSize:   11,
        fontWeight: 400,
        fontFamily: 'var(--font-body)',
        color:      'var(--color-text-secondary)',
        flexShrink: 0,
      }}>
        or
      </span>
      <div style={{ flex: 1, height: '0.5px', backgroundColor: 'var(--color-border)' }} />
    </div>
  )
}

// ─── OptionActionsMenu ───────────────────────────────────────────────────────
// DECLUTTER PASS 3 (Direction 1, 2026-08-08): replaces the old scattered
// per-drug icon row (drugLinkToggle button, GripVertical move icon + its
// MoveMenu popover, and the separate X remove button) with one kebab menu
// per drug option row. Consolidation only — the underlying actions and their
// visibility rules (canMoveToNew/canMoveAbove/canMoveBelow, isOnly hiding
// remove) are unchanged from the previous moveButton/removeButton/
// drugLinkToggle pieces.
//
// Props:
//   showLinkToggle — false suppresses the "Drug link" item entirely (used
//                    for the two render states where no name/identity has
//                    been set yet — matches the old nameRowExtraActions,
//                    which never included drugLinkToggle in those states)
//   showLink       — current drug_link_enabled value, for the toggle label
//   onToggleLink   — () => void
//   canMoveToNew / canMoveAbove / canMoveBelow — same meaning as before
//   onMove         — (action: 'new-group'|'above'|'below') => void
//   onRemove       — () => void
//   isOnly         — hides "Remove this option" when true

function OptionActionsMenu({
  showLinkToggle, showLink, onToggleLink,
  canMoveToNew, canMoveAbove, canMoveBelow, onMove,
  onRemove, isOnly,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const menuItemStyle = {
    display: 'block', width: '100%',
    padding: '7px 12px', textAlign: 'left',
    background: 'none', border: 'none',
    fontSize: 12, fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer', whiteSpace: 'nowrap',
    borderRadius: 'var(--radius-md)',
  }
  const destructiveItemStyle = { ...menuItemStyle, color: '#ef4444' }

  const showRemove = !isOnly

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        title="Drug options"
        aria-label="Drug options"
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, flexShrink: 0,
          border: 'none',
          borderRadius: 4,
          background: open ? 'var(--color-bg)' : 'transparent',
          color: open ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          cursor: 'pointer', padding: 0,
        }}
      >
        <MoreHorizontal size={13} />
      </button>
      {open && (
        <div style={addDrugDropdownStyle}>
          {showLinkToggle && (
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => { onToggleLink(); setOpen(false) }}
            >
              Drug link: {showLink ? 'On' : 'Off'}
            </button>
          )}
          {canMoveToNew && (
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => { onMove('new-group'); setOpen(false) }}
            >
              Move to new group
            </button>
          )}
          {canMoveAbove && (
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => { onMove('above'); setOpen(false) }}
            >
              Move to group above
            </button>
          )}
          {canMoveBelow && (
            <button
              type="button"
              style={menuItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => { onMove('below'); setOpen(false) }}
            >
              Move to group below
            </button>
          )}
          {showRemove && (
            <button
              type="button"
              style={destructiveItemStyle}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
              onClick={() => { onRemove(); setOpen(false) }}
            >
              Remove this option
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── DrugOptionRow ─────────────────────────────────────────────────────────────
// PHASE 2.2-B: replaces AlternativeRow. Handles one drug option inside a group.
// All per-drug state lives here — promote flow, dose-age-group chooser, link/
// unlink, showManualFields / genericOnlyMode reveal, drug_link_enabled toggle.
//
// Props:
//   option        — DrugOption (from prescriptionRowSchema DRUG_OPTION_TEMPLATE)
//   onUpdate      — (nextOption: DrugOption) => void
//   onRemove      — () => void
//   isOnly        — true when this is the only option across all groups (prevents
//                   removing the last option, which would leave an empty row)
//   onDoseReady   — (doseFields: {dose, dose_who, dose_lines}) => void — called
//                   when a brand pick resolves to a pre-filled dose, so the
//                   parent can write it to the group in one go
//   onMove        — (action: 'new-group'|'above'|'below') => void — PHASE 2.4
//   canMoveToNew  — bool: show "Move to new group" option            — PHASE 2.4
//   canMoveAbove  — bool: show "Move to group above" option          — PHASE 2.4
//   canMoveBelow  — bool: show "Move to group below" option          — PHASE 2.4

function DrugOptionRow({ option, onUpdate, onRemove, isOnly, onDoseReady, onOptionPick, onMove, canMoveToNew, canMoveAbove, canMoveBelow, groupDose, groupDoseWho, startInManualMode, onManualModeConsumed }) {
  const [promoteOn, setPromoteOn]             = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteDoseWho, setPromoteDoseWho]   = useState('adult')
  const [promoting, setPromoting]             = useState(false)
  const [promoteError, setPromoteError]       = useState(null)

  // Inline dose-age-group chooser — surfaces when a picked brand has 2+ dose rows
  const [pendingDoseChoice, setPendingDoseChoice] = useState(null)

  // showManualFields / genericOnlyMode: same reveal pattern as the old main row.
  // A fresh option shows only the search bar until a name is committed or the
  // admin opts into genericOnlyMode for the rarer generic-only entry path.
  const [genericOnlyMode, setGenericOnlyMode] = useState(
    startInManualMode || (!!option.generic_name?.trim() && !option.brand_name?.trim())
  )

  // Unified Drug Row Editor Redesign, Phase 3 (2026-08-08): startInManualMode
  // only matters at the instant this row is first created for a brand-new
  // option added via "Add new drug" — read once on mount, never re-applied
  // on later re-renders (mirrors the file's other mount-only effects).
  useEffect(() => {
    if (startInManualMode) onManualModeConsumed?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Unified Drug Row Editor Redesign, Phase 2 (2026-08-08): picker modal
  // open/closed state for this specific option's own "Add a drug" /
  // "Pick formulation" controls. Each DrugOptionRow owns its own pair —
  // not shared with the row-level "add a second option" pickers at the
  // bottom of the file (those have their own state, added/kept in
  // Phase 3).
  const [brandPickerOpen, setBrandPickerOpen] = useState(false)
  const [formulationPickerOpen, setFormulationPickerOpen] = useState(false)

  // Unified Drug Row Editor Redesign, Item A (2026-08-08): "Add new drug"
  // generic-name search box. A pick here is held LOCALLY, not written onto
  // the option — writing option.generic_id immediately would flip isLinked
  // to true and hide the manual fields/Promote button below (confirmed with
  // user: wait until Promote). handlePromote reads pickedGeneric.id directly
  // instead of calling findGenericByName when this is set.
  const [genericSuggestions, setGenericSuggestions] = useState([])
  const [genericSearching, setGenericSearching] = useState(false)
  const [pickedGeneric, setPickedGeneric]       = useState(null) // { id, name_en }
  const genericDropdownMouseDownRef = useRef(false)

  // Formulations under the picked generic — shown so the admin can reuse an
  // existing one instead of typing concentration/form from scratch.
  // pickedFormulationId: null = nothing chosen yet, 'new' = explicit
  // "none of these" choice (concentration/form stay open), or a real id.
  const [formulationChoices, setFormulationChoices] = useState([])
  const [loadingFormulations, setLoadingFormulations] = useState(false)
  const [pickedFormulationId, setPickedFormulationId] = useState(null)

  // Strength Value/Unit/Basis (2026-08-08): mirrors FormulationEditor.jsx's
  // single-ingredient strength row. Promote-flow-only local state, same
  // category as promoteCategory/promoteDoseWho above — NOT a field on
  // DRUG_OPTION_TEMPLATE, since the prescription row only ever needs the
  // derived display string (option.concentration, already a real field);
  // the structured value/unit/basis only need to exist long enough to (a)
  // derive that display string and (b) go into the new formulation record
  // on Promote. "Add new drug" is always a single generic, so — unlike
  // FormulationEditor's per-ingredient rows — one flat triple is enough.
  const [strengthValue, setStrengthValue] = useState('')
  const [strengthUnit, setStrengthUnit] = useState('')
  const [strengthBasis, setStrengthBasis] = useState('')

  function handleStrengthChange(field, value) {
    const next = {
      value: field === 'value' ? value : strengthValue,
      unit: field === 'unit' ? value : strengthUnit,
      basis: field === 'basis' ? value : strengthBasis,
    }
    if (field === 'value') setStrengthValue(value)
    if (field === 'unit') setStrengthUnit(value)
    if (field === 'basis') setStrengthBasis(value)
    patch({ concentration: buildStrengthConcentration(next.value, next.unit, next.basis) || null })
  }

  // Debounced generic search, driven off option.generic_name (the same value
  // the text input patches directly) rather than a separate query state, so
  // there's one source of truth for what's typed. Mirrors DrugSearchField's
  // own 2-char/250ms pattern — same search UX, different data source
  // (fetchGenericsPage instead of brand/formulation search).
  const genericNameForSearch = option.generic_name ?? ''
  useEffect(() => {
    if (pickedGeneric || genericNameForSearch.trim().length < 2) {
      setGenericSuggestions([])
      return
    }
    setGenericSearching(true)
    const timer = setTimeout(async () => {
      const { data, error } = await fetchGenericsPage({ query: genericNameForSearch.trim(), limit: 5 })
      if (!error) setGenericSuggestions(data ?? [])
      setGenericSearching(false)
    }, 250)
    return () => clearTimeout(timer)
  }, [genericNameForSearch, pickedGeneric])

  function handlePickGeneric(generic) {
    setGenericSuggestions([])
    setPickedGeneric({ id: generic.id, name_en: generic.name_en })
    patch({ generic_name: generic.name_en })
    setPickedFormulationId(null)
    setFormulationChoices([])
    setLoadingFormulations(true)
    fetchFormulationsForGeneric(generic.id).then(({ data }) => {
      setFormulationChoices(data ?? [])
      setLoadingFormulations(false)
    })
  }

  function handleClearPickedGeneric() {
    setPickedGeneric(null)
    setPickedFormulationId(null)
    setFormulationChoices([])
  }

  function handlePickFormulationChoice(formulationId) {
    setPickedFormulationId(formulationId)
    if (formulationId === 'new') return
    const f = formulationChoices.find(fc => fc.id === formulationId)
    if (f) patch({ concentration: f.concentration ?? null, form: f.form ?? null })
  }

  function patch(updates) {
    onUpdate({ ...option, ...updates })
  }

  const isLinked = !!(option.brand_id || option.generic_id || option.formulation_id)
  const showManualFields = !isLinked && (!!option.brand_name?.trim() || genericOnlyMode)
  const displayName = option.brand_name || option.generic_name || ''
  const showLink = option.drug_link_enabled !== false

  // Unified Drug Row Editor Redesign, Phase 2 (2026-08-08): true only for a
  // brand-new option that hasn't been touched yet — no library link, no
  // typed brand name, and manual entry hasn't been chosen. Drives whether
  // AddDrugControls (the "Add a drug" / "More options" control) or the
  // regular search field + fields are shown.
  const isEmptyUntouched = !isLinked && !option.brand_name?.trim() && !genericOnlyMode

  // ── Drug-link status indicator ──────────────────────────────────────────
  // DECLUTTER PASS 3 (Direction 1): the toggle action itself now lives
  // inside OptionActionsMenu's kebab. This stays as a small non-clickable
  // status glyph next to the name so "drug link is on" is still visible at
  // a glance without opening the menu.
  const drugLinkIndicator = showLink && (
    <Link
      size={13}
      color="var(--color-text-tertiary)"
      aria-label="Drug link on"
      style={{ flexShrink: 0 }}
    />
  )

  // ── Library link/unlink ─────────────────────────────────────────────────
  function handleBrandPick(brand) {
    // Item B (Unified Drug Row Editor Redesign, Phase 6, 2026-08-08): captured
    // BEFORE the option update below. isEmptyUntouched reflects the option as
    // it was prior to this pick — true only for a brand-new, never-touched
    // option. A false value here means this call is a re-pick (via the
    // pencil, which reuses this same handler per Decision 4) replacing an
    // existing linked or committed-free-text identity, not a first pick.
    const wasReplacingExisting = !isEmptyUntouched
    const f       = brand.formulations
    const generic = f?.generics
    const baseFields = {
      brand_name:     brand.name,
      brand_id:       brand.id,
      generic_name:   generic?.name_en   ?? option.generic_name,
      generic_id:     generic?.id        ?? option.generic_id,
      formulation_id: f?.id              ?? null,
      concentration:  f?.concentration   ?? null,
      form:           f?.form            ?? null,
      route:          f?.route           ?? null,
      category:       generic?.category  ?? null,
      _formulationMeta: f ? {
        name_en:       generic?.name_en ?? '',
        concentration: f.concentration ?? '',
        form:          f.form ?? '',
        route:         f.route ?? '',
      } : option._formulationMeta,
    }
    const nextOption = { ...option, ...baseFields }

    // ROOT-CAUSE FIX (pencil re-pick reliability bug, 2026-08-08): the
    // identity update and the dose update used to go through two separate
    // parent calls (patch() -> onUpdate(), then onDoseReady()) fired
    // synchronously in this same handler. Both were computed by the parent
    // from the same pre-update groups[] snapshot, so the second call's
    // setGroups() silently discarded the first call's option change — only
    // the dose update survived. This never showed up on a brand-new,
    // untouched option (no dose event fires there — see the final `else`
    // below), which is why the FIRST pick on a row always looked correct;
    // every re-pick after that sets wasReplacingExisting=true, which fires
    // a dose event on almost every pick, silently reverting the identity
    // change each time. Fixed by sending both pieces in one onOptionPick
    // call so the parent can apply them in a single groups.map() pass —
    // mirrors addOptionToGroups' already-working combined-update pattern
    // (see that function below, and its 2026-08-06 comment for the same
    // dose_max lesson).
    const resolved = resolveDosePick(f?.doses_structured)
    if (resolved.needsChoice) {
      onOptionPick(nextOption, null)
      setPendingDoseChoice({ populations: resolved.populations })
    } else if (resolved.dose_lines.length || resolved.dose) {
      onOptionPick(nextOption, resolved)
    } else if (wasReplacingExisting) {
      // Item B: the newly-picked drug has no library dose of its own, and
      // this was a re-pick — clear the group's dose fields so the previous
      // drug's dose brackets don't linger under the new drug's name. Applies
      // even in multi-drug groups, since the dose is shared at the group
      // level regardless of how many drug options sit in it.
      onOptionPick(nextOption, { dose: null, dose_who: null, dose_lines: [], dose_max: null, dose_max_population_id: null })
    } else {
      onOptionPick(nextOption, null)
    }
  }

  function handleUnlink() {
    patch({
      brand_id: null, generic_id: null, formulation_id: null,
      concentration: null, form: null, route: null, category: null,
      _formulationMeta: undefined,
    })
  }

  // Unified Drug Row Editor Redesign, Phase 2 (2026-08-08): "Pick
  // formulation" path from AddDrugControls' "More options" menu. Mirrors
  // handleBrandPick's dose-resolution branch exactly — same
  // pendingDoseChoice / onDoseReady contract — so the existing
  // PopulationChooser rendering further down needs no changes. No brand
  // fields: this is the no-brand, formulation-only identity path.
  function handleFormulationPick(formulation) {
    const generic = formulation.generics
    const nextOption = {
      ...option,
      brand_name: null,
      brand_id: null,
      generic_name: generic?.name_en ?? option.generic_name,
      generic_id: generic?.id ?? option.generic_id,
      formulation_id: formulation.id ?? null,
      concentration: formulation.concentration ?? null,
      form: formulation.form ?? null,
      route: formulation.route ?? null,
      category: generic?.category ?? null,
      _formulationMeta: {
        name_en: generic?.name_en ?? '',
        concentration: formulation.concentration ?? '',
        form: formulation.form ?? '',
        route: formulation.route ?? '',
      },
    }
    // Same combined-update fix as handleBrandPick above, same root cause.
    const resolved = resolveDosePick(formulation.doses_structured)
    if (resolved.needsChoice) {
      onOptionPick(nextOption, null)
      setPendingDoseChoice({ populations: resolved.populations })
    } else if (resolved.dose_lines.length || resolved.dose) {
      onOptionPick(nextOption, resolved)
    } else {
      onOptionPick(nextOption, null)
    }
  }

  function handleChangeText(text) {
    patch({ brand_name: text || null, brand_id: null })
  }

  // ── Promote to library ──────────────────────────────────────────────────
  async function handlePromote() {
    setPromoteError(null)
    const genericName   = option.generic_name?.trim()
    const concentration = option.concentration?.trim()

    if (!genericName) {
      setPromoteError('Generic name is required to save to the library.')
      return
    }
    if (!concentration || !option.form) {
      setPromoteError('Concentration and form are required to save to the library.')
      return
    }
    if (!promoteCategory) {
      setPromoteError('Category is required to save to the library.')
      return
    }

    setPromoting(true)
    // Item A (Unified Drug Row Editor Redesign, 2026-08-08): a generic/
    // formulation picked earlier in the search-aware manual entry flow was
    // held locally (pickedGeneric / pickedFormulationId), not written to the
    // option — use it directly here instead of re-running the
    // reuse-or-create checks, per the approved design's step 5.
    let genericId     = option.generic_id ?? pickedGeneric?.id ?? null
    let formulationId = (pickedFormulationId && pickedFormulationId !== 'new') ? pickedFormulationId : null
    let brandId       = null

    try {
      if (!genericId) {
        const { data: existingGeneric, error: findGErr } = await findGenericByName(genericName)
        if (findGErr) throw new Error(`Checking for an existing generic: ${findGErr.message}`)
        if (existingGeneric) {
          genericId = existingGeneric.id
        } else {
          const slugBase = genericName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          const { data: newGeneric, error: gErr } = await insertGeneric({
            slug: slugBase || `generic-${Date.now()}`,
            name_en: genericName,
            category: promoteCategory,
            class: null,
            // Item A step 5: a quick-entry generic must still be findable by
            // ingredient-aware search later — without this, fetchGenericsPage's
            // ingredient match (and the app's own generic-mode search) would
            // never surface it even though its name matches.
            ingredients: [genericName],
          })
          if (gErr) throw new Error(`Creating generic "${genericName}": ${gErr.message}`)
          genericId = newGeneric.id
        }
      }

      if (!formulationId) {
      const { data: existingFormulation, error: findFErr } = await findFormulationMatch(genericId, concentration, option.form)
      if (findFErr) throw new Error(`Checking for an existing formulation: ${findFErr.message}`)
      if (existingFormulation) {
        formulationId = existingFormulation.id
      } else {
        const formulationSlugBase = `${genericName}-${concentration}-${option.form}`
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        // Item A follow-up (2026-08-08), corrected: strength_structured is
        // the locked source of truth (FormulationEditor.jsx's own
        // convention — flat strength_value/unit/basis are kept in sync
        // FROM the structured ingredients, never the other way around).
        // Writing only the flat columns left strength_structured null,
        // so FormulationEditor's own getIngredientRows() — which reads
        // strength_structured.ingredients first and only falls back to
        // blank rows — showed this drug's strength as empty. Ingredient
        // name is set to genericName so it lines up exactly with the
        // quick-entry generic's own ingredients:[genericName] (set at
        // creation above), matching FormulationEditor's "matched" check.
        const strengthIngredient = {
          ingredient: genericName,
          value: strengthValue.trim() || null,
          unit: strengthUnit.trim() || null,
          basis: strengthBasis.trim() || null,
        }
        const { data: newFormulation, error: fErr } = await insertFormulation({
          generic_id: genericId,
          slug: formulationSlugBase || `formulation-${Date.now()}`,
          concentration,
          strength_structured: { ingredients: [strengthIngredient] },
          strength_value: strengthIngredient.value,
          strength_unit: strengthIngredient.unit,
          strength_basis: strengthIngredient.basis,
          form: option.form,
          route: null,
          doses_structured: (() => {
            const dose = groupDose?.trim()
            if (!dose) return []
            // Population-owns-brackets shape (decision 7's addendum, decision 25's
            // target shape) — same shape every other doses_structured value in the
            // library uses. A newly-promoted formulation with a bug-era flat
            // {who, instruction} shape would silently fail to show up in the
            // Practical Doses picker at all, since resolveDosePick only reads
            // 'population'/'brackets' now.
            const makeBracket = () => ({
              id: `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              instruction: dose,
            })
            if (promoteDoseWho === 'both') {
              return [
                { population: 'Adult', brackets: [makeBracket()] },
                { population: 'Child', brackets: [makeBracket()] },
              ]
            }
            const label = promoteDoseWho === 'adult' ? 'Adult' : promoteDoseWho === 'child' ? 'Child' : promoteDoseWho
            return [{ population: label, brackets: [makeBracket()] }]
          })(),
        })
        if (fErr) throw new Error(`Creating formulation: ${fErr.message}`)
        formulationId = newFormulation.id
      }
      }

      const brandName = option.brand_name?.trim()
      if (brandName) {
        const { data: existingBrand, error: findBErr } = await findBrandMatch(formulationId, brandName)
        if (findBErr) throw new Error(`Checking for an existing brand: ${findBErr.message}`)
        if (existingBrand) {
          brandId = existingBrand.id
        } else {
          const { data: newBrand, error: bErr } = await insertBrand({
            formulation_id: formulationId,
            name: brandName,
            tradename_clean: brandName,
            manufacturer: null,
            is_published: true,
          })
          if (bErr) throw new Error(`Creating brand "${brandName}": ${bErr.message}`)
          brandId = newBrand.id
        }
      }

      patch({ generic_id: genericId, formulation_id: formulationId, brand_id: brandId, source_flag: SOURCE_FLAG_VALUE })
      setPromoteOn(false)
      setPromoteCategory('')
      setPromoteDoseWho('adult')
      // Item C (Unified Drug Row Editor Redesign, Phase 6, 2026-08-08): once
      // promoted, the option is now library-linked (isLinked becomes true from
      // the patch above), so genericOnlyMode's manual-fields reveal is no
      // longer relevant. Leaving it true caused a blank manual-entry row to
      // flash/persist under the newly-linked display after promote.
      setGenericOnlyMode(false)
      setPickedGeneric(null)
      setPickedFormulationId(null)
      setFormulationChoices([])
      setStrengthValue('')
      setStrengthUnit('')
      setStrengthBasis('')
    } catch (err) {
      setPromoteError(err.message ?? 'Promotion failed. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  // ── Consolidated per-option actions menu ─────────────────────────────────
  // DECLUTTER PASS 3 (Direction 1): one kebab replaces the old scattered
  // move icon (+ MoveMenu popover) and remove button. Built once here and
  // reused across the three render locations that used to carry their own
  // moveButton/removeButton pair (DrugSearchField's extraAction slot, the
  // isEmptyUntouched row, and the genericOnlyMode-no-name-yet fallback row)
  // — see the render section below.
  const optionActionsMenu = (
    <OptionActionsMenu
      showLinkToggle={false}
      showLink={showLink}
      onToggleLink={() => patch({ drug_link_enabled: !showLink })}
      canMoveToNew={canMoveToNew}
      canMoveAbove={canMoveAbove}
      canMoveBelow={canMoveBelow}
      onMove={onMove}
      onRemove={onRemove}
      isOnly={isOnly}
    />
  )

  // Same menu, but with the "Drug link" item included — used only in
  // DrugSearchField's extraAction slot, where a name/identity already
  // exists (matches the old nameRowExtraActions, which was the only place
  // drugLinkToggle used to render).
  const nameRowExtraActions = (
    <>
      {showManualFields && <NotInLibraryTag />}
      {drugLinkIndicator}
      <OptionActionsMenu
        showLinkToggle={true}
        showLink={showLink}
        onToggleLink={() => patch({ drug_link_enabled: !showLink })}
        canMoveToNew={canMoveToNew}
        canMoveAbove={canMoveAbove}
        canMoveBelow={canMoveBelow}
        onMove={onMove}
        onRemove={onRemove}
        isOnly={isOnly}
      />
    </>
  )

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Unified Drug Row Editor Redesign, Phase 2 (2026-08-08): an
          untouched option shows only the "Add a drug" / "More options"
          control. Once a drug has been picked, typed, or manual entry
          chosen, the regular search field + note slot take over. The old
          "Or add generic only (no brand)" button is removed entirely —
          its one job (setGenericOnlyMode(true)) is now "Add new drug" in
          the More options menu, reached before any search box shows. */}
      {isEmptyUntouched ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ flex: 1 }}>
            <AddDrugControls
              onPickBrand={() => setBrandPickerOpen(true)}
              onPickFormulation={() => setFormulationPickerOpen(true)}
              onAddManual={() => setGenericOnlyMode(true)}
            />
          </div>
          {optionActionsMenu}
        </div>
      ) : (
        <>
          {/* Suppressed once "Add new drug" has been chosen (genericOnlyMode) —
              per the locked decision, manual entry is a strictly no-brand path,
              so the brand-name search box never shows alongside the manual
              fields below. */}
          {!genericOnlyMode && (
            <DrugSearchField
              value={displayName}
              isLinked={isLinked}
              concentration={option.concentration}
              form={option.form}
              genericName={option.generic_name}
              mode="brand"
              onChangeText={handleChangeText}
              onLink={handleBrandPick}
              onUnlink={handleUnlink}
              placeholder="Search or type a drug name…"
              extraAction={nameRowExtraActions}
              onRequestBrandPicker={() => setBrandPickerOpen(true)}
            />
          )}

          {/* genericOnlyMode with no brand_name yet: DrugSearchField is
              suppressed above (manual entry is a no-brand path) and nothing
              else in this branch renders a name row, so the tag/move/remove
              actions need this one fallback line instead of floating with
              no anchor. Once a generic name is typed, showManualFields'
              manual-fields block below takes over as the real content. */}
          {genericOnlyMode && !option.brand_name?.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {showManualFields && <NotInLibraryTag />}
              {optionActionsMenu}
            </div>
          )}

          {/* PHASE 2.2-D — per-drug note slot (Decision 5 two-slot note model).
              Sits directly under this drug's name at all times once the option
              has any content — no gate beyond the option existing. Travels with
              the drug if it is moved to a different group. */}
          {(isLinked || !!displayName) && (
            <DrugOptionNoteSlot
              note={option.note ?? null}
              onChange={value => patch({ note: value })}
            />
          )}
        </>
      )}

      {/* Manual identity fields — unlinked rows only.
          Item A (Unified Drug Row Editor Redesign, 2026-08-08): generic name
          is now a live search box instead of plain free text. Picking an
          existing generic is held locally (pickedGeneric) — not written to
          option.generic_id — so the row stays in manual mode with the
          formulation picker, brand field, and Promote button all still
          showing (confirmed with user: wait until Promote). */}
      {showManualFields && (
        <>
          <div style={{ position: 'relative' }}>
            <FieldLabel>Generic name</FieldLabel>
            {pickedGeneric ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 8px',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-bg)',
              }}>
                <span style={{ flex: 1, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
                  {pickedGeneric.name_en}
                </span>
                <button
                  type="button"
                  onClick={handleClearPickedGeneric}
                  title="Search a different generic"
                  aria-label="Clear picked generic"
                  style={lineIconButtonStyle}
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={option.generic_name ?? ''}
                  onChange={e => patch({ generic_name: e.target.value || null })}
                  onBlur={() => {
                    if (genericDropdownMouseDownRef.current) {
                      genericDropdownMouseDownRef.current = false
                      return
                    }
                    setGenericSuggestions([])
                  }}
                  placeholder="Generic name (e.g. Amoxicillin)"
                  style={textInput()}
                />
                {genericSuggestions.length > 0 && (
                  <div
                    onMouseDown={() => { genericDropdownMouseDownRef.current = true }}
                    style={addDrugDropdownStyle}
                  >
                    {genericSuggestions.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => handlePickGeneric(g)}
                        style={addDrugDropdownItemStyle}
                      >
                        {g.name_en}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Formulation picker — only once an existing generic is picked
              and it has formulations on file. "None of these" keeps
              concentration/form open exactly as the free-text path today. */}
          {pickedGeneric && loadingFormulations && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
              Loading formulations…
            </div>
          )}
          {pickedGeneric && !loadingFormulations && formulationChoices.length > 0 && !pickedFormulationId && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <FieldLabel>Existing formulations</FieldLabel>
              {formulationChoices.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handlePickFormulationChoice(f.id)}
                  style={{ ...addOptionButtonStyle, justifyContent: 'flex-start' }}
                >
                  {[f.concentration, f.form].filter(Boolean).join(' ') || 'Unnamed formulation'}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePickFormulationChoice('new')}
                style={{ ...addOptionButtonStyle, justifyContent: 'flex-start', fontStyle: 'italic' }}
              >
                None of these — create new
              </button>
            </div>
          )}
          {pickedFormulationId && pickedFormulationId !== 'new' && (
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)' }}>
              Using existing formulation.{' '}
              <button
                type="button"
                onClick={() => handlePickFormulationChoice(null)}
                style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-accent)', cursor: 'pointer', fontSize: 11, fontFamily: 'var(--font-body)' }}
              >
                Change
              </button>
            </div>
          )}

          {/* Strength Value/Unit/Basis (2026-08-08) — only while creating a
              new formulation. Mirrors FormulationEditor.jsx's per-ingredient
              strength row; "Add new drug" is always a single generic, so one
              flat triple stands in for that file's ingredient array. When an
              existing formulation is picked instead, its own strength data
              already lives in the library — these inputs don't apply. */}
          {!(pickedFormulationId && pickedFormulationId !== 'new') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div>
                <FieldLabel>Strength Value</FieldLabel>
                <input
                  type="text"
                  value={strengthValue}
                  onChange={e => handleStrengthChange('value', e.target.value)}
                  placeholder="e.g. 500"
                  style={textInput()}
                />
              </div>
              <div>
                <FieldLabel>Strength Unit</FieldLabel>
                <input
                  type="text"
                  value={strengthUnit}
                  onChange={e => handleStrengthChange('unit', e.target.value)}
                  placeholder="e.g. mg"
                  style={textInput()}
                />
              </div>
              <div>
                <FieldLabel>Strength Basis</FieldLabel>
                <input
                  type="text"
                  value={strengthBasis}
                  onChange={e => handleStrengthChange('basis', e.target.value)}
                  placeholder="e.g. per_5ml"
                  style={textInput()}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel hint={pickedFormulationId && pickedFormulationId !== 'new'
                ? 'Copied from the existing formulation'
                : 'Built automatically from the strength fields above'}>
                Concentration
              </FieldLabel>
              <input
                type="text"
                value={option.concentration ?? ''}
                placeholder="e.g. 500mg"
                disabled
                style={{ ...textInput(), backgroundColor: 'var(--color-bg)', color: 'var(--color-text-tertiary)', cursor: 'not-allowed' }}
              />
            </div>
            <div>
              <FieldLabel>Form</FieldLabel>
              <select
                value={option.form ?? ''}
                onChange={e => patch({ form: e.target.value || null })}
                disabled={pickedFormulationId && pickedFormulationId !== 'new'}
                style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— select form —</option>
                {DRUG_FORMS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand name (optional) — Item A, decided: reverses the earlier
              locked "no-brand" rule. Sits at the bottom regardless of
              whether a generic was matched or is brand-new. Writes to
              option.brand_name; handlePromote's existing brand-creation
              logic already reads this field unchanged. */}
          <div>
            <FieldLabel>Brand name (optional)</FieldLabel>
            <input
              type="text"
              value={option.brand_name ?? ''}
              onChange={e => patch({ brand_name: e.target.value || null })}
              placeholder="e.g. Panadol"
              style={textInput()}
            />
          </div>
        </>
      )}

      {/* Save to library — unlinked rows only */}
      {showManualFields && (
        <div style={{
          border: '1.5px dashed var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 10,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <button
            type="button"
            onClick={() => {
              const next = !promoteOn
              setPromoteOn(next)
              if (!next) { setPromoteCategory(''); setPromoteDoseWho('adult'); setPromoteError(null) }
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${promoteOn ? 'var(--color-accent)' : 'var(--color-border)'}`,
              backgroundColor: promoteOn ? '#EFF6FF' : 'transparent',
              color: promoteOn ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-body)', alignSelf: 'flex-start',
            }}
          >
            <Library size={13} />
            {promoteOn ? 'Save to library: ON' : 'Save to library'}
          </button>

          {promoteOn && (
            <>
              <div>
                <FieldLabel>Category</FieldLabel>
                <select
                  value={promoteCategory}
                  onChange={e => setPromoteCategory(e.target.value)}
                  style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                >
                  <option value="">— select —</option>
                  {DRUG_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {groupDose?.trim() && (
                <div>
                  <FieldLabel>Save dose as</FieldLabel>
                  <select
                    value={promoteDoseWho}
                    onChange={e => setPromoteDoseWho(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="adult">Adult</option>
                    <option value="child">Child</option>
                    <option value="both">Both (adult + child)</option>
                  </select>
                </div>
              )}

              {promoteError && (
                <div style={{
                  fontSize: 11, color: 'var(--color-error, #ef4444)',
                  padding: '4px 8px',
                  background: '#ef444410',
                  border: '1px solid #ef444430',
                  borderRadius: 'var(--radius-md)',
                }}>
                  {promoteError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePromote}
                disabled={promoting}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 'var(--radius-md)',
                  border: 'none', alignSelf: 'flex-start',
                  backgroundColor: promoting ? 'var(--color-border)' : 'var(--color-accent)',
                  color: promoting ? 'var(--color-text-tertiary)' : '#fff',
                  fontSize: 12, fontWeight: 600,
                  cursor: promoting ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {promoting ? 'Saving…' : 'Promote now'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Inline population chooser — shown after a brand pick whose formulation
          has more than one patient group defined. Picking one inserts every
          bracket under it as its own line (decision 25) — not one sentence. */}
      {pendingDoseChoice && (
        <PopulationChooser
          populations={pendingDoseChoice.populations}
          onChoose={population => {
            onDoseReady?.(buildDoseLinesFromPopulation(population))
            setPendingDoseChoice(null)
          }}
          onSkip={() => setPendingDoseChoice(null)}
        />
      )}

      {/* Unified Drug Row Editor Redesign, Phase 2 (2026-08-08): this
          option's own picker modals, opened from AddDrugControls above.
          Not shared with the row-level "add a second option" pickers at
          the bottom of the file — each DrugOptionRow instance owns its
          own pair. */}
      <DrugPickerModal
        isOpen={brandPickerOpen}
        onClose={() => setBrandPickerOpen(false)}
        onSelect={brand => { setBrandPickerOpen(false); handleBrandPick(brand) }}
        mode="brand"
      />
      <DrugPickerModal
        isOpen={formulationPickerOpen}
        onClose={() => setFormulationPickerOpen(false)}
        onSelect={formulation => { setFormulationPickerOpen(false); handleFormulationPick(formulation) }}
        mode="formulation"
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function UnifiedDrugRowEditor({ row, onChange }) {
  // PHASE 2.2-A/B — flat group state model (Decision 5).
  // groups[] is the component's source of truth. Initialized once from the
  // incoming row on mount via toDrugOptions(); all mutations go through
  // emitGroups() which calls setGroups and then fromDrugOptions() → onChange
  // so the external DRUG_ROW_TEMPLATE shape is preserved unchanged.
  const [groups, setGroups] = useState(() => toDrugOptions(row))

  // Add-option picker modals. Replace the old altBrandPickerOpen /
  // altFormulationPickerOpen / altScopedBrandPickerOpen state from Phase 1.
  const [addBrandPickerOpen, setAddBrandPickerOpen]             = useState(false)
  const [addFormulationPickerOpen, setAddFormulationPickerOpen] = useState(false)

  // Unified Drug Row Editor Redesign, Phase 3 (2026-08-08): id of a
  // freshly-added option that should start in manual-entry mode (skips
  // DrugOptionRow's own "empty untouched" AddDrugControls step, since
  // "Add new drug" already made that choice explicitly). Cleared once
  // consumed by the matching DrugOptionRow on mount.
  const [manualEntryOptionId, setManualEntryOptionId] = useState(null)

  // RESTORE-DOSE FEATURE (2026-06-26): "restore dose from library" button.
  // Group-scoped pending-choice state, separate from DrugOptionRow's own
  // pendingDoseChoice (which is per-option, used during a fresh brand
  // pick). This one lives here because it operates directly on
  // group.dose/group.dose_who/group.dose_lines, not on any specific
  // option's library link action. restoringGroupIdx tracks which group's
  // restore is in flight (for a loading state); restorePendingChoice
  // holds the populations when the formulation has 2+ and the admin
  // needs to pick one, keyed by groupIdx so only the relevant group's
  // chooser renders.
  const [restoringGroupIdx, setRestoringGroupIdx] = useState(null)
  const [restorePendingChoice, setRestorePendingChoice] = useState(null) // { groupIdx, populations } | null

  // WRITE-BACK FEATURE (2026-08-05, step 11.3): opt-in "save this edit back
  // to the library" action on one dose line, keyed off the bracket's
  // permanent id (decision 7's addendum / decision 25). Default behavior
  // (no opt-in) is unchanged — an edited/removed line only affects this one
  // sheet unless this action is explicitly used. Confirmed with the user
  // (2026-08-05): requires an "are you sure?" step before writing, since it
  // changes something shared by every sheet using that dose, not just this
  // one — unlike "Restore from library" above, which only reads.
  // confirmSaveLine: { groupIdx, line } | null — which line's confirm prompt
  // is currently open (only one at a time).
  const [confirmSaveLine, setConfirmSaveLine] = useState(null)
  const [savingLineId, setSavingLineId] = useState(null) // id of the line currently being written
  const [savedLineId, setSavedLineId] = useState(null)   // id of the line that just finished saving, for a brief "Saved" confirmation
  const [lineSaveError, setLineSaveError] = useState(null) // { lineId, message } | null

  // MAX-DOSE SAVE-TO-LIBRARY ADDENDUM (2026-08-06): same "save this edit
  // back to the library" action as dose lines above, but for a group's
  // shared max dose — keyed off the population's permanent id
  // (dose_max_population_id) instead of a bracket id. Same confirm-first
  // requirement, same reasoning: it changes something shared by every
  // sheet using that dose. Keyed by groupIdx (only one group's max dose
  // can be mid-save/confirm at a time, mirroring confirmSaveLine).
  const [confirmSaveMaxDose, setConfirmSaveMaxDose] = useState(null) // groupIdx | null
  const [savingMaxDoseGroupIdx, setSavingMaxDoseGroupIdx] = useState(null)
  const [savedMaxDoseGroupIdx, setSavedMaxDoseGroupIdx] = useState(null)
  const [maxDoseSaveError, setMaxDoseSaveError] = useState(null) // { groupIdx, message } | null

  // BUILD-FROM-SCRATCH ADDENDUM (2026-08-08): when a dose was built entirely
  // by hand (no library pick to start from), it's saved back to the library
  // as one combined action — population + every bracket + max dose together
  // — rather than one icon per line/max-dose as above. Those per-line/
  // per-max-dose actions still work unchanged for a line that already came
  // FROM the library (matching by its own bracket_id); this is a second,
  // group-level action alongside them, not a replacement, so it can also
  // fold in any new hand-typed brackets added next to an existing library
  // dose. Same confirm-first requirement as the other two, same reasoning.
  const [confirmSaveGroup, setConfirmSaveGroup] = useState(null) // groupIdx | null
  const [savingGroupIdx, setSavingGroupIdx] = useState(null)
  const [savedGroupIdx, setSavedGroupIdx] = useState(null)
  const [groupSaveError, setGroupSaveError] = useState(null) // { groupIdx, message } | null
  const [freshBracketId, setFreshBracketId] = useState(null) // id of a bracket just added from scratch — opens it already in edit mode

  // NOISE-REDUCTION PASS (2026-08-08): "Restore from library" used to sit
  // as its own permanently-visible underlined link at the bottom of the
  // dose block, competing with "Save to library" above it. It now lives in
  // a small "⋯" menu instead — same open-groupIdx-in-state + click-outside-
  // dismiss pattern as confirmSaveGroup above, and the same dropdown style
  // AddDrugControls already uses elsewhere in this file (addDrugDropdownStyle/
  // addDrugDropdownItemStyle), so this doesn't introduce a new visual
  // pattern. Only one group's menu can be open at a time.
  const [doseMenuOpenGroupIdx, setDoseMenuOpenGroupIdx] = useState(null)
  const doseMenuRef = useRef(null)
  useEffect(() => {
    function handlePointerDown(e) {
      if (doseMenuRef.current && !doseMenuRef.current.contains(e.target)) {
        setDoseMenuOpenGroupIdx(null)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  // ── Mutation helpers ───────────────────────────────────────────────────

  function emitGroups(nextGroups) {
    setGroups(nextGroups)
    const nextRow = fromDrugOptions(row, nextGroups)
    onChange(nextRow)
  }

  // Update a single option within a group (identified by groupIdx + option.id).
  function updateOption(groupIdx, optionId, nextOption) {
    const nextGroups = groups.map((g, gi) => {
      if (gi !== groupIdx) return g
      return { ...g, options: g.options.map(o => o.id === optionId ? nextOption : o) }
    })
    emitGroups(nextGroups)
  }

  // Update a single option AND (optionally) the group's dose fields in ONE
  // emit. Root-cause fix, pencil re-pick reliability bug (2026-08-08):
  // DrugOptionRow's handleBrandPick/handleFormulationPick used to call
  // onUpdate() and onDoseReady() separately in the same synchronous
  // handler — both derived their nextGroups from the same pre-update
  // groups[] snapshot, so the second emitGroups() call silently discarded
  // the option-identity change made by the first. Combining both pieces
  // into one groups.map() pass, one emitGroups() call, fixes it — mirrors
  // addOptionToGroups' already-working combined pattern below (dose fields
  // included, defaulting every field the same way applyDoseToGroup does).
  // Pass doseFields=null to update only the option's identity (e.g. when
  // resolveDosePick needs a population choice first).
  function updateOptionAndDose(groupIdx, optionId, nextOption, doseFields) {
    const nextGroups = groups.map((g, gi) => {
      if (gi !== groupIdx) return g
      const nextOptions = g.options.map(o => o.id === optionId ? nextOption : o)
      if (!doseFields) return { ...g, options: nextOptions }
      return {
        ...g,
        options: nextOptions,
        dose: doseFields.dose ?? null,
        dose_who: doseFields.dose_who ?? null,
        dose_lines: doseFields.dose_lines ?? [],
        dose_max: doseFields.dose_max ?? null,
        dose_max_population_id: doseFields.dose_max_population_id ?? null,
      }
    })
    emitGroups(nextGroups)
  }

  // Remove an option; if its group becomes empty, remove the group too.
  // Safety guard: never emit an empty groups array.
  function removeOption(groupIdx, optionId) {
    const remaining = groups[groupIdx].options.filter(o => o.id !== optionId)
    let nextGroups
    if (remaining.length === 0) {
      nextGroups = groups.filter((_, gi) => gi !== groupIdx)
    } else {
      nextGroups = groups.map((g, gi) =>
        gi === groupIdx ? { ...g, options: remaining } : g
      )
    }
    if (nextGroups.length === 0) return
    emitGroups(nextGroups)
  }

  // Write a pre-filled dose (bubbled up from DrugOptionRow's brand pick, or
  // from a population pick) to a group. Takes the whole { dose, dose_who,
  // dose_lines } object so a multi-line pick and a single-sentence pick go
  // through the same path without the caller juggling separate args.
  function applyDoseToGroup(groupIdx, doseFields) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx
        ? {
            ...g,
            dose: doseFields.dose ?? null,
            dose_who: doseFields.dose_who ?? null,
            dose_lines: doseFields.dose_lines ?? [],
            dose_max: doseFields.dose_max ?? null,
            dose_max_population_id: doseFields.dose_max_population_id ?? null,
          }
        : g
    )
    emitGroups(nextGroups)
  }

  // Update the shared dose field for a group (direct text edit). Only used
  // for the single freeform dose box — a group already showing dose_lines
  // doesn't render this input at all (see the group render below).
  function updateGroupDose(groupIdx, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, dose: value || null } : g
    )
    emitGroups(nextGroups)
  }

  // Edit or remove one independently-editable dose line (decision 25) —
  // never touches any other line in the group, and never touches 'dose'.
  //
  // FIELD-SEPARATION ADDENDUM (2026-08-06): 'field' is 'bracket_title' or
  // 'instruction' — the two real editable pieces — rather than one flat
  // 'text' string. Editing either field never touches the other, and never
  // rewrites a legacy line's 'text' — a legacy line's 'text' stays exactly
  // as saved unless the admin explicitly edits it (see EditableDoseLine
  // below, which starts a legacy line's edit by moving its 'text' into
  // 'instruction' the first time it's opened, so editing it doesn't lose
  // the existing wording).
  function updateDoseLineField(groupIdx, lineId, field, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx
        ? { ...g, dose_lines: (g.dose_lines ?? []).map(l => l.id === lineId ? { ...l, [field]: value } : l) }
        : g
    )
    emitGroups(nextGroups)
  }

  function removeDoseLine(groupIdx, lineId) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx
        ? { ...g, dose_lines: (g.dose_lines ?? []).filter(l => l.id !== lineId) }
        : g
    )
    emitGroups(nextGroups)
  }

  // BUILD-FROM-SCRATCH ADDENDUM (2026-08-08): who this dose is for, typed
  // directly rather than only ever arriving via a library pick. Mirrors
  // updateGroupDose/updateGroupDoseMax exactly.
  function updateGroupDoseWho(groupIdx, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, dose_who: value || null } : g
    )
    emitGroups(nextGroups)
  }

  // Start a brand-new bracket from scratch (no library pick involved) —
  // mirrors DoseRowList's "Add bracket" affordance, so a dose can be built
  // in the same population/title/instruction/max-dose shape even when
  // nothing was ever picked from the library. If the group still has old
  // hand-typed text in 'dose' (the legacy single-sentence box) and this is
  // the first bracket, that text is carried into the new bracket's
  // instruction rather than discarded, and 'dose' is cleared — same
  // legacy-to-structured handoff EditableDoseLine already does for a
  // pre-existing legacy line on its first edit.
  function addBracket(groupIdx) {
    const group = groups[groupIdx]
    const newLineId = `line-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const carryLegacyText = (group.dose_lines ?? []).length === 0
    const newLine = {
      id: newLineId,
      bracket_id: null,
      bracket_title: null,
      instruction: carryLegacyText ? (group.dose?.trim() || '') : '',
      text: null,
    }
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx
        ? { ...g, dose_lines: [...(g.dose_lines ?? []), newLine], dose: carryLegacyText ? null : g.dose }
        : g
    )
    emitGroups(nextGroups)
    setFreshBracketId(newLineId)
  }

  // Update the shared "max dose" note for a group's dose_lines (field-
  // separation addendum, 2026-08-06). Mirrors updateGroupDose/updateGroupNote
  // exactly — one value, shown once under the whole group of lines.
  function updateGroupDoseMax(groupIdx, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, dose_max: value || null } : g
    )
    emitGroups(nextGroups)
  }

  // Update the shared note for a group (direct text edit).
  // PHASE 2.2-C: note is a group-level field (Decision 5 — one note per
  // dose/name cluster, same as dose). Mirrors updateGroupDose exactly.
  function updateGroupNote(groupIdx, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, note: value || null } : g
    )
    emitGroups(nextGroups)
  }

  // ── Restore dose from library (new feature, 2026-06-26) ────────────────
  // "Restore from library" button next to a group's shared dose field.
  // Only rendered when the group's first option is formulation-linked
  // (see the button's own render-gate below) — a free-text/manual group
  // has no library dose to restore, so the button simply doesn't exist
  // there rather than appearing disabled.
  //
  // LOCKED (2026-06-26): always re-fetches the formulation's CURRENT
  // doses_structured live from Supabase via fetchFormulationWithGeneric
  // — never uses any cached _formulationMeta snapshot on the row, since
  // "restore to library value" should mean the real, current library
  // value, not whatever was true at the moment this row was originally
  // linked (the library may have been edited since).
  //
  // Behavior mirrors the existing fresh-pick flow exactly
  // (handleBrandPick / resolveDosePick in DrugOptionRow):
  //   0 populations  -> nothing to restore; defensive no-op (button
  //                     shouldn't be visible in this state to begin with).
  //   1 population   -> applied immediately, no extra confirmation.
  //   2+ populations -> surfaces the same PopulationChooser UI used for a
  //                     fresh multi-population pick, so the admin re-picks
  //                     which patient group to restore.
  // Only ever touches group.dose / group.dose_who / group.dose_lines —
  // never the group note, never any option's identity fields.
  async function restoreDoseFromLibrary(groupIdx) {
    const group = groups[groupIdx]
    const formulationId = group.options[0]?.formulation_id
    if (!formulationId) return // defensive — button shouldn't render without this

    setRestoringGroupIdx(groupIdx)
    try {
      const { data, error } = await fetchFormulationWithGeneric(formulationId)
      if (error || !data) return // silently no-op on fetch failure; dose is left untouched

      const resolved = resolveDosePick(data.doses_structured)
      if (resolved.needsChoice) {
        setRestorePendingChoice({ groupIdx, populations: resolved.populations })
      } else if (resolved.dose_lines.length || resolved.dose) {
        applyDoseToGroup(groupIdx, resolved)
      }
      // no populations at all -> no-op, nothing to restore to; existing
      // group.dose/dose_lines are left exactly as-is.
    } finally {
      setRestoringGroupIdx(null)
    }
  }

  // ── Save one dose line back to the library (step 11.3) ─────────────────
  // Always re-fetches the formulation's CURRENT doses_structured live,
  // same reasoning as restoreDoseFromLibrary above — the library may have
  // changed since this line was first picked, and this action must find
  // and update the real current bracket, not a stale local copy.
  //
  // FIELD-SEPARATION ADDENDUM (2026-08-06): now that a line carries
  // 'bracket_title'/'instruction' as two real, independently-known fields
  // (instead of one flattened sentence a label/max-dose could be baked
  // into), each is written straight into the matching bracket field —
  // nothing needs to be split apart, so the old guard that refused to save
  // any line whose bracket had a title or max dose is gone; it's not
  // possible to mis-save anymore, since there's nothing left to guess.
  // Still gated (see canSaveToLibrary at the call site) to lines that have
  // actually gone through the split — a legacy line that has never been
  // opened for editing still has 'instruction' as null and cannot be saved
  // from here, since its whole wording lives in the old flattened 'text'
  // field and writing that into 'instruction' verbatim would duplicate any
  // title/max-dose text the library bracket already carries. Opening a
  // legacy line for editing (see EditableDoseLine) is what performs the
  // one-time, explicit split into the new shape — after that, saving here
  // is safe.
  async function saveLineToLibrary(groupIdx, line) {
    const group = groups[groupIdx]
    const formulationId = group.options[0]?.formulation_id
    if (!formulationId || !line.bracket_id || line.instruction == null) return // defensive — button shouldn't render without these

    setSavingLineId(line.id)
    setLineSaveError(null)
    try {
      const { data, error } = await fetchFormulationWithGeneric(formulationId)
      if (error || !data) {
        setLineSaveError({ lineId: line.id, message: 'Could not load the library entry to save to. Please try again.' })
        return
      }

      const populations = Array.isArray(data.doses_structured) ? data.doses_structured : []
      let matchedBracket = null
      const nextStructured = populations.map(population => ({
        ...population,
        brackets: (Array.isArray(population.brackets) ? population.brackets : []).map(bracket => {
          if (bracket.id !== line.bracket_id) return bracket
          matchedBracket = bracket
          return {
            ...bracket,
            bracket: line.bracket_title ?? '',
            instruction: line.instruction ?? '',
          }
        }),
      }))

      if (!matchedBracket) {
        setLineSaveError({ lineId: line.id, message: 'This line no longer matches an entry in the library — it may have been changed or removed there.' })
        return
      }

      const { error: updateErr } = await updateFormulation(formulationId, { doses_structured: nextStructured })
      if (updateErr) {
        setLineSaveError({ lineId: line.id, message: 'Saving to the library failed. Please try again.' })
        return
      }

      setSavedLineId(line.id)
      setTimeout(() => {
        setSavedLineId(current => current === line.id ? null : current)
      }, 2000)
    } finally {
      setSavingLineId(null)
    }
  }

  // MAX-DOSE SAVE-TO-LIBRARY ADDENDUM (2026-08-06): mirrors saveLineToLibrary
  // above exactly, but matches by the population's permanent id
  // (dose_max_population_id) instead of a bracket's id, and writes
  // population.max_dose instead of a bracket's bracket/instruction.
  // Gated (see canSaveToLibrary at the call site) to groups whose dose_max
  // actually traces back to a population — a hand-typed max dose, or one
  // picked before DoseRowList.jsx's id-backfill fix reached that
  // formulation, has nothing safe to match and cannot be saved from here.
  async function saveMaxDoseToLibrary(groupIdx) {
    const group = groups[groupIdx]
    const formulationId = group.options[0]?.formulation_id
    if (!formulationId || !group.dose_max_population_id) return // defensive — button shouldn't render without these

    setSavingMaxDoseGroupIdx(groupIdx)
    setMaxDoseSaveError(null)
    try {
      const { data, error } = await fetchFormulationWithGeneric(formulationId)
      if (error || !data) {
        setMaxDoseSaveError({ groupIdx, message: 'Could not load the library entry to save to. Please try again.' })
        return
      }

      const populations = Array.isArray(data.doses_structured) ? data.doses_structured : []
      let matchedPopulation = null
      const nextStructured = populations.map(population => {
        if (population.id !== group.dose_max_population_id) return population
        matchedPopulation = population
        return { ...population, max_dose: group.dose_max ?? '' }
      })

      if (!matchedPopulation) {
        setMaxDoseSaveError({ groupIdx, message: 'This max dose no longer matches an entry in the library — it may have been changed or removed there.' })
        return
      }

      const { error: updateErr } = await updateFormulation(formulationId, { doses_structured: nextStructured })
      if (updateErr) {
        setMaxDoseSaveError({ groupIdx, message: 'Saving to the library failed. Please try again.' })
        return
      }

      setSavedMaxDoseGroupIdx(groupIdx)
      setTimeout(() => {
        setSavedMaxDoseGroupIdx(current => current === groupIdx ? null : current)
      }, 2000)
    } finally {
      setSavingMaxDoseGroupIdx(null)
    }
  }

  // ── Save a whole dose (population + brackets + max dose) built from
  // scratch back to the library, in one combined action ──────────────────
  // BUILD-FROM-SCRATCH ADDENDUM (2026-08-08): unlike saveLineToLibrary /
  // saveMaxDoseToLibrary above, which only ever UPDATE a bracket/population
  // that already exists in the library (matched by permanent id), this
  // function also CREATES what's missing — since a hand-built dose has no
  // permanent ids to match on yet. Population is matched by name (trimmed,
  // case-insensitive) against the formulation's current populations: if one
  // with that name already exists, the new brackets are appended into it
  // (so typing "Adult" again reuses the real Adult population instead of
  // making a second one); if not, a new population is created. Each local
  // bracket is matched by its own bracket_id if it has one (a line that
  // already came from the library, being edited alongside new ones in the
  // same group), otherwise a new bracket is appended. After a successful
  // save, every local id is stamped back (population id onto
  // dose_max_population_id, each new bracket's id onto its line) so a
  // second save on the same group is a clean update, not another create.
  async function saveDoseToLibrary(groupIdx) {
    const group = groups[groupIdx]
    const formulationId = group.options[0]?.formulation_id
    const typedWho = group.dose_who?.trim()
    const linesToSave = (group.dose_lines ?? []).filter(l => l.instruction?.trim())
    if (!formulationId || linesToSave.length === 0) return // defensive — button shouldn't render without these

    setSavingGroupIdx(groupIdx)
    setGroupSaveError(null)
    try {
      const { data, error } = await fetchFormulationWithGeneric(formulationId)
      if (error || !data) {
        setGroupSaveError({ groupIdx, message: 'Could not load the library entry to save to. Please try again.' })
        return
      }

      const populations = Array.isArray(data.doses_structured) ? data.doses_structured : []

      // LINKED-RENAME FIX (2026-08-08): if this dose already traces back to
      // a real library population — dose_max_population_id, stamped
      // whenever a dose is picked from the library or previously saved
      // here — that population is the real target, regardless of what the
      // admin has since typed into the name field. Resolving by name
      // instead (as below) would treat a rename as "no population found,"
      // creating a DUPLICATE population with copied brackets rather than
      // updating the one this dose actually came from.
      let targetPopulation = group.dose_max_population_id
        ? populations.find(p => p.id === group.dose_max_population_id)
        : null
      let isNewPopulation = false

      if (targetPopulation) {
        // OPTIONAL POPULATION NAME (2026-08-08): still enforce at-most-one-
        // blank if the admin is blanking this population out, but exclude
        // itself from the "already blank" check — it's the same population
        // staying/becoming blank, not a second one.
        if (!typedWho) {
          const blankPop = populations.find(p => !p.population?.trim() && p.id !== targetPopulation.id)
          if (blankPop) {
            setGroupSaveError({
              groupIdx,
              message: 'This drug already has an unnamed population in the library. Name it before saving another one blank.',
            })
            return
          }
        }
        targetPopulation = { ...targetPopulation, population: typedWho || '' }
      } else {
        // Not linked to a real population (brand-new dose built from
        // scratch, or the linked one was deleted upstream) — fall back to
        // matching/creating by name or blank, same as before.
        //
        // OPTIONAL POPULATION NAME (2026-08-08): a formulation may have at
        // most one population with a blank name at any time. Checked
        // against the REAL current library state just fetched above, not
        // stale local data — if dose_who was left blank here but the
        // library already has an unnamed population (created here or in
        // the formulation editor, doesn't matter which), block and ask the
        // admin to name the existing one first, rather than silently
        // merging into it or creating a second unnamed population.
        if (!typedWho) {
          const blankPop = populations.find(p => !p.population?.trim())
          if (blankPop) {
            setGroupSaveError({
              groupIdx,
              message: 'This drug already has an unnamed population in the library. Name it before saving another one blank.',
            })
            return
          }
          // no existing populations, or none are blank — safe to save as
          // the one allowed blank population, same as the named-match
          // logic below, just with population: '' instead of typedWho.
        }

        targetPopulation = typedWho
          ? populations.find(p => p.population?.trim().toLowerCase() === typedWho.toLowerCase())
          : populations.find(p => !p.population?.trim())
        if (!targetPopulation) {
          targetPopulation = {
            id: `pop-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            population: typedWho || '',
            max_dose: '',
            brackets: [],
          }
          isNewPopulation = true
        }
      }

      const stampedBracketIds = {} // local line id -> library bracket id, applied after a successful save
      const existingBrackets = Array.isArray(targetPopulation.brackets) ? targetPopulation.brackets : []
      const nextBrackets = [...existingBrackets]
      for (const line of linesToSave) {
        const matchIdx = line.bracket_id ? nextBrackets.findIndex(b => b.id === line.bracket_id) : -1
        if (matchIdx >= 0) {
          nextBrackets[matchIdx] = { ...nextBrackets[matchIdx], bracket: line.bracket_title ?? '', instruction: line.instruction ?? '' }
          stampedBracketIds[line.id] = nextBrackets[matchIdx].id
        } else {
          const newBracketId = `bracket-${Date.now()}-${Math.random().toString(36).slice(2)}`
          nextBrackets.push({ id: newBracketId, bracket: line.bracket_title ?? '', instruction: line.instruction ?? '' })
          stampedBracketIds[line.id] = newBracketId
        }
      }

      const savedPopulation = { ...targetPopulation, max_dose: group.dose_max?.trim() || '', brackets: nextBrackets }
      const nextStructured = isNewPopulation
        ? [...populations, savedPopulation]
        : populations.map(p => p.id === savedPopulation.id ? savedPopulation : p)

      const { error: updateErr } = await updateFormulation(formulationId, { doses_structured: nextStructured })
      if (updateErr) {
        setGroupSaveError({ groupIdx, message: 'Saving to the library failed. Please try again.' })
        return
      }

      const nextGroups = groups.map((g, gi) => gi === groupIdx
        ? {
            ...g,
            dose_max_population_id: savedPopulation.id,
            dose_lines: (g.dose_lines ?? []).map(l => stampedBracketIds[l.id] ? { ...l, bracket_id: stampedBracketIds[l.id] } : l),
          }
        : g
      )
      setGroups(nextGroups)
      onChange(fromDrugOptions(row, nextGroups))

      setSavedGroupIdx(groupIdx)
      setTimeout(() => {
        setSavedGroupIdx(current => current === groupIdx ? null : current)
      }, 2000)
    } finally {
      setSavingGroupIdx(null)
    }
  }

  // ── Move mutations (PHASE 2.4) ─────────────────────────────────────────
  // All three helpers follow the same pattern:
  //   1. Remove the option from its current group; drop the group if now empty.
  //   2. Insert the option into the target location.
  //   3. Emit via emitGroups() — no direct state mutation.
  //
  // The option carries its own group_id; when it joins an existing group we
  // overwrite that field so fromDrugOptions() round-trips correctly.

  function moveToNewGroup(groupIdx, optionId) {
    const srcGroup  = groups[groupIdx]
    const option    = srcGroup.options.find(o => o.id === optionId)
    if (!option) return

    const newGroupId  = `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const movedOption = { ...option, group_id: newGroupId }

    // Remove from source group; drop the group entirely if it becomes empty.
    const remainingSrc = srcGroup.options.filter(o => o.id !== optionId)
    const srcUpdated   = remainingSrc.length > 0
      ? [{ ...srcGroup, options: remainingSrc }]
      : []

    // PHASE A BUG FIX (2026-06-26): seed the new standalone group's dose
    // from the group this option is leaving, instead of unconditionally
    // discarding it (reported bug: moving a drug out of a group loses
    // its dose). dose/dose_who live on the GROUP, not the option, so
    // there is nothing on the option itself to recover a dose from —
    // the dose the admin just had access to a moment ago is the only
    // sensible starting point, fully editable afterward (not locked,
    // not a permanent link back to the old group).
    //
    // The group NOTE is deliberately NOT carried over here. Unlike
    // dose, a group note is explicitly shared content the remaining
    // group members are entitled to — copying it onto a brand-new
    // split-off group would duplicate someone else's shared note onto
    // an unrelated group (the same class of bug as the per-drug/group
    // note bleed fixed in toDrugOptions() above). The option's own
    // per-drug note already travels correctly via the '...option'
    // spread above and needs no special handling here.
    const newGroup = {
      group_id: newGroupId,
      options: [movedOption],
      dose: srcGroup.dose ?? null,
      dose_who: srcGroup.dose_who ?? null,
      note: null,
    }

    // New group is inserted immediately after the (possibly removed) source.
    const before = groups.slice(0, groupIdx)
    const after  = groups.slice(groupIdx + 1)
    emitGroups([...before, ...srcUpdated, newGroup, ...after])
  }

  function moveToGroupAbove(groupIdx, optionId) {
    if (groupIdx === 0) return
    const srcGroup    = groups[groupIdx]
    const targetGroup = groups[groupIdx - 1]
    const option      = srcGroup.options.find(o => o.id === optionId)
    if (!option) return

    const movedOption  = { ...option, group_id: targetGroup.group_id }
    const remainingSrc = srcGroup.options.filter(o => o.id !== optionId)

    const nextGroups = groups.map((g, gi) => {
      if (gi === groupIdx - 1) return { ...g, options: [...g.options, movedOption] }
      if (gi === groupIdx)     return remainingSrc.length > 0 ? { ...g, options: remainingSrc } : null
      return g
    }).filter(Boolean)

    emitGroups(nextGroups)
  }

  function moveToGroupBelow(groupIdx, optionId) {
    if (groupIdx >= groups.length - 1) return
    const srcGroup    = groups[groupIdx]
    const targetGroup = groups[groupIdx + 1]
    const option      = srcGroup.options.find(o => o.id === optionId)
    if (!option) return

    const movedOption  = { ...option, group_id: targetGroup.group_id }
    const remainingSrc = srcGroup.options.filter(o => o.id !== optionId)

    const nextGroups = groups.map((g, gi) => {
      if (gi === groupIdx)     return remainingSrc.length > 0 ? { ...g, options: remainingSrc } : null
      if (gi === groupIdx + 1) return { ...g, options: [movedOption, ...g.options] }
      return g
    }).filter(Boolean)

    emitGroups(nextGroups)
  }

  // ── Add option (replaces "add alternative") ────────────────────────────
  // Newly-added options are auto-joined to an existing group when their
  // formulation_id matches that group's first option — same logic as
  // toDrugOptions() default-join. If no match, a new group is created.

  // pendingDose — optional { dose, dose_who, dose_lines, needsChoice, populations } from
  // resolveDosePick. When provided, the dose is written into the target group in the
  // same emit so the "Add option: pick a brand/formulation" buttons pre-fill dose
  // identically to picking a drug inside an existing DrugOptionRow via DrugSearchField
  // (bug fix 2026-06-26).
  function addOptionToGroups(newOption, pendingDose) {
    const matchGroupIdx = groups.findIndex(g => {
      const firstOpt = g.options[0]
      return (
        newOption.formulation_id &&
        firstOpt?.formulation_id &&
        newOption.formulation_id === firstOpt.formulation_id
      )
    })

    const hasResolvedDose = pendingDose && !pendingDose.needsChoice &&
      (pendingDose.dose_lines?.length || pendingDose.dose)

    let nextGroups
    let targetGroupIdx
    if (matchGroupIdx >= 0) {
      targetGroupIdx = matchGroupIdx
      const joined = { ...newOption, group_id: groups[matchGroupIdx].group_id }
      nextGroups = groups.map((g, gi) => {
        if (gi !== matchGroupIdx) return g
        // BUG FIX (2026-08-06): dose_max was missing from this hand-built
        // dose object, so a fresh "Add option: pick a brand/formulation"
        // pick dropped the library's max-dose note entirely, even though
        // restoreDoseFromLibrary (which goes through applyDoseToGroup)
        // carried it correctly. Mirrors dose/dose_who/dose_lines exactly.
        // dose_max_population_id mirrors dose_max in turn — needed so a
        // freshly-added drug's max dose can be saved back to the library
        // too (see saveMaxDoseToLibrary below).
        const doseFields = hasResolvedDose
          ? { dose: pendingDose.dose, dose_who: pendingDose.dose_who ?? null, dose_lines: pendingDose.dose_lines ?? [], dose_max: pendingDose.dose_max ?? null, dose_max_population_id: pendingDose.dose_max_population_id ?? null }
          : {}
        return { ...g, ...doseFields, options: [...g.options, joined] }
      })
    } else {
      targetGroupIdx = groups.length
      const newGroupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const standalone = { ...newOption, group_id: newGroupId }
      // BUG FIX (2026-08-06): same dose_max / dose_max_population_id
      // omission as the matched-group branch above — see that comment.
      const doseFields = hasResolvedDose
        ? { dose: pendingDose.dose, dose_who: pendingDose.dose_who ?? null, dose_lines: pendingDose.dose_lines ?? [], dose_max: pendingDose.dose_max ?? null, dose_max_population_id: pendingDose.dose_max_population_id ?? null }
        : { dose: null, dose_who: null, dose_lines: [], dose_max: null, dose_max_population_id: null }
      nextGroups = [...groups, { group_id: newGroupId, options: [standalone], ...doseFields, note: null }]
    }
    emitGroups(nextGroups)

    // Multi-population case: option is already added (dose null); surface the
    // PopulationChooser on the target group using the same restorePendingChoice
    // mechanism the restore-from-library button uses (reuses existing UI).
    if (pendingDose?.needsChoice) {
      setRestorePendingChoice({ groupIdx: targetGroupIdx, populations: pendingDose.populations })
    }
  }

  function addOptionFromBrand(brand) {
    const f       = brand.formulations
    const generic = f?.generics
    // Resolve dose pre-fill from library — mirrors DrugOptionRow's handleBrandPick.
    // Bug fix (2026-06-26): "Add option: pick a brand" buttons previously skipped
    // dose pre-fill entirely; now passed to addOptionToGroups as pendingDose.
    const pendingDose = resolveDosePick(f?.doses_structured)
    addOptionToGroups({
      ...DRUG_OPTION_TEMPLATE,
      id:             `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      brand_name:     brand.name,
      brand_id:       brand.id,
      generic_name:   generic?.name_en  ?? null,
      generic_id:     generic?.id       ?? null,
      formulation_id: f?.id             ?? null,
      concentration:  f?.concentration  ?? null,
      form:           f?.form           ?? null,
      route:          f?.route          ?? null,
      category:       generic?.category ?? null,
    }, pendingDose)
  }

  function addOptionFromFormulation(formulation) {
    const generic = formulation.generics
    // Resolve dose pre-fill from library — same fix as addOptionFromBrand above.
    const pendingDose = resolveDosePick(formulation.doses_structured)
    addOptionToGroups({
      ...DRUG_OPTION_TEMPLATE,
      id:             `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      generic_name:   generic?.name_en   ?? null,
      generic_id:     generic?.id        ?? null,
      formulation_id: formulation.id,
      concentration:  formulation.concentration ?? null,
      form:           formulation.form ?? null,
      route:          formulation.route ?? null,
      category:       generic?.category ?? null,
    }, pendingDose)
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0)

  // BUG FIX (2026-08-08): when the row's one and only option is still
  // completely untouched, DrugOptionRow already renders its own "Add a
  // drug / More options" prompt for that option. Without this check, the
  // row-level "add a second option" control below rendered the identical
  // prompt a second time — visually a duplicate, since there's nothing to
  // add a *second* drug to yet. Suppressed only in that exact case; as
  // soon as the sole option has a name/link, or a second option exists,
  // the bottom control reappears as normal.
  const soleOptionEmpty = totalOptions === 1 && (() => {
    const o = groups[0]?.options[0]
    if (!o) return false
    const isLinked = !!(o.brand_id || o.generic_id || o.formulation_id)
    return !isLinked && !o.brand_name?.trim() && !o.generic_name?.trim()
  })()

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* PHASE 2.2-B/D: loop over groups[].
          Each group renders its stacked DrugOptionRow entries (one per drug
          name), then one shared dose input + group note below them.
          PHASE 2.2-D: horizontal divider between groups (Decision 5 locked
          choice — not a colored left-rail, not a label/chip). First group
          gets no divider above it; subsequent groups get one hr above. */}
      {groups.map((group, groupIdx) => (
        <div key={group.group_id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* Divider between groups — UI PASS (2026-08-08): now the same OR
              badge used within a group, not a plain line. Clarified by the
              project owner: groups only exist to share a dose line, they
              don't change the fact that every stacked option is an
              alternative to the one above it. No divider before the very
              first group (nothing to divide yet). */}
          {groupIdx > 0 && <OrDivider />}

          {/* ── Stacked drug-name lines ──
              OrDivider inserted before every option after the first within
              a group, so options stacked together read as "this OR this". */}
          {group.options.map((option, optIdx) => (
            <div key={option.id}>
              {optIdx > 0 && <OrDivider />}
              <DrugOptionRow
                option={option}
                onUpdate={nextOpt => updateOption(groupIdx, option.id, nextOpt)}
                onRemove={() => removeOption(groupIdx, option.id)}
                isOnly={totalOptions === 1}
                onDoseReady={doseFields => applyDoseToGroup(groupIdx, doseFields)}
                onOptionPick={(nextOpt, doseFields) => updateOptionAndDose(groupIdx, option.id, nextOpt, doseFields)}
                onMove={action => {
                  if (action === 'new-group') moveToNewGroup(groupIdx, option.id)
                  else if (action === 'above') moveToGroupAbove(groupIdx, option.id)
                  else if (action === 'below') moveToGroupBelow(groupIdx, option.id)
                }}
                canMoveToNew={group.options.length > 1}
                canMoveAbove={groupIdx > 0}
                canMoveBelow={groupIdx < groups.length - 1}
                groupDose={group.dose ?? ''}
                groupDoseWho={group.dose_who ?? null}
                startInManualMode={option.id === manualEntryOptionId}
                onManualModeConsumed={() => setManualEntryOptionId(null)}
              />
            </div>
          ))}

          {/* ── Shared dose + note for this group ──
              Both gated on the same "first option has a name" check so a
              brand-new empty group doesn't expose dose/note prematurely.
              Note uses GroupNoteSlot so each group's open/closed state is
              independent (PHASE 2.2-C). */}
          {(() => {
            const firstOpt = group.options[0]
            if (!firstOpt) return null
            const firstIsLinked = !!(firstOpt.brand_id || firstOpt.generic_id || firstOpt.formulation_id)
            const firstHasName  = !!(firstOpt.brand_name?.trim() || firstOpt.generic_name?.trim())
            if (!firstIsLinked && !firstHasName) return null
            return (
              <>
                {/* PHASE 2.2-D — dose area, 19px left indent to align under the
                    drug names above it. FieldLabel removed (Decision 4 +
                    Decision 5 hierarchy — dose position communicates its
                    role; no label needed).

                    BUILD-FROM-SCRATCH REDESIGN (2026-08-08): previously this
                    branched into two different layouts — a read-only
                    dose_who badge plus either the structured bracket list
                    (only reachable via a library pick) or a single flat
                    "Dose / instructions" box (the only option when nothing
                    had been picked yet). Now there's one dose area
                    regardless of how it got here — population, brackets,
                    max dose, same shape DoseRowList uses to edit the actual
                    formulation — with one combined "Save to library" action
                    that creates whatever's missing there. A group's old
                    flat 'dose' text (if any) is shown as a one-time hint
                    and folded into the first bracket the moment "Add
                    bracket" is used — see addBracket. */}
                <div style={{
                  display: 'flex', flexDirection: 'column', gap: 6,
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  backgroundColor: 'var(--color-surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <EditablePopulation
                      value={group.dose_who}
                      onChange={val => updateGroupDoseWho(groupIdx, val)}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {/* DECLUTTER PASS 3 (Direction 1, 2026-08-08): the
                          always-visible "Save to library" button folded
                          into this menu as a conditionally-shown item,
                          using the same visibility gate it had as a
                          standalone button. Header row is now just the
                          population badge (left) + this one kebab (right).
                          OPTIONAL POPULATION NAME (2026-08-08): dose_who is
                          no longer required for the save item to show — a
                          blank population is valid as long as none of the
                          formulation's other populations are already
                          unnamed, which can't be known here without a
                          fetch. The real check happens in
                          saveDoseToLibrary() against the library's current
                          state, same deferred-validation pattern this file
                          already uses elsewhere (e.g. saveLineToLibrary). */}
                      {firstOpt.formulation_id && (
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            onClick={() => setDoseMenuOpenGroupIdx(v => v === groupIdx ? null : groupIdx)}
                            title="More dose actions"
                            aria-label="More dose actions"
                            style={{ ...lineIconButtonStyle, width: 22, height: 22, border: '1px solid var(--color-border)' }}
                          >
                            <MoreHorizontal size={13} />
                          </button>
                          {doseMenuOpenGroupIdx === groupIdx && (
                            <div ref={doseMenuRef} style={{ ...addDrugDropdownStyle, minWidth: 150 }}>
                              {(group.dose_lines ?? []).some(l => l.instruction?.trim()) && (
                                <button
                                  type="button"
                                  onClick={() => { setDoseMenuOpenGroupIdx(null); setConfirmSaveGroup(groupIdx) }}
                                  disabled={savingGroupIdx === groupIdx}
                                  style={{
                                    ...addDrugDropdownItemStyle,
                                    color: savedGroupIdx === groupIdx ? 'var(--color-accent)' : addDrugDropdownItemStyle.color,
                                  }}
                                >
                                  Save to library
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => { setDoseMenuOpenGroupIdx(null); restoreDoseFromLibrary(groupIdx) }}
                                disabled={restoringGroupIdx === groupIdx}
                                style={addDrugDropdownItemStyle}
                              >
                                {restoringGroupIdx === groupIdx ? 'Restoring…' : 'Restore from library'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {confirmSaveGroup === groupIdx && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: 4,
                      marginLeft: 19,
                      padding: '6px 8px',
                      border: '1px solid var(--color-accent)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: '#EFF6FF',
                    }}>
                      <span style={{ fontSize: 11, color: 'var(--color-text-primary)' }}>
                        Save this dose to the drug library for everyone?
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => { setConfirmSaveGroup(null); saveDoseToLibrary(groupIdx) }}
                          style={{
                            background: 'var(--color-accent)', color: '#fff',
                            border: 'none', borderRadius: 'var(--radius-md)',
                            padding: '3px 10px', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmSaveGroup(null)}
                          style={{
                            background: 'none', color: 'var(--color-text-secondary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            padding: '3px 10px', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer', fontFamily: 'var(--font-body)',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {savingGroupIdx === groupIdx && (
                    <span style={{ marginLeft: 19, fontSize: 10, color: 'var(--color-text-tertiary)' }}>Saving…</span>
                  )}
                  {savedGroupIdx === groupIdx && (
                    <span style={{ marginLeft: 19, fontSize: 10, color: 'var(--color-accent)' }}>Saved to library</span>
                  )}
                  {groupSaveError?.groupIdx === groupIdx && (
                    <span style={{ marginLeft: 19, fontSize: 10, color: '#ef4444' }}>{groupSaveError.message}</span>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 19 }}>
                    {(group.dose_lines ?? []).length === 0 && group.dose?.trim() && (
                      <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>
                        Previously entered: {group.dose}
                      </div>
                    )}

                    {/* Population pick (decision 25): one independently editable/
                        removable row per bracket, instead of a single input.
                        FIELD-SEPARATION ADDENDUM (2026-08-06): each line renders
                        read-only by default via EditableDoseLine, with its own
                        edit toggle — see that component for the legacy-line
                        split-on-first-edit behavior. */}
                    {group.dose_lines?.map(line => {
                      // WRITE-BACK FEATURE (step 11.3): only lines that trace
                      // back to a real library bracket, whose group is still
                      // linked to a formulation, and that have actually been
                      // split into title/instruction can be saved back
                      // individually — this per-line action is separate from
                      // (and still works alongside) the combined "Save to
                      // library" button above, which covers new brackets too.
                      const canSaveToLibrary = !!(line.bracket_id && firstOpt.formulation_id && line.instruction != null)
                      return (
                        <EditableDoseLine
                          key={line.id}
                          line={line}
                          onUpdateField={(field, value) => updateDoseLineField(groupIdx, line.id, field, value)}
                          onRemove={() => removeDoseLine(groupIdx, line.id)}
                          canSaveToLibrary={canSaveToLibrary}
                          isConfirming={confirmSaveLine?.line.id === line.id}
                          onRequestSave={() => setConfirmSaveLine({ groupIdx, line })}
                          onConfirmSave={() => {
                            const target = confirmSaveLine
                            setConfirmSaveLine(null)
                            saveLineToLibrary(target.groupIdx, target.line)
                          }}
                          onCancelConfirm={() => setConfirmSaveLine(null)}
                          isSaving={savingLineId === line.id}
                          isSaved={savedLineId === line.id}
                          saveError={lineSaveError?.lineId === line.id ? lineSaveError.message : null}
                          startInEdit={line.id === freshBracketId}
                          onEditConsumed={() => setFreshBracketId(null)}
                        />
                      )
                    })}

                    {/* DECLUTTER PASS 3 (Direction 1, 2026-08-08): "Add
                        bracket" and the shared "max dose" note (field-
                        separation addendum, 2026-08-06) merged into one
                        quieter line instead of two separate blocks — "Add
                        bracket" dropped its dashed-button chrome for a
                        plain inline text link, passed to EditableMaxDose
                        as trailingAction. canSaveToLibrary mirrors the
                        dose-line gate exactly: only a max dose that traces
                        back to a real library population, whose group is
                        still linked to a formulation, can be saved back. */}
                    <EditableMaxDose
                      value={group.dose_max}
                      onChange={val => updateGroupDoseMax(groupIdx, val)}
                      onRemove={() => updateGroupDoseMax(groupIdx, null)}
                      canSaveToLibrary={!!(group.dose_max_population_id && firstOpt.formulation_id)}
                      isConfirming={confirmSaveMaxDose === groupIdx}
                      onRequestSave={() => setConfirmSaveMaxDose(groupIdx)}
                      onConfirmSave={() => {
                        setConfirmSaveMaxDose(null)
                        saveMaxDoseToLibrary(groupIdx)
                      }}
                      onCancelConfirm={() => setConfirmSaveMaxDose(null)}
                      isSaving={savingMaxDoseGroupIdx === groupIdx}
                      isSaved={savedMaxDoseGroupIdx === groupIdx}
                      saveError={maxDoseSaveError?.groupIdx === groupIdx ? maxDoseSaveError.message : null}
                      trailingAction={
                        <button
                          type="button"
                          onClick={() => addBracket(groupIdx)}
                          style={{
                            background: 'none', border: 'none', padding: 0,
                            fontSize: 11, color: 'var(--color-text-tertiary)',
                            textDecoration: 'underline', cursor: 'pointer',
                            fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
                          }}
                        >
                          + Add bracket
                        </button>
                      }
                    />
                  </div>
                </div>

                {/* RESTORE-DOSE FEATURE (2026-06-26): population chooser,
                    only rendered for the group currently being restored.
                    Picking a population replaces this group's dose_lines
                    wholesale (or 'dose' if that population has one bracket
                    and collapses to a single line) with its current library
                    content — same immediate-apply behavior as before. */}
                {restorePendingChoice?.groupIdx === groupIdx && (
                  <PopulationChooser
                    populations={restorePendingChoice.populations}
                    onChoose={(population) => {
                      applyDoseToGroup(groupIdx, buildDoseLinesFromPopulation(population))
                      setRestorePendingChoice(null)
                    }}
                    onSkip={() => setRestorePendingChoice(null)}
                  />
                )}

                {/* PHASE 2.2-C/D — per-group note slot (tertiary, italic) */}
                <GroupNoteSlot
                  note={group.note}
                  onChange={value => updateGroupNote(groupIdx, value)}
                />
              </>
            )
          })()}

        </div>
      ))}

      {/* ── Add drug option control ──
          Unified Drug Row Editor Redesign, Phase 3 (2026-08-08): replaces the
          old three separate "add alternative"-style buttons (brand pick,
          formulation pick, free text) with the same shared AddDrugControls
          used inside each DrugOptionRow's own empty state, so "add a second
          option" looks and behaves identically to the first-option path.
          "Add new drug" here creates a fresh option and flags it via
          manualEntryOptionId so its DrugOptionRow starts directly in manual
          fields — no intermediate AddDrugControls step for that new option. */}
      {!soleOptionEmpty && (
        <AddDrugControls
          onPickBrand={() => setAddBrandPickerOpen(true)}
          onPickFormulation={() => setAddFormulationPickerOpen(true)}
          onAddManual={() => {
            const id = `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`
            setManualEntryOptionId(id)
            addOptionToGroups({ ...DRUG_OPTION_TEMPLATE, id })
          }}
        />
      )}

      {/* Picker modals */}
      <DrugPickerModal
        isOpen={addBrandPickerOpen}
        onClose={() => setAddBrandPickerOpen(false)}
        onSelect={brand => { setAddBrandPickerOpen(false); addOptionFromBrand(brand) }}
        mode="brand"
      />
      <DrugPickerModal
        isOpen={addFormulationPickerOpen}
        onClose={() => setAddFormulationPickerOpen(false)}
        onSelect={formulation => { setAddFormulationPickerOpen(false); addOptionFromFormulation(formulation) }}
        mode="formulation"
      />

    </div>
  )
}

// ─── Promote-alternative dialog (step 1.11) ────────────────────────────────────
// Exported separately so PrescriptionSheetEditor can mount it at the list level
// when the user tries to delete a main drug row that has alternatives.
// Shape unchanged — this dialog still operates on the DRUG_ROW_TEMPLATE level
// (row.alternatives[]), not the new groups[] model, which is fine: it is
// triggered by the parent before UnifiedDrugRowEditor mounts for the row being
// deleted, so no groups state exists yet at that point.
//
// Props:
//   row         — the DrugRow being deleted
//   onPromote   — (alternativeIndex: number) => void
//   onDeleteAll — () => void
//   onCancel    — () => void

export function PromoteAlternativeDialog({ row, onPromote, onDeleteAll, onCancel }) {
  const alts = row.alternatives ?? []
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 24, maxWidth: 440, width: '90%',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          fontSize: 15, fontWeight: 700,
          color: 'var(--color-text-primary)', marginBottom: 8,
        }}>
          This drug has alternatives
        </div>
        <div style={{
          fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16,
        }}>
          Deleting <strong>{row.brand_name || row.generic_name || 'this drug'}</strong> will
          also remove its alternatives. You can promote one alternative to take over
          the main slot, or delete everything together.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {alts.map((alt, idx) => {
            const label = [alt.brand_name, alt.generic_name].filter(Boolean).join(' / ') || `Alternative ${idx + 1}`
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onPromote(idx)}
                style={{
                  padding: '8px 12px', textAlign: 'left',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text-primary)',
                  fontSize: 13, fontFamily: 'var(--font-body)',
                  cursor: 'pointer', fontWeight: 500,
                }}
              >
                Promote <strong>{label}</strong> to main slot
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button" onClick={onCancel}
            style={{
              padding: '7px 14px',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer', fontWeight: 500,
            }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={onDeleteAll}
            style={{
              padding: '7px 14px',
              border: '1.5px solid #ef4444',
              borderRadius: 'var(--radius-md)',
              background: '#ef444410',
              color: '#ef4444',
              fontSize: 13, fontFamily: 'var(--font-body)',
              cursor: 'pointer', fontWeight: 600,
            }}
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  )
}