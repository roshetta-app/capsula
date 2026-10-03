/**
 * src/utils/openInAppBrowser.js
 *
 * 2026-10-03 (image search stops working until the app is reopened): one
 * place that opens a web page in the in-app browser (@capacitor/browser) and
 * recovers when the phone silently ignores the request.
 *
 * What goes wrong: on Android the plugin opens pages through a small helper
 * screen (BrowserControllerActivity, launchMode singleTask). If a previous
 * helper screen is still alive (for example after the tab was closed in an
 * unusual way, or the app came back from the background), a new request is
 * handed to that old screen, which does nothing with it. The request never
 * gets an answer, so the tap looks dead until the app is fully closed and
 * reopened.
 *
 * What this does: it waits for the plugin to answer. With no answer after
 * NO_ANSWER_MS, it closes the old helper screen (Browser.close), waits
 * AFTER_CLOSE_MS for it to go away, and tries once more. If that also fails,
 * it falls back to window.open. While one request is being handled, taps on
 * any other search icon are ignored so two tabs cannot open at once.
 *
 * Web (not native): unchanged, Browser.open opens a new tab as before.
 *
 * Usage: openInAppBrowser(url)   (returns a promise nobody has to wait for)
 */

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

// A healthy open answers in well under a second; this is only the point at
// which it is treated as stuck.
const NO_ANSWER_MS = 1500
// Time for the old helper screen to finish closing before the retry.
const AFTER_CLOSE_MS = 400

let busy = false

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

// Resolves 'ok' (opened), 'failed' (plugin said no) or 'silent' (no answer).
function tryOpen(url) {
  return Promise.race([
    Browser.open({ url }).then(() => 'ok', () => 'failed'),
    wait(NO_ANSWER_MS).then(() => 'silent'),
  ])
}

export async function openInAppBrowser(url) {
  if (!Capacitor.isNativePlatform()) {
    Browser.open({ url }).catch(() => {})
    return
  }
  if (busy) return
  busy = true
  try {
    if (await tryOpen(url) === 'ok') return
    console.warn('[openInAppBrowser] first open not answered, resetting and retrying')
    try {
      await Browser.close()
    } catch {
      // nothing to close
    }
    await wait(AFTER_CLOSE_MS)
    if (await tryOpen(url) === 'ok') return
    console.warn('[openInAppBrowser] retry failed, using window.open')
    window.open(url, '_blank')
  } finally {
    busy = false
  }
}
