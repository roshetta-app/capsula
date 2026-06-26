/**
 * Shared shape definitions for prescription_sheet block rows.
 *
 * This is the single source of truth for what a "row" inside
 * condition_blocks.data->'rows' can look like, post-redesign.
 * Both the CMS row editor(s) and the app renderer must read/write
 * rows matching these shapes — do not duplicate field lists elsewhere.
 *
 * Storage: condition_blocks.data is JSONB. data.rows is a flat array.
 * Most rows sit inline in that flat list (drug, note, free_text). PHASE 4
 * (2026-06-21) adds one exception: ROW_TYPES.SECTION is a self-contained
 * container row whose members live in its own nested `drugs` array, not
 * inferred from list position — see SECTION_ROW_TEMPLATE below. Two levels
 * max (sheet -> section -> drugs).
 *
 * PHASE 7 (2026-06-21): removed the legacy `section_header` row type (the
 * flat, position-based section marker `section` superseded — see
 * SECTION_ROW_TEMPLATE) along with all legacy `drug_library`/`drug_freetext`
 * field-mapping reference material. No persisted data of these shapes
 * remained in the database at the time of removal (confirmed via audit).
 *
 * Masterplan reference: capsula_prescription_redesign_masterplan.md
 * sections 2.1, 2.3, 2.4, 2.4a, 2.4b, 2.5, 2.6
 */

export const ROW_TYPES = {
  DRUG: 'drug',
  SECTION: 'section',
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
 * @property {string|null} note              - LOCKED (2026-06-20). This is the GROUP-level note for
 *                                              the main drug's group (Decision 5 two-slot model) — the
 *                                              note shared by every member of the main drug's cluster,
 *                                              shown once after the last member of that cluster.
 *                                              Single bidi field — author types English or Arabic (or
 *                                              both) into one box; the renderer applies dir="auto" so
 *                                              each language displays in its natural direction.
 * @property {string|null} drug_note          - PHASE A BUG FIX (2026-06-26), new. The main drug's own
 *                                              PER-DRUG note (Decision 5 two-slot model) — independent
 *                                              of `note` above (the group note), sits directly under
 *                                              the main drug's own name line, exactly mirroring
 *                                              AlternativeDrug.note's role for alternatives. Until this
 *                                              field existed, the main drug had no equivalent per-drug
 *                                              note slot at all: DrugOptionRow's per-drug note input
 *                                              wrote to the in-memory main option's `note` field, but
 *                                              toDrugOptions()/fromDrugOptions() never read or wrote
 *                                              that value anywhere on `row` — so a per-drug note typed
 *                                              on the main drug was silently dropped on every save,
 *                                              while the identical action on an alternative worked
 *                                              correctly (alternatives already had their own `note`
 *                                              field to round-trip through). This field closes that
 *                                              gap. Defaults to null; additive — existing rows have no
 *                                              main-drug per-drug note, so this is null on migration,
 *                                              same as AlternativeDrug.note was when it was introduced.
 * @property {boolean} drug_link_enabled     - whether the brand/formulation name links through to
 *                                              its drug detail page in the app
 *
 * @property {'manual_entry'|null} source_flag
 *   - Set when this row's brand/generic/formulation were created via the
 *     save-to-library promote flow (masterplan §2.5), as opposed to having
 *     been picked from pre-existing library data. Mirrors (but is distinct
 *     from) brands.source = 'manual_entry' on the underlying brands row.
 *
 * @property {AlternativeDrug[]} alternatives
 *   - Alternatives are NOT separate rows linked by a shared key — they live
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
 *     the alternatives.
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
  drug_note: null,
  source_flag: null,
  alternatives: [],
};

