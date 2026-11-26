/**
 * src/lib/switchQueries.js
 *
 * S11 (2026-11-26): reads of the on/off switches kept in the cms_config table. They were direct
 * server calls inside LaunchSwitchesManager.jsx and SignInReturnNotice.jsx; they live here now so the
 * switches area talks to the server from one small file. Writing stays in adminQueries.updateCmsConfig.
 */

import { supabase } from './supabase'

/** @param {string[]} keys @returns {Promise<{data: {key: string, value: string}[]|null, error: object|null}>} */
export async function fetchSwitchRows(keys) {
  return supabase.from('cms_config').select('key, value').in('key', keys)
}

/** The stored value of one switch, or null when there is no row. Throws on a server error. */
export async function fetchSwitchValue(key) {
  const { data, error } = await supabase.from('cms_config').select('value').eq('key', key).maybeSingle()
  if (error) throw error
  return data?.value ?? null
}
