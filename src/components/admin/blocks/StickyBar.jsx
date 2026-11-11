/**
 * StickyBar — src/components/admin/blocks/StickyBar.jsx
 *
 * Keeps the text editor's toolbar pinned at the top of the screen while you scroll
 * through a long text block, so you no longer have to scroll back up to reach it.
 *
 * It sits just under whatever is already pinned at the top of the CMS (the page's
 * Save bar on the condition / drug editor, and the top bar on phone). That height is
 * measured, so it stays right on desktop, on phone, and when the Save bar wraps.
 * It only stays pinned while its own editor is on screen; it scrolls away with the
 * editor, never over the next block.
 *
 * Needs the card around it not to use overflow: hidden (that stops any pinning);
 * BlockListEditor uses overflow: clip for that reason.
 */

import { useLayoutEffect, useState } from 'react'

function pinnedHeight() {
  // top bar on phone (0 on desktop, where the variable does not exist)
  const probe = document.createElement('div')
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;height:var(--cms-topbar-h, 0px)'
  document.body.appendChild(probe)
  const bar = probe.offsetHeight
  probe.remove()

  // the page's own pinned Save bar, if this page has one
  const head = document.querySelector('.cms-page-head-sticky')
  if (head) {
    const top = parseFloat(getComputedStyle(head).top)
    return Math.round((Number.isFinite(top) ? top : bar) + head.getBoundingClientRect().height)
  }
  return bar
}

export default function StickyBar({ children, style }) {
  const [top, setTop] = useState(0)

  useLayoutEffect(() => {
    const measure = () => setTop(prev => {
      const next = pinnedHeight()
      return prev === next ? prev : next
    })
    measure()
    window.addEventListener('resize', measure)
    // the Save bar can grow or shrink (wrapping, "unsaved" note): measure again
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    if (ro) ro.observe(document.body)
    const late = setTimeout(measure, 600) // the page's bar may appear a moment after the editor
    return () => {
      window.removeEventListener('resize', measure)
      if (ro) ro.disconnect()
      clearTimeout(late)
    }
  }, [])

  return (
    <div style={{
      position: 'sticky',
      top,
      zIndex: 40,                      // under the page's Save bar (300), over the text
      backgroundColor: 'var(--color-surface)',
      padding: '4px 0',
      ...style,
    }}>
      {children}
    </div>
  )
}
