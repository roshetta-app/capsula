import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DETAILS_COLUMNS, PUBLIC_KEYS, PROFILE_SELECT, classifyProfileError, pickDetails, saveDetails,
  cleanPublicFields, previewPublic, savePublicCard, removePublicCard, fetchProfile, setupState,
  mergeWaiting, hasWaiting, applyWaiting, localProfileStore, saveDetailsOrWait, savePublicCardOrWait,
  sendWaiting, OFFLINE_MESSAGE,
} from './profileData.js'
import { MESSAGES } from './profileRules.js'

// A fake database client. `script` decides each answer; every call is recorded.
function fakeClient(script = {}) {
  const calls = []
  const answer = (name, arg) => {
    calls.push({ name, arg })
    const a = typeof script[name] === 'function' ? script[name](arg, calls.length) : script[name]
    return a ?? { data: null, error: null, status: 200 }
  }
  return {
    calls,
    from(table) {
      return {
        select(cols) { return { eq: (_c, id) => ({ single: async () => answer('select', { table, cols, id }) }) } },
        update(row) { return { eq: async (_c, id) => answer('update', { table, row, id }) } },
      }
    },
    rpc: async (fn, args) => answer(`rpc:${fn}`, args),
  }
}
const memStore = () => {
  const data = new Map()
  return { data, read: (u) => data.get(u) ?? null, write: (u, r) => { r ? data.set(u, r) : data.delete(u); return true } }
}
const OFFLINE = { data: null, error: new Error('TypeError: Failed to fetch'), status: 0 }
const refusal = (code) => ({ data: null, error: { message: code, code: 'P0001' }, status: 400 })

test('the 14 allowed columns and the 5 public keys are exactly the database ones', () => {
  assert.equal(DETAILS_COLUMNS.length, 14)
  assert.deepEqual([...DETAILS_COLUMNS].sort(), [
    'country', 'full_name', 'gender', 'governorate', 'marketing_opt_in', 'occupation', 'occupation_other',
    'phone_country_code', 'phone_number', 'profile_setup_dismissed', 'share_name_default', 'specialty',
    'student_type', 'theme_preference',
  ])
  assert.deepEqual(PUBLIC_KEYS, ['name', 'handle', 'bio', 'avatar_code', 'handle_forwarding'])
  for (const c of ['handle', 'bio', 'avatar_code', 'role', 'tier']) assert.ok(!DETAILS_COLUMNS.includes(c))
  assert.ok(PROFILE_SELECT.includes('handle') && PROFILE_SELECT.includes('avatar_code') && PROFILE_SELECT.includes('full_name'))
  assert.ok(!PROFILE_SELECT.includes('role') && !PROFILE_SELECT.includes('tier'))
})

test('errors are sorted into retry and refused; every database code is understood', () => {
  assert.equal(classifyProfileError(null).kind, 'ok')
  assert.deepEqual(classifyProfileError(new Error('Failed to fetch'), 0), { kind: 'retry', code: 'offline' })
  assert.deepEqual(classifyProfileError({ code: 'request_timeout' }), { kind: 'retry', code: 'offline' })
  assert.deepEqual(classifyProfileError({ message: 'x' }, 503), { kind: 'retry', code: 'offline' })
  assert.deepEqual(classifyProfileError({ message: 'JWT expired' }, 401), { kind: 'retry', code: 'not_signed_in' })
  assert.deepEqual(classifyProfileError({ message: 'not_signed_in' }), { kind: 'retry', code: 'not_signed_in' })
  const dbCodes = ['name_length', 'name_chars', 'name_web', 'name_phone', 'name_blocked', 'name_required', 'bio_length', 'bio_chars',
    'bio_web', 'bio_phone', 'handle_format', 'handle_reserved', 'handle_blocked', 'handle_taken', 'handle_too_soon', 'removed_wait', 'avatar_unknown']
  for (const code of dbCodes) {
    assert.deepEqual(classifyProfileError({ message: code }, 400), { kind: 'refused', code })
    assert.ok(MESSAGES[code])
  }
  assert.deepEqual(classifyProfileError({ message: 'something odd' }, 400), { kind: 'refused', code: 'error' })
})

