/**
 * src/hooks/useCmsDrugIndex.js
 * 2026-11-10 (CMS drug library, full search engine): holds the admin's copy of the whole drug
 * list (see fetchCmsDrugIndex in adminQueries.js) for as long as the CMS stays open, so the
 * Drug Library can run the app's own search on it.
 *
 * Kept in one module-level store, not in the screen, so leaving the Drug Library (to edit a
 * generic, say) and coming back does not download it again. It is refreshed quietly in the
 * background when it is older than REFRESH_AFTER_MS, while the old copy stays on screen.
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
import { fetchCmsDrugIndex } from '../lib/adminQueries'

const REFRESH_AFTER_MS = 2 * 60 * 1000

const store = {
  data:      null,   // { drugs, genericsById }
  loadedAt:  0,
  loading:   false,
  progress:  null,
  error:     null,
  version:   0,
  listeners: new Set(),
}

function emit() { store.listeners.forEach(l => l()) }

let inflight = null
function load() {
  if (inflight) return inflight
  store.loading = true
  store.error = null
  emit()
  inflight = fetchCmsDrugIndex((loaded, total) => {
    store.progress = { loaded, total }
    emit()
  }).then(({ data, error }) => {
    if (error) {
      // A failed refresh keeps the old copy; only a failed first load shows an error.
      if (!store.data) store.error = error.message ?? 'Could not load the drug list'
    } else {
      store.data = data
      store.loadedAt = Date.now()
    }
  }).catch(err => {
    if (!store.data) store.error = err?.message ?? 'Could not load the drug list'
  }).finally(() => {
    store.loading = false
    store.progress = null
    inflight = null
    emit()
  })
  return inflight
}

export function useCmsDrugIndex() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick(t => t + 1)
    store.listeners.add(listener)
    if (!store.data) load()
    else if (Date.now() - store.loadedAt > REFRESH_AFTER_MS) load()
    return () => { store.listeners.delete(listener) }
  }, [])

  function setGenericPublished(id, value) {
    if (!store.data) return
    for (const d of store.data.drugs) if (d.genericId === id) d.genericPublished = value
    const g = store.data.genericsById.get(id)
    if (g) g.is_published = value
    store.version += 1
    emit()
  }

  function setBrandPublished(id, value) {
    if (!store.data) return
    const row = store.data.drugs.find(d => d.id === id)
    if (row) row.isPublished = value
    store.version += 1
    emit()
  }

  function removeGeneric(id) {
    if (!store.data) return
    const genericsById = new Map(store.data.genericsById)
    genericsById.delete(id)
    store.data = { drugs: store.data.drugs.filter(d => d.genericId !== id), genericsById }
    store.version += 1
    emit()
  }

  return {
    drugs:        store.data?.drugs ?? null,
    genericsById: store.data?.genericsById ?? null,
    loading:      store.loading && !store.data,
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
