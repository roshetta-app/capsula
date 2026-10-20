/**
 * src/components/drugs/groups/useGroupDrugEdits.js
 * 2026-10-21 (Drug groups plan, steps 12.4 and 12.5): adds and removes drugs of one group
 * from the group page (remove mode) and from the Add drugs screen, one tap at a time.
 *
 * Each tap saves at once, but the saves are sent one after the other, each carrying the
 * whole list as it stood after that tap, so quick taps on different drugs never lose one
 * another (plan section 20.1, point 1). While any save is on its way, 'ids' is the list the
 * person has built with their taps; when nothing is waiting it is the group's own list.
 * Saving itself (limits, read only, offline, failed saves, analytics) is the existing
 * setGroupDrugs, which puts the screen back and tells the person when a save is refused.
 *
 * Returns { ids, add, remove }. add and remove return a promise of { ok, reason? } and
 * do nothing (ok: false) when the drug is already in, or not in, the list.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFavouritesContext } from '../../../context/FavouritesContext'

const EMPTY = []

export function useGroupDrugEdits(group) {
  const { setGroupDrugs } = useFavouritesContext()
  const groupId = group?.id ?? null
  const groupIds = group?.brandIds ?? EMPTY

  // The list built from taps while saves are waiting; null when none is waiting.
  const [intended, setIntended] = useState(null)
  const intendedRef = useRef(null)
  const groupIdsRef = useRef(groupIds)
  const waitingRef = useRef(0)
  const chainRef = useRef(Promise.resolve())

  useEffect(() => { groupIdsRef.current = groupIds }, [groupIds])

  const change = useCallback((nextIds) => {
    if (!groupId) return Promise.resolve({ ok: false, reason: 'missing' })
    intendedRef.current = nextIds
    setIntended(nextIds)
    waitingRef.current += 1
    const run = async () => {
      let res
      try {
        res = await setGroupDrugs(groupId, nextIds)
      } catch {
        res = { ok: false, reason: 'error' }
      }
      waitingRef.current -= 1
      // A saved list is the group's list from now on, even before the screen has redrawn.
      if (res?.ok) groupIdsRef.current = nextIds
      if (waitingRef.current === 0) {
        intendedRef.current = null
        setIntended(null)
      } else if (!res?.ok) {
        // A refused save: later saves carry on from the group's own list again.
        intendedRef.current = groupIdsRef.current
        setIntended(groupIdsRef.current)
      }
      return res
    }
    const promise = chainRef.current.then(run)
    chainRef.current = promise.catch(() => {})
    return promise
  }, [groupId, setGroupDrugs])

  const current = () => intendedRef.current ?? groupIdsRef.current

  const add = useCallback((brandId) => {
    const list = current()
    if (list.includes(brandId)) return Promise.resolve({ ok: false, reason: 'already' })
    return change([...list, brandId])
  }, [change])

  const remove = useCallback((brandId) => {
    const list = current()
    if (!list.includes(brandId)) return Promise.resolve({ ok: false, reason: 'missing' })
    return change(list.filter(b => b !== brandId))
  }, [change])

  return { ids: intended ?? groupIds, add, remove }
}
