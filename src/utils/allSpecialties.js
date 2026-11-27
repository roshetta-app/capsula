// src/utils/allSpecialties.js
// The full specialty list for roshettas (2026-11-27): every active specialty, including those that have no topics yet.
// The Topics screen builds its list from the topics themselves (useConditions), so a specialty with no topics never
// shows there; that stays as it is. Roshettas use this list instead, so any specialty can be picked and a roshetta
// that holds a topic-less specialty still shows its name and colour.
// Pure functions only (no network, no storage), so they can be checked with node --test.

export const UNCATEGORIZED_ID = '00000000-0000-0000-0000-000000000001'

// One row of the specialties table, mapped to the picker shape the roshetta screens already use.
// Anything that is not a usable row answers null.
export function mapSpecialtyRow(row) {
  if (!row || typeof row !== 'object') return null
  if (typeof row.id !== 'string' || !row.id) return null
  if (typeof row.name_en !== 'string' || !row.name_en.trim()) return null
  const iconType = row.icon_type ?? 'lucide'
  return {
    id:         row.id,
    name:       row.name_en,
    slug:       row.slug ?? null,
    iconName:   row.icon_name ?? null,
    colorHex:   row.color_hex ?? null,
    iconType,
    iconValue:  iconType === 'custom' ? (row.icon_url ?? null) : (row.icon_name ?? 'Stethoscope'),
    colorToken: row.color_token ?? null,
    sortOrder:  typeof row.sort_order === 'number' ? row.sort_order : null,
  }
}

function bySortOrder(a, b) {
  return (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.name.localeCompare(b.name)
}

// Fetched rows (inactive ones are dropped, Uncategorized is left out) merged with the specialties the topics
// already gave (those win when both have the same id, so the look never changes). The topics' list is kept even
// when the fetch has not answered yet (offline, first second), so nothing a user could pick before disappears.
export function mergeSpecialties(fromTopics, fetchedRows) {
  const map = new Map()
  for (const row of Array.isArray(fetchedRows) ? fetchedRows : []) {
    if (row && row.is_active === false) continue
    const s = mapSpecialtyRow(row)
    if (s && s.id !== UNCATEGORIZED_ID) map.set(s.id, s)
  }
  for (const s of Array.isArray(fromTopics) ? fromTopics : []) {
    if (s && typeof s.id === 'string' && s.id !== UNCATEGORIZED_ID) map.set(s.id, s)
  }
  return [...map.values()].sort(bySortOrder)
}
