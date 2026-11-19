// A soft fade for the moment placeholders turn into the real content (2026-11-20).
// Pass `true` while the placeholders show; the returned class name is 'cap-soft-in' for a moment after
// loading ends and '' at every other time, so content that was already there at the first draw
// (a saved copy) does not fade. Put it on the element that holds the content.
// 2026-11-20 (step 11.19): the class is now decided while rendering, so it is on the content in the very
// first frame it appears (before, it was added a frame later and the content could blink at full strength
// before fading).
import { useEffect, useState } from 'react'

export function useSoftSwap(isLoading) {
  const [state, setState] = useState({ was: isLoading, on: false })
  if (state.was !== isLoading) {
    setState({ was: isLoading, on: state.was && !isLoading })
  }

  useEffect(() => {
    if (!state.on) return undefined
    const timer = setTimeout(() => setState(s => ({ ...s, on: false })), 400)
    return () => clearTimeout(timer)
  }, [state.on])

  return state.on ? 'cap-soft-in' : ''
}
