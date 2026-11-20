/**
 * useTapGuard — one open per tap and one screen per Back press (Roshetta plan, Phase K, step 12.6).
 *
 * Returns { openPage(path, options), goBack() }. They do what navigate(path, options) and
 * navigate(-1) do, except that a second open of the same address within a short moment is ignored
 * (a double tap on a row) and a Back press is ignored while the previous one is still settling.
 * One guard is shared by the whole app (utils/tapGuard.js), so every door behaves the same.
 * The doors are moved to this in step 12.7; nothing calls it before that.
 */
import { useCallback, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createTapGuard } from '../utils/tapGuard'

const guard = createTapGuard()

export function useTapGuard() {
  const navigate = useNavigate()
  const location = useLocation()

  // The screen changed: the next Back counts straight away.
  useEffect(() => { guard.settled() }, [location.key])

  const openPage = useCallback((path, options) => {
    return guard.open(path, () => navigate(path, options))
  }, [navigate])

  const goBack = useCallback(() => guard.back(() => navigate(-1)), [navigate])

  return { openPage, goBack }
}
