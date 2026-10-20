/**
 * src/utils/groupSync.js
 *
 * 2026-10-20 (Drug groups plan, step 17.3): sends the waiting changes of a
 * person's groups (utils/groupChanges.js) to the server, one at a time, in
 * order. Plain functions: the database client and the time limit are handed in,
 * so everything here can be checked against a fake server.
 *
 * Safe to repeat: a change that was on its way when the app was killed is sent
 * again on reopen, so a repeat must never be an error:
 *   - a create or an add that already exists counts as done;
 *   - a remove or a delete of something that is not there counts as done.
 *
 * What the server can answer to one change (plan section 21.3):
 *   done     the server took it (or already had it)
 *   retry    no connection, no answer in time, not signed in right now, or a
 *            server hiccup: nothing is lost, the change stays and is tried later
 *   refused  the server said no. Step 17.4 settles each reason (plan section 21.3):
 *              name taken     saved again with a number ("ICU drips (2)"), the person is told
 *              group gone     deleted on another device: everything waiting for it is dropped
 *              group limit    the group cannot be made: everything waiting for it is dropped
 *              drug limit     that drug is not added; the group's other changes carry on
 *              plan lapsed    groups are read only: waiting changes are dropped (deletes still go)
 *              other error    the change is marked failed and not sent again until the person
 *                             taps Retry or Discard
 *            Nothing is dropped without an event that tells the person.
 */

const NAME_MAX = 40
const NAME_TRIES = 10

// "Name (2)", cut so it still fits the 40 character limit.
export function numberedName(base, n) {
  const suffix = ` (${n})`
  return String(base).slice(0, NAME_MAX - suffix.length).trimEnd() + suffix
}

import { markSending, removeChange, markFailed, nextToSend, dropGroup } from './groupChanges'

export const REFUSAL = {
  NAME_TAKEN: 'name_taken',
  GROUP_LIMIT: 'group_limit',
  DRUG_LIMIT: 'drug_limit',
  READ_ONLY: 'read_only',
  GROUP_GONE: 'group_gone',
  ERROR: 'error',
}

const NETWORK_WORDS = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/i

// Sorts one database answer into done / retry / refused.
// error: the Supabase error (or the timeout error); status: the HTTP status when known.
export function classifyError(error, status) {
  if (!error) return { kind: 'ok' }
  const code = String(error.code ?? '')
  const text = `${error.message ?? ''} ${error.details ?? ''}`

  if (code === 'request_timeout') return { kind: 'retry' }
  if (status === 0 || NETWORK_WORDS.test(text)) return { kind: 'retry' }
  if (status === 401 || code === 'PGRST301' || /jwt/i.test(text)) return { kind: 'retry' }
  if (typeof status === 'number' && status >= 500) return { kind: 'retry' }

  if (code === '23505') {
    if (text.includes('drug_groups_user_name_unique')) return { kind: 'refused', reason: REFUSAL.NAME_TAKEN }
    return { kind: 'exists' } // the same row is already there
  }
  if (text.includes('drug_group_items_limit_reached')) return { kind: 'refused', reason: REFUSAL.DRUG_LIMIT }
  if (text.includes('drug_group_limit_reached')) return { kind: 'refused', reason: REFUSAL.GROUP_LIMIT }
  if (code === '42501' || /row-level security/i.test(text)) return { kind: 'refused', reason: REFUSAL.READ_ONLY }
  if (code === '23503') {
    // A missing group is a refusal; a drug that no longer exists is skipped, not an error (plan 21.3).
    if (text.includes('group_id')) return { kind: 'refused', reason: REFUSAL.GROUP_GONE }
    return { kind: 'exists' }
  }
  return { kind: 'refused', reason: REFUSAL.ERROR }
}

function toResult(res) {
  const c = classifyError(res?.error, res?.status)
  if (c.kind === 'ok') return { status: 'done', counted: true }
  if (c.kind === 'exists') return { status: 'done', counted: false }
  if (c.kind === 'retry') return { status: 'retry' }
  return { status: 'refused', reason: c.reason }
}

