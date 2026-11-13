// Checks for roshettaRows.js (step 2.1a). Run with: node --test src/utils/roshettaRows.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROSHETTA_NAME_MAX,
  ROSHETTA_DESCRIPTION_MAX,
  ROSHETTA_DOSE_MAX,
  ROSHETTA_TEXT_BLOCK_MAX,
  ROSHETTA_MAX_TEXT_BLOCKS,
  ROSHETTA_MAX_ENTRIES,
  countDrugs,
  countTextBlocks,
  countEntries,
  checkName,
  checkDescription,
  checkDose,
  checkTextBlock,
  checkRows,
  newDrugGroup,
  addPartner,
  switchJoiner,
  removeDrug,
} from './roshettaRows.js';

const drug = (partners = 0, dose = '') => ({
  row_type: 'drug',
  id: 'd' + Math.random(),
  brand_name: 'Brand',
  dose,
  alternatives: Array.from({ length: partners }, () => ({ brand_name: 'P', joiner: 'or' })),
});
const text = (content = 'hi') => ({ row_type: 'plain_text', id: 't' + Math.random(), content });

test('limits are the approved sizes', () => {
  assert.equal(ROSHETTA_NAME_MAX, 40);
  assert.equal(ROSHETTA_DESCRIPTION_MAX, 200);
  assert.equal(ROSHETTA_DOSE_MAX, 600);
  assert.equal(ROSHETTA_TEXT_BLOCK_MAX, 1000);
  assert.equal(ROSHETTA_MAX_TEXT_BLOCKS, 10);
  assert.equal(ROSHETTA_MAX_ENTRIES, 40);
});

test('counts: partners count as drugs', () => {
  const rows = [drug(0), drug(2), text(), text()];
  assert.equal(countDrugs(rows), 4);
  assert.equal(countTextBlocks(rows), 2);
  assert.equal(countEntries(rows), 4);
});

test('counts: empty, null and unknown input are zero', () => {
  for (const v of [[], null, undefined, 'x']) {
    assert.equal(countDrugs(v), 0);
    assert.equal(countTextBlocks(v), 0);
    assert.equal(countEntries(v), 0);
  }
});

test('counts: a drug with no alternatives list counts as one', () => {
  assert.equal(countDrugs([{ row_type: 'drug' }]), 1);
});

test('checkName: trims, 1 to 40 characters', () => {
  assert.equal(checkName('Chest pain').ok, true);
  assert.equal(checkName('  x  ').ok, true);
  assert.equal(checkName('a'.repeat(40)).ok, true);
  assert.deepEqual(checkName('a'.repeat(41)), { ok: false, reason: 'too_long' });
  assert.deepEqual(checkName('   '), { ok: false, reason: 'empty' });
  assert.deepEqual(checkName(''), { ok: false, reason: 'empty' });
  assert.deepEqual(checkName(null), { ok: false, reason: 'empty' });
  assert.deepEqual(checkName(5), { ok: false, reason: 'not_text' });
});

test('checkName: trimmed spaces do not count toward the limit', () => {
  assert.equal(checkName('  ' + 'a'.repeat(40) + '  ').ok, true);
});

test('size checks count characters, not code units (emoji, Arabic)', () => {
  assert.equal(checkName('😀'.repeat(40)).ok, true);
  assert.equal(checkName('😀'.repeat(41)).ok, false);
  assert.equal(checkName('ألم الصدر').ok, true);
});

test('checkDescription: empty allowed, up to 200', () => {
  assert.equal(checkDescription('').ok, true);
  assert.equal(checkDescription(null).ok, true);
  assert.equal(checkDescription(undefined).ok, true);
  assert.equal(checkDescription('a'.repeat(200)).ok, true);
  assert.deepEqual(checkDescription('a'.repeat(201)), { ok: false, reason: 'too_long' });
  assert.deepEqual(checkDescription(7), { ok: false, reason: 'not_text' });
});

