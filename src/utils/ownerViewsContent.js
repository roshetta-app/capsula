/**
 * src/utils/ownerViewsContent.js
 * 2026-11-23 (step H4): binds the real database and the phone's online signal to the owner view rules
 * (ownerViews.js). Same pattern as hiddenContent.js. Both calls need a signed-in person and only ever see
 * that person's own items.
 */

import { callRpc } from '../lib/serverCalls'
import { loadItemViews, loadProfileViews } from './ownerViews'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchItemViews = (kind, id) => loadItemViews(kind, id, deps())
export const fetchProfileViews = () => loadProfileViews(deps())
