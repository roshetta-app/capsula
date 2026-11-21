/**
 * src/components/drugs/groups/ShareNameRow.jsx
 * 2026-11-21 (Roshetta plan, Phase L, step 13.3): the one "Show my name" row of both share
 * sheets (the group sheet now, the roshetta sheet in step 13.5). Title and one short line:
 * "Created by <name>" when on, "Anonymous" when off, "Add your name in Account" with no name
 * in the profile (then the switch is off and disabled). The words come from shareCredit.js.
 *
 * Props: fullName (the profile name, '' when none), checked, onChange (next value),
 * label (read out by a screen reader).
 */

import { User, UserX } from 'lucide-react'
import NameSwitch from './NameSwitch'
import { nameSwitchText } from '../../../utils/shareCredit'

export default function ShareNameRow({ fullName, checked, onChange, label }) {
  const hasName = !!(fullName && fullName.trim())
  const on = hasName && !!checked
  const text = nameSwitchText({ fullName, on })
  const Icon = on ? User : UserX
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '4px 4px 4px 12px',
      marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)',
    }}>
      <Icon size={18} color="var(--color-text-secondary)" strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, padding: '8px 0', fontFamily: 'var(--font-body)' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>{text.title}</div>
        <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.4, color: 'var(--color-text-secondary)', overflowWrap: 'anywhere' }}>
          {text.name
            ? <>{text.prefix}<span dir="auto" style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{text.name}</span></>
            : text.line}
        </div>
      </div>
      <NameSwitch checked={on} onChange={onChange} disabled={!hasName} label={label} />
    </div>
  )
}
