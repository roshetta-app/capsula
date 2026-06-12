/**
 * src/utils/specialtyIcon.jsx
 *
 * Two-source specialty icon system.
 *
 * icon_type === 'lucide'  → renders a Lucide React component by name
 * icon_type === 'custom'  → fetches SVG from Supabase Storage and injects it
 *                           inline so CSS color / stroke tinting works exactly
 *                           like Lucide icons.
 * fallback                → renders <Stethoscope> (safe default)
 */

import { useState, useEffect } from 'react'
import {
  Stethoscope, Baby, Brain, Bone, Eye, Ear, Syringe, Pill,
  Microscope, HeartPulse, Hospital, BriefcaseMedical, Dna,
  Activity, Scan, FlaskConical, Thermometer, Ambulance, Scissors,
  UserRound, Baby as BabyIcon, Layers, Wind, Droplets, ShieldPlus,
  Radiation, TestTube, Zap, Sun, Smile,
} from 'lucide-react'

// ─── Curated icon map ─────────────────────────────────────────────────────────

export const LUCIDE_ICON_OPTIONS = [
  { key: 'Stethoscope',     label: 'General / Adults',     Icon: Stethoscope     },
  { key: 'Baby',            label: 'Paediatrics',          Icon: Baby            },
  { key: 'Brain',           label: 'Neurology / Psych',    Icon: Brain           },
  { key: 'Bone',            label: 'Orthopaedics',         Icon: Bone            },
  { key: 'Eye',             label: 'Ophthalmology',        Icon: Eye             },
  { key: 'Ear',             label: 'ENT / Audiology',      Icon: Ear             },
  { key: 'HeartPulse',      label: 'Cardiology',           Icon: HeartPulse      },
  { key: 'Syringe',         label: 'Surgery / Injection',  Icon: Syringe         },
  { key: 'Pill',            label: 'Pharmacology',         Icon: Pill            },
  { key: 'Microscope',      label: 'Microbiology / Lab',   Icon: Microscope      },
  { key: 'FlaskConical',    label: 'Biochemistry',         Icon: FlaskConical    },
  { key: 'TestTube',        label: 'Pathology / Lab',      Icon: TestTube        },
  { key: 'Dna',             label: 'Genetics',             Icon: Dna             },
  { key: 'Scan',            label: 'Dermatology / Imaging',Icon: Scan            },
  { key: 'Activity',        label: 'Physiotherapy',        Icon: Activity        },
  { key: 'Thermometer',     label: 'Infectious Disease',   Icon: Thermometer     },
  { key: 'Hospital',        label: 'Hospital / Inpatient', Icon: Hospital        },
  { key: 'BriefcaseMedical',label: 'Emergency / First Aid',Icon: BriefcaseMedical},
  { key: 'Ambulance',       label: 'Emergency Transport',  Icon: Ambulance       },
  { key: 'Scissors',        label: 'Surgery / Procedures', Icon: Scissors        },
  { key: 'Wind',            label: 'Pulmonology / Resp.',  Icon: Wind            },
  { key: 'Droplets',        label: 'Haematology / Renal',  Icon: Droplets        },
  { key: 'ShieldPlus',      label: 'Immunology / Allergy', Icon: ShieldPlus      },
  { key: 'Radiation',       label: 'Oncology / Radiology', Icon: Radiation       },
  { key: 'Zap',             label: 'Neurosurgery',         Icon: Zap             },
  { key: 'Layers',          label: 'Multidisciplinary',    Icon: Layers          },
  { key: 'Sun',             label: 'Dermatology (alt)',    Icon: Sun             },
  { key: 'Smile',           label: 'Dental / Oral Health', Icon: Smile           },
  { key: 'UserRound',       label: 'General Practitioner', Icon: UserRound       },
]

const ICON_MAP = Object.fromEntries(
  LUCIDE_ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
)

// ─── Dark-mode hook ───────────────────────────────────────────────────────────
// Reads the .dark class on <html> (applied by useDarkMode()) via MutationObserver.
// This stays in sync with the CSS — not the raw OS preference — so token colors
// and CSS variables always agree, even if dark mode is toggled programmatically.

export function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  )
  useEffect(() => {
    const root = document.documentElement
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'))
    })
    observer.observe(root, { attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])
  return isDark
}

// ─── In-memory SVG cache ──────────────────────────────────────────────────────

const svgCache = new Map()