test('a details save carries only the 14 allowed columns and never a public or guarded one', async () => {
  const picked = pickDetails({
    full_name: '  Sara   Ali ', country: ' Egypt ', handle: 'sara', bio: 'hi', avatar_code: 'heart-rose', role: 'admin', tier: 'pro',
    marketing_opt_in_at: '2026-01-01', specialty: '',
  })
  assert.deepEqual(picked, { full_name: 'Sara Ali', country: 'Egypt', specialty: '' })

  const db = fakeClient()
  const res = await saveDetails(db, 'u1', { full_name: 'Sara', handle: 'sara', role: 'admin' })
  assert.deepEqual(res, { ok: true, saved: { full_name: 'Sara' } })
  assert.deepEqual(db.calls, [{ name: 'update', arg: { table: 'profiles', row: { full_name: 'Sara' }, id: 'u1' } }])

  const none = fakeClient()
  assert.deepEqual(await saveDetails(none, 'u1', { handle: 'sara' }), { ok: true, saved: {} })
  assert.equal(none.calls.length, 0) // nothing allowed in it: nothing sent
})

test('details save: the name rules apply only once there is a username', async () => {
  const db = fakeClient()
  assert.equal((await saveDetails(db, 'u1', { full_name: 'Sara www.x.com' }, { hasHandle: false })).ok, true)
  const refused = await saveDetails(db, 'u1', { full_name: 'Sara www.x.com' }, { hasHandle: true })
  assert.equal(refused.ok, false)
  assert.equal(refused.kind, 'refused')
  assert.equal(refused.code, 'name_web')
  assert.equal(refused.field, 'full_name')
  assert.equal(db.calls.length, 1) // the refused one was never sent
  const db2 = fakeClient({ update: () => refusal('name_blocked') })
  const blocked = await saveDetails(db2, 'u1', { full_name: 'Sara Ali' }, { hasHandle: true })
  assert.deepEqual([blocked.ok, blocked.kind, blocked.code], [false, 'refused', 'name_blocked'])
  assert.equal(blocked.message, MESSAGES.name_blocked)
})

test('a details save that cannot reach the server says retry, with the plain offline wording', async () => {
  const res = await saveDetails(fakeClient({ update: OFFLINE }), 'u1', { country: 'Egypt' })
  assert.deepEqual([res.ok, res.kind, res.code, res.message], [false, 'retry', 'offline', OFFLINE_MESSAGE])
  const guest = await saveDetails(fakeClient(), null, { country: 'Egypt' })
  assert.equal(guest.kind, 'retry')
  assert.equal(guest.code, 'not_signed_in')
  const thrown = await saveDetails(fakeClient({ update: () => { throw new Error('Failed to fetch') } }), 'u1', { country: 'x' })
  assert.equal(thrown.kind, 'retry')
})

test('public fields are cleaned and limited to the five keys', () => {
  assert.deepEqual(cleanPublicFields({
    name: '  Sara   Ali ', handle: 'Sara  Ali', bio: '  Pharmacist  ', avatar_code: '', handle_forwarding: 1,
    full_name: 'x', phone_number: '123', role: 'admin',
  }), { name: 'Sara Ali', handle: 'sara-ali', bio: 'Pharmacist', avatar_code: null, handle_forwarding: true })
  assert.deepEqual(cleanPublicFields({ avatar_code: 'heart-rose' }), { avatar_code: 'heart-rose' })
  assert.deepEqual(cleanPublicFields(null), {})
})

