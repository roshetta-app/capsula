/**
 * src/components/ui/BackToTopButton.jsx
 * Extracted from ConditionsScreen.jsx so the floating back-to-top button can
 * be reused on FavouritesScreen (and any future screen) with identical
 * markup/styling instead of being duplicated per screen. Purely
 * presentational — pair with src/hooks/useBackToTop.js for the scroll
 * tracking + smooth-scroll behavior.
 */
import { ArrowUp } from 'lucide-react'

export default function BackToTopButton({ visible, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Back to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        position:                'fixed',
        right:                   'var(--space-5)',
        bottom:                  'calc(96px + env(safe-area-inset-bottom))',
        width:                   50,
        height:                  50,
        borderRadius:            'var(--radius-full)',
        border:                  'none',
        backgroundColor:         'var(--color-accent)',
        color:                   '#ffffff',
        boxShadow:               'var(--shadow-elevated)',
        display:                 'flex',
        alignItems:              'center',
        justifyContent:          'center',
        cursor:                  'pointer',
        zIndex:                  60,
        opacity:                 visible ? 1 : 0,
        transform:               visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents:           visible ? 'auto' : 'none',
        transition:              'opacity 0.2s ease, transform 0.2s ease',
        outline:                 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <ArrowUp size={20} strokeWidth={2.5} />
    </button>
  )
}
