// When a screen fades in as a whole (2026-11-20). One rule for every screen inside the app layout,
// so the screens do not each invent their own.
//
//   - Home and Topics have their own staggered entrance, so the whole-screen fade skips them.
//   - The admin area never animates.
//   - Going Back (a POP) never animates, and neither does the first screen of a cold start
//     (it is also a POP): a skeleton is showing then and the page should not hide behind a fade.
//   - The three tabs (Drugs, Favourites, Account) fade once per browser session, the first time
//     they are opened; switching tabs after that is instant.
//   - Every other screen (a topic, a drug, a roshetta, a group, a list opened from a link) fades on
//     every forward open.
//   - "Reduce motion" turns everything off.
// The fade is opacity only, never a transform, so fixed headers and bars on a screen cannot jump.

export const PAGE_FADE_MS = 160
export const TAB_ROOTS = ['/drugs', '/favourites', '/account']
const OWN_ENTRANCE = ['/', '/conditions']
const NEVER_PREFIXES = ['/admin']

export function pageEntranceKind({ pathname = '/', navType = 'PUSH', seenTab = false, reduceMotion = false } = {}) {
  if (reduceMotion) return 'none'
  if (navType === 'POP') return 'none'
  if (OWN_ENTRANCE.includes(pathname)) return 'none'
  if (NEVER_PREFIXES.some(p => pathname === p || pathname.startsWith(`${p}/`))) return 'none'
  if (TAB_ROOTS.includes(pathname)) return seenTab ? 'none' : 'fade'
  return 'fade'
}

// phase: 'off' | 'hidden' | 'in' | 'done'
export function pageFadeStyle(phase = 'off') {
  if (phase === 'hidden') return { opacity: 0 }
  if (phase === 'in') return { opacity: 1, transition: `opacity ${PAGE_FADE_MS}ms var(--ease-reveal)` }
  return {}
}
