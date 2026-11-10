/**
 * src/utils/pageTitle.js
 *
 * Lets an editor screen (drug editor, condition editor) put the name of the
 * item being edited into the admin shell's phone top bar, in place of the
 * generic page label ("Drug Library", "Conditions").
 *
 *   - The editor calls setPageTitle(name) and runs the returned function when
 *     it leaves, which puts the normal label back.
 *   - The admin layout reads the name with usePageTitle() and shows it when
 *     there is one.
 *
 * An empty name counts as "no name": the normal label shows.
 */

import { useSyncExternalStore } from 'react'

let title = ''
const listeners = new Set()

export function setPageTitle(name) {
  const next = typeof name === 'string' ? name.trim() : ''
  if (next !== title) {
    title = next
    listeners.forEach(l => l())
  }
  // Clear only if nobody has set a newer name in the meantime.
  return () => {
    if (title === next) {
      title = ''
      listeners.forEach(l => l())
    }
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePageTitle() {
  return useSyncExternalStore(subscribe, () => title, () => '')
}
