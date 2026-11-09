/**
 * src/components/admin/CollapseAllContext.jsx
 *
 * 2026-11-09: the "Collapse all" button in the condition editor's top bar.
 * The editor holds a counter and bumps it on every press; every block card and
 * every sheet row listens to it and closes itself when it changes. A card that
 * is built after the press (opening another tab, adding a block) ignores the
 * presses that came before it, so it still opens the way it normally does.
 */
import { createContext } from 'react'

export const CollapseAllContext = createContext(0)
