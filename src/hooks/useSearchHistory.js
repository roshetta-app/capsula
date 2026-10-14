/**
 * src/hooks/useSearchHistory.js
 *
 * 2026-10-14: the drug search's recent searches (text + the search mode it was typed
 * in), newest first, at most 10, kept on this device only. A repeat of the same text
 * in the same mode moves to the top instead of being listed twice. Storage failures
 * are ignored: history is a convenience, never a reason for the search to break.
 */

import { useCallback, useState } from 'react'

const KEY = 'capsula_drug_search_history'
const MAX = 10

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

const same = (a, b) => a.mode === b.mode && a.text.trim().toLowerCase() === b.text.trim().toLowerCase()

export function useSearchHistory() {
  const [history, setHistory] = useState(read)

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
  }, [])

  const removeSearch = useCallback((entry) => {
    setHistory(prev => {
      const next = prev.filter(e => !same(e, entry))
      write(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    write([])
    setHistory([])
  }, [])

  return { history, addSearch, removeSearch, clearHistory }
}
