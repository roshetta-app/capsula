/**
 * src/hooks/useDrugGroups.js
 *
 * 2026-10-18 (Drug groups plan, steps 3.3 and 3.4): keeps the signed-in
 * person's drug groups. Same house rules as useFavouriteClasses.
 *
 * Covers: load, create, edit (rename, description, colour) and delete a
 * group, drugs in a group, sharing, and saving a copy of a shared group
 * (2026-10-19, step 8.3).
 *
 * Rules:
 *  - A guest tap saves nothing: it asks to sign in (promptSignIn) and the
 *    mutator answers { ok: false, reason: 'guest' }.
 *  - Offline: the saved copy (utils/cache.js, store 'drug-groups') shows
 *    instead of the live list. Changing anything while offline shows
 *    "You're offline. Reconnect to change your groups." and answers
 *    reason 'offline'.
 *  - Limits (constants/features.js) are checked here and in the database.
 *    Reaching one answers reason 'limit'. The screens decide when to show
 *    it, by calling showGroupLimit (2026-10-19, step 7.1): a free account
 *    gets the limit sheet, a Pro account gets a short message.
 *  - Lapsed account (not Pro and over the free limits): isReadOnly is true.
 *    Everything except delete answers reason 'read_only'. Mirrors the
 *    database function dg_is_read_only (plan section 6.1).
 *  - A write that fails is undone on screen with a short message.
 *
 * Takes the object returned by useFavourites (for the sign-in prompt and the
 * pending tap), so it is created once, inside FavouritesProvider, and read
 * with useFavouritesContext().
 *
 * Returns:
 *   groups          { id, name, description, color, createdAt, brandIds }[]  newest first
 *   groupsStatus    'loading' | 'ready' | 'error'
 *   groupsFromCache true while the list shown is the saved copy
 *   groupsLoadError true when the last refresh failed (with a saved copy still shown)
 *   isReadOnly      boolean
 *   canCreateGroup  boolean (false when at the limit or read only)
 *   reloadGroups    () => Promise<void>
 *   createGroup     ({ name, description?, color? }) => Promise<{ ok, reason?, group? }>
 *   updateGroup     (id, { name?, description?, color? }) => Promise<{ ok, reason? }>
 *   deleteGroup     (id) => Promise<{ ok, reason?, group?, index? }>
 *   getShareCode    (groupId) => Promise<{ ok, code?, reason? }>   (2026-10-19, step 8.1)
 *                   Reads this group's live share code (null when not shared).
 *   createShareLink (groupId) => Promise<{ ok, code?, reason? }>
 *                   Makes the share link (the database makes the code); if one
 *                   already exists it returns that one.
 *   stopSharing     (groupId) => Promise<{ ok, reason? }>   Deletes the code, so the link stops at once.
 *   groupLimit      { open, kind }  the limit sheet state ('groups' | 'drugs'), read by SignInNudge
 *   showGroupLimit  (kind) => void  free: opens the limit sheet; Pro: shows the short message
 *   dismissGroupLimit () => void
 *   saveSharedGroup ({ name, description, color, brandIds, signInId }) =>
 *                   Promise<{ ok, reason?, group?, saved?, total? }>   (2026-10-19, step 8.3)
 *                   Makes the viewer's own copy of a shared group: a new group
 *                   (new id, not linked to the original, no share link, nothing
 *                   about the owner) with the drugs in the order given. A free
 *                   account keeps the first 20, Pro the first 50; saved/total
 *                   tell the screen when some were left out. If the drugs fail
 *                   to save the new group is removed again. Reasons: guest,
 *                   offline, read_only, limit, invalid, error.
 *   restoreGroup    (group) => Promise<{ ok, reason? }>   (2026-10-19, step 4.4)
 *                   Puts a just-deleted group back (same id, name, description,
 *                   colour, created date and drugs). The Undo of Delete group.
 *   setGroupDrugs   (id, brandIds) => Promise<{ ok, reason? }>   (2026-10-19, step 4.2)
 *                   Makes the group hold exactly these brand ids: adds the new
 *                   ones and removes the missing ones in one go. The editor
 *                   keeps its drugs as a draft and calls this on Save.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useIsPro } from './useIsPro'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { logUsageEvent } from '../analytics/usageEvents'
import { readGroupsCache, writeGroupsCache, clearGroupsCache } from '../utils/cache'
import { groupsLimitMessage, drugsLimitMessage, SAVE_OFFLINE_MESSAGE } from '../components/drugs/groups/groupMessages'
import {
  DRUG_GROUPS_CAP_FREE,
  DRUG_GROUP_DRUGS_CAP_FREE,
  DRUG_GROUPS_CAP_PRO,
  DRUG_GROUP_DRUGS_CAP_PRO,
} from '../constants/features'

export const GROUP_NAME_MAX = 40
export const GROUP_DESCRIPTION_MAX = 200
export const GROUP_COLORS = ['blue', 'teal', 'violet', 'amber', 'rose']

const OFFLINE_MESSAGE = "You're offline. Reconnect to change your groups."

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

function mapGroupRow(r) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    color: r.color,
    createdAt: r.created_at,
    brandIds: (r.drug_group_items ?? []).map(i => i.brand_id),
  }
}

// Newest first, the default order. The screens sort again for "A to Z".
function newestFirst(list) {
  return list.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
}

export function useDrugGroups(fav) {
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { toast } = useToast()
  const { pendingFavourite, dismissPendingFavourite, promptSignIn } = fav

  const [groups, setGroups] = useState([])
  const [groupsStatus, setGroupsStatus] = useState('loading')
  const [groupsFromCache, setGroupsFromCache] = useState(false)
  const [groupsLoadError, setGroupsLoadError] = useState(false)

  // Limit sheet (step 7.1). The kind is kept after closing so the text stays put while it slides away.
  const [groupLimit, setGroupLimit] = useState({ open: false, kind: 'groups' })

  const groupsRef = useRef(groups)
  useEffect(() => { groupsRef.current = groups }, [groups])
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])

  // Same rule as the database function dg_is_read_only.
  const isReadOnly = !isPro && (
    groups.length > DRUG_GROUPS_CAP_FREE ||
    groups.some(g => g.brandIds.length > DRUG_GROUP_DRUGS_CAP_FREE)
  )
  const groupCap = isPro ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
  const canCreateGroup = !isReadOnly && groups.length < groupCap

  // ── Load ──────────────────────────────────────────────────────────────────
  // shownFromCacheRef: true while the list on screen is the saved copy, so a
  // failed refresh keeps it instead of emptying the screen.
  const shownFromCacheRef = useRef(false)
  const loadSeqRef = useRef(0)

  const loadGroups = useCallback(async (u) => {
    const seq = ++loadSeqRef.current
    const stale = () => seq !== loadSeqRef.current || userRef.current?.id !== u.id

    // 1. Saved copy first, so something shows at once (and offline).
    const cached = await readGroupsCache(u.id)
    if (stale()) return
    if (cached && Array.isArray(cached.data)) {
      shownFromCacheRef.current = true
      setGroups(cached.data)
      setGroupsFromCache(true)
      setGroupsStatus('ready')
    } else {
      shownFromCacheRef.current = false
      setGroups([])
      setGroupsFromCache(false)
      setGroupsStatus('loading')
    }

    // 2. Offline: stay on the saved copy (or fail if there is none).
    if (isOffline()) {
      setGroupsLoadError(!!cached)
      if (!cached) setGroupsStatus('error')
      return
    }

    // 3. Live list.
    const { data, error } = await supabase
      .from('drug_groups')
      .select('id, name, description, color, created_at, drug_group_items(brand_id)')
      .order('created_at', { ascending: false })
    if (stale()) return

    if (error || !data) {
      setGroupsLoadError(!!cached)
      if (!cached) setGroupsStatus('error')
      return
    }
    shownFromCacheRef.current = false
    setGroups(newestFirst(data.map(mapGroupRow)))
    setGroupsFromCache(false)
    setGroupsLoadError(false)
    setGroupsStatus('ready')
  }, [])

  const reloadGroups = useCallback(async () => {
    const u = userRef.current
    if (!u) return
    setGroupsLoadError(false)
    await loadGroups(u)
  }, [loadGroups])

  // Load when someone signs in; empty everything (and the saved copy) when
  // they sign out. The copy is removed so a shared phone keeps nothing.
  const lastUserIdRef = useRef(null)
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const previousId = lastUserIdRef.current
      lastUserIdRef.current = null
      loadSeqRef.current++
      shownFromCacheRef.current = false
      setGroups([])
      setGroupsFromCache(false)
      setGroupsLoadError(false)
      setGroupsStatus('ready')
      if (previousId) clearGroupsCache(previousId)
      return
    }
    lastUserIdRef.current = user.id
    loadGroups(user)
  }, [user, authLoading, loadGroups])

  // Come back online with only the saved copy on screen: refresh it.
  useEffect(() => {
    function onOnline() {
      if (userRef.current && (shownFromCacheRef.current || groupsStatus === 'error')) {
        loadGroups(userRef.current)
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [loadGroups, groupsStatus])

  // Keep the saved copy in step with the live list.
  useEffect(() => {
    if (!user || groupsStatus !== 'ready' || groupsFromCache) return
    writeGroupsCache(user.id, groups)
  }, [user, groups, groupsStatus, groupsFromCache])

  // A guest "New group" tap that triggered sign-in is only a request to sign
  // in. Once the account's groups are loaded the request is done; the screen
  // opens the editor itself (Phase 4).
  useEffect(() => {
    if (!user || authLoading) return
    if (!pendingFavourite || pendingFavourite.type !== 'groups') return
    if (groupsStatus === 'loading') return
    dismissPendingFavourite()
  }, [user, authLoading, pendingFavourite, groupsStatus, dismissPendingFavourite])

  // ── Guards shared by every change ─────────────────────────────────────────
  // Returns a refusal ({ ok: false, reason }) or null when the change may go on.
  // signInId: what the sign-in prompt remembers ('new' by default; the shared
  // page passes its own). offlineMessage: the wording for the offline refusal.
  const refuseChange = useCallback(({ needsEditable = true, signInId = 'new', offlineMessage = OFFLINE_MESSAGE } = {}) => {
    if (!userRef.current) {
      promptSignIn('groups', signInId)
      return { ok: false, reason: 'guest' }
    }
    if (isOffline()) {
      toast.info(offlineMessage)
      return { ok: false, reason: 'offline' }
    }
    if (shownFromCacheRef.current) {
      // Only the saved copy is on screen, so we do not know the real list.
      toast.info(offlineMessage)
      return { ok: false, reason: 'offline' }
    }
    if (needsEditable && isReadOnlyNow()) return { ok: false, reason: 'read_only' }
    return null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptSignIn, toast])

  function isReadOnlyNow() {
    const list = groupsRef.current
    return !isProRef.current && (
      list.length > DRUG_GROUPS_CAP_FREE ||
      list.some(g => g.brandIds.length > DRUG_GROUP_DRUGS_CAP_FREE)
    )
  }

  function cleanFields({ name, description, color }, { requireName }) {
    const out = {}
    if (name !== undefined || requireName) {
      const n = String(name ?? '').trim()
      if (!n || n.length > GROUP_NAME_MAX) return null
      out.name = n
    }
    if (description !== undefined) {
      const d = String(description ?? '').trim()
      if (d.length > GROUP_DESCRIPTION_MAX) return null
      out.description = d
    }
    if (color !== undefined) {
      if (!GROUP_COLORS.includes(color)) return null
      out.color = color
    }
    return out
  }

  // ── Create ────────────────────────────────────────────────────────────────
  const createGroup = useCallback(async ({ name, description = '', color = 'blue' } = {}) => {
    const refused = refuseChange()
    if (refused) return refused
    const cap = isProRef.current ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
    if (groupsRef.current.length >= cap) return { ok: false, reason: 'limit' }

    const fields = cleanFields({ name, description, color }, { requireName: true })
    if (!fields) return { ok: false, reason: 'invalid' }

    const { data, error } = await supabase
      .from('drug_groups')
      .insert(fields)
      .select('id, name, description, color, created_at')
      .single()

    if (error || !data) {
      if (String(error?.message ?? '').includes('drug_group_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not create the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    const group = mapGroupRow({ ...data, drug_group_items: [] })
    setGroups(prev => newestFirst([group, ...prev]))
    // Analytics (step 9.5): the group id only, never its name or description.
    logUsageEvent('group_create', group.id)
    return { ok: true, group }
  }, [refuseChange, toast])

  // ── Edit ──────────────────────────────────────────────────────────────────
  const updateGroup = useCallback(async (id, changes = {}) => {
    const refused = refuseChange()
    if (refused) return refused
    const before = groupsRef.current.find(g => g.id === id)
    if (!before) return { ok: false, reason: 'missing' }

    const fields = cleanFields(changes, { requireName: false })
    if (!fields) return { ok: false, reason: 'invalid' }

    const patch = {}
    if (fields.name !== undefined) patch.name = fields.name
    if (fields.description !== undefined) patch.description = fields.description
    if (fields.color !== undefined) patch.color = fields.color
    setGroups(prev => prev.map(g => (g.id === id ? { ...g, ...patch } : g)))

    const { error } = await supabase.from('drug_groups').update(fields).eq('id', id)
    if (error) {
      setGroups(prev => prev.map(g => (g.id === id ? { ...g, name: before.name, description: before.description, color: before.color } : g)))
      toast.error('Could not save the changes. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    return { ok: true }
  }, [refuseChange, toast])

  // ── Delete ────────────────────────────────────────────────────────────────
  // Always allowed for the signed-in owner, even when read only (decision 6).
  const deleteGroup = useCallback(async (id) => {
    const refused = refuseChange({ needsEditable: false })
    if (refused) return refused
    const list = groupsRef.current
    const index = list.findIndex(g => g.id === id)
    if (index < 0) return { ok: false, reason: 'missing' }
    const group = list[index]

    setGroups(list.filter(g => g.id !== id))
    const { error } = await supabase.from('drug_groups').delete().eq('id', id)
    if (error) {
      setGroups(prev => (prev.some(g => g.id === id) ? prev : newestFirst([...prev, group])))
      toast.error('Could not delete the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    return { ok: true, group, index }
  }, [refuseChange, toast])

  // ── Drugs in a group ──────────────────────────────────────────────────────
  // 2026-10-19 (step 4.2). Sets the whole list in one call: rows for the new
  // brand ids are added, rows for the dropped ones are removed. On a failed
  // write the screen goes back to what it showed and the groups are loaded
  // again from the server, because a remove can succeed while the add after
  // it fails.
  const setGroupDrugs = useCallback(async (id, brandIds = []) => {
    const refused = refuseChange()
    if (refused) return refused
    const before = groupsRef.current.find(g => g.id === id)
    if (!before) return { ok: false, reason: 'missing' }

    const next = Array.from(new Set(brandIds))
    const cap = isProRef.current ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE
    if (next.length > cap) return { ok: false, reason: 'limit' }

    const had = new Set(before.brandIds)
    const wants = new Set(next)
    const toAdd = next.filter(b => !had.has(b))
    const toRemove = before.brandIds.filter(b => !wants.has(b))
    if (toAdd.length === 0 && toRemove.length === 0) return { ok: true }

    setGroups(prev => prev.map(g => (g.id === id ? { ...g, brandIds: next } : g)))

    let error = null
    if (toRemove.length > 0) {
      const res = await supabase
        .from('drug_group_items').delete().eq('group_id', id).in('brand_id', toRemove)
      error = res.error
    }
    if (!error && toAdd.length > 0) {
      const res = await supabase
        .from('drug_group_items').insert(toAdd.map(brand_id => ({ group_id: id, brand_id })))
      error = res.error
    }

    if (error) {
      setGroups(prev => prev.map(g => (g.id === id ? { ...g, brandIds: before.brandIds } : g)))
      reloadGroups()
      if (String(error.message ?? '').includes('drug_group_items_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not save the drugs. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    // Analytics (step 9.5): one event per drug added, after the save worked.
    // The drug's id only, no names. Removing a drug logs nothing.
    toAdd.forEach(brandId => logUsageEvent('group_drug_add', brandId))
    return { ok: true }
  }, [refuseChange, reloadGroups, toast])

  // ── Undo a delete ─────────────────────────────────────────────────────────
  // 2026-10-19 (step 4.4). Puts the group back exactly as it was (same id and
  // created date, so it returns to its place in the newest-first order), then
  // its drugs. Not optimistic: the list changes once the server has the group.
  // If the drugs fail to go back, the group row is removed again so no
  // half-restored group is left behind. A share link is not restored.
  const restoreGroup = useCallback(async (group) => {
    const refused = refuseChange()
    if (refused) return refused
    if (!group?.id) return { ok: false, reason: 'missing' }
    if (groupsRef.current.some(g => g.id === group.id)) return { ok: true }
    const cap = isProRef.current ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
    if (groupsRef.current.length >= cap) return { ok: false, reason: 'limit' }

    const { error } = await supabase.from('drug_groups').insert({
      id: group.id,
      name: group.name,
      description: group.description ?? '',
      color: group.color,
      created_at: group.createdAt,
    })
    if (error) {
      if (String(error.message ?? '').includes('drug_group_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not restore the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }

    if (group.brandIds?.length > 0) {
      const { error: itemsError } = await supabase
        .from('drug_group_items')
        .insert(group.brandIds.map(brand_id => ({ group_id: group.id, brand_id })))
      if (itemsError) {
        await supabase.from('drug_groups').delete().eq('id', group.id)
        toast.error('Could not restore the group. Check your connection and try again.')
        return { ok: false, reason: 'error' }
      }
    }

    setGroups(prev => newestFirst([group, ...prev.filter(g => g.id !== group.id)]))
    return { ok: true }
  }, [refuseChange, toast])

  // ── Save a copy of a shared group (step 8.3) ──────────────────────────────
  // Not optimistic: the list changes once the server has the group and its
  // drugs. A free account keeps the first 20 drugs in the order given (the
  // shared page lists them A to Z), Pro the first 50. The copy is an ordinary
  // group: new id, no share link, and the shared page never carries the owner.
  // If the drugs fail to save, the new group row is removed again.
  const saveSharedGroup = useCallback(async ({ name, description = '', color = 'blue', brandIds = [], signInId } = {}) => {
    const refused = refuseChange({ signInId, offlineMessage: SAVE_OFFLINE_MESSAGE })
    if (refused) return refused
    const groupCap = isProRef.current ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
    if (groupsRef.current.length >= groupCap) return { ok: false, reason: 'limit' }

    const fields = cleanFields({ name, description, color }, { requireName: true })
    if (!fields) return { ok: false, reason: 'invalid' }

    const all = Array.from(new Set(brandIds))
    const drugCap = isProRef.current ? DRUG_GROUP_DRUGS_CAP_PRO : DRUG_GROUP_DRUGS_CAP_FREE
    const kept = all.slice(0, drugCap)

    const { data, error } = await supabase
      .from('drug_groups')
      .insert(fields)
      .select('id, name, description, color, created_at')
      .single()
    if (error || !data) {
      if (String(error?.message ?? '').includes('drug_group_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not save the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }

    if (kept.length > 0) {
      const { error: itemsError } = await supabase
        .from('drug_group_items')
        .insert(kept.map(brand_id => ({ group_id: data.id, brand_id })))
      if (itemsError) {
        await supabase.from('drug_groups').delete().eq('id', data.id)
        toast.error('Could not save the group. Check your connection and try again.')
        return { ok: false, reason: 'error' }
      }
    }

    const group = mapGroupRow({ ...data, drug_group_items: kept.map(brand_id => ({ brand_id })) })
    setGroups(prev => newestFirst([group, ...prev]))
    // Analytics (step 9.5): the new copy's id only; nothing about the link or the owner.
    logUsageEvent('shared_group_save', group.id)
    return { ok: true, group, saved: kept.length, total: all.length }
  }, [refuseChange, toast])

  // ── Sharing (step 8.1) ────────────────────────────────────────────────────
  // The share code lives only in drug_group_shares (not in the group list), so
  // a phone never keeps a stale copy of it. Offline answers reason 'offline'
  // without a toast; the share sheet shows its own line.
  const getShareCode = useCallback(async (groupId) => {
    if (!userRef.current) return { ok: false, reason: 'guest' }
    if (isOffline()) return { ok: false, reason: 'offline' }
    const { data, error } = await supabase
      .from('drug_group_shares')
      .select('share_code')
      .eq('group_id', groupId)
      .maybeSingle()
    if (error) return { ok: false, reason: 'error' }
    return { ok: true, code: data?.share_code ?? null }
  }, [])

  const createShareLink = useCallback(async (groupId) => {
    if (userRef.current && isOffline()) return { ok: false, reason: 'offline' }
    const refused = refuseChange()
    if (refused) return refused
    if (!groupsRef.current.some(g => g.id === groupId)) return { ok: false, reason: 'missing' }
    const { data, error } = await supabase
      .from('drug_group_shares')
      .insert({ group_id: groupId })
      .select('share_code')
      .single()
    if (!error && data?.share_code) {
      // Analytics (step 9.5): only a link that was really made now, not one found again.
      logUsageEvent('group_share_create', groupId)
      return { ok: true, code: data.share_code }
    }
    if (error?.code === '23505') {
      // Already shared (another device, or a double tap): use the live code.
      const existing = await getShareCode(groupId)
      if (existing.ok && existing.code) return { ok: true, code: existing.code }
    }
    toast.error("Couldn't create the link. Check your connection and try again.")
    return { ok: false, reason: 'error' }
  }, [refuseChange, getShareCode, toast])

  const stopSharing = useCallback(async (groupId) => {
    if (userRef.current && isOffline()) return { ok: false, reason: 'offline' }
    const refused = refuseChange()
    if (refused) return refused
    const { error } = await supabase.from('drug_group_shares').delete().eq('group_id', groupId)
    if (error) return { ok: false, reason: 'error' }
    return { ok: true }
  }, [refuseChange])

  const showGroupLimit = useCallback((kind) => {
    // Analytics (step 9.5): every limit hit goes through here, so it is logged
    // once, here. Only a fixed label (free_groups, free_drugs, pro_groups, pro_drugs).
    logUsageEvent('group_limit_hit', null, `${isProRef.current ? 'pro' : 'free'}_${kind === 'drugs' ? 'drugs' : 'groups'}`)
    if (isProRef.current) {
      toast.info(kind === 'drugs' ? drugsLimitMessage(true) : groupsLimitMessage(true))
      return
    }
    setGroupLimit({ open: true, kind: kind === 'drugs' ? 'drugs' : 'groups' })
  }, [toast])

  const dismissGroupLimit = useCallback(() => {
    setGroupLimit(g => ({ ...g, open: false }))
  }, [])

  return {
    groups,
    groupsStatus,
    groupsFromCache,
    groupsLoadError,
    isReadOnly,
    canCreateGroup,
    reloadGroups,
    createGroup,
    updateGroup,
    deleteGroup,
    setGroupDrugs,
    restoreGroup,
    saveSharedGroup,
    getShareCode,
    createShareLink,
    stopSharing,
    groupLimit,
    showGroupLimit,
    dismissGroupLimit,
  }
}
