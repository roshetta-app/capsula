/**
 * src/hooks/useSearchHistory.js
 *
 * 2026-10-15 (saved to the account): signed in, the list lives in the 'drug_search_history'
 * table (one row per person + mode + text, newest 10 kept by the database), so it follows
 * the person to any device. Signed out (guest) it stays on this device only, as before.
 * On sign-in the database list loads, and any searches that were only on this phone are
 * merged in once (database entries first, then the phone's, up to 10) and sent up. The
 * phone's copy stays as a fast mirror and offline fallback; sign-out clears it (see
 * AuthContext.jsx). Database failures are ignored: search never waits on them.
 *
 * 2026-10-15: matchingSearches() picks the past searches that start with what is being
 * typed (for the hints above the results). Saving now happens only on a commit (a result
 * opened, the keyboard's Search key, a tapped hint or a tapped past search); see DrugsScreen.
 *
 * 2026-10-14: the drug search's recent searches (text + the search mode it was typed
 * in), newest first, at most 10, kept on this device only. A repeat of the same text
 * in the same mode moves to the top instead of being listed twice. Storage failures
 * are ignored: history is a convenience, never a reason for the search to break.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { querySearchHistory, upsertSearchHistory, deleteSearchHistoryEntry, deleteAllSearchHistory } from '../lib/userDataQueries'

const KEY   = 'capsula_drug_search_history'
const TABLE = 'drug_search_history'
const MAX   = 10
const CONFLICT = 'user_id,mode,text_key'

function read() {
  try {
    const raw  = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list)
      ? list.filter(e => e && typeof e.text === 'string' && typeof e.mode === 'string').slice(0, MAX)
      : []
  } catch {
    return []
  }
}

function write(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

const keyOf = (e) => e.text.trim().toLowerCase()
const same  = (a, b) => a.mode === b.mode && keyOf(a) === keyOf(b)

// Past searches that start with the typed text (not counting an exact repeat of the same
// search in the same mode), newest first, at most 'limit'.
export function matchingSearches(history, text, mode, limit = 3) {
  const t = (text ?? '').trim().toLowerCase()
  if (!t) return []
  return history
    .filter(e => {
      const et = e.text.trim().toLowerCase()
      return et.startsWith(t) && !(et === t && e.mode === mode)
    })
    .slice(0, limit)
}

export function useSearchHistory() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [history, setHistory] = useState(read)

  // Signed in: load the account's list, merge in anything that was only on this phone.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    querySearchHistory(TABLE, MAX * 3)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        const fromDb = data.map(r => ({ text: r.search_text, mode: r.mode }))
        const extra  = read().filter(l => !fromDb.some(d => same(d, l)))
        const merged = [...fromDb, ...extra].slice(0, MAX)
        write(merged)
        setHistory(merged)

        // Phone-only searches that made the list go up to the account, dated just
        // before the oldest account entry so the order is kept.
        const toSend = extra.filter(e => merged.some(m => same(m, e)))
        if (toSend.length === 0) return
        const oldest = data.length ? new Date(data[data.length - 1].searched_at).getTime() : Date.now()
        upsertSearchHistory(
          TABLE,
          toSend.map((e, i) => ({
            user_id:     userId,
            search_text: e.text,
            mode:        e.mode,
            searched_at: new Date(oldest - (i + 1) * 1000).toISOString(),
          })),
          CONFLICT
        )
          .then(({ error: upErr }) => {
            if (upErr) console.error('Failed to sync search history:', upErr)
          })
      })

    return () => { cancelled = true }
  }, [userId])

  const addSearch = useCallback((text, mode) => {
    const t = (text ?? '').trim()
    if (t.length < 2) return
    const entry = { text: t, mode }
    setHistory(prev => {
      if (prev[0] && same(prev[0], entry) && prev[0].text === t) return prev
      const next = [entry, ...prev.filter(e => !same(e, entry))].slice(0, MAX)
      write(next)
      return next
    })
    if (userId) {
      upsertSearchHistory(
        TABLE,
        { user_id: userId, search_text: t.slice(0, 100), mode, searched_at: new Date().toISOString() },
        CONFLICT
      )
        .then(({ error }) => {
          if (error) console.error('Failed to sync search history:', error)
        })
    }
  }, [userId])

  const removeSearch = useCallback((entry) => {
    setHistory(prev => {
      const next = prev.filter(e => !same(e, entry))
      write(next)
      return next
    })
    if (userId) {
      deleteSearchHistoryEntry(TABLE, userId, entry.mode, keyOf(entry))
        .then(({ error }) => {
          if (error) console.error('Failed to remove search from history:', error)
        })
    }
  }, [userId])

  const clearHistory = useCallback(() => {
    write([])
    setHistory([])
    if (userId) {
      deleteAllSearchHistory(TABLE, userId)
        .then(({ error }) => {
          if (error) console.error('Failed to clear search history:', error)
        })
    }
  }, [userId])

  return { history, addSearch, removeSearch, clearHistory }
}
