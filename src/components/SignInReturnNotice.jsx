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

import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import {
  readSignInReturnError, looksLikeRefusedSignup, withoutSignInReturnError,
  isSwitchOn, SIGNUPS_PAUSED_KEY, SIGNUPS_PAUSED_MESSAGE,
} from '../utils/launchSwitches'

const returnError = typeof window !== 'undefined' ? readSignInReturnError(window.location.href) : null

export default function SignInReturnNotice() {
  const { toast } = useToast()

  useEffect(() => {
    if (!returnError || !looksLikeRefusedSignup(returnError.description)) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('cms_config').select('value').eq('key', SIGNUPS_PAUSED_KEY).maybeSingle()
        if (cancelled || !isSwitchOn(data?.value)) return
        toast.warning(SIGNUPS_PAUSED_MESSAGE, 9000)
        window.history.replaceState(window.history.state, '', withoutSignInReturnError(window.location.href))
      } catch {
        // The switch could not be read: say nothing and change nothing.
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