test('preview gives the same codes the database gives', () => {
  assert.deepEqual(previewPublic({ handle: 'sara-ali' }, { currentName: 'Sara Ali' }), { ok: true, cleaned: { handle: 'sara-ali' }, problems: {} })
  assert.equal(previewPublic({ handle: 'sara-ali' }, { currentName: '' }).problems.name, 'name_required')
  assert.equal(previewPublic({ handle: 'sara-ali', name: 'Sara Ali' }).ok, true)
  assert.equal(previewPublic({ handle: 'a' }, { currentName: 'Sara' }).problems.handle, 'handle_format')
  assert.equal(previewPublic({ handle: 'settings' }, { currentName: 'Sara' }).problems.handle, 'handle_reserved')
  assert.equal(previewPublic({ handle: 'سارة' }, { currentName: 'سارة' }).problems.handle, 'handle_format')
  assert.equal(previewPublic({ name: 'S' }).problems.name, 'name_length')
  assert.equal(previewPublic({ name: '' }).problems.name, 'name_required')
  assert.equal(previewPublic({ name: 'Sara call 01012345678' }).problems.name, 'name_phone')
  assert.equal(previewPublic({ bio: 'see www.site.com' }).problems.bio, 'bio_web')
  assert.equal(previewPublic({ bio: 'x'.repeat(161) }).problems.bio, 'bio_length')
  assert.equal(previewPublic({ bio: '' }).ok, true) // an empty bio clears it
  assert.equal(previewPublic({ avatar_code: null }).ok, true) // initials
})

test('public save sends only the cleaned public keys through the checked function', async () => {
  const db = fakeClient({ 'rpc:save_public_profile': { data: { handle: 'sara-ali', bio: null }, error: null, status: 200 } })
  const res = await savePublicCard(db, { handle: 'Sara Ali', bio: 'Hello', phone_number: '0100', full_name: 'x' }, { currentName: 'Sara Ali' })
  assert.deepEqual(res, { ok: true, saved: { handle: 'sara-ali', bio: null } })
  assert.deepEqual(db.calls, [{ name: 'rpc:save_public_profile', arg: { p: { handle: 'sara-ali', bio: 'Hello' } } }])
  assert.equal(db.calls.some((c) => c.name === 'update'), false) // never a direct update

  const empty = fakeClient()
  assert.deepEqual(await savePublicCard(empty, { phone_number: '0100' }), { ok: true, saved: {} })
  assert.equal(empty.calls.length, 0)
})

test('public save: local refusals name the field and are never sent; database refusals come back with their wording', async () => {
  const db = fakeClient()
  const local = await savePublicCard(db, { handle: 'settings' }, { currentName: 'Sara' })
  assert.deepEqual([local.kind, local.code, local.field, local.message], ['refused', 'handle_reserved', 'handle', MESSAGES.handle_reserved])
  assert.equal((await savePublicCard(db, { handle: 'sara-ali' })).code, 'name_required')
  assert.equal((await savePublicCard(db, { avatar_code: 'not-in-list' })).code, 'avatar_unknown')
  assert.equal(db.calls.length, 0)

  for (const code of ['handle_taken', 'handle_blocked', 'handle_too_soon', 'removed_wait', 'name_blocked', 'avatar_unknown']) {
    const res = await savePublicCard(fakeClient({ 'rpc:save_public_profile': refusal(code) }), { handle: 'sara-ali' }, { currentName: 'Sara' })
    assert.deepEqual([res.ok, res.kind, res.code, res.message], [false, 'refused', code, MESSAGES[code]])
  }
  const off = await savePublicCard(fakeClient({ 'rpc:save_public_profile': OFFLINE }), { bio: 'Hi' })
  assert.deepEqual([off.kind, off.code], ['retry', 'offline'])
})

test('remove public profile and read own row', async () => {
  assert.deepEqual(await removePublicCard(fakeClient()), { ok: true })
  assert.equal((await removePublicCard(fakeClient({ 'rpc:remove_public_profile': OFFLINE }))).kind, 'retry')
  const db = fakeClient({ select: { data: { full_name: 'Sara', handle: null }, error: null, status: 200 } })
  assert.deepEqual(await fetchProfile(db, 'u1'), { ok: true, profile: { full_name: 'Sara', handle: null } })
  assert.deepEqual(db.calls[0], { name: 'select', arg: { table: 'profiles', cols: PROFILE_SELECT, id: 'u1' } })
  assert.equal((await fetchProfile(fakeClient({ select: OFFLINE }), 'u1')).kind, 'retry')
  assert.equal((await fetchProfile(fakeClient(), null)).code, 'not_signed_in')
})

