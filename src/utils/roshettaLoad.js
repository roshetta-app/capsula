/**
 * src/utils/roshettaLoad.js
 *
 * 2026-11-13 (Roshetta plan, step 2.4a): how a person's roshettas are loaded.
 * Plain functions only: the database, the saved copy and the clock are handed
 * in, so everything here can be checked without a screen. The hook
 * (hooks/useRoshettas.js) stays thin and only passes things in. Copied from
 * the groups load (useDrugGroups.js), not shared with it.
 *
 * Order of a load:
 *   0. The waiting changes are read once per sign-in. A change marked
 *      'sending' was on its way when the app was closed, so the mark is taken
 *      off (sending twice is safe, see roshettaSync.js).
 *   1. The saved copy shows at once (and is all there is while offline).
 *   2. Offline: stay on the saved copy, or give an error when there is none.
 *   3. The live list from the server replaces it. If that fails, the saved
 *      copy stays and the failure is flagged (loadError).
 * Every list shown has the waiting changes laid over it.
 *
 * Every state handed to show() is complete:
 *   { roshettas, status: 'loading' | 'ready' | 'error', fromCache, loadError }
 *
 * What a screen sees is worked out from the signed-in state and the last
 * state shown (viewFor), never set when someone signs out: a guest simply has
 * nothing to show, and one person's list is never shown to another.
 */

import { applyQueue, clearSending, newestChangedFirst } from './roshettaChanges.js'

export const ROSHETTA_COLUMNS = 'id, name, description, rows, created_at, updated_at'
export const REQUEST_TIMEOUT_MS = 8000

const TIMEOUT_ERROR = { code: 'request_timeout', message: 'request_timeout' }

// Database row to the shape the app uses everywhere.
export function mapRoshettaRow(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    rows: Array.isArray(r.rows) ? r.rows : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// Wraps one request. Always resolves with { data, error }: the real answer, or
// a timeout error when the answer takes longer than the limit (a Wi-Fi with no
// internet then behaves like airplane mode).
export function withTimeLimit(request, ms = REQUEST_TIMEOUT_MS) {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve({ data: null, error: TIMEOUT_ERROR }), ms)
    Promise.resolve(request).then(
      res => { clearTimeout(timer); resolve(res) },
      err => { clearTimeout(timer); resolve({ data: null, error: err ?? TIMEOUT_ERROR }) },
    )
  })
}

// The signed-in person's roshettas from the server (row security shows only
// their own), newest changed first. Resolves { data: mapped list, error }.
export async function fetchRoshettas(client, limit = x => x) {
  const res = await limit(client.from('roshettas').select(ROSHETTA_COLUMNS).order('updated_at', { ascending: false }))
  if (res?.error || !Array.isArray(res?.data)) return { data: null, error: res?.error ?? TIMEOUT_ERROR }
  return { data: res.data.map(mapRoshettaRow), error: null }
}

// Runs one load. Returns { stale: true } when the person signed out (or a newer
// load started) in between, and then shows nothing more; otherwise
// { stale: false, queue, live }, where queue is the waiting list (cleared of
// stale 'sending' marks) and live says the server's list is what is shown.
//   queue       the waiting list when already read for this person, else null
//   readQueue   (userId) => Promise<list>
//   readCache   (userId) => Promise<{ data } | null>
//   fetchLive   () => Promise<{ data, error }>   data: mapped roshettas
//   isOffline   () => boolean
//   isStale     () => boolean
//   show        (state) => void
//   onQueue     (list) => void   optional; called once, right after the waiting
//                                list is read, so the hook can keep it
export async function loadRoshettas({ userId, queue, readQueue, readCache, fetchLive, isOffline, isStale, show, onQueue }) {
  let waiting = queue
  if (!waiting) {
    const saved = await readQueue(userId)
    if (isStale()) return { stale: true }
    waiting = clearSending(Array.isArray(saved) ? saved : [])
    if (onQueue) onQueue(waiting)
  }
  const withWaiting = list => applyQueue(list, waiting)

  const cached = await readCache(userId)
  if (isStale()) return { stale: true }
  const hasCopy = !!cached && Array.isArray(cached.data)
  if (hasCopy) {
    show({ roshettas: withWaiting(cached.data), status: 'ready', fromCache: true, loadError: false })
  } else {
    show({ roshettas: [], status: 'loading', fromCache: false, loadError: false })
  }

  if (isOffline()) {
    show({ roshettas: hasCopy ? withWaiting(cached.data) : [], status: hasCopy ? 'ready' : 'error', fromCache: hasCopy, loadError: hasCopy })
    return { stale: false, queue: waiting, live: false }
  }

  const { data, error } = await fetchLive()
  if (isStale()) return { stale: true }
  if (error || !Array.isArray(data)) {
    show({ roshettas: hasCopy ? withWaiting(cached.data) : [], status: hasCopy ? 'ready' : 'error', fromCache: hasCopy, loadError: hasCopy })
    return { stale: false, queue: waiting, live: false }
  }
  show({ roshettas: newestChangedFirst(withWaiting(data)), status: 'ready', fromCache: false, loadError: false })
  return { stale: false, queue: waiting, live: true }
}

// What the screens see. loaded: the last state shown, { userId, ...state }, or null.
//   still checking who is signed in  -> loading, nothing to show
//   guest (nobody signed in)         -> ready, nothing to show, isGuest true
//   signed in, nothing loaded yet for this person (or only another person's) -> loading
//   otherwise                        -> the loaded state
const NONE = Object.freeze([])

export function viewFor({ userId, authLoading, loaded }) {
  const base = { roshettas: NONE, status: 'loading', fromCache: false, loadError: false, isGuest: false }
  if (authLoading) return base
  if (!userId) return { ...base, status: 'ready', isGuest: true }
  if (!loaded || loaded.userId !== userId) return base
  return { roshettas: loaded.roshettas, status: loaded.status, fromCache: loaded.fromCache, loadError: loaded.loadError, isGuest: false }
}
