/**
 * src/lib/appData.js
 *
 * S11 (2026-11-26): app-wide server reads and writes that screens used to make by handing the server
 * client to a function in queries.js (own profile, own account delete, app gate, one config text).
 * Bound to the client here so those screens no longer import it. The originals still take a client.
 */

import { supabase } from './supabase'
import {
  updateOwnProfile as updateOwnProfileWith,
  deleteOwnAccount as deleteOwnAccountWith,
  fetchCmsConfig as fetchCmsConfigWith,
  fetchActiveGates as fetchActiveGatesWith,
  fetchMinimumSupportedVersion as fetchMinimumSupportedVersionWith,
} from './queries'

export const updateOwnProfile = (userId, fields) => updateOwnProfileWith(supabase, userId, fields)
export const deleteOwnAccount = () => deleteOwnAccountWith(supabase)
export const fetchCmsConfig = (key) => fetchCmsConfigWith(supabase, key)
export const fetchActiveGates = (platform) => fetchActiveGatesWith(supabase, platform)
export const fetchMinimumSupportedVersion = (platform) => fetchMinimumSupportedVersionWith(supabase, platform)
