/**
 * src/components/drugs/groups/GroupViewToggle.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): the tiles / list choice for the My drug groups area.
 * The choice itself is kept by the screen (groupsView in DrugContext, step 3.6).
 * 2026-10-22 (UI refresh plan, step 8.13): now one plain icon button, no box. It shows the view a
 * tap changes to (the list icon while tiles show, the grid icon while the list shows).
 *
 * Props:
 *   value     'tiles' | 'list'
 *   onChange  (next: 'tiles' | 'list') => void
 */

import { LayoutGrid, List } from 'lucide-react'

export default function GroupViewToggle({ value = 'tiles', onChange }) {
  const toList = value !== 'list'
  const Icon = toList ? List : LayoutGrid
  return (
    <button
      type="button"
      onClick={() => onChange?.(toList ? 'list' : 'tiles')}
      aria-label={toList ? 'Show as list' : 'Show as tiles'}
      style={{
        width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'none', border: 'none', cursor: 'pointer', outline: 'none', padding: 0,
        color: 'var(--color-text-secondary)', WebkitTapHighlightColor: 'transparent',
      }}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  )
}
