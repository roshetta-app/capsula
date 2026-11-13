/**
 * SectionIndex.jsx — the "Contents" pill and its bottom sheet for long prescription pages.
 *
 * 2026-11-13 (v2): the index lists ONLY the headings inside prescription sheets (the note rows
 * a sheet carries, called Headings in the CMS). NoteCallout marks those with a data-heading
 * attribute when the sheet passes 'indexed'; standalone note blocks do not carry the mark, so
 * they are never listed.
 *
 * - Shows a small "Contents" pill only when the open tab has MIN_HEADINGS or more headings.
 * - While it is showing, the scroll box is marked data-contents-active, which reveals a small
 *   list icon on every heading (see globals.css). Tapping a heading on the page opens the sheet
 *   with that heading highlighted; the pill opens it on the heading you are reading.
 * - The sheet is a timeline: the colour dots are joined by one continuous line, top to bottom.
 *   Tapping a row scrolls the page to that heading and closes the sheet.
 * - Must sit inside a position: relative box that does not scroll, next to the scroll box.
 *
 * Props:
 *   scrollBoxRef     ref of the box that actually scrolls
 *   resetKey         any value that changes when the content changes tab (closes the sheet)
 *   bottomClearance  CSS length the bottom bar covers (so the pill and sheet sit above it)
 *   hidden           hide the pill (e.g. while the keyboard is open)
 */
import { useEffect, useRef, useState } from 'react'
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
  const [current, setCurrent] = useState(0)
  const listRef = useRef(null)
  const enough = items.length >= MIN_HEADINGS

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

  // The page's headings become tappable only while the list is long enough to show.
  useEffect(() => {
    const box = scrollBoxRef.current
    if (!box || !enough) return undefined
    box.setAttribute('data-contents-active', '1')
    return () => box.removeAttribute('data-contents-active')
  }, [scrollBoxRef, resetKey, enough])

  function show(index) {
    setCurrent(index)
    setSheet({ key: resetKey })
  }

  function readingIndex() {
    const box = scrollBoxRef.current
    if (!box) return 0
    const edge = box.getBoundingClientRect().top + 24
    const els = Array.from(box.querySelectorAll('[data-heading]'))
    let idx = 0
    els.forEach((el, i) => { if (el.getBoundingClientRect().top <= edge) idx = i })
    return idx
  }

  // Tap on a heading in the page opens the sheet on that heading. Taps on links inside the
  // heading, and the end of a text selection, are left alone.
  useEffect(() => {
    const box = scrollBoxRef.current
    if (!box || !enough) return undefined
    const onClick = e => {
      const target = e.target instanceof Element ? e.target : null
      if (!target || target.closest('a, button')) return
      const el = target.closest('[data-heading]')
      if (!el) return
      const sel = window.getSelection && window.getSelection()
      if (sel && String(sel).length > 0) return
      const index = Array.from(box.querySelectorAll('[data-heading]')).indexOf(el)
      if (index >= 0) { setCurrent(index); setSheet({ key: resetKey }) }
    }
    box.addEventListener('click', onClick)
    return () => box.removeEventListener('click', onClick)
  }, [scrollBoxRef, resetKey, enough])

  // Bring the highlighted row into view when the sheet opens on a long list.
  useEffect(() => {
    if (!open || !listRef.current) return
    const row = listRef.current.querySelector('[data-current="1"]')
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center' })
  }, [open])

  function close() { setSheet(null) }

  function jump(i) {
    const box = scrollBoxRef.current
    const el = box ? box.querySelectorAll('[data-heading]')[i] : null
    close()
    if (!box || !el) return
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 12
    box.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  if (!enough) return null

  return (
    <>
      {!open && !hidden && (
        <button
          type="button"
          onClick={() => show(readingIndex())}
          aria-label="Contents of this page"
          style={{
            position: 'absolute', right: 16, bottom: `calc(${bottomClearance} + 12px)`, zIndex: 40,
            display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 8px 0 14px',
            fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-body)',
            color: '#fff', background: 'var(--color-accent-solid)',
            border: 'none', borderRadius: 'var(--radius-full)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.22)', cursor: 'pointer',
          }}
        >
          <List size={16} strokeWidth={2.4} />
          Contents
          <span style={{
            minWidth: 24, height: 24, padding: '0 6px', boxSizing: 'border-box',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.22)',
            fontSize: 12, fontWeight: 700,
          }}>
            {items.length}
          </span>
        </button>
      )}

      {open && (
        <div
          onClick={close}
          style={{
            position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)',
            animation: 'contents-fade-in 160ms ease-out',
          }}
        >
          <div
            role="dialog"
            aria-label="Contents"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: bottomClearance, maxHeight: '66%',
              display: 'flex', flexDirection: 'column',
              background: 'var(--color-surface)', borderRadius: '24px 24px 0 0',
              boxShadow: '0 -10px 32px rgba(0,0,0,0.22)', fontFamily: 'var(--font-body)',
              animation: 'contents-sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            {/* Grab handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0', flexShrink: 0 }}>
              <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border)' }} />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px 10px 20px', flexShrink: 0,
              borderBottom: '1px solid var(--color-border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--color-text-primary)' }}>Contents</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                  {items.length} headings
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close contents"
                style={{
                  width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--color-bg)', border: 'none', borderRadius: 'var(--radius-full)',
                  color: 'var(--color-text-secondary)', cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* The list is a timeline: dots on the left, one continuous line through them. */}
            <div ref={listRef} dir="ltr" style={{ overflowY: 'auto', padding: '8px 10px 14px' }}>
              {items.map((item, i) => {
                const color = noteFlavorColor(item.flavor)
                const isCurrent = i === current
                const first = i === 0
                const last = i === items.length - 1
                return (
                  <button
                    key={i}
                    type="button"
                    data-current={isCurrent ? '1' : undefined}
                    onClick={() => jump(i)}
                    style={{
                      display: 'flex', alignItems: 'stretch', gap: 6, width: '100%', textAlign: 'start',
                      padding: 0, border: 'none', background: 'transparent', cursor: 'pointer',
                      fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)',
                    }}
                  >
                    {/* Rail: the line runs the full height of the row so rows join into one stream */}
                    <span style={{ position: 'relative', width: 28, flexShrink: 0 }}>
                      <span style={{
                        position: 'absolute', left: 13, width: 2,
                        top: first ? '50%' : 0, bottom: last ? '50%' : 0,
                        background: 'var(--color-border)',
                      }} />
                      <span style={{
                        position: 'absolute', left: '50%', top: '50%',
                        width: isCurrent ? 16 : 12, height: isCurrent ? 16 : 12, borderRadius: '50%',
                        transform: 'translate(-50%, -50%)', background: color, boxSizing: 'border-box',
                        border: '3px solid var(--color-surface)',
                        boxShadow: isCurrent ? `0 0 0 2px ${color}` : 'none',
                      }} />
                    </span>
                    <span style={{
                      flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', margin: '3px 0',
                      padding: '11px 12px', borderRadius: 'var(--radius-md)',
                      background: isCurrent
                        ? `color-mix(in srgb, ${color} 14%, var(--color-surface) 86%)`
                        : 'transparent',
                    }}>
                      <span dir="auto" style={{
                        flex: 1, minWidth: 0, overflowWrap: 'anywhere', unicodeBidi: 'plaintext',
                        fontSize: 15, lineHeight: 1.35, fontWeight: isCurrent ? 700 : 600,
                      }}>
                        {item.title || '—'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
