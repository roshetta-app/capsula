/**
 * useHomeFeatured — the featured card for Home (Phase H, step 9.3).
 *
 * Reads the switched-on rows of home_featured (ids only), keeps a saved copy on the phone for offline,
 * matches the rows to the saved library of topics and drugs, and picks ONE item per app start
 * (assumption O): the card stays the same while the person moves around and comes back to Home, and a
 * new app start never repeats the last one shown when there is a choice. Returns null when nothing can
 * show (no card is drawn, no empty box).
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { resolveFromLibrary, pickFeatured, canShow } from '../utils/homeFeatured'

const SAVED_KEY = 'capsula_home_featured_v1'
const LAST_KEY  = 'capsula_home_featured_last_v1'

// The pick for this app start. Lives for as long as the app stays open.
let sessionPickId = null

function readSaved() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? 'null')
    return Array.isArray(parsed) ? parsed : null
  } catch { return null }
}
function writeSaved(rows) {
  try { window.localStorage.setItem(SAVED_KEY, JSON.stringify(rows)) } catch { /* full or blocked: skip */ }
}
function readLast() {
  try { return window.localStorage.getItem(LAST_KEY) } catch { return null }
}
function writeLast(id) {
  try { window.localStorage.setItem(LAST_KEY, id) } catch { /* skip */ }
}

/**
 * @param {Array}   conditions   the saved topics
 * @param {Array}   drugs        the saved drugs
 * @param {boolean} libraryReady true once both libraries have finished loading
 * @returns {{ item: object|null, loadingFirst: boolean }}
 */
export function useHomeFeatured(conditions, drugs, libraryReady) {
  const [rows, setRows]     = useState(readSaved)   // null = never loaded and no saved copy
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    supabase
      .from('home_featured')
      .select('id, kind, condition_id, brand_id, tagline, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return
        if (error || !Array.isArray(data)) { setFailed(true); return }
        setRows(data)
        writeSaved(data)
      }, () => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [])

  const item = useMemo(() => {
    if (!rows || rows.length === 0) return null
    const items = resolveFromLibrary(rows, conditions, drugs)
    const kept = sessionPickId ? items.find(i => i.id === sessionPickId && canShow(i)) : null
    if (kept) return kept
    if (!libraryReady) return null          // wait for both libraries so the pick is fair
    return pickFeatured(items, readLast())
  }, [rows, conditions, drugs, libraryReady])

  useEffect(() => {
    if (item && sessionPickId !== item.id) {
      sessionPickId = item.id
      writeLast(item.id)
    }
  }, [item])

  return { item, loadingFirst: rows === null && !failed }
}
