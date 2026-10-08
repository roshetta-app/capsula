/**
 * src/hooks/useFavouriteClasses.js
 *
 * 2026-10-08 (favourite classes and families): keeps the drug classes and drug
 * families a person has saved with the heart in the class sheet. It lives in
 * its own table (favourite_classes) because the main favourites table keys
 * every item by a uuid, and classes and families are known by name.
 *
 * An item is { className, familyName }: the class and family names exactly as
 * stored on the drugs. familyName '' means the whole class.
 *
 * Rules:
 *  - A guest tap saves nothing: it asks to sign in (the tap is kept as the
 *    pending favourite and applied here the moment sign-in finishes).
 *  - Free accounts share one cap for classes and families together
 *    (FAVOURITES_CAP_CLASSES). Adding past it shows the limit sheet.
 *    Removing always works. Pro is never capped.
 *  - A write that fails is undone on screen with a short message.
 *
 * Takes the object returned by useFavourites (for the sign-in prompt, the
 * limit sheet and the pending favourite), so it is created once, inside
 * FavouritesProvider, and read with useFavouritesContext().
 *
 * Returns:
 *   favClasses         { className, familyName }[]  oldest first
 *   isClassFavourited  (className, familyName?) => boolean
 *   toggleClass        (className, familyName?, { silent }?) => Promise<void>
 *   restoreClassAt     (className, familyName, index) => void  (Undo: puts it back where it was)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { useIsPro } from './useIsPro'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { FAVOURITES_CAP_CLASSES } from '../constants/features'

// One string per item, used for the pending favourite and for comparing.
export function classFavKey(className, familyName = '') {
  return `${className}\u0001${familyName}`
}

function splitKey(key) {
  const [className, familyName = ''] = String(key).split('\u0001')
  return { className, familyName }
}

export function useFavouriteClasses(fav) {
  const { user, loading: authLoading } = useAuth()
  const isPro = useIsPro()
  const { toast } = useToast()

  const [favClasses, setFavClasses] = useState([])
  const favRef = useRef(favClasses)
  useEffect(() => { favRef.current = favClasses }, [favClasses])
  const isProRef = useRef(isPro)
  useEffect(() => { isProRef.current = isPro }, [isPro])

  const { pendingFavourite, dismissPendingFavourite, promptSignIn, showCapBlocked } = fav

  const has = useCallback(
    (list, className, familyName) =>
      list.some(i => i.className === className && i.familyName === familyName),
    []
  )

  // Load the saved list when someone signs in, empty it when they sign out.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setFavClasses([]); return }
    let cancelled = false
    supabase
      .from('favourite_classes')
      .select('class_name, family_name')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled || error || !data) return
        setFavClasses(data.map(r => ({ className: r.class_name, familyName: r.family_name })))
      })
    return () => { cancelled = true }
  }, [user, authLoading])

  const write = useCallback((className, familyName, nowFavourited) => {
    const userId = user.id
    return (nowFavourited
      ? supabase.from('favourite_classes').upsert(
          { user_id: userId, class_name: className, family_name: familyName },
          { onConflict: 'user_id,class_name,family_name' }
        )
      : supabase.from('favourite_classes').delete()
          .eq('user_id', userId).eq('class_name', className).eq('family_name', familyName)
    ).then(({ error }) => { if (error) throw error })
  }, [user])

  const toggleClass = useCallback((className, familyName = '', { silent = false } = {}) => {
    if (!className) return Promise.resolve()
    if (!user) {
      promptSignIn('classes', classFavKey(className, familyName))
      return Promise.resolve()
    }
    const list = favRef.current

    if (has(list, className, familyName)) {
      setFavClasses(list.filter(i => !(i.className === className && i.familyName === familyName)))
      if (!silent) toast.info('Removed from Favourites')
      return write(className, familyName, false).catch(() => {
        setFavClasses(prev => has(prev, className, familyName) ? prev : [...prev, { className, familyName }])
        toast.error?.('Could not remove it. Check your connection and try again.')
      })
    }

    if (!isProRef.current && list.length >= FAVOURITES_CAP_CLASSES) {
      showCapBlocked('classes')
      return Promise.resolve()
    }
    setFavClasses([...list, { className, familyName }])
    if (!silent) toast.success('Added to Favourites')
    return write(className, familyName, true).catch(() => {
      setFavClasses(prev => prev.filter(i => !(i.className === className && i.familyName === familyName)))
      toast.error?.('Could not save it. Check your connection and try again.')
    })
  }, [user, has, write, toast, promptSignIn, showCapBlocked])

  // Undo after a remove: put the item back at its old position (add is
  // otherwise append-only). Does nothing if it is already there.
  const restoreClassAt = useCallback((className, familyName, index) => {
    if (!user) return
    const list = favRef.current
    if (has(list, className, familyName)) return
    const next = list.slice()
    next.splice(Math.min(Math.max(index, 0), next.length), 0, { className, familyName })
    setFavClasses(next)
    write(className, familyName, true).catch(() => {
      setFavClasses(prev => prev.filter(i => !(i.className === className && i.familyName === familyName)))
      toast.error('Could not restore it. Check your connection and try again.')
    })
  }, [user, has, write, toast])

  const isClassFavourited = useCallback(
    (className, familyName = '') => has(favClasses, className, familyName),
    [favClasses, has]
  )

  // A guest heart-tap that triggered sign-in: apply it once the saved list has
  // been loaded for the new account, then clear it.
  useEffect(() => {
    if (!user || authLoading) return
    if (!pendingFavourite || pendingFavourite.type !== 'classes') return
    let cancelled = false
    supabase
      .from('favourite_classes')
      .select('class_name, family_name')
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        const loaded = !error && data
          ? data.map(r => ({ className: r.class_name, familyName: r.family_name }))
          : favRef.current
        setFavClasses(loaded)
        favRef.current = loaded
        const { className, familyName } = splitKey(pendingFavourite.id)
        dismissPendingFavourite()
        if (!has(loaded, className, familyName)) toggleClass(className, familyName)
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, pendingFavourite])

  return { favClasses, isClassFavourited, toggleClass, restoreClassAt }
}
