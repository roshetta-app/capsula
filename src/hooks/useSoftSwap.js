// A soft fade for the moment placeholders turn into the real content (2026-11-20).
// Pass `true` while the placeholders show; the returned class name is 'cap-soft-in' for a moment after
// loading ends and '' at every other time, so content that was already there at the first draw
// (a saved copy) does not fade. Put it on the element that holds the content.
import { useEffect, useRef, useState } from 'react'

export function useSoftSwap(isLoading) {
  const [on, setOn] = useState(false)
  const was = useRef(isLoading)

  useEffect(() => {
    let raf = 0
    let timer = 0
    if (was.current && !isLoading) {
      raf = requestAnimationFrame(() => setOn(true))
      timer = setTimeout(() => setOn(false), 400)
    }
    was.current = isLoading
    return () => { cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [isLoading])

  return on ? 'cap-soft-in' : ''
}
