/**
 * src/lib/groupQueries.js
 *
 * S11 (2026-11-26): every server call of the drug groups hook (list, create, rename, delete, drugs in a
 * group, copy a shared group, share links and share names), moved out of `useDrugGroups.js` so the hook no
 * longer imports the server client. Every function returns the same awaitable query the hook built before;
 * the hook still wraps each one in its own time limit (`withLimit`), so retries, queueing, offline handling
 * and error messages are untouched.
 */

import { supabase } from './supabase'
import { sendChange } from '../utils/groupSync'

const GROUP_WITH_ITEMS = 'id, name, description, color, created_at, source_code, drug_group_items(brand_id)'

// ── Queued changes ────────────────────────────────────────────────────────
/** Sends one queued change to the server (the sync code takes the client as its first argument). */
export const sendGroupChange = (change, withLimit) => sendChange(supabase, change, withLimit)

// ── Groups ────────────────────────────────────────────────────────────────
export const queryGroupsWithItems = () => supabase
  .from('drug_groups')
  .select(GROUP_WITH_ITEMS)
  .order('created_at', { ascending: false })

export const queryGroupBySourceCode = (sourceCode) => supabase
  .from('drug_groups')
  .select(GROUP_WITH_ITEMS)
  .eq('source_code', sourceCode)
  .maybeSingle()

export const insertGroupReturning = (row) => supabase
  .from('drug_groups')
  .insert(row)
  .select('id, name, description, color, created_at')
  .single()

export const insertGroupCopyReturning = (row) => supabase
  .from('drug_groups')
  .insert(row)
  .select('id, name, description, color, created_at, source_code')
  .single()

export const insertGroupRow = (row) => supabase.from('drug_groups').insert(row)

export const updateGroupRow = (id, fields) => supabase.from('drug_groups').update(fields).eq('id', id)

export const deleteGroupRow = (id) => supabase.from('drug_groups').delete().eq('id', id)

// ── Drugs in a group ──────────────────────────────────────────────────────
export const deleteGroupItems = (groupId, brandIds) => supabase
  .from('drug_group_items').delete().eq('group_id', groupId).in('brand_id', brandIds)

export const insertGroupItems = (rows) => supabase.from('drug_group_items').insert(rows)

// ── Share links and share names ───────────────────────────────────────────
export const queryShareOfGroup = (groupId) => supabase
  .from('drug_group_shares')
  .select('share_code, show_name, on_profile')
  .eq('group_id', groupId)
  .maybeSingle()

export const queryOwnShareNameInfo = (userId) => supabase
  .from('profiles')
  .select('full_name, share_name_default, handle')
  .eq('id', userId)
  .maybeSingle()

export const updateShareShowName = (groupId, show) => supabase
  .from('drug_group_shares')
  .update({ show_name: show })
  .eq('group_id', groupId)

export const updateAccountShareNameDefault = (userId, show) => supabase
  .from('profiles')
  .update({ share_name_default: show })
  .eq('id', userId)

export const insertShareLinkReturning = (row) => supabase
  .from('drug_group_shares')
  .insert(row)
  .select('share_code')
  .single()

export const updateShareOnProfile = (groupId) => supabase
  .from('drug_group_shares')
  .update({ on_profile: true })
  .eq('group_id', groupId)
  .select('group_id')

export const deleteShareOfGroup = (groupId) => supabase.from('drug_group_shares').delete().eq('group_id', groupId)
