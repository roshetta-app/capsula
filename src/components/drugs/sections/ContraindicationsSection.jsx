/**
 * src/components/drugs/sections/ContraindicationsSection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.6 (decision 4.14, §10 Section 13)
 *
 * Contraindications as its own standalone section, split out of
 * SafetySection.jsx. Content is otherwise unchanged from the old plain
 * list — just moved into a new tinted box. Unlike Uses (whose tint follows
 * the drug's own category color), this tint is a fixed red/danger color
 * regardless of specialty, since a contraindication always reads as
 * "danger" rather than something tied to a given specialty's accent.
 *
 * Past 3 entries, the list truncates behind a "See more"/"See less" text +
 * chevron control, centered below the list (not top-right, unlike Side
 * Effects) — omitted entirely, not just inert, whenever the item count is
 * at or under the threshold (3), same rule confirmed for every truncating
 * section on this page.
 *
 * If `contraindications` is empty, the whole section is omitted — no
 * header, no placeholder — same "hide if truly empty" rule already used by
 * Uses/Dose Adjustments/Side Effects/Pregnancy.
 *
 * No query or CMS change accompanies this: `contraindications` was already
 * selected/mapped in queries.js, and the CMS `TagInput` field already
 * matches this shape (step 2.1, resolved as a no-op).
 *
 * Props: drug — flat drug object from DrugContext
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SPECIALTY_TOKENS, hexToRgb } from '../../../utils/specialtyTokens.js'
import { useIsDark } from '../../../utils/specialtyIcon'

const TRUNCATE_AT = 3

// Fixed danger tint — deliberately not the drug's category color (decision
// 4.14). tintedBg()'s alpha (0.35 light / 0.16 dark) is tuned for token
// 'bg' colors that are already near-pastel — feeding it the 'red' token's
// bg washed out almost to white. Built locally instead: the richer 'pill'
// red (same red the "Major" interaction badge uses) as the base, at a
// lower, hand-tuned alpha — enough color to still read as "danger"
// without being a solid block.
const DANGER_ALPHA = { light: 0.14, dark: 0.22 }

export default function ContraindicationsSection({ drug }) {
  const [open, setOpen] = useState(false)
  const isDark = useIsDark()

  const { contraindications = [] } = drug

  if (contraindications.length === 0) return null

  const hasMore = contraindications.length > TRUNCATE_AT
  const shown = open ? contraindications : contraindications.slice(0, TRUNCATE_AT)

  const [r, g, b] = hexToRgb(SPECIALTY_TOKENS.red.light.pill)
  const dangerBg = `rgba(${r}, ${g}, ${b}, ${isDark ? DANGER_ALPHA.dark : DANGER_ALPHA.light})`

  return (
    <div style={{
      marginBottom:    'var(--space-5)',
      padding:         'var(--space-4)',
      borderRadius:    'var(--radius-sm)',
      backgroundColor: dangerBg,
    }}>
      <div style={{
        fontSize:     15,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
      }}>
        Contraindications
      </div>

      <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
        {shown.map((ci, i) => (
          <li key={i} style={{
            fontSize:     14,
            color:        'var(--color-text-primary)',
            lineHeight:   1.6,
            marginBottom: i === shown.length - 1 ? 0 : 'var(--space-2)',
          }}>
            {ci}
          </li>
        ))}
      </ul>

      {hasMore && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            4,
            width:          '100%',
            marginTop:      'var(--space-3)',
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            padding:        0,
            fontFamily:     'var(--font-body)',
            fontSize:       13,
            fontWeight:     600,
            color:          'var(--color-text-secondary)',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {open ? 'See less' : 'See more'}
          {open
            ? <ChevronUp size={14} />
            : <ChevronDown size={14} />
          }
        </button>
      )}
    </div>
  )
}
