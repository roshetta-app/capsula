/**
 * src/components/drugs/groups/AddDrugsResultList.jsx
 * 2026-10-21 (Drug groups plan, step 12.5): the result list of the Add drugs screen. The same
 * windowed list as the Drugs screen's (only the rows on screen are drawn, measured as they
 * appear, read through the page's own scroll), with the drug card unchanged and, in the
 * card's trailing slot, a round + to add the drug, or a tick when it is already in the group.
 * Tapping the card itself opens the drug page, as everywhere else.
 */

import { useLayoutEffect, useRef, useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useWindowVirtualizer, observeWindowOffset } from '@tanstack/react-virtual'
import SharedDrugCard from '../../SharedDrugCard'

// Sheets pin the page (position: fixed, negative top), which reads as scroll 0; read the
// pin instead so the list keeps drawing the rows the person sees (same fix as the Drugs list).
function observeWindowOffsetThroughSheetLock(instance, cb) {
  return observeWindowOffset(instance, (offset, isScrolling) => {
    const html = document.documentElement
    const pinnedTop = html.style.position === 'fixed' ? parseFloat(html.style.top) : NaN
    cb(Number.isFinite(pinnedTop) ? -pinnedTop : offset, isScrolling)
  })
}

function AddMark({ inGroup, onAdd, name }) {
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none', padding: 0,
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  }
  if (inGroup) {
    return (
      <span role="img" aria-label={`${name} is in this group`} style={{ ...base, color: 'var(--color-accent)' }}>
        <Check size={22} strokeWidth={2.5} aria-hidden="true" />
      </span>
    )
  }
  return (
    <button
      onClick={onAdd}
      aria-label={`Add ${name} to this group`}
      style={{ ...base, cursor: 'pointer', backgroundColor: 'var(--color-accent)', color: '#fff' }}
    >
      <Plus size={22} strokeWidth={2.5} aria-hidden="true" />
    </button>
  )
}

export default function AddDrugsResultList({
  drugs, inGroup, onAdd, onOpen, categories, isDark, highlight = '', searchMode = 'brand', nameOf,
}) {
  const listRef = useRef(null)
  // Where the list starts on the page, measured once it is drawn (the count line above it
  // can change the place it starts).
  const [scrollMargin, setScrollMargin] = useState(0)
  useLayoutEffect(() => {
    const el = listRef.current
    if (el) setScrollMargin(el.getBoundingClientRect().top + window.scrollY)
  }, [highlight])
  const virtualizer = useWindowVirtualizer({
    count: drugs.length,
    estimateSize: () => 76,
    overscan: 8,
    observeElementOffset: observeWindowOffsetThroughSheetLock,
    scrollMargin,
    getItemKey: index => drugs[index]?.id ?? index,
  })

  return (
    <div ref={listRef} style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map(virtualRow => {
        const drug = drugs[virtualRow.index]
        return (
          <div
            key={drug.id}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%',
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
            }}
          >
            <SharedDrugCard
              drug={drug}
              onTap={onOpen}
              categories={categories}
              isDark={isDark}
              isLast={virtualRow.index === drugs.length - 1}
              highlight={highlight}
              searchMode={searchMode}
              trailing={
                <AddMark
                  inGroup={inGroup.has(drug.id)}
                  name={nameOf(drug)}
                  onAdd={() => onAdd(drug)}
                />
              }
            />
          </div>
        )
      })}
    </div>
  )
}
