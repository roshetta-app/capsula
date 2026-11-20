// Screen titles (Roshetta plan, Phase K, step 12.11; finding F7, case K32).
//
// Each screen gets its own title, so the installed app's task switcher and the browser history
// tell screens apart. The title comes from the rulebook's screen name, or from the item's own name
// when a page is about one item: "Panadol | Capsula", "Asthma | Capsula", "My roshettas | Capsula".
// Home is just "Capsula". Plain code, no React.

import { labelForPath } from './navRules.js'

export const APP_NAME = 'Capsula'

// name: the item's own name when there is one (a drug, a topic); otherwise the screen's name.
export function titleFor(pathname, name) {
  const item = typeof name === 'string' ? name.trim() : ''
  if (item) return `${item} | ${APP_NAME}`
  const label = labelForPath(pathname)
  if (!label || label === 'Home') return APP_NAME
  return `${label} | ${APP_NAME}`
}
