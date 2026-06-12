/**
 * src/utils/specialtyIcon.jsx
 *
 * Two-source specialty icon system.
 *
 * icon_type === 'lucide'  → renders a Lucide React component by name
 * icon_type === 'custom'  → fetches SVG from Supabase Storage and injects it
 *                           inline so CSS color / stroke tinting works exactly
 *                           like Lucide icons (was <img> — cannot be tinted)
 * fallback                → renders <Stethoscope> (safe default)
 *
 * Admin-facing curated Lucide icon list is exported as LUCIDE_ICON_OPTIONS.
 * Each entry has: { key, label, Icon (component) }
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

// ─── In-memory SVG cache ──────────────────────────────────────────────────────

const svgCache = new Map()

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

/**
 * Patch a raw SVG string so it:
 *  1. Fits the requested size (removes hard-coded w/h, relies on viewBox)
 *  2. Replaces every real-world black colour variant with currentColor so the
 *     parent `color` CSS prop tints stroke + fill correctly.
 *
 * Colour variants covered:
 *   #000000  #000  #000000ff  black  rgb(0,0,0)  rgba(0,0,0,1)  rgba(0,0,0,.*)
 *   Also handles stroke/fill with no value (SVG default = black) by injecting
 *   currentColor explicitly on the <svg> root.
 */
function patchSvg(raw, size, color) {
  let svg = raw

  // ── 1. Remove hard-coded width/height attributes from the <svg> tag so the
  //       element scales to the wrapper <span> instead of overflowing it.
  svg = svg.replace(/<svg([^>]*)\swidth="[^"]*"/, '<svg$1')
  svg = svg.replace(/<svg([^>]*)\sheight="[^"]*"/, '<svg$1')

  // ── 2. Replace every black colour variant with currentColor ──────────────
  //   Attribute-level: stroke="..." fill="..."
  const blackPattern =
    /#000(?:000)?(?:[fF]{2})?|black|rgb\(0,\s*0,\s*0\)|rgba\(0,\s*0,\s*0,\s*(?:1|1\.0+|0?\.[0-9]+)\)/g

  svg = svg
    .replace(new RegExp(`(stroke=")(?:${blackPattern.source})(")`, 'gi'),
      'stroke="currentColor"')
    .replace(new RegExp(`(fill=")(?:${blackPattern.source})(")`, 'gi'),
      'fill="currentColor"')
    // style="... stroke:#000 ..." and style="... fill:#000 ..."
    .replace(/stroke\s*:\s*(?:#000(?:000)?(?:[fF]{2})?|black|rgb\(0,0,0\))/gi,
      'stroke:currentColor')
    .replace(/fill\s*:\s*(?:#000(?:000)?(?:[fF]{2})?|black|rgb\(0,0,0\))/gi,
      'fill:currentColor')

  // ── 3. Inject size + color on the <svg> root so viewBox scales and
  //       currentColor resolves correctly throughout the tree.
  svg = svg.replace(
    /<svg/,
    `<svg width="${size}" height="${size}" style="display:block;color:${color}" `,
  )

  return svg
}

// ─── SpecialtyIcon component ──────────────────────────────────────────────────

export function SpecialtyIcon({
  iconType  = 'lucide',
  iconValue = 'Stethoscope',
  size      = 18,
  color     = 'currentColor',
  style     = {},
}) {
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
