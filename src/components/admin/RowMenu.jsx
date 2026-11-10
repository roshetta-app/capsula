import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MoreVertical } from 'lucide-react'

/**
 * src/components/admin/RowMenu.jsx
 * 2026-11-10: a "..." button that opens a small drop-down of actions. Closes on an outside tap
 * or Escape. Used by the brand cards and the formulation cards in the drug editor.
 * 2026-11-10: the drop-down now floats above everything (it was cut off and hidden under the
 * next card). It opens downward, or upward when there is no room below, and closes on scroll.
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

const MENU_W = 190
const ITEM_H = 42

export default function RowMenu({ items, disabled }) {
  const [pos, setPos] = useState(null)   // null = closed, otherwise { left, top }
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const open = pos !== null

  const toggle = () => {
    if (open) { setPos(null); return }
    const r = btnRef.current.getBoundingClientRect()
    const h = items.length * ITEM_H + 10
    const below = r.bottom + 4
    const top = below + h > window.innerHeight - 8 ? Math.max(8, r.top - 4 - h) : below
    const left = Math.min(Math.max(8, r.right - MENU_W), window.innerWidth - MENU_W - 8)
    setPos({ left, top })
  }

  useEffect(() => {
    if (!open) return
    const close = () => setPos(null)
    const down = e => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      close()
    }
    const key = e => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  return (
    <div onClick={e => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-label="More actions"
        aria-haspopup="menu"
        aria-expanded={open}
        style={btnStyle}
      >
        <MoreVertical size={16} />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          role="menu"
          onClick={e => e.stopPropagation()}
          style={{
            position: 'fixed', left: pos.left, top: pos.top, width: MENU_W, zIndex: 1000,
            backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)', padding: 4,
          }}
        >
          {items.map(it => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => { setPos(null); it.onClick() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', height: ITEM_H - 2,
                padding: '0 12px', border: 'none', background: 'none', textAlign: 'left',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                fontSize: 14, fontWeight: 500, fontFamily: 'var(--font-body)',
                color: it.danger ? '#DC2626' : 'var(--color-text-primary)',
              }}
            >
              {it.icon}{it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
