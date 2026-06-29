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
 * The two 'slate' / 'stone' entries are the safe fallback defaults.
 */

export const SPECIALTY_TOKENS = {
  // ── Blues ──────────────────────────────────────────────────────────────────
  sky: {
    label: 'Sky',
    light: { bg: '#E0F2FE', fg: '#0369A1', pill: '#0284C7' },
    dark:  { bg: '#082F49', fg: '#7DD3FC', pill: '#0284C7' },
  },
  blue: {
    label: 'Blue',
    light: { bg: '#DBEAFE', fg: '#1D4ED8', pill: '#2563EB' },
    dark:  { bg: '#1E3A8A', fg: '#93C5FD', pill: '#2563EB' },
  },
  indigo: {
    label: 'Indigo',
    light: { bg: '#EEF2FF', fg: '#4338CA', pill: '#4F46E5' },
    dark:  { bg: '#1E1B4B', fg: '#A5B4FC', pill: '#4F46E5' },
  },
  navy: {
    label: 'Navy',
    light: { bg: '#E0E7FF', fg: '#3730A3', pill: '#4338CA' },
    dark:  { bg: '#1E1B4B', fg: '#C7D2FE', pill: '#4338CA' },
  },

  // ── Purples ────────────────────────────────────────────────────────────────
  violet: {
    label: 'Violet',
    light: { bg: '#F5F3FF', fg: '#6D28D9', pill: '#7C3AED' },
    dark:  { bg: '#2E1065', fg: '#C4B5FD', pill: '#7C3AED' },
  },
  purple: {
    label: 'Purple',
    light: { bg: '#FAF5FF', fg: '#7E22CE', pill: '#9333EA' },
    dark:  { bg: '#3B0764', fg: '#D8B4FE', pill: '#9333EA' },
  },
  fuchsia: {
    label: 'Fuchsia',
    light: { bg: '#FDF4FF', fg: '#86198F', pill: '#A21CAF' },
    dark:  { bg: '#3B0764', fg: '#E879F9', pill: '#A21CAF' },
  },

  // ── Reds / Pinks ───────────────────────────────────────────────────────────
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
  red: {
    label: 'Red',
    light: { bg: '#FEF2F2', fg: '#B91C1C', pill: '#DC2626' },
    dark:  { bg: '#450A0A', fg: '#FCA5A5', pill: '#DC2626' },
  },
  crimson: {
    label: 'Crimson',
    light: { bg: '#FFF0F0', fg: '#9B1C1C', pill: '#C81E1E' },
    dark:  { bg: '#3B0A0A', fg: '#FECACA', pill: '#C81E1E' },
  },

  // ── Greens ─────────────────────────────────────────────────────────────────
  emerald: {
    label: 'Emerald',
    light: { bg: '#ECFDF5', fg: '#065F46', pill: '#059669' },
    dark:  { bg: '#022C22', fg: '#6EE7B7', pill: '#059669' },
  },
  green: {
    label: 'Green',
    light: { bg: '#F0FDF4', fg: '#15803D', pill: '#16A34A' },
    dark:  { bg: '#052E16', fg: '#86EFAC', pill: '#16A34A' },
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
  lime: {
    label: 'Lime',
    light: { bg: '#F7FEE7', fg: '#3F6212', pill: '#65A30D' },
    dark:  { bg: '#1A2E05', fg: '#BEF264', pill: '#65A30D' },
  },

  // ── Warm ───────────────────────────────────────────────────────────────────
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
  yellow: {
    label: 'Yellow',
    light: { bg: '#FEFCE8', fg: '#854D0E', pill: '#CA8A04' },
    dark:  { bg: '#422006', fg: '#FDE047', pill: '#CA8A04' },
  },
  gold: {
    label: 'Gold',
    light: { bg: '#FFFBEB', fg: '#78350F', pill: '#B45309' },
    dark:  { bg: '#2D1A00', fg: '#FDE68A', pill: '#B45309' },
  },

  // ── Neutrals (fallbacks) ───────────────────────────────────────────────────
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
  zinc: {
    label: 'Zinc',
    light: { bg: '#F4F4F5', fg: '#3F3F46', pill: '#52525B' },
    dark:  { bg: '#18181B', fg: '#A1A1AA', pill: '#52525B' },
  },
  cool: {
    label: 'Cool Gray',
    light: { bg: '#F9FAFB', fg: '#374151', pill: '#4B5563' },
    dark:  { bg: '#111827', fg: '#9CA3AF', pill: '#4B5563' },
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

/**
 * Parses a '#RRGGBB' token color into an [r, g, b] triple so it can be
 * laid down as a low-opacity rgba() wash instead of a flat fill. Specialty
 * tokens are always 6-digit hex (see SPECIALTY_TOKENS above).
 *
 * Shared by any component that needs the same tint treatment as
 * SpecialtySelector's active-card background (e.g. ConditionCard's icon
 * bubble) — centralized here so the math can't drift between them.
 *
 * @param {string} hex — e.g. '#E0F2FE'
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return [r, g, b]
}

/**
 * Builds the same soft rgba() wash used by SpecialtySelector's active card
 * background, from a token's flat 'bg' hex. Light/dark alpha values match
 * SpecialtySelector exactly, so any UI using this reads as the same
 * "ambient tint" rather than the more saturated flat token color.
 *
 * @param {string} bgHex — a token's `bg` hex value, e.g. colors.bg
 * @param {boolean} isDark
 * @returns {string} an rgba() CSS color string
 */
export function tintedBg(bgHex, isDark = false) {
  const [r, g, b] = hexToRgb(bgHex)
  const alpha = isDark ? 0.16 : 0.35
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
