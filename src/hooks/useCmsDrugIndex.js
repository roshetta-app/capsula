/**
 * src/hooks/useCmsDrugIndex.js
 * 2026-11-10 (CMS drug library, full search engine): holds the admin's copy of the whole drug
 * list (see fetchCmsDrugIndex in adminQueries.js) for as long as the CMS stays open, so the
 * Drug Library can run the app's own search on it.
 *
 * Kept in one module-level store, not in the screen, so leaving the Drug Library (to edit a
 * generic, say) and coming back does not download it again. It is also saved on the device (see
 * the 2026-11-10 note below), and refreshed quietly in the background only when a quick check
 * says something changed, while the old copy stays on screen.
 *
 * Returns:
 *   drugs          flat drug rows (one per brand, plus one 'generic only' row per brandless generic)
 *   genericsById   Map of generic id -> its own facts (name, update date, formulation count...)
 *   loading        true only on the very first load (nothing to show yet)
 *   refreshing     true during a quiet background refresh
 *   progress       { loaded, total } while paging, else null
 *   error          message when the first load failed
 *   version        changes when a row was edited in place (publish toggle), so lists redraw
 *   refresh        () => Promise  reload now
 *   setGenericPublished(id, bool)   edit in place after a successful publish toggle
 *   setBrandPublished(id, bool)     the same for a brand
 *   removeGeneric(id)               drop a deleted generic (rebuilds the search index)
 *
 * Publish toggles change the rows in place (same array) so the search index is not rebuilt;
 * a delete replaces the array, which does rebuild it.
 */

import { useEffect, useState } from 'react'
import { fetchCmsDrugIndex, fetchCmsIndexStamp } from '../lib/adminQueries'

// 2026-11-10 (saved copy): the list is now also saved on the device (IndexedDB), so opening or
// refreshing the CMS shows it at once instead of downloading all the rows again. On each visit
// to the Drug Library a tiny check (fetchCmsIndexStamp, 3 small requests) decides whether
// anything changed; only then is the list downloaded again, quietly, with the saved copy still
// on screen. As a safety net for changes made outside the CMS (SQL, imports) the list is also
// re-downloaded once it is older than MAX_AGE_MS, and the refresh button always re-downloads.
const MAX_AGE_MS = 12 * 60 * 60 * 1000
const SCHEMA = 1            // raise when the shape of a row changes, so old saved copies are dropped

// Its own small database, so it can never get in the way of the app's own storage.
const DB_NAME = 'capsula-cms'
const STORE_NAME = 'kv'
const KEY = 'drug-index'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readSaved() {
  let db
  try {
    db = await openDb()
    const rec = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
    if (!rec || rec.schema !== SCHEMA || !rec.data?.drugs || !(rec.data.genericsById instanceof Map)) return null
    return rec
  } catch {
    return null
  } finally {
    db?.close()
  }
}

async function writeSaved() {
  if (!store.data) return
  let db
  try {
    db = await openDb()
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put({ schema: SCHEMA, data: store.data, stamp: store.stamp, savedAt: store.loadedAt }, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {
    // Storage full or unavailable: the list simply downloads next time, as before.
  } finally {
    db?.close()
  }
}

const store = {
  data:      null,   // { drugs, genericsById }
  stamp:     null,   // what the server said about the list just before it was downloaded
  loadedAt:  0,
  loading:   false,
  restoring: false,
  progress:  null,
  error:     null,
  version:   0,
  listeners: new Set(),
}

function emit() { store.listeners.forEach(l => l()) }

const sameStamp = (a, b) =>
  !!a && !!b && a.updated === b.updated && a.brands === b.brands && a.generics === b.generics

let inflight = null
function load() {
  if (inflight) return inflight
  store.loading = true
  store.error = null
  emit()
  inflight = (async () => {
    // Taken BEFORE the download, so an edit made while it runs is noticed on the next check.
    const { data: stamp } = await fetchCmsIndexStamp()
    const { data, error } = await fetchCmsDrugIndex((loaded, total) => {
      store.progress = { loaded, total }
      emit()
    })
    if (error) {
      // A failed refresh keeps the old copy; only a failed first load shows an error.
      if (!store.data) store.error = error.message ?? 'Could not load the drug list'
    } else {
      store.data = data
      store.stamp = stamp ?? null
      store.loadedAt = Date.now()
      writeSaved()
    }
  })().catch(err => {
    if (!store.data) store.error = err?.message ?? 'Could not load the drug list'
  }).finally(() => {
    store.loading = false
    store.progress = null
    inflight = null
    emit()
  })
  return inflight
}

// Runs each time the Drug Library opens: show the saved copy, then download only if needed.
let restoring = null
async function ensureFresh() {
  if (inflight) return
  if (!store.data) {
    if (!restoring) {
      store.restoring = true
      emit()
      restoring = readSaved().then(rec => {
        if (rec && !store.data) {
          store.data = rec.data
          store.stamp = rec.stamp ?? null
          store.loadedAt = rec.savedAt ?? 0
        }
      }).finally(() => { store.restoring = false; restoring = null; emit() })
    }
    await restoring
  }
  if (!store.data) { load(); return }
  const { data: stamp, error } = await fetchCmsIndexStamp()
  if (error) return                     // offline or a hiccup: keep what we have
  const tooOld = Date.now() - store.loadedAt > MAX_AGE_MS
  if (tooOld || !sameStamp(stamp, store.stamp)) load()
}

// After the admin's own in-place edit (publish toggle, delete) the shown list is already right,
// so take the server's new stamp as the baseline instead of downloading everything again.
let saveTimer = null
async function acceptOwnEdit() {
  if (!inflight) {
    const { data: stamp } = await fetchCmsIndexStamp()
    if (stamp && !inflight) store.stamp = stamp
  }
  clearTimeout(saveTimer)
  saveTimer = setTimeout(writeSaved, 1500)
}

export function useCmsDrugIndex() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick(t => t + 1)
    store.listeners.add(listener)
    ensureFresh()
    return () => { store.listeners.delete(listener) }
  }, [])

  function setGenericPublished(id, value) {
    if (!store.data) return
    for (const d of store.data.drugs) if (d.genericId === id) d.genericPublished = value
    const g = store.data.genericsById.get(id)
    if (g) g.is_published = value
    store.version += 1
    emit()
    acceptOwnEdit()
  }

  function setBrandPublished(id, value) {
    if (!store.data) return
    const row = store.data.drugs.find(d => d.id === id)
    if (row) row.isPublished = value
    store.version += 1
    emit()
    acceptOwnEdit()
  }

  function removeGeneric(id) {
    if (!store.data) return
    const genericsById = new Map(store.data.genericsById)
    genericsById.delete(id)
    store.data = { drugs: store.data.drugs.filter(d => d.genericId !== id), genericsById }
    store.version += 1
    emit()
    acceptOwnEdit()
  }

  return {
    drugs:        store.data?.drugs ?? null,
    genericsById: store.data?.genericsById ?? null,
    loading:      (store.loading || store.restoring) && !store.data,
    refreshing:   store.loading && !!store.data,
    progress:     store.progress,
    error:        store.error,
    version:      store.version,
    refresh:      load,
    setGenericPublished,
    setBrandPublished,
    removeGeneric,
  }
}
