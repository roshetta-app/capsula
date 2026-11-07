/**
 * BlockDivider — the one divider look used everywhere (app and CMS preview).
 *
 * A thin line that fades out at both ends, with a small accent diamond in
 * the middle. Deliberately different from the plain line between drug rows
 * and from the end-of-sheet zigzag. No settings, no text, no outer spacing:
 * whoever lays it out (the sheet or a tab) sets the gap around it.
 */
export default function BlockDivider() {
  const lineBase = {
    flex: 1,
    height: 1.5,
    borderRadius: 1,
  }
  return (
    <div
      role="separator"
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 8,
      }}
    >
      <div
        style={{
          ...lineBase,
          background: 'linear-gradient(to right, transparent, var(--color-border))',
        }}
      />
      <div
        style={{
          width: 6,
          height: 6,
          flexShrink: 0,
          transform: 'rotate(45deg)',
          background: 'var(--color-accent)',
          opacity: 0.55,
        }}
      />
      <div
        style={{
          ...lineBase,
          background: 'linear-gradient(to left, transparent, var(--color-border))',
        }}
      />
    </div>
  )
}
