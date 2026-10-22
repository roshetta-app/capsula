/**
 * src/components/drugs/groups/GroupViewToggle.jsx
 * 2026-10-18 (Drug groups plan, step 3.5): the tiles / list switch for the My drug groups area.
 * The choice itself is kept by the screen (groupsView in DrugContext, step 3.6).
 * 2026-10-22 (UI refresh plan, step 8.12): drawn with SoftSwitch, the same switch as the sort.
 *
 * Props:
 *   value     'tiles' | 'list'
 *   onChange  (next: 'tiles' | 'list') => void
 */

import { LayoutGrid, List } from 'lucide-react'
import SoftSwitch from './SoftSwitch'

const OPTIONS = [
  { key: 'tiles', label: 'Tiles', Icon: LayoutGrid },
  { key: 'list',  label: 'List',  Icon: List },
]

export default function GroupViewToggle({ value = 'tiles', onChange }) {
  return <SoftSwitch options={OPTIONS} value={value} onChange={onChange} label="Groups view" />
}
