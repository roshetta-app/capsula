/**
 * src/components/drugs/DrugSearchBar.jsx
 *
 * 2026-10-15: passes the keyboard's Search key on ('onSubmit'), after sending any text
 * still waiting out the pause.
 *
 * 2026-10-14 (typing lag): the shared SearchBar, wrapped so the letters show up
 * at once and the rest of the app hears about them a moment later.
 *
 * Before: every keystroke changed the one shared 'query' held by DrugProvider, so
 * the whole drug screen (and everything reading the drug context) redrew before the
 * next letter could appear, which is what felt heavy on a phone. Now the box keeps
 * its own text, shows each letter immediately, and passes the text on after a short
 * pause in typing (or at once when the box is cleared). A change that comes from
 * outside (a tapped suggestion, a cleared search) still replaces the text.
 */

import { forwardRef, useEffect, useRef, useState } from 'react'
import SearchBar from '../ui/SearchBar'

const PASS_ON_DELAY_MS = 120

const DrugSearchBar = forwardRef(function DrugSearchBar({ value, onChange, onSubmit, ...rest }, ref) {
  const [text, setText] = useState(value ?? '')
  const timerRef   = useRef(null)
  const lastSentRef = useRef(value ?? '')
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // The typed text changed from outside: show it, and drop any pending pass-on.
  useEffect(() => {
    const incoming = value ?? ''
    if (incoming === lastSentRef.current) return
    clearTimeout(timerRef.current)
    lastSentRef.current = incoming
    setText(incoming)
  }, [value])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  function handleChange(next) {
    setText(next)
    clearTimeout(timerRef.current)
    if (next === '') {
      lastSentRef.current = next
      onChangeRef.current(next)
      return
    }
    timerRef.current = setTimeout(() => {
      lastSentRef.current = next
      onChangeRef.current(next)
    }, PASS_ON_DELAY_MS)
  }

  // The Search key: send any text still waiting out the short pause first, so the one
  // who hears about the submit already has the final text.
  function handleSubmit(final) {
    clearTimeout(timerRef.current)
    if (final !== lastSentRef.current) {
      lastSentRef.current = final
      onChangeRef.current(final)
    }
    onSubmit?.(final)
  }

  return <SearchBar ref={ref} value={text} onChange={handleChange} onSubmit={onSubmit ? handleSubmit : undefined} {...rest} />
})

export default DrugSearchBar
