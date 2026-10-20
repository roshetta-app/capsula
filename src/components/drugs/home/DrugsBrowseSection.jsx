/**
 * src/components/drugs/home/DrugsBrowseSection.jsx
 * 2026-10-18 (Drugs groups plan, step 1.4): the 'Browse' area of the Drugs
 * home is now two big buttons, Category (blue) and Class (violet), each with
 * a one-line subtitle. Each opens its own page (DrugCategoriesScreen at
 * /drugs/browse/category, DrugClassesScreen at /drugs/browse/class). The
 * Category / Class pop-up switch and the tiles and class list that used to be
 * drawn inside this card moved to those pages (steps 1.1 and 1.2).
 *
 * The colours are the same accents Category and Class had in the old switch
 * and that Brand and Class have in Search. The buttons need no drug data, so
 * there is no loading or failed state here any more; those live on the pages.
 *
 * The old props (browseMode, categories, allClasses and the rest) are no
 * longer used. (Step 1.5 removed them from DrugsScreen.)
 * Blank-screen fix (2026-10-18): the button routes are read when tapped, not
 * when this file loads, because ROUTES is not ready at load time.
 */

import { useNavigate } from 'react-router-dom'
import { LayoutGrid, Layers, ChevronRight } from 'lucide-react'
import DrugsSectionCard, { SECTION_TITLE_STYLE } from './DrugsSectionCard'
import { ROUTES } from '../../../router'

// 'route' is a function on purpose: this file and router.jsx import each other,
// so ROUTES does not exist yet while this file loads. It is read at tap time.
const BUTTONS = [
  {
    key:      'category',
    label:    'Category',
    subtitle: 'Browse drugs by category',
    icon:     LayoutGrid,
    color:    'var(--color-accent)',
    tint:     'var(--color-accent-light)',
    route:    () => ROUTES.DRUGS_BROWSE_CATEGORY,
  },
  {
    key:      'class',
    label:    'Class',
    subtitle: 'Browse by drug class and family',
    icon:     Layers,
    color:    'var(--color-class)',
    tint:     'var(--color-class-light)',
    route:    () => ROUTES.DRUGS_BROWSE_CLASS,
  },
]

function BrowseButton({ label, subtitle, icon: Icon, color, tint, onTap }) {
  return (
    <button
      onClick={onTap}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', textAlign: 'left',
        background: tint, border: 'none', borderRadius: 16,
        padding: '14px 14px', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'var(--color-surface)', color,
      }}>
        <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2, color }}>{label}</span>
        <span style={{ fontSize: 13, lineHeight: 1.3, color: 'var(--color-text-secondary)' }}>{subtitle}</span>
      </span>
      <ChevronRight size={18} strokeWidth={2} color={color} aria-hidden="true" style={{ flexShrink: 0 }} />
    </button>
  )
}

export default function DrugsBrowseSection() {
  const navigate = useNavigate()
  const title = <span style={SECTION_TITLE_STYLE}>Browse drugs</span>

  return (
    <DrugsSectionCard label="Browse" flat title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {BUTTONS.map(b => (
          <BrowseButton
            key={b.key}
            label={b.label}
            subtitle={b.subtitle}
            icon={b.icon}
            color={b.color}
            tint={b.tint}
            onTap={() => navigate(b.route())}
          />
        ))}
      </div>
    </DrugsSectionCard>
  )
}