test('checkDose: empty allowed, up to 600, line breaks allowed', () => {
  assert.equal(checkDose('').ok, true);
  assert.equal(checkDose(null).ok, true);
  assert.equal(checkDose('500 mg\nevery 8 hours').ok, true);
  assert.equal(checkDose('a'.repeat(600)).ok, true);
  assert.deepEqual(checkDose('a'.repeat(601)), { ok: false, reason: 'too_long' });
  assert.deepEqual(checkDose({}), { ok: false, reason: 'not_text' });
});

test('checkTextBlock: up to 1000, empty allowed', () => {
  assert.equal(checkTextBlock('').ok, true);
  assert.equal(checkTextBlock('a'.repeat(1000)).ok, true);
  assert.deepEqual(checkTextBlock('a'.repeat(1001)), { ok: false, reason: 'too_long' });
  assert.deepEqual(checkTextBlock(1), { ok: false, reason: 'not_text' });
});

test('checkRows: a good roshetta passes', () => {
  assert.deepEqual(checkRows([drug(1, '5 mg'), text('note')]), { ok: true, reasons: [] });
  assert.deepEqual(checkRows([]), { ok: true, reasons: [] });
});

test('checkRows: only drug and plain_text rows', () => {
  for (const t of ['free_text', 'section', 'note', 'divider', 'image', undefined]) {
    const r = checkRows([{ row_type: t, content: 'x' }]);
    assert.equal(r.ok, false);
    assert.deepEqual(r.reasons, ['bad_row_type']);
  }
});

test('checkRows: not a list is refused', () => {
  assert.deepEqual(checkRows(null), { ok: false, reasons: ['not_a_list'] });
  assert.deepEqual(checkRows({}), { ok: false, reasons: ['not_a_list'] });
});

test('checkRows: 40 entries ok, 41 refused; partners are not entries', () => {
  const forty = Array.from({ length: 40 }, () => drug(3));
  assert.equal(checkRows(forty).ok, true);
  const r = checkRows([...forty, drug()]);
  assert.deepEqual(r.reasons, ['too_many_entries']);
});

test('checkRows: 10 text blocks ok, 11 refused', () => {
  const ten = Array.from({ length: 10 }, () => text());
  assert.equal(checkRows(ten).ok, true);
  assert.deepEqual(checkRows([...ten, text()]).reasons, ['too_many_text_blocks']);
});

test('checkRows: long dose or text block refused', () => {
  assert.deepEqual(checkRows([drug(0, 'a'.repeat(601))]).reasons, ['dose_too_long']);
  assert.deepEqual(checkRows([text('a'.repeat(1001))]).reasons, ['text_too_long']);
});

test('checkRows: a non-object row is refused', () => {
  assert.deepEqual(checkRows([null]).reasons, ['bad_row_type']);
  assert.deepEqual(checkRows(['x']).reasons, ['bad_row_type']);
});

test('checkRows: several problems are all reported once each', () => {
  const rows = [
    { row_type: 'free_text' },
    drug(0, 'a'.repeat(601)),
    drug(0, 'a'.repeat(601)),
  ];
  assert.deepEqual(checkRows(rows).reasons.sort(), ['bad_row_type', 'dose_too_long']);
});

// ---- Step 2.1b: a new drug group from a library drug ----

const libraryDrug = {
  id: 'brand-1',
  name: 'Augmentin 1 g',
  formulationId: 'form-1',
  concentration: '875/125 mg',
  form: 'Tablet',
  route: 'Oral',
  genericId: 'gen-1',
  genericName: 'Amoxicillin/Clavulanate',
  category: 'Antibiotic',
  // library dose fields must never be copied
  dose: '1 g every 12 hours',
  doseLines: [{ x: 1 }],
  defaultDoseOverride: 'x',
};

test('newDrugGroup: copies only the name and identity fields', () => {
  const row = newDrugGroup(libraryDrug, () => 'row-1');
  assert.equal(row.row_type, 'drug');
  assert.equal(row.id, 'row-1');
  assert.equal(row.brand_id, 'brand-1');
  assert.equal(row.brand_name, 'Augmentin 1 g');
  assert.equal(row.generic_id, 'gen-1');
  assert.equal(row.generic_name, 'Amoxicillin/Clavulanate');
  assert.equal(row.formulation_id, 'form-1');
  assert.equal(row.concentration, '875/125 mg');
  assert.equal(row.form, 'Tablet');
  assert.equal(row.route, 'Oral');
  assert.equal(row.category, 'Antibiotic');
});

