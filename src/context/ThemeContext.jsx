import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
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
 *
 * offline-profile-account (2026-09-01) — a theme change made while
 * offline used to apply locally right away (fine) but silently fail to
 * reach the server, with no retry — so the next time the profile loaded
 * (priority 1 above), the server's still-old value would quietly win and
 * undo the change the person just made. `pendingSyncRef` now remembers
 * an unsaved local change; the profile-sync effect below leaves `theme`
 * alone while one is pending instead of overwriting it, and a separate
 * effect retries the save automatically the moment the connection comes
 * back.
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
  const { isOnline } = useOnlineStatus()
  const [theme, setThemeState] = useState(getInitialTheme)
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark)
  const isFirstRun = useRef(true)
  const syncedForUserId = useRef(null)
  // offline-profile-account (2026-09-01) — holds { userId, value } for a
  // theme change that was applied locally but hasn't been confirmed saved
  // to the server yet (e.g. made while offline). null once there's
  // nothing outstanding. See file header.
  const pendingSyncRef = useRef(null)

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
    // offline-profile-account (2026-09-01): a change made moments ago
    // while offline hasn't reached the server yet — profile.themePreference
    // here is still the OLD value. Applying it now would silently undo
    // what the person just picked. Leave `theme` as-is; the retry effect
    // below will save the pending value and mark this synced once it
    // actually succeeds.
    if (pendingSyncRef.current?.userId === user.id) return
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
      // offline-profile-account (2026-09-01): mark this change as
      // unsaved before attempting it, and only clear that mark once the
      // save actually succeeds — a failed/offline attempt leaves it
      // pending so the retry effect below can pick it up, and so the
      // profile-sync effect above knows not to overwrite this choice
      // with the still-old server value in the meantime.
      pendingSyncRef.current = { userId: user.id, value: newTheme }
      updateOwnProfile(supabase, user.id, { themePreference: newTheme })
        .then(() => {
          if (pendingSyncRef.current?.value === newTheme) pendingSyncRef.current = null
          refreshProfile()
        })
        .catch(() => {
          // Left pending on purpose — see the reconnect-retry effect below.
        })
    }
  }, [user, refreshProfile])

  // offline-profile-account (2026-09-01) — the moment the connection
  // comes back, retry any theme change that was made while offline (or
  // that otherwise failed to save) instead of leaving it stranded until
  // the person happens to touch the theme control again.
  useEffect(() => {
    if (!isOnline) return
    const pending = pendingSyncRef.current
    if (!pending || !user || pending.userId !== user.id) return
    updateOwnProfile(supabase, user.id, { themePreference: pending.value })
      .then(() => {
        if (pendingSyncRef.current?.value === pending.value) pendingSyncRef.current = null
        refreshProfile()
      })
      .catch(() => {
        // Still couldn't save (e.g. "online" per the OS but not really
        // reachable yet) — stays pending, next reconnect will try again.
      })
  }, [isOnline, user, refreshProfile])

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