// ─── patchSvg ────────────────────────────────────────────────────────────────
/**
 * Rewrite a raw SVG string so it:
 *  1. Fits exactly into `size` px (strips existing w/h, injects via attribute)
 *  2. Replaces every real-world black colour with currentColor so the parent
 *     `color` CSS prop tints stroke + fill correctly.
 *
 * Colour variants handled:
 *   #000  #000000  #000000ff  #000000FF
 *   black  Black  BLACK
 *   rgb(0,0,0)  rgba(0,0,0,1)  rgba(0,0,0,1.0)
 *   Same patterns inside style="stroke:..." / style="fill:..."
 */
function patchSvg(raw, size, color) {
  let s = raw

  // 1. Strip existing width / height attributes from the <svg> opening tag
  //    so viewBox controls scaling instead of fixed pixel dimensions.
  s = s.replace(/(<svg[^>]*?)\s+width="[^"]*"/i,  '$1')
  s = s.replace(/(<svg[^>]*?)\s+height="[^"]*"/i, '$1')

  // 2. Build a single string that matches all black colour literals.
  //    Written as a plain string (not a RegExp literal) so embedding it
  //    inside other replacements is safe — no .source escaping issues.
  const BLACK =
    '#000(?:000(?:[fF]{2})?)?'   +  // #000  #000000  #000000ff  #000000FF
    '|[Bb][Ll][Aa][Cc][Kk]'     +  // black  Black  BLACK
    '|rgb\\(0,\\s*0,\\s*0\\)'   +  // rgb(0,0,0)
    '|rgba\\(0,\\s*0,\\s*0,\\s*1(?:\\.0*)?\\)'  // rgba(0,0,0,1)  rgba(0,0,0,1.0)

  // 3. Replace attribute-level stroke/fill values
  //    e.g.  stroke="#000"  fill="black"
  s = s.replace(
    new RegExp(`(\\bstroke=")(?:${BLACK})(")`, 'gi'),
    '$1currentColor$2',
  )
  s = s.replace(
    new RegExp(`(\\bfill=")(?:${BLACK})(")`, 'gi'),
    '$1currentColor$2',
  )

  // 4. Replace inline style property values
  //    e.g.  style="stroke:#000000;fill:black"
  s = s.replace(
    new RegExp(`(\\bstroke\\s*:\\s*)(?:${BLACK})`, 'gi'),
    '$1currentColor',
  )
  s = s.replace(
    new RegExp(`(\\bfill\\s*:\\s*)(?:${BLACK})`, 'gi'),
    '$1currentColor',
  )

  // 5. Inject size + color onto the <svg> root.
  //    - width/height control the rendered box
  //    - style color sets currentColor for the whole subtree
  s = s.replace(
    /<svg/i,
    `<svg width="${size}" height="${size}" style="display:block;color:${color};overflow:hidden" `,
  )

  return s
}

// ─── InlineSvg ────────────────────────────────────────────────────────────────

function InlineSvg({ url, size, color, style }) {
  const [markup, setMarkup] = useState(() => svgCache.get(url) ?? null)

  useEffect(() => {
    if (!url) return
    if (svgCache.has(url)) {
      setMarkup(svgCache.get(url))
      return
    }
    let cancelled = false
    fetch(url)
      .then(r => r.text())
      .then(text => {
        if (cancelled) return
        svgCache.set(url, text)
        setMarkup(text)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [url])

  if (!markup) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, display: 'block', flexShrink: 0, ...style }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      style={{
        display:    'block',
        flexShrink: 0,
        width:      size,
        height:     size,
        color,
        lineHeight: 0,
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: patchSvg(markup, size, color) }}
    />
  )
}

// ─── SpecialtyIcon ────────────────────────────────────────────────────────────

/**
 * Props:
 *   iconType  'lucide' | 'custom'
 *   iconValue string — Lucide key OR Storage URL
 *   size      number — px (default 18)
 *   color     string — explicit CSS color; if omitted, resolved from isDark
 *   style     object
 */
export function SpecialtyIcon({
  iconType  = 'lucide',
  iconValue = 'Stethoscope',
  size      = 18,
  color     = 'currentColor',
  style     = {},
}) {
  // Subscribe to dark-mode changes so the tint colour updates reactively.
  // Callers that pass an explicit `color` (already resolved from resolveToken)
  // are unaffected — the hook result is only used as a fallback.
  useIsDark() // ensures re-render on OS colour-scheme toggle

  if (iconType === 'custom' && iconValue) {
    return (
      <InlineSvg
        url={iconValue}
        size={size}
        color={color}
        style={style}
      />
    )
  }

  const Icon = ICON_MAP[iconValue] ?? Stethoscope
  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.75}
      aria-hidden="true"
      style={{ flexShrink: 0, ...style }}
    />
  )
}

