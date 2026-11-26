/**
 * src/components/RemoteMessageNotice.jsx
 *
 * Track S, step S10 (2026-11-26). Shows the short message the remote address book file may carry
 * (for example a maintenance notice) as a pop-up box, once per message text. Nothing is shown when
 * the file has no message. Public branch only (mounted next to SignInReturnNotice in App.jsx).
 */

import { useEffect, useState } from 'react'
import InfoSheet from './ui/InfoSheet'
import { messageToShow, markMessageSeen, CONFIG_EVENT } from '../lib/remoteConfig'

function storage() {
  try { return window.localStorage } catch { return null }
}

export default function RemoteMessageNotice() {
  const [message, setMessage] = useState('')

  useEffect(() => {
    function check() {
      const s = storage()
      if (!s) return
      const m = messageToShow(s)
      if (m) setMessage(m)
    }
    check()
    window.addEventListener(CONFIG_EVENT, check)
    return () => window.removeEventListener(CONFIG_EVENT, check)
  }, [])

  function close() {
    const s = storage()
    if (s) markMessageSeen(s, message)
    setMessage('')
  }

  return (
    <InfoSheet isOpen={!!message} onClose={close} title="Capsula">
      {message}
    </InfoSheet>
  )
}
