// Roshetta rows: plain functions on the list of rows a roshetta is made of.
// A roshetta holds only two row types: 'drug' (a drug group: one main drug
// plus optional 'or' / 'plus' partners sharing one dose text) and
// 'plain_text' (a text block, drawn as plain text, never markdown or HTML).
// This file has no screen code and no network calls.
// Step 2.1a: sizes, counts and checks. Step 2.1b: a new drug group.
// Step 2.1c: 'or' / 'plus' partners. Later steps add moving and text blocks.

import { newId } from './groupChanges.js';

export const ROSHETTA_ROW_TYPES = {
  DRUG: 'drug',
  PLAIN_TEXT: 'plain_text',
};

// Sizes (plan assumption E). The database enforces the same numbers.
export const ROSHETTA_NAME_MAX = 40;
export const ROSHETTA_DESCRIPTION_MAX = 200;
export const ROSHETTA_DOSE_MAX = 600;
export const ROSHETTA_TEXT_BLOCK_MAX = 1000;
export const ROSHETTA_MAX_TEXT_BLOCKS = 10;
export const ROSHETTA_MAX_ENTRIES = 40;

// Characters as people count them (an emoji is one), like the database.
function charLength(s) {
  return Array.from(s).length;
}

function asList(rows) {
  return Array.isArray(rows) ? rows : [];
}

function isRow(row, type) {
  return !!row && typeof row === 'object' && row.row_type === type;
}

// Every drug counts, including the 'or' / 'plus' partners (plan assumption F).
export function countDrugs(rows) {
  let n = 0;
  for (const row of asList(rows)) {
    if (!isRow(row, ROSHETTA_ROW_TYPES.DRUG)) continue;
    n += 1 + (Array.isArray(row.alternatives) ? row.alternatives.length : 0);
  }
  return n;
}

export function countTextBlocks(rows) {
  return asList(rows).filter((r) => isRow(r, ROSHETTA_ROW_TYPES.PLAIN_TEXT)).length;
}

// Entries are the cards in the editor: drug groups and text blocks.
export function countEntries(rows) {
  return asList(rows).length;
}

function checkText(value, { allowEmpty }) {
  if (value === null || value === undefined) {
    return allowEmpty ? { ok: true } : { ok: false, reason: 'empty' };
  }
  if (typeof value !== 'string') return { ok: false, reason: 'not_text' };
  return { ok: true, length: charLength(value) };
}

export function checkName(name) {
  const base = checkText(name, { allowEmpty: false });
  if (!base.ok) return base;
  const n = charLength(name.trim());
  if (n === 0) return { ok: false, reason: 'empty' };
  if (n > ROSHETTA_NAME_MAX) return { ok: false, reason: 'too_long' };
  return { ok: true };
}

function checkLimit(value, max) {
  const base = checkText(value, { allowEmpty: true });
  if (!base.ok) return base;
  if (base.length !== undefined && base.length > max) return { ok: false, reason: 'too_long' };
  return { ok: true };
}

export function checkDescription(text) {
  return checkLimit(text, ROSHETTA_DESCRIPTION_MAX);
}

export function checkDose(text) {
  return checkLimit(text, ROSHETTA_DOSE_MAX);
}

export function checkTextBlock(text) {
  return checkLimit(text, ROSHETTA_TEXT_BLOCK_MAX);
}

// Checks a whole list of rows. Each problem is reported once.
export function checkRows(rows) {
  if (!Array.isArray(rows)) return { ok: false, reasons: ['not_a_list'] };
  const reasons = new Set();
  if (rows.length > ROSHETTA_MAX_ENTRIES) reasons.add('too_many_entries');
  if (countTextBlocks(rows) > ROSHETTA_MAX_TEXT_BLOCKS) reasons.add('too_many_text_blocks');
  for (const row of rows) {
    if (isRow(row, ROSHETTA_ROW_TYPES.DRUG)) {
      if (!checkDose(row.dose).ok) reasons.add('dose_too_long');
    } else if (isRow(row, ROSHETTA_ROW_TYPES.PLAIN_TEXT)) {
      if (!checkTextBlock(row.content).ok) reasons.add('text_too_long');
    } else {
      reasons.add('bad_row_type');
    }
  }
  return { ok: reasons.size === 0, reasons: [...reasons] };
}

// The name and identity fields of a library drug (the flat drug the Add drugs
// search gives), in the row field names. No dose field is ever copied.
function identityFields(d) {
  return {
    brand_id: d.id,
    brand_name: d.name,
    generic_id: d.genericId ?? null,
    generic_name: d.genericName ?? null,
    formulation_id: d.formulationId ?? null,
    concentration: d.concentration ?? null,
    form: d.form ?? null,
    route: d.route ?? null,
    category: d.category ?? null,
  };
}

function assertLibraryDrug(d) {
  if (!d || !d.id || !d.name) {
    throw new Error('Needs a library drug with an id and a name');
  }
}

