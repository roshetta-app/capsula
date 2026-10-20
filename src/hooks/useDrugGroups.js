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
 *  - Offline (step 17.1): decided by the app's shared online signal, and any request
 *    that takes longer than 8 seconds counts as offline too, so a Wi-Fi with no
 *    internet behaves like airplane mode.
 *  - Offline: the saved copy (utils/cache.js, store 'drug-groups') shows
 *    instead of the live list.
 *  - Local first (2026-10-20, step 17.2b): create, edit, delete, undo of a
 *    delete and the drugs in a group work offline. The change shows at once and
 *    is saved on a list of waiting changes on the phone (utils/groupChanges.js,
 *    stored by utils/cache.js), and the answer is { ok: true, queued: true }.
 *    The same happens when a request times out, and while changes are already
 *    waiting (new ones join the list so the order is kept). The list is laid
 *    over the saved or live groups every time they load.
 *  - Sync (2026-10-20, step 17.3): the waiting changes are sent one at a time,
 *    in order (utils/groupSync.js), when the phone comes back online, when the
 *    app returns to the screen, right after a change is queued while online,
 *    after the groups load, and every 30 seconds. Two runs never overlap. No
 *    answer means stop and try later; a server refusal marks that change failed
 *    (it is not sent again, and later changes to the same group wait behind it).
 *  - Conflicts and refusals (2026-10-20, step 17.4, plan section 21.3): a name
 *    taken elsewhere is saved with a number and the person is told; a group
 *    deleted on another device, a full group list, a full group and a lapsed plan
 *    drop what cannot be saved and say so in plain words; any other refusal
 *    stays as a failed change (failedCount) until retryFailedChanges() or
 *    discardFailedChanges(). The screens for them come in step 17.6.
 *    Sharing, saving a shared group and the share links still need internet and
 *    keep the offline message.
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
 *   waitingCount    number of changes saved on the phone and not yet sent (step 17.6)
 *   waitingGroupIds ids of the groups that have unsent changes (the small mark on a group)
 *   syncState       'idle' | 'syncing' | 'saved' ('saved' shows for 3 seconds after a send)
 *   failedCount     number of waiting changes the server refused (step 17.4)
 *   failedList      those changes, oldest first (step 17.6b), for the "could not be saved" sheet
 *   retryFailedChanges    () => void   tries the failed changes again
 *   discardFailedChanges  () => void   drops the failed changes and shows the server's groups
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
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { logUsageEvent } from '../analytics/usageEvents'
import { readGroupsCache, writeGroupsCache, clearGroupsCache, readGroupChanges, writeGroupChanges } from '../utils/cache'
import { newId, makeChange, applyChange, applyQueue, addChange, cancelDelete, clearSending, nextToSend, summarizeQueue, retryFailed, discardFailed } from '../utils/groupChanges'
import { runSync, sendChange, describeEvents } from '../utils/groupSync'
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

// ── Reliable offline detection (2026-10-20, Drug groups plan step 17.1) ──────
// The groups used the phone's raw online flag, which says "online" on a Wi-Fi
// with no internet, so a request then hung with no end. Now:
//  1. The hook copies the app's shared online signal (it confirms real
//     reachability, see OnlineStatusContext) into appOnline below, and
//     isOffline() reads that as well as the raw flag.
//  2. Every request has a time limit (REQUEST_TIMEOUT_MS). A request that
//     takes longer is treated exactly like being offline.
const REQUEST_TIMEOUT_MS = 8000
let appOnline = true

function isOffline() {
  return appOnline === false || (typeof navigator !== 'undefined' && navigator.onLine === false)
}

const TIMEOUT_ERROR = { code: 'request_timeout', message: 'request_timeout' }

function isTimeout(error) {
  return error?.code === 'request_timeout'
}

// Wraps one Supabase request. Always resolves with { data, error }: the real
// answer, or a timeout error when the answer takes longer than the limit.
function withLimit(request) {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve({ data: null, error: TIMEOUT_ERROR }), REQUEST_TIMEOUT_MS)
    Promise.resolve(request).then(
      res => { clearTimeout(timer); resolve(res) },
      err => { clearTimeout(timer); resolve({ data: null, error: err ?? TIMEOUT_ERROR }) },
    )
  })
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

