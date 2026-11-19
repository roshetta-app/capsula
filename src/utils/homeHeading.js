// The welcome on Home (assumption P, changed 2026-11-16, Phase J step 11.2).
// A guest (or an account with no usable name) sees "Welcome to Capsula". A signed-in account with a name
// sees a small "Hello," and the first name big under it. The first name comes from the account's full
// name; nothing new is stored.
//
// First name rule: the first word after any title (Dr, Prof, ...). Arabic first names are often two words
// (Abd Elrahman, Abu Bakr), so when that word is a known starter (Abd, Abdel, Abu, Ibn, ...) the next
// word is part of the first name too, and one more when that is only the article (Abd El Rahman).

const TITLES = new Set(['dr', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', '\u062f', '\u062f\u0643\u062a\u0648\u0631', '\u062f\u0643\u062a\u0648\u0631\u0629'])

// Words that start a two-word first name. Latin spellings in lower case; Arabic with the letters as written.
const STARTERS = new Set([
  'abd', 'abdel', 'abdal', 'abdul', 'abdol', 'abu', 'abou', 'abo', 'ibn', 'bin', 'um', 'umm', 'om',
  '\u0639\u0628\u062f', '\u0623\u0628\u0648', '\u0627\u0628\u0648', '\u0623\u0628\u064a', '\u0627\u0628\u0646', '\u0623\u0645', '\u0627\u0645',
])
// A word that is only the article: "El" / "Al" (Latin) or the Arabic "\u0627\u0644".
const ARTICLES = new Set(['el', 'al', 'ul', '\u0627\u0644'])

function bare(word) {
  return word.replace(/[.\u060c,]+$/g, '').toLowerCase()
}

export function firstNameOf(fullName) {
  if (typeof fullName !== 'string') return null
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  for (let i = 0; i < words.length; i++) {
    const b = bare(words[i])
    if (!b || TITLES.has(b)) continue
    const parts = [words[i].replace(/[,\u060c]+$/g, '')]
    if (STARTERS.has(b) && i + 1 < words.length && !TITLES.has(bare(words[i + 1]))) {
      let j = i + 1
      parts.push(words[j].replace(/[,\u060c]+$/g, ''))
      if (ARTICLES.has(bare(words[j])) && j + 1 < words.length) {
        j += 1
        parts.push(words[j].replace(/[,\u060c]+$/g, ''))
      }
    }
    return parts.join(' ')
  }
  return null
}

// { greeting, title }: greeting is the small "Hello," (or null), title is the big text.
export function welcomeParts(signedIn, fullName) {
  if (!signedIn) return { greeting: null, title: 'Welcome to Capsula' }
  const first = firstNameOf(fullName)
  return first ? { greeting: 'Hello,', title: first } : { greeting: null, title: 'Welcome to Capsula' }
}
