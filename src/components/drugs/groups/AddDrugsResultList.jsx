/**
 * 2026-10-23: tapping the word Added takes the drug out of the group again (onRemove).
 * 2026-10-23 (UI refresh): the round + is smaller (a 32px circle inside the same 44px tap area).
 *
 * 2026-10-22 (UI refresh plan, step 8.4b): a drug already in the group shows a tick with the word
 * Added instead of a bare tick. The plus stops its tap from reaching the card, so adding a drug
 * no longer also opens the drug page.
 *
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

function AddMark({ inGroup, onAdd, onRemove, name }) {
  const base = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none', padding: 0,
    background: 'none',
    WebkitTapHighlightColor: 'transparent', outline: 'none',
  }
  if (inGroup) {
    // Tapping Added takes the drug out of the group again.
    return (
      <button
        onClick={e => { e.stopPropagation(); onRemove?.() }}
        onPointerDown={e => e.stopPropagation()}
        aria-label={`${name} is in this group. Tap to remove it`}
        style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, minHeight: 44, padding: '0 8px',
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: 'var(--color-accent)', fontFamily: 'var(--font-body)',
          WebkitTapHighlightColor: 'transparent', outline: 'none',
        }}
      >
        <Check size={16} strokeWidth={2.5} aria-hidden="true" />
        Added
      </button>
    )
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); onAdd() }}
      onPointerDown={e => e.stopPropagation()}
      aria-label={`Add ${name} to this group`}
      style={{ ...base, cursor: 'pointer' }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--color-accent-solid)', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Plus size={18} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  )
}

export default function AddDrugsResultList({
  drugs, inGroup, onAdd, onRemove, onOpen, categories, isDark, highlight = '', searchMode = 'brand', nameOf,
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
                  onRemove={() => onRemove?.(drug)}
                />
              }
            />
          </div>
        )
      })}
    </div>
  )
}
