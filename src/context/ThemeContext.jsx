import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { updateOwnProfile } from '../lib/queries'

/**
 * src/context/ThemeContext.jsx
 *
 * Bugfix (2026-08-22): useDarkMode() used to be a plain hook holding its
 * own useState — every component that called it (App.jsx's ThemeInit,
 * AccountScreen, ConditionsScreen) got its own independent copy of
 * `theme`, unaware of the others. Tapping the cycle button on Conditions
 * only updated THAT copy; Account screen's separate copy never learned
 * about it, so its 3-way control could show a stale value, and switching
 * tabs would flip between whichever copy each screen happened to hold —
 * the reported "discrepancy / conflicts when switching tabs" bug.
 *
 * This is the exact same class of bug AuthContext.jsx itself was written
 * to fix (see that file's own header comment: multiple independent
 * per-component instances not knowing about each other) — same fix
 * applies: one Provider, one canonical state, everywhere else just reads
 * it. useDarkMode() (src/hooks/useDarkMode.js) is now a thin re-export of
 * the consumer hook below, same pattern useAuth.js already uses for
 * AuthContext.
 *
 * Priority for the resolved `theme` (unchanged from before this fix):
 *   1. Signed in + profile loaded → profiles.theme_preference is the
 *      source of truth (synced once per sign-in).
 *   2. Otherwise → localStorage 'capsula-theme' (explicit prior choice
 *      on this device, signed out or profile not loaded yet).
 *   3. Otherwise → 'light' (deliberate first-impression default, not
 *      'system' — see profiles.theme_preference's own column default).
 *
 * `isDark` is the resolved light/dark boolean actually applied to <html>:
 * for theme === 'system' it follows the OS live; otherwise it's just
 * theme === 'dark'.
 *
 * `toggleDark` is kept for backward compatibility with any call site
 * still using the old binary API (flips explicitly between light/dark).
 */

const ThemeCtx = createContext(null)

const THEME_STORAGE_KEY = 'capsula-theme'
// Pre-sync key, boolean only ('true' | 'false'). Read once for migration,
// never written again.
const LEGACY_STORAGE_KEY = 'capsula-dark-mode'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy !== null) return legacy === 'true' ? 'dark' : 'light'
  } catch {}
  return 'light'
}

function getSystemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export function ThemeProvider({ children }) {
  const { user, profile, refreshProfile } = useAuth()
  const [theme, setThemeState] = useState(getInitialTheme)
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark)
  const isFirstRun = useRef(true)
  const syncedForUserId = useRef(null)

  const isDark = theme === 'system' ? systemDark : theme === 'dark'

  // Apply class to <html> and persist locally whenever the resolved
  // isDark value changes.
  useEffect(() => {
    const root = document.documentElement
    const applyClass = () => {
      if (isDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    if (isFirstRun.current) {
      isFirstRun.current = false
      applyClass()
    } else if (document.startViewTransition) {
      document.startViewTransition(applyClass)
    } else {
      applyClass()
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {}
  }, [theme, isDark])

  // Always listen for OS changes (cheap), only matters while theme === 'system'.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Once a signed-in user's profile loads, their saved theme_preference
  // becomes the source of truth — once per sign-in — keyed on user id so
  // signing into a *different* account on the same device re-syncs.
  useEffect(() => {
    if (!user || !profile?.themePreference) return
    if (syncedForUserId.current === user.id) return
    syncedForUserId.current = user.id
    setThemeState(profile.themePreference)
  }, [user, profile])

  useEffect(() => {
    if (!user) syncedForUserId.current = null
  }, [user])

  // Cross-TAB sync (other browser tabs/windows only — the 'storage'
  // event never fires within the same page that made the change, which
  // is fine now: there's only one instance of this state per page, so
  // nothing in-page needs to be told about a change; only a genuinely
  // separate tab/window does).
  useEffect(() => {
    const handler = (e) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        setThemeState(e.newValue)
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme)
    if (user) {
      updateOwnProfile(supabase, user.id, { themePreference: newTheme })
        .then(refreshProfile)
        .catch(() => {})
    }
  }, [user, refreshProfile])

  const toggleDark = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark')
  }, [isDark, setTheme])

  const value = { theme, setTheme, isDark, toggleDark }
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useDarkMode() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useDarkMode must be used inside <ThemeProvider>')
  return ctx
}
