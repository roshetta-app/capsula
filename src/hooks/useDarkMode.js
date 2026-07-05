import { useState, useEffect, useCallback, useRef } from 'react'

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
const TRANSITION_CLASS = 'theme-transitioning'
// Buffer above --motion-screen (280ms) so the fallback never fires before
// the real transitionend on a normal run, only when it's genuinely missing.
const TRANSITION_FALLBACK_MS = 350

function getInitialDark() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'true'
  } catch {}
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark)
  const isFirstRun = useRef(true)

  // Apply class to <html> and persist whenever isDark changes
  useEffect(() => {
    const root = document.documentElement

    // Skip the crossfade on initial mount - animating colors in from
    // nothing on first paint isn't useful and can look like a flash.
    if (isFirstRun.current) {
      isFirstRun.current = false
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      try {
        localStorage.setItem(STORAGE_KEY, String(isDark))
      } catch {}
      return
    }

    root.classList.add(TRANSITION_CLASS)

    let fallbackTimer = null
    const cleanup = () => {
      root.classList.remove(TRANSITION_CLASS)
      root.removeEventListener('transitionend', onTransitionEnd)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
    const onTransitionEnd = (e) => {
      if (e.target !== root) return
      cleanup()
    }
    root.addEventListener('transitionend', onTransitionEnd)
    fallbackTimer = setTimeout(cleanup, TRANSITION_FALLBACK_MS)

    if (isDark) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    try {
      localStorage.setItem(STORAGE_KEY, String(isDark))
    } catch {}

    return () => {
      root.removeEventListener('transitionend', onTransitionEnd)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }
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
