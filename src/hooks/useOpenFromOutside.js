/**
 * useOpenFromOutside — opens a page that arrives from outside the running app (step 12.4,
 * Roshetta plan, Phase K).
 *
 * Doors that use it: a tapped notification on the website (the service worker sends the app an
 * OPEN_URL message instead of reloading the window), a tapped notification or banner in the phone
 * app. All of them go through openFromOutside() in utils/openFromOutside.js, so they close any
 * open sheet first, ask Leave or Stay when there is unsaved work, then open the page on top of
 * the current screen (or lay Home, the parent and the page when the app has only just started).
 *
 * Returns a function: open(url). It never throws; a failure is written to the console and the
 * person simply stays where they are.
 *
 * Mount it once, inside the router. This file also listens for the service worker's OPEN_URL
 * message (website and installed app only) and answers it at once, so the worker knows the app
 * took the tap and does not reload the window itself.
 */

import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { openFromOutside } from '../utils/openFromOutside'
import { requestLeave } from '../utils/leaveGuard'
import { closeOpenSheets } from './useBackClose'
import { arrivalRecord } from './useDeepLinkParent'

export function useOpenFromOutside() {
  const navigate = useNavigate()
  const location = useLocation()

  // The latest place and router, read when a tap arrives (the listeners below are set up once).
  const latest = useRef({ navigate, location })
  useEffect(() => {
    latest.current = { navigate, location }
  }, [navigate, location])

  const open = useCallback((url) => {
    const { navigate: go, location: here } = latest.current
    return openFromOutside({
      url,
      here: { pathname: here.pathname, search: here.search },
      isArrival: arrivalRecord.isArrival(here.key),
      navigate: go,
      closeSheets: closeOpenSheets,
      requestLeave,
    }).catch((err) => {
      console.warn('[open-from-outside] could not open', url, err)
      return 'failed'
    })
  }, [])

  // The service worker hands the website tap to the app instead of reloading the window.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined
    function onMessage(event) {
      if (event.data?.type !== 'OPEN_URL') return
      // Answer first: without an answer the worker falls back to reloading the window.
      try { event.ports?.[0]?.postMessage({ ok: true }) } catch { /* the worker will fall back */ }
      open(event.data.url)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [open])

  return open
}
