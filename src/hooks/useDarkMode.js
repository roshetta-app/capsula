import { useState, useEffect, useCallback } from 'react'

/**
 * useDarkMode — manual toggle with localStorage persistence.
 *
 * Priority:
 *   1. localStorage 'capsula-dark-mode' ('true' | 'false') — explicit user choice
 *   2. window.matchMedia('prefers-color-scheme: dark')      — OS default on first visit
 *
 * Returns { isDark, toggleDark }.
 * Applies / removes the 'dark' class on <html> on every change.
 *
 * Safe to call in multiple components — all instances share the same
 * localStorage key and class on <html>; each call independently reads
 * the current state from the DOM so they stay in sync.
 */

const STORAGE_KEY = 'capsula-dark-mode'

function getInitialDark() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark)

  // Apply class to <html> and persist whenever isDark changes
  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(isDark))
    } catch {}
  }, [isDark])

  // On first visit (no stored pref), follow OS changes automatically
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== null) return
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Sync to storage changes from other instances (e.g. App.jsx + ConditionsScreen)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setIsDark(e.newValue === 'true')
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const toggleDark = useCallback(() => setIsDark(d => !d), [])

  return { isDark, toggleDark }
}