// Sends ONE change. client: the Supabase client; limit: wraps a request in the
// time limit (always resolves with { data, error, status }).
// Returns { status: 'done', counted } | { status: 'retry' } | { status: 'refused', reason }.
// counted: true when the server newly took a create or an add (for analytics).
export async function sendChange(client, change, limit = x => x) {
  const { type, groupId, data = {} } = change
  try {
    switch (type) {
      case 'create': {
        const res = await limit(client.from('drug_groups').insert({
          id: groupId,
          name: data.name,
          description: data.description ?? '',
          color: data.color ?? 'blue',
          created_at: data.createdAt,
        }))
        return toResult(res)
      }
      case 'update': {
        const res = await limit(client.from('drug_groups').update(data).eq('id', groupId).select('id'))
        const out = toResult(res)
        // Nothing was changed because the group is not there (deleted on another device).
        if (out.status === 'done' && Array.isArray(res.data) && res.data.length === 0) {
          return { status: 'refused', reason: REFUSAL.GROUP_GONE }
        }
        return { ...out, counted: false }
      }
      case 'add_drug': {
        const res = await limit(client.from('drug_group_items').insert({ group_id: groupId, brand_id: data.brandId }))
        return toResult(res)
      }
      case 'remove_drug': {
        const res = await limit(client.from('drug_group_items').delete().eq('group_id', groupId).eq('brand_id', data.brandId))
        return { ...toResult(res), counted: false }
      }
      case 'delete': {
        const res = await limit(client.from('drug_groups').delete().eq('id', groupId))
        return { ...toResult(res), counted: false }
      }
      default:
        return { status: 'refused', reason: REFUSAL.ERROR }
    }
  } catch {
    return { status: 'retry' }
  }
}

// A refused change, settled by its reason. Returns the final outcome:
//   { status: 'done', counted, event? }   saved after all (renamed with a number)
//   { status: 'retry' }                   no answer: try later
//   { status: 'dropped', event }          this change is not saved; the rest carry on
//   { status: 'dropped_group', event }    everything waiting for the group is dropped
//   { status: 'read_only', event }        plan lapsed: waiting changes dropped, deletes kept
//   { status: 'failed', reason }          kept, marked failed, for Retry or Discard
async function settle(change, out, send, groupName) {
  const name = groupName(change.groupId) ?? change.data?.name ?? ''
  switch (out.reason) {
    case REFUSAL.NAME_TAKEN: {
      const base = change.data?.name
      if (!base || (change.type !== 'create' && change.type !== 'update')) break
      for (let n = 2; n < NAME_TRIES + 2; n += 1) {
        const to = numberedName(base, n)
        const again = await send({ ...change, data: { ...change.data, name: to } })
        if (again.status === 'done') {
          return { status: 'done', counted: again.counted, event: { kind: 'renamed', groupId: change.groupId, from: base, to } }
        }
        if (again.status === 'retry') return { status: 'retry' }
        if (again.reason !== REFUSAL.NAME_TAKEN) return { status: 'failed', reason: again.reason }
      }
      break
    }
    case REFUSAL.GROUP_GONE:
      return { status: 'dropped_group', event: { kind: 'group_gone', groupId: change.groupId, name } }
    case REFUSAL.GROUP_LIMIT:
      return { status: 'dropped_group', event: { kind: 'group_limit', groupId: change.groupId, name } }
    case REFUSAL.DRUG_LIMIT:
      return { status: 'dropped', event: { kind: 'drug_limit', groupId: change.groupId, name } }
    case REFUSAL.READ_ONLY:
      // Deleting is always allowed (decision 6); a refused delete is just a failed change.
      if (change.type === 'delete') break
      return { status: 'read_only', event: { kind: 'read_only' } }
    default:
      break
  }
  return { status: 'failed', reason: out.reason ?? REFUSAL.ERROR }
}

