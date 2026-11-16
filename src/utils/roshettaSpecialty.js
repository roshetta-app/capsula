/**
 * src/utils/roshettaSpecialty.js
 * 2026-11-16 (Roshetta plan, Phase I step 10.3): the plain rules for a roshetta's optional
 * specialty, so they can be checked without a screen.
 *
 * A roshetta carries only a specialtyId (or null). Everything shown comes from the specialty
 * list already on the phone, so a card draws offline. A roshetta with no specialty, or whose
 * specialty is no longer in the list (an admin removed it), shows the app's own blue.
 *
 * A specialty here is the same shape the Topics picker uses:
 *   { id, name, iconType, iconValue, colorToken }
 */

import { resolveToken } from './specialtyTokens.js'

// No specialty chosen, or the chosen one is gone: the app's own blue (its variables, so light
// and dark mode follow the app and not a fixed colour).
export const DEFAULT_LOOK = Object.freeze({
  bg: 'var(--color-accent-light)',
  fg: 'var(--color-accent)',
  pill: 'var(--color-accent)',
})

// The roshetta's specialty from the list, or null (none chosen, not in the list, bad input).
export function findSpecialty(specialtyId, list) {
  if (typeof specialtyId !== 'string' || !specialtyId) return null
  if (!Array.isArray(list)) return null
  return list.find(s => s && s.id === specialtyId) ?? null
}

// What a shared roshetta's specialty (from the public share function) looks like in the shape
// above. Anything that is not a proper specialty answers null, so the default blue is shown.
export function specialtyFromShared(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  if (typeof data.id !== 'string' || !data.id) return null
  const name = typeof data.name_en === 'string' ? data.name_en.trim() : ''
  if (!name) return null
  return {
    id: data.id,
    name,
    iconType: data.icon_type === 'custom' ? 'custom' : 'lucide',
    iconValue: typeof data.icon_value === 'string' && data.icon_value ? data.icon_value : 'Stethoscope',
    colorToken: typeof data.color_token === 'string' && data.color_token ? data.color_token : null,
  }
}

// The colours of a roshetta's header and Rx mark for the current mode.
// Returns { isDefault, bg, fg, pill } (CSS colours).
export function specialtyColors(specialty, isDark = false) {
  if (!specialty) return { isDefault: true, ...DEFAULT_LOOK }
  const c = resolveToken(specialty.colorToken, isDark)
  return { isDefault: false, bg: c.bg, fg: c.fg, pill: c.pill }
}

// The text in the header band: the specialty's name, or the fallback when there is none.
export function specialtyHeaderText(specialty, fallback = '') {
  const name = specialty && typeof specialty.name === 'string' ? specialty.name.trim() : ''
  return name || fallback
}