function assertDrugRow(row) {
  if (!isRow(row, ROSHETTA_ROW_TYPES.DRUG)) throw new Error('Not a drug row');
}

// A new drug group from a library drug. Every library dose field is left empty
// on purpose: library doses are not guaranteed accurate, so the author types
// the dose themselves (plan decision 5). Returns a new object.
export function newDrugGroup(libraryDrug, makeId = newId) {
  assertLibraryDrug(libraryDrug);
  return {
    row_type: ROSHETTA_ROW_TYPES.DRUG,
    id: makeId(),
    ...identityFields(libraryDrug),
    dose: '',
    dose_who: null,
    dose_lines: [],
    dose_max: null,
    dose_max_population_id: null,
    dose_library_base: null,
    extra_populations: [],
    shown_population: 0,
    note: null,
    drug_note: null,
    source_flag: null,
    alternatives: [],
  };
}

const JOINERS = ['or', 'and']; // 'and' is shown to people as 'plus'

// Adds an 'or' / 'plus' partner at the end of a drug group. The partner shares
// the main drug's dose text: it carries the main row's id as its group id and
// has no dose of its own. Returns a new row.
export function addPartner(row, libraryDrug, joiner = 'or') {
  assertDrugRow(row);
  assertLibraryDrug(libraryDrug);
  if (!JOINERS.includes(joiner)) throw new Error('Joiner must be or / and');
  const partner = {
    ...identityFields(libraryDrug),
    dose: null,
    dose_who: null,
    dose_lines: [],
    note: null,
    source_flag: null,
    group_id: row.id,
    group_note: null,
    group_dose_max: null,
    group_dose_max_population_id: null,
    group_dose_library_base: null,
    group_extra_populations: [],
    group_shown_population: 0,
    joiner,
  };
  return { ...row, alternatives: [...(row.alternatives ?? []), partner] };
}

function assertPartnerIndex(row, index) {
  const n = row.alternatives?.length ?? 0;
  if (!Number.isInteger(index) || index < 0 || index >= n) {
    throw new Error('No such partner');
  }
}

// Switches the chip in front of one partner between 'or' and 'plus'.
// partnerIndex 0 is the chip between the main drug and the first partner.
export function switchJoiner(row, partnerIndex) {
  assertDrugRow(row);
  assertPartnerIndex(row, partnerIndex);
  const alternatives = row.alternatives.map((alt, i) =>
    i === partnerIndex ? { ...alt, joiner: alt.joiner === 'and' ? 'or' : 'and' } : alt
  );
  return { ...row, alternatives };
}

// Removes one drug from a group. position 0 is the main drug, 1 and up are the
// partners in order. Removing the main drug promotes the first partner; the
// group keeps its id and its dose text. Returns null when the only drug is
// removed (the caller deletes the whole group). Returns a new row.
export function removeDrug(row, position) {
  assertDrugRow(row);
  const partners = row.alternatives ?? [];
  if (!Number.isInteger(position) || position < 0 || position > partners.length) {
    throw new Error('No such drug');
  }
  if (position > 0) {
    return { ...row, alternatives: partners.filter((_, i) => i !== position - 1) };
  }
  if (partners.length === 0) return null;
  const [first, ...rest] = partners;
  return {
    ...row,
    ...identityFields({
      id: first.brand_id,
      name: first.brand_name,
      genericId: first.generic_id,
      genericName: first.generic_name,
      formulationId: first.formulation_id,
      concentration: first.concentration,
      form: first.form,
      route: first.route,
      category: first.category,
    }),
    alternatives: rest,
  };
}

// A new text block (drawn as plain text, never markdown or HTML).
export function newTextBlock(content = '', makeId = newId) {
  if (typeof content !== 'string') throw new Error('Text block content must be text');
  return { row_type: ROSHETTA_ROW_TYPES.PLAIN_TEXT, id: makeId(), content };
}

function assertEntryIndex(rows, index) {
  if (!Array.isArray(rows)) throw new Error('Rows must be a list');
  if (!Number.isInteger(index) || index < 0 || index >= rows.length) {
    throw new Error('No such entry');
  }
}

function swapped(rows, i, j) {
  const out = [...rows];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

// Moves an entry one place up. The first entry stays where it is.
// Returns a new list.
export function moveEntryUp(rows, index) {
  assertEntryIndex(rows, index);
  return index === 0 ? [...rows] : swapped(rows, index, index - 1);
}

// Moves an entry one place down. The last entry stays where it is.
// Returns a new list.
export function moveEntryDown(rows, index) {
  assertEntryIndex(rows, index);
  return index === rows.length - 1 ? [...rows] : swapped(rows, index, index + 1);
}

// Deletes one entry (a drug group goes with its partners). Returns a new list.
export function deleteEntry(rows, index) {
  assertEntryIndex(rows, index);
  return rows.filter((_, i) => i !== index);
}
