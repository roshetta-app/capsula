/**
 * src/components/ui/ProTag.jsx
 *
 * The small blue "Pro" tag shown next to a control that only Pro users can
 * use. Same look as the tag on the Personal Notes photo row, pulled out so
 * every Pro-only control reads the same. Purely visual: the tap itself is
 * handled by whatever button it sits inside (it opens a PaywallGateSheet).
 */
export default function ProTag() {
  return (
    <span style={{
      flexShrink:      0,
      fontSize:        10,
      fontWeight:      700,
      letterSpacing:   '0.03em',
      lineHeight:      1.4,
      padding:         '1px 5px',
      borderRadius:    4,
      fontFamily:      'var(--font-body)',
      color:           'var(--color-accent)',
      backgroundColor: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
      border:          '1px solid color-mix(in srgb, var(--color-accent) 35%, transparent)',
    }}>
      Pro
    </span>
  )
}
