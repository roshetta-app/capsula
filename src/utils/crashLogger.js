/**
 * src/utils/crashLogger.js
 * Phase 3K — Crash Logger
 *
 * Sends uncaught React errors to Supabase table: crash_logs
 * Called exclusively by ErrorBoundary.
 * Fails silently — must never cause secondary errors.
 */

import { insertCrashLog } from '../lib/logQueries'

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? 'unknown'

/**
 * Log a crash to Supabase.
 *
 * @param {Error}  error           — the caught error object
 * @param {string} componentStack  — React component stack from ErrorBoundary
 */
export async function logCrash(error, componentStack) {
  try {
    await insertCrashLog({
      error_message:   error?.message   ?? String(error),
      error_stack:     error?.stack     ?? null,
      component_stack: componentStack   ?? null,
      app_version:     APP_VERSION,
    })
  } catch {
    // Must never throw — crash logger cannot crash the app
  }
}
