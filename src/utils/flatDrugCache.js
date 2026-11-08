// Shared in-memory cache of the drug-card data (one entry per brand), used by
// the block title and by the drug card inside the dose editor. Loading starts
// as soon as a sheet opens (prefetchFlatDrugs), so a drug card is already
// there when a block is expanded instead of appearing a moment later.
import { supabase } from '../lib/supabase'
import { fetchFlatDrugsByBrandId } from '../lib/queries'

const cache = new Map()   // brandId -> flat drug
const pending = new Map() // brandId -> promise

export function peekFlatDrug(brandId) {
  return brandId ? (cache.get(brandId) ?? null) : null
}

export function loadFlatDrug(brandId) {
  if (!brandId) return Promise.resolve(null)
  if (cache.has(brandId)) return Promise.resolve(cache.get(brandId))
  if (pending.has(brandId)) return pending.get(brandId)
  const p = fetchFlatDrugsByBrandId(supabase, brandId)
    .then(rows => {
      const found = rows?.[0] ?? null
      if (found) cache.set(brandId, found)
      pending.delete(brandId)
      return found
    })
    .catch(() => { pending.delete(brandId); return null })
  pending.set(brandId, p)
  return p
}

export function prefetchFlatDrugs(brandIds) {
  ;[...new Set((brandIds ?? []).filter(Boolean))].forEach(id => { loadFlatDrug(id) })
}