// ── Unique group names (2026-10-20, Drug groups plan step 13.5) ──────────────
// Two groups of one person may not share a name, ignoring capitals and spaces at
// the ends. The database enforces it with the index drug_groups_user_name_unique;
// these helpers let the app check first and give a clear message.
export const NAME_TAKEN_MESSAGE = 'You already have a group with this name.'

export function groupNameKey(name) {
  return String(name ?? '').trim().toLowerCase()
}

function nameTakenIn(list, name, exceptId = null) {
  const key = groupNameKey(name)
  return list.some(g => g.id !== exceptId && groupNameKey(g.name) === key)
}

// The name itself when it is free, otherwise the name with a number, for
// example "HPB (2)", cut so the result still fits the 40 character limit.
function numberedNameIn(list, base) {
  if (!nameTakenIn(list, base)) return base
  for (let n = 2; n < 1000; n += 1) {
    const suffix = ` (${n})`
    const candidate = base.slice(0, GROUP_NAME_MAX - suffix.length).trimEnd() + suffix
    if (!nameTakenIn(list, candidate)) return candidate
  }
  return base
}

// The database refused a duplicate name (two phones saving the same name at once).
function isNameClash(error) {
  return error?.code === '23505' && String(error?.message ?? '').includes('drug_groups_user_name_unique')
}

