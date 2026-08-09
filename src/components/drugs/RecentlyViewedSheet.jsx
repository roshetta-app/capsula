/**
 * src/components/drugs/RecentlyViewedSheet.jsx
 *
 * 2026-08-09: replaces the old horizontal "Recent" chip strip on
 * DrugsScreen with a single button (rendered by DrugsScreen itself) that
 * opens this sheet — a full list of the last MAX_RECENT (15) drugs the
 * user has opened, rendered as normal SharedDrugCard rows (same row used
 * by search results and Favourites' Drugs tab) rather than the strip's
 * plain-text links.
 *
 * Shell (backdrop fade, slide-up transition, mount/unmount timing, Escape
 * key, body-scroll lock) is copied from BrandsBottomSheet.jsx /
 * SpecialtiesBottomSheet.jsx so it reads as the same "extra list in a
 * sheet" pattern already established there. Unlike BrandsBottomSheet (which
 * mounts BrandsList and relies on that child's own section header), nothing
 * rendered inside this sheet provides a title on its own, so — like
 * FavouritesManagerSheet — this shell renders its own "Recently viewed"
 * heading next to the drag handle, with a close button since there's no
 * child list here to carry its own dismiss affordance.
 *
 * Props:
 *   isOpen      boolean
 *   onClose     () => void
 *   drugs       FlatDrug[]  — already resolved to full drug records and
 *                             ordered most-recent-first by the caller
 *                             (DrugsScreen maps stored {id,name,slug}
 *                             entries back to the live catalog before
 *                             passing them in here, since SharedDrugCard
 *                             needs the full record, not just id/name/slug)
 *   categories  Category[] — passed straight through to SharedDrugCard
 *   isDark      boolean    — passed straight through to SharedDrugCard
 *   onSelectDrug (drug) => void — called after this sheet closes
 */

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import SharedDrugCard from '../SharedDrugCard'

export default function RecentlyViewedSheet({
  isOpen,
  onClose,
  drugs = [],
  categories,
  isDark,
  onSelectDrug,
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

  function handleTap(drug) {
    onClose()
    onSelectDrug?.(drug)
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
        aria-label="Recently viewed"
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
        {/* Fixed header — drag handle + title, since (unlike
            BrandsBottomSheet) nothing mounted below provides its own
            section header. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) 0' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-3)',
          }} />
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            marginBottom: 'var(--space-3)',
          }}>
            <Clock size={16} strokeWidth={1.8} color="var(--color-text-tertiary)" />
            <h2 style={{
              fontSize:   16,
              fontWeight: 700,
              color:      'var(--color-text-primary)',
              margin:     0,
            }}>
              Recently viewed
            </h2>
          </div>
        </div>

        {/* Scrollable body — same SharedDrugCard row used by search
            results and Favourites' Drugs tab, no trailing bookmark slot
            since this list is about history, not saved status. */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          {drugs.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding:   'var(--space-8) var(--space-4)',
              color:     'var(--color-text-tertiary)',
              fontSize:  14,
            }}>
              No recently viewed drugs yet.
            </div>
          ) : (
            drugs.map((drug, i) => (
              <SharedDrugCard
                key={drug.id}
                drug={drug}
                categories={categories}
                isDark={isDark}
                isLast={i === drugs.length - 1}
                onTap={handleTap}
              />
            ))
          )}
        </div>
      </div>
    </>
  )
}
