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
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {/* The soft track sits behind the two 44 px tap areas, so the look stays small. */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', insetInline: 0, top: '50%', height: 32, transform: 'translateY(-50%)',
          backgroundColor: 'var(--color-surface-muted)', borderRadius: 'var(--radius-md)',
        }}
      />
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
              position: 'relative', width: 44, height: 44, padding: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer', background: 'none',
              color: active ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              WebkitTapHighlightColor: 'transparent', outline: 'none',
              transition: 'color var(--motion-fast) var(--ease-settle)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', width: 38, height: 28, borderRadius: 8,
                backgroundColor: active ? 'var(--color-surface)' : 'transparent',
                boxShadow: active ? 'var(--shadow-card)' : 'none',
                transition: 'background-color var(--motion-fast) var(--ease-settle)',
              }}
            />
            <Icon size={15} aria-hidden="true" style={{ position: 'relative' }} />
          </button>
        )
      })}
    </div>
  )
}
