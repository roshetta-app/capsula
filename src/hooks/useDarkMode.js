/**
 * src/hooks/useDarkMode.js
 *
 * Now just re-exports the shared-context version from ThemeContext.jsx —
 * same pattern useAuth.js already uses for AuthContext.jsx (see that
 * file's own comment: "useAuth() not having a shared Context before this:
 * every mounted copy... fetch, so navigating between two screens that
 * both call useAuth()..."). This hook used to hold its own useState per
 * call site, which caused the exact same class of bug: multiple
 * independent, unsynced copies of the theme (App.jsx, AccountScreen,
 * ConditionsScreen), each unaware of the others — see ThemeContext.jsx's
 * header comment for the full account of the bug this fixed.
 *
 * Kept as a thin re-export, not removed, so every existing
 * `import { useDarkMode } from '../hooks/useDarkMode'` call site needs
 * zero changes.
 */
export { useDarkMode } from '../context/ThemeContext'
