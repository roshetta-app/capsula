/**
 * src/components/ui/PublicAvatar.jsx
 * Step 14.3b (public profile): the avatar a person picks for their public card, drawn from the
 * short code the app stores ("heart-rose"). No photo, no network: works offline, looks the same
 * in light and dark mode. With no code (or one this version does not know) it shows initials on
 * a colour picked from the name. The sign-in photo is never used here; the older ProfileAvatar
 * (sign-in photo) is left alone until step 14.7a decides where it stays.
 *
 * The symbol and the letters scale with `size`, so the circle can be made bigger for large text.
 * It is decoration next to the person's name, so it is hidden from screen readers.
 */

import { Pill, Stethoscope, Heart, Leaf, Cross, Droplet, Star, Syringe, FlaskConical, Shield, Sun, Moon, Zap, Flower2 } from 'lucide-react'
import { resolveAvatar } from '../../utils/avatarDesigns'

const SVG_PROPS = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

// Two symbols this version of the icon set does not have, drawn the same way.
function Tablet({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...SVG_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7 12h10" />
    </svg>
  )
}
function BandageIcon({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...SVG_PROPS}>
      <rect width="20" height="12" x="2" y="6" rx="2" />
      <path d="M10 10.01h.01M10 14h.01M14 10.01h.01M14 14.01h.01M18 6v12M6 6v12" />
    </svg>
  )
}

const SYMBOLS = {
  capsule: Pill, stethoscope: Stethoscope, heart: Heart, leaf: Leaf, pill: Tablet, cross: Cross,
  drop: Droplet, star: Star, syringe: Syringe, flask: FlaskConical, shield: Shield, sun: Sun,
  moon: Moon, bandage: BandageIcon, bolt: Zap, flower: Flower2,
}

/**
 * @param {string|null} [props.code]  — the stored avatar code; empty or unknown gives initials
 * @param {string} [props.name]       — the person's name (for the initials and their colour)
 * @param {number} [props.size=72]    — circle size in px
 * @param {object} [props.style]      — extra styles on the circle (e.g. marginBottom)
 */
export default function PublicAvatar({ code = null, name = '', size = 72, style }) {
  const a = resolveAvatar({ code, name })
  const Symbol = a.kind === 'design' ? SYMBOLS[a.symbol] : null

  return (
    <div
      aria-hidden="true"
      style={{
        width:           size,
        height:          size,
        borderRadius:    'var(--radius-full)',
        backgroundColor: a.bg,
        color:           '#fff',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
        fontSize:        Math.round(size * 0.34),
        fontWeight:      600,
        lineHeight:      1,
        userSelect:      'none',
        ...style,
      }}
    >
      {Symbol ? <Symbol size={Math.round(size * 0.5)} strokeWidth={2} /> : a.text}
    </div>
  )
}
