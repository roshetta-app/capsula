// Carries the row-entrance gate (see utils/rowEntrance.js) from PageEntrance down to the cards.
// null means: no row entrance on this screen right now.
import { createContext } from 'react'

export const RowEntranceContext = createContext(null)
