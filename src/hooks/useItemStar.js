/**
 * src/hooks/useItemStar.js
 * 2026-11-23 (step H7): for the shared roshetta page and the shared group page. Holds the star the page shows:
 *
 *   { visible, stars, starred, busy, notice, toggle }
 *
 * visible  false when the answer carried no star count (database not changed yet, or the page has no answer).
 * toggle   a signed-in visitor stars or un-stars at once (the number moves first, and is put back if the database
 *          refuses); a guest is asked to sign in, and the star is finished by itself afterwards.
 * Nothing is kept on the phone: the shown star lives in this page's memory and is read again from the page's answer.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { useFavouritesContext } from '../context/FavouritesContext'
import { setItemStar } from '../utils/itemStarsContent'
import { afterTap, isStarRequest, starNotice, starSignInId } from '../utils/itemStars'

// serverStars/serverStarred: from the page's answer. ready: the answer was asked for the person now signed in.
export function useItemStar(kind, code, { stars, starred, ready, isOwner }) {
  const { user, loading: authLoading } = useAuth()
  const { promptSignIn, pendingFavourite } = useFavouritesContext()
  const userId = user?.id ?? null
  const key = `${kind}:${code}:${userId ?? ''}`
  const [local, setLocal] = useState(null)   // { key, stars, starred } after a tap
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState(null)
  const busyRef = useRef(false)
  const armedRef = useRef(isStarRequest(pendingFavourite, code))

  const own = local && local.key === key ? local : null
  const shown = own ?? { stars, starred: starred === true }

  const run = useCallback(async (on) => {
    if (busyRef.current || stars === null || stars === undefined) return
    const before = own ?? { stars, starred: starred === true }
    busyRef.current = true
    setBusy(true)
    setNotice(null)
    setLocal({ key, ...afterTap(before, on) })
    const r = await setItemStar(kind, code, on)
    busyRef.current = false
    setBusy(false)
    if (r.status === 'ok') {
      setLocal({ key, stars: r.stars, starred: r.starred })
      return
    }
    setLocal({ key, stars: before.stars, starred: before.starred })
    if (r.status !== 'own') setNotice(starNotice(r.status))
  }, [kind, code, key, stars, starred, own])

  const toggle = useCallback(() => {
    if (authLoading || busyRef.current || isOwner) return
    if (!user) {
      armedRef.current = true
      promptSignIn('groups', starSignInId(code))
      return
    }
    run(!shown.starred)
  }, [authLoading, isOwner, user, promptSignIn, code, run, shown.starred])

  // Finish a star that waited for sign-in, or drop it when the sign-in sheet was closed without signing in.
  useEffect(() => {
    if (!armedRef.current || authLoading) return undefined
    if (!user) {
      if (!pendingFavourite) armedRef.current = false
      return undefined
    }
    if (!ready) return undefined
    const t = setTimeout(() => {
      armedRef.current = false
      if (!isOwner && !shown.starred) run(true)
    }, 0)
    return () => clearTimeout(t)
  }, [authLoading, user, pendingFavourite, ready, isOwner, shown.starred, run])

  return {
    visible: stars !== null && stars !== undefined,
    stars: shown.stars, starred: shown.starred, busy, notice, toggle,
  }
}