/**
 * One entry inside a DrugRow's `alternatives` array (masterplan §2.2).
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
 *   - PHASE A DOCSTRING FIX (2026-06-26): this comment previously said
 *     this field was "hidden/inherited from the parent's note" when
 *     sharing the parent's formulation_id — that described the OLD,
 *     pre-two-slot-model behavior and was stale/incorrect as of the
 *     Decision 5 two-slot note model (see DRUG_OPTION_TEMPLATE.note and
 *     DrugOptionGroup.note below). This is the alternative's own
 *     independent per-drug note — it always travels with this specific
 *     alternative, regardless of which group/cluster it belongs to, and
 *     is never overridden or hidden by the group's shared note. The
 *     group-level note for non-main groups lives in `group_note` below,
 *     a separate field.
 * @property {'manual_entry'|null} source_flag
 * @property {string|null} group_id
 *   - PHASE 2.8 (2026-06-25), new. Persisted grouping signal for the flat
 *     drug-options model (Decision 5 / Phase 0's toDrugOptions/
 *     fromDrugOptions). Written on every save once a row has passed
 *     through the updated editor; null on legacy rows that predate this
 *     field. See toDrugOptions() below for how null is handled (falls back
 *     to the original formulation_id-based default-grouping rule).
 * @property {string|null} group_note
 *   - PHASE 2.8 (2026-06-25), new. The group-level note (Decision 5's
 *     two-slot model) for any group other than the main drug's group.
 *     Distinct from `note` above, which is this alternative's own per-drug
 *     note. Null when this alternative shares the main group (the group
 *     note in that case is the row's own top-level `note` field) or when
 *     the group simply has no note set.
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
  group_id: null,
  group_note: null,
};

/**
 * Section row shape (PHASE 4, 2026-06-21).
 * Self-contained container: its members live directly in its own `drugs`
 * array, nested inside this one row, instead of being inferred from array
 * position. This is the only section mechanism as of PHASE 7 (2026-06-21
 * — the earlier flat, position-based `section_header` marker was removed
 * once no persisted data of that shape remained).
 *
 * Two levels max (sheet -> section -> drugs) — a section's `drugs` array
 * holds drug rows only (row_type 'drug'); it never holds another section,
 * a note, or a free_text row.
 *
 * @typedef {Object} SectionRow
 * @property {'section'} row_type
 * @property {string} id        - uuid, generated client-side on row creation
 * @property {string} label     - e.g. "For cough", "For fever"
 * @property {DrugRow[]} drugs  - nested drug rows belonging to this section,
 *                                 in display order. Defaults to an empty array.
 */
export const SECTION_ROW_TEMPLATE = {
  row_type: ROW_TYPES.SECTION,
  id: null,
  label: '',
  drugs: [],
};

/**
 * Existing row types, unchanged by this redesign. Included here only so
 * this file is the complete reference for everything that can appear in
 * data.rows, not just the drug/section rows above.
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
 * a CMS state-update concern); it documents the expected shape of the
 * result so the CMS implements it consistently.
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

/* ────────────────────────────────────────────────────────────────────────
 * PHASE 0 (2026-06-22) — flat grouped drug-options shape.
 *
 * Admin Condition Editor Redesign, Decision 5: the editor UI must stop
 * expressing a main/alternative hierarchy. All drug options on one
 * prescription line become equal, flat entries; one or more of them can
 * share a single dose/note by belonging to the same `group_id`.
 *
 * This section is purely additive — DRUG_ROW_TEMPLATE and
 * ALTERNATIVE_DRUG_TEMPLATE above are UNCHANGED, and existing
 * `main` + `alternatives[]` data keeps working as-is. Nothing here is
 * wired into any row UI yet (that starts in Phase 1/2). What this adds:
 *
 *   1. DRUG_OPTION_TEMPLATE — the new flat per-option shape used once a
 *      row is rendered as a list of options-in-groups.
 *   2. toDrugOptions(row)   — deterministic, lossless mapping from an
 *      existing DrugRow (main + alternatives[]) into a flat
 *      DrugOptionGroup[] with group_id assigned, per the Phase 2.8
 *      migration rule (kept here, not just in the UI, so app code and
 *      CMS code share one implementation and can't drift).
 *   3. fromDrugOptions(row, groups) — the inverse: folds flat
 *      DrugOptionGroup[] back onto a DrugRow's main fields +
 *      alternatives[], so existing save/load code paths through
 *      DRUG_ROW_TEMPLATE keep working unchanged while the UI itself
 *      operates on the flat shape.
 *
 * No schema/table change. condition_blocks.data keeps storing rows in
 * the existing DRUG_ROW_TEMPLATE shape; group_id and group_note are
 * persisted as plain fields on ALTERNATIVE_DRUG_TEMPLATE (added PHASE 2.8,
 * 2026-06-25), not new database columns — JSONB needs no migration for
 * this. See toDrugOptions()/fromDrugOptions() below for the read/write
 * logic: group_id is read as the primary grouping signal when present,
 * falling back to the original formulation_id-derived default only for
 * legacy rows saved before this field existed.
 * ──────────────────────────────────────────────────────────────────── */

