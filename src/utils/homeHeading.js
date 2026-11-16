// The welcome heading on Home (assumption P): "Hello, [first name]" when signed in, "Welcome" for a guest.
// The first name comes from the account's full name; nothing new is stored.

const TITLES = new Set(['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', '\u062f', '\u062f\u0643\u062a\u0648\u0631', '\u062f\u0643\u062a\u0648\u0631\u0629'])

export function firstNameOf(fullName) {
  if (typeof fullName !== 'string') return null
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  for (const w of words) {
    const bare = w.replace(/[.\u060c,]+$/g, '').toLowerCase()
    if (!bare || TITLES.has(bare)) continue
    return w.replace(/[,\u060c]+$/g, '')
  }
  return null
}

export function headingText(signedIn, fullName) {
  if (!signedIn) return 'Welcome'
  const first = firstNameOf(fullName)
  return first ? `Hello, ${first}` : 'Welcome'
}
