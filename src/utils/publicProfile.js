/**
 * src/utils/publicProfile.js
 * 2026-11-22 (Public profile plan, step 14.6): binds the real database and the phone's online signal to the
 * rules in publicProfileFetch.js. Same pattern as sharedRoshetta.js. No sign-in is needed to open a profile;
 * the answer carries is_owner only when the signed-in person is the owner. Nothing is kept on the phone.
 *
 *   fetchPublicProfile (handle)       see loadPublicProfile
 *   fetchHandleAvailable (handle)     see checkHandleAvailable (signed in only)
 */

import { callRpc } from '../lib/serverCalls'
import { loadPublicProfile, checkHandleAvailable } from './publicProfileFetch'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const fetchPublicProfile = (handle) => loadPublicProfile(handle, deps())
export const fetchHandleAvailable = (handle) => checkHandleAvailable(handle, deps())
