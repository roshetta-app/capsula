/**
 * src/hooks/useOnlineStatus.js
 * Phase 2K — PWA & Offline Infrastructure
 *
 * Listens to window online/offline events.
 * Returns { isOnline: boolean }
 *
 * SSR-safe: defaults to true (navigator may be undefined in non-browser envs).
 */

import { useState, useEffect } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    function handleOnline()  { setIsOnline(true)  }
    function handleOffline() { setIsOnline(false) }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
