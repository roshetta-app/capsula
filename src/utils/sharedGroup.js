/**
 * src/utils/sharedGroup.js
 * 2026-10-19 (Drug groups plan, step 8.2): opens a shared group from its link
 * code for the public page (SharedGroupScreen.jsx). No sign-in is needed.
 *
 * Reads only through the database function get_shared_group(p_code), which
 * returns the group's name, description, colour and drugs, and never the owner
 * or any user id. The tables themselves are closed to the public.
 *
 * fetchSharedGroup(code) answers one of:
 *   { status: 'ok', group: { name, description, color, drugs } }
 *   { status: 'unavailable' }  wrong, short, stopped or deleted-group link
 *                              (all the same answer, so nothing is revealed)
 *   { status: 'offline' }      the phone has no connection
 *   { status: 'error' }        the database could not be reached or failed
 *
 * Each drug is shaped like the app's normal drug objects (same names as
 * mapFlatDrugRows in lib/queries.js) so the normal drug card can draw it.
 * Fields a card never reads are left out.
 */

import { supabase } from '../lib/supabase'

// The database refuses codes shorter than this; no need to ask it.
const MIN_CODE_LENGTH = 32

export function mapSharedDrug(d) {
  return {
    id:              d.id,
    slug:            d.slug,
    name:            d.name,
    tradenameClean:  d.tradename_clean,
    nameAr:          d.name_ar ?? null,
    nameArFull:      d.name_ar_full ?? null,
    manufacturer:    d.manufacturer ?? null,
    price:           d.price ?? null,
    packSize:        d.pack_size ?? null,
    fillVolume:      d.fill_volume ?? null,
    formulationId:   d.formulation_id,
    formulationSlug: d.formulation_slug,
    concentration:   d.concentration ?? null,
    strengthValue:   d.strength_value ?? null,
    strengthUnit:    d.strength_unit ?? null,
    strengthBasis:   d.strength_basis ?? null,
    form:            d.form,
    formModifier:    d.form_modifier ?? [],
    route:           d.route ?? null,
    genericId:       d.generic_id,
    genericSlug:     d.generic_slug,
    genericName:     d.generic_name,
    ingredients:     d.ingredients ?? null,
    category:        d.category ?? null,
    class:           d.class ?? null,
    subclass:        d.subclass ?? null,
  }
}

export async function fetchSharedGroup(code) {
  const clean = typeof code === 'string' ? code.trim() : ''
  if (clean.length < MIN_CODE_LENGTH) return { status: 'unavailable' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { status: 'offline' }
  }

  let res
  try {
    res = await supabase.rpc('get_shared_group', { p_code: clean })
  } catch {
    return { status: 'error' }
  }
  if (res.error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'offline' }
    return { status: 'error' }
  }

  const data = res.data
  if (!data || typeof data !== 'object' || typeof data.name !== 'string') {
    return { status: 'unavailable' }
  }

  const drugs = (Array.isArray(data.drugs) ? data.drugs : []).map(mapSharedDrug)
  return {
    status: 'ok',
    group: {
      name: data.name,
      description: data.description ?? '',
      color: data.color,
      drugs,
    },
  }
}
