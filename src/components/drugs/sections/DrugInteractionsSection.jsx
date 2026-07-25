/**
 * src/components/drugs/sections/DrugInteractionsSection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.7 (decision 4.15, §10 Section 14)
 *
 * Drug Interactions as its own standalone section, split out of
 * PrescribingSection.jsx (Pharmacokinetics stays there, see 1.8). Drops the
 * old SeverityBadge treatment entirely — plain rows only, matching the
 * reference screenshot's flatter look.
 *
 * Each row is a small red pill-icon badge + drug name + trailing chevron.
 * Tapping a row expands it in place to reveal the interaction's description
 * and collapses any other row already open — a single-open accordion, not
 * independent per-row toggles.
 *
 * Past 4 entries, the list truncates behind a "See all"/"See less" text +
 * chevron toggle, top-right of the title row — same position as Side
 * Effects' toggle, but styled as a blue text link (not Side Effects' bold
 * black button) per the reference mockup, and hidden entirely (not just
 * inert) at or under 4 items. The threshold here is 4, not the 3 used by
 * Uses/Side Effects/Contraindications — a deliberate per-section difference,
 * not an inconsistency (decision 4.15).
 *
 * If drugInteractions is empty, the whole section is omitted — no header,
 * no placeholder — a deliberate exception to the EmptySection ("Not yet
 * added") pattern every other section uses, per decision 4.15.
 *
 * Title is sentence case ("Drug interactions"), matching the reference
 * mockup rather than the page's usual Title Case section headers.
 *
 * Field access keeps the existing safe fallbacks (ix.drug ?? ix.drug_name,
 * ix.description ?? ix.risk) — live data only ever uses drug/description;
 * the CMS key-mismatch bug fix is a separate step (2.2), not this one.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, ChevronRight, Pill } from 'lucide-react'

const TRUNCATE_AT = 4

export default function DrugInteractionsSection({ drug }) {
  const [seeAllOpen, setSeeAllOpen] = useState(false)
  const [openIndex, setOpenIndex] = useState(null)

  const { drugInteractions = [] } = drug

  if (drugInteractions.length === 0) return null

  const hasMore = drugInteractions.length > TRUNCATE_AT
  const shown = seeAllOpen ? drugInteractions : drugInteractions.slice(0, TRUNCATE_AT)

  function handleRowTap(i) {
    setOpenIndex(current => (current === i ? null : i))
  }

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   'var(--space-3)',
      }}>
        <div style={{
          fontSize:   17,
          fontWeight: 700,
          color:      'var(--color-text-primary)',
        }}>
          Drug interactions
        </div>

        {hasMore && (
          <button
            onClick={() => setSeeAllOpen(o => !o)}
            style={{
              display:    'flex',
              alignItems: 'center',
              gap:        2,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              fontFamily: 'var(--font-body)',
              fontSize:   13,
              fontWeight: 600,
              color:      'var(--color-accent)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {seeAllOpen ? 'See less' : 'See all'}
            {seeAllOpen
              ? <ChevronUp size={14} />
              : <ChevronDown size={14} />
            }
          </button>
        )}
      </div>

      <div>
        {shown.map((ix, i) => {
          const isOpen = openIndex === i
          const name = ix.drug ?? ix.drug_name ?? ix.name
          const description = ix.description ?? ix.risk

          return (
            <div
              key={i}
              style={{
                padding:      'var(--space-3) 0',
                borderBottom: i < shown.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}
            >
              <button
                onClick={() => handleRowTap(i)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  width:          '100%',
                  background:     'none',
                  border:         'none',
                  cursor:         'pointer',
                  padding:        0,
                  fontFamily:     'var(--font-body)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{
                    display:         'inline-flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    width:           28,
                    height:          28,
                    borderRadius:    'var(--radius-full)',
                    backgroundColor: 'rgba(220, 38, 38, 0.14)',
                    flexShrink:      0,
                  }}>
                    <Pill size={14} color="var(--color-danger)" />
                  </span>
                  <span style={{
                    fontSize:   14,
                    fontWeight: 600,
                    color:      'var(--color-danger)',
                    textAlign:  'left',
                  }}>
                    {name}
                  </span>
                </div>

                {isOpen
                  ? <ChevronUp size={16} color="var(--color-text-tertiary)" />
                  : <ChevronRight size={16} color="var(--color-text-tertiary)" />
                }
              </button>

              {isOpen && description && (
                <div style={{
                  fontSize:   13,
                  color:      'var(--color-text-secondary)',
                  lineHeight: 1.5,
                  marginTop:  'var(--space-2)',
                  paddingLeft: 36,
                }}>
                  {description}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