test('newDrugGroup: every library dose field is empty', () => {
  const row = newDrugGroup(libraryDrug, () => 'row-1');
  assert.equal(row.dose, '');
  assert.equal(row.dose_who, null);
  assert.deepEqual(row.dose_lines, []);
  assert.equal(row.dose_max, null);
  assert.equal(row.dose_max_population_id, null);
  assert.equal(row.dose_library_base, null);
  assert.deepEqual(row.extra_populations, []);
  assert.equal(row.shown_population, 0);
  assert.equal(row.note, null);
  assert.equal(row.drug_note, null);
  assert.equal(row.source_flag, null);
  assert.deepEqual(row.alternatives, []);
});

test('newDrugGroup: counts as one drug and passes the row checks', () => {
  const row = newDrugGroup(libraryDrug);
  assert.equal(countDrugs([row]), 1);
  assert.deepEqual(checkRows([row]), { ok: true, reasons: [] });
  assert.ok(typeof row.id === 'string' && row.id.length > 10);
});

test('newDrugGroup: two new groups get different ids', () => {
  assert.notEqual(newDrugGroup(libraryDrug).id, newDrugGroup(libraryDrug).id);
});

test('newDrugGroup: missing optional library fields become null, not undefined', () => {
  const row = newDrugGroup({ id: 'b', name: 'X' });
  for (const k of ['generic_id', 'generic_name', 'formulation_id', 'concentration', 'form', 'route', 'category']) {
    assert.equal(row[k], null, k);
  }
});

test('newDrugGroup: refuses a drug with no id or name', () => {
  assert.throws(() => newDrugGroup(null));
  assert.throws(() => newDrugGroup({ name: 'X' }));
  assert.throws(() => newDrugGroup({ id: 'b' }));
});

test('newDrugGroup: does not change the library drug it was given', () => {
  const before = JSON.stringify(libraryDrug);
  newDrugGroup(libraryDrug);
  assert.equal(JSON.stringify(libraryDrug), before);
});

// ---- Step 2.1c: partners, the chip, removing a drug ----

const lib = (n) => ({
  id: 'b' + n,
  name: 'Drug ' + n,
  genericId: 'g' + n,
  genericName: 'Generic ' + n,
  formulationId: 'f' + n,
  concentration: n + ' mg',
  form: 'Tablet',
  route: 'Oral',
  category: 'Cat',
  doseLines: [{ x: n }],
});

const group = (n = 1) => ({ ...newDrugGroup(lib(n), () => 'main'), dose: '5 mg\nonce daily' });

test('addPartner: adds an "or" partner that shares the main dose group', () => {
  const row = addPartner(group(1), lib(2));
  assert.equal(row.alternatives.length, 1);
  const alt = row.alternatives[0];
  assert.equal(alt.brand_id, 'b2');
  assert.equal(alt.brand_name, 'Drug 2');
  assert.equal(alt.generic_name, 'Generic 2');
  assert.equal(alt.formulation_id, 'f2');
  assert.equal(alt.joiner, 'or');
  assert.equal(alt.group_id, 'main');
  assert.equal(countDrugs([row]), 2);
});

test('addPartner: "and" (plus) joiner, and bad joiner refused', () => {
  assert.equal(addPartner(group(), lib(2), 'and').alternatives[0].joiner, 'and');
  assert.throws(() => addPartner(group(), lib(2), 'maybe'));
});

test('addPartner: partner carries no dose of its own and no library dose', () => {
  const alt = addPartner(group(), lib(2)).alternatives[0];
  assert.equal(alt.dose, null);
  assert.equal(alt.dose_who, null);
  assert.deepEqual(alt.dose_lines, []);
  assert.equal(alt.note, null);
  assert.equal(alt.group_note, null);
  assert.equal(alt.group_dose_max, null);
  assert.equal(alt.group_dose_max_population_id, null);
  assert.equal(alt.group_dose_library_base, null);
  assert.deepEqual(alt.group_extra_populations, []);
  assert.equal(alt.group_shown_population, 0);
  assert.equal(alt.source_flag, null);
});

