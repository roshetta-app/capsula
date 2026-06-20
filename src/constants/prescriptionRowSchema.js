/**
 * Shared shape definitions for prescription_sheet block rows.
 *
 * This is the single source of truth for what a "row" inside
 * condition_blocks.data->'rows' can look like, post-redesign.
 * Both the CMS row editor(s) and the app renderer must read/write
 * rows matching these shapes — do not duplicate field lists elsewhere.
 *
 * Storage: condition_blocks.data is JSONB. data.rows is a flat array.
 * No nested "sections" array — sections are just another row type
 * (see ROW_TYPES.SECTION_HEADER) sitting inline in the same list.
 *
 * Masterplan reference: capsula_prescription_redesign_masterplan.md
 * sections 2.1, 2.3, 2.4, 2.4a, 2.4b, 2.5, 2.6
 */

export const ROW_TYPES = {
  DRUG: 'drug',
  SECTION_HEADER: 'section_header',
  NOTE: 'note',
  FREE_TEXT: 'free_text',
};

/**
 * Unified drug row shape (masterplan §2.1).
 * Replaces the old separate drug_freetext / drug_library row_type values.
 * A single row_type: 'drug' now covers both origins; what differs is only
 * whether generic_id / formulation_id / brand_id are populated (linked
 * to the library) or null (free text, unlinked).
 *
 * @typedef {Object} DrugRow
 * @property {'drug'} row_type
 * @property {string} id                     - uuid, generated client-side on row creation
 *
 * @property {string|null} brand_name        - typed or picked brand display name.
 *                                              At least one of brand_name / generic_name
 *                                              must be non-empty (masterplan §2.1 validation rule).
 * @property {string|null} brand_id          - uuid, set only if brand_name matched/was picked
 *                                              from an existing brands row. Null = unlinked free text.
 *
 * @property {string|null} generic_name      - typed or picked generic display name.
 * @property {string|null} generic_id        - uuid, set only if generic_name matched/was picked
 *                                              from an existing generics row. Null = unlinked free text
 *                                              or left blank entirely (masterplan §2.6).
 *
 * @property {string|null} name_ar           - LOCKED (2026-06-20). Arabic display name shown
 *                                              directly under the English name. Mirrors
 *                                              brand.name_ar when this row is brand-led, or
 *                                              generic.name_ar when unbranded. Auto-filled on
 *                                              library pick (brand/formulation/generic select),
 *                                              but always freely editable for free-text rows.
 *
 * @property {string|null} formulation_id    - uuid, set only if this row is fully linked to a
 *                                              specific formulations row (concentration + form
 *                                              combination already exists in the library).
 *                                              PHASE 2 (2026-06-20): when this is set, the row is
 *                                              "linked" and brand_name/concentration/form/generic_name/
 *                                              route/category render as read-only display lines in
 *                                              the CMS editor — only `dose` stays editable. When this
 *                                              is null (free-text row), all of those fields are plain
 *                                              editable inputs, exactly as before Phase 2.
 *
 * @property {string|null} concentration     - free text, e.g. "500mg", "120mg/5ml". Editable only
 *                                              while formulation_id is null; once linked, this is a
 *                                              read-only snapshot taken at pick time, never live.
 * @property {string|null} form               - free text or matched against config/forms.js list,
 *                                              e.g. "tablet", "syrup". Same editability rule as
 *                                              concentration above.
 * @property {string|null} route             - PHASE 2 (2026-06-20), new. Snapshotted from
 *                                              formulations.route at pick time, same pattern as
 *                                              concentration/form — never live, never written back.
 *                                              Null for free-text rows; always editable via re-pick
 *                                              only, never a text box.
 * @property {string|null} category          - PHASE 2 (2026-06-20), new. Snapshotted from
 *                                              generics.category at pick time, same pattern as
 *                                              route above. Null for free-text rows.
 *
 * @property {string|null} dose              - single editable text field (masterplan §2.3).
 *                                              Pre-filled on library pick from the chosen row of
 *                                              formulations.doses_structured (PHASE 3, 2026-06-20 —
 *                                              previously, incorrectly, pre-filled from
 *                                              formulations.default_dose_override, which is a
 *                                              separate drug-detail-page footnote field, not a
 *                                              dose). Editing this NEVER writes back to
 *                                              formulations.doses_structured or
 *                                              formulations.default_dose_override.
 *                                              Replaces old dose_text and dose_override fields.
 *                                              For alternatives sharing this same formulation_id
 *                                              (see AlternativeDrug.dose below), this is the single
 *                                              dose value used for all of them — alternatives only
 *                                              get their own independent `dose` when they are a
 *                                              genuinely different formulation.
 *
 * @property {string|null} dose_who          - PHASE 3 (2026-06-20), new. The raw `who` key (e.g.
 *                                              'adult', 'elderly') of the doses_structured row the
 *                                              admin picked at add-time, when the formulation has
 *                                              more than one dose row to choose from. Display-only
 *                                              provenance tag, shown next to the dose line in the
 *                                              CMS and the app. Null when the row is free text, the
 *                                              formulation had zero or one dose row (nothing to
 *                                              choose), or `dose` was hand-typed without picking a
 *                                              structured row. Editing `dose` afterward does NOT
 *                                              clear this tag — it is provenance, not a lock.
 *
 * @property {string|null} note              - LOCKED (2026-06-20, supersedes separate note_en/note_ar).
 *                                              Single bidi field — author types English or Arabic
 *                                              (or both) into one box; the renderer applies dir="auto"
 *                                              so each language displays in its natural direction.
 * @property {boolean} drug_link_enabled     - carried over unchanged from current drug_library rows
 *
 * @property {'manual_entry'|null} source_flag
 *   - Set when this row's brand/generic/formulation were created via the
 *     save-to-library promote flow (masterplan §2.5), as opposed to having
 *     been picked from pre-existing library data. Mirrors (but is distinct
 *     from) brands.source = 'manual_entry' on the underlying brands row.
 *
 * @property {AlternativeDrug[]} alternatives
 *   - REVISED (2026-06-20, supersedes the earlier alt_group_id approach).
 *     Alternatives are NOT separate rows linked by a shared key — they live
 *     nested directly inside the main drug row, added via an "add
 *     alternative" button on the row that opens the same brand/generic
 *     picker (or lets the author type a free-text alternative). Two levels
 *     only: a drug row can have alternatives, but an alternative cannot
 *     have its own alternatives.
 *   - Defaults to an empty array. The main drug itself is just the row's
 *     own brand_name/generic_name/etc fields — it is not stored as the
 *     first element of this array.
 *   - If the main row is deleted while it has alternatives, the author is
 *     offered the option to promote one alternative to take over the main
 *     row's fields before the row is removed, rather than silently losing
 *     the alternatives (masterplan-level UX decision, exact confirmation
 *     dialog TBD in Phase 1/4).
 */
