/**
 * src/components/drugs/groups/GroupViewToggle.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): the small tiles / list switch for
 * the My drug groups area. The choice itself is kept by the screen
 * (groupsView in DrugContext, step 3.6).
 *
 * Props:
 *   value     'tiles' | 'list'
 *   onChange  (next: 'tiles' | 'list') => void
 */

import { LayoutGrid, List } from 'lucide-react'

const OPTIONS = [
  { key: 'tiles', label: 'Tiles', Icon: LayoutGrid },
  { key: 'list',  label: 'List',  Icon: List },
]

export default function GroupViewToggle({ value = 'tiles', onChange }) {
  return (
    <div
      role="group"
      aria-label="Groups view"
      style={{
        display: 'inline-flex', gap: 2, padding: 2,
        backgroundColor: 'var(--color-surface-muted)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {OPTIONS.map(({ key, label, Icon }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            aria-pressed={active}
            onClick={() => { if (!active) onChange?.(key) }}
            style={{
              width: 30, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
              borderRadius: 8,
              backgroundColor: active ? 'var(--color-surface)' : 'transparent',
              boxShadow: active ? 'var(--shadow-card)' : 'none',
              color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color var(--motion-fast) var(--ease-settle), color var(--motion-fast) var(--ease-settle)',
            }}
          >
            <Icon size={15} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