/**
 * One flat drug option inside a grouped drug-options block (Decision 5).
 * Same identity/library fields as AlternativeDrug — this does not
 * introduce a new way to represent "which drug" beyond what already
 * exists, only a new way to group options for shared dose/note display.
 *
 * @typedef {Object} DrugOption
 * @property {string} id                     - uuid, stable per option across
 *                                              re-renders/re-grouping (needed
 *                                              so the move-to-group action in
 *                                              Phase 2 can target a specific
 *                                              option without relying on
 *                                              array index).
 * @property {string} group_id               - uuid. Options sharing a
 *                                              group_id share one dose field
 *                                              and one note field (Decision 5).
 *                                              Never null/undefined — every
 *                                              option belongs to exactly one
 *                                              group, even a group of one.
 * @property {string|null} brand_name
 * @property {string|null} brand_id
 * @property {string|null} generic_name
 * @property {string|null} generic_id
 * @property {string|null} name_ar
 * @property {string|null} formulation_id
 * @property {string|null} concentration
 * @property {string|null} form
 * @property {string|null} route
 * @property {string|null} category
 * @property {'manual_entry'|null} source_flag
 * @property {boolean} drug_link_enabled     - per-drug link toggle (Decision 1;
 *                                              also the locked app-side rule in
 *                                              the App-Side Rendering Impact
 *                                              section — link is per-drug, not
 *                                              per-main, once groups are flat).
 *
 * Dose/note are intentionally NOT fields on DrugOption — they live once per
 * GROUP (see DrugOptionGroup below), not once per option, matching Decision 5
 * ("a group is a set of one or more drug names that share one dose field and
 * one note field").
 */
export const DRUG_OPTION_TEMPLATE = {
  id: null,
  group_id: null,
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
  source_flag: null,
  drug_link_enabled: true,
  // Per-drug note (Decision 5 two-slot note model). Independent of the
  // group note (DrugOptionGroup.note). Travels with the drug option if it
  // is moved to a different group. Defaults null; preserved on round-trip
  // through toDrugOptions / fromDrugOptions via alt.note.
  note: null,
};

/**
 * A group of one or more DrugOptions sharing one dose + one note
 * (Decision 5). This is the shape the Phase 2 UI iterates over to render
 * "vertical stack of names, one dose line, one collapsible note" per group.
 *
 * @typedef {Object} DrugOptionGroup
 * @property {string} group_id
 * @property {DrugOption[]} options   - display order within the group
 * @property {string|null} dose
 * @property {string|null} dose_who
 * @property {string|null} note
 */

/**
 * Deterministic mapping from a DrugRow's existing main + alternatives[]
 * fields into a flat array of DrugOptionGroup.
 *
 * Grouping signal, in priority order:
 *   1. PHASE 2.8 (2026-06-25): if an alternative has a persisted
 *      `group_id`, it is trusted directly — it is matched against the
 *      main option's group_id (always row.id) and against every other
 *      alternative's persisted group_id, so multiple alternatives sharing
 *      a `group_id` (including ones an admin explicitly grouped together
 *      via the move-to-group action, regardless of formulation_id) are
 *      reassembled into one group, with that group's note sourced from
 *      whichever member's `group_note` is set.
 *   2. Legacy fallback (LOCKED, original Phase 0/2.8 migration rule) —
 *      used only when `group_id` is null/absent, i.e. this alternative
 *      predates Phase 2.8 and has never been saved through the updated
 *      editor:
 *        - Matches the main drug's formulation_id
 *          (alternativeSharesParentDose() — reused, not reimplemented)
 *          -> joins the main drug's group, preserving today's
 *          dose-sharing display exactly as-is.
 *        - Formulation_id differs, or is null (free-text/manual
 *          alternatives) -> becomes its OWN separate group, carrying its
 *          own dose/note over unchanged.
 *   No admin action is required for legacy rows to keep rendering
 *   correctly — the very first save through the editor stamps real
 *   group_id/group_note values going forward (a lazy, per-row migration;
 *   no bulk backfill needed since condition_blocks.data is JSONB).
 *
 * This function does not mutate `row`.
 *
 * @param {DrugRow} row
 * @returns {DrugOptionGroup[]}
 */
