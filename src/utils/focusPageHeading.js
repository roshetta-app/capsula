// Moves keyboard and screen-reader focus to a screen's main heading after a forward open
// (Roshetta plan, Phase K, step 12.11). Returns a function that cancels a pending try.
//
// A screen's heading can appear a moment after the screen (its data loads), so it tries on the
// next frame and once more shortly after. It does nothing when the person is typing (a field has
// focus, so the keyboard is not disturbed), when focus is already inside a dialog, or when the
// screen has no heading. The heading is made focusable by script only (tabindex -1, so it is not a
// tab stop) and shows no ring, as it is not a control. Focus never scrolls the page.

const TRY_DELAYS_MS = [0, 350]

export function focusPageHeading(doc = typeof document !== 'undefined' ? document : null, win = typeof window !== 'undefined' ? window : null) {
  if (!doc || !win) return () => {}
  const timers = []
  let done = false

  const attempt = () => {
    if (done) return
    const active = doc.activeElement
    const tag = active && active.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (active && active.isContentEditable)) { done = true; return }
    if (active && active.closest && active.closest('[role="dialog"]')) { done = true; return }
    const h1 = doc.querySelector('h1')
    if (!h1) return // try again later
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
    h1.style.outline = 'none'
    h1.focus({ preventScroll: true })
    done = true
  }

  for (const ms of TRY_DELAYS_MS) timers.push(win.setTimeout(attempt, ms))
  return () => { done = true; timers.forEach((t) => win.clearTimeout(t)) }
}
