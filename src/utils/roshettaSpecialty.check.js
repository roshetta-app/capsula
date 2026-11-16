// Checks for roshettaSpecialty.js (Phase I step 10.3). Run with: node --test src/utils/roshettaSpecialty.check.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LOOK, findSpecialty, specialtyFromShared, specialtyColors, specialtyHeaderText } from './roshettaSpecialty.js';
import { SPECIALTY_TOKENS } from './specialtyTokens.js';

const CARD = { id: 's1', name: 'Cardiology', iconType: 'lucide', iconValue: 'HeartPulse', colorToken: 'rose' };
const LIST = [{ id: 's0', name: 'Uncategorized', iconType: 'lucide', iconValue: 'Stethoscope', colorToken: 'slate' }, CARD];

test('find: the roshetta specialty is picked out of the list by id', () => {
  assert.equal(findSpecialty('s1', LIST), CARD);
});

test('find: none chosen, a missing id, a bad list or a bad id all answer null', () => {
  for (const id of [null, undefined, '', 'zzz', 5, {}]) assert.equal(findSpecialty(id, LIST), null, String(id));
  for (const list of [null, undefined, 'x', {}, []]) assert.equal(findSpecialty('s1', list), null, String(list));
  assert.equal(findSpecialty('s1', [null, undefined, CARD]), CARD, 'empty entries in the list are skipped');
});

test('shared: the public function shape becomes the picker shape', () => {
  const out = specialtyFromShared({ id: 's1', name_en: ' Cardiology ', name_ar: null, icon_type: 'lucide', icon_value: 'HeartPulse', color_token: 'rose' });
  assert.deepEqual(out, CARD);
});

test('shared: a custom icon keeps its address; a missing icon or colour falls back safely', () => {
  const custom = specialtyFromShared({ id: 's2', name_en: 'ENT', icon_type: 'custom', icon_value: 'https://x/y.svg', color_token: null });
  assert.deepEqual([custom.iconType, custom.iconValue, custom.colorToken], ['custom', 'https://x/y.svg', null]);
  const bare = specialtyFromShared({ id: 's3', name_en: 'ENT' });
  assert.deepEqual([bare.iconType, bare.iconValue, bare.colorToken], ['lucide', 'Stethoscope', null]);
});

test('shared: null, a list, no id or no name all answer null (the default blue is shown)', () => {
  for (const bad of [null, undefined, [], 'x', 5, {}, { id: 's1' }, { id: '', name_en: 'A' }, { id: 's1', name_en: '   ' }, { name_en: 'A' }]) {
    assert.equal(specialtyFromShared(bad), null, JSON.stringify(bad));
  }
});

test('colours: a specialty uses its own token in light and in dark', () => {
  assert.deepEqual(specialtyColors(CARD, false), { isDefault: false, ...SPECIALTY_TOKENS.rose.light });
  assert.deepEqual(specialtyColors(CARD, true), { isDefault: false, ...SPECIALTY_TOKENS.rose.dark });
});

test('colours: no specialty gives the app blue (its own variables, same in both modes)', () => {
  for (const dark of [false, true]) {
    const c = specialtyColors(null, dark);
    assert.deepEqual(c, { isDefault: true, bg: 'var(--color-accent-light)', fg: 'var(--color-accent)', pill: 'var(--color-accent)' });
  }
  assert.deepEqual(specialtyColors(undefined), { isDefault: true, ...DEFAULT_LOOK });
});

test('colours: a specialty with no or an unknown colour token gets the safe grey, not a crash', () => {
  for (const colorToken of [null, undefined, 'not-a-token']) {
    const c = specialtyColors({ ...CARD, colorToken }, false);
    assert.deepEqual([c.isDefault, c.bg], [false, SPECIALTY_TOKENS.slate.light.bg], String(colorToken));
  }
});

test('header text: the specialty name, trimmed, or the fallback when there is none', () => {
  assert.equal(specialtyHeaderText(CARD, 'Roshetta'), 'Cardiology');
  assert.equal(specialtyHeaderText({ ...CARD, name: '  ENT ' }, 'Roshetta'), 'ENT');
  for (const s of [null, undefined, {}, { name: '  ' }, { name: 5 }]) assert.equal(specialtyHeaderText(s, 'Roshetta'), 'Roshetta');
  assert.equal(specialtyHeaderText(null), '');
});
