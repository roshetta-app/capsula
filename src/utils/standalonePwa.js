// True when the website is running as an installed app (a PWA opened from the home screen), not in a
// browser tab. Used by sign-in: an installed app cannot open a clean popup window, so a popup there
// shows up as a browser tab bar that stays behind after sign-in (2026-11-20).
export function isStandalonePwa() {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true
  } catch { /* old browser: fall through */ }
  return window.navigator?.standalone === true
}
