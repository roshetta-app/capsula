// Checks for utils/editProfile.js (step 14.7c-1): the rules of the one Edit screen.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  valuesFromRow, applyChange, visibleFields, detailsProblems, detailsPayload, publicPayload, publicProblems,
  fieldForPublicRefusal, hasChanges, groupFromState, hasHandle, WELCOME_FIELDS, NOT_PUBLIC_LINE,
} from './editProfile.js'

const row = {
  full_name: 'Omar Hassan', occupation: 'Pharmacist', country: 'Egypt', gender: 'male',
  phone_country_code: '+20', phone_number: '1012345678', handle: 'omar-rx', bio: 'Pharmacy notes',
  avatar_code: null, handle_forwarding: true, handle_changed_at: null,
}

test('values come from the row; missing and unknown things become empty, never crash', () => {
  const v = valuesFromRow(row)
  assert.equal(v.fullName, 'Omar Hassan')
  assert.equal(v.handle, 'omar-rx')
  assert.equal(v.avatarCode, null)
  const empty = valuesFromRow(null)
  assert.equal(empty.fullName, '')
  assert.equal(empty.avatarCode, null)
  assert.equal(valuesFromRow({ avatar_code: 'not-a-code' }).avatarCode, null)
})

test('a new occupation clears the fields that no longer apply', () => {
  let v = { ...valuesFromRow(row), occupation: 'Specialist Physician', specialty: 'Cardiology' }
  v = applyChange(v, 'occupation', 'Pharmacist')
  assert.equal(v.specialty, '')
  v = applyChange({ ...v, occupation: 'Medical Student', studentType: 'Medical student' }, 'occupation', 'Other')
  assert.equal(v.studentType, '')
  v = applyChange({ ...v, occupationOther: 'Physio' }, 'occupation', 'Nurse')
  assert.equal(v.occupationOther, '')
  const keep = applyChange({ ...v, occupation: 'Specialist Physician', specialty: 'Cardiology' }, 'occupation', 'Senior Resident Physician')
  assert.equal(keep.specialty, 'Cardiology')
})

test('picking a phone code fills the country, as the wizard did', () => {
  const v = applyChange({ ...valuesFromRow(row), country: '' }, 'phoneCountryCode', '+20')
  assert.equal(v.country, 'Egypt')
})

test('welcome shows only name, occupation (+ specialty) and country; the public group and phone are hidden', () => {
  const physician = { ...valuesFromRow(row), occupation: 'Specialist Physician' }
  const f = visibleFields(physician, { welcome: true })
  assert.equal(f.specialty, true)
  assert.equal(f.phone, false)
  assert.equal(f.gender, false)
  assert.equal(f.publicGroup, false)
  assert.equal(visibleFields(valuesFromRow(row), { welcome: false }).publicGroup, true)
  assert.deepEqual(WELCOME_FIELDS.includes('phone'), false)
})

test('phone is optional: no number is fine; a number needs a code and must be valid for it', () => {
  const base = { ...valuesFromRow(row), phoneCountryCode: '', phoneNumber: '' }
  assert.deepEqual(detailsProblems(base), {})
  assert.ok(detailsProblems({ ...base, phoneNumber: '1012345678' }).phone)
  assert.ok(detailsProblems({ ...base, phoneCountryCode: '+20', phoneNumber: '123' }).phone)
  assert.deepEqual(detailsProblems({ ...base, phoneCountryCode: '+20', phoneNumber: '1012345678' }), {})
})

test('name, occupation and country are required; specialty only for physicians; Other needs its text', () => {
  const none = detailsProblems({ ...valuesFromRow(null) })
  assert.ok(none.fullName && none.occupation && none.country)
  assert.equal(none.specialty, undefined)
  const doc = detailsProblems({ ...valuesFromRow(row), occupation: 'Specialist Physician', specialty: '' })
  assert.ok(doc.specialty)
  const other = detailsProblems({ ...valuesFromRow(row), occupation: 'Other', occupationOther: ' ' })
  assert.ok(other.occupationOther)
})

test('welcome ignores phone completely, even a half-typed one', () => {
  const v = { ...valuesFromRow(row), phoneCountryCode: '', phoneNumber: '12' }
  assert.deepEqual(detailsProblems(v, { welcome: true }), {})
})

test('details payload: snake_case, ends the welcome, name only without a username, phone cleared together', () => {
  const withHandle = detailsPayload(valuesFromRow(row))
  assert.equal(withHandle.profile_setup_dismissed, true)
  assert.equal('full_name' in withHandle, false)
  assert.equal(withHandle.phone_number, '1012345678')
  const noHandle = detailsPayload({ ...valuesFromRow({ ...row, handle: null }), phoneNumber: '', phoneCountryCode: '+20' })
  assert.equal(noHandle.full_name, 'Omar Hassan')
  assert.equal(noHandle.phone_number, '')
  assert.equal(noHandle.phone_country_code, '')
  const welcome = detailsPayload(valuesFromRow({ ...row, handle: null }), { welcome: true })
  assert.equal('phone_number' in welcome, false)
  assert.equal('gender' in welcome, false)
  assert.equal(welcome.profile_setup_dismissed, true)
})

