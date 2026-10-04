/**
 * src/components/ui/CountTag.jsx
 * 2026-10-04 (shared pop-up moved out of the Brands list): moved here unchanged
 * from BrandsList.jsx, where it lived by mistake. The pop-up (FilterModal.jsx),
 * the Brands sheet tabs and the class cards all draw their counts with it, so
 * it is shared and no longer sits in the drug page's Brands list file.
 */

// Small rounded-square tag holding a number. One look for every brand count:
// the generic / form pop-up options and the two tab labels in the sheet.
// tone: 'neutral' (muted fill), 'accent' (tinted accent, for the active tab),
// 'onAccent' (translucent white, for a chip that is filled with the accent).
export default function CountTag({ children, tone = 'neutral', style }) {
  const tones = {
    neutral:  { bg: 'var(--color-border)',       fg: 'var(--color-text-secondary)' },
    accent:   { bg: 'var(--color-accent-light)', fg: 'var(--color-accent)' },
    onAccent: { bg: 'rgba(255,255,255,0.22)',    fg: '#fff' },
  }
  const c = tones[tone] ?? tones.neutral
  return (
    <span style={{
      display:             'inline-flex',
      alignItems:          'center',
      justifyContent:      'center',
      boxSizing:           'border-box',
      minWidth:            22,
      height:              20,
      padding:             '0 6px',
      flexShrink:          0,
      borderRadius:        7,
      fontSize:            12,
      fontWeight:          600,
      lineHeight:          1,
      fontVariantNumeric:  'tabular-nums',
      backgroundColor:     c.bg,
      color:               c.fg,
      transition:          'background-color 0.15s ease, color 0.15s ease',
      ...style,
    }}>
      {children}
    </span>
  )
}