export function useDrugGroups(fav) {
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { toast } = useToast()
  const { pendingFavourite, dismissPendingFavourite, promptSignIn } = fav
  const { isOnline } = useOnlineStatus()

  const [groups, setGroups] = useState([])
  const [groupsStatus, setGroupsStatus] = useState('loading')
  const [groupsFromCache, setGroupsFromCache] = useState(false)
  const [groupsLoadError, setGroupsLoadError] = useState(false)
  const [failedCount, setFailedCount] = useState(0)
  const [waitingCount, setWaitingCount] = useState(0)
  const [failedList, setFailedList] = useState([])
  const [waitingGroupIds, setWaitingGroupIds] = useState([])
  const [syncState, setSyncState] = useState('idle')
  const savedTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(savedTimerRef.current), [])

  // Tells the screens what is waiting (step 17.6). Keeps the same list object
  // when nothing changed, so screens do not redraw for nothing.
  const applySummary = useCallback((queue) => {
    const s = summarizeQueue(queue)
    setFailedCount(s.failed)
    setFailedList(prev => (prev.length === s.failedList.length && prev.every((c, i) => c.id === s.failedList[i].id) ? prev : s.failedList))
    setWaitingCount(s.waiting)
    setWaitingGroupIds(prev => (prev.length === s.ids.length && prev.every(id => s.ids.includes(id)) ? prev : s.ids))
  }, [])

  // Limit sheet (step 7.1). The kind is kept after closing so the text stays put while it slides away.
  const [groupLimit, setGroupLimit] = useState({ open: false, kind: 'groups' })

  const groupsRef = useRef(groups)
  useEffect(() => { groupsRef.current = groups }, [groups])
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])
  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  // Hand the app's shared online signal to isOffline() (step 17.1).
  useEffect(() => { appOnline = isOnline }, [isOnline])

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

  // ── Waiting changes (step 17.2b) ──────────────────────────────────────────
  // queueRef is the list of changes made on this phone that the server has not
  // taken yet (oldest first). queueUserRef says whose list it holds, so it is
  // read from storage once per sign-in. writeChainRef keeps the saves in order.
  const queueRef = useRef([])
  const queueUserRef = useRef(null)
  const writeChainRef = useRef(Promise.resolve(true))
  // Step 17.3: the latest syncQueue, so earlier functions can start a send, and
  // a flag so two runs never overlap.
  const syncRef = useRef(null)
  const syncingRef = useRef(false)

  const persistQueue = useCallback(() => {
    const u = userRef.current
    applySummary(queueRef.current)
    if (!u) return Promise.resolve(false)
    const run = () => writeGroupChanges(u.id, queueRef.current)
    writeChainRef.current = writeChainRef.current.then(run, run)
    return writeChainRef.current
  }, [applySummary])

  // Shows the new list at once and saves the waiting list. When the phone can
  // not save it, everything goes back and the person is told.
  const commitQueue = useCallback(async (nextQueue, nextGroups) => {
    const prevQueue = queueRef.current
    const prevGroups = groupsRef.current
    queueRef.current = nextQueue
    groupsRef.current = nextGroups
    setGroups(nextGroups)
    const saved = await persistQueue()
    if (!saved) {
      if (queueRef.current === nextQueue) {
        queueRef.current = prevQueue
        groupsRef.current = prevGroups
        setGroups(prevGroups)
      }
      toast.error("Couldn't save this change on your phone. Reconnect and try again.")
      return false
    }
    return true
  }, [persistQueue, toast])

  // Applies changes on the phone and puts them on the waiting list. true when saved.
  const queueChanges = useCallback((changes) => {
    let nextQueue = queueRef.current
    let nextGroups = groupsRef.current
    for (const c of changes) {
      nextQueue = addChange(nextQueue, c)
      nextGroups = applyChange(nextGroups, c)
    }
    return commitQueue(nextQueue, nextGroups).then(saved => {
      // Online and saved: send it now (step 17.3).
      if (saved && !isOffline()) syncRef.current?.()
      return saved
    })
  }, [commitQueue])

  // A change goes on the waiting list instead of straight to the server when
  // the phone is offline, only the saved copy is on screen, or changes are
  // already waiting (so the order is kept).
  function shouldQueue() {
    return isOffline() || shownFromCacheRef.current || queueRef.current.length > 0
  }

  const loadGroups = useCallback(async (u) => {
    const seq = ++loadSeqRef.current
    const stale = () => seq !== loadSeqRef.current || userRef.current?.id !== u.id

    // 0. The waiting changes (read once per sign-in; after that the copy in memory is the truth).
    if (queueUserRef.current !== u.id) {
      const waiting = await readGroupChanges(u.id)
      if (stale()) return
      // A change that was on its way when the app was closed is sent again
      // (sending twice is safe, see utils/groupSync.js).
      queueRef.current = clearSending(waiting)
      queueUserRef.current = u.id
      applySummary(queueRef.current)
    }
    const withWaiting = list => applyQueue(list, queueRef.current)

    // 1. Saved copy first, so something shows at once (and offline).
    const cached = await readGroupsCache(u.id)
    if (stale()) return
    if (cached && Array.isArray(cached.data)) {
      shownFromCacheRef.current = true
      setGroups(withWaiting(cached.data))
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
    const { data, error } = await withLimit(supabase
      .from('drug_groups')
      .select('id, name, description, color, created_at, drug_group_items(brand_id)')
      .order('created_at', { ascending: false }))
    if (stale()) return

    if (error || !data) {
      setGroupsLoadError(!!cached)
      if (!cached) setGroupsStatus('error')
      return
    }
    shownFromCacheRef.current = false
    setGroups(newestFirst(withWaiting(data.map(mapGroupRow))))
    setGroupsFromCache(false)
    setGroupsLoadError(false)
    setGroupsStatus('ready')
    // Changes may be waiting from an earlier offline session (step 17.3).
    syncRef.current?.()
  }, [applySummary])

  const reloadGroups = useCallback(async () => {
    const u = userRef.current
    if (!u) return
    setGroupsLoadError(false)
    await loadGroups(u)
  }, [loadGroups])

  // ── Sync (step 17.3) ──────────────────────────────────────────────────────
  // Puts a new list in place and saves it, but only for the person the run was
  // started for (a sign-out or another account in between changes nothing).
  const updateQueueFor = useCallback(async (uid, fn) => {
    if (userRef.current?.id !== uid) return
    queueRef.current = fn(queueRef.current)
    await persistQueue()
  }, [persistQueue])

  const syncQueue = useCallback(async () => {
    const u = userRef.current
    if (!u || syncingRef.current) return
    if (queueUserRef.current !== u.id) return // the saved list is not read yet
    if (isOffline() || !nextToSend(queueRef.current)) return

    syncingRef.current = true
    clearTimeout(savedTimerRef.current)
    setSyncState('syncing')
    let result
    try {
      result = await runSync({
        getQueue: () => queueRef.current,
        update: fn => updateQueueFor(u.id, fn),
        send: change => sendChange(supabase, change, withLimit),
        groupName: id => groupsRef.current.find(g => g.id === id)?.name ?? null,
        canRun: () => userRef.current?.id === u.id && !isOffline(),
        // Analytics: a change counts once, when the server newly takes it. The
        // group's or the drug's id only, as before.
        onSent: change => {
          if (change.type === 'create') logUsageEvent('group_create', change.groupId)
          else if (change.type === 'add_drug') logUsageEvent('group_drug_add', change.data?.brandId)
        },
      })
    } finally {
      syncingRef.current = false
      setSyncState('idle')
    }
    if (userRef.current?.id !== u.id) return
    // "All changes saved" shows for 3 seconds once everything has gone through.
    if (result.sent > 0 && result.failed === 0 && queueRef.current.length === 0) {
      setSyncState('saved')
      savedTimerRef.current = setTimeout(() => setSyncState('idle'), 3000)
    }

    // Tell the person in plain words (step 17.4): one message for the whole run.
    const { messages, severe } = describeEvents(result.events, result.failed)
    if (messages.length > 0) {
      const text = messages.join(' ')
      if (severe) toast.error(text, 7000)
      else toast.info(text, 6000)
    } else if (result.sent > 0) {
      toast.success('Your offline changes are saved.')
    }
    // Something reached the server or was settled: show the real list again.
    if (result.sent > 0 || result.failed > 0 || result.events.length > 0) loadGroups(u)
  }, [updateQueueFor, toast, loadGroups])

  // Retry and Discard for the changes the server refused (step 17.4). The
  // screens that offer them are step 17.6.
  const retryFailedChanges = useCallback(async () => {
    const u = userRef.current
    if (!u) return
    await updateQueueFor(u.id, retryFailed)
    syncRef.current?.()
  }, [updateQueueFor])

  const discardFailedChanges = useCallback(async () => {
    const u = userRef.current
    if (!u) return
    await updateQueueFor(u.id, discardFailed)
    loadGroups(u)
  }, [updateQueueFor, loadGroups])

  useEffect(() => { syncRef.current = syncQueue }, [syncQueue])

  // Back online, back on screen, and a gentle retry while changes are waiting.
  useEffect(() => {
    if (isOnline) syncRef.current?.()
  }, [isOnline])
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') syncRef.current?.()
    }
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => syncRef.current?.(), 30000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [])

  // Load when someone signs in; empty everything (and the saved copy) when
  // they sign out. The copy is removed so a shared phone keeps nothing.
  const lastUserIdRef = useRef(null)
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const previousId = lastUserIdRef.current
      lastUserIdRef.current = null
      loadSeqRef.current++
      queueRef.current = []
      queueUserRef.current = null
      applySummary([])
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
  }, [user, authLoading, loadGroups, applySummary])

  // Come back online with only the saved copy on screen: refresh it. Uses the
  // app's shared online signal (step 17.1), so it also fires when a Wi-Fi with
  // no internet gets its internet back, not only on the phone's own event.
  const groupsStatusRef = useRef(groupsStatus)
  useEffect(() => { groupsStatusRef.current = groupsStatus }, [groupsStatus])
  useEffect(() => {
    if (!isOnline) return
    if (userRef.current && (shownFromCacheRef.current || groupsStatusRef.current === 'error')) {
      loadGroups(userRef.current)
    }
  }, [isOnline, loadGroups])

  // A change that got no answer in time counts as offline. The screen already
  // went back to what it showed; the real list is loaded again in case the
  // change did reach the server after all.
  const timedOut = useCallback((message = OFFLINE_MESSAGE) => {
    toast.info(message)
    if (userRef.current) loadGroups(userRef.current)
    return { ok: false, reason: 'offline' }
  }, [toast, loadGroups])

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
  const refuseChange = useCallback(({ needsEditable = true, signInId = 'new', offlineMessage = OFFLINE_MESSAGE, allowOffline = false } = {}) => {
    if (!userRef.current) {
      promptSignIn('groups', signInId)
      return { ok: false, reason: 'guest' }
    }
    // allowOffline (step 17.2b): the change is saved on the phone and sent later.
    if (!allowOffline && isOffline()) {
      toast.info(offlineMessage)
      return { ok: false, reason: 'offline' }
    }
    if (!allowOffline && shownFromCacheRef.current) {
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
    const refused = refuseChange({ allowOffline: true })
    if (refused) return refused
    const cap = isProRef.current ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
    if (groupsRef.current.length >= cap) return { ok: false, reason: 'limit' }

    const fields = cleanFields({ name, description, color }, { requireName: true })
    if (!fields) return { ok: false, reason: 'invalid' }
    if (nameTakenIn(groupsRef.current, fields.name)) return { ok: false, reason: 'name_taken' }

    // The id is made here, so the group can be changed again before it reaches
    // the server, and sending it twice makes only one group (step 17.2b).
    const id = newId()
    const makeLocally = async () => {
      const change = makeChange('create', id, { ...fields, createdAt: new Date().toISOString() })
      if (!(await queueChanges([change]))) return { ok: false, reason: 'error' }
      return { ok: true, group: groupsRef.current.find(g => g.id === id), queued: true }
    }
    if (shouldQueue()) return makeLocally()

    const { data, error } = await withLimit(supabase
      .from('drug_groups')
      .insert({ id, ...fields })
      .select('id, name, description, color, created_at')
      .single())

    if (error || !data) {
      if (isTimeout(error)) {
        const local = await makeLocally()
        if (local.ok) return local
        return timedOut()
      }
      if (isNameClash(error)) return { ok: false, reason: 'name_taken' }
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
  }, [refuseChange, queueChanges, timedOut, toast])

  // ── Edit ──────────────────────────────────────────────────────────────────
  const updateGroup = useCallback(async (id, changes = {}) => {
    const refused = refuseChange({ allowOffline: true })
    if (refused) return refused
    const before = groupsRef.current.find(g => g.id === id)
    if (!before) return { ok: false, reason: 'missing' }

    const fields = cleanFields(changes, { requireName: false })
    if (!fields) return { ok: false, reason: 'invalid' }
    if (fields.name !== undefined && nameTakenIn(groupsRef.current, fields.name, id)) {
      return { ok: false, reason: 'name_taken' }
    }

    const patch = {}
    if (fields.name !== undefined) patch.name = fields.name
    if (fields.description !== undefined) patch.description = fields.description
    if (fields.color !== undefined) patch.color = fields.color
    const change = makeChange('update', id, patch)
    if (shouldQueue()) {
      return (await queueChanges([change])) ? { ok: true, queued: true } : { ok: false, reason: 'error' }
    }
    setGroups(prev => prev.map(g => (g.id === id ? { ...g, ...patch } : g)))

    const { error } = await withLimit(supabase.from('drug_groups').update(fields).eq('id', id))
    if (isTimeout(error) && await queueChanges([change])) return { ok: true, queued: true }
    if (error) {
      setGroups(prev => prev.map(g => (g.id === id ? { ...g, name: before.name, description: before.description, color: before.color } : g)))
      if (isTimeout(error)) return timedOut()
      if (isNameClash(error)) return { ok: false, reason: 'name_taken' }
      toast.error('Could not save the changes. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    return { ok: true }
  }, [refuseChange, queueChanges, timedOut, toast])

  // ── Delete ────────────────────────────────────────────────────────────────
  // Always allowed for the signed-in owner, even when read only (decision 6).
  const deleteGroup = useCallback(async (id) => {
    const refused = refuseChange({ needsEditable: false, allowOffline: true })
    if (refused) return refused
    const list = groupsRef.current
    const index = list.findIndex(g => g.id === id)
    if (index < 0) return { ok: false, reason: 'missing' }
    const group = list[index]

    const change = makeChange('delete', id)
    if (shouldQueue()) {
      if (!(await queueChanges([change]))) return { ok: false, reason: 'error' }
      return { ok: true, group, index, queued: true }
    }
    setGroups(list.filter(g => g.id !== id))
    const { error } = await withLimit(supabase.from('drug_groups').delete().eq('id', id))
    if (isTimeout(error) && await queueChanges([change])) return { ok: true, group, index, queued: true }
    if (error) {
      setGroups(prev => (prev.some(g => g.id === id) ? prev : newestFirst([...prev, group])))
      if (isTimeout(error)) return timedOut()
      toast.error('Could not delete the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }
    return { ok: true, group, index }
  }, [refuseChange, queueChanges, timedOut, toast])

  // ── Drugs in a group ──────────────────────────────────────────────────────
  // 2026-10-19 (step 4.2). Sets the whole list in one call: rows for the new
  // brand ids are added, rows for the dropped ones are removed. On a failed
  // write the screen goes back to what it showed and the groups are loaded
  // again from the server, because a remove can succeed while the add after
  // it fails.
  const setGroupDrugs = useCallback(async (id, brandIds = []) => {
    const refused = refuseChange({ allowOffline: true })
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

    // One waiting change per drug, never the whole list (step 17.2b).
    const changes = [
      ...toRemove.map(brandId => makeChange('remove_drug', id, { brandId })),
      ...toAdd.map(brandId => makeChange('add_drug', id, { brandId })),
    ]
    if (shouldQueue()) {
      return (await queueChanges(changes)) ? { ok: true, queued: true } : { ok: false, reason: 'error' }
    }

    setGroups(prev => prev.map(g => (g.id === id ? { ...g, brandIds: next } : g)))

    let error = null
    if (toRemove.length > 0) {
      const res = await withLimit(supabase
        .from('drug_group_items').delete().eq('group_id', id).in('brand_id', toRemove))
      error = res.error
    }
    if (!error && toAdd.length > 0) {
      const res = await withLimit(supabase
        .from('drug_group_items').insert(toAdd.map(brand_id => ({ group_id: id, brand_id }))))
      error = res.error
    }

    if (isTimeout(error) && await queueChanges(changes)) return { ok: true, queued: true }
    if (error) {
      setGroups(prev => prev.map(g => (g.id === id ? { ...g, brandIds: before.brandIds } : g)))
      reloadGroups()
      if (isTimeout(error)) {
        toast.info(OFFLINE_MESSAGE)
        return { ok: false, reason: 'offline' }
      }
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
  }, [refuseChange, queueChanges, reloadGroups, toast])

  // ── Undo a delete ─────────────────────────────────────────────────────────
  // 2026-10-19 (step 4.4). Puts the group back exactly as it was (same id and
  // created date, so it returns to its place in the newest-first order), then
  // its drugs. Not optimistic: the list changes once the server has the group.
  // If the drugs fail to go back, the group row is removed again so no
  // half-restored group is left behind. A share link is not restored.
  const restoreGroup = useCallback(async (group) => {
    const refused = refuseChange({ allowOffline: true })
    if (refused) return refused
    if (!group?.id) return { ok: false, reason: 'missing' }
    if (groupsRef.current.some(g => g.id === group.id)) return { ok: true }
    const cap = isProRef.current ? DRUG_GROUPS_CAP_PRO : DRUG_GROUPS_CAP_FREE
    if (groupsRef.current.length >= cap) return { ok: false, reason: 'limit' }

    // If the name was taken while the group was deleted, it comes back numbered.
    const restoredName = numberedNameIn(groupsRef.current, group.name)

    // On the phone (step 17.2b). If the delete is still waiting, Undo just takes
    // it off the list. Otherwise the group is made again with the same id,
    // details and drugs.
    const restoreLocally = () => {
      const { queue: without, cancelled } = cancelDelete(queueRef.current, group.id)
      let nextQueue = without
      let nextGroups = groupsRef.current
      if (cancelled) {
        nextGroups = newestFirst([{ ...group, name: restoredName }, ...nextGroups.filter(g => g.id !== group.id)])
        if (restoredName !== group.name) {
          nextQueue = addChange(nextQueue, makeChange('update', group.id, { name: restoredName }))
        }
      } else {
        const changes = [
          makeChange('create', group.id, {
            name: restoredName,
            description: group.description ?? '',
            color: group.color,
            createdAt: group.createdAt,
          }),
          ...(group.brandIds ?? []).map(brandId => makeChange('add_drug', group.id, { brandId })),
        ]
        for (const c of changes) {
          nextQueue = addChange(nextQueue, c)
          nextGroups = applyChange(nextGroups, c)
        }
      }
      return commitQueue(nextQueue, nextGroups)
    }
    if (shouldQueue()) {
      return (await restoreLocally()) ? { ok: true, queued: true } : { ok: false, reason: 'error' }
    }

    const { error } = await withLimit(supabase.from('drug_groups').insert({
      id: group.id,
      name: restoredName,
      description: group.description ?? '',
      color: group.color,
      created_at: group.createdAt,
    }))
    if (error) {
      if (isTimeout(error)) {
        if (await restoreLocally()) return { ok: true, queued: true }
        return timedOut()
      }
      if (String(error.message ?? '').includes('drug_group_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not restore the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }

    if (group.brandIds?.length > 0) {
      const { error: itemsError } = await withLimit(supabase
        .from('drug_group_items')
        .insert(group.brandIds.map(brand_id => ({ group_id: group.id, brand_id }))))
      if (itemsError) {
        await withLimit(supabase.from('drug_groups').delete().eq('id', group.id))
        toast.error('Could not restore the group. Check your connection and try again.')
        return { ok: false, reason: 'error' }
      }
    }

    const restored = restoredName === group.name ? group : { ...group, name: restoredName }
    setGroups(prev => newestFirst([restored, ...prev.filter(g => g.id !== group.id)]))
    return { ok: true }
  }, [refuseChange, commitQueue, timedOut, toast])

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

    // Not a name the person typed, so a taken name is not refused: the copy gets a
    // number ("HPB (2)"). If another phone takes that number first, try the next one.
    let copyName = numberedNameIn(groupsRef.current, fields.name)
    let data = null
    let error = null
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await withLimit(supabase
        .from('drug_groups')
        .insert({ ...fields, name: copyName })
        .select('id, name, description, color, created_at')
        .single())
      data = res.data
      error = res.error
      if (!isNameClash(error)) break
      copyName = numberedNameIn([...groupsRef.current, { id: null, name: copyName }], fields.name)
    }
    if (error || !data) {
      if (isTimeout(error)) return timedOut(SAVE_OFFLINE_MESSAGE)
      if (String(error?.message ?? '').includes('drug_group_limit_reached')) {
        return { ok: false, reason: 'limit' }
      }
      toast.error('Could not save the group. Check your connection and try again.')
      return { ok: false, reason: 'error' }
    }

    if (kept.length > 0) {
      const { error: itemsError } = await withLimit(supabase
        .from('drug_group_items')
        .insert(kept.map(brand_id => ({ group_id: data.id, brand_id }))))
      if (itemsError) {
        await withLimit(supabase.from('drug_groups').delete().eq('id', data.id))
        if (isTimeout(itemsError)) return timedOut(SAVE_OFFLINE_MESSAGE)
        toast.error('Could not save the group. Check your connection and try again.')
        return { ok: false, reason: 'error' }
      }
    }

    const group = mapGroupRow({ ...data, drug_group_items: kept.map(brand_id => ({ brand_id })) })
    setGroups(prev => newestFirst([group, ...prev]))
    // Analytics (step 9.5): the new copy's id only; nothing about the link or the owner.
    logUsageEvent('shared_group_save', group.id)
    return { ok: true, group, saved: kept.length, total: all.length }
  }, [refuseChange, timedOut, toast])

  // ── Sharing (step 8.1) ────────────────────────────────────────────────────
  // The share code lives only in drug_group_shares (not in the group list), so
  // a phone never keeps a stale copy of it. Offline answers reason 'offline'
  // without a toast; the share sheet shows its own line.
  const getShareCode = useCallback(async (groupId) => {
    if (!userRef.current) return { ok: false, reason: 'guest' }
    if (isOffline()) return { ok: false, reason: 'offline' }
    const { data, error } = await withLimit(supabase
      .from('drug_group_shares')
      .select('share_code')
      .eq('group_id', groupId)
      .maybeSingle())
    if (isTimeout(error)) return { ok: false, reason: 'offline' }
    if (error) return { ok: false, reason: 'error' }
    return { ok: true, code: data?.share_code ?? null }
  }, [])

  const createShareLink = useCallback(async (groupId) => {
    if (userRef.current && isOffline()) return { ok: false, reason: 'offline' }
    const refused = refuseChange()
    if (refused) return refused
    if (!groupsRef.current.some(g => g.id === groupId)) return { ok: false, reason: 'missing' }
    const { data, error } = await withLimit(supabase
      .from('drug_group_shares')
      .insert({ group_id: groupId })
      .select('share_code')
      .single())
    if (isTimeout(error)) return { ok: false, reason: 'offline' }
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
    const { error } = await withLimit(supabase.from('drug_group_shares').delete().eq('group_id', groupId))
    if (isTimeout(error)) return { ok: false, reason: 'offline' }
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
    waitingCount,
    waitingGroupIds,
    syncState,
    failedCount,
    failedList,
    retryFailedChanges,
    discardFailedChanges,
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
