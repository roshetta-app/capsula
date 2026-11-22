// Plain rules for the public profile (step 14.2). No imports, no network.
// These MIRROR the database rules of migration 14.1 (profile_public_foundations_14_1):
// the app uses them to preview and to word the refusals; the database is the real guard.
// The blocked-words list lives only in the database (edited in the CMS), so the app can
// never preview it: a "blocked" answer always comes back from the database.

// ---- avatars: the same fixed list the database checks (table avatar_codes) ----
export const AVATAR_CODES = [
  'capsule-teal', 'stethoscope-blue', 'heart-rose', 'leaf-green',
  'pill-amber', 'cross-red', 'drop-sky', 'star-violet',
  'syringe-indigo', 'flask-orange', 'shield-slate', 'sun-yellow',
  'moon-navy', 'bandage-pink', 'bolt-lime', 'flower-coral',
]
export const isAvatarCode = (code) => typeof code === 'string' && AVATAR_CODES.includes(code)

// ---- usernames (the database word is "handle") ----
export const HANDLE_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/
export const HANDLE_CHANGE_DAYS = 30
export const REMOVED_WAIT_DAYS = 30
export const RESERVED_HANDLES = [
  'settings', 'account', 'profile', 'profiles', 'roshetta', 'roshettas', 'groups', 'group',
  'drugs', 'topics', 'search', 'login', 'signin', 'signout', 'logout', 'signup', 'help',
  'terms', 'privacy', 'about', 'home', 'share', 'edit', 'new', 'api', 'cms', 'static',
  'assets', 'support', 'contact', 'report', 'capsula',
]

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const toLatinDigits = (s) => String(s ?? '').replace(/[٠-٩]/g, (c) => String(ARABIC_INDIC.indexOf(c)))
const chars = (s) => Array.from(s).length // counts letters, not UTF-16 units

// ---- flattening (same as profile_flatten in the database) ----
const FLATTEN_DROP = /[\s.,'_­​-‏‪-‮⁠-⁤﻿ـً-ٰٟ-]/g
const FLATTEN_FROM = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿأإآٱىة10'
const FLATTEN_TO = 'aaaaaaceeeeiiiinooooouuuuyyاااايهlo'
const FLATTEN_MAP = new Map(Array.from(FLATTEN_FROM).map((c, i) => [c, Array.from(FLATTEN_TO)[i]]))

export function flatten(text) {
  const s = toLatinDigits(text).toLowerCase().replace(FLATTEN_DROP, '')
  return Array.from(s).map((c) => FLATTEN_MAP.get(c) ?? c).join('')
}

// ---- cleaning what people type ----
export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim()
}
export const cleanBio = cleanName

// Quiet typing help for the username field: capitals to small, spaces to hyphens,
// Arabic-Indic digits to 0-9, runs of hyphens to one. Letters in other scripts are left
// alone so the refusal message can explain.
export function cleanHandle(raw) {
  return toLatinDigits(raw).toLowerCase().replace(/\s+/g, '-').replace(/-{2,}/g, '-')
}

