/**
 * src/utils/scrollLock.js
 *
 * 2026-10-08: one shared page-scroll lock for sheets and dialogs.
 *
 * Why: SheetShell, ConfirmSheet and FilterModal each locked the page by saving
 * the page's styles when they opened and putting them back when they closed.
 * When two were open at once (a confirm dialog over a sheet) and they closed
 * in the wrong order, the second one put back the style the first had already
 * set, so the page stayed locked: nothing scrolled on any screen until a reload.
 *
 * Now every lock is counted. The page's own styles are saved once, when the
 * first lock is taken, and put back once, when the last one is released, in
 * whatever order they close. Releasing twice does nothing.
 *
 * lockScroll('overflow')  stops the page scrolling (dialogs, pop-ups).
 * lockScroll('fixed')     also pins the page in place at its current scroll
 *                         position (sheets), exactly as SheetShell did:
 *                         position: fixed with a negative top. DrugsScreen reads
 *                         that negative top to keep its long list drawing.
 *
 * Both return a release function.
 */

const counts = { overflow: 0, fixed: 0 }
let base    = null   // the page's own styles, saved on the first lock
let frozenY = null   // scroll position while pinned

function apply() {
  const html  = document.documentElement
  const total = counts.overflow + counts.fixed

  if (total === 0) {
    if (base) {
      html.style.position = base.position
      html.style.top      = base.top
      html.style.width    = base.width
      html.style.overflow = base.overflow
    }
    base = null
    if (frozenY != null) { const y = frozenY; frozenY = null; window.scrollTo(0, y) }
    return
  }

  if (!base) {
    base = {
      position: html.style.position,
      top:      html.style.top,
      width:    html.style.width,
      overflow: html.style.overflow,
    }
  }
  html.style.overflow = 'hidden'

  if (counts.fixed > 0) {
    if (frozenY == null) frozenY = window.scrollY
    html.style.position = 'fixed'
    html.style.top      = `-${frozenY}px`
    html.style.width    = '100%'
  } else if (frozenY != null) {
    // Only plain locks remain: un-pin the page but keep it unscrollable.
    html.style.position = base.position
    html.style.top      = base.top
    html.style.width    = base.width
    const y = frozenY
    frozenY = null
    window.scrollTo(0, y)
  }
}

export function lockScroll(kind = 'overflow') {
  const key = kind === 'fixed' ? 'fixed' : 'overflow'
  counts[key] += 1
  apply()
  let released = false
  return function release() {
    if (released) return
    released = true
    counts[key] -= 1
    apply()
  }
}
