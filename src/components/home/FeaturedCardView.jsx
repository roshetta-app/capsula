/**
 * src/components/home/FeaturedCardView.jsx
 * Phase H — the big featured card, as approved in 9.0. One solid blue block (the only solid block on
 * Home), a small label, the title, one short line and a white pill. Used by Home (tappable) and by the
 * CMS "Home card" preview (not tappable). All wording comes from src/utils/homeFeatured.js.
 * Each text has its own direction (dir="auto"); the layout itself never mirrors.
 */

import { Stethoscope, Pill } from 'lucide-react'
import { cardTitle, cardLabel, cardLine, cardButton } from '../../utils/homeFeatured'

export default function FeaturedCardView({ item, onOpen }) {
  const Icon = item.kind === 'brand' ? Pill : Stethoscope
  const body = (
    <>
      <div style={styles.shape} aria-hidden="true" />
      <Icon size={44} style={styles.icon} aria-hidden="true" />
      <div style={styles.text}>
        <span dir="auto" style={styles.label}>{cardLabel(item)}</span>
        <span dir="auto" style={styles.title}>{cardTitle(item) || 'Title'}</span>
        <span dir="auto" style={styles.line}>{cardLine(item)}</span>
        <span style={styles.pill}>{cardButton(item)}</span>
      </div>
    </>
  )
  if (!onOpen) return <div style={styles.card}>{body}</div>
  return (
    <button type="button" onClick={onOpen} style={{ ...styles.card, ...styles.tappable }}>
      {body}
    </button>
  )
}

const styles = {
  card: {
    position: 'relative', overflow: 'hidden', display: 'block', width: '100%', boxSizing: 'border-box',
    minHeight: 150, borderRadius: 16, padding: 16, textAlign: 'start',
    backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontFamily: 'var(--font-body)',
  },
  tappable: { border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  shape: {
    position: 'absolute', insetInlineEnd: -40, top: -40, width: 150, height: 150,
    borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.12)',
  },
  icon: { position: 'absolute', insetInlineEnd: 18, bottom: 18, color: 'rgba(255,255,255,0.7)' },
  text: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 6, maxWidth: '78%' },
  label: { fontSize: 12, fontWeight: 500, opacity: 0.85 },
  title: { fontSize: 22, fontWeight: 500, lineHeight: 1.25, overflowWrap: 'anywhere' },
  line: { fontSize: 13, opacity: 0.9, overflowWrap: 'anywhere' },
  pill: {
    alignSelf: 'flex-start', marginTop: 6, minHeight: 44, display: 'inline-flex', alignItems: 'center',
    padding: '0 18px', borderRadius: 999, backgroundColor: '#fff', color: 'var(--color-accent-solid)',
    fontSize: 13, fontWeight: 600, boxSizing: 'border-box',
  },
}
