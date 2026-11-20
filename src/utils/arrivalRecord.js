// The arrival record (Roshetta plan, Phase K, step 12.3).
//
// When someone arrives straight on a page (a link, a notification on the website, a reopened
// installed app), nothing sits behind it, so Back would leave the app. This file decides, in plain
// terms, when to put the screens behind it (Home, then the page's parent from navRules.js, then
// the page) and which ones. It has no React in it so the checks can run it with a fake history.
//
// The old way (a flag set only by some detail pages) missed the screens that were opened from Home,
// Topics, Drugs or Favourites, so the first page opened in a session got a second copy of its
// parent behind it. Now the answer is: lay screens behind a page only when the page IS the place
// the app started on, nothing has been navigated since, and the history has no earlier step.

import { parentChain, laysBehind } from './navRules.js'

// Remembers the very first place the app showed and whether the person has moved since.
// useBackLabel's tracker tells it about every place the router shows.
export function createArrivalRecord() {
  let firstKey = null
  let moved = false
  return {
    note(key) {
      if (firstKey === null) { firstKey = key; return }
      if (key !== firstKey) moved = true
    },
    // Is the place with this key still the first place the app showed?
    isArrival(key) {
      return firstKey !== null && !moved && key === firstKey
    },
  }
}

// The router numbers each history step it creates (0 for the first). Above 0 means a step exists
// behind this one, for example after a refresh in the middle of a session. The number can be
// missing on steps made by the website Back guard, which counts as "unknown", so we still lay.
export function hasStepBehind(historyState) {
  const idx = historyState && historyState.idx
  return typeof idx === 'number' && idx > 0
}

// What to do for a page that just appeared. Returns the steps in order, each { replace | push },
// or [] when nothing should be added. The first step replaces the page's own step with Home, the
// rest push the parent screens and finally the page again (with its query and hash).
export function planArrival({ isArrival, historyState, pathname, search = '', hash = '' }) {
  if (!isArrival || hasStepBehind(historyState)) return []
  if (!laysBehind(pathname)) return []
  const chain = parentChain(pathname) // [page, parent, ..., Home]
  if (!chain || chain.length < 2) return []
  const behind = chain.slice(1).reverse() // [Home, ..., parent]
  const steps = behind.map((to, i) => (i === 0 ? { replace: to } : { push: to }))
  steps.push({ push: pathname + search + hash })
  return steps
}
