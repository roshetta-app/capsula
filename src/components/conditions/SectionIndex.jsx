/**
 * SectionIndex.jsx — the "Contents" pill and its bottom sheet for long pages.
 *
 * 2026-11-13: every note (the coloured bubble, now called a Heading in the CMS) is a heading
 * that divides the page. This component finds them on the page by itself (each bubble carries
 * a data-heading mark, see NoteCallout.jsx), so it works for notes inside sheets, the Rx-level
 * list, the Review list and loose note blocks alike, with no tab-by-tab logic.
 *
 * - Shows a small "Contents" pill only when the open tab has MIN_HEADINGS or more headings.
 * - Tapping the pill opens a bottom sheet: one row per heading (first line of its text, with
 *   its colour dot); the heading you are reading is highlighted. Tapping a row scrolls there.
 * - Must sit inside a position: relative box that does not scroll, next to the scroll box.
 *
 * Props:
 *   scrollBoxRef     ref of the box that actually scrolls
 *   resetKey         any value that changes when the content changes tab (closes the sheet)
 *   bottomClearance  CSS length the bottom bar covers (so the pill and sheet sit above it)
 *   hidden           hide the pill (e.g. while the keyboard is open)
 */
import { useEffect, useState } from 'react'
import { List, X } from 'lucide-react'
import { noteFlavorColor } from '../ui/noteFlavors'

const MIN_HEADINGS = 3

function scan(box) {
  return Array.from(box.querySelectorAll('[data-heading]')).map(el => ({
    title: el.getAttribute('data-heading-title') || '',
    flavor: el.getAttribute('data-heading-flavor') || 'info',
  }))
}

function sameItems(a, b) {
  if (a.length !== b.length) return false
  return a.every((x, i) => x.title === b[i].title && x.flavor === b[i].flavor)
}

export default function SectionIndex({ scrollBoxRef, resetKey, bottomClearance = '0px', hidden = false }) {
  const [items, setItems] = useState([])
  // The sheet remembers which tab it was opened on, so a tab switch closes it by itself.
  const [sheet, setSheet] = useState(null)
  const open = sheet !== null && sheet.key === resetKey
  const setOpen = isOpen => setSheet(isOpen ? { key: resetKey } : null)
  const [current, setCurrent] = useState(0)

  // Keep the list in step with the page: a tab switch, a plan switch or a content load
  // changes the page, so look again (once per frame at most).
  useEffect(() => {
    const box = scrollBoxRef.current
    if (!box) return undefined
    let raf = 0
    const refresh = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const next = scan(box)
        setItems(prev => (sameItems(prev, next) ? prev : next))
      })
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(box, { childList: true, subtree: true })
    return () => { observer.disconnect(); cancelAnimationFrame(raf) }
  }, [scrollBoxRef, resetKey])

  function openSheet() {
    const box = scrollBoxRef.current
    if (box) {
      const edge = box.getBoundingClientRect().top + 24
      const els = Array.from(box.querySelectorAll('[data-heading]'))
      let idx = 0
      els.forEach((el, i) => { if (el.getBoundingClientRect().top <= edge) idx = i })
      setCurrent(idx)
    }
    setOpen(true)
  }

  function jump(i) {
    const box = scrollBoxRef.current
    const el = box ? box.querySelectorAll('[data-heading]')[i] : null
    setOpen(false)
    if (!box || !el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  if (items.length < MIN_HEADINGS) return null

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={openSheet}
          aria-label="Contents of this page"
          style={{
            position: 'absolute', right: 16, bottom: `calc(${bottomClearance} + 12px)`, zIndex: 40,
            display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 14px',
            fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            color: 'var(--color-text-primary)', background: 'var(--color-surface)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.14)', cursor: 'pointer',
          }}
        >
          <List size={16} /> Contents
        </button>
      )}

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.35)' }}
        >
          <div
            role="dialog"
            aria-label="Contents"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: bottomClearance, maxHeight: '62%',
              display: 'flex', flexDirection: 'column',
              background: 'var(--color-surface)', borderRadius: '22px 22px 0 0',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.18)', fontFamily: 'var(--font-body)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px 8px', flexShrink: 0,
            }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>Contents</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close contents"
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', borderRadius: 'var(--radius-full)',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 8px 12px' }}>
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => jump(i)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'start',
                    padding: '11px 10px', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: i === current ? 'var(--color-accent-light)' : 'transparent',
                    fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: i === current ? 700 : 500,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: noteFlavorColor(item.flavor),
                  }} />
                  <span dir="auto" style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', unicodeBidi: 'plaintext' }}>
                    {item.title || '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
