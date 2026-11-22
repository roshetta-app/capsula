/**
 * src/utils/libraryReportContent.js
 * 2026-11-22 (Track I, step I4): binds the real database and the phone's online signal to sendLibraryReport
 * (libraryReportRules.js). Same pattern as reportContent.js. Sending needs a signed-in person.
 */

import { supabase } from '../lib/supabase'
import { sendLibraryReport } from './libraryReportRules'

const deps = () => ({
  rpc: (fn, args) => supabase.rpc(fn, args),
  isOnline: () => !(typeof navigator !== 'undefined' && navigator.onLine === false),
})

export const libraryReportContent = (kind, slug, reason, note) => sendLibraryReport(kind, slug, reason, note, deps())
