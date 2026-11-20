// What the on-screen Back arrow says (Roshetta plan, Phase K, step 12.8; finding F9).
//
// Before: the name came only from the page the app had noted one step back, and was "Back" when
// that was unknown. Now, when the earlier page is unknown (for example after a refresh in the
// middle of a session, when the app has lost its notes), the arrow falls back to the name of the
// page's parent from the rulebook, so it says "Home" or "Drugs" instead of "Back".
//
//   step        the history position of this page (0 = the first step, nothing behind)
//   prevPath    the address noted one step back, or undefined when unknown
//   pathname    the address of this page
//
// Rules, in order:
//   1. Nothing behind (step 0): no name. (A page opened first gets its parents laid behind it by
//      the arrival record, so this only means a stand-alone page such as a shared link.)
//   2. The earlier page is known: its own name (null if that address has none).
//   3. The earlier page is unknown: the name of this page's parent, but only for pages that get a
//      parent laid behind them. A shared page stands alone, so it keeps the plain "Back".
// Plain code, no React; the checks run it directly.

import { labelForPath, parentPath, laysBehind } from './navRules.js'

export function backLabelFor({ step, prevPath, pathname }) {
  if (!(step > 0)) return null
  if (typeof prevPath === 'string' && prevPath) return labelForPath(prevPath)
  if (!laysBehind(pathname)) return null
  const parent = parentPath(pathname)
  return parent ? labelForPath(parent) : null
}
