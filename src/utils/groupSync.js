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
 *   refused  the server said no (name taken, limit, group gone, plan lapsed,
 *            other error): the change is marked failed and not sent again.
 *            Step 17.4 explains it to the person and offers Retry or Discard.
 */

import { markSending, removeChange, markFailed, nextToSend } from './groupChanges'

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

// Sends the waiting changes in order until none is left that can go.
//   getQueue  () => the list as it is now (read fresh every time, because the
//             person may add changes while sending)
//   update    async (fn) => puts fn(list) in place and saves it on the phone
//   send      async (change) => { status, reason?, counted? }  (see sendChange)
//   canRun    () => false when offline or signed out: sending stops at once
//   onSent    (change) => called once for a change the server newly took
// Returns { sent, failed, stopped }: stopped is 'empty' (nothing left that can
// go), 'blocked' (offline or signed out) or 'retry' (no answer; try later).
export async function runSync({ getQueue, update, send, canRun, onSent }) {
  const result = { sent: 0, failed: 0, stopped: 'empty' }
  for (let guard = 0; guard < 5000; guard += 1) {
    if (!canRun()) { result.stopped = 'blocked'; break }
    const change = nextToSend(getQueue())
    if (!change) break

    await update(q => markSending(q, change.id))
    const out = await send(change)

    if (out.status === 'retry') {
      await update(q => q.map(c => {
        if (c.id !== change.id) return c
        const rest = { ...c }
        delete rest.sending
        return rest
      }))
      result.stopped = 'retry'
      break
    }
    if (out.status === 'done') {
      await update(q => removeChange(q, change.id))
      result.sent += 1
      if (out.counted && onSent) onSent(change)
      continue
    }
    await update(q => markFailed(q, change.id, out.reason ?? REFUSAL.ERROR))
    result.failed += 1
  }
  return result
}
