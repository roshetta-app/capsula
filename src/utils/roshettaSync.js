/**
 * src/utils/roshettaSync.js
 *
 * 2026-11-13 (Roshetta plan, step 2.3b): sends the waiting changes of a
 * person's roshettas (utils/roshettaChanges.js) to the server, one at a time,
 * in order. Plain functions: the database client and the time limit are handed
 * in, so everything here can be checked against a fake server. Copied from the
 * groups pattern (groupSync.js), not shared with it.
 *
 * Safe to repeat: a change that was on its way when the app was killed is sent
 * again on reopen, so a repeat must never be an error:
 *   - a create of a roshetta that already exists counts as done;
 *   - a delete of a roshetta that is not there counts as done;
 *   - a save just writes the whole roshetta again (last save wins, plan G).
 *
 * What the server can answer to one change:
 *   done     the server took it (or already had it)
 *   retry    no connection, no answer in time, not signed in right now, or a
 *            server hiccup: nothing is lost, the change stays and is tried later
 *   refused  the server said no. Settled by its reason:
 *              roshetta gone   deleted on another device: everything waiting for it is dropped
 *              roshetta limit  the roshetta cannot be made (also what a lapsed account gets
 *                              for a create, Stage 1): everything waiting for it is dropped
 *              drug limit      too many drugs. A create is dropped with everything waiting for
 *                              it; a save is dropped alone, so a later, smaller save can still go
 *              read only       plan lapsed: waiting changes are dropped (deletes still go)
 *              other error     the change is marked failed and not sent again until the person
 *                              taps Retry or Discard
 *            Nothing is dropped without an event that tells the person.
 */

import { markSending, removeChange, markFailed, nextToSend, dropRoshetta, clearSending } from './roshettaChanges.js'

export const REFUSAL = {
  ROSHETTA_LIMIT: 'roshetta_limit',
  DRUG_LIMIT: 'drug_limit',
  READ_ONLY: 'read_only',
  ROSHETTA_GONE: 'roshetta_gone',
  ERROR: 'error',
}

const NETWORK_WORDS = /failed to fetch|networkerror|network request failed|load failed|fetch failed|network error/i

