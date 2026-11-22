import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  AVATAR_CODES, isAvatarCode, flatten, cleanName, cleanHandle, nameIssue, bioIssue, handleIssue,
  webOrPhoneIssue, suggestHandles, suggestionBase, handleChangeDaysLeft, removedWaitDaysLeft,
  detailsMissing, detailsComplete, detailsProgress, publicCardSetUp, nextProfileCard,
  MESSAGES, GENERIC_ERROR, messageForCode, messageForError, handleMessage, nameMessage, itemTextMessage,
} from './profileRules.js'

// the list the database holds in avatar_codes (migration 14.1)
const DB_AVATARS = [
  'capsule-teal', 'stethoscope-blue', 'heart-rose', 'leaf-green', 'pill-amber', 'cross-red', 'drop-sky', 'star-violet',
  'syringe-indigo', 'flask-orange', 'shield-slate', 'sun-yellow', 'moon-navy', 'bandage-pink', 'bolt-lime', 'flower-coral',
]

test('avatar list equals the database list; unknown codes are refused', () => {
  assert.deepEqual(AVATAR_CODES, DB_AVATARS)
  assert.equal(new Set(AVATAR_CODES).size, 16)
  assert.ok(AVATAR_CODES.every(isAvatarCode))
  assert.equal(isAvatarCode('nope'), false)
  assert.equal(isAvatarCode(null), false)
  assert.equal(isAvatarCode(undefined), false)
})

test('flatten folds the same way as the database', () => {
  assert.equal(flatten('cap-sula'), 'capsula')
  assert.equal(flatten('capsu1a'), 'capsula')
  assert.equal(flatten('R0shetta'), 'roshetta')
  assert.equal(flatten('Official Sara'), 'officialsara')
  assert.equal(flatten('كبسولة'), 'كبسوله')
  assert.equal(flatten('أدمن'), 'ادمن')
  assert.equal(flatten('إدارة'), 'اداره')
  assert.equal(flatten('على'), 'علي')
  assert.equal(flatten('كَبسولة'), 'كبسوله')
  assert.equal(flatten('Zor-Ba Test'), 'zorbatest')
  assert.equal(flatten('Renée Çelik'), 'reneecelik')
  assert.equal(flatten('سارة ٠١'), 'ساره' + 'ol')
  assert.equal(flatten(null), '')
})

test('cleaning what people type', () => {
  assert.equal(cleanName('  Sara   Ahmed '), 'Sara Ahmed')
  assert.equal(cleanHandle('Sara Ahmed'), 'sara-ahmed')
  assert.equal(cleanHandle('SARA'), 'sara')
  assert.equal(cleanHandle('a  b'), 'a-b')
  assert.equal(cleanHandle('sara--x'), 'sara-x')
  assert.equal(cleanHandle('sara-'), 'sara-') // not trimmed while typing
  assert.equal(cleanHandle('sara٢٠'), 'sara20')
  assert.equal(cleanHandle('سارة'), 'سارة') // left alone; the message explains
})

test('name rules: same answers as the database test run', () => {
  assert.equal(nameIssue('Sara Ahmed'), null)
  assert.equal(nameIssue('Staff Nurse Sara'), null)
  assert.equal(nameIssue('Dr. Sara Ahmed'), null)
  assert.equal(nameIssue('سارة أحمد'), null)
  assert.equal(nameIssue('Nurse Zed 2'), null)
  assert.equal(nameIssue(''), null)
  assert.equal(nameIssue('S'), 'length')
  assert.equal(nameIssue('a'.repeat(41)), 'length')
  assert.equal(nameIssue('a'.repeat(40)), null)
  assert.equal(nameIssue('Sara 😀'), 'chars')
  assert.equal(nameIssue('sara@x'), 'chars')
  assert.equal(nameIssue('sara t.me'), 'web')
  assert.equal(nameIssue('visit sara.com'), 'web')
  assert.equal(nameIssue('Sara 01012345678'), 'phone')
  assert.equal(nameIssue('سارة ٠١٠١٢٣٤٥٦٧٨'), 'phone')
  assert.equal(nameIssue('Clinic 24 Cairo 2020'), null) // 6 digits: fine
  assert.equal(nameIssue('Dr.Sara'), null)
  assert.equal(nameIssue('Mr. Tony'), null)
})