test('only fields of this screen can be in the details payload (never handle, bio, avatar or tier)', () => {
  const keys = Object.keys(detailsPayload(valuesFromRow(row)))
  for (const bad of ['handle', 'bio', 'avatar_code', 'tier', 'role', 'handle_forwarding']) assert.equal(keys.includes(bad), false)
})

test('public payload: only what changed; nothing changed gives null; no username gives null', () => {
  const saved = valuesFromRow(row)
  assert.equal(publicPayload(saved, saved), null)
  assert.deepEqual(publicPayload({ ...saved, bio: 'New bio' }, saved), { bio: 'New bio' })
  assert.deepEqual(publicPayload({ ...saved, avatarCode: 'leaf', handleForwarding: false }, saved), { avatar_code: 'leaf', handle_forwarding: false })
  assert.deepEqual(publicPayload({ ...saved, bio: '' }, saved), { bio: '' })
  const noHandle = valuesFromRow({ ...row, handle: null })
  assert.equal(publicPayload({ ...noHandle, fullName: 'Someone' }, noHandle), null)
  assert.equal(hasHandle(noHandle), false)
})

test('the username does not go out inside the 30-day pause, and goes out after it', () => {
  const saved = valuesFromRow(row)
  const now = Date.parse('2026-11-22T12:00:00Z')
  const recent = { ...row, handle_changed_at: '2026-11-10T12:00:00Z' }
  assert.equal(publicPayload({ ...saved, handle: 'new-name' }, saved, { now, savedRow: recent }), null)
  const old = { ...row, handle_changed_at: '2026-09-01T12:00:00Z' }
  assert.deepEqual(publicPayload({ ...saved, handle: 'new-name' }, saved, { now, savedRow: old }), { handle: 'new-name' })
})

test('a name change with a username goes to the public path with the one name', () => {
  const saved = valuesFromRow(row)
  assert.deepEqual(publicPayload({ ...saved, fullName: 'Dr Omar' }, saved), { name: 'Dr Omar' })
})

test('public problems: a web address in the bio or a bad username is caught while typing', () => {
  const saved = valuesFromRow(row)
  assert.ok(publicProblems({ ...saved, bio: 'visit www.example.com' }, saved).bio)
  assert.ok(publicProblems({ ...saved, handle: 'ab' }, saved).handle)
  assert.deepEqual(publicProblems({ ...saved, bio: 'Fine' }, saved), {})
})

test('a refused save is shown under its own field', () => {
  assert.equal(fieldForPublicRefusal({ code: 'handle_taken' }), 'handle')
  assert.equal(fieldForPublicRefusal({ code: 'name_blocked' }), 'name')
  assert.equal(fieldForPublicRefusal({ field: 'bio' }), 'bio')
  assert.equal(fieldForPublicRefusal({ code: 'avatar_unknown' }), 'avatar')
  assert.equal(fieldForPublicRefusal({ code: 'error' }), 'general')
})

test('changes are compared as a whole; entry state names a group or nothing', () => {
  const saved = valuesFromRow(row)
  assert.equal(hasChanges(saved, saved), false)
  assert.equal(hasChanges({ ...saved, bio: 'x' }, saved), true)
  assert.equal(groupFromState({ group: 'details' }), 'details')
  assert.equal(groupFromState({ group: 'public' }), 'public')
  assert.equal(groupFromState({ openWizard: true }), null)
  assert.equal(groupFromState(null), null)
})

test('the wording line the plan decided on is exactly this', () => {
  assert.equal(NOT_PUBLIC_LINE, 'Not shown on your public profile')
})

test('details counted as saved after a public refusal: name only when it went with the details', async () => {
  const { mergeDetails } = await import('./editProfile.js')
  const saved = valuesFromRow(row)
  const typed = { ...saved, country: 'Jordan', fullName: 'Dr Omar', bio: 'x' }
  const merged = mergeDetails(saved, typed)
  assert.equal(merged.country, 'Jordan')
  assert.equal(merged.fullName, 'Omar Hassan')   // has a username: the name goes the public way
  assert.equal(merged.bio, saved.bio)
  const noHandle = valuesFromRow({ ...row, handle: null })
  assert.equal(mergeDetails(noHandle, { ...noHandle, fullName: 'New' }).fullName, 'New')
})
