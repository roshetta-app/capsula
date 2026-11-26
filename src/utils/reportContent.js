/**
 * src/utils/reportContent.js
 * 2026-11-22 (step 14.9b): binds the real database and the phone's online signal to sendReport
 * (reportRules.js). Same pattern as publicProfile.js. Sending needs a signed-in person.
 */

import { callRpc } from '../lib/serverCalls'
import { sendReport } from './reportRules'

const deps = () => ({
  rpc: callRpc,
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const reportContent = (kind, ref, reason) => sendReport(kind, ref, reason, deps())
