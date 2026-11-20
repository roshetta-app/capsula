/**
 * useOpenTopic — the one door for opening a topic from a list (Roshetta plan, Phase K, step 12.7b).
 *
 * Returns openTopic(topic). It opens the topic page as one new step through the shared tap guard
 * (a double tap opens it once, so one Back returns). The rules are in utils/openTopic.js.
 * Used by the Topics screen, its recently viewed chips and the Favourites screen; the featured
 * card on Home uses the guard's openPage directly (its address is built by utils/homeFeatured.js).
 */
import { useCallback } from 'react'
import { useTapGuard } from './useTapGuard'
import { openTopicWith } from '../utils/openTopic'
import { ROUTES } from '../router'

export function useOpenTopic() {
  const { openPage } = useTapGuard()
  return useCallback(
    topic => openTopicWith(topic, { openPage, pathFor: ROUTES.CONDITION_DETAIL }),
    [openPage],
  )
}