export const DRUG_ROW_TEMPLATE = {
  row_type: ROW_TYPES.DRUG,
  id: null,
  brand_name: null,
  brand_id: null,
  generic_name: null,
  generic_id: null,
  name_ar: null,
  formulation_id: null,
  concentration: null,
  form: null,
  route: null,
  category: null,
  dose: null,
  dose_who: null,
  note: null,
  source_flag: null,
  alternatives: [],
};

/**
 * One entry inside a DrugRow's `alternatives` array (masterplan §2.2,
 * revised version of the alternatives mechanism).
 *
 * Same field set as the main drug row, minus row-level concerns (no id,
 * no row_type, no alternatives-of-its-own — two levels only).
 *
 * @typedef {Object} AlternativeDrug
 * @property {string|null} brand_name
 * @property {string|null} brand_id
 * @property {string|null} generic_name
 * @property {string|null} generic_id
 * @property {string|null} name_ar
 *   - Same rule as DrugRow.name_ar: brand.name_ar if this alternative is
 *     brand-led, else generic.name_ar. Always shown under this
 *     alternative's own name, even when it shares the parent's dose/note
 *     cluster — only dose/note/breadcrumb are shared, not the name.
 * @property {string|null} formulation_id
 * @property {string|null} concentration
 * @property {string|null} form
 * @property {string|null} route             - PHASE 2 (2026-06-20), new. Same rule as DrugRow.route:
 *                                              snapshotted at pick time, read-only display once
 *                                              formulation_id is set.
 * @property {string|null} category          - PHASE 2 (2026-06-20), new. Same rule as DrugRow.category.
 * @property {string|null} dose
 *   - LOCKED (2026-06-20): if this alternative has the same formulation_id
 *     as its parent drug row (i.e. it's just a different brand name for the
 *     exact same generic + concentration + form), `dose` here is ignored
 *     in favor of the parent row's single `dose` field — there is only one
 *     dose to show, since it really is the same medicine. The CMS hides
 *     this field entirely in that case (not a second editable box that
 *     gets silently dropped). If this alternative's formulation_id differs
 *     from the parent's (or either side is unlinked free text with no
 *     formulation_id at all), `dose` is this alternative's own independent,
 *     fully editable value — it is a genuinely different drug and may need
 *     a different amount.
 * @property {string|null} dose_who
 *   - PHASE 3 (2026-06-20), new. Same rule as DrugRow.dose_who: the raw
 *     doses_structured `who` key picked at add-time, display-only, not
 *     cleared by hand-editing `dose` afterward.
 * @property {string|null} note
 *   - Same sharing rule as `dose`: hidden/inherited from the parent's
 *     `note` when this alternative shares the parent's formulation_id,
 *     otherwise its own independent value.
 * @property {'manual_entry'|null} source_flag
 */
