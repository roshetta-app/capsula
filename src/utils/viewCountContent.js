/**
 * src/utils/viewCountContent.js
 * 2026-11-22 (step H3): binds the real database, the page's visibility and the phone's online signal to
 * countViewWhenSeen (viewCount.js). Nothing is written to the phone.
 */

import { callRpc } from '../lib/serverCalls'
import { countViewWhenSeen } from './viewCount'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
  isVisible: () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  listen: fn => {
    document.addEventListener('visibilitychange', fn)
    window.addEventListener('online', fn)
  },
  unlisten: fn => {
    document.removeEventListener('visibilitychange', fn)
    window.removeEventListener('online', fn)
  },
  setTimer: (fn, ms) => window.setTimeout(fn, ms),
  clearTimer: id => window.clearTimeout(id),
})

export const startViewCount = (kind, code) => countViewWhenSeen(kind, code, deps())
