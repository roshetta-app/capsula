/**
 * src/hooks/useRoshettaSpecialties.js
 * Every active specialty for the roshetta screens (2026-11-27), including those with no topics yet.
 * Returns the same list shape as useConditionContext().specialties, so the roshetta screens swap one line.
 *
 * - Starts from the specialties the topics give (instant, works offline) plus a small saved copy of the full
 *   list from the last time the phone was online (a ~15 row list in localStorage).
 * - Then asks the specialties table once per app session (public read) and keeps the answer for next time.
 * - If the ask fails (offline), the saved copy and the topics' list are used; nothing breaks.
 */
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useConditionContext } from '../context/ConditionContext'
import { mergeSpecialties } from '../utils/allSpecialties'

const STORE_KEY = 'capsula_all_specialties_v1'
const COLUMNS = 'id, name_en, slug, icon_name, icon_type, icon_url, color_hex, color_token, sort_order, is_active'

let sessionRows = null      // the last answer from the table in this app session
let inFlight = null

function readSaved() {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch { return null }
}

function save(rows) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(rows)) } catch { /* storage full or off: skip */ }
}

function loadRows() {
  if (sessionRows) return Promise.resolve(sessionRows)
  if (inFlight) return inFlight
  inFlight = supabase.from('specialties').select(COLUMNS)
    .then(({ data, error }) => {
      if (error || !Array.isArray(data) || data.length === 0) return null
      sessionRows = data
      save(data)
      return data
    })
    .catch(() => null)
    .finally(() => { inFlight = null })
  return inFlight
}

export function useRoshettaSpecialties() {
  const { specialties: fromTopics } = useConditionContext()
  const [rows, setRows] = useState(() => sessionRows ?? readSaved())

  useEffect(() => {
    let alive = true
    loadRows().then(r => { if (alive && r) setRows(r) })
    return () => { alive = false }
  }, [])

  return useMemo(() => mergeSpecialties(fromTopics, rows), [fromTopics, rows])
}