export const ALTERNATIVE_DRUG_TEMPLATE = {
  brand_name: null,
  brand_id: null,
  generic_name: null,
  generic_id: null,
  name_ar: null,
  formulation_id: null,
  concentration: null,
  form: null,
  route: null,
  category: null,
  dose: null,
  dose_who: null,
  note: null,
  source_flag: null,
};

/**
 * Section header row shape (masterplan §2.4).
 * Purely a visual label inserted inline into the flat rows array.
 * Every row following this one belongs to it visually, until the next
 * section_header row or the end of the array. Rows with no preceding
 * section_header render ungrouped (unchanged from today).
 *
 * @typedef {Object} SectionHeaderRow
 * @property {'section_header'} row_type
 * @property {string} id
 * @property {string} label   - e.g. "For cough", "For fever"
 */
export const SECTION_HEADER_ROW_TEMPLATE = {
  row_type: ROW_TYPES.SECTION_HEADER,
  id: null,
  label: '',
};

/**
 * Existing row types, unchanged by this redesign. Included here only so
 * this file is the complete reference for everything that can appear in
 * data.rows, not just the new/changed drug row.
 */
export const NOTE_ROW_TEMPLATE = {
  row_type: ROW_TYPES.NOTE,
  id: null,
  text_en: null,
  text_ar: null,
};

export const FREE_TEXT_ROW_TEMPLATE = {
  row_type: ROW_TYPES.FREE_TEXT,
  id: null,
  content: null,
};

/**
 * Old field names -> new field names, for reference when migrating any
 * remaining old-shape rows or reading old data during development.
 * (Masterplan §0.4 — data shape reference.)
 *
 *   drug_freetext row:
 *     content        -> split into brand_name / generic_name / concentration / form
 *                        (best-effort parse not required; can be left as a single
 *                        brand_name with concentration/form blank if not separable)
 *     dose_text       -> dose
 *
 *   drug_library row:
 *     formulation_id  -> unchanged, still formulation_id
 *     dose_override    -> REMOVED. Use dose (pre-filled from a chosen
 *                          formulations.doses_structured row, see dose_who
 *                          above; freely editable, never written back to
 *                          the formulation)
 *     note_en/note_ar -> unchanged
 *     drug_link_enabled -> unchanged
 *
 *   (new, both origins)
 *     brand_id, generic_id -> new, nullable link fields
 *     name_ar                -> new (2026-06-20). Single Arabic display name,
 *                               replaces relying on generic name alone; mirrors
 *                               brand.name_ar when branded, else generic.name_ar.
 *     note_en + note_ar      -> MERGED (2026-06-20) into a single `note` field.
 *                               One bidi textbox instead of two; renderer uses
 *                               dir="auto" to display each language correctly.
 *     alternatives           -> new, array, replaces both the old
 *                               prescription_drug_alternatives table concept
 *                               (which was used 2 times total in production
 *                               and is not being carried forward as a
 *                               separate table) and the earlier-considered
 *                               alt_group_id linking-key approach (superseded
 *                               2026-06-20 — alternatives are nested inside
 *                               their parent row, not separate linked rows)
 *     source_flag            -> new, nullable, set by the promote flow
 */
export const FIELD_RENAME_MAP_FOR_REFERENCE = {
  'drug_freetext.content': 'brand_name / generic_name / concentration / form (split)',
  'drug_freetext.dose_text': 'dose',
  'drug_library.dose_override': 'REMOVED — use dose',
};

/**
 * LOCKED (2026-06-20): brands created via the new save-to-library promote
 * flow (masterplan §2.5) write source = 'manual_entry' (a new, distinct
 * value), not the existing 'manual' value. This lets newly-promoted brands
 * be told apart from older manual entries that predate this redesign.
 *
 * brands.source is a plain Postgres `text` column (confirmed via live
 * schema check, not an enum) — adding this value requires no migration,
 * only application code writing this exact string on insert.
 *
 * Real production values at time of writing: null (239 rows, predate the
 * field), 'manual' (4 rows), 'EDA' (2 rows), 'pharmacy-review' (1 row).
 */
