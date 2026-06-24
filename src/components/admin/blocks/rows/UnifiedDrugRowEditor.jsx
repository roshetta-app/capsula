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

import { useState } from 'react'
import { Link, Unlink, Plus, X, Library } from 'lucide-react'
import DrugPickerModal from '../../DrugPickerModal'
import DrugSearchField from '../../DrugSearchField'
import { DRUG_FORMS, DRUG_ROUTES } from '../../../../config/forms'
import { DRUG_CATEGORIES } from '../../../../config/categories'
import {
  findGenericByName,
  findFormulationMatch,
  findBrandMatch,
  insertGeneric,
  insertFormulation,
  insertBrand,
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

function DrugOptionRow({ option, onUpdate, onRemove, isOnly, onDoseReady }) {
  const [promoteOn, setPromoteOn]             = useState(false)
  const [promoteCategory, setPromoteCategory] = useState('')
  const [promoteRoute, setPromoteRoute]       = useState('')
  const [promoting, setPromoting]             = useState(false)
  const [promoteError, setPromoteError]       = useState(null)

  // Inline dose-age-group chooser — surfaces when a picked brand has 2+ dose rows
  const [pendingDoseChoice, setPendingDoseChoice] = useState(null)

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
    if (!promoteCategory || !promoteRoute) {
      setPromoteError('Category and route are required to save to the library.')
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
          route: promoteRoute,
          doses_structured: [],
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
      setPromoteRoute('')
    } catch (err) {
      setPromoteError(err.message ?? 'Promotion failed. Please try again.')
    } finally {
      setPromoting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Header row: not-in-library tag + remove button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {showManualFields && <NotInLibraryTag />}
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
            onClick={() => setPromoteOn(v => !v)}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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
                <div>
                  <FieldLabel>Route</FieldLabel>
                  <select
                    value={promoteRoute}
                    onChange={e => setPromoteRoute(e.target.value)}
                    style={{ ...textInput(), appearance: 'none', cursor: 'pointer' }}
                  >
                    <option value="">— select —</option>
                    {DRUG_ROUTES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

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

  // ── Mutation helpers ───────────────────────────────────────────────────

  function emitGroups(nextGroups) {
    setGroups(nextGroups)
    onChange(fromDrugOptions(row, nextGroups))
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

  // ── Add option (replaces "add alternative") ────────────────────────────
  // Newly-added options are auto-joined to an existing group when their
  // formulation_id matches that group's first option — same logic as
  // toDrugOptions() default-join. If no match, a new group is created.

  function addOptionToGroups(newOption) {
    const matchGroupIdx = groups.findIndex(g => {
      const firstOpt = g.options[0]
      return (
        newOption.formulation_id &&
        firstOpt?.formulation_id &&
        newOption.formulation_id === firstOpt.formulation_id
      )
    })

    let nextGroups
    if (matchGroupIdx >= 0) {
      const joined = { ...newOption, group_id: groups[matchGroupIdx].group_id }
      nextGroups = groups.map((g, gi) =>
        gi === matchGroupIdx ? { ...g, options: [...g.options, joined] } : g
      )
    } else {
      const newGroupId = `grp-${Date.now()}-${Math.random().toString(36).slice(2)}`
      const standalone = { ...newOption, group_id: newGroupId }
      nextGroups = [...groups, { group_id: newGroupId, options: [standalone], dose: null, dose_who: null, note: null }]
    }
    emitGroups(nextGroups)
  }

  function addOptionFromBrand(brand) {
    const f       = brand.formulations
    const generic = f?.generics
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
    })
  }

  function addOptionFromFormulation(formulation) {
    const generic = formulation.generics
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
    })
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

      {/* PHASE 2.2-B: loop over groups[].
          Each group renders its stacked DrugOptionRow entries (one per
          drug name), then one shared dose input below them.
          No move icon, no note slots, no visual hierarchy yet (2.2-C/D).
          Divider line between groups comes in 2.2-D. */}
      {groups.map((group, groupIdx) => (
        <div key={group.group_id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

          {/* ── Stacked drug-name lines ── */}
          {group.options.map(option => (
            <DrugOptionRow
              key={option.id}
              option={option}
              onUpdate={nextOpt => updateOption(groupIdx, option.id, nextOpt)}
              onRemove={() => removeOption(groupIdx, option.id)}
              isOnly={totalOptions === 1}
              onDoseReady={(dose, dose_who) => applyDoseToGroup(groupIdx, dose, dose_who)}
            />
          ))}

          {/* ── Shared dose field for this group ──
              Visibility mirrors the old main row's (isLinked || showManualFields)
              gate: only shown once the first option in the group has a drug name
              on it, so a brand-new group doesn't immediately expose a dose field
              before there is anything to dose. */}
          {(() => {
            const firstOpt = group.options[0]
            if (!firstOpt) return null
            const firstIsLinked = !!(firstOpt.brand_id || firstOpt.generic_id || firstOpt.formulation_id)
            const firstHasName  = !!firstOpt.brand_name?.trim()
            if (!firstIsLinked && !firstHasName) return null
            return (
              <div>
                <FieldLabel hint={group.dose_who ? doseWhoLabel(group.dose_who) : undefined}>
                  Dose / instructions
                </FieldLabel>
                <input
                  type="text"
                  value={group.dose ?? ''}
                  onChange={e => updateGroupDose(groupIdx, e.target.value)}
                  placeholder="e.g. 1 tablet twice daily for 5 days"
                  dir="auto"
                  style={textInput()}
                />
              </div>
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
