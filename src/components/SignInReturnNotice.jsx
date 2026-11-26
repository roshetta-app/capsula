/**
 * src/components/SignInReturnNotice.jsx
 *
 * Track S, step S4 (2026-11-25). When the "Pause new sign-ups" switch is on, the database
 * refuses to create a new account, and a new person coming back from Google lands in the app
 * signed out with nothing explaining why (the only trace is an error in the address). This
 * shows one short message in that case, and removes the error words from the address.
 *
 * It only speaks when BOTH are true: the address carries the refused-sign-up error, and the
 * signups_paused switch is really on right now. Any other sign-in problem (a cancelled Google
 * window, a network error) is left exactly as it was.
 *
 * The address is read when this file is first loaded, not when the component mounts: the
 * auth library tidies its own sign-in words out of the address soon after the app starts.
 * Public branch only (mounted next to SignInNudge in App.jsx).
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import InfoSheet from './ui/InfoSheet'
import {
  readSignInReturnError, looksLikeRefusedSignup, withoutSignInReturnError,
  isSwitchOn, SIGNUPS_PAUSED_KEY, SIGNUPS_PAUSED_MESSAGE,
} from '../utils/launchSwitches'

export const returnError = typeof window !== 'undefined' ? readSignInReturnError(window.location.href) : null

// 2026-11-26: the message of a refused sign-up used to be a short toast that was easy to miss, and
// when Google's sign-in popup was used, the popup stayed on 'Signing you in' forever. Now the popup
// sends the error to the main window (message type below) and closes itself, and the main window
// shows a pop-up box that stays until the person closes it.
export const SIGNIN_ERROR_MESSAGE_TYPE = 'capsula-signin-error'

async function switchIsOn() {
  try {
    const { data } = await supabase.from('cms_config').select('value').eq('key', SIGNUPS_PAUSED_KEY).maybeSingle()
    return isSwitchOn(data?.value)
  } catch {
    // The switch could not be read: say nothing.
    return false
  }
}

export default function SignInReturnNotice() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function maybeShow(description) {
      if (!looksLikeRefusedSignup(description)) return
      if (!(await switchIsOn()) || cancelled) return
      setOpen(true)
    }

    // Full-page route: the error is in the address when the app loads.
    if (returnError) {
      maybeShow(returnError.description).then(() => {
        if (!cancelled && looksLikeRefusedSignup(returnError.description)) {
          window.history.replaceState(window.history.state, '', withoutSignInReturnError(window.location.href))
        }
      })
    }

    // Popup route: the popup posts the error here and closes itself.
    function onMessage(e) {
      if (e.origin !== window.location.origin) return
      if (e.data?.type !== SIGNIN_ERROR_MESSAGE_TYPE) return
      maybeShow(String(e.data.description ?? ''))
    }
    window.addEventListener('message', onMessage)
    return () => { cancelled = true; window.removeEventListener('message', onMessage) }
  }, [])

  return (
    <InfoSheet isOpen={open} onClose={() => setOpen(false)} title="Sign-ups are paused">
      {SIGNUPS_PAUSED_MESSAGE}
    </InfoSheet>
  )
}
