/**
 * src/utils/itemStarsContent.js
 * 2026-11-23 (step H7): binds the real database and the phone's online signal to the star rules (itemStars.js).
 * Same pattern as ownerViewsContent.js. Needs a signed-in person.
 */

import { supabase } from '../lib/supabase'
import { sendStar } from './itemStars'

const deps = () => ({
  rpc: (fn, args) => supabase.rpc(fn, args),
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const setItemStar = (kind, code, on) => sendStar(kind, code, on, deps())
