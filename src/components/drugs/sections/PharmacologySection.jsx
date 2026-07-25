/**
 * src/components/drugs/sections/PharmacologySection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.8a (decision 4.16, §10 Section 15)
 *
 * The first standalone floating card on this page — every other section here
 * is a plain flat block (4.25–4.27); this one gets its own white background
 * and soft shadow, with an icon + title + subtitle header row that
 * collapses/expands the content underneath. Collapsed by default (the first
 * section on this page to default closed rather than open).
 *
 * The collapse/expand toggle is a new local one, not sectionPrimitives.jsx's
 * shared Collapsible — that primitive's header only supports a plain small-
 * caps label, not icon+title+subtitle, so extending it would mean changing a
 * piece nothing else currently uses. Same precedent as UsesSection/
 * SideEffectsSection building their own local toggles instead of extracting
 * a new shared one (decisions 4.10/4.12).
 *
 * Whole card is hidden entirely if a drug has neither pharmacokinetics
 * bullets nor a clinical relevance paragraph yet — same hide-when-empty
 * treatment as Uses and Sources, confirmed 2026-07-25.
 *
 * Data shape: `pharmacokinetics` is a plain bullet list (text[]),
 * `clinicalRelevance` is a plain-text paragraph — both reshaped from the old
 * fixed 5-field object per decision 4.16.
 *
 * Props: drug — flat drug object from DrugContext
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, FlaskConical } from 'lucide-react'

export default function PharmacologySection({ drug }) {
  const [open, setOpen] = useState(false)

  // Destructuring defaults only cover `undefined`, not `null` — and this
  // column comes back `null` (not just absent) for any drug that hasn't
  // had pharmacokinetics filled in yet, so an explicit `??` is needed here
  // even with queries.js's own `?? []` fallback already in place upstream.
  const pharmacokinetics  = drug.pharmacokinetics ?? []
  const clinicalRelevance = drug.clinicalRelevance

  const hasContent = pharmacokinetics.length > 0 || !!clinicalRelevance

  if (!hasContent) return null

  return (
    <div style={{
      marginBottom:    'var(--space-5)',
      backgroundColor: 'var(--color-surface)',
      borderRadius:    16,
      boxShadow:       '0 2px 12px rgba(0,0,0,0.06)',
      padding:         'var(--space-4)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        'var(--space-3)',
          width:      '100%',
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          padding:    0,
          fontFamily: 'var(--font-body)',
          textAlign:  'left',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <FlaskConical size={18} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />

        <div style={{ flex: 1 }}>
          <div style={{
            fontSize:   17,
            fontWeight: 700,
            color:      'var(--color-text-primary)',
          }}>
            Pharmacology
          </div>
          <div style={{
            fontSize: 13,
            color:    'var(--color-text-tertiary)',
          }}>
            MOA & Key clinical pharmacokinetics
          </div>
        </div>

        {open
          ? <ChevronUp size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
          : <ChevronDown size={16} color="var(--color-text-tertiary)" style={{ flexShrink: 0 }} />
        }
      </button>

      {open && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          {pharmacokinetics.length > 0 && (
            <ul style={{ margin: 0, padding: 0, listStyle: 'disc', paddingLeft: 'var(--space-4)' }}>
              {pharmacokinetics.map((point, i) => (
                <li key={i} style={{
                  fontSize:     14,
                  color:        'var(--color-text-primary)',
                  lineHeight:   1.6,
                  marginBottom: 'var(--space-2)',
                }}>
                  {point}
                </li>
              ))}
            </ul>
          )}

          {clinicalRelevance && (
            <p style={{
              fontSize:   14,
              color:      'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin:     pharmacokinetics.length > 0 ? 'var(--space-3) 0 0' : 0,
            }}>
              {clinicalRelevance}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