export const SOURCE_FLAG_VALUE = 'manual_entry';

/**
 * PHASE 3 (2026-06-20): shared age-group labels for formulations.doses_structured
 * `who` keys. Single source of truth for both the CMS picker step (choosing
 * which dose row to prefill from) and the app render (the small provenance
 * tag next to the dose line) — must read identically in both places.
 * Mirrors the map already used by DoseTable.jsx on the drug detail screen.
 */
export const DOSE_WHO_LABELS = {
  adult:              'Adult',
  child:              'Child',
  'child-6-12':       'Child 6–12y',
  'child-6-12y':      'Child 6–12y',
  'child-2-6':        'Child 2–6y',
  'child-2-6y':       'Child 2–6y',
  'child-under-2':    'Child <2y',
  infant:             'Infant',
  neonate:            'Neonate',
  elderly:            'Elderly',
  renal:              'Renal',
  hepatic:            'Hepatic',
};

/**
 * Display label for a doses_structured `who` key, falling back to the raw
 * value (capitalized as typed) if it isn't in the known map — same
 * fallback behavior as DoseTable.jsx's formatWho().
 * @param {string|null} who
 * @returns {string}
 */
export function doseWhoLabel(who) {
  if (!who) return '';
  return DOSE_WHO_LABELS[who.toLowerCase().replace(/\s+/g, '-')] ?? who;
}

/**
 * PHASE 3 (2026-06-20): formats one formulations.doses_structured row into
 * the plain dose text copied onto a prescription row at pick time. Folds
 * the row's max_dose in alongside its instruction, since the prescription
 * row only has one dose field (no separate max-dose pill like the detail
 * page table has).
 * @param {{who?:string, instruction?:string, max_dose?:string|null}} doseRow
 * @returns {string|null}
 */
export function formatDoseRowText(doseRow) {
  if (!doseRow) return null;
  const instruction = doseRow.instruction?.trim();
  if (!instruction) return null;
  return doseRow.max_dose
    ? `${instruction} (max ${doseRow.max_dose})`
    : instruction;
}

/**
 * Reference logic for Phase 1 (CMS editor) and Phase 3 (app renderer) —
 * not wired up yet, included here so both implementations agree on the
 * rule without re-deriving it independently.
 *
 * Determines whether an alternative should display/edit its own `dose`,
 * or defer to the parent drug row's single shared `dose`.
 *
 * Rule (locked 2026-06-20): same formulation_id as the parent -> shared
 * dose, no second field. Different formulation_id, or either side missing
 * a formulation_id (free text/unlinked) -> the alternative's own dose.
 *
 * @param {DrugRow} parentRow
 * @param {AlternativeDrug} alternative
 * @returns {boolean} true if this alternative shares the parent's dose
 */
export function alternativeSharesParentDose(parentRow, alternative) {
  if (!parentRow.formulation_id || !alternative.formulation_id) {
    return false;
  }
  return parentRow.formulation_id === alternative.formulation_id;
}

/**
 * Reference logic for the "delete main drug" flow (masterplan-level UX
 * decision, locked 2026-06-20): if a drug row being deleted has one or
 * more alternatives, the author should be offered a choice — promote one
 * alternative to become the new main row (taking over brand/generic/
 * formulation/concentration/form/dose/notes), or delete everything
 * together. This function does not perform the promotion itself (that's
 * a Phase 1 CMS state-update concern); it documents the expected shape
 * of the result so Phase 1 implements it consistently.
 *
 * @param {DrugRow} row             - the row being deleted
 * @param {number} alternativeIndex - index into row.alternatives of the
 *                                     alternative chosen to be promoted
 * @returns {DrugRow} a new DrugRow with the chosen alternative's fields
 *                     in the main position, and the rest of the original
 *                     alternatives array (minus the promoted one) carried
 *                     over unchanged
 */
export function promoteAlternativeToMain(row, alternativeIndex) {
  const chosen = row.alternatives[alternativeIndex];
  const remaining = row.alternatives.filter((_, i) => i !== alternativeIndex);
  return {
    ...DRUG_ROW_TEMPLATE,
    id: row.id,
    brand_name: chosen.brand_name,
    brand_id: chosen.brand_id,
    generic_name: chosen.generic_name,
    generic_id: chosen.generic_id,
    name_ar: chosen.name_ar,
    formulation_id: chosen.formulation_id,
    concentration: chosen.concentration,
    form: chosen.form,
    route: chosen.route,
    category: chosen.category,
    dose: chosen.dose,
    dose_who: chosen.dose_who,
    note: chosen.note,
    source_flag: chosen.source_flag,
    alternatives: remaining,
  };
}