test('setup state: ONE card at a time, worked out from filled-in data, never from the skipped flag', () => {
  const full = { full_name: 'Sara Ali', occupation: 'Pharmacist', country: 'Egypt' }
  let s = setupState({ ...full, full_name: '', profile_setup_dismissed: true })
  assert.deepEqual([s.next, s.needsName, s.publicSetUp], ['details', true, false])
  assert.deepEqual(s.detailsMissing, ['full_name'])
  assert.deepEqual(s.suggestions, [])

  s = setupState({ ...full, profile_setup_dismissed: false })
  assert.deepEqual([s.next, s.needsName, s.name, s.publicSetUp], ['public', false, 'Sara Ali', false])
  assert.deepEqual(s.suggestions, ['sara-ali'])
  assert.deepEqual(setupState(full, { taken: ['sara-ali'] }).suggestions, ['sara-ali-1', 'sara-ali-2'])

  s = setupState({ ...full, handle: 'sara-ali' })
  assert.deepEqual([s.next, s.publicSetUp], [null, true])

  // a physician with no specialty still has a details step; an Arabic name gets no suggestion
  assert.equal(setupState({ ...full, occupation: 'Specialist Physician' }).next, 'details')
  assert.deepEqual(setupState({ ...full, full_name: 'سارة علي' }).suggestions, [])

  // the 30-day numbers come through
  const now = Date.now()
  const day = 86400000
  assert.equal(setupState({ ...full, handle: 'sara-ali', handle_changed_at: new Date(now - 10 * day).toISOString() }).handleDaysLeft, 20)
  assert.equal(setupState({ ...full, public_removed_at: new Date(now - 5 * day).toISOString() }).removedWaitDaysLeft, 25)
})

test('waiting changes merge, latest value wins, and stay two separate parts', () => {
  let rec = null
  rec = mergeWaiting(rec, 'details', { country: 'Egypt', handle: 'nope' })
  rec = mergeWaiting(rec, 'details', { country: 'Jordan', gender: 'F' })
  rec = mergeWaiting(rec, 'public', { bio: 'a', phone_number: '01' })
  rec = mergeWaiting(rec, 'public', { bio: 'b', handle: 'Sara Ali' })
  assert.deepEqual(rec, { details: { country: 'Jordan', gender: 'F' }, public: { bio: 'b', handle: 'sara-ali' } })
  assert.equal(hasWaiting(rec), true)
  assert.equal(hasWaiting(null), false)
  assert.equal(mergeWaiting(null, 'details', { handle: 'x' }), null) // nothing allowed: nothing kept
  assert.equal(mergeWaiting(null, 'other', { a: 1 }), null)

  const shown = applyWaiting({ full_name: 'Sara', bio: 'old', country: 'Egypt' }, { details: { country: 'Jordan' }, public: { name: 'Sara A', bio: 'new' } })
  assert.deepEqual(shown, { full_name: 'Sara A', bio: 'new', country: 'Jordan' })
  assert.deepEqual(applyWaiting({ a: 1 }, null), { a: 1 })
})

