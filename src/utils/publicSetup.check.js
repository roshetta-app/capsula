// Checks for publicSetup.js (step 14.5b). Run with: node --test src/utils/publicSetup.check.js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  startForm, buildFields, formProblems, canSubmit, visibleSuggestions, fieldForRefusal,
  refusalOpensName, takenHandle, savedCard, SETUP_TITLE, NAME_HELP, WAITING_MESSAGE,
} from './publicSetup.js'
import { AVATAR_CODES, MESSAGES } from './profileRules.js'

const LATIN = { full_name: 'Sara Ahmed', handle: null, bio: null, avatar_code: null, public_removed_at: null }

test('start: a name that is there is shown as a line, an empty one is asked once', () => {
  const a = startForm(LATIN)
  assert.equal(a.editName, false)
  assert.equal(a.name, 'Sara Ahmed')
  assert.equal(a.done, false)
  assert.equal(a.handle, '')
  const b = startForm({ ...LATIN, full_name: '' })
  assert.equal(b.editName, true)
  const c = startForm({ ...LATIN, full_name: null })
  assert.equal(c.editName, true)
})

test('start: a name that already breaks a rule is asked for again', () => {
  assert.equal(startForm({ ...LATIN, full_name: 'Sara 😀' }).editName, true)
  assert.equal(startForm({ ...LATIN, full_name: 'sara.com/shop' }).editName, true)
  assert.equal(startForm({ ...LATIN, full_name: 'S' }).editName, true)
  assert.equal(startForm({ ...LATIN, full_name: 'سارة أحمد' }).editName, false)
})

test('start: an existing username means nothing to ask; the 30-day pause is carried', () => {
  assert.equal(startForm({ ...LATIN, handle: 'sara-ahmed' }).done, true)
  assert.equal(startForm({ ...LATIN, handle: 'sara-ahmed' }).handle, 'sara-ahmed')
  const recent = new Date(Date.now() - 2 * 86400000).toISOString()
  assert.ok(startForm({ ...LATIN, public_removed_at: recent }).waitDays > 0)
  assert.equal(startForm(LATIN).waitDays, 0)
})

test('start: only a known avatar code is kept; anything else means initials', () => {
  assert.equal(startForm({ ...LATIN, avatar_code: AVATAR_CODES[0] }).avatarCode, AVATAR_CODES[0])
  assert.equal(startForm({ ...LATIN, avatar_code: 'old-code' }).avatarCode, null)
  assert.equal(startForm(LATIN).avatarCode, null)
})

test('fields sent: only the four public keys, typing cleaned, empty bio left out, avatar always sent', () => {
  const f = buildFields({ name: '  Sara   Ahmed ', handle: ' Sara Ahmed ', bio: '', avatarCode: null })
  assert.deepEqual(Object.keys(f).sort(), ['avatar_code', 'handle', 'name'])
  assert.equal(f.name, 'Sara Ahmed')
  assert.equal(f.handle, 'sara-ahmed')
  assert.equal(f.avatar_code, null)
  const g = buildFields({ name: 'Sara', handle: 'sara', bio: ' Pharmacist in Cairo ', avatarCode: 'heart-rose' })
  assert.equal(g.bio, 'Pharmacist in Cairo')
  assert.equal(g.avatar_code, 'heart-rose')
  assert.equal(buildFields({ name: 'Sara', handle: 'sara', avatarCode: 'not-a-code' }).avatar_code, null)
  for (const k of Object.keys(g)) assert.ok(['name', 'handle', 'bio', 'avatar_code', 'handle_forwarding'].includes(k))
})

test('typing help: Arabic digits and capitals in the username are fixed quietly', () => {
  assert.equal(buildFields({ name: 'Sara', handle: 'Sara-٢٣' }).handle, 'sara-23')
})

test('problems: an empty field shows nothing, a wrong one shows the short wording', () => {
  assert.deepEqual(formProblems({ name: '', handle: '', bio: '' }), {})
  assert.equal(formProblems({ name: 'Sara', handle: 'ab' }).handle, MESSAGES.handle_format)
  assert.equal(formProblems({ name: 'Sara', handle: 'settings' }).handle, MESSAGES.handle_reserved)
  assert.equal(formProblems({ name: 'Sara 😀', handle: 'sara' }).name, MESSAGES.name_chars)
  assert.equal(formProblems({ name: 'call 01012345678', handle: 'sara' }).name, MESSAGES.name_phone)
  assert.equal(formProblems({ name: 'Sara', handle: 'sara', bio: 'x'.repeat(161) }).bio, MESSAGES.bio_length)
  assert.equal(formProblems({ name: 'Sara', handle: 'sara', bio: 'see t.me/abc' }).bio, MESSAGES.bio_web)
  assert.deepEqual(formProblems({ name: 'Sara', handle: 'sara', bio: 'Pharmacist' }), {})
})

