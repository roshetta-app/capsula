/**
 * src/components/drugs/sections/PregnancyCategoryBottomSheet.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.5b (decision 4.13, §10 Section 12)
 *
 * Static reference sheet listing every value for all four Safety &
 * Pregnancy fields — fixed content, the same every time, not drug-specific.
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
 * decision 9 / plan §7 Pregnancy step 3 (2026-08-03): generalized from a
 * single "Pregnancy Categories" list into three grouped sections, in the
 * same order as PregnancySection.jsx's table rows:
 *   1. Pregnancy Category   — unchanged: PregnancyBadge + PREGNANCY_META.
 *   2. Breastfeeding Safety — new: same colored-box treatment as pregnancy,
 *      looping BREASTFEEDING_META's L1-L5 entries via a local
 *      BreastfeedingBadge (no exported breastfeeding-badge component exists
 *      yet in sectionPrimitives.jsx; kept local to keep this change
 *      contained to this file).
 *   3. Crosses Placenta / BBB — new: label-only text (no colored box, per
 *      the 6.2 design call), looping CROSSES_META's yes/no/minimal/unknown
 *      entries once — both fields share the same value meanings, so shown
 *      a single time rather than duplicated.
 * Each group uses the existing SectionHeader primitive for its subheading.
 *
 * Props:
 *   isOpen   boolean
 *   onClose  () => void
 */

import { useEffect, useState } from 'react'
import {
  PREGNANCY_META,
  PregnancyBadge,
  BREASTFEEDING_META,
  CROSSES_META,
  SectionHeader,
} from './sectionPrimitives.jsx'

function BreastfeedingBadge({ level }) {
  const meta = BREASTFEEDING_META[level]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <span style={{
        display:         'inline-flex',
        alignItems:      'center',
        justifyContent:  'center',
        width:           32,
        height:          32,
        borderRadius:    'var(--radius-sm)',
        backgroundColor: meta.bg,
        color:           meta.color,
        fontSize:        16,
        fontWeight:      700,
        flexShrink:      0,
      }}>
        {level}
      </span>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
        {meta.label}
      </span>
    </div>
  )
}

function CrossesItem({ item }) {
  return (
    <div style={{
      fontSize:     13,
      color:        'var(--color-text-secondary)',
      lineHeight:   1.4,
      marginBottom: 'var(--space-2)',
    }}>
      {item.label}
    </div>
  )
}

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
        aria-label="Pregnancy & breastfeeding"
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
            Pregnancy & Breastfeeding
          </div>
        </div>

        {/* Scrollable body — three grouped sections, one per meta object. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <SectionHeader title="Pregnancy Category" />
            {Object.keys(PREGNANCY_META).map(category => (
              <PregnancyBadge key={category} category={category} />
            ))}
          </div>

          <div style={{ marginBottom: 'var(--space-5)' }}>
            <SectionHeader title="Breastfeeding Safety" />
            {Object.keys(BREASTFEEDING_META).map(level => (
              <BreastfeedingBadge key={level} level={level} />
            ))}
          </div>

          <div>
            <SectionHeader title="Crosses Placenta / Blood-Brain Barrier" />
            {Object.values(CROSSES_META).map(item => (
              <CrossesItem key={item.label} item={item} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
