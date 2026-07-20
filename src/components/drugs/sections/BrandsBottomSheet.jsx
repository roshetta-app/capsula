/**
 * src/components/drugs/sections/BrandsBottomSheet.jsx
 * Phase 2c — Drug Detail Screen, grouped sections
 *
 * Bottom sheet for "Available Brands" (decision 4.27), opened by the
 * compact trigger row in DosingSection.jsx. Visual shell (backdrop fade,
 * slide-up transition, mount/unmount timing, Escape key, body-scroll lock)
 * is copied from SpecialtiesBottomSheet.jsx / FavouritesManagerSheet.jsx so
 * it reads as the same "extra controls in a sheet" pattern already
 * established there — no new UI language introduced.
 *
 * Like SpecialtiesBottomSheet.jsx (a single list, not several grouped
 * controls), this sheet relies on backdrop-tap/Escape alone to dismiss —
 * no separate close button. BrandsList.jsx is mounted unchanged as the
 * body, including its own "Available Brands (Egypt)" section header, so
 * the sheet shell itself carries only the drag handle, not a duplicate
 * title.
 *
 * Props:
 *   isOpen        boolean
 *   onClose       () => void
 *   siblings      array — same shape BrandsList.jsx already receives
 *   onSelectBrand (item) => void — called after this sheet closes
 */

import { useEffect, useState } from 'react'
import BrandsList from '../BrandsList.jsx'

export default function BrandsBottomSheet({
  isOpen,
  onClose,
  siblings = [],
  onSelectBrand,
}) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!shouldRender) return null

  function handleTap(item) {
    onClose()
    onSelectBrand?.(item)
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Available brands"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       '70dvh',
          paddingBottom:   'env(safe-area-inset-bottom)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Fixed header — drag handle only; BrandsList below already
            renders its own "Available Brands (Egypt)" section header,
            so this sheet doesn't duplicate a title. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) 0' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-3)',
          }} />
        </div>

        {/* Scrollable body — BrandsList's existing filter-chip/sort-toggle/
            sibling-list internals, unchanged. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          <BrandsList siblings={siblings} onTap={handleTap} />
        </div>
      </div>
    </>
  )
}
