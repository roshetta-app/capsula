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
 *
 * Icon library: Lucide React (general) + Phosphor Icons (medical/clinical).
 * Both are MIT licensed. Phosphor provides industry-standard medical glyphs
 * (Heartbeat, Pulse, FirstAid, Tooth, Virus, Needle, Wheelchair, etc.)
 * that Lucide lacks.
 */

import { useState, useEffect } from 'react'

// ─── Lucide (general purpose) ─────────────────────────────────────────────────
import {
  Stethoscope, Baby, Brain, Bone, Eye, Ear, Syringe, Pill,
  Microscope, HeartPulse, Hospital, BriefcaseMedical, Dna,
  Activity, Scan, FlaskConical, Thermometer, Ambulance, Scissors,
  UserRound, Layers, Wind, Droplets, ShieldPlus,
  Radiation, TestTube, Zap, Sun, Smile,
} from 'lucide-react'

// ─── Phosphor (medical / clinical) ───────────────────────────────────────────
import {
  Heartbeat,
  Pulse,
  FirstAid,
  FirstAidKit,
  Needle,
  Tooth,
  Virus,
  Wheelchair,
  ThermometerHot,
  Flask,
  Stethoscope  as PhStethoscope,
  Syringe      as PhSyringe,
  Pill         as PhPill,
  Hospital     as PhHospital,
  Microscope   as PhMicroscope,
  Dna          as PhDna,
  Scan         as PhScan,
  Eye          as PhEye,
  Ear          as PhEar,
  Ambulance    as PhAmbulance,
  Bone         as PhBone,
  Brain        as PhBrain,
  TestTube     as PhTestTube,
} from '@phosphor-icons/react'

// ─── Curated icon map ─────────────────────────────────────────────────────────
//
// Keys beginning with 'Ph' use Phosphor; all others use Lucide.
// Existing keys are preserved so assigned specialties keep their icons.
// New Phosphor entries are appended and clearly labelled.