test('offline: a change that cannot be sent waits; a refusal is not kept', async () => {
  const store = memStore()
  const off = fakeClient({ update: OFFLINE, 'rpc:save_public_profile': OFFLINE })
  assert.deepEqual(await saveDetailsOrWait(off, 'u1', { country: 'Egypt' }, { store }), { ok: true, waiting: true })
  assert.deepEqual(await savePublicCardOrWait(off, 'u1', { bio: 'Hi' }, { store, currentName: 'Sara' }), { ok: true, waiting: true })
  assert.deepEqual(store.data.get('u1'), { details: { country: 'Egypt' }, public: { bio: 'Hi' } })

  const refusedStore = memStore()
  const bad = await savePublicCardOrWait(fakeClient(), 'u2', { handle: 'settings' }, { store: refusedStore, currentName: 'Sara' })
  assert.equal(bad.kind, 'refused')
  assert.equal(refusedStore.data.size, 0)

  const online = memStore()
  assert.deepEqual(await saveDetailsOrWait(fakeClient(), 'u3', { country: 'Egypt' }, { store: online }), { ok: true, saved: { country: 'Egypt' } })
  assert.equal(online.data.size, 0)
})

test('reconnecting sends details first, then the public card, then clears the store', async () => {
  const store = memStore()
  store.write('u1', { details: { country: 'Jordan' }, public: { handle: 'sara-ali' } })
  const db = fakeClient()
  const res = await sendWaiting(db, 'u1', { store, currentName: 'Sara Ali' })
  assert.deepEqual(res, { sent: ['details', 'public'], refused: [], waiting: false })
  assert.deepEqual(db.calls.map((c) => c.name), ['update', 'rpc:save_public_profile'])
  assert.equal(store.data.size, 0)
  assert.deepEqual(await sendWaiting(db, 'u1', { store }), { sent: [], refused: [], waiting: false }) // nothing waiting, nothing sent
  assert.equal(db.calls.length, 2)
})

test('still offline on reconnect: nothing lost; a refusal is returned and dropped, the rest carries on', async () => {
  const store = memStore()
  store.write('u1', { details: { country: 'Jordan' }, public: { bio: 'Hi' } })
  const still = await sendWaiting(fakeClient({ update: OFFLINE }), 'u1', { store })
  assert.deepEqual(still, { sent: [], refused: [], waiting: true })
  assert.deepEqual(store.data.get('u1'), { details: { country: 'Jordan' }, public: { bio: 'Hi' } })

  // details go through, then the public part hits a connection drop: only the public part stays
  const partial = await sendWaiting(fakeClient({ 'rpc:save_public_profile': OFFLINE }), 'u1', { store })
  assert.deepEqual([partial.sent, partial.waiting], [['details'], true])
  assert.deepEqual(store.data.get('u1'), { details: {}, public: { bio: 'Hi' } })

  // the username was taken meanwhile: the person is told, the bad change is not kept
  const store2 = memStore()
  store2.write('u2', { details: {}, public: { handle: 'sara-ali' } })
  const taken = await sendWaiting(fakeClient({ 'rpc:save_public_profile': refusal('handle_taken') }), 'u2', { store: store2, currentName: 'Sara' })
  assert.equal(taken.refused.length, 1)
  assert.deepEqual([taken.refused[0].part, taken.refused[0].code, taken.refused[0].message], ['public', 'handle_taken', MESSAGES.handle_taken])
  assert.deepEqual(taken.sent, [])
  assert.equal(store2.data.size, 0)
})

test('the local store keeps one small record per person and survives broken storage', () => {
  const mem = new Map()
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) }
  const store = localProfileStore(storage)
  assert.equal(store.read('u1'), null)
  assert.equal(store.write('u1', { details: { country: 'Egypt' }, public: {} }), true)
  assert.deepEqual(store.read('u1'), { details: { country: 'Egypt' }, public: {} })
  assert.equal(store.read('u2'), null) // another person sees nothing
  store.write('u1', null)
  assert.equal(store.read('u1'), null)
  mem.set('capsula.profileWaiting:u3', '{not json')
  assert.equal(store.read('u3'), null)
  const broken = localProfileStore({ getItem() { throw new Error('no') }, setItem() { throw new Error('no') }, removeItem() { throw new Error('no') } })
  assert.equal(broken.read('u1'), null)
  assert.equal(broken.write('u1', { details: {}, public: {} }), false)
  assert.equal(localProfileStore(null).read('u1'), null)
})
