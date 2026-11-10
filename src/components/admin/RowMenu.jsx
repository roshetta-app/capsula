import { useState, useEffect, useRef } from 'react'
import { MoreVertical } from 'lucide-react'

/**
 * src/components/admin/RowMenu.jsx
 * 2026-11-10: a "..." button that opens a small drop-down of actions. Closes on an outside tap
 * or Escape. Used by the brand cards and the formulation cards in the drug editor.
 *
 * Props:
 *   items     { label, icon?, danger?, onClick }[]
 *   disabled  boolean
 */

const btnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text-secondary)',
  cursor: 'pointer',
}

export default function RowMenu({ items, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const down = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const key = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        aria-label="Brand actions"
        aria-haspopup="menu"
        aria-expanded={open}
        style={btnStyle}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div role="menu" style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20, minWidth: 170,
          backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)', padding: 4,
        }}>
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); it.onClick() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '10px 12px', border: 'none', background: 'none', textAlign: 'left',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
                color: it.danger ? '#DC2626' : 'var(--color-text-primary)',
              }}
            >
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
