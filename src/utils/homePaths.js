// Path rules for the app's home (Phase H, step 9.3a). Home is the address "/", Topics is "/conditions".
// Which tab is lit, which screens are a tab's own top screen, where Back goes, and the short name
// Back shows for a screen, all in one plain place so the nav bar, the Back handler and the
// back label can never disagree.

export const HOME_PATH = '/'
export const TOPICS_PATH = '/conditions'

// The tabs in the bottom bar, in order, as paths.
export const TAB_PATHS = ['/', '/conditions', '/drugs', '/favourites']
export const ACCOUNT_PATH = '/account'

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
  return [...TAB_PATHS, ACCOUNT_PATH].includes(pathname)
}

// Where the Back press goes from a top screen: Home from any other one, null from Home (the app exits).
export function backTarget(pathname) {
  if (!isTopScreen(pathname)) return null
  return pathname === HOME_PATH ? null : HOME_PATH
}

// Short name of a screen, for the Back arrow of the screen opened after it.
export function labelForPath(path) {
  if (!path) return null
  if (path === HOME_PATH) return 'Home'
  if (path === TOPICS_PATH) return 'Topics'
  if (path === '/drugs') return 'Drugs'
  if (path.startsWith('/drugs/category/')) return 'Category'
  if (path === '/drugs/browse/category') return 'Categories'
  if (path === '/drugs/browse/class') return 'Classes'
  if (path === '/drugs/browse/groups') return 'My groups'
  if (/^\/drugs\/group\/[^/]+\/add$/.test(path)) return 'Add drugs'
  if (path.startsWith('/drugs/group/') || path.startsWith('/g/')) return 'Group'
  if (path.startsWith('/r/')) return 'Roshetta'
  if (path === '/roshettas') return 'My roshettas'
  if (path.startsWith('/drugs/generic/')) return 'Generic'
  if (path.startsWith('/drugs/')) return 'Drug'
  if (path.startsWith('/conditions/')) return 'Topic'
  if (path === '/favourites') return 'Favourites'
  if (path === ACCOUNT_PATH) return 'Account'
  return null
}
