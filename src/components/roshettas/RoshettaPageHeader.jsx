/**
 * src/components/roshettas/RoshettaPageHeader.jsx
 * 2026-11-16 (Roshetta plan, Phase I step 10.7): the top of a roshetta page, in the same
 * "letterhead" look as the Home card: white paper with a thin border in the specialty's colour,
 * a header band with the specialty icon and name ("Roshetta" with the prescription icon, in the
 * app's blue, when there is none), an italic Rx mark, the name and the description.
 * Step 10.8 uses it for the shared page too.
 *
 * Props:
 *   name         the roshetta's name (the person's own text; plain text, own direction)
 *   description  optional text under the name (line breaks kept)
 *   specialty    { id, name, iconType, iconValue, colorToken } or null
 */

import { FileText } from 'lucide-react'
import { SpecialtyIcon, useIsDark } from '../../utils/specialtyIcon'
import { specialtyColors, specialtyHeaderText } from '../../utils/roshettaSpecialty'

const font = 'var(--font-body)'

export default function RoshettaPageHeader({ name, description = '', specialty = null }) {
  const isDark = useIsDark()
  const look = specialtyColors(specialty, isDark)
  const header = specialtyHeaderText(specialty, 'Roshetta')
  const text = typeof description === 'string' ? description.trim() : ''

  return (
    <div
      style={{
        overflow: 'hidden', backgroundColor: 'var(--color-surface)',
        border: `1px solid ${look.pill}`, borderRadius: 'var(--radius-lg)',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
          backgroundColor: look.bg, color: look.fg,
        }}
      >
        {specialty
          ? <SpecialtyIcon iconType={specialty.iconType ?? 'lucide'} iconValue={specialty.iconValue ?? 'Stethoscope'} size={16} color={look.fg} />
          : <FileText size={16} strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true" />}
        <span
          dir="auto"
          style={{
            minWidth: 0, fontSize: 13, fontWeight: 600, lineHeight: 1.4, fontFamily: font,
            overflowWrap: 'anywhere',
          }}
        >
          {header}
        </span>
      </div>
      <div style={{ padding: '10px 16px 14px' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'block', fontSize: 20, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.2,
            fontFamily: 'Georgia, \'Times New Roman\', serif', color: look.fg,
          }}
        >
          Rx
        </span>
        <h1
          dir="auto"
          style={{
            margin: '4px 0 0', textAlign: 'start', overflowWrap: 'anywhere',
            fontSize: 22, fontWeight: 700, lineHeight: 1.25,
            color: 'var(--color-text-primary)', fontFamily: font,
          }}
        >
          {name}
        </h1>
        {text ? (
          <p
            dir="auto"
            style={{
              margin: '6px 0 0', textAlign: 'start', whiteSpace: 'pre-line', overflowWrap: 'anywhere',
              fontSize: 14, lineHeight: 1.5,
              color: 'var(--color-text-secondary)', fontFamily: font,
            }}
          >
            {text}
          </p>
        ) : null}
      </div>
    </div>
  )
}