// ---- text rules (same order and codes as profile_text_issue) ----
const NAME_CHARS = /^[A-Za-zÀ-ÖØ-öø-ÿء-ؿف-يً-ْ٠-٩ 0-9.,'-]+$/
const BIO_CHARS = /^[A-Za-zÀ-ÖØ-öø-ÿء-ؿف-يً-ْ٠-٩،؛؟ 0-9.,'!?:;()&+/"-]+$/
const WEB_WORDS = /https?|www|:\/\//
const WEB_DOMAIN = /[a-z0-9]\.(com|net|org|info|biz|io|me|co|app|link|ly|gl|xyz|eg|tv|cc|ws|to)([^a-z]|$)/

// 'web' | 'phone' | null. Used alone for item names and descriptions (no character rule there).
export function webOrPhoneIssue(text) {
  const s = String(text ?? '').trim()
  if (!s) return null
  const compact = s.toLowerCase().replace(/\s+/g, '')
  if (WEB_WORDS.test(compact) || WEB_DOMAIN.test(compact)) return 'web'
  const digits = toLatinDigits(s).replace(/[^0-9]/g, '')
  if (digits.length >= 8) return 'phone'
  return null
}

// 'length' | 'chars' | 'web' | 'phone' | null
export function nameIssue(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = chars(s)
  if (n < 2 || n > 40) return 'length'
  if (!NAME_CHARS.test(s)) return 'chars'
  return webOrPhoneIssue(s)
}
export function bioIssue(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return null
  if (chars(s) > 160) return 'length'
  if (!BIO_CHARS.test(s)) return 'chars'
  return webOrPhoneIssue(s)
}

// 'format' | 'reserved' | null (a blocked word is answered only by the database)
export function handleIssue(handle) {
  const h = String(handle ?? '')
  if (!HANDLE_RE.test(h) || h.includes('--')) return 'format'
  if (RESERVED_HANDLES.includes(h)) return 'reserved'
  return null
}

// ---- suggestions: only from a Latin name; an Arabic name gets none ----
const ARABIC_LETTER = /[؀-ۿ]/
const ACCENT_FROM = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ'
const ACCENT_TO = 'aaaaaaceeeeiiiinooooouuuuyy'

export function suggestionBase(name) {
  const raw = cleanName(name)
  if (!raw || ARABIC_LETTER.test(raw)) return null
  let s = toLatinDigits(raw).toLowerCase()
  s = Array.from(s).map((c) => { const i = ACCENT_FROM.indexOf(c); return i >= 0 ? ACCENT_TO[i] : c }).join('')
  s = s.replace(/['.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  s = s.slice(0, 30).replace(/-+$/g, '')
  return s.length >= 3 ? s : null
}

// taken: array or Set of handles known to be taken. Returns [] (no suggestion),
// [base] when free, or two free variants when the base is taken.
export function suggestHandles(name, taken = []) {
  const base = suggestionBase(name)
  if (!base) return []
  const isTaken = (h) => (taken instanceof Set ? taken.has(h) : taken.includes(h)) || handleIssue(h) !== null
  if (!isTaken(base)) return [base]
  const out = []
  for (let i = 1; i <= 99 && out.length < 2; i++) {
    const suffix = `-${i}`
    const candidate = base.slice(0, 30 - suffix.length).replace(/-+$/g, '') + suffix
    if (!isTaken(candidate)) out.push(candidate)
  }
  return out
}

// ---- time limits ----
const DAY = 24 * 60 * 60 * 1000
function daysLeft(since, days, now) {
  if (!since) return 0
  const t = new Date(since).getTime()
  if (Number.isNaN(t)) return 0
  const left = t + days * DAY - new Date(now).getTime()
  return left > 0 ? Math.ceil(left / DAY) : 0
}
// Days until the username may change again (0 = now). A person with no username yet may always set one.
export function handleChangeDaysLeft(profile, now = Date.now()) {
  if (!profile?.handle) return 0
  return daysLeft(profile.handle_changed_at, HANDLE_CHANGE_DAYS, now)
}
// Days until a removed public profile may be set up again (0 = now).
export function removedWaitDaysLeft(profile, now = Date.now()) {
  if (profile?.handle) return 0
  return daysLeft(profile?.public_removed_at, REMOVED_WAIT_DAYS, now)
}

// ---- the two states, worked out from filled-in data, never from a flag ----
// CONFIRM against the wizard: which stored occupation value means a physician.
export const PHYSICIAN_OCCUPATIONS = ['physician', 'doctor']
const filled = (v) => typeof v === 'string' && v.trim() !== ''
export const isPhysician = (profile) => PHYSICIAN_OCCUPATIONS.includes(String(profile?.occupation ?? '').trim().toLowerCase())

// Required: name, occupation, country (+ specialty for physicians). Phone, gender and governorate are never required.
export function detailsMissing(profile) {
  const missing = []
  if (!filled(profile?.full_name)) missing.push('full_name')
  if (!filled(profile?.occupation)) missing.push('occupation')
  if (!filled(profile?.country)) missing.push('country')
  if (isPhysician(profile) && !filled(profile?.specialty)) missing.push('specialty')
  return missing
}
export const detailsComplete = (profile) => detailsMissing(profile).length === 0
export function detailsProgress(profile) {
  const total = 3 + (isPhysician(profile) ? 1 : 0)
  return { done: total - detailsMissing(profile).length, total }
}
export const publicCardSetUp = (profile) => filled(profile?.handle)
// The ONE card the Profile tab shows: details first, then the public card, then nothing.
export function nextProfileCard(profile) {
  if (!detailsComplete(profile)) return 'details'
  if (!publicCardSetUp(profile)) return 'public'
  return null
}

// ---- short messages (never name a blocked word) ----
export const MESSAGES = {
  name_length: 'Use 2 to 40 characters for your name.',
  name_chars: "Names can use letters, numbers, spaces and . , ' - only.",
  name_web: 'Remove the web address or phone number.',
  name_phone: 'Remove the web address or phone number.',
  name_blocked: "This name can't be used. Try another.",
  name_required: 'Add your name first.',
  bio_length: 'Keep your bio to 160 characters or fewer.',
  bio_chars: "Bios can use letters, numbers, spaces and basic punctuation only.",
  bio_web: 'Remove the web address or phone number.',
  bio_phone: 'Remove the web address or phone number.',
  handle_format: 'Usernames use English letters, numbers and hyphens only. Your name can still be in Arabic.',
  handle_reserved: "This username isn't available.",
  handle_blocked: "This username isn't available.",
  handle_taken: 'That username is taken.',
  handle_too_soon: 'You can change your username once every 30 days.',
  removed_wait: 'You can set up a new profile 30 days after removing the old one.',
  avatar_unknown: 'Pick an avatar from the list.',
  not_signed_in: 'Sign in first.',
}
export const GENERIC_ERROR = 'Something went wrong. Try again.'

// Database codes come back as the error message, for example "handle_taken".
export function messageForCode(code) {
  const key = String(code ?? '').trim()
  return MESSAGES[key] ?? GENERIC_ERROR
}
export function messageForError(error) {
  return messageForCode(error?.message)
}
// Wording for a local refusal, so previews match what the database would say.
export const nameMessage = (issue) => (issue ? messageForCode(`name_${issue}`) : null)
export const bioMessage = (issue) => (issue ? messageForCode(`bio_${issue}`) : null)
export const handleMessage = (issue) => (issue ? messageForCode(`handle_${issue}`) : null)
// Item names and descriptions made public: only the web/phone rule applies.
export const itemTextMessage = (issue) => (issue ? 'Remove the web address or phone number.' : null)