export function toDrugOptions(row) {
  const mainOption = {
    ...DRUG_OPTION_TEMPLATE,
    id: row.id,
    group_id: row.id, // main always seeds its own group id
    brand_name: row.brand_name,
    brand_id: row.brand_id,
    generic_name: row.generic_name,
    generic_id: row.generic_id,
    name_ar: row.name_ar,
    formulation_id: row.formulation_id,
    concentration: row.concentration,
    form: row.form,
    route: row.route,
    category: row.category,
    source_flag: row.source_flag,
    drug_link_enabled: row.drug_link_enabled !== false,
    // PHASE A BUG FIX (2026-06-26): the main drug's own per-drug note
    // (Decision 5 two-slot model), independent of the group note below.
    // Previously missing entirely — see DRUG_ROW_TEMPLATE.drug_note's
    // docstring for the full explanation of the gap this closes.
    note: row.drug_note ?? null,
  };

  const mainGroup = {
    group_id: mainOption.group_id,
    options: [mainOption],
    dose: row.dose,
    dose_who: row.dose_who,
    note: row.note,
  };

  const groups = [mainGroup];
  // Looks up an in-progress (non-main) group by its resolved group_id, so
  // multiple alternatives sharing a persisted group_id land in the same
  // group instead of each becoming their own (PHASE 2.8).
  const groupsByKey = new Map();

  (row.alternatives ?? []).forEach((alt, index) => {
    const persistedGroupId = alt.group_id ?? null;

    let joinsMain;
    let resolvedGroupId;

    if (persistedGroupId) {
      // PHASE 2.8: trust the persisted signal directly.
      joinsMain = persistedGroupId === mainGroup.group_id;
      resolvedGroupId = persistedGroupId;
    } else {
      // Legacy fallback — unchanged original behavior.
      joinsMain = alternativeSharesParentDose(row, alt);
      resolvedGroupId = joinsMain
        ? mainGroup.group_id
        : `${row.id}-alt-group-${index}`;
    }

    const option = {
      ...DRUG_OPTION_TEMPLATE,
      // Alternatives have no id of their own in the legacy shape — derive
      // a stable one from the main row's id + position so re-renders don't
      // thrash; a real client-generated uuid is assigned once this option
      // is actually edited/moved (Phase 2 concern, not Phase 0).
      id: `${row.id}-alt-${index}`,
      group_id: resolvedGroupId,
      brand_name: alt.brand_name,
      brand_id: alt.brand_id,
      generic_name: alt.generic_name,
      generic_id: alt.generic_id,
      name_ar: alt.name_ar,
      formulation_id: alt.formulation_id,
      concentration: alt.concentration,
      form: alt.form,
      route: alt.route,
      category: alt.category,
      source_flag: alt.source_flag,
      drug_link_enabled: alt.drug_link_enabled !== false,
      // Per-drug note (Decision 5 two-slot model) — independent of the
      // group note, travels with the option regardless of grouping.
      note: alt.note ?? null,
    };

    if (joinsMain) {
      mainGroup.options.push(option);
      return;
    }

    const existingGroup = groupsByKey.get(resolvedGroupId);
    if (existingGroup) {
      // Another alternative already seeded this group (PHASE 2.8 case of
      // two+ alternatives sharing a persisted group_id) — just add this
      // option; dose/dose_who/group_note were already seeded identically
      // by fromDrugOptions on every member, so the first one encountered
      // is authoritative.
      existingGroup.options.push(option);
      return;
    }

    const newGroup = {
      group_id: resolvedGroupId,
      options: [option],
      dose: alt.dose,
      dose_who: alt.dose_who,
      // PHASE A BUG FIX (2026-06-26): no longer falls back to alt.note.
      // The previous `alt.group_note ?? alt.note ?? null` fallback was
      // written for true legacy data (alternatives saved before
      // group_note existed as a field at all), but it could not tell
      // that case apart from a brand-new single-option group where the
      // admin deliberately set only a per-drug note and intentionally
      // left the group note empty — both cases present as group_note
      // being null/undefined. The fallback wrongly fired for both,
      // copying the per-drug note into the group note slot every time
      // a single-option group was created (reported bug: per-drug note
      // on a lone alternative "bleeds into" the group note).
      // Verified against live data (2026-06-26, Supabase project
      // szzsqjpmcqsmvkvncgln): only one alternative in the entire
      // database depended on this fallback, and it was a non-production
      // stress-test row, not real clinical content. Safe to remove —
      // any genuinely legacy row gets a real group_id/group_note
      // stamped the next time it is opened and saved (existing lazy
      // per-row migration, unchanged by this fix).
      note: alt.group_note ?? null,
    };
    groupsByKey.set(resolvedGroupId, newGroup);
    groups.push(newGroup);
  });

  return groups;
}

