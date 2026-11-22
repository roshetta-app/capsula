/**
 * src/hooks/usePublicProfile.js
 *
 * 2026-11-22 (public profile plan, step 14.5b): wires the plain data layer (utils/profileData.js)
 * to the signed-in person, the database client and a time limit, for the setup sheet.
 *
 *   loadProfile ()           => Promise<{ ok: true, profile } | { ok: false, kind, message }>
 *                            reads the person's own row and lays any waiting change on top
 *                            (what they typed while offline), so the sheet shows it again
 *   savePublicCard (fields, currentName) => Promise<{ ok: true, saved?, waiting? } | { ok: false, kind, code, message, field? }>
 *                            saves through save_public_profile; with no connection the change
 *                            waits on the phone ({ ok: true, waiting: true })
 *
 *   saveDetails (updates, { hasHandle }) => Promise<{ ok: true, saved } | { ok: false, kind, code, message }>
 *                            (14.7c-1) the private details path (the 14 allowed columns only); it does not wait for
 *                            the connection: the Edit screen says so and the person taps Save again
 *
 *   loadSharedIds ()        => Promise<{ ok: true, roshettas: Set, groups: Set } | { ok: false, kind, message }>
 *                            (14.5c) the ids of the person's roshettas and groups that already have a share
 *                            row (a link), for the Add to profile picker; the rest are private
 *
 * Every answer is a plain object and nothing throws. A request that takes longer than 8 seconds
 * counts as no connection, the same as the other hooks. Nothing about the profile is kept on
 * the phone except that small waiting record (a change made offline).
 */

import { useCallback, useMemo } from 'react'
import { useAuth } from './useAuth'
import { supabase } from '../lib/supabase'
import {
  fetchProfile, savePublicCardOrWait, applyWaiting, hasWaiting, localProfileStore, saveDetails as sendDetails, removePublicCard,
} from '../utils/profileData'
import { readSharedIds } from '../utils/addToProfile'

const REQUEST_TIMEOUT_MS = 8000
const TIMEOUT_ERROR = { code: 'request_timeout', message: 'request_timeout' }

// Resolves with the real answer, or with a timeout error when it takes longer than the limit.
function withLimit(request) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ data: null, error: TIMEOUT_ERROR }), REQUEST_TIMEOUT_MS)
    Promise.resolve(request).then(
      (res) => { clearTimeout(timer); resolve(res) },
      (err) => { clearTimeout(timer); resolve({ data: null, error: err ?? TIMEOUT_ERROR }) },
    )
  })
}

export function usePublicProfile() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const store = useMemo(() => localProfileStore(), [])

  const loadProfile = useCallback(async () => {
    if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: 'Sign in first.' }
    const res = await fetchProfile(supabase, userId, { limit: withLimit })
    if (!res.ok) return res
    const waiting = await store.read(userId)
    return { ok: true, profile: hasWaiting(waiting) ? applyWaiting(res.profile, waiting) : res.profile }
  }, [userId, store])

  const savePublicCard = useCallback(async (fields, currentName = '') => {
    if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: 'Sign in first.' }
    const res = await savePublicCardOrWait(supabase, userId, fields, { store, currentName, limit: withLimit })
    // Saved for real: whatever was waiting for the public card is now out of date, so it goes.
    if (res.ok && !res.waiting) {
      const record = await store.read(userId)
      if (record?.public && Object.keys(record.public).length > 0) {
        const next = { ...record, public: {} }
        await store.write(userId, hasWaiting(next) ? next : null)
      }
    }
    return res
  }, [userId, store])

  const saveDetails = useCallback(async (updates, { hasHandle = false } = {}) => {
    if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: 'Sign in first.' }
    return sendDetails(supabase, userId, updates, { hasHandle, limit: withLimit })
  }, [userId])

  // 14.7c-2: Remove public profile. The database ends every on-profile link, clears name, bio, avatar and
  // username (the usernames die for good) and starts the 30-day wait. Not queued: the person must be online.
  const removePublicProfile = useCallback(async () => {
    if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: 'Sign in first.' }
    return removePublicCard(supabase, { limit: withLimit })
  }, [userId])

  const loadSharedIds = useCallback(async () => {
    if (!userId) return { ok: false, kind: 'retry', code: 'not_signed_in', message: 'Sign in first.' }
    const [r, g] = await Promise.all([
      readSharedIds(supabase, 'roshetta_shares', 'roshetta_id', withLimit),
      readSharedIds(supabase, 'drug_group_shares', 'group_id', withLimit),
    ])
    if (r.ok && g.ok) return { ok: true, roshettas: r.ids, groups: g.ids }
    const offline = r.reason === 'offline' || g.reason === 'offline'
    return { ok: false, kind: offline ? 'retry' : 'error', message: offline ? 'No connection.' : 'Something went wrong. Try again.' }
  }, [userId])

  return { signedIn: Boolean(userId), loadProfile, savePublicCard, saveDetails, removePublicProfile, loadSharedIds }
}