test('button: needs a name and a username and nothing wrong', () => {
  assert.equal(canSubmit({ name: 'Sara', handle: 'sara' }), true)
  assert.equal(canSubmit({ name: '', handle: 'sara' }), false)
  assert.equal(canSubmit({ name: 'Sara', handle: '' }), false)
  assert.equal(canSubmit({ name: 'Sara', handle: 'ab' }), false)
  assert.equal(canSubmit({ name: 'Sara', handle: 'sara', bio: 'x'.repeat(200) }), false)
  assert.equal(canSubmit({ name: 'سارة', handle: 'sara-ahmed' }), true)
})

test('suggestions: Latin names only, follow the name, skip taken ones and the one already typed', () => {
  assert.deepEqual(visibleSuggestions({ name: 'Sara Ahmed', handle: '' }), ['sara-ahmed'])
  assert.deepEqual(visibleSuggestions({ name: 'Sara Ahmed', handle: 'sara-ahmed' }), [])
  assert.deepEqual(visibleSuggestions({ name: 'سارة أحمد', handle: '' }), [])
  assert.deepEqual(visibleSuggestions({ name: 'Omar Ali', handle: '' }), ['omar-ali'])
  const moved = visibleSuggestions({ name: 'Sara Ahmed', handle: '' }, ['sara-ahmed'])
  assert.equal(moved.length, 2)
  assert.ok(moved.every((h) => h !== 'sara-ahmed' && /^sara-ahmed-\d+$/.test(h)))
})

test('refusals land under the right part of the sheet', () => {
  assert.equal(fieldForRefusal({ code: 'handle_taken' }), 'handle')
  assert.equal(fieldForRefusal({ code: 'handle_too_soon' }), 'handle')
  assert.equal(fieldForRefusal({ code: 'removed_wait' }), 'handle')
  assert.equal(fieldForRefusal({ code: 'name_blocked' }), 'name')
  assert.equal(fieldForRefusal({ code: 'name_required' }), 'name')
  assert.equal(fieldForRefusal({ code: 'bio_web' }), 'bio')
  assert.equal(fieldForRefusal({ code: 'avatar_unknown' }), 'avatar')
  assert.equal(fieldForRefusal({ code: 'x', field: 'bio' }), 'bio')
  assert.equal(fieldForRefusal({ code: 'error' }), 'general')
  assert.equal(fieldForRefusal(null), 'general')
  for (const code of Object.keys(MESSAGES)) {
    assert.ok(['name', 'bio', 'handle', 'avatar', 'general'].includes(fieldForRefusal({ code })))
  }
  assert.equal(refusalOpensName({ code: 'name_blocked' }), true)
  assert.equal(refusalOpensName({ code: 'handle_taken' }), false)
})

test('a taken username is remembered so the suggestions move on', () => {
  assert.equal(takenHandle({ code: 'handle_taken' }, { handle: 'Sara-Ahmed' }), 'sara-ahmed')
  assert.equal(takenHandle({ code: 'handle_format' }, { handle: 'sara' }), null)
})

test('after saving: what the share sheets get, from the answer or else from the form', () => {
  const form = { name: 'Sara Ahmed', handle: 'sara-ahmed', avatarCode: 'heart-rose' }
  assert.deepEqual(savedCard({ handle: 'sara-ahmed', name: 'Sara Ahmed', avatar_code: 'heart-rose' }, form),
    { handle: 'sara-ahmed', name: 'Sara Ahmed', avatarCode: 'heart-rose' })
  assert.deepEqual(savedCard({}, form), { handle: 'sara-ahmed', name: 'Sara Ahmed', avatarCode: 'heart-rose' })
  assert.deepEqual(savedCard({ avatar_code: null }, form), { handle: 'sara-ahmed', name: 'Sara Ahmed', avatarCode: null })
})

test('the fixed words', () => {
  assert.equal(SETUP_TITLE, 'Set up your public profile')
  assert.equal(NAME_HELP, 'Shown on your public profile. A nickname is fine.')
  assert.ok(WAITING_MESSAGE.startsWith('No connection.'))
})
