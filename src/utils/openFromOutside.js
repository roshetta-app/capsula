// Opening a page that arrives from outside (Roshetta plan, Phase K, step 12.4).
//
// "From outside" means a tapped notification (the website one, the phone app one, or the banner
// shown inside the app) or any link handed to the app while it is running. One function does it for
// every door, so they all behave the same:
//   1. Work out where to go and which screens to put behind it (plain rules, below).
//   2. If that is the place the person is already on, do nothing.
//   3. Close any open sheet first (the same way a real Back press closes it).
//   4. Ask Leave or Stay when there is unsaved work.
//   5. Open the page: on top of the current screen, or, when the app has only just started on Home,
//      the full stack Home, the page's parent, the page (step 12.3's rule, so Back never exits early).
//
// No React in this file, so the checks can run it with fakes.

import { isMainScreen } from './navRules.js'
import { planArrival } from './arrivalRecord.js'

const SITE_PREFIX = '/capsula'

// Turns whatever a notification carries into an address inside the app, or '/' when there is none.
// Accepts the website form ('/capsula/drugs/x'), the plain form ('/drugs/x'), the empty link and
// the old 'no link' value ('/capsula/'). Anything that points off the app (another site, a script,
// a double slash, a backslash) becomes '/'.
export function cleanTarget(raw) {
  if (typeof raw !== 'string') return '/'
  let url = raw.trim()
  if (url === SITE_PREFIX || url.startsWith(SITE_PREFIX + '/') || url.startsWith(SITE_PREFIX + '?') || url.startsWith(SITE_PREFIX + '#')) {
    url = url.slice(SITE_PREFIX.length)
  }
  if (url === '') return '/'
  if (!url.startsWith('/')) return '/'
  if (url.startsWith('//') || url.includes('\\')) return '/'
  return url
}

const trimSlash = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p)

// Where to go and the steps to get there. 'here' is the screen the person is on now
// ({ pathname, search }). 'isArrival' says the app has only just started and nothing has been
// navigated since (the arrival record's answer).
// Returns { target, steps }: steps is [] when the person is already there, otherwise a list of
// { replace: path } or { push: path }, in order.
export function planOpen({ url, here, isArrival }) {
  const target = cleanTarget(url)
  const parsed = new URL(target, 'http://capsula.local')
  const pathname = parsed.pathname
  const search = parsed.search
  const hash = parsed.hash

  const here_ = here || { pathname: '/', search: '' }
  if (trimSlash(pathname) === trimSlash(here_.pathname || '/') && search === (here_.search || '')) {
    return { target, steps: [] }
  }

  // One main screen to another: swap, so nothing piles up (the same as tapping a tab).
  if (isMainScreen(pathname) && isMainScreen(here_.pathname || '/')) {
    return { target, steps: [{ replace: pathname + search + hash }] }
  }

  // The app has only just started and is still on Home: put the screens behind the page.
  if (isArrival && (here_.pathname || '/') === '/') {
    const stack = planArrival({
      isArrival: true,
      historyState: { idx: 0 },
      pathname,
      search,
      hash,
    })
    if (stack.length) return { target, steps: stack }
  }

  // Everything else: the page opens on top of whatever is showing.
  return { target, steps: [{ push: pathname + search + hash }] }
}

// Does the whole thing. The parts that touch the app are passed in, so a check can fake them:
//   here, isArrival  where the person is (see planOpen)
//   navigate(to, { replace })   the router's navigate
//   closeSheets()    closes every open sheet, resolves when they are gone
//   requestLeave(action, onStay)   the leave guard's question
// Resolves 'same' (already there), 'stayed' (the person chose Stay) or 'opened'.
// A router that throws makes the promise reject; a sheet that will not close never blocks the page.
export function openFromOutside({ url, here, isArrival, navigate, closeSheets, requestLeave }) {
  const { steps } = planOpen({ url, here, isArrival })
  if (steps.length === 0) return Promise.resolve('same')

  return new Promise((resolve, reject) => {
    ;(async () => {
      try {
        try { await closeSheets() } catch { /* a stuck sheet must not keep the page from opening */ }

        let settled = false
        const open = () => {
          if (settled) return
          settled = true
          try {
            for (const step of steps) {
              if (step.replace !== undefined) navigate(step.replace, { replace: true })
              else navigate(step.push)
            }
            resolve('opened')
          } catch (err) {
            reject(err)
          }
        }
        const stay = () => {
          if (settled) return
          settled = true
          resolve('stayed')
        }
        requestLeave(open, stay)
      } catch (err) {
        reject(err)
      }
    })()
  })
}
