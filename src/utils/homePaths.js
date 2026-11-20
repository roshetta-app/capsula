// Path rules for the app's home (Phase H, step 9.3a). Home is the address "/", Topics is "/conditions".
// Which tab is lit, which screens are a tab's own top screen, where Back goes, and the short name
// Back shows for a screen, all in one plain place so the nav bar, the Back handler and the
// back label can never disagree.
// Step 12.2 (Phase K): the screen table itself (parents, names, kinds) now lives in navRules.js.
// This file keeps its old exports so nothing that imports it changes; only the tab-lighting rules
// are still written here.

import { HOME_PATH, TOPICS_PATH, TAB_PATHS, ACCOUNT_PATH, isMainScreen, parentPath, labelForPath } from './navRules.js'

export { HOME_PATH, TOPICS_PATH, TAB_PATHS, ACCOUNT_PATH, labelForPath }

// Is this tab lit for the current address? Home only for "/", Topics for "/conditions" and below it.
export function isTabActive(tabPath, pathname) {
  if (tabPath === HOME_PATH) return pathname === HOME_PATH
  return pathname === tabPath || pathname.startsWith(tabPath + '/')
}

// Is the person on that tab's own top screen (not a page opened from it)?
export function isExactTabScreen(tabPath, pathname) {
  return pathname === tabPath
}

// Is this one of the five top screens (four tabs and Account)? Back is handled at tab level only here.
export function isTopScreen(pathname) {
  return isMainScreen(pathname)
}

// Where the Back press goes from a top screen: Home from any other one, null from Home (the app exits).
export function backTarget(pathname) {
  return isMainScreen(pathname) ? parentPath(pathname) : null
}
