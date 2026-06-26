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
import { Link, Unlink, Plus, X, Library, GripVertical, RotateCcw } from 'lucide-react'
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
  fetchFormulationWithGeneric,
} from '../../../../lib/adminQueries'
import {
  DRUG_OPTION_TEMPLATE,
  SOURCE_FLAG_VALUE,
  doseWhoLabel,
  formatDoseRowText,
  toDrugOptions,
  fromDrugOptions,
} from '../../../../constants/prescriptionRowSchema'

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

// ─── Dose age-group chooser ────────────────────────────────────────────────────

function DoseWhoChooser({ doseRows, onChoose, onSkip }) {
  return (
    <div style={{
      border: '1.5px solid var(--color-accent)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 12px',
      backgroundColor: '#EFF6FF',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Which dose should pre-fill this row?
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {doseRows.map((doseRow, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChoose(doseRow)}
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
              {doseWhoLabel(doseRow.who ?? doseRow.group) || 'Dose'}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
              {formatDoseRowText(doseRow)}
            </span>
          </button>
        ))}
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

function resolveDosePick(dosesStructured) {
  const rows = Array.isArray(dosesStructured) ? dosesStructured : []
  if (rows.length === 0) return { needsChoice: false, dose: null, dose_who: null }
  if (rows.length === 1) {
    const only = rows[0]
    return { needsChoice: false, dose: formatDoseRowText(only), dose_who: only.who ?? only.group ?? null }
  }
  return { needsChoice: true, doseRows: rows }
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
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', padding: 0,
        fontSize: 11, fontStyle: 'italic',
        color: 'var(--color-text-tertiary)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        alignSelf: 'flex-start',
      }}
    >
      + group note
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
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'none', border: 'none', padding: 0,
        fontSize: 11, fontStyle: 'italic',
        color: 'var(--color-text-tertiary)',
        cursor: 'pointer', fontFamily: 'var(--font-body)',
        alignSelf: 'flex-start',
      }}
    >
      + note
    </button>
  )
}

// ─── MoveMenu ──────────────────────────────────────────────────────────────────
// PHASE 2.4: inline context menu opened by the GripVertical move icon on each
// DrugOptionRow header. Renders a small absolute-positioned card with whichever
// of the three move actions are valid for the option's current position.
//
// Props:
//   canMoveToNew   — true when current group has >1 option (splitting a solo
//                    option into its own new group is a no-op, so suppress it)
//   canMoveAbove   — true when groupIdx > 0
//   canMoveBelow   — true when groupIdx < groups.length - 1
//   onMove         — (action: 'new-group'|'above'|'below') => void
//   onClose        — () => void

