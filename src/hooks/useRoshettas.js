/**
 * src/hooks/useRoshettas.js
 *
 * 2026-11-13 (Roshetta plan, steps 2.4a to 2.4c): keeps the signed-in
 * person's roshettas: load, create, save (the whole roshetta) and delete,
 * with the limits and read only rules. The hook is provided to the app in
 * step 2.4d. The rules live in plain files that are checked without a screen
 * (utils/roshettaLoad.js, roshettaEdit.js, roshettaLimits.js,
 * roshettaChanges.js, roshettaSync.js); this file only passes the real
 * database, saved copy, phone storage and online signal in.
 *
 * Rules:
 *  - A guest has no roshettas: status 'ready', an empty list and isGuest true.
 *    Nothing is set when someone signs out, it is worked out (viewFor).
 *  - The saved copy (utils/cache.js, store 'roshettas') shows first and is all
 *    there is offline. The live list replaces it. A refresh that fails keeps
 *    the copy and sets loadError. Any request that takes longer than 8 seconds
 *    counts as offline.
 *  - The waiting changes (changes made on the phone and not yet sent) are read
 *    once per sign-in and laid over every list shown. A change left marked
 *    'sending' by a closed app has the mark cleared here, before any sending.
 *  - When the phone comes back online with only the saved copy (or an error)
 *    on screen, the list is loaded again.
 *  - Signing out removes the saved copy, so a shared phone keeps nothing.
 *  - Offline first (step 2.4b): create, save and delete never go straight to
 *    the server. The change shows at once and is saved on the waiting list on
 *    the phone; the answer is { ok: true, queued: true }. If the phone cannot
 *    save it, it is undone on screen with a short message.
 *  - Sync: the waiting changes are sent one at a time, in order, when the phone
 *    comes back online, when the app returns to the screen, right after a change
 *    while online, after the list loads, and every 30 seconds. Two runs never
 *    overlap. No answer means stop and try later; a refusal is settled in plain
 *    words (a roshetta deleted on another device, a full list, too many drugs)
 *    or marked failed for Retry or Discard.
 *  - Limits (step 2.4c, utils/roshettaLimits.js, numbers in constants/features.js,
 *    also checked in the database): free 3 roshettas and 10 drugs in one, Pro 100
 *    and 30. Reaching one answers reason 'limit' (list full) or 'drug_limit'. The
 *    screens decide when to show the sheet, by calling showRoshettaLimit.
 *  - Lapsed account (not Pro and over the free limits): isReadOnly is true.
 *    Create and save answer reason 'read_only'; delete is always allowed. The
 *    screens call showRoshettaReadOnly.
 *  - When a send is refused for a limit or read only (also the roshetta limit a
 *    lapsed account gets for a create), the hook opens the same sheet itself and
 *    gives it the names of the roshettas that were not saved.
 *  - A guest's mutators answer { ok: false, reason: 'guest' } and save nothing
 *    (the screen asks to sign in).
 *
 * Returns:
 *   roshettas            { id, name, description, rows, createdAt, updatedAt }[]  newest changed first
 *   roshettasStatus      'loading' | 'ready' | 'error'
 *   roshettasFromCache   true while the list shown is the saved copy
 *   roshettasLoadError   true when the last refresh failed (with a saved copy still shown)
 *   isGuest              true when nobody is signed in
 *   reloadRoshettas      () => Promise<void>
 *   waitingCount         changes saved on the phone and not yet sent
 *   waitingRoshettaIds   ids of the roshettas with something waiting (the small mark)
 *   failedCount          waiting changes the server refused
 *   failedList           those changes, oldest first, for the "could not be saved" sheet
 *   syncState            'idle' | 'syncing' | 'saved' ('saved' shows for 3 seconds after a send)
 *   retryFailedChanges   () => Promise<void>   tries the failed changes again
 *   discardFailedChanges () => Promise<void>   drops them and shows the server's roshettas
 *   createRoshetta       ({ name, description?, rows? }) => Promise<{ ok, reason?, roshetta?, queued? }>
 *   saveRoshetta         (id, { name?, description?, rows? }) => Promise<{ ok, reason?, queued? }>
 *   deleteRoshetta       (id) => Promise<{ ok, reason?, roshetta?, index?, queued? }>
 *   reasons: guest, not_loaded, read_only, limit, drug_limit, invalid, missing, error
 *   getRoshettaShareCode (id) => Promise<{ ok, code?, reason? }>   (step 6.1b) the live share code, null when not shared
 *   createRoshettaShare  (id) => Promise<{ ok, code?, reason? }>    makes the link (the database makes the code)
 *   stopRoshettaSharing  (id) => Promise<{ ok, reason? }>           the link stops working at once
 *   share reasons: guest, offline, not_loaded, missing, not_sent (the roshetta is still waiting to be
 *   created on the server), read_only, refused, error. Sharing needs internet; nothing is queued.
 *   isReadOnly           boolean
 *   canCreateRoshetta    boolean (false when at the limit or read only)
 *   roshettaCap, roshettaDrugCap   the limits for this account (for "7 of 10 drugs")
 *   roshettaLimit        { open, kind, isPro, names }  the sheet state ('roshettas' | 'drugs' | 'readonly');
 *                        names: roshettas a send could not save (may be empty)
 *   showRoshettaLimit    (kind, names?) => void  opens the sheet (Free: with Upgrade; Pro: with OK)
 *   showRoshettaReadOnly () => void              opens the sheet with the read only message (not a limit hit)
 *   dismissRoshettaLimit () => void
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useIsPro } from './useIsPro'
import { useOnlineStatus } from './useOnlineStatus'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { logUsageEvent } from '../analytics/usageEvents'
import { readRoshettasCache, writeRoshettasCache, clearRoshettasCache, readRoshettaChanges, writeRoshettaChanges } from '../utils/cache'
import { loadRoshettas, fetchRoshettas, withTimeLimit, viewFor } from '../utils/roshettaLoad'
import { summarizeQueue, sameSummary, nextToSend, retryFailed, discardFailed } from '../utils/roshettaChanges'
import { runSync, sendChange } from '../utils/roshettaSync'
import { prepareCreate, prepareSave, prepareDelete, commitChange } from '../utils/roshettaEdit'
import { readShareCode, createShare, removeShare } from '../utils/roshettaShare'
import { isReadOnly as listIsReadOnly, canCreate, roshettaCap, roshettaDrugCap, tapRefusal, rowsRefusal, afterRun } from '../utils/roshettaLimits'

const NO_SUMMARY = { userId: null, failed: 0, waiting: 0, ids: [], failedList: [] }

export function useRoshettas() {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()
  const { toast } = useToast()
  const isPro = useIsPro()

  // The last state a load showed, with whose it is. Set by loads and changes only.
  const [loaded, setLoaded] = useState(null)
  const userId = user?.id ?? null
  const view = viewFor({ userId, authLoading, loaded })

  // What is waiting, with whose it is (so another person's is never shown).
  const [summaryState, setSummaryState] = useState(NO_SUMMARY)
  const summary = summaryState.userId === userId && userId ? summaryState : NO_SUMMARY
  const [syncState, setSyncState] = useState('idle')

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const onlineRef = useRef(isOnline)
  useEffect(() => { onlineRef.current = isOnline }, [isOnline])
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])
  const isOffline = useCallback(
    () => onlineRef.current === false || (typeof navigator !== 'undefined' && navigator.onLine === false),
    [],
  )

  // Limit sheet. The kind is kept after closing so the text stays put while it slides away.
  const [roshettaLimit, setRoshettaLimit] = useState({ open: false, kind: 'roshettas', isPro: false, names: [] })
  const showRoshettaLimit = useCallback((kind, names = []) => {
    const k = kind === 'drugs' ? 'drugs' : 'roshettas'
    // Analytics: every limit hit goes through here, so it is logged once, here.
    // Only a fixed label (free_roshettas, free_drugs, pro_roshettas, pro_drugs).
    logUsageEvent('roshetta_limit_hit', null, `${isProRef.current ? 'pro' : 'free'}_${k}`)
    setRoshettaLimit({ open: true, kind: k, isPro: !!isProRef.current, names })
  }, [])
  // A tap refused because the account is read only (lapsed). Same sheet, read only
  // wording. Not logged as a limit hit.
  const showRoshettaReadOnly = useCallback(() => {
    setRoshettaLimit({ open: true, kind: 'readonly', isPro: false, names: [] })
  }, [])
  const dismissRoshettaLimit = useCallback(() => {
    setRoshettaLimit(l => ({ ...l, open: false }))
  }, [])

  // Everything the changes work on, kept in one place so they build on each
  // other: whose it is, the waiting list (null until read), the list on screen,
  // and how the last load ended.
  const holderRef = useRef({ userId: null, queue: null, list: [], status: 'loading', fromCache: false, loadError: false })
  // A newer load makes an older one stale.
  const loadSeqRef = useRef(0)
  // True while only the saved copy (or an error) is on screen: coming back
  // online should load again.
  const needsRefreshRef = useRef(false)
  const syncRef = useRef(null)
  const syncingRef = useRef(false)
  const savedTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(savedTimerRef.current), [])
  const writeChainRef = useRef(Promise.resolve(true))

  // Tells the screens what is waiting; keeps the same object when nothing changed.
  const applySummary = useCallback((uid, queue) => {
    const s = { userId: uid, ...summarizeQueue(queue) }
    setSummaryState(prev => (prev.userId === uid && sameSummary(prev, s) ? prev : s))
  }, [])

  // Saves the waiting list on the phone, one write after another so the order holds.
  const persistQueue = useCallback(() => {
    const u = userRef.current
    const h = holderRef.current
    if (!u || h.userId !== u.id || !h.queue) return Promise.resolve(false)
    applySummary(u.id, h.queue)
    const run = () => writeRoshettaChanges(u.id, holderRef.current.queue)
    writeChainRef.current = writeChainRef.current.then(run, run)
    return writeChainRef.current
  }, [applySummary])

  const showList = useCallback((list) => {
    const h = holderRef.current
    setLoaded({ userId: h.userId, roshettas: list, status: h.status, fromCache: h.fromCache, loadError: h.loadError })
  }, [])

  // quiet: reload without flashing the older saved copy (after a send).
  const load = useCallback(async (u, { quiet = false } = {}) => {
    const seq = ++loadSeqRef.current
    const h0 = holderRef.current
    const out = await loadRoshettas({
      userId: u.id,
      queue: h0.userId === u.id ? h0.queue : null,
      readQueue: readRoshettaChanges,
      readCache: readRoshettasCache,
      fetchLive: () => fetchRoshettas(supabase, withTimeLimit),
      isOffline,
      isStale: () => seq !== loadSeqRef.current || userRef.current?.id !== u.id,
      getQueue: () => (holderRef.current.userId === u.id ? holderRef.current.queue : null),
      showCopy: !quiet,
      onQueue: list => {
        holderRef.current = { userId: u.id, queue: list, list: [], status: 'loading', fromCache: false, loadError: false }
        applySummary(u.id, list)
      },
      show: s => {
        needsRefreshRef.current = s.fromCache || s.status === 'error'
        Object.assign(holderRef.current, { userId: u.id, list: s.roshettas, status: s.status, fromCache: s.fromCache, loadError: s.loadError })
        setLoaded({ userId: u.id, ...s })
      },
    })
    // The live list is in: send whatever is waiting from an earlier session.
    if (!out.stale && out.live) syncRef.current?.()
  }, [isOffline, applySummary])

  // ── Sync ──────────────────────────────────────────────────────────────────
  // Puts a new waiting list in place and saves it, but only for the person the
  // run was started for.
  const updateQueueFor = useCallback(async (uid, fn) => {
    const h = holderRef.current
    if (userRef.current?.id !== uid || h.userId !== uid || !h.queue) return
    h.queue = fn(h.queue)
    await persistQueue()
  }, [persistQueue])

  const syncQueue = useCallback(async () => {
    const u = userRef.current
    const h = holderRef.current
    if (!u || syncingRef.current || h.userId !== u.id || !h.queue) return
    if (isOffline() || !nextToSend(h.queue)) return

    syncingRef.current = true
    clearTimeout(savedTimerRef.current)
    setSyncState('syncing')
    let result
    try {
      result = await runSync({
        getQueue: () => holderRef.current.queue,
        update: fn => updateQueueFor(u.id, fn),
        send: change => sendChange(supabase, change, withTimeLimit),
        roshettaName: id => holderRef.current.list.find(r => r.id === id)?.name ?? null,
        canRun: () => userRef.current?.id === u.id && !isOffline(),
        // Analytics: a roshetta counts once, when the server newly takes it. Its id only.
        onSent: change => { if (change.type === 'create') logUsageEvent('roshetta_create', change.roshettaId) },
      })
    } finally {
      syncingRef.current = false
      setSyncState('idle')
    }
    if (userRef.current?.id !== u.id) return
    // "All changes saved" shows for 3 seconds once everything has gone through.
    if (result.sent > 0 && result.failed === 0 && holderRef.current.queue.length === 0) {
      setSyncState('saved')
      savedTimerRef.current = setTimeout(() => setSyncState('idle'), 3000)
    }

    // Tell the person in plain words: one message for the whole run.
    // A refusal for a limit or read only opens the sheet; the rest is told in words.
    const { sheet, messages, severe, success } = afterRun(result)
    if (sheet) {
      if (sheet.kind === 'readonly') showRoshettaReadOnly()
      else showRoshettaLimit(sheet.kind, sheet.names)
    }
    if (messages.length > 0) {
      const text = messages.join(' ')
      if (severe) toast.error(text, 7000)
      else toast.info(text, 6000)
    } else if (success) {
      toast.success('Your offline changes are saved.')
    }
    // Something reached the server or was settled: show the real list again.
    if (result.sent > 0 || result.failed > 0 || result.events.length > 0) load(u, { quiet: true })
  }, [isOffline, updateQueueFor, toast, load, showRoshettaLimit, showRoshettaReadOnly])
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
    load(u, { quiet: true })
  }, [updateQueueFor, load])

  // ── Sign in and out ───────────────────────────────────────────────────────
  // Load when someone signs in; forget everything (and the saved copy) when
  // they sign out.
  const lastUserIdRef = useRef(null)
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const previousId = lastUserIdRef.current
      lastUserIdRef.current = null
      loadSeqRef.current++
      holderRef.current = { userId: null, queue: null, list: [], status: 'loading', fromCache: false, loadError: false }
      needsRefreshRef.current = false
      if (previousId) clearRoshettasCache(previousId)
      return
    }
    lastUserIdRef.current = user.id
    load(user)
  }, [user, authLoading, load])

  // Back online with only the saved copy on screen: refresh it.
  useEffect(() => {
    if (!isOnline) return
    if (userRef.current && needsRefreshRef.current) load(userRef.current)
  }, [isOnline, load])

  // Keep the saved copy in step with the live list.
  const { roshettas, status, fromCache } = view
  const readOnly = listIsReadOnly(roshettas, isPro)
  useEffect(() => {
    if (!userId || status !== 'ready' || fromCache) return
    writeRoshettasCache(userId, roshettas)
  }, [userId, roshettas, status, fromCache])

  const reloadRoshettas = useCallback(async () => {
    const u = userRef.current
    if (u) await load(u)
  }, [load])

  // ── Create, save, delete ──────────────────────────────────────────────────
  // A refusal ({ ok: false, reason }) or null when the change may go on.
  const refuseChange = useCallback(() => {
    const u = userRef.current
    if (!u) return { ok: false, reason: 'guest' }
    const h = holderRef.current
    if (h.userId !== u.id || !h.queue || h.status !== 'ready') return { ok: false, reason: 'not_loaded' }
    return null
  }, [])

  // Shows the change at once, saves it on the phone, then starts a send.
  const commit = useCallback(async (change) => {
    const saved = await commitChange(holderRef.current, change, { persist: persistQueue, show: showList })
    if (!saved) {
      toast.error("Couldn't save this change on your phone. Reconnect and try again.")
      return false
    }
    if (!isOffline()) syncRef.current?.()
    return true
  }, [persistQueue, showList, toast, isOffline])

  const createRoshetta = useCallback(async (fields = {}) => {
    const refused = refuseChange()
    if (refused) return refused
    const blocked = tapRefusal('create', holderRef.current.list, isProRef.current)
    if (blocked) return { ok: false, reason: blocked }
    const made = prepareCreate(fields)
    if (!made.ok) return made
    if (rowsRefusal(made.change.data.rows, isProRef.current)) return { ok: false, reason: 'drug_limit' }
    if (!(await commit(made.change))) return { ok: false, reason: 'error' }
    return { ok: true, queued: true, roshetta: holderRef.current.list.find(r => r.id === made.id) }
  }, [refuseChange, commit])

  const saveRoshetta = useCallback(async (id, changes = {}) => {
    const refused = refuseChange()
    if (refused) return refused
    const blocked = tapRefusal('save', holderRef.current.list, isProRef.current)
    if (blocked) return { ok: false, reason: blocked }
    const made = prepareSave(holderRef.current.list, id, changes)
    if (!made.ok) return made
    if (rowsRefusal(made.change.data.rows, isProRef.current)) return { ok: false, reason: 'drug_limit' }
    if (!(await commit(made.change))) return { ok: false, reason: 'error' }
    return { ok: true, queued: true }
  }, [refuseChange, commit])

  // Always allowed for the signed-in owner, also when read only (tapRefusal gives no refusal for delete).
  const deleteRoshetta = useCallback(async (id) => {
    const refused = refuseChange()
    if (refused) return refused
    const blocked = tapRefusal('delete', holderRef.current.list, isProRef.current)
    if (blocked) return { ok: false, reason: blocked }
    const made = prepareDelete(holderRef.current.list, id)
    if (!made.ok) return made
    if (!(await commit(made.change))) return { ok: false, reason: 'error' }
    return { ok: true, queued: true, roshetta: made.roshetta, index: made.index }
  }, [refuseChange, commit])

  // ── Sharing (step 6.1b) ───────────────────────────────────────────────────
  // The share code lives only in roshetta_shares, so a phone never keeps a stale
  // copy of it. Needs internet and answers reason 'offline' without a toast (the
  // share sheet shows its own line). A roshetta made offline has no server copy
  // yet, so it cannot be shared until it is sent.
  const getRoshettaShareCode = useCallback(async (id) => {
    if (!userRef.current) return { ok: false, reason: 'guest' }
    if (isOffline()) return { ok: false, reason: 'offline' }
    return readShareCode(supabase, id, withTimeLimit)
  }, [isOffline])

  const createRoshettaShare = useCallback(async (id) => {
    if (userRef.current && isOffline()) return { ok: false, reason: 'offline' }
    const refused = refuseChange()
    if (refused) return refused
    const h = holderRef.current
    if (!h.list.some(r => r.id === id)) return { ok: false, reason: 'missing' }
    if (h.queue.some(c => c.type === 'create' && c.roshettaId === id)) return { ok: false, reason: 'not_sent' }
    if (listIsReadOnly(h.list, isProRef.current)) return { ok: false, reason: 'read_only' }
    const made = await createShare(supabase, id, withTimeLimit)
    if (made.ok) {
      // Analytics: only a link that was really made now, not one found again. Id only.
      if (made.created) logUsageEvent('roshetta_share_create', id)
      return { ok: true, code: made.code }
    }
    if (made.reason !== 'offline') toast.error("Couldn't create the link. Check your connection and try again.")
    return made
  }, [refuseChange, isOffline, toast])

  // Allowed for a read only account too (like delete): turning a link off is never refused.
  const stopRoshettaSharing = useCallback(async (id) => {
    if (userRef.current && isOffline()) return { ok: false, reason: 'offline' }
    const refused = refuseChange()
    if (refused) return refused
    return removeShare(supabase, id, withTimeLimit)
  }, [refuseChange, isOffline])

  return {
    roshettas,
    roshettasStatus: status,
    roshettasFromCache: fromCache,
    roshettasLoadError: view.loadError,
    isGuest: view.isGuest,
    reloadRoshettas,
    waitingCount: summary.waiting,
    waitingRoshettaIds: summary.ids,
    failedCount: summary.failed,
    failedList: summary.failedList,
    syncState,
    retryFailedChanges,
    discardFailedChanges,
    createRoshetta,
    saveRoshetta,
    deleteRoshetta,
    getRoshettaShareCode,
    createRoshettaShare,
    stopRoshettaSharing,
    isReadOnly: readOnly,
    canCreateRoshetta: canCreate(roshettas, isPro),
    roshettaCap: roshettaCap(isPro),
    roshettaDrugCap: roshettaDrugCap(isPro),
    roshettaLimit,
    showRoshettaLimit,
    showRoshettaReadOnly,
    dismissRoshettaLimit,
  }
}