test('bio rules: same answers as the database test run', () => {
  assert.equal(bioIssue('Pharmacist in Cairo'), null)
  assert.equal(bioIssue('Pharmacist, 12 years, 3 clinics!'), null)
  assert.equal(bioIssue(''), null)
  assert.equal(bioIssue('call 01012345678'), 'phone')
  assert.equal(bioIssue('visit www.x.com'), 'web')
  assert.equal(bioIssue('wa.me/201012345678'), 'web')
  assert.equal(bioIssue('http://x'), 'web')
  assert.equal(bioIssue('I love 😀'), 'chars')
  assert.equal(bioIssue('a'.repeat(160)), null)
  assert.equal(bioIssue('a'.repeat(161)), 'length')
  assert.equal(bioIssue('صيدلانية في القاهرة، مصر'), null)
})

test('item text: only the web and phone rules apply', () => {
  assert.equal(webOrPhoneIssue('Hypertension plan 😀 ✓'), null)
  assert.equal(webOrPhoneIssue('Take 2 tablets, 3 times, 7 days'), null)
  assert.equal(webOrPhoneIssue('see example.com'), 'web')
  assert.equal(webOrPhoneIssue('call 0101 234 5678'), 'phone')
  assert.equal(webOrPhoneIssue(null), null)
  assert.equal(itemTextMessage('web'), 'Remove the web address or phone number.')
  assert.equal(itemTextMessage(null), null)
})

test('username rules: format and reserved; blocked words are the database only', () => {
  for (const h of ['AB', 'ab', '-abc', 'abc-', 'a--bc', 'sara ahmed', 'سارة-أحمد', 'a'.repeat(31)]) {
    assert.equal(handleIssue(h), 'format', h)
  }
  for (const h of ['settings', 'drugs', 'capsula']) assert.equal(handleIssue(h), 'reserved', h)
  for (const h of ['sara-ahmed', 'abc', 'a1b', 'a'.repeat(30), 'sara-2']) assert.equal(handleIssue(h), null, h)
  assert.equal(handleIssue('cap-sula'), null) // only the database knows capsula is blocked
})

test('suggestions come only from a Latin name', () => {
  assert.equal(suggestionBase('Sara Ahmed'), 'sara-ahmed')
  assert.equal(suggestionBase("Renée O'Brien"), 'renee-obrien')
  assert.equal(suggestionBase('Dr. Sara   Ahmed'), 'dr-sara-ahmed')
  assert.equal(suggestionBase('Sara-Ahmed'), 'sara-ahmed')
  assert.equal(suggestionBase('سارة أحمد'), null)
  assert.equal(suggestionBase('Sara سارة'), null)
  assert.equal(suggestionBase('Al'), null) // too short
  assert.equal(suggestionBase(''), null)
  assert.equal(suggestionBase(null), null)
  assert.equal(suggestionBase('Sara 2020'), 'sara-2020')
  const long = suggestionBase('Abdelrahman Mohamed Abdelmoneim Hassan')
  assert.ok(long.length <= 30 && !long.endsWith('-') && handleIssue(long) === null, long)
  assert.deepEqual(suggestHandles('Sara Ahmed'), ['sara-ahmed'])
  assert.deepEqual(suggestHandles('سارة'), [])
})

test('suggestions: two free variants when the first is taken', () => {
  assert.deepEqual(suggestHandles('Sara Ahmed', ['sara-ahmed']), ['sara-ahmed-1', 'sara-ahmed-2'])
  assert.deepEqual(suggestHandles('Sara Ahmed', new Set(['sara-ahmed', 'sara-ahmed-1'])), ['sara-ahmed-2', 'sara-ahmed-3'])
  const long = 'abdelrahman-mohamed-abdelmoneim'.slice(0, 30)
  const out = suggestHandles('Abdelrahman Mohamed Abdelmoneim Hassan', [suggestionBase('Abdelrahman Mohamed Abdelmoneim Hassan')])
  assert.equal(out.length, 2)
  for (const h of out) assert.ok(h.length <= 30 && handleIssue(h) === null, h)
  assert.ok(long.length > 0)
  // a reserved base is never suggested
  assert.deepEqual(suggestHandles('Settings', []), ['settings-1', 'settings-2'])
})

test('30-day limits', () => {
  const now = Date.parse('2026-11-22T12:00:00Z')
  const day = 86400000
  assert.equal(handleChangeDaysLeft({ handle: null }, now), 0)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: null }, now), 0)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: new Date(now - 31 * day).toISOString() }, now), 0)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: new Date(now - 30 * day).toISOString() }, now), 0)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: new Date(now - 29 * day).toISOString() }, now), 1)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: new Date(now).toISOString() }, now), 30)
  assert.equal(handleChangeDaysLeft({ handle: 'abc', handle_changed_at: 'garbage' }, now), 0)
  assert.equal(removedWaitDaysLeft({ handle: null, public_removed_at: new Date(now - 10 * day).toISOString() }, now), 20)
  assert.equal(removedWaitDaysLeft({ handle: null, public_removed_at: new Date(now - 31 * day).toISOString() }, now), 0)
  assert.equal(removedWaitDaysLeft({ handle: null, public_removed_at: null }, now), 0)
  assert.equal(removedWaitDaysLeft({ handle: 'abc', public_removed_at: new Date(now).toISOString() }, now), 0)
})

