/**
 * src/hooks/useRoshettas.js
 *
 * 2026-11-13 (Roshetta plan, step 2.4a): keeps the signed-in person's
 * roshettas. This step only LOADS them; create, save and delete come in step
 * 2.4b, limits and read only in 2.4c, and the hook is provided to the app in
 * 2.4d. All the load rules live in utils/roshettaLoad.js (checked without a
 * screen); this file only passes the real database, saved copy and online
 * signal in.
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
 *
 * Returns:
 *   roshettas            { id, name, description, rows, createdAt, updatedAt }[]  newest changed first
 *   roshettasStatus      'loading' | 'ready' | 'error'
 *   roshettasFromCache   true while the list shown is the saved copy
 *   roshettasLoadError   true when the last refresh failed (with a saved copy still shown)
 *   isGuest              true when nobody is signed in
 *   reloadRoshettas      () => Promise<void>
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useOnlineStatus } from './useOnlineStatus'
import { supabase } from '../lib/supabase'
import { readRoshettasCache, writeRoshettasCache, clearRoshettasCache, readRoshettaChanges } from '../utils/cache'
import { loadRoshettas, fetchRoshettas, withTimeLimit, viewFor } from '../utils/roshettaLoad'

export function useRoshettas() {
  const { user, loading: authLoading } = useAuth()
  const { isOnline } = useOnlineStatus()

  // The last state a load showed, with whose it is. Only ever set by a load.
  const [loaded, setLoaded] = useState(null)
  const userId = user?.id ?? null
  const view = viewFor({ userId, authLoading, loaded })

  const userRef = useRef(user)
  useEffect(() => { userRef.current = user }, [user])
  const onlineRef = useRef(isOnline)
  useEffect(() => { onlineRef.current = isOnline }, [isOnline])

  // The loads: a newer load makes an older one stale. The waiting list is kept
  // here (queueUserRef says whose it is) for the change steps that follow.
  const loadSeqRef = useRef(0)
  const queueRef = useRef(null)
  const queueUserRef = useRef(null)
  // True while only the saved copy (or an error) is on screen: coming back
  // online should load again.
  const needsRefreshRef = useRef(false)

  const load = useCallback(async (u) => {
    const seq = ++loadSeqRef.current
    const out = await loadRoshettas({
      userId: u.id,
      queue: queueUserRef.current === u.id ? queueRef.current : null,
      readQueue: readRoshettaChanges,
      readCache: readRoshettasCache,
      fetchLive: () => fetchRoshettas(supabase, withTimeLimit),
      isOffline: () => onlineRef.current === false || (typeof navigator !== 'undefined' && navigator.onLine === false),
      isStale: () => seq !== loadSeqRef.current || userRef.current?.id !== u.id,
      onQueue: list => { queueRef.current = list; queueUserRef.current = u.id },
      show: s => {
        needsRefreshRef.current = s.fromCache || s.status === 'error'
        setLoaded({ userId: u.id, ...s })
      },
    })
    if (out.stale) return
    queueRef.current = out.queue
    queueUserRef.current = u.id
  }, [])

  // Load when someone signs in; forget everything (and the saved copy) when
  // they sign out.
  const lastUserIdRef = useRef(null)
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      const previousId = lastUserIdRef.current
      lastUserIdRef.current = null
      loadSeqRef.current++
      queueRef.current = null
      queueUserRef.current = null
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
  useEffect(() => {
    if (!userId || status !== 'ready' || fromCache) return
    writeRoshettasCache(userId, roshettas)
  }, [userId, roshettas, status, fromCache])

  const reloadRoshettas = useCallback(async () => {
    const u = userRef.current
    if (u) await load(u)
  }, [load])

  return {
    roshettas,
    roshettasStatus: status,
    roshettasFromCache: fromCache,
    roshettasLoadError: view.loadError,
    isGuest: view.isGuest,
    reloadRoshettas,
  }
}
