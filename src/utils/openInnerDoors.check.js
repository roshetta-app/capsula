// Checks for the doors inside groups, roshettas and shared pages (Roshetta plan, Phase K, step 12.7c).
// Run with:  node --test src/utils/openInnerDoors.check.js
// Cases K5 (a drug opens as one new step), K7 (a double tap opens once), K8 (a group or roshetta
// opened from Home, See all or the Drugs groups row), K9 (Add and Edit screens), K14 (a shared page
// with nothing behind it offers Open Capsula, which goes Home) and K15 (a drug opened from a shared
// page keeps that page behind it). The tap guard and the drug helper are proved in
// tapGuard.check.js and openDrug.check.js; these checks read the screens as text so a door cannot
// slip back to a bare navigate.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8')

const home = read('../pages/HomeScreen.jsx')
const groupsSection = read('../components/drugs/groups/GroupsSection.jsx')
const browse = read('../components/drugs/home/DrugsBrowseSection.jsx')
const roshettas = read('../pages/RoshettasListScreen.jsx')
const groupPage = read('../pages/DrugGroupScreen.jsx')
const addToGroup = read('../pages/AddDrugsToGroupScreen.jsx')
const roshettaAdd = read('../pages/RoshettaAddDrugScreen.jsx')
const roshettaPage = read('../pages/RoshettaScreen.jsx')
const roshettaEditor = read('../pages/RoshettaEditorScreen.jsx')
const sharedGroup = read('../pages/SharedGroupScreen.jsx')
const sharedRoshetta = read('../pages/SharedRoshettaScreen.jsx')
const freeText = read('../components/conditions/FreeTextPostBlock.jsx')
const sheetBlock = read('../components/conditions/PrescriptionSheetBlock.jsx')

test('K8: Home opens a roshetta, a group and both See all arrows through the guard', () => {
  assert.match(home, /openPage\(ROUTES\.ROSHETTA\(/)
  assert.match(home, /openPage\(ROUTES\.DRUGS_GROUP\(/)
  assert.match(home, /openPage\(ROUTES\.ROSHETTAS\)/)
  assert.match(home, /openPage\(ROUTES\.DRUGS_GROUPS\)/)
  assert.doesNotMatch(home, /\bnavigate\(/)
})

test('K8: the Drugs groups row, the browse strip, and My roshettas open through the guard', () => {
  assert.match(groupsSection, /openPage\(ROUTES\.DRUGS_GROUP\(/)
  assert.match(groupsSection, /openPage\(ROUTES\.DRUGS_GROUPS\)/)
  assert.doesNotMatch(groupsSection, /\bnavigate\(/)
  assert.match(browse, /openPage\(ROUTES\.DRUGS_BROWSE_CATEGORY\)/)
  assert.match(browse, /openPage\(ROUTES\.DRUGS_BROWSE_CLASS\)/)
  assert.doesNotMatch(browse, /\bnavigate\(/)
  assert.match(roshettas, /openPage\(ROUTES\.ROSHETTA\(r\.id\)\)/)
  assert.doesNotMatch(roshettas, /navigate\(ROUTES\.ROSHETTA\(/)
})

test('K5, K7: a drug opened from a group, an Add screen or a shared page uses the drug door', () => {
  for (const [name, src] of [
    ['group page', groupPage], ['Add to group', addToGroup], ['roshetta Add', roshettaAdd],
    ['shared group', sharedGroup],
  ]) {
    assert.match(src, /useOpenDrug/, `${name} uses useOpenDrug`)
    assert.doesNotMatch(src, /navigate\(ROUTES\.DRUG_DETAIL\(/, `${name} has no bare drug navigate`)
  }
})

test('K9: Add and Edit screens open from the group and roshetta pages through the guard', () => {
  assert.match(groupPage, /openPage\(ROUTES\.DRUGS_GROUP_ADD\(/)
  assert.doesNotMatch(groupPage, /navigate\(ROUTES\.DRUGS_GROUP_ADD\(/)
  assert.match(roshettaPage, /openPage\(ROUTES\.ROSHETTA_EDIT\(/)
  assert.doesNotMatch(roshettaPage, /navigate\(ROUTES\.ROSHETTA_EDIT\(/)
  assert.match(roshettaEditor, /openPage\(ROUTES\.ROSHETTA_ADD\(id\)/)
  assert.doesNotMatch(roshettaEditor, /navigate\(ROUTES\.ROSHETTA_ADD\(/)
})

test('K14: a shared page with nothing behind it says Open Capsula and goes Home', () => {
  for (const [name, src] of [['shared group', sharedGroup], ['shared roshetta', sharedRoshetta]]) {
    assert.doesNotMatch(src, /navigate\(ROUTES\.DRUGS\b/, `${name} no longer sends people to Drugs`)
    assert.match(src, /ROUTES\.HOME/, `${name} goes Home`)
    assert.doesNotMatch(src, /Back to Drugs/, `${name} arrow no longer names Drugs`)
  }
})

test('K15: a roshetta or group saved from a shared page opens through the guard; drugs keep the page behind', () => {
  assert.match(sharedGroup, /openPage\(ROUTES\.DRUGS_GROUP\(saveState\.groupId\)\)/)
  assert.match(sharedRoshetta, /openPage\(ROUTES\.ROSHETTA\(saveState\.roshettaId\)\)/)
  // A drug is a plain push, never a replace, so Back returns to the shared page.
  assert.doesNotMatch(sharedGroup, /openDrug\([^)]*replace/)
})

test('doors inside a topic (links in text, the class sheet, the sheet drug links) use the guard', () => {
  assert.match(freeText, /useTapGuard/)
  assert.doesNotMatch(freeText, /realNavigate\(/)
  assert.match(sheetBlock, /useTapGuard/)
  assert.doesNotMatch(sheetBlock, /navigate\(`\/drugs\//)
})
