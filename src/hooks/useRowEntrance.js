// Used by the card components (condition, drug, class, category, roshetta, group). Returns the class
// and delay that fade the card in if it is one of the first cards of a screen that plays the row
// entrance, and an empty object at every other time. Spread it on the card's root element:
//   const rowIn = useRowEntrance()
//   <div className={rowIn.className} style={{ ...base, ...rowIn.style }}>
// The class is removed again when the fade is over, so no animation is left on the card.
import { useContext, useEffect, useState } from 'react'
import { RowEntranceContext } from '../components/ui/rowEntranceContext'
import { claimRowSlot, rowDelayMs, rowFinishMs } from '../utils/rowEntrance'

const NONE = {}

export function useRowEntrance() {
  const gate = useContext(RowEntranceContext)
  const [slot] = useState(() => claimRowSlot(gate, performance.now()))
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (slot < 0) return undefined
    const t = setTimeout(() => setDone(true), rowFinishMs(slot))
    return () => clearTimeout(t)
  }, [slot])

  if (slot < 0 || done) return NONE
  return { className: 'cap-row-in', style: { animationDelay: `${rowDelayMs(slot)}ms` } }
}
