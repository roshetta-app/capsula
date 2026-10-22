/**
 * src/components/drugs/groups/GroupDescription.jsx
 * 2026-10-22 (UI refresh plan, step 8.11): a group's description under its name. It shows three
 * lines and then "…" with a "More" button; "Less" folds it back. "More" only shows when the text
 * really is longer than three lines. Left-aligned, dir="ltr", like the group name. Used by the
 * group page and the shared group page.
 */

import { useLayoutEffect, useRef, useState } from 'react'

export default function GroupDescription({ text }) {
  const ref = useRef(null)
  const [open, setOpen] = useState(false)
  const [cut, setCut] = useState(false)

  // Measured while folded: is there more text than the three lines show?
  useLayoutEffect(() => {
    const el = ref.current
    if (el && !open) setCut(el.scrollHeight > el.clientHeight + 1)
  }, [text, open])

  if (!text) return null
  return (
    <div>
      <p
        ref={ref}
        dir="ltr"
        style={{
          margin: 0, fontSize: 14, lineHeight: 1.5, textAlign: 'start',
          color: 'color-mix(in srgb, var(--color-text-primary) 72%, transparent)', fontFamily: 'var(--font-body)',
          whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          ...(open ? {} : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }),
        }}
      >
        {text}
      </p>
      {(cut || open) && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          style={{
            minHeight: 44, padding: 0, background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-accent-text)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {open ? 'Less' : 'More'}
        </button>
      )}
    </div>
  )
}
