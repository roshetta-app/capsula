/**
 * src/utils/specialtyIcon.jsx
 *
 * Two-source specialty icon system.
 *
 * icon_type === 'lucide'  → renders a Lucide React component by name
 * icon_type === 'custom'  → renders <img src={icon_url}> (SVG from Supabase Storage)
 * fallback                → renders <Stethoscope> (safe default)
 *
 * Admin-facing curated Lucide icon list is exported as LUCIDE_ICON_OPTIONS.
 * Each entry has: { key, label, Icon (component) }
 */

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

// ─── SpecialtyIcon component ──────────────────────────────────────────────────

/**
 * Renders the correct icon for a specialty.
 *
 * Props:
 *   iconType  'lucide' | 'custom'  (defaults to 'lucide')
 *   iconValue string               — Lucide key OR Storage URL
 *   size      number               — px (default 18)
 *   color     string               — CSS color value for Lucide stroke
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
      <img
        src={iconValue}
        width={size}
        height={size}
        alt=""
        aria-hidden="true"
        style={{
          objectFit:  'contain',
          flexShrink: 0,
          display:    'block',
          filter:     'none',
          ...style,
        }}
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
