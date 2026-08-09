/**
 * src/components/drugs/sections/DoseAdjustmentsBottomSheet.jsx
 * drug_library_ui_ux — Drug Detail Screen rebuild, Phase 1 step 1.3
 * (plan decision 4.11 — see STEPS_DRUG_DETAIL.md §1.3b, plan §10 Section 10)
 *
 * Bottom sheet for "Dose adjustments", opened by the text-link trigger in
 * DoseSection.jsx's header row. Visual shell (backdrop fade, slide-up
 * transition, mount/unmount timing, Escape key, body-scroll lock) is copied
 * from BrandsBottomSheet.jsx — matching the app's established convention of
 * copying the sheet shell per new sheet, not sharing one component (decision
 * 4.11, confirmed against plan §10 Section 10).
 *
 * The body reuses the same condition/adjustment list markup that used to
 * render as an always-visible inline card in DosingSection.jsx.
 *
 * Props:
 *   isOpen           boolean
 *   onClose          () => void
 *   doseAdjustments  { condition: string, adjustment?: string }[]
 */

import { useEffect, useState } from 'react'
import useBackGestureClose from '../../../hooks/useBackGestureClose'

export default function DoseAdjustmentsBottomSheet({
  isOpen,
  onClose,
  doseAdjustments = [],
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

  useBackGestureClose(isOpen, onClose)

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
        aria-label="Dose adjustments"
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
        {/* Fixed header — drag handle + title, since (unlike BrandsList)
            nothing rendered in the body below supplies its own heading. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) 0' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-3)',
          }} />
          <div style={{
            fontSize:     15,
            fontWeight:   700,
            color:        'var(--color-text-primary)',
            marginBottom: 'var(--space-3)',
          }}>
            Dose adjustments
          </div>
        </div>

        {/* Scrollable body — condition/adjustment list, carried over
            unchanged from the old always-visible inline card. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {doseAdjustments.map((da, i) => (
              <li key={i} style={{
                padding:      'var(--space-2) 0',
                borderBottom: i < doseAdjustments.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
                lineHeight:   1.5,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {da.condition}
                </span>
                {da.adjustment && (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    {da.adjustment}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
