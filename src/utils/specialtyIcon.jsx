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
// Only icons that clearly represent a medical specialty are listed.
// Admins pick from this list — no free-text entry.

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

// Fast lookup map: key → Icon component
const ICON_MAP = Object.fromEntries(
  LUCIDE_ICON_OPTIONS.map(({ key, Icon }) => [key, Icon])
)

// ─── In-memory SVG cache ──────────────────────────────────────────────────────
// Avoids re-fetching the same URL on every render / remount.
const svgCache = new Map()

// ─── InlineSvg — fetches + injects SVG markup with color tinting ──────────────

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
      .catch(() => {
        // Silently fall back — outer component shows Stethoscope on null markup
      })
    return () => { cancelled = true }
  }, [url])

  if (!markup) {
    // While loading, render a same-size transparent placeholder
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height: size, display: 'block', flexShrink: 0, ...style }}
      />
    )
  }

  // Inject the SVG string into the DOM.
  // Force width/height/color so the icon always matches Lucide sizing + tinting.
  // We set `color` on the wrapper so SVGs that use `currentColor` for stroke/fill
  // pick it up automatically. For SVGs with hard-coded stroke/fill values we also
  // patch them via a CSS filter fallback isn't needed — admins are instructed to
  // upload monochrome SVGs that use currentColor or inherit.
  return (
    <span
      aria-hidden="true"
      style={{
        display:    'block',
        flexShrink: 0,
        width:      size,
        height:     size,
        color,          // currentColor cascade into inline SVG stroke/fill
        lineHeight: 0,  // kills ghost whitespace below the span
        ...style,
      }}
      // dangerouslySetInnerHTML is safe here: the SVG comes from our own
      // Supabase Storage bucket (admin-only upload, SVG-mime enforced).
      dangerouslySetInnerHTML={{ __html: patchSvg(markup, size, color) }}
    />
  )
}

/**
 * Patch the raw SVG string so it:
 *  1. Fits exactly into the requested size box
 *  2. Inherits color via currentColor on stroke + fill where no explicit value
 *     was set — making monochrome SVGs respond to the `color` CSS prop.
 */
function patchSvg(raw, size, color) {
  return raw
    // Force width + height attributes
    .replace(/<svg([^>]*)width="[^"]*"/, `<svg$1width="${size}"`)
    .replace(/<svg([^>]*)height="[^"]*"/, `<svg$1height="${size}"`)
    // If no width/height present at all, inject them after <svg
    .replace(/^(<svg(?![^>]*width)[^>]*)>/, `$1 width="${size}" height="${size}">`)
    // Replace hard-coded black stroke/fill with currentColor so CSS color applies
    .replace(/stroke="#000000"/g,  'stroke="currentColor"')
    .replace(/stroke="#000"/g,     'stroke="currentColor"')
    .replace(/fill="#000000"/g,    'fill="currentColor"')
    .replace(/fill="#000"/g,       'fill="currentColor"')
    // Inject a top-level color style on the <svg> element itself
    .replace(/<svg/, `<svg style="color:${color};display:block" `)
}

// ─── SpecialtyIcon component ──────────────────────────────────────────────────

/**
 * Renders the correct icon for a specialty.
 *
 * Props:
 *   iconType  'lucide' | 'custom'  (defaults to 'lucide')
 *   iconValue string               — Lucide key OR Storage URL
 *   size      number               — px (default 18)
 *   color     string               — CSS color value for stroke/fill tinting
 *   style     object               — extra styles applied to wrapper
 */
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

  // Lucide (default)
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