// Sends the waiting changes in order until none is left that can go.
//   getQueue  () => the list as it is now (read fresh every time, because the
//             person may add changes while sending)
//   update    async (fn) => puts fn(list) in place and saves it on the phone
//   send      async (change) => { status, reason?, counted? }  (see sendChange)
//   canRun    () => false when offline or signed out: sending stops at once
//   onSent    (change) => called once for a change the server newly took
//   groupName (groupId) => the group's name for the messages (optional)
// Returns { sent, failed, events, stopped }: events are the things the person
// has to be told about (see describeEvents); stopped is 'empty' (nothing left
// that can go), 'blocked' (offline or signed out) or 'retry' (no answer; try later).
export async function runSync({ getQueue, update, send, canRun, onSent, groupName = () => null }) {
  const result = { sent: 0, failed: 0, events: [], stopped: 'empty' }
  const clearMark = q => q.map(c => {
    if (!c.sending) return c
    const rest = { ...c }
    delete rest.sending
    return rest
  })
  for (let guard = 0; guard < 5000; guard += 1) {
    if (!canRun()) { result.stopped = 'blocked'; break }
    const change = nextToSend(getQueue())
    if (!change) break

    await update(q => markSending(q, change.id))
    let out = await send(change)
    if (out.status === 'refused') out = await settle(change, out, send, groupName)

    if (out.status === 'retry') {
      await update(clearMark)
      result.stopped = 'retry'
      break
    }
    if (out.status === 'done') {
      await update(q => removeChange(q, change.id))
      result.sent += 1
      if (out.event) result.events.push(out.event)
      if (out.counted && onSent) onSent(change)
      continue
    }
    if (out.status === 'dropped') {
      await update(q => removeChange(q, change.id))
      result.events.push(out.event)
      continue
    }
    if (out.status === 'dropped_group') {
      await update(q => dropGroup(q, change.groupId))
      result.events.push(out.event)
      continue
    }
    if (out.status === 'read_only') {
      await update(q => q.filter(c => c.type === 'delete' && !c.sending))
      result.events.push(out.event)
      continue
    }
    await update(q => markFailed(q, change.id, out.reason))
    result.failed += 1
  }
  return result
}

// Plain-words messages for what happened in one run (nothing technical).
// events from runSync, failed = how many changes stay failed. Returns
// { messages: string[], severe: boolean }. severe: something was NOT saved.
export function describeEvents(events = [], failed = 0) {
  const messages = []
  const by = kind => events.filter(e => e.kind === kind)
  const quote = t => `\u201c${t}\u201d`

  for (const e of by('renamed')) {
    messages.push(`${quote(e.from)} was already taken, so it was saved as ${quote(e.to)}.`)
  }

  const gone = by('group_gone')
  if (gone.length === 1) messages.push(`${quote(gone[0].name || 'A group')} was deleted on another device, so your changes to it were not saved.`)
  else if (gone.length > 1) messages.push(`${gone.length} groups were deleted on another device, so your changes to them were not saved.`)

  const full = by('group_limit')
  if (full.length === 1) messages.push(`${quote(full[0].name || 'A group')} could not be saved because you have reached the limit of groups.`)
  else if (full.length > 1) messages.push(`${full.length} groups could not be saved because you have reached the limit of groups.`)

  const drugs = by('drug_limit')
  if (drugs.length > 0) {
    const names = Array.from(new Set(drugs.map(e => e.name).filter(Boolean)))
    if (names.length === 1) {
      messages.push(`${drugs.length} drug${drugs.length === 1 ? '' : 's'} could not be added to ${quote(names[0])} because it is full.`)
    } else {
      messages.push(`${drugs.length} drugs could not be added because the groups are full.`)
    }
  }

  if (by('read_only').length > 0) {
    messages.push('Your changes could not be saved because your groups are read only.')
  }

  if (failed > 0) messages.push(`${failed} change${failed === 1 ? '' : 's'} could not be saved.`)

  const severe = events.some(e => e.kind !== 'renamed') || failed > 0
  return { messages, severe }
}
