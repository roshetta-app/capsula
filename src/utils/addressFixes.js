// Address fixes (Roshetta plan, Phase K, step 12.5).
//
// Some addresses are not real screens but are easy to mistype or guess. Instead of a dead end
// the app quietly sends the person to the screen they most likely meant. Everything else that
// matches no screen gets the "not available" screen (see NotAvailableScreen.jsx).
//
// Two kinds of fix:
//   typos       /favorites, /home, /topics ... (a plain wrong spelling of a real screen)
//   reserved    /drugs/browse, /drugs/group, /drugs/category, /drugs/generic. The drug page
//               reads "/drugs/<anything>" as a drug with that name, so these four words would
//               otherwise show "this drug is not available". They are the starts of real
//               addresses (the browse lists, a group, a category, a generic), so the right list
//               is shown instead.
//
// Plain data and one function, no React and no router, so the checks run it on its own.
// Capital letters and a trailing slash do not matter, like the router.

// lower-case address without a trailing slash -> where it should go
export const ADDRESS_FIXES = {
  '/home':            '/',
  '/favorites':       '/favourites',
  '/favourite':       '/favourites',
  '/topics':          '/conditions',
  '/topic':           '/conditions',
  '/roshetta':        '/roshettas',
  '/drugs/browse':    '/drugs',
  '/drugs/group':     '/drugs/browse/groups',
  '/drugs/category':  '/drugs/browse/category',
  '/drugs/generic':   '/drugs',
}

// The address the person most likely meant, or null when there is no fix for this one.
// Only the path is read; the caller keeps the query and the hash.
export function fixAddress(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null
  const clean = pathname.split(/[?#]/)[0].toLowerCase().replace(/\/+$/, '') || '/'
  return Object.prototype.hasOwnProperty.call(ADDRESS_FIXES, clean) ? ADDRESS_FIXES[clean] : null
}
