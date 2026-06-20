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
 * @property {string|null} formulation_id    - uuid, set only if this row is fully linked to a
 *                                              specific formulations row (concentration + form
 *                                              combination already exists in the library).
 *                                              Concentration/form below are always the editable
 *                                              display values regardless of link state.
 *
 * @property {string|null} concentration     - free text, e.g. "500mg", "120mg/5ml"
 * @property {string|null} form               - free text or matched against config/forms.js list,
 *                                              e.g. "tablet", "syrup"
 *
 * @property {string|null} dose              - single editable text field (masterplan §2.3).
 *                                              Pre-filled from formulation default on library pick,
 *                                              but editing this NEVER writes back to
 *                                              formulations.default_dose_override or
 *                                              formulations.doses / doses_structured.
 *                                              Replaces old dose_text and dose_override fields.
 *                                              For alternatives sharing this same formulation_id
 *                                              (see AlternativeDrug.dose below), this is the single
 *                                              dose value used for all of them — alternatives only
 *                                              get their own independent `dose` when they are a
 *                                              genuinely different formulation.
 *
 * @property {string|null} note_en
 * @property {string|null} note_ar
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
  formulation_id: null,
  concentration: null,
  form: null,
  dose: null,
  note_en: null,
  note_ar: null,
  drug_link_enabled: true,
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
 * @property {string|null} formulation_id
 * @property {string|null} concentration
 * @property {string|null} form
 * @property {string|null} dose
 *   - LOCKED (2026-06-20): if this alternative has the same formulation_id
 *     as its parent drug row (i.e. it's just a different brand name for the
 *     exact same generic + concentration + form), `dose` here is ignored
 *     in favor of the parent row's single `dose` field — there is only one
 *     dose to show, since it really is the same medicine. The CMS should
 *     show this field as shared/read-only in that case, not a second
 *     editable box. If this alternative's formulation_id differs from the
 *     parent's (or either side is unlinked free text with no formulation_id
 *     at all), `dose` is this alternative's own independent, fully editable
 *     value — it is a genuinely different drug and may need a different
 *     amount.
 * @property {string|null} note_en
 * @property {string|null} note_ar
 * @property {'manual_entry'|null} source_flag
 */
export const ALTERNATIVE_DRUG_TEMPLATE = {
  brand_name: null,
  brand_id: null,
  generic_name: null,
  generic_id: null,
  formulation_id: null,
  concentration: null,
  form: null,
  dose: null,
  note_en: null,
  note_ar: null,
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
 *     dose_override    -> REMOVED. Use dose (pre-filled from formulation default,
 *                          freely editable, never written back to the formulation)
 *     note_en/note_ar -> unchanged
 *     drug_link_enabled -> unchanged
 *
 *   (new, both origins)
 *     brand_id, generic_id -> new, nullable link fields
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
    formulation_id: chosen.formulation_id,
    concentration: chosen.concentration,
    form: chosen.form,
    dose: chosen.dose,
    note_en: chosen.note_en,
    note_ar: chosen.note_ar,
    source_flag: chosen.source_flag,
    alternatives: remaining,
  };
}