test('addPartner: keeps the main row and dose, appends in order, never changes the input', () => {
  const before = group();
  const snap = JSON.stringify(before);
  const one = addPartner(before, lib(2));
  const two = addPartner(one, lib(3), 'and');
  assert.equal(JSON.stringify(before), snap);
  assert.equal(two.dose, '5 mg\nonce daily');
  assert.deepEqual(two.alternatives.map((a) => a.brand_id), ['b2', 'b3']);
  assert.deepEqual(two.alternatives.map((a) => a.joiner), ['or', 'and']);
  assert.equal(countDrugs([two]), 3);
});

test('addPartner: refuses a bad library drug or a non-drug row', () => {
  assert.throws(() => addPartner(group(), null));
  assert.throws(() => addPartner(group(), { name: 'X' }));
  assert.throws(() => addPartner({ row_type: 'plain_text', id: 't' }, lib(2)));
});

test('switchJoiner: flips or / and for one partner only', () => {
  const row = addPartner(addPartner(group(), lib(2)), lib(3));
  const a = switchJoiner(row, 0);
  assert.deepEqual(a.alternatives.map((x) => x.joiner), ['and', 'or']);
  const b = switchJoiner(a, 0);
  assert.deepEqual(b.alternatives.map((x) => x.joiner), ['or', 'or']);
  assert.deepEqual(row.alternatives.map((x) => x.joiner), ['or', 'or']);
});

test('switchJoiner: a wrong index is refused', () => {
  const row = addPartner(group(), lib(2));
  for (const i of [-1, 1, 1.5, '0', undefined]) assert.throws(() => switchJoiner(row, i));
});

test('removeDrug: removing a partner keeps the rest in order', () => {
  const row = addPartner(addPartner(addPartner(group(), lib(2)), lib(3), 'and'), lib(4));
  const out = removeDrug(row, 2);
  assert.deepEqual(out.alternatives.map((a) => a.brand_id), ['b2', 'b4']);
  assert.deepEqual(out.alternatives.map((a) => a.joiner), ['or', 'or']);
  assert.equal(out.brand_id, 'b1');
  assert.equal(out.dose, '5 mg\nonce daily');
});

test('removeDrug: removing the main drug promotes the first partner, dose and id stay', () => {
  const row = addPartner(addPartner(group(), lib(2), 'and'), lib(3));
  const out = removeDrug(row, 0);
  assert.equal(out.id, 'main');
  assert.equal(out.brand_id, 'b2');
  assert.equal(out.brand_name, 'Drug 2');
  assert.equal(out.generic_id, 'g2');
  assert.equal(out.formulation_id, 'f2');
  assert.equal(out.concentration, '2 mg');
  assert.equal(out.dose, '5 mg\nonce daily');
  assert.deepEqual(out.alternatives.map((a) => a.brand_id), ['b3']);
  assert.equal(out.alternatives[0].group_id, 'main');
  assert.equal(countDrugs([out]), 2);
  for (const k of ['dose_who', 'dose_max', 'dose_max_population_id', 'dose_library_base', 'note', 'drug_note']) {
    assert.equal(out[k], null, k);
  }
  assert.deepEqual(out.dose_lines, []);
});

test('removeDrug: removing the only drug returns null (the group is gone)', () => {
  assert.equal(removeDrug(group(), 0), null);
});

test('removeDrug: a wrong position is refused and the input is never changed', () => {
  const row = addPartner(group(), lib(2));
  const snap = JSON.stringify(row);
  for (const i of [-1, 2, 0.5, '1', undefined]) assert.throws(() => removeDrug(row, i));
  removeDrug(row, 1);
  removeDrug(row, 0);
  assert.equal(JSON.stringify(row), snap);
});

test('after add, switch and remove the row still passes the row checks', () => {
  let row = addPartner(group(), lib(2));
  row = switchJoiner(row, 0);
  row = removeDrug(row, 0);
  assert.deepEqual(checkRows([row]), { ok: true, reasons: [] });
});