function MoveMenu({ canMoveToNew, canMoveAbove, canMoveBelow, onMove, onClose }) {
  const menuRef = useRef(null)

  // Dismiss on click-outside
  useEffect(() => {
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [onClose])

  const menuItemStyle = {
    display: 'block', width: '100%',
    padding: '7px 12px', textAlign: 'left',
    background: 'none', border: 'none',
    fontSize: 12, fontFamily: 'var(--font-body)',
    color: 'var(--color-text-primary)',
    cursor: 'pointer', whiteSpace: 'nowrap',
    borderRadius: 'var(--radius-md)',
  }

  const hasAnyOption = canMoveToNew || canMoveAbove || canMoveBelow
  if (!hasAnyOption) return null

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 200,
        marginTop: 4,
        background: 'var(--color-surface)',
        border: '1.5px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        padding: '4px',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}
    >
      {canMoveToNew && (
        <button
          type="button"
          style={menuItemStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
          onClick={() => { onMove('new-group'); onClose() }}
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
          onClick={() => { onMove('above'); onClose() }}
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
          onClick={() => { onMove('below'); onClose() }}
        >
          Move to group below
        </button>
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
//   onDoseReady   — (dose, dose_who) => void — called when a brand pick resolves
//                   to a pre-filled dose, so the parent can write it to the group
//   onMove        — (action: 'new-group'|'above'|'below') => void — PHASE 2.4
//   canMoveToNew  — bool: show "Move to new group" option            — PHASE 2.4
//   canMoveAbove  — bool: show "Move to group above" option          — PHASE 2.4
//   canMoveBelow  — bool: show "Move to group below" option          — PHASE 2.4

function DrugOptionRow({ option, onUpdate, onRemove, isOnly, onDoseReady, onMove, canMoveToNew, canMoveAbove, canMoveBelow, groupDose, groupDoseWho }) {
  const [promoteOn, setPromoteOn]             = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteDoseWho, setPromoteDoseWho]   = useState('adult')
  const [promoting, setPromoting]             = useState(false)
  const [promoteError, setPromoteError]       = useState(null)

  // Inline dose-age-group chooser — surfaces when a picked brand has 2+ dose rows
  const [pendingDoseChoice, setPendingDoseChoice] = useState(null)

  // PHASE 2.4: move menu open/closed state. Localised here so each row's
  // menu is independent — only one can be open at a time per user action
  // (click-outside dismisses it), but the state still lives per-row.
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const moveButtonRef = useRef(null)

  // showManualFields / genericOnlyMode: same reveal pattern as the old main row.
  // A fresh option shows only the search bar until a name is committed or the
  // admin opts into genericOnlyMode for the rarer generic-only entry path.
  const [genericOnlyMode, setGenericOnlyMode] = useState(
    !!option.generic_name?.trim() && !option.brand_name?.trim()
  )

  function patch(updates) {
    onUpdate({ ...option, ...updates })
  }

  const isLinked = !!(option.brand_id || option.generic_id || option.formulation_id)
  const showManualFields = !isLinked && (!!option.brand_name?.trim() || genericOnlyMode)
  const displayName = option.brand_name || option.generic_name || ''
  const showLink = option.drug_link_enabled !== false

  // ── Drug-link enabled toggle ────────────────────────────────────────────
  const drugLinkToggle = (
    <button
      type="button"
      onClick={() => patch({ drug_link_enabled: !showLink })}
      aria-label={showLink ? 'Drug link on — tap to disable' : 'Drug link off — tap to enable'}
      title={showLink
        ? 'Drug link: ON — name taps navigate to Drug Detail'
        : 'Drug link: OFF — name shown as plain text'}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28,
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${showLink ? 'var(--color-accent)' : 'var(--color-border)'}`,
        backgroundColor: showLink ? '#EFF6FF' : 'transparent',
        color: showLink ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
        cursor: 'pointer', padding: 0, flexShrink: 0,
      }}
    >
      {showLink ? <Link size={13} /> : <Unlink size={13} />}
    </button>
  )

  // ── Library link/unlink ─────────────────────────────────────────────────
  function handleBrandPick(brand) {
    const f       = brand.formulations
    const generic = f?.generics
    const baseFields = {
      brand_name:     brand.name,
      brand_id:       brand.id,
      generic_name:   generic?.name_en   ?? option.generic_name,
      generic_id:     generic?.id        ?? option.generic_id,
      name_ar:        brand.name_ar ?? generic?.name_ar ?? null,
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
    patch(baseFields)

    // Resolve dose — bubbled to parent so it can write to the group's dose field.
    const resolved = resolveDosePick(f?.doses_structured)
    if (resolved.needsChoice) {
      setPendingDoseChoice({ doseRows: resolved.doseRows })
    } else if (resolved.dose) {
      onDoseReady?.(resolved.dose, resolved.dose_who)
    }
  }

  function handleUnlink() {
    patch({
      brand_id: null, generic_id: null, formulation_id: null,
      concentration: null, form: null, route: null, category: null,
      _formulationMeta: undefined,
    })
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
    let genericId     = option.generic_id ?? null
    let formulationId = null
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
            name_ar: option.brand_name?.trim() ? '' : (option.name_ar?.trim() || ''),
            category: promoteCategory,
            class: null,
          })
          if (gErr) throw new Error(`Creating generic "${genericName}": ${gErr.message}`)
          genericId = newGeneric.id
        }
      }

      const { data: existingFormulation, error: findFErr } = await findFormulationMatch(genericId, concentration, option.form)
      if (findFErr) throw new Error(`Checking for an existing formulation: ${findFErr.message}`)
      if (existingFormulation) {
        formulationId = existingFormulation.id
      } else {
        const formulationSlugBase = `${genericName}-${concentration}-${option.form}`
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const { data: newFormulation, error: fErr } = await insertFormulation({
          generic_id: genericId,
          slug: formulationSlugBase || `formulation-${Date.now()}`,
          concentration,
          form: option.form,
          route: null,
          doses_structured: (() => {
            const dose = groupDose?.trim()
            if (!dose) return []
            if (promoteDoseWho === 'both') {
              return [
                { who: 'adult', instruction: dose },
                { who: 'child', instruction: dose },
              ]
            }
            return [{ who: promoteDoseWho, instruction: dose }]
          })(),
        })
        if (fErr) throw new Error(`Creating formulation: ${fErr.message}`)
        formulationId = newFormulation.id
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
            name_ar: option.name_ar?.trim() || '',
            manufacturer: null,
            source: SOURCE_FLAG_VALUE,
            is_published: true,
            is_available: true,
          })
          if (bErr) throw new Error(`Creating brand "${brandName}": ${bErr.message}`)
          brandId = newBrand.id
        }
      }

      patch({ generic_id: genericId, formulation_id: formulationId, brand_id: brandId, source_flag: SOURCE_FLAG_VALUE })
      setPromoteOn(false)
      setPromoteCategory('')
      setPromoteDoseWho('adult')
    } catch (err) {
      setPromoteError(err.message ?? 'Promotion failed. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Header row: not-in-library tag + move button + remove button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {showManualFields && <NotInLibraryTag />}

        {/* PHASE 2.4 — move icon. Hidden when this is the only option across
            all groups (nothing to move). The wrapper is position:relative so
            MoveMenu can position itself absolutely below the button. */}
        {!isOnly && (canMoveToNew || canMoveAbove || canMoveBelow) && (
          <div style={{ position: 'relative' }}>
            <button
              ref={moveButtonRef}
              type="button"
              title="Move this drug to a different group"
              aria-label="Move drug option"
              onClick={() => setMoveMenuOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, flexShrink: 0,
                border: '1px solid var(--color-border)',
                borderRadius: 4,
                background: moveMenuOpen ? 'var(--color-bg)' : 'transparent',
                color: moveMenuOpen ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                cursor: 'pointer', padding: 0,
              }}
            >
              <GripVertical size={11} />
            </button>
            {moveMenuOpen && (
              <MoveMenu
                canMoveToNew={canMoveToNew}
                canMoveAbove={canMoveAbove}
                canMoveBelow={canMoveBelow}
                onMove={onMove}
                onClose={() => setMoveMenuOpen(false)}
              />
            )}
          </div>
        )}

        {!isOnly && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove this drug option"
            style={{
              marginLeft: 'auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 22, height: 22, flexShrink: 0,
              border: '1px solid var(--color-border)',
              borderRadius: 4, background: 'transparent',
              color: '#ef4444', cursor: 'pointer', padding: 0,
            }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Single drug search field — always present */}
      <DrugSearchField
        value={displayName}
        isLinked={isLinked}
        concentration={option.concentration}
        form={option.form}
        nameAr={option.name_ar}
        genericName={option.generic_name}
        mode="brand"
        onChangeText={handleChangeText}
        onLink={handleBrandPick}
        onUnlink={handleUnlink}
        placeholder="Search or type a drug name…"
        extraAction={drugLinkToggle}
      />

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

      {/* Generic-only fallback — appears before any fields are revealed */}
      {!isLinked && !showManualFields && (
        <button
          type="button"
          onClick={() => setGenericOnlyMode(true)}
          style={{
            alignSelf: 'flex-start',
            background: 'none', border: 'none', padding: 0,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            color: 'var(--color-text-tertiary)', textDecoration: 'underline',
            fontFamily: 'var(--font-body)',
          }}
        >
          Or add generic only (no brand)
        </button>
      )}

      {/* Manual identity fields — unlinked rows only */}
      {showManualFields && (
        <>
          <div>
            <FieldLabel>Generic name</FieldLabel>
            <input
              type="text"
              value={option.generic_name ?? ''}
              onChange={e => patch({ generic_name: e.target.value || null })}
              placeholder="Generic name (e.g. Amoxicillin)"
              style={textInput()}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <FieldLabel>Concentration</FieldLabel>
              <input
                type="text"
                value={option.concentration ?? ''}
                onChange={e => patch({ concentration: e.target.value || null })}
                placeholder="e.g. 500mg"
                style={textInput()}
              />
            </div>
            <div>
              <FieldLabel>Form</FieldLabel>
              <select
                value={option.form ?? ''}
                onChange={e => patch({ form: e.target.value || null })}
                style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">— select form —</option>
                {DRUG_FORMS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <FieldLabel hint="optional">Arabic name</FieldLabel>
            <input
              type="text"
              value={option.name_ar ?? ''}
              onChange={e => patch({ name_ar: e.target.value || null })}
              placeholder="الاسم بالعربي"
              dir="rtl"
              style={textInput({ textAlign: 'right' })}
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

      {/* Inline dose age-group chooser — shown after a multi-dose brand pick */}
      {pendingDoseChoice && (
        <DoseWhoChooser
          doseRows={pendingDoseChoice.doseRows}
          onChoose={doseRow => {
            onDoseReady?.(formatDoseRowText(doseRow), doseRow.who ?? doseRow.group ?? null)
            setPendingDoseChoice(null)
          }}
          onSkip={() => setPendingDoseChoice(null)}
        />
      )}
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

  // RESTORE-DOSE FEATURE (2026-06-26): "restore dose from library" button.
  // Group-scoped pending-choice state, separate from DrugOptionRow's own
  // pendingDoseChoice (which is per-option, used during a fresh brand
  // pick). This one lives here because it operates directly on
  // group.dose/group.dose_who, not on any specific option's library link
  // action. restoringGroupIdx tracks which group's restore is in flight
  // (for a loading state); restorePendingChoice holds the dose rows when
  // the formulation has 2+ and the admin needs to pick one, keyed by
  // groupIdx so only the relevant group's chooser renders.
  const [restoringGroupIdx, setRestoringGroupIdx] = useState(null)
  const [restorePendingChoice, setRestorePendingChoice] = useState(null) // { groupIdx, doseRows } | null

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

  // Write a pre-filled dose (bubbled up from DrugOptionRow's brand pick) to a group.
  function applyDoseToGroup(groupIdx, dose, dose_who) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, dose: dose ?? null, dose_who: dose_who ?? null } : g
    )
    emitGroups(nextGroups)
  }

  // Update the shared dose field for a group (direct text edit).
  function updateGroupDose(groupIdx, value) {
    const nextGroups = groups.map((g, gi) =>
      gi === groupIdx ? { ...g, dose: value || null } : g
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
  //   0 dose rows  -> nothing to restore; defensive no-op (button
  //                   shouldn't be visible in this state to begin with).
  //   1 dose row   -> applied immediately, no extra confirmation.
  //   2+ dose rows -> surfaces the same DoseWhoChooser UI used for a
  //                   fresh multi-dose pick, so the admin re-picks which
  //                   age-group dose to restore.
  // Only ever touches group.dose / group.dose_who — never the group
  // note, never any option's identity fields.
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
        setRestorePendingChoice({ groupIdx, doseRows: resolved.doseRows })
      } else if (resolved.dose) {
        applyDoseToGroup(groupIdx, resolved.dose, resolved.dose_who)
      }
      // resolved.dose === null (formulation has zero dose rows) -> no-op,
      // nothing to restore to; existing group.dose is left exactly as-is.
    } finally {
      setRestoringGroupIdx(null)
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

  // pendingDose — optional { dose, dose_who, needsChoice, doseRows } from resolveDosePick.
  // When provided, the dose is written into the target group in the same emit so the
  // "Add option: pick a brand/formulation" buttons pre-fill dose identically to picking
  // a drug inside an existing DrugOptionRow via DrugSearchField (bug fix 2026-06-26).
  function addOptionToGroups(newOption, pendingDose) {
    const matchGroupIdx = groups.findIndex(g => {
      const firstOpt = g.options[0]
      return (
        newOption.formulation_id &&
        firstOpt?.formulation_id &&
        newOption.formulation_id === firstOpt.formulation_id
      )
    })

    let nextGroups
    let targetGroupIdx
    if (matchGroupIdx >= 0) {
      targetGroupIdx = matchGroupIdx
      const joined = { ...newOption, group_id: groups[matchGroupIdx].group_id }
      nextGroups = groups.map((g, gi) => {
        if (gi !== matchGroupIdx) return g
        const doseFields = pendingDose && !pendingDose.needsChoice && pendingDose.dose
          ? { dose: pendingDose.dose, dose_who: pendingDose.dose_who ?? null }
          : {}
        return { ...g, ...doseFields, options: [...g.options, joined] }
      })
    } else {
      targetGroupIdx = groups.length
      const newGroupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const standalone = { ...newOption, group_id: newGroupId }
      const doseFields = pendingDose && !pendingDose.needsChoice && pendingDose.dose
        ? { dose: pendingDose.dose, dose_who: pendingDose.dose_who ?? null }
        : { dose: null, dose_who: null }
      nextGroups = [...groups, { group_id: newGroupId, options: [standalone], ...doseFields, note: null }]
    }
    emitGroups(nextGroups)

    // Multi-dose chooser case: option is already added (dose null); surface the
    // DoseWhoChooser on the target group using the same restorePendingChoice
    // mechanism the restore-from-library button uses (reuses existing UI).
    if (pendingDose?.needsChoice) {
      setRestorePendingChoice({ groupIdx: targetGroupIdx, doseRows: pendingDose.doseRows })
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
      name_ar:        brand.name_ar ?? generic?.name_ar ?? null,
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
      name_ar:        generic?.name_ar   ?? null,
      formulation_id: formulation.id,
      concentration:  formulation.concentration ?? null,
      form:           formulation.form ?? null,
      route:          formulation.route ?? null,
      category:       generic?.category ?? null,
    }, pendingDose)
  }

  function addFreeTextOption() {
    addOptionToGroups({
      ...DRUG_OPTION_TEMPLATE,
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    })
  }

  // ── Derived ────────────────────────────────────────────────────────────
  const totalOptions = groups.reduce((sum, g) => sum + g.options.length, 0)

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

          {/* Divider between groups — Decision 5 (no divider before first group) */}
          {groupIdx > 0 && (
            <hr style={{
              border: 'none',
              borderTop: '1px solid var(--color-border)',
              margin: '4px 0 0',
            }} />
          )}

          {/* ── Stacked drug-name lines ── */}
          {group.options.map(option => (
            <DrugOptionRow
              key={option.id}
              option={option}
              onUpdate={nextOpt => updateOption(groupIdx, option.id, nextOpt)}
              onRemove={() => removeOption(groupIdx, option.id)}
              isOnly={totalOptions === 1}
              onDoseReady={(dose, dose_who) => applyDoseToGroup(groupIdx, dose, dose_who)}
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
            />
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
                {/* PHASE A BUG FIX (2026-06-26) — persistent dose_who
                    provenance tag. Previously dose_who was ONLY shown as
                    placeholder text on the dose input below, but
                    placeholder text disappears the instant the field has
                    a value — and dose_who is only ever set at the exact
                    same moment dose gets a value (via a library pick).
                    So the tag was invisible at the one moment it should
                    have been visible (reported bug: "the adult/child
                    dose tag doesn't appear"). dose_who itself was always
                    being computed/persisted correctly (handleBrandPick →
                    onDoseReady → applyDoseToGroup → fromDrugOptions) —
                    this is a pure rendering addition, not a data fix.
                    Per the schema's own docs, dose_who is provenance,
                    not a lock: editing dose by hand afterward does NOT
                    clear this tag, so it is shown unconditionally
                    whenever set, regardless of whether dose has since
                    been hand-edited. */}
                {group.dose_who && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    alignSelf: 'flex-start',
                    marginLeft: 19, // aligns under the names, matching the dose input's paddingLeft
                    padding: '1px 7px',
                    borderRadius: 99,
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.03em',
                    color: 'var(--color-accent)',
                    background: 'var(--color-accent-light)',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {doseWhoLabel(group.dose_who)}
                  </span>
                )}

                {/* PHASE 2.2-D — dose tier: 12px, regular weight, secondary color,
                    19px left indent to align under the drug names above it.
                    FieldLabel removed (Decision 4 + Decision 5 hierarchy — dose
                    position communicates its role; no label needed).

                    RESTORE-DOSE FEATURE (2026-06-26): wrapped in a row with a
                    "restore from library" icon button, gated specifically on
                    firstOpt.formulation_id (not the broader firstIsLinked check
                    above, which also covers brand/generic-only links that have
                    no formulation_id and therefore no doses_structured to
                    restore from at all). */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="text"
                    value={group.dose ?? ''}
                    onChange={e => updateGroupDose(groupIdx, e.target.value)}
                    placeholder="Dose / instructions"
                    dir="auto"
                    style={{
                      flex: 1,
                      width: '100%', boxSizing: 'border-box',
                      padding: '3px 8px',
                      paddingLeft: 19,
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: 12, fontWeight: 400,
                      fontFamily: 'var(--font-body)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text-secondary)',
                      outline: 'none',
                    }}
                  />
                  {firstOpt.formulation_id && (
                    <button
                      type="button"
                      onClick={() => restoreDoseFromLibrary(groupIdx)}
                      disabled={restoringGroupIdx === groupIdx}
                      title="Restore dose from library"
                      aria-label="Restore dose from library"
                      style={{
                        flexShrink: 0,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22,
                        border: 'none', background: 'none', padding: 0,
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-tertiary)',
                        cursor: restoringGroupIdx === groupIdx ? 'default' : 'pointer',
                        opacity: restoringGroupIdx === groupIdx ? 0.5 : 1,
                      }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                </div>

                {/* RESTORE-DOSE FEATURE (2026-06-26): multi-dose chooser,
                    only rendered for the group currently being restored. */}
                {restorePendingChoice?.groupIdx === groupIdx && (
                  <DoseWhoChooser
                    doseRows={restorePendingChoice.doseRows}
                    onChoose={(doseRow) => {
                      applyDoseToGroup(
                        groupIdx,
                        formatDoseRowText(doseRow),
                        doseRow.who ?? doseRow.group ?? null
                      )
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

      {/* ── Add drug option buttons ──
          Replace the old "add alternative" buttons (Decision 5: no main/alt
          concept). Same three entry paths — brand pick, formulation pick,
          free text. The "same formulation, new brand" scoped picker from Phase
          3 is removed: the default-join logic already auto-groups same-
          formulation picks without needing a separate button for it. */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setAddBrandPickerOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Add option: pick a brand…
        </button>
        <button
          type="button"
          onClick={() => setAddFormulationPickerOpen(true)}
          title="Use this for a genuinely different drug serving the same purpose"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Add option: pick a formulation…
        </button>
        <button
          type="button"
          onClick={addFreeTextOption}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1.5px dashed var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            color: 'var(--color-text-tertiary)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          <Plus size={11} /> Add option: free text
        </button>
      </div>

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