/**
 * Inverse of toDrugOptions(): folds a flat DrugOptionGroup[] back onto a
 * DrugRow's existing main-field + alternatives[] shape, so existing
 * save/load code paths that read/write DRUG_ROW_TEMPLATE fields keep
 * working unchanged while the UI itself operates on the flat shape.
 *
 * Convention (per Decision 5's storage note): the first option of the
 * first group becomes the row's "main" fields; every other option across
 * every group becomes an entry in `alternatives[]`. An alternative that
 * shares its group with the main option has its dose/note set to null on
 * the way out (meaning "shared with parent" — read back correctly by
 * alternativeSharesParentDose() as long as formulation_id also matches).
 * An alternative in any other group carries that group's own dose/note.
 *
 * PHASE 2.8 (2026-06-25): every alternative now also persists its
 * `group_id` and `group_note` literally, so toDrugOptions() can trust
 * the grouping signal directly on next load instead of re-deriving it
 * from formulation_id. This is what makes an admin's explicit
 * "move to group" action (including grouping two options that do NOT
 * share a formulation_id) survive a save/reload — previously this was a
 * known gap (see the removed note this docstring used to carry), and the
 * group-level note for any non-main group was silently dropped entirely
 * since ALTERNATIVE_DRUG_TEMPLATE had no field for it.
 *
 * @param {DrugRow} row               - existing row, used only for its
 *                                       non-drug-option fields (row_type, id)
 * @param {DrugOptionGroup[]} groups
 * @returns {DrugRow}
 */
export function fromDrugOptions(row, groups) {
  const flattened = groups.flatMap(g =>
    g.options.map(opt => ({ option: opt, group: g }))
  );

  if (flattened.length === 0) {
    return { ...DRUG_ROW_TEMPLATE, id: row.id };
  }

  const [{ option: mainOpt, group: mainGrp }, ...rest] = flattened;

  const alternatives = rest.map(({ option: opt, group: grp }) => {
    const sharesMainGroup = grp.group_id === mainGrp.group_id;
    return {
      ...ALTERNATIVE_DRUG_TEMPLATE,
      brand_name: opt.brand_name,
      brand_id: opt.brand_id,
      generic_name: opt.generic_name,
      generic_id: opt.generic_id,
      name_ar: opt.name_ar,
      formulation_id: opt.formulation_id,
      concentration: opt.concentration,
      form: opt.form,
      route: opt.route,
      category: opt.category,
      source_flag: opt.source_flag,
      dose: sharesMainGroup ? null : grp.dose,
      dose_who: sharesMainGroup ? null : grp.dose_who,
      // Per-drug note (Decision 5 two-slot model) — always opt.note, the
      // per-drug note travels with the option, not with the group.
      note: opt.note ?? null,
      // PHASE 2.8: persist the real grouping signal literally, so it can
      // be trusted directly on next load (see toDrugOptions above).
      group_id: opt.group_id,
      // PHASE 2.8: persist the group-level note for non-main groups —
      // previously dropped entirely, since this field didn't exist.
      group_note: sharesMainGroup ? null : (grp.note ?? null),
    };
  });

  return {
    ...DRUG_ROW_TEMPLATE,
    id: row.id,
    brand_name: mainOpt.brand_name,
    brand_id: mainOpt.brand_id,
    generic_name: mainOpt.generic_name,
    generic_id: mainOpt.generic_id,
    name_ar: mainOpt.name_ar,
    formulation_id: mainOpt.formulation_id,
    concentration: mainOpt.concentration,
    form: mainOpt.form,
    route: mainOpt.route,
    category: mainOpt.category,
    dose: mainGrp.dose,
    dose_who: mainGrp.dose_who,
    note: mainGrp.note,
    // PHASE A BUG FIX (2026-06-26): write the main option's own per-drug
    // note back onto drug_note (the group note above is a separate,
    // shared field). Closes the round-trip gap — see
    // DRUG_ROW_TEMPLATE.drug_note's docstring. Correct regardless of
    // which physical drug option ends up as "main" after a move/reorder,
    // since mainOpt.note already holds that specific option's own
    // per-drug note value, independent of its origin.
    drug_note: mainOpt.note ?? null,
    source_flag: mainOpt.source_flag,
    drug_link_enabled: mainOpt.drug_link_enabled,
    alternatives,
  };
}