export const LUCIDE_ICON_OPTIONS = [
  // ── Lucide — existing ─────────────────────────────────────────────────────
  { key: 'Stethoscope',      label: 'General / Adults',           Icon: Stethoscope,     lib: 'lucide'   },
  { key: 'Baby',             label: 'Paediatrics',                Icon: Baby,            lib: 'lucide'   },
  { key: 'Brain',            label: 'Neurology / Psych',          Icon: Brain,           lib: 'lucide'   },
  { key: 'Bone',             label: 'Orthopaedics',               Icon: Bone,            lib: 'lucide'   },
  { key: 'Eye',              label: 'Ophthalmology',              Icon: Eye,             lib: 'lucide'   },
  { key: 'Ear',              label: 'ENT / Audiology',            Icon: Ear,             lib: 'lucide'   },
  { key: 'HeartPulse',       label: 'Cardiology',                 Icon: HeartPulse,      lib: 'lucide'   },
  { key: 'Syringe',          label: 'Surgery / Injection',        Icon: Syringe,         lib: 'lucide'   },
  { key: 'Pill',             label: 'Pharmacology',               Icon: Pill,            lib: 'lucide'   },
  { key: 'Microscope',       label: 'Microbiology / Lab',         Icon: Microscope,      lib: 'lucide'   },
  { key: 'FlaskConical',     label: 'Biochemistry',               Icon: FlaskConical,    lib: 'lucide'   },
  { key: 'TestTube',         label: 'Pathology / Lab',            Icon: TestTube,        lib: 'lucide'   },
  { key: 'Dna',              label: 'Genetics',                   Icon: Dna,             lib: 'lucide'   },
  { key: 'Scan',             label: 'Dermatology / Imaging',      Icon: Scan,            lib: 'lucide'   },
  { key: 'Activity',         label: 'Physiotherapy',              Icon: Activity,        lib: 'lucide'   },
  { key: 'Thermometer',      label: 'Infectious Disease',         Icon: Thermometer,     lib: 'lucide'   },
  { key: 'Hospital',         label: 'Hospital / Inpatient',       Icon: Hospital,        lib: 'lucide'   },
  { key: 'BriefcaseMedical', label: 'Emergency / First Aid',      Icon: BriefcaseMedical,lib: 'lucide'   },
  { key: 'Ambulance',        label: 'Emergency Transport',        Icon: Ambulance,       lib: 'lucide'   },
  { key: 'Scissors',         label: 'Surgery / Procedures',       Icon: Scissors,        lib: 'lucide'   },
  { key: 'Wind',             label: 'Pulmonology / Resp.',        Icon: Wind,            lib: 'lucide'   },
  { key: 'Droplets',         label: 'Haematology / Renal',        Icon: Droplets,        lib: 'lucide'   },
  { key: 'ShieldPlus',       label: 'Immunology / Allergy',       Icon: ShieldPlus,      lib: 'lucide'   },
  { key: 'Radiation',        label: 'Oncology / Radiology',       Icon: Radiation,       lib: 'lucide'   },
  { key: 'Zap',              label: 'Neurosurgery',               Icon: Zap,             lib: 'lucide'   },
  { key: 'Layers',           label: 'Multidisciplinary',          Icon: Layers,          lib: 'lucide'   },
  { key: 'Sun',              label: 'Dermatology (alt)',          Icon: Sun,             lib: 'lucide'   },
  { key: 'Smile',            label: 'Dental / Oral Health',       Icon: Smile,           lib: 'lucide'   },
  { key: 'UserRound',        label: 'General Practitioner',       Icon: UserRound,       lib: 'lucide'   },

  // ── Phosphor — medical / clinical ─────────────────────────────────────────
  { key: 'Ph:Heartbeat',     label: 'Cardiology (ECG)',           Icon: Heartbeat,       lib: 'phosphor' },
  { key: 'Ph:Pulse',         label: 'Vital Signs / ICU',          Icon: Pulse,           lib: 'phosphor' },
  { key: 'Ph:FirstAid',      label: 'First Aid / Wound Care',     Icon: FirstAid,        lib: 'phosphor' },
  { key: 'Ph:FirstAidKit',   label: 'First Aid Kit',              Icon: FirstAidKit,     lib: 'phosphor' },
  { key: 'Ph:Needle',        label: 'Vaccination / IV',           Icon: Needle,          lib: 'phosphor' },
  { key: 'Ph:Tooth',         label: 'Dentistry / Oral Surgery',   Icon: Tooth,           lib: 'phosphor' },
  { key: 'Ph:Virus',         label: 'Virology / Infection',       Icon: Virus,           lib: 'phosphor' },
  { key: 'Ph:Wheelchair',    label: 'Rehabilitation / Disability',Icon: Wheelchair,      lib: 'phosphor' },
  { key: 'Ph:ThermometerHot',label: 'Fever / Tropical Medicine',  Icon: ThermometerHot,  lib: 'phosphor' },
  { key: 'Ph:Flask',         label: 'Laboratory / Research',      Icon: Flask,           lib: 'phosphor' },
  { key: 'Ph:Stethoscope',   label: 'General (Phosphor style)',   Icon: PhStethoscope,   lib: 'phosphor' },
  { key: 'Ph:Syringe',       label: 'Injection (Phosphor style)', Icon: PhSyringe,       lib: 'phosphor' },
  { key: 'Ph:Pill',          label: 'Medication (Phosphor style)',Icon: PhPill,          lib: 'phosphor' },
  { key: 'Ph:Hospital',      label: 'Hospital (Phosphor style)',  Icon: PhHospital,      lib: 'phosphor' },
  { key: 'Ph:Microscope',    label: 'Lab (Phosphor style)',       Icon: PhMicroscope,    lib: 'phosphor' },
  { key: 'Ph:Dna',           label: 'Genetics (Phosphor style)',  Icon: PhDna,           lib: 'phosphor' },
  { key: 'Ph:Eye',           label: 'Ophthalmology (Phosphor)',   Icon: PhEye,           lib: 'phosphor' },
  { key: 'Ph:Ear',           label: 'ENT (Phosphor style)',       Icon: PhEar,           lib: 'phosphor' },
  { key: 'Ph:Ambulance',     label: 'Emergency (Phosphor style)', Icon: PhAmbulance,     lib: 'phosphor' },
  { key: 'Ph:Bone',          label: 'Orthopaedics (Phosphor)',    Icon: PhBone,          lib: 'phosphor' },
  { key: 'Ph:Brain',         label: 'Neurology (Phosphor style)', Icon: PhBrain,         lib: 'phosphor' },
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

  s = s.replace(/(<svg[^>]*?)\s+width="[^"]*"/i,  '$1')
  s = s.replace(/(<svg[^>]*?)\s+height="[^"]*"/i, '$1')

  const BLACK =
    '#000(?:000(?:[fF]{2})?)?'   +
    '|[Bb][Ll][Aa][Cc][Kk]'     +
    '|rgb\\(0,\\s*0,\\s*0\\)'   +
    '|rgba\\(0,\\s*0,\\s*0,\\s*1(?:\\.0*)?\\)'

  s = s.replace(
    new RegExp(`(\\bstroke=")(?:${BLACK})(")`, 'gi'),
    '$1currentColor$2',
  )
  s = s.replace(
    new RegExp(`(\\bfill=")(?:${BLACK})(")`, 'gi'),
    '$1currentColor$2',
  )
  s = s.replace(
    new RegExp(`(\\bstroke\\s*:\\s*)(?:${BLACK})`, 'gi'),
    '$1currentColor',
  )
  s = s.replace(
    new RegExp(`(\\bfill\\s*:\\s*)(?:${BLACK})`, 'gi'),
    '$1currentColor',
  )
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
 *   iconValue string — icon key (Lucide or Ph:* Phosphor) OR Storage URL
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
  useIsDark() // ensures re-render on dark-mode toggle

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

  // Phosphor icons use `weight` instead of strokeWidth
  const isPhosphor = iconValue?.startsWith('Ph:')
  if (isPhosphor) {
    return (
      <Icon
        size={size}
        color={color}
        weight="regular"
        aria-hidden="true"
        style={{ flexShrink: 0, ...style }}
      />
    )
  }

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
