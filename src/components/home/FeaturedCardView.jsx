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
 *
 * 2026-11-16 (Phase J step 11.2): the card is always FEATURED_H high (it only grows at the very biggest
 * phone font, so the button is never cut). The text column has a fixed width on the left, so a long name
 * never goes under the picture: the name takes at most two lines and ends with '...' after that, and its
 * size steps down with its length (30, 26, 22); the small label and the line are one line each. The pill
 * is smaller (36 high; the whole card is the tap target) and sits at the bottom. Names come with proper
 * capitalization (homeFeatured.js).
 */

import { Stethoscope } from 'lucide-react'
import FeaturedCapsuleArt from './FeaturedCapsuleArt'
import { cardTitle, cardTitleSize, cardLabel, cardLine, cardButton } from '../../utils/homeFeatured'

export const FEATURED_H = 184
const ART = 96
const ART_ZONE = 112 // the right part kept free for the picture; the text never goes into it

export default function FeaturedCardView({ item, onOpen }) {
  const title = cardTitle(item) || 'Title'
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
        <span dir="auto" style={{ ...styles.title, fontSize: cardTitleSize(title) }}>{title}</span>
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
    position: 'relative', overflow: 'hidden', width: '100%', boxSizing: 'border-box',
    minHeight: FEATURED_H, borderRadius: 24, padding: '18px 20px', textAlign: 'start',
    display: 'flex', flexDirection: 'column',
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
    position: 'relative', display: 'flex', flexDirection: 'column', flex: 1,
    width: `calc(100% - ${ART_ZONE}px)`,
  },
  label: {
    fontSize: 12, fontWeight: 600, letterSpacing: '0.02em', opacity: 0.78,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  title: {
    marginTop: 4, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', overflowWrap: 'anywhere',
    display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden',
  },
  line: {
    marginTop: 4, fontSize: 14, lineHeight: 1.35, opacity: 0.78,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  pill: {
    alignSelf: 'flex-start', marginTop: 'auto', minHeight: 36, display: 'inline-flex', alignItems: 'center',
    gap: 6, whiteSpace: 'nowrap', padding: '0 16px', borderRadius: 999, backgroundColor: '#fff', color: 'var(--color-accent-solid)',
    fontSize: 13, fontWeight: 700, boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  },
}
