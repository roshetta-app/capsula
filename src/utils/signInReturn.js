// Sign-in return (Roshetta plan, Phase K, step 12.15).
//
// When the app leaves its own window for Google (the installed app, or a browser that blocked the
// sign-in popup), Google's own pages pile up in the history between the page the person started on
// and the page Google sends them back to. One Back after signing in then shows Google again.
//
// The fix: just before leaving, remember how many history steps there were and which page it was.
// When the person is back and the sign-in has really finished, jump back over exactly the steps
// that were added since, which lands on the page they started from. If anything looks wrong, the
// answer is "do nothing", which is how the app behaved before this step. It has no React and no
// browser calls in it, so the checks can run it with plain numbers.

export const MARKER_KEY = 'capsula.signin.departure'
// Set by the returned page just before it jumps, read by the restored page if the browser brings it
// back from its memory instead of loading it again (see shouldReloadOnRestore).
export const REWOUND_KEY = 'capsula.signin.rewound'

// Browsers keep at most 50 history steps. Once the list is full the count stops growing, so a
// count taken near that limit can no longer be trusted to say how many steps were added.
export const HISTORY_CAP = 50
// Google's own pages are a handful of steps. More than this means something else is going on.
export const MAX_STEPS = 15
// A sign-in that takes longer than this between leaving and coming back is not rewound.
export const MAX_AGE_MS = 10 * 60 * 1000
// How long the returned page waits for the real sign-in before it gives up and does nothing.
export const WAIT_FOR_SIGN_IN_MS = 20 * 1000
// How long the restored page treats the 'rewound' note as fresh.
export const REWOUND_MAX_AGE_MS = 15 * 1000

function isCount(n) {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1
}

// What to remember when leaving. Returns the note to store, or null when a rewind could not be done
// safely later (so nothing is stored and the person simply stays on the page they return to).
//
// forwardSteps is how many steps sit AHEAD of the current page (there are some when the person went
// Back earlier). The browser's count includes them, but leaving for Google throws them away, so they
// must not be counted: the note keeps the number of steps up to and including the current page.
export function makeMarker({ historyLength, forwardSteps = 0, sheetSteps = 0, pathname, now }) {
  if (!isCount(historyLength)) return null
  if (typeof forwardSteps !== 'number' || !Number.isInteger(forwardSteps)) return null
  if (forwardSteps < 0 || forwardSteps >= historyLength) return null
  // sheetSteps: hidden steps an open sheet added on top of the real page (see useBackClose). The
  // jump should land on the real page, not on a hidden step that would cost the person one more Back.
  if (typeof sheetSteps !== 'number' || !Number.isInteger(sheetSteps) || sheetSteps < 0) return null
  const len = historyLength - forwardSteps - sheetSteps
  if (len < 1) return null
  if (typeof pathname !== 'string' || pathname === '') return null
  if (typeof now !== 'number' || !Number.isFinite(now)) return null
  // Room must be left for Google's pages and the returned page without the list filling up.
  if (historyLength > HISTORY_CAP - MAX_STEPS - 1) return null
  return { v: 1, at: now, len, path: pathname }
}

// Reads a stored note back. Anything that is not exactly the shape written above is "no note".
export function parseMarker(raw) {
  if (typeof raw !== 'string' || raw === '') return null
  let m
  try { m = JSON.parse(raw) } catch { return null }
  if (!m || typeof m !== 'object') return null
  if (m.v !== 1) return null
  if (typeof m.at !== 'number' || !Number.isFinite(m.at)) return null
  if (!isCount(m.len)) return null
  if (typeof m.path !== 'string' || m.path === '') return null
  return { v: 1, at: m.at, len: m.len, path: m.path }
}

// Did the page just load as the place Google sent the person back to? Sign-in here uses the code
// flow, so the address carries a one-time 'code'. This has to be read at load, before the sign-in
// library cleans the address.
export function loadedAsSignInReturn(search) {
  if (typeof search !== 'string' || search === '') return false
  try {
    const code = new URLSearchParams(search).get('code')
    return typeof code === 'string' && code !== ''
  } catch { return false }
}

// The same page can be written with or without a closing slash (the Home tab is '/capsula', and the
// site's host sends the person back to '/capsula/'). They are the same page, so compare them without it.
export function samePage(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const clean = (p) => (p.length > 1 ? p.replace(/\/+$/, '') : p) || '/'
  return clean(a) === clean(b)
}

// Decide whether to jump back and by how many steps. Called when the real sign-in has finished.
// Returns { steps, reason }: steps is a positive number to jump back by, or 0 to do nothing.
export function planRewind({ marker, now, historyLength, pathname }) {
  if (!marker) return { steps: 0, reason: 'no-marker' }
  if (typeof now !== 'number' || !Number.isFinite(now)) return { steps: 0, reason: 'bad-time' }
  const age = now - marker.at
  if (age < 0 || age > MAX_AGE_MS) return { steps: 0, reason: 'stale' }
  if (!isCount(historyLength)) return { steps: 0, reason: 'bad-length' }
  // The person moved on to another page while sign-in was finishing: leave them where they are.
  if (!samePage(pathname, marker.path)) return { steps: 0, reason: 'moved-on' }
  // A full list stops counting, so the number of added steps cannot be known.
  if (historyLength >= HISTORY_CAP) return { steps: 0, reason: 'list-full' }
  const steps = historyLength - marker.len
  if (steps < 1) return { steps: 0, reason: 'nothing-added' }
  if (steps > MAX_STEPS) return { steps: 0, reason: 'too-many' }
  return { steps, reason: 'ok' }
}

// A page the browser brought back from its memory (not loaded again) can still show the signed-out
// screen. It should load itself again, but only when this very return trip just jumped to it.
export function shouldReloadOnRestore({ persisted, rewoundAt, now }) {
  if (persisted !== true) return false
  if (typeof rewoundAt !== 'number' || !Number.isFinite(rewoundAt)) return false
  if (typeof now !== 'number' || !Number.isFinite(now)) return false
  const age = now - rewoundAt
  return age >= 0 && age <= REWOUND_MAX_AGE_MS
}
