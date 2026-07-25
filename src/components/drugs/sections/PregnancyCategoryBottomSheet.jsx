/**
 * src/components/drugs/sections/PregnancyCategoryBottomSheet.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.5b (decision 4.13, §10 Section 12)
 *
 * Static reference sheet listing every pregnancy category's badge + full
 * description — fixed content, the same every time, not drug-specific.
 * Opened from PregnancySection.jsx's "What does this mean?" link, once the
 * category badge alone (shown inline in the table) isn't enough context.
 *
 * Visual shell (backdrop fade, slide-up transition, mount/unmount timing,
 * Escape key, body-scroll lock) is copied from BrandsBottomSheet.jsx, same
 * convention already used for DoseAdjustmentsBottomSheet.jsx — no new sheet
 * mechanism introduced. Unlike BrandsBottomSheet.jsx (whose body already
 * supplies its own section header via BrandsList), this sheet has no such
 * built-in title, so a plain title is added directly under the drag handle
 * here.
 *
 * Body reuses PregnancyBadge + PREGNANCY_META from sectionPrimitives.jsx
 * as-is (confirmed in the plan's own audit — "PREGNANCY_META already has
 * every category's color/label, so the legend sheet needs no new content,
 * just a new place to show it") rather than duplicating that content here.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useState } from 'react'
import { PREGNANCY_META, PregnancyBadge } from './sectionPrimitives.jsx'

export default function PregnancyCategoryBottomSheet({ isOpen, onClose }) {
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
        aria-label="Pregnancy categories"
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
        {/* Fixed header — drag handle + a plain title, since (unlike
            BrandsList in BrandsBottomSheet.jsx) this sheet's body has no
            built-in header of its own. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) 0' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-3)',
          }} />
          <div style={{
            fontSize:     17,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-4)',
          }}>
            Pregnancy Categories
          </div>
        </div>

        {/* Scrollable body — every PREGNANCY_META entry, reusing the
            existing PregnancyBadge component unchanged. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          {Object.keys(PREGNANCY_META).map(category => (
            <PregnancyBadge key={category} category={category} />
          ))}
        </div>
      </div>
    </>
  )
}
