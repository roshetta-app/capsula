/**
 * src/components/drugs/sections/PregnancySection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.5a (decision 4.13, §10 Section 12)
 *
 * Pregnancy & Breastfeeding as its own standalone section, split out of
 * SafetySection.jsx, and rebuilt as a 4-row table instead of a badge + emoji
 * icon-rows. Each row: a fixed decorative color circle (identity color per
 * field, not tied to the value), a plain field label, and a right-aligned
 * value:
 *   - Pregnancy    — "Category" label + a small colored badge (B/C/D/X/etc.)
 *   - Breastfeeding — full semantic color per value (safe/caution/unsafe)
 *   - Crosses placenta / Crosses BBB — known-vs-unknown style only: real
 *     Yes/No answers in standard text color, "Unknown" in muted gray
 *
 * Each row still individually hides if its own field is null, same as the
 * old IconRow behavior. The category's long description text (previously
 * always visible under the badge) moves out of the table entirely into a
 * "What does this mean?" link below it, opening the new static
 * PregnancyCategoryBottomSheet.jsx. If none of the 4 fields have data, the
 * whole section is omitted — no placeholder — matching the default already
 * set for Uses, Dose Adjustments, and Side Effects.
 *
 * Title uses the same bold style as Dosage/Side Effects (not the small
 * uppercase SectionHeader) — applied directly here from the start, per the
 * typography correction already made on Side Effects (STEPS_DRUG_DETAIL.md
 * 1.4). No trailing Divider(), per the page-wide no-divider rule.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { useState } from 'react'
import { PREGNANCY_META } from './sectionPrimitives.jsx'
import PregnancyCategoryBottomSheet from './PregnancyCategoryBottomSheet.jsx'

// Fixed, decorative per-field identity colors — not tied to any field's
// value, just a consistent visual identity so each row's circle looks
// different from the others.
const FIELD_STYLE = {
  pregnancy:     { emoji: '🤰', bg: '#FCE7F3' },
  breastfeeding: { emoji: '🤱', bg: '#DBEAFE' },
  placenta:      { emoji: '🧬', bg: '#CCFBF1' },
  bbb:           { emoji: '🧠', bg: '#EDE9FE' },
}

const BREASTFEEDING_COLOR = {
  safe:    '#059669',
  caution: '#D97706',
  unsafe:  '#DC2626',
}

function displayYesNo(value) {
  if (value === 'yes') return 'Yes'
  if (value === 'no')  return 'No'
  return 'Unknown'
}

function IdentityCircle({ emoji, bg }) {
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      justifyContent:  'center',
      width:           28,
      height:          28,
      borderRadius:    '50%',
      backgroundColor: bg,
      fontSize:        14,
      flexShrink:      0,
    }}>
      {emoji}
    </span>
  )
}

function Row({ field, label, children, isLast }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'center',
      gap:          'var(--space-3)',
      padding:      'var(--space-3) 0',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
    }}>
      <IdentityCircle emoji={FIELD_STYLE[field].emoji} bg={FIELD_STYLE[field].bg} />
      <div style={{ fontSize: 14, color: 'var(--color-text-primary)', flex: 1 }}>
        {label}
      </div>
      <div style={{ fontSize: 14 }}>
        {children}
      </div>
    </div>
  )
}

export default function PregnancySection({ drug }) {
  const [sheetOpen, setSheetOpen] = useState(false)

  const {
    pregnancyCategory,
    breastfeedingSafety,
    crossesPlacenta,
    crossesBbb,
  } = drug

  const hasAny =
    !!pregnancyCategory || !!breastfeedingSafety || crossesPlacenta != null || crossesBbb != null

  if (!hasAny) return null

  const categoryMeta = pregnancyCategory
    ? (PREGNANCY_META[pregnancyCategory] ?? PREGNANCY_META.N)
    : null

  // Build the visible row list first so only the true last one drops its
  // bottom border.
  const rows = []
  if (pregnancyCategory) rows.push('pregnancy')
  if (breastfeedingSafety) rows.push('breastfeeding')
  if (crossesPlacenta != null) rows.push('placenta')
  if (crossesBbb != null) rows.push('bbb')

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{
        fontSize:     17,
        fontWeight:   700,
        color:        'var(--color-text-primary)',
        marginBottom: 'var(--space-3)',
      }}>
        Pregnancy & Breastfeeding
      </div>

      <div>
        {rows.map((field, i) => {
          const isLast = i === rows.length - 1

          if (field === 'pregnancy') {
            return (
              <Row key={field} field={field} label="Category" isLast={isLast}>
                <span style={{
                  display:         'inline-block',
                  fontWeight:      700,
                  fontSize:        13,
                  padding:         '2px 10px',
                  borderRadius:    'var(--radius-full)',
                  backgroundColor: categoryMeta.bg,
                  color:           categoryMeta.color,
                }}>
                  {pregnancyCategory}
                </span>
              </Row>
            )
          }

          if (field === 'breastfeeding') {
            return (
              <Row key={field} field={field} label="Breastfeeding" isLast={isLast}>
                <span style={{
                  fontWeight:     600,
                  textTransform:  'capitalize',
                  color:          BREASTFEEDING_COLOR[breastfeedingSafety] ?? 'var(--color-text-primary)',
                }}>
                  {breastfeedingSafety}
                </span>
              </Row>
            )
          }

          if (field === 'placenta') {
            return (
              <Row key={field} field={field} label="Crosses placenta" isLast={isLast}>
                <span style={{
                  color: crossesPlacenta === 'unknown' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                }}>
                  {displayYesNo(crossesPlacenta)}
                </span>
              </Row>
            )
          }

          // field === 'bbb'
          return (
            <Row key={field} field={field} label="Crosses BBB" isLast={isLast}>
              <span style={{
                color: crossesBbb === 'unknown' ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
              }}>
                {displayYesNo(crossesBbb)}
              </span>
            </Row>
          )
        })}
      </div>

      {pregnancyCategory && (
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            display:        'flex',
            alignItems:     'center',
            gap:            4,
            background:     'none',
            border:         'none',
            cursor:         'pointer',
            padding:        0,
            marginTop:      'var(--space-3)',
            fontFamily:     'var(--font-body)',
            fontSize:       13,
            fontWeight:     500,
            color:          'var(--color-text-secondary)',
            textDecoration: 'underline',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          What does this mean?
        </button>
      )}

      <PregnancyCategoryBottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  )
}