// Sorts one database answer into ok / exists / retry / refused.
// error: the Supabase error (or the timeout error); status: the HTTP status when known.
export function classifyError(error, status) {
  if (!error) return { kind: 'ok' }
  const code = String(error.code ?? '')
  const text = `${error.message ?? ''} ${error.details ?? ''}`

  if (code === 'request_timeout') return { kind: 'retry' }
  if (status === 0 || NETWORK_WORDS.test(text)) return { kind: 'retry' }
  if (status === 401 || code === 'PGRST301' || /jwt/i.test(text)) return { kind: 'retry' }
  if (typeof status === 'number' && status >= 500) return { kind: 'retry' }

  if (code === '23505') return { kind: 'exists' } // the same roshetta is already there
  if (text.includes('roshetta_drug_limit_reached')) return { kind: 'refused', reason: REFUSAL.DRUG_LIMIT }
  if (text.includes('roshetta_limit_reached')) return { kind: 'refused', reason: REFUSAL.ROSHETTA_LIMIT }
  if (code === '42501' || /row-level security/i.test(text)) return { kind: 'refused', reason: REFUSAL.READ_ONLY }
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
// counted: true when the server newly took a create (for analytics).
export async function sendChange(client, change, limit = x => x) {
  const { type, roshettaId, data = {} } = change
  try {
    switch (type) {
      case 'create': {
        const res = await limit(client.from('roshettas').insert({
          id: roshettaId,
          name: data.name,
          description: data.description ?? '',
          rows: data.rows ?? [],
          created_at: data.createdAt,
        }))
        return toResult(res)
      }
      case 'save': {
        const res = await limit(client.from('roshettas').update({
          name: data.name,
          description: data.description ?? '',
          rows: data.rows ?? [],
        }).eq('id', roshettaId).select('id'))
        const out = toResult(res)
        if (out.status !== 'done') return out
        if (Array.isArray(res.data) && res.data.length === 0) {
          // No row changed and no error. Either the roshetta is gone (deleted on
          // another device) or the account is read only: the database answers a
          // lapsed account's update with nothing, not with a refusal. Reading it
          // back tells which (the owner can always read their own rows).
          const check = await limit(client.from('roshettas').select('id').eq('id', roshettaId))
          const c = classifyError(check?.error, check?.status)
          if (c.kind === 'retry') return { status: 'retry' }
          if (c.kind !== 'ok') return { status: 'refused', reason: REFUSAL.ERROR }
          const there = Array.isArray(check.data) && check.data.length > 0
          return { status: 'refused', reason: there ? REFUSAL.READ_ONLY : REFUSAL.ROSHETTA_GONE }
        }
        return { ...out, counted: false }
      }
      case 'delete': {
        const res = await limit(client.from('roshettas').delete().eq('id', roshettaId))
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
//   { status: 'dropped', event }            this change is not saved; the rest carry on
//   { status: 'dropped_roshetta', event }   everything waiting for the roshetta is dropped
//   { status: 'read_only', event }          plan lapsed: waiting changes dropped, deletes kept
//   { status: 'failed', reason }            kept, marked failed, for Retry or Discard
function settle(change, out, roshettaName) {
  const name = roshettaName(change.roshettaId) ?? change.data?.name ?? ''
  const { roshettaId } = change
  switch (out.reason) {
    case REFUSAL.ROSHETTA_GONE:
      return { status: 'dropped_roshetta', event: { kind: 'roshetta_gone', roshettaId, name } }
    case REFUSAL.ROSHETTA_LIMIT:
      return { status: 'dropped_roshetta', event: { kind: 'roshetta_limit', roshettaId, name } }
    case REFUSAL.DRUG_LIMIT:
      // A create that is too big was never made, so what waits for it goes too.
      // A save that is too big is dropped alone: the next save may be smaller.
      return change.type === 'create'
        ? { status: 'dropped_roshetta', event: { kind: 'drug_limit', roshettaId, name } }
        : { status: 'dropped', event: { kind: 'drug_limit', roshettaId, name } }
    case REFUSAL.READ_ONLY:
      // Deleting is always allowed; a refused delete is just a failed change.
      if (change.type === 'delete') break
      return { status: 'read_only', event: { kind: 'read_only' } }
    default:
      break
  }
  return { status: 'failed', reason: out.reason ?? REFUSAL.ERROR }
}

// Sends the waiting changes in order until none is left that can go.
//   getQueue      () => the list as it is now (read fresh every time, because the
//                 person may add changes while sending)
//   update        async (fn) => puts fn(list) in place and saves it on the phone
//   send          async (change) => { status, reason?, counted? }  (see sendChange)
//   canRun        () => false when offline or signed out: sending stops at once
//   onSent        (change) => called once for a roshetta the server newly took
//   roshettaName  (roshettaId) => the roshetta's name for the messages (optional)
// Returns { sent, failed, events, stopped }: events are the things the person
// has to be told about; stopped is 'empty' (nothing left that can go), 'blocked'
// (offline or signed out) or 'retry' (no answer; try later).
export async function runSync({ getQueue, update, send, canRun, onSent, roshettaName = () => null }) {
  const result = { sent: 0, failed: 0, events: [], stopped: 'empty' }
  for (let guard = 0; guard < 5000; guard += 1) {
    if (!canRun()) { result.stopped = 'blocked'; break }
    const change = nextToSend(getQueue())
    if (!change) break

    await update(q => markSending(q, change.id))
    let out = await send(change)
    if (out.status === 'refused') out = settle(change, out, roshettaName)

    if (out.status === 'retry') {
      await update(clearSending)
      result.stopped = 'retry'
      break
    }
    if (out.status === 'done') {
      await update(q => removeChange(q, change.id))
      result.sent += 1
      if (out.counted && onSent) onSent(change)
      continue
    }
    if (out.status === 'dropped') {
      await update(q => removeChange(q, change.id))
      result.events.push(out.event)
      continue
    }
    if (out.status === 'dropped_roshetta') {
      await update(q => dropRoshetta(q, change.roshettaId))
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

// The things the person has to be told after a run, in plain words (the events
// and the failed count that runSync returns). One text per kind; several
// roshettas of one kind are counted. severe: true when something was lost, so
// the message is shown as an error instead of a note.
export function describeEvents(events = [], failed = 0) {
  const messages = []
  const by = kind => events.filter(e => e.kind === kind)
  const quote = t => `\u201c${t}\u201d`

  const gone = by('roshetta_gone')
  if (gone.length === 1) messages.push(`${quote(gone[0].name || 'A roshetta')} was deleted on another device, so your changes to it were not saved.`)
  else if (gone.length > 1) messages.push(`${gone.length} roshettas were deleted on another device, so your changes to them were not saved.`)

  const full = by('roshetta_limit')
  if (full.length === 1) messages.push(`${quote(full[0].name || 'A roshetta')} could not be saved because you have reached the limit of roshettas.`)
  else if (full.length > 1) messages.push(`${full.length} roshettas could not be saved because you have reached the limit of roshettas.`)

  const big = by('drug_limit')
  if (big.length === 1) messages.push(`${quote(big[0].name || 'A roshetta')} could not be saved because it has too many drugs.`)
  else if (big.length > 1) messages.push(`${big.length} roshettas could not be saved because they have too many drugs.`)

  if (by('read_only').length > 0) {
    messages.push('Your changes could not be saved because your roshettas are read only.')
  }

  if (failed > 0) messages.push(`${failed} change${failed === 1 ? '' : 's'} could not be saved.`)

  const severe = events.length > 0 || failed > 0
  return { messages, severe }
}