test('all three physician values need a specialty; students and others do not', () => {
  const base = { full_name: 'Sara', country: 'Egypt' }
  for (const occupation of ['Specialist Physician', 'Junior Resident Physician', 'Senior Resident Physician']) {
    assert.deepEqual(detailsMissing({ ...base, occupation }), ['specialty'])
  }
  for (const occupation of ['Medical Student', 'Pharmacist', 'Other']) {
    assert.deepEqual(detailsMissing({ ...base, occupation }), [])
  }
})

test('details complete: name, occupation, country (+ specialty for physicians); phone never required', () => {
  const base = { full_name: 'Sara Ahmed', occupation: 'pharmacist', country: 'EG' }
  assert.equal(detailsComplete(base), true)
  assert.deepEqual(detailsMissing({}), ['full_name', 'occupation', 'country'])
  assert.deepEqual(detailsMissing({ ...base, full_name: '  ' }), ['full_name'])
  assert.deepEqual(detailsMissing({ ...base, occupation: 'Specialist Physician' }), ['specialty'])
  assert.equal(detailsComplete({ ...base, occupation: 'Specialist Physician', specialty: 'Cardiology' }), true)
  assert.equal(detailsComplete({ ...base, phone_number: null, gender: null, governorate: null }), true)
  assert.deepEqual(detailsProgress({}), { done: 0, total: 3 })
  assert.deepEqual(detailsProgress(base), { done: 3, total: 3 })
  assert.deepEqual(detailsProgress({ ...base, occupation: 'Specialist Physician' }), { done: 3, total: 4 })
  assert.equal(detailsComplete(null), false)
  assert.equal(detailsComplete(undefined), false)
})

test('public card is set up when a username exists, never from a skip flag', () => {
  assert.equal(publicCardSetUp({ handle: 'sara-ahmed' }), true)
  assert.equal(publicCardSetUp({ handle: null, profile_setup_dismissed: true }), false)
  assert.equal(publicCardSetUp({ handle: '' }), false)
  assert.equal(publicCardSetUp(null), false)
})

test('the Profile tab shows one card at a time: details first, then the public card', () => {
  const complete = { full_name: 'Sara Ahmed', occupation: 'pharmacist', country: 'EG' }
  assert.equal(nextProfileCard({ profile_setup_dismissed: true }), 'details')
  assert.equal(nextProfileCard(complete), 'public')
  assert.equal(nextProfileCard({ ...complete, handle: 'sara-ahmed' }), null)
  assert.equal(nextProfileCard({ handle: 'sara-ahmed' }), 'details') // handle alone does not finish details
})

test('messages: every database code has a short message, none names a blocked word', () => {
  const codes = ['name_length', 'name_chars', 'name_web', 'name_phone', 'name_blocked', 'name_required', 'bio_length', 'bio_chars',
    'bio_web', 'bio_phone', 'handle_format', 'handle_reserved', 'handle_blocked', 'handle_taken', 'handle_too_soon', 'removed_wait',
    'avatar_unknown', 'not_signed_in']
  for (const c of codes) {
    assert.ok(MESSAGES[c] && MESSAGES[c].length < 100, c)
    assert.doesNotMatch(MESSAGES[c].toLowerCase(), /capsula|roshetta|official|verified|admin|moderator/, c)
  }
  assert.equal(messageForCode('handle_taken'), 'That username is taken.')
  assert.equal(messageForCode('something_else'), GENERIC_ERROR)
  assert.equal(messageForCode(undefined), GENERIC_ERROR)
  assert.equal(messageForError({ message: 'name_blocked' }), MESSAGES.name_blocked)
  assert.equal(messageForError({ message: 'permission denied for table profiles' }), GENERIC_ERROR)
  assert.equal(messageForError(null), GENERIC_ERROR)
  assert.equal(handleMessage('format'), MESSAGES.handle_format)
  assert.equal(handleMessage(null), null)
  assert.equal(nameMessage('web'), 'Remove the web address or phone number.')
})

test('the file has no imports and never touches local storage', async () => {
  const { readFile } = await import('node:fs/promises')
  const src = await readFile(new URL('./profileRules.js', import.meta.url), 'utf8')
  assert.doesNotMatch(src, /^import /m)
  assert.doesNotMatch(src, /localStorage|sessionStorage|indexedDB/)
})
