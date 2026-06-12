/**
 * src/utils/specialtyTokens.js
 *
 * Curated specialty color token system.
 *
 * Each token defines:
 *   bg   — background tint for the icon bubble / filter pill
 *   fg   — icon / text foreground color on that tint
 *   pill — solid background for active filter pill (slightly richer than bg)
 *
 * Two variants per token: light + dark mode.
 * Admins pick a token key — never a raw hex.
 * If the specialty list grows beyond 14, tokens are reused (by design).
 * The two 'slate' / 'stone' entries are the safe fallback defaults.
 */

export const SPECIALTY_TOKENS = {
  sky: {
    label: 'Sky',
    light: { bg: '#E0F2FE', fg: '#0369A1', pill: '#0284C7' },
    dark:  { bg: '#082F49', fg: '#7DD3FC', pill: '#0284C7' },
  },
  indigo: {
    label: 'Indigo',
    light: { bg: '#EEF2FF', fg: '#4338CA', pill: '#4F46E5' },
    dark:  { bg: '#1E1B4B', fg: '#A5B4FC', pill: '#4F46E5' },
  },
  violet: {
    label: 'Violet',
    light: { bg: '#F5F3FF', fg: '#6D28D9', pill: '#7C3AED' },
    dark:  { bg: '#2E1065', fg: '#C4B5FD', pill: '#7C3AED' },
  },
  rose: {
    label: 'Rose',
    light: { bg: '#FFF1F2', fg: '#BE123C', pill: '#E11D48' },
    dark:  { bg: '#4C0519', fg: '#FDA4AF', pill: '#E11D48' },
  },
  pink: {
    label: 'Pink',
    light: { bg: '#FDF2F8', fg: '#9D174D', pill: '#DB2777' },
    dark:  { bg: '#500724', fg: '#F9A8D4', pill: '#DB2777' },
  },
  fuchsia: {
    label: 'Fuchsia',
    light: { bg: '#FDF4FF', fg: '#86198F', pill: '#A21CAF' },
    dark:  { bg: '#3B0764', fg: '#E879F9', pill: '#A21CAF' },
  },
  emerald: {
    label: 'Emerald',
    light: { bg: '#ECFDF5', fg: '#065F46', pill: '#059669' },
    dark:  { bg: '#022C22', fg: '#6EE7B7', pill: '#059669' },
  },
  teal: {
    label: 'Teal',
    light: { bg: '#F0FDFA', fg: '#0F766E', pill: '#0D9488' },
    dark:  { bg: '#042F2E', fg: '#5EEAD4', pill: '#0D9488' },
  },
  cyan: {
    label: 'Cyan',
    light: { bg: '#ECFEFF', fg: '#0E7490', pill: '#0891B2' },
    dark:  { bg: '#083344', fg: '#67E8F9', pill: '#0891B2' },
  },
  amber: {
    label: 'Amber',
    light: { bg: '#FFFBEB', fg: '#92400E', pill: '#D97706' },
    dark:  { bg: '#3B1A00', fg: '#FCD34D', pill: '#D97706' },
  },
  orange: {
    label: 'Orange',
    light: { bg: '#FFF7ED', fg: '#9A3412', pill: '#EA580C' },
    dark:  { bg: '#431407', fg: '#FB923C', pill: '#EA580C' },
  },
  lime: {
    label: 'Lime',
    light: { bg: '#F7FEE7', fg: '#3F6212', pill: '#65A30D' },
    dark:  { bg: '#1A2E05', fg: '#BEF264', pill: '#65A30D' },
  },
  // Fallback tokens — used when list grows beyond curated set
  slate: {
    label: 'Slate',
    light: { bg: '#F1F5F9', fg: '#334155', pill: '#475569' },
    dark:  { bg: '#1E293B', fg: '#94A3B8', pill: '#475569' },
  },
  stone: {
    label: 'Stone',
    light: { bg: '#F5F5F4', fg: '#44403C', pill: '#57534E' },
    dark:  { bg: '#1C1917', fg: '#A8A29E', pill: '#57534E' },
  },
}

export const FALLBACK_TOKEN = 'slate'

/**
 * Resolve token colors for the current mode.
 * @param {string} tokenKey — e.g. 'rose' | 'indigo'
 * @param {boolean} isDark
 * @returns {{ bg: string, fg: string, pill: string }}
 */
export function resolveToken(tokenKey, isDark = false) {
  const token = SPECIALTY_TOKENS[tokenKey] ?? SPECIALTY_TOKENS[FALLBACK_TOKEN]
  return isDark ? token.dark : token.light
}

/**
 * All token keys in display order (curated first, fallbacks last).
 */
export const TOKEN_KEYS = Object.keys(SPECIALTY_TOKENS)
