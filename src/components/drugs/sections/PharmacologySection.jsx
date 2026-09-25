/**
 * src/components/drugs/sections/PharmacologySection.jsx
 * Drug Detail Screen rebuild — Phase 1, step 1.8a (decision 4.16, §10 Section 15)
 *
 * Icon + title + subtitle header row, with the pharmacokinetics bullets and
 * clinical relevance paragraph always shown underneath — no collapse/expand
 * toggle (see 2026-09-23 follow-up 2 below for why that changed from the
 * original design).
 *
 * Whole section is hidden entirely if a drug has neither pharmacokinetics
 * bullets nor a clinical relevance paragraph yet — same hide-when-empty
 * treatment as Uses and Sources, confirmed 2026-07-25.
 *
 * Data shape: `pharmacokinetics` is a plain bullet list (text[]),
 * `clinicalRelevance` is a plain-text paragraph — both reshaped from the old
 * fixed 5-field object per decision 4.16.
 *
 * Props: drug — flat drug object from DrugContext
 *
 * 2026-09-23: the card's corner radius (`16`) and drop shadow
 * (`0 2px 12px rgba(0,0,0,0.06)`) were both hardcoded — the radius happens
 * to match globals.css's `--radius-lg` exactly, so swapped straight to the
 * token, and the shadow is now `--shadow-elevated`, which (unlike the
 * hardcoded value) has its own explicit dark-mode override in globals.css
 * instead of staying the same faint black in both themes. The collapse
 * chevron also swapped its ChevronUp/ChevronDown icon-swap for a single
 * chevron that rotates 180° (transform+transition), matching the toggle
 * animation already established on Uses/Side Effects/Contraindications.
 *
 * 2026-09-23 (follow-up): `--shadow-elevated` still read as too strong.
 * Switched to `--shadow-ambient-panel-full` — globals.css's own "gently
 * lifted rather than obviously [boxed]" ambient shadow (wide blur, very
 * low opacity), built for exactly this "much fainter" floating-card look.
 *
 * 2026-09-23 (follow-up 2): dropped the floating-card treatment entirely —
 * no more `backgroundColor`/`boxShadow`/`borderRadius`/card padding, now a
 * flat section like Doses/Side Effects instead of standing out as the
 * page's one white card. With no card box to click-to-reveal, the
 * collapse/expand toggle no longer made sense either — content now always
 * shows, so the header is a plain (non-button) row and the chevron is
 * gone; `open` state and the icon-swap import were removed as unused.
 */

import { FlaskConical } from 'lucide-react'

export default function PharmacologySection({ drug }) {
  // Destructuring defaults only cover `undefined`, not `null` — and this
  // column comes back `null` (not just absent) for any drug that hasn't
  // had pharmacokinetics filled in yet, so an explicit `??` is needed here
  // even with queries.js's own `?? []` fallback already in place upstream.
  const pharmacokinetics  = drug.pharmacokinetics ?? []
  const clinicalRelevance = drug.clinicalRelevance

  const hasContent = pharmacokinetics.length > 0 || !!clinicalRelevance

  if (!hasContent) return null

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <div style={{
        display:      'flex',
        alignItems:   'center',
        gap:          'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
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
      </div>

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
  )
}
