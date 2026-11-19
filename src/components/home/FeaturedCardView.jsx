/**
 * src/components/home/FeaturedCardView.jsx
 * Phase H — the big featured card, as approved in 9.0. Used by Home (tappable) and by the CMS "Home
 * card" preview (not tappable). All wording comes from src/utils/homeFeatured.js.
 * Each text has its own direction (dir="auto"); the layout itself never mirrors.
 *
 * 2026-11-16 (Phase J step 11.1, your redesign): the card is drawn in CSS, no picture file and no text
 * in a picture. The background goes from the app's pale blue (left) to its solid blue (right) using the
 * app's own variables, so dark mode follows the app: dark text on the pale side in light mode, light
 * text on the dark tint in dark mode. Two soft translucent circles sit behind the picture on the right.
 * A drug shows a capsule drawing (FeaturedCapsuleArt, decorative); a topic shows the stethoscope in the
 * same place. The text keeps to the left part so the picture never sits under it; the card grows
 * taller with large text. The wording, the data and the tap (onOpen) are unchanged.
 */

import { Stethoscope } from 'lucide-react'
import FeaturedCapsuleArt from './FeaturedCapsuleArt'
import { cardTitle, cardLabel, cardLine, cardButton } from '../../utils/homeFeatured'

export const FEATURED_MIN_H = 176
const ART = 96

export default function FeaturedCardView({ item, onOpen }) {
  const body = (
    <>
      <div style={styles.circleBig} aria-hidden="true" />
      <div style={styles.circleSmall} aria-hidden="true" />
      <div style={styles.art} aria-hidden="true">
        {item.kind === 'brand'
          ? <FeaturedCapsuleArt size={ART} />
          : <Stethoscope size={56} strokeWidth={1.6} color="#fff" />}
      </div>
      <div style={styles.text}>
        <span dir="auto" style={styles.label}>{cardLabel(item)}</span>
        <span dir="auto" style={styles.title}>{cardTitle(item) || 'Title'}</span>
        <span dir="auto" style={styles.line}>{cardLine(item)}</span>
        <span style={styles.pill}>{cardButton(item)}<span aria-hidden="true">→</span></span>
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
    minHeight: FEATURED_MIN_H, borderRadius: 24, padding: '22px 20px', textAlign: 'start',
    backgroundImage: 'linear-gradient(110deg, var(--color-accent-light) 0%, color-mix(in srgb, var(--color-accent-solid) 40%, var(--color-accent-light)) 55%, var(--color-accent-solid) 100%)',
    color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)',
  },
  tappable: { border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  circleBig: {
    position: 'absolute', insetInlineEnd: -56, top: -34, width: 220, height: 220, borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.14)', pointerEvents: 'none',
  },
  circleSmall: {
    position: 'absolute', insetInlineEnd: 6, top: '50%', marginTop: -56, width: 112, height: 112, borderRadius: '50%',
    backgroundColor: 'rgba(255,255,255,0.18)', pointerEvents: 'none',
  },
  art: {
    position: 'absolute', insetInlineEnd: 6, top: '50%', marginTop: -ART / 2, width: ART, height: ART,
    display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
  },
  text: {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: 6,
    maxWidth: `calc(100% - ${ART + 8}px)`,
  },
  label: { fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', opacity: 0.78 },
  title: { fontSize: 28, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', overflowWrap: 'anywhere' },
  line: { fontSize: 14, lineHeight: 1.35, opacity: 0.78, overflowWrap: 'anywhere' },
  pill: {
    alignSelf: 'flex-start', marginTop: 10, minHeight: 44, display: 'inline-flex', alignItems: 'center',
    gap: 6, whiteSpace: 'nowrap', padding: '0 16px', borderRadius: 999, backgroundColor: '#fff', color: 'var(--color-accent-solid)',
    fontSize: 14, fontWeight: 700, boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
}
